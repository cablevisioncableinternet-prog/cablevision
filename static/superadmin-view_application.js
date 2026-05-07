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
    
    // Special case for Pila with specific barangays
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
    
    // Check other city prefixes
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
function setupContractNumberInput(contractInput, city, barangay = null) {
    const prefix = getContractPrefix(city, barangay);
    let currentNumber = '';
    
    const newInput = contractInput.cloneNode(true);
    contractInput.parentNode.replaceChild(newInput, contractInput);
    contractInput = newInput;
    
    contractInput.value = prefix;
    contractInput.setAttribute('data-prefix', prefix);
    
    contractInput.addEventListener('input', function(e) {
        const prefix = this.getAttribute('data-prefix');
        let value = this.value;
        
        if (!value.startsWith(prefix)) {
            this.value = prefix;
            currentNumber = '';
            return;
        }
        
        let numberPart = value.substring(prefix.length);
        numberPart = numberPart.replace(/\D/g, '');
        
        if (numberPart.length > 4) {
            numberPart = numberPart.substring(0, 4);
        }
        
        currentNumber = numberPart;
        this.value = prefix + numberPart;
        this.setSelectionRange(this.value.length, this.value.length);
    });
    
    contractInput.addEventListener('keydown', function(e) {
        const prefix = this.getAttribute('data-prefix');
        const cursorPos = this.selectionStart;
        const selectionLength = window.getSelection().toString().length;
        
        if (cursorPos <= prefix.length && (e.key === 'Backspace' || e.key === 'Delete')) {
            if (selectionLength > 0 && cursorPos + selectionLength > prefix.length) {
                return;
            }
            e.preventDefault();
        }
        
        if (e.key.length === 1 && /[^0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Tab' && e.key !== 'Home' && e.key !== 'End') {
            e.preventDefault();
        }
    });
    
    contractInput.addEventListener('paste', function(e) {
        e.preventDefault();
        const pastedText = (e.clipboardData || window.clipboardData).getData('text');
        const numbersOnly = pastedText.replace(/\D/g, '');
        if (numbersOnly) {
            const prefix = this.getAttribute('data-prefix');
            let newNumber = currentNumber + numbersOnly;
            if (newNumber.length > 4) {
                newNumber = newNumber.substring(0, 4);
            }
            this.value = prefix + newNumber;
            currentNumber = newNumber;
            this.setSelectionRange(this.value.length, this.value.length);
        }
    });
    
    return function getFullContractNumber() {
        return contractInput.value;
    };
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

        currentApplicationStatus = data.status;
        applicationCity = data.city || '';
        await loadApprovalRequests();
        toggleFloatingButtons(currentApplicationStatus);
        toggleViewContractButton(currentApplicationStatus);

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || "";
        };

        setText("application_number", data.application_number);
        setText("full_name", getCleanFullName(data.first_name, data.middle_name, data.last_name, data.suffix));
        setText("email", data.email);
        setText("mobile", data.mobile);
        setText("secondary_mobile", data.secondary_mobile);
        setText("phone", data.phone);
        setText("birthdate", data.birthdate);
        setText("place_of_birth", data.place_of_birth);
        setText("mother_maiden_name", data.mother_maiden_name);
        setText("sex", data.sex);
        setText("civil_status", data.civil_status);
        setText("citizenship", data.citizenship);
        setText("occupation", data.occupation);
        setText("home_ownership", data.home_ownership);
        setText("address", data.address);
        setText("billing_address", data.billing_address);
        setText("house_number", data.house_number);
        setText("landmark", data.landmark);
        setText("barangay", data.barangay);
        setText("city", data.city);
        setText("province", data.province);
        setText("zip", data.zip);
        setText("employer", data.employer);
        setText("business_address", data.business_address);
        setText("business_phone", data.business_phone);
        setText("spouse_name", data.spouse_name);
        setText("spouse_occupation", data.spouse_occupation);
        setText("spouse_employer", data.spouse_employer);
        setText("spouse_phone", data.spouse_phone);
        setText("parents_name", data.parents_name);
        setText("others", data.others);
        setText("plan", data.plan);
        setText("service_type", data.service_type);
        setText("installation_address", data.installation_address);
        setText("installation_phone", data.installation_phone);
        setText("installation_fee", data.installation_fee);

        const tvTableBody = document.getElementById("tvTableBody");
        if (tvTableBody) {
            tvTableBody.innerHTML = "";
            for (let i = 0; i < (data.tv_qty?.length || 0); i++) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${data.tv_qty[i] || ""}</td>
                    <td>${data.tv_brand[i] || ""}</td>
                    <td>${data.tv_type[i] || ""}<td>
                `;
                tvTableBody.appendChild(row);
            }
        }

        const setImg = (id, src) => {
            const imgEl = document.getElementById(id);
            if (imgEl) imgEl.src = src || "";
        };

        setImg("signature", data.signature);
        setImg("id_front", data.id_front);
        setImg("id_back", data.id_back);
        setImg("proof_billing", data.proof_billing);
        setImg("profile_photo", data.profile_photo);

        initMap(data);
        initImageModal();

        setText("date_submitted", data.date_submitted);
        setText("time_submitted", data.time_submitted);
        addStatusBadge(data.status);

    } catch (err) {
        console.error("Failed to load application:", err);
        showToast("Failed to load application data", "error");
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

        // Only get PENDING requests, exclude DONE
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
// TOGGLE FLOATING BUTTONS
// =========================
function toggleFloatingButtons(status) {
    const floatingActions = document.getElementById("floatingActions");

    if (floatingActions) {
        floatingActions.innerHTML = '';

        if (currentApprovalRequest &&
            currentApprovalRequest.requested_status &&
            currentApprovalRequest.status === "Pending") {

            const requestedStatus = currentApprovalRequest.requested_status;
            const requestedBy = currentApprovalRequest.requested_by || currentApprovalRequest.admin_id || 'Unknown Admin';
            const reason = currentApprovalRequest.reason || '';
            
            console.log("Request details for display:", { requestedBy, requestedStatus, reason });
            
            const reasonHtml = reason ? `<br><small style="color: #d97706;"><strong>Reason:</strong> ${escapeHtml(reason)}</small>` : '';

            const requestContainer = document.createElement('div');
            requestContainer.className = 'request-container';
            requestContainer.innerHTML = `
                <div class="request-info">
                    <strong>Admin Request:</strong> ${requestedStatus === 'Approved' ? 'Approve' : 'Reject'} this application<br>
                    <small>Administrator <strong>${escapeHtml(requestedBy)}</strong> has requested to ${requestedStatus.toLowerCase()} this application.</small>
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

        } else if (status && status.toLowerCase() === "pending" && !currentApprovalRequest) {
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
            installation_fee: applicationData.installation_fee || ''
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
// SETUP INSTALLMENT DATE INPUTS
// =========================
function setupInstallmentDateInputs(installmentMonths) {
    const firstInstallmentInput = document.getElementById('firstInstallmentDate');
    const lastInstallmentInput = document.getElementById('lastInstallmentDate');
    const installmentErrorDiv = document.getElementById('installmentError');
    
    if (firstInstallmentInput) {
        const currentMonth = getCurrentYearMonth();
        firstInstallmentInput.setAttribute('min', currentMonth);
        firstInstallmentInput.value = '';
        firstInstallmentInput.classList.remove('is-invalid');
        
        const newFirstInstallmentInput = firstInstallmentInput.cloneNode(true);
        firstInstallmentInput.parentNode.replaceChild(newFirstInstallmentInput, firstInstallmentInput);
        
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
}

// =========================
// CONTRACT NUMBER MODAL FUNCTIONS
// =========================
function showContractNumberModal() {
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending") {
        showToast("This application has already been processed!", "warning");
        return;
    }
    
    const contractModalElement = document.getElementById('contractNumberModal');
    const contractInput = document.getElementById('contractNumber');
    const billingDateInput = document.getElementById('billingDate');
    const proceedBtn = document.getElementById('proceedToConfirmBtn');
    const contractErrorDiv = document.getElementById('contractNumberError');
    const billingErrorDiv = document.getElementById('billingDateError');
    const installmentFields = document.getElementById('installmentFields');
    const installmentErrorDiv = document.getElementById('installmentError');
    
    if (billingDateInput) {
        billingDateInput.type = 'number';
        billingDateInput.min = 1;
        billingDateInput.max = 31;
        billingDateInput.placeholder = '1-31';
        billingDateInput.value = '';
        billingDateInput.classList.remove('is-invalid', 'is-valid');
    }
    if (contractErrorDiv) contractErrorDiv.classList.add('d-none');
    if (billingErrorDiv) billingErrorDiv.classList.add('d-none');
    if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
    if (contractInput) contractInput.classList.remove('is-invalid', 'is-valid');
    
    currentContractNumber = null;
    currentBillingDate = null;
    currentFirstInstallmentDate = null;
    currentLastInstallmentDate = null;
    
    loadApplicationData().then(appData => {
        const installationFee = appData.installation_fee || '';
        const installmentMonths = getInstallmentMonths(installationFee);
        isInstallmentPlan = installmentMonths > 0;
        
        let getFullContractNumber = () => '';
        if (contractInput && applicationCity) {
            const barangay = appData.barangay || null;
            getFullContractNumber = setupContractNumberInput(contractInput, applicationCity, barangay);
        }
        
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
                        <strong>Installment Plan</strong><br>
                        This application has an installment plan of <strong>${installmentMonths} month${installmentMonths > 1 ? 's' : ''}</strong> for the installation fee.<br>
                        <small class="text-muted">First installment date cannot be earlier than ${getCurrentYearMonth()}.</small>
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
        
        const newProceedBtn = proceedBtn.cloneNode(true);
        proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
        
        newProceedBtn.addEventListener('click', async () => {
            const contractNumber = getFullContractNumber();
            let billingDate = billingDateInput ? billingDateInput.value.trim() : null;
            const defaultPrefix = getContractPrefix(applicationCity);
            
            if (!contractNumber || contractNumber === defaultPrefix) {
                contractInput.classList.add('is-invalid');
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
            
            contractInput.classList.add('is-valid');
            currentContractNumber = contractNumber;
            currentBillingDate = billingDate;
            
            console.log("✅ CONTRACT NUMBER SET:", currentContractNumber);
            console.log("✅ BILLING DATE SET:", currentBillingDate);
            
            const modal = bootstrap.Modal.getInstance(contractModalElement);
            if (modal) modal.hide();
            
            const signatureImageUrl = appData.signature || null;
            const contractHtml = generateContractPreview(appData, currentContractNumber, currentBillingDate, signatureImageUrl);
            document.getElementById('contractPreviewContent').innerHTML = contractHtml;
            
            const contractPreviewModal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
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
    const contractModalElement = document.getElementById('contractNumberModal');
    const contractInput = document.getElementById('contractNumber');
    const billingDateInput = document.getElementById('billingDate');
    const proceedBtn = document.getElementById('proceedToConfirmBtn');
    const contractErrorDiv = document.getElementById('contractNumberError');
    const billingErrorDiv = document.getElementById('billingDateError');
    const installmentFields = document.getElementById('installmentFields');
    const installmentErrorDiv = document.getElementById('installmentError');
    
    if (billingDateInput) {
        billingDateInput.type = 'number';
        billingDateInput.min = 1;
        billingDateInput.max = 31;
        billingDateInput.placeholder = '1-31';
        billingDateInput.value = '';
        billingDateInput.classList.remove('is-invalid', 'is-valid');
    }
    if (contractErrorDiv) contractErrorDiv.classList.add('d-none');
    if (billingErrorDiv) billingErrorDiv.classList.add('d-none');
    if (installmentErrorDiv) installmentErrorDiv.classList.add('d-none');
    if (contractInput) contractInput.classList.remove('is-invalid', 'is-valid');
    
    currentContractNumber = null;
    currentBillingDate = null;
    currentFirstInstallmentDate = null;
    currentLastInstallmentDate = null;
    
    loadApplicationData().then(appData => {
        const installationFee = appData.installation_fee || '';
        const installmentMonths = getInstallmentMonths(installationFee);
        isInstallmentPlan = installmentMonths > 0;
        
        let getFullContractNumber = () => '';
        if (contractInput && applicationCity) {
            const barangay = appData.barangay || null;
            getFullContractNumber = setupContractNumberInput(contractInput, applicationCity, barangay);
        }
        
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
                        <strong>Installment Plan</strong><br>
                        This application has an installment plan of <strong>${installmentMonths} month${installmentMonths > 1 ? 's' : ''}</strong> for the installation fee.<br>
                        <small class="text-muted">First installment date cannot be earlier than ${getCurrentYearMonth()}.</small>
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
        
        const newProceedBtn = proceedBtn.cloneNode(true);
        proceedBtn.parentNode.replaceChild(newProceedBtn, proceedBtn);
        
        newProceedBtn.addEventListener('click', async () => {
            const contractNumber = getFullContractNumber();
            let billingDate = billingDateInput ? billingDateInput.value.trim() : null;
            const defaultPrefix = getContractPrefix(applicationCity);
            
            if (!contractNumber || contractNumber === defaultPrefix) {
                contractInput.classList.add('is-invalid');
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
            
            contractInput.classList.add('is-valid');
            currentContractNumber = contractNumber;
            currentBillingDate = billingDate;
            
            console.log("✅ CONTRACT NUMBER SET (Request):", currentContractNumber);
            
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
    
    const confirmModal = new bootstrap.Modal(document.getElementById('confirmApprovalModal'));
    confirmModal.show();
}

// =========================
// PROCESS APPROVAL FOR REQUEST - FIXED TO REFRESH PAGE
// =========================
async function processApprovalWithContractForRequest(requestId) {
    console.log("🔵🔵🔵 processApprovalWithContractForRequest CALLED 🔵🔵🔵");
    console.log("🔵 requestId:", requestId);
    console.log("🔵 currentContractNumber:", currentContractNumber);
    console.log("🔵 currentBillingDate:", currentBillingDate);
    
    if (!currentContractNumber) {
        showToast("Missing contract number. Please start over.", "error");
        return;
    }
    
    if (!currentBillingDate) {
        showToast("Missing billing date. Please start over.", "error");
        return;
    }
    
    const modalElement = document.getElementById('confirmApprovalModal');
    showModalLoading(modalElement, true, 'approval');

    try {
        const appData = await loadApplicationData();
        
        // ========== DIRECT SAVE TO CONTRACTS ==========
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
        
        // Convert first_installment_date and last_installment_date to proper format if they exist
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
            installation_fee: appData.installation_fee || ''
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
        
        // Call the approve_request endpoint with all necessary data
        const requestResponse = await fetch(`/api/superadmin/approval-request/${requestId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contract_number: currentContractNumber,
                billing_date: currentBillingDate,
                first_installment_date: firstInstallment,
                last_installment_date: lastInstallment
            })
        });

        if (!requestResponse.ok) {
            const errorData = await requestResponse.json();
            throw new Error(errorData.error || "Failed to accept request");
        }

        const result = await requestResponse.json();
        console.log("Request approval response:", result);

        // Clear session storage and local state
        sessionStorage.setItem('refresh_admin_applications', 'true');
        
        // Clear the current approval request to prevent showing old request after reload
        currentApprovalRequest = null;
        pendingRequestId = null;
        pendingRequestedStatus = null;

        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Application approved successfully!</p>
                <p class="text-muted mt-2">Contract Number: <strong>${currentContractNumber}</strong></p>
                <p class="text-muted">Billing Day: Every ${currentBillingDate} of the month</p>
                <p class="text-muted">The admin request has been accepted and marked as DONE.</p>
                <small class="text-muted">Reloading page...</small>
            </div>
        `;

        // IMPORTANT: Reload the page to refresh all state
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

async function processApprovalWithContract() {
    console.log("🔵🔵🔵 processApprovalWithContract CALLED 🔵🔵🔵");
    console.log("🔵 currentContractNumber:", currentContractNumber);
    console.log("🔵 currentBillingDate:", currentBillingDate);
    
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
    
    const modalElement = document.getElementById('confirmApprovalModal');
    showModalLoading(modalElement, true, 'approval');

    try {
        const appData = await loadApplicationData();
        
        console.log("📦 Application Data loaded");
        
        // ========== DIRECT SAVE TO CONTRACTS ==========
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
            installation_fee: appData.installation_fee || ''
        };
        
        console.log("🚀 SAVING CONTRACT DIRECTLY to /api/superadmin/contracts/" + currentContractNumber);
        
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
        
        console.log("✅ CONTRACT SAVED SUCCESSFULLY!");
        
        // ========== UPDATE APPLICATION STATUS ==========
        console.log("➡️ Updating application status...");
        const res = await fetch(`/api/superadmin/application/${appId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                status: "Approved",
                contract_number: currentContractNumber,
                billing_date: currentBillingDate,
                first_installment_date: firstInstallment,
                last_installment_date: lastInstallment
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Approval failed");

        sessionStorage.setItem('refresh_admin_applications', 'true');

        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">✓ Application approved successfully!</p>
                <p class="text-muted mt-2">Contract Number: <strong>${currentContractNumber}</strong></p>
                <p class="text-muted">Billing Day: Every ${currentBillingDate} of the month</p>
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

    if (action === 'accept') {
        modalTitle.textContent = 'Accept Admin Request';
        modalMessage.innerHTML = `Administrator <strong>${escapeHtml(requestedBy)}</strong> has requested to ${requestedStatus.toLowerCase()} this application.${reasonHtml}<br><br>
            <strong>This will:</strong>
            <ul>
                <li>✅ ${requestedStatus === 'Approved' ? 'Approve the application' : 'Reject the application'}</li>
                <li>📧 Notify the customer and requesting admin</li>
                <li>🔄 Update the application status</li>
            </ul>`;
        
        const newConfirmBtn = confirmRequestBtn.cloneNode(true);
        confirmRequestBtn.parentNode.replaceChild(newConfirmBtn, confirmRequestBtn);
        newConfirmBtn.onclick = () => {
            closeRequestModalFunc();
            processRequest(requestId, requestedStatus, 'accept');
        };
    } else {
        modalTitle.textContent = 'Reject Admin Request';
        modalMessage.innerHTML = `Are you sure you want to reject the request from administrator <strong>${escapeHtml(requestedBy)}</strong> to ${requestedStatus.toLowerCase()} this application?${reasonHtml}<br><br>
            <strong>Note:</strong> The original approve/reject buttons will reappear after rejecting this request. The customer will be notified via email.`;
        
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
            const response = await fetch(`/api/superadmin/approval-request/${requestId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contract_number: currentContractNumber,
                    billing_date: currentBillingDate,
                    first_installment_date: currentFirstInstallmentDate,
                    last_installment_date: currentLastInstallmentDate
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to accept request");
            }

            sessionStorage.setItem('refresh_admin_applications', 'true');

            loadingDiv.innerHTML = `
                <div class="loading-content">
                    <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                    <p class="mt-2 mb-0 text-success fw-bold">Request accepted successfully!</p>
                    <p class="text-muted mt-2">Application has been ${requestedStatus.toLowerCase()} as requested by the admin.</p>
                    <p class="text-muted">The customer has been notified via email with PDF attachment.</p>
                    <small class="text-muted">Reloading page...</small>
                </div>
            `;

            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } else {
            const response = await fetch(`/api/superadmin/approval-request/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to reject request");
            }

            sessionStorage.setItem('refresh_admin_applications', 'true');

            loadingDiv.innerHTML = `
                <div class="loading-content">
                    <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                    <p class="mt-2 mb-0 text-success fw-bold">Request rejected successfully!</p>
                    <p class="text-muted mt-2">The admin's request has been rejected.</p>
                    <p class="text-muted">The application remains in Pending status.</p>
                    <p class="text-muted">The customer has been notified via email.</p>
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
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending") {
        showToast("This application has already been processed!", "warning");
        return;
    }
    const rejectModal = new bootstrap.Modal(document.getElementById("rejectModal"));
    rejectModal.show();
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

        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3 mb-0">Processing ${actionType}...</p>
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
    if (currentApplicationStatus && currentApplicationStatus.toLowerCase() !== "pending") {
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
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-success mb-3" style="font-size: 48px;">✓</div>
                <p class="mt-2 mb-0 text-success fw-bold">Application rejected successfully!</p>
                <small class="text-muted">Redirecting to applications list...</small>
            </div>
        `;

        setTimeout(() => {
            redirectToApplicationsList();
        }, 2000);

    } catch (err) {
        console.error(err);
        const modalBody = modalElement.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="text-center py-4">
                <div class="text-danger mb-3" style="font-size: 48px;">✗</div>
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
    
    document.getElementById("confirmRejectBtn")?.addEventListener("click", window.rejectHandler);
    
    const proceedToFinalBtn = document.getElementById('proceedToFinalApprovalBtn');
    if (proceedToFinalBtn) {
        const newProceedBtn = proceedToFinalBtn.cloneNode(true);
        proceedToFinalBtn.parentNode.replaceChild(newProceedBtn, proceedToFinalBtn);
        newProceedBtn.addEventListener('click', async () => {
            const contractPreviewModal = bootstrap.Modal.getInstance(document.getElementById('contractPreviewModal'));
            if (contractPreviewModal) contractPreviewModal.hide();
            
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
                    billingDateDiv.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong><br> Every ${currentBillingDate} of the month`;
                    alertDiv.appendChild(billingDateDiv);
                }
            } else {
                confirmBillingDateSpan.innerHTML = `<br><strong><i class="fas fa-calendar-alt"></i> Billing Day:</strong><br> Every ${currentBillingDate} of the month`;
            }
            
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmApprovalModal'));
            confirmModal.show();
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
}

function redirectToApplicationsList() {
    window.location.href = "/superadmin/internet-applications?t=" + Date.now();
}

document.getElementById("downloadPdfBtn")?.addEventListener("click", () => {
    window.open(`/superadmin/download/pdf/${appId}`, "_blank");
});

initializeEventListeners();
loadApplication();