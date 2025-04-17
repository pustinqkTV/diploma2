/* global.js
   Firebase init, watchers, and global utility functions
*/

const firebaseConfig = {
  apiKey: "AIzaSyD7SisKsPIZhBioYjJ2MEK7iSXIXChwND4",
  authDomain: "onlainshop-4382c.firebaseapp.com",
  projectId: "onlainshop-4382c",
  storageBucket: "onlainshop-4382c.firebasestorage.app",
  messagingSenderId: "589934123101",
  appId: "1:589934123101:web:baaf42e92852ccdb2d55b4",
  measurementId: "G-WGC9HX2FKF"
};

firebase.initializeApp(firebaseConfig);

// Enable persistence to work offline
firebase.firestore().enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support persistence.');
        }
    });

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ========== Utility Functions ==========
function formatCurrency(amount) {
  return `$${(amount || 0).toFixed(2)}`;
}

function updateCartCount() {
  const user = auth.currentUser;
  const cartCountElem = document.getElementById("cartCount");
  if (!cartCountElem) return;
  if (!user) {
    cartCountElem.innerText = "0";
    return;
  }
  db.collection("users").doc(user.uid).collection("cart").get()
    .then(snapshot => {
      cartCountElem.innerText = snapshot.size;
    })
    .catch(err => {
      console.error("Error updating cart count:", err);
    });
}

function updateFavoritesCount() {
  const user = auth.currentUser;
  const favElem = document.getElementById("favoritesCount");
  if (!favElem) return;
  if (!user) {
    favElem.innerText = "0";
    return;
  }
  db.collection("users").doc(user.uid).collection("favorites").get()
    .then(snapshot => {
      favElem.innerText = snapshot.size;
    })
    .catch(err => {
      console.error("Error updating favorites count:", err);
    });
}

function updateNavLinks(uid) {
  const adminNavItem = document.getElementById("adminNavItem");
  const profileNavItem = document.getElementById("profileNavItem");
  const logoutLink = document.getElementById("logoutLink");
  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");

  // Hide all by default
  if (adminNavItem) adminNavItem.style.display = "none";
  if (profileNavItem) profileNavItem.style.display = "none";
  if (logoutLink) logoutLink.style.display = "none";
  if (loginLink) loginLink.style.display = "inline-block";
  if (registerLink) registerLink.style.display = "inline-block";

  // Check role in Firestore
  db.collection("users").doc(uid).get()
    .then(doc => {
      if (!doc.exists) return;
      const userData = doc.data();
      if (profileNavItem) profileNavItem.style.display = "inline-block";
      if (logoutLink) logoutLink.style.display = "inline-block";
      if (loginLink) loginLink.style.display = "none";
      if (registerLink) registerLink.style.display = "none";

      // If user is admin
      if (adminNavItem && userData.role === "admin") {
        adminNavItem.style.display = "inline-block";
      }
    })
    .catch(err => {
      console.error("Error fetching user doc:", err);
    });
}

function logoutUser() {
  auth.signOut()
    .then(() => {
      alert("You have been logged out.");
      window.location.href = "login.html";
    })
    .catch(err => {
      console.error("Logout error:", err);
      alert("Error logging out. Try again.");
    });
}

// Listen to Auth State
auth.onAuthStateChanged(user => {
  if (user) {
    updateCartCount();
    updateFavoritesCount();
    updateNavLinks(user.uid);
    console.log("User logged in:", user.email);
  } else {
    console.log("No user logged in");
    // If references exist, hide admin items:
    const adminNavItem = document.getElementById("adminNavItem");
    if (adminNavItem) adminNavItem.style.display = "none";
    const profileNavItem = document.getElementById("profileNavItem");
    if (profileNavItem) profileNavItem.style.display = "none";
    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) logoutLink.style.display = "none";
    const loginLink = document.getElementById("loginLink");
    if (loginLink) loginLink.style.display = "inline-block";
    const registerLink = document.getElementById("registerLink");
    if (registerLink) registerLink.style.display = "inline-block";
  }
});

// Attach global logout link if present
document.addEventListener("DOMContentLoaded", () => {
  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", e => {
      e.preventDefault();
      logoutUser();
    });
  }
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", e => {
      e.preventDefault();
      logoutUser();
    });
  }
});
