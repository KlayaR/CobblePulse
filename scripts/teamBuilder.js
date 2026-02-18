// Team Builder Logic - Enhanced Version

let currentTeam = [];
let savedTeams = {};
let currentTeamName = 'default';
const MAX_TEAM_SIZE = 6;

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
    // Migrate old single team format
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
function initTeamBuilder() {
  loadTeam();
  renderTeamBuilder();
}

// Main render function
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

  // Initialize drag and drop
  initDragAndDrop();
}

// Render team slots with drag & drop
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

// Drag and Drop functionality
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
    // Swap pokemon
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

// Determine Pokemon role based on stats
function determineRole(pokemon) {
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  const fullData = allPokemonData[pokemon.cleanName];
  if (!fullData?.stats) return 'Unknown';
  
  const stats = fullData.stats;
  const bst = Object.values(stats).reduce((a, b) => a + b, 0);
  const offensiveTotal = stats.attack + stats['special-attack'];
  const defensiveTotal = stats.defense + stats['special-defense'] + stats.hp;
  
  // Determine primary role
  if (stats.speed >= 100 && offensiveTotal >= 200) {
    return 'Fast Sweeper';
  } else if (offensiveTotal >= 220) {
    return 'Slow Sweeper';
  } else if (defensiveTotal >= 300) {
    return 'Wall/Tank';
  } else if (stats.speed >= 90 && defensiveTotal >= 250) {
    return 'Bulky Attacker';
  } else if (bst < 450) {
    return 'Support/Utility';
  } else {
    return 'Balanced';
  }
}

function getRoleIcon(role) {
  const icons = {
    'Fast Sweeper': '⚡',
    'Slow Sweeper': '💥',
    'Wall/Tank': '🛡️',
    'Bulky Attacker': '🔨',
    'Support/Utility': '✨',
    'Balanced': '⚖️',
    'Unknown': '❓'
  };
  return icons[role] || '❓';
}

// Render team roles analysis
function renderTeamRoles() {
  const roles = {};
  const warnings = [];
  
  currentTeam.forEach(pokemon => {
    if (!pokemon) return;
    const role = determineRole(pokemon);
    if (!roles[role]) roles[role] = [];
    roles[role].push(pokemon.name);
  });
  
  // Check for imbalances
  const sweepers = (roles['Fast Sweeper']?.length || 0) + (roles['Slow Sweeper']?.length || 0);
  const walls = roles['Wall/Tank']?.length || 0;
  
  if (sweepers >= 5) warnings.push('⚠️ Too many sweepers - consider adding defensive support');
  if (walls >= 4) warnings.push('⚠️ Very defensive team - may struggle to break walls');
  if (sweepers === 0) warnings.push('⚠️ No dedicated sweepers - offensive power may be limited');
  
  // Check type diversity
  const typeCount = {};
  currentTeam.forEach(p => {
    if (!p) return;
    p.types.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
  });
  
  Object.entries(typeCount).forEach(([type, count]) => {
    if (count >= 3) warnings.push(`⚠️ Type overlap: ${count}× ${type}-type Pokémon`);
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
    ${warnings.length > 0 ? `
      <div class="role-warnings">
        ${warnings.map(w => `<div class="role-warning">${w}</div>`).join('')}
      </div>
    ` : '<div class="role-balanced">✅ Team composition looks balanced!</div>'}
  `;
}

// Enhanced move coverage analysis
function renderMoveCoverage() {
  const coverage = {};
  const TYPE_CHART = window.TYPE_CHART_DATA;
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  
  // For each type, check if any team member has moves that hit it super effectively
  Object.keys(TYPE_CHART).forEach(defenseType => {
    const typeData = TYPE_CHART[defenseType];
    const hitters = new Set();
    
    currentTeam.forEach(pokemon => {
      if (!pokemon) return;
      const fullData = allPokemonData[pokemon.cleanName];
      
      // Check STAB
      pokemon.types.forEach(attackType => {
        if (typeData.weaknesses.includes(attackType)) {
          hitters.add(`${pokemon.name} (${attackType} STAB)`);
        }
      });
      
      // Check learned moves from strategies
      if (fullData?.strategies) {
        fullData.strategies.forEach(strat => {
          strat.moves.forEach(moveSlot => {
            const moves = moveSlot.split(' / ');
            moves.forEach(move => {
              const moveType = getMoveType(move.trim());
              if (moveType && typeData.weaknesses.includes(moveType)) {
                hitters.add(`${pokemon.name} (${move})`);
              }
            });
          });
        });
      }
    });
    
    if (hitters.size > 0) {
      coverage[defenseType] = Array.from(hitters);
    }
  });

  const coveredTypes = Object.keys(coverage);
  const uncoveredTypes = Object.keys(TYPE_CHART).filter(t => !coveredTypes.includes(t));
  const coveragePercent = Math.round((coveredTypes.length / 18) * 100);

  return `
    <div class="coverage-stats">
      <div class="coverage-meter">
        <div class="coverage-meter-fill" style="width: ${coveragePercent}%"></div>
        <span class="coverage-meter-text">${coveragePercent}% Coverage (${coveredTypes.length}/18 types)</span>
      </div>
    </div>
    <div class="coverage-grid">
      ${coveredTypes.map(type => `
        <div class="coverage-item covered" title="${coverage[type].join('\n')}">
          <span class="type-badge type-${type}">${type}</span>
          <span class="coverage-count">${coverage[type].length}</span>
        </div>
      `).join('')}
    </div>
    ${uncoveredTypes.length > 0 ? `
      <div class="uncovered-section">
        <h4>⚠️ Not Covered (${uncoveredTypes.length})</h4>
        <div class="coverage-grid">
          ${uncoveredTypes.map(type => `
            <span class="type-badge type-${type} uncovered-badge">${type}</span>
          `).join('')}
        </div>
      </div>
    ` : '<div class="perfect-coverage">🎯 Perfect Coverage!</div>'}
  `;
}

// Get move type (simplified - would need full move database for accuracy)
function getMoveType(moveName) {
  const moveTypes = {
    'earthquake': 'ground', 'ice beam': 'ice', 'thunderbolt': 'electric', 'flamethrower': 'fire',
    'surf': 'water', 'psychic': 'psychic', 'shadow ball': 'ghost', 'focus blast': 'fighting',
    'ice punch': 'ice', 'thunder punch': 'electric', 'fire punch': 'fire', 'drain punch': 'fighting',
    'stone edge': 'rock', 'iron head': 'steel', 'u-turn': 'bug', 'volt switch': 'electric',
    'scald': 'water', 'sludge bomb': 'poison', 'gunk shot': 'poison', 'play rough': 'fairy',
    'moonblast': 'fairy', 'dazzling gleam': 'fairy', 'aura sphere': 'fighting', 'dark pulse': 'dark',
    'knock off': 'dark', 'crunch': 'dark', 'x-scissor': 'bug', 'bug buzz': 'bug',
    'earth power': 'ground', 'flash cannon': 'steel', 'energy ball': 'grass', 'giga drain': 'grass',
    'solar beam': 'grass', 'wood hammer': 'grass', 'power whip': 'grass', 'leaf storm': 'grass',
    'hydro pump': 'water', 'waterfall': 'water', 'aqua jet': 'water', 'liquidation': 'water',
    'brave bird': 'flying', 'hurricane': 'flying', 'air slash': 'flying', 'drill peck': 'flying',
    'blizzard': 'ice', 'ice shard': 'ice', 'icicle crash': 'ice', 'freeze-dry': 'ice',
    'close combat': 'fighting', 'superpower': 'fighting', 'high jump kick': 'fighting',
    'rock slide': 'rock', 'head smash': 'rock', 'power gem': 'rock', 'meteor beam': 'rock',
    'meteor mash': 'steel', 'iron head': 'steel', 'bullet punch': 'steel', 'steel beam': 'steel',
    'outrage': 'dragon', 'draco meteor': 'dragon', 'dragon claw': 'dragon', 'dragon pulse': 'dragon',
    'tera blast': 'normal' // Would need tera type context
  };
  
  const normalized = moveName.toLowerCase().replace(/[^a-z ]/g, '');
  return moveTypes[normalized] || null;
}

// Show Pokemon selector modal
function showPokemonSelector(slotIndex) {
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  const favoritePokemon = Object.values(allPokemonData).filter(p => 
    favorites.includes(p.cleanName) && !isMegaForm(p.cleanName)
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

      <div class="selector-results" id="selectorResults">
        ${renderSelectorPokemon(favoritePokemon, slotIndex)}
      </div>
    </div>
  `;

  const overlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = modalHtml;
  overlay.classList.add('active');
  window.currentSelectorSlot = slotIndex;
}

let currentSelectorTab = 'favorites';

function switchSelectorTab(tab) {
  currentSelectorTab = tab;
  document.querySelectorAll('.selector-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  filterSelectorResults();
}

function filterSelectorResults() {
  const search = document.getElementById('selectorSearch')?.value.toLowerCase() || '';
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  
  let pokemonList = [];
  if (currentSelectorTab === 'favorites') {
    pokemonList = Object.values(allPokemonData).filter(p => 
      favorites.includes(p.cleanName) && !isMegaForm(p.cleanName)
    );
  } else {
    pokemonList = Object.values(allPokemonData).filter(p => !isMegaForm(p.cleanName));
  }

  if (search) {
    pokemonList = pokemonList.filter(p => 
      p.name.toLowerCase().includes(search) || 
      p.id.toString() === search
    );
  }

  pokemonList.sort((a, b) => a.id - b.id);

  const resultsContainer = document.getElementById('selectorResults');
  if (resultsContainer) {
    resultsContainer.innerHTML = renderSelectorPokemon(pokemonList, window.currentSelectorSlot);
  }
}

function renderSelectorPokemon(pokemonList, slotIndex) {
  if (pokemonList.length === 0) {
    return '<div class="no-selector-results">No Pokémon found. Try adjusting your search or check the other tab.</div>';
  }

  return pokemonList.map(p => {
    const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
    const isInTeam = currentTeam.some(tp => tp && tp.id === p.id);
    
    return `
      <div class="selector-pokemon ${isInTeam ? 'in-team' : ''}" onclick="${isInTeam ? '' : `addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')`}">
        <img src="${p.sprite}" alt="${p.name}" loading="lazy">
        <div class="selector-pokemon-info">
          <div class="selector-pokemon-name">${p.name}</div>
          <div class="selector-pokemon-types">${types}</div>
        </div>
        ${isInTeam ? '<span class="in-team-badge">✓ In Team</span>' : ''}
      </div>
    `;
  }).join('');
}

// Add Pokemon to team
function addToTeam(slotIndex, pokemonId, cleanName) {
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  const pokemon = allPokemonData[cleanName];
  
  if (!pokemon) return;

  currentTeam[slotIndex] = {
    id: pokemon.id,
    name: pokemon.name,
    cleanName: pokemon.cleanName,
    types: pokemon.types,
    sprite: pokemon.sprite,
    abilities: pokemon.abilities || []
  };

  saveTeam();
  closeModal();
  renderTeamBuilder();
}

// Quick add from main table
window.quickAddToTeam = function(pokemonId, cleanName) {
  if (currentTeam.filter(p => p !== null).length >= MAX_TEAM_SIZE) {
    alert('Team is full! Remove a Pokémon first.');
    return;
  }
  
  // Find first empty slot
  const emptySlot = currentTeam.findIndex((p, i) => !p && i < MAX_TEAM_SIZE);
  const slotIndex = emptySlot >= 0 ? emptySlot : currentTeam.length;
  
  addToTeam(slotIndex, pokemonId, cleanName);
  
  // Switch to team builder tab
  const teamTab = document.querySelector('[data-tab="teambuilder"]');
  if (teamTab) teamTab.click();
};

// Remove Pokemon from team
function removeFromTeam(slotIndex) {
  currentTeam[slotIndex] = null;
  saveTeam();
  renderTeamBuilder();
}

// Clear entire team
function confirmClearTeam() {
  if (confirm('Clear this team?')) {
    currentTeam = [];
    saveTeam();
    renderTeamBuilder();
  }
}

// Team management
function switchTeam(teamName) {
  currentTeamName = teamName;
  currentTeam = savedTeams[teamName] || [];
  renderTeamBuilder();
}

function showNewTeamModal() {
  const name = prompt('Enter team name:');
  if (name && name.trim()) {
    const teamName = name.trim();
    if (savedTeams[teamName]) {
      alert('Team name already exists!');
      return;
    }
    savedTeams[teamName] = [];
    currentTeamName = teamName;
    currentTeam = [];
    saveTeam();
    renderTeamBuilder();
  }
}

function renameCurrentTeam() {
  const newName = prompt('Rename team:', currentTeamName);
  if (newName && newName.trim() && newName !== currentTeamName) {
    const teamName = newName.trim();
    if (savedTeams[teamName]) {
      alert('Team name already exists!');
      return;
    }
    savedTeams[teamName] = currentTeam;
    delete savedTeams[currentTeamName];
    currentTeamName = teamName;
    saveTeam();
    renderTeamBuilder();
  }
}

function deleteCurrentTeam() {
  if (Object.keys(savedTeams).length === 1) {
    alert('Cannot delete your only team!');
    return;
  }
  if (confirm(`Delete team "${currentTeamName}"?`)) {
    delete savedTeams[currentTeamName];
    currentTeamName = Object.keys(savedTeams)[0];
    currentTeam = savedTeams[currentTeamName];
    saveTeam();
    renderTeamBuilder();
  }
}

// Defensive weakness analysis (enhanced with abilities)
function renderDefensiveWeaknesses() {
  const weaknesses = {};
  const resistances = {};
  const immunities = {};
  const TYPE_CHART = window.TYPE_CHART_DATA;
  
  currentTeam.forEach(pokemon => {
    if (!pokemon) return;
    
    // Check for ability-based immunities
    const abilityImmunities = [];
    if (pokemon.abilities) {
      pokemon.abilities.forEach(ability => {
        const abilityLower = ability.toLowerCase();
        if (abilityLower.includes('levitate')) abilityImmunities.push('ground');
        if (abilityLower.includes('flash fire')) abilityImmunities.push('fire');
        if (abilityLower.includes('water absorb')) abilityImmunities.push('water');
        if (abilityLower.includes('volt absorb')) abilityImmunities.push('electric');
        if (abilityLower.includes('sap sipper')) abilityImmunities.push('grass');
      });
    }
    
    Object.keys(TYPE_CHART).forEach(attackType => {
      let effectiveness = 1;
      
      // Check ability immunities first
      if (abilityImmunities.includes(attackType)) {
        effectiveness = 0;
      } else {
        // Calculate type-based effectiveness
        pokemon.types.forEach(defenseType => {
          const data = TYPE_CHART[defenseType];
          if (data.immunities.includes(attackType)) {
            effectiveness *= 0;
          } else if (data.weaknesses.includes(attackType)) {
            effectiveness *= 2;
          } else if (data.resistances.includes(attackType)) {
            effectiveness *= 0.5;
          }
        });
      }
      
      if (effectiveness >= 2) {
        if (!weaknesses[attackType]) weaknesses[attackType] = [];
        weaknesses[attackType].push(pokemon.name);
      } else if (effectiveness === 0) {
        if (!immunities[attackType]) immunities[attackType] = [];
        immunities[attackType].push(pokemon.name);
      } else if (effectiveness <= 0.5) {
        if (!resistances[attackType]) resistances[attackType] = [];
        resistances[attackType].push(pokemon.name);
      }
    });
  });

  const criticalWeaknesses = Object.entries(weaknesses)
    .filter(([type, pokemons]) => pokemons.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  return `
    ${criticalWeaknesses.length > 0 ? `
      <div class="critical-weaknesses">
        <h4>🚨 Critical Weaknesses</h4>
        <div class="weakness-list">
          ${criticalWeaknesses.map(([type, pokemons]) => `
            <div class="weakness-item critical">
              <span class="type-badge type-${type}">${type}</span>
              <span class="weakness-count">${pokemons.length}×</span>
              <span class="weakness-pokemon">${pokemons.join(', ')}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    
    <div class="weakness-summary">
      <div class="summary-stat">
        <span class="stat-value danger">${Object.keys(weaknesses).length}</span>
        <span class="stat-label">Weak To</span>
      </div>
      <div class="summary-stat">
        <span class="stat-value success">${Object.keys(resistances).length}</span>
        <span class="stat-label">Resists</span>
      </div>
      <div class="summary-stat">
        <span class="stat-value info">${Object.keys(immunities).length}</span>
        <span class="stat-label">Immune To</span>
      </div>
    </div>
  `;
}

// Team statistics
function renderTeamStats() {
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  let totalStats = { hp: 0, attack: 0, defense: 0, 'special-attack': 0, 'special-defense': 0, speed: 0 };
  let count = 0;

  currentTeam.forEach(pokemon => {
    if (!pokemon) return;
    const fullData = allPokemonData[pokemon.cleanName];
    if (fullData?.stats) {
      Object.keys(totalStats).forEach(stat => {
        totalStats[stat] += fullData.stats[stat] || 0;
      });
      count++;
    }
  });

  if (count === 0) return '<p>No stat data available</p>';

  const avgStats = {};
  Object.keys(totalStats).forEach(stat => {
    avgStats[stat] = Math.round(totalStats[stat] / count);
  });

  return `
    <div class="team-stats-grid">
      <div class="stat-item">
        <span class="stat-name">HP</span>
        <span class="stat-value">${avgStats.hp}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">Attack</span>
        <span class="stat-value">${avgStats.attack}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">Defense</span>
        <span class="stat-value">${avgStats.defense}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">Sp. Atk</span>
        <span class="stat-value">${avgStats['special-attack']}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">Sp. Def</span>
        <span class="stat-value">${avgStats['special-defense']}</span>
      </div>
      <div class="stat-item">
        <span class="stat-name">Speed</span>
        <span class="stat-value">${avgStats.speed}</span>
      </div>
    </div>
    <p class="stats-note">Average base stats across your team</p>
  `;
}

// Suggest Pokemon based on team weaknesses
function suggestPokemon() {
  if (currentTeam.filter(p => p).length >= MAX_TEAM_SIZE) {
    alert('Team is full!');
    return;
  }
  
  // Analyze what the team needs
  const weaknesses = {};
  const TYPE_CHART = window.TYPE_CHART_DATA;
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  
  // Find types that hit multiple team members
  currentTeam.forEach(pokemon => {
    if (!pokemon) return;
    Object.keys(TYPE_CHART).forEach(attackType => {
      let effectiveness = 1;
      pokemon.types.forEach(defenseType => {
        const data = TYPE_CHART[defenseType];
        if (data.weaknesses.includes(attackType)) effectiveness *= 2;
      });
      if (effectiveness >= 2) {
        weaknesses[attackType] = (weaknesses[attackType] || 0) + 1;
      }
    });
  });
  
  // Find Pokemon that resist these common weaknesses
  const suggestions = Object.values(allPokemonData)
    .filter(p => !isMegaForm(p.cleanName) && !currentTeam.some(tp => tp && tp.id === p.id))
    .map(p => {
      let score = 0;
      Object.entries(weaknesses).forEach(([type, count]) => {
        const data = TYPE_CHART[type];
        p.types.forEach(defenseType => {
          const typeData = TYPE_CHART[defenseType];
          if (typeData.immunities.includes(type)) score += count * 3;
          else if (typeData.resistances.includes(type)) score += count * 2;
        });
      });
      return { pokemon: p, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
  
  if (suggestions.length === 0) {
    alert('No specific suggestions - your team looks good!');
    return;
  }
  
  const emptySlot = currentTeam.findIndex((p, i) => !p && i < MAX_TEAM_SIZE);
  const slotIndex = emptySlot >= 0 ? emptySlot : currentTeam.length;
  
  const modalHtml = `
    <div class="pokemon-selector-modal">
      <h3>💡 Suggested Pokémon</h3>
      <p style="color: var(--text-muted); margin-bottom: 15px; font-size: 0.9rem;">
        Based on your team's weaknesses, these Pokémon would help defensively:
      </p>
      <div class="selector-results">
        ${suggestions.map(s => {
          const p = s.pokemon;
          const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
          return `
            <div class="selector-pokemon" onclick="addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')">
              <img src="${p.sprite}" alt="${p.name}" loading="lazy">
              <div class="selector-pokemon-info">
                <div class="selector-pokemon-name">${p.name}</div>
                <div class="selector-pokemon-types">${types}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  const overlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = modalHtml;
  overlay.classList.add('active');
  window.currentSelectorSlot = slotIndex;
}

// Team templates
const TEAM_TEMPLATES = {
  'Rain Team': ['Pelipper', 'Barraskewda', 'Kingdra', 'Ferrothorn', 'Toxapex', 'Rillaboom'],
  'Sun Team': ['Torkoal', 'Venusaur', 'Charizard', 'Heatran', 'Landorus', 'Tapu Fini'],
  'Sand Team': ['Tyranitar', 'Excadrill', 'Gastrodon', 'Mandibuzz', 'Heatran', 'Latios'],
  'Trick Room': ['Porygon2', 'Stakataka', 'Marowak', 'Torkoal', 'Glastrier', 'Amoonguss'],
  'Hyper Offense': ['Dragapult', 'Garchomp', 'Volcarona', 'Kartana', 'Tapu Koko', 'Melmetal'],
  'Balanced Core': ['Landorus', 'Toxapex', 'Corviknight', 'Heatran', 'Tapu Fini', 'Rillaboom'],
  'Stall Team': ['Toxapex', 'Ferrothorn', 'Chansey', 'Corviknight', 'Hippowdon', 'Slowbro'],
};

function showTemplatesModal() {
  const modalHtml = `
    <div class="templates-modal">
      <h3>📋 Team Templates</h3>
      <p style="color: var(--text-muted); margin-bottom: 15px; font-size: 0.9rem;">
        Load a competitive team template to get started:
      </p>
      <div class="template-list">
        ${Object.entries(TEAM_TEMPLATES).map(([name, pokemon]) => `
          <div class="template-item" onclick="loadTemplate('${name}')">
            <div class="template-name">${name}</div>
            <div class="template-pokemon">${pokemon.join(' • ')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  const overlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = modalHtml;
  overlay.classList.add('active');
}

function loadTemplate(templateName) {
  const pokemonNames = TEAM_TEMPLATES[templateName];
  if (!pokemonNames) return;
  
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  const newTeam = [];
  
  pokemonNames.forEach(name => {
    const cleanName = name.toLowerCase().replace(/[^a-z]/g, '');
    const pokemon = allPokemonData[cleanName];
    
    if (pokemon) {
      newTeam.push({
        id: pokemon.id,
        name: pokemon.name,
        cleanName: pokemon.cleanName,
        types: pokemon.types,
        sprite: pokemon.sprite,
        abilities: pokemon.abilities || []
      });
    }
  });
  
  if (newTeam.length > 0) {
    currentTeam = newTeam;
    saveTeam();
    closeModal();
    renderTeamBuilder();
  } else {
    alert('Could not load template - some Pokémon not found in database.');
  }
}

// Export team
function exportTeam() {
  const teamCode = btoa(JSON.stringify(currentTeam.map(p => p ? p.cleanName : null)));
  const url = `${window.location.origin}${window.location.pathname}?team=${teamCode}`;
  
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Team link copied to clipboard!');
  }).catch(() => {
    prompt('Copy this link to share your team:', url);
  });
}

// Import team modal
function showImportModal() {
  const modalHtml = `
    <div class="import-modal">
      <h3>📥 Import Team</h3>
      <p>Paste a team link or code below:</p>
      <textarea id="importCode" placeholder="https://... or paste team code" rows="4"></textarea>
      <div class="import-actions">
        <button class="btn-primary" onclick="importTeam()">Import</button>
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
      </div>
    </div>
  `;
  
  const overlay = document.getElementById('modalOverlay');
  const modalBody = document.getElementById('modalBody');
  modalBody.innerHTML = modalHtml;
  overlay.classList.add('active');
}

// Import team from code
function importTeam() {
  const input = document.getElementById('importCode').value.trim();
  let teamCode = input;
  
  if (input.includes('?team=')) {
    teamCode = input.split('?team=')[1].split('&')[0];
  }
  
  try {
    const cleanNames = JSON.parse(atob(teamCode));
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    
    currentTeam = cleanNames.map(cleanName => {
      if (!cleanName) return null;
      const pokemon = allPokemonData[cleanName];
      if (!pokemon) return null;
      
      return {
        id: pokemon.id,
        name: pokemon.name,
        cleanName: pokemon.cleanName,
        types: pokemon.types,
        sprite: pokemon.sprite,
        abilities: pokemon.abilities || []
      };
    }).filter(p => p !== null);
    
    saveTeam();
    closeModal();
    renderTeamBuilder();
    alert('✅ Team imported successfully!');
  } catch (e) {
    alert('❌ Invalid team code.');
  }
}

// Check for team in URL on page load
function checkTeamInURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const teamCode = urlParams.get('team');
  
  if (teamCode) {
    try {
      const cleanNames = JSON.parse(atob(teamCode));
      const allPokemonData = window.localDB?.pokemon || window.localDB || {};
      
      const importedTeam = cleanNames.map(cleanName => {
        if (!cleanName) return null;
        const pokemon = allPokemonData[cleanName];
        if (!pokemon) return null;
        
        return {
          id: pokemon.id,
          name: pokemon.name,
          cleanName: pokemon.cleanName,
          types: pokemon.types,
          sprite: pokemon.sprite,
          abilities: pokemon.abilities || []
        };
      }).filter(p => p !== null);
      
      if (importedTeam.length > 0) {
        currentTeam = importedTeam;
        saveTeam();
      }
    } catch (e) {
      console.error('Invalid team code in URL');
    }
  }
}
