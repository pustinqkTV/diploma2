/* orders.js */
document.addEventListener("DOMContentLoaded", () => {
  const ordersContainer = document.getElementById("ordersContainer");
  if (!ordersContainer) return;

  auth.onAuthStateChanged(user => {
    if (!user) {
      ordersContainer.innerHTML = "<p>Please log in to view your orders.</p>";
    } else {
      loadOrders(user.uid);
    }
  });

  function loadOrders(uid) {
    db.collection("orders").where("userId", "==", uid).orderBy("createdAt", "desc").get()
      .then(snapshot => {
        if (snapshot.empty) {
          ordersContainer.innerHTML = "<p>You have no past orders.</p>";
          return;
        }
        let html = `
          <table class="table table-bordered">
            <thead>
              <tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
        `;
        snapshot.forEach(doc => {
          const o = doc.data();
          const date = o.createdAt ? o.createdAt.toDate().toLocaleString() : "N/A";
          html += `
            <tr>
              <td>${doc.id}</td>
              <td>${date}</td>
              <td>${formatCurrency(o.totalAmount)}</td>
              <td>${o.status}</td>
            </tr>
          `;
        });
        html += "</tbody></table>";
        ordersContainer.innerHTML = html;
      })
      .catch(err => {
        console.error("Error loading user orders:", err);
        ordersContainer.innerHTML = "<p>Error loading orders.</p>";
      });
  }
});
