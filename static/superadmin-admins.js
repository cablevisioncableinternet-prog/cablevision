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

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if (hamburger && sidebar) {
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
        if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    hamburger.addEventListener('click', toggleSidebar);
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    // Auto-close sidebar when resizing to desktop size
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'info') {
    const LABELS = {
        success: 'Success',
        error:   'Error',
        info:    'Notice',
        loading: 'Please wait'
    };

    const ICONS = {
        success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
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

// ================= CACHE =================
let adminsCache = null;
let allAdmins = []; // Store all admins for filtering

function hasActiveLoginLock(account) {
    if (Number(account.login_locked) === 1 || account.login_locked === true) return true;
    if (Number(account.lock_level) > 0) return true;
    const lockedUntil = account.locked_until ? new Date(String(account.locked_until).replace(' ', 'T')) : null;
    return Boolean(lockedUntil && !Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now());
}

// ================= DISPLAY TABLE MESSAGE =================
function displayTableMessage(message, isError = false) {
    const existingMessage = document.querySelector(".table-message");
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const messageDiv = document.createElement("div");
    messageDiv.className = "table-message";
    messageDiv.style.cssText = `
        background: ${isError ? "#fef2f2" : "#ecfdf5"};
        color: ${isError ? "#dc2626" : "#059669"};
        padding: 12px 16px;
        border-radius: 12px;
        margin-top: 16px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid ${isError ? "#fecaca" : "#a7f3d0"};
        animation: slideInDown 0.3s ease;
    `;
    messageDiv.innerHTML = `
        <i class="fas ${isError ? "fa-exclamation-circle" : "fa-check-circle"}" style="font-size: 16px;"></i>
        <span>${message}</span>
        <button type="button" class="close-message" style="margin-left: auto; background: none; border: none; cursor: pointer; color: ${isError ? "#dc2626" : "#059669"};">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const tableWrapper = document.querySelector(".table-wrapper");
    if (tableWrapper) {
        tableWrapper.insertAdjacentElement("afterend", messageDiv);
    }
    
    const closeBtn = messageDiv.querySelector(".close-message");
    if (closeBtn) {
        closeBtn.onclick = () => messageDiv.remove();
    }
    
    setTimeout(() => {
        if (messageDiv && messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// ================= DISPLAY FORM MESSAGES =================
function displayFormSuccess(message) {
    const existingSuccess = document.querySelector(".form-success-message");
    if (existingSuccess) existingSuccess.remove();
    
    const existingError = document.querySelector(".form-error-message");
    if (existingError) existingError.remove();
    
    const successDiv = document.createElement("div");
    successDiv.className = "form-success-message";
    successDiv.style.cssText = `
        background: #ecfdf5;
        color: #059669;
        padding: 12px 16px;
        border-radius: 12px;
        margin-top: 20px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid #a7f3d0;
        animation: slideInDown 0.3s ease;
    `;
    successDiv.innerHTML = `
        <i class="fas fa-check-circle" style="font-size: 16px;"></i>
        <span>${message}</span>
        <button type="button" class="close-success" style="margin-left: auto; background: none; border: none; cursor: pointer; color: #059669;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const formActions = document.querySelector(".form-actions");
    if (formActions) {
        formActions.insertAdjacentElement("afterend", successDiv);
    } else {
        const form = document.getElementById("createAdminForm");
        if (form) form.appendChild(successDiv);
    }
    
    const closeBtn = successDiv.querySelector(".close-success");
    if (closeBtn) {
        closeBtn.onclick = () => successDiv.remove();
    }
    
    setTimeout(() => {
        if (successDiv && successDiv.parentNode) {
            successDiv.remove();
        }
    }, 5000);
}

function displayFormError(message) {
    const existingError = document.querySelector(".form-error-message");
    if (existingError) existingError.remove();
    
    const existingSuccess = document.querySelector(".form-success-message");
    if (existingSuccess) existingSuccess.remove();
    
    const errorDiv = document.createElement("div");
    errorDiv.className = "form-error-message";
    errorDiv.style.cssText = `
        background: #fef2f2;
        color: #dc2626;
        padding: 12px 16px;
        border-radius: 12px;
        margin-top: 20px;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid #fecaca;
        animation: slideInDown 0.3s ease;
    `;
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle" style="font-size: 16px;"></i>
        <span>${message}</span>
        <button type="button" class="close-error" style="margin-left: auto; background: none; border: none; cursor: pointer; color: #dc2626;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    const formActions = document.querySelector(".form-actions");
    if (formActions) {
        formActions.insertAdjacentElement("afterend", errorDiv);
    } else {
        const form = document.getElementById("createAdminForm");
        if (form) form.appendChild(errorDiv);
    }
    
    const closeBtn = errorDiv.querySelector(".close-error");
    if (closeBtn) {
        closeBtn.onclick = () => errorDiv.remove();
    }
    
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function clearFormMessages() {
    const existingError = document.querySelector(".form-error-message");
    if (existingError) existingError.remove();
    
    const existingSuccess = document.querySelector(".form-success-message");
    if (existingSuccess) existingSuccess.remove();
}



// ================= DELETE MODAL =================
let adminToDelete = null;
let adminToDeleteUsername = null;
let adminToDeleteId = null;
const deleteModal = document.getElementById("deleteAdminModal");
const deleteText = document.getElementById("deleteAdminText");
const cancelDelete = document.getElementById("cancelDeleteAdmin");
const confirmDelete = document.getElementById("confirmDeleteAdmin");
const closeBtn = deleteModal ? deleteModal.querySelector(".close-btn") : null;

function openDeleteModal(adminId, username) {
    adminToDelete = adminId;
    adminToDeleteUsername = username;
    adminToDeleteId = adminId;
    if (deleteText) deleteText.innerText = `Delete admin "${username}" (${adminId}) ?`;
    if (deleteModal) {
        // ✅ I-CENTER ANG MODAL - ITO ANG BAGO
        deleteModal.style.display = "flex";
        deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeDeleteModal() {
    if (deleteModal) {
        deleteModal.style.display = "none";
        deleteModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    adminToDelete = null;
    adminToDeleteUsername = null;
    adminToDeleteId = null;
}

if (cancelDelete) cancelDelete.onclick = closeDeleteModal;
if (closeBtn) closeBtn.onclick = closeDeleteModal;

// ================= DELETE MODAL =================
if (confirmDelete) {
    confirmDelete.onclick = async () => {
        if (!adminToDelete) return;
        try {
            const res = await fetch(`/api/superadmin/admins/${adminToDelete}`, {
                method: "DELETE",
            });
            if (res.ok) {
                showToast(`Admin "${adminToDeleteUsername}" (${adminToDeleteId}) deleted successfully!`, 'success');
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to delete admin", 'error');
            }
        } catch (error) {
            showToast("Network error. Please try again.", 'error');
        }

        sessionStorage.removeItem("adminsCache");
        await loadAdmins(true);
        closeDeleteModal();
    };
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
        profileBtn.classList.toggle("active");
    });
    window.addEventListener("click", function(e) {
        if (!profileBtn.contains(e.target)) {
            profileMenu.classList.remove("show");
            profileBtn.classList.remove("active");
        }
    });
}

async function loadProfile() {
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "";
    } catch (err) { 
        console.error(err); 
    }
}
loadProfile();

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    // Open
    logoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });
    
    // Close - X button
    const closeBtnLogout = document.getElementById("closeLogoutModal");
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Close - Cancel button
    const cancelLogout = document.getElementById("cancelLogout");
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Confirm logout
    const confirmLogout = document.getElementById("confirmLogout");
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
    
    // Close on outside click
    window.addEventListener("click", function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    });
}

// ================= STATUS MODAL =================
let selectedAdminId = null;
let selectedAdminUsername = null;
let newStatus = null;

function openStatusModal(adminId, username, currentStatus) {
    selectedAdminId = adminId;
    selectedAdminUsername = username;
    newStatus = currentStatus === "Active" ? "Deactivated" : "Active";

    const modalTitle = document.getElementById("statusModalTitle");
    const modalText = document.getElementById("statusModalText");
    
    if (modalTitle) modalTitle.innerText = `Confirm ${newStatus}`;
    if (modalText) modalText.innerText = `Are you sure you want to ${newStatus.toLowerCase()} "${username}" (${adminId})?`;

    const statusModal = document.getElementById("statusModal");
    if (statusModal) {
        // ✅ I-CENTER ANG MODAL
        statusModal.style.display = "flex";
        statusModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeStatusModal() {
    const statusModal = document.getElementById("statusModal");
    if (statusModal) {
        statusModal.style.display = "none";
        statusModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    selectedAdminId = null;
    selectedAdminUsername = null;
    newStatus = null;
}

// ================= STATUS MODAL =================
const confirmStatusBtn = document.getElementById("confirmStatus");
if (confirmStatusBtn) {
    confirmStatusBtn.onclick = async () => {
        if (!selectedAdminId) return;
        try {
            const res = await fetch(`/api/superadmin/admins/${selectedAdminId}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                showToast(`Admin "${selectedAdminUsername}" (${selectedAdminId}) ${newStatus.toLowerCase()} successfully!`, 'success');
            } else {
                const data = await res.json();
                showToast(data.error || "Failed to update status", 'error');
            }
        } catch (error) {
            showToast("Network error. Please try again.", 'error');
        }

        sessionStorage.removeItem("adminsCache");
        loadAdmins(true);
        closeStatusModal();
    };
}

const cancelStatusBtn = document.getElementById("cancelStatus");
if (cancelStatusBtn) {
    cancelStatusBtn.onclick = closeStatusModal; // ✅ GAMITIN ANG CLOSE FUNCTION
}

// ================= VIEW INFO MODAL =================
const viewInfoModal = document.getElementById("viewInfoModal");
const closeInfoModalBtn = document.getElementById("closeInfoModalBtn");

function openViewInfoModal(adminId) {
    fetch(`/api/superadmin/admins/${adminId}`)
        .then((res) => res.json())
        .then((admin) => {
            const infoUsername = document.getElementById("infoUsername");
            const infoName = document.getElementById("infoName");
            const infoEmail = document.getElementById("infoEmail");
            const infoContact = document.getElementById("infoContact");
            const infoArea = document.getElementById("infoArea");
            const infoStatus = document.getElementById("infoStatus");
            
            if (infoUsername) infoUsername.value = admin.username || "";
            if (infoName) infoName.value = admin.username || "";
            if (infoEmail) infoEmail.value = admin.email || "";
            if (infoContact) infoContact.value = admin.contact || "Not provided";
            if (infoArea) infoArea.value = admin.area || "";

            if (infoStatus) {
                const statusText = admin.status || "Inactive";
                infoStatus.textContent = statusText;
                infoStatus.className = `info-status-badge ${statusText === "Active" ? "active" : "inactive"}`;
            }

            if (viewInfoModal) {
                viewInfoModal.classList.add("show");
                viewInfoModal.style.display = "flex";
            }
        })
        .catch(() => showToast("Failed to load admin info", 'error'));
}

function closeInfoModal() {
    if (viewInfoModal) {
        viewInfoModal.classList.remove("show");
        viewInfoModal.style.display = "none";
    }
}

if (closeInfoModalBtn) {
    closeInfoModalBtn.onclick = closeInfoModal;
}

window.addEventListener("click", (e) => {
    if (e.target === viewInfoModal) {
        closeInfoModal();
    }
});

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && viewInfoModal && viewInfoModal.classList.contains("show")) {
        closeInfoModal();
    }
});

// ================= LOAD AREAS FROM MYSQL =================
async function loadAreasForSelect() {
    const areaSelect = document.getElementById("adminArea");
    if (!areaSelect) return;
    
    areaSelect.innerHTML = '<option value="">Loading areas...</option>';
    areaSelect.disabled = true;
    
    try {
        const response = await fetch("/api/superadmin/areas");
        if (!response.ok) {
            throw new Error("Failed to load areas");
        }
        
        const areas = await response.json();
        const adminsResponse = await fetch("/api/superadmin/admins");
        const admins = adminsResponse.ok ? await adminsResponse.json() : [];
        const assignedAreas = new Set((admins || []).map(admin => admin.area).filter(Boolean));
        
        const uniqueCities = [...new Set(areas.map(area => area.city))]
            .filter(city => !assignedAreas.has(city))
            .sort();
        
        areaSelect.innerHTML = '<option value="" disabled selected>Select Area</option>';
        
        if (uniqueCities.length === 0) {
            areaSelect.innerHTML = '<option value="">All available areas already have an administrator.</option>';
            areaSelect.disabled = true;
            return;
        }
        
        uniqueCities.forEach(city => {
            const option = document.createElement("option");
            option.value = city;
            option.textContent = city;
            areaSelect.appendChild(option);
        });
        
        areaSelect.disabled = false;
        console.log(`Loaded ${uniqueCities.length} available cities from MySQL areas`);
        
    } catch (error) {
        console.error("Error loading areas:", error);
        areaSelect.innerHTML = '<option value="">Error loading areas. Please refresh.</option>';
        areaSelect.disabled = true;
        showToast("Failed to load areas. Please refresh the page.", 'error');
    }
}

// ================= SEARCH FUNCTION =================
function setupSearchFilter() {
    const searchInput = document.getElementById("searchInput");
    if (!searchInput) return;
    
    function filterAdmins() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderAdmins(allAdmins);
            return;
        }
        
        const filtered = allAdmins.filter(admin => 
            (admin.admin_id && admin.admin_id.toLowerCase().includes(searchTerm)) ||
            (admin.username && admin.username.toLowerCase().includes(searchTerm)) ||
            (admin.area && admin.area.toLowerCase().includes(searchTerm))
        );
        
        renderAdmins(filtered);
    }
    
    searchInput.addEventListener("input", filterAdmins);
}

// ================= RENDER ADMINS =================
function renderAdmins(admins) {
    const tbody = document.querySelector("#adminsTable tbody");
    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!admins || admins.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; padding:40px;">
                    <i class="fas fa-user-slash" style="font-size:48px; color:#cbd5e1;"></i>
                    <p style="margin-top:12px; color:#64748b;">No administrators found</p>
                </td>
            </tr>
        `;
        return;
    }

    admins.forEach((admin) => {
        const tr = document.createElement("tr");
        const needsAllow = hasActiveLoginLock(admin);
        tr.innerHTML = `
            <td><strong>${admin.admin_id}</strong><br><span style="font-size: 0.7rem; color: #666;">${admin.username}</span></td>
            <td>${admin.area}</td>
            <td style="text-align: center;">
                <span style="
                    display: inline-block;
                    padding: 4px 14px;
                    border-radius: 40px;
                    font-weight: 600;
                    font-size: 0.7rem;
                    background: ${admin.status === "Active" ? "#e8f5e9" : "#ffebee"};
                    color: ${admin.status === "Active" ? "#27ae60" : "#c0392b"};
                    border: 1px solid ${admin.status === "Active" ? "#c8e6c9" : "#ffcdd2"};
                ">
                    ${admin.status}
                </span>
            </td>
            <td style="text-align: center;">
                ${needsAllow ? '<small style="display:block;color:#dc2626;margin-bottom:6px;">Account locked</small>' : ''}
                <div class="account-action-buttons" style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <button class="statusBtn" 
                        style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                        data-id="${admin.admin_id}" 
                        data-username="${admin.username}" 
                        data-status="${admin.status}"> 
                        <i class="fas fa-toggle-off"></i> ${admin.status === "Active" ? "Deactivate" : "Activate"}
                    </button>

                    <button class="viewBtn"
                        style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                        data-id="${admin.admin_id}">
                         <i class="fas fa-eye"></i> View
                    </button>

                    <button class="deleteBtn"
                        style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                        data-id="${admin.admin_id}"
                        data-username="${admin.username}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                    ${needsAllow ? `<button class="allowLoginBtn" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;" data-id="${admin.admin_id}"><i class="fas fa-unlock"></i> Allow</button>` : ''}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach events
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
        btn.onclick = () => openDeleteModal(btn.dataset.id, btn.dataset.username);
    });
    document.querySelectorAll(".statusBtn").forEach((btn) => {
        btn.onclick = () => openStatusModal(btn.dataset.id, btn.dataset.username, btn.dataset.status);
    });
    document.querySelectorAll(".viewBtn").forEach((btn) => {
        btn.onclick = () => openViewInfoModal(btn.dataset.id);
    });
    document.querySelectorAll(".allowLoginBtn").forEach((btn) => {
        btn.onclick = async () => {
            btn.disabled = true;
            try {
                const response = await fetch(`/api/superadmin/admins/${btn.dataset.id}/unlock`, { method: "POST" });
                const data = await response.json();
                showToast(data.message || data.error || "Unable to allow login", response.ok ? "success" : "error");
                if (response.ok) await loadAdmins(true);
            } catch (error) {
                showToast("Network error. Please try again.", "error");
                btn.disabled = false;
            }
        };
    });
}

// ================= LOAD ADMINS =================
async function loadAdmins(forceRefresh = false) {
    const tbody = document.querySelector("#adminsTable tbody");
    if (!tbody) return;

    const cached = JSON.parse(sessionStorage.getItem("adminsCache") || "null");
    const cacheHasLockoutFields = Array.isArray(cached) && (
        cached.length === 0 || (
            Object.prototype.hasOwnProperty.call(cached[0], "locked_until") &&
            Object.prototype.hasOwnProperty.call(cached[0], "lock_level")
        )
    );
    if (cached && cacheHasLockoutFields && !forceRefresh) {
        allAdmins = cached;
        renderAdmins(cached);
        return;
    }

    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center;padding:40px;">
                <div class="spinner"></div>
                <p style="margin-top:12px;">Loading admins...</p>
            </td>
        </tr>
    `;

    try {
        const res = await fetch("/api/superadmin/admins");
        const admins = await res.json();

        allAdmins = admins;
        sessionStorage.setItem("adminsCache", JSON.stringify(admins));
        renderAdmins(admins);
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#dc3545;">Failed to load admins</td></tr>`;
        console.error(err);
    }
}

// ================= CREATE ADMIN =================
// ================= CREATE ADMIN =================
const createAdminForm = document.getElementById("createAdminForm");
if (createAdminForm) {
    createAdminForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const username = document.getElementById("adminUsername").value.trim();
        const email = document.getElementById("adminEmail").value.trim();
        const area = document.getElementById("adminArea").value;

        if (!username || !email || !area) {
            showToast("All fields are required. Please fill in all fields.", 'error');
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_-]{4,20}$/;
        if (!usernameRegex.test(username)) {
            showToast("Username must be 4-20 characters and can only contain letters, numbers, underscores, and hyphens.", 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast("Please enter a valid email address.", 'error');
            return;
        }

        const submitBtn = createAdminForm.querySelector(".btn-primary");
        const resetBtn = createAdminForm.querySelector(".btn-reset");
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        resetBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const res = await fetch("/api/superadmin/admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, email, area }),
            });

            const data = await res.json();

            if (res.ok) {
                showToast(data.message || "Admin created successfully!", 'success');
                createAdminForm.reset();
                sessionStorage.removeItem("adminsCache");
                await loadAdmins(true);
            } else {
                showToast(data.error || "Failed to create admin. Please try again.", 'error');
            }
        } catch (error) {
            console.error("Error creating admin:", error);
            showToast("Network error. Please check your connection and try again.", 'error');
        } finally {
            submitBtn.disabled = false;
            resetBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// ================= CSS ANIMATIONS =================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .form-error-message,
    .form-success-message,
    .table-message {
        animation: slideInDown 0.3s ease;
    }
`;
document.head.appendChild(style);

// ================= KEYBOARD SHORTCUT: ESC =================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        // Close logout modal
        if (logoutModal && logoutModal.style.display === "block") {
            logoutModal.style.display = "none";
        }
        
        // Close profile dropdown
        if (profileMenu && profileMenu.classList.contains("show")) {
            profileMenu.classList.remove("show");
            if (profileBtn) profileBtn.classList.remove("active");
        }
        
        // Close notification menu
        const notificationMenu = document.getElementById('notificationMenu');
        if (notificationMenu && notificationMenu.classList.contains("show")) {
            notificationMenu.classList.remove("show");
        }
        
        // Close sidebar on mobile
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains("active")) {
            sidebar.classList.remove("active");
            if (hamburger) hamburger.classList.remove("active");
            if (sidebarOverlay) sidebarOverlay.classList.remove("active");
            document.body.style.overflow = '';
        }
        
        // Close info modal
        if (viewInfoModal && viewInfoModal.classList.contains("show")) {
            closeInfoModal();
        }
        
        // Close delete modal
        if (deleteModal && deleteModal.style.display === "block") {
            closeDeleteModal();
        }
        
        // Close status modal
        const statusModal = document.getElementById("statusModal");
        if (statusModal && statusModal.style.display === "block") {
            statusModal.style.display = "none";
        }
    }
});

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", async () => {
    const isValid = await checkSession();
    if (!isValid) return;

    await loadAdmins();
    setupSearchFilter();
    await loadAreasForSelect();
    
    // Initialize notification system if available
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
    
    console.log('Super Admin - Admins page loaded successfully!');
});

// Also load when window is fully loaded (fallback)
window.addEventListener("load", function() {
    // If admins table is empty, try loading again
    const tbody = document.querySelector("#adminsTable tbody");
    if (tbody && tbody.children.length === 0) {
        loadAdmins();
    }
});

window.addEventListener("focus", function() {
    sessionStorage.removeItem("adminsCache");
    loadAdmins(true);
});