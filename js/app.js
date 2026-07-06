/* ========================================
   PROFIT COMPASS — App Logic
   ======================================== */

// State
let currentStep = 1;
const totalSteps = 7;
let services = [];
let roles = [];

// ---- GATE ----
function enterApp() {
  document.getElementById('gate').classList.remove('active');
  document.getElementById('wizard').style.display = 'block';
  updateProgress();
}

// For now, auto-enter (remove when GHL form is embedded)
// Uncomment the line below to skip the gate during development:
// document.addEventListener('DOMContentLoaded', enterApp);

// ---- NAVIGATION ----
function nextStep() {
  if (currentStep >= totalSteps) return;
  showStep(currentStep + 1);
}
function prevStep() {
  if (currentStep <= 1) return;
  showStep(currentStep - 1);
}
function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  const target = document.querySelector(`.step[data-step="${n}"]`);
  if (target) {
    target.classList.add('active');
    currentStep = n;
    updateProgress();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (n === 6) populateScaleSelect();
    if (n === 7) renderDashboard();
  }
}

function updateProgress() {
  const pct = (currentStep / totalSteps) * 100;
  const bar = document.querySelector('.progress__bar');
  if (bar) bar.style.setProperty('--pct', pct + '%');
  document.querySelectorAll('.progress__dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 === currentStep);
    d.classList.toggle('done', i + 1 < currentStep);
  });
}

// Init progress dots
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('progress-steps');
  if (!container) return;
  const labels = ['Clínica', 'Servicios', 'Costos', 'Equipo', 'Pacientes', 'Simular', 'Diagnóstico'];
  labels.forEach((l, i) => {
    const span = document.createElement('span');
    span.className = 'progress__dot' + (i === 0 ? ' active' : '');
    span.textContent = l;
    container.appendChild(span);
  });

  // Conditional fields
  document.querySelectorAll('input[name="specialty"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('specialty-other-wrap').style.display =
        r.value === 'Otro' && r.checked ? 'block' : 'none';
    });
  });
  document.querySelectorAll('input[name="has-ads"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('ads-spend-wrap').style.display =
        document.getElementById('has-ads-yes').checked ? 'block' : 'none';
    });
  });

  // Live cost summary
  document.querySelectorAll('[id^="cost-"]').forEach(input => {
    input.addEventListener('input', updateCostsSummary);
  });

  // Add first service and role
  addService();
  addRole();

  // Simulation live update
  ['sim-daily-budget', 'sim-cpl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSimulation);
  });

  // CSS custom property for progress bar
  const style = document.createElement('style');
  style.textContent = `.progress__bar::after { width: var(--pct, 14.28%) !important; }`;
  document.head.appendChild(style);
});

// ---- SERVICES ----
function addService() {
  const id = Date.now();
  services.push({ id });
  renderServices();
}
function removeService(id) {
  if (services.length <= 1) return;
  services = services.filter(s => s.id !== id);
  renderServices();
}
function renderServices() {
  const list = document.getElementById('services-list');
  list.innerHTML = services.map((s, i) => `
    <div class="service-card" data-sid="${s.id}">
      <div class="service-card__header">
        <span class="service-card__num">Servicio ${i + 1}</span>
        ${services.length > 1 ? `<button class="service-card__remove" onclick="removeService(${s.id})">Eliminar</button>` : ''}
      </div>
      <div class="field">
        <label class="field__label">Nombre del procedimiento</label>
        <input type="text" class="field__input svc-name" placeholder="Ej: Blanqueamiento dental">
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Precio al paciente</label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input svc-price" min="0" value="0"></div>
        </div>
        <div class="field">
          <label class="field__label">Costo directo por procedimiento
            <span class="tooltip" data-tip="Materiales, insumos, laboratorio, descartables — lo que gastas cada vez que haces este procedimiento.">?</span>
          </label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input svc-cost" min="0" value="0"></div>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Duración promedio (minutos)</label>
          <input type="number" class="field__input svc-duration" min="1" value="60">
        </div>
        <div class="field">
          <label class="field__label">Pacientes/mes (este servicio)</label>
          <input type="number" class="field__input svc-patients" min="0" value="0">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">¿Es recurrente?</label>
          <div class="field__radios" style="flex-direction:row;gap:12px;">
            <label class="radio" style="flex:1;"><input type="radio" name="recur-${s.id}" value="yes"><span>Sí</span></label>
            <label class="radio" style="flex:1;"><input type="radio" name="recur-${s.id}" value="no" checked><span>No</span></label>
          </div>
        </div>
        <div class="field">
          <label class="field__label">Ticket real promedio
            <span class="tooltip" data-tip="Si aplicas descuentos o upsells, pon el valor real que paga el paciente en promedio.">?</span>
          </label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input svc-ticket" min="0" value="0"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function getServicesData() {
  const cards = document.querySelectorAll('.service-card');
  return Array.from(cards).map(card => {
    const price = num(card.querySelector('.svc-price'));
    const cost = num(card.querySelector('.svc-cost'));
    const duration = num(card.querySelector('.svc-duration')) || 60;
    const patients = num(card.querySelector('.svc-patients'));
    const ticket = num(card.querySelector('.svc-ticket')) || price;
    const name = card.querySelector('.svc-name').value || 'Sin nombre';
    const recurrent = card.querySelector(`input[name^="recur-"]:checked`)?.value === 'yes';

    const revenue = ticket * patients;
    const directCost = cost * patients;
    const margin = revenue - directCost;
    const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
    const hourlyRevenue = price / (duration / 60);
    const hourlyMargin = (price - cost) / (duration / 60);
    const slotsUsed = patients * (duration / 60);

    // Score: margin 40% + hourly margin 30% + ticket 20% + recurrence 10%
    const normMargin = Math.min(marginPct / 100, 1);
    const normHourly = Math.min(hourlyMargin / 500, 1);
    const normTicket = Math.min(ticket / 5000, 1);
    const normRecur = recurrent ? 1 : 0;
    const score = Math.round((normMargin * 40 + normHourly * 30 + normTicket * 20 + normRecur * 10));

    return {
      name, price, cost, duration, patients, ticket, recurrent,
      revenue, directCost, margin, marginPct, hourlyRevenue, hourlyMargin,
      slotsUsed, score
    };
  });
}

// ---- ROLES ----
function addRole() {
  const id = Date.now();
  roles.push({ id });
  renderRoles();
}
function removeRole(id) {
  if (roles.length <= 1) return;
  roles = roles.filter(r => r.id !== id);
  renderRoles();
}
function renderRoles() {
  const list = document.getElementById('payroll-list');
  list.innerHTML = roles.map((r, i) => `
    <div class="role-card" data-rid="${r.id}">
      <div class="role-card__header">
        <span class="service-card__num" style="font-size:1rem;">Rol ${i + 1}</span>
        ${roles.length > 1 ? `<button class="role-card__remove" onclick="removeRole(${r.id})">Eliminar</button>` : ''}
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Cargo</label>
          <input type="text" class="field__input role-name" placeholder="Ej: Recepcionista">
        </div>
        <div class="field">
          <label class="field__label">Cantidad</label>
          <input type="number" class="field__input role-qty" min="1" value="1">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Costo total por persona/mes
            <span class="tooltip" data-tip="Salario + comisiones + cargas sociales + beneficios. Todo incluido.">?</span>
          </label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input role-cost" min="0" value="0" oninput="updatePayrollSummary()"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function getPayrollTotal() {
  let total = 0;
  document.querySelectorAll('.role-card').forEach(card => {
    const qty = num(card.querySelector('.role-qty'));
    const cost = num(card.querySelector('.role-cost'));
    total += qty * cost;
  });
  return total;
}
function updatePayrollSummary() {
  const el = document.getElementById('total-payroll');
  if (el) el.textContent = fmt(getPayrollTotal());
}

// ---- COSTS ----
function getFixedCosts() {
  let total = 0;
  document.querySelectorAll('[id^="cost-"]').forEach(input => {
    total += num(input);
  });
  return total;
}
function updateCostsSummary() {
  const el = document.getElementById('total-fixed-costs');
  if (el) el.textContent = fmt(getFixedCosts());
}

// ---- ACQUISITION ----
function getAcquisitionData() {
  return {
    hasAds: document.getElementById('has-ads-yes')?.checked || false,
    adSpend: num(document.getElementById('ad-spend')),
    leads: num(document.getElementById('leads-month')),
    booked: num(document.getElementById('leads-booked')),
    showed: num(document.getElementById('leads-showed')),
    closed: num(document.getElementById('leads-closed'))
  };
}

// ---- SIMULATION ----
function populateScaleSelect() {
  const select = document.getElementById('scale-service');
  const svcs = getServicesData().sort((a, b) => b.score - a.score);
  select.innerHTML = svcs.map(s =>
    `<option value="${s.name}">${s.name} (Score: ${s.score})</option>`
  ).join('');
  updateSimulation();
}

function updateSimulation() {
  const svcs = getServicesData();
  const selectedName = document.getElementById('scale-service')?.value;
  const svc = svcs.find(s => s.name === selectedName) || svcs[0];
  if (!svc) return;

  const dailyBudget = num(document.getElementById('sim-daily-budget'));
  const cpl = num(document.getElementById('sim-cpl')) || 1;
  const acq = getAcquisitionData();

  const monthlySpend = dailyBudget * 30;
  const projectedLeads = Math.floor(monthlySpend / cpl);
  const convRate = acq.leads > 0 ? acq.closed / acq.leads : 0.3;
  const projectedPatients = Math.round(projectedLeads * convRate);
  const projectedRevenue = projectedPatients * svc.ticket;
  const cac = projectedPatients > 0 ? monthlySpend / projectedPatients : 0;
  const roas = monthlySpend > 0 ? projectedRevenue / monthlySpend : 0;
  const marginPerPatient = svc.ticket - svc.cost - cac;

  // Capacity
  const clinic = getClinicData();
  const totalCapacityHours = clinic.chairs * clinic.locations * clinic.hoursDay * clinic.daysWeek * 4.3;
  const svcCapacitySlots = Math.floor(totalCapacityHours / (svc.duration / 60));
  const freeSlots = Math.max(0, svcCapacitySlots - svc.patients);
  const spendToFill = freeSlots > 0 && projectedPatients > 0
    ? Math.round((freeSlots / projectedPatients) * monthlySpend)
    : 0;

  const container = document.getElementById('sim-results');
  container.innerHTML = `
    <div class="sim-row"><span class="sim-row__label">Gasto mensual en ads</span><span class="sim-row__value">${fmt(monthlySpend)}</span></div>
    <div class="sim-row"><span class="sim-row__label">Leads proyectados/mes</span><span class="sim-row__value gold">${projectedLeads}</span></div>
    <div class="sim-row"><span class="sim-row__label">Tasa de conversión usada</span><span class="sim-row__value">${(convRate * 100).toFixed(1)}%</span></div>
    <div class="sim-row"><span class="sim-row__label">Pacientes nuevos/mes</span><span class="sim-row__value gold">${projectedPatients}</span></div>
    <div class="sim-row"><span class="sim-row__label">CAC proyectado</span><span class="sim-row__value ${cac > svc.ticket * 0.25 ? 'red' : 'green'}">${fmt(cac)}</span></div>
    <div class="sim-row"><span class="sim-row__label">ROAS</span><span class="sim-row__value ${roas >= 3 ? 'green' : roas >= 1.5 ? '' : 'red'}">${roas.toFixed(1)}x</span></div>
    <div class="sim-row"><span class="sim-row__label">Margen neto por paciente</span><span class="sim-row__value ${marginPerPatient > 0 ? 'green' : 'red'}">${fmt(marginPerPatient)}</span></div>
    <div class="sim-row"><span class="sim-row__label">Capacidad libre (${svc.name})</span><span class="sim-row__value">${freeSlots} slots</span></div>
    <div class="sim-row"><span class="sim-row__label">Ad spend para llenar capacidad</span><span class="sim-row__value gold">${fmt(spendToFill)}/mes</span></div>
  `;
}

// ---- CLINIC DATA ----
function getClinicData() {
  return {
    name: document.getElementById('clinic-name')?.value || 'Tu clínica',
    daysWeek: num(document.getElementById('days-week')) || 6,
    hoursDay: num(document.getElementById('hours-day')) || 10,
    locations: num(document.getElementById('num-locations')) || 1,
    chairs: num(document.getElementById('num-chairs')) || 2
  };
}

// ---- DASHBOARD ----
function renderDashboard() {
  const clinic = getClinicData();
  const svcs = getServicesData();
  const fixedCosts = getFixedCosts();
  const payroll = getPayrollTotal();
  const acq = getAcquisitionData();

  const totalRevenue = svcs.reduce((s, v) => s + v.revenue, 0);
  const totalDirectCost = svcs.reduce((s, v) => s + v.directCost, 0);
  const totalCosts = fixedCosts + payroll + totalDirectCost + acq.adSpend;
  const netProfit = totalRevenue - totalCosts;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const totalPatients = svcs.reduce((s, v) => s + v.patients, 0);
  const avgTicket = totalPatients > 0 ? totalRevenue / totalPatients : 0;
  const grossMarginPct = totalRevenue > 0 ? ((totalRevenue - totalDirectCost) / totalRevenue) * 100 : 0;
  const breakeven = grossMarginPct > 0 ? (fixedCosts + payroll) / (grossMarginPct / 100) : 0;

  // Capacity
  const totalHours = clinic.chairs * clinic.locations * clinic.hoursDay * clinic.daysWeek * 4.3;
  const avgDuration = svcs.length > 0 ? svcs.reduce((s, v) => s + v.duration, 0) / svcs.length : 60;
  const maxSlots = Math.floor(totalHours / (avgDuration / 60));
  const usedSlots = totalPatients;
  const occupancy = maxSlots > 0 ? (usedSlots / maxSlots) * 100 : 0;
  const revenue80 = totalRevenue * (80 / Math.max(occupancy, 1));
  const moneyOnTable = Math.max(0, revenue80 - totalRevenue);

  // CAC
  const totalAcqCost = acq.adSpend + num(document.getElementById('cost-marketing'));
  const cac = acq.closed > 0 ? totalAcqCost / acq.closed : 0;
  const payrollPct = totalRevenue > 0 ? (payroll / totalRevenue) * 100 : 0;
  const cacPct = avgTicket > 0 ? (cac / avgTicket) * 100 : 0;

  // Title
  document.getElementById('dashboard-title').textContent = `Diagnóstico de ${clinic.name}`;

  // KPIs
  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><span class="kpi__value">${fmt(totalRevenue)}</span><span class="kpi__label">Facturación mensual</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(totalCosts)}</span><span class="kpi__label">Costos totales</span></div>
    <div class="kpi"><span class="kpi__value" style="color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(netProfit)}</span><span class="kpi__label">Ganancia neta</span></div>
    <div class="kpi"><span class="kpi__value">${netMargin.toFixed(1)}%</span><span class="kpi__label">Margen neto</span></div>
    <div class="kpi"><span class="kpi__value">${occupancy.toFixed(0)}%</span><span class="kpi__label">Ocupación</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(moneyOnTable)}</span><span class="kpi__label">Dinero en la mesa</span></div>
  `;

  // Health
  document.getElementById('health').innerHTML = `
    ${healthItem('Margen neto', netMargin, '%', netMargin > 25 ? 'green' : netMargin > 15 ? 'yellow' : 'red')}
    ${healthItem('Ocupación', occupancy, '%', occupancy > 75 ? 'green' : occupancy > 50 ? 'yellow' : 'red')}
    ${healthItem('Nómina/Facturación', payrollPct, '%', payrollPct < 35 ? 'green' : payrollPct < 45 ? 'yellow' : 'red')}
    ${healthItem('CAC/Ticket', cacPct, '%', cacPct < 15 ? 'green' : cacPct < 25 ? 'yellow' : 'red')}
    ${healthItem('Punto equilibrio', breakeven, '', null, fmt(breakeven))}
  `;

  // Ranking
  const sorted = [...svcs].sort((a, b) => b.score - a.score);
  document.getElementById('ranking-table').innerHTML = `
    <table>
      <thead><tr>
        <th>#</th><th>Servicio</th><th>Ingreso/mes</th><th>Margen %</th><th>$/hora-silla</th><th>Score</th>
      </tr></thead>
      <tbody>${sorted.map((s, i) => `
        <tr>
          <td>${i === 0 ? '<span class="rank-badge">#1 Escalar</span>' : i + 1}</td>
          <td>${s.name}</td>
          <td>${fmt(s.revenue)}</td>
          <td>${s.marginPct.toFixed(1)}%</td>
          <td>${fmt(s.hourlyMargin)}</td>
          <td>${s.score}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;

  // Capacity bar
  const capClass = occupancy < 50 ? 'low' : occupancy < 75 ? 'mid' : 'good';
  document.getElementById('capacity').innerHTML = `
    <div class="capacity__bar">
      <div class="capacity__fill ${capClass}" style="width:${Math.min(occupancy, 100)}%"></div>
      <div class="capacity__mark" style="left:80%">
        <span class="capacity__mark-label">Meta 80%</span>
      </div>
    </div>
    <div class="capacity__labels">
      <span>Actual: ${occupancy.toFixed(0)}% (${usedSlots} citas)</span>
      <span>Capacidad: ${maxSlots} citas/mes</span>
    </div>
  `;

  // Simulation final
  updateSimulation();
  document.getElementById('sim-final').innerHTML = document.getElementById('sim-results')?.innerHTML || '';
}

function healthItem(label, value, unit, color, display) {
  const val = display || value.toFixed(1) + unit;
  const dot = color ? `<span class="health__dot ${color}"></span>` : '<span class="health__dot" style="background:var(--taupe)"></span>';
  return `<div class="health__item">${dot}<span class="health__text">${label}: <span class="health__val">${val}</span></span></div>`;
}

// ---- PDF EXPORT ----
async function exportPDF() {
  const step = document.querySelector('.step[data-step="7"]');
  if (!step || !window.html2canvas || !window.jspdf) return;

  const btn = document.querySelector('.step[data-step="7"] .btn--outline');
  if (btn) btn.textContent = 'Generando...';

  try {
    const canvas = await html2canvas(step, {
      backgroundColor: '#0C0B08', scale: 2, useCORS: true
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px', format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    const clinicName = document.getElementById('clinic-name')?.value || 'clinica';
    pdf.save(`Profit-Compass-${clinicName.replace(/\s+/g, '-')}.pdf`);
  } catch (e) {
    console.error('PDF export failed:', e);
  }
  if (btn) btn.textContent = '📄 Exportar PDF';
}

// ---- UTILS ----
function num(el) {
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}
