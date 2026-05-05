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
if (!/^[^\s@]+@[^\s@]+.[^\s@]+$/.test(email)) {   // ✅ FIXED REGEX
showToast("Please enter a valid email address", "error"); return;
}
if (password.length < 6) {
showToast("Password must be at least 6 characters", "error"); return;
}

try {
const cred = await _auth.createUserWithEmailAndPassword(email, password);

```
await cred.user.updateProfile({ displayName: name });

await _db.collection("users").doc(cred.user.uid).set({
  name,
  email,
  createdAt: Date.now(),
});

localStorage.setItem("loggedInUser",  name);
localStorage.setItem("loggedInEmail", email);
localStorage.setItem("loggedInUID",   cred.user.uid);

if (typeof syncChatsFromCloud === "function") {
  await syncChatsFromCloud(cred.user.uid, name);
}

showToast("Account created! 🎉", "success");

window.location.href = "dashboard.html";
```

} catch (err) {
console.error("[MindMate Auth] Register error:", err);

```
const msg =
  err && typeof err.message === "string" && err.message.length > 0
    ? err.message
    : "Something went wrong. Please try again.";

if (err.code === "auth/email-already-in-use") {
  showToast("An account with this email already exists", "error");
} else {
  showToast("Registration failed: " + msg, "error");
}
```

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

```
const snap = await _db.collection("users").doc(user.uid).get();
const name = snap.exists ? snap.data().name : (user.displayName || "User");

localStorage.setItem("loggedInUser",  name);
localStorage.setItem("loggedInEmail", email);
localStorage.setItem("loggedInUID",   user.uid);

if (typeof syncChatsFromCloud === "function") {
  await syncChatsFromCloud(user.uid, name);
}

showToast("Welcome back, " + name + "!", "success");

setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
```

} catch (err) {
console.error("[MindMate Auth] Login error:", err);

```
const msg =
  err && typeof err.message === "string" && err.message.length > 0
    ? err.message
    : "Something went wrong. Please try again.";

if (
  err.code === "auth/user-not-found" ||
  err.code === "auth/invalid-credential" ||
  err.code === "auth/wrong-password"
) {
  showToast("Incorrect email or password", "error");
} else {
  showToast("Login failed: " + msg, "error");
}
```

}
}

/* ── LOGOUT ────────────────────────────────────────────────────── */

async function logout() {
const uid  = localStorage.getItem("loggedInUID");
const name = localStorage.getItem("loggedInUser");

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

```
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
```

} catch (e) {
console.warn("Could not save chats:", e.message);
}
}

async function syncChatsFromCloud(uid, userName) {
try {
const snap = await _db.collection("users").doc(uid)
.collection("chats").get();
if (snap.empty) return;

```
const chats = [];
snap.forEach(d => {
  const data = d.data();
  let messages = [];
  try { messages = JSON.parse(data.messages || "[]"); } catch {}
  chats.push({
    id:       data.id,
    name:     data.name || "Chat",
    messages: messages,
  });
});

chats.sort((a, b) => String(a.id).localeCompare(String(b.id)));

const key = "mindmate_chats_" + userName;
localStorage.setItem(key, JSON.stringify(chats));
```

} catch (e) {
console.warn("Could not sync chats:", e.message);
}
}

/* ── AUTO SAVE ─────────────────────────────────────────────────── */

function startAutoSave() {
const uid  = localStorage.getItem("loggedInUID");
const name = localStorage.getItem("loggedInUser");
if (!uid || !name) return;
setInterval(() => saveChatsToCloud(uid, name), 60000);
}

/* ── ENTER KEY HANDLER ─────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", () => {
const page = location.pathname.split("/").pop();
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

/* ── EXPORTS ───────────────────────────────────────────────────── */

window.logout             = logout;
window.register           = register;
window.login              = login;
window.saveChatsToCloud   = saveChatsToCloud;
window.startAutoSave      = startAutoSave;
window.syncChatsFromCloud = syncChatsFromCloud;
