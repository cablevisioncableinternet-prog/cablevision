// superadmin-plan-requests.js

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

// ==================== FILTER AND SORT FUNCTIONS ====================
function filterAndSortRequests() {
    let filtered = [...currentRequests];
    
    if (currentSearchTerm) {
        const searchLower = currentSearchTerm.toLowerCase();
        filtered = filtered.filter(req => 
            (req.customer_name && req.customer_name.toLowerCase().includes(searchLower)) ||
            (req.email && req.email.toLowerCase().includes(searchLower)) ||
            (req.contract_number && req.contract_number.toLowerCase().includes(searchLower)) ||
            (req.request_id && req.request_id.toLowerCase().includes(searchLower))
        );
    }
    
    filtered.sort((a, b) => {
        const dateA = new Date(a.requested_at || a.created_at);
        const dateB = new Date(b.requested_at || b.created_at);
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

// ==================== RENDER TABLE ====================
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
                <td colspan="8" style="text-align: center; padding: 48px 20px;">
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p>Loading requests...</p>
                    </div>
                </td>
            </tr>
        `;
        renderPagination(totalPages);
        return;
    }
    
    tbody.innerHTML = '';
    
    paginatedRequests.forEach(req => {
        const row = document.createElement('tr');
        
        const requestedDate = req.requested_at || req.created_at;
        const date = requestedDate ? new Date(requestedDate) : new Date();
        const formattedDate = date.toLocaleString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const displayRequestId = req.request_id || `REQ-${req.id}`;
        
        row.innerHTML = `
            <td><strong>${escapeHtml(displayRequestId)}</strong></td>
            <td>${escapeHtml(req.customer_name || 'N/A')}</td>
            <td>${escapeHtml(req.email || 'N/A')}</td>
            <td><span class="status-badge status-pending">${escapeHtml(req.current_plan || 'N/A')}</span></td>
            <td><span class="status-badge status-approved">${escapeHtml(req.requested_plan || 'N/A')}</span></td>
            <td>${formattedDate}</td>
            <td><strong>${formatPrice(req.requested_price)}</strong></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-view" onclick="openViewModal(${req.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
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

// ==================== LOAD REQUESTS ====================
async function loadRequests() {
    const tbody = document.getElementById('requestsBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="8">
                <div class="loading-container">
                    <div class="spinner"></div>
                    <p>Loading requests...</p>
                </div>
              </tr>
        `;
    
    try {
        console.log("Fetching plan change requests...");
        const response = await fetch('/api/superadmin/plan-requests');
        const requests = await response.json();
        
        console.log("Response:", requests);
        
        if (requests.error) {
            tbody.innerHTML = `<tr><td colspan="8" class="empty-row">${requests.error}</td></tr>`;
            return;
        }
        
        currentRequests = requests;
        updateStats();
        currentPage = 1;
        renderTable();
        
    } catch (error) {
        console.error('Error loading requests:', error);
        tbody.innerHTML = `<tr><td colspan="8" class="empty-row">Failed to load requests. Please refresh the page.</td></tr>`;
        showToast('Failed to load requests', 'error');
    }
}


// ==================== VIEW REQUEST MODAL ====================
let currentViewRequest = null;

function openViewModal(requestId) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentViewRequest = request;
    
    // Fill customer info
    const displayRequestId = request.request_id || `REQ-${request.id}`;
    document.getElementById('viewCustomerName').textContent = request.customer_name || 'N/A';
    document.getElementById('viewCustomerEmail').textContent = request.email || 'N/A';
    document.getElementById('viewRequestId').textContent = displayRequestId;
    document.getElementById('viewContractNumber').textContent = request.contract_number || 'N/A';
    
    // Fill current plan details
    document.getElementById('viewCurrentPlanName').textContent = request.current_plan || 'N/A';
    document.getElementById('viewCurrentPlanSpeed').textContent = (request.current_speed || 'N/A') + ' Mbps';
    document.getElementById('viewCurrentPlanPrice').textContent = formatPrice(request.current_price);
    
    // Fill requested plan details
    document.getElementById('viewRequestedPlanName').textContent = request.requested_plan || 'N/A';
    document.getElementById('viewRequestedPlanSpeed').textContent = (request.requested_speed || 'N/A') + ' Mbps';
    document.getElementById('viewRequestedPlanPrice').textContent = formatPrice(request.requested_price);
    
    // Show modal
    const modal = document.getElementById('viewRequestModal');
    modal.classList.add('show');
}

function closeViewModal() {
    const modal = document.getElementById('viewRequestModal');
    modal.classList.remove('show');
    currentViewRequest = null;
    
    // ✅ ISARA RIN ANG MGA CONFIRMATION MODALS KUNG NAKABUKAS
    const approveModal = document.getElementById('approveConfirmModal');
    const rejectModal = document.getElementById('rejectConfirmModal');
    if (approveModal.classList.contains('show')) {
        approveModal.classList.remove('show');
    }
    if (rejectModal.classList.contains('show')) {
        rejectModal.classList.remove('show');
    }
    
    // ✅ I-REMOVE ANG BODY CLASS
    document.body.classList.remove('modal-open');
    currentPendingRequest = null;
}

// ==================== VIEW MODAL - APPROVE & REJECT ====================
function setupViewModalActions() {
    const approveBtn = document.getElementById('viewApproveBtn');
    const rejectBtn = document.getElementById('viewRejectBtn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', function() {
            if (!currentViewRequest) return;
            openApproveModal(currentViewRequest.id);
        });
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', function() {
            if (!currentViewRequest) return;
            openRejectModal(currentViewRequest.id);
        });
    }
}



// ==================== OPEN APPROVE MODAL ====================
function openApproveModal(requestId) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentPendingRequest = request;
    
    const customerInfoDiv = document.getElementById('approveCustomerInfo');
    const displayRequestId = request.request_id || `REQ-${request.id}`;
    customerInfoDiv.innerHTML = `
        <p><strong><i class="fas fa-user"></i> Customer:</strong> ${escapeHtml(request.customer_name)}</p>
        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${escapeHtml(request.email)}</p>
        <p><strong><i class="fas fa-hash-tag"></i> Request ID:</strong> ${escapeHtml(displayRequestId)}</p>
        <p><strong><i class="fas fa-file-contract"></i> Contract #:</strong> ${escapeHtml(request.contract_number || 'N/A')}</p>
    `;
    
    // ✅ BAGONG DESIGN - REQUESTED PLAN LANG ANG IPAPAKITA
    const planSummaryDiv = document.getElementById('approvePlanSummary');
    planSummaryDiv.innerHTML = `
        <div style="background: #f0fdf4; border: 2px solid #22c55e; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
                <i class="fas fa-exchange-alt" style="color: #22c55e; font-size: 20px;"></i>
                <span style="font-weight: 700; font-size: 14px; color: #166534;">REQUESTED PLAN</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center;">
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Plan Name</div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${escapeHtml(request.requested_plan || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Speed</div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${escapeHtml(request.requested_speed || 'N/A')} Mbps</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Monthly Price</div>
                    <div style="font-size: 16px; font-weight: 800; color: #16a34a; margin-top: 2px;">${formatPrice(request.requested_price)}</div>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('approveConfirmModal');
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeApproveModal() {
    const modal = document.getElementById('approveConfirmModal');
    modal.classList.remove('show');
    currentPendingRequest = null;
    
    // ✅ I-REMOVE ANG BODY CLASS KUNG WALA NANG NAKABUKAS NA MODAL
    const viewModal = document.getElementById('viewRequestModal');
    const rejectModal = document.getElementById('rejectConfirmModal');
    if (!viewModal.classList.contains('show') && !rejectModal.classList.contains('show')) {
        document.body.classList.remove('modal-open');
    }
}

async function confirmApprove() {
    if (!currentPendingRequest) return;
    
    const requestId = currentPendingRequest.id;
    const confirmBtn = document.getElementById('confirmApproveBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('/api/superadmin/approve-plan-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message || 'Request approved successfully!', 'success');
            // ✅ ISARA ANG LAHAT NG MODALS
            closeApproveModal();
            closeViewModal();
            loadRequests();
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

// ==================== OPEN REJECT MODAL ====================
function openRejectModal(requestId) {
    const request = currentRequests.find(r => r.id === requestId);
    if (!request) return;
    
    currentPendingRequest = request;
    
    const reasonSelect = document.getElementById('rejectReasonSelect');
    const customReason = document.getElementById('rejectCustomReason');
    if (reasonSelect) reasonSelect.value = '';
    if (customReason) customReason.style.display = 'none';
    
    const customerInfoDiv = document.getElementById('rejectCustomerInfo');
    const displayRequestId = request.request_id || `REQ-${request.id}`;
    customerInfoDiv.innerHTML = `
        <p><strong><i class="fas fa-user"></i> Customer:</strong> ${escapeHtml(request.customer_name)}</p>
        <p><strong><i class="fas fa-envelope"></i> Email:</strong> ${escapeHtml(request.email)}</p>
        <p><strong><i class="fas fa-hash-tag"></i> Request ID:</strong> ${escapeHtml(displayRequestId)}</p>
        <p><strong><i class="fas fa-file-contract"></i> Contract #:</strong> ${escapeHtml(request.contract_number || 'N/A')}</p>
    `;
    
    // ✅ BAGONG DESIGN - REQUESTED PLAN LANG ANG IPAPAKITA
    const planSummaryDiv = document.getElementById('rejectPlanSummary');
    planSummaryDiv.innerHTML = `
        <div style="background: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 16px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
                <i class="fas fa-exchange-alt" style="color: #ef4444; font-size: 20px;"></i>
                <span style="font-weight: 700; font-size: 14px; color: #991b1b;">REQUESTED PLAN</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; text-align: center;">
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Plan Name</div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${escapeHtml(request.requested_plan || 'N/A')}</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Speed</div>
                    <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px;">${escapeHtml(request.requested_speed || 'N/A')} Mbps</div>
                </div>
                <div>
                    <div style="font-size: 11px; color: #6b7280; font-weight: 600;">Monthly Price</div>
                    <div style="font-size: 16px; font-weight: 800; color: #dc2626; margin-top: 2px;">${formatPrice(request.requested_price)}</div>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.getElementById('rejectConfirmModal');
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

function closeRejectModal() {
    const modal = document.getElementById('rejectConfirmModal');
    modal.classList.remove('show');
    currentPendingRequest = null;
    
    // ✅ I-REMOVE ANG BODY CLASS KUNG WALA NANG NAKABUKAS NA MODAL
    const viewModal = document.getElementById('viewRequestModal');
    const approveModal = document.getElementById('approveConfirmModal');
    if (!viewModal.classList.contains('show') && !approveModal.classList.contains('show')) {
        document.body.classList.remove('modal-open');
    }
}

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
    const confirmBtn = document.getElementById('confirmRejectBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetch('/api/superadmin/reject-plan-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request_id: requestId, reason: reason })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Request has been rejected', 'success');
            // ✅ ISARA ANG LAHAT NG MODALS
            closeRejectModal();
            closeViewModal();
            loadRequests();
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

// ==================== HAMBURGER MENU ====================
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!hamburgerBtn || !sidebar) return;
    
    hamburgerBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    });
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
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
    
    // ✅ CLOSE MODALS ON OUTSIDE CLICK - PERO HINDI ISASARA ANG VIEW MODAL KUNG MAY CONFIRMATION MODAL
    window.addEventListener('click', (event) => {
        const viewModal = document.getElementById('viewRequestModal');
        const approveModal = document.getElementById('approveConfirmModal');
        const rejectModal = document.getElementById('rejectConfirmModal');
        
        // ✅ KUNG MAY CONFIRMATION MODAL NA NAKABUKAS, HUWAG ISARA ANG VIEW MODAL
        if (approveModal.classList.contains('show') || rejectModal.classList.contains('show')) {
            // Confirmation modal lang ang isasara kung sa labas nag-click
            if (event.target === approveModal) closeApproveModal();
            if (event.target === rejectModal) closeRejectModal();
            return;
        }
        
        // ✅ KUNG WALANG CONFIRMATION MODAL, ISARA ANG VIEW MODAL
        if (event.target === viewModal) closeViewModal();
    });
    
    // Escape key - isara ang pinaka-top na modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const approveModal = document.getElementById('approveConfirmModal');
            const rejectModal = document.getElementById('rejectConfirmModal');
            
            // ✅ UNAHIN ANG CONFIRMATION MODAL (NASA HARAP)
            if (approveModal.classList.contains('show')) {
                closeApproveModal();
            } else if (rejectModal.classList.contains('show')) {
                closeRejectModal();
            } else {
                closeViewModal();
            }
        }
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async () => {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    setupHamburgerMenu();
    setupProfileDropdown();
    loadProfile();
    setupLogout();
    setupSearchAndFilters();
    setupRejectReasonToggle();
    setupModalEventListeners();
    loadRequests();
    
    // ✅ IDAGDAG ITO - INITIALIZE NOTIFICATION SYSTEM
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

setInterval(() => {
    loadRequests();
}, 30000);