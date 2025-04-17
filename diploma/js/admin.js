/* admin.js
   Admin Panel script: manage products, orders, users, categories, etc.
   ~ ADVANCED & REFINED with live category updates, improved product logic ~
*/

document.addEventListener("DOMContentLoaded", () => {
  // Keep sidebar functionality
  const sidebar = document.getElementById("sidebar");
  const adminPanelToggle = document.getElementById("adminPanelToggle");
  const sidebarTrigger = document.getElementById("sidebar-trigger");
  const manageProductsSection = document.getElementById("manageProducts");
  const manageOrdersSection = document.getElementById("manageOrders");

  let touchStartX = 0;
  let touchEndX = 0;

  // ================================
  // Sidebar toggle
  // ================================
  if (adminPanelToggle) {
    adminPanelToggle.addEventListener("click", e => {
      e.preventDefault();
      sidebar.classList.toggle("active");
      sidebarTrigger.classList.toggle("active");
    });
  }
  if (sidebarTrigger) {
    sidebarTrigger.addEventListener("click", () => {
      sidebar.classList.remove("active");
      sidebarTrigger.classList.remove("active");
    });
  }

  // Swipe to open/close sidebar
  document.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
  }, false);
  document.addEventListener("touchend", e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    const threshold = 50; // min distance
    // If started near left edge
    if (touchStartX < 20 && swipeDistance > threshold) {
      sidebar.classList.add("active");
      sidebarTrigger.classList.add("active");
    } else if (swipeDistance < -threshold) {
      sidebar.classList.remove("active");
      sidebarTrigger.classList.remove("active");
    }
  }

  // Close sidebar if clicking outside
  document.addEventListener("click", e => {
    if (
      sidebar.classList.contains("active") &&
      !sidebar.contains(e.target) &&
      !e.target.matches("#adminPanelToggle, #adminPanelToggle *")
    ) {
      sidebar.classList.remove("active");
      sidebarTrigger.classList.remove("active");
    }
  });

  // ================================
  // Hash-based navigation
  // ================================
  let sections = ["manageProducts", "manageOrders"];
  
  function handleAdminSections() {
    let currentHash = window.location.hash.substring(1);
    sections.forEach(sec => {
      const div = document.getElementById(sec);
      const link = document.querySelector(`a[href="#${sec}"]`);
      if (!div || !link) return;
      if (sec === currentHash) {
        div.classList.add("active");
        link.classList.add("active");
      } else {
        div.classList.remove("active");
        link.classList.remove("active");
      }
    });
    
    if (!sections.includes(currentHash)) {
      manageProductsSection.classList.add("active");
      const link = document.querySelector(`a[href="#manageProducts"]`);
      if (link) link.classList.add("active");
      history.replaceState(null, null, "#manageProducts");
    }
  }
  window.addEventListener("hashchange", handleAdminSections);
  handleAdminSections(); // run once on load

  // ================================
  // Auth check: Only admin can view
  // ================================
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = "login.html";
    } else {
      db.collection("users").doc(user.uid).get().then(doc => {
        if (!doc.exists || doc.data().role !== "admin") {
          alert("Access denied. Admin only.");
          window.location.href = "index.html";
        } else {
          initAdminDashboard();
        }
      }).catch(err => {
        console.error("Error verifying admin role:", err);
        alert("Error verifying admin role.");
        window.location.href = "index.html";
      });
    }
  });

  // Initialize admin sections
  function initAdminDashboard() {
    // Define all admin sections
    const sections = ['manageProducts', 'manageCategories', 'manageOrders'];
    
    // Add click handlers for sidebar navigation
    document.querySelectorAll('#sidebar .components a').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        showSection(targetId);
      });
    });

    // Function to show/hide sections
    function showSection(sectionId) {
      sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
          if (section === sectionId) {
            element.classList.add('active');
          } else {
            element.classList.remove('active');
          }
        }
      });
    }

    // Initialize all sections
    setupManageProducts();
    setupManageCategories();
    setupManageOrders();

    // Show default section (products)
    showSection('manageProducts');
  }

  // ================================
  // MANAGE PRODUCTS
  // ================================
  function setupManageProducts() {
    const productsList = document.getElementById("productsList");
    const addProductForm = document.getElementById("addProductForm");
    const bulkDeleteBtn = document.getElementById("bulkDeleteBtn");

    if (!productsList) return;
    fetchProducts();

    function fetchProducts() {
      productsList.innerHTML = "<p>Loading products...</p>";
      db.collection("products").get().then(snapshot => {
        if (snapshot.empty) {
          productsList.innerHTML = "<p>No products found.</p>";
          return;
        }
        let html = '<div class="row">';
        snapshot.forEach(doc => {
          const p = doc.data();
          html += `
            <div class="col-md-4 mb-4">
              <div class="card h-100">
                <img src="${p.image||'images/default-product.jpg'}"
                     class="card-img-top"
                     alt="${p.name}"
                     style="object-fit:cover; height:200px;">
                <div class="card-body d-flex flex-column">
                  <input type="checkbox" class="mb-2 productCheckbox" data-product-id="${doc.id}">
                  <h5 class="card-title">${p.name}</h5>
                  <p class="card-text">${formatCurrency(p.price||0)}</p>
                  <button class="btn btn-primary btn-sm mr-2"
                    onclick="location.href='product-edit.html?productId=${doc.id}'">
                    Edit
                  </button>
                  <button class="btn btn-danger btn-sm"
                    onclick="confirmDeleteProduct('${doc.id}')">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          `;
        });
        html += "</div>";
        productsList.innerHTML = html;
      }).catch(err => {
        console.error("Error fetching products:", err);
        productsList.innerHTML = "<p>Error loading products.</p>";
      });
    }

    // ADDED: global function for product delete
    window.confirmDeleteProduct = function(productId) {
      if (!confirm("Are you sure you want to delete this product?")) return;
      db.collection("products").doc(productId).delete()
        .then(() => {
          alert("Product deleted.");
          fetchProducts();
        })
        .catch(err => console.error("Error deleting product:", err));
    };

    // Update the product form submission handler
    if (addProductForm) {
      addProductForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nameVal = document.getElementById("addProductName").value.trim();
        const priceVal = parseFloat(document.getElementById("addProductPrice").value);
        const stockVal = parseInt(document.getElementById("addProductStock").value);
        const discountVal = parseFloat(document.getElementById("addProductDiscount").value);
        const catVal = document.getElementById("addProductCategory").value.trim(); // Ensure trimmed value
        const descVal = document.getElementById("addProductDescription").value.trim();
        const tagsVal = document.getElementById("addProductTags").value.trim();
        const imageFile = document.getElementById("addProductImage").files[0];
        const imageUrl = document.getElementById("addProductImageUrl").value.trim();

        if (!nameVal || isNaN(priceVal) || !catVal || isNaN(stockVal)) {
          alert("Please fill in the required fields properly.");
          return;
        }

        let tagsArray = tagsVal.split(",").map(s => s.trim()).filter(s => s);
        let discount = isNaN(discountVal) ? 0 : discountVal;

        // Collect specifications
        const specs = {};
        const specNames = document.getElementsByName('specName[]');
        const specValues = document.getElementsByName('specValue[]');
        for (let i = 0; i < specNames.length; i++) {
            const name = specNames[i].value.trim();
            const value = specValues[i].value.trim();
            if (name && value) {
                specs[name] = value;
            }
        }

        try {
          // Handle image upload/URL
          let imageLink = "";
          if (imageFile) {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`products/${Date.now()}_${imageFile.name}`);
            await imageRef.put(imageFile);
            imageLink = await imageRef.getDownloadURL();
          } else if (imageUrl) {
            imageLink = imageUrl;
          }

          // Add product with normalized category
          await db.collection("products").add({
            name: nameVal,
            price: priceVal,
            stock: stockVal,
            discount: discount,
            category: catVal, // Category value is already trimmed
            image: imageLink,
            description: descVal,
            specifications: specs, // Add this line
            tags: tagsArray,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          alert("Product added successfully.");
          addProductForm.reset();
          fetchProducts();

        } catch (err) {
          console.error("Error adding product:", err);
          alert("Error adding product: " + err.message);
        }
      });
    }

    // Bulk delete
    if (bulkDeleteBtn) {
      bulkDeleteBtn.addEventListener("click", () => {
        let selected = [];
        document.querySelectorAll(".productCheckbox:checked").forEach(cb => {
          selected.push(cb.dataset.productId);
        });
        if (!selected.length) {
          alert("No products selected.");
          return;
        }
        if (!confirm("Are you sure you want to delete the selected products?")) return;
        let batch = db.batch();
        selected.forEach(id => {
          let ref = db.collection("products").doc(id);
          batch.delete(ref);
        });
        batch.commit()
          .then(() => {
            alert("Selected products deleted.");
            fetchProducts();
          })
          .catch(err => console.error("Bulk delete error:", err));
      });
    }

    setupImagePreview();
  }

  function setupImagePreview() {
    const fileInput = document.getElementById("addProductImage");
    const urlInput = document.getElementById("addProductImageUrl");
    const previewImg = document.createElement("img");
    previewImg.className = "product-image-preview";
    
    if (fileInput && urlInput) {
      fileInput.after(previewImg);

      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          urlInput.value = ""; // Clear URL input
          const reader = new FileReader();
          reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.classList.add("active");
          };
          reader.readAsDataURL(file);
        }
      });

      urlInput.addEventListener("input", (e) => {
        const url = e.target.value.trim();
        if (url) {
          fileInput.value = ""; // Clear file input
          previewImg.src = url;
          previewImg.classList.add("active");
        } else {
          previewImg.classList.remove("active");
        }
      });
    }
  }

  // Add this to your existing product rendering function
  function renderProducts(products) {
    // ...existing code...
    
    // Add edit button to product cards
    const editBtn = document.createElement('a');
    editBtn.href = `product-edit.html?id=${doc.id}`;
    editBtn.className = 'btn btn-primary btn-sm mr-2';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    
    // Add to your product card actions div
    actionsDiv.appendChild(editBtn);
    
    // ...rest of existing code...
  }

  // ================================
  // MANAGE CATEGORIES
  // ================================
  function setupManageCategories() {
    const categoriesSection = document.getElementById('manageCategories');
    
    if (!categoriesSection) {
      console.error('Categories section not found');
      return;
    }

    // Add the categories form if it doesn't exist
    if (!document.getElementById('addCategoryForm')) {
      categoriesSection.innerHTML = `
        <h2><i class="fas fa-tags"></i> Manage Categories</h2>
        
        <!-- Add Category Form -->
        <div class="card mb-4">
          <div class="card-header bg-primary text-white">
            <i class="fas fa-plus"></i> Add New Category
          </div>
          <div class="card-body">
            <form id="addCategoryForm">
              <div class="form-group">
                <label for="categoryName">Category Name</label>
                <input type="text" class="form-control" id="categoryName" required>
              </div>
              <div class="form-group">
                <label for="categoryIcon">Icon Class (Font Awesome)</label>
                <input type="text" class="form-control" id="categoryIcon" placeholder="fas fa-tag">
              </div>
              <div class="form-group">
                <label for="categoryDescription">Description</label>
                <textarea class="form-control" id="categoryDescription" rows="2"></textarea>
              </div>
              <button type="submit" class="btn btn-success">
                <i class="fas fa-plus-circle"></i> Add Category
              </button>
            </form>
          </div>
        </div>

        <!-- Categories List -->
        <div id="categoriesList">
          <!-- Categories will be loaded here dynamically -->
        </div>
      `;
    }

    // Initialize category management
    initializeCategoryManagement();
  }

  // ================================
  // MANAGE ORDERS
  // ================================
  function setupManageOrders() {
    const ordersList = document.getElementById("ordersList");
    if (!ordersList) return;

    fetchOrders();

    function fetchOrders() {
      ordersList.innerHTML = "<p>Loading orders...</p>";
      db.collection("orders").orderBy("createdAt", "desc").get().then(snapshot => {
        if (snapshot.empty) {
          ordersList.innerHTML = "<p>No orders found.</p>";
          return;
        }
        let html = "";
        snapshot.forEach(doc => {
          let order = doc.data();
          const date = order.createdAt ? order.createdAt.toDate().toLocaleString() : "N/A";
          html += `
            <div class="card mb-3">
              <div class="card-header">
                <strong>Order ID:</strong> ${doc.id} |
                <strong>Date:</strong> ${date} |
                <strong>Status:</strong> ${order.status}
              </div>
              <div class="card-body">
                <ul class="list-group list-group-flush">
                  ${(order.items||[]).map(item => {
                    let st = (item.price||0)*(item.quantity||1);
                    return `
                      <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>${item.name}</strong><br>
                          Qty: ${item.quantity} | Price: ${formatCurrency(item.price)}
                        </div>
                        <span>${formatCurrency(st)}</span>
                      </li>
                    `;
                  }).join('')}
                </ul>
                <div class="mt-3 text-right">
                  <strong>Total: </strong> ${formatCurrency(order.totalAmount||0)}
                </div>
                <div class="mt-3">
                  <label>Update Status:</label>
                  <select class="form-control w-50"
                          onchange="updateOrderStatus('${doc.id}', this.value)">
                    ${["Pending","Processing","Shipped","Delivered","Cancelled"].map(st => `
                      <option value="${st}" ${st===order.status?'selected':''}>${st}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>
          `;
        });
        ordersList.innerHTML = html;
      }).catch(err => {
        console.error("Error loading orders:", err);
        ordersList.innerHTML = "<p>Error loading orders.</p>";
      });
    }

    window.updateOrderStatus = function(orderId, newStatus) {
      db.collection("orders").doc(orderId).update({status:newStatus})
        .then(() => {
          alert("Order status updated.");
          fetchOrders();
        })
        .catch(err => {
          console.error("Error updating order status:", err);
          alert("Error updating order status.");
        });
    };
  }

  // ================================
  // MANAGE USERS
  // ================================
  function setupManageUsers() {
    const usersTableBody = document.querySelector("#usersTable tbody");
    if (!usersTableBody) return;

    fetchUsers();

    function fetchUsers() {
      usersTableBody.innerHTML = "<tr><td colspan='7'>Loading users...</td></tr>";
      db.collection("users").get()
        .then(snapshot => {
          if (snapshot.empty) {
            usersTableBody.innerHTML = "<tr><td colspan='7'>No users found.</td></tr>";
            return;
          }
          let html = "";
          snapshot.forEach(doc => {
            let u = doc.data();
            html += `
              <tr data-user-id="${doc.id}">
                <td><input type="checkbox" class="userCheckbox" data-user-id="${doc.id}"></td>
                <td>${u.fullName || "N/A"}</td>
                <td>${u.email || "N/A"}</td>
                <td><span class="badge badge-${u.role==='admin'?'primary':'secondary'}">${u.role||'user'}</span></td>
                <td><span class="badge badge-${u.active!==false?'success':'danger'}">${u.active!==false?'Active':'Inactive'}</span></td>
                <td>${u.createdAt ? new Date(u.createdAt.toDate()).toLocaleDateString() : 'N/A'}</td>
                <td>
                  ${u.role==='admin'
                    ? `<button class="btn btn-warning btn-sm" onclick="toggleUserRole('${doc.id}', 'admin')">Demote</button>`
                    : `<button class="btn btn-success btn-sm" onclick="toggleUserRole('${doc.id}', 'user')">Promote</button>`
                  }
                  ${u.active!==false
                    ? `<button class="btn btn-warning btn-sm ml-1" onclick="toggleUserStatus('${doc.id}', true)">Deactivate</button>`
                    : `<button class="btn btn-success btn-sm ml-1" onclick="toggleUserStatus('${doc.id}', false)">Activate</button>`
                  }
                  <button class="btn btn-danger btn-sm ml-1" onclick="deleteUser('${doc.id}')">Delete</button>
                </td>
              </tr>
            `;
          });
          usersTableBody.innerHTML = html;
        })
        .catch(err => {
          console.error("Error fetching users:", err);
          usersTableBody.innerHTML = "<tr><td colspan='7'>Error loading users.</td></tr>";
        });
    }

    // Bulk actions
    const bulkActivateBtn = document.getElementById("bulkActivateBtn");
    const bulkDeactivateBtn = document.getElementById("bulkDeactivateBtn");
    const bulkDeleteUsersBtn = document.getElementById("bulkDeleteUsersBtn");
    const selectAllUsers = document.getElementById("selectAllUsers");

    if (selectAllUsers) {
      selectAllUsers.addEventListener("change", () => {
        document.querySelectorAll(".userCheckbox").forEach(cb => {
          cb.checked = selectAllUsers.checked;
        });
      });
    }

    if (bulkActivateBtn) {
      bulkActivateBtn.addEventListener("click", () => bulkUserStatus(true));
    }
    if (bulkDeactivateBtn) {
      bulkDeactivateBtn.addEventListener("click", () => bulkUserStatus(false));
    }
    if (bulkDeleteUsersBtn) {
      bulkDeleteUsersBtn.addEventListener("click", () => bulkUserDelete());
    }

    function bulkUserStatus(newStatus) {
      let selected = [];
      document.querySelectorAll(".userCheckbox:checked").forEach(cb => {
        selected.push(cb.dataset.userId);
      });
      if (!selected.length) {
        alert("No users selected.");
        return;
      }
      if (!confirm(`Are you sure you want to ${newStatus?'Activate':'Deactivate'} selected users?`)) return;
      let batch = db.batch();
      selected.forEach(uid => {
        let ref = db.collection("users").doc(uid);
        batch.update(ref, { active: newStatus });
      });
      batch.commit()
        .then(() => {
          alert(`Selected users have been ${newStatus?"activated":"deactivated"}.`);
          fetchUsers();
        })
        .catch(err => console.error("Bulk user status error:", err));
    }

    function bulkUserDelete() {
      let selected = [];
      document.querySelectorAll(".userCheckbox:checked").forEach(cb => {
        selected.push(cb.dataset.userId);
      });
      if (!selected.length) {
        alert("No users selected.");
        return;
      }
      if (!confirm("Are you sure you want to delete the selected users?")) return;
      let batch = db.batch();
      selected.forEach(uid => {
        let ref = db.collection("users").doc(uid);
        batch.delete(ref);
      });
      batch.commit()
        .then(() => {
          alert("Selected users deleted.");
          fetchUsers();
        })
        .catch(err => console.error("Bulk user delete error:", err));
    }

    // Single user actions
    window.toggleUserRole = function(userId, currentRole) {
      let newRole = (currentRole === 'admin') ? 'user' : 'admin';
      db.collection("users").doc(userId).update({ role: newRole })
        .then(() => {
          alert("User role updated.");
          fetchUsers();
        })
        .catch(err => {
          console.error("Error updating user role:", err);
          alert("Error updating user role.");
        });
    };

    window.toggleUserStatus = function(userId, isActive) {
      let newStatus = !isActive;
      db.collection("users").doc(userId).update({ active: newStatus })
        .then(() => {
          alert("User status updated.");
          fetchUsers();
        })
        .catch(err => {
          console.error("Error updating user status:", err);
          alert("Error updating user status.");
        });
    };

    window.deleteUser = function(userId) {
      if (!confirm("Are you sure you want to delete this user?")) return;
      db.collection("users").doc(userId).delete()
        .then(() => {
          alert("User deleted.");
          fetchUsers();
        })
        .catch(err => {
          console.error("Error deleting user:", err);
          alert("Error deleting user.");
        });
    };
  }
});

// Add these functions to your existing admin.js file
function initializeAdminPanel() {
    // ...existing initialization code...
    
    // Add click handlers for sidebar navigation
    document.querySelectorAll('#sidebar .components a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            showSection(targetId);
        });
    });

    // Initialize categories management
    initializeCategoryManagement();
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show the selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }
}

function initializeCategoryManagement() {
    const addCategoryForm = document.getElementById('addCategoryForm');
    const categoriesList = document.getElementById('categoriesList');

    // Load existing categories when page loads
    loadCategories();

    // Handle form submission for new categories
    addCategoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const categoryName = document.getElementById('categoryName').value;
        const categoryIcon = document.getElementById('categoryIcon').value || 'fas fa-tag';
        const categoryDescription = document.getElementById('categoryDescription').value;

        try {
            await db.collection('categories').add({
                name: categoryName,
                icon: categoryIcon,
                description: categoryDescription,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Reset form
            addCategoryForm.reset();
            
            // Reload categories
            loadCategories();
            
            // Show success message
            alert('Category added successfully!');
            
        } catch (error) {
            console.error('Error adding category:', error);
            alert('Error adding category: ' + error.message);
        }
    });
}

async function loadCategories() {
    const categoriesList = document.getElementById('categoriesList');
    
    try {
        const snapshot = await db.collection('categories').orderBy('name').get();
        
        let html = '<div class="row">';
        snapshot.forEach(doc => {
            const category = doc.data();
            html += `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">
                                <i class="${category.icon}"></i> ${category.name}
                            </h5>
                            <p class="card-text">${category.description || 'No description'}</p>
                            <button class="btn btn-danger btn-sm" onclick="deleteCategory('${doc.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        categoriesList.innerHTML = html;

        // Update category dropdowns
        updateCategoryDropdowns(snapshot);

    } catch (error) {
        console.error('Error loading categories:', error);
        categoriesList.innerHTML = '<p class="text-danger">Error loading categories</p>';
    }
}

function updateCategoryDropdowns(snapshot) {
    const dropdowns = [
        document.getElementById('addProductCategory'),
        document.getElementById('productCategoryFilter')
    ];

    const options = ['<option value="">All Categories</option>'];
    snapshot.forEach(doc => {
        const category = doc.data();
        options.push(`<option value="${category.name}">${category.name}</option>`);
    });

    dropdowns.forEach(dropdown => {
        if (dropdown) {
            dropdown.innerHTML = options.join('');
        }
    });
}

// Add global delete function
window.deleteCategory = async function(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        await db.collection('categories').doc(categoryId).delete();
        loadCategories();
        alert('Category deleted successfully!');
    } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category: ' + error.message);
    }
};

// Call initialization when document is ready
document.addEventListener('DOMContentLoaded', initializeAdminPanel);

// Add this after form initialization
const addSpecButton = document.getElementById('addSpecButton');
if (addSpecButton) {
    addSpecButton.addEventListener('click', () => {
        const specRow = document.createElement('div');
        specRow.className = 'spec-row mb-2';
        specRow.innerHTML = `
            <div class="input-group">
                <input type="text" class="form-control" placeholder="Specification name" name="specName[]">
                <input type="text" class="form-control" placeholder="Specification value" name="specValue[]">
                <div class="input-group-append">
                    <button type="button" class="btn btn-danger remove-spec">
                        <i class="fas fa-minus"></i>
                    </button>
                </div>
            </div>
        `;
        document.getElementById('productSpecs').appendChild(specRow);
    });
}

// Add delegation for remove buttons
document.addEventListener('click', e => {
    if (e.target.closest('.remove-spec')) {
        e.target.closest('.spec-row').remove();
    }
});
