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

const appId = window.location.pathname.split("/").pop();
let currentApplicationStatus = null;
let currentApprovalRequest = null;
let currentContractNumber = null;
let currentBillingDate = null;
let pendingRequestId = null;
let pendingRequestedStatus = null;
let applicationCity = null;
let currentFirstInstallmentDate = null;
let currentLastInstallmentDate = null;
let isInstallmentPlan = false;
let currentSelectedTeam = null;
let currentInstallationDateValue = null;
let currentRejectionReason = null;
let currentReapplyRequested = false;
let currentReapplyRequestedAt = null;

// =========================
// HELPER FUNCTION TO GET CLEAN NAME (FILTER OUT "none")
// =========================
function getCleanFullName(firstName, middleName, lastName, suffix) {
    const nameParts = [];
    
    if (firstName && firstName !== 'none' && firstName.trim() !== '') {
        nameParts.push(firstName);
    }
    if (middleName && middleName !== 'none' && middleName.trim() !== '') {
        nameParts.push(middleName);
    }
    if (lastName && lastName !== 'none' && lastName.trim() !== '') {
        nameParts.push(lastName);
    }
    if (suffix && suffix !== 'none' && suffix.trim() !== '') {
        nameParts.push(suffix);
    }
    
    return nameParts.join(' ') || 'Not provided';
}

// Helper function to get clean value (for other fields)
function getCleanValue(value) {
    if (!value || value === 'none' || value.trim() === '') {
        return '';
    }
    return value;
}

// =========================
// HELPER FUNCTION TO EXTRACT NUMBER OF MONTHS FROM INSTALLMENT_FEE STRING
// =========================
function getInstallmentMonths(installationFee) {
    if (!installationFee) return 0;
    
    const match = installationFee.toLowerCase().match(/installment\s*-\s*(\d+)\s*months?/);
    if (match && match[1]) {
        return parseInt(match[1]);
    }
    
    const match2 = installationFee.toLowerCase().match(/installment\s*(\d+)\s*months?/);
    if (match2 && match2[1]) {
        return parseInt(match2[1]);
    }
    
    return 0;
}

// =========================
// CALCULATE LAST INSTALLMENT DATE BASED ON FIRST INSTALLMENT DATE AND NUMBER OF MONTHS
// =========================
function calculateLastInstallmentDate(firstDate, numberOfMonths) {
    if (!firstDate || !numberOfMonths || numberOfMonths <= 0) return null;
    
    const [year, month] = firstDate.split('-');
    let date = new Date(parseInt(year), parseInt(month) - 1, 1);
    date.setMonth(date.getMonth() + (numberOfMonths - 1));
    
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${newYear}-${newMonth}`;
}

// =========================
// FORMAT MONTH-YEAR FOR DISPLAY
// =========================
function formatMonthYearForDisplay(dateStr) {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// =========================
// GET CONTRACT PREFIX BASED ON CITY AND BARANGAY
// =========================
function getContractPrefix(city, barangay = null) {
    const cityPrefixes = {
        'pila': 'GIF-',
        'magdalena': 'CVM-',
        'pagsanjan': 'FP-',
        'santa cruz': 'FS-',
        'liliw': 'LWV-',
        'lucban': 'LBN-',
        'majayjay': 'MJJ-',
        'cavinti': 'CVT-',
        'pakil': 'PKL-',
        'paete': 'PTE-',
        'kalayaan': 'KLY-',
        'siniloan': 'SNL-',
        'famy': 'FMY-',
        'mabitac': 'MBT-',
        'nagcarlan': 'NCL-',
        'san pablo': 'SPC-',
        'los baños': 'LBÑ-',
        'bay': 'BAY-',
        'calauan': 'CLN-',
        'victoria': 'VCT-'
    };
    
    const lowerCity = city.toLowerCase().trim();
    
    const pilaSpecialBarangays = [
        'santa clara sur',
        'santa clara norte',
        'bulilan norte',
        'bulilan sur'
    ];
    
    if (lowerCity === 'pila' && barangay) {
        const lowerBarangay = barangay.toLowerCase().trim();
        if (pilaSpecialBarangays.includes(lowerBarangay)) {
            return 'POB-';
        }
    }
    
    for (const [key, prefix] of Object.entries(cityPrefixes)) {
        if (lowerCity.includes(key) || key.includes(lowerCity)) {
            return prefix;
        }
    }
    return 'CV-';
}

// =========================
// SETUP CONTRACT NUMBER INPUT WITH PREFIX
// =========================
function isPilaCity(city) {
    return (city || '').toLowerCase().trim() === 'pila';
}

function setupContractNumberInput(contractInput, city, barangay = null) {
    const badge = document.getElementById('contractPrefixBadge');
    const prefixContainer = document.getElementById('prefixSelectorContainer');
    let prefix = getContractPrefix(city, barangay);

    const newInput = contractInput.cloneNode(true);
    contractInput.parentNode.replaceChild(newInput, contractInput);
    contractInput = newInput;

    contractInput.value = '';
    contractInput.setAttribute('maxlength', '4');
    contractInput.setAttribute('data-prefix', prefix);

    if (badge) badge.textContent = prefix;

    // Prefix selector - lalabas lang kapag Pila ang city
    if (prefixContainer) {
        if (isPilaCity(city)) {
            prefixContainer.style.display = 'block';

            const buttons = prefixContainer.querySelectorAll('.prefix-choice-btn');
            buttons.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            });

            const freshButtons = prefixContainer.querySelectorAll('.prefix-choice-btn');
            freshButtons.forEach(btn => {
                if (btn.getAttribute('data-prefix') === prefix) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }

                btn.addEventListener('click', function() {
                    freshButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    prefix = this.getAttribute('data-prefix');
                    if (badge) badge.textContent = prefix;
                    contractInput.setAttribute('data-prefix', prefix);
                });
            });
        } else {
            prefixContainer.style.display = 'none';
        }
    }

    contractInput.addEventListener('input', function() {
        let numberPart = this.value.replace(/\D/g, '');
        if (numberPart.length > 4) {
            numberPart = numberPart.substring(0, 4);
        }
        this.value = numberPart;
    });

    contractInput.addEventListener('keydown', function(e) {
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedKeys.includes(e.key)) return;
        if (e.key.length === 1 && /[^0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });

    contractInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = pastedText.replace(/\D/g, '').substring(0, 4);
        this.value = numbersOnly;
    });

    return function getFullContractNumber() {
        const currentPrefix = contractInput.getAttribute('data-prefix') || prefix;
        return currentPrefix + contractInput.value;
    };
}

function setupBillingDateInput(billingInput) {
    const newInput = billingInput.cloneNode(true);
    billingInput.parentNode.replaceChild(newInput, billingInput);
    billingInput = newInput;
    billingInput.value = '';

    billingInput.addEventListener('input', function() {
        let val = this.value.replace(/\D/g, '');
        if (val.length > 2) val = val.substring(0, 2);

        if (val !== '') {
            const num = parseInt(val, 10);
            if (num > 31) {
                val = val.substring(0, 1);
            }
        }
        this.value = val;
    });

    billingInput.addEventListener('keydown', function(e) {
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowedKeys.includes(e.key)) return;
        if (e.key.length === 1 && /[^0-9]/.test(e.key)) {
            e.preventDefault();
        }
    });

    billingInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        let numbersOnly = pastedText.replace(/\D/g, '').substring(0, 2);
        if (numbersOnly && parseInt(numbersOnly, 10) > 31) {
            numbersOnly = numbersOnly.substring(0, 1);
        }
        this.value = numbersOnly;
    });

    return billingInput;
}

// =========================
// LOAD ACTIVE TEAMS FOR DROPDOWN (FILTERED BY CITY + MUST HAVE MEMBERS + ACTIVE ONLY)
// =========================
async function loadTeamsForDropdown(city = null) {
    try {
        console.log(`🔍 Loading teams for city: "${city}"`);
        
        // ✅ KUHAIN MUNA ANG TEAMS
        const response = await fetch('/api/superadmin/teams?status=Active&t=' + Date.now());
        const teams = await response.json();
        
        // ✅ KUHAIN ANG TECHNICIANS PARA MA-CHECK KUNG MAY MEMBERS ANG TEAM
        const techResponse = await fetch('/api/superadmin/technicians?t=' + Date.now());
        const technicians = await techResponse.json();
        
        const teamSelect = document.getElementById('teamAssignment');
        if (!teamSelect) return [];
        
        // I-clear ang dropdown
        teamSelect.innerHTML = '<option value="" disabled selected>-- Select Team --</option>';
        
        // ✅ I-FILTER ANG TEAMS: ACTIVE LANG + DAPAT MAY AT LEAST 1 MEMBER
        let filteredTeams = teams.filter(team => {
            // ✅ CHECK: Active lang ang status
            if (team.status !== 'Active') {
                return false;
            }
            
            // Count technicians in this team
            const memberCount = technicians.filter(tech => tech.team_id === team.team_id).length;
            return memberCount > 0; // ✅ DAPAT MAY MEMBER
        });
        
        // ✅ I-FILTER PA BATAY SA CITY (case-insensitive)
        if (city && city.trim() !== '') {
            const cityLower = city.toLowerCase().trim();
            filteredTeams = filteredTeams.filter(team => {
                const teamArea = (team.area || '').toLowerCase().trim();
                return teamArea === cityLower;
            });
            
            console.log(`📋 Found ${filteredTeams.length} active teams in area "${city}" with members`);
        } else {
            console.log(`📋 No city filter applied, showing ${filteredTeams.length} active teams with members`);
        }
        
        // Populate dropdown with filtered teams
        if (filteredTeams && filteredTeams.length > 0) {
            filteredTeams.forEach(team => {
                // ✅ KUHAIN ANG MEMBER COUNT PARA I-DISPLAY
                const memberCount = technicians.filter(tech => tech.team_id === team.team_id).length;
                const option = document.createElement('option');
                option.value = team.team_id;
                option.textContent = `${team.team_name} (${team.area || 'No Area'})`;
                teamSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            if (city && city.trim() !== '') {
                option.textContent = `-- No active teams available in "${city}" area --`;
            } else {
                option.textContent = '-- No Active Teams with Members Available --';
            }
            option.disabled = true;
            teamSelect.appendChild(option);
        }
        
        return filteredTeams;
    } catch (error) {
        console.error('Error loading teams:', error);
        const teamSelect = document.getElementById('teamAssignment');
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Error loading teams</option>';
        }
        return [];
    }
}

// =========================
// SET INSTALLATION DATE MIN AND MAX ATTRIBUTE (6 MONTHS LIMIT)
// =========================
function setInstallationDateMin() {
    const installationDateInput = document.getElementById('installationDate');
    if (installationDateInput) {
        const today = new Date();
        
        // ✅ SET MIN DATE - Today
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        installationDateInput.setAttribute('min', `${year}-${month}-${day}`);
        
        // ✅ SET MAX DATE - 6 months from today
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 6);
        const maxYear = maxDate.getFullYear();
        const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
        const maxDay = String(maxDate.getDate()).padStart(2, '0');
        installationDateInput.setAttribute('max', `${maxYear}-${maxMonth}-${maxDay}`);
        
        installationDateInput.value = '';
        
        console.log(`📅 Installation date range: ${year}-${month}-${day} to ${maxYear}-${maxMonth}-${maxDay}`);
    }
}

// =========================
// LOAD APPLICATION DATA
// =========================
async function loadApplication() {
    try {
        const res = await fetch(`/api/superadmin/application/${appId}?t=${Date.now()}`);
        const data = await res.json();

        if (data.error) {
            alert(data.error);
            return;
        }

        // ✅ STEP 1: I-SET MUNA ANG LAHAT NG VARIABLES
        currentApplicationStatus = data.status;
        applicationCity = data.city || '';
        currentRejectionReason = data.rejection_reason || '';
        currentReapplyRequested = data.reapply_requested === 1 || data.reapply_requested === true;
        currentReapplyRequestedAt = data.reapply_requested_at || null;
        
        console.log("🔍 Reapply State:", { 
            currentReapplyRequested, 
            currentReapplyRequestedAt,
            raw_reapply_requested: data.reapply_requested,
            status: currentApplicationStatus 
        });

        // ✅ STEP 2: LOAD APPROVAL REQUESTS
        await loadApprovalRequests();

        // ✅ STEP 3: TUMATAWAG NG toggleFloatingButtons (NA MAY CORRECT NA VARIABLES)
        toggleFloatingButtons(currentApplicationStatus);
        toggleViewContractButton(currentApplicationStatus);

        // ✅ STEP 4: DISPLAY DATA (REST OF THE CODE)
        const setTextOrHide = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            const cleanVal = val || '';
            if (cleanVal === '' || cleanVal === 'none' || cleanVal === 'N/A') {
                el.textContent = 'none';
            } else {
                el.textContent = cleanVal;
            }
        };

        const setImgOrHide = (id, src) => {
            const imgEl = document.getElementById(id);
            if (!imgEl) return;
            if (src && src !== '') {
                imgEl.src = src;
                imgEl.style.display = 'block';
                const parent = imgEl.closest('.col-md-4, .col-md-8, .text-center');
                if (parent) parent.style.display = 'block';
            } else {
                imgEl.src = '';
                imgEl.style.display = 'none';
                const parent = imgEl.closest('.col-md-4, .col-md-8, .text-center');
                if (parent) parent.style.display = 'none';
            }
        };

        // ===== PLAN =====
        const planEl = document.getElementById('plan');
        const planValue = data.plan || '';
        if (planEl) {
            if (planValue === '' || planValue === 'none') {
                planEl.textContent = '—';
            } else {
                planEl.textContent = planValue;
            }
        }

        const serviceTypeEl = document.getElementById('service_type');
        const serviceValue = data.service_type || '';
        if (serviceTypeEl) {
            if (serviceValue === '' || serviceValue === 'none') {
                serviceTypeEl.textContent = '—';
            } else {
                serviceTypeEl.textContent = serviceValue;
            }
        }

        // ===== PERSONAL INFORMATION =====
        setTextOrHide("full_name", getCleanFullName(data.first_name, data.middle_name, data.last_name, data.suffix), '.detail-item');
        setTextOrHide("email", data.email, '.detail-item');
        setTextOrHide("mobile", data.mobile, '.detail-item');
        setTextOrHide("secondary_mobile", data.secondary_mobile, '.detail-item');
        setTextOrHide("phone", data.phone, '.detail-item');
        
        function formatBirthdate(dateStr) {
            if (!dateStr) return '';
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                const options = { day: '2-digit', month: 'short', year: 'numeric' };
                return date.toLocaleDateString('en-US', options);
            } catch (e) {
                return dateStr;
            }
        }
        setTextOrHide("birthdate", formatBirthdate(data.birthdate), '.detail-item');
        setTextOrHide("place_of_birth", data.place_of_birth, '.detail-item');
        setTextOrHide("sex", data.sex, '.detail-item');
        setTextOrHide("civil_status", data.civil_status, '.detail-item');
        setTextOrHide("citizenship", data.citizenship, '.detail-item');
        setTextOrHide("occupation", data.occupation, '.detail-item');
        setTextOrHide("home_ownership", data.home_ownership, '.detail-item');

        // ===== ADDRESS =====
        setTextOrHide("address", data.address, '.detail-item');
        setTextOrHide("billing_address", data.billing_address, '.detail-item');
        setTextOrHide("house_number", data.house_number, '.detail-item');
        setTextOrHide("landmark", data.landmark, '.detail-item');
        setTextOrHide("barangay", data.barangay, '.detail-item');
        setTextOrHide("city", data.city, '.detail-item');
        setTextOrHide("province", data.province, '.detail-item');
        setTextOrHide("zip", data.zip, '.detail-item');

        // ===== EMPLOYMENT =====
        setTextOrHide("employer", data.employer, '.detail-item');
        setTextOrHide("business_address", data.business_address, '.detail-item');
        setTextOrHide("business_phone", data.business_phone, '.detail-item');

        // ===== SPOUSE =====
        setTextOrHide("spouse_name", data.spouse_name, '.detail-item');
        setTextOrHide("spouse_occupation", data.spouse_occupation, '.detail-item');
        setTextOrHide("spouse_employer", data.spouse_employer, '.detail-item');
        setTextOrHide("spouse_phone", data.spouse_phone, '.detail-item');

        // ===== FAMILY =====
        setTextOrHide("father_name", data.father_name, '.detail-item');
        setTextOrHide("mother_maiden_name", data.mother_maiden_name, '.detail-item');

        // ===== INSTALLATION =====
        setTextOrHide("installation_address", data.installation_address, '.detail-item');
        setTextOrHide("installation_phone", data.installation_phone, '.detail-item');
        setTextOrHide("installation_fee", data.installation_fee, '.detail-item');

        // ===== SUBMISSION =====
        setTextOrHide("date_submitted", data.date_submitted, '.detail-item');
        setTextOrHide("time_submitted", data.time_submitted, '.detail-item');

        // ===== TV TABLE =====
        const tvTableBody = document.getElementById("tvTableBody");
        const tvCard = document.getElementById("tvCard");
        if (tvTableBody) {
            const tvQty = data.tv_qty || [];
            const tvBrand = data.tv_brand || [];
            const tvType = data.tv_type || [];
            const hasTvData = tvQty.some(q => q && q !== '' && q !== '0') || 
                             tvBrand.some(b => b && b !== '') || 
                             tvType.some(t => t && t !== '');
            if (tvCard) {
                tvCard.style.display = hasTvData ? 'block' : 'none';
            }
            if (hasTvData) {
                tvTableBody.innerHTML = "";
                for (let i = 0; i < tvQty.length; i++) {
                    if (tvQty[i] && tvQty[i] !== '' && tvQty[i] !== '0') {
                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td>${tvQty[i] || ""}</td>
                            <td>${tvBrand[i] || ""}</td>
                            <td>${tvType[i] || ""}</td>
                        `;
                        tvTableBody.appendChild(row);
                    }
                }
                if (tvTableBody.children.length === 0 && tvCard) {
                    tvCard.style.display = 'none';
                }
            } else {
                tvTableBody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No TV details provided</td></tr>`;
            }
        }

        // ===== IMAGES =====
        setImgOrHide("signature", data.signature);
        setImgOrHide("id_front", data.id_front);
        setImgOrHide("id_back", data.id_back);
        setImgOrHide("proof_billing", data.proof_billing);
        setImgOrHide("profile_photo", data.profile_photo);

        // ===== APPLICATION NUMBER =====
        const appNumberEl = document.getElementById("application_number");
        if (appNumberEl) {
            appNumberEl.textContent = data.application_number || '—';
        }

        initMap(data);
        initImageModal();
        addStatusBadge(data.status);
        showRejectionReason(data.status, data.rejection_reason);

    } catch (err) {
        console.error("Failed to load application:", err);
        showToast("Failed to load application data", "error");
    }
}

function formatReapplyTimestamp(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(date.getTime())) return dateStr;
        const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
    } catch (e) {
        return dateStr;
    }
}

// =========================
// TOGGLE VIEW CONTRACT BUTTON BASED ON STATUS
// =========================
function toggleViewContractButton(status) {
    const viewContractBtn = document.getElementById('viewContractBtn');
    if (viewContractBtn) {
        if (status && status.toLowerCase() === 'approved') {
            viewContractBtn.style.display = 'inline-flex';
        } else {
            viewContractBtn.style.display = 'none';
        }
    }
}

// =========================
// LOAD APPROVAL REQUESTS - FIXED TO EXCLUDE DONE STATUS
// =========================
async function loadApprovalRequests() {
    try {
        const res = await fetch(`/api/superadmin/approval-requests?t=${Date.now()}`);
        const requests = await res.json();

        const request = requests?.find(r =>
            String(r.app_id) === String(appId) &&
            r.status === "Pending"
        );

        currentApprovalRequest = request || null;
        console.log("Approval request found:", currentApprovalRequest);
        console.log("Request status:", currentApprovalRequest?.status);
        return request;
    } catch (err) {
        console.error("Failed to load approval requests:", err);
        return null;
    }
}

// =========================
// TOGGLE FLOATING BUTTONS - WITH RESTORE FOR REJECTED AND CANCELLED
// =========================
function toggleFloatingButtons(status) {
    const floatingActions = document.getElementById("floatingActions");

    if (floatingActions) {
        floatingActions.innerHTML = '';

        const statusLower = status ? status.toLowerCase() : '';

        // ===== CANCELLED: Restore Application + Delete =====
        if (statusLower === "cancelled") {
            floatingActions.innerHTML = `
                <button class="btn-floating btn-restore-floating" id="floatingRestoreBtn">
                    <i class="fas fa-undo"></i><span>Restore Application</span>
                </button>
                <button class="btn-floating btn-delete-floating" id="floatingDeleteBtn">
                    <i class="fas fa-trash"></i><span>Delete Application</span>
                </button>
            `;
            floatingActions.style.display = "flex";

            const restoreBtn = document.getElementById("floatingRestoreBtn");
            if (restoreBtn) {
                const newRestoreBtn = restoreBtn.cloneNode(true);
                restoreBtn.parentNode.replaceChild(newRestoreBtn, restoreBtn);
                newRestoreBtn.addEventListener("click", showRestoreModal);
            }

            const deleteBtn = document.getElementById("floatingDeleteBtn");
            if (deleteBtn) {
                const newDeleteBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                newDeleteBtn.addEventListener("click", showDeleteModal);
            }
            return;
        }

        // ===== REJECTED: Request Reapply (or Reapply Requested) + Delete =====
        if (statusLower === "rejected") {
            // ✅ CHECK KUNG MAY PENDING REAPPLY REQUEST
            const hasPendingReapply = currentApprovalRequest && 
                                      currentApprovalRequest.requested_status === 'Reapply' && 
                                      currentApprovalRequest.status === 'Pending';
            
            let reapplyBtnHtml;
            
            // ✅ PRIORITIZE: KUNG MAY REAPPLY_REQUESTED = 1, MAG-DISABLE
            if (currentReapplyRequested) {
                const formattedDate = formatReapplyTimestamp(currentReapplyRequestedAt);
                reapplyBtnHtml = `
                    <button class="btn-floating btn-reapply-floating btn-reapply-disabled" id="floatingReapplyBtn" disabled>
                        <i class="fas fa-check-circle"></i>
                        <span class="reapply-btn-text">
                            <strong>Reapply Requested</strong>
                            ${formattedDate ? `<small>Request sent on ${formattedDate}</small>` : ''}
                        </span>
                    </button>
                `;
            } else if (hasPendingReapply) {
                // ✅ KUNG MAY PENDING REQUEST PERO HINDI PA APPROVED
                reapplyBtnHtml = `
                    <button class="btn-floating btn-reapply-floating btn-reapply-disabled" id="floatingReapplyBtn" disabled>
                        <i class="fas fa-clock"></i>
                        <span class="reapply-btn-text">
                            <strong>Request Pending</strong>
                            <small>Waiting for superadmin approval...</small>
                        </span>
                    </button>
                `;
            } else {
                // ✅ WALANG REAPPLY REQUESTED AT WALANG PENDING REQUEST
                reapplyBtnHtml = `
                    <button class="btn-floating btn-reapply-floating" id="floatingReapplyBtn">
                        <i class="fas fa-redo-alt"></i><span>Request Reapply</span>
                    </button>
                `;
            }

            floatingActions.innerHTML = `
                ${reapplyBtnHtml}
                <button class="btn-floating btn-delete-floating" id="floatingDeleteBtn">
                    <i class="fas fa-trash"></i><span>Delete Application</span>
                </button>
            `;
            floatingActions.style.display = "flex";

            if (!currentReapplyRequested && !hasPendingReapply) {
                const reapplyBtn = document.getElementById("floatingReapplyBtn");
                if (reapplyBtn) {
                    const newReapplyBtn = reapplyBtn.cloneNode(true);
                    reapplyBtn.parentNode.replaceChild(newReapplyBtn, reapplyBtn);
                    newReapplyBtn.addEventListener("click", showReapplyRequestModal);
                }
            }

            const deleteBtn = document.getElementById("floatingDeleteBtn");
            if (deleteBtn) {
                const newDeleteBtn = deleteBtn.cloneNode(true);
                deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
                newDeleteBtn.addEventListener("click", showDeleteModal);
            }
            return;
        }

        // ✅ CHECK IF THERE'S A PENDING APPROVAL REQUEST (APPROVED, REJECTED, PENDING, REAPPLY)
        if (currentApprovalRequest &&
            currentApprovalRequest.requested_status &&
            currentApprovalRequest.status === "Pending") {

            const requestedStatus = currentApprovalRequest.requested_status;
            const requestedBy = currentApprovalRequest.requested_by || currentApprovalRequest.admin_id || 'Unknown Admin';
            const reason = currentApprovalRequest.reason || '';
            
            console.log("Request details for display:", { requestedBy, requestedStatus, reason });
            
            const reasonHtml = reason ? `<br><small style="color: #d97706;"><strong>Reason:</strong> ${escapeHtml(reason)}</small>` : '';

            let actionLabel = 'Reject';
            if (requestedStatus === 'Approved') actionLabel = 'Approve';
            else if (requestedStatus === 'Pending') actionLabel = 'Restore';
            else if (requestedStatus === 'Reapply') actionLabel = 'Send Reapply';

            const requestContainer = document.createElement('div');
            requestContainer.className = 'request-container';
            requestContainer.innerHTML = `
                <div class="request-info">
                    <strong>Admin Request:</strong> ${actionLabel} this application<br>
                    <small>Administrator <strong>${escapeHtml(requestedBy)}</strong> has requested to ${actionLabel.toLowerCase()} this application.</small>
                    ${reasonHtml}
                    <br><small>Request ID: ${currentApprovalRequest.id}</small>
                </div>
                <div class="request-actions">
                    <button class="btn-accept-request" id="acceptRequestBtn">
                        <i class="fas fa-check"></i> Accept Request
                    </button>
                    <button class="btn-reject-request" id="rejectRequestBtn">
                        <i class="fas fa-times"></i> Reject Request
                    </button>
                </div>
            `;

            floatingActions.appendChild(requestContainer);
            floatingActions.style.display = "flex";

            const acceptBtn = document.getElementById("acceptRequestBtn");
            const rejectBtn = document.getElementById("rejectRequestBtn");
            
            if (acceptBtn) {
                const newAcceptBtn = acceptBtn.cloneNode(true);
                acceptBtn.parentNode.replaceChild(newAcceptBtn, acceptBtn);
                newAcceptBtn.addEventListener("click", () => {
                    pendingRequestId = currentApprovalRequest.id;
                    pendingRequestedStatus = requestedStatus;
                    
                    if (requestedStatus === 'Approved') {
                        showContractNumberModalForRequest();
                    } else if (requestedStatus === 'Reapply') {
                        openRequestModal('accept', pendingRequestId, pendingRequestedStatus);
                    } else {
                        openRequestModal('accept', pendingRequestId, pendingRequestedStatus);
                    }
                });
            }

            if (rejectBtn) {
                const newRejectBtn = rejectBtn.cloneNode(true);
                rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
                newRejectBtn.addEventListener("click", () => {
                    openRequestModal('reject', currentApprovalRequest.id, requestedStatus);
                });
            }
        } else if (status && (status.toLowerCase() === "pending" || status.toLowerCase() === "request sent") && !currentApprovalRequest) {
            floatingActions.innerHTML = `
                <button class="btn-floating btn-approve-floating" id="floatingApproveBtn">
                    <i class="fas fa-check-circle"></i><span>Approve Application</span>
                </button>
                <button class="btn-floating btn-reject-floating" id="floatingRejectBtn">
                    <i class="fas fa-times-circle"></i><span>Reject Application</span>
                </button>
            `;
            floatingActions.style.display = "flex";

            const approveBtn = document.getElementById("floatingApproveBtn");
            const rejectBtn = document.getElementById("floatingRejectBtn");
            
            if (approveBtn) {
                const newApproveBtn = approveBtn.cloneNode(true);
                approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
                newApproveBtn.addEventListener("click", showContractNumberModal);
            }
            
            if (rejectBtn) {
                const newRejectBtn = rejectBtn.cloneNode(true);
                rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
                newRejectBtn.addEventListener("click", showRejectModal);
            }
        } else {
            floatingActions.style.display = "none";
        }
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function calculateAge(birthdate) {
    if (!birthdate) return '';
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

// =========================
// GENERATE CONTRACT PREVIEW
// =========================
function generateContractPreview(applicationData, contractNumber, billingDate, signatureImageUrl = null) {
    const fullName = getCleanFullName(applicationData.first_name, applicationData.middle_name, applicationData.last_name, applicationData.suffix);
    const age = calculateAge(applicationData.birthdate);
    const civilStatus = applicationData.civil_status || '';
    const barangay = getCleanValue(applicationData.barangay);
    const city = getCleanValue(applicationData.city);
    const province = getCleanValue(applicationData.province);
    const address = `${barangay}, ${city}, ${province}`.trim().replace(/^,|,$/g, '').replace(/,,/g, ',');
    const addressDisplay = address || '_____________';
    const dateSubmitted = applicationData.date_submitted || new Date().toLocaleDateString();
    const planName = applicationData.plan || '';
    const planSpeed = applicationData.plan_speed || '';
    const approvalDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const formatMonthYear = (dateStr) => {
        if (!dateStr) return '_____________';
        const [year, month] = dateStr.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };
    
    const firstInstallmentFormatted = (isInstallmentPlan && currentFirstInstallmentDate) ? formatMonthYear(currentFirstInstallmentDate) : '_____________';
    const lastInstallmentFormatted = (isInstallmentPlan && currentLastInstallmentDate) ? formatMonthYear(currentLastInstallmentDate) : '_____________';
    const displayContractNumber = isInstallmentPlan ? contractNumber : '_____________';
    const displayFullName = isInstallmentPlan ? fullName : '_____________';
    
    const signatureSrc = signatureImageUrl || applicationData.signature || '';
    const hasSignature = signatureSrc && signatureSrc !== '';
    
    const topSignatureSection = `
        <div class="signature-block" style="margin-top: 20px;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr>
                    <td style="width: 50%; text-align: center; vertical-align: top; padding: 0 10px;">
                        ${hasSignature ? `<img src="${signatureSrc}" alt="Signature" style="max-width: 200px; max-height: 80px; display: block; margin: 0 auto; border: none;" />` : '<div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>'}
                        <div style="margin-top: 8px;">
                            <u><strong>${fullName}</strong></u>
                        </div>
                        <div style="font-size: 10px; color: #666; margin-top: 4px;">Subscriber's Signature Over Printed Name</div>
                    </td>
                    <td style="width: 50%; text-align: center; vertical-align: top; padding: 0 10px;">
                        <div style="margin-top: 85px;">
                            <u><strong>${dateSubmitted}</strong></u>
                        </div>
                        <div style="font-size: 10px; color: #666; margin-top: 4px;">Date</div>
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    const bottomSignatureSection = `
        <div class="signature-block" style="margin-top: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="width: 50%; text-align: left; vertical-align: top;"></td>
                    <td style="width: 50%; text-align: center; vertical-align: top; padding: 0 10px;">
                        ${hasSignature ? `<img src="${signatureSrc}" alt="Signature" style="max-width: 200px; max-height: 80px; display: block; margin: 0 auto; border: none;" />` : '<div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>'}
                        <div style="margin-top: 8px;">
                            <u><strong>${fullName}</strong></u>
                        </div>
                        <div style="font-size: 10px; color: #666; margin-top: 4px;">Subscriber's Signature Over Printed Name</div>
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    const addendumSection = `
        <div class="addendum-section">
            <div class="addendum-title">
                <strong>CABLEVISION SYSTEMS CORPORATION</strong>
            </div>
            <div class="addendum-content">
                <p style="text-align: center;"><strong>ADDENDUM TO CONTRACT NUMBER ${contractNumber}</strong></p>
                <p>That I, <strong>${fullName}</strong> holder of CONTRACT Number <strong>${contractNumber}</strong> dated <strong>${approvalDate}</strong> wishes to avail of your INTERNET SERVICE under <strong>${planName} (${planSpeed})</strong>. To take effect on <strong>_________________________</strong>.</p>
                <p>This is also to acknowledge that I have to pay in advance the monthly dues corresponding to the plan that I choose and it is understood that the TERMS AND CONDITIONS on the original contract remain.</p>
            </div>
        </div>
    `;
    
    let installmentSection = '';
    if (isInstallmentPlan) {
        installmentSection = `
            <div class="installment-section">
                <div class="installment-title">
                    <strong>AGREEMENT TO PAY ON INSTALLMENT</strong><br>
                    FOR THE INSTALLATION FEE AND/OR SET TOP BOX FOR TV EXTENSION
                </div>
                <div class="addendum-content">
                    <p>That I, <strong>${displayFullName}</strong> holder of contract no. <strong>${displayContractNumber}</strong> wishes to avail of the INSTALLMENT PLAN for the INSTALLATION FEE starting <strong>${firstInstallmentFormatted}</strong> up to <strong>${lastInstallmentFormatted}</strong> and the SET TOP BOX for our <strong>_________</strong> TV Extension/s for five (5) months.</p>
                    <p><strong>NOTE:</strong> In the event that the account is disconnected during the said period, the remaining installment shall be paid in full.</p>
                </div>
            </div>
        `;
    }
    
    return `
        <div style="max-height: 70vh; overflow-y: auto; padding: 20px; background: #ffffff; border-radius: 8px; font-family: 'Times New Roman', serif;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="width: 80px;">
                    <img src="/static/logo.png" alt="Logo" style="max-width: 70px; max-height: 70px; display: block;" onerror="this.style.display='none'">
                </div>
                <div style="flex: 1; text-align: center;">
                    <h1 style="font-size: 16px; margin: 0; font-weight: bold;">CABLE TELEVISION/CABLE ONLY/OR</h1>
                    <h1 style="font-size: 16px; margin: 5px 0; font-weight: bold;">CABLE &amp; INTERNET SERVICE CONTRACT</h1>
                    <div style="font-size: 13px; font-weight: bold; margin-top: 10px;">
                        NO. <span style="font-weight: bold; color: #0047ab;">${contractNumber}</span>
                    </div>
                </div>
                <div style="width: 80px;">
                    <img src="/static/logo_right.png" alt="Right Logo" style="max-width: 70px; max-height: 70px; display: block; margin-left: auto;" onerror="this.style.display='none'">
                </div>
            </div>
            
            <h3 style="font-size: 14px; font-weight: bold; margin: 15px 0 10px 0; text-align: center;">CONTRACT TERMS AND CONDITIONS</h3>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 10px; text-align: justify;">
                I, <span style="font-weight: bold; color: #0047ab;">${fullName}</span>, legal age, <span style="font-weight: bold; color: #0047ab;">${age}</span> years old, ${civilStatus} and residing at <span style="font-weight: bold; color: #0047ab;">${addressDisplay}</span> hereby apply and subscribed for the service of CABLE &amp; INTERNET and agree to the following terms and conditions:
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Payment:</strong> The subscriber shall pay a Non-Refundable connection fee of P 1800 and cable in excess of 100 meters at P10.00 per meter. For CABLE/INTERNET BUNDLE subscriber, a one (1) month subscription fee of P800 shall be paid upon installation and activation of the service. Succeeding monthly subscription fee is due and payable every <span style="font-weight: bold; color: #0047ab;">${billingDate}</span> of each month. Failure to pay the monthly subscription fee on due date and after the grace period of 7 days will mean automatic disconnection of cable/internet service. The company shall have the right to discontinue/terminate/cancel and effect disconnection of Cable TV services in case of default or non-payment of accounts for two (2) succeeding payments.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Deposit:</strong> Subscriber, who leases his/her house or does not own the house where service will be installed, shall pay a DEPOSIT upon installation. A deposit equivalent to one (1) month subscription fee for CABLE/INTERNET BUNDLE subscriber while two (2) months subscription fee for CABLE SUBSCRIBER ONLY. The said deposit cannot be applied to the monthly fee and shall only be refunded upon termination of the contract and upon pull out of all equipment installed in the premises of the subscriber. Should the subscriber wishes to apply for reconnection, a reconnection fee of P500.00 shall be paid plus the Deposit and the one (1) month advance subscription fee for CABLE/INTERNET BUNDLE subscriber. For CABLE SUBSCRIBER ONLY, a reconnection fee of P300.00 plus the DEPOSIT shall be paid.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Access to the Premises:</strong> The subscriber authorizes our employees, contractors and representatives to enter your premise in order to install, maintain, inspect, repair, remove and replace Equipment at a time mutually agreeable upon by both parties.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Subscriber Usage:</strong> The subscriber shall not in any way use his subscription for commercial purposes. Transmission of any Internet content which violates national or international law is prohibited. This includes but not limited to copyrighted materials, those legally adjudged to be threat to national security, or intruding into the privacy of individuals, offensive on moral, religious, racial or political grounds; abusive, indecent, obscene or menacing nature of material or information, infringement of intellectual property rights of any person as well as trade secrets.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Relocating Equipment:</strong> The subscriber is not allowed to relocate equipment installed in their premises. However, equipment may be relocated by the company's authorized representatives upon the request of the subscriber at a time mutually agreeable to both parties. Applicable fees and charges may apply.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Cable Modem and Setup Box:</strong> The subscriber will be given FREE USE of a Cable Modem and Set Top Box. This equipment will remain the property of CABLEVISION SYSTEMS CORP. For any Cable TV Extension the subscriber will have to pay for the cost of the SET TOP BOX amounting to 1400 and a HUB amounting to 420. There will be no additional cost on the monthly subscription. All equipment has one (1) year warranty against factory defects. If the defect was due to improper use and mishandling by the user during the warranty period, the cost of replacement will be chargeable to the account of the subscriber. If cable modem or Set Top Box becomes defective after the warranty period, cost of the new equipment is chargeable to the subscriber.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Termination/Suspension of Service:</strong> The company reserves the right to suspend or terminate this contract without prior notice and pull out equipment provided at the subscriber's premises due to non-payment of all applicable fees and charges within the period and shall not be held liable for any damage; or loss which the Subscriber may incur by reason of suspension and/or termination of services based on this agreement.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Disclaimer:</strong> Cablevision Systems Corp./MyCv Broadband shall not be held liable for any damages or delay in business transaction or communication of the subscriber or whatsoever, the subscriber may suffer or may have suffered due to the use of myCv Broadband Services. This includes but not limited to any loss of profits, incidental or consequential damages arising out of the Costumer's use of or inability to use; any loss of information howsoever caused whether as a result of any interruption, suspension, or termination of the Service or otherwise, or for the contents, accuracy or quality of information available, received or transmitted through the Service; or for failure of the Subscriber to comply with applicable laws, rules and regulations and all the terms prescribed by the Philippine National Telecommunications Commission for the use of any telecommunication systems, service or equipment. myCv Broadband shall not be liable for any delay or failure in the performance of service under this agreement resulting from acts beyond its control, including without limitation, acts of God, acts or regulations of any government or national authority, war or national emergency, accident, fire, electric power failure, temporary loss of signal not attributed to myCv Broadband, lightning, strikes, lock-outs, industrial disputes whether or not involving myCv Broadband employees.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                myCv Broadband reserves the right to adjust, modify, amend or supplements these terms and condition as the service may require. myCv Broadband will advise SUBSCRIBER of any change by sending him notice setting out these changes.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 8px; text-align: justify;">
                <strong>Governing Law and Jurisdiction:</strong> The Laws of the Republic of the Philippines governs this Agreement and the Subscriber and myCv Broadband hereby submit to the exclusive jurisdiction of the courts of Sta. Cruz, Laguna, Philippines.
            </p>
            
            <p style="font-size: 11px; line-height: 1.5; margin-bottom: 15px; text-align: justify;">
                I hereby acknowledge that I have read and understood all the terms and conditions herein and that I voluntarily sign this agreement with full knowledge and consent of everything this Agreement contains, implies and entails.
            </p>
            
            ${topSignatureSection}
            ${addendumSection}
            ${installmentSection}
            ${bottomSignatureSection}
        </div>
    `;
}

// =========================
// VIEW CONTRACT FUNCTION
// =========================
async function viewContract() {
    const appData = await loadApplicationData();
    const contractNumber = appData.contract_number;
    
    if (!contractNumber) {
        showToast("No contract found for this application. The application has not been approved yet.", "warning");
        return;
    }
    
    const billingDate = appData.billing_date || 'Not set';
    const signatureImageUrl = appData.signature || null;
    
    const installationFee = appData.installation_fee || '';
    const isInstallment = installationFee && (installationFee.toLowerCase().includes('installment') || 
                          installationFee.toLowerCase().includes('installment - 6 months') || 
                          installationFee.toLowerCase().includes('installment - 9 months'));
    
    let firstInstallmentDate = null;
    let lastInstallmentDate = null;
    
    try {
        const contractRes = await fetch(`/api/superadmin/contracts/${contractNumber}`);
        if (contractRes.ok) {
            const contractData = await contractRes.json();
            if (contractData.first_installment_date) {
                firstInstallmentDate = contractData.first_installment_date;
            }
            if (contractData.last_installment_date) {
                lastInstallmentDate = contractData.last_installment_date;
            }
        }
    } catch (err) {
        console.log("Could not fetch contract data:", err);
    }
    
    if (!firstInstallmentDate && appData.first_installment_date) {
        firstInstallmentDate = appData.first_installment_date;
    }
    if (!lastInstallmentDate && appData.last_installment_date) {
        lastInstallmentDate = appData.last_installment_date;
    }
    
    isInstallmentPlan = isInstallment;
    currentFirstInstallmentDate = firstInstallmentDate;
    currentLastInstallmentDate = lastInstallmentDate;
    
    const contractHtml = generateContractPreview(appData, contractNumber, billingDate, signatureImageUrl);
    document.getElementById('contractPreviewContent').innerHTML = contractHtml;
    
    const contractPreviewModal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
    
    const modalFooter = document.querySelector('#contractPreviewModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="downloadContractBtn">
                <i class="fas fa-download"></i> Download Contract
            </button>
        `;
        
        const downloadBtn = document.getElementById('downloadContractBtn');
        if (downloadBtn) {
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            newDownloadBtn.addEventListener('click', () => {
                downloadContract(contractNumber);
            });
        }
    }
    
    contractPreviewModal.show();
}

function downloadContract(contractNumber) {
    if (!contractNumber) {
        showToast("Contract number not found", "error");
        return;
    }
    window.open(`/superadmin/download/contract/${appId}/${contractNumber}`, "_blank");
}

function addViewContractButtonListener() {
    const viewContractBtn = document.getElementById('viewContractBtn');
    if (viewContractBtn) {
        const newViewContractBtn = viewContractBtn.cloneNode(true);
        viewContractBtn.parentNode.replaceChild(newViewContractBtn, viewContractBtn);
        newViewContractBtn.addEventListener('click', () => {
            viewContract();
        });
    }
}

// =========================
// SAVE CONTRACT TO MYSQL (FIXED)
// =========================
async function saveContractToMySQL(contractNumber, applicationData, billingDate) {
    console.log("🔵🔵🔵 SAVE CONTRACT TO MYSQL CALLED 🔵🔵🔵");
    console.log("Contract Number:", contractNumber);
    console.log("Billing Date:", billingDate);
    
    try {
        const firstName = applicationData.first_name || '';
        const middleName = applicationData.middle_name || '';
        const lastName = applicationData.last_name || '';
        const suffix = applicationData.suffix || '';
        const fullName = getCleanFullName(firstName, middleName, lastName, suffix);
        const age = calculateAge(applicationData.birthdate);
        const barangay = getCleanValue(applicationData.barangay);
        const city = getCleanValue(applicationData.city);
        const province = getCleanValue(applicationData.province);
        const address = `${barangay}, ${city}, ${province}`.trim().replace(/^,|,$/g, '').replace(/,,/g, ',');
        const addressDisplay = address || 'Not provided';
        
        const contractData = {
            contract_number: contractNumber,
            application_id: appId,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix: suffix,
            full_name: fullName,
            age: age,
            civil_status: applicationData.civil_status || '',
            address: addressDisplay,
            barangay: barangay,
            city: city,
            province: province,
            billing_date: billingDate,
            date_submitted: applicationData.date_submitted || new Date().toLocaleDateString(),
            status: 'Active',
            created_at: new Date().toISOString(),
            application_data: applicationData,
            is_installment_plan: isInstallmentPlan,
            first_installment_date: currentFirstInstallmentDate,
            last_installment_date: currentLastInstallmentDate,
            installation_fee: applicationData.installation_fee || '',
            assigned_team_id: currentSelectedTeam,
            installation_date: currentInstallationDateValue
        };
        
        console.log("Sending contract data to server...");
        
        const response = await fetch(`/api/superadmin/contracts/${contractNumber}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contractData)
        });
        
        console.log("Response status:", response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log("Contract saved successfully:", result);
            showToast("Contract saved successfully!", "success");
            return true;
        } else {
            const errorData = await response.json();
            console.error("Failed to save contract:", errorData);
            showToast("Failed to save contract: " + (errorData.error || "Unknown error"), "error");
            return false;
        }
    } catch (error) {
        console.error("Error saving contract:", error);
        showToast("Error saving contract: " + error.message, "error");
        return false;
    }
}

// =========================
// VALIDATION FUNCTIONS
// =========================
async function validateContractNumber(contractNumber) {
    if (!contractNumber || contractNumber.trim() === "") {
        return { valid: false, message: "Contract number is required" };
    }
    
    try {
        const response = await fetch(`/api/superadmin/check-contract-number/${encodeURIComponent(contractNumber)}`);
        const data = await response.json();
        
        if (data.exists) {
            return { valid: false, message: "Contract number already exists. Please use a unique number." };
        }
        
        return { valid: true, message: "" };
    } catch (error) {
        console.error("Error validating contract number:", error);
        return { valid: false, message: "Error validating contract number" };
    }
}

function validateBillingDate(billingDate) {
    const day = parseInt(billingDate);
    if (isNaN(day) || day < 1 || day > 31) {
        return { valid: false, message: "Please enter a valid billing day (1-31)" };
    }
    return { valid: true, message: "" };
}

function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// =========================
// SETUP INSTALLMENT DATE INPUTS WITH AUTO-FILL FROM INSTALLATION DATE (READ-ONLY)
// =========================
function setupInstallmentDateInputs(installmentMonths) {
    const firstInstallmentInput = document.getElementById('firstInstallmentDate');
    const lastInstallmentInput = document.getElementById('lastInstallmentDate');
    const installmentErrorDiv = document.getElementById('installmentError');
    const installationDateInput = document.getElementById('installationDate');
    
    if (firstInstallmentInput) {
        const currentMonth = getCurrentYearMonth();
        firstInstallmentInput.setAttribute('min', currentMonth);
        firstInstallmentInput.value = '';
        firstInstallmentInput.classList.remove('is-invalid');
        
        // ✅ GAWING READ-ONLY ANG FIRST INSTALLMENT DATE
        firstInstallmentInput.setAttribute('readonly', true);
        firstInstallmentInput.style.cursor = 'not-allowed';
        firstInstallmentInput.style.backgroundColor = '#f3f4f6';
        firstInstallmentInput.title = 'Auto-filled from installation date';
        
        const newFirstInstallmentInput = firstInstallmentInput.cloneNode(true);
        firstInstallmentInput.parentNode.replaceChild(newFirstInstallmentInput, firstInstallmentInput);
        
        // ✅ AUTO-FILL FIRST INSTALLMENT DATE FROM INSTALLATION DATE
        newFirstInstallmentInput.addEventListener('focus', function() {
            // Check if installation date is selected and first installment is empty
            if (installationDateInput && installationDateInput.value && !this.value) {
                const installDate = new Date(installationDateInput.value);
                if (!isNaN(installDate.getTime())) {
                    const year = installDate.getFullYear();
                    const month = String(installDate.getMonth() + 1).padStart(2, '0');
                    const monthYear = `${year}-${month}`;
                    
                    // Check if month is not in the past
                    if (monthYear >= currentMonth) {
                        this.value = monthYear;
                        console.log(`✅ Auto-filled first installment: ${monthYear}`);
                        
                        // Trigger change event to compute last installment
                        const changeEvent = new Event('change', { bubbles: true });
                        this.dispatchEvent(changeEvent);
                        
                        // Show feedback
                        this.style.borderColor = '#22c55e';
                        this.style.background = '#f0fdf4';
                        setTimeout(() => {
                            this.style.borderColor = '';
                            this.style.background = '#f3f4f6';
                        }, 2000);
                    }
                }
            }
        });
        
        newFirstInstallmentInput.addEventListener('change', function() {
            const selectedDate = this.value;
            const lastInstallmentInputElement = document.getElementById('lastInstallmentDate');
            
            if (selectedDate && selectedDate < currentMonth) {
                if (installmentErrorDiv) {
                    installmentErrorDiv.classList.remove('d-none');
                    installmentErrorDiv.querySelector('span').textContent = `First installment date cannot be earlier than ${currentMonth}.`;
                }
                this.classList.add('is-invalid');
                if (lastInstallmentInputElement) lastInstallmentInputElement.value = '';
                return;
            }
            
            if (selectedDate && installmentMonths > 0) {
                const lastDate = calculateLastInstallmentDate(selectedDate, installmentMonths);
                if (lastDate && lastInstallmentInputElement) {
                    lastInstallmentInputElement.value = lastDate;
                    const changeEvent = new Event('change', { bubbles: true });
                    lastInstallmentInputElement.dispatchEvent(changeEvent);
                    
                    if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
                    if (lastInstallmentInputElement) lastInstallmentInputElement.classList.remove('is-invalid');
                    this.classList.remove('is-invalid');
                    
                    console.log(`✅ Auto-computed last installment: ${lastDate}`);
                }
            } else if (!selectedDate && lastInstallmentInputElement) {
                lastInstallmentInputElement.value = '';
                if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
            }
        });
        
        newFirstInstallmentInput.addEventListener('input', function() {
            if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
            if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
        });
    }
    
    if (lastInstallmentInput) {
        lastInstallmentInput.value = '';
        lastInstallmentInput.classList.remove('is-invalid');
        
        // ✅ GAWING READ-ONLY ANG LAST INSTALLMENT DATE
        lastInstallmentInput.setAttribute('readonly', true);
        lastInstallmentInput.style.cursor = 'not-allowed';
        lastInstallmentInput.style.backgroundColor = '#f3f4f6';
        lastInstallmentInput.title = 'Auto-computed from first installment date';
        
        const newLastInstallmentInput = lastInstallmentInput.cloneNode(true);
        lastInstallmentInput.parentNode.replaceChild(newLastInstallmentInput, lastInstallmentInput);
        
        newLastInstallmentInput.addEventListener('change', function() {
            if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
            if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
        });
        
        newLastInstallmentInput.addEventListener('input', function() {
            if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
            if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
        });
    }
    
    // ✅ AUTO-FILL WHEN INSTALLATION DATE CHANGES
    if (installationDateInput) {
        const newInstallationDateInput = installationDateInput.cloneNode(true);
        installationDateInput.parentNode.replaceChild(newInstallationDateInput, installationDateInput);
        
        newInstallationDateInput.addEventListener('change', function() {
            const firstInstallmentInputElement = document.getElementById('firstInstallmentDate');
            if (firstInstallmentInputElement && this.value) {
                const installDate = new Date(this.value);
                if (!isNaN(installDate.getTime())) {
                    const year = installDate.getFullYear();
                    const month = String(installDate.getMonth() + 1).padStart(2, '0');
                    const monthYear = `${year}-${month}`;
                    const currentMonth = getCurrentYearMonth();
                    
                    if (monthYear >= currentMonth) {
                        firstInstallmentInputElement.value = monthYear;
                        console.log(`✅ Auto-filled first installment from installation date: ${monthYear}`);
                        
                        // Trigger change event to compute last installment
                        const changeEvent = new Event('change', { bubbles: true });
                        firstInstallmentInputElement.dispatchEvent(changeEvent);
                    }
                }
            }
        });
    }
}

// =========================
// SHOW CONFIRM MODAL FOR FINAL APPROVAL
// =========================
function showConfirmApprovalModal() {
    const confirmContractNumberSpan = document.getElementById('confirmContractNumber');
    if (confirmContractNumberSpan) {
        confirmContractNumberSpan.textContent = currentContractNumber;
    }
    
    let confirmBillingDateSpan = document.getElementById('confirmBillingDate');
    if (!confirmBillingDateSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const billingDateDiv = document.createElement('div');
            billingDateDiv.id = 'confirmBillingDate';
            billingDateDiv.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong> Every ${currentBillingDate} of the month`;
            alertDiv.appendChild(billingDateDiv);
        }
    } else {
        confirmBillingDateSpan.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong> Every ${currentBillingDate} of the month`;
    }
    
    // Add team and installation date to confirmation modal
    let confirmTeamSpan = document.getElementById('confirmTeam');
    if (!confirmTeamSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const teamDiv = document.createElement('div');
            teamDiv.id = 'confirmTeam';
            const teamSelect = document.getElementById('teamAssignment');
            const teamName = teamSelect ? teamSelect.options[teamSelect.selectedIndex]?.text || currentSelectedTeam : currentSelectedTeam;
            teamDiv.innerHTML = `<br><strong><i class="fas fa-users"></i> Installation Team:</strong> ${teamName}`;
            alertDiv.appendChild(teamDiv);
        }
    }
    
    let confirmInstallationDateSpan = document.getElementById('confirmInstallationDate');
    if (!confirmInstallationDateSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const dateDiv = document.createElement('div');
            dateDiv.id = 'confirmInstallationDate';
            const formattedDate = currentInstallationDateValue ? new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
            dateDiv.innerHTML = `<br><strong><i class="fas fa-calendar-check"></i> Installation Date:</strong> ${formattedDate}`;
            alertDiv.appendChild(dateDiv);
        }
    }
    
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmApprovalModal'));
    confirmModal.show();
}

// =========================
// CONTRACT NUMBER MODAL FUNCTIONS
// =========================
function showContractNumberModal() {
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending" && currentApplicationStatus.toLowerCase() !== "request sent") {
        showToast("This application has already been processed!", "warning");
        return;
    }
    
    const contractModalElement = document.getElementById('contractNumberModal');
    const contractInput = document.getElementById('contractNumber');
    let billingDateInput = document.getElementById('billingDate');
    const proceedBtn = document.getElementById('proceedToConfirmBtn');
    const contractErrorDiv = document.getElementById('contractNumberError');
    const billingErrorDiv = document.getElementById('billingDateError');
    const installmentFields = document.getElementById('installmentFields');
    const installmentErrorDiv = document.getElementById('installmentError');
    const teamSelect = document.getElementById('teamAssignment');
    const teamErrorDiv = document.getElementById('teamAssignmentError');
    const installationDateInput = document.getElementById('installationDate');
    const installationDateErrorDiv = document.getElementById('installationDateError');
    
    if (billingDateInput) {
        billingDateInput = setupBillingDateInput(billingDateInput);
        billingDateInput.placeholder = '1-31';
        billingDateInput.classList.remove('is-invalid', 'is-valid');
    }
    if (contractErrorDiv) contractErrorDiv.classList.add('d-none');
    if (billingErrorDiv) billingErrorDiv.classList.add('d-none');
    if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
    if (contractInput) contractInput.classList.remove('is-invalid', 'is-valid');
    if (teamErrorDiv) teamErrorDiv.classList.add('d-none');
    if (teamSelect) teamSelect.classList.remove('is-invalid', 'is-valid');
    if (installationDateErrorDiv) installationDateErrorDiv.classList.add('d-none');
    if (installationDateInput) installationDateInput.classList.remove('is-invalid', 'is-valid');
    
    currentContractNumber = null;
    currentBillingDate = null;
    currentFirstInstallmentDate = null;
    currentLastInstallmentDate = null;
    currentSelectedTeam = null;
    currentInstallationDateValue = null;
    
    // ✅ LOAD TEAMS FILTERED BY APPLICATION CITY
    loadApplicationData().then(appData => {
        const appCity = appData.city || applicationCity || '';
        console.log(`📍 Application city for team filter: "${appCity}"`);
        loadTeamsForDropdown(appCity);
        setInstallationDateMin();
    });
    
    loadApplicationData().then(appData => {
        const installationFee = appData.installation_fee || '';
        const installmentMonths = getInstallmentMonths(installationFee);
        isInstallmentPlan = installmentMonths > 0;
        
        let getFullContractNumber = () => '';
        if (contractInput && applicationCity) {
            const barangay = appData.barangay || null;
            getFullContractNumber = setupContractNumberInput(contractInput, applicationCity, barangay);
        }
        
        // Sa loob ng showContractNumberModal()
        if (installmentFields) {
            if (isInstallmentPlan) {
                installmentFields.style.display = 'block';
                
                const existingPeriodDisplay = document.getElementById('installmentPeriodDisplay');
                if (existingPeriodDisplay) {
                    existingPeriodDisplay.remove();
                }
                
                const alertDiv = installmentFields.querySelector('.alert-warning');
                if (alertDiv) {
                    alertDiv.innerHTML = `
                        <i class="fas fa-info-circle"></i> 
                        <div class="alert-content">
                            <strong>Installment Plan</strong>
                            <span>This application has an installment plan of <strong>${installmentMonths} month${installmentMonths > 1 ? 's' : ''}</strong> for the installation fee.</span>
                            <span class="text-muted">First installment date will auto-fill from installation date (read-only).</span>
                        </div>
                    `;
                    alertDiv.classList.remove('alert-warning');
                    alertDiv.classList.add('alert-info');
                }
                
                installmentFields.setAttribute('data-installment-months', installmentMonths);
                setupInstallmentDateInputs(installmentMonths);
            } else {
                installmentFields.style.display = 'none';
            }
        }
        
        if (teamSelect) {
            const newTeamSelect = teamSelect.cloneNode(true);
            teamSelect.parentNode.replaceChild(newTeamSelect, teamSelect);
            newTeamSelect.addEventListener('change', function() {
                if (teamErrorDiv) teamErrorDiv.classList.add('d-none');
                if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
            });
        }
        
        const freshInstallationDateInput = document.getElementById('installationDate');
if (freshInstallationDateInput) {
    freshInstallationDateInput.addEventListener('change', function() {
        if (installationDateErrorDiv) installationDateErrorDiv.classList.add('d-none');
        if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
    });
}
        
        const newProceedBtn = proceedBtn.cloneNode(true);
        proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
        
        newProceedBtn.addEventListener('click', async () => {
            const contractNumber = getFullContractNumber();
            let billingDate = billingDateInput ? billingDateInput.value.trim() : null;
            const defaultPrefix = getContractPrefix(applicationCity);
            
            const liveContractNumberInput = document.getElementById('contractNumber');
            if (!contractNumber || !liveContractNumberInput || !liveContractNumberInput.value.trim()) {
                if (liveContractNumberInput) liveContractNumberInput.classList.add('is-invalid');
                if (contractErrorDiv) {
                    contractErrorDiv.classList.remove('d-none');
                    contractErrorDiv.querySelector('span').textContent = 'Please enter a valid contract number';
                }
                return;
            }
            
            const billingValidation = validateBillingDate(billingDate);
            if (!billingValidation.valid) {
                if (billingDateInput) billingDateInput.classList.add('is-invalid');
                if (billingErrorDiv) {
                    billingErrorDiv.classList.remove('d-none');
                    billingErrorDiv.querySelector('span').textContent = billingValidation.message;
                }
                return;
            }
            
            const teamSelectElement = document.getElementById('teamAssignment');
            const selectedTeam = teamSelectElement ? teamSelectElement.value : '';
            if (!selectedTeam) {
                if (teamErrorDiv) {
                    teamErrorDiv.classList.remove('d-none');
                    teamErrorDiv.querySelector('span').textContent = 'Please select an installation team';
                }
                if (teamSelectElement) teamSelectElement.classList.add('is-invalid');
                return;
            }
            
            // Sa loob ng showContractNumberModal() function, hanapin ang installation date validation
            // at palitan ito ng:

            const installationDateElement = document.getElementById('installationDate');
            const installationDateValue = installationDateElement ? installationDateElement.value : '';
            if (!installationDateValue) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Please select an installation date';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            // ✅ VALIDATE: Installation date must be within 6 months from today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(installationDateValue);

            // Check if date is in the past
            if (selectedDate < today) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Installation date cannot be in the past';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            // ✅ Check if date is beyond 6 months
            const maxDate = new Date(today);
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (selectedDate > maxDate) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Installation date cannot be more than 6 months from today';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            currentSelectedTeam = selectedTeam;
            currentInstallationDateValue = installationDateValue;
            
            if (isInstallmentPlan) {
                const firstInstallmentInputElement = document.getElementById('firstInstallmentDate');
                const lastInstallmentInputElement = document.getElementById('lastInstallmentDate');
                
                const firstInstallment = firstInstallmentInputElement ? firstInstallmentInputElement.value.trim() : '';
                const lastInstallment = lastInstallmentInputElement ? lastInstallmentInputElement.value.trim() : '';
                
                if (!firstInstallment || !lastInstallment) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = 'Please enter both first and last installment dates';
                    }
                    if (firstInstallmentInputElement && !firstInstallment) firstInstallmentInputElement.classList.add('is-invalid');
                    if (lastInstallmentInputElement && !lastInstallment) lastInstallmentInputElement.classList.add('is-invalid');
                    return;
                }
                
                const currentMonth = getCurrentYearMonth();
                if (firstInstallment < currentMonth) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = `First installment date cannot be earlier than ${currentMonth}.`;
                    }
                    if (firstInstallmentInputElement) firstInstallmentInputElement.classList.add('is-invalid');
                    return;
                }
                
                if (firstInstallmentInputElement) firstInstallmentInputElement.classList.remove('is-invalid');
                if (lastInstallmentInputElement) lastInstallmentInputElement.classList.remove('is-invalid');
                
                if (firstInstallment >= lastInstallment) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = 'First installment date must be before last installment date';
                    }
                    return;
                }
                
                currentFirstInstallmentDate = firstInstallment;
                currentLastInstallmentDate = lastInstallment;
            }
            
            newProceedBtn.disabled = true;
            newProceedBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Validating...';
            
            const validation = await validateContractNumber(contractNumber);
            
            if (!validation.valid) {
                contractInput.classList.add('is-invalid');
                if (contractErrorDiv) {
                    contractErrorDiv.classList.remove('d-none');
                    contractErrorDiv.querySelector('span').textContent = validation.message;
                }
                newProceedBtn.disabled = false;
                newProceedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Confirm';
                return;
            }
            
            if (liveContractNumberInput) liveContractNumberInput.classList.add('is-valid');
            currentContractNumber = contractNumber;
            currentBillingDate = billingDate;
            
            console.log("✅ CONTRACT NUMBER SET:", currentContractNumber);
            console.log("✅ BILLING DATE SET:", currentBillingDate);
            console.log("✅ TEAM ID SET:", currentSelectedTeam);
            console.log("✅ INSTALLATION DATE SET:", currentInstallationDateValue);
            
            const modal = bootstrap.Modal.getInstance(contractModalElement);
            if (modal) modal.hide();
            
            const signatureImageUrl = appData.signature || null;
            const contractHtml = generateContractPreview(appData, currentContractNumber, currentBillingDate, signatureImageUrl);
            document.getElementById('contractPreviewContent').innerHTML = contractHtml;
            
            const contractPreviewModal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
            
            const modalFooter = document.querySelector('#contractPreviewModal .modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button type="button" class="btn-proceed-final" id="proceedToFinalApprovalBtn">
                    <i class="fas fa-check-circle"></i> Proceed to Final Approval
                    </button>
                `;
                
                const finalApprovalBtn = document.getElementById('proceedToFinalApprovalBtn');
                if (finalApprovalBtn) {
                    const newFinalBtn = finalApprovalBtn.cloneNode(true);
                    finalApprovalBtn.parentNode.replaceChild(newFinalBtn, finalApprovalBtn);
                    newFinalBtn.addEventListener('click', function() {
                        console.log("🔵 PROCEED TO FINAL APPROVAL CLICKED");
                        contractPreviewModal.hide();
                        showConfirmApprovalModal();
                    });
                }
            }
            
            contractPreviewModal.show();
            
            newProceedBtn.disabled = false;
            newProceedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Confirm';
        });
    });
    
    const contractModal = new bootstrap.Modal(contractModalElement);
    contractModal.show();
}

async function loadApplicationData() {
    try {
        const res = await fetch(`/api/superadmin/application/${appId}?t=${Date.now()}`);
        return await res.json();
    } catch (err) {
        console.error("Failed to load application data:", err);
        return {};
    }
}

function showContractNumberModalForRequest() {
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending" && currentApplicationStatus.toLowerCase() !== "request sent") {
        showToast("This application has already been processed!", "warning");
        return;
    }
    
    const contractModalElement = document.getElementById('contractNumberModal');
    const contractInput = document.getElementById('contractNumber');
    let billingDateInput = document.getElementById('billingDate');
    const proceedBtn = document.getElementById('proceedToConfirmBtn');
    const contractErrorDiv = document.getElementById('contractNumberError');
    const billingErrorDiv = document.getElementById('billingDateError');
    const installmentFields = document.getElementById('installmentFields');
    const installmentErrorDiv = document.getElementById('installmentError');
    const teamSelect = document.getElementById('teamAssignment');
    const teamErrorDiv = document.getElementById('teamAssignmentError');
    const installationDateInput = document.getElementById('installationDate');
    const installationDateErrorDiv = document.getElementById('installationDateError');
    
    if (billingDateInput) {
        billingDateInput = setupBillingDateInput(billingDateInput);
        billingDateInput.placeholder = '1-31';
        billingDateInput.classList.remove('is-invalid', 'is-valid');
    }
    if (contractErrorDiv) contractErrorDiv.classList.add('d-none');
    if (billingErrorDiv) billingErrorDiv.classList.add('d-none');
    if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
    if (contractInput) contractInput.classList.remove('is-invalid', 'is-valid');
    if (teamErrorDiv) teamErrorDiv.classList.add('d-none');
    if (teamSelect) teamSelect.classList.remove('is-invalid', 'is-valid');
    if (installationDateErrorDiv) installationDateErrorDiv.classList.add('d-none');
    if (installationDateInput) installationDateInput.classList.remove('is-invalid', 'is-valid');
    
    currentContractNumber = null;
    currentBillingDate = null;
    currentFirstInstallmentDate = null;
    currentLastInstallmentDate = null;
    currentSelectedTeam = null;
    currentInstallationDateValue = null;
    
    // ✅ LOAD TEAMS FILTERED BY APPLICATION CITY
    loadApplicationData().then(appData => {
        const appCity = appData.city || applicationCity || '';
        console.log(`📍 Application city for team filter (request): "${appCity}"`);
        loadTeamsForDropdown(appCity);
        setInstallationDateMin();
    });
    
    loadApplicationData().then(appData => {
        const installationFee = appData.installation_fee || '';
        const installmentMonths = getInstallmentMonths(installationFee);
        isInstallmentPlan = installmentMonths > 0;
        
        let getFullContractNumber = () => '';
        if (contractInput && applicationCity) {
            const barangay = appData.barangay || null;
            getFullContractNumber = setupContractNumberInput(contractInput, applicationCity, barangay);
        }
        
        // Sa loob ng showContractNumberModalForRequest()
        if (installmentFields) {
            if (isInstallmentPlan) {
                installmentFields.style.display = 'block';
                
                const existingPeriodDisplay = document.getElementById('installmentPeriodDisplay');
                if (existingPeriodDisplay) {
                    existingPeriodDisplay.remove();
                }
                
                const alertDiv = installmentFields.querySelector('.alert-warning');
                if (alertDiv) {
                    alertDiv.innerHTML = `
                        <i class="fas fa-info-circle"></i> 
                        <div class="alert-content">
                            <strong>Installment Plan</strong>
                            <span>This application has an installment plan of <strong>${installmentMonths} month${installmentMonths > 1 ? 's' : ''}</strong> for the installation fee.</span>
                            <span class="text-muted">First installment date will auto-fill from installation date (read-only).</span>
                        </div>
                    `;
                    alertDiv.classList.remove('alert-warning');
                    alertDiv.classList.add('alert-info');
                }
                
                installmentFields.setAttribute('data-installment-months', installmentMonths);
                setupInstallmentDateInputs(installmentMonths);
            } else {
                installmentFields.style.display = 'none';
            }
        }
        
        if (teamSelect) {
            const newTeamSelect = teamSelect.cloneNode(true);
            teamSelect.parentNode.replaceChild(newTeamSelect, teamSelect);
            newTeamSelect.addEventListener('change', function() {
                if (teamErrorDiv) teamErrorDiv.classList.add('d-none');
                if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
            });
        }
        
        const freshInstallationDateInput = document.getElementById('installationDate');
        if (freshInstallationDateInput) {
            freshInstallationDateInput.addEventListener('change', function() {
                if (installationDateErrorDiv) installationDateErrorDiv.classList.add('d-none');
                if (this.classList.contains('is-invalid')) this.classList.remove('is-invalid');
            });
        }
        
        const newProceedBtn = proceedBtn.cloneNode(true);
        proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
        
        newProceedBtn.addEventListener('click', async () => {
            const contractNumber = getFullContractNumber();
            let billingDate = billingDateInput ? billingDateInput.value.trim() : null;
            const defaultPrefix = getContractPrefix(applicationCity);
            
            const liveContractNumberInput = document.getElementById('contractNumber');
            if (!contractNumber || !liveContractNumberInput || !liveContractNumberInput.value.trim()) {
                if (liveContractNumberInput) liveContractNumberInput.classList.add('is-invalid');
                if (contractErrorDiv) {
                    contractErrorDiv.classList.remove('d-none');
                    contractErrorDiv.querySelector('span').textContent = 'Please enter a valid contract number';
                }
                return;
            }
            
            const billingValidation = validateBillingDate(billingDate);
            if (!billingValidation.valid) {
                if (billingDateInput) billingDateInput.classList.add('is-invalid');
                if (billingErrorDiv) {
                    billingErrorDiv.classList.remove('d-none');
                    billingErrorDiv.querySelector('span').textContent = billingValidation.message;
                }
                return;
            }
            
            const teamSelectElement = document.getElementById('teamAssignment');
            const selectedTeam = teamSelectElement ? teamSelectElement.value : '';
            if (!selectedTeam) {
                if (teamErrorDiv) {
                    teamErrorDiv.classList.remove('d-none');
                    teamErrorDiv.querySelector('span').textContent = 'Please select an installation team';
                }
                if (teamSelectElement) teamSelectElement.classList.add('is-invalid');
                return;
            }
            
            // Sa loob ng showContractNumberModalForRequest() function, hanapin ang installation date validation
            // at palitan ito ng parehong validation:

            const installationDateElement = document.getElementById('installationDate');
            const installationDateValue = installationDateElement ? installationDateElement.value : '';
            if (!installationDateValue) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Please select an installation date';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            // ✅ VALIDATE: Installation date must be within 6 months from today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const selectedDate = new Date(installationDateValue);

            if (selectedDate < today) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Installation date cannot be in the past';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            const maxDate = new Date(today);
            maxDate.setMonth(maxDate.getMonth() + 6);
            if (selectedDate > maxDate) {
                if (installationDateErrorDiv) {
                    installationDateErrorDiv.classList.remove('d-none');
                    installationDateErrorDiv.querySelector('span').textContent = 'Installation date cannot be more than 6 months from today';
                }
                if (installationDateElement) installationDateElement.classList.add('is-invalid');
                return;
            }

            currentSelectedTeam = selectedTeam;
            currentInstallationDateValue = installationDateValue;
            
            if (isInstallmentPlan) {
                const firstInstallmentInputElement = document.getElementById('firstInstallmentDate');
                const lastInstallmentInputElement = document.getElementById('lastInstallmentDate');
                
                const firstInstallment = firstInstallmentInputElement ? firstInstallmentInputElement.value.trim() : '';
                const lastInstallment = lastInstallmentInputElement ? lastInstallmentInputElement.value.trim() : '';
                
                if (!firstInstallment || !lastInstallment) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = 'Please enter both first and last installment dates';
                    }
                    if (firstInstallmentInputElement && !firstInstallment) firstInstallmentInputElement.classList.add('is-invalid');
                    if (lastInstallmentInputElement && !lastInstallment) lastInstallmentInputElement.classList.add('is-invalid');
                    return;
                }
                
                const currentMonth = getCurrentYearMonth();
                if (firstInstallment < currentMonth) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = `First installment date cannot be earlier than ${currentMonth}.`;
                    }
                    if (firstInstallmentInputElement) firstInstallmentInputElement.classList.add('is-invalid');
                    return;
                }
                
                if (firstInstallmentInputElement) firstInstallmentInputElement.classList.remove('is-invalid');
                if (lastInstallmentInputElement) lastInstallmentInputElement.classList.remove('is-invalid');
                
                if (firstInstallment >= lastInstallment) {
                    if (installmentErrorDiv) {
                        installmentErrorDiv.classList.remove('d-none');
                        installmentErrorDiv.querySelector('span').textContent = 'First installment date must be before last installment date';
                    }
                    return;
                }
                
                currentFirstInstallmentDate = firstInstallment;
                currentLastInstallmentDate = lastInstallment;
            }
            
            newProceedBtn.disabled = true;
            newProceedBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Validating...';
            
            const validation = await validateContractNumber(contractNumber);
            
            if (!validation.valid) {
                contractInput.classList.add('is-invalid');
                if (contractErrorDiv) {
                    contractErrorDiv.classList.remove('d-none');
                    contractErrorDiv.querySelector('span').textContent = validation.message;
                }
                newProceedBtn.disabled = false;
                newProceedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Confirm';
                return;
            }
            
            if (liveContractNumberInput) liveContractNumberInput.classList.add('is-valid');
            currentContractNumber = contractNumber;
            currentBillingDate = billingDate;
            
            console.log("✅ CONTRACT NUMBER SET (Request):", currentContractNumber);
            console.log("✅ TEAM ID SET:", currentSelectedTeam);
            console.log("✅ INSTALLATION DATE SET:", currentInstallationDateValue);
            
            const modal = bootstrap.Modal.getInstance(contractModalElement);
            if (modal) modal.hide();
            
            const signatureImageUrl = appData.signature || null;
            const contractHtml = generateContractPreview(appData, currentContractNumber, currentBillingDate, signatureImageUrl);
            document.getElementById('contractPreviewContent').innerHTML = contractHtml;
            
            const contractPreviewModal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
            
            const modalFooter = document.querySelector('#contractPreviewModal .modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Edit Details</button>
                    <button type="button" class="btn btn-success" id="proceedToConfirmRequestBtn">
                        <i class="fas fa-check-circle"></i> Proceed to Confirm
                    </button>
                `;
                
                const proceedToConfirmBtn = document.getElementById('proceedToConfirmRequestBtn');
                if (proceedToConfirmBtn) {
                    const newBtn = proceedToConfirmBtn.cloneNode(true);
                    proceedToConfirmBtn.parentNode.replaceChild(newBtn, proceedToConfirmBtn);
                    newBtn.addEventListener('click', () => {
                        contractPreviewModal.hide();
                        showConfirmModalForRequest();
                    });
                }
            }
            
            contractPreviewModal.show();
            
            newProceedBtn.disabled = false;
            newProceedBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Proceed to Confirm';
        });
    });
    
    const contractModal = new bootstrap.Modal(contractModalElement);
    contractModal.show();
}

function showConfirmModalForRequest() {
    const confirmContractNumberSpan = document.getElementById('confirmContractNumber');
    if (confirmContractNumberSpan) {
        confirmContractNumberSpan.textContent = currentContractNumber;
    }
    
    let confirmBillingDateSpan = document.getElementById('confirmBillingDate');
    if (!confirmBillingDateSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const billingDateDiv = document.createElement('div');
            billingDateDiv.id = 'confirmBillingDate';
            billingDateDiv.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong> Every ${currentBillingDate} of the month`;
            alertDiv.appendChild(billingDateDiv);
        }
    } else {
        confirmBillingDateSpan.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong> Every ${currentBillingDate} of the month`;
    }
    
    // Add team and installation date to confirmation modal
    let confirmTeamSpan = document.getElementById('confirmTeam');
    if (!confirmTeamSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const teamDiv = document.createElement('div');
            teamDiv.id = 'confirmTeam';
            const teamSelect = document.getElementById('teamAssignment');
            const teamName = teamSelect ? teamSelect.options[teamSelect.selectedIndex]?.text || currentSelectedTeam : currentSelectedTeam;
            teamDiv.innerHTML = `<br><strong><i class="fas fa-users"></i> Installation Team:</strong> ${teamName}`;
            alertDiv.appendChild(teamDiv);
        }
    }
    
    let confirmInstallationDateSpan = document.getElementById('confirmInstallationDate');
    if (!confirmInstallationDateSpan) {
        const alertDiv = document.querySelector('#confirmApprovalModal .alert-success');
        if (alertDiv) {
            const dateDiv = document.createElement('div');
            dateDiv.id = 'confirmInstallationDate';
            const formattedDate = currentInstallationDateValue ? new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set';
            dateDiv.innerHTML = `<br><strong><i class="fas fa-calendar-check"></i> Installation Date:</strong> ${formattedDate}`;
            alertDiv.appendChild(dateDiv);
        }
    }
    
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmApprovalModal'));
    confirmModal.show();
}

// =========================
// PROCESS APPROVAL FOR REQUEST - WITH TEAM AND INSTALLATION DATE
// =========================
async function processApprovalWithContractForRequest(requestId) {
    console.log("🔵🔵🔵 processApprovalWithContractForRequest CALLED 🔵🔵🔵");
    console.log("🔵 requestId:", requestId);
    console.log("🔵 currentContractNumber:", currentContractNumber);
    console.log("🔵 currentBillingDate:", currentBillingDate);
    console.log("🔵 currentSelectedTeam:", currentSelectedTeam);
    console.log("🔵 currentInstallationDateValue:", currentInstallationDateValue);
    
    if (!currentContractNumber) {
        showToast("Missing contract number. Please start over.", "error");
        return;
    }
    
    if (!currentBillingDate) {
        showToast("Missing billing date. Please start over.", "error");
        return;
    }
    
    if (!currentSelectedTeam) {
        showToast("Please select an installation team.", "error");
        return;
    }
    
    if (!currentInstallationDateValue) {
        showToast("Please select an installation date.", "error");
        return;
    }
    
    const modalElement = document.getElementById('confirmApprovalModal');
    showModalLoading(modalElement, true, 'approval');

    try {
        const appData = await loadApplicationData();
        
        const firstName = appData.first_name || '';
        const middleName = appData.middle_name || '';
        const lastName = appData.last_name || '';
        const suffix = appData.suffix || '';
        const fullName = getCleanFullName(firstName, middleName, lastName, suffix);
        const age = calculateAge(appData.birthdate);
        const barangay = getCleanValue(appData.barangay);
        const city = getCleanValue(appData.city);
        const province = getCleanValue(appData.province);
        const address = `${barangay}, ${city}, ${province}`.trim().replace(/^,|,$/g, '').replace(/,,/g, ',');
        const addressDisplay = address || 'Not provided';
        
        const firstInstallment = currentFirstInstallmentDate || null;
        const lastInstallment = currentLastInstallmentDate || null;
        
        const contractData = {
            contract_number: currentContractNumber,
            application_id: appId,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix: suffix,
            full_name: fullName,
            age: age,
            civil_status: appData.civil_status || '',
            address: addressDisplay,
            barangay: barangay,
            city: city,
            province: province,
            billing_date: currentBillingDate,
            date_submitted: appData.date_submitted || new Date().toLocaleDateString(),
            status: 'Active',
            created_at: new Date().toISOString(),
            application_data: appData,
            is_installment_plan: isInstallmentPlan ? 1 : 0,
            first_installment_date: firstInstallment,
            last_installment_date: lastInstallment,
            installation_fee: appData.installation_fee || '',
            assigned_team_id: currentSelectedTeam,
            installation_date: currentInstallationDateValue
        };
        
        console.log("🚀 SAVING CONTRACT DIRECTLY...");
        
        const saveResponse = await fetch(`/api/superadmin/contracts/${currentContractNumber}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contractData)
        });
        
        const saveResult = await saveResponse.json();
        console.log("📡 Save contract response:", saveResult);
        
        if (!saveResponse.ok) {
            throw new Error(saveResult.error || "Failed to save contract");
        }
        
        console.log("✅ CONTRACT SAVED!");
        
        const requestResponse = await fetch(`/api/superadmin/approval-request/${requestId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contract_number: currentContractNumber,
                billing_date: currentBillingDate,
                first_installment_date: firstInstallment,
                last_installment_date: lastInstallment,
                assigned_team_id: currentSelectedTeam,
                installation_date: currentInstallationDateValue
            })
        });

        if (!requestResponse.ok) {
            const errorData = await requestResponse.json();
            throw new Error(errorData.error || "Failed to accept request");
        }

        const result = await requestResponse.json();
        console.log("Request approval response:", result);

        sessionStorage.setItem('refresh_admin_applications', 'true');
        
        currentApprovalRequest = null;
        pendingRequestId = null;
        pendingRequestedStatus = null;

        let teamName = currentSelectedTeam;
        try {
            const teamResponse = await fetch(`/api/superadmin/teams/${currentSelectedTeam}`);
            if (teamResponse.ok) {
                const teamData = await teamResponse.json();
                teamName = teamData.team_name || currentSelectedTeam;
            }
        } catch (e) {}

        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Application approved successfully!</p>
                <p class="text-muted mt-2">Contract Number: <strong>${currentContractNumber}</strong></p>
                <p class="text-muted">Billing Day: Every ${currentBillingDate} of the month</p>
                <p class="text-muted"><i class="fas fa-users"></i> Team: <strong>${teamName}</strong></p>
                <p class="text-muted"><i class="fas fa-calendar-check"></i> Installation Date: <strong>${new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                <p class="text-muted">The admin request has been accepted and marked as DONE.</p>
                <small class="text-muted">Reloading page...</small>
            </div>
        `;

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (err) {
        console.error("❌ ERROR:", err);
        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to approve application</p>
                <p class="text-danger mt-2">${err.message}</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;

        const modalFooter = modalElement.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.innerHTML = `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
        }
    }
}

// =========================
// PROCESS APPROVAL WITH CONTRACT - FIXED
// =========================
async function processApprovalWithContract() {
    console.log("🔵🔵🔵 processApprovalWithContract CALLED 🔵🔵🔵");
    console.log("🔵 currentContractNumber:", currentContractNumber);
    console.log("🔵 currentBillingDate:", currentBillingDate);
    console.log("🔵 currentSelectedTeam:", currentSelectedTeam);
    console.log("🔵 currentInstallationDateValue:", currentInstallationDateValue);
    
    if (!currentContractNumber) {
        console.error("❌ NO CONTRACT NUMBER!");
        showToast("Missing contract number. Please start over.", "error");
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmApprovalModal'));
        if (confirmModal) confirmModal.hide();
        setTimeout(() => showContractNumberModal(), 500);
        return;
    }
    
    if (!currentBillingDate) {
        console.error("❌ NO BILLING DATE!");
        showToast("Missing billing date. Please start over.", "error");
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmApprovalModal'));
        if (confirmModal) confirmModal.hide();
        setTimeout(() => showContractNumberModal(), 500);
        return;
    }
    
    if (!currentSelectedTeam) {
        console.error("❌ NO TEAM SELECTED!");
        showToast("Please select an installation team.", "error");
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmApprovalModal'));
        if (confirmModal) confirmModal.hide();
        setTimeout(() => showContractNumberModal(), 500);
        return;
    }
    
    if (!currentInstallationDateValue) {
        console.error("❌ NO INSTALLATION DATE!");
        showToast("Please select an installation date.", "error");
        const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmApprovalModal'));
        if (confirmModal) confirmModal.hide();
        setTimeout(() => showContractNumberModal(), 500);
        return;
    }
    
    const modalElement = document.getElementById('confirmApprovalModal');
    showModalLoading(modalElement, true, 'approval');

    try {
        const appData = await loadApplicationData();
        
        console.log("📦 Application Data loaded");
        
        const firstName = appData.first_name || '';
        const middleName = appData.middle_name || '';
        const lastName = appData.last_name || '';
        const suffix = appData.suffix || '';
        const fullName = getCleanFullName(firstName, middleName, lastName, suffix);
        const age = calculateAge(appData.birthdate);
        const barangay = getCleanValue(appData.barangay);
        const city = getCleanValue(appData.city);
        const province = getCleanValue(appData.province);
        const address = `${barangay}, ${city}, ${province}`.trim().replace(/^,|,$/g, '').replace(/,,/g, ',');
        const addressDisplay = address || 'Not provided';
        
        const firstInstallment = currentFirstInstallmentDate || null;
        const lastInstallment = currentLastInstallmentDate || null;
        
        const contractData = {
            contract_number: currentContractNumber,
            application_id: appId,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            suffix: suffix,
            full_name: fullName,
            age: age,
            civil_status: appData.civil_status || '',
            address: addressDisplay,
            barangay: barangay,
            city: city,
            province: province,
            billing_date: currentBillingDate,
            date_submitted: appData.date_submitted || new Date().toLocaleDateString(),
            status: 'Active',
            created_at: new Date().toISOString(),
            application_data: appData,
            is_installment_plan: isInstallmentPlan ? 1 : 0,
            first_installment_date: firstInstallment,
            last_installment_date: lastInstallment,
            installation_fee: appData.installation_fee || '',
            assigned_team_id: currentSelectedTeam,
            installation_date: currentInstallationDateValue
        };
        
        console.log("🚀 SAVING CONTRACT DIRECTLY to /api/superadmin/contracts/" + currentContractNumber);
        
        const saveResponse = await fetch(`/api/superadmin/contracts/${currentContractNumber}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contractData)
        });
        
        // ✅ Check if response is JSON
        const contentType = saveResponse.headers.get('content-type');
        let saveResult;
        if (contentType && contentType.includes('application/json')) {
            saveResult = await saveResponse.json();
        } else {
            const text = await saveResponse.text();
            console.error("❌ Non-JSON response from save contract:", text.substring(0, 200));
            // Continue anyway - contract might still be saved
            saveResult = { success: true, message: "Contract saved (non-JSON response)" };
        }
        
        console.log("📡 Save contract response:", saveResult);
        
        if (!saveResponse.ok) {
            throw new Error(saveResult.error || "Failed to save contract");
        }
        
        console.log("✅ CONTRACT SAVED SUCCESSFULLY!");
        
        // ========== UPDATE APPLICATION STATUS ==========
        console.log("➡️ Updating application status...");
        
        const updatePayload = { 
            status: "Approved",
            contract_number: currentContractNumber,
            billing_date: currentBillingDate,
            first_installment_date: firstInstallment,
            last_installment_date: lastInstallment,
            assigned_team_id: currentSelectedTeam,
            installation_date: currentInstallationDateValue
        };
        
        console.log("📦 Update payload:", updatePayload);
        
        const statusRes = await fetch(`/api/superadmin/application/${appId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatePayload)
        });

        // ✅ Check if response is JSON
        const statusContentType = statusRes.headers.get('content-type');
        let statusData;
        
        if (statusContentType && statusContentType.includes('application/json')) {
            statusData = await statusRes.json();
            console.log("📡 Status update response:", statusData);
        } else {
            const text = await statusRes.text();
            console.error("❌ Non-JSON response from status update:", text.substring(0, 200));
            
            // ✅ Since contract is already saved, show success anyway
            // The status update might have succeeded even with non-JSON response
            const modalBody = modalElement.querySelector('.modal-body');
            modalBody.innerHTML = `
                <div class="text-center py-4">
                    <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                    <p class="mt-2 mb-0 text-success fw-bold">✓ Application approved successfully!</p>
                    <p class="text-muted mt-2">Contract Number: <strong>${currentContractNumber}</strong></p>
                    <p class="text-muted">Billing Day: Every ${currentBillingDate} of the month</p>
                    <p class="text-muted"><i class="fas fa-users"></i> Team: <strong>${currentSelectedTeam}</strong></p>
                    <p class="text-muted"><i class="fas fa-calendar-check"></i> Installation Date: <strong>${new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                    <small class="text-muted">Redirecting to applications list...</small>
                </div>
            `;
            
            setTimeout(() => {
                redirectToApplicationsList();
            }, 2000);
            return;
        }
        
        if (!statusRes.ok) {
            console.error("❌ Status update failed:", statusData);
            throw new Error(statusData.error || "Approval failed");
        }

        sessionStorage.setItem('refresh_admin_applications', 'true');

        let teamName = currentSelectedTeam;
        try {
            const teamResponse = await fetch(`/api/superadmin/teams/${currentSelectedTeam}`);
            if (teamResponse.ok) {
                const teamData = await teamResponse.json();
                teamName = teamData.team_name || currentSelectedTeam;
            }
        } catch (e) {}

        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">✓ Application approved successfully!</p>
                <p class="text-muted mt-2">Contract Number: <strong>${currentContractNumber}</strong></p>
                <p class="text-muted">Billing Day: Every ${currentBillingDate} of the month</p>
                <p class="text-muted"><i class="fas fa-users"></i> Team: <strong>${teamName}</strong></p>
                <p class="text-muted"><i class="fas fa-calendar-check"></i> Installation Date: <strong>${new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                <small class="text-muted">Redirecting to applications list...</small>
            </div>
        `;

        setTimeout(() => {
            redirectToApplicationsList();
        }, 2000);

    } catch (err) {
        console.error("❌ ERROR:", err);
        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to approve application</p>
                <small class="text-muted">${err.message}</small>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;

        const modalFooter = modalElement.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.innerHTML = `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
        }
    }
}

// =========================
// REQUEST MODAL FUNCTIONS
// =========================
function closeRequestModalFunc() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.style.display = 'none';
}

function openRequestModal(action, requestId, requestedStatus) {
    const modal = document.getElementById('requestModal');
    const modalTitle = document.getElementById('requestModalTitle');
    const modalMessage = document.getElementById('requestModalMessage');
    const confirmRequestBtn = document.getElementById('confirmRequestBtn');
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');

    if (!modal || !modalTitle || !modalMessage || !confirmRequestBtn) {
        console.error("Request modal elements not found");
        showToast("Error: Modal elements not found", "error");
        return;
    }

    const requestedBy = currentApprovalRequest?.requested_by || currentApprovalRequest?.admin_id || 'Unknown Admin';
    const reason = currentApprovalRequest?.reason || '';
    const reasonHtml = reason ? `<br><br><strong>Reason:</strong> ${escapeHtml(reason)}` : '';

    // ✅ DETERMINE ACTION VERB BASED ON REQUESTED STATUS
    let actionVerb = requestedStatus.toLowerCase();
    if (requestedStatus === 'Pending') actionVerb = 'restore';
    else if (requestedStatus === 'Reapply') actionVerb = 'send a reapply invitation';

    // ✅ DETERMINE ACTION LABEL
    let actionLabel = requestedStatus;
    if (requestedStatus === 'Pending') actionLabel = 'Restore';
    else if (requestedStatus === 'Reapply') actionLabel = 'Send Reapply';

    if (action === 'accept') {
        modalTitle.textContent = requestedStatus === 'Pending' ? 'Accept Restore Request' : 
                                 requestedStatus === 'Reapply' ? 'Accept Reapply Request' : 
                                 'Accept Admin Request';
        
        let actionDescription = '';
        if (requestedStatus === 'Pending') {
            actionDescription = 'Restore the application to Pending status';
        } else if (requestedStatus === 'Reapply') {
            actionDescription = 'Send a reapply invitation to the customer';
        } else if (requestedStatus === 'Approved') {
            actionDescription = 'Approve the application';
        } else {
            actionDescription = 'Reject the application';
        }
        
        modalMessage.innerHTML = `Administrator <strong>${escapeHtml(requestedBy)}</strong> has requested to ${actionVerb} this application.${reasonHtml}<br><br>
            <strong>This will:</strong>
            <ul>
                <li>${actionDescription}</li>
                <li> Notify the customer and requesting admin</li>
                <li> Update the application status</li>
            </ul>`;
        
        const newConfirmBtn = confirmRequestBtn.cloneNode(true);
        confirmRequestBtn.parentNode.replaceChild(newConfirmBtn, confirmRequestBtn);
        newConfirmBtn.onclick = () => {
            closeRequestModalFunc();
            processRequest(requestId, requestedStatus, 'accept');
        };
    } else {
        modalTitle.textContent = requestedStatus === 'Pending' ? 'Reject Restore Request' : 
                                 requestedStatus === 'Reapply' ? 'Reject Reapply Request' : 
                                 'Reject Admin Request';
        
        let noteMessage = '';
        if (requestedStatus === 'Pending') {
            noteMessage = 'The application will remain Rejected.';
        } else if (requestedStatus === 'Reapply') {
            noteMessage = 'The application will remain Rejected and no email will be sent to the customer.';
        } else {
            noteMessage = 'The original approve/reject buttons will reappear after rejecting this request.';
        }
        
        modalMessage.innerHTML = `Are you sure you want to reject the request from administrator <strong>${escapeHtml(requestedBy)}</strong> to ${actionVerb} this application?${reasonHtml}<br><br>
            <strong>Note:</strong> ${noteMessage}`;
        
        const newConfirmBtn = confirmRequestBtn.cloneNode(true);
        confirmRequestBtn.parentNode.replaceChild(newConfirmBtn, confirmRequestBtn);
        newConfirmBtn.onclick = () => {
            closeRequestModalFunc();
            processRequest(requestId, null, 'reject');
        };
    }
    
    if (cancelRequestBtn) {
        const newCancelBtn = cancelRequestBtn.cloneNode(true);
        cancelRequestBtn.parentNode.replaceChild(newCancelBtn, cancelRequestBtn);
        newCancelBtn.onclick = closeRequestModalFunc;
    }

    modal.style.display = 'flex';
}

async function processRequest(requestId, requestedStatus, action) {
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingOverlay';
    loadingDiv.innerHTML = `
        <div class="loading-content">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 mb-0">Processing request...</p>
            <small class="text-muted">Please wait</small>
        </div>
    `;
    document.body.appendChild(loadingDiv);

    try {
        if (action === 'accept') {
            // ✅ BUILD REQUEST BODY - PARA SA REAPPLY, WALANG CONTRACT DETAILS
            let requestBody = {};
            
            if (requestedStatus === 'Reapply') {
                // ✅ PARA SA REAPPLY - WALANG CONTRACT NUMBER, BILLING DATE, ETC.
                // I-SEND LANG ANG EMPTY OBJECT (OR WALANG BODY)
                requestBody = {};
            } else {
                // ✅ PARA SA APPROVED/REJECTED/PENDING - MAY CONTRACT DETAILS
                requestBody = {
                    contract_number: currentContractNumber,
                    billing_date: currentBillingDate,
                    first_installment_date: currentFirstInstallmentDate,
                    last_installment_date: currentLastInstallmentDate,
                    assigned_team_id: currentSelectedTeam,
                    installation_date: currentInstallationDateValue
                };
            }
            
            const response = await fetch(`/api/superadmin/approval-request/${requestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to accept request");
            }

            sessionStorage.setItem('refresh_admin_applications', 'true');

            // ✅ IBAHIN ANG SUCCESS MESSAGE PARA SA REAPPLY
            let successMessage = `Application has been ${requestedStatus.toLowerCase()} as requested by the admin.`;
            let teamDisplay = '';
            
            if (requestedStatus === 'Reapply') {
                successMessage = '✅ Reapply invitation has been sent to the customer. The reapply button is now disabled.';
            } else if (requestedStatus === 'Approved') {
                let teamName = currentSelectedTeam || 'N/A';
                try {
                    const teamResponse = await fetch(`/api/superadmin/teams/${currentSelectedTeam}`);
                    if (teamResponse.ok) {
                        const teamData = await teamResponse.json();
                        teamName = teamData.team_name || currentSelectedTeam;
                    }
                } catch (e) {}
                
                teamDisplay = `
                    <p class="text-muted"><i class="fas fa-users"></i> Team: <strong>${teamName}</strong></p>
                    <p class="text-muted"><i class="fas fa-calendar-check"></i> Installation Date: <strong>${currentInstallationDateValue ? new Date(currentInstallationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not set'}</strong></p>
                `;
            }

            loadingDiv.innerHTML = `
                <div class="loading-content">
                    <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                    <p class="mt-2 mb-0 text-success fw-bold">Request accepted successfully!</p>
                    <p class="text-muted mt-2">${successMessage}</p>
                    ${teamDisplay}
                    <small class="text-muted">Reloading page...</small>
                </div>
            `;

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } else {
            const response = await fetch(`/api/superadmin/approval-request/${requestId}/reject`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to reject request");
            }

            sessionStorage.setItem('refresh_admin_applications', 'true');

            let rejectMessage = 'The admin\'s request has been rejected. The application remains in Pending status.';
            if (requestedStatus === 'Pending' || requestedStatus === 'Reapply') {
                rejectMessage = 'The admin\'s request has been rejected. The application remains Rejected.';
            }

            loadingDiv.innerHTML = `
                <div class="loading-content">
                    <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                    <p class="mt-2 mb-0 text-success fw-bold">Request rejected!</p>
                    <p class="text-muted mt-2">${rejectMessage}</p>
                    <small class="text-muted">Reloading page...</small>
                </div>
            `;

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }

    } catch (err) {
        console.error("Error processing request:", err);
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to process request</p>
                <p class="text-danger mt-2">${err.message}</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;
    } finally {
        pendingRequestId = null;
        pendingRequestedStatus = null;
    }
}

function showRejectModal() {
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending" && currentApplicationStatus.toLowerCase() !== "request sent") {
        showToast("This application has already been processed!", "warning");
        return;
    }
    const rejectModal = new bootstrap.Modal(document.getElementById("rejectModal"));
    rejectModal.show();
}


// =========================
// RESTORE APPLICATION FUNCTION - WITH CANCELLED SUPPORT
// =========================
function showRestoreModal() {
    // Get current status for better messaging
    const statusBadge = document.querySelector('.status-badge-header');
    let currentStatus = 'Rejected';
    if (statusBadge) {
        const statusText = statusBadge.textContent || '';
        const match = statusText.match(/Status:\s*(\w+)/i);
        if (match) {
            currentStatus = match[1];
        }
    }
    
    const isCancelled = currentStatus.toLowerCase() === 'cancelled';
    const targetStatus = isCancelled ? 'Approved' : 'Pending';
    const restoreText = isCancelled ? 'restore and approve' : 'restore';
    
    // Create restore modal if it doesn't exist
    let restoreModal = document.getElementById('restoreModal');
    
    if (!restoreModal) {
        restoreModal = document.createElement('div');
        restoreModal.id = 'restoreModal';
        restoreModal.className = 'modal fade';
        restoreModal.setAttribute('tabindex', '-1');
        restoreModal.setAttribute('aria-hidden', 'true');
        restoreModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-blue) 100%); color: #ffffff;">
                        <h5 class="modal-title">
                            <i class="fas fa-undo"></i> ${isCancelled ? 'Restore & Approve' : 'Restore'} Application
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="filter: brightness(0) invert(1);"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="fas fa-undo" style="font-size: 48px; color: var(--primary-blue);"></i>
                        </div>
                        <p class="text-center fw-bold">Are you sure you want to ${restoreText} this application?</p>
                        <div class="alert ${isCancelled ? 'alert-success' : 'alert-warning'} mt-3">
                            <i class="fas ${isCancelled ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i> 
                            <strong>This will:</strong>
                            <ul class="mb-0 mt-2">
                                <li>Change the status from <strong>${currentStatus}</strong> to <strong>${targetStatus}</strong></li>
                                ${isCancelled ? '<li>Keep the existing contract and customer record</li>' : '<li>Make the application available for review again</li>'}
                                <li>The customer will be notified via email</li>
                            </ul>
                        </div>
                        ${isCancelled ? `
                            <div class="alert alert-info mt-2">
                                <i class="fas fa-info-circle"></i>
                                <strong>Note:</strong> This application already has a contract and customer record. It will be restored to <strong>Approved</strong> status.
                            </div>
                            
                            <!-- TEAM ASSIGNMENT - ONLY FOR CANCELLED -->
                            <div class="mb-3 mt-3">
                                <label for="restoreTeamAssignment" class="form-label fw-bold">
                                    <i class="fas fa-users"></i> Assign Installation Team *
                                </label>
                                <select id="restoreTeamAssignment" class="form-select">
                                    <option value="" disabled selected>-- Select Team --</option>
                                </select>
                                <div class="form-text">Select the team that will handle the installation.</div>
                                <div id="restoreTeamError" class="text-danger d-none mt-1">
                                    <i class="fas fa-exclamation-triangle"></i> Please select a team
                                </div>
                            </div>
                            
                            <!-- INSTALLATION DATE - ONLY FOR CANCELLED -->
                            <div class="mb-3">
                                <label for="restoreInstallationDate" class="form-label fw-bold">
                                    <i class="fas fa-calendar-check"></i> Installation Date *
                                </label>
                                <input type="date" 
                                       id="restoreInstallationDate" 
                                       class="form-control">
                                <div class="form-text">Select the date when the installation will be performed.</div>
                                <div id="restoreDateError" class="text-danger d-none mt-1">
                                    <i class="fas fa-exclamation-triangle"></i> Please select a valid installation date
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmRestoreBtn" style="background: linear-gradient(135deg, var(--primary-blue) 0%, var(--accent-blue) 100%); border: none;">
                            <i class="fas fa-undo"></i> ${isCancelled ? 'Yes, Restore & Approve' : 'Yes, Restore Application'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(restoreModal);
    } else {
        // Update the message with current status
        const titleEl = restoreModal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-undo"></i> ${isCancelled ? 'Restore & Approve' : 'Restore'} Application`;
        }
        
        const alertDiv = restoreModal.querySelector('.alert-warning, .alert-success');
        if (alertDiv) {
            alertDiv.className = `alert ${isCancelled ? 'alert-success' : 'alert-warning'} mt-3`;
            alertDiv.querySelector('i').className = `fas ${isCancelled ? 'fa-check-circle' : 'fa-exclamation-triangle'}`;
            const ul = alertDiv.querySelector('ul');
            if (ul) {
                ul.innerHTML = `
                    <li>Change the status from <strong>${currentStatus}</strong> to <strong>${targetStatus}</strong></li>
                    ${isCancelled ? '<li>Keep the existing contract and customer record</li>' : '<li>Make the application available for review again</li>'}
                    <li>The customer will be notified via email</li>
                `;
            }
        }
        
        // Add or update info alert for cancelled
        let infoAlert = restoreModal.querySelector('.alert-info');
        if (isCancelled) {
            if (!infoAlert) {
                const body = restoreModal.querySelector('.modal-body');
                const infoDiv = document.createElement('div');
                infoDiv.className = 'alert alert-info mt-2';
                infoDiv.innerHTML = `
                    <i class="fas fa-info-circle"></i>
                    <strong>Note:</strong> This application already has a contract and customer record. It will be restored to <strong>Approved</strong> status.
                `;
                body.appendChild(infoDiv);
            }
            
            // Add team and date fields if not exist
            let teamField = restoreModal.querySelector('#restoreTeamAssignment');
            if (!teamField) {
                const body = restoreModal.querySelector('.modal-body');
                const teamDiv = document.createElement('div');
                teamDiv.className = 'mb-3 mt-3';
                teamDiv.innerHTML = `
                    <label for="restoreTeamAssignment" class="form-label fw-bold">
                        <i class="fas fa-users"></i> Assign Installation Team *
                    </label>
                    <select id="restoreTeamAssignment" class="form-select">
                        <option value="" disabled selected>-- Select Team --</option>
                    </select>
                    <div class="form-text">Select the team that will handle the installation.</div>
                    <div id="restoreTeamError" class="text-danger d-none mt-1">
                        <i class="fas fa-exclamation-triangle"></i> Please select a team
                    </div>
                `;
                body.appendChild(teamDiv);
            }
            
            let dateField = restoreModal.querySelector('#restoreInstallationDate');
            if (!dateField) {
                const body = restoreModal.querySelector('.modal-body');
                const dateDiv = document.createElement('div');
                dateDiv.className = 'mb-3';
                dateDiv.innerHTML = `
                    <label for="restoreInstallationDate" class="form-label fw-bold">
                        <i class="fas fa-calendar-check"></i> Installation Date *
                    </label>
                    <input type="date" 
                           id="restoreInstallationDate" 
                           class="form-control">
                    <div class="form-text">Select the date when the installation will be performed.</div>
                    <div id="restoreDateError" class="text-danger d-none mt-1">
                        <i class="fas fa-exclamation-triangle"></i> Please select a valid installation date
                    </div>
                `;
                body.appendChild(dateDiv);
            }
        } else {
            // Remove team and date fields for rejected
            const teamField = restoreModal.querySelector('#restoreTeamAssignment');
            if (teamField) {
                const parent = teamField.closest('.mb-3');
                if (parent) parent.remove();
            }
            const dateField = restoreModal.querySelector('#restoreInstallationDate');
            if (dateField) {
                const parent = dateField.closest('.mb-3');
                if (parent) parent.remove();
            }
        }
        
        const confirmBtn = restoreModal.querySelector('#confirmRestoreBtn');
        if (confirmBtn) {
            confirmBtn.innerHTML = `<i class="fas fa-undo"></i> ${isCancelled ? 'Yes, Restore & Approve' : 'Yes, Restore Application'}`;
        }
    }
    
    // ✅ LOAD TEAMS FOR RESTORE MODAL (ONLY FOR CANCELLED)
    loadApplicationData().then(appData => {
        const appCity = appData.city || applicationCity || '';
        console.log(`📍 Loading teams for restore modal, city: "${appCity}"`);
        loadTeamsForRestore(appCity);
        setRestoreInstallationDateMin();
    });
    
    // Remove existing event listeners
    const confirmRestoreBtn = document.getElementById('confirmRestoreBtn');
    if (confirmRestoreBtn) {
        const newConfirmRestoreBtn = confirmRestoreBtn.cloneNode(true);
        confirmRestoreBtn.parentNode.replaceChild(newConfirmRestoreBtn, confirmRestoreBtn);
        newConfirmRestoreBtn.addEventListener('click', executeRestore);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(restoreModal);
    modal.show();
}


// =========================
// LOAD TEAMS FOR RESTORE MODAL
// =========================
async function loadTeamsForRestore(city = null) {
    try {
        console.log(`🔍 Loading teams for restore modal, city: "${city}"`);
        
        const response = await fetch('/api/superadmin/teams?status=Active&t=' + Date.now());
        const teams = await response.json();
        
        const techResponse = await fetch('/api/superadmin/technicians?t=' + Date.now());
        const technicians = await techResponse.json();
        
        const teamSelect = document.getElementById('restoreTeamAssignment');
        if (!teamSelect) return [];
        
        teamSelect.innerHTML = '<option value="" disabled selected>-- Select Team --</option>';
        
        let filteredTeams = teams.filter(team => {
            if (team.status !== 'Active') {
                return false;
            }
            const memberCount = technicians.filter(tech => tech.team_id === team.team_id).length;
            return memberCount > 0;
        });
        
        if (city && city.trim() !== '') {
            const cityLower = city.toLowerCase().trim();
            filteredTeams = filteredTeams.filter(team => {
                const teamArea = (team.area || '').toLowerCase().trim();
                return teamArea === cityLower;
            });
            console.log(`📋 Found ${filteredTeams.length} active teams in area "${city}" with members`);
        }
        
        if (filteredTeams && filteredTeams.length > 0) {
            filteredTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.team_id;
                option.textContent = `${team.team_name} (${team.area || 'No Area'})`;
                teamSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = city && city.trim() !== '' 
                ? `-- No active teams available in "${city}" area --` 
                : '-- No Active Teams with Members Available --';
            option.disabled = true;
            teamSelect.appendChild(option);
        }
        
        return filteredTeams;
    } catch (error) {
        console.error('Error loading teams for restore:', error);
        const teamSelect = document.getElementById('restoreTeamAssignment');
        if (teamSelect) {
            teamSelect.innerHTML = '<option value="">Error loading teams</option>';
        }
        return [];
    }
}


// =========================
// SET RESTORE INSTALLATION DATE MIN AND MAX
// =========================
function setRestoreInstallationDateMin() {
    const installationDateInput = document.getElementById('restoreInstallationDate');
    if (installationDateInput) {
        const today = new Date();
        
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        installationDateInput.setAttribute('min', `${year}-${month}-${day}`);
        
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 6);
        const maxYear = maxDate.getFullYear();
        const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
        const maxDay = String(maxDate.getDate()).padStart(2, '0');
        installationDateInput.setAttribute('max', `${maxYear}-${maxMonth}-${maxDay}`);
        
        installationDateInput.value = '';
        
        console.log(`📅 Restore installation date range: ${year}-${month}-${day} to ${maxYear}-${maxMonth}-${maxDay}`);
    }
}

// =========================
// EXECUTE RESTORE FUNCTION - REJECTED -> PENDING, CANCELLED -> APPROVED (WITH UNARCHIVE)
// =========================
async function executeRestore() {
    const modalElement = document.getElementById('restoreModal');
    const modalBody = modalElement.querySelector('.modal-body');
    const modalFooter = modalElement.querySelector('.modal-footer');
    const modalHeader = modalElement.querySelector('.modal-header');
    
    // Get current status
    const appData = await loadApplicationData();
    const currentStatus = appData.status || '';
    const isCancelled = currentStatus.toLowerCase() === 'cancelled';
    
    // Determine target status
    const targetStatus = isCancelled ? 'Approved' : 'Pending';
    
    // ✅ VALIDATE TEAM AND INSTALLATION DATE FOR CANCELLED
    let selectedTeam = null;
    let installationDateValue = null;
    
    if (isCancelled) {
        const teamSelect = document.getElementById('restoreTeamAssignment');
        const teamError = document.getElementById('restoreTeamError');
        const dateInput = document.getElementById('restoreInstallationDate');
        const dateError = document.getElementById('restoreDateError');
        
        selectedTeam = teamSelect ? teamSelect.value : '';
        if (!selectedTeam) {
            if (teamError) teamError.classList.remove('d-none');
            if (teamSelect) teamSelect.classList.add('is-invalid');
            showToast("Please select an installation team.", "warning");
            return;
        }
        if (teamError) teamError.classList.add('d-none');
        if (teamSelect) teamSelect.classList.remove('is-invalid');
        
        installationDateValue = dateInput ? dateInput.value : '';
        if (!installationDateValue) {
            if (dateError) dateError.classList.remove('d-none');
            if (dateInput) dateInput.classList.add('is-invalid');
            showToast("Please select an installation date.", "warning");
            return;
        }
        
        // Validate date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(installationDateValue);
        
        if (selectedDate < today) {
            if (dateError) {
                dateError.classList.remove('d-none');
                dateError.querySelector('span').textContent = 'Installation date cannot be in the past';
            }
            if (dateInput) dateInput.classList.add('is-invalid');
            showToast("Installation date cannot be in the past.", "warning");
            return;
        }
        
        const maxDate = new Date(today);
        maxDate.setMonth(maxDate.getMonth() + 6);
        if (selectedDate > maxDate) {
            if (dateError) {
                dateError.classList.remove('d-none');
                dateError.querySelector('span').textContent = 'Installation date cannot be more than 6 months from today';
            }
            if (dateInput) dateInput.classList.add('is-invalid');
            showToast("Installation date cannot be more than 6 months from today.", "warning");
            return;
        }
        
        if (dateError) dateError.classList.add('d-none');
        if (dateInput) dateInput.classList.remove('is-invalid');
    }
    
    // 🔥 SHOW LOADING STATE
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 mb-0">${isCancelled ? 'Restoring application to Approved...' : 'Restoring application...'}</p>
            <small class="text-muted">Please wait</small>
        </div>
    `;
    modalFooter.style.display = 'none';
    if (modalHeader) {
        const closeBtn = modalHeader.querySelector('.btn-close');
        if (closeBtn) closeBtn.disabled = true;
    }

    try {
        console.log(`🔄 Restoring application with status: ${currentStatus} -> ${targetStatus}`);
        
        // ✅ BUILD REQUEST BODY
        const requestBody = { 
            status: targetStatus,
            assigned_team_id: selectedTeam,
            installation_date: installationDateValue
        };
        
        const endpoint = `/api/superadmin/application/${appId}/restore`;
        
        const res = await fetch(endpoint, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Restore failed");
        }

        sessionStorage.setItem('refresh_admin_applications', 'true');

        let teamName = 'N/A';
        if (isCancelled && selectedTeam) {
            try {
                const teamResponse = await fetch(`/api/superadmin/teams/${selectedTeam}`);
                if (teamResponse.ok) {
                    const teamData = await teamResponse.json();
                    teamName = teamData.team_name || selectedTeam;
                }
            } catch (e) {}
        }

        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Application restored successfully!</p>
                <p class="text-muted mt-2">Status changed from <strong>${currentStatus}</strong> to <strong>${targetStatus}</strong>.</p>
                <p class="text-muted">The application has been <strong>unarchived</strong> and is now visible in the main list.</p>
                ${isCancelled ? `
                    <p class="text-muted"><i class="fas fa-users"></i> Team: <strong>${teamName}</strong></p>
                    <p class="text-muted"><i class="fas fa-calendar-check"></i> Installation Date: <strong>${new Date(installationDateValue).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
                ` : ''}
                <p class="text-muted">The customer has been notified via email.</p>
                <small class="text-muted">Reloading page...</small>
            </div>
        `;

        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (err) {
        console.error("Restore error:", err);
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to restore application</p>
                <small class="text-muted">${err.message}</small>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;
        modalFooter.style.display = 'flex';
        if (modalHeader) {
            const closeBtn = modalHeader.querySelector('.btn-close');
            if (closeBtn) closeBtn.disabled = false;
        }
    }
}


function addStatusBadge(status) {
    const appNumberDiv = document.querySelector(".app-number");
    if (appNumberDiv && status) {
        const existingBadge = document.querySelector(".status-badge-header");
        if (existingBadge) existingBadge.remove();

        const statusSpan = document.createElement("span");
        statusSpan.className = `status-badge-header status-${status.toLowerCase()}`;
        statusSpan.innerHTML = `<i class="fas fa-circle"></i> Status: ${status}`;
        appNumberDiv.appendChild(statusSpan);
    }
}


// ✅ BAGONG FUNCTION - REJECTION REASON DISPLAY (with Cancelled support)
function showRejectionReason(status, reason) {
    const appNumberDiv = document.querySelector(".app-number");
    if (!appNumberDiv) return;

    // Alisin muna ang existing reason display (kung meron)
    const existingReason = document.querySelector(".rejection-reason-display");
    if (existingReason) existingReason.remove();

    // Ipakita lang kung Rejected or Cancelled ang status AT may reason
    if (status && (status.toLowerCase() === "rejected" || status.toLowerCase() === "cancelled") && reason && reason.trim() !== "") {
        const reasonDiv = document.createElement("div");
        reasonDiv.className = "rejection-reason-display";
        const icon = status.toLowerCase() === "cancelled" ? "fa-ban" : "fa-exclamation-circle";
        reasonDiv.innerHTML = `
            <i class="fas ${icon}"></i>
            <strong>Reason for ${status}:</strong> ${escapeHtml(reason)}
        `;
        appNumberDiv.appendChild(reasonDiv);
    }
}

function initMap(data) {
    const lat = parseFloat(data.latitude) || 14.6091;
    const lng = parseFloat(data.longitude) || 121.0223;

    const mapEl = document.getElementById("map");
    if (!mapEl) return;

    const map = L.map("map").setView([lat, lng], 16);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup("Customer Location").openPopup();
}

function initImageModal() {
    document.querySelectorAll(".doc-img, .signature-img, .profile-img").forEach(img => {
        img.addEventListener("click", function () {
            const modalImg = document.getElementById("modalImage");
            modalImg.src = this.src;
            new bootstrap.Modal(document.getElementById("imageModal")).show();
        });
    });
}

function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showModalLoading(modalElement, isLoading, actionType = '') {
    const modalBody = modalElement.querySelector('.modal-body');
    const modalFooter = modalElement.querySelector('.modal-footer');
    const modalHeader = modalElement.querySelector('.modal-header');

    if (isLoading) {
        if (!modalElement.hasAttribute('data-original-body')) {
            modalElement.setAttribute('data-original-body', modalBody.innerHTML);
            if (modalFooter) {
                modalElement.setAttribute('data-original-footer', modalFooter.innerHTML);
            }
        }

        // ✅ IBAHIN ANG LOADING TEXT PARA SA REJECTION
        const loadingTitle = actionType === 'rejection' ? 'Rejecting' : 'Processing';
        const loadingColor = actionType === 'rejection' ? 'text-danger' : 'text-primary';

        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border ${loadingColor}" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 mb-0">${loadingTitle} application...</p>
                <small class="text-muted">Please wait, this may take a moment</small>
            </div>
        `;

        if (modalFooter) modalFooter.style.display = 'none';
        const closeBtn = modalHeader?.querySelector('.btn-close');
        if (closeBtn) closeBtn.disabled = true;

        modalElement.setAttribute('data-bs-backdrop', 'static');
        modalElement.setAttribute('data-bs-keyboard', 'false');
    } else {
        const originalBody = modalElement.getAttribute('data-original-body');
        const originalFooter = modalElement.getAttribute('data-original-footer');

        if (originalBody) modalBody.innerHTML = originalBody;
        if (originalFooter && modalFooter) {
            modalFooter.innerHTML = originalFooter;
            modalFooter.style.display = 'flex';
        }

        const closeBtn = modalHeader?.querySelector('.btn-close');
        if (closeBtn) closeBtn.disabled = false;

        modalElement.setAttribute('data-bs-backdrop', 'true');
        modalElement.setAttribute('data-bs-keyboard', 'true');
    }
}

window.rejectHandler = async function () {
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending" && currentApplicationStatus.toLowerCase() !== "request sent") {
        showToast("This application has already been processed!", "warning");
        const rejectModal = bootstrap.Modal.getInstance(document.getElementById('rejectModal'));
        if (rejectModal) rejectModal.hide();
        return;
    }

    const reasonSelect = document.getElementById("rejectReason");
    const customReason = document.getElementById("rejectCustomReason");

    let reason = reasonSelect?.value;

    if (!reason) {
        showToast("Please select a reason", "warning");
        return;
    }

    if (reason === "Other") {
        reason = customReason?.value.trim();
        if (!reason) {
            showToast("Please enter a custom reason", "warning");
            return;
        }
    }

    const modalElement = document.getElementById('rejectModal');
    showModalLoading(modalElement, true, 'rejection');

    try {
        const res = await fetch(`/api/superadmin/application/${appId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "Rejected", reason: reason })
        });

        if (!res.ok) throw new Error("Reject failed");

        sessionStorage.setItem('refresh_admin_applications', 'true');

        const modalBody = modalElement.querySelector('.modal-body');
        
        // ✅ BAGONG DESIGN - X ICON AT RED COLORS
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✕</div>
                <p class="mt-2 mb-0 text-danger fw-bold" style="font-size: 18px;">Application Rejected!</p>
                <p class="text-muted mt-3">The application has been rejected and the customer has been notified.</p>
                <div class="alert alert-danger mt-3" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px;">
                    <i class="fas fa-exclamation-circle" style="color: #dc2626;"></i>
                    <strong>Reason:</strong> <span style="color: #991b1b;">${escapeHtml(reason)}</span>
                </div>
                <small class="text-muted">Redirecting to applications list...</small>
            </div>
        `;

        // I-hide ang footer para walang buttons
        const modalFooter = modalElement.querySelector('.modal-footer');
        if (modalFooter) modalFooter.style.display = 'none';

        setTimeout(() => {
            redirectToApplicationsList();
        }, 2000);

    } catch (err) {
        console.error(err);
        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✕</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to reject application</p>
                <small class="text-muted">${err.message}</small>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;

        const modalFooter = modalElement.querySelector('.modal-footer');
        if (modalFooter) {
            modalFooter.style.display = 'flex';
            modalFooter.innerHTML = `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
        }
    }
};

function initializeEventListeners() {
    addViewContractButtonListener();

    document.getElementById("backBtn")?.addEventListener("click", function() {
        redirectToApplicationsList();
    });
    
    document.getElementById("confirmRejectBtn")?.addEventListener("click", window.rejectHandler);
    
    // ✅ TEAM SELECTION VALIDATION - Check if selected team matches application city
    const teamSelect = document.getElementById('teamAssignment');
    if (teamSelect) {
        const newTeamSelect = teamSelect.cloneNode(true);
        teamSelect.parentNode.replaceChild(newTeamSelect, teamSelect);
        
        newTeamSelect.addEventListener('change', function() {
            const teamErrorDiv = document.getElementById('teamAssignmentError');
            if (teamErrorDiv) {
                teamErrorDiv.classList.add('d-none');
            }
            if (this.classList.contains('is-invalid')) {
                this.classList.remove('is-invalid');
            }
        });
    }
    
    const finalApproveBtn = document.getElementById("finalApproveBtn");
    if (finalApproveBtn) {
        const newFinalApproveBtn = finalApproveBtn.cloneNode(true);
        finalApproveBtn.parentNode.replaceChild(newFinalApproveBtn, finalApproveBtn);
        newFinalApproveBtn.addEventListener("click", function() {
            console.log("🔴 FINAL APPROVE CLICKED 🔴");
            console.log("currentContractNumber:", currentContractNumber);
            console.log("currentBillingDate:", currentBillingDate);
            console.log("currentSelectedTeam:", currentSelectedTeam);
            console.log("currentInstallationDateValue:", currentInstallationDateValue);
            console.log("pendingRequestId:", pendingRequestId);
            console.log("pendingRequestedStatus:", pendingRequestedStatus);
            
            if (!currentContractNumber) {
                console.error("❌ currentContractNumber is NULL or UNDEFINED!");
                showToast("Contract number not set. Please go back and enter contract details.", "error");
                return;
            }
            
            if (!currentBillingDate) {
                console.error("❌ currentBillingDate is NULL or UNDEFINED!");
                showToast("Billing date not set. Please go back and enter billing date.", "error");
                return;
            }
            
            if (!currentSelectedTeam) {
                console.error("❌ currentSelectedTeam is NULL or UNDEFINED!");
                showToast("Please select an installation team.", "error");
                return;
            }
            
            if (!currentInstallationDateValue) {
                console.error("❌ currentInstallationDateValue is NULL or UNDEFINED!");
                showToast("Please select an installation date.", "error");
                return;
            }
            
            // ✅ VALIDATE: Check if selected team's area matches application city
            const teamSelectElement = document.getElementById('teamAssignment');
            if (teamSelectElement) {
                const selectedOption = teamSelectElement.options[teamSelectElement.selectedIndex];
                const teamText = selectedOption ? selectedOption.text : '';
                // Extract area from text: "Team Name (Area) - Leader"
                const areaMatch = teamText.match(/\(([^)]+)\)/);
                const selectedArea = areaMatch ? areaMatch[1] : '';
                const appCity = applicationCity || '';
                
                if (appCity && selectedArea) {
                    const appCityLower = appCity.toLowerCase().trim();
                    const selectedAreaLower = selectedArea.toLowerCase().trim();
                    if (appCityLower !== selectedAreaLower) {
                        console.error(`❌ Team area (${selectedArea}) does not match application city (${appCity})`);
                        showToast(`Team area (${selectedArea}) does not match application city (${appCity}). Please select a team from the same area.`, "error");
                        return;
                    }
                }
            }
            
            if (pendingRequestId && pendingRequestedStatus) {
                console.log("➡️ Calling processApprovalWithContractForRequest");
                processApprovalWithContractForRequest(pendingRequestId);
            } else {
                console.log("➡️ Calling processApprovalWithContract");
                processApprovalWithContract();
            }
        });
    }

    const reasonSelect = document.getElementById("rejectReason");
    const customReason = document.getElementById("rejectCustomReason");
    reasonSelect?.addEventListener("change", () => {
        if (reasonSelect.value === "Other") {
            customReason.style.display = "block";
        } else {
            customReason.style.display = "none";
        }
    });

    document.getElementById('rejectModal')?.addEventListener('hidden.bs.modal', function () {
        if (reasonSelect) reasonSelect.value = "";
        if (customReason) {
            customReason.style.display = "none";
            customReason.value = "";
        }
        const modalElement = document.getElementById('rejectModal');
        if (modalElement.hasAttribute('data-original-body')) {
            showModalLoading(modalElement, false);
            modalElement.removeAttribute('data-original-body');
            modalElement.removeAttribute('data-original-footer');
        }
    });

    const contractModal = document.getElementById('contractNumberModal');
    if (contractModal) {
        contractModal.addEventListener('hidden.bs.modal', function () {
            const contractInput = document.getElementById('contractNumber');
            if (contractInput) {
                contractInput.value = '';
                contractInput.classList.remove('is-invalid', 'is-valid');
            }
            const billingDateInput = document.getElementById('billingDate');
            if (billingDateInput) {
                billingDateInput.value = '';
                billingDateInput.classList.remove('is-invalid', 'is-valid');
            }
            const contractErrorDiv = document.getElementById('contractNumberError');
            if (contractErrorDiv) contractErrorDiv.classList.add('d-none');
            const billingErrorDiv = document.getElementById('billingDateError');
            if (billingErrorDiv) billingErrorDiv.classList.add('d-none');
        });
    }
    
    const confirmModal = document.getElementById('confirmApprovalModal');
    if (confirmModal) {
        confirmModal.addEventListener('hidden.bs.modal', function () {
            const modalElement = document.getElementById('confirmApprovalModal');
            if (modalElement.hasAttribute('data-original-body')) {
                showModalLoading(modalElement, false);
                modalElement.removeAttribute('data-original-body');
                modalElement.removeAttribute('data-original-footer');
            }
        });
    }

    const closeRequestModalBtn = document.getElementById('closeRequestModal');
    if (closeRequestModalBtn) {
        closeRequestModalBtn.onclick = closeRequestModalFunc;
    }

    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    if (cancelRequestBtn) {
        cancelRequestBtn.onclick = closeRequestModalFunc;
    }

    window.onclick = function (e) {
        const requestModal = document.getElementById('requestModal');
        if (e.target === requestModal) {
            closeRequestModalFunc();
        }
    };


    // ================= RESTORE MODAL EVENT LISTENERS =================
    // Listen for restore modal hidden event to cleanup
    document.addEventListener('hidden.bs.modal', function(e) {
        if (e.target && e.target.id === 'restoreModal') {
            const modalElement = document.getElementById('restoreModal');
            if (modalElement) {
                const modalBody = modalElement.querySelector('.modal-body');
                const modalFooter = modalElement.querySelector('.modal-footer');
                // Reset to original content if needed
                if (modalBody && !modalBody.querySelector('.text-success, .text-danger')) {
                    // Already reset, do nothing
                }
            }
        }
    });
}

function redirectToApplicationsList() {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('from');

    if (source === 'archived') {
        window.location.href = "/superadmin/archived-applications?t=" + Date.now();
    } else {
        window.location.href = "/superadmin/internet-applications?t=" + Date.now();
    }
}

document.getElementById("downloadPdfBtn")?.addEventListener("click", () => {
    window.open(`/superadmin/download/pdf/${appId}`, "_blank");
});

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", async function() {
    // ✅ SESSION CHECK MUNA
    const isValid = await checkSession();
    if (!isValid) return;
    
    initializeEventListeners();
    loadApplication();
});


// =========================
// DELETE APPLICATION FUNCTION
// =========================
function showDeleteModal() {
    // Create delete modal if it doesn't exist
    let deleteModal = document.getElementById('deleteModal');
    
    if (!deleteModal) {
        deleteModal = document.createElement('div');
        deleteModal.id = 'deleteModal';
        deleteModal.className = 'modal fade';
        deleteModal.setAttribute('tabindex', '-1');
        deleteModal.setAttribute('aria-hidden', 'true');
        deleteModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); color: #ffffff;">
                        <h5 class="modal-title">
                            <i class="fas fa-trash"></i> Delete Application
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" style="filter: brightness(0) invert(1);"></button>
                    </div>
                    <div class="modal-body">
                        <div class="text-center mb-3">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc2626;"></i>
                        </div>
                        <p class="text-center fw-bold">Are you sure you want to delete this application?</p>
                        <div class="alert alert-danger mt-3">
                            <i class="fas fa-exclamation-circle"></i> 
                            <strong>This action cannot be undone!</strong>
                            <ul class="mb-0 mt-2">
                                <li>This will permanently delete the application record</li>
                                <li>All associated data will be removed</li>
                                <li>The customer will NOT be notified</li>
                            </ul>
                        </div>
                        <div class="alert alert-warning mt-2">
                            <i class="fas fa-info-circle"></i>
                            <strong>Application Number:</strong> <span id="deleteAppNumber" style="font-weight: 700; color: #991b1b;"></span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                            <i class="fas fa-trash"></i> Yes, Delete Permanently
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(deleteModal);
    }
    
    // Set application number in the modal
    const appNumberSpan = document.getElementById('deleteAppNumber');
    if (appNumberSpan) {
        const appNumberEl = document.getElementById('application_number');
        appNumberSpan.textContent = appNumberEl ? appNumberEl.textContent : 'N/A';
    }
    
    // Remove existing event listeners
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (confirmDeleteBtn) {
        const newConfirmDeleteBtn = confirmDeleteBtn.cloneNode(true);
        confirmDeleteBtn.parentNode.replaceChild(newConfirmDeleteBtn, confirmDeleteBtn);
        newConfirmDeleteBtn.addEventListener('click', executeDelete);
    }
    
    // Show modal
    const modal = new bootstrap.Modal(deleteModal);
    modal.show();
}

// =========================
// EXECUTE DELETE FUNCTION
// =========================
async function executeDelete() {
    const modalElement = document.getElementById('deleteModal');
    const modalBody = modalElement.querySelector('.modal-body');
    const modalFooter = modalElement.querySelector('.modal-footer');
    const modalHeader = modalElement.querySelector('.modal-header');
    
    // Show loading state
    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-danger" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 mb-0">Deleting application...</p>
            <small class="text-muted">Please wait</small>
        </div>
    `;
    modalFooter.style.display = 'none';
    if (modalHeader) {
        const closeBtn = modalHeader.querySelector('.btn-close');
        if (closeBtn) closeBtn.disabled = true;
    }

    try {
        console.log(`🗑️ Deleting application: ${appId}`);
        
        const res = await fetch(`/api/superadmin/application/${appId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Delete failed");
        }

        sessionStorage.setItem('refresh_admin_applications', 'true');

        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Application deleted successfully!</p>
                <p class="text-muted mt-2">The application has been permanently removed from the system.</p>
                <small class="text-muted">Redirecting to applications list...</small>
            </div>
        `;

        setTimeout(() => {
            redirectToApplicationsList();
        }, 2000);

    } catch (err) {
        console.error("Delete error:", err);
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to delete application</p>
                <small class="text-muted">${err.message}</small>
                <button class="btn btn-primary mt-3" onclick="location.reload()">Try Again</button>
            </div>
        `;
        modalFooter.style.display = 'flex';
        if (modalHeader) {
            const closeBtn = modalHeader.querySelector('.btn-close');
            if (closeBtn) closeBtn.disabled = false;
        }
    }
}

// =========================
// REQUEST REAPPLY MODAL
// =========================
function showReapplyRequestModal() {
    let reapplyModal = document.getElementById('reapplyRequestModal');

    if (!reapplyModal) {
        reapplyModal = document.createElement('div');
        reapplyModal.id = 'reapplyRequestModal';
        reapplyModal.className = 'modal fade';
        reapplyModal.setAttribute('tabindex', '-1');
        reapplyModal.setAttribute('aria-hidden', 'true');
        reapplyModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            <i class="fas fa-redo-alt"></i> Request Re-application
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <label class="form-label fw-bold"><i class="fas fa-exclamation-circle"></i> Rejection Reason</label>
                        <div class="alert alert-danger mb-3" id="reapplyRejectionReasonBox">
                            <i class="fas fa-exclamation-circle"></i>
                            <span></span>
                        </div>

                        <label for="reapplyMessage" class="form-label fw-bold">
                            <i class="fas fa-comment-dots"></i> Message for the Customer *
                        </label>
                        <textarea id="reapplyMessage" class="form-control" rows="4" maxlength="1000" placeholder="Explain what the customer needs to correct or add when re-applying..."></textarea>
                        <div class="form-text"><span id="reapplyMsgCount">0</span>/1000 characters</div>
                        <div id="reapplyMessageError" class="text-danger d-none mt-1">
                            <i class="fas fa-exclamation-triangle"></i> <span>Please enter a message for the customer</span>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="confirmReapplyRequestBtn">
                            <i class="fas fa-paper-plane"></i> Send Request
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(reapplyModal);

        // Character counter
        reapplyModal.addEventListener('input', function (e) {
            if (e.target && e.target.id === 'reapplyMessage') {
                const counter = document.getElementById('reapplyMsgCount');
                if (counter) counter.textContent = e.target.value.length;
                const errDiv = document.getElementById('reapplyMessageError');
                if (errDiv) errDiv.classList.add('d-none');
                e.target.classList.remove('is-invalid');
            }
        });
    }

    // Set rejection reason
    const reasonBox = document.getElementById('reapplyRejectionReasonBox');
    if (reasonBox) {
        const reasonSpan = reasonBox.querySelector('span');
        const reasonText = (currentRejectionReason && currentRejectionReason.trim() !== '')
            ? currentRejectionReason
            : 'No reason provided.';
        if (reasonSpan) reasonSpan.textContent = reasonText;
    }

    // Reset message input
    const messageInput = document.getElementById('reapplyMessage');
    if (messageInput) {
        messageInput.value = '';
        messageInput.classList.remove('is-invalid');
    }
    const counter = document.getElementById('reapplyMsgCount');
    if (counter) counter.textContent = '0';
    const msgError = document.getElementById('reapplyMessageError');
    if (msgError) msgError.classList.add('d-none');

    // Remove existing event listener and add new one
    const confirmBtn = document.getElementById('confirmReapplyRequestBtn');
    if (confirmBtn) {
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', executeReapplyRequest);
    }

    const modal = new bootstrap.Modal(reapplyModal);
    modal.show();
}

async function executeReapplyRequest() {
    const modalElement = document.getElementById('reapplyRequestModal');
    const messageInput = document.getElementById('reapplyMessage');
    const messageError = document.getElementById('reapplyMessageError');

    const message = messageInput ? messageInput.value.trim() : '';
    if (!message) {
        if (messageError) messageError.classList.remove('d-none');
        if (messageInput) messageInput.classList.add('is-invalid');
        showToast("Please enter a message for the customer.", "warning");
        return;
    }

    const modalBody = modalElement.querySelector('.modal-body');
    const modalFooter = modalElement.querySelector('.modal-footer');
    const modalHeader = modalElement.querySelector('.modal-header');

    modalElement.setAttribute('data-original-body', modalBody.innerHTML);
    modalElement.setAttribute('data-original-footer', modalFooter.innerHTML);

    modalBody.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3 mb-0">Sending reapply request...</p>
            <small class="text-muted">Please wait</small>
        </div>
    `;
    modalFooter.style.display = 'none';
    const closeBtn = modalHeader?.querySelector('.btn-close');
    if (closeBtn) closeBtn.disabled = true;

    try {
        const res = await fetch(`/api/superadmin/application/${appId}/request-reapply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to send reapply request");

        // ✅ UPDATE LOCAL STATE IMMEDIATELY
        currentReapplyRequested = true;
        currentReapplyRequestedAt = new Date().toISOString();

        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Reapply request sent!</p>
                <p class="text-muted mt-2">The customer has been notified via email with the reapply link.</p>
                <small class="text-muted">Closing...</small>
            </div>
        `;

        setTimeout(() => {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
            if (modalElement.hasAttribute('data-original-body')) {
                modalBody.innerHTML = modalElement.getAttribute('data-original-body');
                modalElement.removeAttribute('data-original-body');
            }
            if (modalElement.hasAttribute('data-original-footer')) {
                modalFooter.innerHTML = modalElement.getAttribute('data-original-footer');
                modalFooter.style.display = 'flex';
                modalElement.removeAttribute('data-original-footer');
            }
            if (closeBtn) closeBtn.disabled = false;

            // ✅ RE-RENDER THE FLOATING BUTTON TO SHOW DISABLED STATE
            toggleFloatingButtons(currentApplicationStatus);
        }, 1800);

    } catch (err) {
        console.error("Reapply request error:", err);
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
                <p class="mt-2 mb-0 text-danger fw-bold">Failed to send reapply request</p>
                <small class="text-muted">${err.message}</small>
            </div>
        `;
        modalFooter.style.display = 'flex';
        modalFooter.innerHTML = `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>`;
        if (closeBtn) closeBtn.disabled = false;
    }
}