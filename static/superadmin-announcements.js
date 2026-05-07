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

let editID = null
let deleteID = null
let allAnnouncements = []
let expiryCheckInterval = null

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

// ================= LOAD ANNOUNCEMENTS =================
async function loadAnnouncements(forceRefresh = false) {
    const textOnlyContainer = document.getElementById("textOnlyContainer");
    const withImageContainer = document.getElementById("withImageContainer");
    
    if (!textOnlyContainer || !withImageContainer) return;

    // Delete expired announcements from DB
    await deleteExpiredAnnouncementsFromDB();

    // Check cache
    if (!forceRefresh) {
        const cached = sessionStorage.getItem("announcements");
        if (cached) {
            const data = JSON.parse(cached);
            allAnnouncements = data.filter(a => !isExpired(a.expirationDate));
            renderTwoColumns();
            
            if (allAnnouncements.length !== data.length) {
                sessionStorage.removeItem("announcements");
            }
            return;
        }
    }

    // Show spinners
    textOnlyContainer.innerHTML = `
        <div class="spinner-wrapper">
            <div class="spinner"></div>
            <p>Loading announcements...</p>
        </div>
    `;
    withImageContainer.innerHTML = `
        <div class="spinner-wrapper">
            <div class="spinner"></div>
            <p>Loading announcements...</p>
        </div>
    `;

    try {
        const res = await fetch("/api/superadmin/announcements");
        if (!res.ok) throw new Error("Failed to fetch announcements");
        
        let data = await res.json();
        
        // Transform data - imagePath becomes imageUrl for display
        data = data.map(ann => ({
            ...ann,
            imageUrl: ann.imagePath ? `/static/${ann.imagePath}` : null
        }));
        
        const beforeFilterCount = data.length;
        allAnnouncements = data.filter(a => !isExpired(a.expirationDate));
        
        if (beforeFilterCount !== allAnnouncements.length) {
            console.log(`Filtered out ${beforeFilterCount - allAnnouncements.length} expired announcements`);
        }

        sessionStorage.setItem("announcements", JSON.stringify(allAnnouncements));
        renderTwoColumns();

    } catch (err) {
        textOnlyContainer.innerHTML = `<p style="color:red;text-align:center;">Failed to load announcements.</p>`;
        withImageContainer.innerHTML = `<p style="color:red;text-align:center;">Failed to load announcements.</p>`;
        console.error(err);
        showToast("Failed to load announcements", "error");
    }
}

// ================= RENDER TWO COLUMNS =================
function renderTwoColumns() {
    const textOnlyContainer = document.getElementById("textOnlyContainer");
    const withImageContainer = document.getElementById("withImageContainer");
    const textOnlyBadge = document.getElementById("textOnlyCount");
    const withImageBadge = document.getElementById("withImageCount");
    
    if (!textOnlyContainer || !withImageContainer) return;
    
    // Filter announcements by image presence
    const textOnlyPosts = allAnnouncements.filter(a => !a.imagePath);
    const withImagePosts = allAnnouncements.filter(a => a.imagePath);
    
    // Update badges
    if (textOnlyBadge) textOnlyBadge.textContent = textOnlyPosts.length;
    if (withImageBadge) withImageBadge.textContent = withImagePosts.length;
    
    // Render Text-Only Column
    if (textOnlyPosts.length === 0) {
        textOnlyContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>No announcements</p>
            </div>
        `;
    } else {
        textOnlyContainer.innerHTML = textOnlyPosts.map(a => renderAnnouncementCard(a)).join('');
    }
    
    // Render With-Image Column
    if (withImagePosts.length === 0) {
        withImageContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-image"></i>
                <p>No announcements</p>
            </div>
        `;
    } else {
        withImageContainer.innerHTML = withImagePosts.map(a => renderAnnouncementCard(a)).join('');
    }
}

// ================= RENDER SINGLE ANNOUNCEMENT CARD =================
function renderAnnouncementCard(a) {
    const imageHtml = a.imagePath ? `
        <div class="announcement-image">
            <img src="${escapeHtml(a.imageUrl)}" alt="Announcement image" onerror="this.src='/static/default-announcement.jpg'">
        </div>
    ` : '';
    
    let expiryHtml = '';
    if (a.expirationDate) {
        const expDateTime = new Date(a.expirationDate);
        const daysLeft = Math.ceil((expDateTime - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3 && daysLeft > 0) {
            expiryHtml = `<span class="expiry-badge expiry-warning"><i class="fas fa-exclamation-triangle"></i> Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span>`;
        } else if (daysLeft > 0) {
            expiryHtml = `<span class="expiry-badge"><i class="fas fa-hourglass-half"></i> Expires: ${formatExpirationForDisplay(a.expirationDate)}</span>`;
        }
    }

    const titleDisplay = a.title ? a.title : '';
    const hasTitle = a.title && a.title !== '';
    const hasMessage = a.message && a.message !== '';
    const hasImage = a.imagePath && a.imagePath !== '';
    const messageDisplay = hasMessage ? a.message : '';
    const isImageOnly = !hasTitle && !hasMessage && hasImage;
    
    if (isImageOnly) {
        return `
            <div class="announcement-card image-only-card">
                <div class="announcement-header">
                    <div class="announcement-info">
                        <div class="announcement-date">
                            <i class="fas fa-calendar-alt"></i> ${a.date}
                        </div>
                        ${expiryHtml ? `<div class="announcement-expiry">${expiryHtml}</div>` : ''}
                    </div>
                    <div class="announcement-actions">
                        <button class="edit-btn" onclick="openEditModal('${a.id}', '${escapeHtml(a.title || '')}', '${escapeHtml(a.message || '')}', '${a.imagePath || ''}', '${a.expirationDate || ''}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="delete-btn" onclick="openDeleteModal('${a.id}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
                ${imageHtml}
            </div>
        `;
    }

    return `
        <div class="announcement-card">
            <div class="announcement-header">
                <div class="announcement-info">
                    ${hasTitle ? `<div class="announcement-title">
                        <i class="fas fa-bullhorn"></i> ${escapeHtml(titleDisplay)}
                    </div>` : ''}
                    <div class="announcement-date">
                        <i class="fas fa-calendar-alt"></i> ${a.date}
                    </div>
                    ${expiryHtml ? `<div class="announcement-expiry">${expiryHtml}</div>` : ''}
                </div>
                <div class="announcement-actions">
                    <button class="edit-btn" onclick="openEditModal('${a.id}', '${escapeHtml(a.title || '')}', '${escapeHtml(a.message || '')}', '${a.imagePath || ''}', '${a.expirationDate || ''}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="openDeleteModal('${a.id}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            </div>
            ${hasMessage ? `<div class="announcement-message">
                ${escapeHtml(messageDisplay)}
            </div>` : ''}
            ${imageHtml}
        </div>
    `;
}

// ================= CLOSE EDIT MODAL =================
function closeEditModal() {
    const modal = document.getElementById("editModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
    editID = null;
    
    const fileInput = document.getElementById("editAnnouncementImage");
    if (fileInput) fileInput.value = "";
    
    const previewContainer = document.getElementById("editImagePreviewContainer");
    if (previewContainer) previewContainer.style.display = "none";
    
    const previewImg = document.getElementById("editImagePreview");
    if (previewImg) previewImg.src = "";
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

// ================= CREATE ANNOUNCEMENT (with file upload) =================
async function createAnnouncement() {
    const title = document.getElementById("title").value.trim();
    const message = document.getElementById("message").value.trim();
    const imageFile = document.getElementById("announcementImage").files[0];
    const expiryValue = document.getElementById("expiryValue").value;
    const expiryUnit = document.getElementById("expiryUnit").value;
  
    if (!title && !message && !imageFile) {
        showToast("Please provide either title/message or an image", "error");
        return;
    }
    
    const expirationDate = calculateExpirationDate(expiryValue, expiryUnit);
    
    const createBtn = document.querySelector(".btn-primary");
    const originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    createBtn.disabled = true;
    
    try {
        const formData = new FormData();
        if (title) formData.append("title", title);
        if (message) formData.append("message", message);
        if (imageFile) formData.append("image", imageFile);
        if (expirationDate) formData.append("expirationDate", expirationDate);
        
        const res = await fetch("/api/superadmin/announcements", {
            method: "POST",
            body: formData  // Use FormData, not JSON
        });
        
        if (!res.ok) throw new Error("Failed to create announcement");
        
        showToast(`✓ Announcement posted! Will expire in ${expiryValue} ${expiryUnit}`, "success");
        
        document.getElementById("title").value = "";
        document.getElementById("message").value = "";
        document.getElementById("announcementImage").value = "";
        document.getElementById("imagePreviewContainer").style.display = "none";
        document.getElementById("expiryValue").value = "1";
        document.getElementById("expiryUnit").value = "weeks";
        
        sessionStorage.removeItem("announcements");
        await loadAnnouncements(true);
        
    } catch (err) {
        console.error(err);
        showToast("Failed to create announcement", "error");
    } finally {
        createBtn.innerHTML = originalText;
        createBtn.disabled = false;
    }
}

// ================= EDIT MODAL =================
function setupEditCharCounter() {
    const editMessageTextarea = document.getElementById('editMessage');
    const editCharCountSpan = document.getElementById('editCharCount');
    
    if (editMessageTextarea && editCharCountSpan) {
        editMessageTextarea.addEventListener('input', function() {
            editCharCountSpan.textContent = this.value.length;
        });
    }
}

function openEditModal(id, title, message, imagePath, expirationDate) {
    editID = id;
    document.getElementById("editTitle").value = title || '';
    document.getElementById("editMessage").value = message || '';
    
    const editCharCountSpan = document.getElementById('editCharCount');
    if (editCharCountSpan) editCharCountSpan.textContent = (message || '').length;
    
    if (expirationDate) {
        const now = new Date();
        const expDate = new Date(expirationDate);
        const diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            if (diffDays >= 30) {
                document.getElementById("editExpiryValue").value = Math.ceil(diffDays / 30);
                document.getElementById("editExpiryUnit").value = "months";
            } else if (diffDays >= 7) {
                document.getElementById("editExpiryValue").value = Math.ceil(diffDays / 7);
                document.getElementById("editExpiryUnit").value = "weeks";
            } else {
                document.getElementById("editExpiryValue").value = diffDays;
                document.getElementById("editExpiryUnit").value = "days";
            }
        } else {
            document.getElementById("editExpiryValue").value = 1;
            document.getElementById("editExpiryUnit").value = "weeks";
        }
    } else {
        document.getElementById("editExpiryValue").value = 1;
        document.getElementById("editExpiryUnit").value = "weeks";
    }
    
    const editImagePreview = document.getElementById("editImagePreview");
    const editImageContainer = document.getElementById("editImagePreviewContainer");
    if (imagePath && imagePath !== '') {
        editImagePreview.src = `/static/${imagePath}`;
        editImageContainer.style.display = 'block';
        window.currentEditImagePath = imagePath;
    } else {
        editImageContainer.style.display = 'none';
        editImagePreview.src = '';
        window.currentEditImagePath = null;
    }
    window.editImageRemoved = false;
    window.editNewImageFile = null;
    
    document.getElementById("editModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function saveEdit() {
    const title = document.getElementById("editTitle").value.trim();
    const message = document.getElementById("editMessage").value.trim();
    const newImageFile = document.getElementById("editAnnouncementImage").files[0];
    const expiryValue = document.getElementById("editExpiryValue").value;
    const expiryUnit = document.getElementById("editExpiryUnit").value;
    
    if (!title && !message && !newImageFile && !window.currentEditImagePath) {
        showToast("Announcement must have title/message or image", "error");
        return;
    }
    
    const expirationDate = calculateExpirationDate(expiryValue, expiryUnit);
    
    const saveBtn = document.querySelector("#editModal .edit-modal-btn-primary");
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        const formData = new FormData();
        if (title) formData.append("title", title);
        if (message) formData.append("message", message);
        if (expirationDate) formData.append("expirationDate", expirationDate);
        if (newImageFile) formData.append("image", newImageFile);
        
        const res = await fetch(`/api/superadmin/announcements/${editID}`, {
            method: "PUT",
            body: formData
        });
        
        if (!res.ok) throw new Error("Failed to update announcement");
        
        showToast(`✓ Announcement updated! Now expires in ${expiryValue} ${expiryUnit}`, "success");
        sessionStorage.removeItem("announcements");
        closeEditModal();
        await loadAnnouncements(true);
        
    } catch (err) {
        console.error(err);
        showToast("Failed to update announcement", "error");
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// ================= DELETE =================
function openDeleteModal(id) {
    deleteID = id
    document.getElementById("deleteModal").style.display = "flex"
    document.body.style.overflow = "hidden"
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none"
    document.body.style.overflow = ""
    deleteID = null
}

async function confirmDelete() {
    const deleteBtn = document.querySelector("#deleteModal .btn.confirm");
    const originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    try {
        const res = await fetch(`/api/superadmin/announcements/${deleteID}`, {
            method: "DELETE"
        })
        
        if (!res.ok) throw new Error("Failed to delete announcement");
        
        showToast("Announcement deleted successfully!", "success")
        sessionStorage.removeItem("announcements")
        closeDeleteModal()
        await loadAnnouncements(true)
        
    } catch (err) {
        console.error(err)
        showToast("Failed to delete announcement", "error")
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// ================= CLEAR FORM =================
function clearForm() {
    document.getElementById("title").value = ""
    document.getElementById("message").value = ""
    const charCountSpan = document.getElementById("charCount");
    if (charCountSpan) charCountSpan.textContent = "0";
}

// ================= CHARACTER COUNTER =================
function setupCharCounter() {
    const messageTextarea = document.getElementById('message');
    const charCountSpan = document.getElementById('charCount');
    
    if (messageTextarea && charCountSpan) {
        messageTextarea.addEventListener('input', function() {
            charCountSpan.textContent = this.value.length;
        });
    }
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

// ================= CLOSE MODALS =================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        const editModal = document.getElementById("editModal");
        const deleteModal = document.getElementById("deleteModal");
        const logoutModalElem = document.getElementById("logoutModal");
        
        if (editModal && editModal.style.display === "flex") closeEditModal();
        if (deleteModal && deleteModal.style.display === "flex") closeDeleteModal();
        if (logoutModalElem && logoutModalElem.style.display === "block") logoutModalElem.style.display = "none";
    }
});

window.addEventListener("click", (e) => {
    const editModal = document.getElementById("editModal");
    const deleteModal = document.getElementById("deleteModal");
    
    if (e.target === editModal) closeEditModal();
    if (e.target === deleteModal) closeDeleteModal();
});

// ================= PERIODIC EXPIRY CHECK =================
function startPeriodicExpiryCheck() {
    if (expiryCheckInterval) {
        clearInterval(expiryCheckInterval);
    }
    
    expiryCheckInterval = setInterval(async () => {
        console.log("Running periodic expiry check...");
        
        const hasExpired = allAnnouncements.some(a => isExpired(a.expirationDate));
        
        if (hasExpired) {
            console.log("Expired announcements detected, cleaning up...");
            
            const beforeCount = allAnnouncements.length;
            allAnnouncements = allAnnouncements.filter(a => !isExpired(a.expirationDate));
            renderTwoColumns();
            
            console.log(`Removed ${beforeCount - allAnnouncements.length} expired from view`);
            
            await deleteExpiredAnnouncementsFromDB();
            showToast(`${beforeCount - allAnnouncements.length} expired announcement(s) removed`, "success");
        }
    }, 60000);
}

function stopPeriodicExpiryCheck() {
    if (expiryCheckInterval) {
        clearInterval(expiryCheckInterval);
        expiryCheckInterval = null;
    }
}

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
    loadAnnouncements();
    setupCharCounter();
    setupEditCharCounter();
    startPeriodicExpiryCheck();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

window.addEventListener("beforeunload", () => {
    stopPeriodicExpiryCheck();
});

// ================= IMAGE PREVIEW =================
function previewImage(input, previewId) {
    const container = input.closest('.input-group')?.querySelector(`#${previewId}Container`);
    const previewImg = document.getElementById(previewId);
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            if (container) container.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    } else {
        if (container) container.style.display = 'none';
        if (previewImg) previewImg.src = '';
    }
}

function removeImage() {
    document.getElementById('announcementImage').value = '';
    document.getElementById('imagePreviewContainer').style.display = 'none';
    document.getElementById('imagePreview').src = '';
}

function removeEditImage() {
    document.getElementById('editAnnouncementImage').value = '';
    document.getElementById('editImagePreviewContainer').style.display = 'none';
    document.getElementById('editImagePreview').src = '';
    window.editImageRemoved = true;
}

// ================= EXPIRATION HELPERS =================
function calculateExpirationDate(value, unit) {
    const now = new Date();
    const num = parseInt(value);
    
    switch(unit) {
        case 'days':
            now.setDate(now.getDate() + num);
            break;
        case 'weeks':
            now.setDate(now.getDate() + (num * 7));
            break;
        case 'months':
            now.setMonth(now.getMonth() + num);
            break;
        default:
            now.setDate(now.getDate() + (num * 7));
    }
    
    return now.toISOString();
}

function isExpired(expirationDate) {
    if (!expirationDate) return false;
    
    const now = new Date();
    const expDate = new Date(expirationDate);
    
    const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 
                            now.getHours(), now.getMinutes(), now.getSeconds());
    const expUTC = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate(),
                            expDate.getHours(), expDate.getMinutes(), expDate.getSeconds());
    
    return expUTC <= nowUTC;
}

function formatExpirationForDisplay(expirationDate) {
    if (!expirationDate) return 'No expiration';
    
    const date = new Date(expirationDate);
    return date.toLocaleString('en-PH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila'
    });
}

// ================= AUTO-DELETE EXPIRED ANNOUNCEMENTS =================
async function deleteExpiredAnnouncementsFromDB() {
    try {
        console.log("Checking for expired announcements in database...");
        
        const res = await fetch("/api/superadmin/announcements/expired", {
            method: "DELETE"
        });
        
        if (res.ok) {
            const result = await res.json();
            if (result.deletedCount > 0) {
                console.log(`Deleted ${result.deletedCount} expired announcements`);
                sessionStorage.removeItem("announcements");
                return result.deletedCount;
            } else {
                console.log("No expired announcements found");
                return 0;
            }
        } else {
            console.error("Failed to delete expired announcements");
            return 0;
        }
    } catch (err) {
        console.error("Error deleting expired announcements:", err);
        return 0;
    }
}