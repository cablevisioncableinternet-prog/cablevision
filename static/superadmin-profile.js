// ==================== TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== SESSION MANAGEMENT - PER TAB ====================
(function() {
    const isLoggedIn = sessionStorage.getItem('adminUsername') && sessionStorage.getItem('sessionActive') === 'true';
    if (!isLoggedIn) {
        window.location.replace('/');
        throw new Error('No session');
    }
})();

async function checkSession() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/verify-session?tab_id=${tabId}`);
        const data = await response.json();
        if (!data.valid) {
            sessionStorage.clear();
            window.location.replace('/');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
    }
}

// ==================== DOM ELEMENTS ====================
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const currentPasswordInput = document.getElementById("currentPassword");
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
const currentPasswordError = document.getElementById("currentPasswordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

let originalName = "";
let originalEmail = "";

// Initially disable fields
if (nameInput) nameInput.disabled = true;
if (emailInput) emailInput.disabled = true;
if (currentPasswordInput) currentPasswordInput.disabled = true;
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

    if (/^\d+$/.test(password)) {
        return { isValid: false, message: "Password cannot be all numbers" };
    }
    return { isValid: true, message: "" };
}

// ==================== VALIDATE CONFIRM PASSWORD FIELD (NEW) ====================
function validateCurrentPassword() {
    if (!currentPasswordInput || currentPasswordInput.disabled) return true;

    const newPassword = passwordInput ? passwordInput.value.trim() : "";
    const currentPassword = currentPasswordInput.value.trim();

    // If neither entered → OK, user not changing password
    if (!newPassword && !currentPassword) {
        if (currentPasswordError) {
            currentPasswordError.classList.remove("show");
            currentPasswordError.textContent = "";
        }
        currentPasswordInput.classList.remove("error-input");
        return true;
    }

    // If only current password entered (no new password) → ERROR
    if (currentPassword && !newPassword) {
        if (currentPasswordError) {
            currentPasswordError.textContent = "Please enter a new password when providing your current password";
            currentPasswordError.classList.add("show");
        }
        currentPasswordInput.classList.add("error-input");
        return false;
    }

    // If only new password entered (no current password) → ERROR
    if (newPassword && !currentPassword) {
        if (currentPasswordError) {
            currentPasswordError.textContent = "Current password is required to change your password";
            currentPasswordError.classList.add("show");
        }
        currentPasswordInput.classList.add("error-input");
        return false;
    }

    // Both entered → OK
    if (currentPasswordError) {
        currentPasswordError.classList.remove("show");
        currentPasswordError.textContent = "";
    }
    currentPasswordInput.classList.remove("error-input");
    return true;
}

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
    if (currentPasswordError) {
        currentPasswordError.classList.remove("show");
        currentPasswordError.textContent = "";
    }
    if (confirmPasswordError) {
        confirmPasswordError.classList.remove("show");
        confirmPasswordError.textContent = "";
    }
    if (nameInput) nameInput.classList.remove("error-input");
    if (emailInput) emailInput.classList.remove("error-input");
    if (currentPasswordInput) currentPasswordInput.classList.remove("error-input");
    if (confirmPasswordInput) confirmPasswordInput.classList.remove("error-input");
}

function bindProfileControls() {
    if (editBtn) {
        editBtn.addEventListener("click", () => {
            if (nameInput) nameInput.disabled = false;
            if (emailInput) emailInput.disabled = false;
            if (currentPasswordInput) currentPasswordInput.disabled = false;
            if (passwordInput) passwordInput.disabled = false;
            if (confirmPasswordInput) confirmPasswordInput.disabled = false;
            
            originalName = nameInput ? nameInput.value : "";
            originalEmail = emailInput ? emailInput.value : "";
            
            editBtn.style.display = "none";
            if (updateBtn) updateBtn.style.display = "inline-flex";
            if (cancelBtn) cancelBtn.style.display = "inline-flex";
            
            clearFieldErrors();
            
            if (currentPasswordInput) currentPasswordInput.value = "";
            if (passwordInput) passwordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
            if (passwordStrength) passwordStrength.style.display = "none";
            
            if (nameInput) nameInput.focus();
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener("click", () => {
            if (nameInput) nameInput.value = originalName;
            if (emailInput) emailInput.value = originalEmail;
            
            if (nameInput) nameInput.disabled = true;
            if (emailInput) emailInput.disabled = true;
            if (currentPasswordInput) currentPasswordInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;
            if (confirmPasswordInput) confirmPasswordInput.disabled = true;
            
            if (currentPasswordInput) currentPasswordInput.value = "";
            if (passwordInput) passwordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
            if (passwordStrength) passwordStrength.style.display = "none";
            
            if (editBtn) editBtn.style.display = "inline-flex";
            if (updateBtn) updateBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            
            clearFieldErrors();
        });
    }
}

// ==================== EDIT MODE ====================
bindProfileControls();

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
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
    
    // Check if ANY password-related field has input
    if (password || confirmPassword || currentPassword) {
        // Must validate current password in all cases
        if (!validateCurrentPassword()) {
            isValid = false;
        }
        
        // If new password entered, validate it
        if (password) {
            const passwordValidation = validatePasswordOnly(password);
            if (!passwordValidation.isValid) {
                showToast(passwordValidation.message, "error");
                isValid = false;
            }
        }
        
        // Validate confirm password
        const isConfirmValid = validateConfirmPassword();
        if (!isConfirmValid) {
            isValid = false;
        }
    }
    
    return isValid;
}

// ==================== UPDATE PROFILE ====================
async function updateProfile() {
    if (!validateForm()) return;
    
    // Double-check confirm password validation
    if (!validateConfirmPassword()) {
        return;
    }
    
    const formattedName = formatName(nameInput.value);
    nameInput.value = formattedName;
    
    // ✅ KUNIN ANG TAB_ID
    const tabId = getTabId();
    
    const updatedData = {
        name: nameInput ? nameInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim().toLowerCase() : "",
        area: areaText ? areaText.textContent : "Sta. Cruz",
        tab_id: tabId  // ✅ IDAGDAG ANG TAB_ID
    };
    
    const password = passwordInput ? passwordInput.value : "";
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
    if (password) {
        updatedData.password = password;
        updatedData.current_password = currentPassword;
    }
    
    const originalText = updateBtn ? updateBtn.innerHTML : "";
    if (updateBtn) {
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateBtn.disabled = true;
    }
    
    try {
        // ✅ ISAMA ANG TAB_ID SA URL
        const res = await fetch(`/api/update-superadmin-profile?tab_id=${tabId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
        });
        const data = await res.json();
        
        if (data.success || data.message) {
            showToast("Profile updated successfully!", "success");
            
            if (nameInput) nameInput.disabled = true;
            if (emailInput) emailInput.disabled = true;
            if (currentPasswordInput) currentPasswordInput.disabled = true;
            if (passwordInput) passwordInput.disabled = true;
            if (confirmPasswordInput) confirmPasswordInput.disabled = true;
            
            if (currentPasswordInput) currentPasswordInput.value = "";
            if (passwordInput) passwordInput.value = "";
            if (confirmPasswordInput) confirmPasswordInput.value = "";
            if (passwordStrength) passwordStrength.style.display = "none";
            if (currentPasswordError) currentPasswordError.classList.remove("show");
            if (confirmPasswordError) confirmPasswordError.classList.remove("show");
            
            if (editBtn) editBtn.style.display = "inline-flex";
            if (updateBtn) updateBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            
            clearFieldErrors();
            await loadProfile();
            
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
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        const data = await res.json();
        
        if (nameInput) {
            nameInput.value = data.name || "Super Admin";
            nameInput.disabled = true;
        }
        if (emailInput) {
            emailInput.value = data.email || "";
            emailInput.disabled = true;
        }
        if (passwordInput) passwordInput.disabled = true;
        if (confirmPasswordInput) confirmPasswordInput.disabled = true;
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

    // Confirm logout
    if (confirmLogout) {
        confirmLogout.addEventListener("click", function() {
            const tabId = getTabId();
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: tabId })
            }).catch(() => {});

            sessionStorage.clear();
            window.location.replace("/");
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
        }
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async () => {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    loadProfile();
    showToastFromUrl();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

// ==================== COPY SECRET KEY ====================
function copySecret() {
    const secretElement = document.getElementById('gaSecretText');
    if (!secretElement) {
        showToast('No backup key available to copy.', 'error');
        return;
    }
    
    const secret = secretElement.textContent.trim();
    if (!secret || secret === 'No secret available') {
        showToast('No backup key available to copy.', 'error');
        return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(secret)
            .then(() => {
                showToast('Backup key copied to clipboard.', 'success');
            })
            .catch(() => {
                fallbackCopy(secret);
            });
        return;
    }
    
    fallbackCopy(secret);
}

function fallbackCopy(text) {
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    tempInput.setAttribute('readonly', '');
    tempInput.style.position = 'fixed';
    tempInput.style.left = '-9999px';
    document.body.appendChild(tempInput);
    tempInput.select();
    
    try {
        document.execCommand('copy');
        showToast('Backup key copied to clipboard.', 'success');
    } catch (error) {
        showToast('Unable to copy backup key automatically.', 'error');
    } finally {
        document.body.removeChild(tempInput);
    }
}

// ==================== OTP INPUT HANDLERS ====================
function syncOtpHiddenInput(form) {
    if (!form) return;
    const hiddenInput = form.querySelector('#ga_code_hidden');
    if (!hiddenInput) return;
    
    const otpInputs = Array.from(form.querySelectorAll('.ga-otp-input'));
    hiddenInput.value = otpInputs.map((input) => input.value).join('');
}

function handleOtpInput(input) {
    const value = input.value.replace(/\D/g, '').slice(0, 1);
    input.value = value;

    const form = input.closest('.ga-form');
    if (!form) return;

    const otpInputs = Array.from(form.querySelectorAll('.ga-otp-input'));
    const index = Number(input.dataset.index || 0);

    syncOtpHiddenInput(form);

    if (value && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
    }
}

function handleOtpKeydown(input, event) {
    const form = input.closest('.ga-form');
    if (!form) return;

    const otpInputs = Array.from(form.querySelectorAll('.ga-otp-input'));
    const index = Number(input.dataset.index || 0);

    if (event.key === 'Backspace' && !input.value && index > 0) {
        const previousInput = otpInputs[index - 1];
        previousInput.focus();
        previousInput.value = '';
        syncOtpHiddenInput(form);
    } else if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        otpInputs[index - 1].focus();
    } else if (event.key === 'ArrowRight' && index < otpInputs.length - 1) {
        event.preventDefault();
        otpInputs[index + 1].focus();
    }
}

window.handleOtpInput = handleOtpInput;
window.handleOtpKeydown = handleOtpKeydown;
// ==================== TOAST FUNCTION ====================
function showToast(message, type = 'info') {
    const LABELS = {
        success: 'Success',
        error: 'Error',
        info: 'Notice',
        loading: 'Please wait'
    };

    const ICONS = {
        success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
        loading: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="animation: toastSpin 1s linear infinite; display:block;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`
    };

    let toast = document.querySelector('.custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'custom-toast';
        document.body.appendChild(toast);

        if (!document.getElementById('toast-keyframes')) {
            const s = document.createElement('style');
            s.id = 'toast-keyframes';
            s.textContent = `
                @keyframes toastSpin     { to { transform: rotate(360deg); } }
                @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
                @keyframes toastLoading  { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
            `;
            document.head.appendChild(s);
        }
    }

    toast.innerHTML = `
        <div class="custom-toast-body">
            <span class="custom-toast-icon">${ICONS[type] || ICONS.info}</span>
            <div class="custom-toast-text">
                <span class="custom-toast-title">${LABELS[type] || 'Notice'}</span>
                <span class="custom-toast-message">${message}</span>
            </div>
        </div>
        <div class="custom-toast-progress">
            <div class="custom-toast-progress-bar"></div>
        </div>
    `;

    toast.className = `custom-toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toast._hideTimer);

    if (type === 'loading') {
        // Loading stays visible
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function showToastFromUrl() {
    if (typeof URLSearchParams === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const toastType = params.get('toast');

    if (!toastType) return;

    const toastMap = {
        'ga-enabled': { type: 'success', message: 'Google Authenticator enabled successfully!' },
        'ga-disabled': { type: 'info', message: 'Google Authenticator disabled.' },
        'ga-invalid': { type: 'error', message: 'Invalid Google Authenticator code. Please try again.' },
        'ga-missing': { type: 'error', message: 'Please enter the 6-digit code from Google Authenticator.' }
    };

    const result = toastMap[toastType];
    if (!result) return;

    showToast(result.message, result.type);
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ==================== INITIALIZE GA FORM ====================
document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('.ga-form');
    if (!form) return;

    const otpInputs = Array.from(form.querySelectorAll('.ga-otp-input'));

    otpInputs.forEach((input) => {
        input.addEventListener('paste', function (event) {
            event.preventDefault();
            const pasted = (event.clipboardData || window.clipboardData)
                .getData('text')
                .replace(/\D/g, '')
                .slice(0, 6);

            pasted.split('').forEach((digit, digitIndex) => {
                if (otpInputs[digitIndex]) {
                    otpInputs[digitIndex].value = digit;
                }
            });

            const nextIndex = Math.min(pasted.length, otpInputs.length - 1);
            otpInputs[nextIndex].focus();
            syncOtpHiddenInput(form);
        });
    });

    form.addEventListener('submit', function (event) {
        syncOtpHiddenInput(form);
        const hiddenInput = form.querySelector('#ga_code_hidden');
        const code = hiddenInput ? hiddenInput.value : '';

        if (code.length !== 6) {
            event.preventDefault();
            otpInputs.forEach((input) => {
                input.classList.add('is-invalid');
            });
            otpInputs[0].focus();
            showToast('Please enter all 6 digits of the code.', 'error');
            return;
        }

    });
});