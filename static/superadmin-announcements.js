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
        toast._hideTimer = setTimeout(function() {
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

// ==================== GLOBAL VARIABLES ====================
let editID = null;
let deleteID = null;
let allAnnouncements = [];
let expiryCheckInterval = null;

// ==================== LOAD ANNOUNCEMENTS ====================
async function loadAnnouncements(forceRefresh = false) {
    const textOnlyContainer = document.getElementById("textOnlyContainer");
    const withImageContainer = document.getElementById("withImageContainer");
    
    if (!textOnlyContainer || !withImageContainer) return;

    await deleteExpiredAnnouncementsFromDB();

    if (!forceRefresh) {
        const cached = sessionStorage.getItem("announcements");
        if (cached) {
            const data = JSON.parse(cached);
            allAnnouncements = data.filter(function(a) { return !isExpired(a.expirationDate); });
            renderTwoColumns();
            
            if (allAnnouncements.length !== data.length) {
                sessionStorage.removeItem("announcements");
            }
            return;
        }
    }

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
        
        data = data.map(function(ann) {
            return {
                ...ann,
                imageUrl: ann.imagePath ? ann.imagePath : null
            };
        });
        
        console.log("Fetched announcements:", data);
        
        const beforeFilterCount = data.length;
        allAnnouncements = data.filter(function(a) { return !isExpired(a.expirationDate); });
        
        if (beforeFilterCount !== allAnnouncements.length) {
            console.log("Filtered out " + (beforeFilterCount - allAnnouncements.length) + " expired announcements");
        }

        sessionStorage.setItem("announcements", JSON.stringify(allAnnouncements));
        renderTwoColumns();

    } catch (err) {
        textOnlyContainer.innerHTML = '<p style="color:red;text-align:center;">Failed to load announcements.</p>';
        withImageContainer.innerHTML = '<p style="color:red;text-align:center;">Failed to load announcements.</p>';
        console.error(err);
        showToast("Failed to load announcements", "error");
    }
}

// ==================== RENDER TWO COLUMNS ====================
function renderTwoColumns() {
    const textOnlyContainer = document.getElementById("textOnlyContainer");
    const withImageContainer = document.getElementById("withImageContainer");
    const textOnlyBadge = document.getElementById("textOnlyCount");
    const withImageBadge = document.getElementById("withImageCount");
    
    if (!textOnlyContainer || !withImageContainer) return;
    
    var textOnlyPosts = allAnnouncements.filter(function(a) { return !a.imagePath; });
    var withImagePosts = allAnnouncements.filter(function(a) { return a.imagePath; });
    
    if (textOnlyBadge) textOnlyBadge.textContent = textOnlyPosts.length;
    if (withImageBadge) withImageBadge.textContent = withImagePosts.length;
    
    if (textOnlyPosts.length === 0) {
        textOnlyContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <p>No announcements</p>
            </div>
        `;
    } else {
        textOnlyContainer.innerHTML = textOnlyPosts.map(function(a) { return renderAnnouncementCard(a); }).join('');
    }
    
    if (withImagePosts.length === 0) {
        withImageContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-image"></i>
                <p>No announcements</p>
            </div>
        `;
    } else {
        withImageContainer.innerHTML = withImagePosts.map(function(a) { return renderAnnouncementCard(a); }).join('');
    }
}

// ==================== RENDER ANNOUNCEMENT CARD ====================
function renderAnnouncementCard(a) {
    var imageHtml = a.imagePath ? `
        <div class="announcement-image">
            <img src="${escapeHtml(a.imageUrl)}" alt="Announcement image" onerror="this.src='/static/default-announcement.jpg'">
        </div>
    ` : '';
    
    var expiryHtml = '';
    if (a.expirationDate) {
        var expDateTime = new Date(a.expirationDate);
        var daysLeft = Math.ceil((expDateTime - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3 && daysLeft > 0) {
            expiryHtml = '<span class="expiry-badge expiry-warning"><i class="fas fa-exclamation-triangle"></i> Expires in ' + daysLeft + ' day' + (daysLeft !== 1 ? 's' : '') + '</span>';
        } else if (daysLeft > 0) {
            expiryHtml = '<span class="expiry-badge"><i class="fas fa-hourglass-half"></i> Expires: ' + formatExpirationForDisplay(a.expirationDate) + '</span>';
        }
    }

    var titleDisplay = a.title ? a.title : '';
    var hasTitle = a.title && a.title !== '';
    var hasMessage = a.message && a.message !== '';
    var hasImage = a.imagePath && a.imagePath !== '';
    var messageDisplay = hasMessage ? a.message : '';
    var isImageOnly = !hasTitle && !hasMessage && hasImage;
    
    if (isImageOnly) {
        return `
            <div class="announcement-card image-only-card">
                <div class="announcement-header">
                    <div class="announcement-info">
                        <div class="announcement-date">
                            <i class="fas fa-calendar-alt"></i> ${a.date}
                        </div>
                        ${expiryHtml ? '<div class="announcement-expiry">' + expiryHtml + '</div>' : ''}
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
                    ${hasTitle ? '<div class="announcement-title"><i class="fas fa-bullhorn"></i> ' + escapeHtml(titleDisplay) + '</div>' : ''}
                    <div class="announcement-date">
                        <i class="fas fa-calendar-alt"></i> ${a.date}
                    </div>
                    ${expiryHtml ? '<div class="announcement-expiry">' + expiryHtml + '</div>' : ''}
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
            ${hasMessage ? '<div class="announcement-message">' + escapeHtml(messageDisplay) + '</div>' : ''}
            ${imageHtml}
        </div>
    `;
}

// ==================== ESCAPE HTML ====================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ==================== CREATE ANNOUNCEMENT ====================
async function createAnnouncement() {
    var title = document.getElementById("title").value.trim();
    var message = document.getElementById("message").value.trim();
    var imageFile = document.getElementById("announcementImage").files[0];
    var expiryValue = document.getElementById("expiryValue").value;
    var expiryUnit = document.getElementById("expiryUnit").value;
  
    if (!title && !message && !imageFile) {
        showToast("Please provide either title/message or an image", "error");
        return;
    }
    
    // ✅ VALIDATE IMAGE TYPE (if image is selected)
    if (imageFile) {
        var fileExt = imageFile.name.split('.').pop().toLowerCase();
        var validTypes = ['png', 'jpeg', 'jpg'];
        if (!validTypes.includes(fileExt)) {
            showToast("Only PNG and JPEG images are allowed!", "error");
            return;
        }
    }
    
    var expirationDate = calculateExpirationDate(expiryValue, expiryUnit);
    
    var createBtn = document.querySelector(".btn-primary");
    var originalText = createBtn.innerHTML;
    createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
    createBtn.disabled = true;
    
    try {
        var formData = new FormData();
        if (title) formData.append("title", title);
        if (message) formData.append("message", message);
        if (imageFile) formData.append("image", imageFile);
        if (expirationDate) formData.append("expirationDate", expirationDate);
        
        var res = await fetch("/api/superadmin/announcements", {
            method: "POST",
            body: formData
        });
        
        if (!res.ok) throw new Error("Failed to create announcement");
        
        showToast("✓ Announcement posted! Will expire in " + expiryValue + " " + expiryUnit, "success");
        
        document.getElementById("title").value = "";
        document.getElementById("message").value = "";
        document.getElementById("announcementImage").value = "";
        document.getElementById("imagePreviewContainer").style.display = "none";
        document.getElementById("expiryValue").value = "1";
        document.getElementById("expiryUnit").value = "weeks";
        
        var charCountSpan = document.getElementById("charCount");
        if (charCountSpan) charCountSpan.textContent = "0";
        
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

// ==================== CLEAR FORM ====================
function clearForm() {
    document.getElementById("title").value = "";
    document.getElementById("message").value = "";
    document.getElementById("announcementImage").value = "";
    document.getElementById("imagePreviewContainer").style.display = "none";
    document.getElementById("expiryValue").value = "1";
    document.getElementById("expiryUnit").value = "weeks";
    var charCountSpan = document.getElementById("charCount");
    if (charCountSpan) charCountSpan.textContent = "0";
}

// ==================== CHARACTER COUNTER ====================
function setupCharCounter() {
    var messageTextarea = document.getElementById('message');
    var charCountSpan = document.getElementById('charCount');
    
    if (messageTextarea && charCountSpan) {
        messageTextarea.addEventListener('input', function() {
            charCountSpan.textContent = this.value.length;
        });
    }
}

function setupEditCharCounter() {
    var editMessageTextarea = document.getElementById('editMessage');
    var editCharCountSpan = document.getElementById('editCharCount');
    
    if (editMessageTextarea && editCharCountSpan) {
        editMessageTextarea.addEventListener('input', function() {
            editCharCountSpan.textContent = this.value.length;
        });
    }
}

// ==================== EDIT MODAL ====================
function openEditModal(id, title, message, imagePath, expirationDate) {
    editID = id;
    document.getElementById("editTitle").value = title || '';
    document.getElementById("editMessage").value = message || '';
    
    var editCharCountSpan = document.getElementById('editCharCount');
    if (editCharCountSpan) editCharCountSpan.textContent = (message || '').length;
    
    if (expirationDate) {
        var now = new Date();
        var expDate = new Date(expirationDate);
        var diffDays = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        
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
    
    var editImagePreview = document.getElementById("editImagePreview");
    var editImageContainer = document.getElementById("editImagePreviewContainer");
    if (imagePath && imagePath !== '') {
        editImagePreview.src = imagePath;
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

function closeEditModal() {
    var modal = document.getElementById("editModal");
    if (modal) modal.style.display = "none";
    document.body.style.overflow = "";
    editID = null;
    
    var fileInput = document.getElementById("editAnnouncementImage");
    if (fileInput) fileInput.value = "";
    
    var previewContainer = document.getElementById("editImagePreviewContainer");
    if (previewContainer) previewContainer.style.display = "none";
    
    var previewImg = document.getElementById("editImagePreview");
    if (previewImg) previewImg.src = "";
}

// ==================== SAVE EDIT ====================
async function saveEdit() {
    var title = document.getElementById("editTitle").value.trim();
    var message = document.getElementById("editMessage").value.trim();
    var newImageFile = document.getElementById("editAnnouncementImage").files[0];
    var expiryValue = document.getElementById("editExpiryValue").value;
    var expiryUnit = document.getElementById("editExpiryUnit").value;
    
    if (!title && !message && !newImageFile && !window.currentEditImagePath) {
        showToast("Announcement must have title/message or image", "error");
        return;
    }
    
    // ✅ VALIDATE IMAGE TYPE (if new image is selected)
    if (newImageFile) {
        var fileExt = newImageFile.name.split('.').pop().toLowerCase();
        var validTypes = ['png', 'jpeg', 'jpg'];
        if (!validTypes.includes(fileExt)) {
            showToast("Only PNG and JPEG images are allowed!", "error");
            return;
        }
    }
    
    var expirationDate = calculateExpirationDate(expiryValue, expiryUnit);
    
    var saveBtn = document.querySelector("#editModal .edit-modal-btn-primary");
    var originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;
    
    try {
        var formData = new FormData();
        if (title) formData.append("title", title);
        if (message) formData.append("message", message);
        if (expirationDate) formData.append("expirationDate", expirationDate);
        if (newImageFile) formData.append("image", newImageFile);
        
        var res = await fetch("/api/superadmin/announcements/" + editID, {
            method: "PUT",
            body: formData
        });
        
        if (!res.ok) throw new Error("Failed to update announcement");
        
        showToast("✓ Announcement updated! Now expires in " + expiryValue + " " + expiryUnit, "success");
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

// ==================== DELETE MODAL ====================
function openDeleteModal(id) {
    deleteID = id;
    document.getElementById("deleteModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeDeleteModal() {
    document.getElementById("deleteModal").style.display = "none";
    document.body.style.overflow = "";
    deleteID = null;
}

async function confirmDelete() {
    var deleteBtn = document.querySelector("#deleteModal .btn.confirm");
    var originalText = deleteBtn.innerHTML;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    deleteBtn.disabled = true;
    
    try {
        var res = await fetch("/api/superadmin/announcements/" + deleteID, {
            method: "DELETE"
        });
        
        if (!res.ok) throw new Error("Failed to delete announcement");
        
        showToast("Announcement deleted successfully!", "success");
        sessionStorage.removeItem("announcements");
        closeDeleteModal();
        await loadAnnouncements(true);
        
    } catch (err) {
        console.error(err);
        showToast("Failed to delete announcement", "error");
    } finally {
        deleteBtn.innerHTML = originalText;
        deleteBtn.disabled = false;
    }
}

// ==================== IMAGE PREVIEW WITH VALIDATION ====================
function previewImage(input, previewId) {
    var container = input.closest('.input-group').querySelector('#' + previewId + 'Container');
    var previewImg = document.getElementById(previewId);
    
    if (input.files && input.files[0]) {
        var file = input.files[0];
        var fileExt = file.name.split('.').pop().toLowerCase();
        
        // ✅ VALIDATE: Only PNG and JPEG allowed
        var validTypes = ['png', 'jpeg', 'jpg'];
        if (!validTypes.includes(fileExt)) {
            showToast("Only PNG and JPEG images are allowed!", "error");
            input.value = '';
            if (container) container.style.display = 'none';
            if (previewImg) previewImg.src = '';
            return;
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            if (container) container.style.display = 'block';
        };
        reader.readAsDataURL(file);
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

// ==================== EXPIRATION HELPERS ====================
function calculateExpirationDate(value, unit) {
    var now = new Date();
    var num = parseInt(value);
    
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
    
    var now = new Date();
    var expDate = new Date(expirationDate);
    
    var nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 
                            now.getHours(), now.getMinutes(), now.getSeconds());
    var expUTC = Date.UTC(expDate.getFullYear(), expDate.getMonth(), expDate.getDate(),
                            expDate.getHours(), expDate.getMinutes(), expDate.getSeconds());
    
    return expUTC <= nowUTC;
}

function formatExpirationForDisplay(expirationDate) {
    if (!expirationDate) return 'No expiration';
    
    var date = new Date(expirationDate);
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

// ==================== AUTO-DELETE EXPIRED ANNOUNCEMENTS ====================
async function deleteExpiredAnnouncementsFromDB() {
    try {
        console.log("Checking for expired announcements in database...");
        
        var res = await fetch("/api/superadmin/announcements/expired", {
            method: "DELETE"
        });
        
        if (res.ok) {
            var result = await res.json();
            if (result.deletedCount > 0) {
                console.log("Deleted " + result.deletedCount + " expired announcements");
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

// ==================== PERIODIC EXPIRY CHECK ====================
function startPeriodicExpiryCheck() {
    if (expiryCheckInterval) {
        clearInterval(expiryCheckInterval);
    }
    
    expiryCheckInterval = setInterval(function() {
        console.log("Running periodic expiry check...");
        
        var hasExpired = allAnnouncements.some(function(a) { return isExpired(a.expirationDate); });
        
        if (hasExpired) {
            console.log("Expired announcements detected, cleaning up...");
            
            var beforeCount = allAnnouncements.length;
            allAnnouncements = allAnnouncements.filter(function(a) { return !isExpired(a.expirationDate); });
            renderTwoColumns();
            
            console.log("Removed " + (beforeCount - allAnnouncements.length) + " expired from view");
            
            deleteExpiredAnnouncementsFromDB();
            showToast((beforeCount - allAnnouncements.length) + " expired announcement(s) removed", "success");
        }
    }, 60000);
}

function stopPeriodicExpiryCheck() {
    if (expiryCheckInterval) {
        clearInterval(expiryCheckInterval);
        expiryCheckInterval = null;
    }
}

// ==================== DRAG AND DROP VALIDATION ====================
// Kung may dropzone sa announcements
function setupDropzoneValidation() {
    var dropzone = document.getElementById('dropzone');
    if (!dropzone) return;
    
    dropzone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#0047ab';
        this.style.background = '#f0f7ff';
    });
    
    dropzone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e1';
        this.style.background = '#fafcff';
    });
    
    dropzone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e1';
        this.style.background = '#fafcff';
        
        var file = e.dataTransfer.files[0];
        if (file) {
            var ext = file.name.split('.').pop().toLowerCase();
            var validTypes = ['png', 'jpeg', 'jpg'];
            if (validTypes.includes(ext)) {
                var input = document.getElementById('announcementImage');
                var dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                previewImage(input, 'imagePreview');
                showToast('Image selected', 'success');
            } else {
                showToast('Only PNG and JPEG images are allowed!', 'error');
            }
        }
    });
}

// ==================== KEYBOARD SHORTCUT ====================
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        var editModal = document.getElementById("editModal");
        var deleteModal = document.getElementById("deleteModal");
        var logoutModalElem = document.getElementById("logoutModal");
        
        if (editModal && editModal.style.display === "flex") closeEditModal();
        if (deleteModal && deleteModal.style.display === "flex") closeDeleteModal();
        if (logoutModalElem && logoutModalElem.classList.contains('show')) {
            logoutModalElem.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
});

window.addEventListener("click", function(e) {
    var editModal = document.getElementById("editModal");
    var deleteModal = document.getElementById("deleteModal");
    
    if (e.target === editModal) closeEditModal();
    if (e.target === deleteModal) closeDeleteModal();
});

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    loadAnnouncements();
    setupCharCounter();
    setupEditCharCounter();
    startPeriodicExpiryCheck();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

window.addEventListener("beforeunload", function() {
    stopPeriodicExpiryCheck();
});

// ==================== PROFILE DROPDOWN CHEVRON ====================
(function() {
    var profileBtn = document.getElementById('profileBtn');
    var profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileBtn.classList.toggle('active');
        });
    }
})();