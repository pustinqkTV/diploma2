/* profile.js */
document.addEventListener("DOMContentLoaded", () => {
  const userEmail = document.getElementById("userEmail");
  const memberSince = document.getElementById("memberSince");
  const ordersContainer = document.getElementById("ordersContainer");
  const changePasswordForm = document.getElementById("changePasswordForm");
  const resetPasswordForm = document.getElementById("resetPasswordForm");

  // Initialize user profile data
  auth.onAuthStateChanged(user => {
    if (user) {
      // Display user email
      if (userEmail) {
        userEmail.textContent = user.email;
      }
      
      // Display member since date
      if (memberSince) {
        const creationDate = new Date(user.metadata.creationTime);
        memberSince.textContent = creationDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      // Load orders if container exists
      if (ordersContainer) {
        loadUserOrders(user.uid);
      }
    } else {
      window.location.href = 'login.html';
    }
  });

  function loadUserOrders(uid) {
    ordersContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i> Loading orders...
      </div>
    `;

    db.collection("orders")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(5) // Only show last 5 orders
      .get()
      .then(snapshot => {
        if (snapshot.empty) {
          ordersContainer.innerHTML = `
            <div class="alert alert-info">
              <i class="fas fa-info-circle"></i> You have no orders yet.
            </div>
          `;
          return;
        }

        let html = `
          <div class="table-responsive">
            <table class="table table-hover">
              <thead class="thead-light">
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
        `;

        snapshot.forEach(doc => {
          const order = doc.data();
          const date = order.createdAt ? order.createdAt.toDate().toLocaleString() : "N/A";
          const status = order.status || "Processing";
          const statusClass = {
            'Processing': 'text-warning',
            'Shipped': 'text-info',
            'Delivered': 'text-success',
            'Cancelled': 'text-danger'
          }[status] || 'text-secondary';

          html += `
            <tr>
              <td><small>${doc.id}</small></td>
              <td>${date}</td>
              <td>${formatCurrency(order.totalAmount)}</td>
              <td><span class="badge ${statusClass}">${status}</span></td>
            </tr>
          `;
        });

        html += `
              </tbody>
            </table>
          </div>
        `;
        ordersContainer.innerHTML = html;
      })
      .catch(err => {
        console.error("Error loading orders:", err);
        ordersContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-circle"></i> Error loading orders. Please try again.
          </div>
        `;
      });
  }

  // Password change handler
  if (changePasswordForm) {
    changePasswordForm.addEventListener("submit", async e => {
      e.preventDefault();
      const currentPassword = document.getElementById("currentPassword").value.trim();
      const newPassword = document.getElementById("newPassword").value.trim();
      const confirmNewPassword = document.getElementById("confirmNewPassword").value.trim();

      if (newPassword !== confirmNewPassword) {
        alert("New passwords do not match.");
        return;
      }
      if (newPassword.length < 6) {
        alert("New password must be at least 6 characters.");
        return;
      }
      const user = auth.currentUser;
      if (!user) {
        alert("No user logged in.");
        return;
      }
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await user.reauthenticateWithCredential(cred);
        await user.updatePassword(newPassword);
        alert("Password updated successfully.");
        changePasswordForm.reset();
      } catch (err) {
        console.error("Error changing password:", err);
        alert("Error updating password. Check your current password or re-login.");
      }
    });
  }

  // Password reset handler
  if (resetPasswordForm) {
    resetPasswordForm.addEventListener("submit", async e => {
      e.preventDefault();
      const resetEmail = document.getElementById("resetEmail").value.trim();
      if (!resetEmail) {
        alert("Enter your email.");
        return;
      }
      try {
        await auth.sendPasswordResetEmail(resetEmail);
        alert("Password reset email sent. Check your inbox.");
        resetPasswordForm.reset();
      } catch (err) {
        console.error("Error sending reset email:", err);
        alert("Error sending password reset email. Check the email address.");
      }
    });
  }
});
