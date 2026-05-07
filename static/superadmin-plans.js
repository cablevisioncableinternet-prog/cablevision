const form = document.getElementById("planForm");
const container = document.getElementById("plansContainer");

// ==================== TOAST NOTIFICATION ====================
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

// ================= MODAL STATE =================
let selectedPlanId = null;
let isLoading = false;

// ================= LOAD PLANS =================
async function loadPlans(showLoader = true) {
    if (isLoading) return;
    isLoading = true;
    
    const loader = document.getElementById("plansLoader");
    const noData = document.getElementById("noData");
    
    if (showLoader && loader) {
        loader.style.display = "flex";
        container.style.display = "none";
        if (noData) noData.style.display = "none";
    }

    try {
        const res = await fetch("/api/superadmin/plans");
        const plans = await res.json();

        if (!container) return;
        container.innerHTML = "";

        if (!plans || plans.length === 0) {
            if (noData) noData.style.display = "block";
            container.style.display = "none";
            return;
        }

        if (noData) noData.style.display = "none";
        
        plans.forEach(plan => {
            // Image path from server (stored in static/uploads/plans/)
            const imgSrc = plan.image ? `/static/${plan.image}` : '/static/default-plan.jpg';
            
            const div = document.createElement("div");
            div.className = "plan-card";
            div.innerHTML = `
                <div class="plan-image-wrapper">
                    <img src="${imgSrc}" alt="${escapeHtml(plan.name)}" loading="lazy" onerror="this.src='/static/default-plan.jpg'">
                </div>
                <h3>${escapeHtml(plan.name)}</h3>
                <p><b>Speed:</b> ${escapeHtml(plan.speed)}</p>
                <p><b>Price:</b> ₱${formatNumber(plan.price)}</p>
                <div class="plan-actions">
                    <button onclick="openEditModal('${plan.id}', '${escapeHtml(plan.name)}', '${escapeHtml(plan.speed)}', '${plan.price}', '${plan.image || ''}')" class="edit-btn">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deletePlan('${plan.id}')" class="delete-btn">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
        
        container.style.display = "grid";
        
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

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    const logoutCloseBtn = logoutModal.querySelector(".close-btn");
    const cancelLogout = document.getElementById("cancelLogout");
    const confirmLogout = document.getElementById("confirmLogout");

    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        logoutModal.style.display = "block";
    });

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

    if (confirmLogout) {
        confirmLogout.addEventListener("click", () => {
            if (window.SessionManager) {
                window.SessionManager.logout();
            } else {
                window.location.href = "/";
            }
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === logoutModal) {
            logoutModal.style.display = "none";
        }
    });
}

// ==================== PROFILE DROPDOWN ====================
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
    try {
        const res = await fetch("/api/superadmin/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
    } catch (err) {
        console.error(err);
    }
}
loadProfile();

// ==================== HAMBURGER MENU ====================
function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    
    if (!hamburgerBtn || !sidebar) return;
    
    hamburgerBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
        if (overlay) overlay.classList.toggle("active");
    });
    
    if (overlay) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("active");
            overlay.classList.remove("active");
        });
    }
}
setupHamburgerMenu();

// ================= CREATE PLAN (with file upload) =================
if (form) {
    form.addEventListener("submit", async function(e) {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        const name = document.getElementById("name").value.trim();
        const speed = document.getElementById("speed").value.trim();
        const price = parseFloat(document.getElementById("price").value);
        const imageFile = document.getElementById("image").files[0];

        if (!name || !speed || isNaN(price) || !imageFile) {
            showToast("Please fill all fields and select an image", "error");
            return;
        }

        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        submitBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append("name", name);
            formData.append("speed", speed);
            formData.append("price", price);
            formData.append("image", imageFile); // Send file directly

            const res = await fetch("/api/superadmin/plans", {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (res.ok) {
                showToast("Plan created successfully!", "success");
                form.reset();
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

// ================= DELETE PLAN =================
let planIdToDelete = null;
const deleteModal = document.getElementById("deleteModal");

function deletePlan(id) {
    planIdToDelete = id;
    if (deleteModal) deleteModal.style.display = "flex";
}

function closeDeleteModal() {
    planIdToDelete = null;
    if (deleteModal) deleteModal.style.display = "none";
    document.body.style.overflow = "";
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

// ================= EDIT MODAL FUNCTIONS =================
const editModal = document.getElementById("editPlanModal");
const confirmModal = document.getElementById("confirmModal");

// Open Edit Modal
function openEditModal(id, name, speed, price, imagePath) {
    selectedPlanId = id;
    
    document.getElementById("edit_name").value = name;
    document.getElementById("edit_speed").value = speed;
    document.getElementById("edit_price").value = price;
    
    // Set image preview from server path
    const preview = document.getElementById("edit_image_preview");
    if (preview) {
        preview.src = imagePath ? `/static/${imagePath}` : '/static/default-plan.jpg';
    }
    
    // Clear file input
    const fileInput = document.getElementById("edit_image");
    if (fileInput) fileInput.value = "";
    
    if (editModal) {
        editModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

// Close Edit Modal
function closeEditModal() {
    if (editModal) {
        editModal.style.display = "none";
        document.body.style.overflow = "";
    }
    selectedPlanId = null;
}

// Open Confirm Modal
function openConfirmModal() {
    if (editModal) editModal.style.display = "none";
    if (confirmModal) {
        confirmModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

// Close Confirm Modal only
function closeConfirmModalOnly() {
    if (confirmModal) confirmModal.style.display = "none";
    document.body.style.overflow = "";
}

// Close Confirm Modal and reopen edit modal
function closeConfirmModal() {
    if (confirmModal) confirmModal.style.display = "none";
    if (editModal) {
        editModal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

// Confirm Update
async function confirmUpdate() {
    const name = document.getElementById("edit_name").value.trim();
    const speed = document.getElementById("edit_speed").value.trim();
    const price = parseFloat(document.getElementById("edit_price").value);
    const imageFile = document.getElementById("edit_image").files[0];
    
    if (!name || !speed || isNaN(price)) {
        showToast("Please fill all fields", "error");
        return;
    }
    
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
            formData.append("image", imageFile); // Send file directly
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

// Close modals with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        if (editModal && editModal.style.display === "flex") closeEditModal();
        if (confirmModal && confirmModal.style.display === "flex") closeConfirmModalOnly();
    }
});

// Close modals when clicking outside
window.addEventListener("click", (e) => {
    if (e.target === editModal) closeEditModal();
    if (e.target === confirmModal) closeConfirmModalOnly();
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

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadPlans(true);
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});