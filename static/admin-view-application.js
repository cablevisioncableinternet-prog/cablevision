const appId = window.location.pathname.split("/").pop();
let currentApplicationStatus = null;
let currentContractNumber = null;
let currentBillingDate = null;
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
// ADMIN INFO RETRIEVAL - PER TAB (server session is source of truth)
// =========================
function getTabId() {
    return sessionStorage.getItem('tab_id') || '';
}

let adminUsername = sessionStorage.getItem("adminUsername") || null;
let adminId = sessionStorage.getItem("adminId") || null;
let adminArea = sessionStorage.getItem("adminArea") || null;
let adminCity = sessionStorage.getItem("adminCity") || null;

async function refreshAdminInfoForRequest() {
    const tabId = getTabId();
    try {
        const response = await fetch(`/api/admin/session-user?tab_id=${tabId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.username) {
                adminUsername = data.username;
                sessionStorage.setItem('adminUsername', data.username);
                return true;
            }
        }
    } catch (error) {
        console.error('Error refreshing admin username from session:', error);
    }
    return false;
}

// =========================
// REDIRECT WITH CACHE BUSTING
// =========================
function redirectToApplicationsList() {
    window.location.href = "/admin/internet-applications?t=" + Date.now();
}

// =========================
// LOAD APPLICATION DATA
// =========================
async function loadApplication() {
    try {
        const res = await fetch(`/api/admin/application/${appId}`);
        const data = await res.json();

        if(data.error){
            alert(data.error);
            return;
        }

        currentApplicationStatus = data.status;
        
        // I-SET ANG REAPPLY STATE MULA SA DATA
        const reapplyRequested = data.reapply_requested === 1 || data.reapply_requested === true;
        const reapplyRequestedAt = data.reapply_requested_at || null;

        // ============================================================
        // HELPER: Set text to "—" if empty, else show value
        // ============================================================
        const setTextOrHide = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            
            const cleanVal = val || '';
            if (cleanVal === '' || cleanVal === 'none' || cleanVal === 'N/A' || cleanVal === 'null' || cleanVal === 'NULL') {
                el.textContent = 'none';
            } else {
                el.textContent = cleanVal;
            }
        };

        // ============================================================
        // HELPER: Set image or hide container if no src
        // ============================================================
        const setImgOrHide = (id, src) => {
            const imgEl = document.getElementById(id);
            if (!imgEl) return;
            
            const cleanSrc = src || '';
            if (cleanSrc !== '' && cleanSrc !== 'none' && cleanSrc !== 'null' && cleanSrc !== 'NULL') {
                imgEl.src = cleanSrc;
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

        // ============================================================
        // HELPER: Format birthdate
        // ============================================================
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

        // =========================
        // BASIC INFO
        // =========================
        setTextOrHide("application_number", data.application_number);
        setTextOrHide("full_name", getCleanFullName(data.first_name, data.middle_name, data.last_name, data.suffix));

        // =========================
        // CONTACT DETAILS
        // =========================
        setTextOrHide("email", data.email);
        setTextOrHide("mobile", data.mobile);
        setTextOrHide("secondary_mobile", data.secondary_mobile);
        setTextOrHide("phone", data.phone);

        // =========================
        // PERSONAL INFORMATION
        // =========================
        setTextOrHide("birthdate", formatBirthdate(data.birthdate));
        setTextOrHide("place_of_birth", data.place_of_birth);
        setTextOrHide("sex", data.sex);
        setTextOrHide("civil_status", data.civil_status);
        setTextOrHide("citizenship", data.citizenship);
        setTextOrHide("occupation", data.occupation);
        setTextOrHide("home_ownership", data.home_ownership);

        // =========================
        // ADDRESS (with House Number and Landmark)
        // =========================
        setTextOrHide("address", data.address);
        setTextOrHide("billing_address", data.billing_address);
        setTextOrHide("house_number", data.house_number);
        setTextOrHide("landmark", data.landmark);
        setTextOrHide("barangay", data.barangay);
        setTextOrHide("city", data.city);
        setTextOrHide("province", data.province);
        setTextOrHide("zip", data.zip);

        // =========================
        // EMPLOYMENT
        // =========================
        setTextOrHide("employer", data.employer);
        setTextOrHide("business_address", data.business_address);
        setTextOrHide("business_phone", data.business_phone);

        // =========================
        // SPOUSE
        // =========================
        setTextOrHide("spouse_name", data.spouse_name);
        setTextOrHide("spouse_occupation", data.spouse_occupation);
        setTextOrHide("spouse_employer", data.spouse_employer);
        setTextOrHide("spouse_phone", data.spouse_phone);

        // =========================
        // FAMILY
        // =========================
        setTextOrHide("father_name", data.father_name);
        setTextOrHide("mother_maiden_name", data.mother_maiden_name);

        // =========================
        // PLAN & SERVICE
        // =========================
        setTextOrHide("plan", data.plan);
        setTextOrHide("service_type", data.service_type);
        setTextOrHide("installation_address", data.installation_address);
        setTextOrHide("installation_phone", data.installation_phone);
        setTextOrHide("installation_fee", data.installation_fee);

        // =========================
        // TV SETS TABLE
        // =========================
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

        // =========================
        // SUBMISSION DATE/TIME
        // =========================
        setTextOrHide("date_submitted", data.date_submitted);
        setTextOrHide("time_submitted", data.time_submitted);

        // =========================
        // IMAGES
        // =========================
        setImgOrHide("signature", data.signature);
        setImgOrHide("id_front", data.id_front);
        setImgOrHide("id_back", data.id_back);
        setImgOrHide("proof_billing", data.proof_billing);
        setImgOrHide("profile_photo", data.profile_photo);

        // =========================
        // INITIALIZE UI COMPONENTS (with error handling)
        // =========================
        try {
            initMap(data);
        } catch (mapErr) {
            console.warn(" Map initialization failed:", mapErr);
        }
        
        try {
            initImageModal();
        } catch (imgErr) {
            console.warn(" Image modal initialization failed:", imgErr);
        }

        // Store application data for contract view
        window.currentApplicationData = data;
        
        // =========================
        // TOGGLE ACTION BUTTONS BASED ON STATUS (PASS THE REAPPLY STATE)
        // =========================
        try {
            toggleActionButtons(currentApplicationStatus, reapplyRequested, reapplyRequestedAt);
        } catch (btnErr) {
            console.warn(" Action buttons initialization failed:", btnErr);
        }

        addStatusBadge(data.status);
        showRejectionReason(data.status, data.rejection_reason);
        
        // Initialize View Contract button after data is loaded
        try {
            initViewContractButton();
        } catch (contractErr) {
            console.warn("View contract button initialization failed:", contractErr);
        }

    } catch(err){
        console.error("Failed to load application:", err);
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
        showToast("Failed to load application data. Please refresh the page.", "error");
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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showRejectionReason(status, reason) {
    const appNumberDiv = document.querySelector(".app-number");
    if (!appNumberDiv) return;

    const existingReason = document.querySelector(".rejection-reason-display");
    if (existingReason) existingReason.remove();

    if (status && status.toLowerCase() === "rejected" && reason && reason.trim() !== "") {
        const reasonDiv = document.createElement("div");
        reasonDiv.className = "rejection-reason-display";
        reasonDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <strong>Reason for Rejection:</strong> ${escapeHtml(reason)}
        `;
        appNumberDiv.appendChild(reasonDiv);
    }
}

// =========================
// MAP INITIALIZATION
// =========================
function initMap(data){
    const lat = parseFloat(data.latitude) || 14.6091;
    const lng = parseFloat(data.longitude) || 121.0223;

    const mapEl = document.getElementById("map");
    if(!mapEl) return;

    const map = L.map("map").setView([lat,lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    L.marker([lat,lng]).addTo(map)
        .bindPopup("Customer Location")
        .openPopup();
}

// =========================
// IMAGE MODAL PREVIEW
// =========================
function initImageModal(){
    document.querySelectorAll(".doc-img, .signature-img, .profile-img").forEach(img=>{
        img.addEventListener("click", function(){
            const modalImg = document.getElementById("modalImage");
            modalImg.src = this.src;

            modalImg.classList.remove("billing");
            if(this.classList.contains("billing")){
                modalImg.classList.add("billing");
            }

            new bootstrap.Modal(document.getElementById("imageModal")).show();
        });
    });
}

// =========================
// DOWNLOAD APPLICATION PDF
// =========================
document.getElementById("downloadPdfBtn")?.addEventListener("click", () => {
    window.open(`/admin/download/pdf/${appId}`, "_blank");
});

// =========================
// CALCULATE AGE HELPER
// =========================
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
// GENERATE CONTRACT PREVIEW WITH COMPLETE SECTIONS (UPDATED WITH CLEAN VALUES)
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
    
    // Format dates for display
    const formatMonthYear = (dateStr) => {
        if (!dateStr) return '_____________';
        const [year, month] = dateStr.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };
    
    const firstInstallmentFormatted = currentFirstInstallmentDate ? formatMonthYear(currentFirstInstallmentDate) : '_____________';
    const lastInstallmentFormatted = currentLastInstallmentDate ? formatMonthYear(currentLastInstallmentDate) : '_____________';
    
    // Get signature image URL
    const signatureSrc = signatureImageUrl || applicationData.signature || '';
    const hasSignature = signatureSrc && signatureSrc !== '';
    
    // Top Signature section (with signature, printed name, and date - aligned properly)
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
    
    // Bottom Signature section (signature and printed name only, on the right side)
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
    
    // Build Addendum section
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
    
    // Build Installment section - ONLY SHOWN for installment plans
    let installmentSection = '';
    if (isInstallmentPlan) {
        installmentSection = `
            <div class="installment-section">
                <div class="installment-title">
                    <strong>AGREEMENT TO PAY ON INSTALLMENT</strong><br>
                    FOR THE INSTALLATION FEE AND/OR SET TOP BOX FOR TV EXTENSION
                </div>
                <div class="addendum-content">
                    <p>That I, <strong>${fullName}</strong> holder of contract no. <strong>${contractNumber}</strong> wishes to avail of the INSTALLMENT PLAN for the INSTALLATION FEE starting <strong>${firstInstallmentFormatted}</strong> up to <strong>${lastInstallmentFormatted}</strong> and the SET TOP BOX for our <strong>_________</strong> TV Extension/s for five (5) months.</p>
                    <p><strong>NOTE:</strong> In the event that the account is disconnected during the said period, the remaining installment shall be paid in full.</p>
                </div>
            </div>
        `;
    }
    
    return `
        <div style="max-height: 70vh; overflow-y: auto; padding: 20px; background: #ffffff; border-radius: 8px; font-family: 'Times New Roman', serif;">
            <!-- Header with Left and Right Logos -->
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
            
            <!-- TOP SIGNATURE SECTION (Signature, Printed Name, and Date - aligned properly) -->
            ${topSignatureSection}
            
            <!-- ADDENDUM SECTION -->
            ${addendumSection}
            
            <!-- INSTALLMENT SECTION (Only shown for installment plans) -->
            ${installmentSection}
            
            <!-- BOTTOM SIGNATURE SECTION (Signature and Printed Name only, on the right side) -->
            ${bottomSignatureSection}
        </div>
    `;
}

// =========================
// VIEW CONTRACT FUNCTION
// =========================
async function viewContract() {
    try {
        // Get application data
        const res = await fetch(`/api/admin/application/${appId}`);
        const appData = await res.json();
        
        if (appData.error) {
            showToast(appData.error, "error");
            return;
        }
        
        const contractNumber = appData.contract_number;
        
        if (!contractNumber) {
            showToast("No contract found for this application. The application has not been approved yet.", "warning");
            return;
        }
        
        const billingDate = appData.billing_date || 'Not set';
        const signatureImageUrl = appData.signature || null;
        
        // Check if installment plan from the saved application data
        const installationFee = appData.installation_fee || '';
        const isInstallment = installationFee && (installationFee.toLowerCase().includes('installment') || 
                              installationFee.toLowerCase().includes('installment - 6 months') || 
                              installationFee.toLowerCase().includes('installment - 9 months'));
        
        // Get installment dates from contract data if available
        let firstInstallmentDate = null;
        let lastInstallmentDate = null;
        
        // Try to get from contracts node
        try {
            const contractRes = await fetch(`/api/admin/contracts/${contractNumber}`);
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
        
        // Also try from application data
        if (!firstInstallmentDate && appData.first_installment_date) {
            firstInstallmentDate = appData.first_installment_date;
        }
        if (!lastInstallmentDate && appData.last_installment_date) {
            lastInstallmentDate = appData.last_installment_date;
        }
        
        // Set the global variables for the contract preview
        isInstallmentPlan = isInstallment;
        currentFirstInstallmentDate = firstInstallmentDate;
        currentLastInstallmentDate = lastInstallmentDate;
        
        console.log("View Contract - Installment Plan:", isInstallmentPlan);
        console.log("View Contract - First Installment Date:", currentFirstInstallmentDate);
        console.log("View Contract - Last Installment Date:", currentLastInstallmentDate);
        
        // Generate contract preview
        const contractHtml = generateContractPreview(appData, contractNumber, billingDate, signatureImageUrl);
        const contractPreviewContent = document.getElementById('contractPreviewContent');
        
        if (contractPreviewContent) {
            contractPreviewContent.innerHTML = contractHtml;
        } else {
            console.error("contractPreviewContent element not found");
            return;
        }
        
        // Show the modal
        const contractPreviewModal = new bootstrap.Modal(document.getElementById('contractPreviewModal'));
        
        // Re-attach download button event
        const downloadBtn = document.getElementById('downloadContractBtn');
        if (downloadBtn) {
            const newDownloadBtn = downloadBtn.cloneNode(true);
            downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
            newDownloadBtn.addEventListener('click', () => {
                downloadContract(contractNumber);
            });
        }
        
        contractPreviewModal.show();
        
    } catch (error) {
        console.error("Error viewing contract:", error);
        showToast("Failed to load contract", "error");
    }
}

// =========================
// DOWNLOAD CONTRACT PDF
// =========================
function downloadContract(contractNumber) {
    if (!contractNumber) {
        showToast("Contract number not found", "error");
        return;
    }
    window.open(`/admin/download/contract/${appId}/${contractNumber}`, "_blank");
}

// =========================
// TOGGLE VIEW CONTRACT BUTTON BASED ON STATUS
// =========================
function toggleViewContractButton(status) {
    const viewContractBtn = document.getElementById('viewContractBtn');
    if (viewContractBtn) {
        if (status && status.toLowerCase() === 'approved') {
            viewContractBtn.style.display = 'inline-flex';
            console.log("View Contract button shown (status: approved)");
        } else {
            viewContractBtn.style.display = 'none';
            console.log("View Contract button hidden (status:", status, ")");
        }
    }
}

// =========================
// TOGGLE ACTION BUTTONS (APPROVE/REJECT) BASED ON STATUS
// =========================
function toggleActionButtons(status, reapplyRequested = false, reapplyRequestedAt = null) {
    const floatingActions = document.getElementById('floatingActions');
    const floatingRestoreActions = document.getElementById('floatingRestoreActions');
    const floatingReapplyActions = document.getElementById('floatingReapplyActions');
    
    const statusLower = status ? status.toLowerCase() : '';
    
    checkAnyPendingRequest().then(pendingInfo => {
        const hasPending = pendingInfo && pendingInfo.hasPending;
        const pendingStatus = pendingInfo ? pendingInfo.requested_status : null;
        
        // PENDING or REQUEST SENT - Show Approve/Reject buttons
        if (floatingActions) {
            if (statusLower === 'pending' || statusLower === 'request sent') {
                if (hasPending) {
                    floatingActions.innerHTML = `
                        <button class="btn-floating btn-approve-floating" style="opacity:0.5; cursor:not-allowed; background: #94a3b8;" disabled>
                            <i class="fas fa-check-circle"></i>
                            <span>Approve (Request Pending)</span>
                        </button>
                        <button class="btn-floating btn-reject-floating" style="opacity:0.5; cursor:not-allowed; background: #94a3b8;" disabled>
                            <i class="fas fa-times-circle"></i>
                            <span>Reject (Request Pending)</span>
                        </button>
                    `;
                    floatingActions.style.display = 'flex';
                    floatingActions.style.pointerEvents = 'none';
                    floatingActions.style.opacity = '0.7';
                } else {
                    floatingActions.innerHTML = `
                        <button class="btn-floating btn-approve-floating" id="floatingApproveBtn">
                            <i class="fas fa-check-circle"></i>
                            <span>Approve Application</span>
                        </button>
                        <button class="btn-floating btn-reject-floating" id="floatingRejectBtn">
                            <i class="fas fa-times-circle"></i>
                            <span>Reject Application</span>
                        </button>
                    `;
                    floatingActions.style.display = 'flex';
                    floatingActions.style.pointerEvents = 'auto';
                    floatingActions.style.opacity = '1';
                    attachActionButtonEvents();
                }
            } else {
                floatingActions.style.display = 'none';
            }
        }
        
        // REJECTED - Show Reapply button (check reapply_requested state)
        if (floatingReapplyActions) {
            if (statusLower === 'rejected') {
                if (reapplyRequested) {
                    let formattedDate = '';
                    if (reapplyRequestedAt) {
                        try {
                            const date = new Date(reapplyRequestedAt.replace(' ', 'T'));
                            if (!isNaN(date.getTime())) {
                                const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };
                                const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
                                formattedDate = `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
                            }
                        } catch(e) {
                            formattedDate = reapplyRequestedAt;
                        }
                    }
                    
                    floatingReapplyActions.innerHTML = `
                        <button class="btn-floating btn-reapply-floating" style="opacity:0.6; cursor:not-allowed; background: linear-gradient(135deg, #78716c 0%, #a8a29e 100%);" disabled>
                            <i class="fas fa-check-circle"></i>
                            <span class="reapply-btn-text">
                                <strong>Reapply Requested</strong>
                                ${formattedDate ? `<small>Request sent on ${formattedDate}</small>` : ''}
                            </span>
                        </button>
                    `;
                    floatingReapplyActions.style.display = 'flex';
                    floatingReapplyActions.style.pointerEvents = 'none';
                    floatingReapplyActions.style.opacity = '0.8';
                } else if (hasPending && pendingStatus === 'Reapply') {
                    floatingReapplyActions.innerHTML = `
                        <button class="btn-floating btn-reapply-floating" style="opacity:0.6; cursor:not-allowed; background: linear-gradient(135deg, #78716c 0%, #a8a29e 100%);" disabled>
                            <i class="fas fa-clock"></i>
                            <span class="reapply-btn-text">
                                <strong>Request Pending</strong>
                                <small>Waiting for superadmin approval...</small>
                            </span>
                        </button>
                    `;
                    floatingReapplyActions.style.display = 'flex';
                    floatingReapplyActions.style.pointerEvents = 'none';
                    floatingReapplyActions.style.opacity = '0.6';
                } else {

                    floatingReapplyActions.innerHTML = `
                        <button class="btn-floating btn-reapply-floating" id="floatingReapplyBtn">
                            <i class="fas fa-redo-alt"></i>
                            <span>Request Reapply</span>
                        </button>
                    `;
                    floatingReapplyActions.style.display = 'flex';
                    floatingReapplyActions.style.pointerEvents = 'auto';
                    floatingReapplyActions.style.opacity = '1';
                    attachReapplyButtonEvents();
                }
            } else {
                floatingReapplyActions.style.display = 'none';
            }
        }
    });
}


async function checkAnyPendingRequest() {
    try {
        const res = await fetch(`/api/admin/check-pending-request/${appId}`);
        const data = await res.json();
        return data;
    } catch (e) {
        console.error('Error checking pending request:', e);
        return { hasPending: false };
    }
}

async function checkPendingReapplyRequest() {
    const result = await checkAnyPendingRequest();
    // Para sa backward compatibility, return true kung may pending na Reapply
    return result.hasPending && result.requested_status === 'Reapply';
}


// =========================
// PREVENT FLOATING BUTTONS INTERACTION WHEN MODAL IS OPEN
// =========================
function setupModalPointerEvents() {
    const floatingActions = document.querySelectorAll('.floating-actions');
    
    // Kapag may modal na nag-show, i-disable ang floating buttons
    document.addEventListener('shown.bs.modal', function(e) {
        floatingActions.forEach(el => {
            el.style.pointerEvents = 'none';
            el.style.opacity = '0.4';
            el.style.transition = 'opacity 0.3s ease';
        });
    });
    
    // Kapag nag-close ang modal, i-restore ang floating buttons
    document.addEventListener('hidden.bs.modal', function(e) {
        floatingActions.forEach(el => {
            el.style.pointerEvents = 'auto';
            el.style.opacity = '1';
        });
    });
}

// =========================
// SEND REQUEST TO SUPERADMIN
// =========================
async function sendAdminRequest(status, reason = null) {
    await refreshAdminInfoForRequest();
    
    if (!adminUsername) {
        showToast("Admin username not found. Please login again.", "error");
        return false;
    }
    
    try {
        const requestBody = { status: status };
        if (reason) {
            requestBody.reason = reason;
        }
        
        const response = await fetch(`/api/admin/application/${appId}/request?username=${encodeURIComponent(adminUsername)}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const displayAction = status === "Pending" ? "restore" : status.toLowerCase();
            showToast(data.message || `Request to ${displayAction} application sent to superadmin!`);
            currentApplicationStatus = "Request Sent";
            

            toggleActionButtons('request sent', false, null);
            
            if (status !== "Reapply") {
                sessionStorage.setItem('refresh_superadmin_applications', 'true');
                setTimeout(() => {
                    redirectToApplicationsList();
                }, 1500);
            }
            
            return true;
        } else {
            showToast(data.error || `Failed to send ${status} request.`, "error");
            return false;
        }
    } catch (err) {
        console.error("Error sending admin request:", err);
        showToast("Network error. Please try again.", "error");
        return false;
    }
}

// =========================
// APPROVE MODAL HANDLERS
// =========================
function showApproveModal() {
    const applicantName = document.getElementById('full_name')?.textContent || 'this applicant';
    
    const modalApplicantName = document.getElementById('approveApplicantName');
    if (modalApplicantName) {
        modalApplicantName.textContent = applicantName;
    }
    
    const modalButtons = document.querySelector('#approveModal .modal-footer');
    const modalLoading = document.getElementById('approveModalLoading');
    const confirmBtn = document.getElementById('confirmApproveBtn');
    
    if (modalButtons) modalButtons.style.display = "flex";
    if (modalLoading) modalLoading.style.display = "none";
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Yes, Request Approval';
    }
    
    const approveModal = new bootstrap.Modal(document.getElementById('approveModal'));
    approveModal.show();
}

async function processApproveRequest() {
    const modalButtons = document.querySelector('#approveModal .modal-footer');
    const modalLoading = document.getElementById('approveModalLoading');
    const confirmBtn = document.getElementById('confirmApproveBtn');
    
    if (modalButtons) modalButtons.style.display = "none";
    if (modalLoading) modalLoading.style.display = "block";
    if (confirmBtn) confirmBtn.disabled = true;
    
    const success = await sendAdminRequest("Approved");
    
    if (success) {
        const approveModal = bootstrap.Modal.getInstance(document.getElementById('approveModal'));
        if (approveModal) approveModal.hide();
    } else {
        if (modalButtons) modalButtons.style.display = "flex";
        if (modalLoading) modalLoading.style.display = "none";
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-check-circle"></i> Yes, Request Approval';
        }
    }
}

function setupApproveModalEvents() {
    const confirmBtn = document.getElementById('confirmApproveBtn');
    const cancelBtn = document.getElementById('cancelApproveBtn');
    const closeBtn = document.getElementById('closeApproveModal');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', processApproveRequest);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const approveModal = bootstrap.Modal.getInstance(document.getElementById('approveModal'));
            if (approveModal) approveModal.hide();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const approveModal = bootstrap.Modal.getInstance(document.getElementById('approveModal'));
            if (approveModal) approveModal.hide();
        });
    }
}

// =========================
// REJECT MODAL HANDLERS
// =========================
function showRejectModal() {
    const rejectModal = new bootstrap.Modal(document.getElementById('rejectModal'));
    const reasonSelect = document.getElementById('rejectReason');
    const customReason = document.getElementById('rejectCustomReason');
    const modalButtons = document.querySelector('#rejectModal .modal-footer');
    const modalLoading = document.getElementById('rejectModalLoading');
    
    if (reasonSelect) reasonSelect.value = "";
    if (customReason) {
        customReason.value = "";
        customReason.style.display = "none";
    }
    if (modalButtons) modalButtons.style.display = "flex";
    if (modalLoading) modalLoading.style.display = "none";
    
    rejectModal.show();
}

function setupRejectModalEvents() {
    const reasonSelect = document.getElementById('rejectReason');
    const customReason = document.getElementById('rejectCustomReason');
    const confirmBtn = document.getElementById('confirmRejectBtn');
    const cancelBtn = document.getElementById('cancelRejectBtn');
    const closeBtn = document.getElementById('closeRejectModal');
    
    if (reasonSelect) {
        reasonSelect.addEventListener('change', () => {
            if (reasonSelect.value === "Other") {
                customReason.style.display = "block";
            } else {
                customReason.style.display = "none";
            }
        });
    }
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const reasonSelect = document.getElementById('rejectReason');
            const customReason = document.getElementById('rejectCustomReason');
            const modalButtons = document.querySelector('#rejectModal .modal-footer');
            const modalLoading = document.getElementById('rejectModalLoading');
            
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
            
            if (modalButtons) modalButtons.style.display = "none";
            if (modalLoading) modalLoading.style.display = "block";
            
            const success = await sendAdminRequest("Rejected", reason);
            
            if (success) {
                const rejectModal = bootstrap.Modal.getInstance(document.getElementById('rejectModal'));
                if (rejectModal) rejectModal.hide();
            } else {
                if (modalButtons) modalButtons.style.display = "flex";
                if (modalLoading) modalLoading.style.display = "none";
            }
        });
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const rejectModal = bootstrap.Modal.getInstance(document.getElementById('rejectModal'));
            if (rejectModal) rejectModal.hide();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const rejectModal = bootstrap.Modal.getInstance(document.getElementById('rejectModal'));
            if (rejectModal) rejectModal.hide();
        });
    }
}



// =========================
// ATTACH ACTION BUTTON EVENT LISTENERS
// =========================
function attachActionButtonEvents() {
    const approveBtn = document.getElementById('floatingApproveBtn');
    const rejectBtn = document.getElementById('floatingRejectBtn');
    
    if (approveBtn) {
        const newApproveBtn = approveBtn.cloneNode(true);
        approveBtn.parentNode.replaceChild(newApproveBtn, approveBtn);
        newApproveBtn.addEventListener('click', showApproveModal);
    }
    
    if (rejectBtn) {
        const newRejectBtn = rejectBtn.cloneNode(true);
        rejectBtn.parentNode.replaceChild(newRejectBtn, rejectBtn);
        newRejectBtn.addEventListener('click', showRejectModal);
    }
}


// =========================
// RESTORE REQUEST MODAL HANDLERS
// =========================
function showRestoreRequestModal() {
    const applicantName = document.getElementById('full_name')?.textContent || 'this applicant';
    
    const modalApplicantName = document.getElementById('restoreApplicantName');
    if (modalApplicantName) {
        modalApplicantName.textContent = applicantName;
    }
    
    const modalButtons = document.querySelector('#restoreRequestModal .modal-footer');
    const modalLoading = document.getElementById('restoreRequestModalLoading');
    const confirmBtn = document.getElementById('confirmRestoreRequestBtn');
    
    if (modalButtons) modalButtons.style.display = "flex";
    if (modalLoading) modalLoading.style.display = "none";
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-undo"></i> Yes, Request Restore';
    }
    
    const restoreModal = new bootstrap.Modal(document.getElementById('restoreRequestModal'));
    restoreModal.show();
}

async function processRestoreRequest() {
    const modalButtons = document.querySelector('#restoreRequestModal .modal-footer');
    const modalLoading = document.getElementById('restoreRequestModalLoading');
    const confirmBtn = document.getElementById('confirmRestoreRequestBtn');
    
    if (modalButtons) modalButtons.style.display = "none";
    if (modalLoading) {
        modalLoading.style.display = "block";

        const spinner = modalLoading.querySelector('.spinner-border');
        if (spinner) {
            spinner.classList.remove('text-warning');
            spinner.classList.add('text-primary');
        }
    }
    if (confirmBtn) confirmBtn.disabled = true;
    

    const success = await sendAdminRequest("Pending");
    
    if (success) {
        const restoreModal = bootstrap.Modal.getInstance(document.getElementById('restoreRequestModal'));
        if (restoreModal) restoreModal.hide();
    } else {
        if (modalButtons) modalButtons.style.display = "flex";
        if (modalLoading) modalLoading.style.display = "none";
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-undo"></i> Yes, Request Restore';
        }
    }
}

function setupRestoreRequestModalEvents() {
    const confirmBtn = document.getElementById('confirmRestoreRequestBtn');
    const cancelBtn = document.getElementById('cancelRestoreRequestBtn');
    const closeBtn = document.getElementById('closeRestoreRequestModal');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', processRestoreRequest);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const restoreModal = bootstrap.Modal.getInstance(document.getElementById('restoreRequestModal'));
            if (restoreModal) restoreModal.hide();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const restoreModal = bootstrap.Modal.getInstance(document.getElementById('restoreRequestModal'));
            if (restoreModal) restoreModal.hide();
        });
    }
}

function attachRestoreButtonEvents() {
    const restoreBtn = document.getElementById('floatingRestoreBtn');
    if (restoreBtn) {
        const newRestoreBtn = restoreBtn.cloneNode(true);
        restoreBtn.parentNode.replaceChild(newRestoreBtn, restoreBtn);
        newRestoreBtn.addEventListener('click', showRestoreRequestModal);
    }
}


// =========================
// REAPPLY REQUEST MODAL HANDLERS
// =========================
function showReapplyRequestModal() {
    const applicantName = document.getElementById('full_name')?.textContent || 'this applicant';
    

    const rejectionReasonEl = document.querySelector('.rejection-reason-display');
    let rejectionReason = 'No reason provided';
    if (rejectionReasonEl) {
        // Extract text after "Reason for Rejection:"
        const text = rejectionReasonEl.textContent || '';
        const match = text.match(/Reason for Rejection:\s*(.+)/);
        if (match && match[1]) {
            rejectionReason = match[1].trim();
        }
    }
    
    const reasonBox = document.getElementById('reapplyRejectionReasonBox');
    if (reasonBox) {
        reasonBox.textContent = rejectionReason;
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
    
    const modalButtons = document.querySelector('#reapplyRequestModal .modal-footer');
    const modalLoading = document.getElementById('reapplyRequestModalLoading');
    const confirmBtn = document.getElementById('confirmReapplyRequestBtn');
    
    if (modalButtons) modalButtons.style.display = "flex";
    if (modalLoading) modalLoading.style.display = "none";
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
    }
    
    const reapplyModal = new bootstrap.Modal(document.getElementById('reapplyRequestModal'));
    reapplyModal.show();
}

async function processReapplyRequest() {
    const modalButtons = document.querySelector('#reapplyRequestModal .modal-footer');
    const modalLoading = document.getElementById('reapplyRequestModalLoading');
    const confirmBtn = document.getElementById('confirmReapplyRequestBtn');
    const messageInput = document.getElementById('reapplyMessage');
    const messageError = document.getElementById('reapplyMessageError');
    
    const message = messageInput ? messageInput.value.trim() : '';
    if (!message) {
        if (messageError) messageError.classList.remove('d-none');
        if (messageInput) messageInput.classList.add('is-invalid');
        showToast("Please enter a message for the customer.", "warning");
        return;
    }
    
    if (modalButtons) modalButtons.style.display = "none";
    if (modalLoading) modalLoading.style.display = "block";
    if (confirmBtn) confirmBtn.disabled = true;
    
    const success = await sendAdminRequest("Reapply", message);
    
    if (success) {
        const reapplyModal = bootstrap.Modal.getInstance(document.getElementById('reapplyRequestModal'));
        if (reapplyModal) reapplyModal.hide();
        
   
        setTimeout(() => {
            toggleActionButtons('rejected');
        }, 300);
    } else {
        if (modalButtons) modalButtons.style.display = "flex";
        if (modalLoading) modalLoading.style.display = "none";
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Request';
        }
    }
}

function setupReapplyRequestModalEvents() {
    const confirmBtn = document.getElementById('confirmReapplyRequestBtn');
    const cancelBtn = document.getElementById('cancelReapplyRequestBtn');
    const closeBtn = document.getElementById('closeReapplyRequestModal');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', processReapplyRequest);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            const reapplyModal = bootstrap.Modal.getInstance(document.getElementById('reapplyRequestModal'));
            if (reapplyModal) reapplyModal.hide();
        });
    }
    
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const reapplyModal = bootstrap.Modal.getInstance(document.getElementById('reapplyRequestModal'));
            if (reapplyModal) reapplyModal.hide();
        });
    }
    
    // Character counter for message input
    const messageInput = document.getElementById('reapplyMessage');
    if (messageInput) {
        messageInput.addEventListener('input', function() {
            const counter = document.getElementById('reapplyMsgCount');
            if (counter) counter.textContent = this.value.length;
            const msgError = document.getElementById('reapplyMessageError');
            if (msgError) msgError.classList.add('d-none');
            this.classList.remove('is-invalid');
        });
    }
}

function attachReapplyButtonEvents() {
    const reapplyBtn = document.getElementById('floatingReapplyBtn');
    if (reapplyBtn) {
        const newReapplyBtn = reapplyBtn.cloneNode(true);
        reapplyBtn.parentNode.replaceChild(newReapplyBtn, reapplyBtn);
        newReapplyBtn.addEventListener('click', showReapplyRequestModal);
    }
}

// =========================
// TOAST NOTIFICATION
// =========================
function showToast(message, type = 'success') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 10000;
        `;
        document.body.appendChild(toastContainer);
        
        const toastStyle = document.createElement('style');
        toastStyle.textContent = `
            .custom-toast {
                background: linear-gradient(135deg, #166534 0%, #22c55e 100%);
                color: white;
                padding: 16px 20px;
                border-radius: 12px;
                margin-bottom: 12px;
                display: flex;
                align-items: center;
                gap: 12px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
                animation: slideInRight 0.3s ease;
                font-family: 'Inter', sans-serif;
                font-size: 14px;
                font-weight: 500;
                min-width: 300px;
            }
            .custom-toast.error {
                background: linear-gradient(135deg, #991b1b 0%, #ef4444 100%);
            }
            .custom-toast.warning {
                background: linear-gradient(135deg, #e69600 0%, #ffb74d 100%);
            }
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            @keyframes slideOutRight {
                from {
                    opacity: 1;
                    transform: translateX(0);
                }
                to {
                    opacity: 0;
                    transform: translateX(100px);
                }
            }
        `;
        document.head.appendChild(toastStyle);
    }
    
    const toast = document.createElement('div');
    toast.className = `custom-toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}" style="font-size: 18px;"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =========================
// INITIALIZE VIEW CONTRACT BUTTON
// =========================
function initViewContractButton() {
    toggleViewContractButton(currentApplicationStatus);
    
    const viewContractBtn = document.getElementById('viewContractBtn');
    if (viewContractBtn) {
        const newViewContractBtn = viewContractBtn.cloneNode(true);
        viewContractBtn.parentNode.replaceChild(newViewContractBtn, viewContractBtn);
        
        newViewContractBtn.addEventListener('click', (e) => {
            e.preventDefault();
            viewContract();
        });
        console.log("View Contract button event listener attached");
    } else {
        console.log("View Contract button not found in DOM");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadApplication();
    setupApproveModalEvents();
    setupRejectModalEvents();
    setupRestoreRequestModalEvents();
    setupReapplyRequestModalEvents();
    attachActionButtonEvents();
    attachRestoreButtonEvents();
    setupModalPointerEvents();
});





