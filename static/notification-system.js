// ==================== NOTIFICATION SYSTEM (Reusable Module) ====================

let notifications = [];
let notificationInterval = null;
let notificationCallbacks = [];

// Configuration
const NOTIFICATION_API_BASE = '/api/superadmin/notifications';
const POLLING_INTERVAL = 10000; // 10 seconds

// ==================== API CALLS ====================

// Fetch notifications from API
async function fetchNotifications() {
    try {
        const response = await fetch(NOTIFICATION_API_BASE);
        if (response.ok) {
            const data = await response.json();
            
            // Handle both response formats
            let rawNotifications = [];
            if (data.notifications) {
                rawNotifications = data.notifications;
            } else if (Array.isArray(data)) {
                rawNotifications = data;
            } else {
                rawNotifications = [];
            }
            
            // Ensure each notification has 'read' property (convert read_status to boolean)
            notifications = rawNotifications.map(n => ({
                ...n,
                read: n.read === true || n.read === 1 || n.read_status === 1,
                id: parseInt(n.id)  // Ensure id is number
            }));
            
            console.log('Processed notifications:', notifications);  // Debug
            
            updateNotificationBadge();
            renderNotificationList();
            triggerCallbacks('notifications-updated', notifications);
            return notifications;
        }
    } catch (err) {
        console.error('Error fetching notifications:', err);
    }
    return [];
}

// Update notification badge count
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    
    // Try to get unread count from API first
    try {
        const response = await fetch(`${NOTIFICATION_API_BASE}/unread/count`);
        if (response.ok) {
            const data = await response.json();
            const unreadCount = data.unread_count || 0;
            if (badge) {
                if (unreadCount > 0) {
                    badge.style.display = 'flex';
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                } else {
                    badge.style.display = 'none';
                }
            }
            return;
        }
    } catch (err) {
        console.error('Error getting unread count:', err);
    }
    
    // Fallback: compute from notifications array
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
        if (unreadCount > 0) {
            badge.style.display = 'flex';
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }
}

// Mark notification as read via API
async function markAsRead(notificationId) {
    try {
        const response = await fetch(`${NOTIFICATION_API_BASE}/${notificationId}/read`, {
            method: 'PUT'
        });
        if (response.ok) {
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                notification.read = true;
                updateNotificationBadge();
                renderNotificationList();
                triggerCallbacks('notification-read', notification);
            }
            return true;
        }
    } catch (err) {
        console.error('Error marking notification as read:', err);
    }
    return false;
}

// Mark all as read via API
async function markAllAsRead() {
    try {
        const response = await fetch(`${NOTIFICATION_API_BASE}/read-all`, {
            method: 'PUT'
        });
        if (response.ok) {
            notifications.forEach(n => n.read = true);
            updateNotificationBadge();
            renderNotificationList();
            triggerCallbacks('all-notifications-read', null);
            return true;
        }
    } catch (err) {
        console.error('Error marking all as read:', err);
    }
    return false;
}

// Delete a notification
async function deleteNotification(notificationId) {
    try {
        const response = await fetch(`${NOTIFICATION_API_BASE}/${notificationId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            notifications = notifications.filter(n => n.id !== notificationId);
            updateNotificationBadge();
            renderNotificationList();
            triggerCallbacks('notification-deleted', notificationId);
            return true;
        }
    } catch (err) {
        console.error('Error deleting notification:', err);
    }
    return false;
}

// Send a new notification (from admin side)
async function sendNotification(title, message, type, relatedId = null, redirectUrl = null) {
    try {
        const response = await fetch(NOTIFICATION_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                message: message,
                type: type,
                relatedId: relatedId,
                redirectUrl: redirectUrl, // Add redirect URL for click action
                timestamp: new Date().toISOString(),
                read: false
            })
        });
        
        if (response.ok) {
            console.log('Notification sent successfully');
            return true;
        }
    } catch (err) {
        console.error('Error sending notification:', err);
    }
    return false;
}

// ==================== REDIRECT HANDLER ====================

// Get redirect URL based on notification type and data
function getRedirectUrl(notification) {
    const type = notification.type;
    const relatedId = notification.relatedId;
    const redirectUrl = notification.redirectUrl;
    
    // If custom redirect URL is provided, use it
    if (redirectUrl) {
        return redirectUrl;
    }
    
    // Determine redirect URL based on notification type
    switch (type) {
        case 'new_application':
            return `/superadmin/view-application/${relatedId}`;
        case 'admin_request':
            return `/superadmin/internet-applications?highlight=${relatedId}`;
        case 'approved':
            return `/superadmin/view-customer-application/${relatedId}`;
        case 'rejected':
            return `/superadmin/view-application/${relatedId}`;
        case 'installation_updated':
            return `/superadmin/view-customer-application/${relatedId}`;
        case 'contract_generated':
            return `/superadmin/view-customer-application/${relatedId}`;
        default:
            return '/superadmin/internet-applications';
    }
}

// Handle notification click - mark as read and redirect
async function handleNotificationClick(notificationId) {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;
    
    // Mark as read first
    await markAsRead(notificationId);
    
    // Get redirect URL
    const redirectUrl = getRedirectUrl(notification);
    
    // Trigger callback before redirect
    triggerCallbacks('notification-click', { notification, redirectUrl });
    
    // Redirect after a short delay to ensure mark as read completes
    setTimeout(() => {
        window.location.href = redirectUrl;
    }, 150);
}

// ==================== UI FUNCTIONS ====================

// Update notification badge count
// Update notification badge count
async function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    
    try {
        // Use separate endpoint for unread count
        const response = await fetch('/api/superadmin/notifications/unread/count');
        if (response.ok) {
            const data = await response.json();
            const unreadCount = data.unread_count || 0;
            if (badge) {
                if (unreadCount > 0) {
                    badge.style.display = 'flex';
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (err) {
        console.error('Error updating badge:', err);
        // Fallback: compute from notifications array
        const unreadCount = notifications.filter(n => !n.read).length;
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'flex';
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            } else {
                badge.style.display = 'none';
            }
        }
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper function to get time ago
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return new Date(timestamp).toLocaleDateString();
}

// Get notification icon based on type
function getNotificationIcon(type) {
    switch (type) {
        case 'new_application':
            return '<i class="fas fa-file-alt"></i>';
        case 'admin_request':
            return '<i class="fas fa-user-check"></i>';
        case 'approved':
            return '<i class="fas fa-check-circle"></i>';
        case 'rejected':
            return '<i class="fas fa-times-circle"></i>';
        case 'installation_updated':
            return '<i class="fas fa-tools"></i>';
        case 'contract_generated':
            return '<i class="fas fa-file-contract"></i>';
        case 'payment_received':
            return '<i class="fas fa-money-bill-wave"></i>';
        default:
            return '<i class="fas fa-bell"></i>';
    }
}

// Get notification icon class
function getNotificationIconClass(type) {
    switch (type) {
        case 'new_application':
            return 'new_application';
        case 'admin_request':
            return 'admin_request';
        case 'approved':
            return 'approved';
        case 'rejected':
            return 'rejected';
        case 'installation_updated':
            return 'installation_updated';
        case 'contract_generated':
            return 'contract_generated';
        default:
            return 'default';
    }
}

// Render notification list
function renderNotificationList() {
    const container = document.getElementById('notificationList');
    if (!container) return;
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="notification-empty">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notifications.map(notification => {
        const iconHtml = getNotificationIcon(notification.type);
        const iconClass = getNotificationIconClass(notification.type);
        const timeAgo = getTimeAgo(notification.timestamp);
        const unreadClass = notification.read ? '' : 'unread';
        
        return `
            <div class="notification-item ${unreadClass}" data-id="${notification.id}" data-redirect-url="${escapeHtml(getRedirectUrl(notification))}">
                <div class="notification-icon ${iconClass}">
                    ${iconHtml}
                </div>
                <div class="notification-content">
                    <div class="notification-title">${escapeHtml(notification.title)}</div>
                    <div class="notification-message">${escapeHtml(notification.message)}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers for notification items (redirect on click)
    document.querySelectorAll('.notification-item').forEach(item => {
        // Remove existing listeners by cloning approach (handled by event delegation or direct assignment)
        const notificationId = parseInt(item.dataset.id);
        
        // Use event delegation pattern to avoid duplicate listeners
        item.removeEventListener('click', item._clickHandler);
        
        const clickHandler = (e) => {
            // Don't trigger if clicking on delete button
            if (e.target.closest('.notification-delete')) return;
            e.stopPropagation();
            handleNotificationClick(notificationId);
        };
        
        item._clickHandler = clickHandler;
        item.addEventListener('click', clickHandler);
    });
    
    // Add delete handlers
    document.querySelectorAll('.notification-delete').forEach(btn => {
        // Remove existing listeners
        btn.removeEventListener('click', btn._deleteHandler);
        
        const deleteHandler = (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            deleteNotification(id);
        };
        
        btn._deleteHandler = deleteHandler;
        btn.addEventListener('click', deleteHandler);
    });
}

// ==================== INITIALIZATION ====================

// Initialize notification system
function initNotifications() {
    fetchNotifications();
    
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationMenu = document.getElementById('notificationMenu');
    
    if (notificationBtn && notificationMenu) {
        // Remove existing listeners to avoid duplicates
        const newNotificationBtn = notificationBtn.cloneNode(true);
        notificationBtn.parentNode.replaceChild(newNotificationBtn, notificationBtn);
        
        newNotificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationMenu.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!newNotificationBtn.contains(e.target) && !notificationMenu.contains(e.target)) {
                notificationMenu.classList.remove('show');
            }
        });
    }
    
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
        const newMarkAllReadBtn = markAllReadBtn.cloneNode(true);
        markAllReadBtn.parentNode.replaceChild(newMarkAllReadBtn, markAllReadBtn);
        newMarkAllReadBtn.addEventListener('click', () => {
            markAllAsRead();
        });
    }
    
    // Start polling if not already running
    if (notificationInterval) clearInterval(notificationInterval);
    notificationInterval = setInterval(() => {
        // Only fetch if the notification menu is not open or page is visible
        if (!document.hidden) {
            fetchNotifications();
        }
    }, POLLING_INTERVAL);
}

// Stop notification polling
function stopNotifications() {
    if (notificationInterval) {
        clearInterval(notificationInterval);
        notificationInterval = null;
    }
}

// ==================== CALLBACK SYSTEM ====================

// Register a callback for notification events
function onNotificationEvent(event, callback) {
    if (!notificationCallbacks[event]) {
        notificationCallbacks[event] = [];
    }
    notificationCallbacks[event].push(callback);
}

// Trigger callbacks for an event
function triggerCallbacks(event, data) {
    if (notificationCallbacks[event]) {
        notificationCallbacks[event].forEach(callback => callback(data));
    }
}

// ==================== HELPER FUNCTIONS FOR SENDING NOTIFICATIONS ====================

// Send notification for new application
async function sendNewApplicationNotification(applicationId, applicantName) {
    return await sendNotification(
        'New Application Submitted',
        `${applicantName} has submitted a new internet application.`,
        'new_application',
        applicationId,
        `/superadmin/view-application/${applicationId}`
    );
}

// Send notification for admin approval request
async function sendAdminRequestNotification(applicationId, adminName, requestedStatus) {
    const statusText = requestedStatus === 'Approved' ? 'approve' : 'reject';
    return await sendNotification(
        'Admin Request',
        `Admin ${adminName} has requested to ${statusText} application #${applicationId}.`,
        'admin_request',
        applicationId,
        `/superadmin/internet-applications?highlight=${applicationId}`
    );
}

// Send notification for application approved
async function sendApplicationApprovedNotification(applicationId, applicantName, contractNumber) {
    return await sendNotification(
        'Application Approved',
        `${applicantName}'s application has been approved. Contract #: ${contractNumber}`,
        'approved',
        applicationId,
        `/superadmin/view-customer-application/${applicationId}`
    );
}

// Send notification for application rejected
async function sendApplicationRejectedNotification(applicationId, applicantName, reason) {
    return await sendNotification(
        'Application Rejected',
        `${applicantName}'s application was rejected. Reason: ${reason}`,
        'rejected',
        applicationId,
        `/superadmin/view-application/${applicationId}`
    );
}

// ==================== EXPORTS ====================
// Make functions available globally
window.NotificationSystem = {
    init: initNotifications,
    stop: stopNotifications,
    fetch: fetchNotifications,
    markAsRead: markAsRead,
    markAllAsRead: markAllAsRead,
    delete: deleteNotification,
    send: sendNotification,
    sendNewApplication: sendNewApplicationNotification,
    sendAdminRequest: sendAdminRequestNotification,
    sendApproved: sendApplicationApprovedNotification,
    sendRejected: sendApplicationRejectedNotification,
    getNotifications: () => notifications,
    on: onNotificationEvent,
    getUnreadCount: () => notifications.filter(n => !n.read).length
};