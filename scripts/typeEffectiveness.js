// Type Effectiveness Chart Logic

const TYPE_CHART_DATA = {
  normal:   { weaknesses: ['fighting'], resistances: [], immunities: ['ghost'] },
  fire:     { weaknesses: ['water', 'ground', 'rock'], resistances: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immunities: [] },
  water:    { weaknesses: ['electric', 'grass'], resistances: ['fire', 'water', 'ice', 'steel'], immunities: [] },
  electric: { weaknesses: ['ground'], resistances: ['electric', 'flying', 'steel'], immunities: [] },
  grass:    { weaknesses: ['fire', 'ice', 'poison', 'flying', 'bug'], resistances: ['water', 'electric', 'grass', 'ground'], immunities: [] },
  ice:      { weaknesses: ['fire', 'fighting', 'rock', 'steel'], resistances: ['ice'], immunities: [] },
  fighting: { weaknesses: ['flying', 'psychic', 'fairy'], resistances: ['bug', 'rock', 'dark'], immunities: [] },
  poison:   { weaknesses: ['ground', 'psychic'], resistances: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immunities: [] },
  ground:   { weaknesses: ['water', 'grass', 'ice'], resistances: ['poison', 'rock'], immunities: ['electric'] },
  flying:   { weaknesses: ['electric', 'ice', 'rock'], resistances: ['grass', 'fighting', 'bug'], immunities: ['ground'] },
  psychic:  { weaknesses: ['bug', 'ghost', 'dark'], resistances: ['fighting', 'psychic'], immunities: [] },
  bug:      { weaknesses: ['fire', 'flying', 'rock'], resistances: ['grass', 'fighting', 'ground'], immunities: [] },
  rock:     { weaknesses: ['water', 'grass', 'fighting', 'ground', 'steel'], resistances: ['normal', 'fire', 'poison', 'flying'], immunities: [] },
  ghost:    { weaknesses: ['ghost', 'dark'], resistances: ['poison', 'bug'], immunities: ['normal', 'fighting'] },
  dragon:   { weaknesses: ['ice', 'dragon', 'fairy'], resistances: ['fire', 'water', 'electric', 'grass'], immunities: [] },
  dark:     { weaknesses: ['fighting', 'bug', 'fairy'], resistances: ['ghost', 'dark'], immunities: ['psychic'] },
  steel:    { weaknesses: ['fire', 'fighting', 'ground'], resistances: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immunities: ['poison'] },
  fairy:    { weaknesses: ['poison', 'steel'], resistances: ['fighting', 'bug', 'dark'], immunities: ['dragon'] }
};

let selectedAttackType = null;
let selectedDefenseType = null;

function renderTypeChart() {
  const chartContainer = document.getElementById('typeChartContainer');
  if (!chartContainer) return;

  chartContainer.innerHTML = `
    <div class="type-chart-header">
      <h2>Type Effectiveness Chart</h2>
      <p class="chart-subtitle">Click any type to see its offensive or defensive matchups</p>
    </div>

    <div class="type-chart-controls">
      <div class="chart-mode-selector">
        <button class="mode-btn active" data-mode="offensive" onclick="setChartMode('offensive')">
          ⚔️ Offensive
          <span class="mode-desc">What types are weak to?</span>
        </button>
        <button class="mode-btn" data-mode="defensive" onclick="setChartMode('defensive')">
          🛡️ Defensive
          <span class="mode-desc">What types resist?</span>
        </button>
      </div>
      <button class="reset-btn" onclick="resetTypeChart()" style="display:none;" id="resetChartBtn">✕ Clear Selection</button>
    </div>

    <div class="type-selector-grid" id="typeSelectorGrid">
      ${Object.keys(TYPE_CHART_DATA).map(type => `
        <button class="type-selector-btn type-${type}" data-type="${type}" onclick="selectType('${type}')">
          ${type}
        </button>
      `).join('')}
    </div>

    <div class="type-chart-results" id="typeChartResults" style="display:none;">
      <div class="effectiveness-section super-effective">
        <h3>🔥 Super Effective Against (2×)</h3>
        <div class="type-list" id="superEffectiveList"></div>
      </div>
      <div class="effectiveness-section not-very-effective">
        <h3>🛡️ Not Very Effective Against (½×)</h3>
        <div class="type-list" id="notVeryEffectiveList"></div>
      </div>
      <div class="effectiveness-section no-effect">
        <h3>❌ No Effect Against (0×)</h3>
        <div class="type-list" id="noEffectList"></div>
      </div>
    </div>

    <div class="type-chart-legend">
      <div class="legend-item">
        <span class="legend-color super"></span>
        <span>Super Effective (2×)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color resist"></span>
        <span>Not Very Effective (½×)</span>
      </div>
      <div class="legend-item">
        <span class="legend-color immune"></span>
        <span>No Effect (0×)</span>
      </div>
    </div>
  `;
}

let currentMode = 'offensive';

function setChartMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  if (selectedAttackType) {
    selectType(selectedAttackType);
  }
}

function selectType(type) {
  selectedAttackType = type;
  document.getElementById('resetChartBtn').style.display = 'block';
  
  // Highlight selected type
  document.querySelectorAll('.type-selector-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.type === type);
  });

  if (currentMode === 'offensive') {
    showOffensiveMatchups(type);
  } else {
    showDefensiveMatchups(type);
  }

  document.getElementById('typeChartResults').style.display = 'block';
}

function showOffensiveMatchups(attackType) {
  // Calculate which types this attack type is super effective against
  const superEffective = [];
  const notVeryEffective = [];
  const noEffect = [];

  Object.keys(TYPE_CHART_DATA).forEach(defenseType => {
    const data = TYPE_CHART_DATA[defenseType];
    
    if (data.immunities.includes(attackType)) {
      noEffect.push(defenseType);
    } else if (data.weaknesses.includes(attackType)) {
      superEffective.push(defenseType);
    } else if (data.resistances.includes(attackType)) {
      notVeryEffective.push(defenseType);
    }
  });

  renderMatchupLists(superEffective, notVeryEffective, noEffect);
}

function showDefensiveMatchups(defenseType) {
  const data = TYPE_CHART_DATA[defenseType];
  
  renderMatchupLists(
    data.weaknesses,
    data.resistances,
    data.immunities
  );
}

function renderMatchupLists(superEffective, notVeryEffective, noEffect) {
  const renderList = (types, elementId) => {
    const element = document.getElementById(elementId);
    if (types.length === 0) {
      element.innerHTML = '<span class="no-types">None</span>';
    } else {
      element.innerHTML = types.map(type => 
        `<span class="type-badge type-${type}">${type}</span>`
      ).join('');
    }
  };

  renderList(superEffective, 'superEffectiveList');
  renderList(notVeryEffective, 'notVeryEffectiveList');
  renderList(noEffect, 'noEffectList');
}

function resetTypeChart() {
  selectedAttackType = null;
  document.getElementById('resetChartBtn').style.display = 'none';
  document.getElementById('typeChartResults').style.display = 'none';
  document.querySelectorAll('.type-selector-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
}

// Initialize on type chart tab
function initTypeChart() {
  renderTypeChart();
}
