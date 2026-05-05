/* ================================================================
   MindMate AI — auth.js  (Firebase version — no ES modules)
   Works with plain <script src="auth.js"></script> tags.
   No changes needed to any HTML file.
   ================================================================ */

"use strict";

/* ── helpers ───────────────────────────────────────────────────── */

function safeGetJSON(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch { return fallback; }
}

/* ── REGISTER ──────────────────────────────────────────────────── */

async function register() {
  const name     = document.getElementById("name")?.value?.trim();
  const email    = document.getElementById("email")?.value?.trim().toLowerCase();
  const password = document.getElementById("password")?.value;

  if (!name || !email || !password) {
    showToast("Please fill in all fields", "error"); return;
  }
  if (name.length < 2) {
    showToast("Name must be at least 2 characters", "error"); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast("Please enter a valid email address", "error"); return;
  }
  if (password.length < 6) {
    showToast("Password must be at least 6 characters", "error"); return;
  }

  try {
    /* 1 — Create Firebase Auth account */
    const cred = await _auth.createUserWithEmailAndPassword(email, password);

    /* 2 — Set display name */
    await cred.user.updateProfile({ displayName: name });

    /* 3 — Save user profile to Firestore */
    await _db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      createdAt: Date.now(),
    });

    /* 4 — Keep localStorage keys so script.js / ai_backend.js still work */
    localStorage.setItem("loggedInUser",  name);
    localStorage.setItem("loggedInEmail", email);
    localStorage.setItem("loggedInUID",   cred.user.uid);

    showToast("Account created! Redirecting…", "success");
    setTimeout(() => { window.location.href = "login.html"; }, 1200);

  } catch (err) {
    console.error("[MindMate Auth] Register error:", err);
    if (err.code === "auth/email-already-in-use")
      showToast("An account with this email already exists", "error");
    else
      showToast("Registration failed: " + err.message, "error");
  }
}

/* ── LOGIN ─────────────────────────────────────────────────────── */

async function login() {
  const email    = document.getElementById("email")?.value?.trim().toLowerCase();
  const password = document.getElementById("password")?.value;

  if (!email || !password) {
    showToast("Please fill in all fields", "error"); return;
  }

  try {
    const cred = await _auth.signInWithEmailAndPassword(email, password);
    const user = cred.user;

    /* Fetch name from Firestore */
    const snap = await _db.collection("users").doc(user.uid).get();
    const name = snap.exists ? snap.data().name : (user.displayName || "User");

    localStorage.setItem("loggedInUser",  name);
    localStorage.setItem("loggedInEmail", email);
    localStorage.setItem("loggedInUID",   user.uid);

    /* Sync cloud chats → localStorage */
    await syncChatsFromCloud(user.uid, name);

    showToast("Welcome back, " + name + "!", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 800);

  } catch (err) {
    console.error("[MindMate Auth] Login error:", err);
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential" || err.code === "auth/wrong-password")
      showToast("Incorrect email or password", "error");
    else
      showToast("Login failed: " + err.message, "error");
  }
}

/* ── LOGOUT ────────────────────────────────────────────────────── */

async function logout() {
  const uid  = localStorage.getItem("loggedInUID");
  const name = localStorage.getItem("loggedInUser");

  /* Save chats to cloud before signing out */
  if (uid && name) {
    await saveChatsToCloud(uid, name);
  }

  await _auth.signOut();

  localStorage.removeItem("loggedInUser");
  localStorage.removeItem("loggedInEmail");
  localStorage.removeItem("loggedInUID");

  window.location.href = "login.html";
}

/* ── SYNC: localStorage ↔ Firestore ────────────────────────────── */

async function saveChatsToCloud(uid, userName) {
  try {
    const key   = "mindmate_chats_" + userName;
    const chats = safeGetJSON(key, []);
    if (!chats.length) return;

    const batch = _db.batch();
    chats.forEach(chat => {
      const ref = _db.collection("users").doc(uid)
                     .collection("chats").doc(String(chat.id));
      batch.set(ref, {
        id:        chat.id,
        name:      chat.name || "Untitled",
        messages:  JSON.stringify(chat.messages || []),
        updatedAt: Date.now(),
      });
    });
    await batch.commit();
    console.info("[MindMate Firebase] Chats saved to cloud ✓");
  } catch (e) {
    console.warn("[MindMate Firebase] Could not save chats:", e.message);
  }
}

async function syncChatsFromCloud(uid, userName) {
  try {
    const snap = await _db.collection("users").doc(uid)
                          .collection("chats").get();
    if (snap.empty) {
      console.info("[MindMate Firebase] No cloud chats found for this user.");
      return;
    }

    const chats = [];
    snap.forEach(d => {
      const data = d.data();
      let messages = [];
      try { messages = JSON.parse(data.messages || "[]"); } catch { messages = []; }
      chats.push({
        id:       data.id,
        name:     data.name || "Chat",
        messages: messages,
      });
    });

    /* Sort oldest first (id is timestamp-based) */
    chats.sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const key = "mindmate_chats_" + userName;
    localStorage.setItem(key, JSON.stringify(chats));
    console.info("[MindMate Firebase] Synced", chats.length, "chats from cloud ✓");
  } catch (e) {
    console.warn("[MindMate Firebase] Could not sync chats:", e.message);
  }
}

/* Auto-save chats every 60 seconds while user is on the page */
function startAutoSave() {
  const uid  = localStorage.getItem("loggedInUID");
  const name = localStorage.getItem("loggedInUser");
  if (!uid || !name) return;
  setInterval(() => saveChatsToCloud(uid, name), 60_000);
  console.info("[MindMate Firebase] Auto-save enabled (60s interval)");
}

/* ── AUTH GUARD ────────────────────────────────────────────────── */
/* Paste this one-liner at the top of any protected page's inline <script>:
   if (!localStorage.getItem("loggedInUser")) window.location.href = "login.html";
   Your HTML pages already do this — no change needed.                          */

/* ── ENTER KEY — auth pages only ──────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  const page       = location.pathname.split("/").pop();
  const isAuthPage = page === "login.html" || page === "register.html";
  if (!isAuthPage) return;

  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("keypress", e => {
      if (e.key === "Enter") {
        const isRegister = !!document.getElementById("name");
        isRegister ? register() : login();
      }
    });
  });
});

/* ── Global exports so other scripts (script.js, dashboard) can call these ── */
window.logout            = logout;
window.register          = register;
window.login             = login;
window.saveChatsToCloud  = saveChatsToCloud;
window.startAutoSave     = startAutoSave;