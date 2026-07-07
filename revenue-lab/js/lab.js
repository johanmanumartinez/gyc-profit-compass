/* ========================================
   REVENUE LAB — Real-time Simulator
   ======================================== */

function num(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  const v = parseFloat(el.value);
  return isNaN(v) ? 0 : v;
}
function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

function setUnit(btn) {
  const group = btn.closest('.ctrl__unit-toggle');
  group.querySelectorAll('.ctrl__unit-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  calc();
}

function getDuration() {
  const raw = num('svc-duration') || 60;
  const unit = document.querySelector('.ctrl__unit-btn.active')?.dataset.unit || 'min';
  return unit === 'hrs' ? raw * 60 : raw;
}

function calc() {
  // Inputs
  const price = num('svc-price');
  const cost = num('svc-cost');
  const duration = getDuration();
  const professionals = num('professionals') || 1;
  const hoursDay = num('hours-day') || 10;
  const daysWeek = num('days-week') || 6;
  const currentPatients = num('current-patients');
  const adSpend = num('ad-spend');
  const cpl = num('cpl') || 1;
  const bookingRate = num('booking-rate') / 100;
  const showRate = num('show-rate') / 100;
  const closeRate = num('close-rate') / 100;
  const fixedCosts = num('fixed-costs');
  const payroll = num('payroll');
  const svcName = document.getElementById('svc-name')?.value || 'Tu servicio';

  // Capacity
  const capacityHours = professionals * hoursDay * daysWeek * 4.3;
  const maxSlots = Math.floor(capacityHours / (duration / 60));
  const occupancy = maxSlots > 0 ? (currentPatients / maxSlots) * 100 : 0;
  const freeSlots = Math.max(0, maxSlots - currentPatients);

  // Revenue (current)
  const ticket = price;
  const revenue = ticket * currentPatients;
  const directCost = cost * currentPatients;
  const marginPerUnit = ticket - cost;
  const marginPct = ticket > 0 ? (marginPerUnit / ticket) * 100 : 0;

  // Total costs & profit
  const totalCosts = fixedCosts + payroll + directCost + adSpend;
  const netProfit = revenue - totalCosts;
  const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  // Funnel
  const leads = Math.floor(adSpend / cpl);
  const booked = Math.round(leads * bookingRate);
  const showed = Math.round(booked * showRate);
  const closed = Math.round(showed * closeRate);
  const overallConv = leads > 0 ? (closed / leads) * 100 : 0;

  // CAC & ROAS
  const cac = closed > 0 ? adSpend / closed : 0;
  const cacPct = ticket > 0 ? (cac / ticket) * 100 : 0;
  const roas = adSpend > 0 ? (closed * ticket) / adSpend : 0;
  const marginPerAcquired = marginPerUnit - cac;

  // Breakeven
  const grossMarginPct = marginPct / 100;
  const breakeven = grossMarginPct > 0 ? (fixedCosts + payroll) / grossMarginPct : 0;

  // Money on table
  const moneyOnTable = freeSlots * ticket;

  // Payroll %
  const payrollPct = revenue > 0 ? (payroll / revenue) * 100 : 0;

  // LTV (simple: 12 months retention estimate)
  const ltv = ticket * 3;
  const ltvCac = cac > 0 ? ltv / cac : 0;

  // ---- VERDICT ----
  let verdictClass, verdictTitle, verdictSub;
  if (netProfit > 0 && netMargin > 20 && occupancy > 60) {
    verdictClass = 'green';
    verdictTitle = 'Rentable';
    verdictSub = `${svcName} genera ${fmt(netProfit)} de ganancia neta con ${netMargin.toFixed(1)}% de margen.`;
  } else if (netProfit > 0) {
    verdictClass = 'yellow';
    verdictTitle = 'Rentable pero con oportunidad';
    verdictSub = `${svcName} genera ganancia, pero hay espacio para mejorar ${netMargin < 15 ? 'el margen' : 'la ocupación'}.`;
  } else {
    verdictClass = 'red';
    verdictTitle = 'No rentable';
    verdictSub = `${svcName} está operando a pérdida. Los costos superan la facturación en ${fmt(Math.abs(netProfit))}.`;
  }

  document.getElementById('verdict').className = `verdict verdict--${verdictClass}`;
  document.getElementById('verdict').innerHTML = `
    <span class="verdict__title">${verdictTitle}</span>
    <span class="verdict__sub">${verdictSub}</span>
  `;

  // ---- KPIs ----
  document.getElementById('kpis').innerHTML = `
    <div class="kpi"><span class="kpi__value">${fmt(revenue)}</span><span class="kpi__label">Facturación</span><span class="kpi__desc">Ingreso mensual por este servicio</span></div>
    <div class="kpi"><span class="kpi__value ${netProfit >= 0 ? 'green' : 'red'}">${fmt(netProfit)}</span><span class="kpi__label">Ganancia neta</span><span class="kpi__desc">Lo que queda después de todos los costos</span></div>
    <div class="kpi"><span class="kpi__value">${netMargin.toFixed(1)}%</span><span class="kpi__label">Margen neto</span><span class="kpi__desc">Porcentaje de ganancia por cada dólar facturado</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(breakeven)}</span><span class="kpi__label">Punto de equilibrio</span><span class="kpi__desc">Mínimo que debes facturar para no perder dinero</span></div>
    <div class="kpi"><span class="kpi__value ${cacPct > 25 ? 'red' : ''}">${fmt(cac)}</span><span class="kpi__label">CAC</span><span class="kpi__desc">Costo de adquirir cada paciente nuevo</span></div>
    <div class="kpi"><span class="kpi__value ${roas >= 3 ? 'green' : roas < 1.5 ? 'red' : ''}">${roas.toFixed(1)}x</span><span class="kpi__label">ROAS</span><span class="kpi__desc">Por cada $1 en ads, cuánto facturas. Arriba de 3x es rentable</span></div>
    <div class="kpi"><span class="kpi__value">${fmt(moneyOnTable)}</span><span class="kpi__label">Dinero en la mesa</span><span class="kpi__desc">Lo que dejas de ganar por no llenar tu capacidad</span></div>
    <div class="kpi"><span class="kpi__value ${ltvCac >= 3 ? 'green' : ltvCac < 2 ? 'red' : ''}">${ltvCac.toFixed(1)}:1</span><span class="kpi__label">LTV:CAC</span><span class="kpi__desc">Valor del paciente vs lo que costó conseguirlo. Arriba de 3:1 es sano</span></div>
  `;

  // ---- FUNNEL ----
  document.getElementById('funnel').innerHTML = `
    <div class="funnel__step">
      <span class="funnel__num">${fmt(adSpend)}</span>
      <span class="funnel__label">Ad spend</span>
    </div>
    <div class="funnel__step">
      <span class="funnel__num">${leads}</span>
      <span class="funnel__label">Leads</span>
      <span class="funnel__pct">CPL ${fmt(cpl)}</span>
    </div>
    <div class="funnel__step">
      <span class="funnel__num">${booked}</span>
      <span class="funnel__label">Agendan</span>
      <span class="funnel__pct">${(bookingRate * 100).toFixed(0)}%</span>
    </div>
    <div class="funnel__step">
      <span class="funnel__num">${showed}</span>
      <span class="funnel__label">Asisten</span>
      <span class="funnel__pct">${(showRate * 100).toFixed(0)}%</span>
    </div>
    <div class="funnel__step">
      <span class="funnel__num">${closed}</span>
      <span class="funnel__label">Compran</span>
      <span class="funnel__pct">${(closeRate * 100).toFixed(0)}%</span>
    </div>
  `;

  // ---- CAPACITY ----
  const capClass = occupancy < 50 ? 'low' : occupancy < 75 ? 'mid' : 'good';
  document.getElementById('capacity-bar').innerHTML = `
    <div class="cap-bar">
      <div class="cap-fill ${capClass}" style="width:${Math.min(occupancy, 100)}%"></div>
      <div class="cap-mark"><span>Meta 80%</span></div>
    </div>
    <div class="cap-labels">
      <span>${occupancy.toFixed(0)}% ocupado (${currentPatients}/${maxSlots} citas)</span>
      <span>${freeSlots} libres</span>
    </div>
  `;

  // ---- PROJECTIONS ----
  // Current monthly profit + new patients from ads
  const monthlyNewRevenue = closed * ticket;
  const monthlyNewCost = closed * cost;
  const monthlyNetFromAds = monthlyNewRevenue - monthlyNewCost - adSpend;

  const proj3 = netProfit + (monthlyNetFromAds * 3);
  const proj6 = netProfit + (monthlyNetFromAds * 6);
  const proj12 = netProfit + (monthlyNetFromAds * 12);

  const totalPatients3 = currentPatients + (closed * 3);
  const totalPatients6 = currentPatients + (closed * 6);
  const totalPatients12 = currentPatients + (closed * 12);

  document.getElementById('projections').innerHTML = `
    <div class="proj">
      <span class="proj__label">3 meses</span>
      <span class="proj__value" style="color:${proj3 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(proj3)}</span>
      <span class="proj__sub">ganancia acumulada</span>
      <span class="proj__sub">${totalPatients3} pacientes totales</span>
    </div>
    <div class="proj">
      <span class="proj__label">6 meses</span>
      <span class="proj__value" style="color:${proj6 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(proj6)}</span>
      <span class="proj__sub">ganancia acumulada</span>
      <span class="proj__sub">${totalPatients6} pacientes totales</span>
    </div>
    <div class="proj">
      <span class="proj__label">12 meses</span>
      <span class="proj__value" style="color:${proj12 >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(proj12)}</span>
      <span class="proj__sub">ganancia acumulada</span>
      <span class="proj__sub">${totalPatients12} pacientes totales</span>
    </div>
  `;
}

// Init
document.addEventListener('DOMContentLoaded', calc);
