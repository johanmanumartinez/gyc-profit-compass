/* ========================================
   DIAGNÓSTICO EXPRESS — GYC Engine v3
   ======================================== */

// ---- CONFIG: Links de Johan (editar aquí) ----
const SOCIAL = {
  whatsapp: 'https://wa.me/584141932869',
  instagram: 'https://instagram.com/johanmartinez.med',
  tiktok: 'https://tiktok.com/@johanmartinez.med', // TODO: poner perfil real
  linkedin: 'https://linkedin.com/in/johanmanumartinez', // TODO: poner perfil real
};

let currentStep = 1;
const totalSteps = 6;

function nextStep() {
  if (currentStep >= totalSteps) return;
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
  currentStep++;
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function prevStep() {
  if (currentStep <= 1) return;
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.remove('active');
  currentStep--;
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- Conditional toggles ---
function setupToggle(radioName, targetId, showValues) {
  document.querySelectorAll(`input[name="${radioName}"]`).forEach(r => {
    r.addEventListener('change', () => {
      document.getElementById(targetId).style.display =
        showValues.includes(r.value) && r.checked ? 'block' : 'none';
    });
  });
}

// Specialty "Otro" toggle (checkbox version)
document.querySelectorAll('input[name="specialty"]').forEach(cb => {
  cb.addEventListener('change', () => {
    const otroChecked = document.querySelector('input[name="specialty"][value="Otro"]')?.checked;
    document.getElementById('specialty-other-wrap').style.display = otroChecked ? 'block' : 'none';
  });
});

setupToggle('knows-cac', 'cac-amount-wrap', ['si']);
setupToggle('knows-star', 'star-service-wrap', ['si', 'creo']);
setupToggle('retention', 'retention-detail-wrap', ['si', 'manual']);
setupToggle('crosssell', 'crosssell-detail-wrap', ['si', 'aveces']);
setupToggle('social', 'social-detail-wrap', ['activas', 'abandonada']);
setupToggle('invests-ads', 'ads-detail-wrap', ['si', 'antes']);
setupToggle('uses-ai', 'ai-detail-wrap', ['si']);

// --- Data helpers ---
function extractNumber(id) {
  const raw = document.getElementById(id)?.value?.trim() || '';
  const match = raw.match(/[\d]+\.?[\d]*/);
  return match ? parseFloat(match[0]) : 0;
}

function getData() {
  const val = (id) => document.getElementById(id)?.value?.trim() || '';
  const radio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const checks = (name) => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(c => c.value);

  const specialties = checks('specialty');
  let specialtyText = specialties.filter(s => s !== 'Otro').join(', ');
  if (specialties.includes('Otro') && val('specialty-other')) {
    specialtyText += (specialtyText ? ', ' : '') + val('specialty-other');
  }

  return {
    clinicName: val('clinic-name') || 'Clínica',
    ownerName: val('owner-name'),
    specialty: specialtyText || 'No especificada',
    newPatientsRaw: val('new-patients'),
    newPatients: extractNumber('new-patients'),
    sources: checks('source'),
    knowsCac: radio('knows-cac'),
    cacAmountRaw: val('cac-amount'),
    cacAmount: extractNumber('cac-amount'),
    investsAds: radio('invests-ads'),
    adsWho: radio('ads-who'),
    adsStrategy: radio('ads-strategy'),
    adsContext: val('ads-context'),
    capacityWeekRaw: val('capacity-week'),
    capacityWeek: extractNumber('capacity-week'),
    actualWeekRaw: val('actual-week'),
    actualWeek: extractNumber('actual-week'),
    whoResponds: radio('who-responds'),
    responseTime: radio('response-time'),
    knowsStar: radio('knows-star'),
    starName: val('star-service-name'),
    starPrice: extractNumber('star-service-price'),
    starMargin: extractNumber('star-service-margin'),
    starVolume: extractNumber('star-service-volume'),
    retention: radio('retention'),
    retentionDetail: val('retention-detail'),
    crosssell: radio('crosssell'),
    crosssellDetail: val('crosssell-detail'),
    reviews: radio('reviews'),
    social: radio('social'),
    contentTypes: checks('content-type'),
    contentFreq: radio('content-freq'),
    socialWho: radio('social-who'),
    socialStrategy: radio('social-strategy'),
    socialContext: val('social-context'),
    face: radio('face'),
    website: radio('website'),
    patientSystem: radio('patient-system'),
    manualProcesses: val('manual-processes'),
    usesAi: radio('uses-ai'),
    aiDetail: val('ai-detail'),
  };
}

// --- Scoring engine v3 ---
function score(data) {
  const findings = [];
  const breakdowns = { captacion: [], operacion: [], rentabilidad: [], digital: [] };
  let captacion = 0, operacion = 0, rentabilidad = 0, digital = 0;

  const doesAds = data.investsAds === 'si';
  const didAds = data.investsAds === 'antes';
  const neverAds = data.investsAds === 'no';
  const onlyBocaBoca = data.sources.length === 1 && data.sources[0] === 'boca-a-boca';
  const noActiveSources = data.sources.length === 0;

  // ============ CAPTACIÓN (max 25) ============

  let ptsPatients = 0, patientsLabel = '';
  if (data.newPatients >= 60) { ptsPatients = 7; patientsLabel = 'Alto volumen'; }
  else if (data.newPatients >= 30) { ptsPatients = 5; patientsLabel = 'Volumen medio'; }
  else if (data.newPatients >= 10) { ptsPatients = 3; patientsLabel = 'Volumen bajo'; }
  else { ptsPatients = 1; patientsLabel = 'Muy bajo'; }
  captacion += ptsPatients;
  breakdowns.captacion.push({
    label: 'Pacientes nuevos/mes',
    detail: data.newPatientsRaw || '?',
    pts: ptsPatients, max: 7, verdict: patientsLabel,
    explanation: 'Cuántos pacientes nuevos llegan cada mes a la clínica. Más de 60 es un flujo saludable; menos de 10 indica que se necesitan más canales para atraer pacientes de forma constante.'
  });

  let ptsSources = 0, sourcesLabel = '';
  if (data.sources.length >= 3) { ptsSources = 6; sourcesLabel = 'Diversificado'; }
  else if (data.sources.length === 2) { ptsSources = 4; sourcesLabel = '2 fuentes'; }
  else if (data.sources.length === 1) { ptsSources = 2; sourcesLabel = '1 sola fuente'; }
  else { ptsSources = 0; sourcesLabel = 'Sin dato'; }
  captacion += ptsSources;
  breakdowns.captacion.push({
    label: 'Fuentes de captación',
    detail: `${data.sources.length} fuente(s)`,
    pts: ptsSources, max: 6, verdict: sourcesLabel,
    explanation: 'De cuántos lugares diferentes llegan los pacientes. Depender de una sola fuente es riesgoso — si esa fuente falla, no hay plan B. Lo ideal es tener al menos 3 canales activos.'
  });

  if (onlyBocaBoca) {
    findings.push({ type: 'red', title: 'Dependencia total de referidos', priority: 2,
      desc: 'La clínica depende de una sola fuente de pacientes que no controla. Si los referidos bajan un mes, no hay plan B. Cada paciente que llega es por suerte, no por sistema.' });
  } else if (noActiveSources) {
    findings.push({ type: 'red', title: 'Sin fuentes de captación identificadas', priority: 1,
      desc: 'No se identificó de dónde vienen los pacientes. Sin esta claridad es imposible invertir con inteligencia o crecer de forma predecible.' });
  }

  let ptsCac = 0;
  if (data.knowsCac === 'si') {
    if (neverAds && onlyBocaBoca) {
      ptsCac = 3;
      breakdowns.captacion.push({
        label: 'Costo de adquisición (CAC)',
        detail: data.cacAmountRaw ? `$${data.cacAmountRaw}` : 'Reportado',
        pts: ptsCac, max: 6, verdict: 'Dato cuestionable',
        explanation: 'El costo de adquisición mide cuánto cuesta conseguir cada paciente nuevo. Se reporta conocerlo, pero si todos los pacientes llegan por boca a boca y no se invierte en publicidad, este dato necesita revisarse.'
      });
      findings.push({ type: 'yellow', title: 'El CAC reportado no cuadra con las fuentes', priority: 5,
        desc: 'Dicen conocer su costo de adquisición, pero solo tienen pacientes por boca a boca y nunca han invertido en publicidad. Si todos llegan por referidos, el CAC real es $0 o no se puede medir. Este dato necesita revisarse antes de tomar decisiones.' });
    } else {
      ptsCac = 6;
      breakdowns.captacion.push({
        label: 'Costo de adquisición (CAC)',
        detail: data.cacAmountRaw ? `$${data.cacAmountRaw}` : '',
        pts: ptsCac, max: 6, verdict: data.cacAmount > 0 ? `$${data.cacAmount}` : 'Controlado',
        explanation: 'Cuánto dinero cuesta conseguir cada paciente nuevo. Conocer este número permite saber si la inversión en captación es rentable o si se está perdiendo dinero con cada paciente que entra.'
      });
    }
  } else {
    ptsCac = 0;
    breakdowns.captacion.push({
      label: 'Costo de adquisición (CAC)',
      detail: '', pts: ptsCac, max: 6, verdict: 'No lo miden',
      explanation: 'El CAC es cuánto cuesta conseguir un paciente nuevo. Sin este número, cualquier inversión en publicidad o captación se hace sin saber si está generando ganancia o pérdida.'
    });
    if (doesAds || didAds) {
      findings.push({ type: 'red', title: 'Invierten en captación sin medir el costo', priority: 1,
        desc: 'Han invertido en publicidad pero no saben cuánto cuesta cada paciente nuevo. Toda inversión en captación sin este número es a ciegas. Es lo primero que hay que calcular.' });
    } else {
      findings.push({ type: 'yellow', title: 'No conocen su costo de adquisición', priority: 6,
        desc: 'Hoy no es urgente porque no invierten en publicidad, pero cuando empiecen a invertir, este será el primer número que necesitan medir para saber si cada paciente nuevo genera ganancia o pérdida.' });
    }
  }
  captacion += ptsCac;

  let ptsAds = 0, adsLabel = '';
  if (doesAds) {
    // Profundizar: ¿hay estrategia detrás?
    if (data.adsStrategy === 'si') { ptsAds = 6; adsLabel = 'Activa con estrategia'; }
    else if (data.adsStrategy === 'masomenos') {
      ptsAds = 4; adsLabel = 'Activa sin estrategia clara';
      findings.push({ type: 'yellow', title: 'Publicidad activa pero sin estrategia clara', priority: 4,
        desc: 'Están invirtiendo en publicidad pero sin métricas ni estrategia definida. Eso significa que probablemente están pagando más de lo necesario por cada paciente y no saben qué funciona y qué no.' });
    } else {
      ptsAds = 3; adsLabel = 'Activa sin estrategia';
      findings.push({ type: 'red', title: 'Invierten en publicidad sin ninguna estrategia', priority: 2,
        desc: 'Están gastando dinero en anuncios sin un plan claro ni métricas de seguimiento. Cada peso invertido sin estrategia es un peso que probablemente se está desperdiciando. Primero hay que definir objetivos y métricas antes de seguir invirtiendo.' });
    }
    // Quién la gestiona
    if (data.adsWho === 'nosotros') {
      findings.push({ type: 'yellow', title: 'La publicidad la gestionan internamente', priority: 6,
        desc: 'No está mal, pero requiere tiempo y conocimiento técnico que evoluciona constantemente. Si no están viendo resultados claros, vale la pena evaluar ayuda especializada.' });
    }
  } else if (didAds) {
    ptsAds = 3; adsLabel = 'Abandonada';
    findings.push({ type: 'yellow', title: 'Dejaron la publicidad', priority: 5,
      desc: 'Probablemente no funcionó porque no había claridad de métricas ni un sistema que convirtiera esos leads en citas. Con números claros y un proceso detrás, la publicidad deja de ser un gasto y empieza a ser una inversión medible.' });
    if (data.adsWho === 'nosotros') {
      findings.push({ type: 'yellow', title: 'La publicidad la manejaban internamente', priority: 7,
        desc: 'Cuando la publicidad la maneja alguien sin experiencia específica, es normal que no funcione. Eso no significa que la publicidad no sirva — significa que faltó expertise.' });
    }
  } else {
    ptsAds = 1; adsLabel = 'Nunca';
    findings.push({ type: 'yellow', title: 'Sin publicidad activa', priority: 6,
      desc: 'La clínica depende de que los pacientes la encuentren solos. No se necesita un gran presupuesto — se necesita estrategia y medición para empezar a generar pacientes de forma predecible.' });
  }
  captacion += ptsAds;
  breakdowns.captacion.push({
    label: 'Publicidad', detail: '', pts: ptsAds, max: 6, verdict: adsLabel,
    explanation: 'Si la clínica invierte en publicidad pagada (Meta Ads, Google Ads, etc.) con una estrategia definida y métricas claras, o si simplemente gasta sin saber qué funciona.'
  });

  // ============ OPERACIÓN (max 25) ============

  let occupancy = 0;
  if (data.capacityWeek > 0 && data.actualWeek > 0) {
    occupancy = Math.min(Math.round((data.actualWeek / data.capacityWeek) * 100), 100);
    let ptsOcc = 0, occLabel = '';
    if (occupancy >= 80) { ptsOcc = 10; occLabel = occupancy + '% — Buena'; }
    else if (occupancy >= 60) { ptsOcc = 6; occLabel = occupancy + '% — Mejorable'; }
    else if (occupancy >= 40) { ptsOcc = 3; occLabel = occupancy + '% — Baja'; }
    else { ptsOcc = 1; occLabel = occupancy + '% — Crítica'; }
    operacion += ptsOcc;
    breakdowns.operacion.push({
      label: 'Ocupación semanal',
      detail: `${data.actualWeek}/${data.capacityWeek} citas`,
      pts: ptsOcc, max: 10, verdict: occLabel,
      explanation: `La clínica puede atender ${data.capacityWeek} citas por semana pero está llenando ${data.actualWeek}. ${occupancy >= 80 ? 'La ocupación es buena — el foco debe estar en maximizar el valor de cada paciente.' : 'Hay espacio para crecer sin necesidad de contratar más personal ni ampliar horario.'}`
    });

    if (occupancy < 80) {
      const slotsLost = data.capacityWeek - data.actualWeek;
      const slotsMonth = slotsLost * 4;
      let moneyMsg = '';
      if (data.starPrice > 0) {
        const lostMoney = slotsMonth * data.starPrice;
        moneyMsg = ` Si cada cita vacía pudiera llenarse con su servicio estrella ($${data.starPrice}), eso representaría hasta $${lostMoney.toLocaleString()} al mes en facturación potencial.`;
      }
      findings.push({ type: occupancy < 50 ? 'red' : 'yellow', priority: 2,
        title: `${slotsLost} citas vacías cada semana (~${slotsMonth}/mes)`,
        desc: `La clínica tiene capacidad para ${data.capacityWeek} citas/semana y está llenando ${data.actualWeek}. Hay espacio para crecer sin contratar más personal ni ampliar horario.${moneyMsg}` });
    }
  }

  // Tiempo de respuesta (granular)
  let ptsResp = 0, respLabel = '';
  switch (data.responseTime) {
    case '3min': ptsResp = 8; respLabel = '< 3 minutos'; break;
    case '3-10': ptsResp = 7; respLabel = '3-10 minutos'; break;
    case '10-30':
      ptsResp = 5; respLabel = '10-30 minutos';
      findings.push({ type: 'yellow', title: 'Tiempo de respuesta: 10-30 minutos', priority: 4,
        desc: 'No es malo, pero cada minuto cuenta. Los pacientes que reciben respuesta en menos de 5 minutos tienen el doble de probabilidad de agendar. Un sistema de respuesta inmediata marca la diferencia.' });
      break;
    case '30-60':
      ptsResp = 3; respLabel = '30 min - 1 hora';
      findings.push({ type: 'yellow', title: 'Tiempo de respuesta: 30 min a 1 hora', priority: 3,
        desc: 'Cada minuto que pasa sin responder, la probabilidad de que ese paciente agende baja drásticamente. Un sistema de respuesta rápida puede duplicar la conversión sin gastar un peso más en captación.' });
      break;
    case '1-2h':
      ptsResp = 2; respLabel = '1-2 horas';
      findings.push({ type: 'red', title: 'Tiempo de respuesta: 1-2 horas', priority: 2,
        desc: 'Los pacientes que escriben y esperan más de una hora probablemente ya contactaron a otra clínica. Este es uno de los puntos donde más pacientes se pierden hoy.' });
      break;
    case 'mas2h':
      ptsResp = 1; respLabel = '> 2 horas';
      findings.push({ type: 'red', title: 'Respuesta demasiado lenta', priority: 1,
        desc: 'Más de 2 horas de espera significa que la mayoría de pacientes que escriben nunca van a agendar. Responden con quien les conteste primero. No es culpa del equipo — es falta de sistema.' });
      break;
    case 'irregular':
      ptsResp = 1; respLabel = 'Irregular';
      findings.push({ type: 'red', title: 'Respuesta irregular — a veces no se responde', priority: 1,
        desc: 'Lo peor no es ser lento — es ser inconsistente. Un paciente que escribe y nunca recibe respuesta no solo no agenda: se lleva una mala impresión de la clínica.' });
      break;
    default: ptsResp = 0; respLabel = 'Sin dato';
  }
  operacion += ptsResp;
  breakdowns.operacion.push({
    label: 'Tiempo de respuesta',
    detail: '', pts: ptsResp, max: 8, verdict: respLabel,
    explanation: 'Cuánto tarda la clínica en responder cuando un paciente escribe por WhatsApp o llama. Responder en menos de 5 minutos duplica la probabilidad de que ese paciente agende. Después de 30 minutos, la probabilidad cae dramáticamente.'
  });

  // Quién responde
  let ptsWho = 0, whoLabel = '';
  if (data.whoResponds === 'ia') { ptsWho = 7; whoLabel = 'Automatizado'; }
  else if (data.whoResponds === 'hibrido') { ptsWho = 7; whoLabel = 'Híbrido (IA + persona)'; }
  else if (data.whoResponds === 'recepcion') { ptsWho = 7; whoLabel = 'Recepción'; }
  else if (data.whoResponds === 'ambos') { ptsWho = 5; whoLabel = 'Variable'; }
  else if (data.whoResponds === 'dueno') {
    ptsWho = 3; whoLabel = 'El dueño';
    findings.push({ type: 'yellow', title: 'El dueño responde mensajes directamente', priority: 4,
      desc: 'Eso no escala. Cada minuto que el profesional pasa respondiendo WhatsApp es un minuto que no está atendiendo pacientes ni tomando decisiones estratégicas. Delegar con un proceso claro libera tiempo y mejora la atención.' });
  } else {
    ptsWho = 1; whoLabel = 'Sin proceso';
    findings.push({ type: 'red', title: 'Sin proceso de atención definido', priority: 2,
      desc: 'No hay claridad sobre quién responde, en cuánto tiempo ni con qué mensaje. Los leads se pierden entre conversaciones. Montar un proceso simple multiplica la conversión sin gastar más.' });
  }
  operacion += ptsWho;
  breakdowns.operacion.push({
    label: 'Quién responde',
    detail: '', pts: ptsWho, max: 7, verdict: whoLabel,
    explanation: 'Quién se encarga de responder los mensajes y llamadas de pacientes potenciales. Lo ideal es tener a alguien dedicado (recepción, asistente o sistema automatizado) para que el profesional pueda enfocarse en atender.'
  });

  // ============ RENTABILIDAD (max 25) ============

  let ptsStar = 0, starLabel = '';
  if (data.knowsStar === 'si') { ptsStar = 7; starLabel = 'Identificado'; }
  else if (data.knowsStar === 'creo') {
    ptsStar = 4; starLabel = 'Sin certeza';
    findings.push({ type: 'yellow', title: '"Creemos saber" cuál es el servicio más rentable', priority: 3,
      desc: 'Sin un análisis de márgenes concreto, es probable que estén empujando el servicio equivocado. Un cálculo rápido de precio, costo y volumen por servicio revela dónde está el dinero real.' });
  } else {
    ptsStar = 0; starLabel = 'Desconocido';
    findings.push({ type: 'red', title: 'No saben cuál servicio es más rentable', priority: 1,
      desc: 'Sin esta claridad, toda decisión de inversión se toma a ciegas. Es lo primero que se debe resolver — saber dónde está la ganancia real antes de invertir un peso en captación.' });
  }
  rentabilidad += ptsStar;
  breakdowns.rentabilidad.push({
    label: 'Servicio estrella', detail: '', pts: ptsStar, max: 7, verdict: starLabel,
    explanation: 'Si la clínica sabe cuál de todos sus servicios deja más ganancia neta (no solo facturación, sino ganancia real después de costos). Este servicio debería ser el centro de la estrategia de captación y publicidad.'
  });

  if ((data.knowsStar === 'si' || data.knowsStar === 'creo') && data.starPrice > 0 && data.starMargin > 0) {
    const profit = data.starPrice * (data.starMargin / 100);
    if (data.cacAmount > 0 && doesAds) {
      if (data.cacAmount >= profit) {
        findings.push({ type: 'red', title: 'El CAC supera la ganancia del servicio estrella', priority: 1,
          desc: `Están pagando $${data.cacAmount} por paciente nuevo, pero el servicio estrella deja $${profit.toFixed(0)} de ganancia. Cada paciente que entra por publicidad genera pérdida neta en la primera visita.` });
      } else if (data.cacAmount > profit * 0.5) {
        findings.push({ type: 'yellow', title: 'El CAC consume más de la mitad de la ganancia', priority: 4,
          desc: `Pagan $${data.cacAmount} por paciente y el servicio estrella deja $${profit.toFixed(0)}. El margen es ajustado. La rentabilidad depende de que ese paciente vuelva o compre otros servicios.` });
      }
    }
  }

  let ptsRet = 0, retLabel = '';
  if (data.retention === 'si') { ptsRet = 7; retLabel = 'Sistematizado'; }
  else if (data.retention === 'manual') {
    ptsRet = 3; retLabel = 'Manual';
    findings.push({ type: 'yellow', title: 'Retención manual o intermitente', priority: 4,
      desc: 'Los pacientes que ya vinieron son el activo más valioso. Reactivar uno existente cuesta 5 veces menos que conseguir uno nuevo. Un sistema simple de recordatorios genera ingresos inmediatos.' });
  } else {
    ptsRet = 0; retLabel = 'Inexistente';
    if (occupancy >= 70) {
      findings.push({ type: 'red', title: 'Buena ocupación pero sin retención — peligro silencioso', priority: 2,
        desc: 'La clínica está relativamente llena, pero no tiene sistema para que los pacientes vuelvan. Necesita conseguir pacientes nuevos constantemente solo para mantener el nivel actual.' });
    } else {
      findings.push({ type: 'red', title: 'Sin sistema de retención', priority: 2,
        desc: 'La clínica invierte esfuerzo en conseguir pacientes nuevos, pero no hace nada para que los existentes vuelvan. Cada paciente que no regresa es una venta perdida que ya estaba ganada.' });
    }
  }
  rentabilidad += ptsRet;
  breakdowns.rentabilidad.push({
    label: 'Retención de pacientes', detail: '', pts: ptsRet, max: 7, verdict: retLabel,
    explanation: 'Si la clínica tiene un sistema para que los pacientes que ya vinieron vuelvan (recordatorios, seguimiento, controles). Retener cuesta 5 veces menos que conseguir un paciente nuevo desde cero.'
  });

  let ptsCross = 0, crossLabel = '';
  if (data.crosssell === 'si') { ptsCross = 5; crossLabel = 'Activo'; }
  else if (data.crosssell === 'aveces') { ptsCross = 3; crossLabel = 'Ocasional'; }
  else {
    ptsCross = 0; crossLabel = 'No se hace';
    findings.push({ type: 'yellow', title: 'Sin cross-sell activo', priority: 5,
      desc: 'El paciente que viene por un servicio es candidato natural para otros. Ofrecer de forma activa puede aumentar el ticket promedio sin necesidad de conseguir un solo paciente más.' });
  }
  rentabilidad += ptsCross;
  breakdowns.rentabilidad.push({
    label: 'Cross-sell / upsell', detail: '', pts: ptsCross, max: 5, verdict: crossLabel,
    explanation: 'Si la clínica ofrece activamente servicios adicionales a los pacientes que ya están siendo atendidos. Por ejemplo: un paciente que viene por limpieza dental es candidato para blanqueamiento.'
  });

  let ptsRev = 0, revLabel = '';
  if (data.reviews === 'si') { ptsRev = 6; revLabel = 'Con proceso'; }
  else if (data.reviews === 'aveces') { ptsRev = 3; revLabel = 'Sin proceso'; }
  else {
    ptsRev = 1; revLabel = 'No se piden';
    findings.push({ type: 'yellow', title: 'No piden reseñas a pacientes satisfechos', priority: 6,
      desc: 'Cada paciente contento que se va sin dejar una reseña es un vendedor gratuito que se pierde. Un mensaje de WhatsApp después de la cita pidiendo la reseña cambia todo — y es gratis.' });
  }
  rentabilidad += ptsRev;
  breakdowns.rentabilidad.push({
    label: 'Reseñas / recomendaciones', detail: '', pts: ptsRev, max: 6, verdict: revLabel,
    explanation: 'Si la clínica tiene un proceso para pedir reseñas o recomendaciones a los pacientes satisfechos. Las reseñas generan confianza y atraen nuevos pacientes sin costo.'
  });

  // ============ DIGITAL (max 25) ============

  let ptsSocial = 0, socialLabel = '';
  if (data.social === 'activas') {
    // Profundizar: ¿hay estrategia detrás?
    if (data.socialStrategy === 'si') { ptsSocial = 9; socialLabel = 'Activas con estrategia'; }
    else if (data.socialStrategy === 'masomenos') {
      ptsSocial = 6; socialLabel = 'Activas sin estrategia clara';
      findings.push({ type: 'yellow', title: 'Publican en redes pero sin estrategia definida', priority: 4,
        desc: 'Publicar por publicar no genera resultados predecibles. Sin un calendario, pilares de contenido y objetivos claros, el esfuerzo se diluye. La diferencia entre "estar en redes" y "usar las redes para crecer" es la estrategia.' });
    } else {
      ptsSocial = 4; socialLabel = 'Activas sin plan';
      findings.push({ type: 'yellow', title: 'Publican en redes sin ningún plan', priority: 3,
        desc: 'Están dedicando tiempo a las redes pero sin dirección. Eso genera frustración porque no se ven resultados. Un plan simple — qué publicar, cuándo y para quién — cambia todo.' });
    }
    // Quién gestiona
    if (data.socialWho === 'familiar') {
      findings.push({ type: 'yellow', title: 'Las redes las maneja un familiar o conocido', priority: 5,
        desc: 'Es un inicio, pero sin conocimiento de marketing ni de la clínica, el contenido probablemente no conecta con los pacientes potenciales. Vale la pena profesionalizar este proceso.' });
    } else if (data.socialWho === 'dueno') {
      findings.push({ type: 'yellow', title: 'El dueño maneja las redes personalmente', priority: 6,
        desc: 'Buena señal que el profesional esté involucrado, pero manejar todo solo no escala. Idealmente el profesional genera el contenido (videos, opiniones) y alguien más se encarga de la publicación y gestión.' });
    }
  } else if (data.social === 'abandonada') {
    ptsSocial = 4; socialLabel = 'Poco activas';
    findings.push({ type: 'yellow', title: 'Redes sociales con poca actividad', priority: 5,
      desc: 'Una cuenta inactiva puede generar más desconfianza que no tener cuenta. Los pacientes revisan las redes antes de decidir.' });
    if (data.socialWho) {
      const whoMap = { dueno: 'el dueño', empleado: 'un empleado', cm: 'un community manager', agencia: 'una agencia', familiar: 'un familiar' };
      findings.push({ type: 'yellow', title: `Las redes las gestiona ${whoMap[data.socialWho] || 'alguien'} pero publican poco`, priority: 6,
        desc: 'Tener a alguien asignado pero publicar poco indica que falta proceso, contenido o prioridad. Definir un mínimo viable (ej: 3 publicaciones por semana) con calendario ayuda a crear consistencia.' });
    }
  } else {
    ptsSocial = 1; socialLabel = 'No tienen';
    findings.push({ type: 'red', title: 'Sin presencia en redes sociales', priority: 3,
      desc: 'Los pacientes buscan en redes antes de agendar. No estar presente es dejar la puerta abierta para que la competencia se posicione primero.' });
  }
  digital += ptsSocial;
  breakdowns.digital.push({
    label: 'Redes sociales', detail: '', pts: ptsSocial, max: 9, verdict: socialLabel,
    explanation: 'No solo si la clínica tiene redes activas, sino si hay una estrategia detrás. Publicar sin plan es mejor que no publicar, pero publicar con estrategia es lo que realmente genera pacientes.'
  });

  let ptsFace = 0, faceLabel = '';
  if (data.face === 'si') { ptsFace = 8; faceLabel = 'Visible'; }
  else if (data.face === 'poco') {
    ptsFace = 4; faceLabel = 'Poca presencia';
    findings.push({ type: 'yellow', title: 'El profesional aparece poco en el contenido', priority: 5,
      desc: 'Las redes son de personas. La clínica con la cara del profesional visible conecta mucho más que la que solo muestra procedimientos.' });
  } else {
    ptsFace = 1; faceLabel = 'No aparece';
    findings.push({ type: 'red', title: 'El profesional no da la cara en contenido', priority: 3,
      desc: 'En salud, la confianza lo es todo. La confianza se construye con la cara, la voz y el criterio del profesional — no con fotos de la clínica.' });
  }
  digital += ptsFace;
  breakdowns.digital.push({
    label: 'Cara del profesional', detail: '', pts: ptsFace, max: 8, verdict: faceLabel,
    explanation: 'Si el dueño o profesional principal aparece en el contenido de redes. En salud, los pacientes quieren ver y conocer a quien los va a atender antes de decidir. La cara del profesional genera confianza.'
  });

  let ptsWeb = 0, webLabel = '';
  if (data.website === 'si') { ptsWeb = 8; webLabel = 'Actualizada'; }
  else if (data.website === 'vieja') {
    ptsWeb = 4; webLabel = 'Desactualizada';
    findings.push({ type: 'yellow', title: 'Página web desactualizada', priority: 7,
      desc: 'Una web desactualizada resta credibilidad. Necesita ser clara: servicios, formas de contacto directas y la cara del profesional.' });
  } else { ptsWeb = 2; webLabel = 'No tienen'; }
  digital += ptsWeb;
  breakdowns.digital.push({
    label: 'Página web', detail: '', pts: ptsWeb, max: 8, verdict: webLabel,
    explanation: 'Si la clínica tiene una página web actualizada con información clara de servicios y formas de contacto. No necesita ser compleja, pero sí profesional.'
  });

  // ============ AUTOMATIZACIÓN (reflejado en hallazgos + narrativa) ============

  const autoFindings = [];

  if (data.patientSystem === 'nada') {
    autoFindings.push({ type: 'red', title: 'Sin ningún sistema de gestión', priority: 3,
      desc: 'La clínica opera sin sistema alguno para gestionar pacientes. Todo depende de la memoria o la improvisación. Un sistema simple de agenda + historial evita errores, reduce tiempo administrativo y profesionaliza la operación.' });
  } else if (data.patientSystem === 'papel') {
    autoFindings.push({ type: 'yellow', title: 'Gestión en papel — oportunidad de digitalización', priority: 5,
      desc: 'Llevar todo en papel o cuaderno funciona hasta cierto punto, pero limita la capacidad de crecer. Un sistema digital simple (incluso gratuito) permite tener historial de pacientes, recordatorios automáticos y mejor seguimiento.' });
  } else if (data.patientSystem === 'excel') {
    autoFindings.push({ type: 'yellow', title: 'Gestión con Excel — escalable pero limitado', priority: 6,
      desc: 'Excel es un buen primer paso, pero no fue diseñado para gestionar pacientes. Un CRM simple o software especializado permite automatizar recordatorios, seguimiento y tener una vista completa de cada paciente.' });
  }

  if (data.manualProcesses) {
    autoFindings.push({ type: 'yellow', title: 'Procesos manuales que consumen tiempo', priority: 4,
      desc: `El equipo reporta procesos repetitivos que podrían simplificarse o automatizarse. Esto libera tiempo para lo que realmente genera ingresos: atender pacientes y generar valor.` });
  }

  if (data.usesAi === 'no') {
    autoFindings.push({ type: 'yellow', title: 'Sin herramientas de IA o automatización', priority: 5,
      desc: 'Hoy existen herramientas accesibles que pueden responder mensajes automáticamente, generar contenido, programar citas y hacer seguimiento — sin necesidad de conocimiento técnico. La clínica que las adopte primero tendrá ventaja.' });
  } else if (data.usesAi === 'si') {
    // Cruce: usa IA pero tiempo de respuesta sigue lento
    if (['30-60', '1-2h', 'mas2h', 'irregular'].includes(data.responseTime)) {
      autoFindings.push({ type: 'yellow', title: 'Usan IA pero la respuesta sigue lenta', priority: 3,
        desc: 'La clínica reporta usar herramientas de IA, pero el tiempo de respuesta sigue siendo alto. Esto puede indicar que la automatización no está bien configurada o no cubre los canales principales de contacto.' });
    }
  }

  // Agregar automation findings al array principal
  findings.push(...autoFindings);

  const total = captacion + operacion + rentabilidad + digital;

  // Ordenar findings: rojos primero, luego amarillos, por prioridad
  findings.sort((a, b) => {
    if (a.type === 'red' && b.type !== 'red') return -1;
    if (a.type !== 'red' && b.type === 'red') return 1;
    return (a.priority || 99) - (b.priority || 99);
  });

  return { captacion, operacion, rentabilidad, digital, total, findings, breakdowns, occupancy };
}

// --- Narrative ---
function generateNarrative(data, result) {
  const areas = [
    { name: 'captación', score: result.captacion },
    { name: 'operación', score: result.operacion },
    { name: 'rentabilidad', score: result.rentabilidad },
    { name: 'presencia digital', score: result.digital }
  ].sort((a, b) => a.score - b.score);

  const weakest = areas[0];
  const strongest = areas[3];
  const redCount = result.findings.filter(f => f.type === 'red').length;
  const name = data.clinicName;

  let text = '';

  if (result.total >= 70) {
    text = `${name} tiene bases sólidas. Su punto más fuerte es ${strongest.name} y la mayor oportunidad de mejora está en ${weakest.name}. `;
    if (redCount > 0) {
      text += `Aún hay ${redCount} punto(s) crítico(s) que, si se resuelven, pueden generar un salto importante. `;
    } else {
      text += `No hay puntos críticos — el foco debería estar en optimizar lo que ya funciona. `;
    }
  } else if (result.total >= 45) {
    text = `${name} tiene potencial claro pero le falta estructura. ${strongest.name.charAt(0).toUpperCase() + strongest.name.slice(1)} es el área más fuerte, mientras que ${weakest.name} necesita atención prioritaria. `;
    text += `Hay ${redCount} punto(s) crítico(s) que están costando dinero hoy. La buena noticia: son corregibles y el impacto se ve rápido.`;
  } else {
    text = `${name} está operando muy por debajo de su potencial. El área que más urge atender es ${weakest.name} (${weakest.score}/25). `;
    text += redCount >= 3
      ? `Hay ${redCount} problemas críticos acumulados. No se pueden resolver todos a la vez, pero empezar por los 2-3 más importantes genera tracción inmediata.`
      : `Los problemas identificados son corregibles. Con acciones concretas en las próximas semanas, la clínica puede verse en una posición muy diferente.`;
  }

  // Cruces contextuales
  if (result.occupancy > 0 && result.occupancy >= 80 && result.rentabilidad < 12) {
    text += ` Dato importante: la clínica está llena pero la rentabilidad es baja — eso sugiere que se están llenando con los servicios equivocados o no se está maximizando cada paciente.`;
  }
  if (result.occupancy > 0 && result.occupancy < 50 && result.captacion >= 15) {
    text += ` La captación es razonable pero la ocupación está baja — puede haber un problema de conversión: los pacientes llegan pero no agendan.`;
  }

  // Contexto de automatización
  if (data.patientSystem === 'nada' && data.usesAi === 'no') {
    text += ` Además, la clínica opera sin herramientas digitales ni automatización — hay una oportunidad grande de profesionalizar la operación con tecnología accesible.`;
  }

  return text;
}

// --- Priorities ---
function generatePriorities(data, result) {
  const topFindings = result.findings.filter(f => f.type === 'red').slice(0, 3);
  if (topFindings.length < 3) {
    topFindings.push(...result.findings.filter(f => f.type === 'yellow').slice(0, 3 - topFindings.length));
  }
  return topFindings.map((f, i) => ({ number: i + 1, title: f.title, type: f.type }));
}

// --- Modal for breakdowns ---
function openModal(areaKey, areaName, areaScore, areaMax, color, label, breakdownItems) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-indicator').className = `modal__indicator modal__indicator--${color}`;
  document.getElementById('modal-title').textContent = areaName;
  document.getElementById('modal-score').textContent = `${areaScore}/${areaMax}`;
  document.getElementById('modal-label').textContent = label;

  let html = '';
  breakdownItems.forEach(b => {
    const bPct = (b.pts / b.max) * 100;
    let bColor = 'bad';
    if (bPct >= 70) bColor = 'good';
    else if (bPct >= 40) bColor = 'warn';
    html += `
      <div class="modal-item">
        <div class="modal-item__header">
          <span class="modal-item__label">${b.label}</span>
          <span class="modal-item__verdict modal-item__verdict--${bColor}">${b.verdict}</span>
        </div>
        <div class="modal-item__bar">
          <div class="modal-item__bar-fill modal-item__bar-fill--${bColor}" style="width:${bPct}%"></div>
        </div>
        <p class="modal-item__explanation">${b.explanation || ''}</p>
      </div>`;
  });
  document.getElementById('modal-content').innerHTML = html;
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
}
// Also close on clicking overlay background (already handled by onclick on overlay)
// Close with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
  }
});

// --- Render results ---
function showResults() {
  const data = getData();
  const result = score(data);

  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('results').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Header
  document.getElementById('results-clinic-name').textContent = data.clinicName;
  document.getElementById('results-specialty').textContent = data.specialty;

  // Score ring
  const circle = document.getElementById('score-circle');
  const circumference = 327;
  const offset = circumference - (result.total / 100) * circumference;
  const scoreEl = document.getElementById('score-value');
  let ringColor = 'var(--red)';
  if (result.total >= 70) ringColor = 'var(--green)';
  else if (result.total >= 45) ringColor = 'var(--yellow)';
  circle.style.stroke = ringColor;
  setTimeout(() => {
    circle.style.strokeDashoffset = offset;
    circle.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)';
    animateNumber(scoreEl, 0, result.total, 1200);
  }, 200);

  // Verdict
  const verdictEl = document.getElementById('score-verdict');
  if (result.total >= 70) {
    verdictEl.textContent = 'La clínica tiene buenas bases. Hay oportunidades puntuales de optimización que pueden generar un salto importante.';
  } else if (result.total >= 45) {
    verdictEl.textContent = 'Hay oportunidades claras de crecimiento. La clínica tiene potencial pero le falta estructura en áreas clave.';
  } else {
    verdictEl.textContent = 'La clínica tiene gaps críticos que están costando dinero todos los días. La buena noticia: son corregibles.';
  }

  // Narrative
  document.getElementById('narrative').textContent = generateNarrative(data, result);

  // Area cards → click opens modal popup
  const areasGrid = document.getElementById('areas-grid');
  areasGrid.innerHTML = '';
  const areas = [
    { key: 'captacion', name: 'Captación', score: result.captacion, max: 25 },
    { key: 'operacion', name: 'Operación', score: result.operacion, max: 25 },
    { key: 'rentabilidad', name: 'Rentabilidad', score: result.rentabilidad, max: 25 },
    { key: 'digital', name: 'Digital', score: result.digital, max: 25 },
  ];
  areas.forEach(a => {
    const pct = (a.score / a.max) * 100;
    let color = 'red';
    if (pct >= 70) color = 'green';
    else if (pct >= 45) color = 'yellow';
    let label = 'Necesita atención';
    if (pct >= 70) label = 'Bien';
    else if (pct >= 45) label = 'Mejorable';

    const card = document.createElement('div');
    card.className = 'area-card';
    card.innerHTML = `
      <div class="area-card__indicator area-card__indicator--${color}"></div>
      <div class="area-card__name">${a.name}</div>
      <div class="area-card__score">${a.score}<span class="area-card__max">/${a.max}</span></div>
      <div class="area-card__label">${label}</div>
      <div class="area-card__expand-hint">Toca para ver desglose</div>`;
    card.addEventListener('click', () => {
      openModal(a.key, a.name, a.score, a.max, color, label, result.breakdowns[a.key] || []);
    });
    areasGrid.appendChild(card);
  });

  // Occupancy bar
  const occCard = document.getElementById('occupancy-card');
  if (data.capacityWeek > 0 && data.actualWeek > 0) {
    occCard.style.display = 'block';
    const occ = result.occupancy;
    const fill = document.getElementById('occupancy-fill');
    const labelEl = document.getElementById('occupancy-label');
    const text = document.getElementById('occupancy-text');
    labelEl.textContent = occ + '%';
    let fillColor = 'var(--red)';
    if (occ >= 80) fillColor = 'var(--green)';
    else if (occ >= 60) fillColor = 'var(--yellow)';
    fill.style.background = fillColor;
    setTimeout(() => { fill.style.width = occ + '%'; }, 300);

    if (occ < 80) {
      const gap = data.capacityWeek - data.actualWeek;
      let extra = '';
      if (data.starPrice > 0) {
        extra = ` Al precio de su servicio estrella ($${data.starPrice}), esas ${gap * 4} citas vacías al mes representan hasta $${(gap * 4 * data.starPrice).toLocaleString()} en facturación potencial.`;
      }
      text.textContent = `La clínica tiene capacidad para ${data.capacityWeek} citas/semana y está llenando ${data.actualWeek}. Hay ${gap} citas vacías cada semana.${extra}`;
    } else {
      text.textContent = 'La clínica opera cerca de su capacidad máxima. El foco debería estar en optimizar ticket promedio, retener y hacer cross-sell.';
    }
  } else { occCard.style.display = 'none'; }

  // Star service card
  const starCard = document.getElementById('star-card');
  if ((data.knowsStar === 'si' || data.knowsStar === 'creo') && data.starPrice > 0) {
    starCard.style.display = 'block';
    const grid = document.getElementById('star-card-grid');
    const profit = data.starPrice * (data.starMargin / 100);
    const monthlyRev = data.starPrice * data.starVolume;
    const monthlyProfit = profit * data.starVolume;
    let statsHtml = `
      <div class="star-stat"><div class="star-stat__value">${data.starName || 'N/A'}</div><div class="star-stat__label">Servicio</div></div>
      <div class="star-stat"><div class="star-stat__value">$${data.starPrice}</div><div class="star-stat__label">Precio</div></div>`;
    if (data.starMargin > 0) {
      statsHtml += `<div class="star-stat"><div class="star-stat__value">${data.starMargin}%</div><div class="star-stat__label">Margen</div></div>
        <div class="star-stat"><div class="star-stat__value">$${profit.toFixed(0)}</div><div class="star-stat__label">Ganancia/unidad</div></div>`;
    }
    if (data.starVolume > 0) {
      statsHtml += `<div class="star-stat"><div class="star-stat__value">${data.starVolume}</div><div class="star-stat__label">Unidades/mes</div></div>
        <div class="star-stat"><div class="star-stat__value">$${monthlyRev.toLocaleString()}</div><div class="star-stat__label">Facturación/mes</div></div>`;
      if (data.starMargin > 0) {
        statsHtml += `<div class="star-stat"><div class="star-stat__value">$${monthlyProfit.toLocaleString()}</div><div class="star-stat__label">Ganancia/mes</div></div>`;
      }
    }
    grid.innerHTML = statsHtml;
    const note = document.getElementById('star-card-note');
    if (data.knowsStar === 'creo') {
      note.textContent = 'Estos números son una estimación. Sin un análisis formal de márgenes por servicio, no hay certeza de que este sea realmente el más rentable.';
    } else if (data.starMargin > 0 && data.starMargin < 40) {
      note.textContent = `Un margen del ${data.starMargin}% es ajustado. Vale la pena revisar si hay servicios con mejor margen.`;
    } else { note.textContent = ''; }
  } else { starCard.style.display = 'none'; }

  // Priorities
  const priorities = generatePriorities(data, result);
  const prioSection = document.getElementById('priorities-section');
  const prioEl = document.getElementById('priorities');
  if (priorities.length > 0) {
    prioSection.style.display = 'block';
    prioEl.innerHTML = priorities.map(p => `
      <div class="priority priority--${p.type}">
        <span class="priority__number">${p.number}</span>
        <span class="priority__title">${p.title}</span>
      </div>
    `).join('');
  } else { prioSection.style.display = 'none'; }

  // Findings
  const findingsEl = document.getElementById('findings');
  findingsEl.innerHTML = '';
  const icons = { red: '!', yellow: '~', green: '+' };
  result.findings.forEach(f => {
    findingsEl.innerHTML += `
      <div class="finding">
        <div class="finding__icon finding__icon--${f.type}">${icons[f.type]}</div>
        <div>
          <div class="finding__title">${f.title}</div>
          <div class="finding__desc">${f.desc}</div>
        </div>
      </div>`;
  });

  window.__diagData = data;
  window.__diagResult = result;
}

// --- Generate downloadable document ---
function downloadDocument() {
  const d = window.__diagData;
  const r = window.__diagResult;
  if (!d || !r) return;

  const narrative = generateNarrative(d, r);
  const priorities = generatePriorities(d, r);

  // Build area details with explanations
  const areasMeta = [
    { key: 'captacion', name: 'Captación', score: r.captacion, max: 25 },
    { key: 'operacion', name: 'Operación', score: r.operacion, max: 25 },
    { key: 'rentabilidad', name: 'Rentabilidad', score: r.rentabilidad, max: 25 },
    { key: 'digital', name: 'Digital', score: r.digital, max: 25 },
  ];

  let areasHtml = '';
  areasMeta.forEach(a => {
    const pct = (a.score / a.max) * 100;
    let color = '#E53935';
    if (pct >= 70) color = '#4CAF50';
    else if (pct >= 45) color = '#FFC107';

    let itemsHtml = '';
    (r.breakdowns[a.key] || []).forEach(b => {
      const bPct = (b.pts / b.max) * 100;
      let bColor = '#E53935';
      if (bPct >= 70) bColor = '#4CAF50';
      else if (bPct >= 40) bColor = '#FFC107';
      itemsHtml += `
        <div style="padding:12px 0;border-bottom:1px solid #eee;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="font-weight:500;color:#333;">${b.label}</span>
            <span style="font-weight:600;color:${bColor};">${b.verdict}</span>
          </div>
          <div style="height:4px;background:#eee;border-radius:2px;margin-bottom:8px;">
            <div style="height:100%;width:${bPct}%;background:${bColor};border-radius:2px;"></div>
          </div>
          <p style="font-size:13px;color:#666;line-height:1.5;margin:0;">${b.explanation || ''}</p>
        </div>`;
    });

    areasHtml += `
      <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin-bottom:16px;border-top:3px solid ${color};">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-family:'Schibsted Grotesk',sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#888;">${a.name}</h3>
          <span style="font-family:'Fraunces',serif;font-size:24px;font-weight:600;color:#222;">${a.score}<span style="font-size:12px;color:#999;">/${a.max}</span></span>
        </div>
        ${itemsHtml}
      </div>`;
  });

  // Occupancy section
  let occupancyHtml = '';
  if (d.capacityWeek > 0 && d.actualWeek > 0) {
    const occ = r.occupancy;
    let occColor = '#E53935';
    if (occ >= 80) occColor = '#4CAF50';
    else if (occ >= 60) occColor = '#FFC107';
    occupancyHtml = `
      <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin-bottom:20px;">
        <h3 style="font-family:'Schibsted Grotesk',sans-serif;font-size:14px;color:#333;margin:0 0 12px;">Ocupación actual estimada</h3>
        <div style="height:28px;background:#e8e6e0;border-radius:6px;position:relative;overflow:hidden;margin-bottom:10px;">
          <div style="height:100%;width:${occ}%;background:${occColor};border-radius:6px;"></div>
          <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-weight:600;font-size:14px;color:#333;">${occ}%</span>
        </div>
        <p style="font-size:13px;color:#666;line-height:1.5;margin:0;">${d.actualWeek} de ${d.capacityWeek} citas/semana utilizadas.</p>
      </div>`;
  }

  // Star service
  let starHtml = '';
  if ((d.knowsStar === 'si' || d.knowsStar === 'creo') && d.starPrice > 0) {
    const profit = d.starPrice * (d.starMargin / 100);
    starHtml = `
      <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin-bottom:20px;">
        <h3 style="font-family:'Schibsted Grotesk',sans-serif;font-size:14px;color:#333;margin:0 0 12px;">Servicio estrella reportado</h3>
        <div style="display:flex;flex-wrap:wrap;gap:20px;">
          <div style="text-align:center;"><div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#C9A84C;">${d.starName || 'N/A'}</div><div style="font-size:11px;color:#999;text-transform:uppercase;">Servicio</div></div>
          <div style="text-align:center;"><div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#C9A84C;">$${d.starPrice}</div><div style="font-size:11px;color:#999;text-transform:uppercase;">Precio</div></div>
          ${d.starMargin > 0 ? `<div style="text-align:center;"><div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#C9A84C;">${d.starMargin}%</div><div style="font-size:11px;color:#999;text-transform:uppercase;">Margen</div></div>
          <div style="text-align:center;"><div style="font-family:'Fraunces',serif;font-size:20px;font-weight:600;color:#C9A84C;">$${profit.toFixed(0)}</div><div style="font-size:11px;color:#999;text-transform:uppercase;">Ganancia/unidad</div></div>` : ''}
        </div>
      </div>`;
  }

  // Priorities
  let prioHtml = '';
  if (priorities.length > 0) {
    prioHtml = `<h2 style="font-family:'Fraunces',serif;font-size:20px;color:#222;margin:30px 0 16px;">Prioridades para tu clínica</h2>`;
    priorities.forEach(p => {
      const borderColor = p.type === 'red' ? '#E53935' : '#FFC107';
      prioHtml += `
        <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9f9f7;border-radius:10px;border-left:3px solid ${borderColor};margin-bottom:10px;">
          <span style="font-family:'Fraunces',serif;font-size:24px;font-weight:600;color:#C9A84C;">${p.number}</span>
          <span style="font-size:14px;font-weight:500;color:#333;">${p.title}</span>
        </div>`;
    });
  }

  // Findings
  let findingsHtml = '<h2 style="font-family:\'Fraunces\',serif;font-size:20px;color:#222;margin:30px 0 16px;">Hallazgos del diagnóstico</h2>';
  r.findings.forEach(f => {
    const iconBg = f.type === 'red' ? 'rgba(229,57,53,0.12)' : 'rgba(255,193,7,0.12)';
    const iconColor = f.type === 'red' ? '#E53935' : '#FFC107';
    const iconChar = f.type === 'red' ? '!' : '~';
    findingsHtml += `
      <div style="display:flex;gap:12px;padding:16px 0;border-bottom:1px solid #eee;">
        <div style="width:28px;height:28px;border-radius:50%;background:${iconBg};color:${iconColor};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${iconChar}</div>
        <div>
          <div style="font-weight:500;font-size:14px;color:#333;margin-bottom:4px;">${f.title}</div>
          <div style="font-size:13px;color:#666;line-height:1.6;">${f.desc}</div>
        </div>
      </div>`;
  });

  const today = new Date().toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });

  let scoreColor = '#E53935';
  if (r.total >= 70) scoreColor = '#4CAF50';
  else if (r.total >= 45) scoreColor = '#FFC107';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Diagnóstico Express — ${d.clinicName}</title>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600&family=Schibsted+Grotesk:wght@400;500&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',sans-serif; color:#333; background:#fff; line-height:1.6; padding:0; }
  .doc { max-width:700px; margin:0 auto; padding:40px 32px 60px; }
  @media print { .doc { padding:20px; } .no-print { display:none !important; } }
</style>
</head>
<body>
<div class="doc">
  <!-- Header -->
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #C9A84C;">
    <div style="font-family:'Schibsted Grotesk',sans-serif;font-size:11px;color:#C9A84C;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;">Diagnóstico Express</div>
    <h1 style="font-family:'Fraunces',serif;font-size:28px;color:#222;margin-bottom:4px;">${d.clinicName}</h1>
    <p style="color:#888;font-size:14px;">${d.specialty}${d.ownerName ? ' — ' + d.ownerName : ''}</p>
    <p style="color:#aaa;font-size:12px;margin-top:6px;">${today}</p>
  </div>

  <!-- Score -->
  <div style="text-align:center;margin-bottom:28px;">
    <div style="font-family:'Fraunces',serif;font-size:56px;font-weight:600;color:${scoreColor};line-height:1;">${r.total}</div>
    <div style="font-size:13px;color:#999;">de 100 puntos</div>
  </div>

  <!-- Narrative -->
  <div style="background:#f9f9f7;border-radius:10px;padding:20px;margin-bottom:28px;border:1px solid #e8e6e0;">
    <p style="font-size:14px;color:#555;line-height:1.7;margin:0;">${narrative}</p>
  </div>

  <!-- Areas with full breakdowns + explanations -->
  <h2 style="font-family:'Fraunces',serif;font-size:20px;color:#222;margin-bottom:16px;">Desglose por área</h2>
  ${areasHtml}

  ${occupancyHtml}
  ${starHtml}
  ${prioHtml}
  ${findingsHtml}

  <!-- CTA -->
  <div style="text-align:center;margin-top:40px;padding:32px 24px;background:#0C0B08;border-radius:12px;color:#F4F0E7;">
    <h2 style="font-family:'Fraunces',serif;font-size:22px;margin-bottom:12px;color:#F4F0E7;">¿Listo para resolver esto?</h2>
    <p style="font-size:14px;color:#B8B3A6;margin-bottom:24px;max-width:440px;margin-left:auto;margin-right:auto;line-height:1.6;">En una sesión de 30 minutos te muestro exactamente dónde está el dinero que tu clínica está dejando en la mesa — y cómo recuperarlo.</p>
    <a href="${SOCIAL.whatsapp}" style="display:inline-block;background:#C9A84C;color:#0C0B08;font-family:'Schibsted Grotesk',sans-serif;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;text-decoration:none;margin-bottom:20px;">Agendar sesión gratuita</a>
    <div style="display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-top:20px;">
      <a href="${SOCIAL.whatsapp}" style="color:#C9A84C;text-decoration:none;font-size:13px;">WhatsApp</a>
      <a href="${SOCIAL.instagram}" style="color:#C9A84C;text-decoration:none;font-size:13px;">Instagram</a>
      <a href="${SOCIAL.tiktok}" style="color:#C9A84C;text-decoration:none;font-size:13px;">TikTok</a>
      <a href="${SOCIAL.linkedin}" style="color:#C9A84C;text-decoration:none;font-size:13px;">LinkedIn</a>
    </div>
    <p style="font-size:12px;color:#666;margin-top:16px;">Johan Martínez — Grow Your Clinic</p>
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Diagnostico-${d.clinicName.replace(/[^a-zA-Z0-9]/g, '-')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Diagnóstico descargado');
}

function animateNumber(el, from, to, duration) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function showToast(msg) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

function goBackToEdit() {
  document.getElementById('results').style.display = 'none';
  currentStep = totalSteps;
  document.querySelector(`.step[data-step="${currentStep}"]`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetApp() {
  document.getElementById('results').style.display = 'none';
  document.getElementById('star-card').style.display = 'none';
  document.getElementById('priorities-section').style.display = 'none';
  currentStep = 1;
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.querySelector('.step[data-step="1"]').classList.add('active');
  document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(i => i.value = '');
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => i.checked = false);
  ['specialty-other-wrap','cac-amount-wrap','ads-detail-wrap','star-service-wrap','retention-detail-wrap','crosssell-detail-wrap','social-detail-wrap','ai-detail-wrap'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  const fill = document.getElementById('occupancy-fill');
  if (fill) fill.style.width = '0';
  const circle = document.getElementById('score-circle');
  if (circle) { circle.style.transition = 'none'; circle.style.strokeDashoffset = 327; }
  document.getElementById('narrative').textContent = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
