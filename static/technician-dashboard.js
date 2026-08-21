// ==================== TAB ID HELPER ====================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

// ==================== SESSION MANAGEMENT - PER TAB ====================
(function() {
    const isLoggedIn = sessionStorage.getItem('technicianId') && sessionStorage.getItem('sessionActive') === 'true';
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

// ==================== LOGOUT MODAL ====================
const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

if (logoutBtn && logoutModal) {
    // Open
    logoutBtn.addEventListener("click", function(e) {
        e.preventDefault();
        logoutModal.classList.add('show');
        document.body.style.overflow = 'hidden';
    });
    
    // Close - X button
    const closeBtnLogout = document.getElementById("closeLogoutModal");
    if (closeBtnLogout) {
        closeBtnLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Close - Cancel button
    const cancelLogout = document.getElementById("cancelLogout");
    if (cancelLogout) {
        cancelLogout.addEventListener("click", function() {
            logoutModal.classList.remove('show');
            document.body.style.overflow = '';
        });
    }
    
    // Confirm logout
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
    
    // Close on outside click
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
    profileLink.addEventListener("click", e => {
        e.preventDefault();
        const technicianId = sessionStorage.getItem("technicianId");
        if (!technicianId) {
            alert("Technician not logged in");
            return;
        }
        window.location.href = `/technician/profile?technician_id=${technicianId}`;
    });
}

// ================= LOAD TECHNICIAN PROFILE =================
async function loadTechnicianProfile() {
    const technicianId = sessionStorage.getItem("technicianId");
    if (!technicianId) {
        console.error("No technician ID found");
        return;
    }
    
    try {
        const res = await fetch(`/api/technician/profile?technician_id=${encodeURIComponent(technicianId)}`);
        if (!res.ok) throw new Error("Failed to fetch profile");
        const profile = await res.json();
        
        // Store technician info for other uses
        if (profile.technician_id) {
            localStorage.setItem("technicianId", profile.technician_id);
            sessionStorage.setItem("technicianId", profile.technician_id);
        }
        if (profile.area) {
            localStorage.setItem("technicianArea", profile.area);
            sessionStorage.setItem("technicianArea", profile.area);
        }
        
        // Update dashboard title with area
        const titleEl = document.getElementById("technicianDashboardTitle");
        if (titleEl && profile.area) {
            titleEl.textContent = `Technician Dashboard - ${profile.area}`;
        }
        
        console.log("Technician profile loaded:", profile.name);
    } catch (err) {
        console.error("Error loading technician profile:", err);
    }
}

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

// ================= DASHBOARD STATISTICS & CHARTS =================

// Chart instances
let trendChart = null;
let distributionChart = null;

const distributionCenterPlugin = {
    id: 'distributionCenterPlugin',
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
        ctx.fillText('Total Slots', centerX, centerY + 16);
        ctx.restore();
    }
};

// Current period filter
let currentPeriod = 'all-months';
let selectedMonth = null;

// Store raw data
let allSlotsData = [];
let allNapboxesData = [];

const colors = {
    available: '#10b981',  // emerald green
    occupied: '#ef4444',   // red
    primary: '#1e3a5f'     // navy blue
};

// Function to load dashboard data
async function loadDashboardData() {
    try {
        const technicianId = sessionStorage.getItem('technicianId');
        
        if (!technicianId) {
            console.error('No technician ID found');
            return;
        }
        
        const response = await fetch(`/api/technician/technician-napbox?technician_id=${encodeURIComponent(technicianId)}`);
        
        if (!response.ok) throw new Error('Failed to load dashboard data');
        
        const data = await response.json();
        allSlotsData = data.slots || [];
        allNapboxesData = data.napboxes || [];
        
        // Update stats cards
        updateStatsCards();
        
        // Update today's activity
        updateTodayActivity();
        
        // Update charts based on current period
        updateChartsByPeriod(currentPeriod);
        
        // Update recent activities
        updateRecentActivities();
        
        // Update last refresh time
        const refreshTimeEl = document.getElementById('lastRefreshTime');
        if (refreshTimeEl) {
            const now = new Date();
            refreshTimeEl.textContent = `Last updated: ${now.toLocaleTimeString()}`;
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

// Update stats cards with Today, Week, Month breakdown
function updateStatsCards() {
    const totalSlots = allSlotsData.length;
    const availableSlots = allSlotsData.filter(s => s.status === 'available').length;
    const occupiedSlots = allSlotsData.filter(s => s.status === 'occupied').length;
    const totalNapboxes = allNapboxesData.length;
    
    // Update main counts
    document.getElementById('totalSlots').textContent = totalSlots;
    document.getElementById('availableSlots').textContent = availableSlots;
    document.getElementById('occupiedSlots').textContent = occupiedSlots;
    document.getElementById('totalNapboxes').textContent = totalNapboxes;
    
    // Calculate Today, Week, Month breakdowns
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Helper function to count items by date range (for napboxes)
    function countByDateRange(items, startDate) {
        return items.filter(item => {
            const itemDate = new Date(item.created_at || item.updated_at || item.date_created);
            return itemDate >= startDate;
        }).length;
    }
    
    // Helper function to count slots by date range and status
    function countSlotsByDateRange(slots, startDate, status = null) {
        return slots.filter(slot => {
            const slotDate = new Date(slot.updated_at || slot.created_at);
            if (slotDate < startDate) return false;
            if (status !== null && slot.status !== status) return false;
            return true;
        }).length;
    }
    
    // Total Slots breakdown
    document.getElementById('slotsToday').textContent = countSlotsByDateRange(allSlotsData, todayStart);
    document.getElementById('slotsWeek').textContent = countSlotsByDateRange(allSlotsData, weekStart);
    document.getElementById('slotsMonth').textContent = countSlotsByDateRange(allSlotsData, monthStart);
    
    // Available Slots breakdown
    document.getElementById('availableToday').textContent = countSlotsByDateRange(allSlotsData, todayStart, 'available');
    document.getElementById('availableWeek').textContent = countSlotsByDateRange(allSlotsData, weekStart, 'available');
    document.getElementById('availableMonth').textContent = countSlotsByDateRange(allSlotsData, monthStart, 'available');
    
    // Occupied Slots breakdown
    document.getElementById('occupiedToday').textContent = countSlotsByDateRange(allSlotsData, todayStart, 'occupied');
    document.getElementById('occupiedWeek').textContent = countSlotsByDateRange(allSlotsData, weekStart, 'occupied');
    document.getElementById('occupiedMonth').textContent = countSlotsByDateRange(allSlotsData, monthStart, 'occupied');
    
    // NAP Boxes breakdown (Today, Week, Month) - FETCHED FROM DB
    document.getElementById('napboxesToday').textContent = countByDateRange(allNapboxesData, todayStart);
    document.getElementById('napboxesWeek').textContent = countByDateRange(allNapboxesData, weekStart);
    document.getElementById('napboxesMonth').textContent = countByDateRange(allNapboxesData, monthStart);
    
    console.log('NAP Boxes breakdown - Today:', countByDateRange(allNapboxesData, todayStart));
    console.log('NAP Boxes breakdown - Week:', countByDateRange(allNapboxesData, weekStart));
    console.log('NAP Boxes breakdown - Month:', countByDateRange(allNapboxesData, monthStart));
}

// Update charts based on time period
function updateChartsByPeriod(period) {
    currentPeriod = period;
    
    const now = new Date();
    let filteredData = [];
    
    switch(period) {
        case 'all-months':
            // Show all available data
            filteredData = allSlotsData;
            break;
        case 'day':
            filteredData = filterByDay(allSlotsData, now);
            break;
        case 'week':
            filteredData = filterByWeek(allSlotsData, now);
            break;
        case 'month':
            const monthToUse = selectedMonth ?? now.getMonth();
            const yearToUse = now.getFullYear();
            filteredData = filterByMonthIndex(allSlotsData, yearToUse, monthToUse);
            updateMonthDropdownSelection(monthToUse);
            break;
        default:
            filteredData = allSlotsData;
    }
    
    updateDistributionChart();
    updateTrendChart(filteredData, period);
}

// Filter data by day
function filterByDay(data, currentDate) {
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    
    return data.filter(slot => {
        const slotDate = new Date(slot.updated_at || slot.created_at);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === today.getTime();
    });
}

// Filter data by week
function filterByWeek(data, currentDate) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return data.filter(slot => {
        const slotDate = new Date(slot.updated_at || slot.created_at);
        return slotDate >= startOfWeek && slotDate <= endOfWeek;
    });
}

// Filter data by month
function filterByMonth(data, currentDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    return filterByMonthIndex(data, year, month);
}

function filterByMonthIndex(data, year, monthIndex) {
    return data.filter(slot => {
        const slotDate = new Date(slot.updated_at || slot.created_at);
        return slotDate.getFullYear() === year && slotDate.getMonth() === monthIndex;
    });
}

// Update distribution chart with summary stats (OCCUPIED % and AVAILABLE %)
function updateDistributionChart() {
    const available = allSlotsData.filter(s => s.status === 'available').length;
    const occupied = allSlotsData.filter(s => s.status === 'occupied').length;
    const total = available + occupied;
    
    // Calculate percentages
    const occupiedPercent = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    const availablePercent = total > 0 ? ((available / total) * 100).toFixed(1) : 0;
    
    // Update DOM elements
    const occupiedPercentEl = document.getElementById('occupiedPercent');
    const availablePercentEl = document.getElementById('availablePercent');
    
    if (occupiedPercentEl) occupiedPercentEl.textContent = `${occupiedPercent}%`;
    if (availablePercentEl) availablePercentEl.textContent = `${availablePercent}%`;
    
    // Update other summary elements
    document.getElementById('occupancyRate').textContent = `${occupiedPercent}%`;
    
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    if (distributionChart) {
        distributionChart.destroy();
    }

    const availGrad = ctx.createLinearGradient(0, 0, 0, 200);
    availGrad.addColorStop(0, '#0284c7');
    availGrad.addColorStop(1, '#0369a1');

    const occGrad = ctx.createLinearGradient(0, 0, 0, 200);
    occGrad.addColorStop(0, '#f43f5e');
    occGrad.addColorStop(1, '#be123c');
    
    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Available Slots', 'Occupied Slots'],
            datasets: [{
                data: [available, occupied],
                backgroundColor: [availGrad, occGrad],
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 6,
                cutout: '74%'
            }]
        },
        plugins: [distributionCenterPlugin],
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
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = available + occupied;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return ` ${label}: ${value} (${percentage}%)`;
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


// Update trend chart with 12-hour format
async function updateTrendChart(filteredData, period) {
    let labels = [];
    let availableData = [];
    let occupiedData = [];
    
    const now = new Date();
    
    switch(period) {
        case 'all-months':
            // Show all 12 months with aggregated data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const currentYear = now.getFullYear();
            
            for (let month = 0; month < 12; month++) {
                labels.push(months[month]);
                
                const monthAvailable = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'available' && 
                           slotDate.getMonth() === month &&
                           slotDate.getFullYear() === currentYear;
                }).length;
                
                const monthOccupied = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'occupied' && 
                           slotDate.getMonth() === month &&
                           slotDate.getFullYear() === currentYear;
                }).length;
                
                availableData.push(monthAvailable);
                occupiedData.push(monthOccupied);
            }
            break;
            
        case 'day':
            // Get 24-HOUR format data
            for (let i = 0; i <= 23; i++) {
                let hourLabel = '';
                let hourNum = i;
                
                if (hourNum === 0) hourLabel = '12 AM';
                else if (hourNum < 12) hourLabel = `${hourNum} AM`;
                else if (hourNum === 12) hourLabel = '12 PM';
                else hourLabel = `${hourNum - 12} PM`;
                
                labels.push(hourLabel);
                
                const hourAvailable = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'available' && slotDate.getHours() === i;
                }).length;
                
                const hourOccupied = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'occupied' && slotDate.getHours() === i;
                }).length;
                
                availableData.push(hourAvailable);
                occupiedData.push(hourOccupied);
            }
            break;
            
        case 'week':
            // Get daily data for this week
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + i);
                labels.push(days[currentDay.getDay()]);
                
                const dayAvailable = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'available' && 
                           slotDate.toDateString() === currentDay.toDateString();
                }).length;
                
                const dayOccupied = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'occupied' && 
                           slotDate.toDateString() === currentDay.toDateString();
                }).length;
                
                availableData.push(dayAvailable);
                occupiedData.push(dayOccupied);
            }
            break;
            
        case 'month':
            // Get daily data for the selected month (from filteredData)
            // Get the month from the first item or use current month
            let monthToShow = now.getMonth();
            if (filteredData.length > 0) {
                const firstDate = new Date(filteredData[0].updated_at || filteredData[0].created_at);
                monthToShow = firstDate.getMonth();
            }
            
            const daysInMonth = new Date(now.getFullYear(), monthToShow + 1, 0).getDate();
            
            for (let i = 1; i <= daysInMonth; i++) {
                labels.push(`${i}`);
                
                const dayAvailable = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'available' && 
                           slotDate.getDate() === i &&
                           slotDate.getMonth() === monthToShow;
                }).length;
                
                const dayOccupied = filteredData.filter(slot => {
                    const slotDate = new Date(slot.updated_at || slot.created_at);
                    return slot.status === 'occupied' && 
                           slotDate.getDate() === i &&
                           slotDate.getMonth() === monthToShow;
                }).length;
                
                availableData.push(dayAvailable);
                occupiedData.push(dayOccupied);
            }
            break;
    }
    
    
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    if (trendChart) {
        trendChart.destroy();
    }
    
    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Available Slots',
                    data: availableData,
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
                    label: 'Occupied Slots',
                    data: occupiedData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    borderWidth: 3,
                    tension: 0.25,
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointHitRadius: 12,
                    pointStyle: 'circle',
                    pointBackgroundColor: '#ef4444',
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
}

// Update distribution chart with summary stats (OCCUPIED % and AVAILABLE %)
function updateDistributionChart() {
    const available = allSlotsData.filter(s => s.status === 'available').length;
    const occupied = allSlotsData.filter(s => s.status === 'occupied').length;
    const total = available + occupied;
    
    // Calculate percentages
    const occupiedPercent = total > 0 ? ((occupied / total) * 100).toFixed(1) : 0;
    const availablePercent = total > 0 ? ((available / total) * 100).toFixed(1) : 0;
    
    // Update DOM elements
    const occupiedPercentEl = document.getElementById('occupiedPercent');
    const availablePercentEl = document.getElementById('availablePercent');
    
    if (occupiedPercentEl) occupiedPercentEl.textContent = `${occupiedPercent}%`;
    if (availablePercentEl) availablePercentEl.textContent = `${availablePercent}%`;
    
    // Update occupancy rate (keep for compatibility)
    document.getElementById('occupancyRate').textContent = `${occupiedPercent}%`;
    
    const ctx = document.getElementById('distributionChart').getContext('2d');
    
    if (distributionChart) {
        distributionChart.destroy();
    }
    
    distributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Available Slots', 'Occupied Slots'],
            datasets: [{
                data: [available, occupied],
                backgroundColor: ['#0047ab', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 15,
                cutout: '65%'
            }]
        },
        plugins: [distributionCenterPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12, weight: '500' },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleColor: '#fff',
                    bodyColor: '#cbd5e1',
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = available + occupied;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update today's activity count
function updateTodayActivity() {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const todayActivities = allSlotsData.filter(slot => {
        const slotDate = new Date(slot.updated_at || slot.created_at);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate.getTime() === today.getTime();
    }).length;
    
    document.getElementById('todayActivity').textContent = todayActivities;
    
    // Calculate average slots per NAP box
    const totalSlots = allSlotsData.length;
    const totalNapboxes = allNapboxesData.length;
    const avgSlots = totalNapboxes > 0 ? (totalSlots / totalNapboxes).toFixed(1) : 0;
    document.getElementById('avgSlotsPerNap').textContent = avgSlots;
}

// Update recent activities list - NEW DESIGN (Fixed - removed duplicate status)
function updateRecentActivities() {
    const activitiesList = document.getElementById('activitiesList');
    const activityCount = document.getElementById('activityCount');
    
    if (!activitiesList) return;
    
    // Combine slots and napboxes for activities
    const activities = [];
    
    // Add slot activities
    allSlotsData.forEach(slot => {
        const status = slot.status === 'available' ? 'available' : 'occupied';
        const statusText = slot.status === 'available' ? 'Available' : 'Occupied';
        const statusIcon = slot.status === 'available' ? 'fa-check-circle' : 'fa-user-check';
        const statusClass = slot.status === 'available' ? 'success' : 'danger';
        
        activities.push({
            type: 'slot',
            action: slot.status,
            title: `Slot ${slot.slot_number} Status Update`,
            description: `Slot status changed to ${statusText.toUpperCase()}`,
            time: slot.updated_at || slot.created_at,
            details: `NAP Box: ${slot.napbox_name || slot.napbox_id}`,
            barangay: slot.barangay,
            icon: statusIcon,
            iconClass: statusClass,
            statusText: statusText,
            statusClass: statusClass,
            borderClass: statusClass
        });
    });
    
    // Add napbox activities
    allNapboxesData.forEach(napbox => {
        const slotCount = allSlotsData.filter(s => s.napbox_id === napbox.id).length;
        activities.push({
            type: 'napbox',
            action: 'created',
            title: `NAP Box Registered`,
            description: `${napbox.name} has been added to the network`,
            time: napbox.created_at,
            details: `${slotCount} slots • Coverage: ${napbox.coverage_radius || 500}m`,
            barangay: napbox.barangay,
            icon: 'fa-network-wired',
            iconClass: 'primary',
            statusText: 'Active',
            statusClass: 'info',
            borderClass: 'info'
        });
    });
    
    // Sort by time (newest first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    // Update activity count
    if (activityCount) {
        activityCount.textContent = activities.length;
    }
    
    // Take only last 15 activities
    const recentActivities = activities.slice(0, 15);
    
    if (recentActivities.length === 0) {
        activitiesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No recent activities to display</p>
            </div>
        `;
        return;
    }
    
    activitiesList.innerHTML = recentActivities.map(activity => {
        const timeAgo = getTimeAgo(new Date(activity.time));
        const formattedDate = new Date(activity.time).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Barangay
        const barangayHtml = activity.barangay ? `
            <span class="activity-meta-item barangay">
                <i class="fas fa-map-marker-alt"></i>
                <span class="meta-label">Barangay</span>
                <span class="meta-value">${escapeHtml(activity.barangay)}</span>
            </span>
        ` : '';
        
        return `
            <div class="activity-card ${activity.borderClass || 'primary'}">
                <div class="activity-card-inner">
                    <div class="activity-left">
                        <div class="activity-icon-circle ${activity.iconClass || 'primary'}">
                            <i class="fas ${activity.icon || 'fa-circle'}"></i>
                        </div>
                        <div class="activity-line"></div>
                    </div>
                    <div class="activity-right">
                        <div class="activity-top">
                            <div class="activity-title-text">${escapeHtml(activity.title)}</div>
                            <span class="activity-tag ${activity.statusClass || 'pending'}">${activity.statusText || 'Pending'}</span>
                        </div>
                        <div class="activity-body">
                            <div class="activity-desc">
                                <i class="fas fa-file-alt"></i>
                                ${escapeHtml(activity.description)}
                            </div>
                            <div class="activity-meta-items">
                                <span class="activity-meta-item">
                                    <i class="fas fa-box"></i>
                                    <span class="meta-label">Details</span>
                                    <span class="meta-value">${escapeHtml(activity.details)}</span>
                                </span>
                                ${barangayHtml}
                            </div>
                        </div>
                        <div class="activity-footer">
                            <span class="activity-date">
                                <i class="far fa-calendar"></i>
                                ${formattedDate}
                            </span>
                            <span class="activity-dot">•</span>
                            <span class="activity-time-ago">
                                <i class="far fa-clock"></i>
                                ${timeAgo}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Helper function to get time ago
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
}

// Helper function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
        // Progress bar uses the infinite sweep animation (set in CSS)
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ================= INITIALIZE DASHBOARD WITH DATA =================
async function initializeDashboardWithData() {
    const technicianId = sessionStorage.getItem("technicianId");
    
    if (!technicianId) {
        console.error("No technician ID found, redirecting to login...");
        window.location.replace("/");
        return;
    }
    
    console.log("Initializing dashboard with data for technician:", technicianId);
    
    try {
        await loadTechnicianProfile();
        await loadDashboardData();
        
        // Setup time filter listeners
        setupTimeFilters();
        
        // Auto-refresh every 30 seconds unless the Slot Status Trend is currently scoped to a selected month.
        setInterval(() => {
            if (currentPeriod === 'month') {
                return;
            }
            loadDashboardData();
        }, 30000);
        
        console.log("Dashboard initialization complete");
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

// Setup time filter buttons and month dropdown
function setupTimeFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab:not(.dropdown-toggle)');
    const monthDropdownBtn = document.getElementById('monthDropdownBtn');
    const monthDropdownMenu = document.getElementById('monthDropdownMenu');
    
    // Populate month dropdown
    populateMonthDropdown();
    
    // Today and Week filter tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs (except dropdown toggle)
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            // Add active class to clicked
            this.classList.add('active');
            
            // Remove active from dropdown toggle if it's active
            if (monthDropdownBtn) {
                monthDropdownBtn.classList.remove('active');
            }
            
            const period = this.dataset.period;
            currentPeriod = period;
            updateChartsByPeriod(period);
            
            // Close month dropdown if open
            if (monthDropdownMenu) {
                monthDropdownMenu.classList.remove('show');
            }
        });
    });
    
    // Month dropdown toggle
    if (monthDropdownBtn && monthDropdownMenu) {
        // Remove any existing event listeners by cloning
        const newBtn = monthDropdownBtn.cloneNode(true);
        monthDropdownBtn.parentNode.replaceChild(newBtn, monthDropdownBtn);
        const newMenu = monthDropdownMenu.cloneNode(true);
        monthDropdownMenu.parentNode.replaceChild(newMenu, monthDropdownMenu);
        
        // Get fresh references
        const freshBtn = document.getElementById('monthDropdownBtn');
        const freshMenu = document.getElementById('monthDropdownMenu');
        
        if (!freshBtn || !freshMenu) return;
        
        // Toggle dropdown on button click
        freshBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Toggle active state
            this.classList.toggle('active');
            freshMenu.classList.toggle('show');
            
            // Remove active from other tabs
            document.querySelectorAll('.filter-tab:not(.dropdown-toggle)').forEach(t => t.classList.remove('active'));
            
            console.log('Dropdown toggled:', freshMenu.classList.contains('show')); // Debug
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!freshBtn.contains(e.target) && !freshMenu.contains(e.target)) {
                freshBtn.classList.remove('active');
                freshMenu.classList.remove('show');
            }
        });
        
        // Month item click handler
        freshMenu.addEventListener('click', function(e) {
            const monthItem = e.target.closest('.month-item');
            if (!monthItem) return;
            
            const monthValue = monthItem.dataset.month;
            const monthLabel = monthItem.textContent.trim();
            
            // Update button label
            const labelSpan = freshBtn.querySelector('#selectedMonthLabel');
            if (labelSpan) {
                labelSpan.textContent = monthLabel;
            }
            
            // Update active state
            freshMenu.querySelectorAll('.month-item').forEach(item => {
                item.classList.remove('active');
            });
            monthItem.classList.add('active');
            
            // Set active state on button
            freshBtn.classList.add('active');
            
            // Close dropdown
            freshMenu.classList.remove('show');
            freshBtn.classList.remove('active');
            
            // Update period and charts
            currentPeriod = 'month';
            selectedMonth = parseInt(monthValue);
            updateChartsByMonth(selectedMonth);
        });
    }
    
}

// Populate month dropdown with 3-letter month names
function populateMonthDropdown() {
    const menu = document.getElementById('monthDropdownMenu');
    if (!menu) return;
    
    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const currentMonth = new Date().getMonth();
    
    menu.innerHTML = months.map((month, index) => {
        const isCurrent = index === currentMonth;
        return `<button class="month-item${isCurrent ? ' active' : ''}" data-month="${index}">${month}</button>`;
    }).join('');
    
    // Update label to current month
    const labelSpan = document.getElementById('selectedMonthLabel');
    if (labelSpan) {
        labelSpan.textContent = months[currentMonth];
    }
}

// New function to update charts by specific month
function updateChartsByMonth(monthIndex) {
    const now = new Date();
    const year = now.getFullYear();
    
    // Filter data for the selected month
    const filteredData = allSlotsData.filter(slot => {
        const slotDate = new Date(slot.updated_at || slot.created_at);
        return slotDate.getFullYear() === year && slotDate.getMonth() === monthIndex;
    });
    
    // Update the trend chart with month data
    updateTrendChart(filteredData, 'month');
    
    // Update distribution chart (shows overall status)
    updateDistributionChart();
}



// Helper to update month dropdown selection
function updateMonthDropdownSelection(monthIndex) {
    const menu = document.getElementById('monthDropdownMenu');
    const btn = document.getElementById('monthDropdownBtn');
    const labelSpan = document.getElementById('selectedMonthLabel');
    
    if (menu) {
        menu.querySelectorAll('.month-item').forEach(item => {
            item.classList.toggle('active', parseInt(item.dataset.month) === monthIndex);
        });
    }
    
    if (labelSpan) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labelSpan.textContent = months[monthIndex] || 'This Month';
    }
    
    if (btn) {
        btn.classList.add('active');
    }
}

// Start dashboard
initializeDashboardWithData();

// Export for global access
window.refreshDashboard = loadDashboardData;

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;

    // Initialize notification system
    if (window.TechnicianNotificationSystem) {
        window.TechnicianNotificationSystem.init();
    }
    
    // Start dashboard
    await initializeDashboardWithData();
});

// Start the dashboard (fallback if DOMContentLoaded already fired)
if (document.readyState === 'complete') {
    (async function() {
        const isValid = await checkSession();
        if (!isValid) return;
        await initializeDashboardWithData();
    })();
}

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