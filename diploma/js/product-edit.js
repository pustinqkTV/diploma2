/* product-edit.js
   Enhanced product editing with real-time preview, etc.
*/
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("editProductForm");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("productId");
  if (!productId) {
    alert("Invalid product ID.");
    window.location.href = "admin.html";
    return;
  }

  const editForm = document.getElementById('editProductForm');
  const imagePreviewContainer = document.getElementById('imagePreviewContainer');
  const currentImagesContainer = document.getElementById('currentImages');
  const categorySelect = document.getElementById('editProductCategory');

  // Check authentication and admin status
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    db.collection('users').doc(user.uid).get()
      .then(doc => {
        if (!doc.exists || doc.data().role !== 'admin') {
          alert('Access denied. Admin only.');
          window.location.href = 'index.html';
          return;
        }
        // Initialize after auth check
        loadCategories();
        loadProductData(productId);
      });
  });

  // Load categories
  async function loadCategories() {
    try {
      const snapshot = await db.collection('categories').orderBy('name').get();
      let options = ['<option value="">Select a category</option>'];
      
      snapshot.forEach(doc => {
        const category = doc.data();
        options.push(`<option value="${category.name}">${category.name}</option>`);
      });
      
      categorySelect.innerHTML = options.join('');
    } catch (error) {
      console.error('Error loading categories:', error);
      alert('Error loading categories. Please try again.');
    }
  }

  async function loadProductData(productId) {
    try {
      const doc = await db.collection('products').doc(productId).get();
      if (!doc.exists) {
        alert('Product not found');
        window.location.href = 'admin.html';
        return;
      }

      const data = doc.data();
      
      // Fill form fields
      document.getElementById('editProductName').value = data.name || '';
      document.getElementById('editProductPrice').value = data.price || '';
      document.getElementById('editProductStock').value = data.stock || '';
      document.getElementById('editProductCategory').value = data.category || '';
      document.getElementById('editProductDiscount').value = data.discount || '';
      document.getElementById('editProductDescription').value = data.description || '';
      document.getElementById('editProductTags').value = (data.tags || []).join(', ');

      // Load specifications
      const specsContainer = document.getElementById('editProductSpecs');
      specsContainer.innerHTML = ''; // Clear existing specs
      
      if (data.specifications) {
          Object.entries(data.specifications).forEach(([name, value]) => {
              specsContainer.appendChild(createSpecRow(name, value));
          });
      }
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Error loading product data');
    }
  }

  function displayCurrentImage(url, isMain) {
    const wrapper = document.createElement('div');
    wrapper.className = 'position-relative mr-2 mb-2';
    
    const img = document.createElement('img');
    img.src = url;
    img.style.width = '100px';
    img.style.height = '100px';
    img.style.objectFit = 'cover';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm position-absolute';
    deleteBtn.style.top = '5px';
    deleteBtn.style.right = '5px';
    deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
    deleteBtn.onclick = () => removeImage(url, isMain);
    
    wrapper.appendChild(img);
    wrapper.appendChild(deleteBtn);
    currentImagesContainer.appendChild(wrapper);
  }

  async function removeImage(url, isMain) {
    if (!confirm('Are you sure you want to remove this image?')) return;
    
    try {
      const productRef = db.collection('products').doc(productId);
      if (isMain) {
        await productRef.update({ image: '' });
      } else {
        await productRef.update({
          gallery: firebase.firestore.FieldValue.arrayRemove(url)
        });
      }
      location.reload();
    } catch (error) {
      console.error('Error removing image:', error);
      alert('Error removing image');
    }
  }

  // Handle form submission
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      // Show loading indicator
      const submitButton = e.target.querySelector('button[type="submit"]');
      const originalButtonText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

      const updates = {
        name: document.getElementById('editProductName').value.trim(),
        price: parseFloat(document.getElementById('editProductPrice').value),
        stock: parseInt(document.getElementById('editProductStock').value),
        category: document.getElementById('editProductCategory').value,
        discount: parseFloat(document.getElementById('editProductDiscount').value) || 0,
        description: document.getElementById('editProductDescription').value.trim(),
        tags: document.getElementById('editProductTags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

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

      updates.specifications = specs;

      // Update the product in Firestore
      await db.collection('products').doc(productId).update(updates);

      // Show success message and redirect
      alert('Product updated successfully!');
      window.location.href = 'admin.html#manageProducts';

    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Error updating product: ${error.message}`);
    } finally {
      // Reset button state
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });

  // Add specification row helper
  function createSpecRow(name = '', value = '') {
    const row = document.createElement('div');
    row.className = 'spec-row mb-2';
    row.innerHTML = `
        <div class="input-group">
            <input type="text" class="form-control" placeholder="Specification name" 
                   name="specName[]" value="${name}">
            <input type="text" class="form-control" placeholder="Specification value" 
                   name="specValue[]" value="${value}">
            <div class="input-group-append">
                <button type="button" class="btn btn-danger remove-spec">
                    <i class="fas fa-minus"></i>
                </button>
            </div>
        </div>
    `;
    return row;
  }

  // Add specification button handler
  document.getElementById('addSpecButton')?.addEventListener('click', () => {
    document.getElementById('editProductSpecs').appendChild(createSpecRow());
  });
});
