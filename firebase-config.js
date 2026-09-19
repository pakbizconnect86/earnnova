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
  settings: PREFIX + "settings",
  mining: PREFIX + "mining_sessions"
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

// Admin guard — checks the user doc's role field before allowing access to /admin/ pagesfunction requireAdmin(onReady) {
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

// Runs a where()+orderBy() query; if Firestore rejects it for lacking a composite index,
// transparently falls back to a plain where() query and sorts the results client-side —
// so pages never break just because an index hasn't been created yet in the console.
async function safeQuery(collectionRef, whereClauses, orderField, orderDir, limitN) {
  try {
    let q = collectionRef;
    whereClauses.forEach(([field, op, value]) => { q = q.where(field, op, value); });
    if (orderField) q = q.orderBy(orderField, orderDir || 'desc');
    if (limitN) q = q.limit(limitN);
    return await q.get();
  } catch (err) {
    console.warn('safeQuery: falling back to unindexed query for', err.message);
    let q = collectionRef;
    whereClauses.forEach(([field, op, value]) => { q = q.where(field, op, value); });
    const snap = await q.get();
    let docs = snap.docs.slice();
    if (orderField) {
      docs.sort((a, b) => {
        const av = a.data()[orderField];
        const bv = b.data()[orderField];
        const at = (av && av.toMillis) ? av.toMillis() : (typeof av === 'number' ? av : 0);
        const bt = (bv && bv.toMillis) ? bv.toMillis() : (typeof bv === 'number' ? bv : 0);
        return orderDir === 'asc' ? at - bt : bt - at;
      });
    }
    if (limitN) docs = docs.slice(0, limitN);
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (cb) => docs.forEach(cb)
    };
  }
}

// Animates a "PKR 1,234" style number counting up from its current displayed value (or 0)
// to a new target value. Cheap (no blur/filters) so it stays smooth even on slow phones.
function animateBalance(el, targetValue, prefix) {
  prefix = prefix === undefined ? 'PKR ' : prefix;
  if (!el) return;
  const startValue = 0;
  const duration = 700;
  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const current = startValue + (targetValue - startValue) * eased;
    el.textContent = prefix + Math.round(current).toLocaleString('en-PK');
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Same as animateBalance but for plain numbers (no PKR prefix), e.g. counts, mining power.
function animateNumber(el, targetValue) {
  animateBalance(el, targetValue, '');
}
