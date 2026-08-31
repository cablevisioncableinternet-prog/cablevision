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

// ==================== DEFAULT TECHNICIANS (FALLBACK) ====================
const DEFAULT_TECHNICIANS = {
    'PILA': 'TPIL-0001',
    'PAGSANJAN': 'TPSN-0001', 
    'SANTA CRUZ': 'TSTC-0001',
    'MAGDALENA': 'TMAG-0001'
};

// ==================== INITIALIZATION ====================
async function initTechnicianData() {
    let technicianId = sessionStorage.getItem('technicianId');
    let technicianArea = sessionStorage.getItem('technicianArea');
    
    // Try to get technician_id from URL first
    if (!technicianId) {
        const urlParams = new URLSearchParams(window.location.search);
        const techIdFromUrl = urlParams.get('technician_id');
        if (techIdFromUrl) {
            technicianId = techIdFromUrl;
            sessionStorage.setItem('technicianId', technicianId);
        }
    }
    
    // If still no technician_id, prompt user
    if (!technicianId) {
        const area = prompt(
            'Please select your assigned area:\n\n' +
            '1 - PILA\n2 - PAGSANJAN\n3 - SANTA CRUZ\n4 - MAGDALENA\n\nEnter number (1-4):'
        );
        
        switch(area) {
            case '1': technicianId = DEFAULT_TECHNICIANS.PILA; technicianArea = 'PILA'; break;
            case '2': technicianId = DEFAULT_TECHNICIANS.PAGSANJAN; technicianArea = 'PAGSANJAN'; break;
            case '3': technicianId = DEFAULT_TECHNICIANS.SANTA_CRUZ; technicianArea = 'SANTA CRUZ'; break;
            case '4': technicianId = DEFAULT_TECHNICIANS.MAGDALENA; technicianArea = 'MAGDALENA'; break;
            default: technicianId = DEFAULT_TECHNICIANS.PILA; technicianArea = 'PILA'; break;
        }
        
        sessionStorage.setItem('technicianId', technicianId);
        sessionStorage.setItem('technicianArea', technicianArea);
    }
    
    // If technicianId exists but no area, derive from ID
    if (technicianId && !technicianArea) {
        if (technicianId === 'TPIL-0001') technicianArea = 'PILA';
        else if (technicianId === 'TPSN-0001') technicianArea = 'PAGSANJAN';
        else if (technicianId === 'TSTC-0001') technicianArea = 'SANTA CRUZ';
        else if (technicianId === 'TMAG-0001') technicianArea = 'MAGDALENA';
        if (technicianArea) sessionStorage.setItem('technicianArea', technicianArea);
    }
    
    // ✅ Fetch technician details including team_id from backend
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/profile?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
        const data = await res.json();
        
        if (data.team_id) {
            sessionStorage.setItem('technicianTeamId', data.team_id);
            console.log(`✅ Technician belongs to team: ${data.team_id}`);
        } else {
            console.log('⚠️ Technician has no team assigned, falling back to area-based');
            sessionStorage.removeItem('technicianTeamId');
        }
        
        if (data.area) {
            sessionStorage.setItem('technicianArea', data.area);
        }
        
        if (data.name) {
            sessionStorage.setItem('technicianName', data.name);
        }
        
        return { technicianId, technicianArea, teamId: data.team_id };
    } catch (err) {
        console.error('Error fetching technician profile:', err);
        return { technicianId, technicianArea, teamId: null };
    }
}

// Call initialization
let technicianData = null;
initTechnicianData().then(data => {
    technicianData = data;
    console.log('✅ Technician initialized:', technicianData);
});

// ==================== GLOBAL VARIABLES ====================
let currentCustomer = null;
let currentNapboxId = null;
let currentNapboxName = null;
let allCustomers = [];
let searchTimeout = null;

// ==================== VALIDATE INSTALLATION DATE (FOR BUTTON ENABLING) ====================
function canAssignSlotNow(installationDate) {
    if (!installationDate) {
        return { 
            canAssign: false, 
            message: 'No installation date set' 
        };
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const installDate = new Date(installationDate);
    installDate.setHours(0, 0, 0, 0);
    
    // 🔥 KUNG PAREHAS NG ARAW (TODAY == INSTALLATION DATE) - PWEDE
    if (installDate.getTime() === today.getTime()) {
        return { 
            canAssign: true, 
            message: 'Today is the installation date! You can assign the slot now.' 
        };
    }
    
    // 🔥 KUNG NAKALIPAS NA (TODAY > INSTALLATION DATE) - PWEDE PA RIN!
    if (installDate < today) {
        const daysPast = Math.floor((today - installDate) / (1000 * 60 * 60 * 24));
        return { 
            canAssign: true, 
            message: `Installation date was ${daysPast} day(s) ago. You can still assign the slot.` 
        };
    }
    
    // 🔥 KUNG HINDI PA ARAW NG INSTALLATION (TODAY < INSTALLATION DATE) - DISABLED
    if (installDate > today) {
        const diffDays = Math.ceil((installDate - today) / (1000 * 60 * 60 * 24));
        return { 
            canAssign: false, 
            message: `Installation date is in ${diffDays} day(s). Please wait until the installation date to assign the slot.` 
        };
    }
    
    return { 
        canAssign: false, 
        message: 'Installation date is not valid.' 
    };
}

// ==================== SET DEFAULT INSTALLATION DATE ====================
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const installationDateInput = document.getElementById('installationDate');
if (installationDateInput) installationDateInput.valueAsDate = tomorrow;

// ==================== (LEGACY) ORANGE NOTICE HELPERS ====================
// ✅ No longer used for NAP box status messaging (see renderNapboxBanner below),
// kept only so nothing else in the codebase breaks if it's still referenced.
function showModalNotice(messageHtml, type = 'info', showGoToNapbox = false) {
    const notice = document.getElementById('assignModalNotice');
    const noticeText = document.getElementById('assignModalNoticeText');
    if (!notice || !noticeText) return;

    let goToNapboxHtml = '';
    if (showGoToNapbox) {
        goToNapboxHtml = `
            <div style="margin-top: 10px;">
                <button id="goToNapboxBtn" class="napbox-setup-btn">
                    <i class="fas fa-plus-circle"></i> Add NAP Box
                </button>
            </div>
        `;
    }

    notice.className = `napbox-setup-banner ${type}`;
    noticeText.innerHTML = messageHtml + goToNapboxHtml;
    notice.style.display = 'flex';
    notice.style.alignItems = 'flex-start';
    notice.style.justifyContent = 'flex-start';
}

function hideModalNotice() {
    const notice = document.getElementById('assignModalNotice');
    const noticeText = document.getElementById('assignModalNoticeText');
    if (!notice || !noticeText) return;
    notice.style.display = 'none';
    noticeText.innerHTML = '';
}

// ==================== UNIFIED NAP BOX INFO BANNER ====================
// ✅ Iisang consistent na blue banner design (kagaya ng dating "System Assigned
// NAP Box" look) para sa LAHAT ng scenario: system-assigned, coverage-detected,
// at walang na-detect na NAP box. Laging naka-render sa #preferredNapboxInfo.
// ==================== UNIFIED NAP BOX INFO BANNER ====================
// ==================== UNIFIED NAP BOX INFO BANNER ====================
// ==================== UNIFIED NAP BOX INFO BANNER ====================
function renderNapboxBanner(options) {
    const {
        type,
        napboxName = '',
        reasonMessage = '',
        coordsHtml = '',
        showGoToNapbox = false,
        installationDate = null,
        barangay = null
    } = options || {};

    const preferredInfo = document.getElementById('preferredNapboxInfo');
    if (!preferredInfo) return;

    // ---- Installation date line ----
    let installDateDisplay = '';
    if (installationDate) {
        const dateObj = new Date(installationDate);
        if (!isNaN(dateObj.getTime())) {
            const result = canAssignSlotNow(installationDate);
            const dateColor = result.canAssign ? '#22c55e' : '#f59e0b';
            const dateIcon = result.canAssign ? 'fa-check-circle' : 'fa-clock';
            installDateDisplay = `<div style="font-size:11px; color:${dateColor}; margin-top:4px;">
                <i class="fas ${dateIcon}"></i> 
                <strong>Scheduled Installation Date:</strong> ${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                ${!result.canAssign ? `<span style="color:#f59e0b; margin-left:8px;">(Please wait until installation date)</span>` : ''}
            </div>`;
        }
    }

    // ---- Barangay line ----
    const barangayDisplay = barangay
        ? `<div style="font-size:11px; color:#64748b; margin-top:4px;"><i class="fas fa-map-marker-alt"></i> Barangay: ${escapeHtml(barangay)}</div>`
        : '';

    // ---- Type-specific content ----
    let icon = 'fa-robot';
    let title = 'System Assigned NAP Box:';
    let bodyHtml = '';

    if (type === 'assigned') {
        icon = 'fa-robot';
        title = `System Assigned NAP Box: <span style="font-weight:700; color:#1e293b;">${escapeHtml(napboxName)}</span>`;
        bodyHtml = `
            <div style="font-size:11px; color:#64748b; margin-top:2px;">
                <i class="fas fa-info-circle"></i> 
                The system automatically assigned the nearest NAP Box based on the customer's pinned location.
                Please assign an available slot from this NAP Box.
            </div>
        `;
    } else if (type === 'detected') {
        icon = 'fa-map-marker-alt';
        title = `NAP Box Detected Near This Location: <span style="font-weight:700; color:#1e293b;">${escapeHtml(napboxName)}</span>`;
        bodyHtml = `
            <div style="font-size:11px; color:#64748b; margin-top:2px;">
                <i class="fas fa-info-circle"></i> 
                This NAP Box is within the coverage radius of the customer's pinned location. Please select it below and assign an available slot.
            </div>
        `;
    } else if (type === 'not_found') {
        icon = 'fa-exclamation-triangle';
        title = 'No NAP Box Available:';
        bodyHtml = `
            <div style="font-size:12px; color:#1e293b; margin-top:2px;">
                ${reasonMessage}
            </div>
        `;
    } else if (type === 'error') {
        icon = 'fa-triangle-exclamation';
        title = 'Error:';
        bodyHtml = `
            <div style="font-size:12px; color:#1e293b; margin-top:2px;">
                ${reasonMessage || 'Failed to load NAP boxes. Please try again.'}
            </div>
        `;
    }

    // ---- Add NAP Box button (upper right corner) ----
    let goToNapboxHtml = '';
    if (showGoToNapbox) {
        goToNapboxHtml = `
            <button id="goToNapboxBtn" class="napbox-setup-btn" type="button">
                <i class="fas fa-plus-circle"></i> Add NAP Box
            </button>
        `;
    }

    // ---- NOTICE CARD (Unang card - dito nakalagay ang notice) ----
    let noticeCardHtml = `
        <div style="background:#fef9e7; padding:12px 16px; border-radius:8px; margin-bottom:10px; border-left: 4px solid #f59e0b;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
                <i class="fas ${icon}" style="color:#d97706; font-size:18px; margin-top:2px; flex-shrink:0;"></i>
                <div style="flex:1; min-width:0;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                        <strong style="color:#92400e; font-size:13px;">${title}</strong>
                        ${goToNapboxHtml}
                    </div>
                    ${bodyHtml}
                    ${installDateDisplay}
                    ${barangayDisplay}
                </div>
            </div>
        </div>
    `;

    // ❌ TINANGGAL NA ANG COORDINATES CARD - hindi na ito kasama sa render

    // ✅ I-render lang ang notice card, wala nang coords card
    preferredInfo.innerHTML = noticeCardHtml;
}

function savePendingAssignmentContext() {
    const modalCustomerName = document.getElementById('modalCustomerName')?.value || '';
    const modalApplicationNumber = document.getElementById('modalApplicationNumber')?.value || '';
    const modalContractNumber = document.getElementById('modalContractNumber')?.value || '';
    const installationDateField = document.getElementById('installationDate')?.value || '';

    const context = {
        application_number: currentCustomer?.application_number || modalApplicationNumber,
        customer_name: currentCustomer?.name || modalCustomerName,
        contract_number: currentCustomer?.contract_number || modalContractNumber,
        installation_date: currentCustomer?.installation_date || installationDateField,
        returnToAssignModal: true,
        customer_latitude: currentCustomer?.latitude || null,
        customer_longitude: currentCustomer?.longitude || null,
        customer_barangay: currentCustomer?.barangay || null
    };

    sessionStorage.setItem('pendingAssignmentContext', JSON.stringify(context));
}

function restorePendingAssignmentFlow() {
    const pendingAssignmentContext = sessionStorage.getItem('pendingAssignmentContext');
    if (!pendingAssignmentContext) return false;

    try {
        const pendingData = JSON.parse(pendingAssignmentContext);
        const hasUsefulData = pendingData.returnToAssignModal || pendingData.application_number || pendingData.contract_number || pendingData.customer_name;

        if (!hasUsefulData) {
            sessionStorage.removeItem('pendingAssignmentContext');
            return false;
        }

        const appNumber = pendingData.application_number || '';
        const customerName = pendingData.customer_name || '';
        const contractNumber = pendingData.contract_number || '';
        const installationDate = pendingData.installation_date || '';
        // ✅ Ibalik din ang lat/lng/barangay - kailangan ito dahil hindi pa
        // laman ang allCustomers array sa oras na tumatakbo ito (mas maaga
        // pa kaysa loadCustomers()), kaya kung hindi ito ipapasa, mafa-fallback
        // sa null ang coverage/barangay filter at lalabas lahat ng NAP boxes.
        const customerLat = pendingData.customer_latitude || null;
        const customerLng = pendingData.customer_longitude || null;
        const customerBarangay = pendingData.customer_barangay || null;

        sessionStorage.removeItem('pendingAssignmentContext');
        openAssignModal(appNumber, customerName, contractNumber, installationDate, customerLat, customerLng, customerBarangay);
        return true;
    } catch (err) {
        console.error('Error restoring pending assignment flow:', err);
        sessionStorage.removeItem('pendingAssignmentContext');
        return false;
    }
}

// ✅ Event delegation - gumagana kahit paulit-ulit na na-re-render ang button
// (dating issue: nawawala ang click listener kada showModalNotice() rebuild)
function attachAssignModalNoticeHandlers() {
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('#goToNapboxBtn');
        if (!btn) return;

        savePendingAssignmentContext();
        const pendingContext = JSON.parse(sessionStorage.getItem('pendingAssignmentContext') || '{}');
        const query = new URLSearchParams({
            from_assign_modal: '1',
            customer_latitude: pendingContext.customer_latitude || '',
            customer_longitude: pendingContext.customer_longitude || ''
        }).toString();
        window.location.href = `/technician/technician-napbox?${query}`;
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        attachAssignModalNoticeHandlers();
        restorePendingAssignmentFlow();
    });
} else {
    attachAssignModalNoticeHandlers();
    restorePendingAssignmentFlow();
}

// ==================== LOAD CUSTOMERS (TEAM-BASED) ====================
async function loadCustomers() {
    const tbody = document.getElementById('customersBody');
    const technicianId = sessionStorage.getItem('technicianId');
    
    if (!technicianId) {
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Please login again.</p></div></td></tr>`;
        document.getElementById('customerCount').innerText = '0';
        return;
    }
    
    try {
        const searchTerm = document.getElementById('searchInput').value;
        let url = `/api/technician/pending-customers?technician_id=${encodeURIComponent(technicianId)}&limit=100`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        
        const tabId = getTabId();
        const res = await fetch(`${url}&tab_id=${tabId}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        allCustomers = data.customers || [];
        
        // ✅ Display team info if available
        if (data.team_id) {
            console.log(`📋 Showing customers for team: ${data.team_id}`);
        } else {
            console.log(`📋 Showing customers for area: ${data.technician_area}`);
        }
        
        renderCustomers(allCustomers);
        document.getElementById('customerCount').innerText = allCustomers.length;
        
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Error loading customers: ${err.message}</p></div></td></tr>`;
    }
}

// ==================== RENDER CUSTOMERS ====================
function renderCustomers(customers) {
    const tbody = document.getElementById('customersBody');
    
    if (!customers || customers.length === 0) {
        const teamId = sessionStorage.getItem('technicianTeamId');
        const message = teamId ? 'No customers assigned to your team' : 'No customers found in your area';
        tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><i class="fas fa-inbox"></i><p>${message}</p></div></td></tr>`;
        return;
    }
    
    tbody.innerHTML = customers.map(cust => {
        const hasSlot = cust.assigned_slot !== null && cust.assigned_slot !== undefined;
        const contractNumber = cust.contract_number || 'N/A';
        const installationStatus = cust.installation_status || 'Pending';
        const installationDate = cust.installation_date || null;
        
        // ✅ KUNIN ANG COORDINATES PARA MAIPASA SA MODAL
        const lat = cust.latitude || '';
        const lng = cust.longitude || '';
        
        let slotDisplay = '';
        if (hasSlot) {
            slotDisplay = `<span class="slot-badge"><i class="fas fa-check-circle"></i> Slot ${cust.assigned_slot.slot_number}<br><small>${cust.assigned_slot.napbox_name || ''}</small></span>`;
        } else {
            const assignedNapbox = cust.preferred_napbox_name ? `System: ${cust.preferred_napbox_name}` : 'No slot assigned';
            slotDisplay = `<span class="slot-badge" style="background:#dbeafe; color:#0047ab;">${assignedNapbox}</span>`;
        }
        
        // Status mapping
        let statusClass = '';
        let statusText = '';
        if (installationStatus === 'Pending') {
            statusClass = 'status-pending';
            statusText = 'Not Assigned';
        } else if (installationStatus === 'Slot Assigned') {
            statusClass = 'status-slot-assigned';
            statusText = 'Slot Assigned';
        } else if (installationStatus === 'Ongoing') {
            statusClass = 'status-ongoing';
            statusText = 'Ongoing';
        } else if (installationStatus === 'Installed') {
            statusClass = 'status-installed';
            statusText = 'Installed';
        } else {
            statusClass = 'status-pending';
            statusText = 'Not Assigned';
        }
        
        // Format installation date
        let installDateDisplay = '';
        if (installationDate) {
            const dateObj = new Date(installationDate);
            installDateDisplay = `<br><small style="color:#64748b;"> ${dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</small>`;
        }
        
        // Action button
        let actionButton = '';
        if (installationStatus === 'Installed') {
            actionButton = `<button class="btn-completed" disabled><i class="fas fa-check-circle"></i> Completed</button>`;
        } else if (installationStatus === 'Ongoing') {
            actionButton = `<button class="btn-installed" onclick="updateInstallationStatus('${cust.application_number}', 'Installed', '${escapeHtml(cust.first_name || '')} ${escapeHtml(cust.last_name || '')}')"><i class="fas fa-check"></i> Mark Installed</button>`;
        } else if (installationStatus === 'Slot Assigned' || hasSlot) {
            actionButton = `<button class="btn-ongoing" onclick="updateInstallationStatus('${cust.application_number}', 'Ongoing', '${escapeHtml(cust.first_name || '')} ${escapeHtml(cust.last_name || '')}')"><i class="fas fa-play"></i> Start Installation</button>`;
        } else {
            // ✅ KUNIN ANG BARANGAY PARA MAIPASA
            const barangay = cust.barangay || '';
            if (cust.preferred_napbox_id) {
                actionButton = `<button class="btn-assign" onclick="openAssignModalWithPreferredNapbox('${cust.application_number}', '${escapeHtml(cust.first_name || '')} ${escapeHtml(cust.last_name || '')}', '${cust.preferred_napbox_id}', '${escapeHtml(cust.preferred_napbox_name || '')}', '${contractNumber}', '${installationDate || ''}')"><i class="fas fa-plus-circle"></i> Assign Slot</button>`;
            } else {
                actionButton = `<button class="btn-assign" onclick="openAssignModal('${cust.application_number}', '${escapeHtml(cust.first_name || '')} ${escapeHtml(cust.last_name || '')}', '${contractNumber}', '${installationDate || ''}', '${lat}', '${lng}', '${barangay}')"><i class="fas fa-plus-circle"></i> Assign Slot</button>`;
            }
        }
        
        // ✅ DOWNLOAD BUTTON
        const downloadButton = `
            <button class="btn-download" onclick="downloadApplicationForm('${cust.application_number}')" title="Download Application Form">
                <i class="fas fa-file-pdf"></i> PDF
            </button>
        `;
        
        return `
            <tr>
                <td><strong>${escapeHtml(cust.application_number)}</strong></td>
                <td><strong>${escapeHtml(contractNumber)}</strong>${installDateDisplay}</td>
                <td>${escapeHtml(cust.first_name || '')} ${escapeHtml(cust.last_name || '')}</td>
                <td>${escapeHtml(cust.mobile || 'N/A')}<br><small>${escapeHtml(cust.email || '')}</small></td>
                <td>${escapeHtml(cust.plan || 'N/A')}</td>
                <td>${escapeHtml(cust.barangay || 'N/A')}</td>
                <td style="text-align: center;">${slotDisplay}</td>
                <td style="text-align: center;"><span class="${statusClass}">${statusText}</span></td>
                <td style="text-align: center;">${actionButton}</td>
                <td style="text-align: center;">${downloadButton}</td>
            </tr>
        `;
    }).join('');
}

// ==================== DOWNLOAD APPLICATION FORM ====================
window.downloadApplicationForm = async function(applicationNumber) {
    if (!applicationNumber) {
        showToast('Application number is required', 'error');
        return;
    }
    
    // Find the button and show loading state
    const buttons = document.querySelectorAll('.btn-download');
    let targetBtn = null;
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(applicationNumber)) {
            targetBtn = btn;
        }
    });
    
    if (targetBtn) {
        targetBtn.classList.add('loading');
        targetBtn.innerHTML = '<i class="fas fa-spinner"></i> Loading...';
        targetBtn.disabled = true;
    }
    
    try {
        showToast('Generating application form...', 'loading');
        
        // Call the download endpoint
        const tabId = getTabId();
        const response = await fetch(`/superadmin/download/pdf/${applicationNumber}?tab_id=${tabId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/pdf',
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Failed to download application form');
        }
        
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Application_Form_${applicationNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showToast('Application form downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Download error:', error);
        showToast(error.message || 'Failed to download application form', 'error');
    } finally {
        // Restore button state
        if (targetBtn) {
            targetBtn.classList.remove('loading');
            targetBtn.innerHTML = '<i class="fas fa-file-pdf"></i> PDF';
            targetBtn.disabled = false;
        }
    }
};

// ==================== UPDATE INSTALLATION STATUS (WITH MODAL) ====================
let pendingStatusUpdate = null;

function showConfirmStatusModal(applicationNumber, customerName, newStatus) {
    // Determine status details
    const isOngoing = newStatus === 'Ongoing';
    const isInstalled = newStatus === 'Installed';
    
    // Find the customer data
    const customer = allCustomers.find(c => c.application_number === applicationNumber);
    const currentStatus = customer ? customer.installation_status || 'Pending' : 'Unknown';
    
    // Set modal content based on status
    const icon = document.getElementById('statusModalIcon');
    const header = document.querySelector('.confirm-status-modal-header');
    const notice = document.querySelector('.confirm-status-notice');
    const confirmBtn = document.getElementById('confirmStatusAction');
    const title = document.getElementById('confirmStatusTitle');
    const text = document.getElementById('confirmStatusText');
    const noticeTitle = document.getElementById('statusNoticeTitle');
    const noticeMsg = document.getElementById('statusNoticeMessage');
    
    // Remove existing classes
    header.className = 'confirm-status-modal-header';
    icon.className = 'confirm-status-modal-icon';
    notice.className = 'confirm-status-notice';
    confirmBtn.className = 'btn btn-confirm-status';
    
    if (isOngoing) {
        header.classList.add('ongoing');
        icon.classList.add('ongoing');
        notice.classList.add('ongoing');
        confirmBtn.classList.add('ongoing');
        icon.innerHTML = '<i class="fas fa-play"></i>';
        title.textContent = 'Start Installation';
        text.textContent = `You are about to start the installation for ${customerName}.`;
        noticeTitle.textContent = 'What happens next?';
        noticeMsg.textContent = 'The installation status will be updated to "Ongoing". This means the technician is currently working on the installation.';
        confirmBtn.innerHTML = '<i class="fas fa-play"></i> Start Installation';
    } else if (isInstalled) {
        header.classList.add('installed');
        icon.classList.add('installed');
        notice.classList.add('installed');
        confirmBtn.classList.add('installed');
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
        title.textContent = 'Mark as Installed';
        text.textContent = `You are about to mark the installation for ${customerName} as COMPLETED.`;
        noticeTitle.textContent = 'What happens next?';
        noticeMsg.textContent = 'The installation status will be updated to "Installed". This means the installation is complete and the customer\'s service is active.';
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Mark Installed';
    }
    
    // Set customer details
    document.getElementById('confirmStatusCustomerName').textContent = customerName;
    document.getElementById('confirmStatusApplicationNumber').textContent = applicationNumber;
    document.getElementById('confirmStatusCurrentStatus').textContent = currentStatus;
    document.getElementById('confirmStatusNewStatus').textContent = newStatus;
    
    // Save pending data
    pendingStatusUpdate = {
        applicationNumber: applicationNumber,
        newStatus: newStatus,
        customerName: customerName
    };
    
    // Show modal
    const modal = document.getElementById('confirmStatusModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeConfirmStatusModal() {
    const modal = document.getElementById('confirmStatusModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
    pendingStatusUpdate = null;
}

async function executeConfirmStatus() {
    if (!pendingStatusUpdate) return;
    
    const { applicationNumber, newStatus, customerName } = pendingStatusUpdate;
    
    // Close modal
    closeConfirmStatusModal();
    
    showToast(`Updating status...`, 'loading');
    
    const technicianId = sessionStorage.getItem('technicianId');
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/update-installation-status?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                application_number: applicationNumber,
                installation_status: newStatus,
                technician_id: technicianId,
                tab_id: tabId
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            loadCustomers();
        } else {
            showToast(data.error || 'Update failed', 'error');
        }
    } catch (err) {
        showToast('Error updating status', 'error');
    }
}

// ==================== UPDATE INSTALLATION STATUS (ORIGINAL - PALITAN) ====================
window.updateInstallationStatus = async function(applicationNumber, newStatus, customerName) {
    // ✅ GAMITIN ANG MODAL IMBES NA confirm()
    showConfirmStatusModal(applicationNumber, customerName, newStatus);
};

// ==================== OPEN ASSIGN MODAL WITH PREFERRED NAPBOX ====================
window.openAssignModalWithPreferredNapbox = async function(appNumber, customerName, napboxId, napboxName, contractNumber, installationDate) {
    // ✅ KUNIN ANG CUSTOMER DATA PARA SA BARANGAY, LATITUDE, LONGITUDE
    // (kailangan ang lat/lng para may pang-fallback tayo sa coverage-radius
    // detection kung sakaling fully occupied na ang preferred napbox)
    const customer = allCustomers.find(c => c.application_number === appNumber);
    const barangay = customer?.barangay || null;
    const lat = customer?.latitude || null;
    const lng = customer?.longitude || null;
    
    currentCustomer = { 
        application_number: appNumber, 
        name: customerName, 
        contract_number: contractNumber,
        installation_date: installationDate,
        barangay: barangay,
        latitude: lat,
        longitude: lng
    };
    currentNapboxId = napboxId;
    currentNapboxName = napboxName;
    
    document.getElementById('modalCustomerName').value = customerName;
    document.getElementById('modalApplicationNumber').value = appNumber;
    document.getElementById('modalContractNumber').value = contractNumber;
    
    // 🔥 I-DISABLE ANG ASSIGN BUTTON SA SIMULA - "Select slot first"
    const confirmBtn = document.getElementById('confirmAssignBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';
    
    // ✅ I-set ang installation date sa input field
    const installationDateInput = document.getElementById('installationDate');
    let canAssign = false;
    let formattedDate = installationDate;
    
    if (installationDateInput) {
        if (installationDate) {
            const dateObj = new Date(installationDate);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
                installationDateInput.value = formattedDate;
                
                const result = canAssignSlotNow(formattedDate);
                canAssign = result.canAssign;
                
                if (canAssign) {
                    installationDateInput.style.borderColor = '#22c55e';
                } else {
                    installationDateInput.style.borderColor = '#f59e0b';
                    installationDateInput.title = result.message;
                }
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                installationDateInput.valueAsDate = tomorrow;
                canAssign = false;
            }
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            installationDateInput.valueAsDate = tomorrow;
            canAssign = false;
        }
        installationDateInput.readOnly = true;
    }
    
    // ✅ Buksan muna ang modal at ipakita ang "checking" state habang
    // vine-verify natin kung may available pa talagang slot sa preferred
    // NAP box (maaaring na-fully occupied na ito simula noong nag-apply
    // ang customer).
    const napboxSelect = document.getElementById('napboxSelect');
    napboxSelect.innerHTML = '<option value="">Checking NAP box availability...</option>';
    napboxSelect.disabled = true;
    document.getElementById('slotSelect').innerHTML = '<option value="" disabled selected>Loading slots...</option>';
    document.getElementById('slotSelect').disabled = true;
    document.getElementById('assignModal').classList.add('show');
    
    // ✅ I-CHECK MUNA KUNG MAY AVAILABLE PA BANG SLOT SA PREFERRED NAP BOX
    let preferredHasSlots = false;
    try {
        const tabId = getTabId();
        const checkRes = await fetch(`/api/technician/available-slots-for-napbox/${napboxId}?tab_id=${tabId}`);
        const checkData = await checkRes.json();
        preferredHasSlots = !!(checkData.slots && checkData.slots.length > 0);
    } catch (err) {
        console.error('Error checking preferred NAP box availability:', err);
        preferredHasSlots = false; // ✅ safe fallback: ituring na unavailable
    }
    
    if (!preferredHasSlots) {
        // ⚠️ Fully occupied na ang system-assigned NAP box (o nag-error ang check).
        // I-fallback sa coverage-radius detection - kaparehong behavior ng
        // regular na openAssignModal() - para makahanap ng ibang NAP box na
        // may available pa, o kung wala talaga, lalabas ang "No NAP Box
        // Available" banner na naka-enable ang dropdown (hindi naka-lock).
        currentNapboxId = null;
        currentNapboxName = null;
        showToast('The system-assigned NAP box is now fully occupied. Checking for other available NAP boxes nearby...', 'warning');
        loadNapboxes(lat, lng, barangay, formattedDate, canAssign);
        return;
    }
    
    // ✅ MAY AVAILABLE PA SA PREFERRED - ITULOY ANG DATING BEHAVIOR (locked selection)
    
    // ✅ KUNG HINDI PA PWEDE MAG-ASSIGN - DISABLE LAHAT NG SELECTIONS
    if (!canAssign) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Select slot first';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.title = '';
        
        napboxSelect.disabled = true;
        
        const slotSelect = document.getElementById('slotSelect');
        slotSelect.disabled = true;
        slotSelect.innerHTML = '<option value="">Installation date not yet</option>';
        
        showToast('Please wait until the installation date to assign a slot.', 'warning');
    } else {
        napboxSelect.disabled = true; // Still disabled kasi may preferred na
        
        const slotSelect = document.getElementById('slotSelect');
        slotSelect.disabled = false;
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Select slot first';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.title = '';
    }
    
    // ✅ Consistent blue banner (same design ginagamit sa lahat ng scenario)
    renderNapboxBanner({
        type: 'assigned',
        napboxName: napboxName,
        installationDate: formattedDate,
        barangay: barangay
    });
    
    napboxSelect.innerHTML = `<option value="${napboxId}" selected>${escapeHtml(napboxName)} (System Assigned)</option>`;
    napboxSelect.disabled = true; // Always disabled for preferred napbox
    
    // ✅ I-LOAD ANG SLOTS KUNG PWEDE NA MAG-ASSIGN
    if (canAssign) {
        loadSlotsForNapbox(napboxId);
    } else {
        const slotSelect = document.getElementById('slotSelect');
        slotSelect.innerHTML = '<option value="" disabled selected>Please wait until installation date</option>';
        slotSelect.disabled = true;
    }
};

window.openAssignModal = function(appNumber, customerName, contractNumber, installationDate, customerLat = null, customerLng = null, customerBarangay = null) {
    // ✅ KUNIN ANG CUSTOMER DATA PARA SA LATITUDE, LONGITUDE, AT BARANGAY
    const customer = allCustomers.find(c => c.application_number === appNumber);
    const lat = customerLat || customer?.latitude || null;
    const lng = customerLng || customer?.longitude || null;
    const barangay = customerBarangay || customer?.barangay || null;
    
    currentCustomer = { 
        application_number: appNumber, 
        name: customerName, 
        contract_number: contractNumber,
        installation_date: installationDate,
        latitude: lat,
        longitude: lng,
        barangay: barangay
    };
    currentNapboxId = null;
    currentNapboxName = null;
    
    document.getElementById('modalCustomerName').value = customerName;
    document.getElementById('modalApplicationNumber').value = appNumber;
    document.getElementById('modalContractNumber').value = contractNumber;
    
    // 🔥 I-DISABLE ANG ASSIGN BUTTON SA SIMULA - "Select slot first"
    const confirmBtn = document.getElementById('confirmAssignBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';
    
    // ✅ I-set ang installation date sa input field
    const installationDateInput = document.getElementById('installationDate');
    let canAssign = false;
    let formattedDate = installationDate;
    
    if (installationDateInput) {
        if (installationDate) {
            const dateObj = new Date(installationDate);
            if (!isNaN(dateObj.getTime())) {
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
                installationDateInput.value = formattedDate;
                
                const result = canAssignSlotNow(formattedDate);
                canAssign = result.canAssign;
                
                if (canAssign) {
                    installationDateInput.style.borderColor = '#22c55e';
                } else {
                    installationDateInput.style.borderColor = '#f59e0b';
                    installationDateInput.title = result.message;
                }
            } else {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                installationDateInput.valueAsDate = tomorrow;
                canAssign = false;
            }
        } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            installationDateInput.valueAsDate = tomorrow;
            canAssign = false;
        }
        installationDateInput.readOnly = true;
    }
    
    const napboxSelect = document.getElementById('napboxSelect');
    const slotSelect = document.getElementById('slotSelect');

    // 🔥 I-DISABLE MUNA HABANG NAGLO-LOAD/NAG-DDETECT NG NAP BOX
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';

    napboxSelect.disabled = true;
    napboxSelect.innerHTML = '<option value="">Loading NAP boxes...</option>';

    slotSelect.innerHTML = '<option value="" disabled selected>-- First select NAP Box --</option>';
    slotSelect.disabled = true;

    // ✅ I-CLEAR ANG DATING BANNER (bago i-render ulit ng loadNapboxes)
    const preferredInfo = document.getElementById('preferredNapboxInfo');
    if (preferredInfo) preferredInfo.innerHTML = '';
    hideModalNotice();

    // ✅ LAGING I-DETECT ANG NAP BOX SA COVERAGE RADIUS - kahit pa hindi araw ng
    // installation - para consistent ang banner sa lahat ng scenario. Ang
    // pag-enable/disable ng dropdown at button na lang ang depende sa canAssign.
    loadNapboxes(lat, lng, barangay, formattedDate, canAssign);
    
    document.getElementById('assignModal').classList.add('show');
};

// ==================== LOAD SLOTS FOR NAPBOX ====================
async function loadSlotsForNapbox(napboxId) {
    const slotSelect = document.getElementById('slotSelect');
    const confirmBtn = document.getElementById('confirmAssignBtn');
    
    slotSelect.innerHTML = '<option value="" disabled selected>Loading slots...</option>';  // ✅ DISABLED
    slotSelect.disabled = true;
    
    // 🔥 I-DISABLE ANG BUTTON HABANG NAGLO-LOAD
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';
    
    // ✅ I-STORE ANG CURRENT INSTALLATION DATE PARA MAGAMIT SA RESTORE
    const installationDateInput = document.getElementById('installationDate');
    const installationDate = installationDateInput ? installationDateInput.value : null;
    const canAssignResult = installationDate ? canAssignSlotNow(installationDate) : { canAssign: false, message: 'No installation date set' };
    
    // ✅ KUNG HINDI PA PWEDE, HUWAG NA MAG-LOAD
    if (!canAssignResult.canAssign) {
        slotSelect.innerHTML = `<option value="" disabled selected>${canAssignResult.message}</option>`;
        slotSelect.disabled = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Select slot first';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        return;
    }
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/available-slots-for-napbox/${napboxId}?tab_id=${tabId}`);
        const data = await res.json();
        
        if (data.slots && data.slots.length > 0) {
            // ✅ ANG UNANG OPTION AY DISABLED PLACEHOLDER
            slotSelect.innerHTML = '<option value="" disabled selected>-- Select Slot --</option>';
            data.slots.forEach(slot => {
                slotSelect.innerHTML += `<option value="${slot.id}">Slot ${slot.slot_number}</option>`;
            });
            slotSelect.disabled = false;
            showToast(`${data.slots.length} available slots found in this NAP Box`, 'success');
            
            // ✅ I-RESTORE ANG BUTTON - "Select slot first" pa rin (disabled)
            confirmBtn.textContent = 'Select slot first';
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            confirmBtn.title = '';
        } else {
            slotSelect.innerHTML = '<option value="" disabled selected>No available slots in this NAP Box</option>';
            slotSelect.disabled = true;
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'No slots available';
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            showToast('No available slots in the customer\'s selected NAP Box', 'warning');
        }
    } catch (err) {
        console.error('Error loading slots:', err);
        slotSelect.innerHTML = '<option value="" disabled selected>Error loading slots</option>';
        slotSelect.disabled = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Error loading slots';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        showToast('Error loading slots', 'error');
    }
}

// ==================== LOAD NAP BOXES (COVERAGE-BASED DETECTION) ====================
async function loadNapboxes(customerLat = null, customerLng = null, customerBarangay = null, installationDate = null, canAssignOverride = null) {
    const napboxSelect = document.getElementById('napboxSelect');
    const slotSelect = document.getElementById('slotSelect');
    const confirmBtn = document.getElementById('confirmAssignBtn');
    const technicianId = sessionStorage.getItem('technicianId');
    
    console.log('🔍 loadNapboxes called with:', {
        customerLat,
        customerLng,
        customerBarangay,
        installationDate,
        technicianId
    });
    
    napboxSelect.innerHTML = '<option value="">Loading NAP boxes...</option>';
    napboxSelect.disabled = true;
    
    // ✅ Alamin kung pwede na mag-assign ngayon (araw na ng installation o nakalipas na)
    const installationDateInput = document.getElementById('installationDate');
    const dateToCheck = installationDate || (installationDateInput ? installationDateInput.value : null);
    const canAssignResult = dateToCheck ? canAssignSlotNow(dateToCheck) : { canAssign: false, message: 'No installation date set' };
    const canAssign = canAssignOverride !== null ? canAssignOverride : canAssignResult.canAssign;
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/available-napboxes?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
        const data = await res.json();
        
        console.log('📡 Raw NAP boxes data:', data.napboxes);
        console.log('📡 Number of NAP boxes from API:', data.napboxes?.length || 0);
        
        // ✅ I-FILTER ANG NAPBOXES: 1) BARANGAY-BASED, 2) COVERAGE RADIUS
        let filteredNapboxes = data.napboxes || [];
        
        console.log('📍 Customer Barangay:', customerBarangay);
        
        // ✅ STEP 1: I-FILTER MUNA BATAY SA BARANGAY (KUNG MAY BARANGAY ANG CUSTOMER)
        if (customerBarangay && filteredNapboxes.length > 0) {
            const barangayLower = customerBarangay.toLowerCase().trim();
            filteredNapboxes = filteredNapboxes.filter(napbox => {
                const napboxBarangay = (napbox.barangay || '').toLowerCase().trim();
                const isMatch = napboxBarangay === barangayLower;
                console.log(`🔍 Checking ${napbox.napbox_name}: Barangay "${napboxBarangay}" vs "${barangayLower}" = ${isMatch}`);
                return isMatch;
            });
            
            console.log(`📍 Filtered by barangay "${customerBarangay}": ${filteredNapboxes.length} NAP boxes found`);
        } else {
            console.log('⚠️ No barangay filter applied (customerBarangay is null or empty)');
        }
        
        // ✅ STEP 2: I-FILTER PA BATAY SA COVERAGE RADIUS (KUNG MAY COORDINATES ANG CUSTOMER)
        if (customerLat && customerLng && filteredNapboxes.length > 0) {
            const customerLatNum = parseFloat(customerLat);
            const customerLngNum = parseFloat(customerLng);
            
            if (!isNaN(customerLatNum) && !isNaN(customerLngNum)) {
                filteredNapboxes = filteredNapboxes.filter(napbox => {
                    const napboxLat = parseFloat(napbox.latitude);
                    const napboxLng = parseFloat(napbox.longitude);
                    const coverageRadius = parseFloat(napbox.coverage_radius) || 500;
                    
                    if (isNaN(napboxLat) || isNaN(napboxLng)) {
                        console.log(`⚠️ NAP Box ${napbox.napbox_name} has no coordinates, skipping`);
                        return false;
                    }
                    
                    const distance = calculateDistance(customerLatNum, customerLngNum, napboxLat, napboxLng);
                    const isWithin = distance <= coverageRadius;
                    console.log(`📏 ${napbox.napbox_name}: ${distance.toFixed(2)}m (max: ${coverageRadius}m) = ${isWithin ? '✅ WITHIN' : '❌ OUTSIDE'}`);
                    
                    return isWithin;
                });
                
                console.log(`📍 After coverage filter: ${filteredNapboxes.length} NAP boxes within coverage radius`);
            }
        }
        
        if (filteredNapboxes && filteredNapboxes.length > 0) {
            napboxSelect.innerHTML = '<option value="" disabled selected>-- Select NAP Box --</option>';
            filteredNapboxes.forEach(napbox => {
                napboxSelect.innerHTML += `<option value="${napbox.id}">${napbox.napbox_name} - ${napbox.barangay} (${napbox.available_slots} slots available)</option>`;
            });
            
            // ✅ CONSISTENT BLUE BANNER - may na-detect na NAP box sa coverage radius
            renderNapboxBanner({
                type: 'detected',
                napboxName: filteredNapboxes.length === 1
                    ? filteredNapboxes[0].napbox_name
                    : `${filteredNapboxes.length} NAP Boxes found near this location`,
                installationDate: dateToCheck,
                barangay: customerBarangay
            });
            
            if (canAssign) {
                napboxSelect.disabled = false;
            } else {
                // May na-detect na NAP box, pero hindi pa araw ng installation
                napboxSelect.disabled = true;
                slotSelect.innerHTML = '<option value="" disabled selected>Installation date not yet</option>';
                slotSelect.disabled = true;
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Select slot first';
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
                showToast('Please wait until the installation date to assign a slot.', 'warning');
            }
        } else {
            // ✅ KUNG WALANG NAPBOX, I-DISABLE ANG DROPDOWN
            napboxSelect.innerHTML = '<option value="">No NAP boxes available</option>';
            napboxSelect.disabled = true;
            slotSelect.innerHTML = '<option value="" disabled selected>No NAP Box available</option>';
            slotSelect.disabled = true;
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Select slot first';
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
            
            // ✅ I-DETERMINE KUNG BAKIT WALANG NAPBOX
            const napboxesInSameBarangay = data.napboxes?.filter(nb => {
                const nbBarangay = (nb.barangay || '').toLowerCase().trim();
                return nbBarangay === (customerBarangay || '').toLowerCase().trim();
            }) || [];
            
            let reasonMessage = '';
            if (customerBarangay && napboxesInSameBarangay.length > 0) {
                reasonMessage = `There are no NAP boxes within coverage radius of this customer's location in <strong>${customerBarangay}</strong> barangay.`;
            } else if (customerBarangay) {
                reasonMessage = `No NAP box found in <strong>${customerBarangay}</strong> barangay.`;
            } else {
                reasonMessage = 'No NAP box found within coverage area.';
            }
            
            let coordsHtml = '';
if (customerLat && customerLng) {
    const latNum = parseFloat(customerLat);
    const lngNum = parseFloat(customerLng);
    if (!isNaN(latNum) && !isNaN(lngNum)) {
        coordsHtml = `
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <span style="font-size: 14px; font-family: 'Courier New', monospace; color:#1e293b; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-map-pin" style="color: #ef4444; font-size:16px;"></i> 
                    <span style="font-weight:600; color:#475569;">Lat:</span> ${latNum.toFixed(6)}
                    <span style="font-weight:600; color:#475569; margin-left:4px;">Lng:</span> ${lngNum.toFixed(6)}
                </span>
                <button id="copyCoordsBtn" class="copy-coords-btn">
                    <i class="fas fa-copy"></i> Copy Coordinates
                </button>
            </div>
        `;
    }
}   
            
            // ✅ CONSISTENT BLUE BANNER - walang na-detect na NAP box (same design,
            // may Go to NAP Box button pa rin) - gumagana ito kahit araw na ng
            // installation o hindi pa, dahil common ang installDateDisplay logic.
            renderNapboxBanner({
                type: 'not_found',
                reasonMessage,
                coordsHtml,
                showGoToNapbox: true,
                installationDate: dateToCheck,
                barangay: customerBarangay
            });
        }
        
    } catch (err) {
        console.error('Error loading napboxes:', err);
        napboxSelect.innerHTML = '<option value="">Error loading NAP boxes</option>';
        napboxSelect.disabled = true;
        renderNapboxBanner({
            type: 'error',
            reasonMessage: 'Failed to load NAP boxes. Please try again.'
        });
    }
}

// ==================== CALCULATE DISTANCE (Haversine Formula) ====================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance; // Returns distance in meters
}


// ==================== COPY COORDINATES FUNCTION ====================
function setupCopyCoordinatesButton() {
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'copyCoordsBtn') {
            // Kunin ang coordinates text mula sa parent element
            const parentBanner = e.target.closest('div');
            const coordsSpan = parentBanner?.querySelector('span')?.textContent || '';
            
            // Extract coordinates (Lat: xxx, Lng: yyy)
            const latMatch = coordsSpan.match(/Lat:\s*([\d.-]+)/);
            const lngMatch = coordsSpan.match(/Lng:\s*([\d.-]+)/);
            
            if (latMatch && lngMatch) {
                const coordsText = `${latMatch[1]}, ${lngMatch[1]}`;
                navigator.clipboard.writeText(coordsText).then(() => {
                    showToast('Coordinates copied to clipboard!', 'success');
                }).catch(() => {
                    // Fallback: select and copy
                    const textArea = document.createElement('textarea');
                    textArea.value = coordsText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    showToast('Coordinates copied to clipboard!', 'success');
                });
            } else {
                showToast('No coordinates to copy', 'warning');
            }
        }
    });
}

// ==================== NAPBOX SELECT CHANGE ====================
document.getElementById('napboxSelect').addEventListener('change', async function() {
    const napboxId = this.value;
    const slotSelect = document.getElementById('slotSelect');
    const confirmBtn = document.getElementById('confirmAssignBtn');
    
    // 🔥 I-DISABLE ANG BUTTON - "Select slot first"
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';
    
    if (!napboxId) {
        slotSelect.innerHTML = '<option value="" disabled selected>-- First select NAP Box --</option>';
        slotSelect.disabled = true;
        return;
    }
    
    // ✅ CHECK KUNG PWEDE NA MAG-ASSIGN
    const installationDateInput = document.getElementById('installationDate');
    const installationDate = installationDateInput ? installationDateInput.value : null;
    const canAssignResult = installationDate ? canAssignSlotNow(installationDate) : { canAssign: false, message: 'No installation date set' };
    
    if (!canAssignResult.canAssign) {
        slotSelect.innerHTML = `<option value="" disabled selected>${canAssignResult.message}</option>`;
        slotSelect.disabled = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Select slot first';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
        showToast(canAssignResult.message, 'warning');
        return;
    }
    
    slotSelect.innerHTML = '<option value="" disabled selected>Loading slots...</option>';
    slotSelect.disabled = true;
    
    try {
        const res = await fetch(`/api/technician/available-slots-for-napbox/${napboxId}`);
        const data = await res.json();
        
        if (data.slots && data.slots.length > 0) {
            // ✅ ANG UNANG OPTION AY DISABLED PLACEHOLDER
            slotSelect.innerHTML = '<option value="" disabled selected>-- Select Slot --</option>';
            data.slots.forEach(slot => {
                slotSelect.innerHTML += `<option value="${slot.id}">Slot ${slot.slot_number}</option>`;
            });
            slotSelect.disabled = false;
        } else {
            slotSelect.innerHTML = '<option value="" disabled selected>No available slots</option>';
            slotSelect.disabled = true;
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'No slots available';
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
    } catch (err) {
        slotSelect.innerHTML = '<option value="" disabled selected>Error loading slots</option>';
        slotSelect.disabled = true;
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Error loading slots';
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
    }
});

// ==================== SLOT SELECT CHANGE ====================
document.addEventListener('DOMContentLoaded', function() {
    const slotSelect = document.getElementById('slotSelect');
    if (slotSelect) {
        slotSelect.addEventListener('change', function() {
            const slotId = this.value;
            const confirmBtn = document.getElementById('confirmAssignBtn');
            const installationDateInput = document.getElementById('installationDate');
            const installationDate = installationDateInput ? installationDateInput.value : null;
            
            // 🔥 I-VALIDATE KUNG PWEDE NA MAG-ASSIGN
            if (slotId && installationDate) {
                const result = canAssignSlotNow(installationDate);
                if (result.canAssign) {
                    // 🔥 PWEDE NA MAG-ASSIGN AT MAY NAPILING SLOT - ENABLE
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = 'Assign Slot';
                    confirmBtn.style.opacity = '1';
                    confirmBtn.style.cursor = 'pointer';
                    confirmBtn.title = '';
                } else {
                    // 🔥 HINDI PA ARAW NG INSTALLATION - "Select slot first" (disabled)
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Select slot first';
                    confirmBtn.style.opacity = '0.5';
                    confirmBtn.style.cursor = 'not-allowed';
                    confirmBtn.title = '';
                }
            } else if (slotId) {
                // May napiling slot pero walang date
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Select slot first';
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
                confirmBtn.title = '';
            } else {
                // WALANG NAPILING SLOT - "Select slot first" (disabled)
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Select slot first';
                confirmBtn.style.opacity = '0.5';
                confirmBtn.style.cursor = 'not-allowed';
                confirmBtn.title = '';
            }
        });
    }
});

// ==================== CONFIRM ASSIGN SLOT ====================
document.getElementById('confirmAssignBtn').addEventListener('click', async function() {
    const napboxId = document.getElementById('napboxSelect').value;
    const slotId = document.getElementById('slotSelect').value;
    const installationDate = document.getElementById('installationDate').value;
    
    if (!napboxId) { showToast('Please select a NAP box', 'error'); return; }
    if (!slotId) { showToast('Please select a slot', 'error'); return; }
    if (!installationDate) { showToast('Please select installation date', 'error'); return; }
    
    // 🔥 FINAL VALIDATION: I-CHECK KUNG PWEDE NA MAG-ASSIGN (TODAY == INSTALLATION DATE)
    const result = canAssignSlotNow(installationDate);
    if (!result.canAssign) {
        showToast(result.message, 'error');
        return;
    }
    
    this.disabled = true;
    this.textContent = 'Assigning...';
    this.style.opacity = '0.6';
    this.style.cursor = 'not-allowed';
    
    const technicianId = sessionStorage.getItem('technicianId');
    
    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/assign-slot-to-customer?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                application_number: currentCustomer.application_number,
                slot_id: slotId,
                napbox_id: napboxId,
                installation_date: installationDate,
                technician_id: technicianId,
                tab_id: tabId
            })
        });
        
        const data = await res.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            closeAssignModal();
            loadCustomers();
        } else {
            showToast(data.error || 'Assignment failed', 'error');
        }
    } catch (err) {
        showToast('Error assigning slot', 'error');
    } finally {
        this.disabled = false;
        this.textContent = 'Assign Slot';
        this.style.opacity = '1';
        this.style.cursor = 'pointer';
    }
});

// ==================== CLOSE ASSIGN MODAL ====================
function closeAssignModal() {
    document.getElementById('assignModal').classList.remove('show');
    currentCustomer = null;
    currentNapboxId = null;
    currentNapboxName = null;
    
    const napboxSelect = document.getElementById('napboxSelect');
    napboxSelect.disabled = false;
    napboxSelect.innerHTML = '<option value="">-- Select NAP Box --</option>';
    
    // ✅ I-RESET ANG SLOT SELECT SA DISABLED PLACEHOLDER
    const slotSelect = document.getElementById('slotSelect');
    slotSelect.innerHTML = '<option value="" disabled selected>-- Select Slot --</option>';
    slotSelect.disabled = true;
    
    // 🔥 I-RESET ANG CONFIRM BUTTON
    const confirmBtn = document.getElementById('confirmAssignBtn');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Select slot first';
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    confirmBtn.title = '';
    
    const preferredInfo = document.getElementById('preferredNapboxInfo');
    if (preferredInfo) preferredInfo.innerHTML = '';
    hideModalNotice();
}

document.getElementById('closeAssignModal').addEventListener('click', closeAssignModal);
document.getElementById('cancelAssignBtn').addEventListener('click', closeAssignModal);
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('assignModal')) closeAssignModal();
});

// ==================== SEARCH FUNCTIONALITY ====================
document.getElementById('searchInput').addEventListener('input', function() {
    const clearBtn = document.getElementById('clearSearch');
    clearBtn.style.display = this.value ? 'flex' : 'none';
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadCustomers(), 300);
});

document.getElementById('clearSearch').addEventListener('click', function() {
    document.getElementById('searchInput').value = '';
    this.style.display = 'none';
    loadCustomers();
});

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

    if (type === 'loading') {
        // Loading stays visible
    } else {
        toast._hideTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// ==================== PROFILE DROPDOWN ====================
const profileBtn = document.getElementById('profileBtn');
const profileMenu = document.getElementById('profileMenu');
if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => { e.stopPropagation(); profileMenu.classList.toggle('show'); });
    window.addEventListener('click', () => profileMenu.classList.remove('show'));
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
    const confirmLogout = document.getElementById("confirmLogout");
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

// ==================== LOAD PROFILE ====================
async function loadProfile() {
    const technicianId = sessionStorage.getItem('technicianId');
    if (technicianId) {
        try {
            const tabId = getTabId();
            const res = await fetch(`/api/technician/profile?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
            const data = await res.json();
            
            // Store technician info for other uses
            if (data.technician_id) {
                sessionStorage.setItem('technicianId', data.technician_id);
            }
            if (data.area) {
                sessionStorage.setItem('technicianArea', data.area);
            }
            
            console.log('Technician profile loaded:', data.name);
        } catch (err) { 
            console.error('Error loading profile:', err);
        }
    }
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

// ==================== TECHNICIAN NOTIFICATION SYSTEM ====================
class TechnicianSlotNotificationSystem {
    constructor() {
        this.pollingInterval = null;
        this.pollingDuration = 30000;
        this.notifications = [];
        this.unreadCount = 0;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        console.log("Initializing Technician Slot Notification System...");
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
    }

    getTechnicianIdentifier() {
        return sessionStorage.getItem('technicianId');
    }

    async fetchNotifications() {
        if (!this.isInitialized) return;
        
        const technicianId = this.getTechnicianIdentifier();
        
        if (!technicianId) {
            console.log("No technician ID found");
            return;
        }
        
        console.log("Fetching notifications for technician:", technicianId);
        
        try {
            const tabId = getTabId();
            const response = await fetch(`/api/technician/notifications?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`);
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
            let icon = 'fa-info-circle';
            let iconClass = '';
            
            if (notif.type === 'new_approved_application') {
                icon = 'fa-check-circle';
                iconClass = 'success';
            } else if (notif.type === 'slot_assigned') {
                icon = 'fa-tasks';
                iconClass = 'primary';
            } else if (notif.type === 'installation_update') {
                icon = 'fa-tools';
                iconClass = 'warning';
            } else {
                iconClass = 'info';
            }
            
            return `
                <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notif.id}" data-related-id="${notif.relatedId}">
                    <div class="notification-icon">
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
                await this.markAsRead(id);
                if (relatedId) {
                    window.location.href = `/technician/slot-assignments?application=${relatedId}`;
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
        const technicianId = this.getTechnicianIdentifier();
        if (!technicianId) return;
        
        try {
            const tabId = getTabId();
            const response = await fetch(`/api/technician/notifications/${notificationId}/read?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`, { 
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
        const technicianId = this.getTechnicianIdentifier();
        if (!technicianId) return;
        
        try {
            const tabId = getTabId();
            const response = await fetch(`/api/technician/notifications/read-all?technician_id=${encodeURIComponent(technicianId)}&tab_id=${tabId}`, { 
                method: "PUT" 
            });
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
        let toast = document.getElementById("technicianSlotToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "technicianSlotToast";
            toast.className = "technician-slot-toast";
            document.body.appendChild(toast);
            
            const style = document.createElement("style");
            style.textContent = `
                .technician-slot-toast {
                    position: fixed;
                    bottom: 30px;
                    right: 30px;
                    background: #166534;
                    color: white;
                    padding: 12px 20px;
                    border-radius: 8px;
                    z-index: 10001;
                    animation: slideInRight 0.3s ease;
                    display: none;
                }
                .technician-slot-toast.error { background: #991b1b; }
                .technician-slot-toast.warning { background: #e69600; }
                @keyframes slideInRight {
                    from { transform: translateX(100px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        toast.textContent = message;
        toast.className = `technician-slot-toast ${type}`;
        toast.style.display = "block";
        setTimeout(() => toast.style.display = "none", 3000);
    }
}

// Create global instance
window.TechnicianSlotNotificationSystem = new TechnicianSlotNotificationSystem();

// ==================== DOM CONTENT LOADED ====================
document.addEventListener("DOMContentLoaded", async () => {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    // Initialize technician data first
    const data = await initTechnicianData();
    console.log('✅ Technician initialized:', data);
    
    // Initialize notification system
    if (window.TechnicianSlotNotificationSystem) {
        window.TechnicianSlotNotificationSystem.init();
        console.log("Notification system initialized");
    } else {
        console.error("TechnicianSlotNotificationSystem not found!");
    }
    
    // ✅ IDAGDAG ITO - SETUP COPY COORDINATES BUTTON
    setupCopyCoordinatesButton();
    
    // Load data
    loadProfile();
    loadCustomers();
    
    // ================= CONFIRM STATUS MODAL EVENTS =================
    const statusModal = document.getElementById('confirmStatusModal');
    const closeStatusBtn = document.getElementById('closeConfirmStatusModal');
    const cancelStatusBtn = document.getElementById('cancelConfirmStatus');
    const confirmStatusBtn = document.getElementById('confirmStatusAction');
    
    if (closeStatusBtn) {
        closeStatusBtn.addEventListener('click', closeConfirmStatusModal);
    }
    
    if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', closeConfirmStatusModal);
    }
    
    if (confirmStatusBtn) {
        confirmStatusBtn.addEventListener('click', executeConfirmStatus);
    }
    
    if (statusModal) {
        statusModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeConfirmStatusModal();
            }
        });
    }
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (statusModal && statusModal.classList.contains('show')) {
                closeConfirmStatusModal();
            }
        }
    });
});



// ==================== CANCEL INSTALLATION ====================
function openCancelInstallationModal() {
    if (!currentCustomer) {
        showToast('No customer selected', 'error');
        return;
    }

    document.getElementById('cancelInstallCustomerName').textContent = currentCustomer.name || '---';
    document.getElementById('cancelInstallApplicationNumber').textContent = currentCustomer.application_number || '---';
    document.getElementById('cancelInstallReason').value = '';

    const modal = document.getElementById('cancelInstallationModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeCancelInstallationModal() {
    const modal = document.getElementById('cancelInstallationModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

async function executeCancelInstallation() {
    if (!currentCustomer) return;

    const reason = document.getElementById('cancelInstallReason').value.trim();
    const technicianId = sessionStorage.getItem('technicianId');
    const confirmBtn = document.getElementById('confirmCancelInstallationBtn');

    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelling...';

    try {
        const tabId = getTabId();
        const res = await fetch(`/api/technician/cancel-installation?tab_id=${tabId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                application_number: currentCustomer.application_number,
                technician_id: technicianId,
                reason: reason,
                tab_id: tabId
            })
        });

        const data = await res.json();

        if (data.success) {
            showToast(data.message, 'success');
            closeCancelInstallationModal();
            closeAssignModal();
            loadCustomers();
        } else {
            showToast(data.error || 'Failed to cancel installation', 'error');
        }
    } catch (err) {
        console.error('Cancel installation error:', err);
        showToast('Error cancelling installation', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-ban"></i> Confirm Cancellation';
    }
}

document.getElementById('cancelInstallationBtn')?.addEventListener('click', openCancelInstallationModal);
document.getElementById('closeCancelInstallationModal')?.addEventListener('click', closeCancelInstallationModal);
document.getElementById('closeCancelInstallationBtn2')?.addEventListener('click', closeCancelInstallationModal);
document.getElementById('confirmCancelInstallationBtn')?.addEventListener('click', executeCancelInstallation);

window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('cancelInstallationModal')) closeCancelInstallationModal();
});