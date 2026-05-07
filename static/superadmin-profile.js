// ==================== SESSION MANAGEMENT ====================
if (window.SessionManager) {
    window.SessionManager.init();
} else {
    console.error("SessionManager not loaded!");
    if (!localStorage.getItem('userType') || !sessionStorage.getItem('sessionToken')) {
        window.location.replace('/');
    }
}

// ==================== DOM ELEMENTS ====================
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const editBtn = document.getElementById("editBtn");
const updateBtn = document.getElementById("updateBtn");
const cancelBtn = document.getElementById("cancelBtn");
const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const closeModalBtn = document.getElementById("closeModalBtn");
const toast = document.getElementById("toast");
const statusEl = document.getElementById("status");
const areaText = document.getElementById("areaText");
const usernameDisplayEl = document.getElementById("usernameDisplay");
const passwordStrength = document.getElementById("passwordStrength");
const confirmPasswordError = document.getElementById("confirmPasswordError");

let originalName = "";
let originalEmail = "";

// Initially disable fields
if (nameInput) nameInput.disabled = true;
if (emailInput) emailInput.disabled = true;
if (passwordInput) passwordInput.disabled = true;
if (confirmPasswordInput) confirmPasswordInput.disabled = true;

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = "success") {
    if (!toast) return;
    toast.style.background = type === "success" ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

// ==================== EMAIL VALIDATION ====================
function validateEmail(email) {
    if (!email || email.trim() === "") {
        return { isValid: false, message: "Email cannot be empty" };
    }
    if (email.startsWith(" ")) {
        return { isValid: false, message: "Email cannot start with space" };
    }
    if (email.includes("  ")) {
        return { isValid: false, message: "Double spaces are not allowed in email" };
    }
    if (email.includes(" ")) {
        return { isValid: false, message: "Email cannot contain spaces" };
    }
    if (!email.endsWith("@gmail.com")) {
        return { isValid: false, message: "Only @gmail.com email addresses are allowed" };
    }
    const localPart = email.replace("@gmail.com", "");
    if (!localPart || localPart.length === 0) {
        return { isValid: false, message: "Please enter a valid email address" };
    }
    const localPartRegex = /^[A-Za-z0-9._]+$/;
    if (!localPartRegex.test(localPart)) {
        return { isValid: false, message: "Email can only contain letters, numbers, dots, and underscores" };
    }
    if (localPart.startsWith(".") || localPart.endsWith(".")) {
        return { isValid: false, message: "Email cannot start or end with a dot" };
    }
    if (localPart.includes("..")) {
        return { isValid: false, message: "Email cannot contain consecutive dots" };
    }
    return { isValid: true, message: "" };
}

// ==================== NAME VALIDATION ====================
function validateName(name) {
    if (!name || name.trim() === "") {
        return { isValid: false, message: "Name cannot be empty" };
    }
    if (name.length < 2) {
        return { isValid: false, message: "Name must be at least 2 characters" };
    }
    if (name.startsWith(" ")) {
        return { isValid: false, message: "Name cannot start with space" };
    }
    if (name.includes("  ")) {
        return { isValid: false, message: "Double spaces are not allowed" };
    }
    const nameRegex = /^[A-Za-z\s.\-']+$/;
    if (!nameRegex.test(name)) {
        return { isValid: false, message: "Name can only contain letters, spaces, dots, hyphens, and apostrophes" };
    }
    if (/\d/.test(name)) {
        return { isValid: false, message: "Numbers are not allowed in name" };
    }
    return { isValid: true, message: "" };
}

function formatName(name) {
    if (!name) return name;
    let formatted = name.trim();
    formatted = formatted.replace(/\s+/g, ' ');
    formatted = formatted.split(' ').map(word => {
        if (word.includes('-')) {
            return word.split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
    return formatted;
}

// ==================== PASSWORD VALIDATION (modified - no toast) ====================
function validatePasswordOnly(password) {
    if (!password || password.trim() === "") {
        return { isValid: false, message: "Password cannot be empty" };
    }
    if (password.startsWith(" ")) {
        return { isValid: false, message: "Password cannot start with space" };
    }
    if (password.endsWith(" ")) {
        return { isValid: false, message: "Password cannot end with space" };
    }
    if (password.includes(" ")) {
        return { isValid: false, message: "Password cannot contain spaces" };
    }
    if (password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters" };
    }
    const letters = password.replace(/[^A-Za-z]/g, "");
    if (letters && letters === letters.toUpperCase()) {
        return { isValid: false, message: "Password must contain at least one lowercase letter" };
    }
    if (letters && letters === letters.toLowerCase()) {
        return { isValid: false, message: "Password must contain at least one uppercase letter" };
    }
    if (/^\d+$/.test(password)) {
        return { isValid: false, message: "Password cannot be all numbers" };
    }
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one number" };
    }
    return { isValid: true, message: "" };
}

// ==================== VALIDATE CONFIRM PASSWORD FIELD (NEW) ====================
function validateConfirmPassword() {
    if (!confirmPasswordInput || confirmPasswordInput.disabled) return true;
    
    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmPasswordInput.value;
    
    // Clear previous error
    if (confirmPasswordError) {
        confirmPasswordError.classList.remove("show");
        confirmPasswordError.textContent = "";
    }
    confirmPasswordInput.classList.remove("error-input");
    
    // Only validate if password field has a value OR confirm password has a value
    if (!password && !confirmPassword) {
        return true; // Both empty is fine (user didn't want to change password)
    }
    
    // If password has value but confirm is empty
    if (password && (!confirmPassword || confirmPassword.trim() === "")) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = "Confirm password cannot be empty";
            confirmPasswordError.classList.add("show");
        }
        confirmPasswordInput.classList.add("error-input");
        return false;
    }
    
    // If passwords don't match
    if (password && confirmPassword && password !== confirmPassword) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = "Passwords do not match";
            confirmPasswordError.classList.add("show");
        }
        confirmPasswordInput.classList.add("error-input");
        return false;
    }
    
    return true;
}

// ==================== PASSWORD STRENGTH ====================
function checkPasswordStrength(password) {
    if (!password || password.length === 0) {
        return 'empty';
    }
    if (password.length < 8) {
        return 'too-short';
    }
    const letters = password.replace(/[^A-Za-z]/g, "");
    if (letters && letters === letters.toUpperCase()) {
        return 'all-uppercase';
    }
    if (/^\d+$/.test(password)) {
        return 'all-numbers';
    }
    if (password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
        return 'strong';
    }
    return 'acceptable';
}

function updatePasswordStrengthUI(password) {
    if (!passwordInput || !passwordStrength) return;
    
    if (passwordInput.disabled) {
        passwordStrength.style.display = 'none';
        return;
    }
    
    const strength = checkPasswordStrength(password);
    
    if (strength === 'empty') {
        passwordStrength.style.display = 'none';
        return;
    }
    
    let message = '';
    let className = '';
    
    switch(strength) {
        case 'too-short':
            message = '⚠️ Password must be at least 8 characters';
            className = 'weak';
            break;
        case 'all-uppercase':
            message = '⚠️ Password must contain at least one lowercase letter';
            className = 'weak';
            break;
        case 'all-numbers':
            message = '⚠️ Password cannot be all numbers';
            className = 'weak';
            break;
        case 'acceptable':
            message = '✓ Password looks good (add numbers for stronger password)';
            className = 'strong';
            break;
        case 'strong':
            message = '✓ Strong password!';
            className = 'strong';
            break;
        default:
            message = '';
            className = '';
    }
    
    if (message) {
        passwordStrength.textContent = message;
        passwordStrength.className = `password-strength ${className}`;
        passwordStrength.style.display = 'block';
    } else {
        passwordStrength.style.display = 'none';
    }
    
    // Also validate confirm password when password changes
    if (confirmPasswordInput && confirmPasswordInput.value) {
        validateConfirmPassword();
    }
}

// ==================== REAL-TIME VALIDATION ====================
if (nameInput) {
    nameInput.addEventListener("input", function() {
        if (!nameInput.disabled) {
            const validation = validateName(this.value);
            if (!validation.isValid) {
                if (nameError) {
                    nameError.textContent = validation.message;
                    nameError.classList.add("show");
                }
                nameInput.classList.add("error-input");
            } else {
                if (nameError) nameError.classList.remove("show");
                nameInput.classList.remove("error-input");
            }
        }
    });
    
    nameInput.addEventListener("blur", function() {
        if (!nameInput.disabled && validateName(this.value).isValid && this.value.trim() !== "") {
            const formattedName = formatName(this.value);
            if (formattedName !== this.value) {
                this.value = formattedName;
            }
        }
    });
}

if (emailInput) {
    emailInput.addEventListener("input", function() {
        if (!emailInput.disabled) {
            const validation = validateEmail(this.value);
            if (!validation.isValid) {
                if (emailError) {
                    emailError.textContent = validation.message;
                    emailError.classList.add("show");
                }
                emailInput.classList.add("error-input");
            } else {
                if (emailError) emailError.classList.remove("show");
                emailInput.classList.remove("error-input");
            }
        }
    });

    emailInput.addEventListener("blur", function() {
        if (!emailInput.disabled && this.value.trim() !== "") {
            this.value = this.value.toLowerCase();
            const validation = validateEmail(this.value);
            if (!validation.isValid) {
                if (emailError) {
                    emailError.textContent = validation.message;
                    emailError.classList.add("show");
                }
                emailInput.classList.add("error-input");
            } else {
                if (emailError) emailError.classList.remove("show");
                emailInput.classList.remove("error-input");
            }
        }
    });
}

if (passwordInput) {
    passwordInput.addEventListener("input", function() {
        if (!passwordInput.disabled) {
            updatePasswordStrengthUI(this.value);
        }
    });
    
    passwordInput.addEventListener("keydown", function(e) {
        if (e.key === ' ' && !passwordInput.disabled) {
            e.preventDefault();
            showToast("Spaces are not allowed in password", "error");
        }
    });
}

// ==================== REAL-TIME CONFIRM PASSWORD VALIDATION (NEW) ====================
if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", function() {
        if (!confirmPasswordInput.disabled) {
            validateConfirmPassword();
        }
    });
    
    confirmPasswordInput.addEventListener("blur", function() {
        if (!confirmPasswordInput.disabled) {
            validateConfirmPassword();
        }
    });
    
    confirmPasswordInput.addEventListener("keydown", function(e) {
        if (e.key === ' ' && !confirmPasswordInput.disabled) {
            e.preventDefault();
            showToast("Spaces are not allowed in password", "error");
        }
    });
}

// ==================== CLEAR FIELD ERRORS ====================
function clearFieldErrors() {
    if (nameError) {
        nameError.classList.remove("show");
        nameError.textContent = "";
    }
    if (emailError) {
        emailError.classList.remove("show");
        emailError.textContent = "";
    }
    if (confirmPasswordError) {
        confirmPasswordError.classList.remove("show");
        confirmPasswordError.textContent = "";
    }
    if (nameInput) nameInput.classList.remove("error-input");
    if (emailInput) emailInput.classList.remove("error-input");
    if (confirmPasswordInput) confirmPasswordInput.classList.remove("error-input");
}

// ==================== EDIT MODE ====================
if (editBtn) {
    editBtn.addEventListener("click", () => {
        if (nameInput) nameInput.disabled = false;
        if (emailInput) emailInput.disabled = false;
        if (passwordInput) passwordInput.disabled = false;
        if (confirmPasswordInput) confirmPasswordInput.disabled = false;
        
        originalName = nameInput ? nameInput.value : "";
        originalEmail = emailInput ? emailInput.value : "";
        
        editBtn.style.display = "none";
        if (updateBtn) updateBtn.style.display = "inline-flex";
        if (cancelBtn) cancelBtn.style.display = "inline-flex";
        
        clearFieldErrors();
        
        if (passwordInput) passwordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
        if (passwordStrength) passwordStrength.style.display = "none";
        
        if (nameInput) nameInput.focus();
    });
}

// ==================== CANCEL EDIT ====================
if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        if (nameInput) nameInput.value = originalName;
        if (emailInput) emailInput.value = originalEmail;
        
        if (nameInput) nameInput.disabled = true;
        if (emailInput) emailInput.disabled = true;
        if (passwordInput) passwordInput.disabled = true;
        if (confirmPasswordInput) confirmPasswordInput.disabled = true;
        
        if (passwordInput) passwordInput.value = "";
        if (confirmPasswordInput) confirmPasswordInput.value = "";
        if (passwordStrength) passwordStrength.style.display = "none";
        
        if (editBtn) editBtn.style.display = "inline-flex";
        if (updateBtn) updateBtn.style.display = "none";
        if (cancelBtn) cancelBtn.style.display = "none";
        
        clearFieldErrors();
    });
}

// ==================== SHOW CONFIRM MODAL ====================
function showConfirmModal(onConfirm) {
    if (!confirmModal) return;
    confirmModal.classList.add("show");
    
    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        hideConfirmModal();
        cleanup();
    };
    
    const handleCancel = () => {
        hideConfirmModal();
        cleanup();
    };
    
    const cleanup = () => {
        if (confirmYes) confirmYes.removeEventListener("click", handleConfirm);
        if (confirmNo) confirmNo.removeEventListener("click", handleCancel);
        if (closeModalBtn) closeModalBtn.removeEventListener("click", handleCancel);
    };
    
    if (confirmYes) confirmYes.addEventListener("click", handleConfirm);
    if (confirmNo) confirmNo.addEventListener("click", handleCancel);
    if (closeModalBtn) closeModalBtn.addEventListener("click", handleCancel);
    
    confirmModal.addEventListener("click", function onClickOutside(e) {
        if (e.target === confirmModal) {
            handleCancel();
            confirmModal.removeEventListener("click", onClickOutside);
        }
    });
}

function hideConfirmModal() {
    if (confirmModal) confirmModal.classList.remove("show");
}

// ==================== VALIDATE FORM (modified) ====================
function validateForm() {
    let isValid = true;
    
    // Validate name
    const nameValidation = validateName(nameInput ? nameInput.value : "");
    if (!nameValidation.isValid) {
        if (nameError) {
            nameError.textContent = nameValidation.message;
            nameError.classList.add("show");
        }
        if (nameInput) nameInput.classList.add("error-input");
        isValid = false;
    }
    
    // Validate email
    const emailValidation = validateEmail(emailInput ? emailInput.value : "");
    if (!emailValidation.isValid) {
        if (emailError) {
            emailError.textContent = emailValidation.message;
            emailError.classList.add("show");
        }
        if (emailInput) emailInput.classList.add("error-input");
        isValid = false;
    }
    
    // Validate password if entered
    const password = passwordInput ? passwordInput.value : "";
    const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : "";
    
    if (password || confirmPassword) {
        // Only validate password if it has value
        if (password) {
            const passwordValidation = validatePasswordOnly(password);
            if (!passwordValidation.isValid) {
                showToast(passwordValidation.message, "error");
                isValid = false;
            }
        }
        
        // Validate confirm password (error appears below field, not toast)
        const isConfirmValid = validateConfirmPassword();
        if (!isConfirmValid) {
            isValid = false;
        }
    }
    
    return isValid;
}

// ==================== UPDATE PROFILE (modified) ====================
async function updateProfile() {
    if (!validateForm()) return;
    
    // Double-check confirm password validation
    if (!validateConfirmPassword()) {
        return;
    }
    
    const formattedName = formatName(nameInput.value);
    nameInput.value = formattedName;
    
    const updatedData = {
        name: nameInput ? nameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim().toLowerCase() : "",
        area: areaText ? areaText.textContent : "Sta. Cruz"
    };
    
    const password = passwordInput ? passwordInput.value : "";
    if (password) {
        updatedData.password = password;
    }
    
    const originalText = updateBtn ? updateBtn.innerHTML : "";
    if (updateBtn) {
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateBtn.disabled = true;
    }
    
    try {
        const res = await fetch("/api/update-superadmin-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
        });
        const data = await res.json();
        
        if (data.success || data.message) {
            showToast("Profile updated successfully!", "success");
            
            if (nameInput) nameInput.disabled = true;
            if (emailInput) emailInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;
            if (confirmPasswordInput) confirmPasswordInput.disabled = true;
            
            if (passwordInput) passwordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
            if (passwordStrength) passwordStrength.style.display = "none";
            if (confirmPasswordError) confirmPasswordError.classList.remove("show");
            
            if (editBtn) editBtn.style.display = "inline-flex";
            if (updateBtn) updateBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            
            originalName = nameInput ? nameInput.value : "";
            originalEmail = emailInput ? emailInput.value : "";
            clearFieldErrors();
            
            if (usernameDisplayEl && nameInput) {
                usernameDisplayEl.textContent = nameInput.value;
            }
        } else {
            showToast(data.error || "Failed to update profile", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Server error. Please try again.", "error");
    } finally {
        if (updateBtn) {
            updateBtn.innerHTML = originalText;
            updateBtn.disabled = false;
        }
    }
}

// ==================== UPDATE BUTTON WITH CONFIRM ====================
if (updateBtn) {
    updateBtn.addEventListener("click", () => {
        if (validateForm()) {
            showConfirmModal(updateProfile);
        }
    });
}

// ==================== CLOSE MODAL WITH ESCAPE KEY ====================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        if (confirmModal && confirmModal.classList.contains("show")) {
            hideConfirmModal();
        }
    }
});

// ==================== LOAD PROFILE ON PAGE LOAD ====================
async function loadProfile() {
    try {
        const res = await fetch("/api/superadmin/profile");
        const data = await res.json();
        
        if (nameInput) nameInput.value = data.name || "Super Admin";
        if (emailInput) emailInput.value = data.email || "";
        if (statusEl) statusEl.textContent = data.status || "Active";
        if (areaText) areaText.textContent = data.area || "Sta. Cruz";
        if (usernameDisplayEl) usernameDisplayEl.textContent = data.name || "Super Admin";
        
        originalName = nameInput ? nameInput.value : "";
        originalEmail = emailInput ? emailInput.value : "";
    } catch (err) {
        console.error("Failed to load profile:", err);
    }
}

// ==================== LOGOUT FUNCTIONALITY ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    const logoutCloseBtn = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logoutModal.style.display = "block";
    });

    if (logoutCloseBtn) {
        logoutCloseBtn.addEventListener("click", () => {
            logoutModal.style.display = "none";
        });
    }

    if (cancelLogout) {
        cancelLogout.addEventListener("click", () => {
            logoutModal.style.display = "none";
        });
    }

    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            if (window.SessionManager) {
                window.SessionManager.logout('You have been logged out successfully.');
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/");
            }
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
        }
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});