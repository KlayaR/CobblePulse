// --- FUZZY SEARCH: Levenshtein distance ---
function levenshtein(a, b) {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      matrix[i][j] = a[i - 1] === b[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]) + 1;
    }
  }
  return matrix[a.length][b.length];
}

function fuzzyMatch(query, target) {
  const distance = levenshtein(query.toLowerCase(), target.toLowerCase());
  return distance <= 2; // Allow 2 character mistakes
}

// --- HELPER: Check if a Pokémon is a Mega form ---
function isMegaForm(cleanName) {
  return cleanName.includes("mega") && !cleanName.includes("meganium");
}

// --- SMART SEARCH PARSER ---
function parseSmartSearch(query) {
  const filters = { text: "", type: null, ability: null, move: null, tier: null, statFilters: {} };
  const parts = query.split(/\s+/);

  parts.forEach((part) => {
    if (part.startsWith("type:"))    { filters.type    = part.substring(5).toLowerCase(); }
    else if (part.startsWith("ability:")) { filters.ability = part.substring(8).toLowerCase().replace(/-/g, ""); }
    else if (part.startsWith("move:"))   { filters.move    = part.substring(5).toLowerCase().replace(/-/g, ""); }
    else if (part.startsWith("tier:"))   { filters.tier    = part.substring(5).toLowerCase(); }
    else if (/^(hp|atk|def|spa|spd|spe|speed|attack|defense)([><]=?)(\d+)$/.test(part)) {
      const match = part.match(/^(hp|atk|def|spa|spd|spe|speed|attack|defense)([><]=?)(\d+)$/);
      filters.statFilters[match[1]] = { op: match[2], val: parseInt(match[3]) };
    } else if (part) {
      filters.text += (filters.text ? " " : "") + part;
    }
  });

  return filters;
}

// Helper: get a Pokémon's rank in the current tier
function getTierRank(p) {
  const allPokemon = window.localDB?.pokemon || window.localDB || {};
  const dbEntry = allPokemon[p.cleanName] || allPokemon[p.name] || {};
  if (!dbEntry.allRanks) return 999;
  const tierKey = currentTab === "ubers" ? "uber" : currentTab;
  const r = dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(tierKey));
  return r ? (r.rank || 999) : 999;
}

// --- HELPER: Run example search ---
function runExampleSearch(query) {
  DOM.searchInput.value = query;
  DOM.searchClear.classList.add("visible");
  // Switch to appropriate tab
  if (query.includes("tier:")) {
    const tier = query.match(/tier:(\w+)/)[1];
    const tabBtn = document.querySelector(`[data-tab="${tier}"]`);
    if (tabBtn) {
      DOM.tabs.forEach((t) => t.classList.remove("active"));
      tabBtn.classList.add("active");
      currentTab = tier;
    }
  } else {
    // Switch to "All" tab for general searches
    const allTab = document.querySelector('[data-tab="all"]');
    if (allTab && currentTab === "about") {
      DOM.tabs.forEach((t) => t.classList.remove("active"));
      allTab.classList.add("active");
      currentTab = "all";
    }
  }
  applyFilters();
}

// --- MAIN FILTER & RENDER ORCHESTRATOR ---
function applyFilters() {
  const query  = DOM.searchInput.value.toLowerCase();
  const sortBy = DOM.sortSelect ? DOM.sortSelect.value : "rank";
  const isTierTab = currentTab !== "about" && currentTab !== "all" && currentTab !== "favorites";

  // Always show unified filters on non-About tabs
  if (DOM.unifiedFilters) {
    DOM.unifiedFilters.style.display = currentTab === "about" ? "none" : "flex";
  }

  // --- ABOUT TAB ---
  if (currentTab === "about") {
    DOM.aboutPanel.style.display     = "block";
    DOM.tableContainer.style.display = "none";
    
    // Calculate statistics
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const totalPokemon = Object.keys(allPokemonData).filter(key => !isMegaForm(key)).length;
    const withSpawns = Object.values(allPokemonData).filter(p => !isMegaForm(p.cleanName) && p.locations && p.locations.length > 0).length;
    const legendaries = Object.values(allPokemonData).filter(p => !isMegaForm(p.cleanName) && (p.isLegendary || p.isMythical)).length;
    const buildDate = window.localDB?._meta?.buildTimestamp ? new Date(window.localDB._meta.buildTimestamp).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "Unknown";
    
    DOM.aboutPanel.innerHTML = `<div class="about-content">
      <h2>Welcome to CobblePulse! 🎮</h2>
      <p>CobblePulse is your complete guide to <a href="https://cobblemon.com/" target="_blank">Cobblemon</a> — 
        a Minecraft mod that brings Pokémon into your world. Here you'll find spawn locations, competitive tier rankings, 
        and battle strategies for every Pokémon.</p>
      
      <!-- Statistics Dashboard -->
      <div class="stats-dashboard">
        <div class="stat-box">
          <span class="stat-number">${totalPokemon}</span>
          <span class="stat-label">Total Pokémon</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${withSpawns}</span>
          <span class="stat-label">With Spawn Data</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${legendaries}</span>
          <span class="stat-label">Legendary/Mythical</span>
        </div>
        <div class="stat-box">
          <span class="stat-number">${buildDate}</span>
          <span class="stat-label">Last Updated</span>
        </div>
      </div>

      <!-- Feature Highlights -->
      <h2>✨ Features</h2>
      <div class="feature-grid">
        <div class="feature-card">
          <span class="feature-icon">⚡</span>
          <h3>Lightning Fast</h3>
          <p>Lazy loading images for optimal performance on any device</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🔍</span>
          <h3>Smart Search</h3>
          <p>Advanced filters with fuzzy matching and typo tolerance</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">🗺️</span>
          <h3>Spawn Locations</h3>
          <p>Server-specific spawn data from Cobbleverse</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">⚔️</span>
          <h3>Battle Ready</h3>
          <p>Competitive movesets, EVs, and strategies from Smogon</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">⭐</span>
          <h3>Favorites</h3>
          <p>Save your favorite Pokémon for quick access</p>
        </div>
        <div class="feature-card">
          <span class="feature-icon">📱</span>
          <h3>Mobile Friendly</h3>
          <p>Fully responsive design optimized for all screens</p>
        </div>
      </div>

      <!-- Interactive Search Examples -->
      <h2>🔍 Try These Searches</h2>
      <div class="search-examples">
        <button class="example-btn" onclick="runExampleSearch('type:fire')">
          <span class="type-badge type-fire">fire</span> Fire Types
        </button>
        <button class="example-btn" onclick="runExampleSearch('type:dragon')">
          <span class="type-badge type-dragon">dragon</span> Dragon Types
        </button>
        <button class="example-btn" onclick="runExampleSearch('speed>100')">
          ⚡ Speed &gt; 100
        </button>
        <button class="example-btn" onclick="runExampleSearch('ability:levitate')">
          🎈 Levitate Ability
        </button>
        <button class="example-btn" onclick="runExampleSearch('move:earthquake')">
          🌍 Knows Earthquake
        </button>
        <button class="example-btn" onclick="runExampleSearch('tier:ou')">
          🏆 OverUsed Tier
        </button>
      </div>
      
      <h2>🏆 What Are Competitive Tiers?</h2>
      <p>Competitive tiers organize Pokémon by power level, based on data from <a href="https://www.smogon.com/" target="_blank">Smogon University</a> — 
        the premier competitive Pokémon community. This helps create fair, balanced battles.</p>
      
      <div class="tier-explanation">
        <div class="tier-item">
          <span class="tier-badge-example" style="background: var(--accent-primary);">Ubers</span>
          <span>The most powerful legendaries and mega evolutions</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #e67e22;">OU</span>
          <span>OverUsed — The standard competitive tier</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #f39c12;">UU</span>
          <span>UnderUsed — Solid Pokémon below OU power</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #27ae60;">RU</span>
          <span>RarelyUsed — Less common but effective picks</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #3498db;">NU</span>
          <span>NeverUsed — Niche Pokémon requiring support</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #9b59b6;">PU</span>
          <span>The lowest standard competitive tier</span>
        </div>
        <div class="tier-item">
          <span class="tier-badge-example" style="background: #e91e63;">LC</span>
          <span>Little Cup — Unevolved Pokémon at level 5</span>
        </div>
      </div>
      
      <h2>📖 How to Use This Site</h2>
      <ul>
        <li><strong>Browse Tiers:</strong> Click the tier tabs to see the top 50 Pokémon in each tier</li>
        <li><strong>View All:</strong> Click "All Cobblemon" to browse the complete Pokédex</li>
        <li><strong>Smart Search:</strong> Use advanced filters like <code>type:fire</code>, <code>ability:levitate</code>, <code>move:earthquake</code>, or <code>speed&gt;100</code></li>
        <li><strong>Click Details:</strong> Click any Pokémon for spawn locations, competitive strategies, EVs, and more</li>
        <li><strong>Save Favorites:</strong> Click ⭐ in any modal to save Pokémon to your Favorites tab</li>
        <li><strong>Mega Evolutions:</strong> Click a base Pokémon (e.g., Charizard), then use Mega toggle buttons in the modal</li>
        <li><strong>Keyboard Shortcuts:</strong> Press <kbd>ESC</kbd> to close modals quickly</li>
      </ul>
      
      <h2>🔗 Data Sources</h2>
      <p>CobblePulse combines data from multiple trusted sources:</p>
      <div class="source-links">
        <a href="https://www.lumyverse.com/cobbleverse/" target="_blank" class="source-badge">Cobbleverse</a>
        <a href="https://www.smogon.com/" target="_blank" class="source-badge">Smogon University</a>
        <a href="https://pokeapi.co/" target="_blank" class="source-badge">PokéAPI</a>
        <a href="https://cobblemon.com/" target="_blank" class="source-badge">Cobblemon Mod</a>
      </div>

      <h2>💻 Open Source</h2>
      <p>CobblePulse is open source and built with vanilla JavaScript, CSS3, and modern web APIs. 
        View the code, report issues, or contribute on <a href="https://github.com/KlayaR/CobblePulse" target="_blank">GitHub</a>.</p>
      
      <div class="tech-stack">
        <span class="tech-badge">Vanilla JS</span>
        <span class="tech-badge">CSS3 Glassmorphism</span>
        <span class="tech-badge">Intersection Observer</span>
        <span class="tech-badge">GitHub Actions CI/CD</span>
      </div>

      <h2>⚠️ Known Limitations</h2>
      <ul>
        <li>Spawn data is specific to Cobbleverse server and may differ on other servers</li>
        <li>Competitive data reflects Generation 9 Smogon metagame</li>
        <li>Favorites are stored locally in your browser (limited to ~5MB)</li>
        <li>Some regional forms and alternate forms may have limited data</li>
      </ul>
    </div>`;
    return;
  }

  DOM.aboutPanel.style.display     = "none";
  DOM.tableContainer.style.display = "";

  if (allPokemon.length === 0) {
    DOM.list.innerHTML = `<tr><td colspan="4" class="loading">Loading Pokédex Data...</td></tr>`;
    return;
  }

  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  let filtered = [];

  // --- FAVORITES TAB ---
  if (currentTab === "favorites") {
    filtered = allPokemon.filter((p) => favorites.includes(p.cleanName) && !isMegaForm(p.cleanName));
    if (filtered.length === 0) {
      DOM.list.innerHTML = `<tr><td colspan="4" class="loading">No favorites yet — click ⭐ in any Pokémon modal to add one!</td></tr>`;
      return;
    }
  } else if (currentTab === "all") {
    // NEW: Filter out Mega forms from main list
    filtered = allPokemon.filter((p) => !isMegaForm(p.cleanName));
  } else {
    // --- TIER TABS: filter to only Pokémon in this tier (and exclude Megas) ---
    filtered = allPokemon.filter((p) => {
      if (isMegaForm(p.cleanName)) return false; // Hide Megas from tier tabs
      const dbEntry = allPokemonData[p.cleanName] || allPokemonData[p.name];
      if (!dbEntry || !dbEntry.allRanks) return false;
      return dbEntry.allRanks.some((r) =>
        r.tier.toLowerCase() === currentTab ||
        (currentTab === "ubers" && r.tier.toLowerCase() === "uber")
      );
    });
    // Tier tabs always pre-sorted by rank; slice to top 50 before user sort
    filtered.sort((a, b) => getTierRank(a) - getTierRank(b));
    filtered = filtered.slice(0, 50);
  }

  // --- SMART SEARCH WITH FUZZY MATCHING ---
  if (query) {
    const searchFilters = parseSmartSearch(query);
    filtered = filtered.filter((p) => {
      const dbEntry = allPokemonData[p.cleanName] || allPokemonData[p.name] || {};

      if (searchFilters.text) {
        const exactMatch = p.name.toLowerCase().includes(searchFilters.text) || 
                          p.cleanName.includes(searchFilters.text) || 
                          p.id.toString() === searchFilters.text;
        const fuzzy = fuzzyMatch(searchFilters.text, p.name) || fuzzyMatch(searchFilters.text, p.cleanName);
        if (!exactMatch && !fuzzy) return false;
      }
      if (searchFilters.type   && !p.types.includes(searchFilters.type)) return false;
      if (searchFilters.ability && dbEntry.abilities) {
        if (!dbEntry.abilities.some((a) => a.name.replace(/-/g, "").includes(searchFilters.ability))) return false;
      }
      if (searchFilters.move && dbEntry.strategies) {
        const hasMove = dbEntry.strategies.some((strat) =>
          strat.moves && strat.moves.some((m) => m.toLowerCase().replace(/-/g, "").replace(/\s/g, "").includes(searchFilters.move))
        );
        if (!hasMove) return false;
      }
      if (searchFilters.tier && dbEntry.allRanks) {
        if (!dbEntry.allRanks.some((r) => r.tier.toLowerCase().includes(searchFilters.tier))) return false;
      }
      if (Object.keys(searchFilters.statFilters).length > 0 && dbEntry.stats) {
        const statMap = { hp: "hp", atk: "attack", attack: "attack", def: "defense", defense: "defense", spa: "special-attack", spd: "special-defense", spe: "speed", speed: "speed" };
        for (let statKey in searchFilters.statFilters) {
          const { op, val } = searchFilters.statFilters[statKey];
          const actualStat = dbEntry.stats[statMap[statKey]] || 0;
          if (op === ">"  && actualStat <= val) return false;
          if (op === "<"  && actualStat >= val) return false;
          if (op === ">=" && actualStat <  val) return false;
          if (op === "<=" && actualStat >  val) return false;
        }
      }
      return true;
    });
  }

  // --- TYPE FILTER (AND LOGIC) ---
  if (filterState.types.length > 0) {
    filtered = filtered.filter((p) => filterState.types.every((type) => p.types.includes(type)));
  }

  // --- HAS SPAWNS FILTER ---
  if (filterState.hasSpawns) {
    filtered = filtered.filter((p) => {
      const dbEntry = allPokemonData[p.cleanName] || allPokemonData[p.name] || {};
      return dbEntry.locations && dbEntry.locations.length > 0;
    });
  }

  // --- RARITY FILTER ---
  if (filterState.rarity === "legendary") {
    filtered = filtered.filter((p) => {
      const dbEntry = allPokemonData[p.cleanName] || allPokemonData[p.name] || {};
      return dbEntry.isLegendary || dbEntry.isMythical;
    });
  } else if (filterState.rarity === "non-legendary") {
    filtered = filtered.filter((p) => {
      const dbEntry = allPokemonData[p.cleanName] || allPokemonData[p.name] || {};
      return !dbEntry.isLegendary && !dbEntry.isMythical;
    });
  }

  // --- SORT ---
  if (sortBy === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === "type") {
    filtered.sort((a, b) => (a.types[0] || "").localeCompare(b.types[0] || ""));
  } else if (sortBy === "dex") {
    filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
  } else if (sortBy === "rank") {
    if (isTierTab) {
      // Already sorted by rank above — no-op
    } else {
      // On All / Favorites, rank means nothing so fall back to dex
      filtered.sort((a, b) => (a.id || 0) - (b.id || 0));
    }
  }

  renderTable(filtered);
}
