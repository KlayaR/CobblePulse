// --- POKEAPI CACHE ---
// Keyed by pokemon ID. Stores { details, speciesData, evoData } so every
// piece of data fetched for a Pokémon is only ever requested once per session.
const pokeApiCache = new Map();

async function getPokemonDetails(id) {
  if (pokeApiCache.has(id)) return pokeApiCache.get(id);

  // FIX 1: Parallelize pokemon + species fetches with Promise.all
  // Previously: fetch pokemon → await → fetch species → await (sequential, ~2× slower)
  // Now:        fetch pokemon + fetch species simultaneously, await both together
  const details     = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then((r) => r.json());
  const speciesData = await fetch(details.species.url).then((r) => r.json());

  // FIX 2: Also fetch the evo chain here once and cache it alongside the rest.
  // Previously it was fetched twice inside openModal (once for locations, once for evo chain).
  const evoData = await fetch(speciesData.evolution_chain.url).then((r) => r.json());

  const result = { details, speciesData, evoData };
  pokeApiCache.set(id, result);
  return result;
}

// --- LOCATION CARDS BUILDER ---
function buildLocationCards(locations, title) {
  const cards = locations.map((loc) => {
    const conditionHtml = loc.condition ? `<div style="margin-top:6px;color:var(--accent-primary);">⚠️ Condition: ${loc.condition}</div>` : "";
    const formsHtml     = loc.forms     ? `<div style="margin-top:4px;color:#a8a878;">✨ Form Info: ${loc.forms}</div>` : "";
    return `
      <div style="background:rgba(0,0,0,0.2);border:1px solid var(--glass-border);border-left:3px solid var(--accent-primary);padding:12px;border-radius:6px;font-size:0.9rem;margin-bottom:8px;">
        <div style="font-weight:bold;color:var(--text-main);margin-bottom:6px;font-size:1rem;">🌍 ${loc.spawn}</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;color:var(--text-muted);">
          <span style="background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:4px;">🎯 Rarity: <strong>${loc.rarity}</strong></span>
        </div>
        ${conditionHtml}${formsHtml}
      </div>`;
  }).join("");

  return `
    <h4 style="color:var(--accent-primary);margin-bottom:12px;margin-top:15px;">${title}</h4>
    <div style="max-height:250px;overflow-y:auto;padding-right:5px;display:flex;flex-direction:column;">${cards}</div>`;
}

// --- RENDER STRATEGY VIEW ---
function renderStrategyView(index) {
  const strat = window.currentStrategies[index];

  function hoverSpan(type, value) {
    return value.split(" / ").map((v) => {
      const slug = v.trim();
      return `<span class="has-tooltip" onmouseenter="handleTooltipHover(event,'${type}','${slug}')" onmouseleave="hideTooltip()">${slug}</span>`;
    }).join('<span style="color:var(--text-muted);margin:0 4px;">/</span>');
  }

  const movesList = strat.moves.map((m) => {
    const parts = m.split(" / ").map((part) => {
      const slug = part.trim();
      return `<span class="has-tooltip" onmouseenter="handleTooltipHover(event,'move','${slug}')" onmouseleave="hideTooltip()">${slug}</span>`;
    }).join('<span style="color:var(--text-muted);font-weight:normal;margin:0 4px;">/</span>');
    return `<li style="margin-bottom:8px;line-height:1.4;font-weight:bold;text-transform:capitalize;"><span style="color:var(--accent-primary);margin-right:8px;">></span>${parts}</li>`;
  }).join("");

  const teraHtml = strat.teraType.split(" / ").map((t) =>
    `<span class="type-badge type-${t.toLowerCase()}" style="margin:0 2px;">${t}</span>`
  ).join("");

  document.getElementById("dynamic-strategy-content").innerHTML = `
    <div>
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:15px;margin-bottom:20px;">
        <div class="info-card" style="grid-column:span 2;margin:0;background:rgba(0,0,0,0.3);text-align:center;">
          <h4 style="font-size:0.75rem;">🎭 Nature</h4>
          <p style="font-weight:500;text-transform:capitalize;">${hoverSpan("nature", strat.nature)}</p>
        </div>
        <div class="info-card" style="grid-column:span 2;margin:0;background:rgba(0,0,0,0.3);text-align:center;">
          <h4 style="font-size:0.75rem;">🧬 Ability</h4>
          <p style="text-transform:capitalize;font-weight:500;">${hoverSpan("ability", strat.ability)}</p>
        </div>
        <div class="info-card" style="grid-column:span 2;margin:0;background:rgba(0,0,0,0.3);text-align:center;">
          <h4 style="font-size:0.75rem;">🎒 Held Item</h4>
          <p style="font-weight:500;text-transform:capitalize;">${hoverSpan("item", strat.item)}</p>
        </div>
        <div class="info-card" style="grid-column:span 3;margin:0;background:rgba(0,0,0,0.3);text-align:center;">
          <h4 style="font-size:0.75rem;">🔮 Tera Type</h4>
          <div style="margin-top:4px;display:flex;justify-content:center;flex-wrap:wrap;">${teraHtml}</div>
        </div>
        <div class="info-card" style="grid-column:span 3;margin:0;background:rgba(0,0,0,0.3);text-align:center;">
          <h4 style="font-size:0.75rem;">📊 Target EVs</h4>
          <p style="font-weight:500;font-size:0.9rem;">${strat.evs}</p>
        </div>
      </div>
      <div style="margin-bottom:5px;">
        <h4 style="color:var(--text-muted);font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;">⚔️ Required Moves</h4>
        <ul style="list-style-type:none;padding-left:5px;display:grid;grid-template-columns:1fr;gap:6px;margin-top:10px;">${movesList}</ul>
        <div style="text-align:right;margin-top:15px;">
          <a href="${window.smogonUrl}" target="_blank" style="font-size:0.65rem;color:var(--accent-primary);font-weight:bold;letter-spacing:0.5px;text-decoration:none;">VIEW FULL SMOGON STRATEGY ↗</a>
        </div>
      </div>
    </div>`;
}

// FIX 3: Stale-request guard.
// Tracks the ID of the most recently requested modal open. If the user
// clicks a different Pokémon while the first is still loading, the first
// request's render is silently discarded when it eventually resolves.
let _latestModalRequestId = null;

// --- OPEN MODAL ---
async function openModal(id, cleanName) {
  _latestModalRequestId = id;

  DOM.modalOverlay.classList.add("active");
  DOM.modalBody.innerHTML = `<div class="loading">Fetching Data...</div>`;

  const params = new URLSearchParams();
  params.set("tab", currentTab);
  params.set("pokemon", cleanName);
  history.pushState({ tab: currentTab, modal: cleanName }, "", `?${params.toString()}`);

  try {
    // FIX 1+2: Single call — fetches pokemon + species in parallel, caches everything,
    // returns immediately on subsequent opens of the same Pokémon.
    const { details, speciesData, evoData } = await getPokemonDetails(id);

    // Stale-request guard: discard render if user already opened a different modal
    if (_latestModalRequestId !== id) return;

    const dbEntry  = localDB[cleanName] || localDB[details.name] || { tier: "Untiered", locations: [] };
    const typeHtml = details.types.map((t) => `<span class="type-badge type-${t.type.name}">${t.type.name}</span>`).join("");

    // --- COMPETITIVE STRATEGIES ---
    let stats = null;
    if (dbEntry.allRanks && dbEntry.allRanks.length > 0) {
      stats = currentTab === "all"
        ? dbEntry.allRanks.reduce((prev, cur) => parseFloat(prev.usage) > parseFloat(cur.usage) ? prev : cur)
        : (dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", ""))) || dbEntry.allRanks[0]);
    }

    const hasStrategies = stats && stats.strategies && stats.strategies.length > 0;
    if (hasStrategies) {
      window.smogonUrl         = `https://www.smogon.com/dex/sv/pokemon/${details.name.replace("-", "_")}/`;
      window.currentStrategies = stats.strategies;
    }

    const dropdownHtml = hasStrategies && stats.strategies.length > 1
      ? `<div style="margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;">
           <span style="color:var(--text-muted);font-size:0.85rem;text-transform:uppercase;font-weight:bold;">Select Strategy:</span>
           <select onchange="renderStrategyView(this.value)" style="background:rgba(0,0,0,0.4);border:1px solid var(--accent-primary);color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;cursor:pointer;max-width:60%;outline:none;">
             ${stats.strategies.map((s, i) => `<option value="${i}">${s.name}</option>`).join("")}
           </select>
         </div>`
      : hasStrategies
        ? `<div style="margin-bottom:15px;display:flex;align-items:center;justify-content:space-between;">
             <span style="color:var(--text-muted);font-size:0.85rem;text-transform:uppercase;font-weight:bold;">Strategy:</span>
             <span style="color:var(--accent-primary);font-weight:bold;background:rgba(233,69,96,0.1);padding:4px 10px;border-radius:6px;">${stats.strategies[0].name}</span>
           </div>`
        : "";

    const compHtml = hasStrategies
      ? `<div class="info-card full-width" style="margin-bottom:20px;border-color:var(--accent-primary);">${dropdownHtml}<div id="dynamic-strategy-content"></div></div>`
      : `<div class="info-card full-width" style="margin-bottom:20px;text-align:center;padding:20px;"><p style="color:var(--text-muted);">No competitive Smogon data available for this Pokémon.</p></div>`;

    // --- LOCATIONS ---
    // FIX 2: speciesData already fetched above — no second fetch needed here
    let locationsHtml = "";
    const hasOwnSpawns = dbEntry.locations && dbEntry.locations.length > 0;
    if (hasOwnSpawns) locationsHtml += buildLocationCards(dbEntry.locations, "📍 Server Spawn Locations");

    if (!hasOwnSpawns && (speciesData.is_legendary || speciesData.is_mythical)) {
      locationsHtml += `<div style="background:rgba(233,69,96,0.1);border:1px solid var(--accent-primary);padding:15px;border-radius:8px;margin-top:10px;">
        <h4 style="color:var(--accent-primary);margin-bottom:8px;">✨ Legendary Summoning</h4>
        <p style="color:var(--text-main);font-size:0.95rem;line-height:1.4;">This Pokémon does not spawn naturally. Use a summoning item at an altar or participate in a server event.</p>
      </div>`;
    } else if (speciesData.evolves_from_species) {
      // FIX 2: evoData already fetched and cached — no re-fetch here
      const baseEvoName = evoData.chain.species.name;
      const baseEvoDb   = localDB[baseEvoName.replace("-", "")] || localDB[baseEvoName];
      if (baseEvoDb && baseEvoDb.locations && baseEvoDb.locations.length > 0) {
        const title = hasOwnSpawns
          ? `💡 Easier to catch base form: ${baseEvoName.toUpperCase()}`
          : `🧬 Evolves from ${baseEvoName.toUpperCase()} (Spawns Below)`;
        locationsHtml += buildLocationCards(baseEvoDb.locations, title);
      } else if (!hasOwnSpawns) {
        locationsHtml += `<p style="color:var(--text-muted);margin-top:10px;">Must be evolved from <strong>${baseEvoName.toUpperCase()}</strong>. No wild spawns found.</p>`;
      }
    } else if (!hasOwnSpawns) {
      locationsHtml += '<p style="color:var(--text-muted);margin-top:10px;">No wild spawns found on this server.</p>';
    }

    // --- WEAKNESSES ---
    const weaknesses   = getWeaknesses(details.types.map((t) => t.type.name));
    const weaknessHtml = Object.keys(weaknesses).length > 0 ? `
      <div class="info-card full-width" style="margin-bottom:20px;">
        <h4 style="color:#ff6b6b;margin-bottom:10px;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;">⚠️ Weaknesses</h4>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${Object.entries(weaknesses).map(([type, mult]) => `
            <div style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:8px;padding:4px 8px;">
              <span class="type-badge type-${type}" style="margin:0;font-size:0.7rem;">${type}</span>
              <span style="color:${mult === 4 ? "#ff4d4d" : "#ffaa44"};font-weight:bold;font-size:0.75rem;">×${mult}</span>
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
    const statsHtml    = Object.keys(pokemonStats).length > 0 ? `
      <div class="info-card full-width" style="margin-bottom:20px;">
        <h4 style="color:var(--accent-primary);margin-bottom:12px;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;">📊 Base Stats</h4>
        ${statConfig.map((s) => {
          const val = pokemonStats[s.key] || 0;
          const pct = Math.min(Math.round((val / 255) * 100), 100);
          return `<div class="stat-bar-container">
            <span class="stat-label">${s.label}</span>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%;background:${s.color};"></div></div>
            <span class="stat-value" style="color:${s.color};">${val}</span>
          </div>`;
        }).join("")}
      </div>` : "";

    // --- EVOLUTION CHAIN ---
    // FIX 2: evoData already available from getPokemonDetails — no fetch at all here
    let evoHtml = "";
    try {
      const evoList = [];
      let node = evoData.chain;
      while (node) { evoList.push(node.species.name); node = node.evolves_to[0] || null; }
      if (evoList.length > 1) {
        evoHtml = `
          <div class="info-card full-width" style="margin-bottom:20px;">
            <h4 style="color:var(--accent-primary);margin-bottom:10px;font-size:0.85rem;text-transform:uppercase;letter-spacing:1px;">🔄 Evolution Chain</h4>
            <div class="evo-chain">
              ${evoList.map((name, i) => {
                const evoEntry  = localDB[name] || localDB[name.replace("-", "")];
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

    // --- IMMUNITIES ---
    const immunities = getImmunities(details.types.map((t) => t.type.name), dbEntry.abilities || []);

    // --- BADGES & BUTTONS ---
    const currentBadge = stats ? stats.tier.toUpperCase() : "UNTIERED";
    const usageBadge   = stats && parseFloat(stats.usage) > 0 ? `<span style="font-size:0.7rem;color:var(--text-muted);margin-left:6px;">${stats.usage}% usage</span>` : "";
    const sourceTag    = dbEntry.source ? `<span style="font-size:0.7rem;color:var(--text-muted);opacity:0.6;margin-left:8px;text-transform:uppercase;letter-spacing:1px;">[Source: ${dbEntry.source}]</span>` : "";
    const isFav        = favorites.includes(cleanName);
    const favBtnHtml   = `<button class="fav-btn" id="favBtn" title="${isFav ? "Remove from favorites" : "Add to favorites"}">${isFav ? "⭐" : "🤍"}</button>`;
    const pokemonDbUrl = `https://pokemondb.net/pokedex/${details.name}`;
    const shareParams  = new URLSearchParams({ tab: currentTab, pokemon: cleanName });
    const shareUrl     = `${window.location.origin}${window.location.pathname}?${shareParams.toString()}`;
    const shareBtnHtml = `<button id="shareBtn" title="Copy share link" style="background:none;border:1px solid var(--glass-border);color:var(--text-muted);border-radius:6px;padding:3px 8px;font-size:0.7rem;cursor:pointer;transition:all 0.2s;margin-left:4px;">🔗 Share</button>`;

    DOM.modalBody.innerHTML = `
      <div class="modal-header">
        <div style="position:relative;display:inline-block;">
          <img src="${details.sprites.front_default}" alt="${details.name}" class="modal-sprite" id="modalSprite">
          <button class="shiny-btn" id="shinyBtn" title="Shiny Toggle" style="position:absolute;top:-6px;right:-6px;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);margin:0;padding:4px;font-size:0.65rem;border-radius:4px;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">✨</button>
        </div>
        <div class="modal-title">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:6px;">
            <a href="${pokemonDbUrl}" target="_blank" title="View on PokemonDB" style="color:var(--text-main);text-decoration:none;font-size:1.6rem;font-weight:bold;text-transform:capitalize;">${details.name.replace("-", " ")}</a>
            ${favBtnHtml}${shareBtnHtml}
            <span class="tier-badge">${currentBadge}</span>${usageBadge}${sourceTag}
          </div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>${typeHtml}</div>
            ${immunities.length > 0 ? `
              <div style="display:flex;align-items:center;gap:6px;border-left:1px solid var(--glass-border);padding-left:10px;">
                <span style="color:var(--text-muted);font-size:0.7rem;">🛡️</span>
                ${immunities.map((imm) => `
                  <div style="display:flex;align-items:center;gap:3px;">
                    <span class="type-badge type-${imm.type}" style="margin:0;font-size:0.7rem;">${imm.type}</span>
                    <span style="color:var(--text-muted);font-size:0.65rem;">${imm.source === "ability" ? imm.label.split("(")[1]?.replace(")", "") : "Typing"}</span>
                  </div>`).join("")}
              </div>` : ""}
          </div>
        </div>
      </div>
      <div>
        ${weaknessHtml}${statsHtml}${evoHtml}${compHtml}
        <div class="info-card full-width" style="border-color:var(--accent-primary);">${locationsHtml}</div>
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
        btn.style.borderColor = "#44ff44";
        btn.style.color = "#44ff44";
        setTimeout(() => { btn.textContent = "🔗 Share"; btn.style.borderColor = ""; btn.style.color = ""; }, 2000);
      });
    });

    // Wire up favorite button
    document.getElementById("favBtn").addEventListener("click", () => {
      const idx = favorites.indexOf(cleanName);
      if (idx === -1) {
        favorites.push(cleanName);
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
    // Only show error if this is still the active request
    if (_latestModalRequestId === id) {
      console.error(e);
      DOM.modalBody.innerHTML = `<div class="loading" style="color:var(--accent-primary);">Failed to load details.<br><span style="font-size:0.8rem;color:var(--text-muted);">${e.message}</span></div>`;
    }
  }
}

// --- CLOSE MODAL ---
function closeModal() {
  DOM.modalOverlay.classList.remove("active");
  if (currentTab && currentTab !== "about") {
    history.pushState({ tab: currentTab }, "", `?tab=${currentTab}`);
  } else {
    history.pushState({}, "", window.location.pathname);
  }
}

window.addEventListener("popstate", (e) => {
  if (!e.state?.modal) DOM.modalOverlay.classList.remove("active");
});
