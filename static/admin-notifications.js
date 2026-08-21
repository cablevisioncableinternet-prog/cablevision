// ===============================
// ADMIN NOTIFICATION SYSTEM (XAMPP Compatible - No changes needed, just ensure storage keys match)
// ===============================

class AdminNotificationSystem {
    constructor() {
        this.pollingInterval = null;
        this.pollingDuration = 30000; // 30 seconds
        this.notifications = [];
        this.unreadCount = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        console.log("Initializing Admin Notification System...");
        this.isInitialized = true;
        this.attachEventListeners();
        this.startPolling();
        this.fetchNotifications();
    }

    attachEventListeners() {
        const notificationBtn = document.getElementById('notificationBtn');
        const notificationMenu = document.getElementById('notificationMenu');
        const markAllReadBtn = document.getElementById('markAllReadBtn');
        
        if (notificationBtn) {
            const newBtn = notificationBtn.cloneNode(true);
            notificationBtn.parentNode.replaceChild(newBtn, notificationBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (notificationMenu) {
                    notificationMenu.classList.toggle('show');
                    if (notificationMenu.classList.contains('show')) {
                        this.fetchNotifications();
                    }
                }
            });
        }
        
        document.addEventListener('click', (e) => {
            const dropdown = document.querySelector('.notification-dropdown');
            if (notificationMenu && dropdown && !dropdown.contains(e.target)) {
                notificationMenu.classList.remove('show');
            }
        });
        
        if (markAllReadBtn) {
            const newMarkBtn = markAllReadBtn.cloneNode(true);
            markAllReadBtn.parentNode.replaceChild(newMarkBtn, markAllReadBtn);
            newMarkBtn.addEventListener('click', () => this.markAllAsRead());
        }

        // ✅ VIEW ALL NOTIFICATIONS BUTTON
        const viewAllBtn = document.getElementById('viewAllNotificationsBtn');
        if (viewAllBtn) {
            const newViewAllBtn = viewAllBtn.cloneNode(true);
            viewAllBtn.parentNode.replaceChild(newViewAllBtn, viewAllBtn);

            newViewAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (notificationMenu) notificationMenu.classList.remove('show');
                this.openAllNotificationsModal();
            });
        }

        // ✅ ALL NOTIFICATIONS MODAL - CLOSE HANDLERS
        const allModal = document.getElementById('allNotificationsModal');
        const closeAllModalBtn = document.getElementById('closeAllNotificationsModal');
        const closeAllBtn = document.getElementById('closeAllNotificationsBtn');
        const markAllReadFromModalBtn = document.getElementById('markAllReadFromModalBtn');

        if (closeAllModalBtn) {
            closeAllModalBtn.addEventListener('click', () => this.closeAllNotificationsModal());
        }
        if (closeAllBtn) {
            closeAllBtn.addEventListener('click', () => this.closeAllNotificationsModal());
        }
        if (allModal) {
            allModal.addEventListener('click', (e) => {
                if (e.target === allModal) this.closeAllNotificationsModal();
            });
        }
        if (markAllReadFromModalBtn) {
            markAllReadFromModalBtn.addEventListener('click', async () => {
                await this.markAllAsRead();
                this.renderAllNotificationsModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('allNotificationsModal');
                if (modal && modal.classList.contains('show')) {
                    this.closeAllNotificationsModal();
                }
            }
        });
    }

    // ✅ OPEN ALL NOTIFICATIONS MODAL
    async openAllNotificationsModal() {
        await this.fetchNotifications();
        this.renderAllNotificationsModal();

        const modal = document.getElementById('allNotificationsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    closeAllNotificationsModal() {
        const modal = document.getElementById('allNotificationsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    // ✅ RENDER FULL LIST NG NOTIFICATIONS SA MODAL (kaparehong icon/type logic ng renderNotifications)
    renderAllNotificationsModal() {
        const container = document.getElementById('allNotificationsList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No notifications</p>
                </div>
            `;
            return;
        }

        const html = this.notifications.map(notif => {
            const isUnread = !notif.read;
            let type = 'info';
            let icon = 'fa-info-circle';

            if (notif.type === 'request_approved') {
                type = 'approved';
                icon = 'fa-check-circle';
            } else if (notif.type === 'request_rejected') {
                type = 'rejected';
                icon = 'fa-times-circle';
            } else if (notif.type === 'new_application') {
                type = 'new_application';
                icon = 'fa-file-alt';
            }

            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" data-related-id="${notif.relatedId || notif.request_id}" data-type="${notif.type || ''}">
                    <div class="notification-icon ${type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(notif.title || 'Notification')}</div>
                        <div class="notification-message">${this.escapeHtml(notif.message)}</div>
                        <div class="notification-time">${this.getTimeAgo(notif.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;

        container.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', async () => {
                const id = item.dataset.id;
                const relatedId = item.dataset.relatedId;
                const type = item.dataset.type;

                await this.markAsRead(id);
                this.renderAllNotificationsModal();

                if (!relatedId) return;

                const goToApplicationDetails = [
                    'new_application',
                    'request_approved',
                    'request_rejected'
                ];

                const goToCustomersList = [
                    'slot_assigned',
                    'installation_update',
                    'plan_change_request',
                    'plan_change_processed',
                    'termination_request',
                    'termination_processed'
                ];

                if (goToApplicationDetails.includes(type)) {
                    window.location.href = `/admin/view-application/${relatedId}`;
                } else if (goToCustomersList.includes(type)) {
                    window.location.href = `/admin/view-customers?highlight=${relatedId}`;
                } else {
                    window.location.href = `/admin/view-application/${relatedId}`;
                }
            });
        });
    }

    getAdminIdentifier() {
        // Try multiple possible storage keys
        return localStorage.getItem('adminId') || 
               sessionStorage.getItem('adminId') || 
               localStorage.getItem('adminUsername') || 
               sessionStorage.getItem('adminUsername') ||
               localStorage.getItem('admin_id') ||
               sessionStorage.getItem('admin_id');
    }

    async fetchNotifications() {
        if (!this.isInitialized) return;
        
        const adminId = this.getAdminIdentifier();
        const adminArea = localStorage.getItem('adminArea') || sessionStorage.getItem('adminArea') || localStorage.getItem('area');
        const adminCity = localStorage.getItem('adminCity') || sessionStorage.getItem('adminCity') || localStorage.getItem('city');
        
        if (!adminId) {
            console.log("No admin identifier found");
            return;
        }
        
        console.log("Fetching notifications for admin:", adminId);
        
        try {
            let url = `/api/admin/notifications?admin_id=${encodeURIComponent(adminId)}`;
            if (adminArea) url += `&area=${encodeURIComponent(adminArea)}`;
            if (adminCity) url += `&city=${encodeURIComponent(adminCity)}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to fetch notifications");
            
            const notifications = await response.json();
            console.log("Notifications received:", notifications.length);
            
            this.notifications = notifications;
            this.updateBadge();
            this.renderNotifications();
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    }

    updateBadge() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        const badge = document.getElementById('notificationBadge');
        
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    renderNotifications() {
        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;
        
        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <i class="fas fa-bell-slash"></i>
                    <p>No new notifications</p>
                </div>
            `;
            return;
        }
        
        const html = this.notifications.map(notif => {
            const isUnread = !notif.read;
            let type = 'info';
            let icon = 'fa-info-circle';
            
            if (notif.type === 'request_approved') {
                type = 'approved';
                icon = 'fa-check-circle';
            } else if (notif.type === 'request_rejected') {
                type = 'rejected';
                icon = 'fa-times-circle';
            } else if (notif.type === 'new_application') {
                type = 'new_application';
                icon = 'fa-file-alt';
            }
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" data-related-id="${notif.relatedId || notif.request_id}" data-type="${notif.type || ''}">
                    <div class="notification-icon ${type}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="notification-content">
                        <div class="notification-title">${this.escapeHtml(notif.title || 'Notification')}</div>
                        <div class="notification-message">${this.escapeHtml(notif.message)}</div>
                        <div class="notification-time">${this.getTimeAgo(notif.timestamp)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        notificationList.innerHTML = html;
        
        document.querySelectorAll('.notification-item').forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', async () => {
                const id = newItem.dataset.id;
                const relatedId = newItem.dataset.relatedId;
                const type = newItem.dataset.type;
                
                await this.markAsRead(id);
                
                if (!relatedId) return;
                
                const goToApplicationDetails = [
                    'new_application',
                    'request_approved',
                    'request_rejected'
                ];
                
                const goToCustomersList = [
                    'slot_assigned',
                    'installation_update',
                    'plan_change_request',
                    'plan_change_processed',
                    'termination_request',
                    'termination_processed'
                ];
                
                if (goToApplicationDetails.includes(type)) {
                    window.location.href = `/admin/view-application/${relatedId}`;
                } else if (goToCustomersList.includes(type)) {
                    window.location.href = `/admin/view-customers?highlight=${relatedId}`;
                } else {
                    window.location.href = `/admin/view-application/${relatedId}`;
                }
            });
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(timestamp) {
        if (!timestamp) return 'Unknown';
        try {
            const diff = new Date() - new Date(timestamp);
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Just now';
            if (mins < 60) return `${mins} min ago`;
            const hours = Math.floor(mins / 60);
            if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            const days = Math.floor(hours / 24);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } catch(e) {
            return 'Unknown';
        }
    }

    async markAsRead(notificationId) {
        const adminId = this.getAdminIdentifier();
        if (!adminId) return;
        
        try {
            const response = await fetch(`/api/admin/notifications/${notificationId}/read?admin_id=${encodeURIComponent(adminId)}`, { 
                method: "PATCH" 
            });
            if (response.ok) {
                const notif = this.notifications.find(n => n.id == notificationId);
                if (notif) notif.read = true;
                this.updateBadge();
                this.renderNotifications();
            }
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    }

    async markAllAsRead() {
        const adminId = this.getAdminIdentifier();
        const adminCity = localStorage.getItem('adminCity') || sessionStorage.getItem('adminCity');
        const adminArea = localStorage.getItem('adminArea') || sessionStorage.getItem('adminArea');
        
        if (!adminId) return;
        
        try {
            let url = `/api/admin/notifications/read-all?admin_id=${encodeURIComponent(adminId)}`;
            if (adminCity) url += `&city=${encodeURIComponent(adminCity)}`;
            if (adminArea) url += `&area=${encodeURIComponent(adminArea)}`;
            
            const response = await fetch(url, { method: "PUT" });
            if (response.ok) {
                const data = await response.json();
                this.notifications.forEach(n => n.read = true);
                this.updateBadge();
                this.renderNotifications();
                this.showToast(data.message || "All notifications marked as read", "success");
            }
        } catch (err) {
            console.error("Error marking all as read:", err);
        }
    }

    startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.fetchNotifications(), this.pollingDuration);
    }

    showToast(message, type = 'success') {
        let toast = document.getElementById("adminToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "adminToast";
            toast.className = "admin-toast";
            document.body.appendChild(toast);
            
            const style = document.createElement("style");
            style.textContent = `
                .admin-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #166534;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 10001;
                    animation: slideIn 0.3s ease;
                    display: none;
                }
                .admin-toast.error { background: #991b1b; }
                .admin-toast.warning { background: #e69600; }
                @keyframes slideIn {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        toast.textContent = message;
        toast.className = `admin-toast ${type}`;
        toast.style.display = "block";
        setTimeout(() => toast.style.display = "none", 3000);
    }
}

// Create global instance
window.AdminNotificationSystem = new AdminNotificationSystem();

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    if (window.AdminNotificationSystem) {
        window.AdminNotificationSystem.init();
    }
});