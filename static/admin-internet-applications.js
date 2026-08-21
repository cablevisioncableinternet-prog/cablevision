// ===============================
// ADMIN INTERNET APPLICATIONS JS - WITH TAB ID SUPPORT
// ===============================

// ==================== GET TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== HELPER FUNCTION: PROPER CASE ====================
function toProperCase(str) {
    if (!str) return 'N/A';
    if (typeof str !== 'string') return str;
    
    // Handle special cases like "Dela Cruz", "De Jesus", "Macapagal"
    // TANGGALIN ANG 'san', 'santa', 'santo' SA EXCEPTIONS PARA MAGING PROPER CASE
    const exceptions = ['del', 'de', 'la', 'las', 'los', 'dela', 'de la', 'da', 'di', 'du', 'el'];
    
    // Split by spaces
    return str.toLowerCase().split(' ').map(word => {
        // Handle words with parentheses like (poblacion)
        if (word.includes('(')) {
            // Split by parenthesis
            const parts = word.split('(');
            const mainWord = parts[0];
            const parenContent = parts[1] ? parts[1].replace(')', '') : '';
            
            let result = '';
            // Process main word
            if (mainWord) {
                if (exceptions.includes(mainWord.toLowerCase())) {
                    result += mainWord.toLowerCase();
                } else {
                    result += mainWord.charAt(0).toUpperCase() + mainWord.slice(1).toLowerCase();
                }
            }
            
            // Process content inside parentheses
            if (parenContent) {
                result += '(' + parenContent.charAt(0).toUpperCase() + parenContent.slice(1).toLowerCase() + ')';
            }
            
            return result;
        }
        
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

const appsTableBody = document.getElementById("applicationsBody");
const rejectedTableBody = document.getElementById("rejectedApplicationsBody");
const rejectedCard = document.getElementById("rejectedCard");
const noData = document.getElementById("noData");
const noRejectedData = document.getElementById("noRejectedData");

// Active card elements
const activeSearchInput = document.getElementById("activeSearchInput");
const activeStatusFilter = document.getElementById("activeStatusFilter");
const activeDateSortFilter = document.getElementById("activeDateSortFilter");
const paginationContainer = document.getElementById("paginationControls");

// Rejected card elements
const rejectedSearchInput = document.getElementById("rejectedSearchInput");
const rejectedDateSortFilter = document.getElementById("rejectedDateSortFilter");
const rejectedPaginationContainer = document.getElementById("rejectedPaginationControls");

let applicationsData = [];
let filteredActiveData = [];
let filteredRejectedData = [];
let currentPage = 1;
let currentRejectedPage = 1;
const rowsPerPage = 10;
const rejectedRowsPerPage = 10;

// Sort variables
let activeDateSort = "oldest";
let rejectedDateSort = "oldest";

// Admin info - will be set from session
let adminUsername = null;
let adminId = null;
let adminArea = null;
let adminCity = null;

// ==================== DATE FORMATTING FUNCTIONS ====================

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        let date;
        
        if (dateString.includes(' at ')) {
            const parts = dateString.split(' at ');
            if (parts.length === 2) {
                const datePart = parts[0];
                const timePart = parts[1];
                date = new Date(`${datePart} ${timePart}`);
            } else {
                date = new Date(dateString);
            }
        } 
        else if (dateString.includes(' ') && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [datePart, timePart] = dateString.split(' ');
            if (timePart) {
                const [year, month, day] = datePart.split('-');
                const [hour, minute, second] = timePart.split(':');
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
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        const month = monthNames[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        
        let hours = date.getHours();
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        
        return `${month} ${day}, ${year} at ${hours}:${minutes} ${ampm}`;
    } catch (e) {
        console.error('Date parsing error:', e);
        return dateString;
    }
}

function formatDateOnly(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString;
        }
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.error('Date parsing error:', e);
        return dateString;
    }
}

// ==================== SORTING FUNCTIONS ====================
function sortActiveApplications(applications) {
    const statusOrder = {
        'Request Sent': 1,
        'Pending': 2,
        'Approved': 3
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

// ===============================
// REFRESH ADMIN INFO FROM SESSION
// ===============================
async function refreshAdminInfo() {
    adminUsername = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found in session");
        return false;
    }
    
    try {
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (response.ok) {
            const profile = await response.json();
            adminId = profile.id || profile.admin_id;
            adminArea = profile.area || '';
            adminCity = profile.city || profile.area || '';
            
            if (adminId) {
                localStorage.setItem("adminId", adminId);
                sessionStorage.setItem("adminId", adminId);
            }
            if (adminArea) {
                localStorage.setItem("adminArea", adminArea);
                sessionStorage.setItem("adminArea", adminArea);
            }
            if (adminCity) {
                localStorage.setItem("adminCity", adminCity);
                sessionStorage.setItem("adminCity", adminCity);
            }
            
            console.log("Admin info refreshed:", { adminUsername, adminArea, adminCity });
            return true;
        }
    } catch (error) {
        console.error("Error refreshing admin info:", error);
    }
    return false;
}

// ===============================
// MANUAL REFRESH DETECTION
// ===============================
let isManualRefresh = false;

function detectPageRefresh() {
    if (performance && performance.getEntriesByType) {
        const navigationEntries = performance.getEntriesByType('navigation');
        if (navigationEntries.length > 0) {
            const navEntry = navigationEntries[0];
            if (navEntry.type === 'reload') {
                console.log("Page was manually reloaded");
                isManualRefresh = true;
                clearApplicationsCache();
            }
        }
    }
    
    if (performance && performance.navigation) {
        if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
            console.log("Page was reloaded via legacy API");
            isManualRefresh = true;
            clearApplicationsCache();
        }
    }
}

function trackPageLoads() {
    const lastLoadTime = sessionStorage.getItem('admin_last_load_time');
    const now = new Date().getTime();
    
    if (lastLoadTime && (now - parseInt(lastLoadTime)) < 2000) {
        console.log("Quick successive load detected - likely a refresh");
        isManualRefresh = true;
        clearApplicationsCache();
    }
    
    sessionStorage.setItem('admin_last_load_time', now.toString());
}

// ===============================
// UI CONTROL FUNCTIONS
// ===============================
function showLoading() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (noData) noData.style.display = "none";
    if (rejectedCard) rejectedCard.style.display = "none";
    
    if (appsTableBody) {
        if (!loadingRow) {
            appsTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="9">
                        <div class="loading-container">
                            <div class="spinner"></div>
                            <p>Loading applications...</p>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            loadingRow.style.display = "table-row";
        }
    }
    
    if (appTable) appTable.style.display = "table";
    if (paginationContainer) paginationContainer.style.display = "none";
    if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
}

function showTable() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (appTable) appTable.style.display = "table";
    if (noData) noData.style.display = "none";
}

function showNoData() {
    const appTable = document.getElementById("applicationsTable");
    const loadingRow = document.querySelector("#applicationsBody .loading-row");
    
    if (loadingRow) loadingRow.style.display = "none";
    if (appTable) appTable.style.display = "none";
    if (noData) noData.style.display = "block";
    if (paginationContainer) paginationContainer.style.display = "none";
}

// ===============================
// SESSION CACHE MANAGEMENT
// ===============================
const CACHE_KEY = 'admin_applications_cache';
const CACHE_TIMESTAMP_KEY = 'admin_applications_timestamp';
const CACHE_DURATION = 5 * 60 * 1000;

function isCacheValid() {
    if (isManualRefresh) {
        console.log("Manual refresh detected - cache skipped");
        return false;
    }
    
    const cachedTimestamp = sessionStorage.getItem(CACHE_TIMESTAMP_KEY);
    if (!cachedTimestamp) return false;
    
    const now = new Date().getTime();
    const cacheAge = now - parseInt(cachedTimestamp);
    
    return cacheAge < CACHE_DURATION;
}

function saveApplicationsToCache(applications) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(applications));
        sessionStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
        console.log("Applications cached successfully");
    } catch (error) {
        console.error("Error saving to cache:", error);
    }
}

function loadApplicationsFromCache() {
    try {
        const cachedApplications = sessionStorage.getItem(CACHE_KEY);
        if (cachedApplications) {
            const applications = JSON.parse(cachedApplications);
            console.log("Applications loaded from cache");
            return applications;
        }
    } catch (error) {
        console.error("Error loading from cache:", error);
    }
    return null;
}

function clearApplicationsCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(CACHE_TIMESTAMP_KEY);
    console.log("Applications cache cleared");
}

// ===============================
// CHECK FOR ADMIN REFRESH FLAG
// ===============================
function checkForAdminRefreshFlag() {
    const shouldRefresh = sessionStorage.getItem('refresh_admin_applications');
    if (shouldRefresh === 'true') {
        console.log("Admin refresh flag detected - superadmin approved/rejected an application");
        sessionStorage.removeItem('refresh_admin_applications');
        clearApplicationsCache();
        isManualRefresh = true;
        return true;
    }
    return false;
}

// ===============================
// STORE ADMIN INFO
// ===============================
function storeAdminInfo(profile) {
    if (profile.id) {
        adminId = profile.id;
        localStorage.setItem("adminId", profile.id);
        sessionStorage.setItem("adminId", profile.id);
    }
    if (profile.area) {
        adminArea = profile.area;
        localStorage.setItem("adminArea", profile.area);
        sessionStorage.setItem("adminArea", profile.area);
    }
    if (profile.city) {
        adminCity = profile.city;
        localStorage.setItem("adminCity", profile.city);
        sessionStorage.setItem("adminCity", profile.city);
    }
    if (profile.username) {
        adminUsername = profile.username;
        localStorage.setItem("adminUsername", profile.username);
        sessionStorage.setItem("adminUsername", profile.username);
    }
}

// ===============================
// PAGINATION FUNCTIONS FOR ACTIVE TABLE
// ===============================
function renderPaginationControls(totalPages, totalItems) {
    if (!paginationContainer) return;
    
    if (totalItems === 0 || totalPages === 0) {
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

// ===============================
// PAGINATION FUNCTIONS FOR REJECTED TABLE
// ===============================
function renderRejectedPaginationControls(totalPages, totalItems) {
    if (!rejectedPaginationContainer) return;
    
    if (totalItems === 0 || totalPages === 0) {
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
        showNoData();
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

// ===============================
// RENDER ACTIVE APPLICATIONS - WITH PROPER CASE
// ===============================
function renderApplications(data) {
    if (!appsTableBody) return;
    
    appsTableBody.innerHTML = "";

    if (!data || data.length === 0) {
        showNoData();
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
        return;
    }

    let activeCount = 0;
    const sortedData = sortActiveApplications(data);

    sortedData.forEach(app => {
        const status = app.status || "Pending";
        const statusLower = status.toLowerCase();

        let statusClass = "";
        if (statusLower === "pending") statusClass = "status-pending";
        else if (statusLower === "approved") statusClass = "status-approved";
        else if (statusLower === "request sent") statusClass = "status-request-sent";

        const formattedDateTime = formatDateTime(app.date_submitted);
        const formattedBirthdate = formatDateOnly(app.birthdate);

        // ✅ APPLY PROPER CASE - email lang ang hindi naka-proper case
        const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.trim();
        const barangay = toProperCase(app.barangay || 'N/A');
        const city = toProperCase(app.city || 'N/A');
        const email = app.email || '';
        const applicationNumber = app.application_number || 'N/A';

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        `;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(applicationNumber)}</td>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${formattedDateTime}</td>
            <td>${escapeHtml(barangay)}</td>
            <td>${escapeHtml(city)}</td>
            <td>${formattedBirthdate}</td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
            <td>${actionButtons}</td>
        `;
        appsTableBody.appendChild(row);
        activeCount++;
    });

    const appCountSpan = document.getElementById("applicationCount");
    if (appCountSpan) appCountSpan.textContent = activeCount;

    showTable();
    attachButtonEvents();
}

// ===============================
// RENDER REJECTED APPLICATIONS - FIXED
// ===============================
function renderRejectedApplications(data) {
    if (!rejectedTableBody) return;
    
    rejectedTableBody.innerHTML = "";

    if (!data || data.length === 0) {
        // Huwag i-hide ang buong card
        const rejectedTable = document.getElementById("rejectedApplicationsTable");
        if (rejectedTable) rejectedTable.style.display = "none";
        
        const rejectedCountSpan = document.getElementById("rejectedCount");
        if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
        
        // I-show ang no data message sa loob ng card
        const noRejectedDataEl = document.getElementById("noRejectedData");
        if (noRejectedDataEl) {
            noRejectedDataEl.style.display = "block";
        }
        
        // SIGURADUHIN NA VISIBLE ANG CARD
        const rejectedCardElement = document.getElementById("rejectedCard");
        if (rejectedCardElement) rejectedCardElement.style.display = "block";
        
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        return;
    }

    // I-show ang card at table
    const rejectedCardElement = document.getElementById("rejectedCard");
    if (rejectedCardElement) rejectedCardElement.style.display = "block";
    
    const rejectedTable = document.getElementById("rejectedApplicationsTable");
    if (rejectedTable) rejectedTable.style.display = "table";
    
    const noRejectedDataEl = document.getElementById("noRejectedData");
    if (noRejectedDataEl) noRejectedDataEl.style.display = "none";
    
    const rejectedCountSpan = document.getElementById("rejectedCount");
    if (rejectedCountSpan) rejectedCountSpan.textContent = data.length;

    // I-render ang data
    data.forEach(app => {
        const status = app.status || "Rejected";
        let statusClass = "status-rejected";
        
        let rejectionReason = app.rejection_reason ? toProperCase(app.rejection_reason) : "No reason provided";

        const formattedDateTime = formatDateTime(app.date_submitted);
        const formattedBirthdate = formatDateOnly(app.birthdate);

        const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.trim();
        const barangay = toProperCase(app.barangay || 'N/A');
        const city = toProperCase(app.city || 'N/A');
        const email = app.email || '';
        const applicationNumber = app.application_number || 'N/A';

        const actionButtons = `
            <div class="action-buttons">
                <button class="btn-view" data-id="${app.id}">
                    <i class="fas fa-eye"></i> View
                </button>
            </div>
        `;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${escapeHtml(applicationNumber)}</td>
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${formattedDateTime}</td>
            <td>${escapeHtml(barangay)}</td>
            <td>${escapeHtml(city)}</td>
            <td>${formattedBirthdate}</td>
            <td>${escapeHtml(rejectionReason)}</td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(status)}</span></td>
            <td>${actionButtons}</td>
        `;
        rejectedTableBody.appendChild(row);
    });
    
    attachButtonEvents();
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

// ===============================
// ATTACH BUTTON EVENTS
// ===============================
function attachButtonEvents() {
    document.querySelectorAll(".btn-view").forEach(btn => {
        btn.addEventListener("click", () => {
            window.location.href = `/admin/view-application/${btn.dataset.id}`;
        });
    });
}

// ===============================
// FETCH APPLICATIONS - WITH TAB ID
// ===============================
async function fetchApplications(forceRefresh = false) {
    // Refresh admin info from session
    await refreshAdminInfo();
    
    if (!adminUsername) {
        console.error("No admin username found");
        if (appsTableBody) {
            appsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Please login again. Admin username not found. <\/td><\/tr>`;
        }
        return;
    }
    
    if (forceRefresh || applicationsData.length === 0) {
        showLoading();
    }
    
    if (!forceRefresh && !isManualRefresh && isCacheValid()) {
        const cachedApplications = loadApplicationsFromCache();
        if (cachedApplications && cachedApplications.length > 0) {
            applicationsData = cachedApplications;
            applyFilters();
            console.log("Applications loaded from cache");
            return;
        }
    }
    
    try {
        const tabId = getTabId();
        console.log(`Fetching applications for admin: ${adminUsername}, tabId: ${tabId}`);
        const res = await fetch(`/api/admin/internet-applications?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || `HTTP ${res.status}`);
        }

        let data = await res.json();
        console.log("Received data:", data);
        
        applicationsData = data;
        
        if (!isManualRefresh) {
            saveApplicationsToCache(applicationsData);
        }
        
        applyFilters();
        console.log(`Loaded ${applicationsData.length} applications`);

    } catch (err) {
        console.error("Fetch error:", err);
        if (appsTableBody) {
            appsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:red;">Error: ${err.message}<\/td><\/tr>`;
        }
    } finally {
        isManualRefresh = false;
    }
}

// ===============================
// SEARCH & FILTER LOGIC - FIXED
// ===============================
function applyFilters() {
    if (activeDateSortFilter) {
        activeDateSort = activeDateSortFilter.value;
    }
    if (rejectedDateSortFilter) {
        rejectedDateSort = rejectedDateSortFilter.value;
    }
    
    const activeSearchTerm = activeSearchInput ? activeSearchInput.value.toLowerCase().trim() : "";
    const activeStatusValue = activeStatusFilter ? activeStatusFilter.value : "all";
    
    // ============ FILTER ACTIVE APPLICATIONS ============
    // ✅ FILTER OUT ARCHIVED APPLICATIONS (is_archived = 1)
    let activeFiltered = applicationsData.filter(app => 
        app.status !== "Rejected" && app.is_archived !== 1
    );
    
    if (activeSearchTerm) {
        activeFiltered = activeFiltered.filter(app => {
            const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.toLowerCase();
            const email = (app.email || '').toLowerCase();
            const appNumber = String(app.application_number || '').toLowerCase();
            const barangay = toProperCase(app.barangay || '').toLowerCase();
            const city = toProperCase(app.city || '').toLowerCase();
            
            return fullName.includes(activeSearchTerm) || 
                   email.includes(activeSearchTerm) || 
                   appNumber.includes(activeSearchTerm) ||
                   barangay.includes(activeSearchTerm) ||
                   city.includes(activeSearchTerm);
        });
    }
    
    if (activeStatusValue !== "all") {
        activeFiltered = activeFiltered.filter(app => 
            app.status && app.status.toLowerCase() === activeStatusValue.toLowerCase()
        );
    }
    
    filteredActiveData = sortActiveApplications(activeFiltered);
    
    // ============ FILTER REJECTED APPLICATIONS ============
    const rejectedSearchTerm = rejectedSearchInput ? rejectedSearchInput.value.toLowerCase().trim() : "";
    
    // ✅ FILTER OUT ARCHIVED APPLICATIONS (is_archived = 1)
    let rejectedFiltered = applicationsData.filter(app => 
        app.status === "Rejected" && app.is_archived !== 1
    );
    
    if (rejectedSearchTerm) {
        rejectedFiltered = rejectedFiltered.filter(app => {
            const fullName = `${toProperCase(app.first_name || '')} ${toProperCase(app.last_name || '')}`.toLowerCase();
            const email = (app.email || '').toLowerCase();
            const appNumber = String(app.application_number || '').toLowerCase();
            const barangay = toProperCase(app.barangay || '').toLowerCase();
            const city = toProperCase(app.city || '').toLowerCase();
            const reason = toProperCase(app.rejection_reason || '').toLowerCase();
            
            return fullName.includes(rejectedSearchTerm) || 
                   email.includes(rejectedSearchTerm) || 
                   appNumber.includes(rejectedSearchTerm) ||
                   barangay.includes(rejectedSearchTerm) ||
                   city.includes(rejectedSearchTerm) ||
                   reason.includes(rejectedSearchTerm);
        });
    }
    
    filteredRejectedData = sortRejectedApplications(rejectedFiltered);
    
    // ============ RESET PAGES ============
    currentPage = 1;
    currentRejectedPage = 1;
    
    // ============ RENDER ACTIVE TABLE ============
    const activeTotalItems = filteredActiveData.length;
    const activeTable = document.getElementById("applicationsTable");
    const activeNoData = document.getElementById("noData");
    
    if (activeTotalItems === 0) {
        if (activeTable) activeTable.style.display = "none";
        if (activeNoData) {
            activeNoData.style.display = "block";
            if (activeSearchTerm || activeStatusValue !== "all") {
                activeNoData.innerHTML = `
                    <div style="text-align: center; padding: 30px 20px;">
                        <i class="fas fa-search" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                        <p style="font-weight: 600; color: #1e293b; margin: 0;">No active applications match your search</p>
                        <p style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Try adjusting your search or filters</p>
                    </div>
                `;
            } else {
                activeNoData.innerHTML = `
                    <div style="text-align: center; padding: 30px 20px;">
                        <i class="fas fa-inbox" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                        <p style="font-weight: 600; color: #1e293b; margin: 0;">No active applications found</p>
                    </div>
                `;
            }
        }
        if (paginationContainer) paginationContainer.style.display = "none";
        const appCountSpan = document.getElementById("applicationCount");
        if (appCountSpan) appCountSpan.textContent = "0";
    } else {
        if (activeTable) activeTable.style.display = "table";
        if (activeNoData) activeNoData.style.display = "none";
        
        const activeTotalPages = Math.ceil(activeTotalItems / rowsPerPage);
        const startIndex = 0;
        const endIndex = Math.min(rowsPerPage, activeTotalItems);
        const pageData = filteredActiveData.slice(startIndex, endIndex);
        renderApplications(pageData);
        renderPaginationControls(activeTotalPages, activeTotalItems);
    }
    
    // ============ RENDER REJECTED TABLE ============
    const rejectedTotalItems = filteredRejectedData.length;
    const rejectedTable = document.getElementById("rejectedApplicationsTable");
    const rejectedNoData = document.getElementById("noRejectedData");
    const rejectedCardElement = document.getElementById("rejectedCard");
    
    if (rejectedTotalItems === 0) {
        if (rejectedTable) rejectedTable.style.display = "none";
        if (rejectedNoData) {
            rejectedNoData.style.display = "block";
            if (rejectedSearchTerm) {
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
        if (rejectedCardElement) rejectedCardElement.style.display = "block";
        if (rejectedPaginationContainer) rejectedPaginationContainer.style.display = "none";
        const rejectedCountSpan = document.getElementById("rejectedCount");
        if (rejectedCountSpan) rejectedCountSpan.textContent = "0";
    } else {
        if (rejectedTable) rejectedTable.style.display = "table";
        if (rejectedNoData) rejectedNoData.style.display = "none";
        if (rejectedCardElement) rejectedCardElement.style.display = "block";
        
        const rejectedTotalPages = Math.ceil(rejectedTotalItems / rejectedRowsPerPage);
        const startIndex = 0;
        const endIndex = Math.min(rejectedRowsPerPage, rejectedTotalItems);
        const pageData = filteredRejectedData.slice(startIndex, endIndex);
        renderRejectedApplications(pageData);
        renderRejectedPaginationControls(rejectedTotalPages, rejectedTotalItems);
    }
}

function setupSearchAndFilter() {
    if (activeSearchInput) activeSearchInput.addEventListener("input", applyFilters);
    if (activeStatusFilter) activeStatusFilter.addEventListener("change", applyFilters);
    if (activeDateSortFilter) {
        activeDateSortFilter.addEventListener("change", () => {
            activeDateSort = activeDateSortFilter.value;
            applyFilters();
        });
    }
    
    if (rejectedSearchInput) rejectedSearchInput.addEventListener("input", applyFilters);
    if (rejectedDateSortFilter) {
        rejectedDateSortFilter.addEventListener("change", () => {
            rejectedDateSort = rejectedDateSortFilter.value;
            applyFilters();
        });
    }
    
    const activeClearBtn = document.getElementById("activeClearSearch");
    if (activeClearBtn && activeSearchInput) {
        activeClearBtn.addEventListener("click", () => {
            activeSearchInput.value = "";
            applyFilters();
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
            applyFilters();
            rejectedClearBtn.style.display = "none";
        });
        
        rejectedSearchInput.addEventListener("input", () => {
            rejectedClearBtn.style.display = rejectedSearchInput.value ? "flex" : "none";
        });
    }
}

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

// ===============================
// PROFILE DROPDOWN
// ===============================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });

    window.addEventListener("click", e => {
        if (!profileBtn.contains(e.target)) {
            profileMenu.classList.remove("show");
        }
    });
}

async function loadProfile() {
    await refreshAdminInfo();
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
        // if (profileNameSpan) profileNameSpan.textContent = profile.username || profile.name || "Profile";
        
        storeAdminInfo(profile);
    } catch (err) {
        console.error("Error loading profile:", err);
        // Hindi na nagdi-display ng pangalan sa profile
        // const profileNameSpan = document.getElementById("profileName");
        // if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

// ===============================
// CHECK FOR CACHE-BUSTING
// ===============================
function checkForCacheBusting() {
    const urlParams = new URLSearchParams(window.location.search);
    const timestamp = urlParams.get('t');
    
    if (timestamp) {
        console.log("Cache-busting parameter detected, forcing refresh");
        clearApplicationsCache();
        isManualRefresh = true;
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        return true;
    }
    return false;
}

// ===============================
// KEYBOARD SHORTCUT DETECTION
// ===============================
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey && e.key === 'r') || (e.metaKey && e.key === 'r') || e.key === 'F5') {
        console.log("Refresh shortcut detected - clearing cache");
        isManualRefresh = true;
        clearApplicationsCache();
    }
});

// ===============================
// PAGE VISIBILITY & FOCUS HANDLERS
// ===============================
let lastRefreshTime = new Date().getTime();

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        const now = new Date().getTime();
        if (now - lastRefreshTime > 30000 && !isCacheValid()) {
            console.log("Page became visible and cache expired, fetching fresh data");
            clearApplicationsCache();
            fetchApplications(true);
            lastRefreshTime = now;
        }
    }
});

window.addEventListener('focus', function() {
    if (!isCacheValid()) {
        console.log("Cache expired, fetching fresh data");
        clearApplicationsCache();
        fetchApplications(true);
    }
});

window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log("Page loaded from bfcache");
        if (!isCacheValid()) {
            clearApplicationsCache();
            isManualRefresh = true;
            fetchApplications(true);
        }
    }
});

// ===============================
// HAMBURGER MENU TOGGLE
// ===============================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!sidebar) return;
    sidebar.classList.toggle('active');
    if (hamburger) hamburger.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

if (hamburger) hamburger.addEventListener('click', toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===============================
// MANUAL REFRESH FUNCTION
// ===============================
window.refreshApplications = function() {
    isManualRefresh = true;
    clearApplicationsCache();
    fetchApplications(true);
};

// ===============================
// INITIALIZE
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    // First, refresh admin info from session
    await refreshAdminInfo();
    
    detectPageRefresh();
    trackPageLoads();
    
    const hasCacheBuster = checkForCacheBusting();
    const hasRefreshFlag = checkForAdminRefreshFlag();
    
    if (hasCacheBuster || hasRefreshFlag) {
        console.log("Change detected, fetching fresh data");
        fetchApplications(true);
    } else {
        fetchApplications(isManualRefresh);
    }
    
    setupSearchAndFilter();
    lastRefreshTime = new Date().getTime();
    
    // Load profile
    loadProfile();
});

// ==================== VISIBILITY CHANGE - REFRESH ON TAB SWITCH ====================
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log('👁️ Tab became visible, refreshing applications...');
        await refreshAdminInfo();
        clearApplicationsCache();
        fetchApplications(true);
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