// Team Builder Logic - Enhanced Version

(function() {
  'use strict';
  
  let currentTeam = [];
  let savedTeams = {};
  let currentTeamName = 'default';
  const MAX_TEAM_SIZE = 6;
  const MIN_COMPETITIVE_BST = 480;

  // Ensure favorites is available
  if (typeof window.favorites === 'undefined') {
    window.favorites = JSON.parse(localStorage.getItem('cobblePulseFavorites') || '[]');
  }

  // Load teams from localStorage
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

  // Save all teams to localStorage
  function saveTeam() {
    savedTeams[currentTeamName] = currentTeam.filter(p => p !== null);
    localStorage.setItem('cobblePulseTeams', JSON.stringify(savedTeams));
  }

  // Initialize team builder
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
          </div>
        `;
      }
    }
  };

  // Ensure isMegaForm is available
  if (typeof window.isMegaForm === 'undefined') {
    window.isMegaForm = function(cleanName) {
      return cleanName && cleanName.includes('mega') && !cleanName.includes('meganium');
    };
  }

  function renderTeamBuilder() {
    const container = document.getElementById('teamBuilderContainer');
    if (!container) return;

    const teamNames = Object.keys(savedTeams);
    const teamSelector = teamNames.length > 0 ? `
      <div class="team-selector">
        <label>Current Team:</label>
        <select id="teamSelect" onchange="switchTeam(this.value)">
          ${teamNames.map(name => `<option value="${name}" ${name === currentTeamName ? 'selected' : ''}>${name}</option>`).join('')}
        </select>
        <button class="team-mgmt-btn" onclick="showNewTeamModal()" title="New Team">+ New</button>
        <button class="team-mgmt-btn" onclick="renameCurrentTeam()" title="Rename Team">✏️</button>
        <button class="team-mgmt-btn" onclick="deleteCurrentTeam()" title="Delete Team">🗑️</button>
      </div>
    ` : '';

    container.innerHTML = `
      <div class="team-builder-header">
        <h2>⚔️ Team Builder</h2>
        <p class="team-subtitle">Build your competitive team and analyze coverage</p>
        ${teamSelector}
      </div>

      <div class="team-actions">
        <button class="team-action-btn export-btn" onclick="exportTeam()" ${currentTeam.length === 0 ? 'disabled' : ''}>
          📤 Export Team
        </button>
        <button class="team-action-btn import-btn" onclick="showImportModal()">
          📥 Import Team
        </button>
        <button class="team-action-btn template-btn" onclick="showTemplatesModal()">
          📋 Templates
        </button>
        <button class="team-action-btn suggest-btn" onclick="suggestPokemon()" ${currentTeam.length === 0 ? 'disabled' : ''}>
          💡 Suggest
        </button>
        <button class="team-action-btn clear-btn" onclick="confirmClearTeam()" ${currentTeam.length === 0 ? 'disabled' : ''}>
          🗑️ Clear
        </button>
      </div>

      <div class="team-slots" id="teamSlots">
        ${renderTeamSlots()}
      </div>

      ${currentTeam.length > 0 ? `
        <div class="team-analysis">
          <div class="analysis-section role-section">
            <h3>🎯 Team Roles</h3>
            <p class="analysis-desc">Role distribution and balance</p>
            ${renderTeamRoles()}
          </div>

          <div class="analysis-section coverage-section">
            <h3>⚔️ Move Coverage</h3>
            <p class="analysis-desc">Types your moves can hit super effectively</p>
            ${renderMoveCoverage()}
          </div>

          <div class="analysis-section weakness-section">
            <h3>🛡️ Defensive Analysis</h3>
            <p class="analysis-desc">Weaknesses, resistances, and immunities</p>
            ${renderDefensiveWeaknesses()}
          </div>

          <div class="analysis-section stats-section">
            <h3>📊 Team Statistics</h3>
            ${renderTeamStats()}
          </div>
        </div>
      ` : `
        <div class="empty-team-message">
          <div class="empty-icon">⚔️</div>
          <h3>Your team is empty</h3>
          <p>Click + to add Pokémon, or try a template to get started</p>
          <button class="btn-primary" onclick="showTemplatesModal()" style="margin-top:15px;">📋 Browse Templates</button>
        </div>
      `}
    `;

    initDragAndDrop();
  }

  function renderTeamSlots() {
    let html = '';
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const pokemon = currentTeam[i];
      if (pokemon) {
        const types = pokemon.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
        const role = determineRole(pokemon);
        const roleIcon = getRoleIcon(role);
        const abilities = pokemon.abilities ? pokemon.abilities.slice(0, 2).join(' / ') : 'Unknown';
        
        html += `
          <div class="team-slot filled" draggable="true" data-slot="${i}">
            <button class="remove-slot-btn" onclick="removeFromTeam(${i})" title="Remove">✕</button>
            <div class="slot-role-badge" title="${role}">${roleIcon}</div>
            <img src="${pokemon.sprite}" alt="${pokemon.name}" class="slot-sprite" loading="lazy">
            <div class="slot-info">
              <div class="slot-name">${pokemon.name}</div>
              <div class="slot-types">${types}</div>
              <div class="slot-ability" title="Ability">${abilities}</div>
            </div>
            <button class="view-details-btn" onclick="openModal(${pokemon.id}, '${pokemon.cleanName}')" title="Details">
              ℹ️
            </button>
          </div>
        `;
      } else {
        html += `
          <div class="team-slot empty" onclick="showPokemonSelector(${i})" data-slot="${i}">
            <div class="empty-slot-content">
              <span class="plus-icon">+</span>
              <span class="slot-label">Add Pokémon</span>
            </div>
          </div>
        `;
      }
    }
    return html;
  }

  let draggedSlot = null;

  function initDragAndDrop() {
    const slots = document.querySelectorAll('.team-slot.filled');
    slots.forEach(slot => {
      slot.addEventListener('dragstart', handleDragStart);
      slot.addEventListener('dragover', handleDragOver);
      slot.addEventListener('drop', handleDrop);
      slot.addEventListener('dragend', handleDragEnd);
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
    const targetSlot = parseInt(e.currentTarget.dataset.slot);
    if (draggedSlot !== null && draggedSlot !== targetSlot) {
      const temp = currentTeam[draggedSlot];
      currentTeam[draggedSlot] = currentTeam[targetSlot];
      currentTeam[targetSlot] = temp;
      saveTeam();
      renderTeamBuilder();
    }
    return false;
  }

  function handleDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    draggedSlot = null;
  }

  function determineRole(pokemon) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const fullData = allPokemonData[pokemon.cleanName];
    if (!fullData?.stats) return 'Unknown';
    
    const stats = fullData.stats;
    const bst = Object.values(stats).reduce((a, b) => a + b, 0);
    const offensiveTotal = stats.attack + stats['special-attack'];
    const defensiveTotal = stats.defense + stats['special-defense'] + stats.hp;
    
    if (stats.speed >= 100 && offensiveTotal >= 200) return 'Fast Sweeper';
    else if (offensiveTotal >= 220) return 'Slow Sweeper';
    else if (defensiveTotal >= 300) return 'Wall/Tank';
    else if (stats.speed >= 90 && defensiveTotal >= 250) return 'Bulky Attacker';
    else if (bst < 450) return 'Support/Utility';
    else return 'Balanced';
  }

  function getRoleIcon(role) {
    const icons = {
      'Fast Sweeper': '⚡', 'Slow Sweeper': '💥', 'Wall/Tank': '🛡️',
      'Bulky Attacker': '🔨', 'Support/Utility': '✨', 'Balanced': '⚖️', 'Unknown': '❓'
    };
    return icons[role] || '❓';
  }

  function renderTeamRoles() {
    const roles = {}, warnings = [];
    currentTeam.forEach(pokemon => {
      if (!pokemon) return;
      const role = determineRole(pokemon);
      if (!roles[role]) roles[role] = [];
      roles[role].push(pokemon.name);
    });
    
    const sweepers = (roles['Fast Sweeper']?.length || 0) + (roles['Slow Sweeper']?.length || 0);
    const walls = roles['Wall/Tank']?.length || 0;
    if (sweepers >= 5) warnings.push('⚠️ Too many sweepers');
    if (walls >= 4) warnings.push('⚠️ Very defensive team');
    if (sweepers === 0) warnings.push('⚠️ No dedicated sweepers');
    
    const typeCount = {};
    currentTeam.forEach(p => { if(p) p.types.forEach(t => typeCount[t] = (typeCount[t]||0)+1); });
    Object.entries(typeCount).forEach(([type, count]) => {
      if (count >= 3) warnings.push(`⚠️ Type overlap: ${count}× ${type}`);
    });
    
    return `
      <div class="role-distribution">
        ${Object.entries(roles).map(([role, pokemons]) => `
          <div class="role-item">
            <span class="role-icon">${getRoleIcon(role)}</span>
            <div class="role-info">
              <span class="role-name">${role}</span>
              <span class="role-pokemon">${pokemons.join(', ')}</span>
            </div>
          </div>
        `).join('')}
      </div>
      ${warnings.length > 0 ? `<div class="role-warnings">${warnings.map(w => `<div class="role-warning">${w}</div>`).join('')}</div>` : '<div class="role-balanced">✅ Balanced!</div>'}
    `;
  }

  function renderMoveCoverage() {
    const coverage = {}, TYPE_CHART = window.TYPE_CHART_DATA, allPokemonData = window.localDB?.pokemon || window.localDB || {};
    if (!TYPE_CHART) return '<p>Type chart not loaded</p>';
    
    Object.keys(TYPE_CHART).forEach(defenseType => {
      const typeData = TYPE_CHART[defenseType], hitters = new Set();
      currentTeam.forEach(pokemon => {
        if (!pokemon) return;
        const fullData = allPokemonData[pokemon.cleanName];
        pokemon.types.forEach(attackType => {
          if (typeData.weaknesses.includes(attackType)) hitters.add(`${pokemon.name} (${attackType} STAB)`);
        });
        if (fullData?.strategies) {
          fullData.strategies.forEach(strat => {
            strat.moves.forEach(moveSlot => {
              moveSlot.split(' / ').forEach(move => {
                const moveType = getMoveType(move.trim());
                if (moveType && typeData.weaknesses.includes(moveType)) hitters.add(`${pokemon.name} (${move})`);
              });
            });
          });
        }
      });
      if (hitters.size > 0) coverage[defenseType] = Array.from(hitters);
    });

    const coveredTypes = Object.keys(coverage), uncoveredTypes = Object.keys(TYPE_CHART).filter(t => !coveredTypes.includes(t));
    const coveragePercent = Math.round((coveredTypes.length / 18) * 100);

    return `
      <div class="coverage-stats"><div class="coverage-meter"><div class="coverage-meter-fill" style="width:${coveragePercent}%"></div><span class="coverage-meter-text">${coveragePercent}% Coverage</span></div></div>
      <div class="coverage-grid">${coveredTypes.map(type => `<div class="coverage-item covered" title="${coverage[type].join('\n')}"><span class="type-badge type-${type}">${type}</span><span class="coverage-count">${coverage[type].length}</span></div>`).join('')}</div>
      ${uncoveredTypes.length > 0 ? `<div class="uncovered-section"><h4>⚠️ Not Covered (${uncoveredTypes.length})</h4><div class="coverage-grid">${uncoveredTypes.map(type => `<span class="type-badge type-${type} uncovered-badge">${type}</span>`).join('')}</div></div>` : '<div class="perfect-coverage">🎯 Perfect!</div>'}
    `;
  }

  function getMoveType(moveName) {
    const moveTypes = {
      'earthquake': 'ground', 'ice beam': 'ice', 'thunderbolt': 'electric', 'flamethrower': 'fire',
      'surf': 'water', 'psychic': 'psychic', 'shadow ball': 'ghost', 'focus blast': 'fighting'
    };
    return moveTypes[moveName.toLowerCase().replace(/[^a-z ]/g, '')] || null;
  }

  window.showPokemonSelector = function(slotIndex) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const favoritePokemon = Object.values(allPokemonData).filter(p => window.favorites.includes(p.cleanName) && !window.isMegaForm(p.cleanName));
    const overlay = document.getElementById('modalOverlay'), modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `<div class="pokemon-selector-modal"><h3>Select Slot ${slotIndex + 1}</h3><div class="selector-results">${favoritePokemon.map(p => `<div class="selector-pokemon" onclick="addToTeam(${slotIndex},${p.id},'${p.cleanName}')"><img src="${p.sprite}" alt="${p.name}"><div>${p.name}</div></div>`).join('')}</div></div>`;
    overlay.classList.add('active');
  };

  window.addToTeam = function(slotIndex, pokemonId, cleanName) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {}, pokemon = allPokemonData[cleanName];
    if (!pokemon) return;
    currentTeam[slotIndex] = {id:pokemon.id,name:pokemon.name,cleanName:pokemon.cleanName,types:pokemon.types,sprite:pokemon.sprite,abilities:pokemon.abilities||[]};
    saveTeam();
    if(window.closeModal) window.closeModal();
    renderTeamBuilder();
  };

  window.removeFromTeam = function(slotIndex) { currentTeam[slotIndex] = null; saveTeam(); renderTeamBuilder(); };
  window.confirmClearTeam = function() { if(confirm('Clear?')) { currentTeam=[]; saveTeam(); renderTeamBuilder(); }};
  window.showTemplatesModal = function() { alert('Templates coming soon!'); };
  window.showImportModal = function() { alert('Import coming soon!'); };
  window.exportTeam = function() { alert('Export coming soon!'); };
  window.suggestPokemon = function() { alert('Suggestions coming soon!'); };
  
  function renderDefensiveWeaknesses() { return '<p>Defensive analysis loaded</p>'; }
  function renderTeamStats() { return '<p>Team stats loaded</p>'; }
  
})();
