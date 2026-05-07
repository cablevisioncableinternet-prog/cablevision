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

let usersData = [];
const CACHE_KEY = "superadminUsers";
let pendingAction = null;

// ================= CACHE =================
function setCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function getCache() {
  const cache = localStorage.getItem(CACHE_KEY);
  return cache ? JSON.parse(cache) : null;
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
            refreshUsersData();
            lastRefreshTime = now;
          }
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    }
  });
}

// Enhanced refresh function that forces data reload
async function refreshUsersData(showNotification = true) {
  if (isRefreshing) return;
  
  isRefreshing = true;
  console.log('🔄 Refreshing users data...');
  
  clearCache();
  
  if (showNotification) {
    showRefreshNotification();
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
      connection_status: (u.connection_status || "Disconnected").trim()
    }));

    usersData = newUsersData;
    setCache(usersData);
    lastDataHash = generateHash(usersData);
    applyCurrentFilters();
    
    console.log('✅ Users data refreshed successfully. Total users:', usersData.length);
    
    if (showNotification) {
      showToast('User list updated!', 'success');
    }
    
  } catch (err) {
    console.error('Error refreshing users:', err);
    if (showNotification) {
      showToast('Failed to refresh user list', 'error');
    }
  } finally {
    isRefreshing = false;
  }
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

function applyCurrentFilters() {
  const searchInput = document.getElementById("searchInput");
  const statusFilter = document.getElementById("statusFilter");
  const connectionFilter = document.getElementById("connectionFilter");
  
  let filtered = [...usersData];
  
  if (searchInput && searchInput.value) {
    const searchTerm = searchInput.value.toLowerCase().trim();
    filtered = filtered.filter(user => 
      (user.user_id && String(user.user_id).toLowerCase().includes(searchTerm)) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm))
    );
  }
  
  if (statusFilter && statusFilter.value !== "all") {
    filtered = filtered.filter(user => {
      if (statusFilter.value === "active") {
        return user.status === "Active";
      } else if (statusFilter.value === "inactive") {
        return user.status === "Deactivated";
      }
      return true;
    });
  }
  
  if (connectionFilter && connectionFilter.value !== "all") {
    filtered = filtered.filter(user => {
      if (connectionFilter.value === "connected") {
        return user.connection_status === "Connected";
      } else if (connectionFilter.value === "disconnected") {
        return user.connection_status === "Disconnected";
      }
      return true;
    });
  }
  
  const userCountSpan = document.getElementById("userCount");
  if (userCountSpan) userCountSpan.textContent = filtered.length;
  
  renderUsers(filtered);
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
        const res = await fetch("/api/superadmin/profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
    } catch (err) { console.error(err); }
}
loadProfile();

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
  logoutBtn.onclick = e => { e.preventDefault(); logoutModal.style.display = "block"; };
  const closeBtn = logoutModal.querySelector(".close-btn");
  const cancelLogout = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");
  
  if (closeBtn) closeBtn.onclick = () => logoutModal.style.display = "none";
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

// ================= UI CONTROL =================
function showLoading() {
  const loadingRow = document.querySelector(".loading-row");
  const noDataEl = document.getElementById("noData");
  const table = document.querySelector("#usersTable");
  
  if (loadingRow) loadingRow.style.display = "table-row";
  if (noDataEl) noDataEl.style.display = "none";
  if (table) table.style.display = "none";
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

// ================= MODAL FUNCTIONS =================
function showStatusModal(userId, currentStatus) {
  const modal = document.getElementById("statusModal");
  const title = document.getElementById("statusTitle");
  const text = document.getElementById("statusText");
  const newStatus = currentStatus === "Active" ? "Deactivated" : "Active";
  
  if (!modal || !title || !text) return;
  
  title.textContent = `Confirm ${newStatus}`;
  text.textContent = `Are you sure you want to ${newStatus.toLowerCase()} this user?`;
  
  pendingAction = {
    type: "status",
    id: userId,
    newValue: newStatus
  };
  
  modal.style.display = "block";
}

function showConnectionModal(userId, currentConnection) {
  const modal = document.getElementById("statusModal");
  const title = document.getElementById("statusTitle");
  const text = document.getElementById("statusText");
  const isConnected = currentConnection === "Connected";
  const action = isConnected ? "Disconnect" : "Connect";
  
  if (!modal || !title || !text) return;
  
  title.textContent = `Confirm ${action}`;
  text.textContent = `Are you sure you want to ${action.toLowerCase()} this user's internet connection?`;
  
  pendingAction = {
    type: "connection",
    id: userId,
    newValue: isConnected ? "Disconnected" : "Connected"
  };
  
  modal.style.display = "block";
}

function closeStatusModal() {
  const modal = document.getElementById("statusModal");
  if (modal) modal.style.display = "none";
  pendingAction = null;
}

async function confirmAction() {
  if (!pendingAction) return;
  
  const { type, id, newValue } = pendingAction;
  
  try {
    let response;
    if (type === "status") {
      response = await fetch(`/api/superadmin/users/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newValue })
      });
    } else {
      response = await fetch(`/api/superadmin/users/${id}/connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_status: newValue })
      });
    }
    
    if (!response.ok) throw new Error("Failed to update");
    
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
    renderUsers(usersData);
    
    showToast(`${type === "status" ? "Status" : "Connection"} updated successfully`, "success");
    
  } catch (error) {
    console.error("Error updating:", error);
    showToast(`Failed to update ${type}`, "error");
  }
  
  closeStatusModal();
}

// ================= TOAST FUNCTION =================
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  
  toast.style.background = type === "success" ? "#28a745" : "#dc3545";
  toast.textContent = message;
  toast.style.display = "block";
  
  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// ================= FETCH USERS =================
async function fetchUsers(forceRefresh = false) {
  showLoading();

  try {
    const url = forceRefresh ? "/api/superadmin/users?t=" + Date.now() : "/api/superadmin/users";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const data = await res.json();

    usersData = data.map(u => ({
      user_id: u.user_id,
      full_name: u.full_name || "N/A",
      email: u.email || "",
      status: u.status || "Active",
      connection_status: (u.connection_status || "Disconnected").trim()
    }));

    console.log("Fetched users:", usersData.length);

    setCache(usersData);
    
    const userCountSpan = document.getElementById("userCount");
    if (userCountSpan) userCountSpan.textContent = usersData.length;
    
    renderUsers(usersData);
  } catch (err) {
    console.error(err);
    showNoData();
    const userCountSpan = document.getElementById("userCount");
    if (userCountSpan) userCountSpan.textContent = "0";
  }
}

// ================= RENDER USERS =================
function renderUsers(data) {
  const tbody = document.querySelector("#usersTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    showNoData();
    const userCountSpan = document.getElementById("userCount");
    if (userCountSpan) userCountSpan.textContent = "0";
    return;
  }

  data.forEach(user => {
    let displayStatus = user.status;
    if (displayStatus === "Deactivated") displayStatus = "Inactive";
    
    let displayConnection = user.connection_status === "Connected" ? "Connected" : "Disconnected";
    
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
            background: ${displayStatus === "Active" ? "#e8f5e9" : "#ffebee"};
            color: ${displayStatus === "Active" ? "#27ae60" : "#c0392b"};
            border: 1px solid ${displayStatus === "Active" ? "#c8e6c9" : "#ffcdd2"};
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
            background: ${displayConnection === "Connected" ? "#e8f5e9" : "#ffebee"};
            color: ${displayConnection === "Connected" ? "#27ae60" : "#c0392b"};
            border: 1px solid ${displayConnection === "Connected" ? "#c8e6c9" : "#ffcdd2"};
            min-width: 95px;
        ">
          ${displayConnection}
        </span>
      </td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 8px; justify-content: center; align-items: center;">
          <button class="statusBtn"
              style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:5px 12px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${user.user_id}"
              data-status="${user.status}">
              ${user.status === "Active" ? "Deactivate" : "Activate"}
          </button>
          <button class="connBtn"
              style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:5px 12px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${user.user_id}"
              data-connection="${user.connection_status}">
              ${user.connection_status === "Connected" ? "Disconnect" : "Connect"}
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const userCountSpan = document.getElementById("userCount");
  if (userCountSpan) userCountSpan.textContent = data.length;

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

  document.querySelectorAll(".connBtn").forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = newBtn.getAttribute("data-id");
      const currentConnection = newBtn.getAttribute("data-connection");
      showConnectionModal(id, currentConnection);
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
    if (e.key === "Escape" && modal && modal.style.display === "block") {
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
  
  function updateFilterOptions() {
    statusFilter.innerHTML = `
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    `;
    
    connectionFilter.innerHTML = `
      <option value="all">All Connections</option>
      <option value="connected">Connected</option>
      <option value="disconnected">Disconnected</option>
    `;
  }
  
  function filterUsers() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const statusValue = statusFilter.value;
    const connectionValue = connectionFilter.value;
    
    let filtered = [...usersData];
    
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.user_id && String(user.user_id).toLowerCase().includes(searchTerm)) ||
        (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm))
      );
    }
    
    if (statusValue !== "all") {
      filtered = filtered.filter(user => {
        if (statusValue === "active") {
          return user.status === "Active";
        } else if (statusValue === "inactive") {
          return user.status === "Deactivated";
        }
        return true;
      });
    }
    
    if (connectionValue !== "all") {
      filtered = filtered.filter(user => {
        if (connectionValue === "connected") {
          return user.connection_status === "Connected";
        } else if (connectionValue === "disconnected") {
          return user.connection_status === "Disconnected";
        }
        return true;
      });
    }
    
    const userCountSpan = document.getElementById("userCount");
    if (userCountSpan) userCountSpan.textContent = filtered.length;
    
    renderUsers(filtered);
  }
  
  updateFilterOptions();
  
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

// ================= AUTO REFRESH =================
let lastDataHash = "";
let autoRefreshInterval = null;

function generateHash(data) {
  return JSON.stringify(data);
}

async function autoRefreshUsers() {
  try {
    console.log("🔄 Auto-refresh checking for updates...");
    const res = await fetch("/api/superadmin/users?t=" + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const newDataRaw = await res.json();

    const newData = newDataRaw.map(u => ({
      user_id: u.user_id,
      full_name: u.full_name || "N/A",
      email: u.email || "",
      status: u.status || "Active",
      connection_status: (u.connection_status || "Disconnected").trim()
    }));

    const newHash = generateHash(newData);

    if (newHash !== lastDataHash) {
      console.log("🔄 New data detected! Updating table...");
      usersData = newData;
      setCache(newData);
      applyCurrentFilters();
      lastDataHash = newHash;
      showToast("User list has been updated", "success");
    } else {
      console.log("No changes detected");
    }

  } catch (err) {
    console.error("Auto refresh error:", err);
  }
}

window.refreshUsers = function() {
  console.log("🔄 Manual refresh triggered");
  clearCache();
  refreshUsersData(true);
  showToast("Refreshing user list...", "success");
};

// ================= INIT =================
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Initializing Users page...");
  
  const hasPendingCreation = checkForPendingUserCreation();
  const cached = getCache();

  if (hasPendingCreation) {
    console.log("Pending user creation detected - forcing fresh data load");
    await fetchUsers(true);
    lastDataHash = generateHash(usersData);
  } else if (cached && cached.length > 0) {
    console.log("Loading users from cache");
    usersData = cached;
    renderUsers(cached);
    lastDataHash = generateHash(cached);
  } else {
    console.log("No cache found, fetching from API");
    await fetchUsers();
    lastDataHash = generateHash(usersData);
  }
  
  setupModalEvents();
  setupSearchAndFilter();
  setupCrossTabNotification();
  
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(autoRefreshUsers, 10000);
  console.log("Auto-refresh enabled (every 10 seconds)");
  
  if (window.NotificationSystem) {
    window.NotificationSystem.init();
  }
});