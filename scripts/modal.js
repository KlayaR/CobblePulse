// --- POKEAPI CACHE ---
const pokeApiCache = new Map();

async function getPokemonDetails(id) {
  if (pokeApiCache.has(id)) return pokeApiCache.get(id);

  const details     = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((r) => r.json());
  const speciesData = await fetch(details.species.url).then((r) => r.json());
  const evoData     = await fetch(speciesData.evolution_chain.url).then((r) => r.json());

  const result = { details, speciesData, evoData };
  pokeApiCache.set(id, result);
  return result;
}

// --- HELPER: Abbreviate tier name for badges ---
function abbreviateTier(tierName) {
  // Map tier names to clear, unambiguous abbreviations
  const abbrevs = {
    // Standard Smogon Singles Tiers
    "ubers":     "Ubers",
    "ou":        "OU",
    "uu":        "UU",
    "ru":        "RU",
    "nu":        "NU",
    "pu":        "PU",
    "zu":        "ZU",
    "lc":        "LC",
    
    // National Dex Tiers
    "nationaldex":           "NDex",
    "National Dex":          "NDex",
    "National Dex Ubers":    "NDex Ubers",
    "National Dex UU":       "NDex UU",
    "National Dex RU":       "NDex RU",
    "National Dex Monotype": "NDex Mono",
    
    // Doubles & VGC
    "doublesou":     "Doubles OU",
    "Doubles OU":    "Doubles OU",
    "vgc2025":       "VGC 2025",
    "VGC 2024 Reg F": "VGC 24F",
    "VGC 2025 Reg G": "VGC 25G",
    "VGC 2025 Reg H": "VGC 25H",
    
    // Other Metagames
    "monotype":           "Monotype",
    "Almost Any Ability": "AAA",
    "Balanced Hackmons":  "BH",
    "Mix and Mega":       "MnM",
    "Mixed":              "Mixed",
    "Untiered":           "Untiered",
  };
  
  // Check direct matches first (case-insensitive)
  const lowerTier = tierName.toLowerCase();
  if (abbrevs[lowerTier]) return abbrevs[lowerTier];
  if (abbrevs[tierName]) return abbrevs[tierName];
  
  // If no match found, return the original tier name (up to 15 chars)
  return tierName.length > 15 ? tierName.slice(0, 12) + "..." : tierName;
}

// --- HELPER: Find Mega forms for a base Pokémon ---
function findMegaForms(baseDexNumber) {
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  const megaForms = [];
  
  for (const [cleanName, data] of Object.entries(allPokemonData)) {
    if (data.dex === baseDexNumber && cleanName.includes("mega") && !cleanName.includes("meganium")) {
      megaForms.push({ cleanName, data });
    }
  }
  
  return megaForms;
}

// --- LOCATION CARDS BUILDER ---
function buildLocationCards(locations, title) {
  const cards = locations.map((loc) => {
    const conditionHtml = loc.condition ? `<div class="location-condition">⚠️ Condition: ${loc.condition}</div>` : "";
    const formsHtml     = loc.forms     ? `<div class="location-forms">✨ Form Info: ${loc.forms}</div>` : "";
    return `<div class="location-card">
      <div class="location-spawn">🌍 ${loc.spawn}</div>
      <div class="location-rarity">🎯 Rarity: <strong>${loc.rarity}</strong></div>
      ${conditionHtml}${formsHtml}
    </div>`;
  }).join("");
  return `<h4 class="section-title">${title}</h4><div class="location-cards">${cards}</div>`;
}

// --- RENDER STRATEGY VIEW ---
function renderStrategyView(index) {
  const strat = window.currentStrategies[index];

  function hoverSpan(type, value) {
    return value.split(" / ").map((v) => {
      const slug = v.trim();
      return `<span class="has-tooltip" onmouseenter="handleTooltipHover(event,'${type}','${slug}')" onmouseleave="hideTooltip()">${slug}</span>`;
    }).join('<span class="strat-divider">/</span>');
  }

  const movesList = strat.moves.map((m) => {
    const parts = m.split(" / ").map((part) => {
      const slug = part.trim();
      return `<span class="has-tooltip" onmouseenter="handleTooltipHover(event,'move','${slug}')" onmouseleave="hideTooltip()">${slug}</span>`;
    }).join('<span class="move-divider">/</span>');
    return `<li class="move-item"><span class="move-arrow">></span>${parts}</li>`;
  }).join("");

  const teraHtml = strat.teraType.split(" / ").map((t) =>
    `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
  ).join("");

  document.getElementById("dynamic-strategy-content").innerHTML = `
    <div class="strategy-grid">
      <div class="strategy-card"><h4>🎭 Nature</h4><p>${hoverSpan("nature", strat.nature)}</p></div>
      <div class="strategy-card"><h4>🧬 Ability</h4><p>${hoverSpan("ability", strat.ability)}</p></div>
      <div class="strategy-card"><h4>🎒 Held Item</h4><p>${hoverSpan("item", strat.item)}</p></div>
      <div class="strategy-card strategy-card-wide"><h4>🔮 Tera Type</h4><div class="tera-types">${teraHtml}</div></div>
      <div class="strategy-card strategy-card-wide"><h4>📊 Target EVs</h4><p>${strat.evs}</p></div>
    </div>
    <div class="moves-section">
      <h4 class="section-title-sm">⚔️ Required Moves</h4>
      <ul class="moves-list">${movesList}</ul>
      <div class="smogon-link"><a href="${window.smogonUrl}" target="_blank">VIEW FULL SMOGON STRATEGY ↗</a></div>
    </div>`;
}

let _latestModalRequestId = null;
let _currentBaseDexNumber = null;
let _currentBaseCleanName = null;

// --- OPEN MODAL (now supports megaCleanName parameter) ---
async function openModal(id, cleanName, megaCleanName = null) {
  _latestModalRequestId = id;
  _currentBaseDexNumber = id;
  _currentBaseCleanName = cleanName;

  DOM.modalOverlay.classList.add("active");
  DOM.modalBody.innerHTML = `<div class="loading">Fetching Data...</div>`;

  const params = new URLSearchParams();
  params.set("tab", currentTab);
  params.set("pokemon", megaCleanName || cleanName);
  history.pushState({ tab: currentTab, modal: megaCleanName || cleanName }, "", `?${params.toString()}`);

  try {
    // If viewing a Mega form, fetch its specific data
    const allPokemonData = window.localDB?.pokemon || window.localDB || {};
    const actualCleanName = megaCleanName || cleanName;
    const dbEntry = allPokemonData[actualCleanName];
    
    if (!dbEntry) {
      throw new Error(`Pokémon data not found for ${actualCleanName}`);
    }

    // Fetch from PokéAPI using the proper ID/slug
    const fetchId = megaCleanName && dbEntry.id ? dbEntry.id : id;
    const { details, speciesData, evoData } = await getPokemonDetails(fetchId);
    if (_latestModalRequestId !== id && !megaCleanName) return;

    const typeHtml = details.types.map((t) => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join("");

    // --- MEGA EVOLUTION TOGGLE (always check base dex number) ---
    const megaForms = findMegaForms(id);
    const hasMegaForms = megaForms.length > 0;
    const megaToggleHtml = hasMegaForms ? `
      <div class="mega-toggle-container">
        <button class="mega-toggle-btn ${!megaCleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', null)">Base Form</button>
        ${megaForms.map((mega) => {
          const megaLabel = mega.data.name.replace(/-/g, " ").replace(/mega/i, "Mega").trim();
          return `<button class="mega-toggle-btn ${megaCleanName === mega.cleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', '${mega.cleanName}')">${megaLabel}</button>`;
        }).join("")}
      </div>` : "";

    // --- COMPETITIVE STRATEGIES ---
    let stats = null;
    if (dbEntry.allRanks && dbEntry.allRanks.length > 0) {
      stats = currentTab === "all"
        ? dbEntry.allRanks.reduce((prev, cur) => parseFloat(prev.usage) > parseFloat(cur.usage) ? prev : cur)
        : (dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", ""))) || dbEntry.allRanks[0]);
    }

    const hasStrategies = dbEntry.strategies && dbEntry.strategies.length > 0;
    if (hasStrategies) {
      window.smogonUrl         = `https://www.smogon.com/dex/sv/pokemon/${details.name.replace("-", "_")}/`;
      window.currentStrategies = dbEntry.strategies;
    }

    const dropdownHtml = hasStrategies && dbEntry.strategies.length > 1
      ? `<div class="strategy-dropdown-container">
           <span class="strategy-label">Select Strategy:</span>
           <select onchange="renderStrategyView(this.value)" class="strategy-select">
             ${dbEntry.strategies.map((s, i) => {
               const tierBadge = s.tier ? `[${abbreviateTier(s.tier)}] ` : "";
               return `<option value="${i}">${tierBadge}${s.name}</option>`;
             }).join("")}
           </select>
         </div>`
      : hasStrategies
        ? `<div class="strategy-single-container">
             <span class="strategy-label">Strategy:</span>
             <span class="strategy-single-name">
               ${dbEntry.strategies[0].tier ? `[${abbreviateTier(dbEntry.strategies[0].tier)}] ` : ""}${dbEntry.strategies[0].name}
             </span>
           </div>`
        : "";

    const compHtml = hasStrategies
      ? `<div class="info-card full-width strategy-info-card">${dropdownHtml}<div id="dynamic-strategy-content"></div></div>`
      : megaCleanName
        ? `<div class="info-card full-width no-strategies"><p>⚡ This Mega Evolution has a +100 Base Stat Total boost compared to the base form. Switch to Base Form tab to see spawn locations.</p></div>`
        : `<div class="info-card full-width no-strategies"><p>No competitive Smogon data available for this Pokémon.</p></div>`;

    // --- LOCATIONS (only show for base form) ---
    let locationsHtml = "";
    if (!megaCleanName) {
      const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
      if (hasOwnSpawns) locationsHtml += buildLocationCards(dbEntry.locations, "📍 Server Spawn Locations");

      if (!hasOwnSpawns && (speciesData.is_legendary || speciesData.is_mythical)) {
        locationsHtml += `<div class="legendary-notice">
          <h4>✨ Legendary Summoning</h4>
          <p>This Pokémon does not spawn naturally. Use a summoning item at an altar or participate in a server event.</p>
        </div>`;
      } else if (speciesData.evolves_from_species) {
        const baseEvoName = evoData.chain.species.name;
        const baseEvoDb   = allPokemonData[baseEvoName.replace("-", "")] || allPokemonData[baseEvoName];
        if (baseEvoDb && baseEvoDb.locations && baseEvoDb.locations.length > 0) {
          const title = hasOwnSpawns
            ? `💡 Easier to catch base form: ${baseEvoName.toUpperCase()}`
            : `🧬 Evolves from ${baseEvoName.toUpperCase()} (Spawns Below)`;
          locationsHtml += buildLocationCards(baseEvoDb.locations, title);
        } else if (!hasOwnSpawns) {
          locationsHtml += `<p class="no-spawns">Must be evolved from <strong>${baseEvoName.toUpperCase()}</strong>. No wild spawns found.</p>`;
        }
      } else if (!hasOwnSpawns) {
        locationsHtml += '<p class="no-spawns">No wild spawns found on this server.</p>';
      }
    } else {
      // Mega form: show how to obtain
      const baseName = details.name.split("-")[0];
      locationsHtml = `<div class="mega-obtain-notice">
        <h4>⚡ How to Mega Evolve</h4>
        <p>To Mega Evolve ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}, you need:</p>
        <ul>
          <li>🔸 The corresponding <strong>Mega Stone</strong> held item</li>
          <li>🔸 In battle, select <strong>Mega Evolution</strong> once per battle</li>
          <li>🔸 Reverts to base form after battle ends</li>
        </ul>
        <p>Check the Base Form tab above for spawn locations to catch ${baseName.charAt(0).toUpperCase() + baseName.slice(1)}.</p>
      </div>`;
    }

    // --- WEAKNESSES ---
    const weaknesses   = getWeaknesses(details.types.map((t) => t.type.name));
    const weaknessHtml = Object.keys(weaknesses).length > 0 ? `
      <div class="info-card full-width weaknesses-card">
        <h4 class="section-title-danger">⚠️ Weaknesses</h4>
        <div class="weaknesses-grid">
          ${Object.entries(weaknesses).map(([type, mult]) => `
            <div class="weakness-item">
              <span class="type-badge type-${type}">${type}</span>
              <span class="weakness-mult weakness-mult-${mult === 4 ? 'quad' : 'double'}">×${mult}</span>
            </div>`).join("")}
        </div>
      </div>` : "";

    // --- BASE STATS ---
    const statConfig = [
      { key: "hp",              label: "HP",     color: "#ff5959" },
      { key: "attack",          label: "ATK",    color: "#f5ac78" },
      { key: "defense",         label: "DEF",    color: "#fae078" },
      { key: "special-attack",  label: "Sp.ATK", color: "#9db7f5" },
      { key: "special-defense", label: "Sp.DEF", color: "#a7db8d" },
      { key: "speed",           label: "SPE",    color: "#fa92b2" },
    ];
    const pokemonStats = dbEntry.stats || {};
    const totalBST = Object.values(pokemonStats).reduce((sum, val) => sum + (val || 0), 0);
    const megaBadge = megaCleanName ? '<span class="mega-boost-badge">⚡ Mega Boosted!</span>' : '';
    const statsHtml    = Object.keys(pokemonStats).length > 0 ? `
      <div class="info-card full-width stats-card">
        <h4 class="section-title">📊 Base Stats${megaBadge}</h4>
        ${statConfig.map((s) => {
          const val = pokemonStats[s.key] || 0;
          const pct = Math.min(Math.round((val / 255) * 100), 100);
          return `<div class="stat-bar-container">
            <span class="stat-label">${s.label}</span>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%;background:${s.color};"></div></div>
            <span class="stat-value" style="color:${s.color};">${val}</span>
          </div>`;
        }).join("")}
        <div class="stat-total">Total BST: <strong>${totalBST}</strong></div>
      </div>` : "";

    // --- EVOLUTION CHAIN (only for base form) ---
    let evoHtml = "";
    if (!megaCleanName) {
      try {
        const evoList = [];
        let node = evoData.chain;
        while (node) { evoList.push(node.species.name); node = node.evolves_to[0] || null; }
        if (evoList.length > 1) {
          evoHtml = `
            <div class="info-card full-width evo-card">
              <h4 class="section-title">🔄 Evolution Chain</h4>
              <div class="evo-chain">
                ${evoList.map((name, i) => {
                  const evoEntry  = allPokemonData[name] || allPokemonData[name.replace("-", "")];
                  const evoId     = evoEntry?.id || "";
                  const evoSprite = evoId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evoId}.png` : "";
                  const isCurrent = name === details.name;
                  return `${i > 0 ? `<span class="evo-arrow">→</span>` : ""}
                    <div class="evo-mon ${isCurrent ? "current" : ""}" onclick="${evoId ? `openModal(${evoId},'${name}')` : ""}">
                      ${evoSprite ? `<img src="${evoSprite}" alt="${name}">` : ""}
                      <span>${name.replace("-", " ")}</span>
                    </div>`;
                }).join("")}
              </div>
            </div>`;
        }
      } catch (e) { /* evo chain render failed silently */ }
    }

    // --- IMMUNITIES ---
    const immunities = getImmunities(details.types.map((t) => t.type.name), dbEntry.abilities || []);

    // --- BADGES & BUTTONS ---
    const currentBadge = stats ? stats.tier.toUpperCase() : "UNTIERED";
    const usageBadge   = stats && parseFloat(stats.usage) > 0 ? `<span class="usage-badge">${stats.usage}% usage</span>` : "";
    const sourceTag    = dbEntry.source ? `<span class="source-tag">[Source: ${dbEntry.source}]</span>` : "";
    const isFav        = favorites.includes(megaCleanName || cleanName);
    const favBtnHtml   = `<button class="fav-btn" id="favBtn" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "⭐" : "🤍"}</button>`;
    const pokemonDbUrl = `https://pokemondb.net/pokedex/${details.name}`;
    const shareParams  = new URLSearchParams({ tab: currentTab, pokemon: megaCleanName || cleanName });
    const shareUrl     = `${window.location.origin}${window.location.pathname}?${shareParams.toString()}`;
    const shareBtnHtml = `<button id="shareBtn" title="Copy share link" class="share-btn">🔗 Share</button>`;

    DOM.modalBody.innerHTML = `
      <div class="modal-header">
        <div class="sprite-container">
          <img src="${details.sprites.front_default}" alt="${details.name}" class="modal-sprite" id="modalSprite">
          <button class="shiny-btn" id="shinyBtn" title="Shiny Toggle">✨</button>
        </div>
        <div class="modal-title">
          <div class="title-row">
            <a href="${pokemonDbUrl}" target="_blank" title="View on PokemonDB" class="pokemon-name-link">${details.name.replace(/-/g, " ")}</a>
            ${favBtnHtml}${shareBtnHtml}
            <span class="tier-badge">${currentBadge}</span>${usageBadge}${sourceTag}
          </div>
          <div class="types-immunities-row">
            <div class="types-container">${typeHtml}</div>
            ${immunities.length > 0 ? `
              <div class="immunities-container">
                <span class="immunity-icon">🛡️</span>
                ${immunities.map((imm) => `
                  <div class="immunity-item">
                    <span class="type-badge type-${imm.type}">${imm.type}</span>
                    <span class="immunity-source">${imm.source === "ability" ? imm.label.split("(")[1]?.replace(")", "") : "Typing"}</span>
                  </div>`).join("")}
              </div>` : ""}
          </div>
        </div>
      </div>
      ${megaToggleHtml}
      <div>
        ${weaknessHtml}${statsHtml}${evoHtml}${compHtml}
        <div class="info-card full-width locations-card">${locationsHtml}</div>
      </div>`;

    // Wire up shiny toggle
    const normalSprite = details.sprites.front_default;
    const shinySprite  = details.sprites.front_shiny;
    let isShiny = false;
    document.getElementById("shinyBtn").addEventListener("click", () => {
      isShiny = !isShiny;
      document.getElementById("modalSprite").src = isShiny ? shinySprite : normalSprite;
      document.getElementById("shinyBtn").classList.toggle("active", isShiny);
    });

    // Wire up share button
    document.getElementById("shareBtn").addEventListener("click", () => {
      navigator.clipboard.writeText(shareUrl).then(() => {
        const btn = document.getElementById("shareBtn");
        btn.textContent = "✅ Copied!";
        btn.classList.add("copied");
        setTimeout(() => { btn.textContent = "🔗 Share"; btn.classList.remove("copied"); }, 2000);
      });
    });

    // Wire up favorite button
    document.getElementById("favBtn").addEventListener("click", () => {
      const targetName = megaCleanName || cleanName;
      const idx = favorites.indexOf(targetName);
      if (idx === -1) {
        favorites.push(targetName);
        document.getElementById("favBtn").textContent = "⭐";
        document.getElementById("favBtn").title = "Remove from favorites";
      } else {
        favorites.splice(idx, 1);
        document.getElementById("favBtn").textContent = "🤍";
        document.getElementById("favBtn").title = "Add to favorites";
      }
      localStorage.setItem("cobblePulseFavorites", JSON.stringify(favorites));
    });

    if (hasStrategies) renderStrategyView(0);

  } catch (e) {
    if (_latestModalRequestId === id || megaCleanName) {
      console.error(e);
      DOM.modalBody.innerHTML = `<div class="loading error-loading">Failed to load details.<br><span class="error-message">${e.message}</span></div>`;
    }
  }
}

// --- CLOSE MODAL ---
function closeModal() {
  DOM.modalOverlay.classList.remove("active");
  _currentBaseCleanName = null;
  if (currentTab && currentTab !== "about") {
    history.pushState({ tab: currentTab }, "", `?tab=${currentTab}`);
  } else {
    history.pushState({}, "", window.location.pathname);
  }
}

window.addEventListener("popstate", (e) => {
  if (!e.state?.modal) DOM.modalOverlay.classList.remove("active");
});
