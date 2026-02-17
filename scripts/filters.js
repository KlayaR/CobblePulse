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

// --- MAIN FILTER & RENDER ORCHESTRATOR ---
function applyFilters() {
  const query = DOM.searchInput.value.toLowerCase();

  // Always show unified filters on non-About tabs
  if (DOM.unifiedFilters) {
    DOM.unifiedFilters.style.display = currentTab === "about" ? "none" : "flex";
  }

  // --- ABOUT TAB ---
  if (currentTab === "about") {
    DOM.aboutPanel.style.display    = "block";
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
        <li><strong>Search:</strong> Use the search box to find by name, #id, type:fire, ability:levitate, move:earthquake, speed>100.</li>
        <li><strong>Click for Details:</strong> Click any Pokémon for spawn locations, movesets, EVs, and more.</li>
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

  DOM.aboutPanel.style.display    = "none";
  DOM.tableContainer.style.display = "";

  if (allPokemon.length === 0) {
    DOM.list.innerHTML = `<tr><td colspan="4" class="loading">Loading Pokédex Data...</td></tr>`;
    return;
  }

  let filtered = [];

  // --- FAVORITES TAB ---
  if (currentTab === "favorites") {
    filtered = allPokemon.filter((p) => favorites.includes(p.cleanName));
    if (filtered.length === 0) {
      DOM.list.innerHTML = `<tr><td colspan="4" class="loading">No favorites yet — click ⭐ in any Pokémon modal to add one!</td></tr>`;
      return;
    }
  } else if (currentTab === "all") {
    filtered = [...allPokemon];
  } else {
    // --- TIER TABS ---
    filtered = allPokemon.filter((p) => {
      const dbEntry = localDB[p.cleanName] || localDB[p.name];
      if (!dbEntry || !dbEntry.allRanks) return false;
      return dbEntry.allRanks.some((r) =>
        r.tier.toLowerCase() === currentTab ||
        (currentTab === "ubers" && r.tier.toLowerCase() === "uber")
      );
    });
    filtered.sort((a, b) => {
      const entryA = (localDB[a.cleanName] || localDB[a.name]).allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", "")));
      const entryB = (localDB[b.cleanName] || localDB[b.name]).allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", "")));
      return (entryA?.rank || 999) - (entryB?.rank || 999);
    });
    filtered = filtered.slice(0, 50);
  }

  // --- SMART SEARCH ---
  if (query) {
    const searchFilters = parseSmartSearch(query);
    filtered = filtered.filter((p) => {
      const dbEntry = localDB[p.cleanName] || localDB[p.name] || {};

      if (searchFilters.text) {
        const textMatch = p.name.toLowerCase().includes(searchFilters.text) || p.cleanName.includes(searchFilters.text) || p.id.toString() === searchFilters.text;
        if (!textMatch) return false;
      }
      if (searchFilters.type   && !p.types.includes(searchFilters.type)) return false;
      if (searchFilters.ability && dbEntry.abilities) {
        if (!dbEntry.abilities.some((a) => a.name.replace(/-/g, "").includes(searchFilters.ability))) return false;
      }
      if (searchFilters.move && dbEntry.allRanks) {
        const hasMove = dbEntry.allRanks.some((rank) =>
          rank.strategies && rank.strategies.some((strat) =>
            strat.moves && strat.moves.some((m) => m.toLowerCase().replace(/-/g, "").replace(/\s/g, "").includes(searchFilters.move))
          )
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

  // --- NEW: TYPE FILTER (AND LOGIC) ---
  // FIX: Changed from .some() to .every() so selecting multiple types shows only Pokémon with ALL selected types
  if (filterState.types.length > 0) {
    filtered = filtered.filter((p) => filterState.types.every((type) => p.types.includes(type)));
  }

  // --- HAS SPAWNS FILTER ---
  if (filterState.hasSpawns) {
    filtered = filtered.filter((p) => {
      const dbEntry = localDB[p.cleanName] || localDB[p.name] || {};
      return dbEntry.locations && dbEntry.locations.length > 0;
    });
  }

  // --- NEW: RARITY FILTER (using isLegendary/isMythical from localDB) ---
  if (filterState.rarity === "legendary") {
    filtered = filtered.filter((p) => {
      const dbEntry = localDB[p.cleanName] || localDB[p.name] || {};
      return dbEntry.isLegendary || dbEntry.isMythical;
    });
  } else if (filterState.rarity === "non-legendary") {
    filtered = filtered.filter((p) => {
      const dbEntry = localDB[p.cleanName] || localDB[p.name] || {};
      return !dbEntry.isLegendary && !dbEntry.isMythical;
    });
  }
  // If rarity === "all", no filtering

  // --- SORT ---
  const sortBy = DOM.sortSelect ? DOM.sortSelect.value : "dex";
  if (sortBy === "name")     filtered.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === "type") filtered.sort((a, b) => (a.types[0] || "").localeCompare(b.types[0] || ""));
  else                        filtered.sort((a, b) => (a.id || 0) - (b.id || 0));

  renderTable(filtered);
}
