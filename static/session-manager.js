// session-manager.js - Reusable session management for all pages

class SessionManager {
    constructor() {
        this.protectedPages = ['/superadmin', '/admin', '/dashboard'];
        this.loginPage = '/';
        this.storageKeys = {
            userType: 'userType',
            adminUsername: 'adminUsername',
            adminArea: 'adminArea',
            sessionToken: 'sessionToken',
            lastActivity: 'lastActivity',
            tabId: 'tab_id'
        };
    }

    /**
     * Initialize session management
     * Call this on every protected page
     */
    init() {
        this.preventPageCaching();
        this.checkAuth();
        this.preventBackAfterLogout();
        this.setupActivityTracking();
        this.setupBeforeUnload();
    }

    /**
     * Prevent browser from caching protected pages
     */
    preventPageCaching() {
        // Set meta tags to prevent caching
        const metaNoCache = document.createElement('meta');
        metaNoCache.httpEquiv = 'Cache-Control';
        metaNoCache.content = 'no-cache, no-store, must-revalidate';
        document.head.appendChild(metaNoCache);
        
        const metaPragma = document.createElement('meta');
        metaPragma.httpEquiv = 'Pragma';
        metaPragma.content = 'no-cache';
        document.head.appendChild(metaPragma);
        
        const metaExpires = document.createElement('meta');
        metaExpires.httpEquiv = 'Expires';
        metaExpires.content = '0';
        document.head.appendChild(metaExpires);
        
        // Disable back-forward cache (bfcache) for modern browsers
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                // Page was loaded from bfcache, check auth
                this.checkAuth();
            }
        });
    }

    /**
     * Check if user is authenticated
     */
    checkAuth() {
        const currentPath = window.location.pathname;
        const isProtectedPage = this.protectedPages.some(page => currentPath.startsWith(page));
        
        // Check if user has valid session
        const userType = localStorage.getItem(this.storageKeys.userType);
        const sessionToken = sessionStorage.getItem(this.storageKeys.sessionToken);
        const lastActivity = localStorage.getItem(this.storageKeys.lastActivity);
        
        // Session timeout check (30 minutes)
        if (lastActivity) {
            const now = Date.now();
            const timeSinceLastActivity = now - parseInt(lastActivity);
            const sessionTimeout = 30 * 60 * 1000; // 30 minutes
            
            if (timeSinceLastActivity > sessionTimeout) {
                this.logout('Session expired. Please login again.');
                return false;
            }
        }

        // If on protected page but no valid session - FORCE REDIRECT
        if (isProtectedPage && (!userType || !sessionToken)) {
            this.forceRedirectToLogin();
            return false;
        }

        // If on login page but already logged in
        if ((currentPath === this.loginPage || currentPath === '/login.html') && userType && sessionToken) {
            this.redirectToDashboard(userType);
            return false;
        }

        return true;
    }

    /**
     * Force redirect to login (use replace to clear history)
     */
    forceRedirectToLogin() {
        // Clear all storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Use replace to remove the current page from history
        window.location.replace(this.loginPage);
    }

    /**
     * Prevent back button navigation after logout
     * Uses multiple techniques for maximum protection
     */
    preventBackAfterLogout() {
        // Push initial state
        history.pushState(null, null, window.location.href);
        
        // Intercept popstate events (back/forward buttons)
        window.addEventListener('popstate', (event) => {
            const userType = localStorage.getItem(this.storageKeys.userType);
            const sessionToken = sessionStorage.getItem(this.storageKeys.sessionToken);
            const currentPath = window.location.pathname;
            const isProtectedPage = this.protectedPages.some(page => currentPath.startsWith(page));
            
            // If on protected page but no session, force redirect immediately
            if (isProtectedPage && (!userType || !sessionToken)) {
                this.forceRedirectToLogin();
                return;
            }
            
            // If authenticated, push another state to prevent going back
            if (userType && sessionToken) {
                history.pushState(null, null, window.location.href);
            }
        });
        
        // Additional check on page visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible again, check auth
                this.checkAuth();
            }
        });
    }

    /**
     * Check if current page is protected
     */
    isProtectedPage() {
        const currentPath = window.location.pathname;
        return this.protectedPages.some(page => currentPath.startsWith(page));
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const userType = localStorage.getItem(this.storageKeys.userType);
        const sessionToken = sessionStorage.getItem(this.storageKeys.sessionToken);
        return !!(userType && sessionToken);
    }

    /**
     * Setup activity tracking for session timeout
     */
    setupActivityTracking() {
        if (!this.isProtectedPage()) return;
        
        const updateActivity = () => {
            if (this.isAuthenticated()) {
                localStorage.setItem(this.storageKeys.lastActivity, Date.now().toString());
            }
        };
        
        // Track user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            window.addEventListener(event, updateActivity);
        });
        
        // Initial activity timestamp
        updateActivity();
    }

    /**
     * Setup before unload to clear sensitive data (optional)
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            // You can add cleanup code here if needed
        });
    }

    /**
     * Perform logout
     */
    logout(message = null) {
        // Clear all session data
        localStorage.removeItem(this.storageKeys.userType);
        localStorage.removeItem(this.storageKeys.adminUsername);
        localStorage.removeItem(this.storageKeys.adminArea);
        localStorage.removeItem(this.storageKeys.lastActivity);
        sessionStorage.removeItem(this.storageKeys.sessionToken);
        
        // Clear any other stored data
        sessionStorage.clear();
        
        // Clear all caches if possible
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
            });
        }
        
        // Force redirect and clear history
        this.forceRedirectToLogin();
        
        // Store message for login page
        if (message) {
            sessionStorage.setItem('logoutMessage', message);
        }
    }

    /**
     * Force redirect to login and clear history
     */
    forceRedirectToLogin() {
        // Use replace to remove the current page from history
        window.location.replace(this.loginPage);
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        window.location.replace(this.loginPage);
    }

    /**
     * Redirect to appropriate dashboard
     */
    redirectToDashboard(userType) {
        const dashboard = userType === 'superadmin' ? '/superadmin' : '/admin';
        window.location.replace(dashboard);
    }

    /**
     * Create session token on login
     * Call this after successful login
     */
    createSession(userType, username, area = null, tabId = null) {
        const sessionToken = this.generateSessionToken();
        
        localStorage.setItem(this.storageKeys.userType, userType);
        localStorage.setItem(this.storageKeys.sessionToken, sessionToken);
        localStorage.setItem(this.storageKeys.lastActivity, Date.now().toString());
        
        if (username) {
            localStorage.setItem(this.storageKeys.adminUsername, username);
        }
        
        if (area) {
            localStorage.setItem(this.storageKeys.adminArea, area);
        }
        
        // 👇 I-STORE ANG TAB ID
        if (tabId) {
            sessionStorage.setItem('tab_id', tabId);
        }
        
        sessionStorage.setItem(this.storageKeys.sessionToken, sessionToken);
        
        return sessionToken;
    }

    /**
     * Generate random session token
     */
    generateSessionToken() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    }

    /**
     * Validate session token
     */
    validateSession() {
        const localToken = localStorage.getItem(this.storageKeys.sessionToken);
        const sessionToken = sessionStorage.getItem(this.storageKeys.sessionToken);
        
        return localToken && sessionToken && localToken === sessionToken;
    }
}

// Create global instance
window.SessionManager = new SessionManager();

// Auto-initialize on protected pages only (NOT on login page)
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const isProtected = ['/superadmin', '/admin'].some(path => currentPath.startsWith(path));
    
    // Only initialize on protected pages
    if (isProtected) {
        window.SessionManager.init();
    }
});

// Additional check when page loads from cache
window.addEventListener('pageshow', (event) => {
    const currentPath = window.location.pathname;
    const isProtected = ['/superadmin', '/admin'].some(path => currentPath.startsWith(path));
    
    if (isProtected && event.persisted) {
        // Page was loaded from bfcache, check session
        const userType = localStorage.getItem('userType');
        const sessionToken = sessionStorage.getItem('sessionToken');
        
        if (!userType || !sessionToken) {
            window.location.replace('/');
        }
    }
});

// ito ulit ang aking session-manager.js