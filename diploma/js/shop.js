/***************************************************
 shop.js
 Enhanced logic for shop.html – advanced filtering,
 sorting, and modern UI interactions, plus dynamic
 loading of categories from the DB so new ones appear.

 ~ Now also listens to category updates from admin side ~
****************************************************/

document.addEventListener("DOMContentLoaded", () => {
  const productsListEl = document.getElementById("productsList");
  const searchInput = document.getElementById("searchInput");
  const categoryFilter = document.getElementById("categoryFilter");
  const sortFilter = document.getElementById("sortFilter");
  const clearFiltersBtn = document.getElementById("clearFilters");

  let productsData = [];

  if (!productsListEl) return; // Ensure we're on shop page

  // Add this at the beginning of your DOMContentLoaded event handler
  document.addEventListener("categoryUpdated", () => {
    loadCategoriesForShop();
  });

  // Load categories from DB so new ones appear in filter:
  loadCategoriesForShop();

  // Load all products
  loadAllProducts();

  // Filter events
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (categoryFilter) categoryFilter.addEventListener("change", applyFilters);
  if (sortFilter) sortFilter.addEventListener("change", applyFilters);
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      if (categoryFilter) categoryFilter.value = "";
      if (sortFilter) sortFilter.value = "";
      applyFilters();
    });
  }

  // ADDED: Listen for category changes from admin side
  document.addEventListener("categoryUpdated", e => {
    loadCategoriesForShop();
  });

  // ===================================================
  // Function to dynamically load categories
  // ===================================================
  function loadCategoriesForShop() {
    const categoryFilter = document.getElementById("categoryFilter");
    if (!categoryFilter) return;
    
    db.collection("categories").orderBy("name").get()
      .then(snapshot => {
        let options = ['<option value="">All Categories</option>'];
        snapshot.forEach(doc => {
          const category = doc.data();
          // Ensure consistent category value
          const categoryName = category.name.trim();
          options.push(`<option value="${categoryName}">${categoryName}</option>`);
        });
        categoryFilter.innerHTML = options.join('');
      })
      .catch(err => {
        console.error("Error loading categories:", err);
      });
  }

  // ===================================================
  // Load all products from Firestore
  // ===================================================
  function loadAllProducts() {
    db.collection("products").get()
      .then(snapshot => {
        productsData = [];
        snapshot.forEach(doc => {
          const p = doc.data();
          productsData.push({
            id: doc.id,
            name: p.name,
            price: p.price,
            image: p.image,
            category: p.category || "",
            description: p.description || "",
            discount: p.discount || 0 // Add discount field
          });
        });
        applyFilters();
      })
      .catch(err => {
        console.error("Error loading products:", err);
        productsListEl.innerHTML = "<p>Error loading products.</p>";
      });
  }

  // ===================================================
  // Apply all filters to productsData
  // ===================================================
  function applyFilters() {
    let filtered = [...productsData];
    const searchTerm = (searchInput?.value || "").toLowerCase();
    const selectedCategory = categoryFilter?.value || "";
    const sortOption = sortFilter?.value || "";

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by category - make it case-insensitive
    if (selectedCategory) {
      filtered = filtered.filter(product => 
        product.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Sort the products
    if (sortOption) {
      if (sortOption === "price-asc") {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortOption === "price-desc") {
        filtered.sort((a, b) => b.price - a.price);
      } else if (sortOption === "name-asc") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
      } else if (sortOption === "name-desc") {
        filtered.sort((a, b) => b.name.localeCompare(a.name));
      }
    }

    renderProducts(filtered);
  }

  // ===================================================
  // Render the final list of products
  // ===================================================
  function renderProducts(products) {
    productsListEl.innerHTML = "";
    if (!products.length) {
      productsListEl.innerHTML = "<p>No products found.</p>";
      return;
    }
    
    let html = "";
    products.forEach(item => {
      const discountedPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
      html += `
        <div class="product-card">
          <img src="${item.image||'images/default-product.jpg'}" alt="${item.name}">
          <div class="card-body">
            <h5 class="card-title">${item.name}</h5>
            <p class="product-price">
              ${formatCurrency(discountedPrice)}
              ${item.discount ? `
                <span class="original-price">${formatCurrency(item.price)}</span>
                <span class="price-discount">-${item.discount}%</span>
              ` : ''}
            </p>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-add-cart" data-pid="${item.id}">
                <i class="fas fa-cart-plus"></i> Add to Cart
              </button>
              <button class="btn btn-add-favorite" data-pid="${item.id}">
                <i class="fas fa-heart"></i> Favorite
              </button>
            </div>
            <a href="product-details.html?id=${item.id}" class="btn btn-outline-primary mt-2 w-100">
              <i class="fas fa-info-circle"></i> View Details
            </a>
          </div>
        </div>
      `;
    });
    productsListEl.innerHTML = html;

    // Attach event listeners for cart and favorite
    document.querySelectorAll(".btn-add-cart").forEach(btn => {
      btn.addEventListener("click", () => addToCart(btn.dataset.pid));
    });
    document.querySelectorAll(".btn-add-favorite").forEach(btn => {
      btn.addEventListener("click", () => addToFavorites(btn.dataset.pid));
    });
  }

  // ===================================================
  // Add a single product to cart
  // ===================================================
  function addToCart(pid) {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to add items to cart.");
      return;
    }
    let product = productsData.find(x => x.id === pid);
    if (!product) {
      alert("Product not found!");
      return;
    }
    let cartRef = db.collection("users").doc(user.uid).collection("cart").doc(pid);
    cartRef.get()
      .then(doc => {
        if (doc.exists) {
          return cartRef.update({
            quantity: firebase.firestore.FieldValue.increment(1)
          });
        } else {
          return cartRef.set({
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
          });
        }
      })
      .then(() => {
        alert(`Added "${product.name}" to cart.`);
        updateCartCount();
      })
      .catch(err => console.error("Add to cart error:", err));
  }

  // ===================================================
  // Add a single product to favorites
  // ===================================================
  function addToFavorites(pid) {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login to add favorites.");
      return;
    }
    let product = productsData.find(x => x.id === pid);
    if (!product) {
      alert("Product not found!");
      return;
    }
    let favRef = db.collection("users").doc(user.uid).collection("favorites").doc(pid);
    favRef.get()
      .then(doc => {
        if (doc.exists) {
          alert("Already in favorites.");
        } else {
          return favRef.set({
            name: product.name,
            price: product.price,
            image: product.image
          }).then(() => {
            alert(`Added "${product.name}" to favorites.`);
            updateFavoritesCount();
          });
        }
      })
      .catch(err => console.error("Add to favorites error:", err));
  }
});
