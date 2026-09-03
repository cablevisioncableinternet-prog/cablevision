// ==================== ADMIN DASHBOARD JS WITH EXCEL EXPORT ====================

// ==================== GET TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== GET ADMIN USERNAME FROM FLASK SESSION ====================
async function getAdminUsername() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.username) {
                localStorage.setItem('adminUsername', data.username);
                sessionStorage.setItem('adminUsername', data.username);
                return data.username;
            }
        }
    } catch (error) {
        console.error('Error getting admin username from session:', error);
    }
    return localStorage.getItem('adminUsername') || null;
}

// ==================== GET ADMIN AREA FROM FLASK SESSION ====================
async function getAdminArea() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.area) {
                localStorage.setItem('adminArea', data.area);
                sessionStorage.setItem('adminArea', data.area);
                return data.area;
            }
        }
    } catch (error) {
        console.error('Error getting admin area from session:', error);
    }
    return localStorage.getItem('adminArea') || null;
}

// ==================== SESSION MANAGEMENT - WITH TAB ID ====================
async function checkSession() {
    const tabId = getTabId();
    const isLoggedIn = sessionStorage.getItem('adminUsername') && sessionStorage.getItem('sessionActive') === 'true';
    
    if (!isLoggedIn) {
        window.location.replace('/');
        return false;
    }
    
    try {
        const response = await fetch(`/api/admin/verify-session?tab_id=${tabId}`);
        const data = await response.json();
        if (!data.valid) {
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace('/');
            return false;
        }
        return true;
    } catch (error) {
        console.error('Session verification failed:', error);
        return false;
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
    if (type !== 'loading') {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

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
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    const cancelLogout = document.getElementById("cancelLogout");
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    const confirmLogout = document.getElementById("confirmLogout");
    if (confirmLogout) {
        confirmLogout.addEventListener("click", function() {
            const tabId = getTabId();
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tab_id: tabId })
            }).catch(() => {});

            // 👇 sessionStorage lang ang i-clear (per-tab na 'to, safe)
            sessionStorage.clear();
            // ❌ HUWAG: localStorage.clear();  <- ito ang sumisira sa ibang tab

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

// ================= PROFILE LINK =================
const profileLink = document.getElementById("profileLink");
if (profileLink) {
    profileLink.addEventListener("click", async (e) => {
        e.preventDefault();
        const adminUsername = await getAdminUsername();
        const tabId = getTabId();
        if (!adminUsername) {
            alert("Admin not logged in");
            return;
        }
        window.location.href = `/admin/profile?username=${adminUsername}&tab_id=${tabId}`;
    });
}

// ================= LOAD APPLICATIONS - WITH TAB ID =================
const applicationsTableBody = document.querySelector("#applicationsTable tbody");
let adminUsername = null;

async function loadApplications() {
    adminUsername = await getAdminUsername();
    if (!adminUsername) return;
    const tabId = getTabId();
    try {
        const res = await fetch(`/api/admin/internet-applications?username=${adminUsername}&tab_id=${tabId}`);
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
    const tabId = getTabId();
    fetch(`/api/admin/internet-applications?username=${adminUsername}&tab_id=${tabId}`)
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
        const tabId = getTabId();
        const res = await fetch(`/api/admin/promos?tab_id=${tabId}`);
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
        const tabId = getTabId();
        
        try {
            await fetch("/api/admin/promos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, desc, tab_id: tabId })
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

// ==================== FETCH ACTIVE APPLICATIONS WITH COUNTS - WITH TAB ID ====================
async function fetchActiveApplicationsCount() {
    const username = await getAdminUsername();
    const tabId = getTabId();
    if (!username) return 0;
    
    try {
        const res = await fetch(`/api/admin/internet-applications?username=${username}&tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch applications");
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
        if (totalApplicantsSpan) totalApplicantsSpan.textContent = activeCount;

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
    } catch (err) {
        console.error("Error fetching active applications:", err);
        return 0;
    }
}

// ==================== LOAD STATISTICS - WITH TAB ID ====================
async function loadStatistics() {
    const username = await getAdminUsername();
    const tabId = getTabId();
    if (!username) return;
    
    try {
        const res = await fetch(`/api/admin/statistics?username=${username}&tab_id=${tabId}`);
        const data = await res.json();

        const plansList = document.getElementById("popularPlans");
        if (plansList && data.popular_plans) {
            plansList.innerHTML = "";
            for (const plan in data.popular_plans) {
                const li = document.createElement("li");
                li.textContent = plan + " : " + data.popular_plans[plan];
                plansList.appendChild(li);
            }
        }
        
        await fetchActiveApplicationsCount();
        
    } catch (err) {
        console.error("Failed to load statistics:", err);
    }
}

// ================= LOAD TOTAL CUSTOMERS WITH COUNTS - WITH TAB ID =================
async function loadTotalCustomers() {
    const username = await getAdminUsername();
    const tabId = getTabId();
    if (!username) return 0;
    
    try {
        const response = await fetch(`/api/admin/internet-applications?username=${username}&tab_id=${tabId}`);
        const data = await response.json();
        
        let applicationsArray = [];
        if (Array.isArray(data)) {
            applicationsArray = data;
        } else if (data && data.data) {
            applicationsArray = data.data;
        } else if (data && data.applications) {
            applicationsArray = data.applications;
        } else {
            applicationsArray = Object.values(data).find(val => Array.isArray(val)) || [];
        }
        
        const totalCustomers = applicationsArray.length;
        const totalCustomersEl = document.getElementById("totalCustomers");
        if (totalCustomersEl) totalCustomersEl.textContent = totalCustomers;
        
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayCount = 0, weekCount = 0, monthCount = 0;

        applicationsArray.forEach(application => {
            let createdDate = null;
            
            if (application.date_submitted) {
                createdDate = new Date(application.date_submitted);
            } else if (application.timestamp) {
                createdDate = new Date(application.timestamp);
            } else if (application.created_at) {
                createdDate = new Date(application.created_at);
            } else if (application.date_created) {
                createdDate = new Date(application.date_created);
            } else if (application.approval_date) {
                createdDate = new Date(application.approval_date);
            }
            
            if (createdDate && !isNaN(createdDate.getTime())) {
                if (createdDate >= todayStart) todayCount++;
                if (createdDate >= weekStart) weekCount++;
                if (createdDate >= monthStart) monthCount++;
            }
        });

        const customersToday = document.getElementById("customersToday");
        const customersWeek = document.getElementById("customersWeek");
        const customersMonth = document.getElementById("customersMonth");

        if (customersToday) customersToday.textContent = todayCount;
        if (customersWeek) customersWeek.textContent = weekCount;
        if (customersMonth) customersMonth.textContent = monthCount;
        
        return totalCustomers;
    } catch (error) {
        console.error("Error loading total customers:", error);
        return 0;
    }
}

// ==================== LOAD ADMIN PROFILE - WITH TAB ID ====================
async function loadAdminProfile() {
    const adminUsername = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsername) {
        console.error("No admin username found");
        return;
    }
    
    try {
        const res = await fetch(`/api/admin/profile?username=${encodeURIComponent(adminUsername)}&tab_id=${tabId}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        // Hindi na nagdi-display ng pangalan sa profile
        // const profileNameSpan = document.getElementById("profileName");
        // if (profileNameSpan) {
        //     profileNameSpan.textContent = profile.username || profile.name || "Admin";
        // }
        
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
        // Hindi na nagdi-display ng pangalan sa profile
        // const profileNameSpan = document.getElementById("profileName");
        // if (profileNameSpan) profileNameSpan.textContent = "Admin";
    }
}

// ================= LOAD ADMIN AREA - WITH TAB ID =================
async function loadAdminArea() {
    const username = await getAdminUsername();
    const tabId = getTabId();
    if (!username) return;
    try {
        const response = await fetch(`/api/admin/profile?username=${encodeURIComponent(username)}&tab_id=${tabId}`);
        const data = await response.json();
        const area = data.area || "Unknown";
        const titleEl = document.getElementById("adminDashboardTitle");
        if (titleEl) titleEl.textContent = `Administrator Dashboard - ${area}`;
    } catch (error) {
        console.error("Error loading admin area:", error);
    }
}

// ================= LOAD INSTALLATION CHART - WITH CANCELLED & TERMINATED =================
let installationChart = null;

const installationCenterPlugin = {
    id: 'installationCenterPlugin',
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

async function loadInstallationStatusChart(username, startDate = "", endDate = "") {
    const tabId = getTabId();
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
        let url = `/api/admin/installation-summary?username=${username}&tab_id=${tabId}`;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        // ✅ GAMITIN ANG LABELS AT VALUES KUNG MERON
        let labels = [];
        let counts = [];
        
        if (data.labels && data.values) {
            labels = data.labels;
            counts = data.values;
        } else {
            // Fallback: gamitin ang installation_summary
            const summary = data.installation_summary || {};
            const orderedStatuses = ["Pending", "Ongoing", "Installed", "Cancelled", "Terminated"];
            labels = orderedStatuses;
            counts = orderedStatuses.map(status => summary[status] || 0);
        }
        
        const total = counts.reduce((a, b) => a + b, 0);

        const hasData = counts.length > 0 && counts.some(count => count > 0);
        
        if (!hasData) {
            loading.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <i class="fas fa-chart-pie" style="font-size: 48px; color: #cbd5e1; margin-bottom: 12px; display: block;"></i>
                    <p style="color: #64748b; font-weight: 500; margin: 0;">No installation data available</p>
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
                    borderColor: '#ffffff',
                    hoverOffset: 6,
                    cutout: '74%'
                }]
            },
            plugins: [installationCenterPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: {
                            font: { size: 12, weight: '600', family: 'Inter, sans-serif' },
                            padding: 18,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            color: '#475569'
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#ffffff',
                        bodyColor: '#cbd5e1',
                        padding: 12,
                        cornerRadius: 10,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const val = context.parsed || 0;
                                const totalVal = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : 0;
                                return ` ${label}: ${val} (${pct}%)`;
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

        loading.style.display = "none";
        canvas.style.display = "block";

    } catch (error) {
        console.error("Error loading installation chart:", error);
        loading.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 12px; display: block;"></i>
                <p style="color: #dc2626; font-weight: 500; margin: 0;">Failed to load chart</p>
            </div>
        `;
        loading.style.display = "flex";
        canvas.style.display = "none";
    }
}

// ================= LOAD ADMIN AREA PLAN CHART =================
let adminAreaPlanChart = null;

async function loadAdminAreaPlanChartData(username) {
    const tabId = getTabId();
    const areaCanvas = document.getElementById("adminAreaPlanChart");
    const loading = document.getElementById("adminPlanLoading");

    if (!areaCanvas || !loading) return;

    loading.style.display = "flex";
    areaCanvas.style.display = "none";

    try {
        const [plansRes, applicationsRes] = await Promise.all([
            fetch('/api/superadmin/plans'),
            fetch(`/api/admin/internet-applications?username=${username}&tab_id=${tabId}`)
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

        renderAdminAreaPlanChart({ labels, values });
    } catch (error) {
        console.error('Error loading admin area plan chart data:', error);
        renderAdminAreaPlanChart({ labels: ['No Plans'], values: [0] });
    }
}

function renderAdminAreaPlanChart({ labels = [], values = [] } = {}) {
    const areaCanvas = document.getElementById("adminAreaPlanChart");
    if (!areaCanvas) return;

    if (adminAreaPlanChart) adminAreaPlanChart.destroy();

    const safeLabels = labels.length ? labels : ['No Plans'];
    const safeValues = labels.length ? values : [0];

    areaCanvas.style.height = '320px';

    const loading = document.getElementById("adminPlanLoading");
    if (loading) loading.style.display = 'none';

    adminAreaPlanChart = new Chart(areaCanvas, {
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

    areaCanvas.style.display = 'block';
}

// ================= FILTER BUTTON =================
const filterBtn = document.getElementById("filterBtn");
if (filterBtn) {
    filterBtn.addEventListener("click", () => {
        let startDate = document.getElementById("startDate")?.value;
        let endDate = document.getElementById("endDate")?.value;

        if (!startDate || !endDate) {
            showToast("Please select both start and end date", "warning");
            return;
        }

        loadInstallationStatusChart(adminUsername, startDate, endDate);
    });
}

// ================= RESET FILTER BUTTON =================
const resetFilterBtn = document.getElementById("resetFilterBtn");
if (resetFilterBtn) {
    resetFilterBtn.addEventListener("click", () => {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");

        if (startDateInput) startDateInput.value = "";
        if (endDateInput) endDateInput.value = "";

        const loading = document.getElementById("chartLoading");
        if (loading) loading.style.display = "flex";

        loadInstallationStatusChart(adminUsername, "", "");
        showToast("Filters reset successfully", "success");
    });
}

// ================= TREND CHART - WITH MONTH/YEAR FILTER =================
let trendChart = null;

function populateTrendFilterSelects() {
    const yearSelect = document.getElementById("trendYearFilter");
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear + 1];
    yearSelect.innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join("");
    yearSelect.value = String(currentYear);

    const monthSelect = document.getElementById("trendMonthFilter");
    if (monthSelect) {
        monthSelect.value = "all";
    }
}

function parseTrendDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function loadTrendChart(username, selectedMonth = "all", selectedYear = String(new Date().getFullYear())) {
    const tabId = getTabId();
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
        const [applicationsRes, customersRes] = await Promise.all([
            fetch(`/api/admin/internet-applications?username=${username}&tab_id=${tabId}`),
            fetch(`/api/admin/approved-applications?username=${username}&tab_id=${tabId}`)
        ]);

        const applications = await applicationsRes.json();
        const customers = await customersRes.json();

        const appItems = Array.isArray(applications) ? applications : [];
        const customerItems = Array.isArray(customers) ? customers : [];

        let labels = [];
        let appData = [];
        let customerData = [];

        if (selectedMonth === "all") {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            appData = Array(12).fill(0);
            customerData = Array(12).fill(0);

            appItems.forEach(app => {
                const date = parseTrendDate(app.date_submitted || app.timestamp || app.created_at || app.date_created);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                appData[date.getMonth()] += 1;
            });

            customerItems.forEach(customer => {
                const date = parseTrendDate(customer.approval_date || customer.date_submitted || customer.created_at || customer.timestamp);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                customerData[date.getMonth()] += 1;
            });
        } else {
            const monthIndex = Number(selectedMonth) - 1;
            const daysInMonth = new Date(Number(selectedYear), Number(selectedMonth), 0).getDate();
            labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
            appData = Array(daysInMonth).fill(0);
            customerData = Array(daysInMonth).fill(0);

            appItems.forEach(app => {
                const date = parseTrendDate(app.date_submitted || app.timestamp || app.created_at || app.date_created);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                if (date.getMonth() !== monthIndex) return;
                appData[date.getDate() - 1] += 1;
            });

            customerItems.forEach(customer => {
                const date = parseTrendDate(customer.approval_date || customer.date_submitted || customer.created_at || customer.timestamp);
                if (!date || date.getFullYear() !== Number(selectedYear)) return;
                if (date.getMonth() !== monthIndex) return;
                customerData[date.getDate() - 1] += 1;
            });
        }

        const hasData = appData.some(value => value > 0) || customerData.some(value => value > 0);

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

        const ctx = canvas.getContext('2d');

        if (trendChart) {
            trendChart.destroy();
        }

        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Applications',
                        data: appData,
                        borderColor: '#0b3d91',
                        backgroundColor: 'rgba(11, 61, 145, 0.12)',
                        borderWidth: 3,
                        tension: 0.25,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHitRadius: 12,
                        pointStyle: 'circle',
                        pointBackgroundColor: '#0b3d91',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    },
                    {
                        label: 'Customers',
                        data: customerData,
                        borderColor: '#0f766e',
                        backgroundColor: 'rgba(15, 118, 110, 0.12)',
                        borderWidth: 3,
                        tension: 0.25,
                        fill: false,
                        pointRadius: 5,
                        pointHoverRadius: 7,
                        pointHitRadius: 12,
                        pointStyle: 'circle',
                        pointBackgroundColor: '#0f766e',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                layout: {
                    padding: { top: 16, right: 16, bottom: 8, left: 16 }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        border: { color: '#1f2937', width: 1.5 },
                        grid: { color: 'rgba(15, 23, 42, 0.18)', drawBorder: true },
                        ticks: {
                            precision: 0,
                            callback: function(value) {
                                if (Number.isInteger(value)) return value;
                                return Math.round(value);
                            },
                            font: { size: 11, weight: '700', family: 'Inter, sans-serif' },
                            color: '#1f2937'
                        }
                    },
                    x: {
                        border: { color: '#1f2937', width: 1.5 },
                        grid: { color: 'rgba(15, 23, 42, 0.18)', drawBorder: true },
                        ticks: {
                            font: { size: 11, weight: '700', family: 'Inter, sans-serif' },
                            color: '#1f2937'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            pointStyle: 'circle',
                            boxWidth: 32,
                            boxHeight: 10,
                            padding: 18,
                            color: '#111827',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderColor: '#111827',
                            borderWidth: 1,
                            borderRadius: 8,
                            font: { size: 12, weight: '700', family: 'Inter, sans-serif' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.92)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
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
                    easing: 'easeOutQuart'
                }
            }
        });

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

const trendFilterBtn = document.getElementById("trendFilterBtn");
if (trendFilterBtn) {
    trendFilterBtn.addEventListener("click", async () => {
        const month = document.getElementById("trendMonthFilter")?.value || "all";
        const year = document.getElementById("trendYearFilter")?.value || String(new Date().getFullYear());
        const username = await getAdminUsername();

        if (username) {
            await loadTrendChart(username, month, year);
        }
    });
}

const trendResetBtn = document.getElementById("trendResetBtn");
if (trendResetBtn) {
    trendResetBtn.addEventListener("click", async () => {
        const monthSelect = document.getElementById("trendMonthFilter");
        const yearSelect = document.getElementById("trendYearFilter");

        if (monthSelect) monthSelect.value = "all";
        if (yearSelect) yearSelect.value = String(new Date().getFullYear());

        const username = await getAdminUsername();
        if (username) {
            await loadTrendChart(username, "all", String(new Date().getFullYear()));
        }
    });
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
    if (window.innerWidth > 768 && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ================= EXPORT CUSTOMERS DATA TO EXCEL - WITH TAB ID =================
async function exportCustomersData() {
    const username = await getAdminUsername();
    const tabId = getTabId();
    if (!username) {
        showToast("No admin username found", "error");
        return;
    }
    
    const exportBtn = document.getElementById("exportDataBtn");
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    exportBtn.disabled = true;
    
    try {
        let startDate = document.getElementById("startDate")?.value;
        let endDate = document.getElementById("endDate")?.value;
        
        let url = `/api/admin/export-customers-excel?username=${encodeURIComponent(username)}&tab_id=${tabId}`;
        if (startDate && endDate) {
            url += `&start_date=${startDate}&end_date=${endDate}`;
        }
        
        const link = document.createElement("a");
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("Exporting data to Excel...", "success");
        
    } catch (error) {
        console.error("Export error:", error);
        showToast("Failed to export data: " + error.message, "error");
    } finally {
        setTimeout(() => {
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }, 2000);
    }
}

// Setup export button
function setupExportButton() {
    const exportBtn = document.getElementById("exportDataBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", exportCustomersData);
    }
}

// ==================== RE-INITIALIZE NOTIFICATIONS AFTER TAB SWITCH ====================
// 👇 ITO ANG SUSI PARA MA-REFRESH ANG NOTIFICATIONS PAGKATAPOS MAG-SWITCH NG TAB
async function reinitializeNotifications() {
    if (window.AdminNotificationSystem) {
        console.log('Re-initializing notifications for current tab...');
        window.AdminNotificationSystem.adminId = null;
        window.AdminNotificationSystem.adminArea = null;
        await window.AdminNotificationSystem.fetchNotifications();
    }
}

// ================= INITIALIZE ALL DASHBOARD DATA =================
let adminUsernameGlobal = null;

// Replace your existing initializeDashboard function with this updated version
async function initializeDashboard() {
    adminUsernameGlobal = await getAdminUsername();
    const tabId = getTabId();
    
    if (!adminUsernameGlobal) {
        console.error("No admin username found in session");
        window.location.replace('/');
        return;
    }
    
    console.log("Initializing dashboard for:", adminUsernameGlobal);
    console.log("Tab ID:", tabId);
    
    try {
        adminUsername = adminUsernameGlobal;
        
        const isValid = await checkSession();
        if (!isValid) return;
        
        await loadAdminProfile();
        await loadStatistics();
        await loadTotalCustomers();
        await loadAdminArea();
        
        // SETUP DATE VALIDATION
        setupAdminDateValidation();
        
        populateTrendFilterSelects();
        await loadInstallationStatusChart(adminUsernameGlobal);
        await loadAdminAreaPlanChartData(adminUsernameGlobal);
        await loadTrendChart(adminUsernameGlobal, "all", String(new Date().getFullYear()));
        await loadApplications();
        setupExportButton();
        
        // Initialize filter buttons with validation
        initAdminFilterButtonWithValidation();
        initAdminResetFilterButton();
        
        // Re-initialize notifications after dashboard loads
        setTimeout(async () => {
            await reinitializeNotifications();
        }, 500);
        
        console.log("Dashboard initialization complete");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Start the dashboard
initializeDashboard();

// ==================== DOM CONTENT LOADED EVENTS ====================
document.addEventListener("DOMContentLoaded", () => {
    // Initialize notification system
    if (window.AdminNotificationSystem) {
        console.log('Initializing Admin Notification System...');
        window.AdminNotificationSystem.init();
    }
    
    // Re-initialize notifications after a short delay
    setTimeout(async () => {
        await reinitializeNotifications();
    }, 1000);
});

// ==================== VISIBILITY CHANGE EVENT - PAGBALIK SA TAB ====================
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
        console.log(' Tab became visible, refreshing notifications...');
        if (window.AdminNotificationSystem) {
            window.AdminNotificationSystem.adminId = null;
            window.AdminNotificationSystem.adminArea = null;
            await window.AdminNotificationSystem.fetchNotifications();
        }
    }
});

// ==================== PROFILE DROPDOWN CHEVRON ====================
(function() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            profileBtn.classList.toggle('active');
        });
    }
})();



// ==================== DATE INPUT VALIDATION FOR ADMIN ====================
function setupAdminDateValidation() {
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
        errorMsg.style.cssText = 'color: #ef4444; font-size: 10px; font-weight: 500; margin-top: 4px; display: none;';
        startDateGroup.appendChild(errorMsg);
    }
    
    if (endDateGroup && !endDateGroup.querySelector('.date-error')) {
        const errorMsg = document.createElement('span');
        errorMsg.className = 'date-error';
        errorMsg.id = 'endDateError';
        errorMsg.textContent = 'End date must be after start date';
        errorMsg.style.cssText = 'color: #ef4444; font-size: 10px; font-weight: 500; margin-top: 4px; display: none;';
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
                startDateError.style.display = 'block';
            }
            showToast('Start date cannot be in the future', 'error');
            return;
        }
        
        if (startDateError) {
            startDateError.style.display = 'none';
        }
        
        // Update end date min attribute
        if (startDate) {
            endDateInput.setAttribute('min', startDate);
        } else {
            endDateInput.removeAttribute('min');
        }
        
        // Validate end date if it exists
        if (endDateInput.value) {
            validateAdminEndDate();
        }
    });

    // End date validation function
    function validateAdminEndDate() {
        const startDate = startDateInput.value;
        const endDate = endDateInput.value;
        const endDateError = document.getElementById('endDateError');
        
        if (!endDateError) return false;
        
        // Check if end date is after start date
        if (startDate && endDate && endDate < startDate) {
            endDateError.textContent = 'End date must be after start date';
            endDateError.style.display = 'block';
            endDateInput.value = '';
            showToast('End date must be after start date', 'error');
            return false;
        }
        
        // Check if end date is in future
        if (endDate && endDate > todayStr) {
            endDateError.textContent = 'End date cannot be in the future';
            endDateError.style.display = 'block';
            endDateInput.value = '';
            showToast('End date cannot be in the future', 'error');
            return false;
        }
        
        endDateError.style.display = 'none';
        return true;
    }
    
    endDateInput.addEventListener('change', validateAdminEndDate);

    // Also validate on blur
    endDateInput.addEventListener('blur', function() {
        const endDateError = document.getElementById('endDateError');
        if (this.value && endDateError) {
            const startDate = startDateInput.value;
            if (startDate && this.value < startDate) {
                endDateError.textContent = 'End date must be after start date';
                endDateError.style.display = 'block';
            } else if (this.value && this.value > todayStr) {
                endDateError.textContent = 'End date cannot be in the future';
                endDateError.style.display = 'block';
            }
        }
    });

    // Clear error on focus
    startDateInput.addEventListener('focus', function() {
        const startDateError = document.getElementById('startDateError');
        if (startDateError) startDateError.style.display = 'none';
    });
    
    endDateInput.addEventListener('focus', function() {
        const endDateError = document.getElementById('endDateError');
        if (endDateError) endDateError.style.display = 'none';
    });
}

// ==================== ENHANCED ADMIN FILTER BUTTON WITH DATE VALIDATION ====================
function initAdminFilterButtonWithValidation() {
    const filterBtn = document.getElementById("filterBtn");
    if (!filterBtn) return;
    
    // Remove existing click listeners
    const newFilterBtn = filterBtn.cloneNode(true);
    filterBtn.parentNode.replaceChild(newFilterBtn, filterBtn);
    
    newFilterBtn.addEventListener("click", async function() {
        const startDateInput = document.getElementById("startDate");
        const endDateInput = document.getElementById("endDate");
        
        let startDate = startDateInput ? startDateInput.value : "";
        let endDate = endDateInput ? endDateInput.value : "";
        
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Validate: Start date cannot be in future
        if (startDate && startDate > todayStr) {
            showToast("Start date cannot be in the future", "error");
            const startDateError = document.getElementById('startDateError');
            if (startDateError) {
                startDateError.textContent = 'Start date cannot be in the future';
                startDateError.style.display = 'block';
            }
            return;
        }
        
        // Validate: End date cannot be in future
        if (endDate && endDate > todayStr) {
            showToast("End date cannot be in the future", "error");
            const endDateError = document.getElementById('endDateError');
            if (endDateError) {
                endDateError.textContent = 'End date cannot be in the future';
                endDateError.style.display = 'block';
            }
            return;
        }
        
        // Validate: End date must be after start date
        if (startDate && endDate && endDate < startDate) {
            showToast("End date must be after start date", "error");
            const endDateError = document.getElementById('endDateError');
            if (endDateError) {
                endDateError.textContent = 'End date must be after start date';
                endDateError.style.display = 'block';
            }
            return;
        }
        
        // Validate: Both dates required if one is selected
        if ((startDate && !endDate) || (!startDate && endDate)) {
            showToast("Please select both start and end date", "error");
            return;
        }
        
        // Clear any error messages
        const startDateError = document.getElementById('startDateError');
        const endDateError = document.getElementById('endDateError');
        if (startDateError) startDateError.style.display = 'none';
        if (endDateError) endDateError.style.display = 'none';
        
        const loading = document.getElementById("chartLoading");
        if (loading) loading.style.display = "flex";
        
        const username = await getAdminUsername();
        loadInstallationStatusChart(username, startDate, endDate);
    });
}

// ==================== UPDATED ADMIN RESET FILTER BUTTON ====================
function initAdminResetFilterButton() {
    const resetBtn = document.getElementById("resetFilterBtn");
    if (resetBtn) {
        // Remove existing click listeners
        const newResetBtn = resetBtn.cloneNode(true);
        resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
        
        newResetBtn.addEventListener("click", async () => {
            const startDateInput = document.getElementById("startDate");
            const endDateInput = document.getElementById("endDate");

            if (startDateInput) {
                startDateInput.value = "";
                startDateInput.removeAttribute('max');
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                startDateInput.setAttribute('max', todayStr);
            }
            if (endDateInput) {
                endDateInput.value = "";
                endDateInput.removeAttribute('max');
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                endDateInput.setAttribute('max', todayStr);
                endDateInput.removeAttribute('min');
            }
            
            // Clear error messages
            const startDateError = document.getElementById('startDateError');
            const endDateError = document.getElementById('endDateError');
            if (startDateError) startDateError.style.display = 'none';
            if (endDateError) endDateError.style.display = 'none';

            const loading = document.getElementById("chartLoading");
            if (loading) loading.style.display = "flex";

            const username = await getAdminUsername();
            loadInstallationStatusChart(username, "", "");
            showToast("Filters reset successfully", "success");
        });
    }
}