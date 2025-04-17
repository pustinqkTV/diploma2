/***************************************************
 register.js
 Handles the register page logic (registerForm).
****************************************************/

document.addEventListener("DOMContentLoaded", () => {
    let registerForm = document.getElementById("registerForm");
    if (!registerForm) return;
  
    let successContainer = document.getElementById("successContainer");
    let errorContainer = document.getElementById("errorContainer");
    let passwordInput = document.getElementById("password");
    let passwordStrengthBar = document.getElementById("passwordStrengthBar"); // If used
    let togglePassword = document.getElementById("togglePassword");
    let toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
    let errorMessage = document.getElementById("errorMessage");
  
    // Show/hide password
    if (togglePassword && passwordInput) {
      togglePassword.addEventListener("click", () => {
        let isPass = (passwordInput.type === "password");
        passwordInput.type = isPass ? "text" : "password";
        togglePassword.querySelector("i").classList.toggle("fa-eye");
        togglePassword.querySelector("i").classList.toggle("fa-eye-slash");
      });
    }

    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const confirmPassword = document.getElementById('confirmPassword');
            togglePasswordVisibility(confirmPassword, this);
        });
    }

    function togglePasswordVisibility(input, button) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        button.querySelector('i').classList.toggle('fa-eye');
        button.querySelector('i').classList.toggle('fa-eye-slash');
    }
  
    // If there's a password strength bar, update it
    if (passwordInput && passwordStrengthBar) {
      passwordInput.addEventListener("input", () => {
        let strength = calcPasswordStrength(passwordInput.value);
        updatePasswordStrength(strength);
      });
    }
  
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (successContainer) {
        successContainer.style.display = "none";
        successContainer.innerHTML = "";
      }
      if (errorContainer) {
        errorContainer.style.display = "none";
        errorContainer.innerHTML = "";
      }
  
      // Update these lines to use firstName and lastName
      let firstNameVal = document.getElementById("firstName")?.value.trim() || '';
      let lastNameVal = document.getElementById("lastName")?.value.trim() || '';
      let emailVal = document.getElementById("email")?.value.trim() || '';
      let passVal = document.getElementById("password")?.value || '';
      let confirmVal = document.getElementById("confirmPassword")?.value || '';
      let agreeTerms = document.getElementById("agreeTerms")?.checked || false;
  
      let errs = [];
      if (passVal !== confirmVal) {
        errs.push("Passwords do not match.");
      }
      if (!firstNameVal || !lastNameVal || !emailVal) {
        errs.push("All fields are required.");
      }
      if (!agreeTerms) {
        errs.push("You must agree to the Terms & Conditions.");
      }
  
      if (errs.length > 0) {
        if (errorMessage) {
          errorMessage.textContent = errs.join("\n");
          errorMessage.style.display = "block";
        }
        return;
      }
  
      let registerButton = document.getElementById("registerButton");
      let registerButtonSpinner = document.getElementById("registerButtonSpinner");
      let registerButtonText = document.getElementById("registerButtonText");
      
      if (registerButton && registerButtonSpinner && registerButtonText) {
        registerButton.disabled = true;
        registerButtonSpinner.style.display = "inline-block";
        registerButtonText.style.display = "none";
      }
  
      try {
        let cred = await auth.createUserWithEmailAndPassword(emailVal, passVal);
        await cred.user.sendEmailVerification();
        await db.collection("users").doc(cred.user.uid).set({
          firstName: firstNameVal,
          lastName: lastNameVal,
          email: emailVal,
          role: "user",
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        if (errorMessage) {
          errorMessage.className = 'alert alert-success';
          errorMessage.textContent = "Registration successful! Redirecting to login page...";
          errorMessage.style.display = "block";
        }
        
        // Reset form
        registerForm.reset();
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 2000);

      } catch (err) {
        console.error("Registration Error:", err);
        let msg = mapRegisterError(err.code);
        if (errorMessage) {
          errorMessage.textContent = msg;
          errorMessage.style.display = "block";
        }
      } finally {
        if (registerButton && registerButtonSpinner && registerButtonText) {
          registerButton.disabled = false;
          registerButtonSpinner.style.display = "none";
          registerButtonText.style.display = "inline-block";
        }
      }
    });
  
    function calcPasswordStrength(pw) {
      let strength = 0;
      if (pw.length >= 6) strength++;
      if (/[A-Z]/.test(pw)) strength++;
      if (/[0-9]/.test(pw)) strength++;
      if (/[^A-Za-z0-9]/.test(pw)) strength++;
      if (strength <= 1) return 0; // weak
      if (strength === 2) return 1; // medium
      if (strength === 3 || strength === 4) return 2; // strong
      return 0;
    }
    function updatePasswordStrength(strength) {
      if (!passwordStrengthBar) return;
      passwordStrengthBar.style.width = "0%";
      passwordStrengthBar.style.backgroundColor = "#dc3545";
      if (strength === 1) {
        passwordStrengthBar.style.width = "50%";
        passwordStrengthBar.style.backgroundColor = "#ffc107";
      } else if (strength === 2) {
        passwordStrengthBar.style.width = "100%";
        passwordStrengthBar.style.backgroundColor = "#28a745";
      }
    }
    function showRegisterError(msg) {
      errorContainer.innerHTML = msg;
      errorContainer.style.display = "block";
    }
    function showRegisterSuccess(msg) {
      successContainer.innerHTML = msg;
      successContainer.style.display = "block";
    }
    function mapRegisterError(code) {
      switch (code) {
        case 'auth/email-already-in-use': return "Email is already in use.";
        case 'auth/invalid-email': return "Invalid email.";
        case 'auth/weak-password': return "Your password is too weak.";
        default: return "An error occurred during registration.";
      }
    }
  });
