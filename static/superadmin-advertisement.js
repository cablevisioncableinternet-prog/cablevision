// ==================== SESSION MANAGEMENT ====================
if (window.SessionManager) {
    window.SessionManager.init();
} else {
    console.error("SessionManager not loaded!");
    if (!localStorage.getItem('userType') || !sessionStorage.getItem('sessionToken')) {
        window.location.replace('/');
    }
}

// ==================== DECLARE VARIABLES ====================
let deleteID = null;
let allLogos = [];
let currentSlideIndex = 0;
let totalSlides = 0;

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;
    
    if (type === "success") toast.style.background = "#28a745";
    else if (type === "error") toast.style.background = "#dc3545";
    else if (type === "info") toast.style.background = "#17a2b8";
    
    toast.textContent = message;
    toast.style.display = "block";
    
    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// ================= LOAD CHANNEL LOGOS =================
async function loadLogos(forceRefresh = false) {
    const container = document.getElementById("channelLogosSlider");
    if (!container) return;

    if (!forceRefresh) {
        const cached = sessionStorage.getItem("channelLogos");
        if (cached) {
            allLogos = JSON.parse(cached);
            renderLogos();
            return;
        }
    }

    container.innerHTML = `<div class="empty-slider"><div class="spinner"></div><p>Loading logos...</p></div>`;

    try {
        const res = await fetch("/api/superadmin/channel-logos");
        if (!res.ok) throw new Error("Failed to fetch logos");
        
        allLogos = await res.json();
        sessionStorage.setItem("channelLogos", JSON.stringify(allLogos));
        renderLogos();
    } catch (err) {
        container.innerHTML = `<div class="empty-slider"><i class="fas fa-exclamation-triangle"></i><p>Failed to load logos.</p></div>`;
        showToast("Failed to load logos", "error");
    }
}

// ================= RENDER LOGOS AS SLIDER =================
function renderLogos() {
    const container = document.getElementById("channelLogosSlider");
    const controls = document.getElementById("sliderControls");
    const dotsContainer = document.getElementById("sliderDots");
    
    if (!container) return;
    
    if (allLogos.length === 0) {
        container.innerHTML = `<div class="empty-slider"><i class="fas fa-image"></i><p>No channel logos uploaded yet</p><small>Click or drag a PNG file above to upload</small></div>`;
        if (controls) controls.style.display = "none";
        if (dotsContainer) dotsContainer.innerHTML = '';
        totalSlides = 0;
        return;
    }
    
    if (controls) controls.style.display = "flex";
    totalSlides = allLogos.length;
    
    container.innerHTML = allLogos.map((logo, index) => {
        // Use imagePath to construct URL
        const imageUrl = logo.imagePath ? `/static/${logo.imagePath}` : '/static/default-logo.png';
        return `
            <div class="logo-slide" data-slide-index="${index}">
                <div class="logo-slide-card">
                    <img class="logo-slide-image" src="${escapeHtml(imageUrl)}" alt="Channel Logo" onerror="this.src='/static/default-logo.png'">
                    <button class="logo-slide-delete" onclick="openDeleteModal('${logo.id}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    updateSliderPosition();
    updateSlideCounter();
    renderDots();
}

function updateSliderPosition() {
    const slider = document.getElementById("channelLogosSlider");
    if (!slider) return;
    slider.style.transform = `translateX(${-currentSlideIndex * 100}%)`;
}

function updateSlideCounter() {
    const counter = document.getElementById("slideCounter");
    if (counter && totalSlides > 0) {
        counter.textContent = `${currentSlideIndex + 1}/${totalSlides}`;
    }
}

function renderDots() {
    const dotsContainer = document.getElementById("sliderDots");
    if (!dotsContainer) return;
    
    if (totalSlides <= 1) {
        dotsContainer.innerHTML = '';
        return;
    }
    
    dotsContainer.innerHTML = '';
    for (let i = 0; i < totalSlides; i++) {
        const dot = document.createElement('div');
        dot.className = 'slider-dot' + (i === currentSlideIndex ? ' active' : '');
        dot.onclick = () => goToSlide(i);
        dotsContainer.appendChild(dot);
    }
}

function goToSlide(index) {
    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;
    currentSlideIndex = index;
    updateSliderPosition();
    updateSlideCounter();
    updateActiveDot();
}

function nextSlide() {
    if (currentSlideIndex < totalSlides - 1) {
        currentSlideIndex++;
        updateSliderPosition();
        updateSlideCounter();
        updateActiveDot();
    }
}

function prevSlide() {
    if (currentSlideIndex > 0) {
        currentSlideIndex--;
        updateSliderPosition();
        updateSlideCounter();
        updateActiveDot();
    }
}

function updateActiveDot() {
    const dots = document.querySelectorAll('.slider-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlideIndex);
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

// ================= DELETE LOGO =================
function openDeleteModal(id) {
    deleteID = id;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
    }
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
    deleteID = null;
}

async function confirmDelete() {
    if (!deleteID) return;
    
    const deleteBtn = document.getElementById("deleteConfirmBtn");
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;

    try {
        const res = await fetch(`/api/superadmin/channel-logos/${deleteID}`, { method: "DELETE" });
        
        if (res.ok) {
            showToast("Logo deleted successfully!", "success");
            sessionStorage.removeItem("channelLogos");
            closeDeleteModal();
            await loadLogos(true);
        } else {
            const data = await res.json();
            showToast(data.error || "Failed to delete logo", "error");
        }
    } catch (err) {
        showToast("Failed to delete logo", "error");
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// ================= PREVIEW FUNCTIONS =================
function previewLogoImage(input) {
    const container = document.getElementById("logoPreviewContainer");
    const previewImg = document.getElementById("logoPreview");
    const previewName = document.getElementById("logoPreviewName");
    
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewName.textContent = `${file.name} (${(file.size/1024).toFixed(2)} KB)`;
            container.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function removeLogoImage() {
    const fileInput = document.getElementById('channelLogo');
    document.getElementById('logoPreviewContainer').style.display = 'none';
    document.getElementById('logoPreview').src = '';
    document.getElementById('logoPreviewName').textContent = '';
    if (fileInput) fileInput.value = '';
    showToast('Image removed', 'success');
}

// ================= UPLOAD LOGO (with file upload, not base64) =================
async function uploadLogo() {
    const imageFile = document.getElementById("channelLogo").files[0];
    
    if (!imageFile) {
        showToast("Please select a PNG logo", "error");
        return;
    }
    
    if (imageFile.type !== 'image/png') {
        showToast("Only PNG images are allowed!", "error");
        return;
    }
    
    const uploadBtn = document.querySelector("#channelLogoForm .btn-primary");
    const originalText = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append("image", imageFile);
        
        const response = await fetch('/api/superadmin/channel-logos', {
            method: 'POST',
            body: formData  // Use FormData, not JSON
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Logo uploaded successfully!', 'success');
            document.getElementById("channelLogoForm").reset();
            document.getElementById("logoPreviewContainer").style.display = 'none';
            sessionStorage.removeItem("channelLogos");
            await loadLogos(true);
        } else {
            showToast(result.error || 'Upload failed', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to upload', 'error');
    } finally {
        uploadBtn.innerHTML = originalText;
        uploadBtn.disabled = false;
    }
}

// ================= SETUP FUNCTIONS =================
function setupDropzone() {
    const dropzone = document.getElementById('pngDropzone');
    const fileInput = document.getElementById('channelLogo');
    if (!dropzone || !fileInput) return;
    
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#0047ab';
        dropzone.style.background = '#f0f7ff';
    });
    dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#fafcff';
    });
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#fafcff';
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'image/png') {
            fileInput.files = e.dataTransfer.files;
            previewLogoImage(fileInput);
            showToast('PNG file selected', 'success');
        } else {
            showToast('Please drop a valid PNG file', 'error');
        }
    });
}

// ================= PROFILE FUNCTIONS =================
async function loadProfile() {
    try {
        const res = await fetch("/api/superadmin/profile");
        if (res.ok) {
            const profile = await res.json();
            const profileNameSpan = document.getElementById("profileName");
            if (profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
        }
    } catch (err) {
        console.error(err);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM loaded - Initializing...");
    
    loadLogos();
    
    const prevBtn = document.getElementById("prevSlideBtn");
    const nextBtn = document.getElementById("nextSlideBtn");
    if (prevBtn) prevBtn.addEventListener("click", prevSlide);
    if (nextBtn) nextBtn.addEventListener("click", nextSlide);
    
    setupDropzone();
    
    const logoForm = document.getElementById("channelLogoForm");
    if (logoForm) {
        logoForm.addEventListener("submit", (e) => {
            e.preventDefault();
            uploadLogo();
        });
    }
    
    const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    if (deleteConfirmBtn) deleteConfirmBtn.addEventListener("click", confirmDelete);
    
    const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
    if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
    
    const channelLogoInput = document.getElementById("channelLogo");
    if (channelLogoInput) {
        channelLogoInput.addEventListener("change", function() {
            if (this.files && this.files[0]) previewLogoImage(this);
        });
    }
    
    // Hamburger menu
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    if (hamburgerBtn && sidebar) {
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
    
    // Profile dropdown
    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle("show");
        });
        window.addEventListener("click", () => {
            profileMenu.classList.remove("show");
        });
    }
    
    loadProfile();
    
    // Logout modal
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutModal = document.getElementById("logoutModal");
    if (logoutBtn && logoutModal) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            logoutModal.style.display = "block";
        });
        
        const closeLogoutModal = () => logoutModal.style.display = "none";
        const cancelLogout = document.getElementById("cancelLogout");
        const confirmLogout = document.getElementById("confirmLogout");
        const logoutCloseBtn = logoutModal.querySelector(".close-btn");
        
        if (logoutCloseBtn) logoutCloseBtn.addEventListener("click", closeLogoutModal);
        if (cancelLogout) cancelLogout.addEventListener("click", closeLogoutModal);
        if (confirmLogout) {
            confirmLogout.addEventListener("click", () => {
                if (window.SessionManager) {
                    window.SessionManager.logout();
                } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.replace("/");
                }
            });
        }
        window.addEventListener("click", (e) => {
            if (e.target === logoutModal) closeLogoutModal();
        });
    }
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
    
    console.log("Initialization complete!");
});