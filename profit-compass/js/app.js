/* ========================================
   PROFIT COMPASS — App Logic
   ======================================== */

// State
let currentStep = 1;
const totalSteps = 8;
let services = [];
let roles = [];

// ---- BENCHMARKS POR ESPECIALIDAD ----
const BENCHMARKS = {
  'Odontología':              { cpl: 7,  showRate: 70, closeRate: 62 },
  'Estética no quirúrgica':   { cpl: 11, showRate: 62, closeRate: 57 },
  'Estética quirúrgica':      { cpl: 16, showRate: 57, closeRate: 47 },
  'Dermatología':             { cpl: 9,  showRate: 67, closeRate: 62 },
  'Oftalmología':             { cpl: 20, showRate: 60, closeRate: 52 },
  'Fisioterapia':             { cpl: 8,  showRate: 65, closeRate: 60 },
  'Cirugía general':          { cpl: 18, showRate: 55, closeRate: 45 },
  'Otro':                     { cpl: 10, showRate: 65, closeRate: 55 }
};

function getSpecialty() {
  const checked = document.querySelector('input[name="specialty"]:checked');
  return checked ? checked.value : 'Otro';
}

function getBenchmark() {
  return BENCHMARKS[getSpecialty()] || BENCHMARKS['Otro'];
}

function fillBenchmark(fieldId) {
  const b = getBenchmark();
  const el = document.getElementById(fieldId);
  if (!el) return;
  const map = {
    'sim-cpl': b.cpl,
    'leads-month': 100,
    'leads-booked': Math.round(100 * 0.6),
    'leads-showed': Math.round(100 * 0.6 * (b.showRate / 100)),
    'leads-closed': Math.round(100 * 0.6 * (b.showRate / 100) * (b.closeRate / 100))
  };
  if (map[fieldId] !== undefined) {
    el.value = map[fieldId];
    el.dispatchEvent(new Event('input'));
  }
  // Ocultar el botón después de usar
  const btn = document.querySelector(`.btn-idk[data-field="${fieldId}"]`);
  if (btn) btn.style.display = 'none';
}

function fillAllAcqBenchmarks() {
  ['leads-month', 'leads-booked', 'leads-showed', 'leads-closed'].forEach(fillBenchmark);
}

// ---- GATE ----
function enterApp() {
  const gate = document.getElementById('gate');
  if (gate) gate.classList.remove('active');
  document.getElementById('wizard').style.display = 'block';
  updateProgress();
}

// TESTING: auto-enter sin gate (volver a comentar cuando se active el formulario GHL)
document.addEventListener('DOMContentLoaded', enterApp);

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

    if (n === 7) populateScaleSelect();
    if (n === 8) renderDashboard();
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
  const labels = ['Clínica', 'Servicios', 'Costos', 'Equipo', 'Pacientes', 'IA', 'Simular', 'Diagnóstico'];
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
  style.textContent = `.progress__bar::after { width: var(--pct, 12.5%) !important; }`;
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
          <p class="field__desc">Materiales, insumos, laboratorio y descartables por cada procedimiento. No incluyas salarios ni alquiler.</p>
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
      <div class="field">
        <label class="field__label">¿Es recurrente?</label>
        <div class="field__radios" style="flex-direction:row;gap:12px;">
          <label class="radio" style="flex:1;"><input type="radio" name="recur-${s.id}" value="yes"><span>Sí</span></label>
          <label class="radio" style="flex:1;"><input type="radio" name="recur-${s.id}" value="no" checked><span>No</span></label>
        </div>
      </div>
      <div class="field">
        <label class="field__toggle">
          <input type="checkbox" class="svc-ticket-toggle" data-sid="${s.id}" onchange="toggleTicket(${s.id})">
          <span>El precio real difiere del precio de lista</span>
        </label>
        <p class="field__desc">Activa esto si sueles dar descuentos o hacer upsells. Pon lo que realmente cobras en promedio. Si no, usaremos el precio de lista.</p>
        <div class="field__ticket-wrap" id="ticket-wrap-${s.id}" style="display:none;">
          <label class="field__label">Ticket real promedio</label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input svc-ticket" min="0" value="0"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleTicket(sid) {
  const wrap = document.getElementById('ticket-wrap-' + sid);
  const toggle = document.querySelector(`.svc-ticket-toggle[data-sid="${sid}"]`);
  if (wrap) wrap.style.display = toggle && toggle.checked ? 'block' : 'none';
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
          <select class="field__select role-select" onchange="toggleRoleOther(this, ${r.id})">
            <option value="">Selecciona un cargo</option>
            <option value="Recepcionista">Recepcionista</option>
            <option value="Asistente dental/médico">Asistente dental/médico</option>
            <option value="Doctor / Especialista">Doctor / Especialista</option>
            <option value="Enfermera">Enfermera</option>
            <option value="Higienista">Higienista</option>
            <option value="Community Manager">Community Manager</option>
            <option value="Closer / Ventas">Closer / Ventas</option>
            <option value="Administrador / Gerente">Administrador / Gerente</option>
            <option value="Limpieza">Limpieza</option>
            <option value="Contador">Contador</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="field">
          <label class="field__label">Cantidad</label>
          <input type="number" class="field__input role-qty" min="1" value="1">
        </div>
      </div>
      <div class="field field--conditional role-other-wrap" id="role-other-${r.id}" style="display:none;">
        <label class="field__label">Especifica el cargo</label>
        <input type="text" class="field__input role-other" placeholder="Ej: Coordinador de quirófano">
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Costo total por persona/mes
            <span class="tooltip" data-tip="Salario + comisiones + cargas sociales + beneficios. Todo incluido.">?</span>
          </label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input role-cost" min="0" value="0" oninput="updatePayrollSummary()"></div>
          <p class="field__desc">Incluye salario, comisiones, cargas sociales y beneficios. Todo lo que te cuesta esa persona al mes.</p>
        </div>
      </div>
    </div>
  `).join('');
}

function toggleRoleOther(select, rid) {
  const wrap = document.getElementById('role-other-' + rid);
  if (wrap) wrap.style.display = select.value === 'Otro' ? 'block' : 'none';
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

// ---- IA / AUTOMATIZACIÓN ----
function getAIData() {
  const fields = ['ai-booking', 'ai-response', 'ai-followup', 'ai-confirm', 'ai-reactivation', 'ai-crm'];
  const scoreMap = {
    // Agendamiento
    'manual': 0, 'link': 1, 'auto': 2,
    // Respuesta
    'doctor': 0, 'receptionist': 1, 'chatbot': 2, 'nobody': 0,
    // Follow-up
    'no': 0, 'manual': 0, 'auto': 2,
    // Confirmación
    'call': 0, 'message': 1,
    // Reactivación (same as follow-up)
    // CRM
    'excel': 1, 'crm': 2
  };

  let score = 0;
  const answers = {};
  fields.forEach(f => {
    const checked = document.querySelector(`input[name="${f}"]:checked`);
    const val = checked ? checked.value : 'no';
    answers[f] = val;
    if (val === 'auto' || val === 'chatbot' || val === 'crm') score += 2;
    else if (val === 'link' || val === 'receptionist' || val === 'message' || val === 'excel') score += 1;
  });

  return { score, maxScore: 12, answers };
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

  // KPIs con texto interpretativo
  const marginText = netMargin > 25
    ? `Tu margen es saludable. De cada $100 que facturas, te quedan $${netMargin.toFixed(0)} limpios.`
    : netMargin > 15
    ? `Tu margen está por debajo del ideal (25%+). De cada $100 que facturas, solo te quedan $${netMargin.toFixed(0)}. Un ajuste de pricing o reducción de costos directos podría mejorar esto.`
    : `Tu margen es bajo. De cada $100 que facturas, solo te quedan $${netMargin.toFixed(0)}. Esto indica que tus costos se están comiendo la rentabilidad.`;

  const occText = occupancy > 75
    ? `Tu clínica opera a buena capacidad. Estás aprovechando bien tu infraestructura.`
    : occupancy > 50
    ? `Tienes un ${(100 - occupancy).toFixed(0)}% de tu capacidad sin usar. Eso son ${maxSlots - usedSlots} citas que podrías estar atendiendo cada mes.`
    : `Solo estás usando la mitad o menos de tu capacidad. Tienes espacio para ${maxSlots - usedSlots} citas más al mes sin contratar ni ampliar.`;

  const tableText = moneyOnTable > 0
    ? `Estás dejando aproximadamente ${fmt(moneyOnTable)} en la mesa cada mes por no llenar tu capacidad al 80%.`
    : `Tu clínica está operando cerca de su capacidad óptima.`;

  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><span class="kpi__value">${fmt(totalRevenue)}</span><span class="kpi__label">Facturación mensual</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(totalCosts)}</span><span class="kpi__label">Costos totales</span></div>
    <div class="kpi"><span class="kpi__value" style="color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(netProfit)}</span><span class="kpi__label">Ganancia neta</span></div>
    <div class="kpi"><span class="kpi__value">${netMargin.toFixed(1)}%</span><span class="kpi__label">Margen neto</span></div>
    <div class="kpi"><span class="kpi__value">${occupancy.toFixed(0)}%</span><span class="kpi__label">Ocupación</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(moneyOnTable)}</span><span class="kpi__label">Dinero en la mesa</span></div>
  `;

  // Texto interpretativo debajo de KPIs
  document.getElementById('kpis-insight').innerHTML = `
    <div class="insight-card">
      <p class="insight-card__text">${marginText}</p>
    </div>
    <div class="insight-card">
      <p class="insight-card__text">${occText}</p>
    </div>
    <div class="insight-card">
      <p class="insight-card__text">${tableText}</p>
    </div>
  `;

  // Health
  const payrollText = payrollPct < 35
    ? 'Tu nómina está en rango saludable respecto a lo que facturas.'
    : payrollPct < 45
    ? `Tu nómina representa el ${payrollPct.toFixed(0)}% de tu facturación. Lo ideal es estar por debajo del 35%.`
    : `Tu nómina se come el ${payrollPct.toFixed(0)}% de lo que facturas. Esto es alto — revisa si puedes optimizar roles o si necesitas facturar más para sostener tu equipo.`;

  const cacText = cacPct > 0
    ? (cacPct < 15
      ? `Tu costo de adquisición es eficiente: ${cacPct.toFixed(0)}% del ticket promedio.`
      : `Te cuesta ${fmt(cac)} adquirir cada paciente, eso es el ${cacPct.toFixed(0)}% de tu ticket. Lo ideal es estar por debajo del 15%.`)
    : 'No tienes datos de adquisición para calcular tu CAC.';

  document.getElementById('health').innerHTML = `
    ${healthItem('Margen neto', netMargin, '%', netMargin > 25 ? 'green' : netMargin > 15 ? 'yellow' : 'red')}
    ${healthItem('Ocupación', occupancy, '%', occupancy > 75 ? 'green' : occupancy > 50 ? 'yellow' : 'red')}
    ${healthItem('Nómina/Facturación', payrollPct, '%', payrollPct < 35 ? 'green' : payrollPct < 45 ? 'yellow' : 'red')}
    ${healthItem('CAC/Ticket', cacPct, '%', cacPct < 15 ? 'green' : cacPct < 25 ? 'yellow' : 'red')}
    ${healthItem('Punto equilibrio', breakeven, '', null, fmt(breakeven))}
  `;

  document.getElementById('health-insight').innerHTML = `
    <div class="insight-card"><p class="insight-card__text">${payrollText}</p></div>
    <div class="insight-card"><p class="insight-card__text">${cacText}</p></div>
    <div class="insight-card"><p class="insight-card__text">Tu punto de equilibrio es ${fmt(breakeven)}/mes. Por debajo de eso, pierdes dinero.</p></div>
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

  // IA / Automatización
  const ai = getAIData();
  const aiPct = Math.round((ai.score / ai.maxScore) * 100);
  const aiClass = aiPct >= 67 ? 'good' : aiPct >= 33 ? 'mid' : 'low';
  const aiTexts = [];
  if (ai.answers['ai-booking'] === 'manual') aiTexts.push('Tus pacientes agendan de forma manual — estás perdiendo leads que contactan fuera de horario o que no quieren llamar.');
  if (ai.answers['ai-response'] === 'nobody' || ai.answers['ai-response'] === 'doctor') aiTexts.push('No tienes respuesta automática a leads. Estudios muestran que si no respondes en los primeros 5 minutos, pierdes hasta el 80% de los leads.');
  if (ai.answers['ai-followup'] === 'no') aiTexts.push('No haces seguimiento a leads que no agendaron. La mayoría de pacientes necesitan 3-5 contactos antes de decidirse.');
  if (ai.answers['ai-confirm'] !== 'auto') aiTexts.push('La confirmación manual de citas consume tiempo de tu equipo y tiene tasas de no-show más altas.');
  if (ai.answers['ai-reactivation'] === 'no') aiTexts.push('No contactas pacientes inactivos. Reactivar un paciente existente cuesta 5x menos que adquirir uno nuevo.');
  if (ai.answers['ai-crm'] === 'no') aiTexts.push('Sin un CRM, no tienes visibilidad de tu pipeline ni de cuántos leads se pierden en el camino.');

  document.getElementById('ai-diagnosis').innerHTML = `
    <div class="capacity__bar">
      <div class="capacity__fill ${aiClass}" style="width:${aiPct}%"></div>
    </div>
    <div class="capacity__labels">
      <span>Nivel de automatización: ${ai.score}/${ai.maxScore}</span>
      <span>${aiPct >= 67 ? 'Avanzado' : aiPct >= 33 ? 'Básico' : 'Sin automatizar'}</span>
    </div>
    ${aiTexts.length > 0 ? `<div class="insights" style="margin-top:16px;">${aiTexts.map(t => `<div class="insight-card"><p class="insight-card__text">${t}</p></div>`).join('')}</div>` : '<div class="insight-card" style="margin-top:16px;"><p class="insight-card__text">Tu clínica tiene un buen nivel de automatización. Estás aprovechando la tecnología.</p></div>'}
  `;

  // Problema #1
  const problems = [];
  if (netMargin < 25) problems.push({ severity: 3 - netMargin / 10, key: 'margin', title: 'Margen bajo', text: `Tu margen neto es ${netMargin.toFixed(1)}%. Estás trabajando mucho para ganar poco. Con un ajuste de pricing en tu servicio estrella podrías mejorar tu rentabilidad sin agendar más pacientes.`, cta: `Mi margen neto es de ${netMargin.toFixed(1)}% y quiero mejorarlo` });
  if (occupancy < 75) problems.push({ severity: 3 - occupancy / 30, key: 'occupancy', title: 'Capacidad desperdiciada', text: `Tu clínica opera al ${occupancy.toFixed(0)}% de su capacidad. Tienes ${maxSlots - usedSlots} citas libres al mes — eso son ${fmt(moneyOnTable)} que dejas en la mesa. Con un sistema de adquisición podrías llenar esos espacios.`, cta: `Tengo ${(100 - occupancy).toFixed(0)}% de capacidad libre y quiero llenarla` });
  if (payrollPct > 40) problems.push({ severity: payrollPct / 15 - 2, key: 'payroll', title: 'Nómina alta', text: `Tu nómina representa el ${payrollPct.toFixed(0)}% de tu facturación (ideal: menos del 35%). O necesitas facturar más para justificar tu equipo, o revisar si puedes optimizar roles.`, cta: `Mi nómina se come el ${payrollPct.toFixed(0)}% de mi facturación` });
  if (cacPct > 20) problems.push({ severity: cacPct / 10, key: 'cac', title: 'Adquisición cara', text: `Te cuesta ${fmt(cac)} adquirir cada paciente (${cacPct.toFixed(0)}% de tu ticket). Optimizar tu funnel de ventas y tasas de conversión podría reducir esto significativamente.`, cta: `Mi CAC es muy alto (${fmt(cac)} por paciente) y quiero reducirlo` });
  if (ai.score < 5) problems.push({ severity: 2.5 - ai.score / 3, key: 'automation', title: 'Sin automatización', text: `Tu clínica opera casi completamente de forma manual. Estás perdiendo leads por no responder rápido, no hacer seguimiento, y no reactivar pacientes. La automatización es la palanca más rápida para crecer sin contratar más gente.`, cta: `No tengo automatización y quiero implementarla` });

  problems.sort((a, b) => b.severity - a.severity);
  const topProblem = problems[0] || null;

  document.getElementById('top-problem').innerHTML = topProblem ? `
    <div class="problem-box">
      <span class="problem-box__tag">Tu área #1 de mejora</span>
      <h3 class="problem-box__title">${topProblem.title}</h3>
      <p class="problem-box__text">${topProblem.text}</p>
    </div>
  ` : `
    <div class="problem-box problem-box--good">
      <span class="problem-box__tag">Buenas noticias</span>
      <h3 class="problem-box__title">Tu clínica está en buen camino</h3>
      <p class="problem-box__text">Tus números son sólidos. El siguiente paso es escalar lo que ya funciona con un sistema predecible de adquisición y retención.</p>
    </div>
  `;

  // CTA dinámico
  const ctaMessage = topProblem
    ? encodeURIComponent(`Hola Johan, acabo de usar el Profit Compass. ${topProblem.cta}. Me gustaría hablar sobre cómo mejorar los resultados de mi clínica.`)
    : encodeURIComponent('Hola Johan, acabo de usar el Profit Compass y me gustaría hablar sobre cómo escalar mi clínica.');
  const ctaText = topProblem
    ? `Hablar con Johan sobre cómo resolver esto`
    : `Hablar con Johan sobre cómo escalar`;
  document.getElementById('cta-dynamic').innerHTML = `
    <p class="cta-box__text">${topProblem ? `Tu problema principal es claro: <strong>${topProblem.title.toLowerCase()}</strong>. Un experto puede ayudarte a resolverlo con un plan concreto.` : '¿Quieres un plan personalizado para escalar tu servicio más rentable con un sistema predecible?'}</p>
    <a href="https://wa.me/584141932869?text=${ctaMessage}" class="btn btn--gold btn--lg" target="_blank" rel="noopener">${ctaText}</a>
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
  const step = document.querySelector('.step[data-step="8"]');
  if (!step || !window.html2canvas || !window.jspdf) return;

  const btn = document.querySelector('.step[data-step="8"] .btn--outline');
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
