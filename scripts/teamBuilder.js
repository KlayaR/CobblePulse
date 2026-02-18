// Team Builder Logic - Complete Enhanced Version

(function() {
  'use strict';
  
  let currentTeam = [];
  let savedTeams = {};
  let currentTeamName = 'default';
  const MAX_TEAM_SIZE = 6;
  const MIN_COMPETITIVE_BST = 480;
  let currentSelectorTab = 'favorites';
  
  // Global suggestion filters (persisted)
  let suggestionFilters = {
    allowLegendaries: JSON.parse(localStorage.getItem('cobblePulse_allowLegendaries') || 'true'),
    difficulty: localStorage.getItem('cobblePulse_difficulty') || 'balanced'
  };

  // Ensure favorites is available
  if (typeof window.favorites === 'undefined') {
    window.favorites = JSON.parse(localStorage.getItem('cobblePulseFavorites') || '[]');
  }

  function saveSuggestionFilters() {
    localStorage.setItem('cobblePulse_allowLegendaries', suggestionFilters.allowLegendaries);
    localStorage.setItem('cobblePulse_difficulty', suggestionFilters.difficulty);
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

  // Helper function to extract ability names properly
  function getAbilityText(pokemon) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const fullData = allPokemonData[pokemon.cleanName];
    
    if (!fullData || !fullData.abilities) return 'Unknown';
    
    const abilities = fullData.abilities;
    
    // Handle array of abilities
    if (Array.isArray(abilities)) {
      const abilityNames = [];
      
      abilities.forEach(ability => {
        if (typeof ability === 'string') {
          abilityNames.push(ability);
        } else if (ability && typeof ability === 'object') {
          // Handle objects with name or ability property
          if (ability.name) abilityNames.push(ability.name);
          else if (ability.ability && ability.ability.name) abilityNames.push(ability.ability.name);
        }
      });
      
      if (abilityNames.length > 0) {
        return abilityNames.slice(0, 2).join(' / ');
      }
    }
    // Handle single string ability
    else if (typeof abilities === 'string') {
      return abilities;
    }
    // Handle single object ability
    else if (abilities && typeof abilities === 'object') {
      if (abilities.name) return abilities.name;
      if (abilities.ability && abilities.ability.name) return abilities.ability.name;
    }
    
    return 'Unknown';
  }

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
      </div>
    ` : '';

    container.innerHTML = `
      <div class="team-builder-header">
        <h2>⚔️ Team Builder</h2>
        <p class="team-subtitle">Build your competitive team and analyze coverage</p>
        ${teamSelector}
      </div>

      <div class="team-actions">
        <button class="team-action-btn export-btn" onclick="exportTeam()" ${currentTeam.filter(p=>p).length === 0 ? 'disabled' : ''}>
          📤 Export Team
        </button>
        <button class="team-action-btn import-btn" onclick="showImportModal()">
          📥 Import Team
        </button>
        <button class="team-action-btn template-btn" onclick="showTemplatesModal()">
          📋 Templates
        </button>
        <button class="team-action-btn clear-btn" onclick="confirmClearTeam()" ${currentTeam.filter(p=>p).length === 0 ? 'disabled' : ''}>
          🗑️ Clear
        </button>
      </div>

      <!-- Global Suggestion Filters (moved above slots) -->
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

      <div class="team-slots" id="teamSlots">
        ${renderTeamSlots()}
      </div>

      ${currentTeam.filter(p => p).length > 0 ? `
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
        const types = pokemon.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
        const role = determineRole(pokemon);
        const roleIcon = getRoleIcon(role);
        const abilitiesText = getAbilityText(pokemon);
        
        html += `
          <div class="team-slot filled" draggable="true" data-slot="${i}">
            <button class="remove-slot-btn" onclick="removeFromTeam(${i})" title="Remove">✕</button>
            <div class="slot-role-badge" title="${role}">${roleIcon}</div>
            <img src="${pokemon.sprite}" alt="${pokemon.name}" class="slot-sprite" loading="lazy">
            <div class="slot-info">
              <div class="slot-name">${pokemon.name}</div>
              <div class="slot-types">${types}</div>
              <div class="slot-ability" title="Ability">${abilitiesText}</div>
            </div>
            <button class="view-details-btn" onclick="openModal(${pokemon.id}, '${pokemon.cleanName}')" title="Details">
              ℹ️
            </button>
          </div>
        `;
      } else {
        html += `
          <div class="team-slot empty" data-slot="${i}">
            <div class="slot-suggestion-btns">
              <button class="suggest-btn" onclick="showSmartSuggestion(${i})" title="Smart AI Suggestion">
                <span class="btn-icon">💡</span>
                <span class="btn-text">Suggest</span>
              </button>
              <button class="random-btn" onclick="showRandomSuggestion(${i})" title="Random Pick">
                <span class="btn-icon">🎲</span>
                <span class="btn-text">Random</span>
              </button>
            </div>
            <div class="empty-slot-content" onclick="showPokemonSelector(${i})" style="cursor:pointer;">
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
      <div class="coverage-stats"><div class="coverage-meter"><div class="coverage-meter-fill" style="width:${coveragePercent}%"></div><span class="coverage-meter-text">${coveragePercent}% Coverage (${coveredTypes.length}/18)</span></div></div>
      <div class="coverage-grid">${coveredTypes.map(type => `<div class="coverage-item covered" title="${coverage[type].join('\n')}"><span class="type-badge type-${type}">${type}</span><span class="coverage-count">${coverage[type].length}</span></div>`).join('')}</div>
      ${uncoveredTypes.length > 0 ? `<div class="uncovered-section"><h4>⚠️ Not Covered (${uncoveredTypes.length})</h4><div class="coverage-grid">${uncoveredTypes.map(type => `<span class="type-badge type-${type} uncovered-badge">${type}</span>`).join('')}</div></div>` : '<div class="perfect-coverage">🎯 Perfect!</div>'}
    `;
  }

  function getMoveType(moveName) {
    const moveTypes = {
      'earthquake': 'ground', 'ice beam': 'ice', 'thunderbolt': 'electric', 'flamethrower': 'fire',
      'surf': 'water', 'psychic': 'psychic', 'shadow ball': 'ghost', 'focus blast': 'fighting',
      'ice punch': 'ice', 'thunder punch': 'electric', 'fire punch': 'fire', 'drain punch': 'fighting',
      'stone edge': 'rock', 'iron head': 'steel', 'u-turn': 'bug', 'volt switch': 'electric',
      'scald': 'water', 'sludge bomb': 'poison', 'play rough': 'fairy', 'moonblast': 'fairy',
      'aura sphere': 'fighting', 'dark pulse': 'dark', 'knock off': 'dark', 'earth power': 'ground',
      'flash cannon': 'steel', 'energy ball': 'grass', 'hydro pump': 'water', 'brave bird': 'flying',
      'close combat': 'fighting', 'rock slide': 'rock', 'outrage': 'dragon', 'draco meteor': 'dragon'
    };
    return moveTypes[moveName.toLowerCase().replace(/[^a-z ]/g, '')] || null;
  }

  // Pokemon selector with proper rendering
  window.showPokemonSelector = function(slotIndex) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const favoritePokemon = Object.values(allPokemonData).filter(p => 
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
    
    let pokemonList = [];
    if (currentSelectorTab === 'favorites') {
      pokemonList = Object.values(allPokemonData).filter(p => 
        window.favorites.includes(p.cleanName) && !window.isMegaForm(p.cleanName)
      );
    } else {
      pokemonList = Object.values(allPokemonData).filter(p => !window.isMegaForm(p.cleanName));
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
  };

  function renderSelectorPokemon(pokemonList, slotIndex) {
    if (pokemonList.length === 0) {
      return '<div class="no-selector-results">No Pokémon found. Try adjusting your search or check the other tab.</div>';
    }

    return pokemonList.map(p => {
      const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
      const isInTeam = currentTeam.some(tp => tp && tp.id === p.id);
      
      return `
        <div class="selector-pokemon ${isInTeam ? 'in-team' : ''}" onclick="${isInTeam ? '' : `addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')`}" style="${isInTeam ? 'cursor:not-allowed;opacity:0.5;' : 'cursor:pointer;'}">
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

  window.addToTeam = function(slotIndex, pokemonId, cleanName) {
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
    if(window.closeModal) window.closeModal();
    renderTeamBuilder();
  };

  window.removeFromTeam = function(slotIndex) { 
    currentTeam[slotIndex] = null; 
    saveTeam(); 
    renderTeamBuilder(); 
  };
  
  window.confirmClearTeam = function() { 
    if(confirm('Clear this team? This cannot be undone.')) { 
      currentTeam = [];
      saveTeam(); 
      renderTeamBuilder(); 
    }
  };

  // ========================================
  // PER-SLOT SMART SUGGESTION
  // ========================================
  
  window.showSmartSuggestion = function(slotIndex) {
    const suggestions = smartSuggest(suggestionFilters.allowLegendaries, suggestionFilters.difficulty);
    
    if (suggestions.length === 0) {
      alert('No suitable suggestions found. Try adjusting the filters above the team slots.');
      return;
    }
    
    const modalHtml = `
      <div class="pokemon-selector-modal">
        <h3>💡 Smart Suggestions for Slot ${slotIndex + 1}</h3>
        <p style="color:var(--text-muted);margin-bottom:15px;font-size:0.9rem;">
          ${suggestions[0].reasons.slice(0, 2).join(' • ')}
        </p>
        <div class="selector-results" style="max-height:60vh;overflow-y:auto;">
          ${suggestions.map((s, idx) => {
            const p = s.pokemon;
            const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
            const roleIcon = getRoleIcon(s.role);
            const bstInfo = p.stats ? Object.values(p.stats).reduce((a,b) => a+b, 0) : '?';
            const rarityBadge = p.isLegendary || p.isMythical ? '<span style="color:#ffd700;">✨ Legendary</span>' : 
                               s.rarity === 'common' ? '<span style="color:#4ade80;">📍 Common</span>' : 
                               s.rarity === 'uncommon' ? '<span style="color:#60a5fa;">📍 Uncommon</span>' : '';
            
            return `
              <div class="selector-pokemon" onclick="addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')" style="cursor:pointer;position:relative;">
                <div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.8);padding:3px 8px;border-radius:4px;font-size:0.75rem;font-weight:bold;color:#4ade80;">
                  #${idx + 1} Score: ${s.score}
                </div>
                <div style="position:absolute;top:5px;left:5px;font-size:1.3rem;" title="${s.role}">
                  ${roleIcon}
                </div>
                <img src="${p.sprite}" alt="${p.name}" loading="lazy">
                <div class="selector-pokemon-info">
                  <div class="selector-pokemon-name">${p.name}</div>
                  <div class="selector-pokemon-types">${types}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
                    BST: ${bstInfo} | ${rarityBadge}
                  </div>
                  <div style="font-size:0.7rem;color:var(--text-secondary);margin-top:6px;line-height:1.3;">
                    ${s.reasons.slice(0, 2).join('<br>')}
                  </div>
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
  };

  // ========================================
  // PER-SLOT RANDOM SUGGESTION
  // ========================================
  
  window.showRandomSuggestion = function(slotIndex) {
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    
    let candidates = Object.values(allPokemonData).filter(p => {
      if (window.isMegaForm(p.cleanName)) return false;
      if (currentTeam.some(tp => tp && tp.id === p.id)) return false;
      if (!suggestionFilters.allowLegendaries && (p.isLegendary || p.isMythical)) return false;
      
      if (p.stats) {
        const bst = Object.values(p.stats).reduce((a, b) => a + b, 0);
        if (suggestionFilters.difficulty === 'competitive' && bst < 520) return false;
        if (suggestionFilters.difficulty === 'balanced' && bst < 480) return false;
        if (suggestionFilters.difficulty === 'easy') {
          if (bst < 450 || bst > 550) return false;
          if (!p.locations || p.locations.length === 0) return false;
          const hasCommonSpawn = p.locations.some(loc => 
            loc.rarity && (loc.rarity.toLowerCase().includes('common') || 
                          loc.rarity.toLowerCase().includes('frequent'))
          );
          if (!hasCommonSpawn) return false;
        }
      }
      
      return true;
    });
    
    if (candidates.length === 0) {
      alert('No Pokémon match the current filters. Try adjusting the settings above.');
      return;
    }
    
    const randomPicks = [];
    const pickedIndices = new Set();
    while (randomPicks.length < Math.min(12, candidates.length)) {
      const idx = Math.floor(Math.random() * candidates.length);
      if (!pickedIndices.has(idx)) {
        pickedIndices.add(idx);
        randomPicks.push(candidates[idx]);
      }
    }
    
    const modalHtml = `
      <div class="pokemon-selector-modal">
        <h3>🎲 Random Picks for Slot ${slotIndex + 1}</h3>
        <p style="color:var(--text-muted);margin-bottom:15px;font-size:0.9rem;">
          Random selection (${suggestionFilters.difficulty} difficulty, ${suggestionFilters.allowLegendaries ? 'with' : 'no'} legendaries)
        </p>
        <div class="selector-results" style="max-height:60vh;overflow-y:auto;">
          ${randomPicks.map(p => {
            const types = p.types.map(t => `<span class="type-badge type-${t}">${t}</span>`).join('');
            const role = determineRole({ ...p, abilities: p.abilities || [] });
            const roleIcon = getRoleIcon(role);
            const bstInfo = p.stats ? Object.values(p.stats).reduce((a,b) => a+b, 0) : '?';
            const rarityBadge = p.isLegendary || p.isMythical ? '<span style="color:#ffd700;">✨ Legendary</span>' : 
                               p.locations?.some(loc => loc.rarity?.toLowerCase().includes('common')) ? '<span style="color:#4ade80;">📍 Common</span>' : '';
            
            return `
              <div class="selector-pokemon" onclick="addToTeam(${slotIndex}, ${p.id}, '${p.cleanName}')" style="cursor:pointer;position:relative;">
                <div style="position:absolute;top:5px;left:5px;font-size:1.3rem;" title="${role}">
                  ${roleIcon}
                </div>
                <img src="${p.sprite}" alt="${p.name}" loading="lazy">
                <div class="selector-pokemon-info">
                  <div class="selector-pokemon-name">${p.name}</div>
                  <div class="selector-pokemon-types">${types}</div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">
                    BST: ${bstInfo} | ${rarityBadge}
                  </div>
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
  };

  function smartSuggest(allowLegendaries, difficulty) {
    const TYPE_CHART = window.TYPE_CHART_DATA;
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    
    if (!TYPE_CHART) return [];
    
    const defensiveWeaknesses = {};
    const coveredTypes = new Set();
    const teamRoles = {};
    let totalSpeed = 0, totalDefense = 0, teamCount = 0;
    
    currentTeam.forEach(pokemon => {
      if (!pokemon) return;
      
      Object.keys(TYPE_CHART).forEach(attackType => {
        let effectiveness = 1;
        pokemon.types.forEach(defenseType => {
          const data = TYPE_CHART[defenseType];
          if (data.weaknesses.includes(attackType)) effectiveness *= 2;
        });
        if (effectiveness >= 2) {
          defensiveWeaknesses[attackType] = (defensiveWeaknesses[attackType] || 0) + 1;
        }
      });
      
      const fullData = allPokemonData[pokemon.cleanName];
      pokemon.types.forEach(type => {
        Object.keys(TYPE_CHART).forEach(defType => {
          if (TYPE_CHART[defType].weaknesses.includes(type)) coveredTypes.add(defType);
        });
      });
      
      const role = determineRole(pokemon);
      teamRoles[role] = (teamRoles[role] || 0) + 1;
      
      if (fullData?.stats) {
        totalSpeed += fullData.stats.speed;
        totalDefense += fullData.stats.defense + fullData.stats['special-defense'];
        teamCount++;
      }
    });
    
    const avgSpeed = teamCount > 0 ? totalSpeed / teamCount : 0;
    const avgDefense = teamCount > 0 ? totalDefense / teamCount : 0;
    const uncoveredTypes = Object.keys(TYPE_CHART).filter(t => !coveredTypes.has(t));
    
    const candidates = Object.values(allPokemonData)
      .filter(p => {
        if (window.isMegaForm(p.cleanName)) return false;
        if (currentTeam.some(tp => tp && tp.id === p.id)) return false;
        if (!allowLegendaries && (p.isLegendary || p.isMythical)) return false;
        
        if (p.stats) {
          const bst = Object.values(p.stats).reduce((a, b) => a + b, 0);
          if (difficulty === 'competitive' && bst < 520) return false;
          if (difficulty === 'balanced' && bst < 480) return false;
          if (difficulty === 'easy') {
            if (bst < 450 || bst > 550) return false;
            if (!p.locations || p.locations.length === 0) return false;
            const hasCommonSpawn = p.locations.some(loc => 
              loc.rarity && (loc.rarity.toLowerCase().includes('common') || 
                            loc.rarity.toLowerCase().includes('frequent'))
            );
            if (!hasCommonSpawn) return false;
          }
        }
        
        return true;
      })
      .map(p => {
        let score = 0;
        const reasons = [];
        const role = determineRole({ ...p, abilities: p.abilities || [] });
        
        let rarity = 'uncommon';
        if (p.locations && p.locations.length > 0) {
          const hasCommon = p.locations.some(loc => loc.rarity?.toLowerCase().includes('common'));
          if (hasCommon) rarity = 'common';
        }
        
        let defenseScore = 0;
        Object.entries(defensiveWeaknesses).forEach(([type, count]) => {
          p.types.forEach(defenseType => {
            const typeData = TYPE_CHART[defenseType];
            if (typeData.immunities.includes(type)) {
              defenseScore += count * 15;
              reasons.push(`🛡️ Immune to ${type} (${count}× weak)`);
            } else if (typeData.resistances.includes(type)) {
              defenseScore += count * 8;
              reasons.push(`🛡️ Resists ${type} (${count}× weak)`);
            }
          });
        });
        score += Math.min(defenseScore, 40);
        
        let coverageScore = 0;
        const newlyCovered = [];
        uncoveredTypes.forEach(uncoveredType => {
          p.types.forEach(attackType => {
            if (TYPE_CHART[uncoveredType].weaknesses.includes(attackType)) {
              coverageScore += 12;
              newlyCovered.push(uncoveredType);
            }
          });
        });
        if (newlyCovered.length > 0) {
          reasons.push(`⚔️ Covers ${newlyCovered.slice(0, 3).join(', ')}`);
        }
        score += Math.min(coverageScore, 35);
        
        const needsFastSweeper = avgSpeed < 80 && (teamRoles['Fast Sweeper'] || 0) < 2;
        const needsWall = avgDefense < 150 && (teamRoles['Wall/Tank'] || 0) < 2;
        const hasTooManySweepers = (teamRoles['Fast Sweeper'] || 0) + (teamRoles['Slow Sweeper'] || 0) >= 4;
        
        if (needsFastSweeper && role === 'Fast Sweeper') {
          score += 25;
          reasons.push('⚡ Adds speed control');
        }
        if (needsWall && role === 'Wall/Tank') {
          score += 25;
          reasons.push('🛡️ Adds bulk');
        }
        if (hasTooManySweepers && (role === 'Wall/Tank' || role === 'Support/Utility')) {
          score += 20;
          reasons.push('⚖️ Balances offensive team');
        }
        
        if (difficulty === 'easy' && rarity === 'common') {
          score += 20;
          reasons.push('📍 Easy to obtain');
        } else if (difficulty === 'competitive' && p.stats) {
          const bst = Object.values(p.stats).reduce((a, b) => a + b, 0);
          if (bst >= 580) {
            score += 15;
            reasons.push('💪 High BST');
          }
        }
        
        return { pokemon: p, score, role, reasons, rarity };
      })
      .filter(s => s.score > 10)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    
    return candidates;
  }

  // ========================================
  // TEAM TEMPLATES
  // ========================================
  
  const TEAM_TEMPLATES = {
    'Balanced Core': {
      pokemon: ['Landorus', 'Toxapex', 'Corviknight', 'Heatran', 'Tapu Fini', 'Rillaboom'],
      desc: 'Well-rounded competitive team'
    },
    'Hyper Offense': {
      pokemon: ['Dragapult', 'Garchomp', 'Volcarona', 'Kartana', 'Tapu Koko', 'Melmetal'],
      desc: 'Fast aggressive sweepers'
    },
    'Easy Starter': {
      pokemon: ['Talonflame', 'Azumarill', 'Toxicroak', 'Ferrothorn', 'Hippowdon', 'Slowbro'],
      desc: 'Accessible with common spawns'
    },
    'Rain Team': {
      pokemon: ['Pelipper', 'Barraskewda', 'Kingdra', 'Ferrothorn', 'Toxapex', 'Rillaboom'],
      desc: 'Rain weather strategy'
    },
    'Sun Team': {
      pokemon: ['Torkoal', 'Venusaur', 'Charizard', 'Heatran', 'Landorus', 'Tapu Fini'],
      desc: 'Sun weather strategy'
    },
    'Stall Team': {
      pokemon: ['Toxapex', 'Ferrothorn', 'Chansey', 'Corviknight', 'Hippowdon', 'Slowbro'],
      desc: 'Ultra defensive team'
    }
  };
  
  window.showTemplatesModal = function() {
    const modalHtml = `
      <div class="templates-modal">
        <h3>📋 Team Templates</h3>
        <p style="color:var(--text-muted);margin-bottom:20px;font-size:0.9rem;">
          Load a pre-built competitive team:
        </p>
        <div class="template-list">
          ${Object.entries(TEAM_TEMPLATES).map(([name, data]) => `
            <div class="template-item" onclick="loadTemplate('${name}')" style="cursor:pointer;">
              <div class="template-name">${name}</div>
              <div class="template-desc">${data.desc}</div>
              <div class="template-pokemon">${data.pokemon.join(' • ')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    const overlay = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = modalHtml;
    overlay.classList.add('active');
  };
  
  window.loadTemplate = function(templateName) {
    const template = TEAM_TEMPLATES[templateName];
    if (!template) return;
    
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const newTeam = [];
    
    template.pokemon.forEach(name => {
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
      if (currentTeam.filter(p => p).length > 0) {
        if (!confirm(`Replace current team with "${templateName}"?`)) return;
      }
      currentTeam = newTeam;
      saveTeam();
      if(window.closeModal) window.closeModal();
      renderTeamBuilder();
    } else {
      alert('Could not load template.');
    }
  };

  // ========================================
  // IMPORT/EXPORT
  // ========================================
  
  window.exportTeam = function() {
    const teamCode = btoa(JSON.stringify(currentTeam.map(p => p ? p.cleanName : null)));
    const url = `${window.location.origin}${window.location.pathname}?team=${teamCode}`;
    
    navigator.clipboard.writeText(url).then(() => {
      alert('✅ Team link copied!');
    }).catch(() => {
      prompt('Copy this link:', url);
    });
  };
  
  window.showImportModal = function() {
    const modalHtml = `
      <div class="import-modal">
        <h3>📥 Import Team</h3>
        <p style="margin-bottom:15px;color:var(--text-muted);">Paste team link or code:</p>
        <textarea id="importCode" placeholder="https://... or paste code" rows="4" style="width:100%;padding:10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-family:monospace;"></textarea>
        <div style="margin-top:15px;display:flex;gap:10px;">
          <button class="btn-primary" onclick="importTeam()" style="flex:1;">Import</button>
          <button class="btn-secondary" onclick="closeModal()" style="flex:1;">Cancel</button>
        </div>
      </div>
    `;
    
    const overlay = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = modalHtml;
    overlay.classList.add('active');
  };
  
  window.importTeam = function() {
    const input = document.getElementById('importCode').value.trim();
    let teamCode = input.includes('?team=') ? input.split('?team=')[1].split('&')[0] : input;
    
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
      });
      
      if (importedTeam.filter(p => p).length > 0) {
        currentTeam = importedTeam;
        saveTeam();
        if(window.closeModal) window.closeModal();
        renderTeamBuilder();
        alert('✅ Team imported!');
      } else {
        alert('❌ No valid Pokémon found.');
      }
    } catch (e) {
      alert('❌ Invalid code.');
    }
  };

  // ========================================
  // TEAM MANAGEMENT
  // ========================================
  
  window.switchTeam = function(teamName) {
    currentTeamName = teamName;
    currentTeam = savedTeams[teamName] || [];
    renderTeamBuilder();
  };
  
  window.showNewTeamModal = function() {
    const name = prompt('Enter new team name:');
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
  };
  
  window.renameCurrentTeam = function() {
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
  };
  
  window.deleteCurrentTeam = function() {
    if (Object.keys(savedTeams).length === 1) {
      alert('Cannot delete your only team!');
      return;
    }
    if (confirm(`Delete "${currentTeamName}"?`)) {
      delete savedTeams[currentTeamName];
      currentTeamName = Object.keys(savedTeams)[0];
      currentTeam = savedTeams[currentTeamName];
      saveTeam();
      renderTeamBuilder();
    }
  };

  // ========================================
  // ANALYSIS HELPERS
  // ========================================
  
  function renderDefensiveWeaknesses() {
    const weaknesses = {}, resistances = {}, immunities = {};
    const TYPE_CHART = window.TYPE_CHART_DATA;
    
    if (!TYPE_CHART) return '<p>Type chart not loaded</p>';
    
    currentTeam.forEach(pokemon => {
      if (!pokemon) return;
      Object.keys(TYPE_CHART).forEach(attackType => {
        let effectiveness = 1;
        pokemon.types.forEach(defenseType => {
          const data = TYPE_CHART[defenseType];
          if (data.immunities.includes(attackType)) effectiveness *= 0;
          else if (data.weaknesses.includes(attackType)) effectiveness *= 2;
          else if (data.resistances.includes(attackType)) effectiveness *= 0.5;
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

    const criticalWeaknesses = Object.entries(weaknesses)
      .filter(([type, pokemons]) => pokemons.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    return `
      ${criticalWeaknesses.length > 0 ? `
        <div style="margin-bottom:15px;">
          <h4 style="color:#ef4444;margin-bottom:8px;">🚨 Critical Weaknesses</h4>
          ${criticalWeaknesses.map(([type, pokemons]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span class="type-badge type-${type}">${type}</span>
              <span style="color:#ef4444;font-weight:bold;">${pokemons.length}×</span>
              <span style="font-size:0.85rem;color:var(--text-muted);">${pokemons.join(', ')}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
        <div>
          <div style="font-size:1.8rem;font-weight:bold;color:#ef4444;">${Object.keys(weaknesses).length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">Weak To</div>
        </div>
        <div>
          <div style="font-size:1.8rem;font-weight:bold;color:#4ade80;">${Object.keys(resistances).length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">Resists</div>
        </div>
        <div>
          <div style="font-size:1.8rem;font-weight:bold;color:#60a5fa;">${Object.keys(immunities).length}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">Immune To</div>
        </div>
      </div>
    `;
  }
  
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
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;">
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">HP</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats.hp}</div>
        </div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Attack</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats.attack}</div>
        </div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Defense</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats.defense}</div>
        </div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Sp. Atk</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats['special-attack']}</div>
        </div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Sp. Def</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats['special-defense']}</div>
        </div>
        <div style="background:var(--bg-secondary);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">Speed</div>
          <div style="font-size:1.3rem;font-weight:bold;">${avgStats.speed}</div>
        </div>
      </div>
      <p style="text-align:center;margin-top:10px;font-size:0.85rem;color:var(--text-muted);">Average base stats</p>
    `;
  }
  
})();
