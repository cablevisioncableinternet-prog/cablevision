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

const paginationContainer = document.getElementById("archivedPaginationControls");

// ==================== PAGINATION VARIABLES ====================
let currentPage = 1;
const rowsPerPage = 10;

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
    sessionStorage.removeItem(CACHE_KEY_ARCHIVED);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Archived applications cache cleared");
}

// ==================== CACHE KEYS ====================
const CACHE_KEY_ARCHIVED = "superadmin_archived_applications_cache";
const CACHE_TIMESTAMP_KEY = "superadmin_archived_applications_timestamp";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ==================== SORTING ====================
let archivedDateSort = "newest";

function sortArchivedApplications(applications) {
    return [...applications].sort((a, b) => {
        const dateA = a.date_submitted ? new Date(a.date_submitted) : new Date(0);
        const dateB = b.date_submitted ? new Date(b.date_submitted) : new Date(0);

        if (archivedDateSort === "newest") {
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
                isManualRefresh = true;
                clearCache();
            }
        }
    }
}

function isCacheValid() {
    if (isManualRefresh) return false;

    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;

    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);

    return cacheAge < CACHE_DURATION;
}

function updateCacheTimestamp() {
    sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
}

// ==================== GLOBAL DATA ====================
let archivedApplicationsData = [];
let filteredArchivedData = [];
let isFetching = false;
let autoRefreshInterval = null;

// ==================== UI CONTROL ====================
function showLoading() {
    const loadingRow = document.querySelector("#archivedApplicationsBody .loading-row");
    const noDataEl = document.getElementById("noArchivedData");
    const table = document.querySelector("#archivedApplicationsTable");

    if (loadingRow) loadingRow.style.display = "table-row";
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "none";
    if (paginationContainer) paginationContainer.style.display = "none";
}

// ==================== PAGINATION ====================
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

function renderCurrentPage() {
    const totalItems = filteredArchivedData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage);

    if (totalItems === 0) {
        renderArchivedApplications([]);
        if (paginationContainer) paginationContainer.style.display = "none";
        return;
    }

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = filteredArchivedData.slice(startIndex, endIndex);

    renderArchivedApplications(pageData);
    renderPaginationControls(totalPages, totalItems);
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

window.addEventListener("click", function(e) {
    if (e.target === deleteModal) closeDeleteModalFunc();
});

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

            if (!response.ok) throw new Error("Delete failed");

            closeDeleteModalFunc();
            clearCache();
            await fetchArchivedApplications(true);
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

// ==================== RESTORE MODAL ====================
const restoreModal = document.getElementById("restoreModal");
const confirmRestoreBtn = document.getElementById("confirmRestoreBtn");
const cancelRestoreBtn = document.getElementById("cancelRestoreBtn");
const closeRestoreModal = document.getElementById("closeRestoreModal");

let restoreId = null;

function openRestoreModal(id, name) {
    restoreId = id;
    const messageEl = document.getElementById("restoreModalMessage");
    if (messageEl) {
        messageEl.innerHTML = `
            <p>Are you sure you want to restore <strong>"${name}"</strong>?</p>
            <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">
                <i class="fas fa-info-circle"></i> 
                This will:
                <ul style="text-align: left; font-size: 13px; color: #475569; margin-top: 6px; padding-left: 20px;">
                    <li>Unarchive the application</li>
                    <li>Change status from <strong>Rejected</strong> to <strong>Pending</strong></li>
                    <li>The customer will be notified via email</li>
                </ul>
            </p>
        `;
    }
    if (restoreModal) {
        restoreModal.style.display = "flex";
        restoreModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeRestoreModalFunc() {
    if (restoreModal) {
        restoreModal.style.display = "none";
        restoreModal.classList.remove('show');
        document.body.style.overflow = '';
    }
    restoreId = null;
}

if (closeRestoreModal) closeRestoreModal.onclick = closeRestoreModalFunc;
if (cancelRestoreBtn) cancelRestoreBtn.onclick = closeRestoreModalFunc;

window.addEventListener("click", function(e) {
    if (e.target === restoreModal) closeRestoreModalFunc();
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && restoreModal && restoreModal.classList.contains('show')) {
        closeRestoreModalFunc();
    }
});

if (confirmRestoreBtn) {
    confirmRestoreBtn.onclick = async () => {
        if (!restoreId) return;

        confirmRestoreBtn.disabled = true;
        confirmRestoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Restoring...';

        try {
            const response = await fetch(`/api/superadmin/application/${restoreId}/unarchive`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Restore failed");
            }

            closeRestoreModalFunc();
            clearCache();
            await fetchArchivedApplications(true);
            
            // ✅ I-REFRESH DIN ANG MAIN APPLICATIONS PAGE PARA MAKITA ANG NA-RESTORE
            if (window.refreshApplications) {
                window.refreshApplications();
            }
            
            showToast("Application restored to Pending status successfully", "success");

        } catch (err) {
            console.error("Restore error:", err);
            showToast(err.message || "Error restoring application", "error");
        } finally {
            confirmRestoreBtn.disabled = false;
            confirmRestoreBtn.innerHTML = '<i class="fas fa-undo"></i> Restore to Pending';
        }
    };
}

// ==================== HELPER FUNCTIONS: FORMAT DATES ====================
function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';

    try {
        let date;

        if (dateString.includes(' at ')) {
            const parts = dateString.split(' at ');
            if (parts.length === 2) {
                date = new Date(`${parts[0]} ${parts[1]}`);
            } else {
                date = new Date(dateString);
            }
        } else if (dateString.includes(' ') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [datePart, timePart] = dateString.split(' ');
            if (timePart) {
                const [year, month, day] = datePart.split('-');
                const [hour, minute, second] = timePart.split(':');
                date = new Date(year, month - 1, day, hour, minute, second || 0);
            } else {
                date = new Date(dateString);
            }
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return dateString;

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

// ==================== RENDER ARCHIVED APPLICATIONS ====================
function renderArchivedApplications(data) {
    const tbody = document.getElementById("archivedApplicationsBody");
    const mainTable = document.getElementById("archivedApplicationsTable");
    const noData = document.getElementById("noArchivedData");
    const card = document.getElementById("archivedCard");

    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        if (mainTable) mainTable.style.display = "none";
        if (noData) noData.style.display = "block";
        if (card) card.style.display = "block";
        const countSpan = document.getElementById("archivedCount");
        if (countSpan) countSpan.textContent = "0";
        return;
    }

    if (card) card.style.display = "block";
    const countSpan = document.getElementById("archivedCount");
    if (countSpan) countSpan.textContent = data.length;

    data.forEach(app => {
        const status = app.status || "Rejected";

        let statusBadgeClass = "";
        if (status === "Pending") statusBadgeClass = "status-pending";
        else if (status === "Approved") statusBadgeClass = "status-approved";
        else if (status === "Request Sent") statusBadgeClass = "status-request-sent";
        else if (status === "Rejected") statusBadgeClass = "status-rejected";
        else if (status === "Cancelled") statusBadgeClass = "status-rejected"; // ✅ GAMITIN ANG RED BADGE
        

        const formattedDateTime = formatDateTime(app.date_submitted);
        const formattedBirthdate = formatDateOnly(app.birthdate);
        const fullName = `${app.first_name || ""} ${app.last_name || ""}`;

        let actionButtons = `<div class="action-buttons">
            <button class="btn-view" data-id="${app.id}"> <i class="fas fa-eye"></i> View</button>
            <button class="btn-delete" data-id="${app.id}"> <i class="fas fa-trash"></i> Delete</button>
        </div>`;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${app.application_number || "N/A"}</td>
            <td>${fullName}</td>
            <td>${app.email || ""}</td>
            <td>${formattedDateTime}</td>
            <td>${app.barangay || "N/A"}</td>
            <td>${app.city || "N/A"}</td>
            <td>${formattedBirthdate}</td>
            <td>${app.rejection_reason || "N/A"}</td>
            <td><span class="status-badge ${statusBadgeClass}">${status}</span></td>
            <td>${actionButtons}</td>
        `;
        tbody.appendChild(row);
    });

    if (mainTable) mainTable.style.display = "table";
    if (noData) noData.style.display = "none";

    attachEvents();
}

// ==================== ATTACH BUTTON EVENTS ====================
function attachEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.onclick = () => window.location.href = `/superadmin/view-application/${btn.dataset.id}?from=archived`;
    });

    document.querySelectorAll(".btn-delete").forEach(btn => {
        btn.onclick = () => openDeleteModal(btn.dataset.id);
    });

    
}

// ==================== SEARCH & FILTER ====================
let archivedSearchInput, archivedStatusFilter, archivedDateSortFilter;

function setupSearchAndFilter() {
    archivedSearchInput = document.getElementById("archivedSearchInput");
    archivedStatusFilter = document.getElementById("archivedStatusFilter");
    archivedDateSortFilter = document.getElementById("archivedDateSortFilter");

    if (archivedDateSortFilter) {
        archivedDateSort = archivedDateSortFilter.value;
        archivedDateSortFilter.addEventListener("change", () => {
            archivedDateSort = archivedDateSortFilter.value;
            applyArchivedFilters();
        });
    }

    function applyArchivedFilters() {
        const searchTerm = archivedSearchInput ? archivedSearchInput.value.toLowerCase().trim() : "";
        const statusValue = archivedStatusFilter ? archivedStatusFilter.value : "all";

        let filtered = [...archivedApplicationsData];

        if (searchTerm) {
            filtered = filtered.filter(app =>
                (app.application_number && String(app.application_number).toLowerCase().includes(searchTerm)) ||
                (app.first_name && app.first_name.toLowerCase().includes(searchTerm)) ||
                (app.last_name && app.last_name.toLowerCase().includes(searchTerm)) ||
                (`${app.first_name} ${app.last_name}`.toLowerCase().includes(searchTerm)) ||
                (app.email && app.email.toLowerCase().includes(searchTerm))
            );
        }

        if (statusValue !== "all") {
            filtered = filtered.filter(app =>
                app.status && app.status.toLowerCase() === statusValue.toLowerCase()
            );
        }

        filteredArchivedData = sortArchivedApplications(filtered);

        currentPage = 1;

        const totalItems = filteredArchivedData.length;
        const totalPages = Math.ceil(totalItems / rowsPerPage);

        if (totalItems === 0) {
            renderArchivedApplications([]);
            if (paginationContainer) paginationContainer.style.display = "none";
        } else {
            const pageData = filteredArchivedData.slice(0, Math.min(rowsPerPage, totalItems));
            renderArchivedApplications(pageData);
            renderPaginationControls(totalPages, totalItems);
        }
    }

    if (archivedSearchInput) archivedSearchInput.addEventListener("input", applyArchivedFilters);
    if (archivedStatusFilter) archivedStatusFilter.addEventListener("change", applyArchivedFilters);

    const archivedClearBtn = document.getElementById("archivedClearSearch");
    if (archivedClearBtn && archivedSearchInput) {
        archivedClearBtn.addEventListener("click", () => {
            archivedSearchInput.value = "";
            applyArchivedFilters();
            archivedClearBtn.style.display = "none";
        });

        archivedSearchInput.addEventListener("input", () => {
            archivedClearBtn.style.display = archivedSearchInput.value ? "flex" : "none";
        });
    }

    applyArchivedFilters();
}

// ==================== FETCH WITH CACHE ====================
async function fetchArchivedApplications(forceRefresh = false) {
    if (isFetching && !forceRefresh) return;
    isFetching = true;

    if (forceRefresh) showLoading();

    const cachedApps = getCache(CACHE_KEY_ARCHIVED);

    if (!forceRefresh && !isManualRefresh && cachedApps) {
        archivedApplicationsData = cachedApps;
        setupSearchAndFilter();
        isFetching = false;
        return;
    }

    try {
        const res = await fetch(`/api/superadmin/archived-applications?limit=100`);
        const data = await res.json();

        archivedApplicationsData = data;
        setCache(CACHE_KEY_ARCHIVED, data, 5);
        updateCacheTimestamp();
        setupSearchAndFilter();

        isManualRefresh = false;

    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        isFetching = false;
    }
}

// ==================== KEYBOARD SHORTCUT DETECTION ====================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        isManualRefresh = true;
        clearCache();
    }
});

// ==================== VISIBILITY & FOCUS HANDLERS ====================
let lastVisibilityCheck = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastVisibilityCheck > 30000 && !isCacheValid()) {
            clearCache();
            fetchArchivedApplications(true);
            lastVisibilityCheck = now;
        }
    }
});

window.addEventListener('focus', function() {
    if (!isCacheValid()) {
        clearCache();
        fetchArchivedApplications(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        if (!isCacheValid()) {
            clearCache();
            isManualRefresh = true;
            fetchArchivedApplications(true);
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

// ==================== MANUAL REFRESH FUNCTION ====================
window.refreshArchivedApplications = function() {
    clearCache();
    isManualRefresh = true;
    fetchArchivedApplications(true);
    showToast("Refreshing archived applications...", "success");
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
        // stays visible until next showToast call
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
    const isValid = await checkSession();
    if (!isValid) return;

    detectPageRefresh();

    await fetchArchivedApplications(false);

    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        if (!document.hidden) {
            clearCache();
            fetchArchivedApplications(true);
        }
    }, 300000);

    lastVisibilityCheck = new Date().getTime();

    if (window.NotificationSystem && typeof window.NotificationSystem.init === 'function') {
        window.NotificationSystem.init();
    }
});