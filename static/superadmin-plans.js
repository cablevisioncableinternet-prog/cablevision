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
document.addEventListener('DOMContentLoaded', function() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    console.log('Hamburger button:', hamburgerBtn);
    console.log('Sidebar element:', sidebar);
    console.log('Overlay element:', overlay);

    if (hamburgerBtn && sidebar) {
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
    } else {
        console.error('Hamburger or Sidebar not found!');
        console.log('hamburger element:', hamburgerBtn);
        console.log('sidebar element:', sidebar);
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
        if (!res.ok) throw new Error("Failed to fetch profile");
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
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");
    
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
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

// ==================== PLAN MANAGEMENT ====================
const form = document.getElementById("planForm");
const container = document.getElementById("plansContainer");
let selectedPlanId = null;
let isLoading = false;

// ==================== LOAD PLANS ====================
async function loadPlans(showLoader = true) {
    if (isLoading) return;
    isLoading = true;
    
    const loader = document.getElementById("plansLoader");
    const noData = document.getElementById("noData");
    
    if (showLoader && loader) {
        loader.style.display = "flex";
        if (container) container.style.display = "none";
        if (noData) noData.style.display = "none";
    }

    try {
        const res = await fetch("/api/superadmin/plans");
        const plans = await res.json();

        if (!container) return;
        container.innerHTML = "";

        if (!plans || plans.length === 0) {
            if (noData) noData.style.display = "block";
            if (container) container.style.display = "none";
            return;
        }

        if (noData) noData.style.display = "none";
        
        plans.forEach(function(plan) {
            const imgSrc = plan.image ? plan.image : '/static/default-plan.jpg';
            
            let speedDisplay = plan.speed;
            if (typeof plan.speed === 'string' && plan.speed.includes(' ')) {
                const parts = plan.speed.split(' ');
                speedDisplay = parts[0] + ' ' + parts[1];
            }
            
            const div = document.createElement("div");
            div.className = "plan-card";
            div.innerHTML = `
                <div class="plan-image-wrapper">
                    <img src="${imgSrc}" alt="${escapeHtml(plan.name)}" loading="lazy" onerror="this.src='/static/default-plan.jpg'">
                </div>
                <h3>${escapeHtml(plan.name)}</h3>
                <p><b>Speed:</b> ${escapeHtml(speedDisplay)}</p>
                <p><b>Price:</b> ₱${formatNumber(plan.price)}</p>
                <div class="plan-actions">
                    <button onclick='openEditModal("${plan.id}", "${escapeHtml(plan.name)}", "${escapeHtml(plan.speed)}", "${plan.price}", "${plan.image || ''}")' class="edit-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deletePlan('${plan.id}')" class="delete-btn">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
        
        if (container) container.style.display = "grid";
        
    } catch (err) {
        console.error("Error loading plans:", err);
        showToast("Failed to load plans", "error");
    } finally {
        if (loader) loader.style.display = "none";
        isLoading = false;
    }
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

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// ==================== IMAGE VALIDATION HELPER ====================
function getImageDimensions(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                resolve({
                    width: img.width,
                    height: img.height
                });
            };
            img.onerror = function() {
                reject(new Error("Failed to load image"));
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
    });
}

// ==================== CREATE PLAN ====================
if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        const name = document.getElementById("name").value.trim();
        const speedValue = document.getElementById("speed").value.trim();
        const speedUnit = document.getElementById("speed_unit").value;
        const price = parseFloat(document.getElementById("price").value);
        const imageFile = document.getElementById("image").files[0];

        if (!name || !speedValue || isNaN(price) || !imageFile) {
            showToast("Please fill all fields and select an image", "error");
            return;
        }

        // ✅ VALIDATE IMAGE TYPE
        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(imageFile.type)) {
            showToast("Only JPG and PNG images are allowed", "error");
            return;
        }

        // ✅ VALIDATE IMAGE ORIENTATION (landscape only)
        try {
            const dimensions = await getImageDimensions(imageFile);
            if (dimensions.width <= dimensions.height) {
                showToast("Image must be landscape (width greater than height)", "error");
                return;
            }
        } catch (err) {
            showToast("Failed to read image dimensions", "error");
            return;
        }

        const speed = speedValue + ' ' + speedUnit;

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("speed", speed);
            formData.append("price", price);
            formData.append("image", imageFile);

            const res = await fetch("/api/superadmin/plans", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                showToast("Plan created successfully!", "success");
                form.reset();
                document.getElementById("speed_unit").value = "Mbps";
                await loadPlans(true);
            } else {
                showToast("Error: " + (data.error || "Failed to create plan"), "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to create plan", "error");
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==================== DELETE PLAN ====================
let planIdToDelete = null;
const deleteModal = document.getElementById("deleteModal");

function deletePlan(id) {
    planIdToDelete = id;
    if (deleteModal) {
        deleteModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeDeleteModal() {
    planIdToDelete = null;
    if (deleteModal) {
        deleteModal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
if (deleteConfirmBtn) {
    deleteConfirmBtn.addEventListener("click", async function() {
        if (!planIdToDelete) return;
        
        const originalText = deleteConfirmBtn.innerHTML;
        deleteConfirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteConfirmBtn.disabled = true;

        try {
            const res = await fetch(`/api/superadmin/plans/${planIdToDelete}`, {
                method: "DELETE"
            });
            
            if (res.ok) {
                showToast("Plan deleted successfully!", "success");
                await loadPlans(true);
            } else {
                const data = await res.json();
                showToast("Error: " + (data.error || "Failed to delete plan"), "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to delete plan", "error");
        } finally {
            deleteConfirmBtn.innerHTML = originalText;
            deleteConfirmBtn.disabled = false;
            closeDeleteModal();
        }
    });
}

// ==================== EDIT MODAL ====================
const editModal = document.getElementById("editPlanModal");
const confirmModal = document.getElementById("confirmModal");

// Open Edit Modal
function openEditModal(id, name, speed, price, imagePath) {
    selectedPlanId = id;
    
    document.getElementById("edit_name").value = name;
    document.getElementById("edit_price").value = price;
    
    let speedValue = speed;
    let speedUnit = "Mbps";
    if (typeof speed === 'string' && speed.includes(' ')) {
        const parts = speed.split(' ');
        speedValue = parts[0];
        speedUnit = parts[1];
    }
    
    document.getElementById("edit_speed_value").value = speedValue;
    const unitSelect = document.getElementById("edit_speed_unit");
    if (unitSelect) {
        unitSelect.value = speedUnit === "Gbps" ? "Gbps" : "Mbps";
    }
    
    const preview = document.getElementById("edit_image_preview");
    if (preview) {
        preview.src = imagePath ? imagePath : '/static/default-plan.jpg';
    }
    
    const fileInput = document.getElementById("edit_image");
    if (fileInput) fileInput.value = "";
    
    if (editModal) {
        editModal.classList.add('show');
        document.body.style.overflow = "hidden";
    }
}

// Close Edit Modal
function closeEditModal() {
    if (editModal) {
        editModal.classList.remove('show');
        document.body.style.overflow = "";
    }
    selectedPlanId = null;
}

// Open Confirm Modal
function openConfirmModal() {
    if (editModal) editModal.classList.remove('show');
    if (confirmModal) {
        confirmModal.classList.add('show');
        document.body.style.overflow = "hidden";
    }
}

// Close Confirm Modal only
function closeConfirmModalOnly() {
    if (confirmModal) confirmModal.classList.remove('show');
    document.body.style.overflow = "";
}

// Close Confirm Modal and reopen edit modal
function closeConfirmModal() {
    if (confirmModal) confirmModal.classList.remove('show');
    if (editModal) {
        editModal.classList.add('show');
        document.body.style.overflow = "hidden";
    }
}

// ==================== EDIT PLAN ====================
async function confirmUpdate() {
    const name = document.getElementById("edit_name").value.trim();
    const speedValue = document.getElementById("edit_speed_value").value.trim();
    const speedUnit = document.getElementById("edit_speed_unit").value;
    const price = parseFloat(document.getElementById("edit_price").value);
    const imageFile = document.getElementById("edit_image").files[0];
    
    if (!name || !speedValue || isNaN(price)) {
        showToast("Please fill all fields", "error");
        return;
    }
    
    // ✅ VALIDATE IMAGE TYPE (if a new image is selected)
    if (imageFile) {
        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(imageFile.type)) {
            showToast("Only JPG and PNG images are allowed", "error");
            return;
        }

        // ✅ VALIDATE IMAGE ORIENTATION (landscape only)
        try {
            const dimensions = await getImageDimensions(imageFile);
            if (dimensions.width <= dimensions.height) {
                showToast("Image must be landscape (width greater than height)", "error");
                return;
            }
        } catch (err) {
            showToast("Failed to read image dimensions", "error");
            return;
        }
    }
    
    const speed = speedValue + ' ' + speedUnit;
    
    const confirmBtn = document.querySelector("#confirmModal .btn.confirm");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    confirmBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("speed", speed);
        formData.append("price", price);
        
        if (imageFile) {
            formData.append("image", imageFile);
        }
        
        const res = await fetch(`/api/superadmin/plans/${selectedPlanId}`, {
            method: "PUT",
            body: formData
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("Plan updated successfully!", "success");
            closeConfirmModalOnly();
            closeEditModal();
            await loadPlans(true);
        } else {
            showToast("Error: " + (data.error || "Failed to update plan"), "error");
            closeConfirmModalOnly();
        }
    } catch (err) {
        console.error(err);
        showToast("Failed to update plan", "error");
        closeConfirmModalOnly();
    } finally {
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

// ==================== MODAL EVENT LISTENERS ====================
// Edit modal close buttons
const closeEditModalBtn = document.querySelector("#editPlanModal .edit-modal-close");
const cancelEditBtn = document.querySelector("#editPlanModal .edit-modal-btn-secondary");
const saveEditBtn = document.querySelector("#editPlanModal .edit-modal-btn-primary");

if (closeEditModalBtn) closeEditModalBtn.onclick = closeEditModal;
if (cancelEditBtn) cancelEditBtn.onclick = closeEditModal;
if (saveEditBtn) saveEditBtn.onclick = openConfirmModal;

// Confirm modal buttons
const closeConfirmBtn = document.querySelector("#confirmModal .close-btn");
const cancelConfirmBtn = document.querySelector("#confirmModal .btn.cancel");
const confirmUpdateBtn = document.querySelector("#confirmModal .btn.confirm");

if (closeConfirmBtn) closeConfirmBtn.onclick = closeConfirmModal;
if (cancelConfirmBtn) cancelConfirmBtn.onclick = closeConfirmModal;
if (confirmUpdateBtn) confirmUpdateBtn.onclick = confirmUpdate;

// Delete modal buttons
const closeDeleteBtn = document.querySelector("#deleteModal .close-btn");
const cancelDeleteBtn = document.querySelector("#deleteModal .btn.cancel");

if (closeDeleteBtn) closeDeleteBtn.onclick = closeDeleteModal;
if (cancelDeleteBtn) cancelDeleteBtn.onclick = closeDeleteModal;

// Close modals when clicking outside
window.addEventListener("click", function(e) {
    if (e.target === editModal) closeEditModal();
    if (e.target === confirmModal) closeConfirmModalOnly();
    if (e.target === deleteModal) closeDeleteModal();
});

// Close modals with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        if (editModal && editModal.classList.contains('show')) closeEditModal();
        if (confirmModal && confirmModal.classList.contains('show')) closeConfirmModalOnly();
        if (deleteModal && deleteModal.classList.contains('show')) closeDeleteModal();
        
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal && logoutModal.classList.contains('show')) {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
});

// Update image preview when file is selected
const editImageInput = document.getElementById("edit_image");
if (editImageInput) {
    editImageInput.addEventListener("change", function(e) {
        const preview = document.getElementById("edit_image_preview");
        if (preview && e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(event) {
                preview.src = event.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });
}

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    loadPlans(true);
    
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


// ==================== SPEED INPUT VALIDATION ====================

/**
 * Validate speed input - limit to 3 digits when Mbps is selected
 */
function validateSpeedInput(input) {
    const unitSelect = input.id === 'speed' 
        ? document.getElementById('speed_unit') 
        : document.getElementById('edit_speed_unit');
    
    if (!unitSelect) return;
    
    const unit = unitSelect.value;
    let value = input.value;
    
    // Remove any non-numeric characters except decimal point
    value = value.replace(/[^0-9.]/g, '');
    
    // If Mbps, limit to 3 digits (max 999)
    if (unit === 'Mbps') {
        // Check if value has decimal point
        if (value.includes('.')) {
            const parts = value.split('.');
            // Limit whole number part to 3 digits
            if (parts[0].length > 3) {
                parts[0] = parts[0].slice(0, 3);
                value = parts[0] + '.' + parts[1];
            }
            // Limit decimal places to 1
            if (parts[1] && parts[1].length > 1) {
                parts[1] = parts[1].slice(0, 1);
                value = parts[0] + '.' + parts[1];
            }
        } else {
            // No decimal, limit to 3 digits
            if (value.length > 3) {
                value = value.slice(0, 3);
            }
        }
        
        // Set max attribute to 999
        input.max = '999';
    } else {
        // Gbps - allow up to 100
        input.max = '100';
        // Limit to 3 digits as well
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[0].length > 3) {
                parts[0] = parts[0].slice(0, 3);
                value = parts[0] + '.' + parts[1];
            }
            if (parts[1] && parts[1].length > 1) {
                parts[1] = parts[1].slice(0, 1);
                value = parts[0] + '.' + parts[1];
            }
        } else {
            if (value.length > 3) {
                value = value.slice(0, 3);
            }
        }
    }
    
    input.value = value;
}

/**
 * Handle speed unit change - update max and hint
 */
function handleSpeedUnitChange(select, inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const unit = select.value;
    const hintId = inputId === 'speed' ? 'speedHint' : 'editSpeedHint';
    const hint = document.getElementById(hintId);
    
    if (unit === 'Mbps') {
        input.max = '999';
        input.placeholder = 'e.g. 100';
        if (hint) hint.textContent = 'Maximum 3 digits for Mbps (up to 999)';
        // If current value exceeds 999, truncate
        let currentValue = input.value;
        if (currentValue) {
            const numValue = parseFloat(currentValue);
            if (numValue > 999) {
                input.value = '999';
                showToast('Mbps value cannot exceed 999', 'warning');
            }
        }
    } else {
        input.max = '100';
        input.placeholder = 'e.g. 1';
        if (hint) hint.textContent = 'Maximum 3 digits for Gbps (up to 100)';
        // If current value exceeds 100, truncate
        let currentValue = input.value;
        if (currentValue) {
            const numValue = parseFloat(currentValue);
            if (numValue > 100) {
                input.value = '100';
                showToast('Gbps value cannot exceed 100', 'warning');
            }
        }
    }
}

/**
 * Add extra validation to prevent form submission with invalid values
 */
(function() {
    // Add extra validation for create form
    const createForm = document.getElementById('planForm');
    if (createForm) {
        createForm.addEventListener('submit', function(e) {
            const speedInput = document.getElementById('speed');
            const unitSelect = document.getElementById('speed_unit');
            
            if (speedInput && unitSelect) {
                const unit = unitSelect.value;
                const value = parseFloat(speedInput.value);
                
                if (unit === 'Mbps' && value > 999) {
                    e.preventDefault();
                    showToast('Mbps value cannot exceed 999', 'error');
                    return false;
                }
                if (unit === 'Gbps' && value > 100) {
                    e.preventDefault();
                    showToast('Gbps value cannot exceed 100', 'error');
                    return false;
                }
            }
        });
    }
    
    // Add extra validation for edit form
    const confirmUpdateBtn = document.querySelector('#confirmModal .btn.confirm');
    if (confirmUpdateBtn) {
        confirmUpdateBtn.addEventListener('click', function(e) {
            const speedInput = document.getElementById('edit_speed_value');
            const unitSelect = document.getElementById('edit_speed_unit');
            
            if (speedInput && unitSelect) {
                const unit = unitSelect.value;
                const value = parseFloat(speedInput.value);
                
                if (unit === 'Mbps' && value > 999) {
                    e.preventDefault();
                    showToast('Mbps value cannot exceed 999', 'error');
                    return false;
                }
                if (unit === 'Gbps' && value > 100) {
                    e.preventDefault();
                    showToast('Gbps value cannot exceed 100', 'error');
                    return false;
                }
            }
        });
    }
})();

// ==================== FIX: LOAD PLAN WITH VALIDATION ====================
// Override the loadPlans function to properly set speed validation
const originalLoadPlans = loadPlans;
loadPlans = async function(showLoader = true) {
    await originalLoadPlans(showLoader);
    
    // After loading plans, ensure the speed input has proper validation
    setTimeout(function() {
        const speedInput = document.getElementById('speed');
        const unitSelect = document.getElementById('speed_unit');
        if (speedInput && unitSelect) {
            // Set initial max based on current unit
            handleSpeedUnitChange(unitSelect, 'speed');
        }
        
        const editSpeedInput = document.getElementById('edit_speed_value');
        const editUnitSelect = document.getElementById('edit_speed_unit');
        if (editSpeedInput && editUnitSelect) {
            handleSpeedUnitChange(editUnitSelect, 'edit_speed_value');
        }
    }, 100);
};