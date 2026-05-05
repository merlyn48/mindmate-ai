/* ================================================================
   MindMate AI — firebase-config.js
   Paste YOUR Firebase project values below (from Firebase Console)
   ================================================================ */

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCiNBRi7a7chQLwP5r6HasTGkn_2-FvXg8",
  authDomain: "mindmateai-b2734.firebaseapp.com",
  projectId: "mindmateai-b2734",
  storageBucket: "mindmateai-b2734.firebasestorage.app",
  messagingSenderId: "319605405037",
  appId: "1:319605405037:web:43ed7420e35146a602d664",
  measurementId: "G-DH9EJHBKED"
};
// ────────────────────────────────────────────────────────────────

var _firebaseApp = firebase.initializeApp(firebaseConfig);
var _auth        = firebase.auth();
var _db          = firebase.firestore();
 
console.info("[MindMate Firebase] ✅ Initialized");


