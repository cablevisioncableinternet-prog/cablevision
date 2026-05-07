// ===============================
// 🗄️  MYSQL BACKEND - NO FIREBASE NEEDED
// ===============================
// Firebase has been completely removed - all authentication is now handled by Flask + MySQL

console.log("Application Connected to MySQL Backend ✅");

// ===============================
// 🔐 LOGIN FORM - SINGLE HANDLER
// ===============================
const loginForm = document.getElementById("loginForm");
const errorDiv = document.getElementById("error");
const btn = document.getElementById("loginBtn");
const btnText = document.getElementById("btnText");
const loader = document.getElementById("loader");

// Remove any existing event listeners by cloning and replacing the form
if (loginForm) {
    const newLoginForm = loginForm.cloneNode(true);
    loginForm.parentNode.replaceChild(newLoginForm, loginForm);
}

// Get fresh references
const finalLoginForm = document.getElementById("loginForm");
const finalErrorDiv = document.getElementById("error");
const finalBtn = document.getElementById("loginBtn");
const finalBtnText = document.getElementById("btnText");
const finalLoader = document.getElementById("loader");

if (finalLoginForm) {
    finalLoginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        if (finalErrorDiv) finalErrorDiv.innerText = "";

        if (!username || !password) {
            if (finalErrorDiv) finalErrorDiv.innerText = "Please fill in all fields.";
            return;
        }

        if (finalBtnText) finalBtnText.innerText = "Logging in...";
        if (finalLoader) finalLoader.classList.remove("hidden");
        if (finalBtn) finalBtn.disabled = true;

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                console.log("Login successful:", data);
                
                // Get the correct values
                let adminUsername = data.username;      // "Admin1"
                let adminId = data.id || data.admin_id || data.username;  // "ACV-0001"
                let adminArea = data.area || "";
                let userType = data.type;
                
                console.log("Saving - username:", adminUsername);
                console.log("Saving - adminId:", adminId);
                
                // Save to localStorage
                localStorage.setItem("userType", userType);
                localStorage.setItem("adminUsername", adminUsername);
                localStorage.setItem("adminId", adminId);
                if (adminArea) localStorage.setItem("adminArea", adminArea);
                
                // Save to sessionStorage
                sessionStorage.setItem("adminUsername", adminUsername);
                sessionStorage.setItem("adminId", adminId);
                sessionStorage.setItem("sessionActive", "true");
                sessionStorage.setItem("sessionStart", Date.now().toString());
                
                // Also use SessionManager if available
                if (window.SessionManager) {
                    window.SessionManager.createSession(userType, adminUsername, adminArea);
                }
                
                // Redirect
                const redirectUrl = userType === "superadmin" ? "/superadmin" : "/admin";
                console.log("Redirecting to:", redirectUrl);
                window.location.replace(redirectUrl);

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
    // Get elements inside the new modal structure
    const closeModalBtn = forgotModal.querySelector(".forgot-modal-close");
    const fpStep1 = document.getElementById("fpStep1");
    const fpStep2 = document.getElementById("fpStep2");
    const fpMessage = document.getElementById("fpMessage");
    const otpTimerEl = document.getElementById("otpTimer");
    const resendOtpBtn = document.getElementById("resendOtpBtn");

    // 6-digit boxes
    const fpDigits = [
        document.getElementById("fpDigit1"),
        document.getElementById("fpDigit2"),
        document.getElementById("fpDigit3"),
        document.getElementById("fpDigit4"),
        document.getElementById("fpDigit5"),
        document.getElementById("fpDigit6")
    ];

    let otpCountdown;
    const otpDuration = 300; // 5 minutes in seconds

    // Auto-tab between digits
    function setupFpCodeDigits() {
        fpDigits.forEach((digit, idx) => {
            if (!digit) return;
            digit.addEventListener("input", () => {
                if (digit.value.length === 1 && idx < 5 && fpDigits[idx + 1]) {
                    fpDigits[idx + 1].focus();
                }
            });
            digit.addEventListener("keydown", (e) => {
                if (e.key === "Backspace" && digit.value.length === 0 && idx > 0 && fpDigits[idx - 1]) {
                    fpDigits[idx - 1].focus();
                }
            });
        });
    }

    // Get the 6-digit code from boxes
    function getFpCode() {
        return fpDigits.map(d => d.value).join("");
    }

    // Clear all digit boxes
    function clearFpDigits() {
        fpDigits.forEach(d => { if (d) d.value = ""; });
        if (fpDigits[0]) fpDigits[0].focus();
    }

    // Countdown timer
    function startOtpCountdown() {
        let timeLeft = otpDuration;
        if (resendOtpBtn) resendOtpBtn.disabled = true;
        if (otpCountdown) clearInterval(otpCountdown);

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

    // Open modal
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

    // Close modal using new close button
    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            if (forgotModal) forgotModal.style.display = "none";
        });
    }
    
    // Close modal when clicking outside the content
    window.addEventListener("click", e => { 
        if (e.target === forgotModal && forgotModal) forgotModal.style.display = "none"; 
    });

    // Step 1: Send verification code
    const sendCodeBtn = document.getElementById("sendCodeBtn");
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener("click", async () => {
            const identifier = document.getElementById("fpIdentifier")?.value.trim();
            if (!identifier) {
                if (fpMessage) {
                    fpMessage.style.color = "red";
                    fpMessage.textContent = "Please enter your email address or username.";
                }
                return;
            }

            // Disable button to prevent multiple requests
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

    // Step 2: Reset password with 6-digit code + Auto-login
    // Step 2: Reset password with 6-digit code + Auto-login
        const resetPasswordBtn = document.getElementById("resetPasswordBtn");
        if (resetPasswordBtn) {
            resetPasswordBtn.addEventListener("click", async () => {
                const code = getFpCode();
                const newPassword = document.getElementById("fpNewPassword")?.value.trim();
                // REMOVE confirmPassword for now
                // const confirmPassword = document.getElementById("fpConfirmPassword")?.value.trim();
                const username = forgotModal.dataset.username;

                console.log("Reset clicked - Code:", code, "Password:", newPassword, "Username:", username);

                if (code.length !== 6) {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = "Please enter the complete 6-digit verification code.";
                    }
                    return;
                }
                if (!newPassword) {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = "Please enter a new password.";
                    }
                    return;
                }
                if (newPassword.length < 6) {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = "Password must be at least 6 characters.";
                    }
                    return;
                }

                resetPasswordBtn.disabled = true;
                resetPasswordBtn.textContent = "Resetting...";

                try {
                    const res = await fetch("/api/admin/reset-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username, code, new_password: newPassword })
                    });
                    const data = await res.json();
                    
                    console.log("Reset response:", data);

                    if (res.ok) {
                        if (fpMessage) {
                            fpMessage.style.color = "green";
                            fpMessage.textContent = data.message + " Redirecting...";
                        }

                        localStorage.setItem("userType", data.type);
                        localStorage.setItem("adminUsername", data.username);
                        if (data.area) localStorage.setItem("adminArea", data.area);
                        sessionStorage.setItem("sessionActive", "true");

                        setTimeout(() => {
                            if (forgotModal) forgotModal.style.display = "none";
                            const redirectUrl = data.type === "superadmin" ? "/superadmin" : "/admin";
                            window.location.href = redirectUrl;
                        }, 1500);

                    } else {
                        if (fpMessage) {
                            fpMessage.style.color = "red";
                            fpMessage.textContent = data.error || "Failed to reset password";
                        }
                        resetPasswordBtn.disabled = false;
                        resetPasswordBtn.textContent = "Reset Password";
                    }
                } catch (err) {
                    console.error("Reset error:", err);
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = "Server error. Please try again.";
                    }
                    resetPasswordBtn.disabled = false;
                    resetPasswordBtn.textContent = "Reset Password";
                }
            });
        }

    // Resend OTP
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
                    clearFpDigits();
                    startOtpCountdown();
                } else {
                    if (fpMessage) {
                        fpMessage.style.color = "red";
                        fpMessage.textContent = data.error || "Failed to resend code";
                    }
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

    // Initialize digit box behavior
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
            localStorage.setItem("adminUsername", username);
            if (area) localStorage.setItem("adminArea", area);
            sessionStorage.setItem("sessionActive", "true");
            sessionStorage.setItem("sessionStart", Date.now().toString());
            console.log(`Session created for ${userType}: ${username}`);
        },
        
        getSession: function() {
            return {
                userType: localStorage.getItem("userType"),
                username: localStorage.getItem("adminUsername"),
                area: localStorage.getItem("adminArea"),
                isActive: sessionStorage.getItem("sessionActive") === "true"
            };
        },
        
        clearSession: function() {
            localStorage.removeItem("userType");
            localStorage.removeItem("adminUsername");
            localStorage.removeItem("adminArea");
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