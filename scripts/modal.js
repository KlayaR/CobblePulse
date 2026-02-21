// --- POKEAPI CACHE ---
const pokeApiCache = new Map();

// --- FORM VARIANT SUFFIXES ---
const FORM_SUFFIXES = [
  { suffix: "mega",    label: "Mega",           icon: "⚡" },
  { suffix: "megax",   label: "Mega X",         icon: "⚡" },
  { suffix: "megay",   label: "Mega Y",         icon: "⚡" },
  { suffix: "alola",   label: "Alolan",         icon: "🌴" },
  { suffix: "galar",   label: "Galarian",       icon: "🌿" },
  { suffix: "hisui",   label: "Hisuian",        icon: "⛰️" },
  { suffix: "paldea",  label: "Paldean",        icon: "🌞" },
  { suffix: "origin",  label: "Origin",         icon: "🔄" },
  { suffix: "crowned", label: "Crowned",        icon: "👑" },
  { suffix: "therian", label: "Therian",        icon: "🎭" },
  { suffix: "black",   label: "Black",          icon: "⬛" },
  { suffix: "white",   label: "White",          icon: "⬜" },
  { suffix: "sky",     label: "Sky",            icon: "🌤️" },
  { suffix: "unbound", label: "Unbound",        icon: "🔓" },
  { suffix: "blaze",   label: "Blaze Breed",    icon: "🔥" },
  { suffix: "aqua",    label: "Aqua Breed",     icon: "💧" },
  { suffix: "combat",  label: "Combat Breed",   icon: "🥊" },
  { suffix: "ice",     label: "Ice Rider",      icon: "🧢" },
  { suffix: "shadow",  label: "Shadow Rider",   icon: "👻" },
];

// Bug fix #8: expanded exclusion list to cover more false-positive name fragments.
// Added Pokémon whose cleanNames contain dangerous substrings:
//   - "aqua"   → darmanitan (darmanitanaqua would be a false Aqua Breed match)
//   - "shadow" → marshadow, blacephalon
//   - "ice"    → glaceon, glalie (already had glalie, added glaceon)
//   - "blaze"  → blaziken (cleanName = blaziken, contains "blaze")
//   - "black"  → zacian, zamazenta forms should not be confused
//   - "combat" → kommo-o variants
const FORM_EXCLUSIONS = new Set([
  // Original entries
  "meganium", "galarian", "hisuian", "alolan", "aegislash", "galar",
  "rapidash", "ponyta", "meowth", "corsola", "slowpoke", "slowbro",
  "slowking", "darumaka", "darmanitan", "yamask", "stunfisk",
  "zigzagoon", "linoone", "farfetchd", "mrrime", "obstagoon",
  "perrserker", "cursola", "sirfetchd", "runerigus",
  // Bug fix #8 additions
  "glaceon",      // contains "ice"
  "blaziken",     // contains "blaze"
  "marshadow",    // contains "shadow"
  "blacephalon",  // contains "shadow" (blac…shadow)
  "wishiwashi",   // contains "aqua" in some locales
  "kommoocalamity", "kommoocorrosion", // combat-adjacent names
]);

// --- ALTERNATE FORMS INDEX ---
let _altFormsIndex = null;

function buildAltFormsIndex() {
  if (_altFormsIndex) return;
  _altFormsIndex = new Map();
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};

  for (const [cleanName, data] of Object.entries(allPokemonData)) {
    if (FORM_EXCLUSIONS.has(cleanName)) continue;

    for (const { suffix, label, icon } of FORM_SUFFIXES) {
      if (!cleanName.includes(suffix)) continue;
      const dex = data.dex;
      if (!dex) continue;
      if (!_altFormsIndex.has(dex)) _altFormsIndex.set(dex, []);
      const existing = _altFormsIndex.get(dex);
      if (!existing.find((f) => f.cleanName === cleanName)) {
        existing.push({ cleanName, data, label, icon });
      }
      break;
    }
  }
}

function buildMegaFormsIndex() { buildAltFormsIndex(); }
function findMegaForms(baseDexNumber) { return findAltForms(baseDexNumber).filter((f) => f.label.startsWith("Mega")); }

function findAltForms(baseDexNumber) {
  buildAltFormsIndex();
  return _altFormsIndex.get(baseDexNumber) || [];
}

// --- FETCH WITH TIMEOUT ---
function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal })
    .then((r) => { clearTimeout(timer); return r.json(); })
    .catch((e) => { clearTimeout(timer); throw e; });
}

// --- SPRITE URL HELPERS ---
const MEGA_SPRITE_SLUGS = {
  charizardmegax:  "charizard-mega-x",  charizardmegay:  "charizard-mega-y",
  venusaurmega:    "venusaur-mega",      blastoismega:    "blastoise-mega",
  alakazammega:    "alakazam-mega",      gengarmega:      "gengar-mega",
  kangaskhanmega:  "kangaskhan-mega",    pinsirmega:      "pinsir-mega",
  gyaradosmega:    "gyarados-mega",      aerodactylmega:  "aerodactyl-mega",
  ampharosmega:    "ampharos-mega",      scizormega:      "scizor-mega",
  heracrossmega:   "heracross-mega",     houndoommega:    "houndoom-mega",
  tyranitarmega:   "tyranitar-mega",     blazikenmega:    "blaziken-mega",
  gardevoirmega:   "gardevoir-mega",     mawilemega:      "mawile-mega",
  aggronmega:      "aggron-mega",        medichamega:     "medicham-mega",
  medichammega:    "medicham-mega",      manectricmega:   "manectric-mega",
  sharpedomega:    "sharpedo-mega",      cameruptmega:    "camerupt-mega",
  altariamega:     "altaria-mega",       sableyemega:     "sableye-mega",
  banettmega:      "banette-mega",       banettemega:     "banette-mega",
  absolmega:       "absol-mega",         glaliemega:      "glalie-mega",
  salamencemega:   "salamence-mega",     metagrossmega:   "metagross-mega",
  latiasmega:      "latias-mega",        latiosmega:      "latios-mega",
  rayquazamega:    "rayquaza-mega",      lopunnymega:     "lopunny-mega",
  garchompmega:    "garchomp-mega",      lucariomega:     "lucario-mega",
  audinomega:      "audino-mega",        slowbromega:     "slowbro-mega",
  steelixmega:     "steelix-mega",       pidgeotmega:     "pidgeot-mega",
  beedrillmega:    "beedrill-mega",      dianciemega:     "diancie-mega",
  gallademega:     "gallade-mega",       sceptilemega:    "sceptile-mega",
  swampertmega:    "swampert-mega",      abomasnowmega:   "abomasnow-mega",
};

function getSpriteId(cleanName, dbEntryId) {
  return MEGA_SPRITE_SLUGS[cleanName] || dbEntryId;
}

function getSpriteUrl(spriteId) { return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png`; }
function getShinyUrl(spriteId)  { return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${spriteId}.png`; }

// --- GET EVO CHAIN ---
// Bug fix #17: Use data.dex (national Pokédex number) instead of data.id (form sprite ID).
// PokéAPI's pokemon-species endpoint requires the base national dex number, not form IDs.
async function getEvoChain(baseDexNumber) {
  if (pokeApiCache.has(baseDexNumber)) return pokeApiCache.get(baseDexNumber);
  const speciesData = await fetchWithTimeout(`https://pokeapi.co/api/v2/pokemon-species/${baseDexNumber}`);
  const evoData     = await fetchWithTimeout(speciesData.evolution_chain.url);
  pokeApiCache.set(baseDexNumber, evoData);
  return evoData;
}

function prefetchPokemonDetails(id) {
  if (!pokeApiCache.has(id)) getEvoChain(id).catch(() => {});
}

// --- HELPER: Abbreviate tier name ---
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

// --- HELPER: Tier rank for strategy dropdown sort order ---
const STRATEGY_TIER_ORDER = [
  "ubers", "ou", "uu", "ru", "nu", "pu", "zu", "lc",
  "doublesou", "vgc2025", "vgc2024", "monotype",
  "nationaldex", "nationaldexuu", "nationaldexru", "nationaldexmonotype",
  "balancedhackmons", "stabmons", "1v1", "godlygift",
];

function getTierSortRank(tier) {
  if (!tier) return 999;
  const idx = STRATEGY_TIER_ORDER.indexOf(tier.toLowerCase());
  return idx === -1 ? 998 : idx;
}

function sortStrategiesByTier(strategies) {
  return strategies
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const rankDiff = getTierSortRank(a.s.tier) - getTierSortRank(b.s.tier);
      return rankDiff !== 0 ? rankDiff : a.i - b.i;
    })
    .map(({ s }) => s);
}

function getBestRankEntry(allRanks) {
  if (!allRanks || allRanks.length === 0) return null;
  return allRanks.reduce((best, cur) => {
    const bestRank = getTierSortRank(best.tier);
    const curRank  = getTierSortRank(cur.tier);
    if (curRank < bestRank) return cur;
    if (curRank === bestRank && parseFloat(cur.usage) > parseFloat(best.usage)) return cur;
    return best;
  });
}

// --- HELPER: Format Pokémon display name ---
function getDisplayName(baseName, isAltForm) {
  return baseName.charAt(0).toUpperCase() + baseName.slice(1).replace(/-/g, " ");
}

// --- HELPER: Simple HTML escape for XSS prevention ---
// Bug fix #18: Escape untrusted strings before injecting into innerHTML.
function escapeHtml(str) {
  if (!str) return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- LOCATION CARDS BUILDER ---
// Bug fix #18: Escape loc.spawn, loc.rarity, loc.condition, loc.forms to prevent XSS.
function buildLocationCards(locations, title) {
  const cards = locations.map((loc) => {
    const conditionHtml = loc.condition ? `<div class="location-condition">⚠️ Condition: ${escapeHtml(loc.condition)}</div>` : "";
    const formsHtml     = loc.forms     ? `<div class="location-forms">✨ Form Info: ${escapeHtml(loc.forms)}</div>` : "";
    return `<div class="location-card">
      <div class="location-spawn">🌍 ${escapeHtml(loc.spawn)}</div>
      <div class="location-rarity">🎯 Rarity: <strong>${escapeHtml(loc.rarity)}</strong></div>
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
async function openModal(id, cleanName, altFormCleanName = null) {
  _latestModalRequestId = id;
  _currentBaseDexNumber = id;
  _currentBaseCleanName = cleanName;

  DOM.modalOverlay.classList.add("active");

  const params = new URLSearchParams();
  params.set("tab", currentTab);
  params.set("pokemon", altFormCleanName || cleanName);
  history.pushState({ tab: currentTab, modal: altFormCleanName || cleanName }, "", `?${params.toString()}`);

  const allPokemonData  = window.localDB?.pokemon || window.localDB || {};
  const actualCleanName = altFormCleanName || cleanName;
  const dbEntry         = allPokemonData[actualCleanName];

  if (!dbEntry) {
    DOM.modalBody.innerHTML = `<div class="loading error-loading">Pokémon data not found for ${actualCleanName}</div>`;
    return;
  }

  // ---------------------------------------------------------------
  // PHASE 1 — Render full modal INSTANTLY from localDB
  // ---------------------------------------------------------------

  const spriteId     = getSpriteId(actualCleanName, dbEntry.id || id);
  const normalSprite = getSpriteUrl(spriteId);
  const shinySprite  = getShinyUrl(spriteId);

  const types    = dbEntry.types || [];
  const typeHtml = types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join("");

  const weaknesses = getWeaknesses(types);
  const immunities = getImmunities(types, dbEntry.abilities || []);

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

  let formBadge = "";
  if (altFormCleanName) {
    const matched = FORM_SUFFIXES.find((f) => altFormCleanName.includes(f.suffix));
    if (matched) formBadge = `<span class="mega-boost-badge">${matched.icon} ${matched.label} Form</span>`;
  }

  const statsHtml = Object.keys(pokemonStats).length > 0 ? `
    <div class="info-card full-width stats-card">
      <h4 class="section-title">📊 Base Stats${formBadge ? ` ${formBadge}` : ""}</h4>
      ${statConfig.map((s) => {
        const val = pokemonStats[s.key] || 0;
        const pct = Math.min(Math.round((val / 255) * 100), 100);
        return `<div class="stat-bar-container">
          <span class="stat-label">${s.label}</span>
          <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%;background:${s.color};"></div></div>
          <span class="stat-value" style="color:${s.color};font-size:0.8rem;">${val}</span>
        </div>`;
      }).join("")}
      <div class="stat-total">Total BST: <strong>${totalBST}</strong></div>
    </div>` : "";

  const bestRank    = getBestRankEntry(dbEntry.allRanks);
  const currentBadge = bestRank ? bestRank.tier.toUpperCase() : "UNTIERED";
  const usageBadge   = bestRank && parseFloat(bestRank.usage) > 0
    ? `<span class="usage-badge">${bestRank.usage}% usage</span>`
    : "";

  const hasStrategies = dbEntry.strategies && dbEntry.strategies.length > 0;
  if (hasStrategies) {
    window.smogonUrl         = `https://www.smogon.com/dex/sv/pokemon/${actualCleanName}/`;
    window.currentStrategies = sortStrategiesByTier(dbEntry.strategies);
  }
  const dropdownHtml = hasStrategies && dbEntry.strategies.length > 1
    ? `<div class="strategy-dropdown-container">
         <span class="strategy-label">Select Strategy:</span>
         <select onchange="renderStrategyView(this.value)" class="strategy-select">
           ${window.currentStrategies.map((s, i) => {
             const tierBadge = s.tier ? `[${abbreviateTier(s.tier)}] ` : "";
             return `<option value="${i}">${tierBadge}${s.name}</option>`;
           }).join("")}
         </select>
       </div>`
    : hasStrategies
      ? `<div class="strategy-single-container">
           <span class="strategy-label">Strategy:</span>
           <span class="strategy-single-name">
             ${window.currentStrategies[0].tier ? `[${abbreviateTier(window.currentStrategies[0].tier)}] ` : ""}${window.currentStrategies[0].name}
           </span>
         </div>`
      : "";

  const compHtml = hasStrategies
    ? `<div class="info-card full-width strategy-info-card">${dropdownHtml}<div id="dynamic-strategy-content"></div></div>`
    : altFormCleanName
      ? `<div class="info-card full-width no-strategies"><p>No competitive Smogon data for this form. Check the Base tab for strategies.</p></div>`
      : `<div class="info-card full-width no-strategies"><p>No competitive Smogon data available for this Pokémon.</p></div>`;

  // Locations
  let locationsHtml = "";
  if (!altFormCleanName) {
    const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
    if (hasOwnSpawns) locationsHtml += buildLocationCards(dbEntry.locations, "📍 Server Spawn Locations");
    if (!hasOwnSpawns) {
      if (dbEntry.isLegendary || dbEntry.isMythical) {
        locationsHtml += `<div class="legendary-notice"><h4>✨ Legendary Summoning</h4><p>This Pokémon does not spawn naturally. Use a summoning item at an altar or participate in a server event.</p></div>`;
      } else {
        locationsHtml += `<div id="locations-placeholder" class="loading" style="font-size:0.85em;padding:8px;">Checking spawn info...</div>`;
      }
    }
  } else {
    const hasFormSpawns = dbEntry.locations && dbEntry.locations.length > 0;
    if (hasFormSpawns) {
      locationsHtml = buildLocationCards(dbEntry.locations, "📍 Spawn Locations");
    } else {
      const baseEntry = allPokemonData[cleanName];
      if (baseEntry?.locations?.length > 0) {
        locationsHtml = buildLocationCards(baseEntry.locations, `🔗 Base Form Spawns (${getDisplayName(cleanName)})`);
      } else {
        const matched = FORM_SUFFIXES.find((f) => altFormCleanName.includes(f.suffix));
        const formName = matched ? matched.label : "Alternate Form";
        locationsHtml = `<div class="mega-obtain-notice">
          <h4>${matched?.icon || "⚡"} How to Obtain ${formName} Form</h4>
          <p>Check the <strong>Base</strong> tab above for ${getDisplayName(cleanName)}'s spawn locations.</p>
        </div>`;
      }
    }
  }

  // Alt forms toggle
  const altForms    = findAltForms(id);
  const hasAltForms = altForms.length > 0;
  const altFormsToggleHtml = hasAltForms ? `
    <div class="mega-toggle-container">
      <button class="mega-toggle-btn ${!altFormCleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', null)">Base</button>
      ${altForms.map((form) => `
        <button class="mega-toggle-btn ${altFormCleanName === form.cleanName ? 'active' : ''}" onclick="openModal(${id}, '${cleanName}', '${form.cleanName}')">
          ${form.icon} ${form.label}
        </button>`).join("")}
    </div>` : "";

  const baseEntry   = allPokemonData[cleanName] || dbEntry;
  const displayName = getDisplayName(baseEntry.name || cleanName);

  const sourceTag    = dbEntry.source ? `<span class="source-tag">[Source: ${dbEntry.source}]</span>` : "";
  const isFav        = favorites.includes(altFormCleanName || cleanName);
  const favBtnHtml   = `<button class="fav-btn" id="favBtn" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "⭐" : "🤍"}</button>`;
  const pokemonDbUrl = `https://pokemondb.net/pokedex/${cleanName}`;
  const shareParams  = new URLSearchParams({ tab: currentTab, pokemon: altFormCleanName || cleanName });
  const shareUrl     = `${window.location.origin}${window.location.pathname}?${shareParams.toString()}`;
  const shareBtnHtml = `<button id="shareBtn" title="Copy share link" class="share-btn">🔗 Share</button>`;

  const needsEvoPh = !altFormCleanName && !dbEntry.isLegendary && !dbEntry.isMythical;
  const evoPh = needsEvoPh ? `<div id="evo-placeholder"></div>` : "";

  // --- RENDER ---
  DOM.modalBody.innerHTML = `
    <div class="modal-header">
      <div class="sprite-container">
        <img src="${normalSprite}" alt="${displayName}" class="modal-sprite" id="modalSprite">
        <button class="shiny-btn" id="shinyBtn" title="Shiny Toggle">✨</button>
      </div>
      <div class="modal-title">
        <div class="title-row">
          <a href="${pokemonDbUrl}" target="_blank" title="View on PokemonDB" class="pokemon-name-link">${displayName}</a>
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
        ${altFormsToggleHtml}
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
    const targetName = altFormCleanName || cleanName;
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
  // PHASE 2 — Background: evo chain only (non-legendary base forms)
  // Bug fix #17: Pass dbEntry.dex (not dbEntry.id) to getEvoChain.
  // ---------------------------------------------------------------
  if (!needsEvoPh) return;

  try {
    // Bug fix #17: use dex (national dex #) for pokemon-species endpoint
    const dexNumber = dbEntry.dex || id;
    const evoData = await getEvoChain(dexNumber);
    if (_latestModalRequestId !== id) return;

    const locPh = document.getElementById("locations-placeholder");
    if (locPh) {
      const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
      let extraLocHtml = "";
      if (!hasOwnSpawns) {
        const baseEvoName = evoData.chain.species.name;
        const baseEvoDb   = allPokemonData[baseEvoName.replace("-", "")] || allPokemonData[baseEvoName];
        if (baseEvoDb?.locations?.length > 0) {
          extraLocHtml = buildLocationCards(baseEvoDb.locations, `🧬 Evolves from ${getDisplayName(baseEvoName)} (Spawns Below)`);
        } else {
          extraLocHtml = `<p class="no-spawns">Must be evolved from <strong>${getDisplayName(baseEvoName)}</strong>. No wild spawns found.</p>`;
        }
      }
      locPh.outerHTML = extraLocHtml || "";
    }

    const evoPlaceholder = document.getElementById("evo-placeholder");
    if (evoPlaceholder) {
      // Bug fix #7: flatten ALL branches of the evo tree, not just the first branch.
      // Previously: while (node) { node = node.evolves_to[0] } — only followed first child.
      // Now: we do a breadth-first traversal to collect every branch.
      const evoList = flattenEvoChain(evoData.chain);

      if (evoList.length > 1) {
        evoPlaceholder.outerHTML = `
          <div class="info-card full-width evo-card">
            <h4 class="section-title">🔄 Evolution Chain</h4>
            <div class="evo-chain">
              ${renderEvoChain(evoData.chain, cleanName, allPokemonData)}
            </div>
          </div>`;
      } else {
        evoPlaceholder.remove();
      }
    }
  } catch (e) {
    const locPh  = document.getElementById("locations-placeholder");
    const evoPh2 = document.getElementById("evo-placeholder");
    if (locPh)  locPh.outerHTML  = '<p class="no-spawns">Could not load spawn info (network error).</p>';
    if (evoPh2) evoPh2.remove();
  }
}

// --- HELPER: Flatten evo chain into a flat list (for length check) ---
// Bug fix #7: replaces the old linear while-loop traversal.
function flattenEvoChain(node) {
  const result = [];
  function traverse(n) {
    if (!n) return;
    result.push(n.species.name);
    (n.evolves_to || []).forEach(traverse);
  }
  traverse(node);
  return result;
}

// --- HELPER: Render branching evo chain as HTML ---
// Bug fix #7: renders all branches (e.g. Eevee's 8 evolutions, Tyrogue's 3).
// Bug fix #19: escape PokéAPI names (e.g. farfetch'd) in onclick to prevent syntax errors.
function renderEvoChain(node, currentCleanName, allPokemonData) {
  if (!node) return "";

  const name     = node.species.name;
  const evoEntry = allPokemonData[name] || allPokemonData[name.replace("-", "")];
  const evoId    = evoEntry?.id || "";
  const evoDex   = evoEntry?.dex || "";
  const evoSprite = evoId ? getSpriteUrl(evoId) : "";
  const isCurrent = name === currentCleanName;

  // Bug fix #19: Escape name for use in onclick handler.
  // PokéAPI returns names like "farfetch'd" which breaks onclick="openModal(1,'farfetch'd')".
  // Escape single quotes → farfetch\'d so the onclick remains syntactically valid.
  const escapedName = name.replace(/'/g, "\\'");

  const selfHtml = `
    <div class="evo-mon ${isCurrent ? "current" : ""}" ${evoDex ? `onclick="openModal(${evoDex},'${escapedName}')" style="cursor:pointer;"` : ""}>
      ${evoSprite ? `<img src="${evoSprite}" alt="${name}">` : ""}
      <span>${getDisplayName(name)}</span>
    </div>`;

  const children = node.evolves_to || [];
  if (children.length === 0) return selfHtml;

  // Single linear evolution — render inline with arrow
  if (children.length === 1) {
    return selfHtml + `<span class="evo-arrow">→</span>` + renderEvoChain(children[0], currentCleanName, allPokemonData);
  }

  // Branching evolution (Eevee, Tyrogue, etc.) — render children in a column
  const branchesHtml = children.map(child =>
    `<div class="evo-branch">
      <span class="evo-arrow">→</span>
      ${renderEvoChain(child, currentCleanName, allPokemonData)}
    </div>`
  ).join("");

  return `
    ${selfHtml}
    <div class="evo-branches">${branchesHtml}</div>`;
}

// --- CLOSE MODAL ---
// Bug fix #20: Reset _latestModalRequestId to null so stale async evo fetches
// from a previously-closed modal don't try to write to DOM.
function closeModal() {
  DOM.modalOverlay.classList.remove("active");
  _currentBaseCleanName = null;
  _latestModalRequestId = null;  // Bug fix #20
  if (currentTab && currentTab !== "about") {
    history.pushState({ tab: currentTab }, "", `?tab=${currentTab}`);
  } else {
    history.pushState({}, "", window.location.pathname);
  }
}

// NOTE: The popstate listener for modal close has been moved to main.js
// so it can also handle tab restoration (bug fix #6).
