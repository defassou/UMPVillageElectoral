/**
 * UMP 2026 — Dashboard Village Électoral 2026
 * Application principale
 */

// ══════════════════════════════════════════
// ÉTAT GLOBAL
// ══════════════════════════════════════════

const STATE = {
  data: [],
  filtered: [],
  currentView: 'overview',
  apiToken: 'b9d3703b1892083539b96c51c51ff1c85eb6d81e',
  apiServer: 'https://kf.kobotoolbox.org',
  apiFormId: 'ab6ZkVGRpcwY6xPLipughH',
  autoRefreshInterval: null,
  sortField: '_submission_time',
  sortDir: 'desc',
  currentPage: 1,
  pageSize: 20,
  searchQuery: '',
  tableFilterRegion: '',
  tableFilterSection: '',
  map: null,
  mapMarkers: [],
  charts: {},
};

// Données PARTIES (liste nationale)
const PARTIES = [
  { key: 'UMP', name: 'Union pour un mouvement populaire', color: '#25eb56' },
  { key: 'FIDEL', name: 'Force des intègres pour la démocratie et la liberté', color: '#0c553c' },
  { key: 'UDD', name: 'Union pour la démocratie et le développement', color: '#f59e0b' },
  { key: 'ADC', name: 'Alternance démocratique pour le changement', color: '#ef4444' },
  { key: 'AGN', name: 'Avenir Guinée nouvelle', color: '#8b5cf6' },
  { key: 'BL', name: 'Bloc libéral', color: '#06b6d4' },
  { key: 'FRONDEG', name: 'Front démocratique de Guinée', color: '#f97316' },
  { key: 'FAN', name: "Front pour l'alliance nationale", color: '#84cc16' },
  { key: 'MND', name: 'Mouvement national pour le développement', color: '#ec4899' },
  { key: 'ND', name: 'Nouveau départ', color: '#14b8a6' },
  { key: 'NGR', name: 'Nouvelle génération pour la République', color: '#a855f7' },
  { key: 'PACT', name: "Parti de l'action citoyenne pour le travail", color: '#eab308' },
  { key: 'PADES', name: "Parti des démocrates pour l'espoir", color: '#22c55e' },
  { key: 'RGA', name: "Rassemblement des Guinéens pour l'alternance", color: '#3b82f6' },
  { key: 'RGT', name: 'Rassemblement guinéen du travail', color: '#64748b' },
  { key: 'RDN', name: 'Rassemblement pour la démocratie nationale', color: '#dc2626' },
  { key: 'RRD', name: 'Rassemblement pour la renaissance et le développement', color: '#9333ea' },
  { key: 'RGP', name: 'Rassemblement pour une Guinée prospère', color: '#0284c7' },
  { key: 'UDG', name: 'Union démocratique de Guinée', color: '#16a34a' },
  { key: 'UFC', name: 'Union des forces du changement', color: '#ca8a04' },
  { key: 'ARP', name: 'Alliance pour le renouveau et le progrès', color: '#be185d' },
];

const REGIONS = {
  '1': 'Boké', '2': 'Conakry', '3': 'Faranah', '4': 'Kankan',
  '5': 'Kindia', '6': 'Labé', '7': 'Mamou', '8': 'Nzérékoré'
};

const SECTIONS = {
  '1': 'Section 1 — Ouverture',
  '2': 'Section 2 — Déroulement',
  '3': 'Section 3 — Clôture',
  '4': 'Section 4 — Incidents'
};

const OPEN_HR = {
  '1': 'Avant 7h00', '2': 'À 7h00', '3': 'Entre 7h01 et 8h00',
  '4': 'Après 8h00', '5': "N'a pas ouvert"
};

// Coordonnées approximatives des régions de Guinée
const REGION_COORDS = {
  'Boké': [11.0, -14.3], 'Conakry': [9.6, -13.6],
  'Faranah': [10.0, -10.8], 'Kankan': [10.4, -9.3],
  'Kindia': [10.1, -12.9], 'Labé': [11.3, -12.3],
  'Mamou': [10.4, -12.1], 'Nzérékoré': [7.7, -8.8]
};

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════

function switchView(view, el) {
  // Désactiver toutes les vues
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`view-${view}`).classList.add('active');
  if (el) el.classList.add('active');

  STATE.currentView = view;

  const titles = {
    overview: 'Vue d\'ensemble',
    map: 'Carte des Bureaux de Vote',
    results: 'Résultats du Scrutin',
    incidents: 'Grille des Incidents',
    observers: 'Agents Observateurs',
    table: 'Données Brutes',
    api: 'Connexion API KoBoToolbox'
  };
  document.getElementById('viewTitle').textContent = titles[view] || view;

  // Init map quand on arrive sur cette vue
  if (view === 'map' && !STATE.map) {
    setTimeout(initMap, 100);
  }
  if (view === 'map' && STATE.map) {
    STATE.map.invalidateSize();
  }

  // Fermer sidebar mobile
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ══════════════════════════════════════════
// API KOBOTOOLBOX
// ══════════════════════════════════════════

async function connectAPI() {
  const token = document.getElementById('apiToken').value.trim();
  const serverSel = document.getElementById('apiServer').value;
  const server = serverSel === 'custom'
    ? document.getElementById('customServer').value.trim()
    : serverSel;
  const formId = document.getElementById('apiFormId').value.trim();

  if (!token) { showToast('Veuillez entrer votre Token API', 'error'); return; }
  if (!formId) { showToast("Veuillez entrer l'Asset UID du formulaire", 'error'); return; }

  STATE.apiToken = token;
  STATE.apiServer = server;
  STATE.apiFormId = formId;

  // Sauvegarder en localStorage
  localStorage.setItem('ump_api_token', token);
  localStorage.setItem('ump_api_server', server);
  localStorage.setItem('ump_api_form', formId);

  await fetchData();

  // Auto-refresh
  const interval = parseInt(document.getElementById('autoRefresh').value);
  if (STATE.autoRefreshInterval) clearInterval(STATE.autoRefreshInterval);
  if (interval > 0) {
    STATE.autoRefreshInterval = setInterval(fetchData, interval * 1000);
    showToast(`Mise à jour automatique toutes les ${interval}s`, 'info');
  }
}

async function fetchData() {
  if (!STATE.apiToken || !STATE.apiFormId) {
    showToast('Configurez d\'abord la connexion API', 'error');
    switchView('api', document.querySelector('[data-view="api"]'));
    return;
  }

  const btn = document.getElementById('refreshBtn');
  btn.style.animation = 'spin 1s linear infinite';

  try {
    const response = await fetch('/.netlify/functions/kobo-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: STATE.apiToken,
        server: STATE.apiServer,
        formId: STATE.apiFormId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error('Token invalide ou expiré');
      if (response.status === 404) throw new Error('Formulaire introuvable. Vérifiez l\'Asset UID');
      throw new Error(`Erreur API: ${response.status}`);
    }

    const json = await response.json();
    const results = json.results || json;

    if (!Array.isArray(results)) throw new Error('Format de réponse inattendu');

    STATE.data = results;
    processData();
    showAPIStatus(true, `Connecté — ${results.length} soumissions importées`);
    showToast(`✅ ${results.length} soumissions chargées`, 'success');
  } catch (err) {
    showAPIStatus(false, err.message);
    showToast(`❌ ${err.message}`, 'error');
    console.error('API Error:', err);
  } finally {
    btn.style.animation = '';
  }
}

function showAPIStatus(ok, msg) {
  const card = document.getElementById('apiStatusCard');
  card.style.display = 'block';
  document.getElementById('apiStatusIndicator').style.background = ok ? 'var(--green)' : 'var(--red)';
  document.getElementById('apiStatusText').textContent = msg;

  const dot = document.getElementById('statusDot');
  dot.className = 'status-dot ' + (ok ? 'connected' : 'error');
  document.getElementById('statusLabel').textContent = ok ? 'Connecté' : 'Erreur';
  document.getElementById('statusCount').textContent = `${STATE.data.length} soumissions`;
}

function toggleToken() {
  const inp = document.getElementById('apiToken');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

document.getElementById('apiServer').addEventListener('change', function() {
  document.getElementById('customServerField').style.display =
    this.value === 'custom' ? 'block' : 'none';
});

// ══════════════════════════════════════════
// IMPORT LOCAL
// ══════════════════════════════════════════

function importJSON() {
  document.getElementById('fileImport').click();
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      let data;
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(e.target.result);
        data = parsed.results || parsed;
      } else if (file.name.endsWith('.csv')) {
        data = parseCSV(e.target.result);
      }
      if (!Array.isArray(data)) throw new Error('Format invalide');
      STATE.data = data;
      processData();
      showToast(`✅ ${data.length} enregistrements importés depuis ${file.name}`, 'success');
    } catch (err) {
      showToast(`❌ Erreur d'import: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

// ══════════════════════════════════════════
// DONNÉES DE DÉMONSTRATION
// ══════════════════════════════════════════

function loadDemoData() {
  const regions = [
    {id:'2', name:'Conakry', prefs:['Conakry'], lat:9.6, lng:-13.6},
    {id:'1', name:'Boké', prefs:['Boké','Boffa'], lat:11.0, lng:-14.3},
    {id:'5', name:'Kindia', prefs:['Kindia','Coyah'], lat:10.1, lng:-12.9},
    {id:'4', name:'Kankan', prefs:['Kankan','Siguiri'], lat:10.4, lng:-9.3},
    {id:'6', name:'Labé', prefs:['Labé','Mali'], lat:11.3, lng:-12.3},
    {id:'8', name:'Nzérékoré', prefs:['N\'Zérékoré','Lola'], lat:7.7, lng:-8.8},
    {id:'3', name:'Faranah', prefs:['Faranah','Kissidougou'], lat:10.0, lng:-10.8},
    {id:'7', name:'Mamou', prefs:['Mamou','Pita'], lat:10.4, lng:-12.1},
  ];

  const names = [
    'Mamadou Diallo', 'Fatoumata Bah', 'Alpha Condé', 'Aissatou Sow',
    'Ibrahim Kouyaté', 'Mariama Camara', 'Oumar Baldé', 'Hadiatou Barry',
    'Sékou Touré', 'Safiatou Keita', 'Boubacar Diallo', 'Kadiatou Traoré',
    'Aboubacar Sylla', 'Fanta Kourouma', 'Lamine Barry', 'Aminata Diallo',
    'Moussa Konaté', 'Djénabou Camara', 'Youssouf Bah', 'Mariam Keita',
  ];

  const data = [];
  const now = new Date();

  for (let i = 0; i < 85; i++) {
    const region = regions[Math.floor(Math.random() * regions.length)];
    const prefecture = region.prefs[Math.floor(Math.random() * region.prefs.length)];
    const section = String(Math.floor(Math.random() * 4) + 1);
    const openHr = String(Math.floor(Math.random() * 5) + 1);
    const hasIncident = Math.random() < 0.2;
    const dt = new Date(now - Math.random() * 8 * 3600 * 1000);

    // Votes pour chaque parti
    const voteObj = {};
    let totalVotes = 0;
    PARTIES.forEach(p => {
      const v = Math.floor(Math.random() * 400);
      voteObj[p.key] = v;
      totalVotes += v;
    });

    const inscrits = totalVotes + Math.floor(Math.random() * 200) + 50;
    const nuls = Math.floor(Math.random() * 20);

    const latJitter = (Math.random() - 0.5) * 2;
    const lngJitter = (Math.random() - 0.5) * 2;

    data.push({
      _id: i + 1,
      _submission_time: dt.toISOString(),
      noms: names[Math.floor(Math.random() * names.length)],
      sexe_agent: Math.random() > 0.4 ? '1' : '2',
      Statut: Math.random() > 0.5 ? '1' : '2',
      telnum: '62' + String(Math.floor(Math.random() * 10000000)).padStart(7, '0'),
      region: region.id,
      prefecture,
      commune: `Commune de ${prefecture}`,
      Quartier: `Quartier ${Math.floor(Math.random() * 20) + 1}`,
      BV: `BV-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`,
      section,
      openHr,
      presencePresiBV: Math.random() > 0.1 ? '1' : '2',
      sexePresiBV: Math.random() > 0.3 ? '1' : '2',
      nbAssesseurs: String(Math.floor(Math.random() * 3)),
      nbAssesseursFemmes: String(Math.floor(Math.random() * 2)),
      presenceDelegParti: Math.random() > 0.2 ? '1' : '2',
      secretVote_isoloir: Math.random() > 0.1 ? '1' : '2',
      urneVide: Math.random() > 0.05 ? '1' : '2',
      autoriseObsr: Math.random() > 0.15 ? '1' : '2',
      accessBV: Math.random() > 0.1 ? '1' : '2',
      secretVote: Math.random() > 0.1 ? '1' : '2',
      suiviPrMmbr: Math.random() > 0.15 ? '1' : '2',
      forceSecurite: Math.random() > 0.8 ? '1' : '2',
      rapportIrregularite: hasIncident ? '1' : '2',
      Q1: Math.random() > 0.1 ? '1' : '2',
      Q5: Math.random() > 0.15 ? '1' : '2',
      Q6: Math.random() > 0.1 ? '1' : '2',
      Q7: hasIncident ? '1' : '2',
      NINS: inscrits,
      NVOTE: totalVotes,
      NVPROC: Math.floor(Math.random() * 20),
      NVDEROG: Math.floor(Math.random() * 10),
      NBNUL: nuls,
      NSUFFRAGE: totalVotes - nuls,
      GeoLocalisation1: `${(region.lat + latJitter).toFixed(6)} ${(region.lng + lngJitter).toFixed(6)} 0 0`,
      ...voteObj
    });
  }

  STATE.data = data;
  processData();
  document.getElementById('statusDot').className = 'status-dot connected';
  document.getElementById('statusLabel').textContent = 'Démo active';
  document.getElementById('statusCount').textContent = `${data.length} soumissions`;
  showToast(`✅ ${data.length} enregistrements de démonstration chargés`, 'success');
}

// ══════════════════════════════════════════
// TRAITEMENT DES DONNÉES
// ══════════════════════════════════════════

function processData() {
  STATE.filtered = [...STATE.data];
  applyFilters();
  updateKPIs();
  updateCharts();
  updateTable();
  updateResultsView();
  updateIncidentsView();
  updateObserversView();
  updateMapMarkers();
  updateLastUpdateTime();
}

function applyFilters() {
  let d = [...STATE.data];
  const q = STATE.searchQuery.toLowerCase();
  if (q) {
    d = d.filter(row =>
      (row.noms || '').toLowerCase().includes(q) ||
      (row.BV || '').toLowerCase().includes(q) ||
      (REGIONS[row.region] || '').toLowerCase().includes(q) ||
      (row.prefecture || '').toLowerCase().includes(q) ||
      (row.commune || '').toLowerCase().includes(q)
    );
  }
  if (STATE.tableFilterRegion) {
    d = d.filter(row => REGIONS[row.region] === STATE.tableFilterRegion || row.region === STATE.tableFilterRegion);
  }
  if (STATE.tableFilterSection) {
    d = d.filter(row => String(row.section) === STATE.tableFilterSection);
  }
  STATE.filtered = d;
}

function handleSearch(q) {
  STATE.searchQuery = q;
  STATE.currentPage = 1;
  applyFilters();
  updateTable();
  updateKPIs();
}

function filterTable() {
  STATE.tableFilterRegion = document.getElementById('tableFilterRegion').value;
  STATE.tableFilterSection = document.getElementById('tableFilterSection').value;
  STATE.currentPage = 1;
  applyFilters();
  updateTable();
}

function filterMap() {
  updateMapMarkers();
}

// ══════════════════════════════════════════
// KPIs
// ══════════════════════════════════════════

function updateKPIs() {
  const d = STATE.filtered;
  const total = d.length;
  const bvs = new Set(d.map(r => r.BV).filter(Boolean)).size;
  const incidents = d.filter(r => r.rapportIrregularite === '1' || r.Q7 === '1').length;
  const agents = new Set(d.map(r => r.noms).filter(Boolean)).size;

  const participations = d
    .filter(r => r.NINS && r.NVOTE && Number(r.NINS) > 0)
    .map(r => (Number(r.NVOTE) / Number(r.NINS)) * 100);
  const avgPart = participations.length
    ? (participations.reduce((a, b) => a + b, 0) / participations.length).toFixed(1) + '%'
    : '—';

  const nonOpen = d.filter(r => r.openHr === '5').length;

  setKPI('kpi-total', total);
  setKPI('kpi-bv', bvs);
  setKPI('kpi-incidents', incidents);
  setKPI('kpi-agents', agents);
  setKPI('kpi-participation', avgPart);
  setKPI('kpi-nonOpen', nonOpen);

  document.getElementById('badge-incidents').textContent = incidents;
}

function setKPI(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = typeof val === 'number' ? val.toLocaleString('fr') : val;
}

// ══════════════════════════════════════════
// GRAPHIQUES
// ══════════════════════════════════════════

const CHART_DEFAULTS = {
  color: '#1a1a2e',
  grid: 'rgba(0,0,0,0.06)',
  font: 'Space Grotesk',
};

function chartOptions(extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: CHART_DEFAULTS.color, font: { family: CHART_DEFAULTS.font, size: 12 }, boxWidth: 12 }
      },
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        titleColor: '#1a1a2e',
        bodyColor: '#6b7280',
        titleFont: { family: CHART_DEFAULTS.font, weight: '600' },
        bodyFont: { family: CHART_DEFAULTS.font },
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { family: CHART_DEFAULTS.font, size: 11 } },
        grid: { color: CHART_DEFAULTS.grid }
      },
      y: {
        ticks: { color: '#64748b', font: { family: CHART_DEFAULTS.font, size: 11 } },
        grid: { color: CHART_DEFAULTS.grid }
      }
    },
    ...extra
  };
}

function destroyChart(key) {
  if (STATE.charts[key]) {
    STATE.charts[key].destroy();
    delete STATE.charts[key];
  }
}

function updateCharts() {
  const d = STATE.filtered;

  // ── Chart 1: Soumissions par Section
  const sectionCounts = { '1': 0, '2': 0, '3': 0, '4': 0 };
  d.forEach(r => { if (sectionCounts[r.section] !== undefined) sectionCounts[r.section]++; });

  destroyChart('sections');
  const ctx1 = document.getElementById('chartSections').getContext('2d');
  STATE.charts.sections = new Chart(ctx1, {
    type: 'doughnut',
    data: {
      labels: Object.values(SECTIONS),
      datasets: [{
        data: Object.values(sectionCounts),
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#1a1a2e', font: { family: 'Space Grotesk', size: 11 }, boxWidth: 12, padding: 12 }
        },
        tooltip: {
          backgroundColor: '#ffffff', borderColor: '#e5e7eb', borderWidth: 1,
          titleColor: '#1a1a2e', bodyColor: '#6b7280',
        }
      },
      cutout: '65%',
    }
  });

  // ── Chart 2: Régions
  const regionCounts = {};
  d.forEach(r => {
    const rName = REGIONS[r.region] || r.region || 'Inconnue';
    regionCounts[rName] = (regionCounts[rName] || 0) + 1;
  });
  const regSorted = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]);

  destroyChart('regions');
  const ctx2 = document.getElementById('chartRegions').getContext('2d');
  STATE.charts.regions = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: regSorted.map(e => e[0]),
      datasets: [{
        label: 'Soumissions',
        data: regSorted.map(e => e[1]),
        backgroundColor: 'rgba(0,166,81,0.7)',
        borderColor: '#00a651',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: chartOptions({ plugins: { legend: { display: false } } })
  });

  // ── Chart 3: Ouverture BV
  const openCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  d.forEach(r => { if (r.openHr && openCounts[r.openHr] !== undefined) openCounts[r.openHr]++; });

  destroyChart('openHr');
  const ctx3 = document.getElementById('chartOpenHr').getContext('2d');
  STATE.charts.openHr = new Chart(ctx3, {
    type: 'bar',
    data: {
      labels: Object.values(OPEN_HR),
      datasets: [{
        label: 'Bureaux',
        data: Object.values(openCounts),
        backgroundColor: [
          'rgba(16,185,129,0.7)', 'rgba(37,99,235,0.7)',
          'rgba(245,158,11,0.7)', 'rgba(239,68,68,0.7)', 'rgba(100,116,139,0.7)'
        ],
        borderRadius: 4,
        borderWidth: 0,
      }]
    },
    options: chartOptions({ plugins: { legend: { display: false } }, indexAxis: 'y' })
  });

  // ── Chart 4: Agents statut/sexe
  const sup_m = d.filter(r => r.Statut === '1' && r.sexe_agent === '1').length;
  const sup_f = d.filter(r => r.Statut === '1' && r.sexe_agent === '2').length;
  const obs_m = d.filter(r => r.Statut === '2' && r.sexe_agent === '1').length;
  const obs_f = d.filter(r => r.Statut === '2' && r.sexe_agent === '2').length;

  destroyChart('agents');
  const ctx4 = document.getElementById('chartAgents').getContext('2d');
  STATE.charts.agents = new Chart(ctx4, {
    type: 'bar',
    data: {
      labels: ['Superviseurs', 'Observateurs'],
      datasets: [
        { label: 'Hommes', data: [sup_m, obs_m], backgroundColor: 'rgba(37,99,235,0.8)', borderRadius: 4 },
        { label: 'Femmes', data: [sup_f, obs_f], backgroundColor: 'rgba(236,72,153,0.8)', borderRadius: 4 },
      ]
    },
    options: chartOptions()
  });
}

// ══════════════════════════════════════════
// RÉSULTATS
// ══════════════════════════════════════════

function updateResultsView() {
  const d = STATE.data.filter(r => r.section === '3');
  const container = document.getElementById('resultsGrid');

  if (d.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📊</div>
      <div>Aucune donnée de Section 3 (Clôture/Résultats) disponible</div>
    </div>`;
    return;
  }

  // Agréger votes par parti
  const totals = {};
  PARTIES.forEach(p => { totals[p.key] = 0; });
  d.forEach(row => {
    PARTIES.forEach(p => {
      const v = Number(row[p.key] || 0);
      if (!isNaN(v)) totals[p.key] += v;
    });
  });

  const maxVotes = Math.max(...Object.values(totals), 1);
  const sorted = PARTIES.map(p => ({ ...p, votes: totals[p.key] }))
    .sort((a, b) => b.votes - a.votes)
    .filter(p => p.votes > 0);

  container.innerHTML = sorted.map(p => `
    <div class="party-card">
      <div class="party-name">${p.key}</div>
      <div class="party-full">${p.name}</div>
      <div class="party-votes">${p.votes.toLocaleString('fr')}</div>
      <div class="party-bar-wrap">
        <div class="party-bar" style="width:${(p.votes/maxVotes*100).toFixed(1)}%; background:${p.color}"></div>
      </div>
    </div>
  `).join('');

  // Chart résultats
  destroyChart('results');
  const ctx = document.getElementById('chartResults').getContext('2d');
  const top12 = sorted.slice(0, 12);
  STATE.charts.results = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top12.map(p => p.key),
      datasets: [{
        label: 'Votes',
        data: top12.map(p => p.votes),
        backgroundColor: top12.map(p => p.color + 'cc'),
        borderColor: top12.map(p => p.color),
        borderWidth: 1,
        borderRadius: 6,
      }]
    },
    options: chartOptions({
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: v => v.toLocaleString('fr'), color: '#64748b' } }
      }
    })
  });
}

// ══════════════════════════════════════════
// INCIDENTS
// ══════════════════════════════════════════

function updateIncidentsView() {
  const incidents = STATE.data.filter(r =>
    r.rapportIrregularite === '1' || r.Q7 === '1' || r.section === '4'
  );

  const container = document.getElementById('incidentsList');
  if (incidents.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div>Aucun incident signalé</div></div>`;
    return;
  }

  container.innerHTML = incidents.map(r => {
    const gravite = r.graviteRisk;
    let severity = 'high', sLabel = 'Critique';
    if (gravite === '1') { severity = 'low'; sLabel = 'Mineur'; }
    if (gravite === '2') { severity = 'medium'; sLabel = 'Majeur'; }

    const region = REGIONS[r.region] || r.region || '—';
    const dt = r._submission_time ? new Date(r._submission_time).toLocaleString('fr') : '—';

    return `
      <div class="incident-card ${severity}">
        <span class="incident-badge ${severity}">${sLabel}</span>
        <div class="incident-info">
          <div class="incident-title">Bureau: ${r.BV || 'Inconnu'} — ${region}</div>
          <div class="incident-meta">
            Agent: ${r.noms || '—'} · ${r.prefecture || '—'} · ${dt}
            ${r.Q7 === '1' ? ' · Décompte perturbé' : ''}
            ${r.rapportIrregularite === '1' ? ' · Irrégularité rapportée' : ''}
          </div>
        </div>
        <button class="btn-detail" onclick="openDetail(${r._id})">Détails</button>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════
// AGENTS / OBSERVATEURS
// ══════════════════════════════════════════

function updateObserversView() {
  // Déduplication par nom
  const seen = new Set();
  const agents = STATE.data.filter(r => {
    if (!r.noms || seen.has(r.noms)) return false;
    seen.add(r.noms);
    return true;
  });

  const container = document.getElementById('observersGrid');
  if (agents.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><div>Aucun agent enregistré</div></div>`;
    return;
  }

  const colors = ['#2563eb','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899','#84cc16'];

  container.innerHTML = agents.map((r, i) => {
    const initials = (r.noms || 'XX').split(' ').map(w => w[0]).slice(0, 2).join('');
    const statut = r.Statut === '1' ? 'Superviseur' : 'Observateur';
    const region = REGIONS[r.region] || r.region || '—';
    const color = colors[i % colors.length];

    return `
      <div class="observer-card">
        <div class="observer-avatar" style="background:${color}">${initials}</div>
        <div>
          <div class="observer-name">${r.noms || '—'}</div>
          <div class="observer-role ${statut.toLowerCase()}">${statut}</div>
          <div class="observer-zone">${region} · ${r.prefecture || '—'}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════
// TABLEAU DYNAMIQUE
// ══════════════════════════════════════════

let sortDir = {};

function sortTable(field) {
  if (STATE.sortField === field) {
    STATE.sortDir = STATE.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    STATE.sortField = field;
    STATE.sortDir = 'desc';
  }
  STATE.currentPage = 1;
  updateTable();
}

function updateTable() {
  let d = [...STATE.filtered];

  // Tri
  if (STATE.sortField) {
    d.sort((a, b) => {
      let va = a[STATE.sortField] || '';
      let vb = b[STATE.sortField] || '';
      if (!isNaN(va) && !isNaN(vb)) { va = Number(va); vb = Number(vb); }
      if (va < vb) return STATE.sortDir === 'asc' ? -1 : 1;
      if (va > vb) return STATE.sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  document.getElementById('tableInfo').textContent = `${d.length} entrée${d.length !== 1 ? 's' : ''}`;

  // Pagination
  const total = d.length;
  const pages = Math.ceil(total / STATE.pageSize) || 1;
  STATE.currentPage = Math.min(STATE.currentPage, pages);
  const start = (STATE.currentPage - 1) * STATE.pageSize;
  const page = d.slice(start, start + STATE.pageSize);

  const sectionBadge = { '1': 'badge-s1', '2': 'badge-s2', '3': 'badge-s3', '4': 'badge-s4' };

  document.getElementById('tableBody').innerHTML = page.map(r => {
    const dt = r._submission_time ? new Date(r._submission_time).toLocaleDateString('fr') : '—';
    const region = REGIONS[r.region] || r.region || '—';
    const sec = r.section ? SECTIONS[r.section] : '—';
    const secKey = r.section || '';
    return `
      <tr>
        <td>${dt}</td>
        <td>${r.noms || '—'}</td>
        <td>${r.Statut === '1' ? 'Superviseur' : r.Statut === '2' ? 'Observateur' : '—'}</td>
        <td>${region}</td>
        <td>${r.prefecture || '—'}</td>
        <td>${r.commune || '—'}</td>
        <td><span style="font-family:var(--font-mono);font-size:12px">${r.BV || '—'}</span></td>
        <td><span class="td-badge ${sectionBadge[secKey] || ''}">${sec.replace('Section ', 'S')}</span></td>
        <td><button class="btn-detail" onclick="openDetail(${r._id || 0})">Voir</button></td>
      </tr>
    `;
  }).join('');

  // Pagination buttons
  let pag = '';
  if (pages > 1) {
    const show = 5;
    let s = Math.max(1, STATE.currentPage - Math.floor(show / 2));
    let e = Math.min(pages, s + show - 1);
    if (e - s < show - 1) s = Math.max(1, e - show + 1);
    if (s > 1) pag += `<button class="page-btn" onclick="goPage(1)">«</button>`;
    for (let p = s; p <= e; p++) {
      pag += `<button class="page-btn ${p === STATE.currentPage ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
    }
    if (e < pages) pag += `<button class="page-btn" onclick="goPage(${pages})">»</button>`;
  }
  document.getElementById('pagination').innerHTML = pag;

  // Populate region filter for table
  const regionSel = document.getElementById('tableFilterRegion');
  if (regionSel.options.length <= 1) {
    const rset = new Set(STATE.data.map(r => REGIONS[r.region] || r.region).filter(Boolean));
    [...rset].sort().forEach(rn => {
      const opt = document.createElement('option');
      opt.value = rn; opt.textContent = rn;
      regionSel.appendChild(opt);
    });
  }
}

function goPage(p) {
  STATE.currentPage = p;
  updateTable();
}

// ══════════════════════════════════════════
// CARTE INTERACTIVE
// ══════════════════════════════════════════

function initMap() {
  if (STATE.map) return;
  STATE.map = L.map('map', { zoomControl: true }).setView([10.8, -11.0], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(STATE.map);
  updateMapMarkers();
}

function parseGeoPoint(geoStr) {
  if (!geoStr) return null;
  const parts = String(geoStr).trim().split(/\s+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
  }
  return null;
}

function updateMapMarkers() {
  if (!STATE.map) return;
  STATE.mapMarkers.forEach(m => STATE.map.removeLayer(m));
  STATE.mapMarkers = [];

  const regionFilter = document.getElementById('mapFilterRegion').value;
  const sectionFilter = document.getElementById('mapFilterSection').value;

  let d = STATE.data;
  if (regionFilter) d = d.filter(r => (REGIONS[r.region] || r.region) === regionFilter);
  if (sectionFilter) d = d.filter(r => String(r.section) === sectionFilter);

  d.forEach(row => {
    let coords = parseGeoPoint(row.GeoLocalisation1) ||
                 parseGeoPoint(row.Localisation2) ||
                 parseGeoPoint(row.Localisation3);

    // Fallback: coordonnées de région + jitter
    if (!coords) {
      const rName = REGIONS[row.region];
      if (rName && REGION_COORDS[rName]) {
        const [rlat, rlng] = REGION_COORDS[rName];
        coords = [rlat + (Math.random() - 0.5) * 1.2, rlng + (Math.random() - 0.5) * 1.2];
      }
    }

    if (!coords) return;

    const hasIncident = row.rapportIrregularite === '1' || row.Q7 === '1';
    const isCritical = row.graviteRisk === '3';
    const color = isCritical ? '#ef4444' : hasIncident ? '#f59e0b' : '#10b981';

    const marker = L.circleMarker(coords, {
      radius: 8,
      fillColor: color,
      color: color,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.6
    });

    const region = REGIONS[row.region] || row.region || '—';
    const sec = SECTIONS[row.section] || '—';
    const dt = row._submission_time ? new Date(row._submission_time).toLocaleString('fr') : '—';

    marker.bindPopup(`
      <strong style="color:#1a1a2e;font-size:14px">${row.BV || 'Bureau Inconnu'}</strong><br>
      <span style="color:#6b7280;font-size:12px">${region} · ${row.prefecture || '—'}</span><br>
      <hr style="border:1px solid #e5e7eb;margin:8px 0">
      <span style="color:#6b7280;font-size:12px">Agent:</span> <span style="font-size:12px;color:#1a1a2e">${row.noms || '—'}</span><br>
      <span style="color:#6b7280;font-size:12px">Section:</span> <span style="font-size:12px;color:#1a1a2e">${sec}</span><br>
      <span style="color:#6b7280;font-size:12px">Soumis:</span> <span style="font-size:12px;color:#1a1a2e">${dt}</span>
      ${hasIncident ? `<br><span style="color:#f59e0b;font-size:11px;font-weight:600">⚠️ Incident signalé</span>` : ''}
      ${isCritical ? `<br><span style="color:#ef4444;font-size:11px;font-weight:600">🔴 Situation critique</span>` : ''}
    `);

    marker.addTo(STATE.map);
    STATE.mapMarkers.push(marker);
  });
}

// ══════════════════════════════════════════
// MODAL DÉTAIL
// ══════════════════════════════════════════

function openDetail(id) {
  const row = STATE.data.find(r => r._id === id || String(r._id) === String(id));
  if (!row) { showToast('Enregistrement introuvable', 'error'); return; }

  const region = REGIONS[row.region] || row.region || '—';
  const statut = row.Statut === '1' ? 'Superviseur' : 'Observateur';
  const sexe = row.sexe_agent === '1' ? 'Masculin' : 'Féminin';
  const section = SECTIONS[row.section] || '—';
  const dt = row._submission_time ? new Date(row._submission_time).toLocaleString('fr') : '—';

  // Votes si section 3
  let votesHtml = '';
  if (row.section === '3') {
    const partyVotes = PARTIES.filter(p => row[p.key] > 0)
      .map(p => `<div class="detail-item">
        <div class="detail-label">${p.key}</div>
        <div class="detail-val">${Number(row[p.key]).toLocaleString('fr')}</div>
      </div>`).join('');

    votesHtml = partyVotes ? `
      <div class="detail-section">
        <div class="detail-section-title">Résultats du Scrutin</div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Inscrits</div><div class="detail-val">${(row.NINS||0).toLocaleString('fr')}</div></div>
          <div class="detail-item"><div class="detail-label">Votants</div><div class="detail-val">${(row.NVOTE||0).toLocaleString('fr')}</div></div>
          <div class="detail-item"><div class="detail-label">Bulletins nuls</div><div class="detail-val">${(row.NBNUL||0).toLocaleString('fr')}</div></div>
          <div class="detail-item"><div class="detail-label">Suffrages exp.</div><div class="detail-val">${(row.NSUFFRAGE||0).toLocaleString('fr')}</div></div>
          ${partyVotes}
        </div>
      </div>
    ` : '';
  }

  document.getElementById('modalTitle').textContent = `Bureau ${row.BV || 'Inconnu'} — ${region}`;
  document.getElementById('modalBody').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Agent</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Nom</div><div class="detail-val">${row.noms || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Statut</div><div class="detail-val">${statut}</div></div>
        <div class="detail-item"><div class="detail-label">Sexe</div><div class="detail-val">${sexe}</div></div>
        <div class="detail-item"><div class="detail-label">Téléphone</div><div class="detail-val">${row.telnum || '—'}</div></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Localisation</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Région</div><div class="detail-val">${region}</div></div>
        <div class="detail-item"><div class="detail-label">Préfecture</div><div class="detail-val">${row.prefecture || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Commune</div><div class="detail-val">${row.commune || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">District/Quartier</div><div class="detail-val">${row.Quartier || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Bureau de vote</div><div class="detail-val">${row.BV || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Section</div><div class="detail-val">${section}</div></div>
      </div>
    </div>
    ${row.section === '1' ? `
    <div class="detail-section">
      <div class="detail-section-title">Ouverture du Bureau</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Heure ouverture</div><div class="detail-val">${OPEN_HR[row.openHr] || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Président présent</div><div class="detail-val">${row.presencePresiBV === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Urne vide vérifiée</div><div class="detail-val">${row.urneVide === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Nb assesseurs</div><div class="detail-val">${row.nbAssesseurs || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Délégués partis</div><div class="detail-val">${row.presenceDelegParti === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Secret vote garanti</div><div class="detail-val">${row.secretVote_isoloir === '1' ? '✅ Oui' : '❌ Non'}</div></div>
      </div>
    </div>` : ''}
    ${row.section === '2' ? `
    <div class="detail-section">
      <div class="detail-section-title">Déroulement</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Autorisé à observer</div><div class="detail-val">${row.autoriseObsr === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">BV accessible</div><div class="detail-val">${row.accessBV === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Procédures suivies</div><div class="detail-val">${row.suiviPrMmbr === '1' ? '✅ Oui' : '❌ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Forces sécurité</div><div class="detail-val">${row.forceSecurite === '1' ? '⚠️ Oui' : '✅ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Irrégularités</div><div class="detail-val">${row.rapportIrregularite === '1' ? '⚠️ Signalées' : '✅ Non'}</div></div>
        <div class="detail-item"><div class="detail-label">Inscrits liste</div><div class="detail-val">${(row.nbListElectorale||0).toLocaleString('fr')}</div></div>
      </div>
    </div>` : ''}
    ${votesHtml}
    <div class="detail-section">
      <div class="detail-section-title">Informations de soumission</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Date/heure</div><div class="detail-val">${dt}</div></div>
        <div class="detail-item"><div class="detail-label">ID</div><div class="detail-val" style="font-family:var(--font-mono)">${row._id || '—'}</div></div>
      </div>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ══════════════════════════════════════════
// EXPORT CSV
// ══════════════════════════════════════════

function exportCSV() {
  const d = STATE.filtered;
  if (d.length === 0) { showToast('Aucune donnée à exporter', 'error'); return; }

  const headers = [
    '_id', '_submission_time', 'noms', 'sexe_agent', 'Statut', 'telnum',
    'region', 'prefecture', 'commune', 'Quartier', 'BV', 'section',
    'openHr', 'rapportIrregularite', 'Q7', 'NINS', 'NVOTE', 'NBNUL', 'NSUFFRAGE',
    ...PARTIES.map(p => p.key)
  ];

  const regionNames = {};
  d.forEach(r => { regionNames[r.region] = REGIONS[r.region] || r.region; });

  const rows = d.map(r => headers.map(h => {
    let v = r[h] || '';
    if (h === 'region') v = REGIONS[r.region] || r.region || '';
    if (h === 'sexe_agent') v = r.sexe_agent === '1' ? 'Masculin' : 'Féminin';
    if (h === 'Statut') v = r.Statut === '1' ? 'Superviseur' : 'Observateur';
    if (h === 'section') v = SECTIONS[r.section] || r.section || '';
    if (h === 'openHr') v = OPEN_HR[r.openHr] || '';
    if (typeof v === 'string' && v.includes(',')) v = `"${v}"`;
    return v;
  }).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UMP2026_export_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`✅ Export CSV: ${d.length} lignes`, 'success');
}

// ══════════════════════════════════════════
// UTILITAIRES
// ══════════════════════════════════════════

function updateLastUpdateTime() {
  const now = new Date().toLocaleTimeString('fr');
  document.getElementById('lastUpdate').textContent = `Mis à jour ${now}`;
}

let toastTimeout;
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// Restore credentials from localStorage
(function restoreCredentials() {
  const t = localStorage.getItem('ump_api_token');
  const s = localStorage.getItem('ump_api_server');
  const f = localStorage.getItem('ump_api_form');
  if (t) document.getElementById('apiToken').value = t;
  if (s) {
    const sel = document.getElementById('apiServer');
    const opt = [...sel.options].find(o => o.value === s);
    if (opt) sel.value = s; else { sel.value = 'custom'; document.getElementById('customServerField').style.display = 'block'; document.getElementById('customServer').value = s; }
  }
  if (f) document.getElementById('apiFormId').value = f;
  if (t && f) STATE.apiToken = t, STATE.apiServer = s || 'https://kf.kobotoolbox.org', STATE.apiFormId = f;
})();

// CSS animation pour refresh
const style = document.createElement('style');
style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(style);
