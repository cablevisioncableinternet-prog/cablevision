// ===================== ADMIN VIEW CUSTOMERS JS =====================

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
// Sort customers by installation status: Pending first, then Ongoing, then Installed
// Within each status group, sort by approval_date (oldest first)
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
        
        // First sort by installation status
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        // If same status, sort by approval_date (oldest first)
        const dateA = a.approval_date ? new Date(a.approval_date) : new Date(0);
        const dateB = b.approval_date ? new Date(b.approval_date) : new Date(0);
        
        // For oldest first (ascending order)
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

const adminUsername = localStorage.getItem("adminUsername");

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

// ================= FETCH (WITH CACHE) =================
async function fetchApprovedCustomers(forceRefresh = false, silent = false) {
    if (!forceRefresh && isCacheValid()) {
        const cachedCustomers = loadCustomersFromCache();
        if (cachedCustomers && cachedCustomers.length > 0) {
            // Sort cached data by installation status
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

        const res = await fetch(`/api/admin/approved-applications?username=${adminUsername}`);
        let data = await res.json();

        if (!res.ok) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">${data.error}</td></tr>`;
            return;
        }

        // Sort data by installation status
        data = sortCustomersByInstallationStatus(data || []);
        
        approvedData = data || [];
        filteredData = [...approvedData];
        
        saveCustomersToCache(approvedData);
        
        currentPage = 1;
        renderCurrentPage();
        console.log("Customers loaded from API, cached, and sorted (Pending first, then Ongoing, then Installed)");

    } catch (err) {
        console.error(err);
        tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:red;">Server error</td></tr>`;
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
        const speed = app.speed || "N/A";
        const email = app.email || "";
        const contractNumber = app.contract_number || "N/A";  // ✅ KUNIN ANG CONTRACT NUMBER

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}">View</button>
            </div>
        `;

        const installationClass = installation.toLowerCase();
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td><span class="contract-number">${contractNumber}</span></td>  <!-- ✅ CONTRACT NO. COLUMN -->
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
const logoutCloseBtn = logoutModal ? logoutModal.querySelector(".close-btn") : null;
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", e => {
        e.preventDefault();
        logoutModal.style.display = "block";
    });
    if (logoutCloseBtn) {
        logoutCloseBtn.addEventListener("click", () => logoutModal.style.display = "none");
    }
    if (cancelLogout) {
        cancelLogout.addEventListener("click", () => logoutModal.style.display = "none");
    }
    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            // Clear all admin data on logout
            localStorage.removeItem("adminUsername");
            localStorage.removeItem("adminId");
            localStorage.removeItem("adminArea");
            localStorage.removeItem("adminCity");
            sessionStorage.clear();
            window.location.href = "/";
        });
    }
    window.addEventListener("click", e => { if (e.target === logoutModal) logoutModal.style.display = "none"; });
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
    let adminUsername = localStorage.getItem("adminUsername");
    if (!adminUsername) {
        adminUsername = sessionStorage.getItem("adminUsername");
    }
    if (!adminUsername) {
        console.error("No admin username found");
        return;
    }
    
    try {
        const res = await fetch("/api/admin/profile?username=" + encodeURIComponent(adminUsername));
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) {
            profileNameSpan.textContent = profile.username || profile.name || "Admin";
        }
        
        // Store admin info in localStorage for other pages
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
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

// Call the function to load profile
loadAdminProfile();

// ================= BUTTON EVENTS =================
function attachEvents() {
    // Only attach view button events (removed ongoing and installed button events)
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

    // Sort filtered data by installation status
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

// Clear search button
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

// ================= TOAST NOTIFICATION =================
function showToast(message, type = "success") {
    let toast = document.getElementById("customToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "customToast";
        toast.className = "custom-toast";
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-check-circle"></i>
                <span id="toastMessage">Success!</span>
            </div>
        `;
        document.body.appendChild(toast);
        
        if (!document.querySelector("#toastStyles")) {
            const style = document.createElement("style");
            style.id = "toastStyles";
            style.textContent = `
                .custom-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
                    color: white;
                    padding: 0;
                    border-radius: 12px;
                    z-index: 10000;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
                    animation: slideInRight 0.3s ease;
                    display: none;
                    min-width: 300px;
                    overflow: hidden;
                }
                .custom-toast.error {
                    background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%);
                }
                .custom-toast.warning {
                    background: linear-gradient(135deg, #e69600 0%, #ffb74d 100%);
                }
                .custom-toast .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                }
                .custom-toast .toast-content i {
                    font-size: 20px;
                }
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(100px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    const toastMessage = toast.querySelector("#toastMessage");
    toastMessage.textContent = message;
    
    toast.classList.remove("error", "warning");
    if (type === "error") {
        toast.classList.add("error");
    } else if (type === "warning") {
        toast.classList.add("warning");
    }
    
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
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

// ================= INITIAL LOAD =================
document.addEventListener("DOMContentLoaded", () => {
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