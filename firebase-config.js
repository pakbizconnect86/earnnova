// EarnNova — Shared Firebase Config
// Reuses your existing project (taskyaar-a925b) with a dedicated collection prefix
// so EarnNova data never collides with TaskYaar / other apps on the same project.
//
// Fill in the actual values from Firebase Console → Project Settings → Your apps → Web app.
// (Same values you already used for TaskYaar — just paste them here.)

const firebaseConfig = {
  apiKey: "AIzaSyBf-Pqipw_m8TfFmwSXOqEM9nmesVs4QcM",
  authDomain: "taskyaar-a925b.firebaseapp.com",
  projectId: "taskyaar-a925b",
  storageBucket: "taskyaar-a925b.firebasestorage.app",
  messagingSenderId: "396863993634",
  appId: "1:396863993634:web:12618a216d14b497e1977b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Collection prefix — keeps EarnNova isolated inside the shared project
const PREFIX = "earnnova_";
const COL = {
  users: PREFIX + "users",
  tasks: PREFIX + "tasks",
  submissions: PREFIX + "task_submissions",
  wallets: PREFIX + "wallets",
  transactions: PREFIX + "transactions",
  deposits: PREFIX + "deposits",
  withdrawals: PREFIX + "withdrawals",
  subscriptions: PREFIX + "subscriptions",
  plans: PREFIX + "subscription_plans",
  referrals: PREFIX + "referrals",
  notifications: PREFIX + "notifications",
  tickets: PREFIX + "support_tickets",
  adminLogs: PREFIX + "admin_logs",
  settings: PREFIX + "settings"
};

// Generates EN-XXXXXX style user IDs
function generateUserId() {
  return "EN-" + Math.floor(100000 + Math.random() * 900000);
}

// Generates short reference IDs (WD-XXXXXX, DP-XXXXXX etc.)
function generateRefId(prefixLetters) {
  return prefixLetters + "-" + Math.floor(100000 + Math.random() * 900000);
}

// Auth guard — redirects to login if not signed in. Call on every protected page.
function requireAuth(onReady) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      onReady(user);
    }
  });
}

// Admin guard — checks the user doc's role field before allowing access to /admin/ pages
function requireAdmin(onReady) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "../login.html";
      return;
    }
    const doc = await db.collection(COL.users).doc(user.uid).get();
    const data = doc.data();
    if (!data || data.role !== "admin") {
      window.location.href = "../dashboard.html";
      return;
    }
    onReady(user, data);
  });
}
