/* cart.js */
document.addEventListener("DOMContentLoaded", () => {
  const cartList = document.getElementById("cartList");
  const cartItemCount = document.getElementById("cartItemCount");
  const cartSubtotal = document.getElementById("cartSubtotal");
  const cartTotal = document.getElementById("cartTotal");

  if (!cartList) return;

  auth.onAuthStateChanged(user => {
    if (user) {
      loadCart(user.uid);
    } else {
      cartList.innerHTML = "<p>Please log in to see your cart.</p>";
    }
  });

  function loadCart(uid) {
    db.collection("users").doc(uid).collection("cart").get()
      .then(snapshot => {
        if (snapshot.empty) {
          cartList.innerHTML = "<p>Your cart is empty.</p>";
          if (cartItemCount) cartItemCount.textContent = "0";
          if (cartSubtotal) cartSubtotal.textContent = "$0.00";
          if (cartTotal) cartTotal.textContent = "$0.00";
          updateCartCount(); // from global
          return;
        }
        let html = "";
        let total = 0;
        let itemCount = 0;

        snapshot.forEach(doc => {
          let product = doc.data();
          let sub = (product.price || 0) * (product.quantity || 1);
          total += sub;
          itemCount += (product.quantity || 1);
          html += `
            <div class="cart-item card mb-3">
              <div class="card-body">
                <div class="row align-items-center">
                  <div class="col-md-3 mb-3 mb-md-0">
                    <img src="${product.image||'images/default-product.jpg'}" alt="${product.name}" class="img-fluid" />
                  </div>
                  <div class="col-md-6 mb-3 mb-md-0">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">
                      <span class="badge badge-pill badge-light mr-2">Price: ${formatCurrency(product.price)}</span>
                      <span class="badge badge-pill badge-light">Qty: ${product.quantity||1}</span>
                    </p>
                    <p class="card-text mt-2"><strong>Subtotal: ${formatCurrency(sub)}</strong></p>
                  </div>
                  <div class="col-md-3 text-right">
                    <button class="btn btn-danger w-100" data-remove-id="${doc.id}">
                      <i class="fas fa-trash-alt mr-2"></i> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        });

        cartList.innerHTML = html;
        if (cartItemCount) cartItemCount.textContent = itemCount;
        if (cartSubtotal) cartSubtotal.textContent = formatCurrency(total);
        if (cartTotal) cartTotal.textContent = formatCurrency(total);
        updateCartCount(); // from global

        document.querySelectorAll("[data-remove-id]").forEach(btn => {
          btn.addEventListener("click", e => {
            removeFromCart(e.target.dataset.removeId, uid);
          });
        });
      })
      .catch(err => {
        console.error("Error loading cart:", err);
        cartList.innerHTML = "<p>Error loading cart items.</p>";
      });
  }

  function removeFromCart(cartId, uid) {
    db.collection("users").doc(uid).collection("cart").doc(cartId).delete()
      .then(() => {
        loadCart(uid);
      })
      .catch(err => {
        console.error("Error removing cart item:", err);
      });
  }
});
