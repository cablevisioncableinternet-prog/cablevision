// ===================== ADMIN VIEW CUSTOMERS JS - WITH TAB ID SUPPORT =====================

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
                localStorage.setItem('adminUsername', data.username);
                sessionStorage.setItem('adminUsername', data.username);
                return data.username;
            }
        }
    } catch (error) {
        console.error('Error getting admin username from session:', error);
    }
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

// ==================== REFRESH ADMIN INFO FROM SESSION ====================
async function refreshAdminInfo() {
    const adminUsername = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found in session");
        return false;
    }
    
    try {
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (response.ok) {
            const profile = await response.json();
            if (profile.id) {
                localStorage.setItem("adminId", profile.id);
                sessionStorage.setItem("adminId", profile.id);
            }
            if (profile.area) {
                localStorage.setItem("adminArea", profile.area);
                sessionStorage.setItem("adminArea", profile.area);
            }
            if (profile.city) {
                localStorage.setItem("adminCity", profile.city);
                sessionStorage.setItem("adminCity", profile.city);
            }
            console.log("Admin info refreshed:", { adminUsername, area: profile.area });
            return true;
        }
    } catch (error) {
        console.error("Error refreshing admin info:", error);
    }
    return false;
}

let approvedData = [];
let filteredData = [];
let currentCustomerId = null;
let currentStatus = null;
let currentPage = 1;
const rowsPerPage = 10;

const tableBody = document.getElementById("approvedCustomersBody");
const noData = document.getElementById("noData");
const searchInput = document.getElementById("searchInput");
const paginationContainer = document.getElementById("paginationControls");
const loading = document.createElement("p");

// ==================== SORTING FUNCTION ====================
function sortCustomersByInstallationStatus(customers) {
    const statusOrder = {
        'Pending': 1,
        'Ongoing': 2,
        'Installed': 3
    };
    
    return [...customers].sort((a, b) => {
        const statusA = a.installation_status || 'Pending';
        const statusB = b.installation_status || 'Pending';
        const orderA = statusOrder[statusA] || 99;
        const orderB = statusOrder[statusB] || 99;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        const dateA = a.approval_date ? new Date(a.approval_date) : new Date(0);
        const dateB = b.approval_date ? new Date(b.approval_date) : new Date(0);
        return dateA - dateB;
    });
}

// Create spinner element
loading.id = "loadingData";
loading.style.display = "none";
loading.style.textAlign = "center";
loading.style.padding = "10px";
if (tableBody && tableBody.parentNode) {
    tableBody.parentNode.insertBefore(loading, tableBody);
}

// MODAL ELEMENTS
const modal = document.getElementById("actionModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalLoading = document.getElementById("modalLoading");
const modalButtons = document.querySelector(".modal-buttons");

// ===============================
// SESSION CACHE MANAGEMENT
// ===============================
const CACHE_KEY = 'admin_customers_cache';
const CACHE_TIMESTAMP_KEY = 'admin_customers_timestamp';
const CACHE_DURATION = 5 * 60 * 1000;

let isManualRefresh = false;

function isCacheValid() {
    if (isManualRefresh) {
        console.log("Manual refresh detected - skipping cache");
        return false;
    }
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);
    return cacheAge < CACHE_DURATION;
}

function saveCustomersToCache(customers) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(customers));
        sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
        console.log("Customers cached successfully");
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
}

function loadCustomersFromCache() {
    try {
        const cachedCustomers = sessionStorage.getItem(CACHE_KEY);
        if (cachedCustomers) {
            const customers = JSON.parse(cachedCustomers);
            console.log("Customers loaded from cache");
            return customers;
        }
    } catch (error) {
        console.error("Error loading from cache:", error);
    }
    return null;
}

function clearCustomersCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Customers cache cleared");
}

// ==================== PAGINATION FUNCTIONS ====================
function renderPaginationControls(totalPages, totalItems) {
    if (!paginationContainer) return;
    
    if (totalItems === 0) {
        paginationContainer.style.display = "none";
        return;
    }
    
    paginationContainer.style.display = "flex";
    
    let paginationHtml = `<button class="pagination-btn" id="firstPageBtn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="prevPageBtn" ${currentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Prev</button>`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" id="nextPageBtn" ${currentPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="lastPageBtn" ${currentPage === totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
    paginationHtml += `<div class="pagination-info"><i class="fas fa-database"></i> Showing ${((currentPage - 1) * rowsPerPage) + 1} - ${Math.min(currentPage * rowsPerPage, totalItems)} of ${totalItems} entries</div>`;

    paginationContainer.innerHTML = paginationHtml;

    const firstPageBtn = document.getElementById("firstPageBtn");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    const lastPageBtn = document.getElementById("lastPageBtn");
    
    if (firstPageBtn) {
        firstPageBtn.addEventListener("click", () => {
            if (currentPage !== 1) {
                currentPage = 1;
                renderCurrentPage();
            }
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                renderCurrentPage();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                renderCurrentPage();
            }
        });
    }

    if (lastPageBtn) {
        lastPageBtn.addEventListener("click", () => {
            if (currentPage !== totalPages) {
                currentPage = totalPages;
                renderCurrentPage();
            }
        });
    }

    document.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.dataset.page);
            renderCurrentPage();
        });
    });
}

function renderCurrentPage() {
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (totalItems === 0) {
        renderTable([]);
        if (paginationContainer) paginationContainer.style.display = "none";
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = "0";
        return;
    }
    
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    renderTable(pageData);
    renderPaginationControls(totalPages, totalItems);
}

// ================= FETCH (WITH CACHE AND TAB ID) =================
async function fetchApprovedCustomers(forceRefresh = false, silent = false) {
    // Refresh admin info from session
    await refreshAdminInfo();
    
    const adminUsername = localStorage.getItem("adminUsername") || sessionStorage.getItem("adminUsername");
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found");
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Please login again. Admin username not found.</td></tr>`;
        }
        return;
    }
    
    if (!forceRefresh && isCacheValid()) {
        const cachedCustomers = loadCustomersFromCache();
        if (cachedCustomers && cachedCustomers.length > 0) {
            approvedData = sortCustomersByInstallationStatus(cachedCustomers);
            filteredData = [...approvedData];
            currentPage = 1;
            renderCurrentPage();
            console.log("Customers loaded from cache and sorted (Pending first, then Ongoing, then Installed)");
            return;
        }
    }
    
    try {
        if (!silent && approvedData.length === 0) {
            loading.style.display = "block";
            noData.style.display = "none";
            if (paginationContainer) paginationContainer.style.display = "none";
        }

        console.log(`Fetching customers for admin: ${adminUsername}, tabId: ${tabId}`);
        const res = await fetch(`/api/admin/approved-applications?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        let data = await res.json();

        if (!res.ok) {
            tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">${data.error}</td></tr>`;
            return;
        }

        data = sortCustomersByInstallationStatus(data || []);
        
        approvedData = data || [];
        filteredData = [...approvedData];
        
        saveCustomersToCache(approvedData);
        
        currentPage = 1;
        renderCurrentPage();
        console.log("Customers loaded from API, cached, and sorted (Pending first, then Ongoing, then Installed)");

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Server error</td></tr>`;
    } finally {
        if (!silent) loading.style.display = "none";
        isManualRefresh = false;
    }
}

// ================= DETECT MANUAL BROWSER REFRESH =================
let isNavigatingAway = false;

window.addEventListener('beforeunload', () => {
    isNavigatingAway = true;
});

function detectPageRefresh() {
    if (performance && performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            console.log("Page was reloaded via legacy navigation API");
            isManualRefresh = true;
            clearCustomersCache();
        }
    }
    
    if (performance && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
            if (navEntry.type === 'reload') {
                console.log("Page was manually reloaded (Ctrl+R or F5)");
                isManualRefresh = true;
                clearCustomersCache();
            }
        }
    }
}

function checkForRefreshIndicator() {
    const urlParams = new URLSearchParams(window.location.search);
    const refreshParam = urlParams.get('_refresh');
    if (refreshParam) {
        console.log("Refresh parameter detected");
        isManualRefresh = true;
        clearCustomersCache();
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function trackPageLoads() {
    const loadCount = sessionStorage.getItem('page_load_count');
    const lastLoadTime = sessionStorage.getItem('last_load_time');
    const now = new Date().getTime();
    
    if (!loadCount) {
        sessionStorage.setItem('page_load_count', '1');
        sessionStorage.setItem('last_load_time', now.toString());
    } else {
        const count = parseInt(loadCount) + 1;
        sessionStorage.setItem('page_load_count', count.toString());
        
        if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
            console.log("Quick successive load detected - likely a refresh");
            isManualRefresh = true;
            clearCustomersCache();
        }
        
        sessionStorage.setItem('last_load_time', now.toString());
    }
}

// ================= RENDER =================
function renderTable(data) {
    tableBody.innerHTML = "";
    if (!data.length) {
        noData.style.display = "block";
        if (paginationContainer) paginationContainer.style.display = "none";
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = "0";
        return;
    }
    noData.style.display = "none";

    const customerCountSpan = document.getElementById("customerCount");
    if (customerCountSpan) customerCountSpan.textContent = filteredData.length;

    const sortedData = sortCustomersByInstallationStatus(data);

    sortedData.forEach(app => {
        const installation = app.installation_status || "Pending";
        const plan = app.plan || "N/A";
        const speed = app.plan_speed || "N/A";
        const email = app.email || "";
        const contractNumber = app.contract_number || "N/A";

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}"> <i class="fas fa-eye"></i> View</button>
            </div>
        `;

        const installationClass = installation.toLowerCase();
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td><span class="contract-number">${contractNumber}</span></td>
            <td>${app.first_name || ""} ${app.last_name || ""}</td>
            <td>${email}</td>
            <td>${plan}</td>
            <td>${speed}</td>
            <td><span class="status-badge status-approved">Approved</span></td>
            <td><span class="installation-${installationClass}">${installation}</span></td>
            <td>${actionButtons}</td>
        `;
        tableBody.appendChild(row);
    });

    attachEvents();
}

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });
    
    const closeBtnLogout = document.getElementById("closeLogoutModal");
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    const cancelLogout = document.getElementById("cancelLogout");
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
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
    
    window.addEventListener("click", function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    });
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });
    window.addEventListener("click", e => { if (!profileBtn.contains(e.target)) profileMenu.classList.remove("show"); });
}

// ================= LOAD ADMIN PROFILE =================
async function loadAdminProfile() {
    await refreshAdminInfo();
    let adminUsername = localStorage.getItem("adminUsername") || sessionStorage.getItem("adminUsername");
    
    if (!adminUsername) {
        console.error("No admin username found");
        return;
    }
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        // Hindi na nagdi-display ng pangalan sa profile
        // const profileNameSpan = document.getElementById("profileName");
        // if (profileNameSpan) {
        //     profileNameSpan.textContent = profile.username || profile.name || "Admin";
        // }
        
        if (profile.id) {
            localStorage.setItem("adminId", profile.id);
            sessionStorage.setItem("adminId", profile.id);
        }
        if (profile.area) {
            localStorage.setItem("adminArea", profile.area);
            sessionStorage.setItem("adminArea", profile.area);
        }
        if (profile.city) {
            localStorage.setItem("adminCity", profile.city);
            sessionStorage.setItem("adminCity", profile.city);
        }
        
        console.log("Admin profile loaded:", profile.username);
    } catch (err) {
        console.error("Error loading admin profile:", err);
        // Hindi na nagdi-display ng pangalan sa profile
        // const profileNameSpan = document.getElementById("profileName");
        // if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

// Call the function to load profile
loadAdminProfile();

// ================= BUTTON EVENTS =================
function attachEvents() {
    document.querySelectorAll(".btn-view").forEach(btn =>
        btn.addEventListener("click", () => window.location.href = `/admin/view-customer-application/${btn.dataset.id}`)
    );
}

// ================= SEARCH & FILTER =================
function applyFiltersAndPaginate() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
    const selectedStatus = document.getElementById("statusFilter") ? document.getElementById("statusFilter").value : "all";

    let filtered = [...approvedData];

    if (searchTerm) {
        filtered = filtered.filter(app =>
            (app.application_number + " " + app.first_name + " " + app.last_name + " " + (app.email || "")).toLowerCase().includes(searchTerm)
        );
    }

    if (selectedStatus !== "all") {
        filtered = filtered.filter(app => 
            (app.installation_status || "pending").toLowerCase() === selectedStatus.toLowerCase()
        );
    }

    filtered = sortCustomersByInstallationStatus(filtered);
    
    filteredData = filtered;
    currentPage = 1;
    renderCurrentPage();
}

if (searchInput) {
    searchInput.addEventListener("input", applyFiltersAndPaginate);
}

const statusFilter = document.getElementById("statusFilter");
if (statusFilter) {
    statusFilter.addEventListener("change", applyFiltersAndPaginate);
}

const clearSearchBtn = document.getElementById("clearSearch");
if (clearSearchBtn && searchInput) {
    searchInput.addEventListener("input", () => {
        clearSearchBtn.style.display = searchInput.value ? "flex" : "none";
    });
    clearSearchBtn.addEventListener("click", () => {
        searchInput.value = "";
        applyFiltersAndPaginate();
        clearSearchBtn.style.display = "none";
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

    if (type !== 'loading') {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ================= AUTO REFRESH =================
let autoRefreshInterval = null;

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
}

// ================= PAGE VISIBILITY API =================
let lastRefreshTime = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastRefreshTime > 30000) {
            console.log("Page became visible, checking for updates...");
            fetchApprovedCustomers(false, true);
            lastRefreshTime = now;
        }
    }
});

// ================= MANUAL REFRESH FUNCTION =================
window.refreshCustomers = function() {
    clearCustomersCache();
    fetchApprovedCustomers(true, false);
    showToast("Refreshing customer data...", "success");
};

// ================= KEYBOARD SHORTCUT DETECTION =================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearCustomersCache();
    }
});

// ================= VISIBILITY CHANGE - REFRESH ON TAB SWITCH =================
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log(' Tab became visible, refreshing customers...');
        await refreshAdminInfo();
        clearCustomersCache();
        fetchApprovedCustomers(true);
    }
});

// ================= INITIAL LOAD =================
document.addEventListener("DOMContentLoaded", async () => {
    // First, refresh admin info from session
    await refreshAdminInfo();
    
    detectPageRefresh();
    checkForRefreshIndicator();
    trackPageLoads();
    
    if (isManualRefresh) {
        console.log("Manual refresh detected - loading fresh data from API");
        fetchApprovedCustomers(true, false);
    } else {
        fetchApprovedCustomers();
    }
    
    startAutoRefresh();
    lastRefreshTime = new Date().getTime();
});

// ================= HAMBURGER MENU TOGGLE =================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    sidebar.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

if (hamburger) {
    hamburger.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ==================== PROFILE DROPDOWN CHEVRON ====================
(function() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileBtn.classList.toggle('active');
        });
    }
})();