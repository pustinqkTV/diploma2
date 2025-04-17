/* product-details.js
   Enhanced Product Details Page Script for MyFootballStore
   - Improved discount display with original price (strikethrough)
   - Advanced thumbnail switching for product images
   - Robust quantity controls with limits
   - Responsive loading of related products by category
*/

document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements
  const elements = {
    title: document.getElementById("productTitle"),
    image: document.getElementById("productImage"),
    imageDescription: document.getElementById("imageDescription"),
    price: document.getElementById("productPrice"),
    category: document.getElementById("categoryBreadcrumb"),
    productBreadcrumb: document.getElementById("productBreadcrumb"),
    quantity: document.getElementById("quantity"),
    addToCartBtn: document.getElementById("addToCartBtn"),
    addToFavoritesBtn: document.getElementById("addToFavoritesBtn"),
    thumbnailsGrid: document.querySelector(".product-thumbnails-grid"),
    tags: document.getElementById("productTags"), // Add this line
    relatedProducts: document.getElementById("relatedProducts"),
    productDescription: document.getElementById("productDescription")
  };

  // Product state
  let productData = null;
  let isFavorite = false;

  // Add this function before init()
  const loadRelatedProducts = async (category) => {
    try {
      // Get up to 4 products from the same category, excluding current product
      const relatedSnapshot = await db.collection("products")
        .where("category", "==", category)
        .where("__name__", "!=", productData.id)
        .limit(4)
        .get();

      if (relatedSnapshot.empty) return;

      // Create related products section if it doesn't exist
      let relatedSection = document.querySelector('.related-products-section');
      if (!relatedSection) {
        relatedSection = document.createElement('div');
        relatedSection.className = 'related-products-section mt-5';
        document.querySelector('.product-info-sticky').appendChild(relatedSection);
      }

      // Add related products to the section
      relatedSection.innerHTML = `
        <h3>Related Products</h3>
        <div class="related-products-grid">
          ${relatedSnapshot.docs.map(doc => {
            const product = doc.data();
            return `
              <div class="related-product-card">
                <img src="${product.image}" alt="${product.name}" class="related-product-image">
                <div class="related-product-info">
                  <h5 class="related-product-title">${product.name}</h5>
                  <p class="related-product-price">${formatCurrency(product.price)}</p>
                  <a href="product-details.html?id=${doc.id}" class="btn btn-primary btn-sm">View Details</a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } catch (error) {
      console.error('Error loading related products:', error);
    }
  };

  // Initialize product page
  const init = async () => {
    const productId = new URLSearchParams(window.location.search).get("id");
    if (!productId) {
      window.location.href = "shop.html";
      return;
    }

    try {
      // Get product data and favorite status simultaneously
      const [productDoc, favoriteStatus] = await Promise.all([
        db.collection("products").doc(productId).get(),
        checkFavoriteStatus(productId)
      ]);

      if (!productDoc.exists) throw new Error("Product not found");
      
      productData = { id: productDoc.id, ...productDoc.data() };
      isFavorite = favoriteStatus;
      
      updateUI(productData);
      setupEventListeners();
      loadRelatedProducts(productData.category);
    } catch (error) {
      showNotification('error', "Failed to load product details");
      console.error(error);
    }
  };

  const checkFavoriteStatus = async (productId) => {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    try {
      const doc = await db.collection("users").doc(user.uid)
        .collection("favorites").doc(productId).get();
      return doc.exists;
    } catch (error) {
      console.error("Error checking favorite status:", error);
      return false;
    }
  };

  // Update UI with product data - streamlined version
  const updateUI = (product) => {
    if (!product) return;
    
    if (elements.title) elements.title.textContent = product.name;
    if (elements.image) {
      elements.image.src = product.image;
      elements.image.alt = product.name;
    }
    if (elements.imageDescription) {
      elements.imageDescription.textContent = product.imageDescription || "No description available";
    }
    if (elements.productDescription) {
      elements.productDescription.textContent = product.description || "No product description available";
    }
    if (elements.category) elements.category.textContent = product.category;
    if (elements.productBreadcrumb) elements.productBreadcrumb.textContent = product.name;

    updatePrice(product);
    updateThumbnails(product);
    updateStockDisplay(product.stock);
    updateTags(product.tags);
    updateSpecifications(product.specifications);
    
    if (elements.addToFavoritesBtn) {
      elements.addToFavoritesBtn.textContent = "Add to favorites";
      elements.addToFavoritesBtn.classList.toggle('active', isFavorite);
    }
    
    initializeQuantityControls(product.stock);
    checkAndAddAdminControls(product);
    loadRelatedProducts(product.category);
  };

  // Add this function after updateUI
  const checkAndAddAdminControls = async (product) => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;

      // Check if user is admin
      const userDoc = await db.collection('users').doc(user.uid).get();
      const isAdmin = userDoc.data()?.isAdmin;

      if (!isAdmin) return;

      // Create admin controls container if it doesn't exist
      let adminControls = document.querySelector('.admin-controls');
      if (!adminControls) {
        adminControls = document.createElement('div');
        adminControls.className = 'admin-controls mt-4';
        document.querySelector('.product-info-sticky').appendChild(adminControls);
      }

      // Add admin control buttons
      adminControls.innerHTML = `
        <h5 class="mb-3">Admin Controls</h5>
        <div class="btn-group w-100" role="group">
          <button class="btn btn-warning btn-sm" id="editProductBtn">
            <i class="fas fa-edit"></i> Edit Product
          </button>
          <button class="btn btn-danger btn-sm" id="deleteProductBtn">
            <i class="fas fa-trash"></i> Delete Product
          </button>
        </div>
        <div class="mt-3">
          <label for="stockInput">Update Stock:</label>
          <div class="input-group">
            <input type="number" id="stockInput" class="form-control" 
                   value="${product.stock}" min="0">
            <div class="input-group-append">
              <button class="btn btn-outline-primary" id="updateStockBtn">
                Update
              </button>
            </div>
          </div>
        </div>
      `;

      // Add event listeners for admin controls
      document.getElementById('editProductBtn')?.addEventListener('click', () => {
        window.location.href = `edit-product.html?id=${product.id}`;
      });

      document.getElementById('deleteProductBtn')?.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this product?')) {
          try {
            await db.collection('products').doc(product.id).delete();
            showNotification('success', 'Product deleted successfully');
            setTimeout(() => window.location.href = 'shop.html', 1500);
          } catch (error) {
            showNotification('error', 'Failed to delete product');
            console.error('Error deleting product:', error);
          }
        }
      });

      document.getElementById('updateStockBtn')?.addEventListener('click', async () => {
        const newStock = parseInt(document.getElementById('stockInput').value);
        if (isNaN(newStock) || newStock < 0) {
          showNotification('warning', 'Please enter a valid stock number');
          return;
        }

        try {
          await db.collection('products').doc(product.id).update({
            stock: newStock,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showNotification('success', 'Stock updated successfully');
          updateStockDisplay(newStock);
        } catch (error) {
          showNotification('error', 'Failed to update stock');
          console.error('Error updating stock:', error);
        }
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };

  // Add this function after updateUI but before other functions
  const updateThumbnails = (product) => {
    if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
      // If no images array, use the main image as single thumbnail
      elements.thumbnailsGrid.innerHTML = `
        <img src="${product.image}" 
             alt="${product.name}" 
             class="thumbnail active"
             onclick="switchMainImage('${product.image}', this)">
      `;
      return;
    }

    // Create thumbnails for all images
    const thumbnailsHTML = product.images.map((imageUrl, index) => `
      <img src="${imageUrl}" 
           alt="${product.name} view ${index + 1}" 
           class="thumbnail ${index === 0 ? 'active' : ''}"
           onclick="switchMainImage('${imageUrl}', this)">
    `).join('');

    elements.thumbnailsGrid.innerHTML = thumbnailsHTML;

    // Set first image as main image if not already set
    if (!elements.image.src) {
      elements.image.src = product.images[0];
    }
  };

  // Add new function to update stock display
  const updateStockDisplay = (stock) => {
    const stockBadge = document.getElementById('stockBadge');
    if (!stockBadge) return;

    if (stock <= 0) {
      stockBadge.className = 'badge badge-danger';
      stockBadge.textContent = 'Out of Stock';
    } else if (stock <= 5) {
      stockBadge.className = 'badge badge-warning';
      stockBadge.textContent = `Low Stock: ${stock} left`;
    } else {
      stockBadge.className = 'badge badge-success';
      stockBadge.textContent = `In Stock: ${stock} available`;
    }
  };

  // Update price display with discount calculation
  const updatePrice = (product) => {
    const { price, discount } = product;
    const discountedPrice = discount ? price * (1 - discount / 100) : price;
    
    elements.price.innerHTML = `
      <span class="current-price">${formatCurrency(discountedPrice)}</span>
      ${discount ? `
        <span class="original-price text-muted"><s>${formatCurrency(price)}</s></span>
        <span class="price-discount">-${discount}%</span>
      ` : ''}
    `;
  };

  // Replace the setupEventListeners function
  const setupEventListeners = () => {
    // Basic event listeners
    elements.addToCartBtn.addEventListener("click", () => addToCart(productData));
    elements.addToFavoritesBtn.addEventListener("click", () => addToFavorites(productData));
    
    // Remove any existing event listeners by replacing the buttons
    const decreaseBtn = document.getElementById("decreaseQuantity");
    const increaseBtn = document.getElementById("increaseQuantity");
    
    // Create new buttons with same attributes
    const newDecreaseBtn = decreaseBtn.cloneNode(true);
    const newIncreaseBtn = increaseBtn.cloneNode(true);
    
    // Replace old buttons
    decreaseBtn.parentNode.replaceChild(newDecreaseBtn, decreaseBtn);
    increaseBtn.parentNode.replaceChild(newIncreaseBtn, increaseBtn);
    
    // Add single event listener for each button
    newDecreaseBtn.addEventListener("click", () => {
      const newValue = parseInt(elements.quantity.value) - 1;
      updateQuantity(newValue);
    });
    
    newIncreaseBtn.addEventListener("click", () => {
      const newValue = parseInt(elements.quantity.value) + 1;
      updateQuantity(newValue);
    });

    // Make quantity input read-only
    elements.quantity.readOnly = true;
  };

  // Simplify the updateQuantity function
  const updateQuantity = (value) => {
    // Ensure value is a valid number
    value = parseInt(value) || 1;
    
    // Clamp value between 1 and max stock
    value = Math.max(1, Math.min(value, productData.stock));
    
    // Update display
    elements.quantity.value = value;
    
    // Update button states
    const decreaseBtn = document.getElementById("decreaseQuantity");
    const increaseBtn = document.getElementById("increaseQuantity");
    
    if (decreaseBtn) decreaseBtn.disabled = value <= 1;
    if (increaseBtn) increaseBtn.disabled = value >= productData.stock;
  };

  // Update the addToCart function to check stock
  const addToCart = async (product) => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        showNotification('warning', 'Please login to add items to cart');
        window.location.href = "login.html";
        return;
      }

      const quantity = parseInt(elements.quantity.value);
      
      // Validate quantity
      if (quantity <= 0) {
        showNotification('warning', 'Please select a valid quantity');
        return;
      }
      if (quantity > product.stock) {
        showNotification('warning', 'Not enough items in stock');
        return;
      }

      // Check if item already exists in cart
      const cartRef = db.collection("users").doc(user.uid).collection("cart").doc(product.id);
      const cartDoc = await cartRef.get();

      if (cartDoc.exists) {
        // Update existing cart item
        const currentQuantity = cartDoc.data().quantity;
        const newQuantity = currentQuantity + quantity;
        
        if (newQuantity > product.stock) {
          showNotification('warning', 'Cannot add more items than available in stock');
          return;
        }

        await cartRef.update({
          quantity: newQuantity,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Add new cart item
        await cartRef.set({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: quantity,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      showNotification('success', 'Product added to cart');
      updateCartCount();

    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('error', 'Failed to add product to cart');
    }
  };

  const addToFavorites = async (product) => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) {
        showNotification('warning', 'Please login to add favorites');
        window.location.href = "login.html";
        return;
      }

      const favoriteRef = db.collection("users").doc(user.uid)
        .collection("favorites").doc(product.id);

      if (isFavorite) {
        // Remove from favorites
        await favoriteRef.delete();
        isFavorite = false;
        elements.addToFavoritesBtn.textContent = 'Add to favorites';
        elements.addToFavoritesBtn.classList.remove('active');
        showNotification('info', 'Removed from favorites');
      } else {
        // Add to favorites
        await favoriteRef.set({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        isFavorite = true;
        elements.addToFavoritesBtn.textContent = 'Add to favorites';
        elements.addToFavoritesBtn.classList.add('active');
        showNotification('success', 'Added to favorites');
      }

      updateFavoritesCount();

    } catch (error) {
      console.error('Error updating favorites:', error);
      showNotification('error', 'Failed to update favorites');
    }
  };

  const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Event listener for thumbnail clicks
  window.switchMainImage = (url, thumbnail) => {
    elements.image.src = url;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    thumbnail.classList.add('active');
  };

  // Helper functions
  const showError = (message) => {
    // Implement error display logic
  };

  const updateCartCount = async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;

      const cartSnapshot = await db.collection("users").doc(user.uid)
        .collection("cart").get();
      
      const cartCount = cartSnapshot.docs.length;
      const cartBadge = document.getElementById('cartCount');
      if (cartBadge) {
        cartBadge.textContent = cartCount;
        cartBadge.style.display = cartCount > 0 ? 'inline' : 'none';
      }
    } catch (error) {
      console.error('Error updating cart count:', error);
    }
  };

  const updateFavoritesCount = async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return;

      const favSnapshot = await db.collection("users").doc(user.uid)
        .collection("favorites").get();
      
      const favCount = favSnapshot.docs.length;
      const favBadge = document.getElementById('favoritesCount');
      if (favBadge) {
        favBadge.textContent = favCount;
        favBadge.style.display = favCount > 0 ? 'inline' : 'none';
      }
    } catch (error) {
      console.error('Error updating favorites count:', error);
    }
  };

  // Add this to updateUI function after loading product data
  const initializeQuantityControls = (stockLevel) => {
    const quantity = elements.quantity;
    const decreaseBtn = document.getElementById("decreaseQuantity");
    const increaseBtn = document.getElementById("increaseQuantity");
    
    if (!quantity || !decreaseBtn || !increaseBtn) return;

    // Reset to 1
    quantity.value = "1";
    
    // Disable controls if out of stock
    const isOutOfStock = stockLevel <= 0;
    quantity.disabled = isOutOfStock;
    decreaseBtn.disabled = isOutOfStock || quantity.value <= 1;
    increaseBtn.disabled = isOutOfStock || quantity.value >= stockLevel;
    
    if (isOutOfStock) {
      elements.addToCartBtn.disabled = true;
      elements.addToCartBtn.textContent = "Out of Stock";
    }
  };

  // Add this new function after updateUI
  const updateTags = (tags) => {
    if (!elements.tags || !tags || !Array.isArray(tags) || tags.length === 0) {
      if (elements.tags) {
        elements.tags.style.display = 'none';
      }
      return;
    }

    elements.tags.style.display = 'inline-flex';
    elements.tags.innerHTML = tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => `<span class="product-tag">${tag.trim()}</span>`)
      .join('');
  };

  // Add this new function
  const updateSpecifications = (specifications) => {
    const specsContainer = document.getElementById('productSpecifications');
    if (!specsContainer) return;

    if (!specifications || Object.keys(specifications).length === 0) {
      document.querySelector('.specifications-section').style.display = 'none';
      return;
    }

    specsContainer.innerHTML = Object.entries(specifications)
      .map(([label, value]) => `
        <div class="spec-item">
          <span class="spec-label">${formatSpecLabel(label)}:</span>
          <span class="spec-value">${value}</span>
        </div>
      `).join('');
  };

  // Add this helper function
  const formatSpecLabel = (label) => {
    return label
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Initialize the page
  init();
});