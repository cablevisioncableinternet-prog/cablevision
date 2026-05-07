// ===== Live Date & Time =====
function updateDateTime() {
  const dateEl = document.getElementById("liveDate");
  const timeEl = document.getElementById("liveTime");

  const now = new Date();
  dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  timeEl.textContent = now.toLocaleTimeString('en-US');
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ===== Elements =====
const promoForm = document.getElementById("promoForm");
const promoTitle = document.getElementById("promoTitle");
const promoDesc = document.getElementById("promoDesc");
const promoList = document.getElementById("promoList");

// ===== Load existing promos =====
async function loadPromos() {
  try {
    const res = await fetch("/api/admin/promos");
    const promos = await res.json();
    promoList.innerHTML = "";
    promos.forEach((promo, index) => {
      const li = document.createElement("li");
      li.textContent = `${promo.title} - ${promo.desc}`;
      const delBtn = document.createElement("button");
      delBtn.textContent = "Delete";
      delBtn.className = "delete";
      delBtn.addEventListener("click", () => deletePromo(index));
      li.appendChild(delBtn);
      promoList.appendChild(li);
    });
  } catch(err) { console.error("Failed to load promos:", err); }
}

// ===== Create a new promo =====
promoForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: promoTitle.value, desc: promoDesc.value })
    });
    promoTitle.value = "";
    promoDesc.value = "";
    loadPromos();
  } catch(err) { console.error(err); }
});

// ===== Delete promo =====
async function deletePromo(index) {
  try {
    await fetch(`/api/admin/promos/${index}`, { method: "DELETE" });
    loadPromos();
  } catch(err) { console.error(err); }
}

// ===== Initial load =====
loadPromos();

document.addEventListener("DOMContentLoaded", () => {
  const promoForm = document.getElementById("promoForm");
  const promoList = document.getElementById("promoList");

  // Fetch existing promos
  fetch("/api/admin/promos")
    .then(res => res.json())
    .then(data => {
      promoList.innerHTML = "";
      data.forEach(promo => {
        const li = document.createElement("li");
        li.textContent = `${promo.title}: ${promo.desc}`;
        
        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.style.marginLeft = "10px";
        delBtn.onclick = () => {
          fetch(`/api/admin/promos/${promo.id}`, { method: "DELETE" })
            .then(res => res.json())
            .then(() => li.remove())
            .catch(console.error);
        };

        li.appendChild(delBtn);
        promoList.appendChild(li);
      });
    });

  // Create new promo
  promoForm.addEventListener("submit", e => {
    e.preventDefault();
    const title = document.getElementById("promoTitle").value;
    const desc = document.getElementById("promoDesc").value;

    fetch("/api/admin/promos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, desc })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        promoForm.reset();
        location.reload(); // refresh list
      })
      .catch(console.error);
  });
});