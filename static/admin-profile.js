const usernameEl = document.getElementById("username");
const usernameDisplayEl = document.getElementById("usernameDisplay");
const adminIdText = document.getElementById("adminIdText");
const emailEl = document.getElementById("email");
const contactEl = document.getElementById("contact");
const statusEl = document.getElementById("status");
const areaText = document.getElementById("areaText");
const nameEl = document.getElementById("name");
const passwordEl = document.getElementById("password");
const confirmPasswordEl = document.getElementById("confirmPassword");

const editBtn = document.getElementById("editBtn");
const updateBtn = document.getElementById("updateBtn");
const cancelBtn = document.getElementById("cancelBtn");

const formMessage = document.getElementById("formMessage");
const passwordStrength = document.getElementById("passwordStrength");

// Error message elements
const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const contactError = document.getElementById("contactError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

// Confirm Modal elements
const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const closeModalBtn = document.getElementById("closeModalBtn");

// Initially disable fields
[nameEl, emailEl, contactEl, passwordEl, confirmPasswordEl].forEach(f => {
    if (f) f.disabled = true;
});

// Store original values for cancel
let originalValues = {};

function storeOriginalValues() {
    originalValues = {
        name: nameEl ? nameEl.value : "",
        email: emailEl ? emailEl.value : "",
        contact: contactEl ? contactEl.value : ""
    };
}

// ===================== NAME VALIDATION FUNCTIONS =====================
function validateName(name) {
    if (!name || name.trim() === "") {
        return { isValid: false, message: "Name cannot be empty" };
    }
    
    const trimmedName = name.trim();
    if (name !== trimmedName) {
        return { isValid: false, message: "Name cannot start with space" };
    }
    
    if (name.includes("  ")) {
        return { isValid: false, message: "Double spaces are not allowed" };
    }
    
    const nameRegex = /^[A-Za-z\s\-\.]+$/;
    if (!nameRegex.test(name)) {
        return { isValid: false, message: "Name can only contain letters, spaces, dot and hyphens" };
    }
    
    const hasLetter = /[A-Za-z]/.test(name);
    if (!hasLetter) {
        return { isValid: false, message: "Name must contain at least one letter" };
    }
    
    if (/\d/.test(name)) {
        return { isValid: false, message: "Numbers are not allowed in name" };
    }
    
    return { isValid: true, message: "" };
}

function formatName(name) {
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

// Real-time name validation
if (nameEl) {
    nameEl.addEventListener("input", function() {
        if (!nameEl.disabled) {
            const validation = validateName(this.value);
            if (!validation.isValid) {
                nameError.textContent = validation.message;
                nameError.classList.add("show");
                nameEl.classList.add("error-input");
            } else {
                nameError.classList.remove("show");
                nameEl.classList.remove("error-input");
            }
        }
    });
    
    nameEl.addEventListener("blur", function() {
        if (!nameEl.disabled && validateName(this.value).isValid && this.value.trim() !== "") {
            const formattedName = formatName(this.value);
            if (formattedName !== this.value) {
                this.value = formattedName;
            }
        }
    });
}

// ===================== EMAIL VALIDATION =====================
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

// Real-time email validation
if (emailEl) {
    emailEl.addEventListener("input", function() {
        if (!emailEl.disabled) {
            const validation = validateEmail(this.value);
            if (!validation.isValid) {
                emailError.textContent = validation.message;
                emailError.classList.add("show");
                emailEl.classList.add("error-input");
            } else {
                emailError.classList.remove("show");
                emailEl.classList.remove("error-input");
            }
        }
    });
    
    emailEl.addEventListener("blur", function() {
        if (!emailEl.disabled && this.value.trim() !== "") {
            this.value = this.value.toLowerCase();
            const validation = validateEmail(this.value);
            if (!validation.isValid) {
                emailError.textContent = validation.message;
                emailError.classList.add("show");
                emailEl.classList.add("error-input");
            } else {
                emailError.classList.remove("show");
                emailEl.classList.remove("error-input");
            }
        }
    });
}

// ===================== CONTACT NUMBER VALIDATION =====================
function validateContact(contact) {
    if (!contact || contact.trim() === "") {
        return { isValid: false, message: "Contact number cannot be empty" };
    }
    
    if (contact.startsWith(" ")) {
        return { isValid: false, message: "Contact number cannot start with space" };
    }
    
    if (contact.endsWith(" ")) {
        return { isValid: false, message: "Contact number cannot end with space" };
    }
    
    let cleanContact = contact.replace(/[\s\-\(\)\+]/g, '');
    
    if (!/^\d+$/.test(cleanContact)) {
        return { isValid: false, message: "Contact number must contain only numbers" };
    }
    
    if (cleanContact.length !== 11) {
        return { isValid: false, message: "Contact number must be exactly 11 digits" };
    }
    
    if (!cleanContact.startsWith("09")) {
        return { isValid: false, message: "Contact number must start with 09" };
    }
    
    if (/(\d)\1{3,}/.test(cleanContact)) {
        return { isValid: false, message: "Contact number cannot have the same digit repeated 4 times in a row" };
    }
    
    return { isValid: true, message: "" };
}

function formatContact(contact) {
    let cleaned = contact.replace(/\s/g, '');
    if (cleaned.length === 11 && cleaned.startsWith("09")) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return cleaned;
}

// Restrict input to numbers only and prevent spaces
if (contactEl) {
    contactEl.addEventListener("input", function(e) {
        if (!contactEl.disabled) {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length > 11) {
                this.value = this.value.slice(0, 11);
            }
            
            const validation = validateContact(this.value);
            if (!validation.isValid) {
                contactError.textContent = validation.message;
                contactError.classList.add("show");
                contactEl.classList.add("error-input");
            } else {
                contactError.classList.remove("show");
                contactEl.classList.remove("error-input");
            }
        }
    });
    
    contactEl.addEventListener("blur", function() {
        if (!contactEl.disabled && this.value.trim() !== "") {
            const validation = validateContact(this.value);
            if (validation.isValid) {
                const formattedContact = formatContact(this.value);
                if (formattedContact !== this.value) {
                    this.value = formattedContact;
                }
                contactError.classList.remove("show");
                contactEl.classList.remove("error-input");
            } else {
                contactError.textContent = validation.message;
                contactError.classList.add("show");
                contactEl.classList.add("error-input");
            }
        }
    });
}

// ===================== PASSWORD VALIDATION FUNCTIONS =====================
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

// ===================== VALIDATE CONFIRM PASSWORD FIELD =====================
function validateConfirmPassword() {
    if (!confirmPasswordEl || confirmPasswordEl.disabled) return true;
    
    const password = passwordEl ? passwordEl.value : "";
    const confirmPassword = confirmPasswordEl.value;
    
    if (confirmPasswordError) {
        confirmPasswordError.classList.remove("show");
        confirmPasswordError.textContent = "";
    }
    confirmPasswordEl.classList.remove("error-input");
    
    if (!password && !confirmPassword) {
        return true;
    }
    
    if (password && (!confirmPassword || confirmPassword.trim() === "")) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = "Confirm password cannot be empty";
            confirmPasswordError.classList.add("show");
        }
        confirmPasswordEl.classList.add("error-input");
        return false;
    }
    
    if (password && confirmPassword && password !== confirmPassword) {
        if (confirmPasswordError) {
            confirmPasswordError.textContent = "Passwords do not match";
            confirmPasswordError.classList.add("show");
        }
        confirmPasswordEl.classList.add("error-input");
        return false;
    }
    
    return true;
}

// ===================== Check Password Strength =====================
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

// ===================== Update Password Strength UI =====================
function updatePasswordStrengthUI(password) {
    if (!passwordEl || !passwordStrength) return;
    
    if (passwordEl.disabled) {
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
    
    if (confirmPasswordEl && confirmPasswordEl.value) {
        validateConfirmPassword();
    }
}

// Password Strength Listener
if (passwordEl) {
    passwordEl.addEventListener("input", () => {
        if (!passwordEl.disabled) {
            updatePasswordStrengthUI(passwordEl.value);
        }
    });
}

// REAL-TIME CONFIRM PASSWORD VALIDATION
if (confirmPasswordEl) {
    confirmPasswordEl.addEventListener("input", function() {
        if (!confirmPasswordEl.disabled) {
            validateConfirmPassword();
        }
    });
    
    confirmPasswordEl.addEventListener("blur", function() {
        if (!confirmPasswordEl.disabled) {
            validateConfirmPassword();
        }
    });
}

// Prevent spaces in password fields
function preventSpaces(event) {
    if (event.target.disabled) return;
    if (event.key === ' ') {
        event.preventDefault();
        showMessage("Spaces are not allowed in password", "error");
        return false;
    }
    return true;
}

if (passwordEl) {
    passwordEl.addEventListener("keydown", preventSpaces);
}
if (confirmPasswordEl) {
    confirmPasswordEl.addEventListener("keydown", preventSpaces);
}

// ===================== Clear Field Errors =====================
function clearFieldErrors() {
    const errorElements = [nameError, emailError, contactError, confirmPasswordError];
    const inputElements = [nameEl, emailEl, contactEl, confirmPasswordEl];
    
    errorElements.forEach(error => {
        if (error) {
            error.classList.remove("show");
            error.textContent = "";
        }
    });
    
    inputElements.forEach(input => {
        if (input) {
            input.classList.remove("error-input");
        }
    });
}

// ===================== Show Message =====================
function showMessage(msg, type) {
    if (formMessage) {
        formMessage.textContent = msg;
        formMessage.className = `form-message ${type}`;
        formMessage.style.display = 'block';
        setTimeout(() => {
            formMessage.style.display = 'none';
        }, 4000);
    }
}

// ===================== Validate All Form Fields =====================
function validateForm() {
    let isValid = true;
    
    clearFieldErrors();
    
    // Validate Name
    const name = nameEl ? nameEl.value : '';
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
        if (nameError) {
            nameError.textContent = nameValidation.message;
            nameError.classList.add("show");
        }
        if (nameEl) nameEl.classList.add("error-input");
        isValid = false;
    }
    
    // Validate Email
    const email = emailEl ? emailEl.value : '';
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
        if (emailError) {
            emailError.textContent = emailValidation.message;
            emailError.classList.add("show");
        }
        if (emailEl) emailEl.classList.add("error-input");
        isValid = false;
    }
    
    // Validate Contact
    const contact = contactEl ? contactEl.value : '';
    const contactValidation = validateContact(contact);
    if (!contactValidation.isValid) {
        if (contactError) {
            contactError.textContent = contactValidation.message;
            contactError.classList.add("show");
        }
        if (contactEl) contactEl.classList.add("error-input");
        isValid = false;
    }
    
    // Password validation
    const password = passwordEl ? passwordEl.value : '';
    const confirmPassword = confirmPasswordEl ? confirmPasswordEl.value : '';
    
    if (password || confirmPassword) {
        if (password) {
            const strength = checkPasswordStrength(password);
            if (strength === 'too-short') {
                showMessage('Password must be at least 8 characters', 'error');
                if (passwordEl) passwordEl.focus();
                isValid = false;
            } else if (strength === 'all-uppercase') {
                showMessage('Password must contain at least one lowercase letter', 'error');
                if (passwordEl) passwordEl.focus();
                isValid = false;
            } else if (strength === 'all-numbers') {
                showMessage('Password cannot be all numbers', 'error');
                if (passwordEl) passwordEl.focus();
                isValid = false;
            } else {
                const isConfirmValid = validateConfirmPassword();
                if (!isConfirmValid) {
                    isValid = false;
                }
            }
        } else if (confirmPassword) {
            const isConfirmValid = validateConfirmPassword();
            if (!isConfirmValid) {
                isValid = false;
            }
        }
    }
    
    return isValid;
}

// ===================== Load Admin Profile =====================
async function loadAdminProfile() {
    try {
        const username = localStorage.getItem("adminUsername") || new URLSearchParams(window.location.search).get("username") || "Admin1";

        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        
        console.log("Profile data:", data);
        
        if (data.error) {
            console.error("Failed to load profile:", data.error);
            return;
        }

        if (usernameEl) usernameEl.textContent = data.username || "Admin";
        if (usernameDisplayEl) usernameDisplayEl.textContent = data.username || "Admin";
        
        // DISPLAY ADMIN ID
        if (adminIdText) adminIdText.textContent = data.id || data.admin_id || data.username || "N/A";
        
        if (areaText) areaText.textContent = data.area || "Not assigned";
        
        const statusText = data.status || "Active";
        if (statusEl) {
            statusEl.textContent = statusText;
            statusEl.className = statusText === 'Active' ? 'status-active' : 'status-inactive';
        }
        
        if (nameEl) nameEl.value = data.name || "";
        if (emailEl) emailEl.value = data.email || "";
        if (contactEl) contactEl.value = data.contact || "";

        localStorage.setItem("adminUsername", data.username);
        
        storeOriginalValues();
    } catch (err) {
        console.error(err);
        showMessage("Failed to load profile", "error");
    }
}

// ===================== Show Confirm Modal =====================
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById("confirmModal");
    if (!modal) return;
    
    const modalMessage = modal.querySelector("p");
    if (modalMessage) modalMessage.textContent = message;
    
    modal.classList.add("show");
    
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
    
    modal.addEventListener("click", function onClickOutside(e) {
        if (e.target === modal) {
            handleCancel();
            modal.removeEventListener("click", onClickOutside);
        }
    });
}

function hideConfirmModal() {
    const modal = document.getElementById("confirmModal");
    if (modal) modal.classList.remove("show");
}

// ===================== Edit Mode =====================
if (editBtn) {
    editBtn.addEventListener("click", () => {
        [nameEl, emailEl, contactEl, passwordEl, confirmPasswordEl].forEach(f => {
            if (f) f.disabled = false;
        });
        editBtn.style.display = "none";
        if (updateBtn) updateBtn.style.display = "inline-flex";
        if (cancelBtn) cancelBtn.style.display = "inline-flex";
        
        if (formMessage) formMessage.style.display = "none";
        if (passwordStrength) passwordStrength.style.display = "none";
        clearFieldErrors();
        
        if (nameEl) nameEl.focus();
    });
}

// ===================== Cancel Edit =====================
if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        if (nameEl) nameEl.value = originalValues.name || "";
        if (emailEl) emailEl.value = originalValues.email || "";
        if (contactEl) contactEl.value = originalValues.contact || "";
        
        [nameEl, emailEl, contactEl, passwordEl, confirmPasswordEl].forEach(f => {
            if (f) f.disabled = true;
        });
        if (passwordEl) passwordEl.value = "";
        if (confirmPasswordEl) confirmPasswordEl.value = "";
        
        editBtn.style.display = "inline-flex";
        if (updateBtn) updateBtn.style.display = "none";
        cancelBtn.style.display = "none";
        
        if (formMessage) formMessage.style.display = "none";
        if (passwordStrength) passwordStrength.style.display = "none";
        
        clearFieldErrors();
    });
}

// ===================== Update Profile =====================
async function updateProfile() {
    if (!validateForm()) return;
    
    if (!validateConfirmPassword()) {
        return;
    }
    
    const formattedName = formatName(nameEl.value);
    nameEl.value = formattedName;
    
    const username = localStorage.getItem("adminUsername");
    const email = emailEl ? emailEl.value.trim() : "";
    const contact = contactEl ? contactEl.value.trim() : "";
    const name = formattedName;
    const password = passwordEl ? passwordEl.value.trim() : "";

    try {
        const res = await fetch("/api/update-admin-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, email, contact, name, password })
        });

        const data = await res.json();
        
        if (res.ok) {
            showToast("Profile updated successfully!");
            
            [nameEl, emailEl, contactEl, passwordEl, confirmPasswordEl].forEach(f => {
                if (f) f.disabled = true;
            });
            if (passwordEl) passwordEl.value = "";
            if (confirmPasswordEl) confirmPasswordEl.value = "";
            
            if (editBtn) editBtn.style.display = "inline-flex";
            if (updateBtn) updateBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            
            if (formMessage) formMessage.style.display = "none";
            if (passwordStrength) passwordStrength.style.display = "none";
            
            clearFieldErrors();
            
            storeOriginalValues();
            
            // Reload profile to show updated data
            await loadAdminProfile();
        } else {
            showMessage(data.error || "Update failed", "error");
        }
    } catch (err) {
        console.error(err);
        showMessage("Server error. Please try again.", "error");
    }
}

// ===================== Update Button with Confirm Modal =====================
if (updateBtn) {
    updateBtn.addEventListener("click", () => {
        if (validateForm()) {
            showConfirmModal("Are you sure you want to update your profile?", updateProfile);
        }
    });
}

// ===================== Toast Functions =====================
function showToast(message) {
    const toast = document.getElementById("toast");
    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    } else {
        alert(message);
    }
}

// ===================== Initialize =====================
loadAdminProfile();