// Add this at the VERY TOP of superadmin-admins.js
(function() {
    // Immediate session check
    const userType = localStorage.getItem('userType');
    const sessionToken = sessionStorage.getItem('sessionToken');
    
    if (!userType || !sessionToken) {
        window.location.replace('/');
        throw new Error('No session');
    }
    
    // Update activity timestamp
    localStorage.setItem('lastActivity', Date.now().toString());
})();

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

// ================= CACHE =================
let adminsCache = null;
let allAdmins = []; // Store all admins for filtering

// ================= TOAST =================
function showToast(message, success = true) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.style.background = success ? "#28a745" : "#c0392b";
  toast.textContent = message;
  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

// ================= DISPLAY TABLE MESSAGE =================
function displayTableMessage(message, isError = false) {
  // Remove existing message
  const existingMessage = document.querySelector(".table-message");
  if (existingMessage) {
    existingMessage.remove();
  }
  
  // Create message element
  const messageDiv = document.createElement("div");
  messageDiv.className = "table-message";
  messageDiv.style.cssText = `
    background: ${isError ? "#fef2f2" : "#ecfdf5"};
    color: ${isError ? "#dc2626" : "#059669"};
    padding: 12px 16px;
    border-radius: 12px;
    margin-top: 16px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid ${isError ? "#fecaca" : "#a7f3d0"};
    animation: slideInDown 0.3s ease;
  `;
  messageDiv.innerHTML = `
    <i class="fas ${isError ? "fa-exclamation-circle" : "fa-check-circle"}" style="font-size: 16px;"></i>
    <span>${message}</span>
    <button type="button" class="close-message" style="margin-left: auto; background: none; border: none; cursor: pointer; color: ${isError ? "#dc2626" : "#059669"};">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Insert after the table wrapper
  const tableWrapper = document.querySelector(".table-wrapper");
  if (tableWrapper) {
    tableWrapper.insertAdjacentElement("afterend", messageDiv);
  }
  
  // Add close button functionality
  const closeBtn = messageDiv.querySelector(".close-message");
  if (closeBtn) {
    closeBtn.onclick = () => messageDiv.remove();
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (messageDiv && messageDiv.parentNode) {
      messageDiv.remove();
    }
  }, 5000);
}

// ================= DISPLAY SUCCESS MESSAGE =================
function displayFormSuccess(message) {
  // Remove existing success message if any
  const existingSuccess = document.querySelector(".form-success-message");
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  // Remove any existing error message
  clearFormError();
  
  // Create success message element
  const successDiv = document.createElement("div");
  successDiv.className = "form-success-message";
  successDiv.style.cssText = `
    background: #ecfdf5;
    color: #059669;
    padding: 12px 16px;
    border-radius: 12px;
    margin-top: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #a7f3d0;
    animation: slideInDown 0.3s ease;
  `;
  successDiv.innerHTML = `
    <i class="fas fa-check-circle" style="font-size: 16px;"></i>
    <span>${message}</span>
    <button type="button" class="close-success" style="margin-left: auto; background: none; border: none; cursor: pointer; color: #059669;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Insert after the form actions
  const formActions = document.querySelector(".form-actions");
  if (formActions) {
    formActions.insertAdjacentElement("afterend", successDiv);
  } else {
    const form = document.getElementById("createAdminForm");
    if (form) form.appendChild(successDiv);
  }
  
  // Add close button functionality
  const closeBtn = successDiv.querySelector(".close-success");
  if (closeBtn) {
    closeBtn.onclick = () => successDiv.remove();
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (successDiv && successDiv.parentNode) {
      successDiv.remove();
    }
  }, 5000);
}

// ================= DISPLAY ERROR MESSAGE =================
function displayFormError(message) {
  // Remove existing error message if any
  const existingError = document.querySelector(".form-error-message");
  if (existingError) {
    existingError.remove();
  }
  
  // Remove any existing success message
  const existingSuccess = document.querySelector(".form-success-message");
  if (existingSuccess) {
    existingSuccess.remove();
  }
  
  // Create error message element
  const errorDiv = document.createElement("div");
  errorDiv.className = "form-error-message";
  errorDiv.style.cssText = `
    background: #fef2f2;
    color: #dc2626;
    padding: 12px 16px;
    border-radius: 12px;
    margin-top: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #fecaca;
    animation: slideInDown 0.3s ease;
  `;
  errorDiv.innerHTML = `
    <i class="fas fa-exclamation-circle" style="font-size: 16px;"></i>
    <span>${message}</span>
    <button type="button" class="close-error" style="margin-left: auto; background: none; border: none; cursor: pointer; color: #dc2626;">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  // Insert after the form actions
  const formActions = document.querySelector(".form-actions");
  if (formActions) {
    formActions.insertAdjacentElement("afterend", errorDiv);
  } else {
    const form = document.getElementById("createAdminForm");
    if (form) form.appendChild(errorDiv);
  }
  
  // Add close button functionality
  const closeBtn = errorDiv.querySelector(".close-error");
  if (closeBtn) {
    closeBtn.onclick = () => errorDiv.remove();
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.remove();
    }
  }, 5000);
}

// ================= CLEAR FORM MESSAGES =================
function clearFormError() {
  const existingError = document.querySelector(".form-error-message");
  if (existingError) {
    existingError.remove();
  }
}

function clearFormSuccess() {
  const existingSuccess = document.querySelector(".form-success-message");
  if (existingSuccess) {
    existingSuccess.remove();
  }
}

function clearFormMessages() {
  clearFormError();
  clearFormSuccess();
}

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const logoutCloseBtn = logoutModal ? logoutModal.querySelector(".close-btn") : null;
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    logoutModal.style.display = "block";
  });
}

if (logoutCloseBtn) {
  logoutCloseBtn.addEventListener("click", () => {
    logoutModal.style.display = "none";
  });
}

if (cancelLogout) {
  cancelLogout.addEventListener("click", () => {
    logoutModal.style.display = "none";
  });
}

// UPDATED LOGOUT HANDLER - Use SessionManager
if (confirmLogout) {
  confirmLogout.addEventListener("click", () => {
    if (window.SessionManager) {
      window.SessionManager.logout('You have been logged out successfully.');
    } else {
      // Fallback logout
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace("/");
    }
  });
}

window.addEventListener("click", (e) => {
  if (e.target === logoutModal) {
    logoutModal.style.display = "none";
  }
});

// ================= DELETE MODAL =================
let adminToDelete = null;
let adminToDeleteUsername = null;
let adminToDeleteId = null;
const deleteModal = document.getElementById("deleteAdminModal");
const deleteText = document.getElementById("deleteAdminText");
const cancelDelete = document.getElementById("cancelDeleteAdmin");
const confirmDelete = document.getElementById("confirmDeleteAdmin");
const closeBtn = deleteModal ? deleteModal.querySelector(".close-btn") : null;

function openDeleteModal(adminId, username) {
  adminToDelete = adminId;
  adminToDeleteUsername = username;
  adminToDeleteId = adminId;
  deleteText.innerText = `Delete admin "${username}" (${adminId}) ?`;
  deleteModal.style.display = "block";
}

function closeDeleteModal() {
  deleteModal.style.display = "none";
  adminToDelete = null;
  adminToDeleteUsername = null;
  adminToDeleteId = null;
}

if (cancelDelete) cancelDelete.onclick = closeDeleteModal;
if (closeBtn) closeBtn.onclick = closeDeleteModal;

if (confirmDelete) {
  confirmDelete.onclick = async () => {
    if (!adminToDelete) return;
    try {
      const res = await fetch(`/api/superadmin/admins/${adminToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        displayTableMessage(`Admin "${adminToDeleteUsername}" (${adminToDeleteId}) deleted successfully!`);
      } else {
        const data = await res.json();
        displayTableMessage(data.error || "Failed to delete admin", true);
      }
    } catch (error) {
      displayTableMessage("Network error. Please try again.", true);
    }

    // Clear cache and refresh
    sessionStorage.removeItem("adminsCache");
    await loadAdmins(true);
    closeDeleteModal();
  };
}

// ================= PROFILE =================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    profileMenu.classList.toggle("show");
  });

  window.addEventListener("click", (e) => {
    if (!profileBtn.contains(e.target)) {
      profileMenu.classList.remove("show");
    }
  });
}

async function loadProfile() {
  try {
    const res = await fetch("/api/superadmin/profile");
    const profile = await res.json();
    const profileNameSpan = document.getElementById("profileName");
    if (profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
  } catch (err) {
    console.error(err);
  }
}
loadProfile();

// ================= STATUS MODAL =================
let selectedAdminId = null;
let selectedAdminUsername = null;
let newStatus = null;

function openStatusModal(adminId, username, currentStatus) {
  selectedAdminId = adminId;
  selectedAdminUsername = username;
  newStatus = currentStatus === "Active" ? "Deactivated" : "Active";

  const modalTitle = document.getElementById("statusModalTitle");
  const modalText = document.getElementById("statusModalText");
  
  if (modalTitle) modalTitle.innerText = `Confirm ${newStatus}`;
  if (modalText) modalText.innerText = `Are you sure you want to ${newStatus.toLowerCase()} "${username}" (${adminId})?`;

  const statusModal = document.getElementById("statusModal");
  if (statusModal) statusModal.style.display = "block";
}

const confirmStatusBtn = document.getElementById("confirmStatus");
if (confirmStatusBtn) {
  confirmStatusBtn.onclick = async () => {
    if (!selectedAdminId) return;
    try {
      const res = await fetch(`/api/superadmin/admins/${selectedAdminId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        displayTableMessage(`Admin "${selectedAdminUsername}" (${selectedAdminId}) ${newStatus.toLowerCase()} successfully!`);
      } else {
        const data = await res.json();
        displayTableMessage(data.error || "Failed to update status", true);
      }
    } catch (error) {
      displayTableMessage("Network error. Please try again.", true);
    }

    // Clear cache and refresh
    sessionStorage.removeItem("adminsCache");
    loadAdmins(true);
    const statusModal = document.getElementById("statusModal");
    if (statusModal) statusModal.style.display = "none";
  };
}

const cancelStatusBtn = document.getElementById("cancelStatus");
if (cancelStatusBtn) {
  cancelStatusBtn.onclick = () => {
    const statusModal = document.getElementById("statusModal");
    if (statusModal) statusModal.style.display = "none";
  };
}

// ================= VIEW INFO MODAL =================
const viewInfoModal = document.getElementById("viewInfoModal");
const closeInfoModalBtn = document.getElementById("closeInfoModalBtn");

function openViewInfoModal(adminId) {
    fetch(`/api/superadmin/admins/${adminId}`)
        .then((res) => res.json())
        .then((admin) => {
            const infoUsername = document.getElementById("infoUsername");
            const infoName = document.getElementById("infoName");
            const infoEmail = document.getElementById("infoEmail");
            const infoContact = document.getElementById("infoContact");
            const infoArea = document.getElementById("infoArea");
            const infoStatus = document.getElementById("infoStatus");
            
            if (infoUsername) infoUsername.value = admin.username || "";
            if (infoName) infoName.value = admin.username || "";
            if (infoEmail) infoEmail.value = admin.email || "";
            if (infoContact) infoContact.value = admin.contact || "Not provided";
            if (infoArea) infoArea.value = admin.area || "";

            if (infoStatus) {
                const statusText = admin.status || "Inactive";
                infoStatus.textContent = statusText;
                infoStatus.className = `info-status-badge ${statusText === "Active" ? "active" : "inactive"}`;
            }

            if (viewInfoModal) {
                viewInfoModal.classList.add("show");
                viewInfoModal.style.display = "flex";
            }
        })
        .catch(() => displayTableMessage("Failed to load admin info", true));
}

function closeInfoModal() {
    if (viewInfoModal) {
        viewInfoModal.classList.remove("show");
        viewInfoModal.style.display = "none";
    }
}

// Close button events
if (closeInfoModalBtn) {
    closeInfoModalBtn.onclick = closeInfoModal;
}

// Close when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === viewInfoModal) {
        closeInfoModal();
    }
});

// Close with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && viewInfoModal && viewInfoModal.classList.contains("show")) {
        closeInfoModal();
    }
});

// ================= LOAD AREAS FROM MYSQL =================
async function loadAreasForSelect() {
    const areaSelect = document.getElementById("adminArea");
    if (!areaSelect) return;
    
    areaSelect.innerHTML = '<option value="">Loading areas...</option>';
    areaSelect.disabled = true;
    
    try {
        const response = await fetch("/api/superadmin/areas");
        if (!response.ok) {
            throw new Error("Failed to load areas");
        }
        
        const areas = await response.json();
        
        // Extract unique cities from areas
        const uniqueCities = [...new Set(areas.map(area => area.city))];
        uniqueCities.sort();
        
        areaSelect.innerHTML = '<option value="">Select Area</option>';
        
        if (uniqueCities.length === 0) {
            areaSelect.innerHTML = '<option value="">No areas available. Please add areas first.</option>';
            areaSelect.disabled = true;
            return;
        }
        
        uniqueCities.forEach(city => {
            const option = document.createElement("option");
            option.value = city;
            option.textContent = city;
            areaSelect.appendChild(option);
        });
        
        areaSelect.disabled = false;
        console.log(`Loaded ${uniqueCities.length} cities from MySQL areas`);
        
    } catch (error) {
        console.error("Error loading areas:", error);
        areaSelect.innerHTML = '<option value="">Error loading areas. Please refresh.</option>';
        areaSelect.disabled = true;
        displayFormError("Failed to load areas. Please refresh the page.");
    }
}

// ================= SEARCH FUNCTION =================
function setupSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  
  function filterAdmins() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
      renderAdmins(allAdmins);
      return;
    }
    
    const filtered = allAdmins.filter(admin => 
      (admin.admin_id && admin.admin_id.toLowerCase().includes(searchTerm)) ||
      (admin.username && admin.username.toLowerCase().includes(searchTerm)) ||
      (admin.area && admin.area.toLowerCase().includes(searchTerm))
    );
    
    renderAdmins(filtered);
  }
  
  searchInput.addEventListener("input", filterAdmins);
}

// ================= RENDER ADMINS =================
function renderAdmins(admins) {
  const tbody = document.querySelector("#adminsTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  if (!admins || admins.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center; padding:40px;">
          <i class="fas fa-user-slash" style="font-size:48px; color:#cbd5e1;"></i>
          <p style="margin-top:12px; color:#64748b;">No administrators found</p>
         </td>
       </tr>
    `;
    return;
  }

  admins.forEach((admin) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
       <td><strong>${admin.admin_id}</strong><br><span style="font-size: 0.7rem; color: #666;">${admin.username}</span></td>
       <td>${admin.area}</td>
      <td style="text-align: center;">
        <span style="
            display: inline-block;
            padding: 4px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: ${admin.status === "Active" ? "#e8f5e9" : "#ffebee"};
            color: ${admin.status === "Active" ? "#27ae60" : "#c0392b"};
            border: 1px solid ${admin.status === "Active" ? "#c8e6c9" : "#ffcdd2"};
        ">
          ${admin.status}
        </span>
        </td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
          <button class="statusBtn"
              style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${admin.admin_id}"
              data-username="${admin.username}"
              data-status="${admin.status}">
              ${admin.status === "Active" ? "Deactivate" : "Activate"}
          </button>

          <button class="viewBtn"
              style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${admin.admin_id}">
              View
          </button>

          <button class="deleteBtn"
              style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${admin.admin_id}"
              data-username="${admin.username}">
              Delete
          </button>
        </div>
        </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach events
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.onclick = () => openDeleteModal(btn.dataset.id, btn.dataset.username);
  });
  document.querySelectorAll(".statusBtn").forEach((btn) => {
    btn.onclick = () => openStatusModal(btn.dataset.id, btn.dataset.username, btn.dataset.status);
  });
  document.querySelectorAll(".viewBtn").forEach((btn) => {
    btn.onclick = () => openViewInfoModal(btn.dataset.id);
  });
}

// ================= LOAD ADMINS =================
async function loadAdmins(forceRefresh = false) {
  const tbody = document.querySelector("#adminsTable tbody");
  if (!tbody) return;

  const cached = JSON.parse(sessionStorage.getItem("adminsCache") || "null");
  if (cached && !forceRefresh) {
    allAdmins = cached;
    renderAdmins(cached);
    return;
  }

  tbody.innerHTML = `
     <tr>
      <td colspan="4" style="text-align:center;padding:40px;">
        <div class="spinner"></div>
        <p style="margin-top:12px;">Loading admins...</p>
        </td>
      </tr>
  `;

  try {
    const res = await fetch("/api/superadmin/admins");
    const admins = await res.json();

    allAdmins = admins;
    sessionStorage.setItem("adminsCache", JSON.stringify(admins));
    renderAdmins(admins);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:40px;color:#dc3545;">Failed to load admins</td></tr>`;
    console.error(err);
  }
}

// ================= CREATE ADMIN =================
const createAdminForm = document.getElementById("createAdminForm");
if (createAdminForm) {
  createAdminForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    clearFormMessages();
    
    const username = document.getElementById("adminUsername").value;
    const email = document.getElementById("adminEmail").value;
    const area = document.getElementById("adminArea").value;

    if (!username || !email || !area) {
      displayFormError("All fields are required. Please fill in all fields.");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{4,20}$/;
    if (!usernameRegex.test(username)) {
      displayFormError("Username must be 4-20 characters and can only contain letters, numbers, underscores, and hyphens.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      displayFormError("Please enter a valid email address.");
      return;
    }

    const submitBtn = createAdminForm.querySelector(".btn-primary");
    const resetBtn = createAdminForm.querySelector(".btn-reset");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    resetBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
      const res = await fetch("/api/superadmin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, area }),
      });

      const data = await res.json();

      if (res.ok) {
        displayFormSuccess(data.message || "Admin created successfully!");
        createAdminForm.reset();

        sessionStorage.removeItem("adminsCache");
        await loadAdmins(true);
      } else {
        displayFormError(data.error || "Failed to create admin. Please try again.");
      }
    } catch (error) {
      console.error("Error creating admin:", error);
      displayFormError("Network error. Please check your connection and try again.");
    } finally {
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ================= INITIAL LOAD =================
loadAdmins();
setupSearchFilter();
loadAreasForSelect();

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .form-error-message,
  .form-success-message,
  .table-message {
    animation: slideInDown 0.3s ease;
  }
`;
document.head.appendChild(style);

// Initialize notification system if available
document.addEventListener("DOMContentLoaded", () => {
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});