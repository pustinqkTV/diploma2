/* login.js */
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const togglePassword = document.getElementById("togglePassword");
  const errorMessage = document.getElementById("errorMessage");
  const loginButton = document.getElementById("loginButton");
  const loginButtonSpinner = document.getElementById("loginButtonSpinner");
  const loginButtonText = document.getElementById("loginButtonText");

  // Check for remembered credentials
  const rememberedEmail = localStorage.getItem('rememberedEmail');
  const rememberedPassword = localStorage.getItem('rememberedPassword');
  
  if (rememberedEmail && rememberedPassword) {
      emailInput.value = rememberedEmail;
      passwordInput.value = rememberedPassword;
      document.getElementById('rememberMe').checked = true;
  }

  // Show/hide password
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const isPass = (passwordInput.type === "password");
      passwordInput.type = isPass ? "text" : "password";
      togglePassword.querySelector("i").classList.toggle("fa-eye");
      togglePassword.querySelector("i").classList.toggle("fa-eye-slash");
    });

    // Prevent form submission when clicking the toggle button
    togglePassword.addEventListener('mousedown', function(e) {
      e.preventDefault();
    });
  }

  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    if (errorMessage) {
      errorMessage.style.display = "none";
      errorMessage.textContent = "";
    }
    const emailVal = emailInput.value.trim();
    const passVal = passwordInput.value.trim();
    const rememberMe = document.getElementById('rememberMe').checked;

    if (!emailVal || !passVal) {
      showLoginError("Please enter email and password.");
      return;
    }

    loginButton.disabled = true;
    loginButtonSpinner.style.display = "inline-block";
    loginButtonText.style.display = "none";

    try {
      await auth.signInWithEmailAndPassword(emailVal, passVal);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', emailVal);
        localStorage.setItem('rememberedPassword', passVal);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }

      window.location.href = "index.html";
    } catch (err) {
      console.error("Login error:", err);
      showLoginError(mapLoginError(err.code));
    } finally {
      loginButton.disabled = false;
      loginButtonSpinner.style.display = "none";
      loginButtonText.style.display = "inline-block";
    }
  });

  function showLoginError(msg) {
    errorMessage.textContent = msg;
    errorMessage.style.display = "block";
  }
  function mapLoginError(code) {
    switch (code) {
      case 'auth/invalid-email': return "Invalid email format.";
      case 'auth/user-disabled': return "User account disabled.";
      case 'auth/user-not-found': return "No user found with this email.";
      case 'auth/wrong-password': return "Wrong password.";
      default: return "An unexpected error occurred. Try again.";
    }
  }

  // Forgot password handling
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  const sendResetLink = document.getElementById('sendResetLink');

  sendResetLink.addEventListener('click', async function() {
    const resetEmail = document.getElementById('resetEmail').value;
    const resetError = document.getElementById('resetPasswordError');
    const resetSuccess = document.getElementById('resetPasswordSuccess');
    
    resetError.style.display = 'none';
    resetSuccess.style.display = 'none';
    sendResetLink.disabled = true;

    try {
        await firebase.auth().sendPasswordResetEmail(resetEmail);
        resetSuccess.textContent = 'Password reset email sent! Please check your inbox.';
        resetSuccess.style.display = 'block';
        setTimeout(() => {
            $('#forgotPasswordModal').modal('hide');
            sendResetLink.disabled = false;
        }, 3000);
    } catch (error) {
        resetError.textContent = error.message;
        resetError.style.display = 'block';
        sendResetLink.disabled = false;
    }
  });
});
