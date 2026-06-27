/* ═══════════════════════════════════════════════════════════
   AlgoTime Analyzer – script.js
   Sorting module + Search module (BFS / GBFS / A*)
   ═══════════════════════════════════════════════════════════ */

const API_BASE = 'http://127.0.0.1:5000';

/* ── Default parameter values ── */
const DEFAULT_H = { A:7, B:6, C:4, D:4, E:2, F:1, G:0 };
const DEFAULT_W = { 'A-B':2, 'A-C':1, 'B-D':3, 'B-E':1, 'C-F':2, 'D-G':2, 'E-G':3, 'F-G':1 };

/* Edge id lookup for SVG highlighting */
const EDGE_MAP = {
  'A-B':'edge-A-B','A-C':'edge-A-C',
  'B-D':'edge-B-D','B-E':'edge-B-E',
  'C-F':'edge-C-F',
  'D-G':'edge-D-G','E-G':'edge-E-G','F-G':'edge-F-G',
};

/* Stored last search results for path toggle */
let lastSearchData = null;


/* ════════════════════════════════════════════════════════════
   TAB SWITCHING
   ════════════════════════════════════════════════════════════ */

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const t = btn.dataset.tab;
    document.getElementById('sortingTab').classList.toggle('hidden', t !== 'sorting');
    document.getElementById('searchTab').classList.toggle('hidden',  t !== 'search');
  });
});


/* ════════════════════════════════════════════════════════════
   SORTING MODULE
   ════════════════════════════════════════════════════════════ */

const numberInput    = document.getElementById('numberInput');
const inputMeta      = document.getElementById('inputMeta');
const loaderWrap     = document.getElementById('loaderWrap');
const resultsSection = document.getElementById('resultsSection');
let sortChart = null;

function parseNumbers(text) {
  return text.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
}

function updateMeta() {
  const n = parseNumbers(numberInput.value.trim());
  inputMeta.textContent = numberInput.value.trim()
    ? (n.length ? `${n.length} number${n.length !== 1 ? 's' : ''} detected` : 'No valid numbers')
    : '';
}

numberInput.addEventListener('input', updateMeta);

document.getElementById('randomBtn').addEventListener('click', () => {
  const nums = Array.from({length:100}, () => Math.floor(Math.random()*10000)+1);
  numberInput.value = nums.join(', ');
  updateMeta();
});

document.getElementById('clearBtn').addEventListener('click', () => {
  numberInput.value = '';
  inputMeta.textContent = '';
  resultsSection.classList.add('hidden');
  if (sortChart) { sortChart.destroy(); sortChart = null; }
  ['bubbleCard','mergeCard','insertionCard'].forEach(id =>
    document.getElementById(id).classList.remove('fastest'));
});

document.getElementById('compareBtn').addEventListener('click', async () => {
  const numbers = parseNumbers(numberInput.value);
  if (numbers.length < 2) { setMeta('Enter at least 2 numbers.', '#EF4444'); return; }

  setSortLoading(true);
  try {
    const res  = await fetch(`${API_BASE}/compare`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({numbers}),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || `HTTP ${res.status}`);
    renderSortResults(await res.json());
  } catch (e) {
    setMeta(`Error: ${e.message}`, '#EF4444');
  } finally {
    setSortLoading(false);
  }
});

function setMeta(msg, color='') {
  inputMeta.textContent = msg;
  inputMeta.style.color = color;
  if (color) setTimeout(() => { inputMeta.style.color=''; updateMeta(); }, 3000);
}

function setSortLoading(on) {
  loaderWrap.classList.toggle('visible', on);
  document.getElementById('compareBtn').disabled = on;
  document.getElementById('randomBtn').disabled  = on;
}

function renderSortResults(data) {
  const toMs = s => (s*1000).toFixed(4);
  document.getElementById('bubbleTime').textContent    = toMs(data.bubble_time);
  document.getElementById('mergeTime').textContent     = toMs(data.merge_time);
  document.getElementById('insertionTime').textContent = toMs(data.insertion_time);

  const cardMap = {'Bubble Sort':'bubbleCard','Merge Sort':'mergeCard','Insertion Sort':'insertionCard'};
  ['bubbleCard','mergeCard','insertionCard'].forEach(id =>
    document.getElementById(id).classList.remove('fastest'));
  if (cardMap[data.winner]) document.getElementById(cardMap[data.winner]).classList.add('fastest');

  const COMPLEXITY = {'Bubble Sort':'O(n²)','Merge Sort':'O(n log n)','Insertion Sort':'O(n²)'};
  const winMs = {'Bubble Sort':data.bubble_time,'Merge Sort':data.merge_time,'Insertion Sort':data.insertion_time};
  document.getElementById('winnerName').textContent       = data.winner;
  document.getElementById('winnerTime').textContent       = `${toMs(winMs[data.winner])} ms`;
  document.getElementById('winnerComplexity').textContent = COMPLEXITY[data.winner] || '—';

  const times  = [toMs(data.bubble_time), toMs(data.merge_time), toMs(data.insertion_time)];
  const labels = ['Bubble Sort','Merge Sort','Insertion Sort'];
  if (sortChart) sortChart.destroy();
  sortChart = new Chart(document.getElementById('algoChart').getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Time (ms)', data: times,
        backgroundColor: labels.map(l => l===data.winner ? 'rgba(34,197,94,0.75)' : 'rgba(56,189,248,0.6)'),
        borderColor: labels.map(l => l===data.winner ? '#22C55E' : '#38BDF8'),
        borderWidth:1.5, borderRadius:6, borderSkipped:false,
      }],
    },
    options: chartOptions('ms'),
  });

  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({behavior:'smooth', block:'start'});
}


/* ════════════════════════════════════════════════════════════
   SEARCH MODULE
   ════════════════════════════════════════════════════════════ */

const searchLoaderWrap     = document.getElementById('searchLoaderWrap');
const searchResultsSection = document.getElementById('searchResultsSection');
const pathToggleRow        = document.getElementById('pathToggleRow');
let searchTimeChart  = null;
let searchNodesChart = null;

/* ── SVG label sync (live update as user types) ── */
function syncSVGLabels() {
  Object.keys(DEFAULT_H).forEach(node => {
    const input = document.getElementById(`h-${node}`);
    const label = document.getElementById(`nh-${node}`);
    if (input && label) label.textContent = `h=${input.value}`;
  });
  Object.keys(DEFAULT_W).forEach(edge => {
    const input = document.getElementById(`w-${edge}`);
    const label = document.getElementById(`ew-${edge}`);
    if (input && label) label.textContent = input.value;
  });
}

document.querySelectorAll('.param-input').forEach(el => {
  el.addEventListener('input', syncSVGLabels);
});

/* ── Reset params to defaults ── */
document.getElementById('resetParamsBtn').addEventListener('click', () => {
  Object.entries(DEFAULT_H).forEach(([k,v]) => {
    const el = document.getElementById(`h-${k}`); if (el) el.value = v;
  });
  Object.entries(DEFAULT_W).forEach(([k,v]) => {
    const el = document.getElementById(`w-${k}`); if (el) el.value = v;
  });
  syncSVGLabels();
});

/* ── Read current params from inputs ── */
function readParams() {
  const heuristics = {};
  Object.keys(DEFAULT_H).forEach(node => {
    const el = document.getElementById(`h-${node}`);
    heuristics[node] = el ? (parseFloat(el.value) || 0) : DEFAULT_H[node];
  });
  const weights = {};
  Object.keys(DEFAULT_W).forEach(edge => {
    const el = document.getElementById(`w-${edge}`);
    weights[edge] = el ? (parseFloat(el.value) || 1) : DEFAULT_W[edge];
  });
  return {heuristics, weights};
}

/* ── Graph highlight helpers ── */
function setNodeState(nodeId, state) {
  const el = document.getElementById(`node-${nodeId}`);
  if (el) el.dataset.state = state;
}

function setEdgeState(edgeKey, state) {
  const el = document.getElementById(edgeKey);
  if (el) el.dataset.state = state;
}

function clearGraphHighlights() {
  ['B','C','D','E','F'].forEach(n => setNodeState(n, 'default'));
  setNodeState('A', 'start');
  setNodeState('G', 'goal');
  Object.values(EDGE_MAP).forEach(id => setEdgeState(id, 'default'));
}

function highlightPath(algo, data) {
  clearGraphHighlights();
  if (algo === 'none') return;

  const algoData = {bfs: data.bfs, gbfs: data.gbfs, astar: data.astar}[algo];
  if (!algoData) return;

  const path  = algoData.path;
  const state = `path-${algo}`;

  path.forEach(node => setNodeState(node, state));
  for (let i = 0; i < path.length - 1; i++) {
    const eid = EDGE_MAP[`${path[i]}-${path[i+1]}`];
    if (eid) setEdgeState(eid, state);
  }
}

/* ── Path toggle buttons ── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.path-btn');
  if (!btn || !lastSearchData) return;

  document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  highlightPath(btn.dataset.algo, lastSearchData);
});

/* ── Main: run comparison ── */
document.getElementById('searchCompareBtn').addEventListener('click', async () => {
  const {heuristics, weights} = readParams();

  setSearchLoading(true);
  try {
    const res = await fetch(`${API_BASE}/search_compare`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({heuristics, weights}),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}. Is Flask running?`);
    const data = await res.json();
    lastSearchData = data;

    clearGraphHighlights();
    renderSearchResults(data);

    // Default: show winner's path on graph
    const algoKey = {BFS:'bfs', GBFS:'gbfs', 'A*':'astar'}[data.winner] || 'astar';
    highlightPath(algoKey, data);

    // Activate the matching toggle button
    pathToggleRow.classList.remove('hidden');
    document.querySelectorAll('.path-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.algo === algoKey);
    });

  } catch (e) {
    alert(`Error: ${e.message}`);
  } finally {
    setSearchLoading(false);
  }
});

function setSearchLoading(on) {
  searchLoaderWrap.classList.toggle('visible', on);
  document.getElementById('searchCompareBtn').disabled = on;
}

/* ── Render all search results ── */
function renderSearchResults(data) {
  const toMs = s => (s * 1000).toFixed(4);
  const seq  = arr => arr.join(' → ');

  // BFS card
  document.getElementById('bfsResultTime').textContent  = toMs(data.bfs.time);
  document.getElementById('bfsNodes').textContent       = data.bfs.nodes_visited;
  document.getElementById('bfsHops').textContent        = data.bfs.path_length - 1;
  document.getElementById('bfsCost').textContent        = data.bfs.path_cost;
  document.getElementById('bfsVisited').textContent     = seq(data.bfs.visited);
  document.getElementById('bfsFoundPath').textContent   = seq(data.bfs.path);

  // GBFS card
  document.getElementById('gbfsResultTime').textContent = toMs(data.gbfs.time);
  document.getElementById('gbfsNodes').textContent      = data.gbfs.nodes_visited;
  document.getElementById('gbfsHops').textContent       = data.gbfs.path_length - 1;
  document.getElementById('gbfsCost').textContent       = data.gbfs.path_cost;
  document.getElementById('gbfsVisited').textContent    = seq(data.gbfs.visited);
  document.getElementById('gbfsFoundPath').textContent  = seq(data.gbfs.path);

  // A* card
  document.getElementById('astarResultTime').textContent = toMs(data.astar.time);
  document.getElementById('astarNodes').textContent      = data.astar.nodes_visited;
  document.getElementById('astarHops').textContent       = data.astar.path_length - 1;
  document.getElementById('astarCost').textContent       = data.astar.path_cost;
  document.getElementById('astarVisited').textContent    = seq(data.astar.visited);
  document.getElementById('astarFoundPath').textContent  = seq(data.astar.path);

  // Highlight fastest card
  const cardMap = {BFS:'bfsResultCard', GBFS:'gbfsResultCard', 'A*':'astarResultCard'};
  ['bfsResultCard','gbfsResultCard','astarResultCard'].forEach(id =>
    document.getElementById(id).classList.remove('fastest'));
  if (cardMap[data.winner]) document.getElementById(cardMap[data.winner]).classList.add('fastest');

  // Winner card
  const wd = {BFS:data.bfs, GBFS:data.gbfs, 'A*':data.astar}[data.winner];
  document.getElementById('searchWinnerName').textContent   = data.winner;
  document.getElementById('searchWinnerTime').textContent   = `${toMs(wd.time)} ms`;
  document.getElementById('searchWinnerNodes').textContent  = `${wd.nodes_visited} nodes visited`;
  document.getElementById('searchWinnerCost').textContent   = `Path cost: ${wd.path_cost}`;
  document.getElementById('searchWinnerReason').textContent = data.winner_reason;

  // Charts
  const labels   = ['BFS','GBFS','A*'];
  const winner   = data.winner;
  const bgColor  = l => l===winner ? 'rgba(34,197,94,0.75)' : ({BFS:'rgba(56,189,248,0.6)',GBFS:'rgba(139,92,246,0.6)','A*':'rgba(34,197,94,0.5)'}[l]);
  const brColor  = l => ({BFS:'#38BDF8',GBFS:'#8B5CF6','A*':'#22C55E'}[l]);

  const timesMs = [toMs(data.bfs.time), toMs(data.gbfs.time), toMs(data.astar.time)];
  const nodes   = [data.bfs.nodes_visited, data.gbfs.nodes_visited, data.astar.nodes_visited];

  if (searchTimeChart)  searchTimeChart.destroy();
  if (searchNodesChart) searchNodesChart.destroy();

  searchTimeChart = new Chart(document.getElementById('searchTimeChart').getContext('2d'), {
    type:'bar',
    data:{ labels, datasets:[{label:'Time (ms)', data:timesMs,
      backgroundColor:labels.map(bgColor), borderColor:labels.map(brColor),
      borderWidth:1.5, borderRadius:6, borderSkipped:false}] },
    options: chartOptions('ms'),
  });

  searchNodesChart = new Chart(document.getElementById('searchNodesChart').getContext('2d'), {
    type:'bar',
    data:{ labels, datasets:[{label:'Nodes Visited', data:nodes,
      backgroundColor:labels.map(bgColor), borderColor:labels.map(brColor),
      borderWidth:1.5, borderRadius:6, borderSkipped:false}] },
    options: chartOptions('nodes'),
  });

  searchResultsSection.classList.remove('hidden');
  searchResultsSection.scrollIntoView({behavior:'smooth', block:'start'});
}


/* ════════════════════════════════════════════════════════════
   SHARED CHART OPTIONS
   ════════════════════════════════════════════════════════════ */

function chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {duration: 600, easing: 'easeOutQuart'},
    plugins: {
      legend: {display: false},
      tooltip: {
        backgroundColor: 'rgba(15,23,42,0.92)',
        borderColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1, padding: 10,
        titleColor: '#E2E8F0', bodyColor: '#94A3B8',
        callbacks: { label: ctx => ` ${ctx.parsed.y} ${unit}` },
      },
    },
    scales: {
      x: {
        grid: {display:false},
        ticks: {color:'#64748B', font:{size:12}},
        border: {color:'rgba(255,255,255,0.05)'},
      },
      y: {
        grid:  {color:'rgba(255,255,255,0.04)'},
        ticks: {color:'#64748B', font:{size:11}, callback: v => `${v} ${unit}`},
        border:{color:'rgba(255,255,255,0.05)'},
      },
    },
  };
}
