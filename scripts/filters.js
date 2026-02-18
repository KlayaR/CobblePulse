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

// --- MAIN FILTER & RENDER ORCHESTRATOR ---
function applyFilters() {
  const query  = DOM.searchInput.value.toLowerCase();
  const sortBy = DOM.sortSelect ? DOM.sortSelect.value : "rank";
  const isTierTab = currentTab !== "about" && currentTab !== "all" && currentTab !== "favorites" && currentTab !== "typechart";

  // Hide unified filters on special tabs
  if (DOM.unifiedFilters) {
    DOM.unifiedFilters.style.display = (currentTab === "about" || currentTab === "typechart") ? "none" : "flex";
  }

  // Get type chart panel element
  const typeChartPanel = document.getElementById("typeChartPanel");

  // --- TYPE CHART TAB ---
  if (currentTab === "typechart") {
    DOM.aboutPanel.style.display = "none";
    DOM.tableContainer.style.display = "none";
    if (typeChartPanel) {
      typeChartPanel.style.display = "block";
      // Initialize type chart if function exists
      if (typeof initTypeChart === "function") {
        initTypeChart();
      }
    }
    return;
  }

  // Hide type chart panel on other tabs
  if (typeChartPanel) {
    typeChartPanel.style.display = "none";
  }

  // --- ABOUT TAB ---
  if (currentTab === "about") {
    DOM.aboutPanel.style.display     = "block";
    DOM.tableContainer.style.display = "none";
    DOM.aboutPanel.innerHTML = `<div class="about-content">
      <h2>Welcome to CobblePulse! 🎮</h2>
      <p>CobblePulse is your complete guide to <a href="https://cobblemon.com/" target="_blank">Cobblemon</a> — 
        a Minecraft mod that brings Pokémon into your world. Here you'll find spawn locations, competitive tier rankings, 
        and battle strategies for every Pokémon.</p>
      
      <h2>What Are Competitive Tiers?</h2>
      <p>Competitive tiers organize Pokémon by power level, based on data from <a href="https://www.smogon.com/" target="_blank">Smogon University</a> — 
        the premier competitive Pokémon community. This helps create fair, balanced battles.</p>
      
      <ul>
        <li><strong>Ubers:</strong> The most powerful legendaries and mega evolutions.</li>
        <li><strong>OU (OverUsed):</strong> The standard competitive tier.</li>
        <li><strong>UU (UnderUsed):</strong> Solid Pokémon that don't quite reach OU power levels.</li>
        <li><strong>RU (RarelyUsed):</strong> Less common picks that can still shine.</li>
        <li><strong>NU (NeverUsed):</strong> Niche Pokémon that require specialized support.</li>
        <li><strong>PU:</strong> The lowest standard tier.</li>
        <li><strong>LC (Little Cup):</strong> Unevolved Pokémon only, battling at level 5.</li>
      </ul>
      
      <h2>How to Use This Site</h2>
      <ul>
        <li><strong>Browse Tiers:</strong> Click the tier tabs to see the top 50 in each tier.</li>
        <li><strong>View All:</strong> Click "All Cobblemon" to see every Pokémon.</li>
        <li><strong>Favorites:</strong> Click ⭐ in any modal to save to Favorites.</li>
        <li><strong>Type Chart:</strong> Click "🔥 Type Chart" to view interactive type effectiveness.</li>
        <li><strong>Search:</strong> Use the search box to find by name, #id, type:fire, ability:levitate, move:earthquake, speed>100.</li>
        <li><strong>Click for Details:</strong> Click any Pokémon for spawn locations, movesets, EVs, and more.</li>
        <li><strong>Mega Evolutions:</strong> Click base Pokémon (e.g., Charizard) then use the Mega toggle buttons to view Mega forms.</li>
      </ul>
      
      <h2>Data Sources</h2>
      <p>This site combines data from 
        <a href="https://www.lumyverse.com/cobbleverse/" target="_blank">Cobbleverse</a>, 
        <a href="https://www.smogon.com/" target="_blank">Smogon</a>, and 
        <a href="https://pokeapi.co/" target="_blank">PokéAPI</a>.
      </p>
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
