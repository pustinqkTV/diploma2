/* favorites.js */
document.

EventListener("DOMContentLoaded", () => {
  const favoritesList = document.getElementById("favoritesList");
  const favoritesItemCount = document.getElementById("favoritesItemCount");

  if (!favoritesList) return;

  auth.onAuthStateChanged(user => {
    if (user) {
      loadFavorites(user.uid);
    } else {
      favoritesList.innerHTML = "<p>Please log in to see your favorites.</p>";
    }
  });

  function loadFavorites(uid) {
    db.collection("users").doc(uid).collection("favorites").get()
      .then(snapshot => {
        if (snapshot.empty) {
          favoritesList.innerHTML = "<p>Your favorites list is empty.</p>";
          if (favoritesItemCount) favoritesItemCount.textContent = "0";
          updateFavoritesCount(); // from global
          return;
        }

        let html = "";
        let itemCount = 0;

        snapshot.forEach(doc => {
          let product = doc.data();
          itemCount++;
          html += `
            <div class="favorite-item card mb-3">
              <div class="card-body">
                <div class="row align-items-center">
                  <div class="col-md-3 mb-3 mb-md-0">
                    <img src="${product.image||'images/default-product.jpg'}" alt="${product.name}" class="img-fluid" />
                  </div>
                  <div class="col-md-6 mb-3 mb-md-0">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">
                      <span class="badge badge-pill badge-light mr-2">Price: ${formatCurrency(product.price)}</span>
                    </p>
                  </div>
                  <div class="col-md-3 text-right">
                    <button class="btn btn-success w-100 mb-2" data-add-to-cart="${doc.id}">
                      <i class="fas fa-cart-plus mr-2"></i> Add to Cart
                    </button>
                    <button class="btn btn-danger w-100" data-remove-id="${doc.id}">
                      <i class="fas fa-trash-alt mr-2"></i> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        });

        favoritesList.innerHTML = html;
        if (favoritesItemCount) favoritesItemCount.textContent = itemCount;
        updateFavoritesCount();

        // Add event listeners for buttons
        document.querySelectorAll("[data-remove-id]").forEach(btn => {
          btn.addEventListener("click", e => {
            removeFromFavorites(e.target.dataset.removeId, uid);
          });
        });

        document.querySelectorAll("[data-add-to-cart]").forEach(btn => {
          btn.addEventListener("click", e => {
            addToCart(e.target.dataset.addToCart, uid);
          });
        });
      })
      .catch(err => {
        console.error("Error loading favorites:", err);
        favoritesList.innerHTML = "<p>Error loading favorite items.</p>";
      });
  }

  function removeFromFavorites(favoriteId, uid) {
    db.collection("users").doc(uid).collection("favorites").doc(favoriteId).delete()
      .then(() => {
        loadFavorites(uid);
      })
      .catch(err => {
        console.error("Error removing from favorites:", err);
      });
  }

  function addToCart(productId, uid) {
    // Get product data from favorites
    db.collection("users").doc(uid).collection("favorites").doc(productId).get()
      .then(doc => {
        if (!doc.exists) return;
        const product = doc.data();
        
        // Add to cart
        return db.collection("users").doc(uid).collection("cart").doc(productId).set({
          ...product,
          quantity: 1
        });
      })
      .then(() => {
        updateCartCount();
        alert("Item added to cart!");
      })
      .catch(err => {
        console.error("Error adding to cart:", err);
        alert("Error adding item to cart");
      });
  }
});