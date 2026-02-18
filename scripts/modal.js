// --- POKEAPI CACHE ---
const pokeApiCache = new Map();

// --- MEGA FORMS INDEX (built once at startup) ---
let _megaFormsIndex = null;

function buildMegaFormsIndex() {
  if (_megaFormsIndex) return;
  _megaFormsIndex = new Map();
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  for (const [cleanName, data] of Object.entries(allPokemonData)) {
    if (cleanName.includes("mega") && !cleanName.includes("meganium")) {
      const dex = data.dex;
      if (!_megaFormsIndex.has(dex)) _megaFormsIndex.set(dex, []);
      _megaFormsIndex.get(dex).push({ cleanName, data });
    }
  }
}

// --- FETCH WITH TIMEOUT ---
function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then((r) => { clearTimeout(timer); return r.json(); })
    .catch((e) => { clearTimeout(timer); throw e; });
}

// --- SPRITE URL HELPERS (no API call needed) ---
// Uses the PokeAPI/sprites GitHub CDN directly — no rate limit, no timeouts
function getSpriteUrl(id)  { return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`; }
function getShinyUrl(id)   { return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`; }

// --- GET MINIMAL POKEAPI DATA (only what localDB doesn't have) ---
// We only need PokeAPI for: is_legendary/is_mythical, evolves_from_species, evolution_chain
// Everything else (types, stats, abilities, sprite) comes from localDB or CDN directly.
async function getPokemonApiData(id) {
  if (pokeApiCache.has(id)) return pokeApiCache.get(id);

  // Fetch species and evolution chain in the fewest possible round trips.
  // species URL is predictable, so we can fetch it directly without first hitting /pokemon/${id}
  const speciesData = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
  const evoData     = await fetchWithTimeout(speciesData.evolution_chain.url);

  const result = { speciesData, evoData };
  pokeApiCache.set(id, result);
  return result;
}

// --- PREFETCH ON HOVER ---
function prefetchPokemonDetails(id) {
  if (!pokeApiCache.has(id)) {
    getPokemonApiData(id).catch(() => {});
  }
}

// --- HELPER: Abbreviate tier name for badges ---
function abbreviateTier(tierName) {
  const abbrevs = {
    "ubers": "Ubers", "ou": "OU", "uu": "UU", "ru": "RU", "nu": "NU", "pu": "PU", "zu": "ZU", "lc": "LC",
    "nationaldex": "NDex", "National Dex": "NDex", "National Dex Ubers": "NDex Ubers",
    "National Dex UU": "NDex UU", "National Dex RU": "NDex RU", "National Dex Monotype": "NDex Mono",
    "doublesou": "Doubles OU", "Doubles OU": "Doubles OU", "vgc2025": "VGC 2025",
    "VGC 2024 Reg F": "VGC 24F", "VGC 2025 Reg G": "VGC 25G", "VGC 2025 Reg H": "VGC 25H",
    "monotype": "Monotype", "Almost Any Ability": "AAA", "Balanced Hackmons": "BH",
    "Mix and Mega": "MnM", "Mixed": "Mixed", "Untiered": "Untiered",
  };
  const lowerTier = tierName.toLowerCase();
  if (abbrevs[lowerTier]) return abbrevs[lowerTier];
  if (abbrevs[tierName]) return abbrevs[tierName];
  return tierName.length > 15 ? tierName.slice(0, 12) + "..." : tierName;
}

// --- HELPER: Find Mega forms (O(1) index lookup) ---
function findMegaForms(baseDexNumber) {
  buildMegaFormsIndex();
  return _megaFormsIndex.get(baseDexNumber) || [];
}

// --- HELPER: Convert cleanName to PokéAPI slug ---
function cleanNameToPokeApiSlug(cleanName) {
  return cleanName
    .replace(/megax$/, "-mega-x")
    .replace(/megay$/, "-mega-y")
    .replace(/mega$/, "-mega")
    .replace(/megax/,  "-mega-x-")
    .replace(/megay/,  "-mega-y-")
    .replace(/([a-z])(mega)/, "$1-$2")
    .replace(/--+/g, "-");
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

// --- OPEN MODAL ---
async function openModal(id, cleanName, megaCleanName = null) {
  _latestModalRequestId = id;
  _currentBaseDexNumber = id;
  _currentBaseCleanName = cleanName;

  DOM.modalOverlay.classList.add("active");

  const params = new URLSearchParams();
  params.set("tab", currentTab);
  params.set("pokemon", megaCleanName || cleanName);
  history.pushState({ tab: currentTab, modal: megaCleanName || cleanName }, "", `?${params.toString()}`);

  const allPokemonData  = window.localDB?.pokemon || window.localDB || {};
  const actualCleanName = megaCleanName || cleanName;
  const dbEntry         = allPokemonData[actualCleanName];

  if (!dbEntry) {
    DOM.modalBody.innerHTML = `<div class="loading error-loading">Pokémon data not found for ${actualCleanName}</div>`;
    return;
  }

  // ---------------------------------------------------------------
  // PHASE 1: Render the full modal IMMEDIATELY from localDB data.
  // No network call needed for: sprite, types, stats, weaknesses,
  // immunities, strategies, locations, badges.
  // ---------------------------------------------------------------

  const spriteId     = megaCleanName ? cleanNameToPokeApiSlug(megaCleanName) : id;
  const normalSprite = getSpriteUrl(spriteId);
  const shinySprite  = getShinyUrl(spriteId);

  // Types from localDB
  const types    = dbEntry.types || [];
  const typeHtml = types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join("");

  // Weaknesses & immunities from localDB types (already have getWeaknesses/getImmunities)
  const weaknesses   = getWeaknesses(types);
  const immunities   = getImmunities(types, dbEntry.abilities || []);

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

  // Stats from localDB
  const statConfig = [
    { key: "hp",              label: "HP",     color: "#ff5959" },
    { key: "attack",          label: "ATK",    color: "#f5ac78" },
    { key: "defense",         label: "DEF",    color: "#fae078" },
    { key: "special-attack",  label: "Sp.ATK", color: "#9db7f5" },
    { key: "special-defense", label: "Sp.DEF", color: "#a7db8d" },
    { key: "speed",           label: "SPE",    color: "#fa92b2" },
  ];
  const pokemonStats = dbEntry.stats || {};
  const totalBST     = Object.values(pokemonStats).reduce((sum, val) => sum + (val || 0), 0);
  const megaBadge    = megaCleanName ? '<span class="mega-boost-badge">⚡ Mega Boosted!</span>' : '';
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

  // Competitive strategies from localDB
  let stats = null;
  if (dbEntry.allRanks && dbEntry.allRanks.length > 0) {
    stats = currentTab === "all"
      ? dbEntry.allRanks.reduce((prev, cur) => parseFloat(prev.usage) > parseFloat(cur.usage) ? prev : cur)
      : (dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", ""))) || dbEntry.allRanks[0]);
  }
  const hasStrategies = dbEntry.strategies && dbEntry.strategies.length > 0;
  if (hasStrategies) {
    window.smogonUrl         = `https://www.smogon.com/dex/sv/pokemon/${(megaCleanName || cleanName).replace("-", "_")}/`;
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

  // Locations from localDB
  let locationsHtml = "";
  if (!megaCleanName) {
    const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
    if (hasOwnSpawns) locationsHtml += buildLocationCards(dbEntry.locations, "📍 Server Spawn Locations");
    // Legendary/evo check deferred to phase 2 (needs speciesData) — show placeholder
    if (!hasOwnSpawns) {
      locationsHtml += `<div id="locations-placeholder" class="loading" style="font-size:0.85em;padding:8px;">Checking spawn info...</div>`;
    }
  } else {
    const baseName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    locationsHtml = `<div class="mega-obtain-notice">
      <h4>⚡ How to Mega Evolve</h4>
      <p>To Mega Evolve ${baseName}, you need:</p>
      <ul>
        <li>🔸 The corresponding <strong>Mega Stone</strong> held item</li>
        <li>🔸 In battle, select <strong>Mega Evolution</strong> once per battle</li>
        <li>🔸 Reverts to base form after battle ends</li>
      </ul>
      <p>Check the <strong>Base</strong> tab above for spawn locations.</p>
    </div>`;
  }

  // Mega toggle from index
  const megaForms    = findMegaForms(id);
  const hasMegaForms = megaForms.length > 0;
  const megaToggleHtml = hasMegaForms ? `
    <div class="mega-toggle-container">
      <button class="mega-toggle-btn ${!megaCleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', null)">Base</button>
      ${megaForms.map((mega) => {
        const rawLabel  = mega.data.name || mega.cleanName;
        const megaLabel = rawLabel.replace(/-/g, " ").replace(/mega/i, "Mega").replace(new RegExp(cleanName, "i"), "").trim() || "Mega";
        return `<button class="mega-toggle-btn ${megaCleanName === mega.cleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', '${mega.cleanName}')">${megaLabel}</button>`;
      }).join("")}
    </div>` : "";

  // Badges & buttons
  const currentBadge = stats ? stats.tier.toUpperCase() : "UNTIERED";
  const usageBadge   = stats && parseFloat(stats.usage) > 0 ? `<span class="usage-badge">${stats.usage}% usage</span>` : "";
  const sourceTag    = dbEntry.source ? `<span class="source-tag">[Source: ${dbEntry.source}]</span>` : "";
  const isFav        = favorites.includes(megaCleanName || cleanName);
  const favBtnHtml   = `<button class="fav-btn" id="favBtn" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "⭐" : "🤍"}</button>`;
  const pokemonDbUrl = `https://pokemondb.net/pokedex/${megaCleanName || cleanName}`;
  const shareParams  = new URLSearchParams({ tab: currentTab, pokemon: megaCleanName || cleanName });
  const shareUrl     = `${window.location.origin}${window.location.pathname}?${shareParams.toString()}`;
  const shareBtnHtml = `<button id="shareBtn" title="Copy share link" class="share-btn">🔗 Share</button>`;

  // Evolution placeholder (filled in phase 2)
  const evoPh = megaCleanName ? "" : `<div id="evo-placeholder"></div>`;

  // --- RENDER FULL MODAL (instant, no network) ---
  DOM.modalBody.innerHTML = `
    <div class="modal-header">
      <div class="sprite-container">
        <img src="${normalSprite}" alt="${actualCleanName}" class="modal-sprite" id="modalSprite">
        <button class="shiny-btn" id="shinyBtn" title="Shiny Toggle">✨</button>
      </div>
      <div class="modal-title">
        <div class="title-row">
          <a href="${pokemonDbUrl}" target="_blank" title="View on PokemonDB" class="pokemon-name-link">${actualCleanName.replace(/-/g, " ")}</a>
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
        ${megaToggleHtml}
      </div>
    </div>
    <div>
      ${weaknessHtml}${statsHtml}${evoPh}${compHtml}
      <div class="info-card full-width locations-card">${locationsHtml}</div>
    </div>`;

  // Wire up buttons
  let isShiny = false;
  document.getElementById("shinyBtn").addEventListener("click", () => {
    isShiny = !isShiny;
    document.getElementById("modalSprite").src = isShiny ? shinySprite : normalSprite;
    document.getElementById("shinyBtn").classList.toggle("active", isShiny);
  });
  document.getElementById("shareBtn").addEventListener("click", () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      const btn = document.getElementById("shareBtn");
      btn.textContent = "✅ Copied!";
      btn.classList.add("copied");
      setTimeout(() => { btn.textContent = "🔗 Share"; btn.classList.remove("copied"); }, 2000);
    });
  });
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

  // ---------------------------------------------------------------
  // PHASE 2: Fetch only what we can't get from localDB.
  // species (legendary flag) + evo chain — fills placeholders.
  // If this fails or times out, the modal is already fully usable.
  // ---------------------------------------------------------------
  if (megaCleanName) return; // Mega forms don't need phase 2

  try {
    const { speciesData, evoData } = await getPokemonApiData(id);
    if (_latestModalRequestId !== id) return; // user already opened another modal

    // Fill locations placeholder
    const locPlaceholder = document.getElementById("locations-placeholder");
    if (locPlaceholder) {
      const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
      let extraLocHtml = "";
      if (!hasOwnSpawns && (speciesData.is_legendary || speciesData.is_mythical)) {
        extraLocHtml = `<div class="legendary-notice"><h4>✨ Legendary Summoning</h4><p>This Pokémon does not spawn naturally. Use a summoning item at an altar or participate in a server event.</p></div>`;
      } else if (speciesData.evolves_from_species) {
        const baseEvoName = evoData.chain.species.name;
        const baseEvoDb   = allPokemonData[baseEvoName.replace("-", "")] || allPokemonData[baseEvoName];
        if (baseEvoDb && baseEvoDb.locations && baseEvoDb.locations.length > 0) {
          const title = hasOwnSpawns
            ? `💡 Easier to catch base form: ${baseEvoName.toUpperCase()}`
            : `🧬 Evolves from ${baseEvoName.toUpperCase()} (Spawns Below)`;
          extraLocHtml = buildLocationCards(baseEvoDb.locations, title);
        } else if (!hasOwnSpawns) {
          extraLocHtml = `<p class="no-spawns">Must be evolved from <strong>${baseEvoName.toUpperCase()}</strong>. No wild spawns found.</p>`;
        }
      } else if (!hasOwnSpawns) {
        extraLocHtml = '<p class="no-spawns">No wild spawns found on this server.</p>';
      }
      locPlaceholder.outerHTML = extraLocHtml;
    }

    // Fill evolution chain placeholder
    const evoPlaceholder = document.getElementById("evo-placeholder");
    if (evoPlaceholder) {
      try {
        const evoList = [];
        let node = evoData.chain;
        while (node) { evoList.push(node.species.name); node = node.evolves_to[0] || null; }
        if (evoList.length > 1) {
          evoPlaceholder.outerHTML = `
            <div class="info-card full-width evo-card">
              <h4 class="section-title">🔄 Evolution Chain</h4>
              <div class="evo-chain">
                ${evoList.map((name, i) => {
                  const evoEntry  = allPokemonData[name] || allPokemonData[name.replace("-", "")];
                  const evoId     = evoEntry?.id || "";
                  const evoSprite = evoId ? getSpriteUrl(evoId) : "";
                  const isCurrent = name === cleanName;
                  return `${i > 0 ? `<span class="evo-arrow">→</span>` : ""}
                    <div class="evo-mon ${isCurrent ? "current" : ""}" onclick="${evoId ? `openModal(${evoId},'${name}')` : ""}">
                      ${evoSprite ? `<img src="${evoSprite}" alt="${name}">` : ""}
                      <span>${name.replace("-", " ")}</span>
                    </div>`;
                }).join("")}
              </div>
            </div>`;
        } else {
          evoPlaceholder.remove();
        }
      } catch (e) {
        evoPlaceholder.remove();
      }
    }
  } catch (e) {
    // Phase 2 failed (timeout / network) — modal is already fully displayed, just clean up placeholders
    const locPh = document.getElementById("locations-placeholder");
    const evoPh2 = document.getElementById("evo-placeholder");
    if (locPh)  locPh.outerHTML  = '<p class="no-spawns">Could not load spawn info (network error).</p>';
    if (evoPh2) evoPh2.remove();
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
