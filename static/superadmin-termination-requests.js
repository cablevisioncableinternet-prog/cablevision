// superadmin-termination-requests.js (OPTIMIZED WITH CACHE)

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

// ==================== CACHE SYSTEM ====================
const CACHE_KEY = "superadminTerminationRequests";
let lastDataHash = "";
let refreshInProgress = false;

function setCache(data) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Cache save failed:', e);
    }
}

function getCache() {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        return cache ? JSON.parse(cache) : null;
    } catch (e) {
        console.warn('Cache read failed:', e);
        return null;
    }
}

function clearCache() {
    localStorage.removeItem(CACHE_KEY);
    console.log("Termination requests cache cleared");
}

function generateHash(data) {
    try {
        return JSON.stringify(data);
    } catch (e) {
        return '';
    }
}

// ==================== HELPER: FORMAT PRICE ====================
function formatPrice(price) {
    if (!price) return '₱0';
    
    try {
        let priceStr = String(price);
        let cleanPrice = priceStr
            .replace(/[₱,]/g, '')
            .replace(/\/month.*$/i, '')
            .trim();
        
        const priceNum = parseFloat(cleanPrice);
        
        if (!isNaN(priceNum) && priceNum > 0) {
            return `₱${priceNum.toLocaleString()}`;
        }
        
        return '₱0';
    } catch (error) {
        console.error('Error formatting price:', error);
        return '₱0';
    }
}

// ==================== GLOBAL VARIABLES ====================
let currentRequests = [];
let currentPage = 1;
let itemsPerPage = 10;
let currentPendingRequest = null;
let currentSearchTerm = '';
let currentSortOrder = 'newest';
let autoRefreshInterval = null;


// ==================== HELPER: FORMAT DATE TIME 12-HOUR (UTC) ====================
function formatDateTime12Hour(dateString) {
    if (!dateString) return 'N/A';
    
    // Parse the date string as UTC
    const date = new Date(dateString + ' UTC');
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'  // Force UTC timezone
    };
    
    return date.toLocaleString('en-US', options);
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

// ==================== FILTER AND SORT FUNCTIONS ====================
function filterAndSortRequests() {
    let filtered = [...currentRequests];
    
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(req => 
            (req.customer_name && req.customer_name.toLowerCase().includes(searchLower)) ||
            (req.email && req.email.toLowerCase().includes(searchLower)) ||
            (req.contract_number && req.contract_number.toLowerCase().includes(searchLower)) ||
            (req.request_id && req.request_id.toLowerCase().includes(searchLower)) ||
            (req.termination_reason && req.termination_reason.toLowerCase().includes(searchLower))
        );
    }
    
    filtered.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return currentSortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    return filtered;
}

// ==================== UPDATE STATS ====================
function updateStats() {
    const pendingCount = currentRequests.length;
    const pendingSpan = document.getElementById('pendingCount');
    if (pendingSpan) pendingSpan.textContent = pendingCount;
}

// ==================== RENDER TABLE (OPTIMIZED) ====================
function renderTable() {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;
    
    const filtered = filterAndSortRequests();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const paginatedRequests = filtered.slice(start, start + itemsPerPage);
    
    const noDataDiv = document.getElementById('noData');
    const tableWrapper = document.querySelector('.table-wrapper');
    
    if (noDataDiv) {
        if (filtered.length === 0) {
            if (tableWrapper) tableWrapper.style.display = 'none';
            noDataDiv.style.display = 'block';
        } else {
            if (tableWrapper) tableWrapper.style.display = 'block';
            noDataDiv.style.display = 'none';
        }
    }
    
    if (paginatedRequests.length === 0) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6" style="padding: 20px 0;">
                    <div class="skeleton-row-loader">
                        <div class="skeleton-card">
                            <div class="skeleton-title"></div>
                            <div class="skeleton-line"></div>
                            <div class="skeleton-row">
                                <div class="skeleton-line skeleton-short"></div>
                                <div class="skeleton-line skeleton-short"></div>
                                <div class="skeleton-line skeleton-short"></div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        renderPagination(totalPages);
        return;
    }
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    
    paginatedRequests.forEach(req => {
        const row = document.createElement('tr');
        
        // Use UTC format for date
        const formattedDate = formatDateTime12Hour(req.created_at);
        
        const displayRequestId = req.request_id || `TR-${req.id}`;
        
        row.innerHTML = `
            <td><strong>${escapeHtml(displayRequestId)}</strong></td>
            <td>${escapeHtml(req.customer_name || 'N/A')}</td>
            <td>${escapeHtml(req.email || 'N/A')}</td>
            <td><span class="status-badge status-pending">${escapeHtml(req.current_plan || 'N/A')}</span></td>
            <td>${formattedDate}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="openViewModal(${req.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        `;
        fragment.appendChild(row);
    });
    
    // One DOM update
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
    
    renderPagination(totalPages);
}

// ==================== RENDER PAGINATION ====================
function renderPagination(totalPages) {
    const paginationContainer = document.getElementById('paginationControls');
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let html = '';
    
    html += `<button class="pagination-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i> Prev
    </button>`;
    
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
        html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    html += `<button class="pagination-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        Next <i class="fas fa-chevron-right"></i>
    </button>`;
    
    paginationContainer.innerHTML = html;
}

// ==================== CHANGE PAGE ====================
function changePage(page) {
    const filtered = filterAndSortRequests();
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
}

// ==================== CORE REFRESH FUNCTION ====================
async function performFullRefresh(showToastMsg = true, isManual = false) {
    if (refreshInProgress) {
        console.log(' Refresh already in progress, skipping...');
        return;
    }
    
    refreshInProgress = true;
    console.log(` ${isManual ? 'MANUAL' : 'AUTO'} refresh started...`);
    
    try {
        // Clear cache para siguradong fresh data
        clearCache();
        
        // Fetch fresh data
        const response = await fetch('/api/superadmin/termination-requests?t=' + Date.now());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const requests = await response.json();
        
        if (requests.error) {
            throw new Error(requests.error);
        }
        
        currentRequests = requests;
        setCache(requests);
        lastDataHash = generateHash(requests);
        updateStats();
        currentPage = 1;
        renderTable();
        
        console.log(` ${isManual ? 'MANUAL' : 'AUTO'} refresh completed. Total requests:`, currentRequests.length);
        
        if (showToastMsg && isManual) {
            showToast('Termination requests updated successfully!', 'success');
        }
        
    } catch (err) {
        console.error('Refresh error:', err);
        if (isManual) {
            showToast('Failed to refresh termination requests', 'error');
        }
    } finally {
        refreshInProgress = false;
        console.log(' Refresh completed');
    }
}

// ==================== LOAD REQUESTS (WITH CACHE) ====================
async function loadRequests(forceRefresh = false) {
    if (forceRefresh) {
        await performFullRefresh(true, true);
        return;
    }
    
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;
    
    // Show loading skeleton
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="6" style="padding: 20px 0;">
                <div class="skeleton-row-loader">
                    <div class="skeleton-card">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-row">
                            <div class="skeleton-line skeleton-short"></div>
                            <div class="skeleton-line skeleton-short"></div>
                            <div class="skeleton-line skeleton-short"></div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    `;
    
    try {
        // Check cache first
        const cached = getCache();
        
        if (cached && cached.length > 0) {
            console.log(" Loading termination requests from cache (super fast!)");
            currentRequests = cached;
            lastDataHash = generateHash(cached);
            updateStats();
            currentPage = 1;
            renderTable();
            
            // Background check for updates (non-blocking)
            setTimeout(async () => {
                console.log(" Background check for updates...");
                try {
                    const response = await fetch('/api/superadmin/termination-requests?t=' + Date.now());
                    if (response.ok) {
                        const requests = await response.json();
                        if (!requests.error) {
                            const newHash = generateHash(requests);
                            if (newHash !== lastDataHash) {
                                console.log(" Updates found in background! Updating table...");
                                currentRequests = requests;
                                setCache(requests);
                                lastDataHash = newHash;
                                updateStats();
                                currentPage = 1;
                                renderTable();
                                showToast("New termination requests available", "info");
                            } else {
                                console.log(" No updates found");
                            }
                        }
                    }
                } catch (err) {
                    console.log("Background check failed:", err);
                }
            }, 100);
            
        } else {
            // No cache - fetch from API
            console.log(" No cache found, fetching from API");
            const response = await fetch('/api/superadmin/termination-requests');
            const requests = await response.json();
            
            if (requests.error) {
                tbody.innerHTML = `<tr><td colspan="6" class="empty-row">${requests.error}</td></tr>`;
                return;
            }
            
            currentRequests = requests;
            setCache(requests);
            lastDataHash = generateHash(requests);
            updateStats();
            currentPage = 1;
            renderTable();
        }
        
    } catch (error) {
        console.error('Error loading requests:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="empty-row">Failed to load requests. Please refresh the page.</td></tr>`;
        showToast('Failed to load requests', 'error');
    }
}

// ==================== AUTO-REFRESH ====================
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    // Auto-refresh every 30 seconds (but uses cache check)
    autoRefreshInterval = setInterval(async function() {
        if (refreshInProgress) {
            console.log(' Auto-refresh skipped (refresh in progress)');
            return;
        }
        
        try {
            const response = await fetch('/api/superadmin/termination-requests?t=' + Date.now());
            if (response.ok) {
                const requests = await response.json();
                if (!requests.error) {
                    const newHash = generateHash(requests);
                    if (newHash !== lastDataHash) {
                        console.log(" Auto-refresh: New data detected!");
                        currentRequests = requests;
                        setCache(requests);
                        lastDataHash = newHash;
                        updateStats();
                        currentPage = 1;
                        renderTable();
                        showToast("New termination requests available", "info");
                    }
                }
            }
        } catch (err) {
            console.error("Auto-refresh error:", err);
        }
    }, 30000);
    
    console.log(' Auto-refresh started (every 30 seconds)');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log(' Auto-refresh stopped');
    }
}

// ==================== VIEW REQUEST MODAL ====================
let currentViewRequest = null;
let viewBalanceValue = 0;

function openViewModal(requestId) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentViewRequest = request;
    viewBalanceValue = 0;
    
    // Fill customer info
    const displayRequestId = request.request_id || `TR-${request.id}`;
    document.getElementById('viewCustomerName').textContent = request.customer_name || 'N/A';
    document.getElementById('viewCustomerEmail').textContent = request.email || 'N/A';
    document.getElementById('viewRequestId').textContent = displayRequestId;
    document.getElementById('viewContractNumber').textContent = request.contract_number || 'N/A';
    
    // Fill plan details
    document.getElementById('viewPlanName').textContent = request.current_plan || 'N/A';
    document.getElementById('viewPlanSpeed').textContent = (request.current_speed || 'N/A') + ' Mbps';
    document.getElementById('viewPlanPrice').textContent = formatPrice(request.current_price);
    
    // Fill reason
    document.getElementById('viewReason').innerHTML = `<p>${escapeHtml(request.termination_reason || 'No reason provided')}</p>`;
    
    // Reset balance input
    const balanceInput = document.getElementById('viewBalance');
    if (balanceInput) balanceInput.value = '';
    
    // Show modal
    const modal = document.getElementById('viewRequestModal');
    modal.classList.add('show');
}

function closeViewModal() {
    const modal = document.getElementById('viewRequestModal');
    modal.classList.remove('show');
    currentViewRequest = null;
}

// ==================== VIEW MODAL - APPROVE & REJECT ====================
function setupViewModalActions() {
    const approveBtn = document.getElementById('viewApproveBtn');
    const rejectBtn = document.getElementById('viewRejectBtn');
    const balanceInput = document.getElementById('viewBalance');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            if (!currentViewRequest) return;
            
            // Get balance from view modal
            viewBalanceValue = parseFloat(balanceInput.value) || 0;
            
            // Open approve confirmation modal
            openApproveModal(currentViewRequest.id, viewBalanceValue);
        });
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            if (!currentViewRequest) return;
            
            // Get balance from view modal
            viewBalanceValue = parseFloat(balanceInput.value) || 0;
            
            // Open reject confirmation modal
            openRejectModal(currentViewRequest.id, viewBalanceValue);
        });
    }
}

// ==================== UPDATED OPEN APPROVE MODAL ====================
function openApproveModal(requestId, preloadedBalance = null) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentPendingRequest = request;
    
    const customerInfoDiv = document.getElementById('approveCustomerInfo');
    const displayRequestId = request.request_id || `TR-${request.id}`;
    customerInfoDiv.innerHTML = `
        <p><strong><i class="fas fa-user"></i> Customer:</strong> ${escapeHtml(request.customer_name)}</p>
        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${escapeHtml(request.email)}</p>
        <p><strong><i class="fas fa-hashtag"></i> Request ID:</strong> ${escapeHtml(displayRequestId)}</p>
        <p><strong><i class="fas fa-file-contract"></i> Contract #:</strong> ${escapeHtml(request.contract_number || 'N/A')}</p>
        <p><strong><i class="fas fa-comment"></i> Reason:</strong> ${escapeHtml(request.termination_reason || 'N/A')}</p>
    `;
    
    // Display balance
    const balanceDisplay = document.getElementById('approveBalanceDisplay');
    const balanceToShow = preloadedBalance !== null ? preloadedBalance : viewBalanceValue;
    if (balanceDisplay) {
        balanceDisplay.textContent = `₱${balanceToShow.toFixed(2)}`;
    }
    
    const modal = document.getElementById('approveConfirmModal');
    modal.classList.add('show');
}

function closeApproveModal() {
    const modal = document.getElementById('approveConfirmModal');
    modal.classList.remove('show');
    currentPendingRequest = null;
}

// ==================== OPTIMIZED CONFIRM APPROVE (WITH INSTANT UI UPDATE) ====================
async function confirmApprove() {
    if (!currentPendingRequest) return;
    
    const requestId = currentPendingRequest.id;
    const balanceDisplay = document.getElementById('approveBalanceDisplay');
    const balanceText = balanceDisplay ? balanceDisplay.textContent.replace('₱', '').replace(/,/g, '') : '0';
    const balance = parseFloat(balanceText) || 0;
    
    const confirmBtn = document.getElementById('confirmApproveBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('/api/superadmin/approve-termination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                request_id: requestId,
                balance: balance
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message || 'Termination approved successfully!', 'success');
            
            // INSTANT UI UPDATE - remove the request from list agad
            const requestIndex = currentRequests.findIndex(r => r.id === requestId);
            if (requestIndex !== -1) {
                currentRequests.splice(requestIndex, 1);  // ← Remove agad
                setCache(currentRequests);                // ← Update cache
                lastDataHash = generateHash(currentRequests);
                updateStats();
                currentPage = 1;
                renderTable();                            // ← Re-render agad (mabilis)
            }
            
            closeApproveModal();
            closeViewModal();
            
            // BACKGROUND REFRESH (para ma-sync sa database, non-blocking)
            setTimeout(async () => {
                console.log(" Background sync after approve...");
                await performFullRefresh(false, false);  // Silent refresh
            }, 500);
            
        } else {
            showToast(data.error || 'Failed to approve request', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// ==================== UPDATED OPEN REJECT MODAL ====================
function openRejectModal(requestId, preloadedBalance = null) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentPendingRequest = request;
    
    const reasonSelect = document.getElementById('rejectReasonSelect');
    const customReason = document.getElementById('rejectCustomReason');
    if (reasonSelect) reasonSelect.value = '';
    if (customReason) customReason.style.display = 'none';
    
    const customerInfoDiv = document.getElementById('rejectCustomerInfo');
    const displayRequestId = request.request_id || `TR-${request.id}`;
    customerInfoDiv.innerHTML = `
        <p><strong><i class="fas fa-user"></i> Customer:</strong> ${escapeHtml(request.customer_name)}</p>
        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${escapeHtml(request.email)}</p>
        <p><strong><i class="fas fa-hashtag"></i> Request ID:</strong> ${escapeHtml(displayRequestId)}</p>
        <p><strong><i class="fas fa-file-contract"></i> Contract #:</strong> ${escapeHtml(request.contract_number || 'N/A')}</p>
        <p><strong><i class="fas fa-comment"></i> Reason:</strong> ${escapeHtml(request.termination_reason || 'N/A')}</p>
    `;
    
    // Display balance
    const balanceDisplay = document.getElementById('rejectBalanceDisplay');
    const balanceToShow = preloadedBalance !== null ? preloadedBalance : viewBalanceValue;
    if (balanceDisplay) {
        balanceDisplay.textContent = `₱${balanceToShow.toFixed(2)}`;
    }
    
    const modal = document.getElementById('rejectConfirmModal');
    modal.classList.add('show');
}

function closeRejectModal() {
    const modal = document.getElementById('rejectConfirmModal');
    modal.classList.remove('show');
    currentPendingRequest = null;
}

// ==================== OPTIMIZED CONFIRM REJECT (WITH INSTANT UI UPDATE) ====================
async function confirmReject() {
    if (!currentPendingRequest) return;
    
    let reason = document.getElementById('rejectReasonSelect').value;
    const customReason = document.getElementById('rejectCustomReason').value;
    
    if (reason === 'Other') {
        reason = customReason || 'Other';
    }
    
    if (!reason) {
        showToast('Please select or enter a reason for rejection', 'error');
        return;
    }
    
    const requestId = currentPendingRequest.id;
    const balanceDisplay = document.getElementById('rejectBalanceDisplay');
    const balanceText = balanceDisplay ? balanceDisplay.textContent.replace('₱', '').replace(/,/g, '') : '0';
    const balance = parseFloat(balanceText) || 0;
    
    const confirmBtn = document.getElementById('confirmRejectBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('/api/superadmin/reject-termination', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                request_id: requestId, 
                reason: reason,
                balance: balance
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Termination request has been rejected', 'success');
            
            // INSTANT UI UPDATE - remove the request from list agad
            const requestIndex = currentRequests.findIndex(r => r.id === requestId);
            if (requestIndex !== -1) {
                currentRequests.splice(requestIndex, 1);  // ← Remove agad
                setCache(currentRequests);                // ← Update cache
                lastDataHash = generateHash(currentRequests);
                updateStats();
                currentPage = 1;
                renderTable();                            // ← Re-render agad (mabilis)
            }
            
            closeRejectModal();
            closeViewModal();
            
            // BACKGROUND REFRESH (para ma-sync sa database, non-blocking)
            setTimeout(async () => {
                console.log(" Background sync after reject...");
                await performFullRefresh(false, false);  // Silent refresh
            }, 500);
            
        } else {
            showToast(data.error || 'Failed to reject request', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}


// ==================== SEARCH AND FILTER SETUP ====================
function setupSearchAndFilters() {
    const searchInput = document.getElementById('searchInput');
    const clearSearch = document.getElementById('clearSearch');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchTerm = e.target.value;
            currentPage = 1;
            renderTable();
            if (clearSearch) clearSearch.style.display = currentSearchTerm ? 'block' : 'none';
        });
    }
    
    if (clearSearch) {
        clearSearch.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                currentSearchTerm = '';
                currentPage = 1;
                renderTable();
                clearSearch.style.display = 'none';
            }
        });
    }
    
    const dateSortFilter = document.getElementById('dateSortFilter');
    if (dateSortFilter) {
        dateSortFilter.addEventListener('change', (e) => {
            currentSortOrder = e.target.value;
            currentPage = 1;
            renderTable();
        });
    }
}

// ==================== CUSTOM REASON TEXTAREA TOGGLE ====================
function setupRejectReasonToggle() {
    const rejectReason = document.getElementById('rejectReasonSelect');
    const customReason = document.getElementById('rejectCustomReason');
    
    if (rejectReason && customReason) {
        rejectReason.addEventListener('change', function() {
            customReason.style.display = this.value === 'Other' ? 'block' : 'none';
        });
    }
}

// ==================== HAMBURGER MENU TOGGLE ====================
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    console.log('Hamburger button:', hamburgerBtn);
    console.log('Sidebar element:', sidebar);
    console.log('Overlay element:', overlay);
    
    if (!hamburgerBtn) {
        console.error('Hamburger button not found!');
        return;
    }
    
    if (!sidebar) {
        console.error('Sidebar not found!');
        return;
    }
    
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        hamburgerBtn.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
        
        if (sidebar.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        
        console.log('Sidebar toggled. Active:', sidebar.classList.contains('active'));
    }
    
    hamburgerBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Hamburger clicked!');
        toggleSidebar();
    });
    
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            console.log('Overlay clicked!');
            toggleSidebar();
        });
    }
    
    // Auto-close sidebar when resizing to desktop size
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburgerBtn) hamburgerBtn.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
            console.log('Sidebar closed on resize');
        }
    });
}

// ==================== PROFILE DROPDOWN ====================
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileBtn.classList.toggle('active');
            profileMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', () => {
            profileMenu.classList.remove('show');
            if (profileBtn) profileBtn.classList.remove('active');
        });
    }
}

// ==================== LOAD PROFILE ====================
async function loadProfile() {
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "Super Admin";
    } catch (err) {
        console.error("Profile error:", err);
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = "";
    }
}

// ==================== LOGOUT ====================
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const closeLogoutModal = document.getElementById('closeLogoutModal');
    
    if (!logoutBtn || !logoutModal) return;
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        logoutModal.classList.add('show');
    });
    
    const closeModal = () => logoutModal.classList.remove('show');
    
    if (cancelLogout) cancelLogout.addEventListener('click', closeModal);
    if (closeLogoutModal) closeLogoutModal.addEventListener('click', closeModal);
    
    if (confirmLogout) {
        confirmLogout.addEventListener('click', () => {
            const tabId = getTabId();
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: tabId })
            }).catch(() => {});

            sessionStorage.clear();
            window.location.replace('/');
        });
    }
    
    window.addEventListener('click', (e) => {
        if (e.target === logoutModal) closeModal();
    });
}

// ==================== ESCAPE HTML ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== MODAL EVENT LISTENERS ====================
function setupModalEventListeners() {
    // View Modal
    const closeViewModalBtn = document.getElementById('closeViewModal');
    if (closeViewModalBtn) closeViewModalBtn.onclick = closeViewModal;
    
    // Approve Modal
    const closeApproveModalBtn = document.getElementById('closeApproveConfirmModal');
    const cancelApproveBtn = document.getElementById('cancelApproveBtn');
    const confirmApproveBtn = document.getElementById('confirmApproveBtn');
    
    if (closeApproveModalBtn) closeApproveModalBtn.onclick = closeApproveModal;
    if (cancelApproveBtn) cancelApproveBtn.onclick = closeApproveModal;
    if (confirmApproveBtn) confirmApproveBtn.onclick = confirmApprove;
    
    // Reject Modal
    const closeRejectModalBtn = document.getElementById('closeRejectConfirmModal');
    const cancelRejectBtn = document.getElementById('cancelRejectBtn');
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    
    if (closeRejectModalBtn) closeRejectModalBtn.onclick = closeRejectModal;
    if (cancelRejectBtn) cancelRejectBtn.onclick = closeRejectModal;
    if (confirmRejectBtn) confirmRejectBtn.onclick = confirmReject;
    
    // View Modal Actions
    setupViewModalActions();
    
    // Close modals on outside click
    window.addEventListener('click', (event) => {
        const viewModal = document.getElementById('viewRequestModal');
        const approveModal = document.getElementById('approveConfirmModal');
        const rejectModal = document.getElementById('rejectConfirmModal');
        if (event.target === viewModal) closeViewModal();
        if (event.target === approveModal) closeApproveModal();
        if (event.target === rejectModal) closeRejectModal();
    });
    
    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeViewModal();
            closeApproveModal();
            closeRejectModal();
        }
    });
}

// ==================== KEYBOARD SHORTCUT: CTRL+R ====================
document.addEventListener("keydown", function(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        const target = event.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
            event.preventDefault();
            console.log(' Ctrl+R detected - performing manual refresh');
            performFullRefresh(true, true);
        }
    }
});

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async () => {
    // SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    setupHamburgerMenu();
    setupProfileDropdown();
    loadProfile();
    setupLogout();
    setupSearchAndFilters();
    setupRejectReasonToggle();
    setupModalEventListeners();
    
    // LOAD WITH CACHE
    await loadRequests(false);
    
    // INITIALIZE NOTIFICATION SYSTEM
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
        console.log(" Notification system initialized for termination-requests page");
    } else {
        console.warn(" NotificationSystem not found!");
    }
    
    // START AUTO-REFRESH (30 seconds)
    startAutoRefresh();
});