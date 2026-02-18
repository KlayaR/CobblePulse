// Team Builder Logic

let currentTeam = [];
const MAX_TEAM_SIZE = 6;

// Load team from localStorage
function loadTeam() {
  const saved = localStorage.getItem('cobblePulseTeam');
  if (saved) {
    try {
      currentTeam = JSON.parse(saved);
    } catch (e) {
      currentTeam = [];
    }
  }
}

// Save team to localStorage
function saveTeam() {
  localStorage.setItem('cobblePulseTeam', JSON.stringify(currentTeam));
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

  container.innerHTML = `
    <div class="team-builder-header">
      <h2>⚔️ Team Builder</h2>
      <p class="team-subtitle">Build your competitive team and analyze type coverage</p>
    </div>

    <div class="team-actions">
      <button class="team-action-btn export-btn" onclick="exportTeam()" ${currentTeam.length === 0 ? 'disabled' : ''}>
        📤 Export Team
      </button>
      <button class="team-action-btn import-btn" onclick="showImportModal()">
        📥 Import Team
      </button>
      <button class="team-action-btn clear-btn" onclick="confirmClearTeam()" ${currentTeam.length === 0 ? 'disabled' : ''}>
        🗑️ Clear Team
      </button>
    </div>

    <div class="team-slots">
      ${renderTeamSlots()}
    </div>

    ${currentTeam.length > 0 ? `
      <div class="team-analysis">
        <div class="analysis-section coverage-section">
          <h3>⚔️ Offensive Coverage</h3>
          <p class="analysis-desc">Types your team can hit super effectively</p>
          ${renderOffensiveCoverage()}
        </div>

        <div class="analysis-section weakness-section">
          <h3>🛡️ Defensive Weaknesses</h3>
          <p class="analysis-desc">Types that threaten your team</p>
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
        <p>Click the + button on any slot to add Pokémon from your favorites or search</p>
        <p class="tip">💡 Tip: Add Pokémon to favorites (⭐) first for easier team building</p>
      </div>
    `}
  `;
}

// Render team slots
function renderTeamSlots() {
  let html = '';
  for (let i = 0; i < MAX_TEAM_SIZE; i++) {
    const pokemon = currentTeam[i];
    if (pokemon) {
      const types = pokemon.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
      html += `
        <div class="team-slot filled">
          <button class="remove-slot-btn" onclick="removeFromTeam(${i})" title="Remove from team">✕</button>
          <img src="${pokemon.sprite}" alt="${pokemon.name}" class="slot-sprite" loading="lazy">
          <div class="slot-info">
            <div class="slot-name">${pokemon.name}</div>
            <div class="slot-types">${types}</div>
          </div>
          <button class="view-details-btn" onclick="openModal(${pokemon.id}, '${pokemon.cleanName}')" title="View details">
            ℹ️
          </button>
        </div>
      `;
    } else {
      html += `
        <div class="team-slot empty" onclick="showPokemonSelector(${i})">
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

  // Store current slot index
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

  // Sort by dex number
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
    sprite: pokemon.sprite
  };

  saveTeam();
  closeModal();
  renderTeamBuilder();
}

// Remove Pokemon from team
function removeFromTeam(slotIndex) {
  currentTeam[slotIndex] = null;
  // Compact array (remove nulls)
  currentTeam = currentTeam.filter(p => p !== null);
  saveTeam();
  renderTeamBuilder();
}

// Clear entire team
function confirmClearTeam() {
  if (confirm('Are you sure you want to clear your entire team?')) {
    currentTeam = [];
    saveTeam();
    renderTeamBuilder();
  }
}

// Offensive coverage analysis
function renderOffensiveCoverage() {
  const coverage = {};
  const TYPE_CHART = window.TYPE_CHART_DATA;
  
  // For each type, check if any team member can hit it super effectively
  Object.keys(TYPE_CHART).forEach(defenseType => {
    const typeData = TYPE_CHART[defenseType];
    const hitters = [];
    
    currentTeam.forEach(pokemon => {
      if (!pokemon) return;
      pokemon.types.forEach(attackType => {
        if (typeData.weaknesses.includes(attackType)) {
          hitters.push(pokemon.name);
        }
      });
    });
    
    if (hitters.length > 0) {
      coverage[defenseType] = [...new Set(hitters)];
    }
  });

  const coveredTypes = Object.keys(coverage);
  const uncoveredTypes = Object.keys(TYPE_CHART).filter(t => !coveredTypes.includes(t));

  return `
    <div class="coverage-grid">
      ${coveredTypes.map(type => `
        <div class="coverage-item covered" title="${coverage[type].join(', ')} can hit ${type} super effectively">
          <span class="type-badge type-${type}">${type}</span>
          <span class="coverage-count">✓</span>
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
    ` : '<div class="perfect-coverage">🎯 Perfect Coverage! Your team can hit all types super effectively.</div>'}
  `;
}

// Defensive weakness analysis
function renderDefensiveWeaknesses() {
  const weaknesses = {};
  const resistances = {};
  const immunities = {};
  const TYPE_CHART = window.TYPE_CHART_DATA;
  
  // Analyze each team member's defensive profile
  currentTeam.forEach(pokemon => {
    if (!pokemon) return;
    
    // For dual types, calculate combined effectiveness
    const typeData = pokemon.types.map(t => TYPE_CHART[t]);
    
    // Check each attacking type
    Object.keys(TYPE_CHART).forEach(attackType => {
      let effectiveness = 1;
      
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

  // Find types that hit multiple team members
  const criticalWeaknesses = Object.entries(weaknesses)
    .filter(([type, pokemons]) => pokemons.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);

  return `
    ${criticalWeaknesses.length > 0 ? `
      <div class="critical-weaknesses">
        <h4>🚨 Critical Weaknesses (2+ Pokémon)</h4>
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

// Export team
function exportTeam() {
  const teamCode = btoa(JSON.stringify(currentTeam.map(p => p ? p.cleanName : null)));
  const url = `${window.location.origin}${window.location.pathname}?team=${teamCode}`;
  
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Team link copied to clipboard! Share it with others.');
  }).catch(() => {
    prompt('Copy this link to share your team:', url);
  });
}

// Import team modal
function showImportModal() {
  const modalHtml = `
    <div class="import-modal">
      <h3>Import Team</h3>
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
  
  // Extract code from URL if needed
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
        sprite: pokemon.sprite
      };
    }).filter(p => p !== null);
    
    saveTeam();
    closeModal();
    renderTeamBuilder();
    alert('✅ Team imported successfully!');
  } catch (e) {
    alert('❌ Invalid team code. Please check and try again.');
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
          sprite: pokemon.sprite
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
