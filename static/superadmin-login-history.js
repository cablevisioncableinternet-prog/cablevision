// ================= ADMIN / SUPERADMIN / TECHNICIAN LOGIN HISTORY SCRIPT =================

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
    if (type !== 'loading') {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Global Variables & Modal State
let currentTabId = sessionStorage.getItem('tab_id') || new URLSearchParams(window.location.search).get('tab_id') || '';
let pendingLogoutAction = { mode: null, ids: [], includeCurrent: false };

document.addEventListener('DOMContentLoaded', async () => {
    initLayout();
    await loadLoginHistory();
    initModalEvents();
});

// ================= LAYOUT INITIALIZATION =================
function initLayout() {
    const hamburger = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar") || document.querySelector(".sidebar");
    const overlay = document.getElementById("sidebarOverlay");

    function toggleSidebar() {
        if (!sidebar) return;
        sidebar.classList.toggle("active");
        if (hamburger) hamburger.classList.toggle("active");
        if (overlay) overlay.classList.toggle("active");
        document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
    }

    if (hamburger) {
        hamburger.addEventListener("click", toggleSidebar);
    }

    if (overlay) {
        overlay.addEventListener("click", toggleSidebar);
    }

    // Profile Dropdown Toggle
    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener("click", e => {
            e.stopPropagation();
            profileMenu.classList.toggle("show");
            profileBtn.classList.toggle("active");
        });

        window.addEventListener("click", e => {
            if (!profileBtn.contains(e.target)) {
                profileMenu.classList.remove("show");
                profileBtn.classList.remove("active");
            }
        });
    }

    // Topbar Header Logout Modal
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutModal = document.getElementById("logoutModal");
    if (logoutBtn && logoutModal) {
        const closeBtn = document.getElementById("closeLogoutModal");
        const cancelBtn = document.getElementById("cancelLogout");
        const confirmBtn = document.getElementById("confirmLogout");

        logoutBtn.addEventListener("click", e => {
            e.preventDefault();
            logoutModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });

        const closeModal = () => {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        };

        if (closeBtn) closeBtn.addEventListener("click", closeModal);
        if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

        if (confirmBtn) {
            confirmBtn.addEventListener("click", async () => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.replace('/');
            });
        }
    }
}

// ================= LOAD PROFILE NAME =================
async function loadProfile() {
    // Profile name display removed on login history pages.
    return;
}

// Helper: Get Icon Class for OS / Device
function getDeviceIconClass(osName, deviceStr) {
    const text = ((osName || '') + ' ' + (deviceStr || '')).toLowerCase();
    if (text.includes('android') || text.includes('iphone') || text.includes('ios') || text.includes('mobile')) {
        return 'fas fa-mobile-alt';
    } else if (text.includes('ipad') || text.includes('tablet')) {
        return 'fas fa-tablet-alt';
    } else if (text.includes('mac') || text.includes('macintosh') || text.includes('apple')) {
        return 'fas fa-laptop-house';
    }
    return 'fas fa-desktop';
}

// ================= LOAD LOGIN HISTORY =================
async function getDeviceLocationFromBrowser() {
    return new Promise(resolve => {
        if (!navigator.geolocation) {
            resolve({ latitude: null, longitude: null });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }),
            () => resolve({ latitude: null, longitude: null }),
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    });
}

async function loadLoginHistory() {
    try {
        const location = await getDeviceLocationFromBrowser();
        const params = new URLSearchParams({ tab_id: currentTabId || '' });
        if (location.latitude !== null && location.longitude !== null) {
            params.set('lat', String(location.latitude));
            params.set('lng', String(location.longitude));
        }
        const url = `/api/admin/login-history?${params.toString()}`;
        const res = await fetch(url);
        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || "Failed to fetch login history");
        }
        const data = await res.json();

        if (!data.success) {
            showToast(data.error || "Could not load login history", "error");
            return;
        }

        renderCurrentDevice(data.current_device);
        renderOtherDevices(data.other_devices);
    } catch (err) {
        console.error("Error loading login history:", err);
        showToast(err.message || "Error loading device login history", "error");
    }
}

// Render Current Device Section
function renderCurrentDevice(device) {
    const container = document.getElementById("currentDeviceContainer");
    if (!container) return;

    if (!device) {
        container.innerHTML = `
            <div class="empty-devices">
                <i class="fas fa-exclamation-circle"></i>
                <p>No active current device record found.</p>
            </div>
        `;
        return;
    }

    const iconClass = getDeviceIconClass(device.os, device.device_info);

    container.innerHTML = `
        <div class="current-device-card">
            <div class="device-card-header">
                <div class="device-main-info">
                    <div class="device-icon-box">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="device-name-wrap">
                        <h3>${device.device_brand || 'Unknown Device'}</h3>
                        <p>${device.browser || 'Browser'} • ${device.os || 'OS'}</p>
                    </div>
                </div>
                <div>
                    <span class="badge-current-device">Active (This Device)</span>
                </div>
            </div>

            <div class="device-details-grid">
                <div class="detail-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div class="detail-item-text">
                        <label>Location</label>
                        <span>${device.location || 'Unknown Location'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-network-wired"></i>
                    <div class="detail-item-text">
                        <label>IP Address</label>
                        <span>${device.ip_address || '127.0.0.1'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-clock"></i>
                    <div class="detail-item-text">
                        <label>Login Time</label>
                        <span>${device.formatted_login_time || device.login_time || 'Just Now'}</span>
                    </div>
                </div>
                <div class="detail-item">
                    <i class="fas fa-history"></i>
                    <div class="detail-item-text">
                        <label>Last Active</label>
                        <span>${device.formatted_last_active || device.last_active || 'Active Now'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Other Active Devices & History List
function renderOtherDevices(otherDevices) {
    const tbody = document.getElementById("otherDevicesTbody");
    const emptyState = document.getElementById("emptyDevicesState");
    const tableContainer = document.querySelector(".devices-table-container");
    const batchToolbar = document.getElementById("batchToolbar");
    const selectAllCheck = document.getElementById("selectAllDevices");

    if (!tbody) return;

    if (selectAllCheck) selectAllCheck.checked = false;
    updateBatchToolbar();

    if (!otherDevices || otherDevices.length === 0) {
        tbody.innerHTML = '';
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        if (batchToolbar) batchToolbar.style.display = 'none';
        return;
    }

    if (tableContainer) tableContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
    if (batchToolbar) batchToolbar.style.display = 'flex';

    tbody.innerHTML = otherDevices.map(device => {
        const iconClass = getDeviceIconClass(device.os, device.device_info);
        const statusClass = (device.status || 'Active').toLowerCase() === 'active' ? 'active' : 'logged-out';
        const statusText = device.status || 'Active';

        return `
            <tr data-id="${device.id}">
                <td data-label="Select">
                    <input type="checkbox" class="device-checkbox" data-id="${device.id}" data-name="${device.device_info || 'Device'}">
                </td>
                <td data-label="Device & Browser">
                    <div class="device-row-info">
                        <div class="device-row-icon">
                            <i class="${iconClass}"></i>
                        </div>
                        <div>
                            <div class="device-row-title">${device.device_brand || 'Device'}</div>
                            <div class="device-row-subtitle">${device.browser || ''} • ${device.os || ''}</div>
                        </div>
                    </div>
                </td>
                <td data-label="Location & IP">
                    <div><strong>${device.location || 'Unknown Location'}</strong></div>
                    <div class="device-row-subtitle">${device.ip_address || '-'}</div>
                </td>
                <td data-label="Login Time">
                    <div>${device.formatted_login_time || device.login_time || '-'}</div>
                </td>
                <td data-label="Status">
                    <span class="status-badge ${statusClass}">
                        <i class="fas fa-circle" style="font-size: 6px;"></i> ${statusText}
                    </span>
                </td>
                <td data-label="Action" style="text-align: right;">
                    <button class="btn-device-logout" data-id="${device.id}" data-name="${device.device_info}">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach row events
    const checkboxes = tbody.querySelectorAll(".device-checkbox");
    checkboxes.forEach(cb => {
        cb.addEventListener("change", updateBatchToolbar);
    });

    const logoutBtns = tbody.querySelectorAll(".btn-device-logout");
    logoutBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const devId = btn.getAttribute("data-id");
            const devName = btn.getAttribute("data-name");
            openDeviceLogoutModal({
                mode: 'single',
                ids: [devId],
                title: 'Confirm Device Logout',
                message: `Are you sure you want to log out this device? The device session will be ended and info removed.`,
                preview: `${devName || 'Selected Device'} (ID: ${devId})`
            });
        });
    });
}

// Checkbox Batch Selection Handler
function updateBatchToolbar() {
    const checkboxes = document.querySelectorAll(".device-checkbox");
    const checked = document.querySelectorAll(".device-checkbox:checked");
    const selectAllCheck = document.getElementById("selectAllDevices");
    const selectedBadge = document.getElementById("selectedCountBadge");
    const logoutSelectedBtn = document.getElementById("logoutSelectedBtn");

    const count = checked.length;

    if (selectedBadge) {
        selectedBadge.textContent = `${count} selected`;
        selectedBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    if (logoutSelectedBtn) {
        logoutSelectedBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    if (selectAllCheck && checkboxes.length > 0) {
        selectAllCheck.checked = checkboxes.length === count;
    }
}

// Select All Listener
const selectAllCheck = document.getElementById("selectAllDevices");
if (selectAllCheck) {
    selectAllCheck.addEventListener("change", function() {
        const checkboxes = document.querySelectorAll(".device-checkbox");
        checkboxes.forEach(cb => cb.checked = this.checked);
        updateBatchToolbar();
    });
}

// ================= MODAL & EVENT LISTENERS =================
function initModalEvents() {
    const deviceLogoutModal = document.getElementById("deviceLogoutModal");
    const btnCancel = document.getElementById("btnCancelDeviceLogout");
    const btnConfirm = document.getElementById("btnConfirmDeviceLogout");

    const logoutAllBtn = document.getElementById("logoutAllDevicesBtn");
    const logoutSelectedBtn = document.getElementById("logoutSelectedBtn");

    if (btnCancel && deviceLogoutModal) {
        btnCancel.addEventListener("click", () => {
            deviceLogoutModal.classList.remove("show");
        });
    }

    if (logoutAllBtn) {
        logoutAllBtn.addEventListener("click", () => {
            openDeviceLogoutModal({
                mode: 'all',
                ids: [],
                includeCurrent: true,
                title: 'Confirm Logout All Devices',
                message: 'Are you sure you want to log out ALL devices? This will end every active session, including your current one.',
                preview: 'All Logged-in Devices'
            });
        });
    }

    if (logoutSelectedBtn) {
        logoutSelectedBtn.addEventListener("click", () => {
            const checked = document.querySelectorAll(".device-checkbox:checked");
            const ids = Array.from(checked).map(cb => cb.getAttribute("data-id"));
            if (ids.length === 0) return;

            openDeviceLogoutModal({
                mode: 'selected',
                ids: ids,
                title: 'Logout Selected Devices',
                message: `Are you sure you want to log out the ${ids.length} selected device(s)?`,
                preview: `${ids.length} Selected Device(s)`
            });
        });
    }

    if (btnConfirm) {
        btnConfirm.addEventListener("click", handleModalConfirmLogout);
    }
}

function openDeviceLogoutModal({ mode, ids, title, message, preview, includeCurrent = false }) {
    pendingLogoutAction = { mode, ids, includeCurrent };

    const modal = document.getElementById("deviceLogoutModal");
    const titleEl = document.getElementById("modalLogoutTitle");
    const msgEl = document.getElementById("modalLogoutMessage");
    const previewEl = document.getElementById("modalDeviceText");

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.textContent = message;
    if (previewEl) previewEl.textContent = preview;

    if (modal) modal.classList.add("show");
}

async function handleModalConfirmLogout() {
    const modal = document.getElementById("deviceLogoutModal");
    if (modal) modal.classList.remove("show");

    showToast("Processing logout request...", "loading");

    try {
        let endpoint = "/api/admin/login-history/logout";
        let payload = {};

        if (pendingLogoutAction.mode === 'all') {
            endpoint = "/api/admin/login-history/logout-all";
            payload = {
                tab_id: currentTabId,
                include_current: pendingLogoutAction.includeCurrent
            };
        } else {
            payload = {
                device_ids: pendingLogoutAction.ids,
                tab_id: currentTabId
            };
        }

        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            showToast(data.error || "Failed to log out device(s)", "error");
            return;
        }

        showToast(data.message || "Logged out successfully!", "success");

        if (data.logout_current) {
            setTimeout(() => {
                sessionStorage.clear();
                localStorage.clear();
                window.location.replace('/');
            }, 1000);
        } else {
            setTimeout(() => {
                loadLoginHistory();
            }, 500);
        }

    } catch (err) {
        console.error("Logout execution error:", err);
        showToast("Network error executing device logout", "error");
    }
}
