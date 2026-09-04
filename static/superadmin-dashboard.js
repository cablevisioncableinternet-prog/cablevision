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

// ==================== CACHE SYSTEM ====================
function setCache(key, data, ttlMinutes = 5){
    const now = new Date();
    const item = {
        data,
        expiry: now.getTime() + ttlMinutes * 60 * 1000
    };
    localStorage.setItem(key, JSON.stringify(item));
}

function getCache(key){
    const itemStr = localStorage.getItem(key);
    if(!itemStr) return null;

    const item = JSON.parse(itemStr);
    const now = new Date();
    if(now.getTime() > item.expiry){
        localStorage.removeItem(key);
        return null;
    }
    return item.data;
}

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

        // Inject keyframes + spin once
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

    // Build inner HTML
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

    // Reset class, force reflow, then show
    toast.className = `custom-toast ${type}`;
    void toast.offsetWidth;
    toast.classList.add('show');

    // Clear any existing hide timer
    clearTimeout(toast._hideTimer);

    if (type === 'loading') {
        // Loading stays visible until next showToast call — no auto-hide
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");
if(profileBtn && profileMenu){
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });
    window.addEventListener("click", e => { if(!profileBtn.contains(e.target)) profileMenu.classList.remove("show"); });
}

async function loadProfile(){
    try{
        const tabId = getTabId();
        const res = await fetch(`/api/superadmin/profile?tab_id=${tabId}`);
        if(!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if(profileNameSpan) profileNameSpan.textContent = profile.username || "";
    }catch(err){ console.error(err); }
}
loadProfile();

// ==================== LOGOUT MODAL (FIXED) ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
if(logoutBtn && logoutModal){
    const closeBtn = document.getElementById("closeLogoutModal");
    const cancelBtn = document.getElementById("cancelLogout");
    const confirmBtn = document.getElementById("confirmLogout");

    // Open modal
    logoutBtn.addEventListener("click", function(e) { 
        e.preventDefault(); 
        logoutModal.classList.add('show');  // ✅ ITO ANG TAMA
        document.body.style.overflow = 'hidden';
    });
    
    // Close - X button
    if(closeBtn) {
        closeBtn.addEventListener("click", function() { 
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        });
    }
    
    // Close - Cancel button
    if(cancelBtn) {
        cancelBtn.addEventListener("click", function() { 
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        });
    }
    
    // Confirm logout
    if(confirmBtn) {
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
    
    // Close on outside click
    window.addEventListener("click", function(e) { 
        if(e.target === logoutModal) {
            logoutModal.classList.remove('show');  // ✅ ITO ANG TAMA
            document.body.style.overflow = '';
        }
    });
}

// ==================== KEYBOARD SHORTCUT: ESC to close modals ====================
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        // Close logout modal
        const logoutModal = document.getElementById('logoutModal');
        if (logoutModal && logoutModal.classList.contains('show')) {  // ✅ BINAGO
            logoutModal.classList.remove('show');  // ✅ BINAGO
            document.body.style.overflow = '';
        }
        
        // Close profile dropdown
        const profileMenu = document.getElementById('profileMenu');
        if (profileMenu && profileMenu.classList.contains('show')) {
            profileMenu.classList.remove('show');
        }
        
        // Close notification menu
        const notificationMenu = document.getElementById('notificationMenu');
        if (notificationMenu && notificationMenu.classList.contains('show')) {
            notificationMenu.classList.remove('show');
        }
        
        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburgerBtn');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        if (window.innerWidth < 768 && sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ==================== FETCH WITH CACHE + AUTO-UPDATE ====================
async function fetchWithCacheAndUpdate({ cacheKey, url, ttl=5, renderCallback, showLoading=null, forceSpinner=false, initialLoad=false }){
    const cached = getCache(cacheKey);
    let shouldShowSpinner = false;

    if(initialLoad){
        if(!cached || forceSpinner){
            shouldShowSpinner = true;
        }
    }

    if(cached){
        renderCallback(cached);
        if(showLoading) showLoading.style.display = "none";
    }

    if(showLoading && shouldShowSpinner) showLoading.style.display = "block";

    try{
        const res = await fetch(url);
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const oldData = cached ? JSON.stringify(cached) : null;
        const newData = JSON.stringify(data);

        if(newData !== oldData){
            setCache(cacheKey, data, ttl);
            renderCallback(data);
        }
        
        if(showLoading) showLoading.style.display = "none";
        
    }catch(err){
        console.error(`Error fetching ${url}:`, err);
        if(showLoading) showLoading.style.display = "none";
    }
}

// ==================== DATE & TIME ====================
function updateDateTime(){
    const now = new Date();
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const day = days[now.getDay()];

    const dateOptions = { year:'numeric', month:'long', day:'numeric' };
    const date = now.toLocaleDateString('en-US', dateOptions);
    const time = now.toLocaleTimeString();

    const currentDaySpan = document.getElementById("currentDay");
    const currentDateSpan = document.getElementById("currentDate");
    const liveTimeSpan = document.getElementById("liveTime");
    
    if(currentDaySpan) currentDaySpan.textContent = day;
    if(currentDateSpan) currentDateSpan.textContent = date;
    if(liveTimeSpan) liveTimeSpan.textContent = time;
}
setInterval(updateDateTime,1000);
updateDateTime();

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

if(hamburger && sidebar){
    function toggleSidebar(){
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
        if(sidebarOverlay) sidebarOverlay.classList.toggle('active');
        
        if(sidebar.classList.contains('active')){
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
    
    hamburger.addEventListener('click', toggleSidebar);
    
    if(sidebarOverlay){
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }
    
    // Auto-close sidebar when resizing to desktop size
    window.addEventListener('resize', function(){
        if(window.innerWidth >= 768 && sidebar.classList.contains('active')){
            sidebar.classList.remove('active');
            if(hamburger) hamburger.classList.remove('active');
            if(sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ==================== DYNAMIC AREA CARDS ====================
async function loadAndRenderAreaCards() {
    const areaGrid = document.getElementById("areaGrid");
    if (!areaGrid) return;
    
    areaGrid.innerHTML = `
        <div class="loading-areas">
            <div class="spinner"></div>
            <p>Loading areas...</p>
        </div>
    `;
    
    try {
        const res = await fetch("/api/superadmin/areas");
        if (!res.ok) throw new Error("Failed to load areas");
        const areas = await res.json();
        
        if (!areas || areas.length === 0) {
            areaGrid.innerHTML = `
                <div class="loading-areas">
                    <i class="fas fa-info-circle" style="font-size: 40px; color: #cbd5e1;"></i>
                    <p>No areas available. Please add areas in Manage Area section.</p>
                </div>
            `;
            return;
        }
        
        // Extract unique cities from areas
        const uniqueCities = [...new Map(areas.map(area => [area.city, area])).values()];
        uniqueCities.sort((a, b) => a.city.localeCompare(b.city));
        
        const areaStats = await fetchAreaStatistics();
        
        areaGrid.innerHTML = "";
        
        for (const area of uniqueCities) {
            const city = area.city;
            const province = area.province || "Laguna";
            const stats = areaStats[city] || { total: 0 };
            const barangayCount = stats.total || 0;
            
            const areaCard = document.createElement("div");
            areaCard.className = "area-card";
            areaCard.setAttribute("data-area", city);
            
            const iconClass = getAreaIcon(city);
            let badgeText = `${barangayCount} ${barangayCount === 1 ? 'Barangay' : 'Barangays'}`;
            
            areaCard.innerHTML = `
                <div class="card-icon">
                    <i class="${iconClass}"></i>
                </div>
                <div class="card-content">
                    <h3>${escapeHtml(city)}</h3>
                    <p>${escapeHtml(province)} Province</p>
                    <span class="card-badge">${badgeText}</span>
                </div>
            `;
            
            areaCard.addEventListener("click", () => {
                const areaFilter = document.getElementById("areaFilter");
                if (areaFilter) {
                    areaFilter.value = city;
                    const filterBtn = document.getElementById("filterBtn");
                    if (filterBtn) {
                        filterBtn.click();
                    }
                    document.querySelector(".analytics-card:last-child")?.scrollIntoView({ 
                        behavior: "smooth", 
                        block: "start" 
                    });
                    showToast(`Filtering installation data for ${city}`, true);
                }
            });
            
            areaGrid.appendChild(areaCard);
        }
        
        console.log(`Rendered ${uniqueCities.length} area cards with barangay counts`);
        
    } catch (err) {
        console.error("Error loading area cards:", err);
        areaGrid.innerHTML = `
            <div class="loading-areas">
                <i class="fas fa-exclamation-triangle" style="font-size: 40px; color: #ef4444;"></i>
                <p>Failed to load areas. Please refresh the page.</p>
            </div>
        `;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getAreaIcon(city) {
    const icons = {
        "Santa Cruz": "fas fa-church",
        "Sta. Cruz": "fas fa-church",
        "Pagsanjan": "fas fa-water",
        "Magdalena": "fas fa-mountain",
        "Pila": "fas fa-landmark",
        "Luisiana": "fas fa-tree",
        "Cavinti": "fas fa-water",
        "Lumban": "fas fa-fish",
        "Kalayaan": "fas fa-flag",
        "Paete": "fas fa-palette",
        "Pakil": "fas fa-pray",
        "Pangil": "fas fa-mosque",
        "Siniloan": "fas fa-building",
        "Famy": "fas fa-city",
        "Mabitac": "fas fa-tree"
    };
    return icons[city] || "fas fa-map-marker-alt";
}

async function fetchAreaStatistics() {
    try {
        const areasRes = await fetch("/api/superadmin/areas");
        if (!areasRes.ok) throw new Error("Failed to fetch areas");
        const areas = await areasRes.json();
        
        const stats = {};
        
        if (Array.isArray(areas)) {
            areas.forEach(area => {
                const city = area.city || "Unknown";
                const barangay = area.barangay || "Unknown";
                
                if (!stats[city]) {
                    stats[city] = { barangays: new Set() };
                }
                
                if (barangay !== "Unknown") {
                    stats[city].barangays.add(barangay);
                }
            });
            
            const result = {};
            for (const [city, data] of Object.entries(stats)) {
                result[city] = { total: data.barangays.size };
            }
            
            return result;
        }
        
        return {};
    } catch (err) {
        console.error("Error fetching area statistics:", err);
        return {};
    }
}

// ==================== DYNAMIC AREA FILTER ====================
let areasList = [];

async function loadAreasForFilter() {
    try {
        const res = await fetch("/api/superadmin/areas");
        if (!res.ok) throw new Error("Failed to load areas");
        const areas = await res.json();
        
        const uniqueCities = [...new Set((areas || []).map(area => area.city).filter(Boolean))];
        uniqueCities.sort();
        
        areasList = uniqueCities;
        
        const areaFilter = document.getElementById("areaFilter");
        if (areaFilter) {
            while (areaFilter.options.length > 1) {
                areaFilter.remove(1);
            }
            
            uniqueCities.forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                areaFilter.appendChild(option);
            });
            
            console.log(`Loaded ${uniqueCities.length} areas for filter dropdown`);
        }

        const growthAreaFilter = document.getElementById("superadminTrendAreaFilter");
        if (growthAreaFilter) {
            while (growthAreaFilter.options.length > 1) {
                growthAreaFilter.remove(1);
            }

            uniqueCities.forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                growthAreaFilter.appendChild(option);
            });
        }

        const planAreaFilter = document.getElementById("planAreaFilter");
        if (planAreaFilter) {
            while (planAreaFilter.options.length > 1) {
                planAreaFilter.remove(1);
            }

            uniqueCities.forEach(city => {
                const option = document.createElement("option");
                option.value = city;
                option.textContent = city;
                planAreaFilter.appendChild(option);
            });
        }
        
        return uniqueCities;
    } catch (err) {
        console.error("Error loading areas for filter:", err);
        return [];
    }
}

// ==================== SUPERADMIN GROWTH OVERVIEW CHART ====================
let superadminTrendChart = null;

function populateSuperadminTrendFilterSelects() {
    const yearSelect = document.getElementById("superadminTrendYearFilter");
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join("");
    yearSelect.value = String(currentYear);

    const monthSelect = document.getElementById("superadminTrendMonthFilter");
    if (monthSelect) {
        monthSelect.value = "all";
    }
}

function parseSuperadminTrendDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function loadSuperadminGrowthChart(selectedMonth = "all", selectedYear = String(new Date().getFullYear()), selectedArea = "all") {
    const loading = document.getElementById("superadminTrendLoading");
    const canvas = document.getElementById("superadminTrendChart");

    if (!loading || !canvas) return;

    loading.style.display = "flex";
    canvas.style.display = "none";

    try {
        const appParams = new URLSearchParams({ limit: "1000" });
        if (selectedArea && selectedArea !== "all") appParams.set("city", selectedArea);

        const customerParams = new URLSearchParams({ limit: "1000" });
        if (selectedArea && selectedArea !== "all") customerParams.set("city", selectedArea);

        const [applicationsRes, customersRes] = await Promise.all([
            fetch(`/api/superadmin/applications?${appParams.toString()}`),
            fetch(`/api/superadmin/approved-applications?${customerParams.toString()}`)
        ]);

        const applications = await applicationsRes.json();
        const customers = await customersRes.json();

        const appItems = Array.isArray(applications) ? applications : [];
        const customerItems = Array.isArray(customers?.customers) ? customers.customers : (Array.isArray(customers) ? customers : []);

        let labels = [];
        let appData = [];
        let customerData = [];

        if (selectedMonth === "all") {
            labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            appData = Array(12).fill(0);
            customerData = Array(12).fill(0);

            appItems.forEach((app) => {
                const date = parseSuperadminTrendDate(app.date_submitted || app.timestamp || app.created_at || app.date_created);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                appData[date.getMonth()] += 1;
            });

            customerItems.forEach((customer) => {
                const date = parseSuperadminTrendDate(customer.approval_date || customer.date_submitted || customer.created_at || customer.timestamp);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                customerData[date.getMonth()] += 1;
            });
        } else {
            const monthIndex = Number(selectedMonth) - 1;
            const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
            labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            appData = Array(daysInMonth).fill(0);
            customerData = Array(daysInMonth).fill(0);

            appItems.forEach((app) => {
                const date = parseSuperadminTrendDate(app.date_submitted || app.timestamp || app.created_at || app.date_created);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                if (date.getMonth() !== monthIndex) return;
                appData[date.getDate() - 1] += 1;
            });

            customerItems.forEach((customer) => {
                const date = parseSuperadminTrendDate(customer.approval_date || customer.date_submitted || customer.created_at || customer.timestamp);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                if (date.getMonth() !== monthIndex) return;
                customerData[date.getDate() - 1] += 1;
            });
        }

        const hasData = appData.some((value) => value > 0) || customerData.some((value) => value > 0);

        if (!hasData) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-chart-line" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    <p style="color: #64748b; font-weight: 500; margin: 0;">No data available</p>
                </div>
            `;
            loading.style.display = "flex";
            canvas.style.display = "none";
            return;
        }

        if (superadminTrendChart) {
            superadminTrendChart.destroy();
        }

        const ctx = canvas.getContext("2d");
        superadminTrendChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Applications",
                        data: appData,
                        borderColor: "#0b3d91",
                        backgroundColor: "rgba(11, 61, 145, 0.12)",
                        borderWidth: 3,
                        tension: 0.25,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHitRadius: 12,
                        pointStyle: "circle",
                        pointBackgroundColor: "#0b3d91",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2
                    },
                    {
                        label: "Customers",
                        data: customerData,
                        borderColor: "#0f766e",
                        backgroundColor: "rgba(15, 118, 110, 0.12)",
                        borderWidth: 3,
                        tension: 0.25,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHitRadius: 12,
                        pointStyle: "circle",
                        pointBackgroundColor: "#0f766e",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                layout: {
                    padding: { top: 16, right: 16, bottom: 8, left: 16 }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        border: { color: "#1f2937", width: 1.5 },
                        grid: { color: "rgba(15, 23, 42, 0.18)", drawBorder: true },
                        ticks: {
                            precision: 0,
                            callback: function(value) {
                                if (Number.isInteger(value)) return value;
                                return Math.round(value);
                            },
                            font: { size: 11, weight: "700", family: "Inter, sans-serif" },
                            color: "#1f2937"
                        }
                    },
                    x: {
                        border: { color: "#1f2937", width: 1.5 },
                        grid: { color: "rgba(15, 23, 42, 0.18)", drawBorder: true },
                        ticks: {
                            font: { size: 11, weight: "700", family: "Inter, sans-serif" },
                            color: "#1f2937"
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        align: "end",
                        labels: {
                            usePointStyle: true,
                            pointStyle: "circle",
                            boxWidth: 32,
                            boxHeight: 10,
                            padding: 18,
                            color: "#111827",
                            backgroundColor: "rgba(255,255,255,0.9)",
                            borderColor: "#111827",
                            borderWidth: 1,
                            borderRadius: 8,
                            font: { size: 12, weight: "700", family: "Inter, sans-serif" }
                        }
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.92)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        padding: 12,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(context) {
                                return ` ${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: "easeOutQuart"
                }
            }
        });

        loading.style.display = "none";
        canvas.style.display = "block";
    } catch (error) {
        console.error("Error loading superadmin growth chart:", error);
        loading.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 12px; display: block;"></i>
                <p style="color: #dc2626; font-weight: 500; margin: 0;">Failed to load data</p>
            </div>
        `;
        loading.style.display = "flex";
        canvas.style.display = "none";
    }
}

const superadminTrendFilterBtn = document.getElementById("superadminTrendFilterBtn");
if (superadminTrendFilterBtn) {
    superadminTrendFilterBtn.addEventListener("click", async () => {
        const month = document.getElementById("superadminTrendMonthFilter")?.value || "all";
        const year = document.getElementById("superadminTrendYearFilter")?.value || String(new Date().getFullYear());
        const area = document.getElementById("superadminTrendAreaFilter")?.value || "all";
        await loadSuperadminGrowthChart(month, year, area);
    });
}

const superadminTrendResetBtn = document.getElementById("superadminTrendResetBtn");
if (superadminTrendResetBtn) {
    superadminTrendResetBtn.addEventListener("click", async () => {
        const monthSelect = document.getElementById("superadminTrendMonthFilter");
        const yearSelect = document.getElementById("superadminTrendYearFilter");
        const areaSelect = document.getElementById("superadminTrendAreaFilter");
        if (monthSelect) monthSelect.value = "all";
        if (yearSelect) yearSelect.value = String(new Date().getFullYear());
        if (areaSelect) areaSelect.value = "all";

        await loadSuperadminGrowthChart("all", String(new Date().getFullYear()), "all");
    });
}

// ==================== STATISTICS ====================
function renderStatistics(data){
    const noData = document.getElementById("statisticsNoData");
    const content = document.getElementById("statisticsContent");

    const hasData = data.total_applicants || data.total_customers || Object.keys(data.popular_plans||{}).length || data.total_admins;
    if(!hasData){ 
        if(noData) noData.style.display = "block"; 
        return; 
    }
    if(noData) noData.style.display = "none";

    const totalApplicantsSpan = document.getElementById("totalApplicants");
    const totalAdminsSpan = document.getElementById("totalAdmins");
    
    if(totalApplicantsSpan) totalApplicantsSpan.textContent = data.total_active_applicants || data.total_applicants || 0;
    if(totalAdminsSpan) totalAdminsSpan.textContent = data.total_admins || 0;

    const plansList = document.getElementById("popularPlans");
    if(plansList){
        plansList.innerHTML = "";
        for(const plan in data.popular_plans){
            const li = document.createElement("li");
            li.textContent = `${plan} : ${data.popular_plans[plan]}`;
            plansList.appendChild(li);
        }
    }

    if(content) content.style.display = "grid";
}

// ==================== ADMIN CHARTS ====================
let adminStatusChart, adminAreaChart;

const adminStatusCenterPlugin = {
    id: 'adminStatusCenterPlugin',
    beforeDraw(chart) {
        const {ctx, chartArea} = chart;
        if (!chartArea) return;

        const total = chart.data.datasets[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        // Draw total number
        ctx.font = '700 30px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), centerX, centerY - 8);

        // Draw label below number
        ctx.font = '500 11px "Inter", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Total Administrator', centerX, centerY + 16);
        ctx.restore();
    }
};

function renderAdminCharts(admins){
    let active = 0, inactive = 0;
    
    admins.forEach(admin => {
        if(admin.status === "Active") active++; 
        else inactive++;
    });

    const statusCanvas = document.getElementById("adminStatusChart");
    
    if(statusCanvas && adminStatusChart) adminStatusChart.destroy();

    if(statusCanvas){
        const ctxStatus = statusCanvas.getContext('2d');
        
        const activeGrad = ctxStatus.createLinearGradient(0, 0, 0, 200);
        activeGrad.addColorStop(0, '#10b981');
        activeGrad.addColorStop(1, '#059669');

        const inactiveGrad = ctxStatus.createLinearGradient(0, 0, 0, 200);
        inactiveGrad.addColorStop(0, '#f43f5e');
        inactiveGrad.addColorStop(1, '#be123c');

        adminStatusChart = new Chart(statusCanvas, {
            type: "doughnut",
            data: { 
                labels: ["Active", "Deactivated"], 
                datasets: [{ 
                    data: [active, inactive],
                    backgroundColor: [activeGrad, inactiveGrad],
                    borderWidth: 4,
                    borderColor: "#ffffff",
                    hoverOffset: 6,
                    cutout: "74%"
                }] 
            },
            plugins: [adminStatusCenterPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12,
                                weight: '600',
                                family: 'Inter, sans-serif'
                            },
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#ffffff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: true,
                        usePointStyle: true
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

async function loadPlanChartData(area = "all") {
    const areaCanvas = document.getElementById("adminAreaChart");
    if (!areaCanvas) return;

    try {
        const [plansRes, applicationsRes] = await Promise.all([
            fetch('/api/superadmin/plans'),
            fetch(`/api/superadmin/applications?limit=1000${area && area !== 'all' ? `&city=${encodeURIComponent(area)}` : ''}`)
        ]);

        if (!plansRes.ok) throw new Error('Failed to fetch plans');
        if (!applicationsRes.ok) throw new Error('Failed to fetch applications');

        const plans = await plansRes.json();
        const applications = await applicationsRes.json();
        const appItems = Array.isArray(applications) ? applications : (Array.isArray(applications.data) ? applications.data : []);

        const totalsByPlan = {};
        appItems.forEach(app => {
            const planName = String(app.plan || '').trim();
            if (!planName) return;
            const key = planName.toLowerCase();
            totalsByPlan[key] = (totalsByPlan[key] || 0) + 1;
        });

        const planList = Array.isArray(plans) ? plans : [];
        const labels = planList.map(plan => String(plan.name || 'Unnamed Plan').trim() || 'Unnamed Plan');
        const values = labels.map(label => {
            const key = String(label).trim().toLowerCase();
            return totalsByPlan[key] || 0;
        });

        renderPlanChart({ labels, values });
    } catch (error) {
        console.error('Error loading plan chart data:', error);
        renderPlanChart({ labels: ['No Plans'], values: [0] });
    }
}

function initPlanFilterControls() {
    const areaSelect = document.getElementById('planAreaFilter');
    if (areaSelect) {
        areaSelect.addEventListener('change', async () => {
            const selectedArea = areaSelect.value || 'all';
            await loadPlanChartData(selectedArea);
            showToast(selectedArea === 'all' ? 'Showing all areas' : `Showing data for ${selectedArea}`, true);
        });
    }

    const resetBtn = document.getElementById('planResetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (areaSelect) areaSelect.value = 'all';
            await loadPlanChartData('all');
            showToast('Plans filter reset successfully', true);
        });
    }
}

function renderPlanChart({ labels = [], values = [] } = {}) {
    const areaCanvas = document.getElementById("adminAreaChart");
    if (!areaCanvas) return;

    if (adminAreaChart) adminAreaChart.destroy();

    const safeLabels = labels.length ? labels : ['No Plans'];
    const safeValues = labels.length ? values : [0];

    areaCanvas.style.height = '320px';

    adminAreaChart = new Chart(areaCanvas, {
        type: "bar",
        data: {
            labels: safeLabels,
            datasets: [{
                label: "Total",
                data: safeValues,
                backgroundColor: safeValues.map(value => value > 0 ? '#3b82f6' : '#cbd5e1'),
                borderColor: "transparent",
                borderWidth: 0,
                borderRadius: 0,
                borderSkipped: false,
                barThickness: 22,
                maxBarThickness: 30
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 10, right: 12, bottom: 8, left: 8 }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: {
                        precision: 0,
                        font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                        color: '#64748b'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        autoSkip: false,
                        font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                        color: '#1e293b'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${Number(context.parsed.x).toLocaleString()} total`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// ==================== INSTALLATION STATUS CHART ====================
let installationChart = null;

const totalCenterPlugin = {
    id: 'totalCenterPlugin',
    beforeDraw(chart) {
        const {ctx, chartArea} = chart;
        if (!chartArea) return;

        const total = chart.data.datasets[0]?.data?.reduce((a, b) => a + b, 0) || 0;
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.save();
        ctx.font = '700 28px "Inter", sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total.toString(), centerX, centerY - 8);

        ctx.font = '500 11px "Inter", sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Applications', centerX, centerY + 16);
        ctx.restore();
    }
};

function renderInstallationChart(data){
    const noData = document.getElementById("installationNoData");
    const chartCanvas = document.getElementById("installationStatusChart");
    const loadingIndicator = document.getElementById("installationLoading");

    if(loadingIndicator) loadingIndicator.style.display = "none";

    const summary = data.installation_summary || {};
    const areaName = data.area || "All Areas";
    const totalMatched = data.total_matched || 0;
    const dateRange = data.date_range || {};
    
    // ✅ I-CONTROL ANG ORDER NG STATUSES
    const orderedStatuses = ["Pending", "Ongoing", "Installed", "Cancelled", "Terminated"];
    
    // ✅ KUNIN ANG LABELS AT COUNTS BASE SA ORDERED STATUSES
    const labels = orderedStatuses;
    const counts = orderedStatuses.map(status => summary[status] || 0);
    
    const total = counts.reduce((a, b) => a + b, 0);

    if(labels.length === 0 || total === 0){ 
        if(noData) {
            noData.style.display = "block";
            let message = "";
            if (areaName !== "All Areas") {
                message = `<i class="fas fa-info-circle"></i><br>No installation data available for ${areaName}.<br>
                          <small style="font-size: 11px;">Try selecting a different area or date range.</small>`;
            } else {
                message = `<i class="fas fa-info-circle"></i><br>No installation data available.<br>
                          <small style="font-size: 11px;">Try adjusting your date filters.</small>`;
            }
            noData.innerHTML = message;
        }
        if(chartCanvas) chartCanvas.style.display = "none";
        return; 
    }

    if(noData) noData.style.display = "none";
    if(chartCanvas) chartCanvas.style.display = "block";
    
    const ctx = chartCanvas ? chartCanvas.getContext('2d') : null;
    if(ctx){
        if(installationChart) installationChart.destroy();
        
        // ✅ MGA KULAY NA NAKA-ORDER
        const statusColors = {
            "Pending": "#f59e0b",      // Amber
            "Ongoing": "#0284c7",      // Sky Blue
            "Installed": "#10b981",    // Green
            "Cancelled": "#ef4444",    // Red
            "Terminated": "#6b7280"    // Gray
        };
        
        const backgroundColors = labels.map(label => statusColors[label] || "#94a3b8");
        
        installationChart = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels: labels, 
                datasets: [{ 
                    data: counts, 
                    backgroundColor: backgroundColors,
                    borderWidth: 4,
                    borderColor: "#ffffff",
                    hoverOffset: 6,
                    cutout: "74%"
                }] 
            },
            plugins: [totalCenterPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: {
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            font: {
                                size: 12,
                                weight: '600',
                                family: 'Inter, sans-serif'
                            },
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#ffffff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 10,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutQuart'
                }
            }
        });
    }
}

function loadInstallationStatusChart(startDate = "", endDate = "", area = ""){
    let url = "/api/superadmin/installation-summary";
    const params = new URLSearchParams();
    
    if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
    }
    
    if (area && area !== "") {
        params.append('area', area);
    }
    
    if (params.toString()) {
        url += `?${params.toString()}`;
    }

    const loadingIndicator = document.getElementById("installationLoading");
    
    fetchWithCacheAndUpdate({
        cacheKey: `installation_${startDate}_${endDate}_${area}`,
        url: url,
        ttl: 5,
        renderCallback: renderInstallationChart,
        showLoading: loadingIndicator,
        initialLoad: true
    });
}

// ==================== TOTAL CUSTOMERS ====================
function renderTotalCustomers(data){
    console.log("Total customers data:", data);
    
    const totalCustomersSpan = document.getElementById("totalCustomers");
    if(totalCustomersSpan) {
        let count = 0;
        let customersArray = [];

        if (Array.isArray(data)) {
            customersArray = data;
            count = data.length;
        } else if (data && typeof data === 'object') {
            if (data.customers && Array.isArray(data.customers)) {
                customersArray = data.customers;
                count = data.total || customersArray.length;
            } else if (data.data && Array.isArray(data.data)) {
                customersArray = data.data;
                count = data.total || customersArray.length;
            } else {
                customersArray = Object.values(data).find(val => Array.isArray(val)) || [];
                count = customersArray.length;
            }
        }

        totalCustomersSpan.textContent = count;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayCount = 0, weekCount = 0, monthCount = 0;

        if (customersArray.length > 0) {
            customersArray.forEach(customer => {
                let createdDate = null;
                
                if (customer.approval_date) {
                    createdDate = new Date(customer.approval_date);
                } else if (customer.created_at) {
                    createdDate = new Date(customer.created_at);
                } else if (customer.date_created) {
                    createdDate = new Date(customer.date_created);
                } else if (customer.date_submitted) {
                    createdDate = new Date(customer.date_submitted);
                } else if (customer.date_approved) {
                    createdDate = new Date(customer.date_approved);
                }
                
                if (createdDate && !isNaN(createdDate.getTime())) {
                    if (createdDate >= todayStart) todayCount++;
                    if (createdDate >= weekStart) weekCount++;
                    if (createdDate >= monthStart) monthCount++;
                }
            });
        }

        const customersToday = document.getElementById("customersToday");
        const customersWeek = document.getElementById("customersWeek");
        const customersMonth = document.getElementById("customersMonth");

        if (customersToday) customersToday.textContent = todayCount;
        if (customersWeek) customersWeek.textContent = weekCount;
        if (customersMonth) customersMonth.textContent = monthCount;
        
        console.log(`Customer counts - Today: ${todayCount}, Week: ${weekCount}, Month: ${monthCount}, Total: ${count}`);
    }
}

// ==================== FETCH ACTIVE APPLICATIONS COUNT ====================
async function fetchActiveApplicationsCount(){
    try {
        const res = await fetch("/api/superadmin/applications?limit=1000");
        if(!res.ok) throw new Error("Failed to fetch applications");
        const applications = await res.json();
        
        let appsArray = [];
        if (Array.isArray(applications)) {
            appsArray = applications;
        } else if (applications && applications.data) {
            appsArray = applications.data;
        } else if (applications && applications.applications) {
            appsArray = applications.applications;
        } else {
            appsArray = Object.values(applications).find(val => Array.isArray(val)) || [];
        }

        const activeApplications = appsArray.filter(app => app.status !== "Rejected");
        const activeCount = activeApplications.length;

        const totalApplicantsSpan = document.getElementById("totalApplicants");
        if(totalApplicantsSpan) totalApplicantsSpan.textContent = activeCount;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayCount = 0, weekCount = 0, monthCount = 0;

        activeApplications.forEach(app => {
            let createdDate = null;
            
            if (app.date_submitted) {
                createdDate = new Date(app.date_submitted);
            } else if (app.timestamp) {
                createdDate = new Date(app.timestamp);
            } else if (app.created_at) {
                createdDate = new Date(app.created_at);
            } else if (app.date_created) {
                createdDate = new Date(app.date_created);
            } else if (app.application_date) {
                createdDate = new Date(app.application_date);
            } else if (app.createdAt) {
                createdDate = new Date(app.createdAt);
            }
            
            if (createdDate && !isNaN(createdDate.getTime())) {
                if (createdDate >= todayStart) todayCount++;
                if (createdDate >= weekStart) weekCount++;
                if (createdDate >= monthStart) monthCount++;
            }
        });

        const applicationsToday = document.getElementById("applicationsToday");
        const applicationsWeek = document.getElementById("applicationsWeek");
        const applicationsMonth = document.getElementById("applicationsMonth");

        if (applicationsToday) applicationsToday.textContent = todayCount;
        if (applicationsWeek) applicationsWeek.textContent = weekCount;
        if (applicationsMonth) applicationsMonth.textContent = monthCount;
        
        return activeCount;
    } catch(err) {
        console.error("Error fetching active applications:", err);
        return 0;
    }
}

// ==================== FILTER BUTTON HANDLER ====================
function initFilterButton() {
    const filterBtn = document.getElementById("filterBtn");
    if (filterBtn) {
        filterBtn.addEventListener("click", () => {
            const startDateInput = document.getElementById("startDate");
            const endDateInput = document.getElementById("endDate");
            const areaFilter = document.getElementById("areaFilter");
            
            let startDate = startDateInput ? startDateInput.value : "";
            let endDate = endDateInput ? endDateInput.value : "";
            let area = areaFilter ? areaFilter.value : "";
            
            if ((startDate && !endDate) || (!startDate && endDate)) {
                showToast("Please select both start and end date", false);
                return;
            }
            
            if (startDate && endDate) {
                startDate = new Date(startDate).toISOString().split("T")[0];
                endDate = new Date(endDate).toISOString().split("T")[0];
            }
            
            const loadingIndicator = document.getElementById("installationLoading");
            if (loadingIndicator) loadingIndicator.style.display = "block";
            
            loadInstallationStatusChart(startDate, endDate, area);
        });
    }

    // Handle Reset button
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            const startDateInput = document.getElementById("startDate");
            const endDateInput = document.getElementById("endDate");
            const areaFilter = document.getElementById("areaFilter");
            
            if (startDateInput) startDateInput.value = "";
            if (endDateInput) endDateInput.value = "";
            if (areaFilter) areaFilter.value = "";
            
            const loadingIndicator = document.getElementById("installationLoading");
            if (loadingIndicator) loadingIndicator.style.display = "block";
            
            loadInstallationStatusChart("", "", "");
            showToast("Filters reset successfully", true);
        });
    }
}

// ==================== EXPORT ALL CUSTOMERS DATA TO EXCEL ====================
async function exportAllCustomersData() {
    const exportBtn = document.getElementById("superadminExportBtn");
    if (!exportBtn) return;
    
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    exportBtn.disabled = true;
    
    try {
        let startDate = document.getElementById("startDate")?.value;
        let endDate = document.getElementById("endDate")?.value;
        let areaFilter = document.getElementById("areaFilter")?.value;
        
        let url = `/api/superadmin/export-all-customers-excel`;
        const params = new URLSearchParams();
        
        if (startDate && endDate) {
            params.append('start_date', startDate);
            params.append('end_date', endDate);
        }
        
        if (areaFilter && areaFilter !== "") {
            params.append('area', areaFilter);
        }
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        // Download the Excel file directly
        window.location.href = url;
        
        showToast("Exporting data to Excel...", true);
        
    } catch (error) {
        console.error("Export error:", error);
        showToast("Failed to export data: " + error.message, false);
    } finally {
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }, 2000);
    }
}

// Setup export button event listener
function setupSuperadminExportButton() {
    const exportBtn = document.getElementById("superadminExportBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportAllCustomersData);
    }
}

// ==================== INITIAL LOAD ====================
document.addEventListener("DOMContentLoaded", async () => {
    const isValid = await checkSession();
    if (!isValid) return;
    // STATISTICS
    fetchWithCacheAndUpdate({
        cacheKey:"superadmin_statistics",
        url:"/api/superadmin/statistics",
        ttl:5,
        renderCallback:renderStatistics,
        showLoading:document.getElementById("statisticsLoading"),
        initialLoad:true
    });

    // ADMIN CHARTS
    fetchWithCacheAndUpdate({
        cacheKey:"admin_charts",
        url:"/api/superadmin/admins",
        ttl:5,
        renderCallback:renderAdminCharts,
        initialLoad:true
    });

    loadPlanChartData();
    initPlanFilterControls();

    // TOTAL CUSTOMERS
    fetchWithCacheAndUpdate({
        cacheKey:"total_customers",
        url:"/api/superadmin/approved-applications",
        ttl:5,
        renderCallback: (data) => {
            console.log("Approved applications response:", data);
            if (data && data.customers) {
                renderTotalCustomers(data.customers);
            } else {
                renderTotalCustomers(data);
            }
        },
        initialLoad:true
    });

    fetchActiveApplicationsCount();
    
    await loadAndRenderAreaCards();
    await loadAreasForFilter();
    populateSuperadminTrendFilterSelects();

    const installationLoading = document.getElementById("installationLoading");
    if(installationLoading) installationLoading.style.display = "block";
    
    loadInstallationStatusChart();
    await loadSuperadminGrowthChart("all", String(new Date().getFullYear()), "all");
    initFilterButton();
    setupSuperadminExportButton();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

// ==================== AUTO REFRESH EVERY 60s ====================
setInterval(() => {
    const isLoggedIn = sessionStorage.getItem('adminUsername') && sessionStorage.getItem('sessionActive') === 'true';
    if (isLoggedIn) {
        fetchWithCacheAndUpdate({
            cacheKey:"superadmin_statistics", 
            url:"/api/superadmin/statistics", 
            ttl:5, 
            renderCallback:renderStatistics 
        });
        fetchWithCacheAndUpdate({ 
            cacheKey:"admin_charts", 
            url:"/api/superadmin/admins", 
            ttl:5, 
            renderCallback:renderAdminCharts 
        });
        fetchWithCacheAndUpdate({ 
            cacheKey:"total_customers", 
            url:"/api/superadmin/approved-applications", 
            ttl:5, 
            renderCallback:renderTotalCustomers 
        });
        fetchActiveApplicationsCount();
        loadAndRenderAreaCards();
        loadAreasForFilter();
    }
}, 60000);



console.log('Super Admin Dashboard loaded successfully!');



// ==================== DATE INPUT VALIDATION ====================
function setupDateValidation() {
    const startDateInput = document.getElementById("startDate");
    const endDateInput = document.getElementById("endDate");
    
    if (!startDateInput || !endDateInput) return;

    // Set max date for start date to today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    startDateInput.setAttribute('max', todayStr);
    endDateInput.setAttribute('max', todayStr);

    // Create error message elements if they don't exist
    const startDateGroup = startDateInput.closest('.filter-group');
    const endDateGroup = endDateInput.closest('.filter-group');
    
    if (startDateGroup && !startDateGroup.querySelector('.date-error')) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'date-error';
        errorMsg.id = 'startDateError';
        errorMsg.textContent = 'Start date cannot be in the future';
        startDateGroup.appendChild(errorMsg);
    }
    
    if (endDateGroup && !endDateGroup.querySelector('.date-error')) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'date-error';
        errorMsg.id = 'endDateError';
        errorMsg.textContent = 'End date must be after start date';
        endDateGroup.appendChild(errorMsg);
    }

    // Start date change handler
    startDateInput.addEventListener('change', function() {
        const startDate = this.value;
        const startDateError = document.getElementById('startDateError');
        
        // Validate start date is not in future
        if (startDate && startDate > todayStr) {
            this.value = '';
            if (startDateError) {
                startDateError.textContent = 'Start date cannot be in the future';
                startDateError.classList.add('show');
            }
            return;
        }
        
        if (startDateError) {
            startDateError.classList.remove('show');
        }
        
        // Update end date min attribute
        if (startDate) {
            endDateInput.setAttribute('min', startDate);
        } else {
            endDateInput.removeAttribute('min');
        }
        
        // Validate end date if it exists
        if (endDateInput.value) {
            validateEndDate();
        }
    });

    // End date change handler
    function validateEndDate() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const endDateError = document.getElementById('endDateError');
        
        if (!endDateError) return;
        
        // Check if end date is after start date
        if (startDate && endDate && endDate < startDate) {
            endDateError.textContent = 'End date must be after start date';
            endDateError.classList.add('show');
            endDateInput.value = '';
            return false;
        }
        
        // Check if end date is in future
        if (endDate && endDate > todayStr) {
            endDateError.textContent = 'End date cannot be in the future';
            endDateError.classList.add('show');
            endDateInput.value = '';
            return false;
        }
        
        endDateError.classList.remove('show');
        return true;
    }
    
    endDateInput.addEventListener('change', validateEndDate);

    // Also validate on blur
    endDateInput.addEventListener('blur', function() {
        const endDateError = document.getElementById('endDateError');
        if (this.value && endDateError) {
            const startDate = startDateInput.value;
            if (startDate && this.value < startDate) {
                endDateError.textContent = 'End date must be after start date';
                endDateError.classList.add('show');
            } else if (this.value && this.value > todayStr) {
                endDateError.textContent = 'End date cannot be in the future';
                endDateError.classList.add('show');
            }
        }
    });

    // Clear error on focus
    startDateInput.addEventListener('focus', function() {
        const startDateError = document.getElementById('startDateError');
        if (startDateError) startDateError.classList.remove('show');
    });
    
    endDateInput.addEventListener('focus', function() {
        const endDateError = document.getElementById('endDateError');
        if (endDateError) endDateError.classList.remove('show');
    });
}

// ==================== ENHANCED FILTER BUTTON WITH DATE VALIDATION ====================
function initFilterButtonWithValidation() {
    const filterBtn = document.getElementById("filterBtn");
    if (!filterBtn) return;
    
    // Remove existing click listeners (keep only one)
    const newFilterBtn = filterBtn.cloneNode(true);
    filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
    
    newFilterBtn.addEventListener("click", function() {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        const areaFilter = document.getElementById("areaFilter");
        
        let startDate = startDateInput ? startDateInput.value : "";
        let endDate = endDateInput ? endDateInput.value : "";
        let area = areaFilter ? areaFilter.value : "";
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Validate: Start date cannot be in future
        if (startDate && startDate > todayStr) {
            showToast("Start date cannot be in the future", false);
            const startDateError = document.getElementById('startDateError');
            if (startDateError) {
                startDateError.textContent = 'Start date cannot be in the future';
                startDateError.classList.add('show');
            }
            return;
        }
        
        // Validate: End date cannot be in future
        if (endDate && endDate > todayStr) {
            showToast("End date cannot be in the future", false);
            const endDateError = document.getElementById('endDateError');
            if (endDateError) {
                endDateError.textContent = 'End date cannot be in the future';
                endDateError.classList.add('show');
            }
            return;
        }
        
        // Validate: End date must be after start date
        if (startDate && endDate && endDate < startDate) {
            showToast("End date must be after start date", false);
            const endDateError = document.getElementById('endDateError');
            if (endDateError) {
                endDateError.textContent = 'End date must be after start date';
                endDateError.classList.add('show');
            }
            return;
        }
        
        // Validate: Both dates required if one is selected
        if ((startDate && !endDate) || (!startDate && endDate)) {
            showToast("Please select both start and end date", false);
            return;
        }
        
        // Clear any error messages
        const startDateError = document.getElementById('startDateError');
        const endDateError = document.getElementById('endDateError');
        if (startDateError) startDateError.classList.remove('show');
        if (endDateError) endDateError.classList.remove('show');
        
        const loadingIndicator = document.getElementById("installationLoading");
        if (loadingIndicator) loadingIndicator.style.display = "block";
        
        loadInstallationStatusChart(startDate, endDate, area);
    });
}



// ============================================================
// ✅ FIX: PROFILE LINK - PASS TAB_ID IN URL
// ============================================================
(function fixProfileLink() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixProfileLinkHandler);
    } else {
        fixProfileLinkHandler();
    }
    
    function fixProfileLinkHandler() {
        const profileLink = document.getElementById('profileLink');
        if (!profileLink) return;
        
        // Get tab_id from sessionStorage
        const tabId = sessionStorage.getItem('tab_id') || '';
        
        // Clone to remove existing listeners
        const newProfileLink = profileLink.cloneNode(true);
        profileLink.parentNode.replaceChild(newProfileLink, profileLink);
        
        // Add correct href with tab_id
        newProfileLink.addEventListener('click', function(e) {
            e.preventDefault();
            const tabId = sessionStorage.getItem('tab_id') || '';
            const url = `/superadmin/profile${tabId ? `?tab_id=${tabId}` : ''}`;
            console.log(`✅ Navigating to: ${url}`);
            window.location.href = url;
        });
    }
})();