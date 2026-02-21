// Team Builder Logic - Complete Enhanced Version with Error Boundaries

(function() {
  'use strict';

  let currentTeam = [];
  let savedTeams = {};
  let currentTeamName = 'default';
  const MAX_TEAM_SIZE = 6;
  let currentSelectorTab = 'favorites';

  let suggestionFilters = {
    allowLegendaries: JSON.parse(localStorage.getItem('cobblePulse_allowLegendaries') || 'true'),
    difficulty: localStorage.getItem('cobblePulse_difficulty') || 'balanced'
  };

  if (typeof window.favorites === 'undefined') {
    window.favorites = JSON.parse(localStorage.getItem('cobblePulseFavorites') || '[]');
  }

  function saveSuggestionFilters() {
    localStorage.setItem('cobblePulse_allowLegendaries', suggestionFilters.allowLegendaries);
    localStorage.setItem('cobblePulse_difficulty', suggestionFilters.difficulty);
  }

  function loadTeam() {
    const saved = localStorage.getItem('cobblePulseTeams');
    if (saved) {
      try {
        savedTeams = JSON.parse(saved);
        currentTeam = savedTeams[currentTeamName] || [];
      } catch (e) {
        savedTeams = { default: [] };
        currentTeam = [];
      }
    } else {
      const oldTeam = localStorage.getItem('cobblePulseTeam');
      if (oldTeam) {
        try {
          savedTeams = { default: JSON.parse(oldTeam) };
          currentTeam = savedTeams.default;
          localStorage.removeItem('cobblePulseTeam');
        } catch (e) {
          savedTeams = { default: [] };
          currentTeam = [];
        }
      }
    }
  }

  function saveTeam() {
    savedTeams[currentTeamName] = currentTeam.filter(p => p !== null);
    localStorage.setItem('cobblePulseTeams', JSON.stringify(savedTeams));
  }

  window.initTeamBuilder = function() {
    try {
      const container = document.getElementById('teamBuilderContainer');
      if (!container) return;
      loadTeam();
      renderTeamBuilder();
    } catch (error) {
      const container = document.getElementById('teamBuilderContainer');
      if (container) {
        container.innerHTML = `
          <div class="empty-team-message">
            <div class="empty-icon">⚠️</div>
            <h3>Error loading team builder</h3>
            <p>${error.message}</p>
          </div>`;
      }
    }
  };

  if (typeof window.isMegaForm === 'undefined') {
    window.isMegaForm = function(cleanName) {
      return cleanName && cleanName.includes('mega') && !cleanName.includes('meganium');
    };
  }

  // ============================================================
  // TYPE CHART HELPERS
  // ============================================================
  function getOffensiveEffectiveness(attackType, defenderTypes) {
    const TYPE_CHART = window.TYPE_CHART_DATA;
    if (!TYPE_CHART) return 1;
    let mult = 1;
    defenderTypes.forEach(defType => {
      const data = TYPE_CHART[defType];
      if (!data) return;
      if (data.immunities && data.immunities.includes(attackType)) mult *= 0;
      else if (data.weaknesses && data.weaknesses.includes(attackType)) mult *= 2;
      else if (data.resistances && data.resistances.includes(attackType)) mult *= 0.5;
    });
    return mult;
  }

  function getSingleEffectiveness(attackType, defType) {
    const TYPE_CHART = window.TYPE_CHART_DATA;
    if (!TYPE_CHART || !TYPE_CHART[defType]) return 1;
    const data = TYPE_CHART[defType];
    if (data.immunities && data.immunities.includes(attackType)) return 0;
    if (data.weaknesses && data.weaknesses.includes(attackType)) return 2;
    if (data.resistances && data.resistances.includes(attackType)) return 0.5;
    return 1;
  }

  function getDefensiveEffectiveness(attackType, defenderTypes) {
    return getOffensiveEffectiveness(attackType, defenderTypes);
  }

  function getSTABCoverage(types) {
    const TYPE_CHART = window.TYPE_CHART_DATA;
    if (!TYPE_CHART) return new Set();
    const covered = new Set();
    Object.keys(TYPE_CHART).forEach(defType => {
      types.forEach(attackType => {
        if (getOffensiveEffectiveness(attackType, [defType]) >= 2) {
          covered.add(defType);
        }
      });
    });
    return covered;
  }

  // ============================================================
  // ABILITY HELPER
  // ============================================================
  function getAbilityText(pokemon) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const fullData = allPokemonData[pokemon.cleanName];
    if (!fullData || !fullData.abilities) return null;
    const abilities = fullData.abilities;
    if (Array.isArray(abilities)) {
      const names = abilities.map(a => {
        if (typeof a === 'string') return a;
        if (a && typeof a === 'object') {
          if (a.name) return a.name;
          if (a.ability && a.ability.name) return a.ability.name;
        }
        return null;
      }).filter(Boolean);
      return names.length > 0 ? names.slice(0, 2).join(' / ') : null;
    }
    if (typeof abilities === 'string') return abilities;
    if (abilities && typeof abilities === 'object') {
      if (abilities.name) return abilities.name;
      if (abilities.ability && abilities.ability.name) return abilities.ability.name;
    }
    return null;
  }

  // ============================================================
  // ROLE CLASSIFICATION
  // ============================================================
  function determineRole(pokemon) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const fullData = allPokemonData[pokemon.cleanName];
    if (!fullData?.stats) return 'Unknown';

    const s = fullData.stats;
    const atk = s.attack || 0;
    const spa = s['special-attack'] || 0;
    const def = s.defense || 0;
    const spd = s['special-defense'] || 0;
    const hp  = s.hp || 0;
    const spe = s.speed || 0;

    const bestOffense  = Math.max(atk, spa);
    const bulkScore    = hp * (def + spd) / 250;
    const offenseScore = bestOffense;

    const bst = atk + spa + def + spd + hp + spe;
    if (offenseScore < 80 && bulkScore > 60) return 'Support/Utility';
    if (bst < 430) return 'Support/Utility';
    if (bulkScore >= 90 && offenseScore < 110) return 'Wall/Tank';
    if (spe >= 100 && offenseScore >= 100) return 'Fast Sweeper';
    if (bulkScore >= 65 && offenseScore >= 90) return 'Bulky Attacker';
    if (offenseScore >= 110 && spe < 100) return 'Slow Sweeper';
    return 'Balanced';
  }

  function getRoleIcon(role) {
    const icons = {
      'Fast Sweeper':    '⚡',
      'Slow Sweeper':    '💥',
      'Wall/Tank':       '🛡️',
      'Bulky Attacker':  '🔨',
      'Support/Utility': '✨',
      'Balanced':        '⚖️',
      'Unknown':         '❓'
    };
    return icons[role] || '❓';
  }

  // ============================================================
  // TIER QUALITY SCORE
  // ============================================================
  const TIER_SCORES = {
    'ubers':    20,
    'ou':       16,
    'uu':       12,
    'ru':        9,
    'nu':        6,
    'pu':        4,
    'zu':        2,
    'lc':        1,
    'Untiered':  0
  };

  const TIER_MIN_USAGE = {
    'ubers': 1.0,
    'ou':    1.0,
    'uu':    1.0,
    'ru':    0.5,
    'nu':    0.5,
    'pu':    0.5,
    'zu':    0.5,
    'lc':    0.5
  };

  const IGNORED_TIERS = new Set([
    'vgc2025', 'vgc2024', 'doublesou', 'monotype', 'nationaldex',
    'nationaldexuu', 'nationaldexru', 'nationaldexmonotype', 'nationaldexdoubles',
    'godlygift', 'balancedhackmons', 'stabmons', 'battlestadiumsingles',
    'ubersuu', '1v1', 'nfe'
  ]);

  function getTierScore(pokemon) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const fullData = allPokemonData[pokemon.cleanName];
    if (!fullData?.allRanks || fullData.allRanks.length === 0) {
      return { score: 0, tierLabel: 'Untiered' };
    }

    let bestScore = 0;
    let bestTier  = 'Untiered';
    let bestUsage = 0;

    fullData.allRanks.forEach(entry => {
      const tier = entry.tier;
      if (IGNORED_TIERS.has(tier)) return;
      const usage    = parseFloat(entry.usage) || 0;
      const minUsage = TIER_MIN_USAGE[tier] ?? 0.5;
      if (usage < minUsage) return;
      const base = TIER_SCORES[tier] ?? 0;
      if (base > bestScore || (base === bestScore && usage > bestUsage)) {
        bestScore = base;
        bestTier  = tier;
        bestUsage = usage;
      }
    });

    const usageBonus = Math.min(bestUsage / 3, 5);
    const totalScore = Math.round(bestScore + usageBonus);
    return { score: totalScore, tierLabel: bestTier };
  }

  function formatTierLabel(tierLabel) {
    const map = {
      'ubers': '🔥 Ubers',
      'ou':    '⚡ OU',
      'uu':    '🟡 UU',
      'ru':    '🟠 RU',
      'nu':    '🟢 NU',
      'pu':    '🔵 PU',
      'zu':    '⚪ ZU',
      'lc':    '🐣 LC',
      'Untiered': '— Untiered'
    };
    return map[tierLabel] || tierLabel;
  }

  // ============================================================
  // RENDER
  // ============================================================
  function renderTeamBuilder() {
    const container = document.getElementById('teamBuilderContainer');
    if (!container) return;

    const teamNames = Object.keys(savedTeams);
    const teamSelector = teamNames.length > 1 ? `
      <div class="team-selector">
        <label>Current Team:</label>
        <select id="teamSelect" onchange="switchTeam(this.value)">
          ${teamNames.map(name => `<option value="${name}" ${name === currentTeamName ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
        <button class="team-mgmt-btn" onclick="showNewTeamModal()" title="New Team">+ New</button>
        <button class="team-mgmt-btn" onclick="renameCurrentTeam()" title="Rename Team">✏️</button>
        <button class="team-mgmt-btn" onclick="deleteCurrentTeam()" title="Delete Team">🗑️</button>
      </div>` : '';

    const filledCount = currentTeam.filter(p => p).length;

    container.innerHTML = `
      <div class="team-builder-header">
        <h2>⚔️ Team Builder</h2>
        <p class="team-subtitle">Build your competitive team and analyze coverage</p>
        ${teamSelector}
      </div>

      <div class="team-actions">
        <button class="team-action-btn export-btn" onclick="exportTeam()" ${filledCount === 0 ? 'disabled' : ''}>📤 Export Team</button>
        <button class="team-action-btn import-btn" onclick="showImportModal()">📥 Import Team</button>
        <button class="team-action-btn template-btn" onclick="showTemplatesModal()">📋 Templates</button>
        <button class="team-action-btn clear-btn" onclick="confirmClearTeam()" ${filledCount === 0 ? 'disabled' : ''}>🗑️ Clear</button>
      </div>

      <div class="suggestion-filters-bar">
        <div class="filters-content">
          <span class="filters-label">🎯 Suggestion Settings:</span>
          <label class="filter-checkbox">
            <input type="checkbox" id="globalAllowLegendaries" ${suggestionFilters.allowLegendaries ? 'checked' : ''} onchange="updateSuggestionFilters()">
            <span>Allow Legendaries</span>
          </label>
          <select id="globalDifficulty" onchange="updateSuggestionFilters()" class="filter-select">
            <option value="competitive" ${suggestionFilters.difficulty === 'competitive' ? 'selected' : ''}>Competitive</option>
            <option value="balanced" ${suggestionFilters.difficulty === 'balanced' ? 'selected' : ''}>Balanced</option>
            <option value="easy" ${suggestionFilters.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          </select>
        </div>
      </div>

      <div class="team-slots" id="teamSlots">${renderTeamSlots()}</div>

      ${filledCount > 0 ? `
        <div class="team-analysis">
          <div class="analysis-section role-section">
            <h3>🎯 Team Roles</h3>
            <p class="analysis-desc">Role distribution based on base stats</p>
            ${renderTeamRoles()}
          </div>
          <div class="analysis-section coverage-section">
            <h3>⚔️ Type Coverage</h3>
            <p class="analysis-desc">Types your team's STAB moves hit super-effectively</p>
            ${renderTypeCoverage()}
          </div>
          <div class="analysis-section weakness-section">
            <h3>🛡️ Defensive Analysis</h3>
            <p class="analysis-desc">Weaknesses, resistances, and immunities</p>
            ${renderDefensiveAnalysis()}
          </div>
          <div class="analysis-section stats-section">
            <h3>📊 Team Statistics</h3>
            ${renderTeamStats()}
          </div>
        </div>` : `
        <div class="empty-team-message">
          <div class="empty-icon">⚔️</div>
          <h3>Your team is empty</h3>
          <p>Click + to add Pokémon, or try a template to get started</p>
          <button class="btn-primary" onclick="showTemplatesModal()" style="margin-top:15px;">📋 Browse Templates</button>
        </div>`}
    `;
    
    // Bug fix #22: Re-initialize drag-and-drop after every render
    // This ensures drag functionality persists across all state changes
    initDragAndDrop();
  }

  window.updateSuggestionFilters = function() {
    suggestionFilters.allowLegendaries = document.getElementById('globalAllowLegendaries').checked;
    suggestionFilters.difficulty = document.getElementById('globalDifficulty').value;
    saveSuggestionFilters();
  };

  function renderTeamSlots() {
    let html = '';
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const pokemon = currentTeam[i];
      if (pokemon) {
        const types   = pokemon.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
        const role    = determineRole(pokemon);
        const abilityText = getAbilityText(pokemon);
        html += `
          <div class="team-slot filled" draggable="true" data-slot="${i}">
            <button class="remove-slot-btn" onclick="removeFromTeam(${i})" title="Remove">✕</button>
            <div class="slot-role-badge" title="${role}">${getRoleIcon(role)}</div>
            <img src="${pokemon.sprite}" alt="${pokemon.name}" class="slot-sprite" loading="lazy">
            <div class="slot-info">
              <div class="slot-name">${pokemon.name}</div>
              <div class="slot-types">${types}</div>
              ${abilityText ? `<div class="slot-ability">${abilityText}</div>` : ''}
            </div>
            <button class="view-details-btn" onclick="openModal(${pokemon.id}, '${pokemon.cleanName}')" title="Details">ℹ️</button>
          </div>`;
      } else {
        html += `
          <div class="team-slot empty" data-slot="${i}">
            <div class="slot-suggestion-btns">
              <button class="suggest-btn" onclick="showSmartSuggestion(${i})">
                <span class="btn-icon">💡</span><span class="btn-text">Suggest</span>
              </button>
              <button class="random-btn" onclick="showRandomSuggestion(${i})">
                <span class="btn-icon">🎲</span><span class="btn-text">Random</span>
              </button>
            </div>
            <div class="empty-slot-content" onclick="showPokemonSelector(${i})" style="cursor:pointer;">
              <span class="plus-icon">+</span>
              <span class="slot-label">Add Pokémon</span>
            </div>
          </div>`;
      }
    }
    return html;
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================
  let draggedSlot = null;

  function initDragAndDrop() {
    document.querySelectorAll('.team-slot.filled').forEach(slot => {
      slot.addEventListener('dragstart', handleDragStart);
      slot.addEventListener('dragover',  handleDragOver);
      slot.addEventListener('drop',      handleDrop);
      slot.addEventListener('dragend',   handleDragEnd);
    });
  }

  function handleDragStart(e) {
    draggedSlot = parseInt(e.currentTarget.dataset.slot);
    e.currentTarget.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
  }
  function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const target = parseInt(e.currentTarget.dataset.slot);
    if (draggedSlot !== null && draggedSlot !== target) {
      [currentTeam[draggedSlot], currentTeam[target]] = [currentTeam[target], currentTeam[draggedSlot]];
      saveTeam();
      renderTeamBuilder();
    }
    return false;
  }
  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedSlot = null;
  }

  // ============================================================
  // TEAM ROLES (with error boundary - Recommendation 5)
  // ============================================================
  function renderTeamRoles() {
    try {
      const roles    = {};
      const warnings = [];
      const filled   = currentTeam.filter(p => p);

      filled.forEach(pokemon => {
        const role = determineRole(pokemon);
        if (!roles[role]) roles[role] = [];
        roles[role].push(pokemon.name);
      });

      if (filled.length >= 4) {
        const sweepers = (roles['Fast Sweeper']?.length || 0) + (roles['Slow Sweeper']?.length || 0);
        const walls    = (roles['Wall/Tank']?.length || 0) + (roles['Support/Utility']?.length || 0);
        if (sweepers === 0)  warnings.push('⚠️ No offensive threats — easy to wall');
        if (walls === 0)     warnings.push('⚠️ No defensive core — fragile team');
        if (sweepers >= filled.length - 1) warnings.push('⚠️ Too offense-heavy — add a wall or support');
        if (walls >= filled.length - 1)    warnings.push('⚠️ Very passive team — add some offensive presence');
      }

      const typeCount = {};
      filled.forEach(p => p.types.forEach(t => { typeCount[t] = (typeCount[t] || 0) + 1; }));
      Object.entries(typeCount).forEach(([type, count]) => {
        if (count >= 3) warnings.push(`⚠️ ${count}× ${type}-type — shared weakness risk`);
      });

      return `
        <div class="role-distribution">
          ${Object.entries(roles).map(([role, pokes]) => `
            <div class="role-item">
              <span class="role-icon">${getRoleIcon(role)}</span>
              <div class="role-info">
                <span class="role-name">${role}</span>
                <span class="role-pokemon">${pokes.join(', ')}</span>
              </div>
            </div>`).join('')}
        </div>
        ${warnings.length > 0
          ? `<div class="role-warnings">${warnings.map(w => `<div class="role-warning">${w}</div>`).join('')}</div>`
          : (filled.length >= 4 ? '<div class="role-balanced">✅ Well-balanced team!</div>' : '')}`;
    } catch (error) {
      console.error('Error rendering team roles:', error);
      return '<p style="color:#ef4444;">⚠️ Error analyzing team roles. Try reloading the page.</p>';
    }
  }

  // ============================================================
  // TYPE COVERAGE (with error boundary - Recommendation 4)
  // ============================================================
  function renderTypeCoverage() {
    try {
      const TYPE_CHART = window.TYPE_CHART_DATA;
      if (!TYPE_CHART) return '<p>Type chart not loaded</p>';

      const coverage = {};
      currentTeam.forEach(pokemon => {
        if (!pokemon) return;
        pokemon.types.forEach(attackType => {
          Object.keys(TYPE_CHART).forEach(defType => {
            if (getSingleEffectiveness(attackType, defType) >= 2) {
              if (!coverage[defType]) coverage[defType] = new Set();
              coverage[defType].add(`${pokemon.name} (${attackType})`);
            }
          });
        });
      });

      const coveredTypes   = Object.keys(coverage);
      const uncoveredTypes = Object.keys(TYPE_CHART).filter(t => !coverage[t]);
      const pct = Math.round((coveredTypes.length / Object.keys(TYPE_CHART).length) * 100);

      return `
        <div class="coverage-stats">
          <div class="coverage-meter">
            <div class="coverage-meter-fill" style="width:${pct}%"></div>
            <span class="coverage-meter-text">${pct}% STAB Coverage (${coveredTypes.length}/${Object.keys(TYPE_CHART).length})</span>
          </div>
        </div>
        <div class="coverage-grid">
          ${coveredTypes.sort().map(type => `
            <div class="coverage-item" title="${Array.from(coverage[type]).join('\n')}">
              <span class="type-badge type-${type}">${type}</span>
              <span class="coverage-count">${coverage[type].size}</span>
            </div>`).join('')}
        </div>
        ${uncoveredTypes.length > 0 ? `
          <div class="uncovered-section">
            <h4>⚠️ Not covered via STAB (${uncoveredTypes.length})</h4>
            <div class="coverage-grid">
              ${uncoveredTypes.sort().map(t => `<span class="type-badge type-${t} uncovered-badge">${t}</span>`).join('')}
            </div>
          </div>` : '<div class="perfect-coverage">🎯 Full STAB coverage!</div>'}`;
    } catch (error) {
      console.error('Error rendering type coverage:', error);
      return '<p style="color:#ef4444;">⚠️ Error analyzing type coverage. Try reloading the page.</p>';
    }
  }

  // ============================================================
  // DEFENSIVE ANALYSIS (with error boundary - Recommendation 4)
  // ============================================================
  function renderDefensiveAnalysis() {
    try {
      const TYPE_CHART = window.TYPE_CHART_DATA;
      if (!TYPE_CHART) return '<p>Type chart not loaded</p>';

      const weaknesses  = {};
      const resistances = {};
      const immunities  = {};

      currentTeam.forEach(pokemon => {
        if (!pokemon) return;
        Object.keys(TYPE_CHART).forEach(attackType => {
          const eff = getDefensiveEffectiveness(attackType, pokemon.types);
          if (eff === 0) {
            if (!immunities[attackType])  immunities[attackType]  = [];
            immunities[attackType].push(pokemon.name);
          } else if (eff >= 2) {
            if (!weaknesses[attackType])  weaknesses[attackType]  = [];
            weaknesses[attackType].push(`${pokemon.name} (${eff}x)`);
          } else if (eff < 1) {
            if (!resistances[attackType]) resistances[attackType] = [];
            resistances[attackType].push(pokemon.name);
          }
        });
      });

      const critical = Object.entries(weaknesses)
        .filter(([, pokes]) => pokes.length >= 2)
        .sort((a, b) => b[1].length - a[1].length);

      return `
        ${critical.length > 0 ? `
          <div style="margin-bottom:15px;">
            <h4 style="color:#ef4444;margin-bottom:8px;">🚨 Shared Weaknesses</h4>
            ${critical.map(([type, pokes]) => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span class="type-badge type-${type}">${type}</span>
                <span style="color:#ef4444;font-weight:bold;">${pokes.length}×</span>
                <span style="font-size:0.8rem;color:var(--text-muted);">${pokes.join(', ')}</span>
              </div>`).join('')}
          </div>` : ''}

        ${Object.keys(immunities).length > 0 ? `
          <div style="margin-bottom:12px;">
            <h4 style="color:#60a5fa;margin-bottom:6px;font-size:0.85rem;">⛔ Immunities</h4>
            <div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${Object.entries(immunities).map(([type, pokes]) =>
                `<span class="type-badge type-${type}" title="Immune: ${pokes.join(', ')}">${type}</span>`
              ).join('')}
            </div>
          </div>` : ''}

        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
          <div>
            <div style="font-size:1.8rem;font-weight:bold;color:#ef4444;">${Object.keys(weaknesses).length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Weak to</div>
          </div>
          <div>
            <div style="font-size:1.8rem;font-weight:bold;color:#4ade80;">${Object.keys(resistances).length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Resists</div>
          </div>
          <div>
            <div style="font-size:1.8rem;font-weight:bold;color:#60a5fa;">${Object.keys(immunities).length}</div>
            <div style="font-size:0.8rem;color:var(--text-muted);">Immune to</div>
          </div>
        </div>`;
    } catch (error) {
      console.error('Error rendering defensive analysis:', error);
      return '<p style="color:#ef4444;">⚠️ Error analyzing defensive matchups. Try reloading the page.</p>';
    }
  }

  // ============================================================
  // TEAM STATS (with error boundary - Recommendation 4)
  // ============================================================
  function renderTeamStats() {
    try {
      const allPokemonData = window.localDB?.pokemon || window.localDB || {};
      const totals = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
      let count = 0;
      currentTeam.forEach(pokemon => {
        if (!pokemon) return;
        const full = allPokemonData[pokemon.cleanName];
        if (full?.stats) {
          Object.keys(totals).forEach(s => { totals[s] += full.stats[s] || 0; });
          count++;
        }
      });
      if (count === 0) return '<p style="color:var(--text-muted);">No stat data available</p>';
      const avg = {};
      Object.keys(totals).forEach(s => { avg[s] = Math.round(totals[s] / count); });
      const labels = { hp: 'HP', attack: 'Atk', defense: 'Def', 'special-attack': 'Sp.Atk', 'special-defense': 'Sp.Def', speed: 'Speed' };
      return `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
          ${Object.keys(totals).map(s => `
            <div style="background:rgba(0,0,0,0.3);padding:8px;border-radius:8px;text-align:center;">
              <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:3px;">${labels[s]}</div>
              <div style="font-size:1.2rem;font-weight:bold;">${avg[s]}</div>
            </div>`).join('')}
        </div>
        <p style="text-align:center;margin-top:8px;font-size:0.75rem;color:var(--text-muted);">Average base stats across team</p>`;
    } catch (error) {
      console.error('Error rendering team stats:', error);
      return '<p style="color:#ef4444;">⚠️ Error calculating team stats. Try reloading the page.</p>';
    }
  }

  // ============================================================
  // SMART SUGGESTION
  // ============================================================

  // Bug fix #10: buildCandidates now has a two-phase approach for "easy" mode.
  // Phase 1: try to find Pokémon with common/frequent spawn rarity (original behaviour).
  // Phase 2: if phase 1 returns zero results (because localDB rarity strings don't
  //          contain "common"/"frequent"), fall back to BST-range filter only so the
  //          suggestion modal never shows an empty result / unexpected alert.
  function buildCandidates(allowLegendaries, difficulty) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};

    const baseFilter = p => {
      if (window.isMegaForm(p.cleanName)) return false;
      if (currentTeam.some(tp => tp && tp.id === p.id)) return false;
      if (!allowLegendaries && (p.isLegendary || p.isMythical)) return false;
      if (!p.stats) return false;
      return true;
    };

    const bst = p => Object.values(p.stats).reduce((a, b) => a + b, 0);

    if (difficulty === 'competitive') {
      return Object.values(allPokemonData).filter(p => baseFilter(p) && bst(p) >= 520);
    }
    if (difficulty === 'balanced') {
      return Object.values(allPokemonData).filter(p => baseFilter(p) && bst(p) >= 460);
    }

    // --- Easy mode ---
    // Phase 1: prefer Pokémon with a common/frequent spawn entry in the BST window.
    const easyPhase1 = Object.values(allPokemonData).filter(p => {
      if (!baseFilter(p)) return false;
      const b = bst(p);
      if (b < 400 || b > 570) return false;
      return p.locations?.some(loc =>
        loc.rarity && (
          loc.rarity.toLowerCase().includes('common') ||
          loc.rarity.toLowerCase().includes('frequent')
        )
      );
    });

    if (easyPhase1.length > 0) return easyPhase1;

    // Phase 2 fallback: no common-spawn Pokémon found — relax to BST range only.
    // This prevents the Smart Suggest modal from returning 0 results.
    return Object.values(allPokemonData).filter(p => {
      if (!baseFilter(p)) return false;
      const b = bst(p);
      return b >= 400 && b <= 570;
    });
  }

  function smartSuggest(allowLegendaries, difficulty) {
    const TYPE_CHART = window.TYPE_CHART_DATA;
    if (!TYPE_CHART) return [];
    const filled = currentTeam.filter(p => p);

    const teamSTABCoverage = new Set();
    filled.forEach(p => {
      getSTABCoverage(p.types).forEach(t => teamSTABCoverage.add(t));
    });

    const sharedWeaknesses = {};
    filled.forEach(p => {
      Object.keys(TYPE_CHART).forEach(attackType => {
        const eff = getDefensiveEffectiveness(attackType, p.types);
        if (eff >= 2) sharedWeaknesses[attackType] = (sharedWeaknesses[attackType] || 0) + 1;
      });
    });

    const teamRoles = {};
    filled.forEach(p => {
      const r = determineRole(p);
      teamRoles[r] = (teamRoles[r] || 0) + 1;
    });
    const sweepers = (teamRoles['Fast Sweeper'] || 0) + (teamRoles['Slow Sweeper'] || 0);
    const walls    = (teamRoles['Wall/Tank'] || 0) + (teamRoles['Support/Utility'] || 0);

    const teamTypeCount = {};
    filled.forEach(p => p.types.forEach(t => { teamTypeCount[t] = (teamTypeCount[t] || 0) + 1; }));

    const candidates = buildCandidates(allowLegendaries, difficulty);

    return candidates.map(p => {
      let score = 0;
      const reasons = [];
      const role = determineRole(p);

      // --- A. Offensive coverage score ---
      const myCoverage = getSTABCoverage(p.types);
      let newCoverage = 0;
      const coveredLabels = [];
      myCoverage.forEach(defType => {
        if (!teamSTABCoverage.has(defType)) {
          newCoverage++;
          coveredLabels.push(defType);
        }
      });
      const coverageScore = Math.min(newCoverage * 8, 40);
      score += coverageScore;
      if (coveredLabels.length > 0) {
        reasons.push(`⚔️ Adds STAB coverage: ${coveredLabels.slice(0, 4).join(', ')}`);
      }

      // --- B. Defensive synergy score ---
      let defScore = 0;
      Object.entries(sharedWeaknesses).forEach(([attackType, count]) => {
        if (count < 2) return;
        const eff = getDefensiveEffectiveness(attackType, p.types);
        if (eff === 0) {
          defScore += 12;
          reasons.push(`🛡️ Immune to ${attackType} (${count} teammates weak)`);
        } else if (eff < 1) {
          defScore += 6;
          reasons.push(`🛡️ Resists ${attackType} (${count} teammates weak)`);
        }
      });
      score += Math.min(defScore, 36);

      // --- C. Role balance score ---
      if (filled.length >= 2) {
        if (sweepers === 0 && (role === 'Fast Sweeper' || role === 'Slow Sweeper')) {
          score += 20;
          reasons.push('⚡ Team needs an offensive threat');
        } else if (walls === 0 && (role === 'Wall/Tank' || role === 'Support/Utility')) {
          score += 20;
          reasons.push('🛡️ Team needs a defensive anchor');
        } else if (sweepers >= 3 && (role === 'Wall/Tank' || role === 'Support/Utility')) {
          score += 12;
          reasons.push('⚖️ Balances an offense-heavy team');
        } else if (walls >= 3 && (role === 'Fast Sweeper' || role === 'Slow Sweeper')) {
          score += 12;
          reasons.push('⚖️ Adds punch to a passive team');
        }
      }

      // --- D. Type overlap penalty ---
      let overlapPenalty = 0;
      p.types.forEach(t => {
        if (teamTypeCount[t] >= 2) overlapPenalty += 10;
        else if (teamTypeCount[t] === 1) overlapPenalty += 4;
      });
      score -= overlapPenalty;
      if (overlapPenalty >= 10) reasons.push('⚠️ Type overlap with team');

      // --- E. Tier quality score ---
      const { score: tierScore, tierLabel } = getTierScore(p);
      score += Math.min(tierScore, 25);
      if (tierLabel === 'ubers') {
        reasons.push('🔥 Ubers-tier powerhouse');
      } else if (tierLabel === 'ou') {
        reasons.push('⚡ OU-tier — top competitive pick');
      } else if (tierLabel === 'uu' || tierLabel === 'ru') {
        reasons.push(`🏆 High-tier competitive (${tierLabel.toUpperCase()})`);
      }

      // --- F. Easy difficulty: common spawn bonus ---
      let rarity = 'rare';
      if (p.locations?.some(loc => loc.rarity?.toLowerCase().includes('common') || loc.rarity?.toLowerCase().includes('frequent'))) {
        rarity = 'common';
        if (difficulty === 'easy') { score += 10; reasons.push('📍 Easy to find in the wild'); }
      } else if (p.locations?.length > 0) {
        rarity = 'uncommon';
      }

      if (reasons.length === 0) reasons.push('⚖️ General type synergy');

      const b = Object.values(p.stats).reduce((a, c) => a + c, 0);
      return { pokemon: p, score, role, reasons, rarity, bst: b, tierLabel };
    })
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  }

  window.showSmartSuggestion = function(slotIndex) {
    const suggestions = smartSuggest(suggestionFilters.allowLegendaries, suggestionFilters.difficulty);
    if (suggestions.length === 0) {
      alert('No suitable suggestions found with current filters.');
      return;
    }
    const modalHtml = `
      <div class="pokemon-selector-modal">
        <h3>💡 Smart Suggestions for Slot ${slotIndex + 1}</h3>
        <p style="color:var(--text-muted);margin-bottom:15px;font-size:0.85rem;">Ranked by type synergy, coverage, role balance & competitive tier</p>
        <div class="selector-results" style="max-height:60vh;overflow-y:auto;">
          ${suggestions.map((s, idx) => {
            const p = s.pokemon;
            const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
            const tierDisplay = (p.isLegendary || p.isMythical)
              ? '<span style="color:#ffd700;">✨ Legendary</span>'
              : `<span style="color:#a78bfa;">${formatTierLabel(s.tierLabel)}</span>`;
            return `
              <div class="selector-pokemon" onclick="addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')" style="cursor:pointer;position:relative;">
                <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.85);padding:2px 7px;border-radius:4px;font-size:0.7rem;font-weight:bold;color:#4ade80;">
                  #${idx+1} &nbsp;★ ${s.score}
                </div>
                <div style="position:absolute;top:5px;left:5px;font-size:1.2rem;" title="${s.role}">${getRoleIcon(s.role)}</div>
                <img src="${p.sprite}" alt="${p.name}" loading="lazy">
                <div class="selector-pokemon-info">
                  <div class="selector-pokemon-name">${p.name}</div>
                  <div class="selector-pokemon-types">${types}</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">BST: ${s.bst} | ${tierDisplay}</div>
                  <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:5px;line-height:1.4;">${s.reasons.slice(0, 3).join('<br>')}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    const overlay   = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = modalHtml;
    overlay.classList.add('active');
  };

  // ============================================================
  // RANDOM SUGGESTION
  // ============================================================
  window.showRandomSuggestion = function(slotIndex) {
    const candidates = buildCandidates(suggestionFilters.allowLegendaries, suggestionFilters.difficulty);
    if (candidates.length === 0) {
      alert('No Pokémon match the current filters.');
      return;
    }
    const picks = [];
    const used  = new Set();
    while (picks.length < Math.min(12, candidates.length)) {
      const idx = Math.floor(Math.random() * candidates.length);
      if (!used.has(idx)) { used.add(idx); picks.push(candidates[idx]); }
    }
    const modalHtml = `
      <div class="pokemon-selector-modal">
        <h3>🎲 Random Picks for Slot ${slotIndex + 1}</h3>
        <p style="color:var(--text-muted);margin-bottom:15px;font-size:0.85rem;">
          ${suggestionFilters.difficulty} difficulty • ${suggestionFilters.allowLegendaries ? 'legendaries allowed' : 'no legendaries'}
        </p>
        <div class="selector-results" style="max-height:60vh;overflow-y:auto;">
          ${picks.map(p => {
            const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
            const role  = determineRole(p);
            const b     = Object.values(p.stats).reduce((a, c) => a + c, 0);
            const { tierLabel } = getTierScore(p);
            return `
              <div class="selector-pokemon" onclick="addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')" style="cursor:pointer;position:relative;">
                <div style="position:absolute;top:5px;left:5px;font-size:1.2rem;" title="${role}">${getRoleIcon(role)}</div>
                <img src="${p.sprite}" alt="${p.name}" loading="lazy">
                <div class="selector-pokemon-info">
                  <div class="selector-pokemon-name">${p.name}</div>
                  <div class="selector-pokemon-types">${types}</div>
                  <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px;">BST: ${b} | <span style="color:#a78bfa;">${formatTierLabel(tierLabel)}</span></div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
    const overlay   = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = modalHtml;
    overlay.classList.add('active');
  };

  // ============================================================
  // POKEMON SELECTOR
  // ============================================================
  window.showPokemonSelector = function(slotIndex) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const favs = Object.values(allPokemonData).filter(p =>
      window.favorites.includes(p.cleanName) && !window.isMegaForm(p.cleanName)
    );
    const modalHtml = `
      <div class="pokemon-selector-modal">
        <h3>Select Pokémon for Slot ${slotIndex + 1}</h3>
        <div class="selector-search">
          <input type="text" id="selectorSearch" placeholder="Search Pokémon..." oninput="filterSelectorResults()">
        </div>
        <div class="selector-tabs">
          <button class="selector-tab active" data-tab="favorites" onclick="switchSelectorTab('favorites')">⭐ Favorites</button>
          <button class="selector-tab" data-tab="all" onclick="switchSelectorTab('all')">All Pokémon</button>
        </div>
        <div class="selector-results" id="selectorResults">${renderSelectorPokemon(favs, slotIndex)}</div>
      </div>`;
    const overlay   = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = modalHtml;
    overlay.classList.add('active');
    window.currentSelectorSlot = slotIndex;
  };

  window.switchSelectorTab = function(tab) {
    currentSelectorTab = tab;
    document.querySelectorAll('.selector-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    window.filterSelectorResults();
  };

  window.filterSelectorResults = function() {
    const search = document.getElementById('selectorSearch')?.value.toLowerCase() || '';
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    let list = currentSelectorTab === 'favorites'
      ? Object.values(allPokemonData).filter(p => window.favorites.includes(p.cleanName) && !window.isMegaForm(p.cleanName))
      : Object.values(allPokemonData).filter(p => !window.isMegaForm(p.cleanName));
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || p.id.toString() === search);
    list.sort((a, b) => a.id - b.id);
    const el = document.getElementById('selectorResults');
    if (el) el.innerHTML = renderSelectorPokemon(list, window.currentSelectorSlot);
  };

  function renderSelectorPokemon(list, slotIndex) {
    if (list.length === 0) return '<div class="no-selector-results">No Pokémon found.</div>';
    return list.map(p => {
      const types    = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
      const isInTeam = currentTeam.some(tp => tp && tp.id === p.id);
      return `
        <div class="selector-pokemon ${isInTeam ? 'in-team' : ''}" onclick="${isInTeam ? '' : `addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')`}" style="${isInTeam ? 'cursor:not-allowed;opacity:0.5;' : 'cursor:pointer;'}">
          <img src="${p.sprite}" alt="${p.name}" loading="lazy">
          <div class="selector-pokemon-info">
            <div class="selector-pokemon-name">${p.name}</div>
            <div class="selector-pokemon-types">${types}</div>
          </div>
          ${isInTeam ? '<span class="in-team-badge">✓ In Team</span>' : ''}
        </div>`;
    }).join('');
  }

  window.addToTeam = function(slotIndex, pokemonId, cleanName) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const pokemon = allPokemonData[cleanName];
    if (!pokemon) return;
    currentTeam[slotIndex] = {
      id: pokemon.id, name: pokemon.name, cleanName: pokemon.cleanName,
      types: pokemon.types, sprite: pokemon.sprite, abilities: pokemon.abilities || []
    };
    saveTeam();
    if (window.closeModal) window.closeModal();
    renderTeamBuilder();
  };

  window.removeFromTeam = function(slotIndex) {
    currentTeam[slotIndex] = null;
    saveTeam();
    renderTeamBuilder();
  };

  window.confirmClearTeam = function() {
    if (confirm('Clear this team? This cannot be undone.')) {
      currentTeam = [];
      saveTeam();
      renderTeamBuilder();
    }
  };

  // ============================================================
  // TEMPLATES
  // ============================================================
  const TEAM_TEMPLATES = {
    'Balanced Core':  { pokemon: ['Landorus','Toxapex','Corviknight','Heatran','Tapu Fini','Rillaboom'],  desc: 'Well-rounded competitive team' },
    'Hyper Offense':  { pokemon: ['Dragapult','Garchomp','Volcarona','Kartana','Tapu Koko','Melmetal'],   desc: 'Fast aggressive sweepers' },
    'Easy Starter':   { pokemon: ['Talonflame','Azumarill','Toxicroak','Ferrothorn','Hippowdon','Slowbro'], desc: 'Accessible with common spawns' },
    'Rain Team':      { pokemon: ['Pelipper','Barraskewda','Kingdra','Ferrothorn','Toxapex','Rillaboom'],  desc: 'Rain weather strategy' },
    'Sun Team':       { pokemon: ['Torkoal','Venusaur','Charizard','Heatran','Landorus','Tapu Fini'],      desc: 'Sun weather strategy' },
    'Stall Team':     { pokemon: ['Toxapex','Ferrothorn','Chansey','Corviknight','Hippowdon','Slowbro'],   desc: 'Ultra defensive team' }
  };

  window.showTemplatesModal = function() {
    const modalHtml = `
      <div class="templates-modal">
        <h3>📋 Team Templates</h3>
        <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.9rem;">Load a pre-built team:</p>
        <div class="template-list">
          ${Object.entries(TEAM_TEMPLATES).map(([name, data]) => `
            <div class="template-item" onclick="loadTemplate('${name}')" style="cursor:pointer;">
              <div class="template-name">${name}</div>
              <div class="template-desc">${data.desc}</div>
              <div class="template-pokemon">${data.pokemon.join(' • ')}</div>
            </div>`).join('')}
        </div>
      </div>`;
    document.getElementById('modalBody').innerHTML = modalHtml;
    document.getElementById('modalOverlay').classList.add('active');
  };

  window.loadTemplate = function(templateName) {
    const template = TEAM_TEMPLATES[templateName];
    if (!template) return;
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const newTeam = template.pokemon.map(name => {
      const p = allPokemonData[name.toLowerCase().replace(/[^a-z]/g, '')];
      if (!p) return null;
      return { id: p.id, name: p.name, cleanName: p.cleanName, types: p.types, sprite: p.sprite, abilities: p.abilities || [] };
    }).filter(Boolean);
    if (newTeam.length === 0) { alert('Could not load template.'); return; }
    if (currentTeam.filter(p=>p).length > 0 && !confirm(`Replace current team with "${templateName}"?`)) return;
    currentTeam = newTeam;
    saveTeam();
    if (window.closeModal) window.closeModal();
    renderTeamBuilder();
  };

  // ============================================================
  // IMPORT / EXPORT
  // ============================================================
  window.exportTeam = function() {
    const code = btoa(JSON.stringify(currentTeam.map(p => p ? p.cleanName : null)));
    const url  = `${window.location.origin}${window.location.pathname}?team=${code}`;
    navigator.clipboard.writeText(url).then(() => alert('✅ Team link copied!')).catch(() => prompt('Copy this link:', url));
  };

  window.showImportModal = function() {
    document.getElementById('modalBody').innerHTML = `
      <div class="import-modal">
        <h3>📥 Import Team</h3>
        <p style="margin-bottom:15px;color:var(--text-muted);">Paste team link or code:</p>
        <textarea id="importCode" placeholder="https://... or paste code" rows="4" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-family:monospace;"></textarea>
        <div style="margin-top:15px;display:flex;gap:10px;">
          <button class="btn-primary" onclick="importTeam()" style="flex:1;">Import</button>
          <button class="btn-secondary" onclick="closeModal()" style="flex:1;">Cancel</button>
        </div>
      </div>`;
    document.getElementById('modalOverlay').classList.add('active');
  };

  window.importTeam = function() {
    const input    = document.getElementById('importCode').value.trim();
    const teamCode = input.includes('?team=') ? input.split('?team=')[1].split('&')[0] : input;
    try {
      const cleanNames     = JSON.parse(atob(teamCode));
      const allPokemonData = window.localDB?.pokemon || window.localDB || {};
      const imported = cleanNames.map(cn => {
        if (!cn) return null;
        const p = allPokemonData[cn];
        if (!p) return null;
        return { id: p.id, name: p.name, cleanName: p.cleanName, types: p.types, sprite: p.sprite, abilities: p.abilities || [] };
      });
      if (imported.filter(p=>p).length === 0) { alert('❌ No valid Pokémon found.'); return; }
      currentTeam = imported;
      saveTeam();
      if (window.closeModal) window.closeModal();
      renderTeamBuilder();
      alert('✅ Team imported!');
    } catch (e) { alert('❌ Invalid code.'); }
  };

  // ============================================================
  // TEAM MANAGEMENT
  // ============================================================
  window.switchTeam = function(name) {
    currentTeamName = name;
    currentTeam = savedTeams[name] || [];
    renderTeamBuilder();
  };

  window.showNewTeamModal = function() {
    const name = prompt('Enter new team name:');
    if (!name?.trim()) return;
    if (savedTeams[name]) { alert('Name already exists!'); return; }
    savedTeams[name] = [];
    currentTeamName  = name;
    currentTeam      = [];
    saveTeam();
    renderTeamBuilder();
  };

  window.renameCurrentTeam = function() {
    const newName = prompt('Rename team:', currentTeamName);
    if (!newName?.trim() || newName === currentTeamName) return;
    if (savedTeams[newName]) { alert('Name already exists!'); return; }
    savedTeams[newName] = currentTeam;
    delete savedTeams[currentTeamName];
    currentTeamName = newName;
    saveTeam();
    renderTeamBuilder();
  };

  window.deleteCurrentTeam = function() {
    if (Object.keys(savedTeams).length === 1) { alert('Cannot delete your only team!'); return; }
    if (!confirm(`Delete "${currentTeamName}"?`)) return;
    delete savedTeams[currentTeamName];
    currentTeamName = Object.keys(savedTeams)[0];
    currentTeam     = savedTeams[currentTeamName];
    saveTeam();
    renderTeamBuilder();
  };

})();
