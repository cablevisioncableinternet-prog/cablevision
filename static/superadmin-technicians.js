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

// ==================== HAMBURGER MENU TOGGLE ====================
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
    const form = document.getElementById("createTechnicianForm");
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
    const form = document.getElementById("createTechnicianForm");
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



// ================= DELETE MODAL =================
let technicianToDelete = null;
let technicianToDeleteName = null;
let technicianToDeleteId = null;
const deleteModal = document.getElementById("deleteTechnicianModal");
const deleteText = document.getElementById("deleteTechnicianText");
const cancelDelete = document.getElementById("cancelDeleteTechnician");
const confirmDelete = document.getElementById("confirmDeleteTechnician");
const closeBtn = deleteModal ? deleteModal.querySelector(".close-btn") : null;

function openDeleteModal(technicianId, name) {
  technicianToDelete = technicianId;
  technicianToDeleteName = name;
  technicianToDeleteId = technicianId;
  deleteText.innerText = `Delete technician "${name}" (${technicianId}) ?`;
  deleteModal.style.display = "flex";
  deleteModal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
  deleteModal.style.display = "none";
  deleteModal.classList.remove('show');
  document.body.style.overflow = '';
  technicianToDelete = null;
  technicianToDeleteName = null;
  technicianToDeleteId = null;
}

if (cancelDelete) cancelDelete.onclick = closeDeleteModal;
if (closeBtn) closeBtn.onclick = closeDeleteModal;

if (confirmDelete) {
  confirmDelete.onclick = async () => {
    if (!technicianToDelete) return;
    try {
      const res = await fetch(`/api/superadmin/technicians/${technicianToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Technician "${technicianToDeleteName}" (${technicianToDeleteId}) deleted successfully!`, 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete technician", 'error');
      }
    } catch (error) {
      showToast("Network error. Please try again.", 'error');
    }

    // Clear cache and refresh
    sessionStorage.removeItem("techniciansCache");
    await loadTechnicians(true);
    
    // IMPORTANT: Refresh teams table to update member counts
    await loadTeamsTable();
    await loadTeamsForSelect();
    
    closeDeleteModal();
  };
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
if(profileBtn && profileMenu){
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });
    window.addEventListener("click", e => { if(!profileBtn.contains(e.target)) profileMenu.classList.remove("show"); });
}

async function loadProfile(){
    try{
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        if(!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if(profileNameSpan) profileNameSpan.textContent = profile.username || "";
    }catch(err){ console.error(err); }
}
loadProfile();

// ==================== LOGOUT MODAL (FIXED) ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
if(logoutBtn && logoutModal){
    const closeBtn = document.getElementById("closeLogoutModal");
    const cancelBtn = document.getElementById("cancelLogout");
    const confirmBtn = document.getElementById("confirmLogout");

    // Open modal
    logoutBtn.addEventListener("click", function(e) { 
        e.preventDefault(); 
        logoutModal.classList.add('show');  // ✅ ITO ANG TAMA
        document.body.style.overflow = 'hidden';
    });
    
    // Close - X button
    if(closeBtn) {
        closeBtn.addEventListener("click", function() { 
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        });
    }
    
    // Close - Cancel button
    if(cancelBtn) {
        cancelBtn.addEventListener("click", function() { 
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        });
    }
    
    // Confirm logout
    if(confirmBtn) {
        confirmBtn.addEventListener("click", function() {
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
        if(e.target === logoutModal) {
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        }
    });
}


// ================= STATUS MODAL =================
let selectedTechnicianId = null;
let selectedTechnicianName = null;
let newStatus = null;

function openStatusModal(technicianId, name, currentStatus) {
  selectedTechnicianId = technicianId;
  selectedTechnicianName = name;
  newStatus = currentStatus === "Active" ? "Deactivated" : "Active";

  const modalTitle = document.getElementById("statusModalTitle");
  const modalText = document.getElementById("statusModalText");
  
  if (modalTitle) modalTitle.innerText = `Confirm ${newStatus}`;
  if (modalText) modalText.innerText = `Are you sure you want to ${newStatus.toLowerCase()} "${name}" (${technicianId})?`;

  const statusModal = document.getElementById("statusModal");
  if (statusModal) {
    statusModal.style.display = "flex";
    statusModal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeStatusModal() {
  const statusModal = document.getElementById("statusModal");
  if (statusModal) {
    statusModal.style.display = "none";
    statusModal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

const confirmStatusBtn = document.getElementById("confirmStatus");
if (confirmStatusBtn) {
  confirmStatusBtn.onclick = async () => {
    if (!selectedTechnicianId) return;
    try {
      const res = await fetch(`/api/superadmin/technicians/${selectedTechnicianId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Technician "${selectedTechnicianName}" (${selectedTechnicianId}) ${newStatus.toLowerCase()} successfully!`, 'success');
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update status", 'error');
      }
    } catch (error) {
      showToast("Network error. Please try again.", 'error');
    }

    // Clear cache and refresh
    sessionStorage.removeItem("techniciansCache");
    loadTechnicians(true);
    closeStatusModal();
  };
}

const cancelStatusBtn = document.getElementById("cancelStatus");
if (cancelStatusBtn) {
  cancelStatusBtn.onclick = closeStatusModal;
}

// ================= VIEW INFO MODAL =================
const viewInfoModal = document.getElementById("viewInfoModal");
const closeInfoModalBtn = document.getElementById("closeInfoModalBtn");


function openViewInfoModal(technicianId) {
    // Show loading state
    const infoName = document.getElementById("infoName");
    const infoEmail = document.getElementById("infoEmail");
    const infoArea = document.getElementById("infoArea");
    const infoTeam = document.getElementById("infoTeam");
    const infoStatus = document.getElementById("infoStatus");
    const infoTechnicianId = document.getElementById("infoTechnicianId");
    
    // Set loading text
    if (infoTechnicianId) infoTechnicianId.value = "Loading...";
    if (infoName) infoName.value = "Loading...";
    if (infoEmail) infoEmail.value = "Loading...";
    if (infoArea) infoArea.value = "Loading...";
    if (infoTeam) infoTeam.value = "Loading...";
    
    // Show modal
    if (viewInfoModal) {
        viewInfoModal.classList.add("show");
        viewInfoModal.style.display = "flex";
    }
    
    fetch(`/api/superadmin/technicians/${technicianId}`)
        .then((res) => res.json())
        .then((technician) => {
            console.log("📋 Technician data:", technician);
            
            if (infoTechnicianId) infoTechnicianId.value = technician.technician_id || "";
            if (infoName) infoName.value = technician.name || "";
            if (infoEmail) infoEmail.value = technician.email || "";
            if (infoArea) infoArea.value = technician.area || "";

            // Get team name from team_id
            if (infoTeam) {
                if (technician.team_id) {
                    // Find the team name from allTeams data
                    const team = allTeams.find(t => t.team_id === technician.team_id);
                    infoTeam.value = team ? team.team_name : technician.team_id;
                    console.log(`✅ Team found: ${infoTeam.value}`);
                } else {
                    infoTeam.value = "Not assigned";
                    console.log(`ℹ️ No team assigned`);
                }
            }

            if (infoStatus) {
                const statusText = technician.status || "Active";
                infoStatus.textContent = statusText;
                infoStatus.className = `info-status-badge ${statusText === "Active" ? "active" : "inactive"}`;
            }
        })
        .catch((error) => {
            console.error("❌ Failed to load technician info:", error);
            showToast("Failed to load technician information", 'error');
            
            // Set error state
            if (infoName) infoName.value = "Error loading data";
            if (infoTeam) infoTeam.value = "Error";
        });
}

// Close info modal function
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

// ================= LOAD AREAS =================
async function loadAreasForSelect() {
    const areaSelects = [
        document.getElementById("technicianArea"),
        document.getElementById("teamArea"),
        document.getElementById("editTeamArea")
    ];
    
    const validSelects = areaSelects.filter(el => el !== null);
    
    if (validSelects.length === 0) {
        console.warn('No area select elements found');
        return;
    }
    
    const currentValues = {};
    validSelects.forEach(select => {
        currentValues[select.id] = select.value;
        console.log(`📌 Stored current value for ${select.id}: "${select.value}"`);
    });
    
    validSelects.forEach(select => {
        select.innerHTML = '<option value="">Loading areas...</option>';
        select.disabled = true;
    });
    
    try {
        const response = await fetch("/api/superadmin/areas");
        if (!response.ok) {
            throw new Error("Failed to load areas");
        }
        
        const areas = await response.json();
        const uniqueCities = [...new Set(areas.map(area => area.city))];
        uniqueCities.sort();
        
        console.log(`📋 Loaded ${uniqueCities.length} cities:`, uniqueCities);
        
        validSelects.forEach(select => {
            const selectId = select.id;
            const currentValue = currentValues[selectId] || '';
            
            select.innerHTML = '<option value="" disabled selected>Select Area</option>';
            
            if (uniqueCities.length === 0) {
                select.innerHTML = '<option value="">No areas available. Please add areas first.</option>';
                select.disabled = true;
                return;
            }
            
            uniqueCities.forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                select.appendChild(option);
            });
            
            select.disabled = false;
            
            if (currentValue) {
                if (uniqueCities.includes(currentValue)) {
                    select.value = currentValue;
                    console.log(`✅ ${selectId}: Selected exact match: "${currentValue}"`);
                } else {
                    const matched = uniqueCities.find(c => c.toLowerCase() === currentValue.toLowerCase());
                    if (matched) {
                        select.value = matched;
                        console.log(`✅ ${selectId}: Selected case-insensitive match: "${matched}" (from "${currentValue}")`);
                    } else {
                        console.log(`⚠️ ${selectId}: Area "${currentValue}" not found in options`);
                    }
                }
            } else {
                console.log(`ℹ️ ${selectId}: No current value to select`);
            }
        });
        
    } catch (error) {
        console.error("Error loading areas:", error);
        validSelects.forEach(select => {
            select.innerHTML = '<option value="">Error loading areas. Please refresh.</option>';
            select.disabled = true;
        });
        displayFormError("Failed to load areas. Please refresh the page.");
    }
}

// ================= SEARCH FUNCTION =================
function setupSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  
  function filterTechnicians() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
      renderTechnicians(allTechnicians);
      return;
    }
    
    const filtered = allTechnicians.filter(technician => 
      (technician.technician_id && technician.technician_id.toLowerCase().includes(searchTerm)) ||
      (technician.name && technician.name.toLowerCase().includes(searchTerm)) ||
      (technician.email && technician.email.toLowerCase().includes(searchTerm)) ||
      (technician.area && technician.area.toLowerCase().includes(searchTerm))
    );
    
    renderTechnicians(filtered);
  }
  
  searchInput.addEventListener("input", filterTechnicians);
}

// ================= RENDER TECHNICIANS =================
function renderTechnicians(technicians) {
  const tbody = document.querySelector("#techniciansTable tbody");
  if (!tbody) return;
  
  tbody.innerHTML = "";

  if (!technicians || technicians.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:40px;">
          <i class="fas fa-user-slash" style="font-size:48px; color:#cbd5e1;"></i>
          <p style="margin-top:12px; color:#64748b;">No technicians found</p>
        </td>
      </tr>
    `;
    return;
  }

  technicians.forEach((technician) => {
    // Get team name if team_id exists
    let teamName = '';
    if (technician.team_id) {
      // Find team in allTeams (which should be loaded)
      const team = allTeams.find(t => t.team_id === technician.team_id);
      teamName = team ? team.team_name : 'Unknown Team';
      console.log(`🔍 Technician ${technician.technician_id} (${technician.name}) -> Team: ${technician.team_id} -> Name: ${teamName}`);
    }
    
    const tr = document.createElement("tr");
    const needsAllow = hasActiveLoginLock(technician);
    tr.innerHTML = `
        <td><strong>${technician.technician_id}</strong><br><span style="font-size: 0.7rem; color: #666;">${technician.name}</span></td>
        <td>${technician.email}</td>
        <td>${technician.area}</td>
        <td style="text-align: center;">${teamName || '<span style="color: #999; font-size: 0.7rem;">Not assigned</span>'}</td>
      <td style="text-align: center;">
        <span style="
            display: inline-block;
            padding: 4px 14px;
            border-radius: 40px;
            font-weight: 600;
            font-size: 0.7rem;
            background: ${technician.status === "Active" ? "#e8f5e9" : "#ffebee"};
            color: ${technician.status === "Active" ? "#27ae60" : "#c0392b"};
            border: 1px solid ${technician.status === "Active" ? "#c8e6c9" : "#ffcdd2"};
        ">
          ${technician.status}
        </span>
        </td>
      <td style="text-align: center;">
            ${needsAllow ? '<small style="display:block;color:#dc2626;margin-bottom:6px;">Account locked</small>' : ''}
        <div class="account-action-buttons" style="display: flex; gap: 10px; justify-content: center; align-items: center;">
          <button class="statusBtn"
              style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${technician.technician_id}"
              data-name="${technician.name}"
              data-status="${technician.status}">
              <i class="fas fa-toggle-off"></i> ${technician.status === "Active" ? "Deactivate" : "Activate"}
          </button>

          <button class="viewBtn"
              style="background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${technician.technician_id}">
               <i class="fas fa-eye"></i> View
          </button>

          <button class="deleteBtn"
              style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
              data-id="${technician.technician_id}"
              data-name="${technician.name}">
              <i class="fas fa-trash"></i> Delete
          </button>
          ${needsAllow ? `<button class="allowLoginBtn" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:6px 14px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;" data-id="${technician.technician_id}"><i class="fas fa-unlock"></i> Allow</button>` : ''}
        </div>
        </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach events
  document.querySelectorAll(".deleteBtn").forEach((btn) => {
    btn.onclick = () => openDeleteModal(btn.dataset.id, btn.dataset.name);
  });
  document.querySelectorAll(".statusBtn").forEach((btn) => {
    btn.onclick = () => openStatusModal(btn.dataset.id, btn.dataset.name, btn.dataset.status);
  });
  document.querySelectorAll(".viewBtn").forEach((btn) => {
    btn.onclick = () => openViewInfoModal(btn.dataset.id);
  });
    document.querySelectorAll(".allowLoginBtn").forEach((btn) => {
        btn.onclick = async () => {
            btn.disabled = true;
            try {
                const response = await fetch(`/api/superadmin/technicians/${btn.dataset.id}/unlock`, { method: "POST" });
                const data = await response.json();
                showToast(data.message || data.error || "Unable to allow login", response.ok ? "success" : "error");
                if (response.ok) await loadTechnicians(true);
            } catch (error) {
                showToast("Network error. Please try again.", "error");
                btn.disabled = false;
            }
        };
    });
}

// ================= LOAD TECHNICIANS =================
async function loadTechnicians(forceRefresh = false) {
  const tbody = document.querySelector("#techniciansTable tbody");
  if (!tbody) return;

  const cached = JSON.parse(sessionStorage.getItem("techniciansCache") || "null");
    const cacheHasLockoutFields = Array.isArray(cached) && (
        cached.length === 0 || (
            Object.prototype.hasOwnProperty.call(cached[0], "locked_until") &&
            Object.prototype.hasOwnProperty.call(cached[0], "lock_level")
        )
    );
    if (cached && cacheHasLockoutFields && !forceRefresh) {
    allTechnicians = cached;
    allTechniciansData = cached;
    
    // Make sure teams are loaded for mapping
    if (allTeams.length === 0) {
      await loadTeamsForSelect();
    }
    
    renderTechnicians(cached);
    return;
  }

  tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:24px 0;">
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
    // Load teams first so we have the mapping
    if (allTeams.length === 0) {
      await loadTeamsForSelect();
    }
    
    const res = await fetch("/api/superadmin/technicians");
    const technicians = await res.json();

    allTechnicians = technicians;
    allTechniciansData = technicians;
    sessionStorage.setItem("techniciansCache", JSON.stringify(technicians));
    renderTechnicians(technicians);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#dc3545;">Failed to load technicians</td></tr>`;
    console.error(err);
  }
}

// ==================== TEAMS MANAGEMENT ====================
let allTechnicians = [];
let allTeams = [];
let allTeamsData = [];
let allTechniciansData = [];
let currentEditTeamId = null;

function hasActiveLoginLock(account) {
    if (Number(account.login_locked) === 1 || account.login_locked === true) return true;
    if (Number(account.lock_level) > 0) return true;
    const lockedUntil = account.locked_until ? new Date(String(account.locked_until).replace(' ', 'T')) : null;
    return Boolean(lockedUntil && !Number.isNaN(lockedUntil.getTime()) && lockedUntil.getTime() > Date.now());
}
let allAvailableTechnicians = [];
let pendingMembers = [];
let removedMembers = [];
let originalMembers = [];
let originalTeamData = {};
let pendingTeamChanges = null;

// Load teams for dropdown
async function loadTeamsForSelect() {
    const teamSelect = document.getElementById('technicianTeam');
    const leaderSelect = document.getElementById('teamLeader');
    const areaInput = document.getElementById('technicianArea');
    
    try {
        console.log('📡 Loading teams data...');
        const response = await fetch('/api/superadmin/teams');
        if (!response.ok) throw new Error('Failed to load teams');
        
        const teams = await response.json();
        allTeams = teams;
        allTeamsData = teams;
        console.log(`✅ Loaded ${teams.length} teams`);
        
        // Log teams for debugging
        teams.forEach(team => {
            console.log(`   ${team.team_id}: ${team.team_name} (${team.area})`);
        });
        
        // Populate technician team dropdown (for technician creation)
        if (teamSelect) {
            const currentValue = teamSelect.value;
            teamSelect.innerHTML = '<option value="" disabled selected>Select a team</option>';
            teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.team_id;
                option.textContent = `${team.team_name} (${team.area})`;
                if (team.team_id === currentValue) option.selected = true;
                teamSelect.appendChild(option);
            });
        }
        
        // ✅ LOAD TECHNICIANS FOR LEADER DROPDOWN
        const techResponse = await fetch('/api/superadmin/technicians');
        const technicians = await techResponse.json();
        allTechniciansData = technicians;
        
        // ✅ POPULATE LEADER DROPDOWN WITH ALL TECHNICIANS (will be filtered by area)
        if (leaderSelect) {
            const currentValue = leaderSelect.value;
            // Show all technicians initially (but will be filtered by area selection)
            leaderSelect.innerHTML = '<option value="" disabled selected>Select Leader</option>';
            // We'll populate properly when area is selected
        }
        
        // ✅ SETUP AREA CHANGE EVENT FOR LEADER DROPDOWN
        const areaSelect = document.getElementById('teamArea');
        if (areaSelect) {
            // Remove existing listener to avoid duplicates
            areaSelect.removeEventListener('change', updateLeaderDropdownByArea);
            areaSelect.addEventListener('change', updateLeaderDropdownByArea);
            
            // If there's already a selected area, update the leader dropdown
            if (areaSelect.value) {
                updateLeaderDropdownByArea();
            }
        }
        
        // Auto-fill area if a team is already selected
        if (teamSelect && teamSelect.value && areaInput) {
            const selectedTeam = allTeams.find(team => team.team_id === teamSelect.value);
            if (selectedTeam) {
                areaInput.value = selectedTeam.area || '';
            }
        }
        
    } catch (error) {
        console.error('❌ Error loading teams:', error);
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Error loading teams</option>';
        }
        if (leaderSelect) {
            leaderSelect.innerHTML = '<option value="">Error loading technicians</option>';
        }
    }
}

// ✅ NEW FUNCTION: Update leader dropdown based on selected area
function updateLeaderDropdownByArea() {
    const areaSelect = document.getElementById('teamArea');
    const leaderSelect = document.getElementById('teamLeader');
    const selectedArea = areaSelect ? areaSelect.value : '';
    
    console.log(`🔍 Updating leader dropdown for area: "${selectedArea}"`);
    
    if (!leaderSelect) return;
    
    // Get current value to preserve if still valid
    const currentValue = leaderSelect.value;
    
    // Clear dropdown
    leaderSelect.innerHTML = '<option value="">No leader assigned</option>';
    
    if (!selectedArea) {
        // No area selected - show message
        leaderSelect.innerHTML = '<option value="">Select area first</option>';
        leaderSelect.disabled = true;
        console.log('ℹ️ No area selected, leader dropdown disabled');
        return;
    }
    
    // Filter technicians by area (case-insensitive)
    const areaLower = selectedArea.toLowerCase().trim();
    const filteredTechnicians = allTechniciansData.filter(tech => {
        // Must be active
        if (tech.status !== 'Active') return false;
        
        // Check if area matches (case-insensitive)
        const techArea = (tech.area || '').toLowerCase().trim();
        return techArea === areaLower;
    });
    
    console.log(`✅ ${filteredTechnicians.length} technicians found in area "${selectedArea}"`);
    
    // Add "No leader assigned" option
    leaderSelect.innerHTML = '<option value="">No leader assigned</option>';
    
    // Add filtered technicians
    filteredTechnicians.forEach(tech => {
        const option = document.createElement('option');
        option.value = tech.technician_id;
        option.textContent = `${tech.name} (${tech.technician_id}) - ${tech.area}`;
        // If this technician was previously selected, keep it selected
        if (tech.technician_id === currentValue) {
            option.selected = true;
        }
        leaderSelect.appendChild(option);
    });
    
    // If no technicians found
    if (filteredTechnicians.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = `No active technicians in "${selectedArea}" area`;
        option.disabled = true;
        leaderSelect.appendChild(option);
    }
    
    leaderSelect.disabled = false;
    console.log(`✅ Leader dropdown updated with ${filteredTechnicians.length} technicians`);
}

// ==================== TEAMS TABLE ====================
// Load teams for the teams table
async function loadTeamsTable() {
    const tbody = document.getElementById('teamsTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr id="teamsLoadingRow">
            <td colspan="6" style="padding:24px 0;">
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
        // Ensure technicians data is loaded first for member counts
        if (allTechniciansData.length === 0) {
            await loadTechnicians();
        }
        
        const response = await fetch('/api/superadmin/teams');
        if (!response.ok) throw new Error('Failed to load teams');
        
        const teams = await response.json();
        allTeamsData = teams;
        renderTeamsTable(teams);
        
    } catch (error) {
        console.error('Error loading teams:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px; color: #dc3545;">
                    <i class="fas fa-exclamation-circle" style="font-size: 32px; display: block; margin-bottom: 12px;"></i>
                    Failed to load teams. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Render teams table
function renderTeamsTable(teams) {
    const tbody = document.getElementById('teamsTableBody');
    if (!tbody) return;
    
    if (!teams || teams.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:40px;">
                    <i class="fas fa-users-slash" style="font-size: 48px; color: #cbd5e1;"></i>
                    <p style="margin-top:12px; color: #64748b;">No teams found. Create a team to get started.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = '';
    
    teams.forEach(team => {
        const tr = document.createElement('tr');
        
        // Get team members count - use latest data
        const memberCount = allTechniciansData ? allTechniciansData.filter(t => t.team_id === team.team_id).length : 0;
        
        // Get team leader name - use latest data
        let leaderName = null;
        if (team.team_leader_id && allTechniciansData) {
            const leader = allTechniciansData.find(t => t.technician_id === team.team_leader_id);
            leaderName = leader ? leader.name : null;
        }
        
        tr.innerHTML = `
            <td>
                <strong>${team.team_id}</strong><br>
                <span style="font-size: 0.7rem; color: #666;">${team.team_name}</span>
            </td>
            <td>${team.area}</td>
            <td>${leaderName || '<span style="color: #999; font-size: 0.7rem;">No leader</span>'}</td>
            <td style="text-align: center;">
                <span style="
                    display: inline-block;
                    background: #eff6ff;
                    color: #0047ab;
                    padding: 4px 12px;
                    border-radius: 40px;
                    font-weight: 600;
                    font-size: 0.75rem;
                ">
                    ${memberCount} members
                </span>
            </td>
            <td style="text-align: center;">
                <span style="
                    display: inline-block;
                    padding: 4px 14px;
                    border-radius: 40px;
                    font-weight: 600;
                    font-size: 0.7rem;
                    background: ${team.status === 'Active' ? '#e8f5e9' : '#ffebee'};
                    color: ${team.status === 'Active' ? '#27ae60' : '#c0392b'};
                    border: 1px solid ${team.status === 'Active' ? '#c8e6c9' : '#ffcdd2'};
                ">
                    ${team.status}
                </span>
            </td>
            <td style="text-align: center;">
                <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <button class="editTeamBtn"
                        style="background:#eff6ff;color:#0047ab;border:1px solid #bfdbfe;padding:6px 16px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                        data-team-id="${team.team_id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="deleteTeamBtn"
                        style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:6px 16px;border-radius:30px;font-size:0.7rem;font-weight:500;cursor:pointer;"
                        data-team-id="${team.team_id}"
                        data-team-name="${team.team_name}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    // Attach edit button events
    document.querySelectorAll('.editTeamBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const teamId = btn.dataset.teamId;
            openTeamEditModal(teamId);
        });
    });
    
    // Attach delete button events
    document.querySelectorAll('.deleteTeamBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const teamId = btn.dataset.teamId;
            const teamName = btn.dataset.teamName;
            openDeleteTeamModal(teamId, teamName);
        });
    });
}

// Team search filter
function setupTeamSearch() {
    const searchInput = document.getElementById('teamSearchInput');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderTeamsTable(allTeamsData);
            return;
        }
        
        const filtered = allTeamsData.filter(team =>
            (team.team_id && team.team_id.toLowerCase().includes(searchTerm)) ||
            (team.team_name && team.team_name.toLowerCase().includes(searchTerm)) ||
            (team.area && team.area.toLowerCase().includes(searchTerm))
        );
        
        renderTeamsTable(filtered);
    });
}

// ==================== TEAM EDIT MODAL ====================
async function openTeamEditModal(teamId) {
    currentEditTeamId = teamId;
    
    // Reset pending lists
    pendingMembers = [];
    removedMembers = [];
    originalMembers = [];
    originalTeamData = {};
    
    // Show modal
    const modal = document.getElementById('teamEditModal');
    if (!modal) {
        console.error('❌ teamEditModal element not found!');
        return;
    }
    modal.classList.add('show');
    modal.style.display = 'flex';
    
    try {
        console.log('📥 Loading technicians data...');
        await loadAllTechnicians();
        console.log(`✅ Loaded ${allTechniciansData.length} technicians`);
        
        console.log(`📥 Loading team data for ${teamId}...`);
        await loadTeamData(teamId);
        
        // Get the current area value from the dropdown
        const areaSelect = document.getElementById('editTeamArea');
        const currentArea = areaSelect ? areaSelect.value : '';
        console.log(`📍 Current area value before loading areas: "${currentArea}"`);
        
        // Now load areas (this will preserve the selected value)
        await loadAreasForSelect();
        
        // Double-check: After loading areas, set the value again
        if (areaSelect && currentArea) {
            const options = Array.from(areaSelect.options);
            const match = options.find(opt => opt.value === currentArea);
            if (match) {
                areaSelect.value = currentArea;
                console.log(`✅ Re-set area value after load: "${currentArea}"`);
            } else {
                const matchCaseInsensitive = options.find(opt => 
                    opt.value.toLowerCase() === currentArea.toLowerCase()
                );
                if (matchCaseInsensitive) {
                    areaSelect.value = matchCaseInsensitive.value;
                    console.log(`✅ Re-set area value (case-insensitive): "${matchCaseInsensitive.value}"`);
                }
            }
        }
        
        await loadAvailableTechnicians(teamId);
        
        // Load team leaders AFTER all data is loaded
        setTimeout(() => {
            loadTeamLeadersForEdit();
        }, 200);
        
    } catch (error) {
        console.error('❌ Error opening team edit modal:', error);
        showToast('Error loading team data', 'error');
    }
}

// Load all technicians
async function loadAllTechnicians() {
    try {
        console.log('📡 Fetching technicians from API...');
        const response = await fetch('/api/superadmin/technicians');
        console.log(`📡 Response status: ${response.status}`);
        
        if (response.ok) {
            const data = await response.json();
            allTechniciansData = data;
            console.log(`✅ Loaded ${allTechniciansData.length} technicians`);
            
            // Log technicians with team_id
            const withTeam = data.filter(t => t.team_id);
            console.log(`📋 ${withTeam.length} technicians have team_id:`);
            withTeam.forEach(t => {
                console.log(`   ${t.technician_id} (${t.name}) -> ${t.team_id}`);
            });
            
        } else {
            console.error('❌ Failed to load technicians:', response.status);
        }
    } catch (error) {
        console.error('❌ Error loading technicians:', error);
    }
}

// Load team data for edit
async function loadTeamData(teamId) {
    try {
        const response = await fetch(`/api/superadmin/teams/${teamId}`);
        if (!response.ok) throw new Error('Failed to load team data');
        
        const team = await response.json();
        console.log('📋 Team data loaded:', team);
        
        // Store original team data for comparison
        originalTeamData = {
            team_id: team.team_id,
            team_name: team.team_name || '',
            area: team.area || '',
            team_leader_id: team.team_leader_id || '',
            status: team.status || 'Active'
        };
        
        // Populate form
        document.getElementById('editTeamId').value = team.team_id;
        document.getElementById('editTeamName').value = team.team_name || '';
        
        // Set area value - do this BEFORE loading areas
        const areaSelect = document.getElementById('editTeamArea');
        if (areaSelect) {
            areaSelect.value = team.area || '';
            console.log(`📍 Area set directly: "${team.area}"`);
        }
        
        document.getElementById('editTeamLeader').value = team.team_leader_id || '';
        document.getElementById('editTeamStatus').value = team.status || 'Active';
        
        console.log(`📍 Team area: "${team.area}"`);
        
        // Load team members
        console.log(`📋 Loading members for team ${teamId}...`);
        loadTeamMembersDirect(teamId);
        
    } catch (error) {
        console.error('❌ Error loading team data:', error);
        showToast('Failed to load team data', 'error');
    }
}

// Load team members with pending/removed tracking
function loadTeamMembersDirect(teamId) {
    const container = document.getElementById('teamMembersList');
    if (!container) {
        console.error('❌ teamMembersList element not found!');
        return;
    }
    
    // Make sure we have data
    if (!allTechniciansData || allTechniciansData.length === 0) {
        console.log('📡 allTechniciansData is empty in loadTeamMembersDirect, reloading...');
        loadAllTechnicians().then(() => {
            loadTeamMembersDirect(teamId);
        });
        return;
    }
    
    console.log(`🔍 Looking for members in team ${teamId}`);
    console.log(`📋 Total technicians in allTechniciansData: ${allTechniciansData.length}`);
    
    // Get current members from database
    const currentMembers = allTechniciansData.filter(tech => tech.team_id === teamId);
    
    // Store original members for comparison
    originalMembers = currentMembers.map(m => m.technician_id);
    
    // Apply pending additions and removals
    let displayMembers = [...currentMembers];
    
    // Add pending members (not already in the list)
    pendingMembers.forEach(pendingId => {
        if (!displayMembers.find(m => m.technician_id === pendingId)) {
            const tech = allTechniciansData.find(t => t.technician_id === pendingId);
            if (tech) {
                displayMembers.push(tech);
            }
        }
    });
    
    // Remove members that are marked for removal
    displayMembers = displayMembers.filter(m => !removedMembers.includes(m.technician_id));
    
    console.log(`📋 Displaying ${displayMembers.length} members (${currentMembers.length} original, +${pendingMembers.length} pending, -${removedMembers.length} removed)`);
    
    // Update member count
    const memberCountSpan = document.getElementById('memberCount');
    if (memberCountSpan) {
        memberCountSpan.textContent = displayMembers.length;
    }
    
    if (displayMembers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 13px;">
                <i class="fas fa-user-slash" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                No members in this team
            </div>
        `;
        // Update leader dropdown since members changed
        loadTeamLeadersForEdit();
        return;
    }
    
    container.innerHTML = displayMembers.map(member => `
        <div style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: ${removedMembers.includes(member.technician_id) ? '#fef2f2' : '#fff'};
            border-radius: 8px;
            border: 1px solid ${removedMembers.includes(member.technician_id) ? '#fecaca' : '#e2e8f0'};
            margin-bottom: 6px;
            opacity: ${removedMembers.includes(member.technician_id) ? '0.6' : '1'};
        ">
            <div>
                <strong style="font-size: 13px;">${member.name}</strong>
                <span style="font-size: 11px; color: #64748b; display: block;">
                    ${member.technician_id} • ${member.area}
                    ${pendingMembers.includes(member.technician_id) ? ' <span style="color: #059669; font-weight: 600;">(Pending Add)</span>' : ''}
                    ${removedMembers.includes(member.technician_id) ? ' <span style="color: #dc2626; font-weight: 600;">(Pending Remove)</span>' : ''}
                </span>
            </div>
            <button type="button" 
                class="toggleMemberBtn" 
                data-tech-id="${member.technician_id}"
                style="
                    background: ${removedMembers.includes(member.technician_id) ? '#ecfdf5' : '#fef2f2'};
                    color: ${removedMembers.includes(member.technician_id) ? '#059669' : '#dc2626'};
                    border: 1px solid ${removedMembers.includes(member.technician_id) ? '#a7f3d0' : '#fecaca'};
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    cursor: pointer;
                    font-weight: 500;
                ">
                <i class="fas ${removedMembers.includes(member.technician_id) ? 'fa-undo' : 'fa-user-minus'}"></i>
                ${removedMembers.includes(member.technician_id) ? ' Restore' : ' Remove'}
            </button>
        </div>
    `).join('');
    
    // Attach toggle member events
    container.querySelectorAll('.toggleMemberBtn').forEach(btn => {
        btn.addEventListener('click', function() {
            const techId = this.dataset.techId;
            toggleMember(techId);
        });
    });
    
    // Update leader dropdown since members changed
    setTimeout(() => {
        loadTeamLeadersForEdit();
    }, 100);
}

// Toggle member (add/remove)
function toggleMember(technicianId) {
    // Check if member is currently in the team (original)
    const isOriginalMember = originalMembers.includes(technicianId);
    
    // Check if member is pending removal
    const isPendingRemoval = removedMembers.includes(technicianId);
    
    // Check if member is pending addition
    const isPendingAddition = pendingMembers.includes(technicianId);
    
    // Get the current team leader value
    const leaderSelect = document.getElementById('editTeamLeader');
    const currentLeader = leaderSelect ? leaderSelect.value : null;
    
    // ✅ KUNIN ANG TEAM AREA PARA SA VALIDATION
    const teamArea = originalTeamData.area || '';
    
    if (isOriginalMember && !isPendingRemoval) {
        // Original member - mark for removal
        removedMembers.push(technicianId);
        console.log(`✅ Marked ${technicianId} for removal`);
        
        // If the removed member is the team leader, auto-set to "No leader assigned"
        if (currentLeader === technicianId) {
            if (leaderSelect) {
                leaderSelect.value = '';
                console.log(`🔄 Auto-set leader to "No leader assigned" because ${technicianId} was removed`);
                showToast('Team leader removed - automatically set to "No leader assigned"', 'info');
            }
        }
    } else if (isOriginalMember && isPendingRemoval) {
        // Original member - restore (remove from removal list)
        removedMembers = removedMembers.filter(id => id !== technicianId);
        console.log(`✅ Restored ${technicianId}`);
        
        // If the restored member was the original leader, restore it
        if (originalMembers.includes(technicianId) && leaderSelect) {
            const originalLeader = originalTeamData.team_leader_id;
            if (originalLeader === technicianId) {
                leaderSelect.value = technicianId;
                console.log(`🔄 Restored leader to ${technicianId}`);
            }
        }
    } else if (!isOriginalMember && !isPendingAddition) {
        // Not in team - mark for addition
        const tech = allTechniciansData.find(t => t.technician_id === technicianId);
        if (tech && tech.status === 'Active') {
            // ✅ VALIDATE: DAPAT PAREHO ANG AREA
            const techArea = (tech.area || '').toLowerCase().trim();
            const teamAreaLower = teamArea.toLowerCase().trim();
            
            if (techArea !== teamAreaLower) {
                showToast(`Cannot add "${tech.name}" - area (${tech.area}) does not match team area (${teamArea})`, 'error');
                return;
            }
            
            pendingMembers.push(technicianId);
            // Also remove from available list if present
            allAvailableTechnicians = allAvailableTechnicians.filter(t => t.technician_id !== technicianId);
            console.log(`✅ Marked ${technicianId} for addition`);
        } else {
            showToast('Cannot add inactive technician', 'error');
            return;
        }
    } else if (!isOriginalMember && isPendingAddition) {
        // Cancel pending addition
        pendingMembers = pendingMembers.filter(id => id !== technicianId);
        // Add back to available list
        const tech = allTechniciansData.find(t => t.technician_id === technicianId);
        if (tech) {
            allAvailableTechnicians.push(tech);
        }
        console.log(`✅ Cancelled addition of ${technicianId}`);
    }
    
    // Refresh the members list and available dropdown
    loadTeamMembersDirect(currentEditTeamId);
    updateAvailableTechniciansDropdown();
    // Leader dropdown will be updated inside loadTeamMembersDirect
}

// Update available technicians dropdown
function updateAvailableTechniciansDropdown() {
    const select = document.getElementById('addMemberSelect');
    if (!select) return;
    
    // ✅ KUNIN ANG AREA NG TEAM
    const teamArea = originalTeamData.area || '';
    console.log(`🔍 Updating available technicians for area: "${teamArea}"`);
    
    // Get all active technicians NOT in any team, with same area
    const available = allTechniciansData.filter(tech => {
        // Must be active
        if (tech.status !== 'Active') return false;
        
        // ✅ MUST HAVE SAME AREA AS TEAM
        const techArea = (tech.area || '').toLowerCase().trim();
        const teamAreaLower = teamArea.toLowerCase().trim();
        if (techArea !== teamAreaLower) return false;
        
        // Must NOT be in ANY team (team_id must be NULL or empty)
        if (tech.team_id && tech.team_id !== '') return false;
        
        // Must NOT be pending addition
        if (pendingMembers.includes(tech.technician_id)) return false;
        
        // Must NOT be an original member
        if (originalMembers.includes(tech.technician_id)) return false;
        
        return true;
    });
    
    allAvailableTechnicians = available;
    
    select.innerHTML = '<option value="">Select a technician to add</option>';
    
    if (available.length === 0) {
        if (teamArea) {
            select.innerHTML = `<option value="">No available technicians in "${teamArea}" area</option>`;
        } else {
            select.innerHTML = '<option value="">No available technicians</option>';
        }
    } else {
        available.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.technician_id;
            option.textContent = `${tech.name} (${tech.technician_id}) - ${tech.area} [Unassigned]`;
            select.appendChild(option);
        });
    }
    
    console.log(`✅ ${available.length} available technicians matching area "${teamArea}"`);
}

// Add member to team
async function addMemberToTeam() {
    const select = document.getElementById('addMemberSelect');
    const technicianId = select.value;
    
    if (!technicianId) {
        showToast('Please select a technician to add', 'info');
        return;
    }
    
    // Add to pending list
    const tech = allTechniciansData.find(t => t.technician_id === technicianId);
    if (tech) {
        // Remove from available list
        allAvailableTechnicians = allAvailableTechnicians.filter(t => t.technician_id !== technicianId);
        
        // Add to pending members
        if (!pendingMembers.includes(technicianId)) {
            pendingMembers.push(technicianId);
        }
        
        // Refresh display
        loadTeamMembersDirect(currentEditTeamId);
        updateAvailableTechniciansDropdown();
        
        // Hide add member section
        document.getElementById('addMemberSection').style.display = 'none';
        select.value = '';
        
        showToast(`${tech.name} marked for addition`, 'success');
        console.log(` Added ${technicianId} to pending list`);
    }
}

// Load available technicians
async function loadAvailableTechnicians(teamId) {
    const select = document.getElementById('addMemberSelect');
    if (!select) return;
    
    try {
        let allTechs = allTechniciansData;
        if (allTechs.length === 0) {
            const response = await fetch('/api/superadmin/technicians');
            if (response.ok) {
                allTechs = await response.json();
                allTechniciansData = allTechs;
            }
        }
        
        // ✅ KUNIN ANG AREA NG TEAM
        const teamArea = originalTeamData.area || '';
        console.log(`🔍 Team area: "${teamArea}"`);
        
        console.log(`🔍 Filtering available technicians for team ${teamId} (Area: ${teamArea})`);
        console.log(`📋 Total technicians: ${allTechs.length}`);
        
        // ✅ I-FILTER BATAY SA AREA NG TEAM
        const available = allTechs.filter(tech => {
            // Must be active
            if (tech.status !== 'Active') {
                return false;
            }
            
            // ✅ MUST HAVE SAME AREA AS TEAM
            // I-normalize ang area para sa case-insensitive comparison
            const techArea = (tech.area || '').toLowerCase().trim();
            const teamAreaLower = teamArea.toLowerCase().trim();
            
            // I-check kung pareho ang area (case-insensitive)
            if (techArea !== teamAreaLower) {
                return false;
            }
            
            // Must NOT be in the current team
            if (tech.team_id === teamId) {
                return false;
            }
            
            // Must NOT be in ANY team (team_id must be NULL or empty)
            if (tech.team_id && tech.team_id !== '') {
                return false;
            }
            
            // Must NOT be pending addition
            if (pendingMembers.includes(tech.technician_id)) {
                return false;
            }
            
            // Must NOT be an original member
            if (originalMembers.includes(tech.technician_id)) {
                return false;
            }
            
            return true;
        });
        
        allAvailableTechnicians = available;
        
        // Populate dropdown
        select.innerHTML = '<option value="">Select a technician to add</option>';
        
        if (available.length === 0) {
            if (teamArea) {
                select.innerHTML = `<option value="">No available technicians in "${teamArea}" area</option>`;
            } else {
                select.innerHTML = '<option value="">No available technicians (all are assigned to teams)</option>';
            }
        } else {
            available.forEach(tech => {
                const option = document.createElement('option');
                option.value = tech.technician_id;
                option.textContent = `${tech.name} (${tech.technician_id}) - ${tech.area} [Unassigned]`;
                select.appendChild(option);
            });
        }
        
        console.log(`✅ ${available.length} available technicians matching area "${teamArea}" for team ${teamId}`);
        
    } catch (error) {
        console.error('Error loading available technicians:', error);
        select.innerHTML = '<option value="">Error loading technicians</option>';
    }
}

// Load team leaders for edit
async function loadTeamLeadersForEdit() {
    const select = document.getElementById('editTeamLeader');
    if (!select) return;
    
    try {
        // Make sure we have data
        if (!allTechniciansData || allTechniciansData.length === 0) {
            console.log('📡 allTechniciansData is empty, reloading...');
            await loadAllTechnicians();
        }
        
        // Get current team members considering pending changes
        let currentMembers = allTechniciansData.filter(tech => tech.team_id === currentEditTeamId);
        
        // Add pending members
        pendingMembers.forEach(pendingId => {
            if (!currentMembers.find(m => m.technician_id === pendingId)) {
                const tech = allTechniciansData.find(t => t.technician_id === pendingId);
                if (tech) {
                    currentMembers.push(tech);
                }
            }
        });
        
        // Remove members marked for removal
        currentMembers = currentMembers.filter(m => !removedMembers.includes(m.technician_id));
        
        // Save the current value to preserve
        const currentValue = select.value;
        
        // Always show "No leader assigned" option
        select.innerHTML = '<option value="">No leader assigned</option>';
        
        // Only show technicians that are currently in the team (including pending)
        currentMembers.forEach(tech => {
            const option = document.createElement('option');
            option.value = tech.technician_id;
            option.textContent = `${tech.name} (${tech.technician_id}) - ${tech.area}`;
            // If this technician is the current leader, select it
            if (tech.technician_id === currentValue || tech.technician_id === originalTeamData.team_leader_id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // If no members, show message
        if (currentMembers.length === 0) {
            select.innerHTML = '<option value="">No leader assigned</option>';
        }
        
        // If the current leader was removed, auto-set to "No leader assigned"
        if (select.value && !currentMembers.find(m => m.technician_id === select.value)) {
            select.value = '';
            console.log(`🔄 Auto-set leader to "No leader assigned" (leader was removed)`);
        }
        
        console.log(` Loaded ${currentMembers.length} team members for leader selection`);
        
    } catch (error) {
        console.error('Error loading team leaders:', error);
        select.innerHTML = '<option value="">Error loading members</option>';
    }
}

// Close team edit modal
function closeTeamEditModal() {
    const modal = document.getElementById('teamEditModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.getElementById('addMemberSection').style.display = 'none';
    }
    currentEditTeamId = null;
    originalTeamData = {};
}

// ==================== CONFIRM TEAM CHANGES MODAL ====================
function openConfirmTeamChangesModal(changeDetails) {
    const modal = document.getElementById('confirmTeamChangesModal');
    const content = document.getElementById('confirmTeamChangesContent');
    
    if (!modal || !content) {
        console.error('❌ Confirm team changes modal elements not found!');
        return;
    }
    
    // Store the changes for later use
    pendingTeamChanges = changeDetails;
    
    // Build the content HTML
    let html = `
        <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
            <p style="margin: 0; font-weight: 600; color: #1e293b; font-size: 14px;">
                <i class="fas fa-info-circle" style="color: #0047ab;"></i> 
                Please review the following changes before saving:
            </p>
        </div>
    `;
    
    // Team info changes
    if (changeDetails.teamInfoChanges) {
        html += `
            <div style="background: #eff6ff; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #0047ab;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0047ab;">
                    <i class="fas fa-edit"></i> Team Information Changes
                </h4>
                <div style="font-size: 13px; color: #1e293b;">
        `;
        
        if (changeDetails.nameChange) {
            html += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Team Name:</span>
                <span><span style="color: #dc2626; text-decoration: line-through;">${escapeHtml(changeDetails.oldName)}</span> → <span style="color: #16a34a; font-weight: 600;">${escapeHtml(changeDetails.newName)}</span></span>
            </div>`;
        }
        
        if (changeDetails.areaChange) {
            // ✅ IDAGDAG ANG WARNING KUNG AREA ANG NAGBAGO
            html += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Area:</span>
                <span><span style="color: #dc2626; text-decoration: line-through;">${escapeHtml(changeDetails.oldArea)}</span> → <span style="color: #16a34a; font-weight: 600;">${escapeHtml(changeDetails.newArea)}</span></span>
            </div>`;
            
            // ✅ I-SHOW ANG WARNING NA MAG-U-UPDATE ANG AREA NG MGA MEMBERS
            html += `<div style="display: flex; justify-content: space-between; padding: 4px 0; background: #fef3c7; margin-top: 4px; padding: 8px 12px; border-radius: 6px;">
                <span style="color: #92400e; font-weight: 600;"><i class="fas fa-exclamation-triangle"></i> Effect on Members:</span>
                <span style="color: #92400e; font-weight: 600;">All ${changeDetails.memberCount || 0} members' area will be updated to "${escapeHtml(changeDetails.newArea)}"</span>
            </div>`;
        }
        
        if (changeDetails.leaderChange) {
            html += `<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Team Leader:</span>
                <span><span style="color: #dc2626; text-decoration: line-through;">${escapeHtml(changeDetails.oldLeader)}</span> → <span style="color: #16a34a; font-weight: 600;">${escapeHtml(changeDetails.newLeader)}</span></span>
            </div>`;
        }
        
        if (changeDetails.statusChange) {
            html += `<div style="display: flex; justify-content: space-between; padding: 4px 0;">
                <span style="color: #64748b;">Status:</span>
                <span><span style="color: #dc2626; text-decoration: line-through;">${escapeHtml(changeDetails.oldStatus)}</span> → <span style="color: #16a34a; font-weight: 600;">${escapeHtml(changeDetails.newStatus)}</span></span>
            </div>`;
        }
        
        html += `</div></div>`;
    }
    
    // Member changes
    if (changeDetails.memberChanges) {
        html += `
            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #64748b;">
                <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                    <i class="fas fa-users"></i> Member Changes
                </h4>
                <div style="font-size: 13px; color: #1e293b;">
        `;
        
        if (changeDetails.addedMembers && changeDetails.addedMembers.length > 0) {
            html += `<div style="margin-bottom: 6px; color: #16a34a; font-weight: 600;">📥 Adding (${changeDetails.addedMembers.length}):</div>`;
            changeDetails.addedMembers.forEach(m => {
                html += `<div style="padding: 3px 0 3px 16px; color: #16a34a;">+ ${escapeHtml(m.name)} (${escapeHtml(m.id)})</div>`;
            });
        }
        
        if (changeDetails.removedMembers && changeDetails.removedMembers.length > 0) {
            if (changeDetails.addedMembers && changeDetails.addedMembers.length > 0) {
                html += `<div style="margin-top: 8px;"></div>`;
            }
            html += `<div style="margin-bottom: 6px; color: #dc2626; font-weight: 600;">📤 Removing (${changeDetails.removedMembers.length}):</div>`;
            changeDetails.removedMembers.forEach(m => {
                html += `<div style="padding: 3px 0 3px 16px; color: #dc2626;">- ${escapeHtml(m.name)} (${escapeHtml(m.id)})</div>`;
            });
        }
        
        html += `</div></div>`;
    }
    
    // Summary
    html += `
        <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; text-align: center;">
            <span style="font-size: 12px; color: #64748b;">
                <i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> 
                This action cannot be undone. Please review carefully.
            </span>
        </div>
    `;
    
    content.innerHTML = html;
    modal.style.display = 'block';
    modal.classList.add('show');
}

function closeConfirmTeamChangesModal() {
    const modal = document.getElementById('confirmTeamChangesModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    pendingTeamChanges = null;
}

// Execute team changes
async function executeTeamChanges(changeDetails) {
    const teamId = changeDetails.teamId;
    const errors = [];
    
    try {
        // Process additions FIRST
        if (changeDetails.addedMembers && changeDetails.addedMembers.length > 0) {
            for (const member of changeDetails.addedMembers) {
                const response = await fetch(`/api/superadmin/teams/${teamId}/add-member`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technician_id: member.id })
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    errors.push(`Add ${member.name}: ${data.error || 'Failed'}`);
                } else {
                    console.log(` Added member: ${member.name} (${member.id})`);
                }
            }
        }
        
        // Process removals
        if (changeDetails.removedMembers && changeDetails.removedMembers.length > 0) {
            for (const member of changeDetails.removedMembers) {
                const response = await fetch(`/api/superadmin/teams/${teamId}/remove-member`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ technician_id: member.id })
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    errors.push(`Remove ${member.name}: ${data.error || 'Failed'}`);
                } else {
                    console.log(` Removed member: ${member.name} (${member.id})`);
                }
            }
        }
        
        // Update team info LAST
        if (changeDetails.teamInfoChanges) {
            const updateResponse = await fetch(`/api/superadmin/teams/${teamId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    team_name: changeDetails.newName || changeDetails.oldName,
                    area: changeDetails.newArea || changeDetails.oldArea,
                    team_leader_id: changeDetails.newLeaderId || null,
                    status: changeDetails.newStatus || changeDetails.oldStatus
                })
            });
            
            if (!updateResponse.ok) {
                const data = await updateResponse.json();
                throw new Error(data.error || 'Failed to update team info');
            } else {
                console.log(` Team info updated successfully`);
            }
        }
        
        if (errors.length > 0) {
            return { success: false, error: `Partial success: ${errors.length} error(s) occurred. ${errors.join('; ')}` };
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error executing team changes:', error);
        return { success: false, error: error.message };
    }
}

// ==================== DELETE TEAM ====================
let teamToDelete = null;
let teamToDeleteName = null;

function openDeleteTeamModal(teamId, teamName) {
    teamToDelete = teamId;
    teamToDeleteName = teamName;
    
    const modal = document.getElementById('deleteTeamModal');
    const text = document.getElementById('deleteTeamText');
    
    if (modal && text) {
        text.innerHTML = `Are you sure you want to delete team <strong>"${escapeHtml(teamName)}"</strong> (${escapeHtml(teamId)})?`;
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeDeleteTeamModal() {
    const modal = document.getElementById('deleteTeamModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
    teamToDelete = null;
    teamToDeleteName = null;
}

// Confirm delete team
async function confirmDeleteTeam() {
    if (!teamToDelete) return;
    
    // Show loading
    const confirmBtn = document.getElementById('confirmDeleteTeam');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    try {
        const response = await fetch(`/api/superadmin/teams/${teamToDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`Team "${teamToDeleteName}" deleted successfully!`, 'success');
            // Refresh data
            await loadTeamsTable();
            await loadTeamsForSelect();
            await loadTechnicians(true);
            closeDeleteTeamModal();
        } else {
            showToast(data.error || 'Failed to delete team', 'error');
        }
    } catch (error) {
        console.error('Error deleting team:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

// Setup delete team modal events
function setupDeleteTeamModalEvents() {
    // Close buttons
    document.getElementById('closeDeleteTeamModalBtn')?.addEventListener('click', closeDeleteTeamModal);
    document.getElementById('cancelDeleteTeam')?.addEventListener('click', closeDeleteTeamModal);
    
    // Close on outside click
    const modal = document.getElementById('deleteTeamModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeDeleteTeamModal();
        });
    }
    
    // Confirm delete
    document.getElementById('confirmDeleteTeam')?.addEventListener('click', confirmDeleteTeam);
    
    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDeleteTeamModal();
        }
    });
}

// ==================== TEAM EDIT FORM SUBMIT ====================
async function saveTeamChanges(event) {
    event.preventDefault();
    
    const teamId = document.getElementById('editTeamId').value;
    const teamName = document.getElementById('editTeamName').value.trim();
    const area = document.getElementById('editTeamArea').value;
    const teamLeader = document.getElementById('editTeamLeader').value || null;
    const status = document.getElementById('editTeamStatus').value;
    
    console.log('🔄 SAVING TEAM CHANGES...');
    console.log(`Team ID: ${teamId}`);
    console.log(`Team Leader value: "${teamLeader}"`);
    console.log(`Original Team Leader: "${originalTeamData.team_leader_id}"`);
    console.log(`Pending Add (${pendingMembers.length}):`, pendingMembers);
    console.log(`Pending Remove (${removedMembers.length}):`, removedMembers);
    
    if (!teamName) {
        showToast('Team name is required', 'error');
        return;
    }
    
    if (!area) {
        showToast('Please select an area', 'error');
        return;
    }

    // Validate team leader
    if (teamLeader) {
        const isMember = originalMembers.includes(teamLeader) || pendingMembers.includes(teamLeader);
        const isRemoved = removedMembers.includes(teamLeader);
        
        if (!isMember || isRemoved) {
            showToast('Selected team leader is not a member of the team', 'error');
            document.getElementById('editTeamLeader').value = '';
            return;
        }
    }
    
    // Check if there are changes
    const hasTeamInfoChanges = 
        teamName !== originalTeamData.team_name ||
        area !== originalTeamData.area ||
        teamLeader !== originalTeamData.team_leader_id ||
        status !== originalTeamData.status;
    
    const hasMemberChanges = pendingMembers.length > 0 || removedMembers.length > 0;
    
    if (!hasTeamInfoChanges && !hasMemberChanges) {
        showToast('No changes to save', 'info');
        return;
    }
    
    // ========== GET CURRENT MEMBER COUNT ==========
    let currentMembers = allTechniciansData.filter(tech => tech.team_id === currentEditTeamId);
    // Add pending members
    let memberCount = currentMembers.length + pendingMembers.length - removedMembers.length;
    
    // ========== BUILD CHANGE DETAILS FOR MODAL ==========
    const changeDetails = {
        teamId: teamId,
        teamInfoChanges: hasTeamInfoChanges,
        memberChanges: hasMemberChanges,
        memberCount: memberCount, // ✅ IDAGDAG ITO
        oldName: originalTeamData.team_name,
        newName: teamName,
        nameChange: teamName !== originalTeamData.team_name,
        oldArea: originalTeamData.area,
        newArea: area,
        areaChange: area !== originalTeamData.area,
        oldLeader: 'None',
        newLeader: 'None',
        oldLeaderId: originalTeamData.team_leader_id,
        newLeaderId: teamLeader,
        leaderChange: teamLeader !== originalTeamData.team_leader_id,
        oldStatus: originalTeamData.status,
        newStatus: status,
        statusChange: status !== originalTeamData.status,
        addedMembers: [],
        removedMembers: []
    };
    
    // Get leader names
    if (originalTeamData.team_leader_id) {
        const oldLeader = allTechniciansData.find(t => t.technician_id === originalTeamData.team_leader_id);
        changeDetails.oldLeader = oldLeader ? oldLeader.name : originalTeamData.team_leader_id;
    }
    if (teamLeader) {
        const newLeader = allTechniciansData.find(t => t.technician_id === teamLeader);
        changeDetails.newLeader = newLeader ? newLeader.name : teamLeader;
    }
    
    // Get added members
    pendingMembers.forEach(id => {
        const tech = allTechniciansData.find(t => t.technician_id === id);
        if (tech) {
            changeDetails.addedMembers.push({ id: tech.technician_id, name: tech.name });
        }
    });
    
    // Get removed members
    removedMembers.forEach(id => {
        const tech = allTechniciansData.find(t => t.technician_id === id);
        if (tech) {
            changeDetails.removedMembers.push({ id: tech.technician_id, name: tech.name });
        }
    });
    
    // If no member changes, remove the flag
    if (changeDetails.addedMembers.length === 0 && changeDetails.removedMembers.length === 0) {
        changeDetails.memberChanges = false;
    }
    
    // If only leader changed, but no other changes
    if (!changeDetails.teamInfoChanges && !changeDetails.memberChanges) {
        showToast('No changes to save', 'info');
        return;
    }
    
    // Open confirmation modal
    openConfirmTeamChangesModal(changeDetails);
}

// ==================== CONFIRM TEAM CHANGES MODAL EVENTS ====================
function setupConfirmTeamChangesModalEvents() {
    const modal = document.getElementById('confirmTeamChangesModal');
    const closeBtn = document.getElementById('closeConfirmTeamChangesModal');
    const cancelBtn = document.getElementById('cancelTeamChangesBtn');
    const confirmBtn = document.getElementById('confirmTeamChangesBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeConfirmTeamChangesModal);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeConfirmTeamChangesModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeConfirmTeamChangesModal();
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async function() {
            if (!pendingTeamChanges) return;
            
            // Disable button and show loading
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            try {
                const result = await executeTeamChanges(pendingTeamChanges);
                if (result.success) {
                    showToast(' Team updated successfully!', 'success');
                    closeConfirmTeamChangesModal();
                    
                    // Refresh all data
                    sessionStorage.removeItem('techniciansCache');
                    await loadAllTechnicians();
                    await loadTeamsTable();
                    await loadTeamsForSelect();
                    await loadTechnicians(true);
                    
                    // Close the edit modal
                    closeTeamEditModal();
                } else {
                    showToast(result.error || 'Failed to save changes', 'error');
                }
            } catch (error) {
                console.error('Error saving team changes:', error);
                showToast('Network error. Please try again.', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        });
    }
    
    // Close with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeConfirmTeamChangesModal();
        }
    });
}

// ==================== TEAM EDIT MODAL EVENT LISTENERS ====================
function setupTeamEditModalEvents() {
    // Close modal buttons
    document.getElementById('closeTeamEditModalBtn')?.addEventListener('click', closeTeamEditModal);
    document.getElementById('cancelTeamEditBtn')?.addEventListener('click', closeTeamEditModal);
    
    // Close on outside click
    const modal = document.getElementById('teamEditModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeTeamEditModal();
        });
    }
    
    const memberSearchInput = document.getElementById('memberSearchInput');
    const addMemberSelect = document.getElementById('addMemberSelect');
    
    // Search field inside add member section
    memberSearchInput?.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        if (!addMemberSelect) return;

        Array.from(addMemberSelect.options).forEach(option => {
            if (!option.value) {
                option.hidden = false;
                return;
            }

            const optionText = option.text.toLowerCase();
            option.hidden = !optionText.includes(query);
        });
    });
    
    // Add member toggle
    document.getElementById('addMemberBtn')?.addEventListener('click', function() {
        const section = document.getElementById('addMemberSection');
        const isHidden = section.style.display === 'none';
        section.style.display = isHidden ? 'block' : 'none';

        if (isHidden) {
            memberSearchInput?.focus();
            memberSearchInput.value = '';
            addMemberSelect.value = '';
            Array.from(addMemberSelect?.options || []).forEach(option => {
                option.hidden = false;
            });
        }
    });
    
    document.getElementById('cancelAddMemberBtn')?.addEventListener('click', function() {
        document.getElementById('addMemberSection').style.display = 'none';
        memberSearchInput.value = '';
        addMemberSelect.value = '';
        Array.from(addMemberSelect?.options || []).forEach(option => {
            option.hidden = false;
        });
    });
    
    document.getElementById('confirmAddMemberBtn')?.addEventListener('click', addMemberToTeam);
    
    // Form submit
    document.getElementById('teamEditForm')?.addEventListener('submit', saveTeamChanges);
}

// ================= CREATE TEAM =================
const createTeamForm = document.getElementById('createTeamForm');
if (createTeamForm) {
    createTeamForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const team_name = document.getElementById('teamName').value.trim();
        const area = document.getElementById('teamArea').value;
        const team_leader_id = document.getElementById('teamLeader').value || null;
        
        if (!team_name) {
            showToast('Team name is required', 'error');
            return;
        }
        
        if (!area) {
            showToast('Please select an area', 'error');
            return;
        }
        
        // ✅ VALIDATE: If leader is selected, check if area matches
        if (team_leader_id) {
            const selectedLeader = allTechniciansData.find(t => t.technician_id === team_leader_id);
            if (selectedLeader) {
                const leaderArea = (selectedLeader.area || '').toLowerCase().trim();
                const teamAreaLower = area.toLowerCase().trim();
                if (leaderArea !== teamAreaLower) {
                    showToast(`Selected leader's area (${selectedLeader.area}) does not match team area (${area})`, 'error');
                    return;
                }
            }
        }
        
        const submitBtn = createTeamForm.querySelector('.btn-primary');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
            const response = await fetch('/api/superadmin/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_name, area, team_leader_id, status: 'Active' })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showToast(data.message || 'Team created successfully!', 'success');
                createTeamForm.reset();
                
                // Reset leader dropdown to default
                const leaderSelect = document.getElementById('teamLeader');
                if (leaderSelect) {
                    leaderSelect.innerHTML = '<option value="">Select area first</option>';
                    leaderSelect.disabled = true;
                }
                
                await loadTeamsForSelect();
                await loadTechnicians(true);
                await loadTeamsTable();
            } else {
                showToast(data.error || 'Failed to create team', 'error');
            }
        } catch (error) {
            console.error('Error creating team:', error);
            showToast('Network error. Please try again.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// ==================== AUTO-FILL AREA FROM TEAM SELECTION ====================
function setupTeamAreaAutoFill() {
    const teamSelect = document.getElementById('technicianTeam');
    const areaInput = document.getElementById('technicianArea');
    
    if (!teamSelect || !areaInput) return;
    
    teamSelect.addEventListener('change', function() {
        const selectedTeamId = this.value;
        
        if (!selectedTeamId) {
            areaInput.value = '';
            areaInput.placeholder = 'Select a team first';
            return;
        }
        
        // Find the selected team from allTeams
        const selectedTeam = allTeams.find(team => team.team_id === selectedTeamId);
        
        if (selectedTeam) {
            areaInput.value = selectedTeam.area || '';
            areaInput.placeholder = 'Area auto-filled from team';
            console.log(` Auto-filled area: "${selectedTeam.area}" from team "${selectedTeam.team_name}"`);
        } else {
            areaInput.value = '';
            areaInput.placeholder = 'Area not found for this team';
        }
    });
}

// ================= CREATE TECHNICIAN =================
const createTechnicianForm = document.getElementById("createTechnicianForm");
if (createTechnicianForm) {
  createTechnicianForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const name = document.getElementById("technicianName").value.trim();
    const email = document.getElementById("technicianEmail").value.trim();
    const area = document.getElementById("technicianArea").value;
    const team_id = document.getElementById("technicianTeam").value || null;

    if (!name || !email || !area) {
      showToast("All fields are required. Please fill in all fields.", 'error');
      return;
    }

    const nameRegex = /^[a-zA-Z\s\'-]{2,100}$/;
    if (!nameRegex.test(name)) {
      showToast("Name must be 2-100 characters and can only contain letters, spaces, apostrophe, and hyphen.", 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address.", 'error');
      return;
    }

    const submitBtn = createTechnicianForm.querySelector(".btn-primary");
    const resetBtn = createTechnicianForm.querySelector(".btn-reset");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    resetBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

    try {
      const res = await fetch("/api/superadmin/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, area, team_id }),
      });

      const data = await res.json();

      if (res.ok) {
        showToast(data.message || "Technician created successfully!", 'success');
        createTechnicianForm.reset();

        sessionStorage.removeItem("techniciansCache");
        await loadTechnicians(true);
        await loadTeamsForSelect();
        await loadTeamsTable();
      } else {
        showToast(data.error || "Failed to create technician. Please try again.", 'error');
      }
    } catch (error) {
      console.error("Error creating technician:", error);
      showToast("Network error. Please check your connection and try again.", 'error');
    } finally {
      submitBtn.disabled = false;
      resetBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

// ================= NAP BOX SLOTS MONITORING =================
let superMap = null;
let superMarkers = [];
let superAllSlots = [];
let superAllNapboxes = [];
let superCurrentFilter = 'all';
let superCurrentArea = '';
let superCurrentBarangay = '';
let superAreaBoundaryLayer = null;

const LAGUNA_GEOJSON_URLS = {
    "Santa Cruz": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434280000.0.001.json",
    "Pagsanjan": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434240000.0.001.json",
    "Pila": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434260000.0.001.json",
    "Magdalena": "https://raw.githubusercontent.com/faeldon/philippines-json-maps/master/2023/geojson/municities/lowres/bgysubmuns-municity-0434160000.0.001.json"
};

function normalizeCityName(cityName) {
    if (!cityName) return null;
    const lowerName = cityName.toLowerCase().trim();
    if (lowerName === "santa cruz" || lowerName === "sta. cruz" || lowerName === "sta cruz") return "Santa Cruz";
    if (lowerName === "pagsanjan") return "Pagsanjan";
    if (lowerName === "pila") return "Pila";
    if (lowerName === "magdalena") return "Magdalena";
    return cityName.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function loadSuperNapboxData() {
    try {
        const techResponse = await fetch('/api/superadmin/technicians');
        const technicians = await techResponse.json();
        const allNapboxes = [];
        const allSlots = [];
        const napboxIds = new Set();
        
        for (const tech of technicians) {
            try {
                const response = await fetch(`/api/technician/technician-napbox?technician_id=${encodeURIComponent(tech.technician_id)}`);
                if (response.ok) {
                    const data = await response.json();
                    const napboxes = data.napboxes || [];
                    const slots = data.slots || [];
                    
                    napboxes.forEach(napbox => {
                        if (!napboxIds.has(napbox.id)) {
                            napboxIds.add(napbox.id);
                            allNapboxes.push(napbox);
                        }
                    });
                    
                    slots.forEach(slot => {
                        if (!allSlots.find(s => s.id === slot.id)) {
                            allSlots.push(slot);
                        }
                    });
                }
            } catch (err) {
                console.warn('Error loading napboxes:', err);
            }
        }
        
        superAllNapboxes = allNapboxes;
        superAllSlots = allSlots;
        
        superCurrentFilter = 'all';
        superCurrentArea = '';
        superCurrentBarangay = '';
        
        const areaFilter = document.getElementById('superAreaFilter');
        const barangayFilter = document.getElementById('superBarangayFilter');
        if (areaFilter) areaFilter.value = '';
        if (barangayFilter) barangayFilter.innerHTML = '<option value="">All Barangays</option>';
        
        document.querySelectorAll('.super-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'white';
            btn.style.color = '#333';
            if (btn.dataset.filter === 'all') {
                btn.classList.add('active');
                btn.style.background = '#0047ab';
                btn.style.color = 'white';
            }
        });
        
        updateSuperStats();
        await loadSuperAreaFilter();
        await loadSuperBarangayFilter('');
        renderSuperSlotsGrid();
        initSuperMap();
    } catch (error) {
        console.error('Error loading NAP box data:', error);
        const grid = document.getElementById('superSlotsGrid');
        if (grid) {
            grid.innerHTML = `<div class="no-data-message"><i class="fas fa-exclamation-triangle"></i><p>Failed to load slots data: ${error.message}</p></div>`;
        }
    }
}

function updateSuperStats() {
    const total = superAllSlots.length;
    const available = superAllSlots.filter(s => s.status === 'available').length;
    const occupied = superAllSlots.filter(s => s.status === 'occupied').length;
    const napboxCount = superAllNapboxes.length;
    
    document.getElementById('superTotalSlots').textContent = total;
    document.getElementById('superAvailableSlots').textContent = available;
    document.getElementById('superOccupiedSlots').textContent = occupied;
    document.getElementById('superNapboxCount').textContent = napboxCount;
}

async function loadSuperAreaFilter() {
    const areaSelect = document.getElementById('superAreaFilter');
    if (!areaSelect) return;
    try {
        const uniqueAreas = [...new Set(superAllNapboxes.map(n => n.area).filter(a => a))].sort();
        areaSelect.innerHTML = '<option value="">All Areas</option>';
        uniqueAreas.forEach(area => {
            areaSelect.innerHTML += `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`;
        });
    } catch (error) {
        console.error('Error loading area filter:', error);
        areaSelect.innerHTML = '<option value="">Error loading areas</option>';
    }
}

async function loadSuperBarangayFilter(selectedArea) {
    const barangaySelect = document.getElementById('superBarangayFilter');
    if (!barangaySelect) return;
    let barangays = [];
    if (selectedArea) {
        const napboxesInArea = superAllNapboxes.filter(n => n.area === selectedArea);
        barangays = [...new Set(napboxesInArea.map(n => n.barangay).filter(b => b && b !== 'Unknown'))];
    } else {
        barangays = [...new Set(superAllNapboxes.map(n => n.barangay).filter(b => b && b !== 'Unknown'))];
    }
    barangays.sort();
    barangaySelect.innerHTML = '<option value="">All Barangays</option>';
    barangays.forEach(barangay => {
        barangaySelect.innerHTML += `<option value="${escapeHtml(barangay)}">${escapeHtml(barangay)}</option>`;
    });
}

function getFilteredSlots() {
    let filtered = [...superAllSlots];
    if (superCurrentArea) {
        const napboxIdsInArea = superAllNapboxes.filter(n => n.area === superCurrentArea).map(n => n.id);
        filtered = filtered.filter(s => napboxIdsInArea.includes(s.napbox_id));
    }
    if (superCurrentBarangay) {
        filtered = filtered.filter(s => s.barangay === superCurrentBarangay);
    }
    if (superCurrentFilter !== 'all') {
        filtered = filtered.filter(s => s.status === superCurrentFilter);
    }
    return filtered;
}

function renderSuperSlotsGrid() {
    const grid = document.getElementById('superSlotsGrid');
    if (!grid) return;
    const filteredSlots = getFilteredSlots();
    
    if (filteredSlots.length === 0) {
        grid.innerHTML = `<div class="no-data-message" style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-inbox" style="font-size: 48px; color: #ccc;"></i>
            <p>No slots found</p>
            <p style="font-size: 12px; margin-top: 8px;">Try selecting a different area or barangay</p>
        </div>`;
        return;
    }
    
    grid.innerHTML = filteredSlots.map(slot => {
        // ✅ KUNIN ANG NAPBOX NAME
        const napbox = superAllNapboxes.find(n => n.id === slot.napbox_id);
        const napboxName = napbox ? napbox.name : slot.napbox_name || 'N/A';
        // I-shorten ang napbox name kung masyadong mahaba
        const shortNapboxName = napboxName.length > 14 ? napboxName.substring(0, 12) + '...' : napboxName;
        
        // ✅ AVAILABLE / OCCUPIED LABEL
        const isAvailable = slot.status === 'available';
        const statusLabel = isAvailable ? 'AVAILABLE' : 'OCCUPIED';
        const statusClass = isAvailable ? 'available' : 'occupied';
        
        // ✅ ACTIVE / INACTIVE LABEL
        // ACTIVE: kapag OCCUPIED (may customer na naka-assign)
        // INACTIVE: kapag AVAILABLE (walang customer) - kahit may previous customer name
        const isActive = slot.status === 'occupied' && slot.customer_name && slot.customer_name !== '';
        const activeLabel = isActive ? 'ACTIVE' : 'INACTIVE';
        const activeClass = isActive ? 'active' : 'inactive';
        
        const slotData = JSON.stringify(slot).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
        
        // ✅ CUSTOMER NAME
        let customerDisplay = '';
        if (slot.customer_name) {
            const customerName = slot.customer_name;
            const longNameClass = customerName.length > 30 ? 'very-long-name' : customerName.length > 15 ? 'long-name' : '';
            customerDisplay = `<span class="slot-customer ${longNameClass}">${escapeHtml(customerName)}</span>`;
        }
        
        return `<div class="slot-card ${statusClass}" onclick='showSuperSlotDetails(${slotData})'>
            <span class="slot-status-label ${statusClass}">${statusLabel}</span>
            <span class="slot-active-label ${activeClass}">${activeLabel}</span>
            <span class="slot-number">Slot ${slot.slot_number}</span>
            ${customerDisplay}
            ${slot.contract_number ? `<span class="slot-contract">Contract: ${escapeHtml(slot.contract_number)}</span>` : ''}
            ${slot.barangay ? `<span class="slot-barangay">${escapeHtml(slot.barangay)}</span>` : ''}
            <span class="slot-napbox-name" title="${escapeHtml(napboxName)}">
                <i class="fas fa-network-wired"></i> ${escapeHtml(shortNapboxName)}
            </span>
        </div>`;
    }).join('');
}

function initSuperMap() {
    const mapContainer = document.getElementById('superNapboxMap');
    if (!mapContainer) return;
    if (superMap) superMap.remove();
    superMap = L.map('superNapboxMap').setView([14.25, 121.45], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(superMap);
    addSuperNapboxMarkers();
}

function addSuperNapboxMarkers() {
    if (!superMap) return;
    superMarkers.forEach(m => { if (superMap.hasLayer(m)) superMap.removeLayer(m); });
    superMarkers = [];
    let napboxesToShow = [...superAllNapboxes];
    if (superCurrentArea) napboxesToShow = napboxesToShow.filter(n => n.area === superCurrentArea);
    if (superCurrentBarangay) napboxesToShow = napboxesToShow.filter(n => n.barangay === superCurrentBarangay);
    napboxesToShow.forEach(napbox => {
        const lat = napbox.latitude;
        const lng = napbox.longitude;
        if (lat && lng && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
            const marker = L.marker([lat, lng], {
                icon: L.divIcon({
                    className: 'napbox-marker-super',
                    html: '<div style="background: #dc2626; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>',
                    iconSize: [14, 14]
                })
            }).addTo(superMap);

            const napboxSlots = superAllSlots.filter(slot => slot.napbox_id === napbox.id);
            const availableCount = napboxSlots.filter(slot => slot.status === 'available').length;
            const occupiedCount = napboxSlots.filter(slot => slot.status === 'occupied').length;
            const coverageRadius = napbox.coverage_radius || 500;

            const popupContent = `
                <div style="min-width: 200px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
                    <b style="font-size:14px;">${escapeHtml(napbox.name || napbox.napbox_name || 'NAP Box')}</b><br>
                    <small style="color:#666;">${escapeHtml(napbox.barangay || napbox.location || 'Pinned Location')}</small>
                    <hr style="margin:6px 0;">
                    <b>Coverage:</b> ${coverageRadius}m<br>
                    <span style="color:#22c55e">● Available: ${availableCount}</span><br>
                    <span style="color:#ef4444">● Occupied: ${occupiedCount}</span>
                </div>
            `;
            marker.bindPopup(popupContent);
            superMarkers.push(marker);
        }
    });
}

async function showSuperAreaBoundary(areaName) {
    if (!superMap || !areaName) return;
    clearSuperAreaBoundary();
    const properArea = normalizeCityName(areaName);
    const url = LAGUNA_GEOJSON_URLS[properArea];

    try {
        if (url) {
            const response = await fetch(url);
            if (response.ok) {
                const geojsonData = await response.json();
                if (geojsonData?.features?.length > 0) {
                    displaySuperBoundaryOnly(geojsonData, properArea);
                    return;
                }
            }
        }
        await showSuperBoundaryFromNominatim(properArea);
    } catch (error) {
        console.error('Error loading area boundary:', error);
        await showSuperBoundaryFromNominatim(properArea);
    }
}

async function showSuperBoundaryFromNominatim(areaName) {
    if (!superMap || !areaName) return;
    const query = encodeURIComponent(`${areaName}, Laguna, Philippines`);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&polygon_geojson=1`, {
            headers: { 'User-Agent': 'CableVision-SuperAdmin/1.0' }
        });
        const data = await response.json();
        if (data?.length > 0 && data[0].geojson) {
            displaySuperBoundaryOnly({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: data[0].geojson, properties: {} }] }, areaName);
            return;
        }
        if (data?.length > 0 && data[0].boundingbox) {
            const bb = data[0].boundingbox;
            const bounds = [
                [parseFloat(bb[0]), parseFloat(bb[2])],
                [parseFloat(bb[1]), parseFloat(bb[3])]
            ];
            superAreaBoundaryLayer = L.rectangle(bounds, {
                color: '#0047ab',
                weight: 4,
                fillColor: '#4da3ff',
                fillOpacity: 0.15,
                dashArray: '8,6'
            }).addTo(superMap);
            superAreaBoundaryLayer.bringToFront();
            superMap.fitBounds(bounds, { padding: [40, 40] });
            showToast(`${areaName} boundary loaded`, 'success');
            return;
        }
    } catch (error) {
        console.error('Error loading Nominatim boundary:', error);
    }
    showToast(`Failed to display boundary for ${areaName}`, 'error');
}

function displaySuperBoundaryOnly(geojsonData, areaName) {
    if (!superMap) return;
    if (superAreaBoundaryLayer) {
        superMap.removeLayer(superAreaBoundaryLayer);
    }

    let bounds = L.latLngBounds();
    superAreaBoundaryLayer = L.geoJSON(geojsonData, {
        style: {
            color: '#000000',
            weight: 4,
            opacity: 1,
            fillColor: '#4da3ff',
            fillOpacity: 0.15,
            dashArray: '8,6',
            smoothFactor: 1
        },
        onEachFeature: function(feature, layer) {
            if (layer.getBounds) {
                bounds.extend(layer.getBounds());
            }
            layer.bindPopup(`
                <div style="font-size:14px; line-height:1.4;">
                    <b>${escapeHtml(areaName)}</b><br/>
                    Area Boundary
                </div>
            `);
        }
    }).addTo(superMap);

    superAreaBoundaryLayer.bringToFront();
    if (bounds.isValid()) {
        superMap.fitBounds(bounds, { padding: [40, 40] });
    }
    showToast(`${areaName} boundary loaded`, 'success');
}

function clearSuperAreaBoundary() {
    if (superAreaBoundaryLayer && superMap && superMap.hasLayer(superAreaBoundaryLayer)) {
        superMap.removeLayer(superAreaBoundaryLayer);
    }
    superAreaBoundaryLayer = null;
}

function showSuperSlotDetails(slot) {
    const modal = document.getElementById('superSlotDetailsModal');
    const modalTitle = document.getElementById('superSlotModalTitle');
    const modalContent = document.getElementById('superSlotDetailsContent');
    
    if (!modal || !modalContent) return;
    
    const statusText = slot.status === 'available' ? 'Available' : 'Occupied';
    const statusClass = slot.status === 'available' ? 'available' : 'occupied';
    const statusIcon = slot.status === 'available' ? 'fa-check-circle' : 'fa-circle';
    const napbox = superAllNapboxes.find(n => n.id === slot.napbox_id);
    const napboxName = napbox ? (napbox.name || napbox.napbox_name || 'N/A') : 'N/A';
    const areaName = napbox ? (napbox.area || 'N/A') : 'N/A';
    
    let lastUpdated = 'N/A';
    if (slot.updated_at) {
        try {
            const date = new Date(slot.updated_at);
            lastUpdated = date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch(e) {
            lastUpdated = slot.updated_at;
        }
    }
    
    modalTitle.textContent = `Slot ${slot.slot_number}`;
    
    modalContent.innerHTML = `
        <!-- Status Badge -->
        <div class="slot-status-badge ${slot.status}">
            <i class="fas ${statusIcon}"></i>
            <span>${statusText}</span>
        </div>
        
        <!-- Details Grid -->
        <div class="slot-details-grid">
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-hashtag"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Slot Number</span>
                    <span class="slot-detail-value">${slot.slot_number}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-network-wired"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">NAP Box</span>
                    <span class="slot-detail-value">${escapeHtml(napboxName)}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-map-pin"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Barangay</span>
                    <span class="slot-detail-value">${escapeHtml(slot.barangay || 'N/A')}</span>
                </div>
            </div>
            
            <div class="slot-detail-card">
                <div class="slot-detail-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="slot-detail-info">
                    <span class="slot-detail-label">Last Updated</span>
                    <span class="slot-detail-value">${lastUpdated}</span>
                </div>
            </div>
        </div>
        
        <!-- Customer Information (if occupied) -->
        ${slot.status === 'occupied' && slot.customer_name ? `
        <div class="slot-customer-section">
            <div class="slot-section-title">
                <i class="fas fa-user"></i>
                <span>Customer Information</span>
            </div>
            <div class="slot-customer-grid">
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-user-circle"></i> Name</span>
                    <span class="customer-value">${escapeHtml(slot.customer_name)}</span>
                </div>
                ${slot.customer_phone ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-phone"></i> Phone</span>
                    <span class="customer-value">${escapeHtml(slot.customer_phone)}</span>
                </div>` : ''}
                ${slot.contract_number ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-id-card"></i> Contract</span>
                    <span class="customer-value">${escapeHtml(slot.contract_number)}</span>
                </div>` : ''}
                ${slot.area ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-building"></i> Area</span>
                    <span class="customer-value">${escapeHtml(slot.area)}</span>
                </div>` : ''}
            </div>
        </div>` : ''}
        
        <!-- Customer Information (if available but has customer data - preserved owner) -->
        ${slot.status === 'available' && slot.customer_name ? `
        <div class="slot-customer-section last-owner">
            <div class="slot-section-title">
                <i class="fas fa-history"></i>
                <span>Last Owner (Preserved)</span>
            </div>
            <div class="slot-customer-grid">
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-user-circle"></i> Name</span>
                    <span class="customer-value">${escapeHtml(slot.customer_name)}</span>
                </div>
                ${slot.customer_phone ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-phone"></i> Phone</span>
                    <span class="customer-value">${escapeHtml(slot.customer_phone)}</span>
                </div>` : ''}
                ${slot.contract_number ? `
                <div class="slot-customer-item">
                    <span class="customer-label"><i class="fas fa-id-card"></i> Contract</span>
                    <span class="customer-value">${escapeHtml(slot.contract_number)}</span>
                </div>` : ''}
            </div>
        </div>` : ''}
        
        <!-- Actions -->
        <div class="slot-actions">
            <div class="slot-action-buttons">
                <button onclick="closeSuperSlotModal()" class="btn-close-details-super">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeSuperSlotModal() {
    const modal = document.getElementById('superSlotDetailsModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.getElementById('closeSuperSlotModalBtn');
  const closeBtn2 = document.getElementById('closeSuperSlotModal');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeSuperSlotModal);
  }
  if (closeBtn2) {
    closeBtn2.addEventListener('click', closeSuperSlotModal);
  }
  
  window.addEventListener('click', function(e) {
    const modal = document.getElementById('superSlotDetailsModal');
    if (e.target === modal) {
      closeSuperSlotModal();
    }
  });
  
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSuperSlotModal();
    }
  });
});

window.showSuperSlotDetails = showSuperSlotDetails;
window.closeSuperSlotModal = closeSuperSlotModal;



function setupSuperEventListeners() {
    document.getElementById('superAreaFilter')?.addEventListener('change', async (e) => {
        superCurrentArea = e.target.value;
        superCurrentBarangay = '';
        const barangayFilter = document.getElementById('superBarangayFilter');
        if (barangayFilter) barangayFilter.value = '';
        await loadSuperBarangayFilter(superCurrentArea);
        if (superCurrentArea) {
            await showSuperAreaBoundary(superCurrentArea);
        } else {
            clearSuperAreaBoundary();
        }
        renderSuperSlotsGrid();
        addSuperNapboxMarkers();
    });
    
    document.getElementById('superBarangayFilter')?.addEventListener('change', async (e) => {
        superCurrentBarangay = e.target.value;
        renderSuperSlotsGrid();
        addSuperNapboxMarkers();
    });
    
    document.querySelectorAll('.super-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.super-filter-btn').forEach(b => {
            b.classList.remove('active');
            b.style.background = 'white';
            b.style.color = '#333';
        });
        btn.classList.add('active');
        btn.style.background = '#0047ab';
        btn.style.color = 'white';
        superCurrentFilter = btn.dataset.filter;
        
        // ✅ RENDER LANG - automatic 3 columns
        renderSuperSlotsGrid();
    });
});
    
    document.getElementById('superRefreshDataBtn')?.addEventListener('click', async () => {
        showToast('Refreshing data...', 'info');
        await loadSuperNapboxData();
        showToast('Data refreshed successfully', 'success');
    });
    
    document.getElementById('closeSuperSlotModalBtn')?.addEventListener('click', closeSuperSlotModal);
    document.getElementById('closeSuperSlotModal')?.addEventListener('click', closeSuperSlotModal);
    window.addEventListener('click', function(e) {
        if (e.target === document.getElementById('superSlotDetailsModal')) closeSuperSlotModal();
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('superSlotDetailsModal');
            if (modal && modal.style.display === 'block') closeSuperSlotModal();
        }
    });
}

// ==================== INITIALIZATION ====================
(async function init() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    await loadTechnicians();
    await Promise.all([
        loadAreasForSelect(),
        loadTeamsForSelect(),
        loadTeamsTable()
    ]);
    setupSearchFilter();
    setupTeamSearch();
    setupTeamEditModalEvents();
    setupDeleteTeamModalEvents();
    setupConfirmTeamChangesModalEvents();
    setupTeamAreaAutoFill();
    loadSuperNapboxData();
    setupSuperEventListeners();
    
    // ✅ IDAGDAG ITO - INITIALIZE NOTIFICATION SYSTEM
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
        console.log("🔔 Notification system initialized for technicians page");
    } else {
        console.warn("⚠️ NotificationSystem not found!");
    }
})();

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .form-error-message, .form-success-message, .table-message {
    animation: slideInDown 0.3s ease;
  }
`;
document.head.appendChild(style);

// Make functions global
window.showSuperSlotDetails = showSuperSlotDetails;
window.closeSuperSlotModal = closeSuperSlotModal;
window.escapeHtml = escapeHtml;

window.addEventListener('focus', function() {
    sessionStorage.removeItem('techniciansCache');
    loadTechnicians(true);
});