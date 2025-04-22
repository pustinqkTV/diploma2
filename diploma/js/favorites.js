/* favorites.js */
document.addEventListener("DOMContentLoaded", () => {
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
          favoritesList.innerHTML = "<p>No favorite items found.</p>";
          if (favoritesItemCount) favoritesItemCount.textContent = "0";
          return;
        }
        let html = "";
        snapshot.forEach(doc => {
          const product = doc.data();
          html += `
            <div class="favorite-item card mb-3">
              <div class="card-body">
                <div class="row align-items-center">
                  <div class="col-md-3 mb-3 mb-md-0">
                    <img src="${product.image || 'images/default-product.jpg'}" alt="${product.name}" class="img-fluid" />
                  </div>
                  <div class="col-md-6">
                    <h5 class="card-title">${product.name}</h5>
                    <p class="card-text">${product.description || ''}</p>
                    <p class="card-text"><strong>${formatCurrency(product.price)}</strong></p>
                  </div>
                  <div class="col-md-3 text-right">
                    <button class="btn btn-danger w-100" data-remove-id="${doc.id}">
                      <i class="fas fa-trash-alt"></i> Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `;
        });
        favoritesList.innerHTML = html;
        if (favoritesItemCount) favoritesItemCount.textContent = snapshot.size;
        // Attach event listeners to remove buttons
        document.querySelectorAll("[data-remove-id]").forEach(btn => {
          btn.addEventListener("click", e => {
            removeFromFavorites(e.target.dataset.removeId, uid);
          });
        });
      })
      .catch(err => {
        favoritesList.innerHTML = "<p>Error loading favorites.</p>";
        console.error("Error loading favorites:", err);
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