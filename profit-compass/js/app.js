/* ========================================
   PROFIT COMPASS — App Logic (Servicio Estrella)
   ======================================== */

// State
let currentStep = 1;
const totalSteps = 8;
let roles = [];

// ---- BENCHMARKS ----
const BENCHMARKS = {
  'Odontología':            { cpl: 7,  showRate: 70, closeRate: 62 },
  'Estética no quirúrgica': { cpl: 11, showRate: 62, closeRate: 57 },
  'Estética quirúrgica':    { cpl: 16, showRate: 57, closeRate: 47 },
  'Dermatología':           { cpl: 9,  showRate: 67, closeRate: 62 },
  'Oftalmología':           { cpl: 20, showRate: 60, closeRate: 52 },
  'Fisioterapia':           { cpl: 8,  showRate: 65, closeRate: 60 },
  'Cirugía general':        { cpl: 18, showRate: 55, closeRate: 45 },
  'Otro':                   { cpl: 10, showRate: 65, closeRate: 55 }
};

const SPECIALTY_PLACEHOLDERS = {
  'Odontología':            'Ej: Blanqueamiento dental',
  'Estética no quirúrgica': 'Ej: Bótox',
  'Estética quirúrgica':    'Ej: Mommy Makeover',
  'Dermatología':           'Ej: Tratamiento anti-acné',
  'Oftalmología':           'Ej: Cirugía LASIK',
  'Fisioterapia':           'Ej: Sesión de rehabilitación',
  'Cirugía general':        'Ej: Hernia inguinal',
  'Otro':                   'Ej: Nombre de tu procedimiento'
};

function getSpecialty() {
  const checked = document.querySelector('input[name="specialty"]:checked');
  return checked ? checked.value : 'Otro';
}
function getBenchmark() {
  return BENCHMARKS[getSpecialty()] || BENCHMARKS['Otro'];
}

// ---- GATE ----
function enterApp() {
  const gate = document.getElementById('gate');
  if (gate) gate.classList.remove('active');
  document.getElementById('wizard').style.display = 'block';
  updateProgress();
}
// TESTING: auto-enter sin gate
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
    if (n === 7) updateSimulation();
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

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('progress-steps');
  if (!container) return;
  const labels = ['Clínica', 'Servicio', 'Costos', 'Equipo', 'Pacientes', 'IA', 'Simular', 'Diagnóstico'];
  labels.forEach((l, i) => {
    const span = document.createElement('span');
    span.className = 'progress__dot' + (i === 0 ? ' active' : '');
    span.textContent = l;
    container.appendChild(span);
  });

  // Specialty change: update placeholder + show/hide "Otro"
  document.querySelectorAll('input[name="specialty"]').forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById('specialty-other-wrap').style.display =
        r.value === 'Otro' && r.checked ? 'block' : 'none';
      const svcInput = document.getElementById('svc-name');
      if (svcInput) {
        svcInput.placeholder = SPECIALTY_PLACEHOLDERS[r.value] || SPECIALTY_PLACEHOLDERS['Otro'];
      }
    });
  });

  // Ads toggle
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

  // Add first role
  const firstId = Date.now();
  roles.push({ id: firstId });
  appendRoleCard(firstId, 1);

  // Simulation live update
  ['sim-daily-budget', 'sim-cpl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateSimulation);
  });

  // Mobile: scroll input into view when keyboard opens
  document.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('focus', () => {
      setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });

  // Duration unit toggle
  document.querySelectorAll('.field__unit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.field__unit-toggle');
      group.querySelectorAll('.field__unit-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Progress bar CSS
  const style = document.createElement('style');
  style.textContent = `.progress__bar::after { width: var(--pct, 12.5%) !important; }`;
  document.head.appendChild(style);
});

// ---- TICKET TOGGLE ----
function toggleTicket() {
  const wrap = document.getElementById('ticket-wrap');
  const toggle = document.getElementById('svc-ticket-toggle');
  if (wrap) wrap.style.display = toggle && toggle.checked ? 'block' : 'none';
}

// ---- SERVICE DATA ----
function getServiceData() {
  const price = num(document.getElementById('svc-price'));
  const cost = num(document.getElementById('svc-cost'));
  const durationRaw = num(document.getElementById('svc-duration')) || 60;
  const durationUnit = document.querySelector('.field__unit-btn.active')?.dataset.unit || 'min';
  const duration = durationUnit === 'hrs' ? durationRaw * 60 : durationRaw;
  const patients = num(document.getElementById('svc-patients'));
  const professionals = num(document.getElementById('svc-professionals')) || 1;
  const ticketToggle = document.getElementById('svc-ticket-toggle');
  const ticketVal = num(document.getElementById('svc-ticket'));
  const ticket = (ticketToggle && ticketToggle.checked && ticketVal > 0) ? ticketVal : price;
  const name = document.getElementById('svc-name')?.value || 'Tu servicio';
  const recurrent = document.querySelector('input[name="svc-recur"]:checked')?.value === 'yes';

  const revenue = ticket * patients;
  const directCost = cost * patients;
  const margin = revenue - directCost;
  const marginPct = revenue > 0 ? (margin / revenue) * 100 : 0;
  const hourlyRevenue = price / (duration / 60);
  const hourlyMargin = (price - cost) / (duration / 60);
  const slotsUsed = patients * (duration / 60);

  return {
    name, price, cost, duration, patients, professionals, ticket, recurrent,
    revenue, directCost, margin, marginPct, hourlyRevenue, hourlyMargin, slotsUsed
  };
}

// ---- ROLES ----
function addRole() {
  const id = Date.now();
  roles.push({ id });
  appendRoleCard(id, roles.length);
  updateRemoveButtons();
}
function removeRole(id) {
  if (roles.length <= 1) return;
  const card = document.querySelector(`.role-card[data-rid="${id}"]`);
  if (card) card.remove();
  roles = roles.filter(r => r.id !== id);
  // Renumber headers
  document.querySelectorAll('.role-card').forEach((c, i) => {
    c.querySelector('.service-card__num').textContent = 'Rol ' + (i + 1);
  });
  updateRemoveButtons();
  updatePayrollSummary();
}
function updateRemoveButtons() {
  const cards = document.querySelectorAll('.role-card');
  cards.forEach(c => {
    const btn = c.querySelector('.role-card__remove');
    if (roles.length <= 1) {
      if (btn) btn.style.display = 'none';
    } else {
      if (btn) btn.style.display = '';
    }
  });
}
const ROLE_OPTIONS = ['Recepcionista', 'Asistente de procedimientos', 'Doctor / Especialista', 'Enfermera', 'Higienista', 'Community Manager', 'Closer / Ventas', 'Administrador / Gerente', 'Limpieza', 'Contador', 'Otro'];

function selectRole(rid, value) {
  const trigger = document.querySelector(`#role-dropdown-${rid} .custom-select__trigger`);
  const hidden = document.getElementById('role-value-' + rid);
  const wrapper = document.getElementById('role-dropdown-' + rid);
  if (trigger) {
    trigger.textContent = value;
    trigger.classList.remove('placeholder');
  }
  if (hidden) hidden.value = value;
  if (wrapper) wrapper.classList.remove('open');
  // Show/hide other
  const otherWrap = document.getElementById('role-other-' + rid);
  if (otherWrap) otherWrap.style.display = value === 'Otro' ? 'block' : 'none';
  // Mark selected
  wrapper?.querySelectorAll('.custom-select__option').forEach(o => {
    o.classList.toggle('selected', o.textContent === value);
  });
}

function toggleDropdown(rid) {
  const wrapper = document.getElementById('role-dropdown-' + rid);
  if (wrapper) wrapper.classList.toggle('open');
}

// Close dropdowns on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.custom-select')) {
    document.querySelectorAll('.custom-select.open').forEach(d => d.classList.remove('open'));
  }
});

function appendRoleCard(id, index) {
  const list = document.getElementById('payroll-list');
  const card = document.createElement('div');
  card.className = 'role-card';
  card.setAttribute('data-rid', id);
  card.innerHTML = `
      <div class="role-card__header">
        <span class="service-card__num" style="font-size:1rem;">Rol ${index}</span>
        <button class="role-card__remove" onclick="removeRole(${id})" style="${roles.length <= 1 ? 'display:none' : ''}">Eliminar</button>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Cargo</label>
          <div class="custom-select" id="role-dropdown-${id}">
            <input type="hidden" class="role-value" id="role-value-${id}" value="">
            <div class="custom-select__trigger placeholder" onclick="toggleDropdown(${id})">Selecciona un cargo</div>
            <div class="custom-select__options">
              ${ROLE_OPTIONS.map(opt => `<div class="custom-select__option" onclick="selectRole(${id}, '${opt}')">${opt}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="field">
          <label class="field__label">Cantidad</label>
          <input type="number" class="field__input role-qty" min="1" value="1">
        </div>
      </div>
      <div class="field field--conditional role-other-wrap" id="role-other-${id}" style="display:none;">
        <label class="field__label">Especifica el cargo</label>
        <input type="text" class="field__input role-other" placeholder="Ej: Coordinador de quirófano">
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field__label">Costo total por persona/mes</label>
          <div class="field__money"><span class="field__currency">$</span><input type="number" class="field__input role-cost" min="0" value="0" oninput="updatePayrollSummary()"></div>
          <p class="field__desc">Incluye salario, comisiones, cargas sociales y beneficios.</p>
        </div>
      </div>
  `;
  list.appendChild(card);
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
  document.querySelectorAll('[id^="cost-"]').forEach(input => { total += num(input); });
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

// ---- BENCHMARKS FILL ----
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
}
function fillAllAcqBenchmarks() {
  ['leads-month', 'leads-booked', 'leads-showed', 'leads-closed'].forEach(fillBenchmark);
}

// ---- IA / AUTOMATIZACIÓN ----
function getAIData() {
  const fields = ['ai-booking', 'ai-response', 'ai-afterhours', 'ai-followup', 'ai-confirm', 'ai-docs', 'ai-reviews', 'ai-upsell', 'ai-referrals', 'ai-reactivation', 'ai-crm'];
  let score = 0;
  const answers = {};
  fields.forEach(f => {
    const checked = document.querySelector(`input[name="${f}"]:checked`);
    const val = checked ? checked.value : 'no';
    answers[f] = val;
    if (val === 'auto' || val === 'chatbot' || val === 'crm') score += 2;
    else if (val === 'link' || val === 'receptionist' || val === 'message' || val === 'excel' || val === 'templates') score += 1;
  });
  return { score, maxScore: 22, answers };
}

// ---- SIMULATION ----
function updateSimulation() {
  const svc = getServiceData();
  const dailyBudget = num(document.getElementById('sim-daily-budget'));
  const cpl = num(document.getElementById('sim-cpl')) || 1;
  const acq = getAcquisitionData();
  const clinic = getClinicData();

  const monthlySpend = dailyBudget * 30;
  const projectedLeads = Math.floor(monthlySpend / cpl);
  const convRate = acq.leads > 0 ? acq.closed / acq.leads : 0.3;
  const projectedPatients = Math.round(projectedLeads * convRate);
  const projectedRevenue = projectedPatients * svc.ticket;
  const cac = projectedPatients > 0 ? monthlySpend / projectedPatients : 0;
  const roas = monthlySpend > 0 ? projectedRevenue / monthlySpend : 0;
  const marginPerPatient = svc.ticket - svc.cost - cac;

  const capacityHours = svc.professionals * clinic.hoursDay * clinic.daysWeek * 4.3;
  const maxSlots = Math.floor(capacityHours / (svc.duration / 60));
  const freeSlots = Math.max(0, maxSlots - svc.patients);
  const spendToFill = freeSlots > 0 && projectedPatients > 0
    ? Math.round((freeSlots / projectedPatients) * monthlySpend) : 0;

  const container = document.getElementById('sim-results');
  if (!container) return;
  container.innerHTML = `
    <div class="sim-row"><span class="sim-row__label">Gasto mensual en ads<span class="metric-desc">Lo que invertirías en anuncios al mes (presupuesto diario x 30)</span></span><span class="sim-row__value">${fmt(monthlySpend)}</span></div>
    <div class="sim-row"><span class="sim-row__label">Leads proyectados/mes<span class="metric-desc">Personas que contactarían tu clínica gracias a los anuncios</span></span><span class="sim-row__value gold">${projectedLeads}</span></div>
    <div class="sim-row"><span class="sim-row__label">Tasa de conversión<span class="metric-desc">De cada 100 leads, cuántos terminan comprando (basado en tus datos o promedios)</span></span><span class="sim-row__value">${(convRate * 100).toFixed(1)}%</span></div>
    <div class="sim-row"><span class="sim-row__label">Pacientes nuevos/mes<span class="metric-desc">Cuántos pacientes nuevos conseguirías con esta inversión</span></span><span class="sim-row__value gold">${projectedPatients}</span></div>
    <div class="sim-row"><span class="sim-row__label">CAC proyectado<span class="metric-desc">Costo de Adquisición por Cliente — cuánto te cuesta conseguir cada paciente nuevo</span></span><span class="sim-row__value ${cac > svc.ticket * 0.25 ? 'red' : 'green'}">${fmt(cac)}</span></div>
    <div class="sim-row"><span class="sim-row__label">ROAS<span class="metric-desc">Retorno sobre inversión en ads — por cada $1 que inviertes, cuánto facturas. Arriba de 3x es rentable</span></span><span class="sim-row__value ${roas >= 3 ? 'green' : roas >= 1.5 ? '' : 'red'}">${roas.toFixed(1)}x</span></div>
    <div class="sim-row"><span class="sim-row__label">Margen neto por paciente<span class="metric-desc">Lo que realmente te queda de ganancia por cada paciente nuevo, descontando costos y lo que pagaste para conseguirlo</span></span><span class="sim-row__value ${marginPerPatient > 0 ? 'green' : 'red'}">${fmt(marginPerPatient)}</span></div>
    <div class="sim-row"><span class="sim-row__label">Capacidad libre<span class="metric-desc">Cuántas citas más puedes atender al mes sin contratar ni ampliar</span></span><span class="sim-row__value">${freeSlots} citas/mes</span></div>
    <div class="sim-row"><span class="sim-row__label">Ad spend para llenar capacidad<span class="metric-desc">Cuánto necesitarías invertir en ads para llenar todas las citas disponibles</span></span><span class="sim-row__value gold">${fmt(spendToFill)}/mes</span></div>
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
  const svc = getServiceData();
  const fixedCosts = getFixedCosts();
  const payroll = getPayrollTotal();
  const acq = getAcquisitionData();
  const ai = getAIData();

  const totalRevenue = svc.revenue;
  const totalCosts = fixedCosts + payroll + svc.directCost + acq.adSpend;
  const netProfit = totalRevenue - totalCosts;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const grossMarginPct = svc.marginPct;
  const breakeven = grossMarginPct > 0 ? (fixedCosts + payroll) / (grossMarginPct / 100) : 0;

  const capacityHours = svc.professionals * clinic.hoursDay * clinic.daysWeek * 4.3;
  const maxSlots = Math.floor(capacityHours / (svc.duration / 60));
  const occupancy = maxSlots > 0 ? (svc.patients / maxSlots) * 100 : 0;
  const freeSlots = Math.max(0, maxSlots - svc.patients);
  const moneyOnTable = freeSlots * svc.ticket;

  const totalAcqCost = acq.adSpend + num(document.getElementById('cost-marketing'));
  const cac = acq.closed > 0 ? totalAcqCost / acq.closed : 0;
  const payrollPct = totalRevenue > 0 ? (payroll / totalRevenue) * 100 : 0;
  const cacPct = svc.ticket > 0 ? (cac / svc.ticket) * 100 : 0;

  document.getElementById('dashboard-title').textContent = `Diagnóstico de ${clinic.name}`;

  // KPIs
  const marginText = netMargin > 25
    ? `Tu margen es saludable. De cada $100 que facturas con ${svc.name}, te quedan $${netMargin.toFixed(0)} limpios.`
    : netMargin > 15
    ? `Tu margen está por debajo del ideal (25%+). De cada $100 que facturas, solo te quedan $${netMargin.toFixed(0)}.`
    : netMargin > 0
    ? `Tu margen es bajo. De cada $100, solo te quedan $${netMargin.toFixed(0)}. Tus costos se están comiendo la rentabilidad.`
    : `Estás operando a pérdida. Tus costos superan lo que facturas con este servicio.`;

  const occText = occupancy > 75
    ? `${svc.name} opera a buena capacidad (${occupancy.toFixed(0)}%). Estás aprovechando bien a tus profesionales.`
    : occupancy > 50
    ? `Tienes ${(100 - occupancy).toFixed(0)}% de capacidad sin usar. Son ${freeSlots} citas más que podrías atender cada mes.`
    : `Solo usas ${occupancy.toFixed(0)}% de la capacidad. Tienes espacio para ${freeSlots} citas más sin contratar ni ampliar.`;

  const tableText = moneyOnTable > 0
    ? `Dejas aproximadamente ${fmt(moneyOnTable)} en la mesa cada mes por no llenar la capacidad de ${svc.name}.`
    : `Tu servicio estrella está operando cerca de su capacidad.`;

  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><span class="kpi__value">${fmt(totalRevenue)}</span><span class="kpi__label">Facturación mensual</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(totalCosts)}</span><span class="kpi__label">Costos totales</span></div>
    <div class="kpi"><span class="kpi__value" style="color:${netProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(netProfit)}</span><span class="kpi__label">Ganancia neta</span></div>
    <div class="kpi"><span class="kpi__value">${netMargin.toFixed(1)}%</span><span class="kpi__label">Margen neto</span></div>
    <div class="kpi"><span class="kpi__value">${occupancy.toFixed(0)}%</span><span class="kpi__label">Ocupación</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(moneyOnTable)}</span><span class="kpi__label">Dinero en la mesa</span></div>
  `;
  document.getElementById('kpis-insight').innerHTML = `
    <div class="insight-card"><p class="insight-card__text">${marginText}</p></div>
    <div class="insight-card"><p class="insight-card__text">${occText}</p></div>
    <div class="insight-card"><p class="insight-card__text">${tableText}</p></div>
  `;

  // Health
  const payrollText = payrollPct < 35 ? 'Tu nómina está en rango saludable.'
    : payrollPct < 45 ? `Tu nómina es el ${payrollPct.toFixed(0)}% de tu facturación. Ideal: menos del 35%.`
    : `Tu nómina se come el ${payrollPct.toFixed(0)}% de lo que facturas. Revisa roles o factura más.`;
  const cacText = cacPct > 0
    ? (cacPct < 15 ? `CAC eficiente: ${cacPct.toFixed(0)}% del ticket.`
      : `CAC de ${fmt(cac)} por paciente (${cacPct.toFixed(0)}% del ticket). Ideal: menos del 15%.`)
    : 'Sin datos de adquisición para calcular CAC.';

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
    <div class="insight-card"><p class="insight-card__text">Punto de equilibrio: ${fmt(breakeven)}/mes. Por debajo, pierdes dinero.</p></div>
  `;

  // Star service detail
  document.getElementById('star-service-detail').innerHTML = `
    <div class="sim-results">
      <div class="sim-row"><span class="sim-row__label">Servicio</span><span class="sim-row__value gold">${svc.name}</span></div>
      <div class="sim-row"><span class="sim-row__label">Precio de lista<span class="metric-desc">Lo que cobras oficialmente por este procedimiento</span></span><span class="sim-row__value">${fmt(svc.price)}</span></div>
      ${svc.ticket !== svc.price ? `<div class="sim-row"><span class="sim-row__label">Ticket real<span class="metric-desc">Lo que realmente cobras en promedio después de descuentos o upsells</span></span><span class="sim-row__value">${fmt(svc.ticket)}</span></div>` : ''}
      <div class="sim-row"><span class="sim-row__label">Costo directo<span class="metric-desc">Lo que gastas en materiales e insumos cada vez que haces este procedimiento</span></span><span class="sim-row__value">${fmt(svc.cost)}</span></div>
      <div class="sim-row"><span class="sim-row__label">Margen bruto<span class="metric-desc">Lo que te queda después de descontar materiales — cuanto más alto, más rentable es el servicio</span></span><span class="sim-row__value ${svc.marginPct > 50 ? 'green' : svc.marginPct > 30 ? '' : 'red'}">${fmt(svc.ticket - svc.cost)} (${svc.marginPct.toFixed(1)}%)</span></div>
      <div class="sim-row"><span class="sim-row__label">Margen por hora-silla<span class="metric-desc">Cuánto ganas por cada hora que un profesional dedica a este servicio</span></span><span class="sim-row__value">${fmt(svc.hourlyMargin)}/hr</span></div>
      <div class="sim-row"><span class="sim-row__label">Pacientes actuales<span class="metric-desc">Cuántos pacientes atiendes actualmente por mes con este servicio</span></span><span class="sim-row__value">${svc.patients}/mes</span></div>
      <div class="sim-row"><span class="sim-row__label">Profesionales<span class="metric-desc">Personas en tu clínica que pueden realizar este procedimiento</span></span><span class="sim-row__value">${svc.professionals}</span></div>
      <div class="sim-row"><span class="sim-row__label">Capacidad máxima<span class="metric-desc">El máximo de citas que podrías atender por mes con tu equipo actual</span></span><span class="sim-row__value">${maxSlots} citas/mes</span></div>
      <div class="sim-row"><span class="sim-row__label">Citas libres<span class="metric-desc">Espacios disponibles que podrías estar llenando con pacientes nuevos</span></span><span class="sim-row__value gold">${freeSlots}</span></div>
    </div>
  `;

  // Capacity bar
  const capClass = occupancy < 50 ? 'low' : occupancy < 75 ? 'mid' : 'good';
  document.getElementById('capacity').innerHTML = `
    <div class="capacity__bar">
      <div class="capacity__fill ${capClass}" style="width:${Math.min(occupancy, 100)}%"></div>
      <div class="capacity__mark" style="left:80%"><span class="capacity__mark-label">Meta 80%</span></div>
    </div>
    <div class="capacity__labels">
      <span>Actual: ${occupancy.toFixed(0)}% (${svc.patients} citas)</span>
      <span>Capacidad: ${maxSlots} citas/mes</span>
    </div>
  `;

  // IA
  const aiPct = Math.round((ai.score / ai.maxScore) * 100);
  const aiClass = aiPct >= 67 ? 'good' : aiPct >= 33 ? 'mid' : 'low';
  const aiTexts = [];
  if (ai.answers['ai-booking'] === 'manual') aiTexts.push('Agendamiento manual — pierdes leads que no quieren llamar o que contactan fuera de horario.');
  if (ai.answers['ai-response'] === 'doctor') aiTexts.push('El doctor responde leads — mientras atiende, los leads esperan o se pierden.');
  if (ai.answers['ai-afterhours'] === 'nobody') aiTexts.push('Sin respuesta fuera de horario — esos leads contactan a otra clínica antes de que abras.');
  if (ai.answers['ai-followup'] === 'no') aiTexts.push('Sin seguimiento a leads no agendados — la mayoría necesitan 3-5 contactos antes de decidirse.');
  if (ai.answers['ai-confirm'] !== 'auto') aiTexts.push('Confirmación manual — consume tiempo del equipo y genera más no-shows.');
  if (ai.answers['ai-docs'] === 'manual') aiTexts.push('Consentimientos y archivos se envían manualmente — toma tiempo y a veces se olvida.');
  if (ai.answers['ai-reviews'] === 'no') aiTexts.push('No solicitas reseñas — pierdes posicionamiento en Google y dejas que solo los insatisfechos opinen.');
  if (ai.answers['ai-upsell'] === 'no') aiTexts.push('Sin seguimiento post-compra — dejas dinero en la mesa con pacientes que ya confían en ti.');
  if (ai.answers['ai-referrals'] === 'no') aiTexts.push('Sin sistema de referidos — dependes de que el boca a boca ocurra solo.');
  if (ai.answers['ai-reactivation'] === 'no') aiTexts.push('Sin reactivación — pierdes pacientes silenciosamente y conseguir uno nuevo cuesta 5x más.');
  if (ai.answers['ai-crm'] === 'no') aiTexts.push('Sin CRM — si alguien del equipo falta, la información de pacientes se pierde.');

  document.getElementById('ai-diagnosis').innerHTML = `
    <div class="capacity__bar"><div class="capacity__fill ${aiClass}" style="width:${aiPct}%"></div></div>
    <div class="capacity__labels">
      <span>Nivel: ${ai.score}/${ai.maxScore}</span>
      <span>${aiPct >= 67 ? 'Avanzado' : aiPct >= 33 ? 'Básico' : 'Sin automatizar'}</span>
    </div>
    ${aiTexts.length > 0 ? `<div class="insights" style="margin-top:16px;">${aiTexts.map(t => `<div class="insight-card"><p class="insight-card__text">${t}</p></div>`).join('')}</div>` : '<div class="insight-card" style="margin-top:16px;"><p class="insight-card__text">Buen nivel de automatización.</p></div>'}
  `;

  // Problema #1
  const problems = [];
  if (netMargin < 25) problems.push({ severity: 3 - netMargin / 10, key: 'margin', title: 'Margen bajo', text: `Tu margen neto es ${netMargin.toFixed(1)}%. Un ajuste de pricing en ${svc.name} mejoraría tu rentabilidad sin agendar más.`, cta: `Mi margen neto es ${netMargin.toFixed(1)}% y quiero mejorarlo` });
  if (occupancy < 75) problems.push({ severity: 3 - occupancy / 30, key: 'occupancy', title: 'Capacidad desperdiciada', text: `${svc.name} opera al ${occupancy.toFixed(0)}%. Tienes ${freeSlots} citas libres — ${fmt(moneyOnTable)} que dejas en la mesa. Un funnel dedicado llenaría esos espacios.`, cta: `Tengo ${freeSlots} citas libres en ${svc.name} y quiero llenarlas` });
  if (payrollPct > 40) problems.push({ severity: payrollPct / 15 - 2, key: 'payroll', title: 'Nómina alta', text: `Tu nómina es el ${payrollPct.toFixed(0)}% de tu facturación (ideal: <35%). Factura más o revisa roles.`, cta: `Mi nómina se come el ${payrollPct.toFixed(0)}% de mi facturación` });
  if (cacPct > 20) problems.push({ severity: cacPct / 10, key: 'cac', title: 'Adquisición cara', text: `CAC de ${fmt(cac)} por paciente (${cacPct.toFixed(0)}% del ticket). Optimizar tu funnel lo reduciría.`, cta: `Mi CAC es ${fmt(cac)} por paciente y quiero reducirlo` });
  if (ai.score < 10) problems.push({ severity: 2.5 - ai.score / 6, key: 'automation', title: 'Sin automatización', text: `Tu nivel de automatización es ${ai.score} de ${ai.maxScore}. Tu clínica opera de forma manual en la mayoría de procesos — pierdes leads, no haces seguimiento, no reactivas. La automatización es la palanca más rápida para crecer.`, cta: `Mi nivel de automatización es ${ai.score}/${ai.maxScore} y quiero mejorarlo` });

  problems.sort((a, b) => b.severity - a.severity);
  const topProblems = problems.slice(0, 3);

  document.getElementById('top-problem').innerHTML = topProblems.length > 0 ? topProblems.map((p, i) => `
    <div class="problem-box" ${i > 0 ? 'style="margin-top:12px;"' : ''}>
      <span class="problem-box__tag">Área de mejora #${i + 1}</span>
      <h3 class="problem-box__title">${p.title}</h3>
      <p class="problem-box__text">${p.text}</p>
    </div>
  `).join('') : `
    <div class="problem-box problem-box--good">
      <span class="problem-box__tag">Buenas noticias</span>
      <h3 class="problem-box__title">Tu clínica está en buen camino</h3>
      <p class="problem-box__text">Tus números son sólidos. El siguiente paso es escalar ${svc.name} con un sistema predecible.</p>
    </div>
  `;

  // CTA
  const topProblem = topProblems[0] || null;
  const ctaParts = topProblems.map(p => p.cta).join('. ');
  const ctaMsg = topProblem
    ? encodeURIComponent(`Hola Johan, acabo de usar el Profit Compass. ${ctaParts}. Me gustaría hablar sobre mi clínica.`)
    : encodeURIComponent(`Hola Johan, acabo de usar el Profit Compass y quiero escalar ${svc.name} en mi clínica.`);
  const problemsList = topProblems.map(p => `<strong>${p.title.toLowerCase()}</strong>`).join(', ');
  document.getElementById('cta-dynamic').innerHTML = `
    <p class="cta-box__text">${topProblem ? `Tus áreas principales de mejora: ${problemsList}. Un experto puede ayudarte con un plan concreto para ${svc.name}.` : `¿Quieres un plan para escalar ${svc.name} con un sistema predecible de adquisición?`}</p>
    <a href="https://wa.me/584141932869?text=${ctaMsg}" class="btn btn--gold btn--lg" target="_blank" rel="noopener">${topProblem ? 'Hablar con Johan sobre cómo resolver esto' : 'Hablar con Johan sobre cómo escalar'}</a>
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
    const canvas = await html2canvas(step, { backgroundColor: '#0C0B08', scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new window.jspdf.jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px', format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    const name = document.getElementById('clinic-name')?.value || 'clinica';
    pdf.save(`Profit-Compass-${name.replace(/\s+/g, '-')}.pdf`);
  } catch (e) { console.error('PDF export failed:', e); }
  if (btn) btn.textContent = 'Exportar PDF';
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
