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

// ==================== DECLARE VARIABLES ====================
let deleteID = null;
let deleteType = null;
let allAdvertisements = [];
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 0;
let currentFileData = null;
let currentFileType = null;
let currentFilter = 'all';

// ==================== TOAST NOTIFICATION ====================
function showToast(message, type = 'info') {
    const LABELS = {
        success: 'Success',
        error: 'Error',
        info: 'Notice',
        loading: 'Please wait'
    };

    const ICONS = {
        success: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        error: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
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
                @keyframes toastSpin { to { transform: rotate(360deg); } }
                @keyframes toastProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
                @keyframes toastLoading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
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

// ==================== LOAD ALL ADVERTISEMENTS ====================
async function loadAdvertisements() {
    const container = document.getElementById("advertisementsList");
    const adCountSpan = document.getElementById("adCount");
    const pageInfo = document.getElementById("pageInfo");
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    if (!container) return;

    container.innerHTML = `
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
    `;

    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/advertisements?tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch advertisements");

        let ads = await res.json();

        let filteredAds = [...ads];

        if (currentFilter === 'image') {
            filteredAds = ads.filter(ad => {
                return ad.file_type === 'image' || ad.file_type === 'png' || ad.file_type === 'image/png';
            });
        } else if (currentFilter === 'video') {
            filteredAds = ads.filter(ad => {
                return ad.file_type === 'video' || ad.file_type === 'mp4' || ad.file_type === 'video/mp4';
            });
        }

        allAdvertisements = filteredAds;

        if (adCountSpan) {
            const totalAds = ads.length;
            const filteredCount = filteredAds.length;
            if (currentFilter === 'all') {
                adCountSpan.textContent = `(${filteredCount})`;
            } else {
                adCountSpan.textContent = `(${filteredCount} / ${totalAds})`;
            }
        }

        if (allAdvertisements.length === 0) {
            let emptyMessage = '';
            if (currentFilter === 'image') {
                emptyMessage = '<i class="fas fa-image"></i><p>No images uploaded yet</p><span style="color:#94a3b8;font-size:0.8rem;">Upload PNG images (max 2MB)</span>';
            } else if (currentFilter === 'video') {
                emptyMessage = '<i class="fas fa-video"></i><p>No videos uploaded yet</p><span style="color:#94a3b8;font-size:0.8rem;">Upload MP4 videos (max 20MB)</span>';
            } else {
                emptyMessage = '<i class="fas fa-cloud-upload-alt"></i><p>No advertisements uploaded yet</p><span style="color:#94a3b8;font-size:0.8rem;">Upload PNG images or MP4 videos (max 20MB)</span>';
            }
            container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
            if (pageInfo) pageInfo.textContent = "Page 0 of 0";
            if (prevPageBtn) prevPageBtn.disabled = true;
            if (nextPageBtn) nextPageBtn.disabled = true;
            return;
        }

        totalPages = Math.ceil(allAdvertisements.length / itemsPerPage);
        if (currentPage > totalPages) currentPage = totalPages;

        if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        if (prevPageBtn) prevPageBtn.disabled = (currentPage === 1);
        if (nextPageBtn) nextPageBtn.disabled = (currentPage === totalPages);

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentAds = allAdvertisements.slice(startIndex, endIndex);

        const formatFileSize = (bytes) => {
            if (!bytes) return 'Unknown';
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        };

        container.innerHTML = currentAds.map((ad, index) => {
            const fileUrl = ad.filePath;
            const filename = fileUrl ? fileUrl.split('/').pop() : `ad_${ad.id}`;
            const globalIndex = startIndex + index + 1;
            const date = ad.date || new Date(ad.timestamp * 1000).toLocaleDateString() || 'Unknown date';
            const fileSize = formatFileSize(ad.fileSize);
            const isVideo = ad.file_type === 'video' || ad.file_type === 'mp4';
            const iconClass = isVideo ? 'fa-file-video' : 'fa-file-image';
            const previewFunction = isVideo ? 'openVideoPreviewModal' : 'openImagePreviewModal';
            const ext = filename.split('.').pop().toUpperCase();
            const typeBadge = isVideo ?
                `<span class="file-type-badge video-badge"><i class="fas fa-video"></i> ${ext}</span>` :
                `<span class="file-type-badge image-badge"><i class="fas fa-image"></i> ${ext}</span>`;

            return `
                <div class="ad-list-item">
                    <div class="ad-number">${globalIndex}</div>
                    <div class="ad-info" onclick="${previewFunction}('${fileUrl}', '${escapeHtml(filename)}')">
                        <div class="ad-filename">
                            <i class="fas ${iconClass}"></i> ${escapeHtml(filename)}
                            ${typeBadge}
                        </div>
                        <div class="ad-details">
                            <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                            <span><i class="fas ${isVideo ? 'fa-database' : 'fa-weight-hanging'}"></i> ${fileSize}</span>
                        </div>
                    </div>
                    <div class="ad-actions">
                        <button class="delete-list-btn" onclick="openDeleteModal('${ad.id}', '${ad.file_type}')">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading advertisements:", err);
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle" style="color:#ef4444;"></i><p>Failed to load advertisements.</p><span style="color:#94a3b8;font-size:0.8rem;">Please try again</span></div>`;
        showToast("Failed to load advertisements", "error");
    }
}

// ==================== FILTER FUNCTION ====================
function applyFilter() {
    const filterSelect = document.getElementById("adFilterType");
    if (filterSelect) {
        currentFilter = filterSelect.value;
        currentPage = 1;
        loadAdvertisements();
    }
}

// ==================== SETUP FILTER LISTENER ====================
function setupFilterListener() {
    const filterSelect = document.getElementById("adFilterType");
    if (filterSelect) {
        const newFilter = filterSelect.cloneNode(true);
        filterSelect.parentNode.replaceChild(newFilter, filterSelect);

        newFilter.addEventListener("change", function(e) {
            currentFilter = this.value;
            currentPage = 1;
            loadAdvertisements();
        });

        if (newFilter.value !== currentFilter) {
            currentFilter = newFilter.value;
        }
    }
}

// ==================== PAGINATION FUNCTIONS ====================
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadAdvertisements();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadAdvertisements();
    }
}

// ==================== DELETE FUNCTIONS ====================
function openDeleteModal(id, type) {
    deleteID = id;
    deleteType = type;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = "hidden";
    }
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = "";
    }
    deleteID = null;
    deleteType = null;
}

async function confirmDelete() {
    if (!deleteID) return;

    const deleteBtn = document.querySelector("#deleteModal .btn.confirm");
    const originalText = deleteBtn ? deleteBtn.innerHTML : 'Delete';
    if (deleteBtn) {
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        deleteBtn.disabled = true;
    }

    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/advertisements/${deleteID}?tab_id=${tabId}`, { method: "DELETE" });

        if (res.ok) {
            const typeText = deleteType === 'video' ? 'Video' : 'Advertisement';
            showToast(`${typeText} deleted successfully!`, "success");
            closeDeleteModal();
            await loadAdvertisements();
        } else {
            const data = await res.json();
            showToast(data.error || "Failed to delete", "error");
        }
    } catch (err) {
        console.error("Delete error:", err);
        showToast("Failed to delete", "error");
    } finally {
        if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
        }
    }
}

// ==================== IMAGE/VIDEO VALIDATION HELPERS ====================

// Get image dimensions
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

// Get video dimensions and duration
function getVideoInfo(file) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        
        video.onloadedmetadata = function() {
            const width = video.videoWidth;
            const height = video.videoHeight;
            const duration = video.duration;
            URL.revokeObjectURL(url);
            
            resolve({
                width: width,
                height: height,
                duration: duration,
                isPortrait: height > width,
                isLandscape: width > height,
                isSquare: width === height
            });
        };
        
        video.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error("Failed to load video"));
        };
        
        video.src = url;
        video.load();
    });
}

// ==================== PREVIEW FILE WITH VALIDATION ====================
function previewFile(input) {
    const container = document.getElementById("previewContainer");
    const fileInfoDiv = document.getElementById("fileInfoDiv");
    const imageWrapper = document.getElementById("imagePreviewWrapper");
    const videoWrapper = document.getElementById("videoPreviewWrapper");
    const previewFileName = document.getElementById("previewFileName");
    const previewFileSize = document.getElementById("previewFileSize");
    const previewImg = document.getElementById("filePreview");
    const previewVideo = document.getElementById("videoPreview");
    const fileTypeIcon = document.getElementById("fileTypeIcon");
    const fileTypeText = document.getElementById("fileTypeText");

    if (input.files && input.files[0]) {
        const file = input.files[0];
        const fileExt = file.name.split('.').pop().toLowerCase();
        const isVideo = fileExt === 'mp4';
        const isImage = fileExt === 'png';

        if (!isVideo && !isImage) {
            showToast("Only PNG images and MP4 videos are allowed!", "error");
            input.value = '';
            return;
        }

        // ✅ VALIDATE IMAGE SIZE (max 5MB)
        if (isImage) {
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                showToast("Image must be less than 5MB!", "error");
                input.value = '';
                return;
            }
        }

        // ✅ VALIDATE VIDEO SIZE (max 20MB)
        if (isVideo) {
            const maxSize = 20 * 1024 * 1024; // 20MB
            if (file.size > maxSize) {
                showToast("Video must be less than 20MB!", "error");
                input.value = '';
                return;
            }
        }

        // ✅ VALIDATE IMAGE DIMENSIONS (PNG only - any size but must be portrait)
        if (isImage) {
            try {
                getImageDimensions(file).then(dimensions => {
                    // Allow any dimensions, but check if it's a valid image
                    console.log("Image dimensions:", dimensions.width, "x", dimensions.height);
                }).catch(err => {
                    showToast("Invalid image file", "error");
                    input.value = '';
                    return;
                });
            } catch (err) {
                showToast("Failed to read image", "error");
                input.value = '';
                return;
            }
        }

        // ✅ VALIDATE VIDEO ORIENTATION (must be portrait - height > width)
        if (isVideo) {
            try {
                getVideoInfo(file).then(info => {
                    if (!info.isPortrait) {
                        showToast("Video must be in PORTRAIT!", "error");
                        input.value = '';
                        return;
                    }
                    console.log("Video info:", info.width, "x", info.height, "Duration:", info.duration);
                }).catch(err => {
                    showToast("Invalid video file", "error");
                    input.value = '';
                    return;
                });
            } catch (err) {
                showToast("Failed to read video", "error");
                input.value = '';
                return;
            }
        }

        currentFileType = isVideo ? 'video' : 'image';

        const reader = new FileReader();
        reader.onload = (e) => {
            currentFileData = e.target.result;
            if (isImage && previewImg) previewImg.src = currentFileData;
            if (isVideo && previewVideo) previewVideo.src = currentFileData;
        };
        reader.readAsDataURL(file);

        if (previewFileName) previewFileName.textContent = file.name;
        if (previewFileSize) previewFileSize.textContent = isVideo ?
            `${(file.size / 1024 / 1024).toFixed(2)} MB` :
            `${(file.size / 1024).toFixed(2)} KB`;

        if (fileTypeIcon) {
            fileTypeIcon.className = isVideo ? 'fas fa-video' : 'fas fa-image';
        }
        if (fileTypeText) {
            fileTypeText.textContent = isVideo ? 'MP4 Video (Portrait)' : 'PNG Image';
            fileTypeText.style.color = isVideo ? '#dc2626' : '#0047ab';
        }

        if (imageWrapper) imageWrapper.style.display = 'none';
        if (videoWrapper) videoWrapper.style.display = 'none';
        if (fileInfoDiv) fileInfoDiv.style.display = 'block';
        if (container) container.style.display = 'block';
    }
}

function showFilePreview() {
    const fileInfoDiv = document.getElementById("fileInfoDiv");
    const imageWrapper = document.getElementById("imagePreviewWrapper");
    const videoWrapper = document.getElementById("videoPreviewWrapper");
    const previewImg = document.getElementById("filePreview");
    const previewVideo = document.getElementById("videoPreview");

    if (currentFileData) {
        if (currentFileType === 'image') {
            if (previewImg) previewImg.src = currentFileData;
            if (fileInfoDiv) fileInfoDiv.style.display = 'none';
            if (imageWrapper) imageWrapper.style.display = 'block';
            if (videoWrapper) videoWrapper.style.display = 'none';
        } else if (currentFileType === 'video') {
            if (previewVideo) previewVideo.src = currentFileData;
            if (fileInfoDiv) fileInfoDiv.style.display = 'none';
            if (videoWrapper) videoWrapper.style.display = 'block';
            if (imageWrapper) imageWrapper.style.display = 'none';
        }
    }
}

function hideFilePreview() {
    const fileInfoDiv = document.getElementById("fileInfoDiv");
    const imageWrapper = document.getElementById("imagePreviewWrapper");
    const videoWrapper = document.getElementById("videoPreviewWrapper");

    if (fileInfoDiv) fileInfoDiv.style.display = 'block';
    if (imageWrapper) imageWrapper.style.display = 'none';
    if (videoWrapper) videoWrapper.style.display = 'none';
}

function removeFile() {
    const fileInput = document.getElementById('adFile');
    const container = document.getElementById('previewContainer');
    const previewImg = document.getElementById('filePreview');
    const previewVideo = document.getElementById('videoPreview');
    const fileInfoDiv = document.getElementById("fileInfoDiv");
    const imageWrapper = document.getElementById("imagePreviewWrapper");
    const videoWrapper = document.getElementById("videoPreviewWrapper");
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');

    if (container) container.style.display = 'none';
    if (previewImg) previewImg.src = '';
    if (previewVideo) previewVideo.src = '';
    if (previewFileName) previewFileName.textContent = '';
    if (previewFileSize) previewFileSize.textContent = '';
    if (fileInput) fileInput.value = '';

    if (fileInfoDiv) fileInfoDiv.style.display = 'block';
    if (imageWrapper) imageWrapper.style.display = 'none';
    if (videoWrapper) videoWrapper.style.display = 'none';

    currentFileData = null;
    currentFileType = null;
}

function clearForm() {
    removeFile();
}

// ==================== UPLOAD FUNCTION WITH VALIDATION ====================
async function uploadAdvertisement(event) {
    if (event) event.preventDefault();

    const file = document.getElementById("adFile").files[0];

    if (!file) {
        showToast("Please select a file to upload", "error");
        return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    const isVideo = fileExt === 'mp4';
    const isImage = fileExt === 'png';

    if (!isVideo && !isImage) {
        showToast("Only PNG images and MP4 videos are allowed!", "error");
        return;
    }

    // ✅ VALIDATE IMAGE SIZE (max 5MB)
    if (isImage) {
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast("Image must be less than 5MB!", "error");
            return;
        }

        // ✅ VALIDATE IMAGE IS VALID PNG
        try {
            await getImageDimensions(file);
        } catch (err) {
            showToast("Invalid image file", "error");
            return;
        }
    }

    // ✅ VALIDATE VIDEO SIZE (max 20MB) AND PORTRAIT ORIENTATION
    if (isVideo) {
        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast("Video must be less than 20MB!", "error");
            return;
        }

        // ✅ VALIDATE VIDEO ORIENTATION (must be portrait)
        try {
            const videoInfo = await getVideoInfo(file);
            if (!videoInfo.isPortrait) {
                showToast("Video must be in PORTRAIT orientation (height > width)!", "error");
                return;
            }
        } catch (err) {
            showToast("Invalid video file", "error");
            return;
        }
    }

    const uploadBtn = document.getElementById("uploadBtn");
    const originalText = uploadBtn ? uploadBtn.innerHTML : 'Upload';
    if (uploadBtn) {
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
        uploadBtn.disabled = true;
    }

    try {
        const formData = new FormData();
        formData.append("file", file);

        const tabId = getTabId();
        const response = await fetch(`/api/superadmin/advertisements?tab_id=${tabId}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            const typeText = isVideo ? 'Video' : 'Image';
            showToast(`${typeText} uploaded successfully!`, 'success');

            document.getElementById("adFile").value = '';
            removeFile();
            await loadAdvertisements();
        } else {
            showToast(result.error || 'Upload failed', 'error');
        }
    } catch (err) {
        console.error('Upload error:', err);
        showToast('Failed to upload', 'error');
    } finally {
        if (uploadBtn) {
            uploadBtn.innerHTML = originalText;
            uploadBtn.disabled = false;
        }
    }
}

// ==================== DROPZONE SETUP WITH VALIDATION ====================
function setupDropzone() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('adFile');
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

    dropzone.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#cbd5e1';
        dropzone.style.background = '#fafcff';

        const file = e.dataTransfer.files[0];
        if (file) {
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'png') {
                // ✅ Check image size
                if (file.size > 5 * 1024 * 1024) {
                    showToast('PNG image must be less than 5MB!', 'error');
                    return;
                }
                
                // ✅ Check if valid image
                try {
                    await getImageDimensions(file);
                } catch (err) {
                    showToast('Invalid image file', 'error');
                    return;
                }
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                previewFile(fileInput);
                showToast('PNG image selected', 'success');
                
            } else if (ext === 'mp4') {
                // ✅ Check video size
                if (file.size > 20 * 1024 * 1024) {
                    showToast('MP4 video must be less than 20MB!', 'error');
                    return;
                }
                
                // ✅ Check video orientation (must be portrait)
                try {
                    const videoInfo = await getVideoInfo(file);
                    if (!videoInfo.isPortrait) {
                        showToast('Video must be in PORTRAIT orientation!', 'error');
                        return;
                    }
                } catch (err) {
                    showToast('Invalid video file', 'error');
                    return;
                }
                
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInput.files = dataTransfer.files;
                previewFile(fileInput);
                showToast('MP4 video (portrait) selected', 'success');
                
            } else {
                showToast('Only PNG images and MP4 videos are allowed!', 'error');
            }
        }
    });

    fileInput.addEventListener('change', function() {
        if (this.files && this.files[0]) {
            previewFile(this);
        }
    });
}

// ==================== MODAL FUNCTIONS ====================
let isClosingModal = false;

function openImagePreviewModal(imageUrl, filename) {
    const modal = document.getElementById("mediaPreviewModal");
    const modalImage = document.getElementById("modalImage");
    const modalVideo = document.getElementById("modalVideo");
    const modalTitle = document.getElementById("modalTitle");

    if (modal && modalImage) {
        isClosingModal = false;

        if (modalVideo) {
            modalVideo.pause();
            modalVideo.src = '';
        }

        modalImage.style.display = 'block';
        modalVideo.style.display = 'none';
        modalImage.src = imageUrl;
        if (modalTitle) modalTitle.textContent = filename;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        modalImage.onerror = function() {
            if (!isClosingModal) {
                this.src = "/static/default-logo.png";
                console.error("Failed to load image:", imageUrl);
            }
        };
    }
}

function openVideoPreviewModal(videoUrl, filename) {
    const modal = document.getElementById("mediaPreviewModal");
    const modalImage = document.getElementById("modalImage");
    const modalVideo = document.getElementById("modalVideo");
    const modalTitle = document.getElementById("modalTitle");

    if (modal && modalVideo) {
        isClosingModal = false;
        modalVideo.onerror = null;

        modalImage.style.display = 'none';
        modalVideo.style.display = 'block';
        modalVideo.src = videoUrl;
        if (modalTitle) modalTitle.textContent = filename;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        modalVideo.load();
        modalVideo.play().catch(e => console.log("Autoplay prevented:", e));

        modalVideo.onerror = function() {
            if (!isClosingModal) {
                console.error("Failed to load video:", videoUrl);
                showToast("Failed to load video", "error");
                closeMediaPreviewModal();
            }
        };
    }
}

function closeMediaPreviewModal() {
    const modal = document.getElementById("mediaPreviewModal");
    if (modal) {
        isClosingModal = true;

        const modalImage = document.getElementById("modalImage");
        const modalVideo = document.getElementById("modalVideo");

        if (modalVideo) {
            modalVideo.pause();
            modalVideo.onerror = null;
            modalVideo.src = '';
            modalVideo.load();
        }

        if (modalImage) {
            modalImage.onerror = null;
            modalImage.src = '';
        }

        modal.style.display = "none";
        document.body.style.overflow = "";

        setTimeout(() => {
            isClosingModal = false;
        }, 100);
    }
}

// Close modal with ESC key
document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        const modal = document.getElementById("mediaPreviewModal");
        if (modal && modal.style.display === "flex") {
            e.preventDefault();
            closeMediaPreviewModal();
        }
    }
});

// Close modal on background click
document.addEventListener("click", function(e) {
    const modal = document.getElementById("mediaPreviewModal");
    if (modal && modal.style.display === "flex") {
        if (e.target === modal) {
            closeMediaPreviewModal();
        }
    }
});

// ==================== PROFILE FUNCTIONS ====================
async function loadProfile() {
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        if (res.ok) {
            const profile = await res.json();
            const profileNameSpan = document.getElementById("profileName");
            if (profileNameSpan) profileNameSpan.textContent = profile.name || profile.username || "";
        }
    } catch (err) {
        console.error(err);
    }
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

// ==================== HAMBURGER TOGGLE ====================
function setupHamburger() {
    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            this.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        });

        if (overlay) {
            overlay.addEventListener('click', function() {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
                this.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close sidebar on resize to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth >= 768 && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
                if (overlay) overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// ==================== PROFILE DROPDOWN ====================
function setupProfileDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            this.classList.toggle('active');
            profileMenu.classList.toggle('show');
        });

        window.addEventListener('click', function() {
            profileBtn.classList.remove('active');
            profileMenu.classList.remove('show');
        });
    }
}

// ==================== NOTIFICATION DROPDOWN ====================
function setupNotificationDropdown() {
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationMenu = document.getElementById('notificationMenu');

    if (notificationBtn && notificationMenu) {
        notificationBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationMenu.classList.toggle('show');
        });

        window.addEventListener('click', function() {
            notificationMenu.classList.remove('show');
        });
    }
}

// ==================== LOGOUT MODAL ====================
function setupLogoutModal() {
    const logoutBtn = document.getElementById("logoutBtn");
    const logoutModal = document.getElementById("logoutModal");

    if (logoutBtn && logoutModal) {
        const closeBtn = document.getElementById("closeLogoutModal");
        const cancelBtn = document.getElementById("cancelLogout");
        const confirmBtn = document.getElementById("confirmLogout");

        logoutBtn.addEventListener("click", function(e) {
            e.preventDefault();
            logoutModal.classList.add('show');
            document.body.style.overflow = 'hidden';
        });

        if (closeBtn) {
            closeBtn.addEventListener("click", function() {
                logoutModal.classList.remove('show');
                document.body.style.overflow = '';
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener("click", function() {
                logoutModal.classList.remove('show');
                document.body.style.overflow = '';
            });
        }

        if (confirmBtn) {
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

        window.addEventListener("click", function(e) {
            if (e.target === logoutModal) {
                logoutModal.classList.remove('show');
                document.body.style.overflow = '';
            }
        });
    }
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close logout modal
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal && logoutModal.classList.contains('show')) {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close delete modal
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal && deleteModal.classList.contains('show')) {
            deleteModal.classList.remove('show');
            document.body.style.overflow = '';
        }

        // Close profile dropdown
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu && profileMenu.classList.contains('show')) {
            profileMenu.classList.remove('show');
            const profileBtn = document.getElementById('profileBtn');
            if (profileBtn) profileBtn.classList.remove('active');
        }

        // Close notification menu
        const notificationMenu = document.getElementById('notificationMenu');
        if (notificationMenu && notificationMenu.classList.contains('show')) {
            notificationMenu.classList.remove('show');
        }

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerBtn');
        const overlay = document.getElementById('sidebarOverlay');
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ==================== INITIALIZATION ====================
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

async function init() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;

    console.log("Initializing Unified Advertisement Management...");

    setupHamburger();
    setupProfileDropdown();
    setupNotificationDropdown();
    setupLogoutModal();
    loadAdvertisements();
    setupDropzone();
    setupFilterListener();

    // Setup form submission
    const adForm = document.getElementById("adForm");
    if (adForm) {
        adForm.addEventListener("submit", function(e) {
            e.preventDefault();
            uploadAdvertisement();
        });
    }

    // Setup file input change
    const adFileInput = document.getElementById("adFile");
    if (adFileInput) {
        adFileInput.addEventListener("change", function() {
            if (this.files && this.files[0]) previewFile(this);
        });
    }

    // Preview event listeners
    const fileInfoDiv = document.getElementById("fileInfoDiv");
    if (fileInfoDiv) {
        fileInfoDiv.addEventListener("click", showFilePreview);
    }

    const hidePreviewBtn = document.getElementById("hidePreviewBtn");
    if (hidePreviewBtn) {
        hidePreviewBtn.addEventListener("click", hideFilePreview);
    }

    const removePreviewBtn = document.getElementById("removePreviewBtn");
    if (removePreviewBtn) {
        removePreviewBtn.addEventListener("click", removeFile);
    }

    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
        clearBtn.addEventListener("click", clearForm);
    }

    // Pagination buttons
    const prevPageBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");
    if (prevPageBtn) prevPageBtn.addEventListener("click", goToPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener("click", goToNextPage);

    // Delete modal buttons
    const deleteConfirmBtn = document.getElementById("deleteConfirmBtn");
    if (deleteConfirmBtn) deleteConfirmBtn.addEventListener("click", confirmDelete);

    const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
    if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteModal);

    // Load profile
    loadProfile();

    // Initialize notification system
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }

    console.log("Unified Advertisement Management initialization complete!");
}