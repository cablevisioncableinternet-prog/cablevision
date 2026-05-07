const placeSelect = document.getElementById("placeSelect");
    const customersTableBody = document.querySelector("#customersTable tbody");
    const noData = document.getElementById("noData");

    async function loadCustomersByPlace(place) {
      customersTableBody.innerHTML = "";
      try {
        const res = await fetch(`/api/superadmin/customers?place=${encodeURIComponent(place)}`);
        if (!res.ok) throw new Error("Failed to fetch customers");
        const customers = await res.json();

        if (!customers.length) {
          noData.textContent = `No customers found in ${place}.`;
          noData.style.display = "block";
          return;
        }

        noData.style.display = "none";
        customers.forEach(customer => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.contact}</td>
            <td>${customer.area}</td>
          `;
          customersTableBody.appendChild(tr);
        });
      } catch (err) {
        console.error(err);
        noData.textContent = "Error loading customers.";
        noData.style.display = "block";
      }
    }

    placeSelect.addEventListener("change", e => {
      const place = e.target.value;
      if (place) loadCustomersByPlace(place);
    });