// ===============================
// 🗄️  MYSQL BACKEND - NO FIREBASE NEEDED
// ===============================
console.log("Application Connected to MySQL Backend ✅");

// ===============================
// 🆔 GENERATE UNIQUE TAB ID
// ===============================
function getOrCreateTabId() {
    let tabId = sessionStorage.getItem('tab_id');
    if (!tabId) {
        tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('tab_id', tabId);
    }
    return tabId;
}

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
                @keyframes toastSpin { to { transform: rotate(360deg); } }
                @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
                @keyframes toastLoading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
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
        // stays visible until another toast replaces it
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ===============================
// 🔐 LOGIN FORM - WITH TAB ID
// ===============================
const loginForm = document.getElementById("loginForm");
const errorDiv = document.getElementById("error");
const btn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const loader = document.getElementById("loader");

// Set tab_id on page load
document.addEventListener('DOMContentLoaded', function() {
    const tabId = getOrCreateTabId();
    const tabIdHidden = document.getElementById('tab_id_hidden');
    if (tabIdHidden) {
        tabIdHidden.value = tabId;
    }
    console.log('🆔 Tab ID:', tabId);
});

if (loginForm) {
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
}

const finalLoginForm = document.getElementById("loginForm");
const finalErrorDiv = document.getElementById("error");
const finalBtn = document.getElementById("loginBtn");
const finalBtnText = document.getElementById("btnText");
const finalLoader = document.getElementById("loader");

async function getDeviceLocationFromBrowser() {
    return new Promise(resolve => {
        if (!navigator.geolocation) {
            resolve({ latitude: null, longitude: null });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            },
            () => {
                resolve({ latitude: null, longitude: null });
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000
            }
        );
    });
}

document.addEventListener('click', function (event) {
    const toggleButton = event.target.closest('.password-toggle-btn');
    if (!toggleButton) return;

    const passwordWrapper = toggleButton.closest('.password-wrapper');
    const passwordInput = passwordWrapper?.querySelector('input[type="password"], input[type="text"]');

    if (!passwordInput) return;

    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';

    const icon = toggleButton.querySelector('i');
    if (icon) {
        icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    toggleButton.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
});

if (finalLoginForm) {
    finalLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const tabId = getOrCreateTabId();  // 👈 KUNIN ANG TAB ID
        
        if (finalErrorDiv) finalErrorDiv.innerText = "";

        if (!username || !password) {
            if (finalErrorDiv) finalErrorDiv.innerText = "Please fill in all fields.";
            return;
        }

        if (finalBtnText) finalBtnText.innerText = "Logging in...";
        if (finalLoader) finalLoader.classList.remove("hidden");
        if (finalBtn) finalBtn.disabled = true;

        try {
            const location = await getDeviceLocationFromBrowser();
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    username,
                    password,
                    tab_id: tabId,
                    lat: location.latitude,
                    lng: location.longitude
                })
            });

            const data = await response.json();

            if (!response.ok && !data.success) {
                const loginError = data.account_locked
                    ? 'Your account is locked. Please contact Super Admin.'
                    : (data.error || 'Login failed. Please try again.');
                showToast(loginError, 'error');
                if (finalErrorDiv) finalErrorDiv.innerText = loginError;
            }

            // ✅ CHECK IF 2FA REQUIRED
            if (data.requires_2fa) {
                console.log("🔐 2FA required for user:", data.user_id);
                gaPendingUserId = data.user_id || null;
                gaPendingTabId = data.tab_id || tabId;
                sessionStorage.setItem('tab_id', gaPendingTabId);
                openGaModal(data.error || "Enter the 6-digit code from Google Authenticator to continue.");
                
                // Reset button
                if (finalBtnText) finalBtnText.innerText = "Login";
                if (finalLoader) finalLoader.classList.add("hidden");
                if (finalBtn) finalBtn.disabled = false;
                return;
            }

            // ✅ SUCCESSFUL LOGIN
            if (response.ok && data.success) {
                console.log("Login successful:", data);
                
                // Clear previous storage
                sessionStorage.clear();
                
                // 👇 I-STORE ANG TAB ID
                sessionStorage.setItem('tab_id', data.tab_id || tabId);
                
                const userType = data.type;
                let redirectUrl = "/";
                
                if (userType === "superadmin") {
                    localStorage.setItem("userType", "superadmin");
                    localStorage.setItem("adminUsername", data.username);
                    localStorage.setItem("adminId", data.username);
                    if (data.area) localStorage.setItem("adminArea", data.area);
                    sessionStorage.setItem("adminUsername", data.username);
                    sessionStorage.setItem("sessionActive", "true");
                    redirectUrl = "/superadmin";
                    
                } else if (userType === "admin") {
                    localStorage.setItem("userType", "admin");
                    localStorage.setItem("adminUsername", data.username);
                    localStorage.setItem("adminId", data.admin_id || data.username);
                    if (data.area) localStorage.setItem("adminArea", data.area);
                    sessionStorage.setItem("adminUsername", data.username);
                    sessionStorage.setItem("sessionActive", "true");
                    redirectUrl = "/admin";
                    
                } else if (userType === "technician") {
                    localStorage.setItem("userType", "technician");
                    localStorage.setItem("technicianId", data.technician_id);
                    localStorage.setItem("technicianName", data.name);
                    if (data.area) localStorage.setItem("technicianArea", data.area);
                    sessionStorage.setItem("technicianId", data.technician_id);
                    sessionStorage.setItem("technicianName", data.name);
                    sessionStorage.setItem("sessionActive", "true");
                    redirectUrl = "/technician/dashboard";
                }
                
                sessionStorage.setItem("sessionStart", Date.now().toString());
                
                if (window.SessionManager) {
                    window.SessionManager.createSession(userType, data.username || data.technician_id, data.area, data.tab_id || tabId);
                }
                
                // 👇 REDIRECT WITH TAB ID
                const separator = redirectUrl.includes('?') ? '&' : '?';
                const finalUrl = redirectUrl + separator + 'tab_id=' + (data.tab_id || tabId);
                
                console.log("Redirecting to:", finalUrl);
                window.location.replace(finalUrl);

            } else {
                if (finalErrorDiv) finalErrorDiv.innerText = data.error || "Login failed, please try again.";
            }

        } catch (err) {
            console.error("Login error:", err);
            if (finalErrorDiv) finalErrorDiv.innerText = "Login failed, please check your connection.";
        } finally {
            if (finalBtnText) finalBtnText.innerText = "Login";
            if (finalLoader) finalLoader.classList.add("hidden");
            if (finalBtn) finalBtn.disabled = false;
        }
    });
}

// ===============================
// 🔑 FORGOT PASSWORD MODAL (6‑DIGIT BOXES)
// ===============================
const forgotModal = document.getElementById("forgotPasswordModal");
if (forgotModal) {
    const closeModalBtn = forgotModal.querySelector(".forgot-modal-close");
    const fpStep1 = document.getElementById("fpStep1");
    const fpStep2 = document.getElementById("fpStep2");
    const fpMessage = document.getElementById("fpMessage");
    const otpTimerEl = document.getElementById("otpTimer");
    const resendOtpBtn = document.getElementById("resendOtpBtn");

    const fpDigits = [
        document.getElementById("fpDigit1"),
        document.getElementById("fpDigit2"),
        document.getElementById("fpDigit3"),
        document.getElementById("fpDigit4"),
        document.getElementById("fpDigit5"),
        document.getElementById("fpDigit6")
    ];

    let otpCountdown;
    const otpDuration = 300;

    function setupFpCodeDigits() {
        fpDigits.forEach((digit, idx) => {
            if (!digit) return;
            
            // ✅ I-REMOVE ANG EXISTING LISTENER PARA MAIWASAN ANG DUPLICATE
            const newDigit = digit.cloneNode(true);
            digit.parentNode.replaceChild(newDigit, digit);
            fpDigits[idx] = newDigit;
            
            newDigit.addEventListener("input", function() {
                // Allow only numbers
                this.value = this.value.replace(/\D/g, '').slice(0, 1);
                
                if (this.value.length === 1 && idx < 5 && fpDigits[idx + 1]) {
                    fpDigits[idx + 1].focus();
                }
            });
            
            newDigit.addEventListener("keydown", function(e) {
                if (e.key === "Backspace" && this.value.length === 0 && idx > 0 && fpDigits[idx - 1]) {
                    fpDigits[idx - 1].focus();
                }
            });
            
            // ✅ ADD PASTE SUPPORT
            newDigit.addEventListener("paste", function(e) {
                e.preventDefault();
                const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
                pasted.split('').forEach((char, charIndex) => {
                    if (fpDigits[charIndex]) fpDigits[charIndex].value = char;
                });
                const nextIndex = Math.min(pasted.length, fpDigits.length - 1);
                if (fpDigits[nextIndex]) fpDigits[nextIndex].focus();
            });
        });
    }

    function getFpCode() {
        const code = fpDigits.map(d => d ? d.value : "").join("");
        console.log("🔑 OTP Code from boxes:", code);
        return code;
    }

    function clearFpDigits() {
        fpDigits.forEach(d => { if (d) d.value = ""; });
        if (fpDigits[0]) fpDigits[0].focus();
    }

    function startOtpCountdown() {
        let timeLeft = otpDuration;
        if (resendOtpBtn) resendOtpBtn.disabled = true;
        if (otpCountdown) clearInterval(otpCountdown);

        // ✅ I-ENABLE ANG RESET BUTTON SA SIMULA
        if (resetPasswordBtn) {
            resetPasswordBtn.disabled = false;
            resetPasswordBtn.textContent = "Reset Password";
        }

        otpCountdown = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
            const seconds = (timeLeft % 60).toString().padStart(2, "0");
            if (otpTimerEl) otpTimerEl.textContent = `${minutes}:${seconds}`;

            if (timeLeft <= 0) {
                clearInterval(otpCountdown);
                if (resendOtpBtn) resendOtpBtn.disabled = false;
                if (otpTimerEl) otpTimerEl.textContent = "00:00";
            } else timeLeft--;
        }, 1000);
    }

    const forgotLink = document.getElementById("forgotPasswordLink");
    if (forgotLink) {
        forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            if (forgotModal) forgotModal.style.display = "flex";
            if (fpStep1) fpStep1.style.display = "block";
            if (fpStep2) fpStep2.style.display = "none";
            if (fpMessage) fpMessage.textContent = "";
            clearFpDigits();
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (forgotModal) forgotModal.style.display = "none";
        });
    }

    const sendCodeBtn = document.getElementById("sendCodeBtn");
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener("click", async () => {
            const identifier = document.getElementById("fpIdentifier")?.value.trim();
            if (!identifier) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Please enter your email address or ID.";
                }
                return;
            }

            sendCodeBtn.disabled = true;
            sendCodeBtn.textContent = "Sending...";

            try {
                const res = await fetch("/api/admin/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier })
                });
                const data = await res.json();

                if (res.ok) {
                    if (fpMessage) {
                        fpMessage.style.color = "green";
                        fpMessage.textContent = "Verification code sent! Check your email.";
                    }
                    showToast("Verification code sent! Check your email.", "success");
                    if (fpStep1) fpStep1.style.display = "none";
                    if (fpStep2) fpStep2.style.display = "block";
                    if (forgotModal) forgotModal.dataset.username = data.username;
                    clearFpDigits();
                    startOtpCountdown();
                } else {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = data.error || "Failed to send code";
                    }
                    showToast(data.error || "Failed to send code", "error");
                }
            } catch (err) {
                console.error(err);
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Server error. Please try again.";
                }
            } finally {
                sendCodeBtn.disabled = false;
                sendCodeBtn.textContent = "Send Verification Code";
            }
        });
    }

    const resetPasswordBtn = document.getElementById("resetPasswordBtn");
    if (resetPasswordBtn) {
        // ✅ I-REMOVE ANG EXISTING EVENT LISTENER PARA MAIWASAN ANG DUPLICATE
        const newResetBtn = resetPasswordBtn.cloneNode(true);
        resetPasswordBtn.parentNode.replaceChild(newResetBtn, resetPasswordBtn);
        
        newResetBtn.addEventListener("click", async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log("🔑 Reset password button clicked!");
            
            const code = getFpCode();
            const newPassword = document.getElementById("fpNewPassword")?.value.trim();
            const confirmPassword = document.getElementById("fpConfirmPassword")?.value.trim();
            const identifier = document.getElementById("fpIdentifier")?.value.trim();
            const username = forgotModal.dataset.username || identifier;
            const tabId = getOrCreateTabId();
            
            console.log("📝 Code:", code);
            console.log("📝 New Password:", newPassword ? "***" : "empty");
            console.log("📝 Confirm Password:", confirmPassword ? "***" : "empty");
            console.log("📝 Identifier:", identifier);
            console.log("📝 Username:", username);
            console.log("📝 Tab ID:", tabId);

            // ✅ I-CLEAR ANG PREVIOUS MESSAGE
            if (fpMessage) {
                fpMessage.textContent = "";
                fpMessage.style.color = "";
            }

            // ✅ VALIDATION: CODE
            if (code.length !== 6) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Please enter the complete 6-digit verification code.";
                }
                showToast("Please enter the complete 6-digit verification code.", "error");
                return;
            }
            
            // ✅ VALIDATION: NEW PASSWORD
            if (!newPassword) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Please enter a new password.";
                }
                showToast("Please enter a new password.", "error");
                return;
            }
            
            // ✅ VALIDATION: PASSWORD LENGTH
            if (newPassword.length < 8) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Password must be at least 8 characters.";
                }
                showToast("Password must be at least 8 characters.", "error");
                return;
            }
            
            // ✅ VALIDATION: CONFIRM PASSWORD
            if (newPassword !== confirmPassword) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Passwords do not match!";
                }
                showToast("Passwords do not match!", "error");
                return;
            }

            // ✅ DISABLE BUTTON PARA MAIWASAN ANG DOUBLE CLICK
            this.disabled = true;
            this.textContent = "Resetting...";

            try {
                console.log("📤 Sending reset request...");
                const res = await fetch("/api/admin/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ 
                        username: username,
                        identifier: identifier,
                        code: code,
                        new_password: newPassword,
                        tab_id: tabId
                    })
                });
                
                const data = await res.json();
                console.log("📥 Response:", data);

                if (res.ok) {
                    if (fpMessage) {
                        fpMessage.style.color = "green";
                        fpMessage.textContent = data.message + " Redirecting to your dashboard...";
                    }
                    showToast("Password updated successfully. Redirecting to your dashboard...", "success");

                    setTimeout(() => {
                        if (forgotModal) forgotModal.style.display = "none";
                        
                        // ✅ I-PRINT ANG DATA PARA MA-DEBUG
                        console.log("📥 Reset response data:", data);
                        
                        // ✅ I-DIRECT NA GAMITIN ANG handleLoginSuccess
                        // Siguraduhin na complete ang data
                        const loginPayload = {
                            ...data,
                            type: data.type || 'admin',
                            username: data.username || username,
                            user_id: data.user_id || data.username || username,
                            admin_id: data.admin_id || data.user_id || data.username || username,
                            technician_id: data.technician_id || data.user_id || data.username || username,
                            name: data.name || data.username || username,
                            area: data.area || '',
                            redirect: data.redirect || null  // ✅ I-PRESERVE ANG REDIRECT
                        };
                        
                        console.log("📤 Login payload:", loginPayload);
                        handleLoginSuccess(loginPayload, tabId);
                    }, 2000);
                } else {
                    // ❌ ERROR
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = data.error || "Failed to reset password";
                    }
                    showToast(data.error || "Failed to reset password", "error");
                    
                    // ✅ I-ENABLE ANG BUTTON
                    this.disabled = false;
                    this.textContent = "Reset Password";
                }
            } catch (err) {
                console.error("❌ Reset error:", err);
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Server error. Please try again.";
                }
                showToast("Server error. Please try again.", "error");
                
                // ✅ I-ENABLE ANG BUTTON
                this.disabled = false;
                this.textContent = "Reset Password";
            }
        });
    }

    if (resendOtpBtn) {
        resendOtpBtn.addEventListener("click", async () => {
            const identifier = document.getElementById("fpIdentifier")?.value.trim();
            if (!identifier) return;

            resendOtpBtn.disabled = true;
            resendOtpBtn.textContent = "Sending...";

            try {
                const res = await fetch("/api/admin/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ identifier })
                });
                const data = await res.json();

                if (res.ok) {
                    if (fpMessage) {
                        fpMessage.style.color = "green";
                        fpMessage.textContent = "New verification code sent!";
                    }
                    showToast("New verification code sent!", "success");
                    clearFpDigits();
                    startOtpCountdown();
                } else {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = data.error || "Failed to resend code";
                    }
                    showToast(data.error || "Failed to resend code", "error");
                }
            } catch (err) {
                console.error(err);
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Server error. Please try again.";
                }
            } finally {
                resendOtpBtn.disabled = false;
                resendOtpBtn.textContent = "Resend Code";
            }
        });
    }

    setupFpCodeDigits();
}

// ===============================
// 📝 SESSION MANAGER (For MySQL Backend)
// ===============================
if (!window.SessionManager) {
    window.SessionManager = {
        createSession: function(userType, username, area) {
            this.clearSession();
            localStorage.setItem("userType", userType);
            if (userType === 'technician') {
                localStorage.setItem("technicianId", username);
            } else {
                localStorage.setItem("adminUsername", username);
            }
            if (area) localStorage.setItem("userArea", area);
            sessionStorage.setItem("sessionActive", "true");
            sessionStorage.setItem("sessionStart", Date.now().toString());
            console.log(`Session created for ${userType}: ${username}`);
        },
        
        getSession: function() {
            return {
                userType: localStorage.getItem("userType"),
                username: localStorage.getItem("adminUsername") || localStorage.getItem("technicianId"),
                area: localStorage.getItem("userArea") || localStorage.getItem("adminArea") || localStorage.getItem("technicianArea"),
                isActive: sessionStorage.getItem("sessionActive") === "true"
            };
        },
        
        clearSession: function() {
            localStorage.removeItem("userType");
            localStorage.removeItem("adminUsername");
            localStorage.removeItem("adminArea");
            localStorage.removeItem("technicianId");
            localStorage.removeItem("technicianName");
            localStorage.removeItem("technicianArea");
            localStorage.removeItem("userArea");
            sessionStorage.removeItem("sessionActive");
            sessionStorage.removeItem("sessionStart");
            sessionStorage.removeItem("sessionToken");
            console.log("Session cleared");
        },
        
        isAuthenticated: function() {
            return sessionStorage.getItem("sessionActive") === "true" && 
                   localStorage.getItem("userType") !== null;
        },
        
        logout: async function() {
            try {
                await fetch("/api/logout", { method: "POST" });
            } catch(e) {
                console.error("Logout error:", e);
            }
            this.clearSession();
            window.location.replace("/");
        }
    };
}

// ===============================
// 🚪 LOGOUT FUNCTION
// ===============================
window.logout = async function() {
    if (window.SessionManager) {
        await window.SessionManager.logout();
    } else {
        window.location.replace("/");
    }
};

console.log("Login page initialized with MySQL backend ✅");

// ==================== ACCOUNT GUIDE MODAL ====================
const guideBtn = document.getElementById('accountGuideBtn');
const guideModal = document.getElementById('accountGuideModal');
const modalClose = document.querySelector('.guide-modal-close');

if (guideBtn && guideModal) {
    guideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        guideModal.classList.add('show');
    });
    
    function closeModal() {
        guideModal.classList.remove('show');
    }
    
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    guideModal.addEventListener('click', (e) => {
        if (e.target === guideModal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && guideModal.classList.contains('show')) {
            closeModal();
        }
    });
}

// ==================== GOOGLE AUTHENTICATOR MODAL ====================
const gaModal = document.getElementById('gaVerificationModal');
const gaModalClose = gaModal ? gaModal.querySelector('.ga-modal-close') : null;
const gaModalError = document.getElementById('gaModalError');
const gaVerifyBtn = document.getElementById('gaVerifyBtn');
const gaDigits = Array.from(document.querySelectorAll('.ga-code-digit'));
let gaPendingUserId = null;
let gaPendingTabId = null;

// ==================== GA MODAL FUNCTIONS ====================
function openGaModal(message = '') {
    if (!gaModal) return;
    gaModal.style.display = 'flex';
    gaModal.classList.add('show');
    gaDigits.forEach((input, index) => {
        input.value = '';
        input.disabled = false;
    });
    if (gaDigits[0]) gaDigits[0].focus();
    if (gaModalError) {
        gaModalError.textContent = message;
        gaModalError.style.display = message ? 'block' : 'none';
    }
}

function closeGaModal() {
    if (!gaModal) return;
    gaModal.style.display = 'none';
    gaModal.classList.remove('show');
    if (gaModalError) {
        gaModalError.textContent = '';
        gaModalError.style.display = 'none';
    }
    gaDigits.forEach(input => input.value = '');
}

// ==================== GA DIGIT INPUT HANDLERS ====================
function syncGaCodeField() {
    const gaCode = gaDigits.map(input => input.value).join('');
    return gaCode;
}

gaDigits.forEach((digit, index) => {
    digit.addEventListener('input', () => {
        const value = digit.value.replace(/\D/g, '').slice(0, 1);
        digit.value = value;
        if (value && index < gaDigits.length - 1) {
            gaDigits[index + 1].focus();
        }
    });

    digit.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !digit.value && index > 0) {
            e.preventDefault();
            const previous = gaDigits[index - 1];
            previous.focus();
            previous.value = '';
        }
    });

    digit.addEventListener('paste', (e) => {
        e.preventDefault();
        const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        pasted.split('').forEach((char, charIndex) => {
            if (gaDigits[charIndex]) gaDigits[charIndex].value = char;
        });
        const nextIndex = Math.min(pasted.length, gaDigits.length - 1);
        gaDigits[nextIndex].focus();
    });
});

// ==================== GA CLOSE EVENTS ====================
if (gaModalClose) {
    gaModalClose.addEventListener('click', closeGaModal);
}

if (gaModal) {
    gaModal.addEventListener('click', (e) => {
        if (e.target === gaModal) closeGaModal();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gaModal && gaModal.classList.contains('show')) {
        closeGaModal();
    }
});

// ==================== GA VERIFY BUTTON ====================
if (gaVerifyBtn) {
    gaVerifyBtn.addEventListener('click', () => {
        const code = syncGaCodeField();
        if (code.length !== 6) {
            if (gaModalError) {
                gaModalError.textContent = 'Please enter the complete 6-digit code.';
                gaModalError.style.display = 'block';
            }
            return;
        }

        // ✅ Get tab_id from sessionStorage
        const tabId = sessionStorage.getItem('tab_id') || getOrCreateTabId();

        // ✅ Submit login with GA code
        performLoginWithGA(code, tabId);
    });
}

// ==================== PERFORM LOGIN WITH GA CODE ====================
async function performLoginWithGA(code, tabId) {
    const username = document.getElementById('username')?.value.trim() || '';
    const password = document.getElementById('password')?.value.trim() || '';

    if (gaVerifyBtn) {
        gaVerifyBtn.disabled = true;
        gaVerifyBtn.textContent = 'Verifying...';
    }

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                password: password,
                ga_code: code,
                tab_id: tabId
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            handleLoginSuccess(data, tabId);
        } else if (data.requires_2fa) {
            // Still requires 2FA - keep modal open
            if (gaModalError) {
                gaModalError.textContent = data.error || 'Invalid code. Please try again.';
                gaModalError.style.display = 'block';
            }
            gaDigits.forEach(input => input.value = '');
            if (gaDigits[0]) gaDigits[0].focus();
        } else {
            if (gaModalError) {
                gaModalError.textContent = data.error || 'Verification failed. Please try again.';
                gaModalError.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('GA verification error:', err);
        if (gaModalError) {
            gaModalError.textContent = 'Network error. Please try again.';
            gaModalError.style.display = 'block';
        }
    } finally {
        if (gaVerifyBtn) {
            gaVerifyBtn.disabled = false;
            gaVerifyBtn.textContent = 'Verify Code';
        }
    }
}

// ==================== HANDLE LOGIN SUCCESS ====================
function handleLoginSuccess(data, tabId) {
    console.log("📥 handleLoginSuccess called with data:", data);
    console.log("📥 Tab ID:", tabId);
    
    sessionStorage.clear();
    sessionStorage.setItem('tab_id', tabId);
    
    const userType = data.type;
    let redirectUrl = "/";
    
    console.log("👤 User Type:", userType);
    
    if (userType === "superadmin") {
        localStorage.setItem("userType", "superadmin");
        localStorage.setItem("adminUsername", data.username);
        localStorage.setItem("adminId", data.username || data.user_id);
        if (data.area) localStorage.setItem("adminArea", data.area);
        sessionStorage.setItem("adminUsername", data.username);
        sessionStorage.setItem("sessionActive", "true");
        redirectUrl = "/superadmin";
        
    } else if (userType === "admin") {
        localStorage.setItem("userType", "admin");
        localStorage.setItem("adminUsername", data.username);
        localStorage.setItem("adminId", data.admin_id || data.user_id || data.username);
        if (data.area) localStorage.setItem("adminArea", data.area);
        sessionStorage.setItem("adminUsername", data.username);
        sessionStorage.setItem("sessionActive", "true");
        redirectUrl = "/admin";
        
    } else if (userType === "technician") {
        localStorage.setItem("userType", "technician");
        // ✅ GAMITIN ANG technician_id MULA SA DATA
        const techId = data.technician_id || data.username || data.user_id;
        localStorage.setItem("technicianId", techId);
        localStorage.setItem("technicianName", data.name || data.username || techId);
        if (data.area) localStorage.setItem("technicianArea", data.area);
        sessionStorage.setItem("technicianId", techId);
        sessionStorage.setItem("technicianName", data.name || data.username || techId);
        sessionStorage.setItem("sessionActive", "true");
        redirectUrl = "/technician/dashboard";
    }
    
    sessionStorage.setItem("sessionStart", Date.now().toString());
    closeGaModal();
    
    // ✅ GAMITIN ANG data.redirect KUNG MERON
    if (data.redirect) {
        // Tignan kung may tab_id na sa redirect URL
        if (!data.redirect.includes('tab_id=')) {
            const separator = data.redirect.includes('?') ? '&' : '?';
            redirectUrl = data.redirect + separator + 'tab_id=' + tabId;
        } else {
            redirectUrl = data.redirect;
        }
    } else {
        const separator = redirectUrl.includes('?') ? '&' : '?';
        redirectUrl = redirectUrl + separator + 'tab_id=' + tabId;
    }
    
    console.log("🚀 Redirecting to:", redirectUrl);
    window.location.replace(redirectUrl);
}