/***************************************************************
  checkout.js
  ----------------------------------------------------------------
  This script powers the Checkout page for MyFootballStore.
  It is responsible for:
    • Populating the order summary from the current user's cart.
    • Collecting and validating shipping information.
    • Creating an order record and clearing the cart.
    • Toggling payment method details (bank transfer vs. credit card).

  Author: Your Name
  Date: 2025-03-03
  Version: 1.0
***************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const checkoutForm = document.getElementById("checkoutForm");
  const orderSummary = document.getElementById("orderSummary");
  const successContainer = document.getElementById("successContainer");
  const errorContainer = document.getElementById("errorContainer");
  const checkoutButton = document.getElementById("placeOrderBtn");
  const checkoutButtonText = document.getElementById("checkoutButtonText");
  const checkoutButtonSpinner = document.getElementById("checkoutButtonSpinner");

  if (!checkoutForm || !orderSummary) return;

  auth.onAuthStateChanged(async user => {
    if (!user) {
      orderSummary.innerHTML = "<p>Please log in to view your cart.</p>";
      return;
    }
    populateOrderSummary(user.uid);
  });

  async function populateOrderSummary(uid) {
    try {
      let cartSnapshot = await db.collection("users").doc(uid).collection("cart").get();
      if (cartSnapshot.empty) {
        orderSummary.innerHTML = "<p>Your cart is empty.</p>";
        return;
      }
      let total = 0;
      let html = `
        <table class="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Qty</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
      `;
      cartSnapshot.forEach(doc => {
        const item = doc.data();
        let st = (item.price || 0) * (item.quantity || 1);
        total += st;
        html += `
          <tr>
            <td>${item.name}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(st)}</td>
          </tr>
        `;
      });
      html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3" class="text-right">Total</th>
              <th>${formatCurrency(total)}</th>
            </tr>
          </tfoot>
        </table>
      `;
      orderSummary.innerHTML = html;
    } catch (err) {
      console.error("Error populating order summary:", err);
      orderSummary.innerHTML = "<p>Error loading cart summary.</p>";
    }
  }

  checkoutForm.addEventListener("submit", async e => {
    e.preventDefault();
    toggleCheckoutButton(true);
    try {
      let user = auth.currentUser;
      if (!user) throw new Error("You must be logged in to checkout.");

      let data = collectCheckoutData();
      validateCheckoutData(data);

      let orderId = await createOrder(user.uid, data);
      await clearCart(user.uid);
      showCheckoutSuccess(orderId);
    } catch (err) {
      showCheckoutError(err.message);
    } finally {
      toggleCheckoutButton(false);
    }
  });

  function collectCheckoutData() {
    return {
      fullName: document.getElementById("fullName").value.trim(),
      address: document.getElementById("shippingAddress").value.trim(),
      city: document.getElementById("city").value.trim(),
      postalCode: document.getElementById("zipCode").value.trim(),
      country: document.getElementById("state").value.trim() // Adjust as needed
    };
  }

  function validateCheckoutData(d) {
    if (!d.fullName) throw new Error("Name is required.");
    if (!d.address) throw new Error("Address is required.");
    if (!d.city) throw new Error("City is required.");
    if (!d.postalCode) throw new Error("Postal code is required.");
    if (!d.country) throw new Error("Country is required.");
  }

  async function createOrder(uid, data) {
    let cartSnapshot = await db.collection("users").doc(uid).collection("cart").get();
    if (cartSnapshot.empty) throw new Error("Your cart is empty.");

    let items = [];
    let totalAmount = 0;
    cartSnapshot.forEach(doc => {
      let item = doc.data();
      let st = (item.price || 0) * (item.quantity || 1);
      totalAmount += st;
      items.push({
        productId: doc.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      });
    });

    let orderData = {
      userId: uid,
      fullName: data.fullName,
      address: data.address,
      city: data.city,
      postalCode: data.postalCode,
      country: data.country,
      items,
      totalAmount,
      status: "Pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    let orderRef = await db.collection("orders").add(orderData);
    return orderRef.id;
  }

  async function clearCart(uid) {
    let cartRef = db.collection("users").doc(uid).collection("cart");
    let snapshot = await cartRef.get();
    if (!snapshot.empty) {
      let batch = db.batch();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
  }

  function toggleCheckoutButton(loading) {
    // Ensure these elements exist before toggling
    if (!checkoutButton) return;
    if (loading) {
      checkoutButton.disabled = true;
      if (checkoutButtonText) checkoutButtonText.style.display = "none";
      if (checkoutButtonSpinner) checkoutButtonSpinner.style.display = "inline-block";
    } else {
      checkoutButton.disabled = false;
      if (checkoutButtonText) checkoutButtonText.style.display = "inline-block";
      if (checkoutButtonSpinner) checkoutButtonSpinner.style.display = "none";
    }
  }

  function showCheckoutError(msg) {
    if (errorContainer) {
      errorContainer.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
      errorContainer.style.display = "block";
    } else {
      alert(msg);
    }
  }

  function showCheckoutSuccess(orderId) {
    if (successContainer) {
      successContainer.innerHTML = `<div class="alert alert-success">
            <strong>Success!</strong> Order #${orderId} has been placed successfully.
            <br>Redirecting to your profile...
        </div>`;
      successContainer.style.display = "block";
      errorContainer.style.display = "none";
      
      // Redirect to profile.html after 2 seconds
      setTimeout(() => {
        window.location.href = "profile.html";
      }, 2000);
    } else {
      alert("Order placed successfully!");
      window.location.href = "profile.html";
    }
  }

  // Payment method toggle section
  const paymentMethods = document.getElementsByName('paymentMethod');
  const bankTransferDetails = document.getElementById('bankTransferDetails');
  const creditCardDetails = document.getElementById('creditCardDetails');
  const cardInputs = creditCardDetails ? creditCardDetails.querySelectorAll('input') : [];

  function togglePaymentDetails() {
    const selectedRadio = document.querySelector('input[name="paymentMethod"]:checked');
    const selectedMethod = selectedRadio ? selectedRadio.value : "";
    
    if (bankTransferDetails) bankTransferDetails.style.display = 'none';
    if (creditCardDetails) creditCardDetails.style.display = 'none';
    cardInputs.forEach(input => {
      input.required = false;
    });

    if (selectedMethod === 'bank' && bankTransferDetails) {
      bankTransferDetails.style.display = 'block';
    } else if (selectedMethod === 'card' && creditCardDetails) {
      creditCardDetails.style.display = 'block';
      cardInputs.forEach(input => {
        input.required = true;
      });
    }
  }

  if (paymentMethods.length > 0) {
    paymentMethods.forEach(radio => {
      radio.addEventListener('change', togglePaymentDetails);
    });
  }
  togglePaymentDetails();
});

// Initialize variables
let cart = [];
let currentUser = null;
let subtotal = 0;
const shippingCost = 5.00;

// DOM Elements
const checkoutForm = document.getElementById('checkoutForm');
const orderSummaryDiv = document.querySelector('.cart-items');
const subtotalSpan = document.getElementById('subtotal');
const totalSpan = document.getElementById('total');
const successContainer = document.getElementById('successContainer');
const errorContainer = document.getElementById('errorContainer');

// Payment method elements
const bankTransferDetails = document.getElementById('bankTransferDetails');
const creditCardDetails = document.getElementById('creditCardDetails');
const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');

// Listen for auth state changes
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        loadUserData();
        loadCartItems();
    } else {
        window.location.href = 'login.html';
    }
});

// Load user data
async function loadUserData() {
    try {
        const userDoc = await firebase.firestore().collection('users')
            .doc(currentUser.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('fullName').value = userData.fullName || '';
            document.getElementById('email').value = userData.email || currentUser.email;
            document.getElementById('shippingAddress').value = userData.address || '';
            document.getElementById('city').value = userData.city || '';
            document.getElementById('state').value = userData.state || '';
            document.getElementById('zipCode').value = userData.zipCode || '';
        }
    } catch (error) {
        showError('Error loading user data');
        console.error('Error loading user data:', error);
    }
}

// Load cart items
async function loadCartItems() {
    try {
        const cartRef = firebase.firestore()
            .collection('carts')
            .doc(currentUser.uid);
            
        const doc = await cartRef.get();
        
        if (!doc.exists) {
            // Create empty cart if it doesn't exist
            await cartRef.set({
                items: [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            cart = [];
        } else {
            cart = doc.data().items || [];
        }
        
        updateOrderSummary();
    } catch (error) {
        console.error('Error loading cart:', error);
        showError('Error loading cart. Please try refreshing the page.');
    }
}

// Update order summary
function updateOrderSummary() {
    orderSummaryDiv.innerHTML = '';
    subtotal = 0;

    cart.forEach(item => {
        subtotal += item.price * item.quantity;
        orderSummaryDiv.innerHTML += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <span>${item.name} x ${item.quantity}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        `;
    });

    subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    totalSpan.textContent = `$${(subtotal + shippingCost).toFixed(2)}`;
}

// Payment method switching
paymentMethods.forEach(method => {
    method.addEventListener('change', (e) => {
        bankTransferDetails.style.display = 'none';
        creditCardDetails.style.display = 'none';

        if (e.target.value === 'bank') {
            bankTransferDetails.style.display = 'block';
        } else if (e.target.value === 'card') {
            creditCardDetails.style.display = 'block';
        }
    });
});

// Form submission
checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = document.getElementById('placeOrderBtn');
    submitButton.disabled = true;

    try {
        // Create order object
        const order = {
            userId: currentUser.uid,
            items: cart,
            subtotal: subtotal,
            shipping: shippingCost,
            total: subtotal + shippingCost,
            status: 'pending',
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
            shippingDetails: {
                fullName: document.getElementById('fullName').value,
                email: document.getElementById('email').value,
                address: document.getElementById('shippingAddress').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Save order to Firestore
        const orderRef = await firebase.firestore().collection('orders').add(order);

        // Clear cart
        await firebase.firestore().collection('carts').doc(currentUser.uid).delete();

        // Show success message
        showSuccess(`Order placed successfully! Order ID: ${orderRef.id}`);
        
        // Redirect to profile page after 2 seconds
        setTimeout(() => {
            window.location.href = "profile.html";
        }, 2000);

    } catch (error) {
        showError('Error placing order. Please try again.');
        console.error('Error placing order:', error);
        submitButton.disabled = false;
    }
});

// Utility functions for showing messages
function showSuccess(message) {
    successContainer.textContent = message;
    successContainer.style.display = 'block';
    errorContainer.style.display = 'none';
}

function showError(message) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    successContainer.style.display = 'none';
}

// Input validation for credit card fields
document.getElementById('cardNumber').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
});

document.getElementById('expiryDate').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
});

document.getElementById('cvv').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});
