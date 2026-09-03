// ==================== GET TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== GET ADMIN USERNAME FROM FLASK SESSION ====================
async function getAdminUsername() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.username) {
                // I-store sa localStorage for caching pero hindi na gagamitin as primary
                localStorage.setItem('adminUsername', data.username);
                sessionStorage.setItem('adminUsername', data.username);
                return data.username;
            }
        }
    } catch (error) {
        console.error('Error getting admin username from session:', error);
    }
    
    // Fallback sa localStorage
    return localStorage.getItem('adminUsername') || null;
}

// ==================== GET ADMIN AREA FROM FLASK SESSION ====================
async function getAdminArea() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.area) {
                localStorage.setItem('adminArea', data.area);
                sessionStorage.setItem('adminArea', data.area);
                return data.area;
            }
        }
    } catch (error) {
        console.error('Error getting admin area from session:', error);
    }
    
    return localStorage.getItem('adminArea') || null;
}

const usernameEl = document.getElementById("username");
const usernameDisplayEl = document.getElementById("usernameDisplay");
const adminIdText = document.getElementById("adminIdText");
const emailEl = document.getElementById("email");
const contactEl = document.getElementById("contact");
const statusEl = document.getElementById("status");
const areaText = document.getElementById("areaText");
const nameEl = document.getElementById("name");
const currentPasswordEl = document.getElementById("currentPassword");
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
const currentPasswordError = document.getElementById("currentPasswordError");
const confirmPasswordError = document.getElementById("confirmPasswordError");

// Confirm Modal elements
const confirmModal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const closeModalBtn = document.getElementById("closeModalBtn");

// Initially disable fields
[nameEl, emailEl, contactEl, currentPasswordEl, passwordEl, confirmPasswordEl].forEach(f => {
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

// ===================== VALIDATE CURRENT PASSWORD =====================
function validateCurrentPassword() {
    if (!currentPasswordEl || currentPasswordEl.disabled) return true;

    const newPassword = passwordEl ? passwordEl.value.trim() : "";
    const currentPassword = currentPasswordEl.value.trim();

    // If neither entered → OK, user not changing password
    if (!newPassword && !currentPassword) {
        if (currentPasswordError) {
            currentPasswordError.classList.remove("show");
            currentPasswordError.textContent = "";
        }
        currentPasswordEl.classList.remove("error-input");
        return true;
    }

    // If only current password entered (no new password) → ERROR
    if (currentPassword && !newPassword) {
        if (currentPasswordError) {
            currentPasswordError.textContent = "Please enter a new password when providing your current password";
            currentPasswordError.classList.add("show");
        }
        currentPasswordEl.classList.add("error-input");
        return false;
    }

    // If only new password entered (no current password) → ERROR
    if (newPassword && !currentPassword) {
        if (currentPasswordError) {
            currentPasswordError.textContent = "Current password is required to change your password";
            currentPasswordError.classList.add("show");
        }
        currentPasswordEl.classList.add("error-input");
        return false;
    }

    // Both entered → OK
    if (currentPasswordError) {
        currentPasswordError.classList.remove("show");
        currentPasswordError.textContent = "";
    }
    currentPasswordEl.classList.remove("error-input");
    return true;
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
            message = ' Password must be at least 8 characters';
            className = 'weak';
            break;
        case 'all-uppercase':
            message = ' Password must contain at least one lowercase letter';
            className = 'weak';
            break;
        case 'all-numbers':
            message = ' Password cannot be all numbers';
            className = 'weak';
            break;
        case 'acceptable':
            message = ' Password looks good (add numbers for stronger password)';
            className = 'strong';
            break;
        case 'strong':
            message = ' Strong password!';
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
    const errorElements = [emailError, contactError, currentPasswordError, confirmPasswordError];
    const inputElements = [emailEl, contactEl, currentPasswordEl, confirmPasswordEl];
    
    // TANGGALIN ANG NAME ERROR
    // const errorElements = [nameError, emailError, contactError, confirmPasswordError];
    // const inputElements = [nameEl, emailEl, contactEl, confirmPasswordEl];
    
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
    
    // TANGGALIN ANG NAME VALIDATION (hindi na editable)
    // const name = nameEl ? nameEl.value : '';
    // const nameValidation = validateName(name);
    // if (!nameValidation.isValid) {
    //     if (nameError) {
    //         nameError.textContent = nameValidation.message;
    //         nameError.classList.add("show");
    //     }
    //     if (nameEl) nameEl.classList.add("error-input");
    //     isValid = false;
    // }
    
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
    const currentPassword = currentPasswordEl ? currentPasswordEl.value : '';
    
    if (password || confirmPassword || currentPassword) {
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
                if (!validateCurrentPassword()) {
                    isValid = false;
                }
                const isConfirmValid = validateConfirmPassword();
                if (!isConfirmValid) {
                    isValid = false;
                }
            }
        } else if (confirmPassword) {
            if (!validateCurrentPassword()) {
                isValid = false;
            }
            const isConfirmValid = validateConfirmPassword();
            if (!isConfirmValid) {
                isValid = false;
            }
        } else if (currentPassword) {
            // Only current password entered, no new password
            if (!validateCurrentPassword()) {
                isValid = false;
            }
        }
    }
    
    return isValid;
}

// ===================== Load Admin Profile =====================
async function loadAdminProfile() {
    try {
        // KUHAIN ANG USERNAME MULA SA FLASK SESSION GAMIT ANG TAB ID
        const username = await getAdminUsername();
        const tabId = getTabId();
        
        if (!username) {
            console.error("No admin username found in session");
            showMessage("Please login again", "error");
            window.location.replace('/');
            return;
        }
        
        console.log(" Loading profile for admin:", username);
        console.log(" Tab ID:", tabId);

        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(username)}&tab_id=${tabId}`);
        const data = await res.json();
        
        console.log("Profile data:", data);
        
        if (data.error) {
            console.error("Failed to load profile:", data.error);
            showMessage(data.error, "error");
            return;
        }

        if (usernameEl) usernameEl.textContent = data.username || "Admin";
        if (usernameDisplayEl) usernameDisplayEl.textContent = data.username || "Admin";
        
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

        // I-STORE SA SESSIONSTORAGE PARA SA MGA FUNCTIONS
        sessionStorage.setItem("adminUsername", data.username);
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
        // NAME AY LAGING DISABLED (hindi na-e-edit)
        // [nameEl, emailEl, contactEl, passwordEl, confirmPasswordEl].forEach(f => {
        //     if (f) f.disabled = false;
        // });
        
        // I-ENABLE LANG ANG MGA Pwede i-edit
        if (emailEl) emailEl.disabled = false;
        if (contactEl) {
            // I-REMOVE ANG SPACES PARA SA EDITING
            contactEl.value = contactEl.value.replace(/\s/g, '');
            contactEl.disabled = false;
        }
        if (currentPasswordEl) currentPasswordEl.disabled = false;
        if (passwordEl) passwordEl.disabled = false;
        if (confirmPasswordEl) confirmPasswordEl.disabled = false;
        
        editBtn.style.display = "none";
        if (updateBtn) updateBtn.style.display = "inline-flex";
        if (cancelBtn) cancelBtn.style.display = "inline-flex";
        
        if (formMessage) formMessage.style.display = "none";
        if (passwordStrength) passwordStrength.style.display = "none";
        clearFieldErrors();
        
        if (emailEl) emailEl.focus();  // FOCUS SA EMAIL
    });
}

// ===================== Cancel Edit =====================
if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        if (nameEl) nameEl.value = originalValues.name || "";
        if (emailEl) emailEl.value = originalValues.email || "";
        if (contactEl) contactEl.value = originalValues.contact || "";
        
        [nameEl, emailEl, contactEl, currentPasswordEl, passwordEl, confirmPasswordEl].forEach(f => {
            if (f) f.disabled = true;
        });
        if (currentPasswordEl) currentPasswordEl.value = "";
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
    
    const username = await getAdminUsername();
    const tabId = getTabId();
    const email = emailEl ? emailEl.value.trim().toLowerCase() : "";
    const contact = contactEl ? contactEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";
    const currentPassword = currentPasswordEl ? currentPasswordEl.value : "";
    
    // KUNG MAY BINAGO SA EMAIL, I-VERIFY MUNA
    if (email && email !== originalValues.email) {
        try {
            const checkRes = await fetch(`/api/admin/check-email?email=${encodeURIComponent(email)}&tab_id=${tabId}`);
            const checkData = await checkRes.json();
            
            if (checkData.exists) {
                showToast(`Email '${email}' already exists. Please use a different email.`, 'error');
                if (emailEl) emailEl.focus();
                return;
            }
        } catch (err) {
            showToast("Error checking email availability", 'error');
            return;
        }
    }

    try {
        const res = await fetch("/api/update-admin-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                username, 
                email, 
                contact, 
                password,
                current_password: currentPassword,
                tab_id: tabId
            })
        });

        const data = await res.json();
        
        if (res.ok) {
            showToast("Profile updated successfully!");
            
            // I-FORMAT ANG CONTACT NUMBER PAGKATAPOS MAG-SAVE
            if (contactEl) {
                contactEl.value = formatContact(contactEl.value);
            }
            
            [nameEl, emailEl, contactEl, currentPasswordEl, passwordEl, confirmPasswordEl].forEach(f => {
                if (f) f.disabled = true;
            });
            if (currentPasswordEl) currentPasswordEl.value = "";
            if (passwordEl) passwordEl.value = "";
            if (confirmPasswordEl) confirmPasswordEl.value = "";
            
            if (editBtn) editBtn.style.display = "inline-flex";
            if (updateBtn) updateBtn.style.display = "none";
            if (cancelBtn) cancelBtn.style.display = "none";
            
            if (formMessage) formMessage.style.display = "none";
            if (passwordStrength) passwordStrength.style.display = "none";
            
            clearFieldErrors();
            storeOriginalValues();
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

// ===================== Copy Secret Key =====================
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
            .then(() => showToast('Backup key copied to clipboard.', 'success'))
            .catch(() => fallbackCopy(secret));
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

// ===================== OTP INPUT HANDLERS =====================
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
// ===================== Toast Functions =====================
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

// ===================== Initialize GA Form =====================
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

// ===================== RE-INITIALIZE ON TAB VISIBILITY =====================
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log(' Tab became visible, reloading profile...');
        await loadAdminProfile();
    }
});

// ===================== Initialize =====================
loadAdminProfile();
showToastFromUrl();