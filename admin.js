const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loadingView = document.querySelector("#loading-view");
const loginForm = document.querySelector("#login-form");
const loginNotice = document.querySelector("#login-notice");
const dashboardNotice = document.querySelector("#dashboard-notice");
let registrants = [];

function setNotice(target, message) {
  target.textContent = message;
  target.hidden = false;
}

function clearNotice(target) {
  target.textContent = "";
  target.hidden = true;
}

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "تعذر إتمام الطلب.");
  return payload;
}

function showView(view) {
  loadingView.hidden = true;
  loginView.hidden = view !== "login";
  dashboardView.hidden = view !== "dashboard";
}

function filteredRegistrants() {
  const query = document.querySelector("#search-name").value.trim().toLocaleLowerCase("ar");
  const football = document.querySelector("#filter-football").value;
  const volleyball = document.querySelector("#filter-volleyball").value;
  const leader = document.querySelector("#filter-leader").value;
  return registrants.filter((person) => {
    return person.full_name.toLocaleLowerCase("ar").includes(query)
      && (football === "all" || person.football === (football === "yes"))
      && (volleyball === "all" || person.volleyball === (volleyball === "yes"))
      && (leader === "all" || person.leader === (leader === "yes"));
  });
}

function addCell(row, value, className = "") {
  const cell = document.createElement("td");
  cell.textContent = value;
  if (className) cell.className = className;
  row.append(cell);
  return cell;
}

function renderRows() {
  const list = filteredRegistrants();
  const body = document.querySelector("#registrants-body");
  body.replaceChildren();
  list.forEach((person, index) => {
    const row = document.createElement("tr");
    addCell(row, String(index + 1));
    addCell(row, person.full_name);
    addCell(row, person.phone);
    addCell(row, person.football ? "✓" : "✗", person.football ? "boolean-yes" : "boolean-no");
    addCell(row, person.volleyball ? "✓" : "✗", person.volleyball ? "boolean-yes" : "boolean-no");
    addCell(row, person.leader ? "✓" : "✗", person.leader ? "boolean-yes" : "boolean-no");
    addCell(row, new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(person.created_at)));
    const action = addCell(row, "");
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-button";
    remove.textContent = "حذف";
    remove.setAttribute("aria-label", `حذف تسجيل ${person.full_name}`);
    remove.addEventListener("click", () => deleteRegistrant(person.id, person.full_name));
    action.append(remove);
    body.append(row);
  });
  document.querySelector("#empty-state").hidden = list.length !== 0;
}

function renderStats() {
  const digits = new Intl.NumberFormat("ar");
  document.querySelector("#stat-total").textContent = digits.format(registrants.length);
  document.querySelector("#stat-football").textContent = digits.format(registrants.filter((person) => person.football).length);
  document.querySelector("#stat-volleyball").textContent = digits.format(registrants.filter((person) => person.volleyball).length);
  document.querySelector("#stat-leaders").textContent = digits.format(registrants.filter((person) => person.leader).length);
}

async function loadRegistrants() {
  const result = await api("/api/admin/registrants");
  registrants = result.registrants;
  renderStats();
  renderRows();
}

async function deleteRegistrant(id, fullName) {
  if (!window.confirm(`هل أنت متأكد من حذف تسجيل ${fullName}؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
  clearNotice(dashboardNotice);
  try {
    await api("/api/admin/registrants", { method: "DELETE", body: JSON.stringify({ id }) });
    registrants = registrants.filter((person) => person.id !== id);
    renderStats();
    renderRows();
  } catch (error) {
    setNotice(dashboardNotice, error.message);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearNotice(loginNotice);
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "جارٍ الدخول…";
  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: document.querySelector("#username").value.trim(),
        password: document.querySelector("#password").value,
      }),
    });
    await loadRegistrants();
    showView("dashboard");
  } catch (error) {
    setNotice(loginNotice, error.message);
  } finally {
    button.disabled = false;
    button.textContent = "دخول";
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
    showView("login");
  } catch (error) {
    setNotice(dashboardNotice, error.message);
  }
});

["#search-name", "#filter-football", "#filter-volleyball", "#filter-leader"].forEach((selector) => {
  document.querySelector(selector).addEventListener("input", renderRows);
  document.querySelector(selector).addEventListener("change", renderRows);
});

document.querySelector("#print-button").addEventListener("click", () => {
  const rows = filteredRegistrants();
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    setNotice(dashboardNotice, "يرجى السماح بالنوافذ المنبثقة للطباعة.");
    return;
  }
  const tableRows = rows.map((person) => `<tr><td>${escapeHtml(person.full_name)}</td><td>${person.football ? "صح" : "خطأ"}</td><td>${person.volleyball ? "صح" : "خطأ"}</td><td>${person.leader ? "صح" : "خطأ"}</td></tr>`).join("");
  const date = new Intl.DateTimeFormat("ar", { dateStyle: "long" }).format(new Date());
  printWindow.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>قائمة المسجلين في البطولة الرمضانية</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"><style>
    @page{size:A4;margin:16mm 14mm 20mm;@bottom-right{content:"فريق الروضة الرياضي الثقافي";font:9pt Tajawal;color:#000}@bottom-left{content:"صفحة " counter(page) " من " counter(pages);font:9pt Tajawal;color:#000}}
    *{box-sizing:border-box}body{font-family:Tajawal,Arial,sans-serif;color:#000;background:#fff;margin:0;direction:rtl}.heading{text-align:center;margin-bottom:24px}.logo{width:185px;height:82px;object-fit:contain}.heading h1{font-size:22px;margin:8px 0 4px}.heading p{font-size:12px;color:#000;margin:0}table{width:100%;border-collapse:collapse;font-size:12px}thead{display:table-header-group}tr{break-inside:avoid}th{background:#000;color:#fff;font-weight:700}th,td{padding:9px 10px;border:1px solid #000;text-align:right}tbody tr:nth-child(even){background:#f5f5f5}.empty{text-align:center;padding:20px;color:#000}
    </style></head><body><header class="heading"><img class="logo" src="${window.location.origin}/assets/logo.png" alt="شعار فريق الروضة"><h1>قائمة المسجلين في البطولة الرمضانية</h1><p>التاريخ: ${escapeHtml(date)}</p></header><table><thead><tr><th>الاسم الخماسي</th><th>كرة القدم</th><th>كرة الطائرة</th><th>قائد</th></tr></thead><tbody>${tableRows || '<tr><td class="empty" colspan="4">لا توجد تسجيلات مطابقة</td></tr>'}</tbody></table><script>window.addEventListener("load",()=>setTimeout(()=>window.print(),350));window.addEventListener("afterprint",()=>window.close());<\/script></body></html>`);
  printWindow.document.close();
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

(async () => {
  try {
    await api("/api/admin/session");
    await loadRegistrants();
    showView("dashboard");
  } catch {
    showView("login");
  }
})();
