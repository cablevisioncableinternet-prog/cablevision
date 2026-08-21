// ================= DEVICE LOGIN MONITOR - GLOBAL ALERT SYSTEM =================
// This script monitors for new device logins and shows an alert modal when detected
// Include this in all templates via the base layout

(function() {
    // Configuration
    const CHECK_INTERVAL = 30000; // Check every 30 seconds
    const sessionStartedAt = Number(sessionStorage.getItem('sessionStart')) || Date.now();
    let lastCheckTime = Math.floor(sessionStartedAt / 1000); // Only alert for logins after this session started
    let monitorActive = true;
    let currentTabId = sessionStorage.getItem('tab_id') || '';
    let alreadyNotified = new Set(); // Track which devices we've already shown
    let dismissedDeviceIds = new Set();
    let currentAlertDeviceId = null;

    try {
        const savedDismissed = JSON.parse(sessionStorage.getItem('dismissedDeviceAlerts') || '[]');
        if (Array.isArray(savedDismissed)) {
            savedDismissed.forEach(id => dismissedDeviceIds.add(String(id)));
        }
    } catch (error) {
        console.warn('Unable to load dismissed device alerts:', error);
    }

    function persistDismissedDeviceAlerts() {
        sessionStorage.setItem('dismissedDeviceAlerts', JSON.stringify([...dismissedDeviceIds]));
    }

    // ================= CREATE MODAL HTML =================
    function createDeviceAlertModal() {
        if (document.getElementById('deviceLoginAlertModal')) return; // Already exists

        const modalHTML = `
            <div id="deviceLoginAlertModal" class="device-alert-modal">
                <div class="device-alert-overlay"></div>
                <div class="device-alert-container" role="dialog" aria-modal="true" aria-labelledby="deviceAlertTitle">
                    <div class="device-alert-header">
                        <div class="device-alert-header-top">
                            <div class="device-alert-title-wrap">
                                <span class="device-alert-badge">Security Notice</span>
                                <h2 id="deviceAlertTitle">New Device Login Detected</h2>
                            </div>
                        </div>
                    </div>

                    <div class="device-alert-content">
                        <div class="device-alert-summary">
                            <p class="alert-message">A new device has logged into your account. Please review the activity below and take action if this was not you.</p>
                        </div>

                        <div class="device-alert-details">
                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-laptop"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>Device</label>
                                    <span class="device-name" id="alertDeviceBrand">Unknown Device</span>
                                </div>
                            </div>

                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-globe"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>Browser</label>
                                    <span id="alertDeviceBrowser">Unknown</span>
                                </div>
                            </div>

                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-microchip"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>Operating System</label>
                                    <span id="alertDeviceOS">Unknown</span>
                                </div>
                            </div>

                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-network-wired"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>IP Address</label>
                                    <span id="alertDeviceIP">0.0.0.0</span>
                                </div>
                            </div>

                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-map-marker-alt"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>Location</label>
                                    <span id="alertDeviceLocation">Unknown Location</span>
                                </div>
                            </div>

                            <div class="alert-detail-row">
                                <div class="alert-detail-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="alert-detail-info">
                                    <label>Login Time</label>
                                    <span id="alertDeviceTime">Just now</span>
                                </div>
                            </div>
                        </div>

                        <div class="device-alert-actions">
                            <button id="viewDeviceBtn" class="btn-alert btn-view">
                                <i class="fas fa-eye"></i> View in Login History
                            </button>
                            <button id="logoutDeviceBtn" class="btn-alert btn-logout">
                                <i class="fas fa-sign-out-alt"></i> Logout This Device
                            </button>
                            <button id="dismissAlertBtn" class="btn-alert btn-dismiss">
                                <i class="fas fa-times"></i> Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        attachModalEvents();
    }

    // ================= ATTACH MODAL EVENTS =================
    function attachModalEvents() {
        const modal = document.getElementById('deviceLoginAlertModal');
        const dismissBtn = document.getElementById('dismissAlertBtn');
        const viewBtn = document.getElementById('viewDeviceBtn');
        const logoutBtn = document.getElementById('logoutDeviceBtn');

        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => {
                if (currentAlertDeviceId) {
                    dismissedDeviceIds.add(String(currentAlertDeviceId));
                    alreadyNotified.add(String(currentAlertDeviceId));
                    persistDismissedDeviceAlerts();
                }
                closeDeviceAlertModal();
            });
        }

        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                closeDeviceAlertModal();

                const currentPage = (window.location.pathname || '').toLowerCase();
                let loginHistoryPage = '/admin/login-history';

                if (currentPage.startsWith('/superadmin')) {
                    loginHistoryPage = '/superadmin/login-history';
                } else if (currentPage.startsWith('/technician')) {
                    loginHistoryPage = '/technician/login-history';
                } else if (currentPage.startsWith('/admin')) {
                    loginHistoryPage = '/admin/login-history';
                }

                window.location.href = loginHistoryPage + '?tab_id=' + encodeURIComponent(currentTabId || '');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                const deviceId = logoutBtn.dataset.deviceId;
                if (deviceId) {
                    logoutNewDevice(deviceId);
                } else {
                    showNotification('Selected device could not be identified.', 'error');
                }
            });
        }

        // Close on overlay click
        const overlay = modal?.querySelector('.device-alert-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeDeviceAlertModal());
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('show')) {
                closeDeviceAlertModal();
            }
        });
    }

    // ================= SHOW DEVICE ALERT MODAL =================
    function showDeviceAlertModal(device) {
        createDeviceAlertModal(); // Ensure modal exists
        const modal = document.getElementById('deviceLoginAlertModal');
        const deviceId = device && device.id ? String(device.id) : null;
        currentAlertDeviceId = deviceId;

        if (deviceId && dismissedDeviceIds.has(deviceId)) {
            console.log('ℹ️ Device alert was dismissed already; skipping:', deviceId);
            return;
        }
        
        console.log('🎯 Showing alert modal for device:', device);
        
        // Populate device info
        const deviceBrand = device.device_brand || device.device_info || 'Unknown Device';
        document.getElementById('alertDeviceBrand').textContent = deviceBrand;
        document.getElementById('alertDeviceBrowser').textContent = device.browser || 'Unknown Browser';
        document.getElementById('alertDeviceOS').textContent = device.os || 'Unknown OS';
        document.getElementById('alertDeviceIP').textContent = device.ip_address || 'Unknown';
        document.getElementById('alertDeviceLocation').textContent = device.location || 'Unknown Location';
        document.getElementById('alertDeviceTime').textContent = device.formatted_login_time || 'Just now';

        // Store device ID for logout
        const logoutBtn = document.getElementById('logoutDeviceBtn');
        if (logoutBtn && device.id) {
            logoutBtn.dataset.deviceId = device.id;
            console.log('✅ Set logout device ID:', device.id);
        }

        // Show modal with animation
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        console.log('✅ Modal displayed');
    }

    // ================= CLOSE DEVICE ALERT MODAL =================
    function closeDeviceAlertModal() {
        const modal = document.getElementById('deviceLoginAlertModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
        currentAlertDeviceId = null;
    }

    // ================= LOGOUT NEW DEVICE =================
    async function logoutNewDevice(deviceId) {
        try {
            const logoutBtn = document.getElementById('logoutDeviceBtn');
            if (!logoutBtn) return;

            const originalText = logoutBtn.innerHTML;
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';

            const response = await fetch('/api/admin/login-history/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device_ids: [String(deviceId)],
                    tab_id: currentTabId
                })
            });

            const data = await response.json();

            if (data.success) {
                showNotification('This device has been revoked and logged out.', 'success');
                closeDeviceAlertModal();
                lastCheckTime = null;
            } else {
                showNotification(data.error || 'Failed to logout device', 'error');
                logoutBtn.disabled = false;
                logoutBtn.innerHTML = originalText;
            }
        } catch (error) {
            console.error('Error logging out device:', error);
            showNotification('Error logging out device', 'error');
            const logoutBtn = document.getElementById('logoutDeviceBtn');
            if (logoutBtn) logoutBtn.disabled = false;
        }
    }

    // ================= SHOW NOTIFICATION =================
    function showNotification(message, type = 'info') {
        // Use existing showToast if available, otherwise create simple alert
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // ================= CHECK FOR NEW DEVICES =================
    async function checkForNewDevices() {
        if (!monitorActive) return;

        try {
            const tabId = sessionStorage.getItem('tab_id') || '';
            if (!tabId) {
                console.log('⚠️ No tab_id found, skipping device check');
                return;
            }

            // Build query string
            let queryString = `/api/check-new-devices?tab_id=${encodeURIComponent(tabId)}`;
            queryString += `&last_check=${lastCheckTime}`;

            console.log(`📱 Checking for new devices... (query: ${queryString})`);
            const response = await fetch(queryString);
            
            if (!response.ok) {
                console.error(`❌ API returned ${response.status}`);
                return;
            }

            const data = await response.json();
            console.log('📱 Check result:', data);

            if (data.success && data.new_devices && data.new_devices.length > 0) {
                const newDevice = data.new_devices[0]; // Get the most recent one
                const deviceKey = newDevice && newDevice.id ? String(newDevice.id) : null;

                if (deviceKey && dismissedDeviceIds.has(deviceKey)) {
                    console.log('ℹ️ Device was dismissed by user; skipping repeated alert:', deviceKey);
                    return;
                }

                const deviceLoginUnix = newDevice.login_time ? new Date(newDevice.login_time).getTime() / 1000 : null;
                if (deviceLoginUnix && deviceLoginUnix <= lastCheckTime) {
                    console.log('ℹ️ Ignoring historical device login older than current session window:', newDevice);
                } else if (deviceKey && !alreadyNotified.has(deviceKey)) {
                    console.log('🚨 NEW DEVICE DETECTED:', newDevice);
                    alreadyNotified.add(deviceKey);
                    showDeviceAlertModal(newDevice);
                } else if (deviceKey) {
                    console.log('ℹ️ Device already notified:', deviceKey);
                }
            } else {
                console.log('✅ No new devices found');
            }

            // Update last check time for next check
            if (data.current_timestamp) {
                lastCheckTime = Math.floor(data.current_timestamp);
                console.log(`📅 Updated lastCheckTime to: ${lastCheckTime}`);
            }
        } catch (error) {
            console.error('❌ Error checking for new devices:', error);
        }
    }

    // ================= START MONITORING =================
    function startMonitoring() {
        console.log('📱 Device monitor started - checking every 30 seconds');
        console.log(`   Current tab_id: ${currentTabId}`);
        console.log(`   Initial lastCheckTime: ${lastCheckTime}`);
        
        // Initial check after 2 seconds (faster for better UX)
        console.log('⏳ Initial device check scheduled in 2 seconds...');
        setTimeout(() => {
            console.log('🔍 Running initial device check...');
            checkForNewDevices();
        }, 2000);

        // Periodic check
        setInterval(() => {
            checkForNewDevices();
        }, CHECK_INTERVAL);

        // Stop monitoring if user logs out
        document.addEventListener('logout', () => {
            monitorActive = false;
            console.log('📱 Device monitor stopped');
        });
    }

    // ================= INITIALIZE =================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

})();
