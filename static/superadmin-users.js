// ==================== HAMBURGER MENU TOGGLE ====================
// ILAGAY ITO SA PINAKA-UNANG PART NG JS FILE
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
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
    
    // Auto-close sidebar when resizing to desktop size
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768 && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

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

// ====================================================================
// USER MANAGEMENT CODE
// ====================================================================

let usersData = [];
const CACHE_KEY = "superadminUsers";
let pendingAction = null;


// ==================== BALANCE INPUT VALIDATION ====================
function setupBalanceInputValidation() {
    const balanceInput = document.getElementById('balanceInput');
    if (!balanceInput) return;

    // Function to validate and format balance input
    function validateBalanceInput(value) {
        // Remove any non-numeric characters except decimal point
        let cleaned = value.replace(/[^0-9.]/g, '');
        
        // Prevent multiple decimal points
        const parts = cleaned.split('.');
        if (parts.length > 2) {
            cleaned = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limit to 2 decimal places
        if (parts.length === 2 && parts[1].length > 2) {
            cleaned = parts[0] + '.' + parts[1].substring(0, 2);
        }
        
        // Remove leading zeros (except for "0.")
        if (cleaned.length > 1 && cleaned.startsWith('0') && !cleaned.startsWith('0.')) {
            cleaned = cleaned.replace(/^0+/, '');
            if (cleaned === '' || cleaned === '.') cleaned = '0';
        }
        
        // If starting with decimal point, add 0
        if (cleaned.startsWith('.')) {
            cleaned = '0' + cleaned;
        }
        
        return cleaned;
    }

    // Input event - validate as user types
    balanceInput.addEventListener('input', function(e) {
        const rawValue = this.value;
        const validated = validateBalanceInput(rawValue);
        
        if (validated !== rawValue) {
            this.value = validated;
            // Place cursor at end
            const len = this.value.length;
            this.setSelectionRange(len, len);
        }
        
        // Remove error class if value is valid
        if (this.value && this.value !== '' && this.value !== '.') {
            this.classList.remove('field-error');
            const errorMsg = document.getElementById('balanceError');
            if (errorMsg) errorMsg.style.display = 'none';
        }
    });

    // Prevent paste of invalid characters
    balanceInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const validated = validateBalanceInput(pastedText);
        if (validated) {
            this.value = validated;
            const len = this.value.length;
            this.setSelectionRange(len, len);
        }
    });

    // Blur event - final cleanup
    balanceInput.addEventListener('blur', function() {
        if (this.value && this.value !== '') {
            // If ends with decimal point, remove it
            if (this.value.endsWith('.')) {
                this.value = this.value.slice(0, -1);
            }
        }
    });

    // Function to get validated balance value
    window.getValidatedBalance = function() {
        const input = document.getElementById('balanceInput');
        if (!input) return 0;
        
        const value = input.value.trim();
        if (!value || value === '' || value === '.') return 0;
        
        const num = parseFloat(value);
        if (isNaN(num) || num < 0) return 0;
        
        return num;
    };

    // Add error message element
    const balanceField = document.getElementById('balanceField');
    if (balanceField) {
        const errorMsg = document.createElement('div');
        errorMsg.id = 'balanceError';
        errorMsg.className = 'balance-error';
        errorMsg.style.cssText = 'color: #dc2626; font-size: 12px; margin-top: 6px; display: none;';
        errorMsg.textContent = 'Please enter a valid positive number (e.g., 150.50)';
        balanceField.appendChild(errorMsg);
    }

    console.log('✅ Balance input validation setup complete');
}


// ================= CACHE =================
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
  console.log("Users cache cleared");
}

// ==================== CHECK FOR PENDING USER CREATION ====================
function checkForPendingUserCreation() {
  const pendingCreation = sessionStorage.getItem('pending_user_creation');
  if (pendingCreation === 'true') {
    console.log("📢 Found pending user creation flag - forcing refresh");
    sessionStorage.removeItem('pending_user_creation');
    return true;
  }
  return false;
}

// ==================== CROSS-TAB NOTIFICATION LISTENER ====================
let isRefreshing = false;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 2000;

function setupCrossTabNotification() {
  console.log("Setting up cross-tab notification listener...");
  
  window.addEventListener('storage', (event) => {
    if (event.key === 'app_notification' && event.newValue) {
      try {
        const notification = JSON.parse(event.newValue);
        
        if (notification.type === 'USER_CREATED') {
          console.log("📢 Received user creation notification from another tab!", notification);
          sessionStorage.setItem('pending_user_creation', 'true');
          
          const now = Date.now();
          if (now - lastRefreshTime > REFRESH_COOLDOWN && !isRefreshing) {
            performFullRefresh(true, true);
            lastRefreshTime = now;
          }
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    }
  });
}

function showRefreshNotification() {
  const notification = document.createElement('div');
  notification.textContent = '🔄 Refreshing user list...';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    font-size: 14px;
    font-weight: 500;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// ================= UI CONTROL =================
function showLoading(show = true) {
  const loadingRow = document.querySelector(".loading-row");
  const noDataEl = document.getElementById("noData");
  const table = document.querySelector("#usersTable");
  
  if (show) {
    if (loadingRow) loadingRow.style.display = "table-row";
    if (noDataEl) noDataEl.style.display = "none";
    if (table) table.style.display = "none";
  } else {
    if (loadingRow) loadingRow.style.display = "none";
  }
}

function showTable() {
  const loadingRow = document.querySelector(".loading-row");
  const noDataEl = document.getElementById("noData");
  const table = document.querySelector("#usersTable");
  
  if (loadingRow) loadingRow.style.display = "none";
  if (noDataEl) noDataEl.style.display = "none";
  if (table) table.style.display = "table";
}

function showNoData() {
  const loadingRow = document.querySelector(".loading-row");
  const noDataEl = document.getElementById("noData");
  const table = document.querySelector("#usersTable");
  
  if (loadingRow) loadingRow.style.display = "none";
  if (noDataEl) noDataEl.style.display = "block";
  if (table) table.style.display = "none";
}

// ================= SHOW STATUS MODAL (ENHANCED WITH RED THEME) =================
function showStatusModal(userId, currentStatus) {
  const modal = document.getElementById("statusModal");
  const modalContent = modal?.querySelector('.modal-content');
  const title = document.getElementById("statusTitle");
  const text = document.getElementById("statusText");
  const icon = document.getElementById("statusModalIcon");
  const balanceField = document.getElementById("balanceField");
  const balanceInput = document.getElementById("balanceInput");
  const confirmBtn = document.getElementById("confirmStatus");
  
  // 🔥 DETERMINE NEW STATUS
  let newStatus;
  let actionText;
  let showBalance = false;
  let iconClass = "fa-user-cog";
  let iconBg = "linear-gradient(135deg, #0047ab 0%, #007bff 100%)";
  let isDeactivate = false;
  
  if (currentStatus === "Active") {
    newStatus = "Inactive";
    actionText = "Deactivate";
    showBalance = true;
    iconClass = "fa-user-slash"; // 🔥 Pinalitan ng user-slash
    iconBg = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
    isDeactivate = true;
  } else if (currentStatus === "Inactive") {
    newStatus = "Active";
    actionText = "Activate";
    showBalance = false;
    iconClass = "fa-user-check";
    iconBg = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
  } else if (currentStatus === "Terminated") {
    newStatus = "Active";
    actionText = "Reactivate";
    showBalance = false;
    iconClass = "fa-undo-alt";
    iconBg = "linear-gradient(135deg, #0047ab 0%, #007bff 100%)";
  } else {
    newStatus = "Active";
    actionText = "Activate";
    showBalance = false;
    iconClass = "fa-user-check";
    iconBg = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
  }
  
  if (!modal || !title || !text || !icon) return;
  
  // 🔥 REMOVE OLD THEME CLASSES
  if (modalContent) {
    modalContent.classList.remove('red-theme');
  }
  
  // 🔥 ADD RED THEME IF DEACTIVATE
  if (isDeactivate) {
    modalContent.classList.add('red-theme');
  }
  
  // 🔥 SET ICON
  icon.innerHTML = `<i class="fas ${iconClass}"></i>`;
  icon.style.background = iconBg;
  
  // 🔥 SET TITLE & TEXT
  title.textContent = `Confirm ${actionText}`;
  text.textContent = `Are you sure you want to ${actionText.toLowerCase()} this user?`;
  
  // 🔥 SHOW/HIDE BALANCE
  if (showBalance) {
    balanceField.style.display = "block";
    balanceInput.value = "";
    // Auto-focus after modal opens
    setTimeout(() => balanceInput.focus(), 350);
  } else {
    balanceField.style.display = "none";
    balanceInput.value = "";
    balanceField.style.display = "block";
    balanceInput.value = "";
    balanceInput.classList.remove('field-error');
    const errorMsg = document.getElementById('balanceError');
    if (errorMsg) errorMsg.style.display = 'none';
  }

  
  
  // 🔥 UPDATE CONFIRM BUTTON TEXT AND STYLE
  if (confirmBtn) {
    confirmBtn.innerHTML = `<i class="fas fa-check"></i> ${actionText}`;
    if (isDeactivate) {
      confirmBtn.style.background = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
      confirmBtn.style.boxShadow = "0 4px 16px rgba(220, 38, 38, 0.25)";
    } else {
      confirmBtn.style.background = "linear-gradient(135deg, #0047ab 0%, #007bff 100%)";
      confirmBtn.style.boxShadow = "0 4px 16px rgba(0, 71, 171, 0.25)";
    }
  }
  
  pendingAction = {
    type: "status",
    id: userId,
    newValue: newStatus,
    currentStatus: currentStatus,
    balance: 0,
    isDeactivate: isDeactivate
  };
  
  // ✅ SHOW MODAL
  modal.style.display = "flex";
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function showConnectionModal(userId, currentConnection) {
  const modal = document.getElementById("statusModal");
  const title = document.getElementById("statusTitle");
  const text = document.getElementById("statusText");
  const balanceField = document.getElementById("balanceField");
  const isConnected = currentConnection === "Connected";
  const action = isConnected ? "Disconnect" : "Connect";
  
  if (!modal || !title || !text) return;
  
  title.textContent = `Confirm ${action}`;
  text.textContent = `Are you sure you want to ${action.toLowerCase()} this user's internet connection?`;
  balanceField.style.display = "none";
  
  pendingAction = {
    type: "connection",
    id: userId,
    newValue: isConnected ? "Disconnected" : "Connected"
  };
  
  // ✅ I-CENTER ANG MODAL - ITO ANG BAGO
  modal.style.display = "flex";
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// ================= VIEW REQUEST MODAL =================
let currentRequestId = null;
let currentRequestData = null;

async function showRequestModal(userId) {
  try {
    const res = await fetch(`/api/superadmin/users/${userId}/pending-request`);
    if (!res.ok) {
      showToast("No pending request found for this user", "error");
      return;
    }
    const req = await res.json();
    
    currentRequestId = req.request_id;
    currentRequestData = req;
    
    document.getElementById("reqFullName").textContent = req.full_name || "N/A";
    document.getElementById("reqContact").textContent = req.contact_number || "N/A";
    document.getElementById("reqEmail").textContent = req.email || "N/A";
    document.getElementById("reqAddress").textContent = req.address || "N/A";
    
    // ✅ I-DISPLAY ANG PLAN DETAILS
    const currentPlanEl = document.getElementById("reqCurrentPlan");
    const newPlanRow = document.getElementById("reqNewPlanRow");
    const newPlanEl = document.getElementById("reqNewPlan");
    const noChangeRow = document.getElementById("reqNoChangeRow");
    
    // Current Plan
    if (req.current_plan_name) {
      let priceDisplay = '';
      if (req.current_plan_price && req.current_plan_price !== '0' && req.current_plan_price !== '0.00') {
        const cleanPrice = String(req.current_plan_price).replace(/[₱,]/g, '').trim();
        const priceNum = parseFloat(cleanPrice);
        if (!isNaN(priceNum) && priceNum > 0) {
          priceDisplay = ` - ₱${priceNum.toFixed(2)}/mo`;
        }
      }
      currentPlanEl.textContent = `${req.current_plan_name} (${req.current_plan_speed || '0'} Mbps)${priceDisplay}`;
    } else {
      currentPlanEl.textContent = "No active plan";
    }
    
    // ✅ CHECK KUNG MAY PLAN CHANGE
    if (req.change_plan && req.new_plan_name) {
      newPlanRow.style.display = 'flex';
      noChangeRow.style.display = 'none';
      
      let priceDisplay = '';
      // Kunin ang price ng new plan (kung available)
      if (req.new_plan_price) {
        const cleanPrice = String(req.new_plan_price).replace(/[₱,]/g, '').trim();
        const priceNum = parseFloat(cleanPrice);
        if (!isNaN(priceNum) && priceNum > 0) {
          priceDisplay = ` - ₱${priceNum.toFixed(2)}/mo`;
        }
      }
      // O kaya kunin mula sa plans table via AJAX
      if (req.new_plan_id) {
        try {
          const planRes = await fetch(`/api/superadmin/plans/${req.new_plan_id}`);
          if (planRes.ok) {
            const planData = await planRes.json();
            if (planData.price) {
              const priceNum = parseFloat(planData.price);
              if (!isNaN(priceNum) && priceNum > 0) {
                priceDisplay = ` - ₱${priceNum.toFixed(2)}/mo`;
              }
            }
          }
        } catch (e) {
          // Use existing data
        }
      }
      newPlanEl.textContent = `${req.new_plan_name}${priceDisplay}`;
    } else {
      newPlanRow.style.display = 'none';
      noChangeRow.style.display = 'flex';
    }
    
    const modal = document.getElementById("requestModal");
    modal.style.display = "flex";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    
  } catch (err) {
    console.error("Error loading request:", err);
    showToast("Failed to load request details", "error");
  }
}

function closeRequestModal() {
  const modal = document.getElementById("requestModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
  currentRequestId = null;
  currentRequestData = null;
}


// ================= CONFIRM ACTION MODAL =================
let pendingConfirmAction = null;

function showConfirmModal(action, requestId, requestData) {
  const modal = document.getElementById("confirmActionModal");
  const icon = document.getElementById("confirmModalIcon");
  const title = document.getElementById("confirmModalTitle");
  const text = document.getElementById("confirmModalText");
  const confirmBtn = document.getElementById("executeConfirmAction");
  const requestIdEl = document.getElementById("confirmRequestId");
  const userNameEl = document.getElementById("confirmUserName");
  const planChangeRow = document.getElementById("confirmPlanChangeRow");
  const newPlanEl = document.getElementById("confirmNewPlan");
  
  // I-close ang request modal
  closeRequestModal();
  
  // I-set ang data
  const isApprove = action === 'approve';
  const fullName = requestData?.full_name || "User";
  
  if (isApprove) {
    icon.innerHTML = '<i class="fas fa-check-circle"></i>';
    icon.style.background = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
    title.textContent = "Approve Request";
    text.textContent = "Are you sure you want to approve this reconnection request?";
    confirmBtn.innerHTML = '<i class="fas fa-check"></i> Approve';
    confirmBtn.style.background = "linear-gradient(135deg, #0047ab 0%, #007bff 100%)";
  } else {
    icon.innerHTML = '<i class="fas fa-ban"></i>';
    icon.style.background = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
    title.textContent = "Reject Request";
    text.textContent = "Are you sure you want to reject this reconnection request?";
    confirmBtn.innerHTML = '<i class="fas fa-times"></i> Reject';
    confirmBtn.style.background = "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
  }
  
  requestIdEl.textContent = requestId || "N/A";
  userNameEl.textContent = fullName;
  
  // Show plan change if any
  if (requestData?.change_plan && requestData?.new_plan_name) {
    planChangeRow.style.display = 'flex';
    newPlanEl.textContent = requestData.new_plan_name;
  } else {
    planChangeRow.style.display = 'none';
  }
  
  // Save pending action
  pendingConfirmAction = {
    action: action,
    requestId: requestId,
    requestData: requestData
  };
  
  modal.style.display = "flex";
  modal.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  const modal = document.getElementById("confirmActionModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }
  pendingConfirmAction = null;
}

async function executeConfirmAction() {
  if (!pendingConfirmAction) return;
  
  const { action, requestId, requestData } = pendingConfirmAction;
  
  // Close modal
  closeConfirmModal();
  
  // Show loading
  showToast(action === 'approve' ? 'Approving request...' : 'Rejecting request...', 'loading');
  
  try {
    let endpoint = '';
    if (action === 'approve') {
      endpoint = `/api/superadmin/requests/${requestId}/approve`;
    } else {
      endpoint = `/api/superadmin/requests/${requestId}/reject`;
    }
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to process request");
    }
    
    showToast(
      action === 'approve' 
        ? "✅ Request approved successfully!" 
        : "✅ Request rejected successfully!",
      "success"
    );
    
    // Refresh the users list IMMEDIATELY
    await performFullRefresh(true, true);
    
  } catch (error) {
    console.error("Error processing request:", error);
    showToast(error.message || "Failed to process request", "error");
  }
}

async function approveCurrentRequest() {
  if (currentRequestId === null || currentRequestId === undefined) return;
  
  try {
    const response = await fetch(`/api/superadmin/requests/${currentRequestId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || "Failed to approve request");
    }
    
    showToast("Request approved successfully", "success");
    closeRequestModal();
    
    // Refresh the users list IMMEDIATELY
    await performFullRefresh(true, true);
    
  } catch (error) {
    console.error("Error approving request:", error);
    showToast(error.message || "Failed to approve request", "error");
  }
}

// ================= DELETE MODAL EVENTS =================
const deleteModal = document.getElementById('deleteModal');
const closeDeleteBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');

if (closeDeleteBtn) {
  closeDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', confirmDeleteAction);
}

// Close delete modal on outside click
if (deleteModal) {
  deleteModal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeDeleteModal();
    }
  });
}

// Close delete modal on Escape key
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if (deleteModal && deleteModal.classList.contains('show')) {
      closeDeleteModal();
    }
  }
});

// ================= CLOSE STATUS MODAL =================
function closeStatusModal() {
  const modal = document.getElementById("statusModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
  pendingAction = null;
}

async function confirmAction() {
    if (!pendingAction) return;
    
    const { type, id, newValue, currentStatus, isDeactivate } = pendingAction;
    
    // 🔥 KUNIN ANG BALANCE GAMIT ANG VALIDATED FUNCTION
    const balanceInput = document.getElementById("balanceInput");
    let balance = 0;
    
    if (balanceInput && balanceInput.value) {
        balance = parseFloat(balanceInput.value) || 0;
        // Validate: bawal negative
        if (balance < 0) {
            showToast("Balance cannot be negative", "error");
            return;
        }
    }
    
    console.log(`📊 Balance: ${balance}`);
    
    try {
        let response;
        if (type === "status") {
            // 🔥 ISAMA ANG BALANCE SA REQUEST
            response = await fetch(`/api/superadmin/users/${id}/status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    status: newValue,
                    balance: balance
                })
            });
        } else {
            response = await fetch(`/api/superadmin/users/${id}/connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ connection_status: newValue })
            });
        }
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update");
        }
        
        const data = await response.json();
        
        // 🔥 I-UPDATE ANG LOCAL DATA
        if (type === "status") {
            usersData = usersData.map(u => {
                if (String(u.user_id) === String(id)) {
                    return { ...u, status: newValue };
                }
                return u;
            });
        } else {
            usersData = usersData.map(u => {
                if (String(u.user_id) === String(id)) {
                    return { ...u, connection_status: newValue };
                }
                return u;
            });
        }
        
        setCache(usersData);
        applyCurrentFilters();
        
        // ✅ REFRESH AGAD PARA MAG-UPDATE ANG CONNECTION STATUS
        await performFullRefresh(true, true);
        
        if (isDeactivate && balance > 0) {
            showToast(`✅ User deactivated successfully. Remaining balance: ₱${balance.toFixed(2)}`, "success");
        } else if (isDeactivate) {
            showToast("✅ User deactivated successfully", "success");
        } else {
            showToast(`${type === "status" ? "Status" : "Connection"} updated successfully`, "success");
        }
        
    } catch (error) {
        console.error("Error updating:", error);
        showToast(error.message || `Failed to update ${type}`, "error");
    }
    
    closeStatusModal();
}

// ================= FETCH USERS =================
async function fetchUsers(forceRefresh = false) {
  if (forceRefresh) {
    await performFullRefresh(true, true);
    return;
  }
  
  showLoading();

  try {
    const url = "/api/superadmin/users";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();

    usersData = data.map(u => ({
      user_id: u.user_id,
      full_name: u.full_name || "N/A",
      email: u.email || "",
      status: u.status || "Active",
      connection_status: (u.connection_status || "Disconnected").trim(),
      has_pending_request: !!u.has_pending_request,
      pending_reassignment: !!u.pending_reassignment
    }));

    console.log("Fetched users:", usersData.length);

    setCache(usersData);
    
    applyCurrentFilters();
  } catch (err) {
    console.error(err);
    showNoData();
    const userCountSpan = document.getElementById("userCount");
    if (userCountSpan) userCountSpan.textContent = "0";
  }
}

// ================= RENDER ACTIVE + INACTIVE USERS (OPTIMIZED) =================
function renderUsers(data) {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) return;
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  if (!data || data.length === 0) {
    const noDataEl = document.getElementById("noData");
    const table = document.querySelector("#usersTable");
    if (noDataEl) noDataEl.style.display = "block";
    if (table) table.style.display = "none";
    return;
  }

  data.forEach(user => {
    let displayStatus = user.status;
    
    // 🔥 TAMANG KULAY PARA SA ACTIVE AT INACTIVE
    let statusColor = "";
    let statusBg = "";
    let statusBorder = "";
    
    if (displayStatus === "Active") {
      statusColor = "#27ae60";
      statusBg = "#e8f5e9";
      statusBorder = "#c8e6c9";
    } else if (displayStatus === "Inactive") {
      statusColor = "#d97706";
      statusBg = "#fffbeb";
      statusBorder = "#fde68a";
    } else {
      statusColor = "#c0392b";
      statusBg = "#ffebee";
      statusBorder = "#ffcdd2";
    }
    
    let displayConnection = user.connection_status === "Connected" ? "Connected" : "Disconnected";
    let connColor = displayConnection === "Connected" ? "#27ae60" : "#c0392b";
    let connBg = displayConnection === "Connected" ? "#e8f5e9" : "#ffebee";
    let connBorder = displayConnection === "Connected" ? "#c8e6c9" : "#ffcdd2";
    
    // 🔥 BUTTON TEXT - "Deactivate" lang para sa Active users
    let statusBtnText = "Deactivate";
    let statusBtnStyle = "background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:5px 12px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(user.user_id || "N/A")}</td>
      <td>${escapeHtml(user.full_name || "N/A")}</td>
      <td>${escapeHtml(user.email || "N/A")}</td>
      <td style="text-align: center;">
        <span style="
            display: inline-block;
            padding: 5px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: ${statusBg};
            color: ${statusColor};
            border: 1px solid ${statusBorder};
            min-width: 85px;
        ">
          ${displayStatus}
        </span>
      </td>
      <td style="text-align: center;">
        <span style="
            display: inline-block;
            padding: 5px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: ${connBg};
            color: ${connColor};
            border: 1px solid ${connBorder};
            min-width: 95px;
        ">
          ${displayConnection}
        </span>
      </td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
          ${user.status === "Active" ? `
            <button class="statusBtn"
                style="${statusBtnStyle}"
                data-id="${user.user_id}"
                data-status="${user.status}">
                ${statusBtnText}
            </button>
          ` : user.has_pending_request ? `
            <button class="viewRequestBtn"
                style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:5px 12px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                data-id="${user.user_id}">
                <i class="fas fa-eye"></i> View Request
            </button>
          ` : `
            <span style="color:#94a3b8; font-size:0.7rem;">No pending request</span>
          `}
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });

  // ✅ One DOM update instead of multiple
  tbody.innerHTML = '';
  tbody.appendChild(fragment);

  const noDataEl = document.getElementById("noData");
  const table = document.querySelector("#usersTable");
  if (noDataEl) noDataEl.style.display = "none";
  if (table) table.style.display = "table";
  
  attachEvents();
}

// ================= RENDER TERMINATED USERS (OPTIMIZED) =================
function renderTerminatedUsers(data) {
  const tbody = document.getElementById("terminatedUsersBody");
  const noData = document.getElementById("noTerminatedData");
  const table = document.getElementById("terminatedUsersTable");
  const terminatedCard = document.getElementById("terminatedCard");
  
  if (!tbody) return;
  
  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();
  
  const hasTerminatedUsers = usersData.some(u => u.status === "Terminated");
  if (terminatedCard) {
    terminatedCard.style.display = hasTerminatedUsers ? "block" : "none";
  }

  if (!data || data.length === 0) {
    if (table) table.style.display = "none";
    if (noData) {
      noData.style.display = "block";
      noData.innerHTML = `
        <i class="fas fa-user-check"></i>
        <p>No terminated users</p>
        <span>No terminated accounts found</span>
      `;
    }
    return;
  }

  if (noData) noData.style.display = "none";
  if (table) table.style.display = "table";

  data.forEach(user => {
    let displayConnection = user.connection_status === "Connected" ? "Connected" : "Disconnected";
    let connColor = displayConnection === "Connected" ? "#27ae60" : "#c0392b";
    let connBg = displayConnection === "Connected" ? "#e8f5e9" : "#ffebee";
    let connBorder = displayConnection === "Connected" ? "#c8e6c9" : "#ffcdd2";
    
    let actionCellContent = '';
    if (user.pending_reassignment) {
      actionCellContent = `
        <span class="badge-reassign-pending" style="
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            border-radius: 30px;
            font-size: 0.72rem;
            font-weight: 600;
            background: #eff6ff;
            color: #1d4ed8;
            border: 1px solid #bfdbfe;
        ">
            <i class="fas fa-tools"></i> Reassigning Slot by Technician
        </span>
      `;
    } else {
      actionCellContent = `
        ${user.has_pending_request ? `
          <button class="viewRequestBtn"
              style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:5px 12px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${user.user_id}">
              <i class="fas fa-eye"></i> View Request
          </button>
        ` : `
          <span style="color:#94a3b8; font-size:0.7rem;">No pending request</span>
        `}
        <button class="terminated-delete-btn"
            style="background:#dc2626;color:white;border:none;padding:5px 16px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
            data-id="${user.user_id}"
            data-name="${escapeHtml(user.full_name)}">
            <i class="fas fa-trash"></i> Delete User
        </button>
      `;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(user.user_id || "N/A")}</td>
      <td>${escapeHtml(user.full_name || "N/A")}</td>
      <td>${escapeHtml(user.email || "N/A")}</td>
      <td style="text-align: center;">
        <span class="status-terminated" style="
            display: inline-block;
            padding: 5px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: #ffebee;
            color: #c0392b;
            border: 1px solid #ffcdd2;
            min-width: 85px;
        ">
          Terminated
        </span>
      </td>
      <td style="text-align: center;">
        <span style="
            display: inline-block;
            padding: 5px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: ${connBg};
            color: ${connColor};
            border: 1px solid ${connBorder};
            min-width: 95px;
        ">
          ${displayConnection}
        </span>
      </td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center; flex-wrap: wrap;">
          ${actionCellContent}
        </div>
      </td>
    `;
    fragment.appendChild(tr);
  });

  // ✅ One DOM update instead of multiple
  tbody.innerHTML = '';
  tbody.appendChild(fragment);

  // View Request button events (terminated table)
  document.querySelectorAll("#terminatedUsersBody .viewRequestBtn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = newBtn.getAttribute("data-id");
      showRequestModal(id);
    });
  });

  // 🔥 DELETE USER BUTTON EVENTS
  document.querySelectorAll("#terminatedUsersBody .terminated-delete-btn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = newBtn.getAttribute("data-id");
      const name = newBtn.getAttribute("data-name") || "User";
      confirmDeleteUser(id, name);
    });
  });
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

// ================= EVENTS =================
function attachEvents() {
  document.querySelectorAll(".statusBtn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = newBtn.getAttribute("data-id");
      const currentStatus = newBtn.getAttribute("data-status");
      showStatusModal(id, currentStatus);
    });
  });

  document.querySelectorAll(".viewRequestBtn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = newBtn.getAttribute("data-id");
      showRequestModal(id);
    });
  });
}

// ================= SETUP MODAL EVENTS =================
function setupModalEvents() {
  const modal = document.getElementById("statusModal");
  const confirmBtn = document.getElementById("confirmStatus");
  const cancelBtn = document.getElementById("cancelStatus");
  const closeBtn = modal ? modal.querySelector(".close-btn") : null;
  
  if (confirmBtn) {
    confirmBtn.addEventListener("click", confirmAction);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener("click", closeStatusModal);
  }
  
  if (closeBtn) {
    closeBtn.addEventListener("click", closeStatusModal);
  }
  
  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeStatusModal();
    }
  });
  
  document.addEventListener("keydown", (e) => {
    // ✅ GAMITIN ANG classList.contains('show') IMBES NA style.display
    if (e.key === "Escape" && modal && modal.classList.contains('show')) {
      closeStatusModal();
    }
  });
}

// ================= SEARCH & FILTER =================
function setupSearchAndFilter() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const connectionFilter = document.getElementById("connectionFilter");
  
  if (!searchInput || !statusFilter || !connectionFilter) return;
  
  function filterUsers() {
    applyCurrentFilters();
  }
  
  searchInput.addEventListener("input", filterUsers);
  statusFilter.addEventListener("change", filterUsers);
  connectionFilter.addEventListener("change", filterUsers);
  
  const clearBtn = document.getElementById("clearSearch");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      filterUsers();
      clearBtn.style.display = "none";
    });
    
    searchInput.addEventListener("input", () => {
      clearBtn.style.display = searchInput.value ? "flex" : "none";
    });
  }
}

// ================= SETUP TERMINATED SEARCH =================
function setupTerminatedSearch() {
  const searchInput = document.getElementById("terminatedSearchInput");
  const clearBtn = document.getElementById("terminatedClearSearch");
  
  if (!searchInput) return;
  
  searchInput.addEventListener("input", function() {
    if (clearBtn) {
      clearBtn.style.display = this.value ? "flex" : "none";
    }
    applyCurrentFilters();
  });
  
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearBtn.style.display = "none";
      applyCurrentFilters();
    });
  }
}

// ================= APPLY FILTERS =================
function applyCurrentFilters() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const connectionFilter = document.getElementById("connectionFilter");
  const terminatedSearchInput = document.getElementById("terminatedSearchInput");
  
  // ====== FILTER ACTIVE + INACTIVE USERS (magkasama sa iisang table) ======
  let activeInactiveFiltered = usersData.filter(u => u.status === "Active" || u.status === "Inactive");
  
  if (searchInput && searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    activeInactiveFiltered = activeInactiveFiltered.filter(user => 
      (user.user_id && String(user.user_id).toLowerCase().includes(searchTerm)) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm))
    );
  }
  
  if (statusFilter && statusFilter.value !== "all") {
    activeInactiveFiltered = activeInactiveFiltered.filter(user => {
      if (statusFilter.value === "active") {
        return user.status === "Active";
      } else if (statusFilter.value === "inactive") {
        return user.status === "Inactive";
      }
      return true;
    });
  }
  
  if (connectionFilter && connectionFilter.value !== "all") {
    activeInactiveFiltered = activeInactiveFiltered.filter(user => {
      if (connectionFilter.value === "connected") {
        return user.connection_status === "Connected";
      } else if (connectionFilter.value === "disconnected") {
        return user.connection_status === "Disconnected";
      }
      return true;
    });
  }
  
  const userCountSpan = document.getElementById("userCount");
  if (userCountSpan) userCountSpan.textContent = activeInactiveFiltered.length;
  
  // 🔥 I-RENDER ANG ACTIVE + INACTIVE SA IISANG TABLE
  renderUsers(activeInactiveFiltered);
  
  // ====== FILTER TERMINATED USERS (hiwalay na table) ======
  let terminatedFiltered = usersData.filter(u => u.status === "Terminated");
  
  if (terminatedSearchInput && terminatedSearchInput.value) {
    const termSearch = terminatedSearchInput.value.toLowerCase().trim();
    terminatedFiltered = terminatedFiltered.filter(user => 
      (user.user_id && String(user.user_id).toLowerCase().includes(termSearch)) ||
      (user.full_name && user.full_name.toLowerCase().includes(termSearch)) ||
      (user.email && user.email.toLowerCase().includes(termSearch))
    );
  }
  
  const terminatedCountSpan = document.getElementById("terminatedCount");
  if (terminatedCountSpan) terminatedCountSpan.textContent = terminatedFiltered.length;
  
  const noData = document.getElementById("noTerminatedData");
  if (noData) {
    noData.innerHTML = `
      <i class="fas fa-user-check"></i>
      <p>No terminated users</p>
      <span>No terminated accounts found</span>
    `;
  }
  
  // 🔥 I-RENDER ANG TERMINATED SA HIWALAY NA TABLE
  renderTerminatedUsers(terminatedFiltered);
}

// ==================== CORE REFRESH FUNCTION ====================
let lastDataHash = "";
let autoRefreshInterval = null;
let refreshInProgress = false;

function generateHash(data) {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '';
  }
}

async function performFullRefresh(showToastMsg = true, isManual = false) {
    if (refreshInProgress) {
        console.log('⏳ Refresh already in progress, skipping...');
        return;
    }
    
    refreshInProgress = true;
    console.log(`🔄 ${isManual ? 'MANUAL' : 'AUTO'} refresh started...`);
    
    try {
        // Clear cache para siguradong fresh data
        clearCache();
        
        // Fetch fresh data with cache-busting
        const res = await fetch("/api/superadmin/users?t=" + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        const newUsersData = data.map(u => ({
            user_id: u.user_id,
            full_name: u.full_name || "N/A",
            email: u.email || "",
            status: u.status || "Active",
            connection_status: (u.connection_status || "Disconnected").trim(),
            has_pending_request: !!u.has_pending_request,
            pending_reassignment: !!u.pending_reassignment
        }));
        
        // Update data
        usersData = newUsersData;
        setCache(usersData);
        lastDataHash = generateHash(usersData);
        
        // Re-render tables
        applyCurrentFilters();
        
        console.log(`✅ ${isManual ? 'MANUAL' : 'AUTO'} refresh completed. Total users:`, usersData.length);
        
        if (showToastMsg && isManual) {
            showToast('User list updated successfully!', 'success');
        }
        
    } catch (err) {
        console.error('Refresh error:', err);
        if (isManual) {
            showToast('Failed to refresh user list', 'error');
        }
    } finally {
        refreshInProgress = false;
        console.log('🔄 Refresh completed');
    }
}

// ==================== AUTO REFRESH ====================
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    
    // Start new interval - use 10000ms (10 seconds) for better performance
    autoRefreshInterval = setInterval(async function() {
        // Skip auto-refresh if manual refresh is in progress
        if (refreshInProgress) {
            console.log('⏸️ Auto-refresh skipped (refresh in progress)');
            return;
        }
        await autoRefreshUsers();
    }, 10000); // ← 10 seconds instead of 5
    
    console.log('🔄 Auto-refresh started (every 10 seconds)');
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
        console.log('🔄 Auto-refresh stopped');
    }
}

// ==================== AUTO REFRESH USERS (from interval) ====================
async function autoRefreshUsers() {
    // Skip if manual refresh is in progress
    if (refreshInProgress) {
        return;
    }
    
    try {
        const res = await fetch("/api/superadmin/users?t=" + Date.now());
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        const newUsersData = data.map(u => ({
            user_id: u.user_id,
            full_name: u.full_name || "N/A",
            email: u.email || "",
            status: u.status || "Active",
            connection_status: (u.connection_status || "Disconnected").trim(),
            has_pending_request: !!u.has_pending_request,
            pending_reassignment: !!u.pending_reassignment
        }));

        const newHash = generateHash(newUsersData);
        
        if (newHash !== lastDataHash) {
            console.log("🔄 New data detected from auto-refresh! Updating table...");
            usersData = newUsersData;
            setCache(usersData);
            lastDataHash = newHash;
            applyCurrentFilters();
            showToast("User list has been updated", "success");
        }
    } catch (err) {
        console.error("Auto refresh error:", err);
    }
}

// ==================== MANUAL REFRESH FUNCTION ====================
window.refreshUsers = function(showToastMsg = true) {
    console.log("🔄 Manual refresh triggered by user");
    performFullRefresh(showToastMsg, true);
};

// ==================== KEYBOARD SHORTCUT: CTRL+R MANUAL REFRESH ====================
document.addEventListener("keydown", function(event) {
    // Check if Ctrl+R or Cmd+R (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        // Check if not in input/textarea
        const target = event.target;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
            event.preventDefault(); // Prevent browser default refresh
            console.log('🔄 Ctrl+R detected - performing manual refresh');
            refreshUsers(true);
        }
    }
});

// ================= OPTIMIZED INIT =================
document.addEventListener("DOMContentLoaded", async () => {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    console.log("🚀 Initializing Users page (optimized)...");
    
    const hasPendingCreation = checkForPendingUserCreation();
    const cached = getCache();
    
    // ✅ OPTIMIZED: Load from cache FIRST for super fast initial render
    if (cached && cached.length > 0 && !hasPendingCreation) {
        console.log("⚡ Loading from cache (super fast!)");
        usersData = cached;
        lastDataHash = generateHash(cached);
        
        // Render agad - no waiting!
        applyCurrentFilters();
        showLoading(false);
        
        // ✅ Background check for updates (non-blocking)
        setTimeout(async () => {
            console.log("🔄 Background check for updates...");
            try {
                const res = await fetch("/api/superadmin/users?t=" + Date.now());
                if (res.ok) {
                    const data = await res.json();
                    const newUsersData = data.map(u => ({
                        user_id: u.user_id,
                        full_name: u.full_name || "N/A",
                        email: u.email || "",
                        status: u.status || "Active",
                        connection_status: (u.connection_status || "Disconnected").trim(),
                        has_pending_request: !!u.has_pending_request,
                        pending_reassignment: !!u.pending_reassignment
                    }));
                    
                    const newHash = generateHash(newUsersData);
                    if (newHash !== lastDataHash) {
                        console.log("🔄 Updates found in background! Updating table...");
                        usersData = newUsersData;
                        setCache(usersData);
                        lastDataHash = newHash;
                        applyCurrentFilters();
                        showToast("User list has been updated", "success");
                    } else {
                        console.log("✅ No updates found");
                    }
                }
            } catch (err) {
                console.log("Background check failed:", err);
            }
        }, 100); // 100ms delay para maka-render muna ang UI
    } else {
        // ❌ No cache or has pending creation - fetch from API
        if (hasPendingCreation) {
            console.log("📢 Pending user creation detected - forcing fresh data load");
        } else {
            console.log("📦 No cache found, fetching from API");
        }
        await fetchUsers(true);
        lastDataHash = generateHash(usersData);
    }
    
    setupModalEvents();
    setupBalanceInputValidation();
    setupSearchAndFilter();
    setupTerminatedSearch();
    setupCrossTabNotification();
    
    // Request modal events
    document.getElementById("closeRequestModalBtn")?.addEventListener("click", closeRequestModal);
    document.getElementById("cancelRequest")?.addEventListener("click", closeRequestModal);

    document.getElementById("confirmApproveRequest")?.addEventListener("click", function() {
        if (currentRequestId && currentRequestData) {
            showConfirmModal('approve', currentRequestId, currentRequestData);
        }
    });

    document.getElementById("rejectRequestBtn")?.addEventListener("click", function() {
        if (currentRequestId && currentRequestData) {
            showConfirmModal('reject', currentRequestId, currentRequestData);
        }
    });

    document.getElementById("closeConfirmModalBtn")?.addEventListener("click", closeConfirmModal);
    document.getElementById("cancelConfirmAction")?.addEventListener("click", closeConfirmModal);
    document.getElementById("executeConfirmAction")?.addEventListener("click", executeConfirmAction);

    window.addEventListener("click", (e) => {
        const confirmModal = document.getElementById("confirmActionModal");
        if (e.target === confirmModal) closeConfirmModal();
        
        const requestModal = document.getElementById("requestModal");
        if (e.target === requestModal) closeRequestModal();
    });
    
    // ✅ START AUTO-REFRESH (10 seconds)
    startAutoRefresh();
    
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
        if (logoutModal && logoutModal.style.display === "block") {
            logoutModal.style.display = "none";
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
        
        const statusModal = document.getElementById('statusModal');
        if (statusModal && statusModal.style.display === "block") {
            closeStatusModal();
        }
    }
});

// ================= DELETE TERMINATED USER (WITH MODAL) =================
function confirmDeleteUser(userId, userName) {
    // Populate modal with user info
    document.getElementById('deleteUserId').textContent = userId;
    document.getElementById('deleteUserName').textContent = userName || 'Unknown User';
    
    // Show modal
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

// ================= CLOSE DELETE MODAL =================
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// ================= CONFIRM DELETE =================
async function confirmDeleteAction() {
    const userId = document.getElementById('deleteUserId').textContent;
    const userName = document.getElementById('deleteUserName').textContent;
    
    // Close modal
    closeDeleteModal();
    
    // Show loading
    showToast('Deleting user account...', 'loading');
    
    try {
        const response = await fetch(`/api/superadmin/users/${userId}/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message || 'User deleted successfully!', 'success');
            
            // Remove from local data
            usersData = usersData.filter(u => String(u.user_id) !== String(userId));
            setCache(usersData);
            lastDataHash = generateHash(usersData);
            applyCurrentFilters();
            
            // Refresh agad para mag-update ang tables
            await performFullRefresh(true, true);
        } else {
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function deleteTerminatedUser(userId) {
    try {
        const response = await fetch(`/api/superadmin/users/${userId}/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.message || 'User deleted successfully!', 'success');
            
            // Remove from local data
            usersData = usersData.filter(u => u.user_id !== userId);
            setCache(usersData);
            lastDataHash = generateHash(usersData);
            applyCurrentFilters();
            
            // Refresh agad
            await performFullRefresh(true, true);
        } else {
            showToast(data.error || 'Failed to delete user', 'error');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Network error. Please try again.', 'error');
    }
}