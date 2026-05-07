// Add this at the VERY TOP of superadmin-dashboard.js
(function() {
    // Immediate session check
    const userType = localStorage.getItem('userType');
    const sessionToken = sessionStorage.getItem('sessionToken');
    
    if (!userType || !sessionToken) {
        window.location.replace('/');
        throw new Error('No session');
    }
    
    // Update activity timestamp
    localStorage.setItem('lastActivity', Date.now().toString());
})();

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

// ==================== TOAST ====================
function showToast(message, success = true){
    const toast = document.getElementById("toast");
    if(!toast) return;
    toast.style.background = success ? "#28a745" : "#c0392b";
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(()=>{ toast.style.display = "none"; }, 3000);
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
        const res = await fetch("/api/superadmin/profile");
        if(!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        const profileNameSpan = document.getElementById("profileName");
        if(profileNameSpan) profileNameSpan.textContent = profile.username || "Profile";
    }catch(err){ console.error(err); }
}
loadProfile();

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
if(logoutBtn && logoutModal){
    const closeBtn = logoutModal.querySelector(".close-btn");
    const cancelBtn = document.getElementById("cancelLogout");
    const confirmBtn = document.getElementById("confirmLogout");

    logoutBtn.addEventListener("click", e => { e.preventDefault(); logoutModal.style.display = "block"; });
    if(closeBtn) closeBtn.addEventListener("click", () => logoutModal.style.display = "none");
    if(cancelBtn) cancelBtn.addEventListener("click", () => logoutModal.style.display = "none");
    
    if(confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (window.SessionManager) {
                window.SessionManager.logout('You have been logged out successfully.');
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace("/");
            }
        });
    }
    
    window.addEventListener("click", e => { if(e.target === logoutModal) logoutModal.style.display = "none"; });
}

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
        
        const uniqueCities = [...new Set(areas.map(area => area.city))];
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
        
        return uniqueCities;
    } catch (err) {
        console.error("Error loading areas for filter:", err);
        return [];
    }
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

function renderAdminCharts(admins){
    let active = 0, inactive = 0;
    let areas = {};
    
    admins.forEach(admin => {
        if(admin.status === "Active") active++; 
        else inactive++;
        if(admin.area) {
            areas[admin.area] = (areas[admin.area] || 0) + 1;
        }
    });

    const defaultAreas = ["Santa Cruz", "Pagsanjan", "Magdalena", "Pila"];
    defaultAreas.forEach(area => {
        if(areas[area] === undefined) areas[area] = 0;
    });

    const statusCanvas = document.getElementById("adminStatusChart");
    const areaCanvas = document.getElementById("adminAreaChart");
    
    if(statusCanvas && adminStatusChart) adminStatusChart.destroy();
    if(areaCanvas && adminAreaChart) adminAreaChart.destroy();

    if(statusCanvas){
        adminStatusChart = new Chart(statusCanvas, {
            type: "doughnut",
            data: { 
                labels: ["Active", "Deactivated"], 
                datasets: [{ 
                    data: [active, inactive],
                    backgroundColor: ["#10b981", "#ef4444"],
                    borderWidth: 0,
                    hoverOffset: 10,
                    cutout: "60%"
                }] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    if(areaCanvas){
        adminAreaChart = new Chart(areaCanvas, {
            type: "bar",
            data: { 
                labels: Object.keys(areas), 
                datasets: [{ 
                    label: "Administrators per Area", 
                    data: Object.values(areas) 
                }] 
            }
        });
    }
}

// ==================== INSTALLATION STATUS CHART ====================
let installationChart = null;

function renderInstallationChart(data){
    const noData = document.getElementById("installationNoData");
    const chartCanvas = document.getElementById("installationStatusChart");
    const loadingIndicator = document.getElementById("installationLoading");

    if(loadingIndicator) loadingIndicator.style.display = "none";

    const summary = data.installation_summary || {};
    const areaName = data.area || "All Areas";
    const totalMatched = data.total_matched || 0;
    const dateRange = data.date_range || {};
    
    const labels = Object.keys(summary);
    const counts = Object.values(summary);
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
        
        const statusColors = {
            "Pending": "#f59e0b",
            "Approved": "#10b981", 
            "Ongoing": "#3b82f6",
            "Completed": "#8b5cf6",
            "Rejected": "#ef4444",
            "Installed": "#06b6d4"
        };
        
        const backgroundColors = labels.map(label => statusColors[label] || "#94a3b8");
        
        installationChart = new Chart(ctx, {
            type: 'doughnut',
            data: { 
                labels: labels, 
                datasets: [{ 
                    data: counts, 
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 10,
                    cutout: "55%"
                }] 
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom' }
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
function renderTotalCustomers(customers){
    console.log("Total customers data:", customers);
    console.log("Type:", typeof customers);
    console.log("Is array?", Array.isArray(customers));
    
    const totalCustomersSpan = document.getElementById("totalCustomers");
    if(totalCustomersSpan) {
        let count = 0;
        if (Array.isArray(customers)) {
            count = customers.length;
        } else if (customers && typeof customers === 'object') {
            count = customers.length || customers.total || Object.keys(customers).length;
        } else if (typeof customers === 'number') {
            count = customers;
        }
        totalCustomersSpan.textContent = count;
    }
}

// ==================== FETCH ACTIVE APPLICATIONS COUNT ====================
async function fetchActiveApplicationsCount(){
    try {
        const res = await fetch("/api/superadmin/applications?limit=1000");
        if(!res.ok) throw new Error("Failed to fetch applications");
        const applications = await res.json();
        
        const activeApplications = applications.filter(app => app.status !== "Rejected");
        const activeCount = activeApplications.length;
        
        const totalApplicantsSpan = document.getElementById("totalApplicants");
        if(totalApplicantsSpan) totalApplicantsSpan.textContent = activeCount;
        
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
}

// ==================== RESET FILTER BUTTON ====================
function addResetFilterButton() {
    const dateFilterDiv = document.querySelector(".date-filter");
    if (dateFilterDiv && !document.getElementById("resetFilterBtn")) {
        const resetBtn = document.createElement("button");
        resetBtn.id = "resetFilterBtn";
        resetBtn.className = "filter-btn";
        resetBtn.style.background = "#64748b";
        resetBtn.innerHTML = '<i class="fas fa-undo-alt"></i> Reset';
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
        
        dateFilterDiv.appendChild(resetBtn);
    }
}

// ==================== HAMBURGER MENU TOGGLE ====================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
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
    
    window.addEventListener('resize', function(){
        if(window.innerWidth > 768 && sidebar.classList.contains('active')){
            sidebar.classList.remove('active');
            if(hamburger) hamburger.classList.remove('active');
            if(sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    });
}

// ==================== INITIAL LOAD ====================
document.addEventListener("DOMContentLoaded", async () => {
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

    // TOTAL CUSTOMERS
    fetchWithCacheAndUpdate({
        cacheKey:"total_customers",
        url:"/api/superadmin/approved-applications",
        ttl:5,
        renderCallback:renderTotalCustomers,
        initialLoad:true
    });

    fetchActiveApplicationsCount();
    
    await loadAndRenderAreaCards();
    await loadAreasForFilter();

    const installationLoading = document.getElementById("installationLoading");
    if(installationLoading) installationLoading.style.display = "block";
    
    loadInstallationStatusChart();
    initFilterButton();
    addResetFilterButton();
    
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});

// ==================== AUTO REFRESH EVERY 60s ====================
setInterval(() => {
    if (window.SessionManager && window.SessionManager.isAuthenticated()) {
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