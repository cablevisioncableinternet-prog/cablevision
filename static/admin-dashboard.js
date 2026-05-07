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

// ================= PROFILE DROPDOWN =================
const profileBtn = document.getElementById("profileBtn");
const profileMenu = document.getElementById("profileMenu");

if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", e => {
        e.stopPropagation();
        profileMenu.classList.toggle("show");
    });
    
    window.addEventListener("click", e => {
        if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
            profileMenu.classList.remove("show");
        }
    });
}

// ================= LOGOUT MODAL =================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const closeLogoutModal = document.getElementById("closeLogoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");

if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", e => {
        e.preventDefault();
        logoutModal.style.display = "block";
    });
}

if (closeLogoutModal) {
    closeLogoutModal.addEventListener("click", () => logoutModal.style.display = "none");
}

if (cancelLogout) {
    cancelLogout.addEventListener("click", () => logoutModal.style.display = "none");
}

// UPDATED LOGOUT HANDLER - Use SessionManager
if (confirmLogout) {
    confirmLogout.addEventListener("click", () => {
        if (window.SessionManager) {
            window.SessionManager.logout('You have been logged out successfully.');
        } else {
            // Fallback logout
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace("/");
        }
    });
}

window.addEventListener("click", e => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
});

// ================= TAB SWITCHING =================
const applicationsTab = document.getElementById("applicationsTab");
const promosTab = document.getElementById("promosTab");
const applicationsSection = document.getElementById("applicationsSection");
const promosSection = document.getElementById("promosSection");

if (applicationsTab && promosTab && applicationsSection && promosSection) {
    applicationsTab?.addEventListener("click", e => {
        e.preventDefault();
        applicationsSection.style.display = "block";
        promosSection.style.display = "none";
        applicationsTab.parentElement.classList.add("active");
        promosTab.parentElement.classList.remove("active");
    });

    promosTab?.addEventListener("click", e => {
        e.preventDefault();
        applicationsSection.style.display = "none";
        promosSection.style.display = "block";
        applicationsTab.parentElement.classList.remove("active");
        promosTab.parentElement.classList.add("active");
    });
}

// ================= PROFILE LINK =================
const profileLink = document.getElementById("profileLink");
if (profileLink) {
    profileLink.addEventListener("click", e => {
        e.preventDefault();
        const adminUsername = localStorage.getItem("adminUsername");
        if (!adminUsername) {
            alert("Admin not logged in");
            return;
        }
        window.location.href = `/admin/profile?username=${adminUsername}`;
    });
}

// ================= LOAD APPLICATIONS =================
const applicationsTableBody = document.querySelector("#applicationsTable tbody");
const adminUsername = localStorage.getItem("adminUsername");

async function loadApplications() {
    if (!adminUsername) return;
    try {
        // Use the internet-applications endpoint (already converted to MySQL)
        const res = await fetch(`/api/admin/internet-applications?username=${adminUsername}`);
        const apps = await res.json();
        if (applicationsTableBody) {
            applicationsTableBody.innerHTML = "";
            apps.forEach(app => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${app.first_name || app.full_name || "N/A"} ${app.last_name || ""}</td>
                    <td>${app.city || app.address || "N/A"}</td>
                    <td>${app.status || "Pending"}</td>
                    <td><button class="view-app-btn" data-id="${app.id}">View</button></td>
                `;
                applicationsTableBody.appendChild(tr);
            });
            
            // Attach view button events
            document.querySelectorAll(".view-app-btn").forEach(btn => {
                btn.addEventListener("click", () => viewApp(btn.dataset.id));
            });
        }
    } catch (err) {
        console.error("Failed to load applications:", err);
    }
}

// ================= VIEW APPLICATION MODAL =================
const appModal = document.getElementById("appModal");
const appDetails = document.getElementById("appDetails");
const closeAppModal = appModal?.querySelector(".close-btn");

function viewApp(appId) {
    fetch(`/api/admin/internet-applications?username=${adminUsername}`)
        .then(res => res.json())
        .then(apps => {
            const app = apps.find(a => a.id === appId);
            if (appDetails) {
                appDetails.textContent = JSON.stringify(app, null, 2);
            }
            if (appModal) appModal.style.display = "block";
        });
}

if (closeAppModal) {
    closeAppModal.addEventListener("click", () => {
        if (appModal) appModal.style.display = "none";
    });
}

window.addEventListener("click", e => {
    if (e.target === appModal) appModal.style.display = "none";
});

// ================= PROMO MANAGEMENT =================
const promoForm = document.getElementById("promoForm");
const promoList = document.getElementById("promoList");

async function loadPromos() {
    try {
        const res = await fetch("/api/admin/promos");
        const promos = await res.json();
        if (promoList) {
            promoList.innerHTML = "";
            promos.forEach(promo => {
                const li = document.createElement("li");
                li.textContent = `${promo.title} - ${promo.desc}`;
                promoList.appendChild(li);
            });
        }
    } catch (err) { 
        console.error(err); 
    }
}

if (promoForm) {
    promoForm.addEventListener("submit", async e => {
        e.preventDefault();
        const title = document.getElementById("promoTitle")?.value;
        const desc = document.getElementById("promoDesc")?.value;
        if (!title || !desc) return;
        
        try {
            await fetch("/api/admin/promos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, desc })
            });
            if (document.getElementById("promoTitle")) document.getElementById("promoTitle").value = "";
            if (document.getElementById("promoDesc")) document.getElementById("promoDesc").value = "";
            loadPromos();
        } catch (err) { 
            console.error(err); 
        }
    });
}

loadPromos();

// ================= DATE & TIME =================
function updateDateTime() {
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = days[now.getDay()];
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const date = now.toLocaleDateString('en-US', dateOptions);
    const time = now.toLocaleTimeString();
    
    const currentDayEl = document.getElementById("currentDay");
    const currentDateEl = document.getElementById("currentDate");
    const liveTimeEl = document.getElementById("liveTime");
    
    if (currentDayEl) currentDayEl.textContent = day;
    if (currentDateEl) currentDateEl.textContent = date;
    if (liveTimeEl) liveTimeEl.textContent = time;
}

setInterval(updateDateTime, 1000);
updateDateTime();

// ==================== LOAD STATISTICS ====================
async function loadStatistics() {
    const username = localStorage.getItem("adminUsername");
    if (!username) return;
    
    try {
        const res = await fetch(`/api/admin/statistics?username=${username}`);
        const data = await res.json();

        // Total applications
        const totalApplicantsEl = document.getElementById("totalApplicants");
        if (totalApplicantsEl) totalApplicantsEl.textContent = data.total_applicants || 0;

        // Popular plans
        const plansList = document.getElementById("popularPlans");
        if (plansList && data.popular_plans) {
            plansList.innerHTML = "";
            for (const plan in data.popular_plans) {
                const li = document.createElement("li");
                li.textContent = plan + " : " + data.popular_plans[plan];
                plansList.appendChild(li);
            }
        }
    } catch (err) {
        console.error("Failed to load statistics:", err);
    }
}

// ================= LOAD TOTAL CUSTOMERS =================
async function loadTotalCustomers(username) {
    if (!username) return;
    try {
        const response = await fetch(`/api/admin/approved-applications?username=${username}`);
        const data = await response.json();
        const customers = Array.isArray(data) ? data.length : 0;
        const totalCustomersEl = document.getElementById("totalCustomers");
        if (totalCustomersEl) totalCustomersEl.textContent = customers;
        return customers;
    } catch (error) {
        console.error("Error loading total customers:", error);
        return 0;
    }
}

// ================= LOAD ADMIN PROFILE =================
async function loadAdminProfile() {
    const adminUsername = localStorage.getItem("adminUsername");
    if (!adminUsername) {
        console.error("No admin username found");
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) {
            // Display username or name in profile dropdown
            profileNameSpan.textContent = profile.username || profile.name || "Admin";
        }
        
        // Store admin info if needed
        if (profile.id) {
            localStorage.setItem("adminId", profile.id);
            sessionStorage.setItem("adminId", profile.id);
        }
        if (profile.area) {
            localStorage.setItem("adminArea", profile.area);
            sessionStorage.setItem("adminArea", profile.area);
        }
        if (profile.city) {
            localStorage.setItem("adminCity", profile.city);
            sessionStorage.setItem("adminCity", profile.city);
        }
        
        console.log("Admin profile loaded:", profile.username);
    } catch (err) {
        console.error("Error loading admin profile:", err);
        const profileNameSpan = document.getElementById("profileName");
        if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

// ================= LOAD ADMIN AREA =================
async function loadAdminArea(username) {
    if (!username) return;
    try {
        // Use profile endpoint to get area
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(username)}`);
        const data = await response.json();
        const area = data.area || "Unknown";
        const titleEl = document.getElementById("adminDashboardTitle");
        if (titleEl) titleEl.textContent = `Administrator Dashboard - ${area}`;
    } catch (error) {
        console.error("Error loading admin area:", error);
    }
}

// ================= LOAD INSTALLATION CHART (ENHANCED DOUGHNUT) =================
let installationChart = null;

async function loadInstallationStatusChart(username, startDate = "", endDate = "") {
    const loading = document.getElementById("chartLoading");
    const canvas = document.getElementById("installationStatusChart");

    if (!loading || !canvas) return;
    
    loading.style.display = "flex";
    canvas.style.display = "none";
    
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>Loading chart...</p>
    `;

    try {
        let url = `/api/admin/installation-summary?username=${username}`;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        const summary = data.installation_summary || {};
        
        const labels = Object.keys(summary).filter(key => summary[key] > 0);
        const counts = labels.map(key => summary[key]);
        const total = counts.reduce((a, b) => a + b, 0);

        const hasData = counts.length > 0 && counts.some(count => count > 0);
        
        if (!hasData) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-chart-pie" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    <p style="color: #64748b; font-weight: 500; margin: 0;">No installation data available</p>
                    <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">No installation records found in this area</p>
                </div>
            `;
            loading.style.display = "flex";
            canvas.style.display = "none";
            return;
        }

        const ctx = canvas.getContext('2d');

        if (installationChart) {
            installationChart.destroy();
        }

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
                    label: 'Installation Status',
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderWidth: 0,
                    hoverOffset: 10,
                    cutout: '55%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            font: { size: 11, weight: '500', family: 'Inter, sans-serif' },
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        titleFont: { size: 12, weight: '600', family: 'Inter, sans-serif' },
                        bodyFont: { size: 11, family: 'Inter, sans-serif' },
                        padding: 10
                    }
                }
            }
        });

        loading.style.display = "none";
        canvas.style.display = "block";

    } catch (error) {
        console.error("Error loading installation chart:", error);
        loading.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 12px; display: block;"></i>
                <p style="color: #dc2626; font-weight: 500; margin: 0;">Failed to load chart</p>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Please try again later</p>
            </div>
        `;
        loading.style.display = "flex";
        canvas.style.display = "none";
    }
}

// ================= FILTER BUTTON =================
const filterBtn = document.getElementById("filterBtn");
if (filterBtn) {
    filterBtn.addEventListener("click", () => {
        let startDate = document.getElementById("startDate")?.value;
        let endDate = document.getElementById("endDate")?.value;

        if (!startDate || !endDate) {
            alert("Please select both start and end date");
            return;
        }

        startDate = new Date(startDate).toISOString().split("T")[0];
        endDate = new Date(endDate).toISOString().split("T")[0];

        loadInstallationStatusChart(adminUsername, startDate, endDate);
    });
}

// ==================== TREND CHART ====================
let trendChart = null;

async function loadTrendChart(username) {
    const loading = document.getElementById("trendLoading");
    const canvas = document.getElementById("trendChart");

    if (!loading || !canvas) return;

    loading.style.display = "flex";
    canvas.style.display = "none";
    
    loading.innerHTML = `
        <div class="spinner"></div>
        <p>Loading data...</p>
    `;

    try {
        const statsRes = await fetch(`/api/admin/statistics?username=${username}`);
        const statsData = await statsRes.json();
        const totalApplications = statsData.total_applicants || 0;
        
        const customersRes = await fetch(`/api/admin/approved-applications?username=${username}`);
        const customersData = await customersRes.json();
        const totalCustomers = Array.isArray(customersData) ? customersData.length : 0;
        
        const hasData = totalApplications > 0 || totalCustomers > 0;
        
        if (!hasData) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-chart-bar" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    <p style="color: #64748b; font-weight: 500; margin: 0;">No data available</p>
                </div>
            `;
            loading.style.display = "flex";
            canvas.style.display = "none";
            return;
        }

        const ctx = canvas.getContext('2d');

        if (trendChart) {
            trendChart.destroy();
        }

        trendChart = new Chart(ctx, {
            type: "bar",
            data: { 
                labels: ["Applications", "Customers"], 
                datasets: [{ 
                    label: "Total Count", 
                    data: [totalApplications, totalCustomers] 
                }] 
            }
        });

        canvas.style.width = '100%';
        canvas.style.maxWidth = '450px';
        canvas.style.height = '260px';
        canvas.style.margin = '0 auto';
        canvas.style.display = 'block';

        loading.style.display = "none";
        canvas.style.display = "block";

    } catch (error) {
        console.error("Error loading trend chart:", error);
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

// ================= HAMBURGER MENU TOGGLE =================
const hamburger = document.getElementById('hamburgerBtn');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (!sidebar || !hamburger) return;
    sidebar.classList.toggle('active');
    hamburger.classList.toggle('active');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

if (hamburger) {
    hamburger.addEventListener('click', toggleSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', toggleSidebar);
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        if (sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            if (hamburger) hamburger.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
});

// ================= INITIALIZE ALL DASHBOARD DATA =================
async function initializeDashboard() {
    const username = localStorage.getItem("adminUsername");
    
    if (!username) {
        console.error("No admin username found");
        return;
    }
    
    console.log("Initializing dashboard for:", username);
    
    try {
        await loadAdminProfile();
        await loadStatistics();
        await loadTotalCustomers(username);
        await loadAdminArea(username);
        await loadInstallationStatusChart(username);
        await loadTrendChart(username);
        await loadApplications();
        
        console.log("Dashboard initialization complete");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Start the dashboard
initializeDashboard();

// Initialize notification system if available
document.addEventListener("DOMContentLoaded", () => {
    if (window.NotificationSystem) {
        window.NotificationSystem.init();
    }
});