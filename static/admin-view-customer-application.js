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
// LOAD APPLICATION DATA
// =========================
async function loadApplication() {
    try {
        const res = await fetch(`/api/superadmin/application/${appId}`);
        const data = await res.json();

        if(data.error){
            alert(data.error);
            return;
        }

        // Store the application status
        currentApplicationStatus = data.status;

        const setText = (id, val) => {
            const el = document.getElementById(id);
            if(el) el.textContent = val || "";
        };

        // =========================
        // BASIC INFO - USING CLEAN NAME FUNCTION
        // =========================
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

        // =========================
        // ADDRESS
        // =========================
        setText("address", data.address);
        setText("billing_address", data.billing_address);
        setText("barangay", data.barangay);
        setText("city", data.city);
        setText("province", data.province);
        setText("zip", data.zip);

        // =========================
        // EMPLOYMENT
        // =========================
        setText("employer", data.employer);
        setText("business_address", data.business_address);
        setText("business_phone", data.business_phone);

        // =========================
        // SPOUSE
        // =========================
        setText("spouse_name", data.spouse_name);
        setText("spouse_occupation", data.spouse_occupation);
        setText("spouse_employer", data.spouse_employer);
        setText("spouse_phone", data.spouse_phone);

        // =========================
        // FAMILY
        // =========================
        setText("parents_name", data.parents_name);
        setText("others", data.others);

        // =========================
        // PLAN & SERVICE
        // =========================
        setText("plan", data.plan);
        setText("service_type", data.service_type);
        setText("installation_address", data.installation_address);
        setText("installation_phone", data.installation_phone);
        setText("installation_fee", data.installation_fee);
        
        // =========================
        // TV SETS TABLE
        // =========================
        const tvTableBody = document.getElementById("tvTableBody");
        if(tvTableBody){
            tvTableBody.innerHTML = "";
            for(let i = 0; i < (data.tv_qty?.length || 0); i++){
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${data.tv_qty[i] || ""}</td>
                    <td>${data.tv_brand[i] || ""}</td>
                    <td>${data.tv_type[i] || ""}</td>
                `;
                tvTableBody.appendChild(row);
            }
        }

        // =========================
        // IMAGES
        // =========================
        const setImg = (id, src) => {
            const imgEl = document.getElementById(id);
            if(imgEl) imgEl.src = src || "";
        };

        setImg("signature", data.signature);
        setImg("id_front", data.id_front);
        setImg("id_back", data.id_back);
        setImg("proof_billing", data.proof_billing);
        setImg("profile_photo", data.profile_photo);

        initMap(data);
        initImageModal();

        // =========================
        // SUBMISSION DATE/TIME
        // =========================
        setText("date_submitted", data.date_submitted);
        setText("time_submitted", data.time_submitted);

        // Store application data for contract view
        window.currentApplicationData = data;
        
        // Initialize View Contract button after data is loaded
        initViewContractButton();

    } catch(err){
        console.error("Failed to load application:", err);
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
    window.open(`/superadmin/download/pdf/${appId}`, "_blank");
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
    const appData = await loadApplicationData();
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

// =========================
// DOWNLOAD CONTRACT PDF
// =========================
function downloadContract(contractNumber) {
    if (!contractNumber) {
        showToast("Contract number not found", "error");
        return;
    }
    window.open(`/superadmin/download/contract/${appId}/${contractNumber}`, "_blank");
}

async function loadApplicationData() {
    try {
        const res = await fetch(`/api/superadmin/application/${appId}`);
        return await res.json();
    } catch (err) {
        console.error("Failed to load application data:", err);
        return {};
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

// =========================
// INITIALIZE ON PAGE LOAD
// =========================
document.addEventListener('DOMContentLoaded', () => {
    loadApplication();
});

loadApplication();