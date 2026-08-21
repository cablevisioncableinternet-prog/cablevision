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

const paginationContainer = document.getElementById("paginationControls");
const rejectedPaginationContainer = document.getElementById("rejectedPaginationControls");

// ==================== PAGINATION VARIABLES ====================
let currentPage = 1;
let currentRejectedPage = 1;
const rowsPerPage = 10;
const rejectedRowsPerPage = 10;

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
    sessionStorage.removeItem(CACHE_KEY_APPS);
    sessionStorage.removeItem(CACHE_KEY_REQ);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("All caches cleared");
}

// ==================== CACHE KEYS ====================
const CACHE_KEY_APPS = "superadmin_applications_cache";
const CACHE_KEY_REQ = "superadmin_requests_cache";
const CACHE_TIMESTAMP_KEY = "superadmin_applications_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ==================== SORTING FUNCTIONS ====================
let activeDateSort = "oldest";
let rejectedDateSort = "oldest";

function sortActiveApplications(applications) {
    const statusOrder = {
        'Request Sent': 1,
        'Pending': 2,
        'Approved': 3,
        'Rejected': 4
    };
    
    return [...applications].sort((a, b) => {
        const orderA = statusOrder[a.status] || 99;
        const orderB = statusOrder[b.status] || 99;
        
        if (orderA !== orderB) {
            return orderA - orderB;
        }
        
        const dateA = a.date_submitted ? new Date(a.date_submitted) : new Date(0);
        const dateB = b.date_submitted ? new Date(b.date_submitted) : new Date(0);
        
        if (activeDateSort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
}

function sortRejectedApplications(applications) {
    return [...applications].sort((a, b) => {
        const dateA = a.date_submitted ? new Date(a.date_submitted) : new Date(0);
        const dateB = b.date_submitted ? new Date(b.date_submitted) : new Date(0);
        
        if (rejectedDateSort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });
}

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
    const lastLoadTime = sessionStorage.getItem('superadmin_last_load_time');
    const now = new Date().getTime();
    
    if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
        console.log("Quick successive load detected - likely a refresh");
        isManualRefresh = true;
        clearCache();
    }
    
    sessionStorage.setItem('superadmin_last_load_time', now.toString());
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

// ==================== CHECK FOR ADMIN REQUEST FLAG ====================
function checkForAdminRequestFlag() {
    const shouldRefresh = sessionStorage.getItem('refresh_superadmin_applications');
    if (shouldRefresh === 'true') {
        console.log("Admin request flag detected - admin sent a request");
        sessionStorage.removeItem('refresh_superadmin_applications');
        clearCache();
        isManualRefresh = true;
        return true;
    }
    return false;
}

// ==================== GLOBAL DATA ====================
let applicationsData = [];
let filteredActiveData = [];
let filteredRejectedData = [];
let isFetching = false;
let autoRefreshInterval = null;

// ==================== UI CONTROL ====================
function showLoading() {
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#applicationsTable");
    const rejectedNoData = document.getElementById("noRejectedData");
    
    if (loadingRow) loadingRow.style.display = "table-row";
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "none";
    if (rejectedNoData) rejectedNoData.style.display = "none";
    if (paginationContainer) paginationContainer.style.display = "none";
    if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
}

// ==================== PAGINATION FUNCTIONS FOR ACTIVE TABLE ====================
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
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.dataset.page);
            renderCurrentPage();
        });
    });
}

// ==================== PAGINATION FUNCTIONS FOR REJECTED TABLE ====================
function renderRejectedPaginationControls(totalPages, totalItems) {
    if (!rejectedPaginationContainer) return;
    
    if (totalItems === 0) {
        rejectedPaginationContainer.style.display = "none";
        return;
    }
    
    rejectedPaginationContainer.style.display = "flex";
    
    let paginationHtml = `<button class="pagination-btn" id="rejectedFirstPageBtn" ${currentRejectedPage === 1 ? 'disabled' : ''}><i class="fas fa-angle-double-left"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="rejectedPrevPageBtn" ${currentRejectedPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Prev</button>`;

    let startPage = Math.max(1, currentRejectedPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    if (startPage > 1) {
        paginationHtml += `<button class="pagination-btn" data-rejected-page="1">1</button>`;
        if (startPage > 2) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `<button class="pagination-btn ${i === currentRejectedPage ? 'active' : ''}" data-rejected-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            paginationHtml += `<span class="pagination-ellipsis">...</span>`;
        }
        paginationHtml += `<button class="pagination-btn" data-rejected-page="${totalPages}">${totalPages}</button>`;
    }

    paginationHtml += `<button class="pagination-btn" id="rejectedNextPageBtn" ${currentRejectedPage === totalPages ? 'disabled' : ''}>Next <i class="fas fa-chevron-right"></i></button>`;
    paginationHtml += `<button class="pagination-btn" id="rejectedLastPageBtn" ${currentRejectedPage === totalPages ? 'disabled' : ''}><i class="fas fa-angle-double-right"></i></button>`;
    paginationHtml += `<div class="pagination-info"><i class="fas fa-database"></i> Showing ${((currentRejectedPage - 1) * rejectedRowsPerPage) + 1} - ${Math.min(currentRejectedPage * rejectedRowsPerPage, totalItems)} of ${totalItems} entries</div>`;

    rejectedPaginationContainer.innerHTML = paginationHtml;

    const firstPageBtn = document.getElementById("rejectedFirstPageBtn");
    const prevPageBtn = document.getElementById("rejectedPrevPageBtn");
    const nextPageBtn = document.getElementById("rejectedNextPageBtn");
    const lastPageBtn = document.getElementById("rejectedLastPageBtn");
    
    if (firstPageBtn) firstPageBtn.addEventListener("click", () => { if (currentRejectedPage !== 1) { currentRejectedPage = 1; renderRejectedPage(); } });
    if (prevPageBtn) prevPageBtn.addEventListener("click", () => { if (currentRejectedPage > 1) { currentRejectedPage--; renderRejectedPage(); } });
    if (nextPageBtn) nextPageBtn.addEventListener("click", () => { if (currentRejectedPage < totalPages) { currentRejectedPage++; renderRejectedPage(); } });
    if (lastPageBtn) lastPageBtn.addEventListener("click", () => { if (currentRejectedPage !== totalPages) { currentRejectedPage = totalPages; renderRejectedPage(); } });

    document.querySelectorAll(".pagination-btn[data-rejected-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            currentRejectedPage = parseInt(btn.dataset.rejectedPage);
            renderRejectedPage();
        });
    });
}

function renderCurrentPage() {
    const totalItems = filteredActiveData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (totalItems === 0) {
        renderApplications([]);
        if (paginationContainer) paginationContainer.style.display = "none";
        return;
    }
    
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredActiveData.slice(startIndex, endIndex);
    
    renderApplications(pageData);
    renderPaginationControls(totalPages, totalItems);
}

function renderRejectedPage() {
    const totalItems = filteredRejectedData.length;
    const totalPages = Math.ceil(totalItems / rejectedRowsPerPage);
    
    if (totalItems === 0) {
        renderRejectedApplications([]);
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        return;
    }
    
    if (currentRejectedPage > totalPages) {
        currentRejectedPage = totalPages;
    }
    
    const startIndex = (currentRejectedPage - 1) * rejectedRowsPerPage;
    const endIndex = startIndex + rejectedRowsPerPage;
    const pageData = filteredRejectedData.slice(startIndex, endIndex);
    
    renderRejectedApplications(pageData);
    renderRejectedPaginationControls(totalPages, totalItems);
}

// ==================== DELETE MODAL ====================
const deleteModal = document.getElementById("deleteModal");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const closeDeleteModal = document.getElementById("closeDeleteModal");

let deleteId = null;

function openDeleteModal(id) {
    deleteId = id;
    if (deleteModal) {
        // ✅ I-CENTER ANG MODAL
        deleteModal.style.display = "flex";
        deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeDeleteModalFunc() {
    if (deleteModal) {
        deleteModal.style.display = "none";
        deleteModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    deleteId = null;
}

if (closeDeleteModal) closeDeleteModal.onclick = closeDeleteModalFunc;
if (cancelDeleteBtn) cancelDeleteBtn.onclick = closeDeleteModalFunc;

// ✅ CLOSE ON OUTSIDE CLICK
window.addEventListener("click", function(e) {
    if (e.target === deleteModal) {
        closeDeleteModalFunc();
    }
});

// ✅ CLOSE ON ESCAPE KEY
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && deleteModal && deleteModal.classList.contains('show')) {
        closeDeleteModalFunc();
    }
});

if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        if (!deleteId) return;
        
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting...";
        
        try {
            const response = await fetch(`/api/superadmin/application/${deleteId}`, {
                method: "DELETE"
            });
            
            if (!response.ok) {
                throw new Error("Delete failed");
            }
            
            closeDeleteModalFunc();
            clearCache();
            await fetchApplications(true);
            showToast("Application deleted successfully", "success");
            
        } catch (err) {
            console.error("Delete error:", err);
            showToast("Error deleting application", "error");
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Delete";
        }
    };
}


// ==================== HELPER FUNCTION: FORMAT DATE ONLY (NO TIME, NO DAY NAME) ====================
function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        // Format as "May 30, 2026" only - no day name, no time
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// ==================== HELPER FUNCTION: FORMAT DATE WITH TIME ====================
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        // Check if dateString already contains time
        // Ang format na matatanggap ay "YYYY-MM-DD HH:MM:SS" or "June 11, 2026 at 12:00 AM"
        
        let date;
        
        // Kung ang dateString ay may " at " (from Firebase format)
        if (dateString.includes(' at ')) {
            // I-parse ang "June 11, 2026 at 2:30 PM" format
            const parts = dateString.split(' at ');
            if (parts.length === 2) {
                const datePart = parts[0];
                const timePart = parts[1];
                date = new Date(`${datePart} ${timePart}`);
            } else {
                date = new Date(dateString);
            }
        } 
        // Kung standard MySQL datetime format "YYYY-MM-DD HH:MM:SS"
        else if (dateString.includes(' ') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [datePart, timePart] = dateString.split(' ');
            if (timePart) {
                const [year, month, day] = datePart.split('-');
                const [hour, minute, second] = timePart.split(':');
                // Create date object properly
                date = new Date(year, month - 1, day, hour, minute, second || 0);
            } else {
                date = new Date(dateString);
            }
        }
        else {
            date = new Date(dateString);
        }
        
        if (isNaN(date.getTime())) {
            return dateString;
        }
        
        // Format as "May 30, 2026, 2:30 PM"
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        console.error('Date parsing error:', e);
        return dateString;
    }
}

// ==================== RENDER ACTIVE APPLICATIONS ====================
function renderApplications(data) {
    const tbody = document.getElementById("applicationsBody");
    const mainTable = document.getElementById("applicationsTable");
    const noData = document.getElementById("noData");

    if (!tbody) return;
    
    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        if (mainTable) mainTable.style.display = "none";
        if (noData) noData.style.display = "block";
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
        return;
    }

    let activeCount = 0;

    data.forEach(app => {
        const status = app.status || "Pending";
        
        let statusBadgeClass = "";
        if (status === "Pending") statusBadgeClass = "status-pending";
        else if (status === "Approved") statusBadgeClass = "status-approved";
        else if (status === "Request Sent") statusBadgeClass = "status-request-sent";
        else if (status === "Rejected") statusBadgeClass = "status-rejected";

        // ✅ FORMAT DATES - ngayon ay may tamang oras na
        const formattedDateTime = formatDateTime(app.date_submitted);
        const formattedBirthdate = formatDateOnly(app.birthdate);

        // ✅ APPLY PROPER CASE - email lang ang hindi naka-proper case
        const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.trim();
        const barangay = toProperCase(app.barangay || 'N/A');
        const city = toProperCase(app.city || 'N/A');
        const email = app.email || '';

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}"> <i class="fas fa-eye"></i> View</button>
        </div>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${fullName}</td>
            <td>${email}</td>
            <td>${formattedDateTime}</td>
            <td>${barangay}</td>
            <td>${city}</td>
            <td>${formattedBirthdate}</td>
            <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
        activeCount++;
    });

    const appCountSpan = document.getElementById("applicationCount");
    if (appCountSpan) appCountSpan.textContent = activeCount;

    if (mainTable) {
        if (activeCount === 0) {
            mainTable.style.display = "none";
        } else {
            mainTable.style.display = "table";
        }
    }

    if (activeCount === 0) {
        if (noData) noData.style.display = "block";
    } else {
        if (noData) noData.style.display = "none";
    }
    
    attachEvents();
}

// ==================== RENDER REJECTED APPLICATIONS ====================
function renderRejectedApplications(data) {
    const rejectedBody = document.getElementById("rejectedApplicationsBody");
    const rejectedCard = document.getElementById("rejectedCard");
    const rejectedCountSpan = document.getElementById("rejectedCount");

    if (!rejectedBody) return;
    
    rejectedBody.innerHTML = "";

    // Filter out archived applications from display
    const nonArchivedRejected = data.filter(app => !app.is_archived);

    if (!nonArchivedRejected || nonArchivedRejected.length === 0) {
        // Huwag i-hide ang buong card, i-hide lang ang table
        const rejectedTable = document.getElementById("rejectedApplicationsTable");
        if (rejectedTable) rejectedTable.style.display = "none";
        
        if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
        
        // I-show ang no data message sa loob ng card
        const noRejectedDataEl = document.getElementById("noRejectedData");
        if (noRejectedDataEl) {
            noRejectedDataEl.style.display = "block";
        }
        
        // SIGURADUHIN NA VISIBLE ANG CARD
        if (rejectedCard) rejectedCard.style.display = "block";
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        return;
    }
    
    // I-show ang card at table
    if (rejectedCard) rejectedCard.style.display = "block";
    if (rejectedCountSpan) rejectedCountSpan.textContent = nonArchivedRejected.length;
    
    const rejectedTable = document.getElementById("rejectedApplicationsTable");
    if (rejectedTable) rejectedTable.style.display = "table";
    
    const noRejectedDataEl = document.getElementById("noRejectedData");
    if (noRejectedDataEl) noRejectedDataEl.style.display = "none";

    nonArchivedRejected.forEach(app => {
        const status = app.status || "Rejected";
        let statusBadgeClass = "status-rejected";

        const formattedDateSubmitted = formatDateTime(app.date_submitted);
        const formattedBirthdate = formatDateOnly(app.birthdate);

        const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.trim();
        const barangay = toProperCase(app.barangay || 'N/A');
        const city = toProperCase(app.city || 'N/A');
        const email = app.email || '';
        const rejectionReason = app.rejection_reason ? toProperCase(app.rejection_reason) : 'N/A';

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}"> <i class="fas fa-eye"></i> View</button>
            <button class="btn-archive" data-id="${app.id}" data-name="${fullName}">
                <i class="fas fa-archive"></i> Archive
            </button>
        </div>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${fullName}</td>
            <td>${email}</td>
            <td>${formattedDateSubmitted}</td>
            <td>${barangay}</td>
            <td>${city}</td>
            <td>${formattedBirthdate}</td>
            <td>${rejectionReason}</td>
            <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        rejectedBody.appendChild(row);
    });
    
    attachEvents();
}

// ==================== ATTACH BUTTON EVENTS ====================
function attachEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.onclick = () => window.location.href = `/superadmin/view-application/${btn.dataset.id}`;
    });
    
    // ✅ ARCHIVE BUTTON EVENTS - ito lang ang natira
    document.querySelectorAll(".btn-archive").forEach(btn => {
        btn.onclick = () => {
            const appId = btn.dataset.id;
            const appName = btn.dataset.name || 'this application';
            openArchiveModal(appId, appName);
        };
    });
}

// ==================== SEARCH & FILTER FUNCTIONS ====================
let activeSearchInput, activeStatusFilter, activeDateSortFilter;
let rejectedSearchInput, rejectedDateSortFilter;

function setupSearchAndFilter() {
    // Active card elements
    activeSearchInput = document.getElementById("activeSearchInput");
    activeStatusFilter = document.getElementById("activeStatusFilter");
    activeDateSortFilter = document.getElementById("activeDateSortFilter");
    
    // Rejected card elements
    rejectedSearchInput = document.getElementById("rejectedSearchInput");
    rejectedDateSortFilter = document.getElementById("rejectedDateSortFilter");
    
    // Set initial sort values
    if (activeDateSortFilter) {
        activeDateSort = activeDateSortFilter.value;
        activeDateSortFilter.addEventListener("change", () => {
            activeDateSort = activeDateSortFilter.value;
            applyActiveFilters();
        });
    }
    
    if (rejectedDateSortFilter) {
        rejectedDateSort = rejectedDateSortFilter.value;
        rejectedDateSortFilter.addEventListener("change", () => {
            rejectedDateSort = rejectedDateSortFilter.value;
            applyRejectedFilters();
        });
    }
    
    function applyActiveFilters() {
        const searchTerm = activeSearchInput ? activeSearchInput.value.toLowerCase().trim() : "";
        const statusValue = activeStatusFilter ? activeStatusFilter.value : "all";
        
        let filtered = applicationsData.filter(app => app.status !== "Rejected");
        
        if (searchTerm) {
            filtered = filtered.filter(app => {
                const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.toLowerCase();
                const email = (app.email || '').toLowerCase();
                const appNumber = String(app.application_number || '').toLowerCase();
                
                return fullName.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       appNumber.includes(searchTerm);
            });
        }
        
        if (statusValue !== "all") {
            filtered = filtered.filter(app => 
                app.status && app.status.toLowerCase() === statusValue.toLowerCase()
            );
        }
        
        filteredActiveData = sortActiveApplications(filtered);
        
        currentPage = 1;
        
        const totalItems = filteredActiveData.length;
        const activeTable = document.getElementById("applicationsTable");
        const noDataEl = document.getElementById("noData");
        
        if (totalItems === 0) {
            // I-hide ang table, i-show ang no data message
            if (activeTable) activeTable.style.display = "none";
            if (noDataEl) {
                noDataEl.style.display = "block";
                if (searchTerm || statusValue !== "all") {
                    noDataEl.innerHTML = `
                        <div style="text-align: center; padding: 30px 20px;">
                            <i class="fas fa-search" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                            <p style="font-weight: 600; color: #1e293b; margin: 0;">No active applications match your search</p>
                            <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Try adjusting your search or filters</p>
                        </div>
                    `;
                } else {
                    noDataEl.innerHTML = `
                        <div style="text-align: center; padding: 30px 20px;">
                            <i class="fas fa-inbox" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                            <p style="font-weight: 600; color: #1e293b; margin: 0;">No active applications found</p>
                        </div>
                    `;
                }
            }
            if (paginationContainer) paginationContainer.style.display = "none";
        } else {
            // I-show ang table
            if (activeTable) activeTable.style.display = "table";
            if (noDataEl) noDataEl.style.display = "none";
            
            const totalPages = Math.ceil(totalItems / rowsPerPage);
            const startIndex = 0;
            const endIndex = Math.min(rowsPerPage, totalItems);
            const pageData = filteredActiveData.slice(startIndex, endIndex);
            renderApplications(pageData);
            renderPaginationControls(totalPages, totalItems);
        }
    }
    
    function applyRejectedFilters() {
        const searchTerm = rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "";
        
        let filtered = applicationsData.filter(app => app.status === "Rejected" && !app.is_archived);
        
        if (searchTerm) {
            filtered = filtered.filter(app => {
                const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.toLowerCase();
                const email = (app.email || '').toLowerCase();
                const appNumber = String(app.application_number || '').toLowerCase();
                const reason = toProperCase(app.rejection_reason || '').toLowerCase();
                
                return fullName.includes(searchTerm) || 
                       email.includes(searchTerm) || 
                       appNumber.includes(searchTerm) ||
                       reason.includes(searchTerm);
            });
        }
        
        filteredRejectedData = sortRejectedApplications(filtered);
        
        currentRejectedPage = 1;
        
        const totalItems = filteredRejectedData.length;
        const rejectedTable = document.getElementById("rejectedApplicationsTable");
        const rejectedNoData = document.getElementById("noRejectedData");
        const rejectedCardEl = document.getElementById("rejectedCard");
        
        if (totalItems === 0) {
            // I-hide ang table, pero i-show ang no data message SA LOOB ng card
            if (rejectedTable) rejectedTable.style.display = "none";
            if (rejectedNoData) {
                rejectedNoData.style.display = "block";
                if (searchTerm) {
                    rejectedNoData.innerHTML = `
                        <div style="text-align: center; padding: 30px 20px;">
                            <i class="fas fa-search" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                            <p style="font-weight: 600; color: #1e293b; margin: 0;">No rejected applications match your search</p>
                            <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Try adjusting your search</p>
                        </div>
                    `;
                } else {
                    rejectedNoData.innerHTML = `
                        <div style="text-align: center; padding: 30px 20px;">
                            <p style="font-weight: 600; color: #1e293b; margin: 0;">No rejected applications found</p>
                            <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">All applications are active</p>
                        </div>
                    `;
                }
            }
            // SIGURADUHIN NA VISIBLE ANG CARD
            if (rejectedCardEl) rejectedCardEl.style.display = "block";
            if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
            const rejectedCountSpan = document.getElementById("rejectedCount");
            if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
        } else {
            // I-show ang table at i-hide ang no data message
            if (rejectedTable) rejectedTable.style.display = "table";
            if (rejectedNoData) rejectedNoData.style.display = "none";
            if (rejectedCardEl) rejectedCardEl.style.display = "block";
            
            const totalPages = Math.ceil(totalItems / rejectedRowsPerPage);
            const startIndex = 0;
            const endIndex = Math.min(rejectedRowsPerPage, totalItems);
            const pageData = filteredRejectedData.slice(startIndex, endIndex);
            renderRejectedApplications(pageData);
            renderRejectedPaginationControls(totalPages, totalItems);
        }
    }
    
    // Active card event listeners
    if (activeSearchInput) activeSearchInput.addEventListener("input", applyActiveFilters);
    if (activeStatusFilter) activeStatusFilter.addEventListener("change", applyActiveFilters);
    
    // Rejected card event listeners
    if (rejectedSearchInput) rejectedSearchInput.addEventListener("input", applyRejectedFilters);
    
    // Clear buttons
    const activeClearBtn = document.getElementById("activeClearSearch");
    if (activeClearBtn && activeSearchInput) {
        activeClearBtn.addEventListener("click", () => {
            activeSearchInput.value = "";
            applyActiveFilters();
            activeClearBtn.style.display = "none";
        });
        
        activeSearchInput.addEventListener("input", () => {
            activeClearBtn.style.display = activeSearchInput.value ? "flex" : "none";
        });
    }
    
    const rejectedClearBtn = document.getElementById("rejectedClearSearch");
    if (rejectedClearBtn && rejectedSearchInput) {
        rejectedClearBtn.addEventListener("click", () => {
            rejectedSearchInput.value = "";
            applyRejectedFilters();
            rejectedClearBtn.style.display = "none";
        });
        
        rejectedSearchInput.addEventListener("input", () => {
            rejectedClearBtn.style.display = rejectedSearchInput.value ? "flex" : "none";
        });
    }
    
    // Initial loads
    applyActiveFilters();
    applyRejectedFilters();
}

// ==================== FETCH WITH CACHE & AUTO-UPDATE ====================
async function fetchApplications(forceRefresh = false) {
    if (isFetching && !forceRefresh) return;
    isFetching = true;

    if (forceRefresh) showLoading();

    const cachedApps = getCache(CACHE_KEY_APPS);
    
    if (!forceRefresh && !isManualRefresh && cachedApps) {
        applicationsData = cachedApps;
        setupSearchAndFilter();
        console.log("Applications loaded from cache");
        isFetching = false;
        return;
    }

    try {
        const appsRes = await fetch(`/api/superadmin/applications?limit=100`);
        let appsData = await appsRes.json();
        
        applicationsData = appsData;
        setCache(CACHE_KEY_APPS, appsData, 5);
        updateCacheTimestamp();
        setupSearchAndFilter();
        
        console.log("Applications loaded from API");
        isManualRefresh = false;
        
    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        isFetching = false;
    }
}

// ==================== CHECK FOR CACHE-BUSTING PARAMETER ====================
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

// ==================== KEYBOARD SHORTCUT DETECTION ====================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearCache();
    }
});

// ==================== OPTIMIZED PAGE VISIBILITY & FOCUS HANDLERS ====================
let lastVisibilityCheck = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastVisibilityCheck > 30000 && !isCacheValid()) {
            console.log("Page became visible and cache expired, fetching fresh data");
            clearCache();
            fetchApplications(true);
            lastVisibilityCheck = now;
        }
    }
});

window.addEventListener('focus', function() {
    console.log("Window focused");
    if (!isCacheValid()) {
        console.log("Cache expired, fetching fresh data");
        clearCache();
        fetchApplications(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log("Page loaded from bfcache");
        if (!isCacheValid()) {
            console.log("Cache expired, refreshing data");
            clearCache();
            isManualRefresh = true;
            fetchApplications(true);
        }
    }
});

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

// ==================== REJECT MODAL ====================
const rejectModal = document.getElementById("rejectModal");
const rejectReason = document.getElementById("rejectReason");
const rejectCustomReason = document.getElementById("rejectCustomReason");

let rejectId = null;

function openRejectModal(id) {
    rejectId = id;
    if (rejectModal) rejectModal.style.display = "block";
}

if (document.getElementById("closeRejectModal")) {
    document.getElementById("closeRejectModal").onclick = () => rejectModal.style.display = "none";
}
if (document.getElementById("cancelRejectBtn")) {
    document.getElementById("cancelRejectBtn").onclick = () => rejectModal.style.display = "none";
}

window.addEventListener("click", e => {
    if (e.target === rejectModal) rejectModal.style.display = "none";
});

if (rejectReason) {
    rejectReason.addEventListener("change", () => {
        if (rejectReason.value === "Other") {
            rejectCustomReason.style.display = "block";
        } else {
            rejectCustomReason.style.display = "none";
        }
    });
}

if (document.getElementById("confirmRejectBtn")) {
    document.getElementById("confirmRejectBtn").onclick = async () => {
        let reason = rejectReason.value;

        if (!reason) {
            alert("Please select a reason!");
            return;
        }

        if (reason === "Other") {
            reason = rejectCustomReason.value.trim();
            if (!reason) {
                alert("Please enter custom reason!");
                return;
            }
        }

        try {
            const res = await fetch(`/api/superadmin/application/${rejectId}/status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    status: "Rejected",
                    reason: reason
                })
            });

            if (!res.ok) throw new Error("Reject failed");

            rejectModal.style.display = "none";
            clearCache();
            await fetchApplications(true);
            showToast("Application rejected successfully", "success");

        } catch (err) {
            console.error(err);
            alert("Error rejecting application");
        }
    };
}

// ==================== MANUAL REFRESH FUNCTION ====================
window.refreshApplications = function() {
    clearCache();
    isManualRefresh = true;
    fetchApplications(true);
    showToast("Refreshing applications...", "success");
};

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

        // Inject keyframes + spin once
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

    // Build inner HTML
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

    // Reset class, force reflow, then show
    toast.className = `custom-toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    // Clear any existing hide timer
    clearTimeout(toast._hideTimer);

    if (type === 'loading') {
        // Loading stays visible until next showToast call — no auto-hide
        // Progress bar uses the infinite sweep animation (set in CSS)
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

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
        if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async () => {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    detectPageRefresh();
    trackPageLoads();
    
    const hasCacheBuster = checkForCacheBusting();
    const hasAdminRequestFlag = checkForAdminRequestFlag();
    
    if (hasCacheBuster || hasAdminRequestFlag) {
        console.log("Change detected, fetching fresh data");
        await fetchApplications(true);
    } else {
        await fetchApplications(false);
    }
    
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.hidden) {
            console.log("Auto-refresh - fetching updates");
            clearCache();
            fetchApplications(true);
        }
    }, 300000);
    
    lastVisibilityCheck = new Date().getTime();
    
    if (window.NotificationSystem && typeof window.NotificationSystem.init === 'function') {
        window.NotificationSystem.init();
    } else {
        console.log("Notification system not found, make sure notification-system.js is loaded");
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


// ==================== ARCHIVE MODAL ====================
const archiveModal = document.getElementById("archiveModal");
let archiveId = null;

function openArchiveModal(id, name) {
    archiveId = id;
    
    // Create archive modal if it doesn't exist
    let modal = document.getElementById("archiveModal");
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'archiveModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" id="closeArchiveModal">&times;</span>
                <h2> Archive Application</h2>
                <p id="archiveModalMessage">Are you sure you want to archive this application?</p>
                <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                    <i class="fas fa-info-circle"></i> 
                    Archived applications will be hidden from the main list but can still be accessed if needed.
                </p>
                <div class="modal-buttons">
                    <button id="confirmArchiveBtn" class="btn-confirm" style="background: linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-blue) 100%);">
                        <i class="fas fa-archive"></i> Archive
                    </button>
                    <button id="cancelArchiveBtn" class="btn-cancel">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Update message with application name
    const messageEl = document.getElementById("archiveModalMessage");
    if (messageEl) {
        messageEl.textContent = `Are you sure you want to archive "${name}"?`;
    }
    
    // Remove existing event listeners
    const confirmBtn = document.getElementById("confirmArchiveBtn");
    const cancelBtn = document.getElementById("cancelArchiveBtn");
    const closeBtn = document.getElementById("closeArchiveModal");
    
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.onclick = executeArchive;
    }
    
    if (cancelBtn) {
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        newCancelBtn.onclick = closeArchiveModalFunc;
    }
    
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.onclick = closeArchiveModalFunc;
    }
    
    // Show modal
    modal.style.display = "flex";
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeArchiveModalFunc() {
    const modal = document.getElementById("archiveModal");
    if (modal) {
        modal.style.display = "none";
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    archiveId = null;
}

async function executeArchive() {
    if (!archiveId) return;
    
    const confirmBtn = document.getElementById("confirmArchiveBtn");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Archiving...';
    
    try {
        const response = await fetch(`/api/superadmin/application/${archiveId}/archive`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Archive failed");
        }
        
        closeArchiveModalFunc();
        clearCache();
        await fetchApplications(true);
        showToast("Application archived successfully", "success");
        
    } catch (err) {
        console.error("Archive error:", err);
        showToast(err.message || "Error archiving application", "error");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Close archive modal on outside click
window.addEventListener("click", function(e) {
    const modal = document.getElementById("archiveModal");
    if (e.target === modal) {
        closeArchiveModalFunc();
    }
});

// Close on Escape key
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        const modal = document.getElementById("archiveModal");
        if (modal && modal.classList.contains('show')) {
            closeArchiveModalFunc();
        }
    }
});

// ==================== HELPER FUNCTION: PROPER CASE ====================
function toProperCase(str) {
    if (!str) return 'N/A';
    if (typeof str !== 'string') return str;
    
    // Handle special cases like "Dela Cruz", "De Jesus", "Macapagal"
    const exceptions = ['del', 'de', 'la', 'las', 'los', 'san', 'santa', 'santo', 'dela', 'de la'];
    
    return str.toLowerCase().split(' ').map(word => {
        // Check if word is in exceptions list
        if (exceptions.includes(word.toLowerCase())) {
            return word.toLowerCase();
        }
        // Handle hyphenated names like "María-Jose"
        if (word.includes('-')) {
            return word.split('-').map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            ).join('-');
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}
