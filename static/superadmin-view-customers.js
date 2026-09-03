// ==================== HAMBURGER MENU TOGGLE ====================
// ILAGAY ITO SA PINAKA-UNANG PART NG JS FILE
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    console.log('Hamburger element:', hamburger);
    console.log('Sidebar element:', sidebar);
    console.log('Sidebar Overlay:', sidebarOverlay);

    if (hamburger && sidebar) {
        function toggleSidebar() {
            sidebar.classList.toggle('active');
            hamburger.classList.toggle('active');
            if (sidebarOverlay) {
                sidebarOverlay.classList.toggle('active');
            }
            
            if (sidebar.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
            
            console.log('Sidebar toggled. Active:', sidebar.classList.contains('active'));
        }
        
        hamburger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Hamburger clicked!');
            toggleSidebar();
        });
        
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function(e) {
                console.log('Overlay clicked!');
                toggleSidebar();
            });
        }
        
        // Auto-close sidebar when resizing to desktop size
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
                if (sidebarOverlay) sidebarOverlay.classList.remove('active');
                document.body.style.overflow = '';
                console.log('Sidebar closed on resize');
            }
        });
    } else {
        console.error('Hamburger or Sidebar not found!');
        console.log('hamburger element:', hamburger);
        console.log('sidebar element:', sidebar);
    }
});

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
        'Installed': 3,
        'Terminated': 4,    // BAGO
        'Cancelled': 5      // BAGO
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

const CACHE_KEY = "superadmin_customers_cache";
const CACHE_TIMESTAMP_KEY = "superadmin_customers_timestamp";
const CACHE_DURATION = 5 * 60 * 1000;

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

function notifyUserCreated(customerId) {
    console.log("Notifying other tabs about new user creation for customer ID:", customerId);
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

let approvedCustomersData = [];
let filteredData = [];
let isFetching = false;
let autoRefreshInterval = null;

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
            tbody.innerHTML = `<tr class="loading-row"><td colspan="9"><div class="loading-container"><div class="spinner"></div><p>Loading customers...</p></div></td>`;
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
    if (firstPageBtn) firstPageBtn.addEventListener("click", () => { if (currentPage !== 1) { currentPage = 1; renderCurrentPage(); } });
    if (prevPageBtn) prevPageBtn.addEventListener("click", () => { if (currentPage > 1) { currentPage--; renderCurrentPage(); } });
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => { if (currentPage < totalPages) { currentPage++; renderCurrentPage(); } });
    if (lastPageBtn) lastPageBtn.addEventListener("click", () => { if (currentPage !== totalPages) { currentPage = totalPages; renderCurrentPage(); } });
    document.querySelectorAll(".pagination-btn[data-page]").forEach(btn => {
        btn.addEventListener("click", () => { currentPage = parseInt(btn.dataset.page); renderCurrentPage(); });
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
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    renderApprovedCustomers(pageData);
    renderPaginationControls(totalPages, totalItems);
}

// ==================== CREATE ACCOUNT FUNCTIONALITY ====================
let currentCreateAccountCustomer = null;
let currentGeneratedUserId = null;

function openCreateAccountModal(applicationId) {
    console.log("Opening create account modal for:", applicationId);
    currentCreateAccountCustomer = applicationId;
    const modal = document.getElementById('createAccountModal');
    const loadingDiv = document.getElementById('createAccountLoading');
    const contentDiv = document.getElementById('createAccountContent');
    
    modal.classList.add('show');
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    
    const errorDiv = contentDiv.querySelector('.error-message');
    if (errorDiv) errorDiv.remove();
    
    fetch(`/api/superadmin/customer/${applicationId}`)
        .then(res => res.json())
        .then(customer => {
            if (customer.error) throw new Error(customer.error);
            
            const randomNum = Math.floor(Math.random() * 9000) + 1000;
            const generatedUserId = `CV-${randomNum}`;
            currentGeneratedUserId = generatedUserId;
            
            document.getElementById('generatedUserId').textContent = generatedUserId;
            document.getElementById('defaultPassword').textContent = customer.password || '123456';
            document.getElementById('accountFullName').textContent = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
            document.getElementById('accountAppNumber').textContent = customer.application_number || 'N/A';
            document.getElementById('accountContractNumber').textContent = customer.contract_number || 'N/A';
            document.getElementById('accountEmail').textContent = customer.email || 'N/A';
            document.getElementById('accountContact').textContent = customer.mobile || 'N/A';
            
            let fullAddress = [];
            if (customer.address) fullAddress.push(customer.address);
            if (customer.barangay) fullAddress.push(customer.barangay);
            if (customer.city) fullAddress.push(customer.city);
            if (customer.province) fullAddress.push(customer.province);
            document.getElementById('accountAddress').textContent = fullAddress.join(', ') || 'N/A';
            document.getElementById('accountPlan').textContent = customer.plan || 'N/A';
            document.getElementById('accountBillingDate').textContent = customer.billing_date || 'N/A';
            
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
        })
        .catch(err => {
            console.error(err);
            loadingDiv.style.display = 'none';
            contentDiv.style.display = 'block';
            contentDiv.innerHTML = `<div class="error-message" style="color:#dc2626; text-align:center; padding:20px;"><i class="fas fa-exclamation-circle"></i> ${err.message}</div>`;
        });
}

function createUserAccount() {
    console.log("Create user account called for:", currentCreateAccountCustomer);
    if (!currentCreateAccountCustomer) {
        showToast('Error: No customer selected', 'error');
        return;
    }
    if (!currentGeneratedUserId) {
        showToast('Error: User ID not generated', 'error');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmCreateAccountBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Creating...';
    
    fetch('/api/superadmin/create-user-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            application_number: currentCreateAccountCustomer,
            user_id: currentGeneratedUserId
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showToast(data.message, 'success');
            closeCreateAccountModal();
            
            const btn = document.querySelector(`.btn-create-account[data-id="${currentCreateAccountCustomer}"]`);
            if (btn) {
                btn.textContent = 'Account Created';
                btn.disabled = true;
                btn.classList.add('disabled');
                btn.style.background = '#cbd5e1';
                btn.style.cursor = 'not-allowed';
            }
            
            const customerIndex = approvedCustomersData.findIndex(c => c.id == currentCreateAccountCustomer);
            if (customerIndex !== -1) {
                approvedCustomersData[customerIndex].user_created = 1;
            }
            
            clearCache();
            setTimeout(() => fetchCustomers(true), 500);
        } else {
            showToast(data.error || 'Failed to create account', 'error');
        }
    })
    .catch(err => {
        console.error("Create account error:", err);
        showToast('Error creating account: ' + err.message, 'error');
    })
    .finally(() => {
        confirmBtn.disabled = false;
        confirmBtn.textContent = originalText;
    });
}

function closeCreateAccountModal() {
    const modal = document.getElementById('createAccountModal');
    modal.classList.remove('show');
    currentCreateAccountCustomer = null;
    currentGeneratedUserId = null;
    
    const loadingDiv = document.getElementById('createAccountLoading');
    const contentDiv = document.getElementById('createAccountContent');
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (contentDiv) contentDiv.style.display = 'none';
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
        // I-validate kung valid ang status para sa CSS class
        let statusClass = installationStatus.toLowerCase().replace(/ /g, '-');
        // Para sa "Terminated" at "Cancelled" - gawing lowercase lang
        if (statusClass === 'terminated' || statusClass === 'cancelled') {
            // OK na to
        }
        const hasUserAccount = app.user_created === 1;
        
        let appStatusBadgeClass = "";
        let appStatusText = "";
        switch(app.application_status) {
            case "Approved": appStatusBadgeClass = "status-approved"; appStatusText = "Approved"; break;
            case "Pending": appStatusBadgeClass = "status-pending"; appStatusText = "Pending"; break;
            case "Rejected": appStatusBadgeClass = "status-rejected"; appStatusText = "Rejected"; break;
            default: appStatusBadgeClass = "status-approved"; appStatusText = "Approved";
        }
        
        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}"> <i class="fas fa-eye"></i> View</button>`;
        
        if (installationStatus === "Installed" && !hasUserAccount) {
            actionButtons += `<button class="btn-create-account" data-id="${app.id}"> <i class="fas fa-user-plus"></i> Create Account</button>`;
        }
        
        actionButtons += `</div>`;
        
        const contractNumber = app.contract_number || "N/A";
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td><span class="contract-number">${escapeHtml(contractNumber)}</span></td>
            <td>${escapeHtml(app.first_name || "")} ${escapeHtml(app.last_name || "")}</td>
            <td>${escapeHtml(app.email || "")}</td>
            <td>${escapeHtml(app.plan || "N/A")}</td>
            <td>${escapeHtml(app.plan_speed || "N/A")}</td>
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
    document.querySelectorAll(".btn-create-account").forEach(btn => {
        btn.onclick = () => openCreateAccountModal(btn.dataset.id);
    });
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

// ==================== FETCH CUSTOMERS ====================
async function fetchCustomers(forceRefresh = false) {
    if (isFetching && !forceRefresh) return;
    isFetching = true;
    if (forceRefresh || approvedCustomersData.length === 0) showLoading();
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
        if (!approvedCustomersData || approvedCustomersData.length === 0) showNoData();
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

// ==================== PROFILE & LOGOUT ====================
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
    } catch (err) { console.error(err); }
}
loadProfile();

// ==================== LOGOUT MODAL (FIXED) ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    logoutBtn.onclick = function(e) {
        e.preventDefault();
        logoutModal.classList.add('show');  // ✅ PALITAN ITO
    };
    
    const closeBtnLogout = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");
    
    if (closeBtnLogout) {
        closeBtnLogout.onclick = function() {
            logoutModal.classList.remove('show');  // ✅ PALITAN ITO
        };
    }
    
    if (cancelLogout) {
        cancelLogout.onclick = function() {
            logoutModal.classList.remove('show');  // ✅ PALITAN ITO
        };
    }
    
    if (confirmLogout) {
        confirmLogout.onclick = function() {
            const tabId = getTabId();
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: tabId })
            }).catch(() => {});

            sessionStorage.clear();
            window.location.replace("/");
        };
    }
    
    // Close when clicking outside
    window.onclick = function(e) {
        if (e.target === logoutModal) {
            logoutModal.classList.remove('show');  // ✅ PALITAN ITO
        }
    };
}

window.refreshCustomers = function() {
    clearCache();
    isManualRefresh = true;
    fetchCustomers(true);
    showToast("Refreshing customer data...", "success");
};

// ==================== MODAL EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded - setting up modal event listeners");
    
    const closeModalBtn = document.getElementById('closeCreateAccountModal');
    const cancelBtn = document.getElementById('cancelCreateAccountBtn');
    const confirmBtn = document.getElementById('confirmCreateAccountBtn');
    const modal = document.getElementById('createAccountModal');
    
    if (closeModalBtn) {
        closeModalBtn.onclick = closeCreateAccountModal;
        console.log("Close button attached");
    }
    if (cancelBtn) {
        cancelBtn.onclick = closeCreateAccountModal;
        console.log("Cancel button attached");
    }
    if (confirmBtn) {
        confirmBtn.onclick = createUserAccount;
        console.log("Confirm button attached");
    }
    
    if (modal) {
        window.onclick = function(e) {
            if (e.target === modal) {
                closeCreateAccountModal();
            }
        };
    }
});

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
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
    autoRefreshInterval = setInterval(function() {
        if (!document.hidden && modal && modal.style.display !== "block" && !isCacheValid()) {
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

// ==================== KEYBOARD SHORTCUT: ESC ====================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal && logoutModal.classList.contains('show')) {  // ✅ PALITAN ITO
            logoutModal.classList.remove('show');  // ✅ PALITAN ITO
        }
        
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu && profileMenu.classList.contains('show')) {
            profileMenu.classList.remove('show');
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) profileBtn.classList.remove('active');
        }
        
        const notificationMenu = document.getElementById('notificationMenu');
        if (notificationMenu && notificationMenu.classList.contains('show')) {
            notificationMenu.classList.remove('show');
        }
        
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerBtn');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        
        const createAccountModal = document.getElementById('createAccountModal');
        if (createAccountModal && createAccountModal.classList.contains('show')) {
            closeCreateAccountModal();
        }
    }
});