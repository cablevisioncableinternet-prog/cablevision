// ==================== SESSION MANAGEMENT ====================
// Initialize session manager FIRST
if (window.SessionManager) {
    window.SessionManager.init();
} else {
    console.error("SessionManager not loaded!");
    // Fallback: redirect to login if no session
    if (!localStorage.getItem('userType') || !sessionStorage.getItem('sessionToken')) {
        window.location.replace('/');
    }
}


// ==================== PAGINATION VARIABLES ====================
let currentPage = 1;
const rowsPerPage = 10;
let paginatedData = [];
const paginationContainer = document.getElementById("paginationControls");

// ==================== SORTING FUNCTION ====================
function sortCustomersByInstallationStatus(customers) {
    const statusOrder = {
        'Pending': 1,
        'Ongoing': 2,
        'Installed': 3
    };
    
    return [...customers].sort((a, b) => {
        const orderA = statusOrder[a.installation_status] || 99;
        const orderB = statusOrder[b.installation_status] || 99;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        const dateA = a.approval_date ? new Date(a.approval_date) : new Date(0);
        const dateB = b.approval_date ? new Date(b.approval_date) : new Date(0);
        
        return dateA - dateB;
    });
}

// ==================== CACHE SYSTEM ====================
function setCache(key, data, ttlMinutes = 5) {
    const now = new Date();
    const item = { data, expiry: now.getTime() + ttlMinutes * 60 * 1000 };
    sessionStorage.setItem(key, JSON.stringify(item));
}

function getCache(key) {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
    }

    return item.data;
}

function clearCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Customers cache cleared");
}

// ==================== CACHE KEYS ====================
const CACHE_KEY = "superadmin_customers_cache";
const CACHE_TIMESTAMP_KEY = "superadmin_customers_timestamp";
const CACHE_DURATION = 5 * 60 * 1000;

// ==================== MANUAL REFRESH DETECTION ====================
let isManualRefresh = false;

function detectPageRefresh() {
    if (performance && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
            if (navEntry.type === 'reload') {
                console.log("Page was manually reloaded (Ctrl+R or F5)");
                isManualRefresh = true;
                clearCache();
            }
        }
    }
    
    if (performance && performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            console.log("Page was reloaded via legacy API");
            isManualRefresh = true;
            clearCache();
        }
    }
}

function trackPageLoads() {
    const lastLoadTime = sessionStorage.getItem('superadmin_customers_last_load_time');
    const now = new Date().getTime();
    
    if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
        console.log("Quick successive load detected - likely a refresh");
        isManualRefresh = true;
        clearCache();
    }
    
    sessionStorage.setItem('superadmin_customers_last_load_time', now.toString());
}

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

function updateCacheTimestamp() {
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
}

// ==================== CHECK FOR CACHE BUSTING ====================
function checkForCacheBusting() {
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get('t');
    
    if (timestamp) {
        console.log("Cache-busting parameter detected, forcing refresh");
        clearCache();
        isManualRefresh = true;
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        return true;
    }
    return false;
}

// ==================== CHECK FOR CUSTOMER REFRESH FLAG ====================
function checkForCustomerRefreshFlag() {
    const shouldRefresh = sessionStorage.getItem('refresh_customers');
    if (shouldRefresh === 'true') {
        console.log("Customer refresh flag detected - new approval happened");
        sessionStorage.removeItem('refresh_customers');
        clearCache();
        isManualRefresh = true;
        return true;
    }
    return false;
}

// ==================== CROSS-TAB NOTIFICATION ====================
function notifyUserCreated(customerId) {
    console.log("📢 Notifying other tabs about new user creation for customer ID:", customerId);
    const notification = {
        type: 'USER_CREATED',
        timestamp: Date.now(),
        customerId: customerId
    };
    localStorage.setItem('app_notification', JSON.stringify(notification));
    setTimeout(() => {
        localStorage.removeItem('app_notification');
    }, 100);
}

// ==================== GLOBAL DATA ====================
let approvedCustomersData = [];
let filteredData = [];
let isFetching = false;
let autoRefreshInterval = null;

// ==================== UI CONTROL ====================
function showLoading() {
    const loadingRow = document.querySelector("#approvedCustomersBody .loading-row");
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#approvedCustomersTable");
    const pagination = document.getElementById("paginationControls");
    
    if (loadingRow) {
        loadingRow.style.display = "table-row";
    } else {
        const tbody = document.getElementById("approvedCustomersBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="9">
                        <div class="loading-container">
                            <div class="spinner"></div>
                            <p>Loading customers...</p>
                        </div>
                     </td>
                 </tr>
            `;
        }
    }
    
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "table";
    if (pagination) pagination.style.display = "none";
}

function showTable() {
    const loadingRow = document.querySelector("#approvedCustomersBody .loading-row");
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#approvedCustomersTable");
    const pagination = document.getElementById("paginationControls");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "table";
    if (pagination && filteredData.length > 0) pagination.style.display = "flex";
}

function showNoData() {
    const loadingRow = document.querySelector("#approvedCustomersBody .loading-row");
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#approvedCustomersTable");
    const pagination = document.getElementById("paginationControls");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (noDataEl) noDataEl.style.display = "block";
    if (table) table.style.display = "none";
    if (pagination) pagination.style.display = "none";
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
        showNoData();
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = "0";
        if (paginationContainer) paginationContainer.style.display = "none";
        return;
    }
    
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    renderApprovedCustomers(pageData);
    renderPaginationControls(totalPages, totalItems);
}

// ==================== RENDER TABLE ====================
function renderApprovedCustomers(data) {
    const tbody = document.getElementById("approvedCustomersBody");

    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        showNoData();
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = "0";
        return;
    }

    const customerCountSpan = document.getElementById("customerCount");
    if (customerCountSpan) customerCountSpan.textContent = filteredData.length;

    const sortedData = sortCustomersByInstallationStatus(data);

    sortedData.forEach(app => {
        const installationStatus = app.installation_status || "Pending";
        const statusClass = installationStatus.toLowerCase();
        
        let appStatusBadgeClass = "";
        let appStatusText = "";
        
        switch(app.application_status) {
            case "Approved":
                appStatusBadgeClass = "status-approved";
                appStatusText = "Approved";
                break;
            case "Pending":
                appStatusBadgeClass = "status-pending";
                appStatusText = "Pending";
                break;
            case "Rejected":
                appStatusBadgeClass = "status-rejected";
                appStatusText = "Rejected";
                break;
            default:
                appStatusBadgeClass = "status-approved";
                appStatusText = "Approved";
        }

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}">View</button>`;
        if (installationStatus === "Pending") actionButtons += `<button class="btn-ongoing" data-id="${app.id}">Ongoing</button>`;
        if (installationStatus === "Ongoing") actionButtons += `<button class="btn-installed" data-id="${app.id}">Installed</button>`;
        actionButtons += `</div>`;

        const contractNumber = app.contract_number || "N/A";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td><span class="contract-number">${escapeHtml(contractNumber)}</span></td>
            <td>${escapeHtml(app.first_name || "")} ${escapeHtml(app.last_name || "")}</td>
            <td>${escapeHtml(app.email || "")}</td>
            <td>${escapeHtml(app.plan || "N/A")}</td>
            <td>${escapeHtml(app.speed || "N/A")}</td>
            <td><span class="status-badge ${appStatusBadgeClass}">${appStatusText}</span></td>
            <td><span class="installation-${statusClass}">${installationStatus}</span></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });

    showTable();
    attachEvents();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== ATTACH BUTTON EVENTS ====================
function attachEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.onclick = () => window.location.href = `/superadmin/view-customer-application/${btn.dataset.id}`;
    });
    document.querySelectorAll(".btn-ongoing").forEach(btn => btn.onclick = () => openModal("Ongoing", btn.dataset.id));
    document.querySelectorAll(".btn-installed").forEach(btn => btn.onclick = () => openModal("Installed", btn.dataset.id));
}

// ==================== LOCAL UPDATE ====================
function updateLocalInstallationStatus(id, status) {
    approvedCustomersData = approvedCustomersData.map(cust => {
        if (cust.id === id) cust.installation_status = status;
        return cust;
    });
    approvedCustomersData = sortCustomersByInstallationStatus(approvedCustomersData);
    setCache(CACHE_KEY, approvedCustomersData, 5);
    updateCacheTimestamp();
    applyFiltersAndPaginate();
    
    const customerCountSpan = document.getElementById("customerCount");
    if (customerCountSpan) customerCountSpan.textContent = approvedCustomersData.length;
}

// ==================== SEARCH & FILTER FUNCTIONS ====================
let searchInput, statusFilter;

function setupSearchAndFilter() {
    searchInput = document.getElementById("searchInput");
    statusFilter = document.getElementById("statusFilter");
    
    if (!searchInput || !statusFilter) return;
    
    window.applyFiltersAndPaginate = function() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const statusValue = statusFilter.value;
        
        let filtered = [...approvedCustomersData];
        
        if (searchTerm) {
            filtered = filtered.filter(customer => 
                (customer.application_number && String(customer.application_number).toLowerCase().includes(searchTerm)) ||
                (customer.first_name && customer.first_name.toLowerCase().includes(searchTerm)) ||
                (customer.last_name && customer.last_name.toLowerCase().includes(searchTerm)) ||
                (`${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm)) ||
                (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
                (customer.contract_number && customer.contract_number.toLowerCase().includes(searchTerm))
            );
        }
        
        if (statusValue !== "all") {
            filtered = filtered.filter(customer => 
                customer.installation_status && customer.installation_status.toLowerCase() === statusValue.toLowerCase()
            );
        }
        
        filteredData = filtered;
        
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = filtered.length;
        
        currentPage = 1;
        renderCurrentPage();
    };
    
    searchInput.addEventListener("input", window.applyFiltersAndPaginate);
    statusFilter.addEventListener("change", window.applyFiltersAndPaginate);
    
    const clearBtn = document.getElementById("clearSearch");
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            searchInput.value = "";
            window.applyFiltersAndPaginate();
            clearBtn.style.display = "none";
        });
        
        searchInput.addEventListener("input", () => {
            clearBtn.style.display = searchInput.value ? "flex" : "none";
        });
    }
}

// ==================== MODAL ====================
const modal = document.getElementById("actionModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalLoading = document.getElementById("modalLoading");
const modalButtons = document.querySelector(".modal-buttons");

let currentCustomerId = null;
let currentStatus = null;

function openModal(status, id) {
    currentCustomerId = id;
    currentStatus = status;

    modalTitle.textContent = "Update Installation Status";
    modalMessage.textContent = `Set installation status to "${status}"?`;

    if (modalButtons) modalButtons.style.display = "flex";
    if (modalLoading) modalLoading.style.display = "none";

    modal.style.display = "block";
}

function closeModal() {
    modal.style.display = "none";
    currentCustomerId = null;
    currentStatus = null;
}

if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (cancelBtn) cancelBtn.onclick = closeModal;
window.onclick = e => { if (e.target === modal) closeModal(); };

// ==================== CONFIRM UPDATE ====================
if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
        if (!currentCustomerId || !currentStatus) return;

        modalButtons.style.display = "none";
        modalLoading.style.display = "block";

        try {
            const res = await fetch(`/api/superadmin/installation-status/${currentCustomerId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ installation_status: currentStatus })
            });

            if (!res.ok) {
                const data = await res.json();
                showToast(data.error || "Update failed", "error");
                modalButtons.style.display = "flex";
                modalLoading.style.display = "none";
                return;
            }

            showToast(`Installation status updated to "${currentStatus}" successfully!`, "success");
            
            if (currentStatus === "Installed") {
                notifyUserCreated(currentCustomerId);
                sessionStorage.setItem('pending_user_creation', 'true');
                showToast("User account created! Other pages will update automatically.", "success");
            }
            
            clearCache();
            await fetchCustomers(true);
            closeModal();

        } catch (err) {
            console.error(err);
            showToast("Failed to update installation status", "error");
            modalButtons.style.display = "flex";
            modalLoading.style.display = "none";
        }
    });
}

// ==================== FETCH CUSTOMERS ====================
async function fetchCustomers(forceRefresh = false) {
    if (isFetching && !forceRefresh) return;
    isFetching = true;

    if (forceRefresh || approvedCustomersData.length === 0) {
        showLoading();
    }

    if (!forceRefresh && !isManualRefresh && isCacheValid()) {
        const cached = getCache(CACHE_KEY);
        if (cached && cached.length > 0) {
            approvedCustomersData = sortCustomersByInstallationStatus(cached);
            filteredData = [...approvedCustomersData];
            setupSearchAndFilter();
            
            currentPage = 1;
            renderCurrentPage();
            
            const customerCountSpan = document.getElementById("customerCount");
            if (customerCountSpan) customerCountSpan.textContent = cached.length;
            
            showTable();
            console.log("Customers loaded from cache and sorted");
            isFetching = false;
            return;
        }
    }

    try {
        console.log("Fetching fresh customer data from API...");
        const res = await fetch("/api/superadmin/approved-applications?limit=100");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let data = await res.json();
        
        // Check if response has customers array or just array
        const customers = Array.isArray(data) ? data : (data.customers || []);
        
        const sortedData = sortCustomersByInstallationStatus(customers);

        approvedCustomersData = sortedData;
        filteredData = [...sortedData];
        setCache(CACHE_KEY, sortedData, 5);
        updateCacheTimestamp();
        setupSearchAndFilter();
        
        currentPage = 1;
        renderCurrentPage();
        
        const customerCountSpan = document.getElementById("customerCount");
        if (customerCountSpan) customerCountSpan.textContent = sortedData.length;
        
        showTable();
        console.log(`Customers loaded from API: ${sortedData.length} customers found`);
        
        isManualRefresh = false;
        
    } catch (err) {
        console.error("Fetch error:", err);
        if (!approvedCustomersData || approvedCustomersData.length === 0) {
            showNoData();
        }
        showToast("Error loading customers", "error");
    } finally {
        isFetching = false;
    }
}

// ==================== KEYBOARD SHORTCUT DETECTION ====================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearCache();
    }
});

// ==================== PAGE VISIBILITY & FOCUS HANDLERS ====================
let lastVisibilityCheck = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastVisibilityCheck > 30000 && !isCacheValid()) {
            console.log("Page became visible and cache expired, checking for updates...");
            clearCache();
            fetchCustomers(true);
            lastVisibilityCheck = now;
        }
        lastVisibilityCheck = now;
    }
});

window.addEventListener('focus', function() {
    console.log("Window focused");
    if (!isCacheValid()) {
        console.log("Cache expired, fetching fresh data");
        clearCache();
        fetchCustomers(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log("Page loaded from bfcache");
        if (!isCacheValid()) {
            console.log("Cache expired, refreshing data");
            clearCache();
            isManualRefresh = true;
            fetchCustomers(true);
        }
    }
});

// ==================== TOAST NOTIFICATION ====================
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
    if (type === "error") toast.classList.add("error");
    else if (type === "warning") toast.classList.add("warning");
    
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 4000);
}

// ==================== PROFILE & LOGOUT ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => { e.stopPropagation(); profileMenu.classList.toggle("show"); });
    window.addEventListener("click", e => { if (!profileBtn.contains(e.target)) profileMenu.classList.remove("show"); });
}

async function loadProfile() {
    try {
        const session = window.SessionManager ? window.SessionManager.getSession() : null;
        const username = (session && session.username) || localStorage.getItem('adminUsername') || 'super admin';
        
        const res = await fetch(`/api/superadmin/profile?username=${encodeURIComponent(username)}`);
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "Profile";
    } catch (err) { 
        console.error(err); 
    }
}
loadProfile();

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    logoutBtn.onclick = e => { e.preventDefault(); logoutModal.style.display = "block"; };
    const closeBtnLogout = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");
    
    if (closeBtnLogout) closeBtnLogout.onclick = () => logoutModal.style.display = "none";
    if (cancelLogout) cancelLogout.onclick = () => logoutModal.style.display = "none";
    
    if (confirmLogout) {
        confirmLogout.onclick = () => {
            if (window.SessionManager) {
                window.SessionManager.logout('You have been logged out successfully.');
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/");
            }
        };
    }
    
    window.onclick = e => { if (e.target === logoutModal) logoutModal.style.display = "none"; };
}

// ==================== MANUAL REFRESH FUNCTION ====================
window.refreshCustomers = function() {
    clearCache();
    isManualRefresh = true;
    fetchCustomers(true);
    showToast("Refreshing customer data...", "success");
};

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
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
    
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
    detectPageRefresh();
    trackPageLoads();
    
    const hasCacheBuster = checkForCacheBusting();
    const hasRefreshFlag = checkForCustomerRefreshFlag();
    
    if (hasCacheBuster || hasRefreshFlag) {
        console.log("New approval detected, fetching fresh customer data");
        await fetchCustomers(true);
    } else {
        console.log("Normal navigation, using cache if available");
        await fetchCustomers(false);
    }
    
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.hidden && modal.style.display !== "block" && !isCacheValid()) {
            console.log("Auto-refresh - cache expired, fetching updates");
            clearCache();
            fetchCustomers(true);
        }
    }, 300000);
    
    lastVisibilityCheck = new Date().getTime();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});