// --- STATE ---
let allPokemon  = [];
let localDB     = {};
let currentTab  = "about";
let favorites   = JSON.parse(localStorage.getItem("cobblePulseFavorites") || "[]");

let filterState = {
  types: [],
  hasSpawns: false,
  rarity: "all",
};

const DOM = {
  list:                  document.getElementById("pokemonList"),
  searchInput:           document.getElementById("searchInput"),
  searchClear:           document.getElementById("searchClear"),
  tabs:                  document.querySelectorAll(".tab-btn"),
  modalOverlay:          document.getElementById("modalOverlay"),
  modalBody:             document.getElementById("modalBody"),
  closeBtn:              document.getElementById("closeBtn"),
  sortSelect:            document.getElementById("sortSelect"),
  randomBtn:             document.getElementById("randomBtn"),
  aboutPanel:            document.getElementById("aboutPanel"),
  tableContainer:        document.getElementById("tableContainer"),
  unifiedFilters:        document.getElementById("unifiedFilters"),
  spawnsChip:            document.getElementById("spawnsChip"),
  rarityDropdownBtn:     document.getElementById("rarityDropdownBtn"),
  rarityDropdownPanel:   document.getElementById("rarityDropdownPanel"),
  typesDropdownBtn:      document.getElementById("typesDropdownBtn"),
  typesDropdownPanel:    document.getElementById("typesDropdownPanel"),
  typeCount:             document.getElementById("typeCount"),
  loadingSkeleton:       document.getElementById("loadingSkeleton"),
};

const POKEMON_TYPES = ["normal","fire","water","grass","electric","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];

// --- RENDER TABLE ---
function renderTable(pokemonArray) {
  DOM.list.innerHTML = `<tr><td colspan="4" class="loading">Loading...</td></tr>`;
  let html = "";
  
  const allPokemonData = window.localDB?.pokemon || window.localDB || {};
  
  for (const p of pokemonArray) {
    if (!p.types || !Array.isArray(p.types)) p.types = [];
    const typeHtml = p.types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join("");
    const dbEntry  = allPokemonData[p.cleanName] || allPokemonData[p.name] || {};

    let rank = 0;
    if (currentTab !== "all" && dbEntry.allRanks) {
      const tierData = dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", "")));
      if (tierData) rank = tierData.rank;
    }

    const isCompetitiveTab = currentTab !== "all";
    const rankText  = isCompetitiveTab ? `Rank #${rank}` : `Dex #${p.id}`;
    const rankColor = isCompetitiveTab ? "var(--accent-primary)" : "var(--text-muted)";
    const isFavRow  = favorites.includes(p.cleanName) ? "⭐ " : "";

    // Prefetch evo chain on hover for instant modal open
    html += `
      <tr onclick="openModal(${p.id}, '${p.cleanName}')" onmouseenter="prefetchPokemonDetails(${p.id})">
        <td><strong style="color:${rankColor};">${rankText}</strong></td>
        <td class="sprite-cell"><img src="${p.sprite}" alt="${p.name}" loading="lazy"></td>
        <td style="text-transform:capitalize;font-weight:bold;">${isFavRow}${p.name.replace("-", " ")}</td>
        <td>${typeHtml}</td>
      </tr>`;
  }
  if (pokemonArray.length === 0) html = `<tr><td colspan="4" class="loading">No Pokémon found.</td></tr>`;
  DOM.list.innerHTML = html;
}

// --- UPDATE TYPE COUNT BADGE ---
function updateTypeCount() {
  if (!DOM.typeCount || !DOM.typesDropdownBtn) return;
  if (filterState.types.length > 0) {
    DOM.typeCount.textContent = `(${filterState.types.length})`;
    DOM.typesDropdownBtn.classList.add("active");
  } else {
    DOM.typeCount.textContent = "";
    DOM.typesDropdownBtn.classList.remove("active");
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  let timeout = null;

  DOM.searchInput.addEventListener("input", () => {
    clearTimeout(timeout);
    DOM.searchClear.classList.toggle("visible", !!DOM.searchInput.value);
    timeout = setTimeout(applyFilters, 300);
  });

  DOM.searchClear.addEventListener("click", () => {
    DOM.searchInput.value = "";
    DOM.searchClear.classList.remove("visible");
    applyFilters();
  });

  if (DOM.typesDropdownPanel) {
    POKEMON_TYPES.forEach((type) => {
      const badge = document.createElement("span");
      badge.className = `type-badge type-${type} type-filter-badge`;
      badge.textContent = type;
      badge.dataset.type = type;
      badge.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = filterState.types.indexOf(type);
        if (index > -1) { filterState.types.splice(index, 1); badge.classList.remove("active"); }
        else            { filterState.types.push(type);       badge.classList.add("active"); }
        updateTypeCount();
        applyFilters();
      });
      DOM.typesDropdownPanel.appendChild(badge);
    });
  }

  if (DOM.typesDropdownBtn && DOM.typesDropdownPanel) {
    DOM.typesDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = DOM.typesDropdownPanel.classList.contains("open");
      document.querySelectorAll(".filter-dropdown-panel").forEach((p) => p.classList.remove("open"));
      if (!isOpen) DOM.typesDropdownPanel.classList.add("open");
    });
  }

  if (DOM.rarityDropdownBtn && DOM.rarityDropdownPanel) {
    DOM.rarityDropdownBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = DOM.rarityDropdownPanel.classList.contains("open");
      document.querySelectorAll(".filter-dropdown-panel").forEach((p) => p.classList.remove("open"));
      if (!isOpen) DOM.rarityDropdownPanel.classList.add("open");
    });
  }

  document.querySelectorAll(".rarity-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const value = opt.dataset.value;
      filterState.rarity = value;
      document.querySelectorAll(".rarity-option").forEach((o) => o.classList.remove("active"));
      opt.classList.add("active");
      if (DOM.rarityDropdownBtn) {
        const labels = { all: "⭐ Rarity", legendary: "⭐ Legendary/Mythical", "non-legendary": "⭐ Non-Legendary" };
        DOM.rarityDropdownBtn.innerHTML = `${labels[value]} ▾`;
        DOM.rarityDropdownBtn.classList.toggle("active", value !== "all");
      }
      if (DOM.rarityDropdownPanel) DOM.rarityDropdownPanel.classList.remove("open");
      applyFilters();
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".filter-dropdown-panel").forEach((p) => p.classList.remove("open"));
  });

  if (DOM.spawnsChip) {
    DOM.spawnsChip.addEventListener("click", () => {
      filterState.hasSpawns = !filterState.hasSpawns;
      DOM.spawnsChip.classList.toggle("active", filterState.hasSpawns);
      applyFilters();
    });
  }

  if (DOM.sortSelect) DOM.sortSelect.addEventListener("change", applyFilters);

  if (DOM.randomBtn) {
    DOM.randomBtn.addEventListener("click", () => {
      const allPokemonData = window.localDB?.pokemon || window.localDB || {};
      const keys = Object.keys(allPokemonData);
      const p    = allPokemonData[keys[Math.floor(Math.random() * keys.length)]];
      openModal(p.id, p.cleanName);
    });
  }

  DOM.tabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      DOM.tabs.forEach((t) => t.classList.remove("active"));
      e.target.classList.add("active");
      currentTab = e.target.getAttribute("data-tab");
      DOM.searchInput.value = "";
      DOM.searchClear.classList.remove("visible");
      if (currentTab && currentTab !== "about") history.pushState({ tab: currentTab }, "", `?tab=${currentTab}`);
      else history.pushState({}, "", window.location.pathname);
      applyFilters();
    });
  });

  DOM.closeBtn.addEventListener("click", closeModal);
  DOM.modalOverlay.addEventListener("click", (e) => { if (e.target === DOM.modalOverlay) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

// --- INIT ---
async function init() {
  setupEventListeners();
  applyFilters();

  try {
    if (DOM.loadingSkeleton) DOM.loadingSkeleton.style.display = "block";

    const response = await fetch("./localDB.js?v=" + Date.now());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const scriptText = await response.text();
    eval(scriptText);

    const dbData      = window.localDB || {};
    const pokemonData = dbData.pokemon || dbData;
    
    window.localDB = dbData;
    allPokemon     = Object.values(pokemonData);

    // Build alt-forms index (mega/alola/galar/hisui/paldea etc.) once data is loaded
    buildAltFormsIndex();
    
    if (DOM.loadingSkeleton) DOM.loadingSkeleton.style.display = "none";

    if (dbData._meta && dbData._meta.buildTimestamp) {
      const buildDate = new Date(dbData._meta.buildTimestamp);
      const dateStr   = buildDate.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
      const timestampEl = document.getElementById("buildTimestamp");
      if (timestampEl) {
        timestampEl.textContent = `Last Updated: ${dateStr}`;
        timestampEl.style.display = "inline";
      }
    }

    applyFilters();

    const urlParams    = new URLSearchParams(window.location.search);
    const tabParam     = urlParams.get("tab");
    const pokemonParam = urlParams.get("pokemon");

    if (tabParam) {
      const tabBtn = document.querySelector(`[data-tab="${tabParam}"]`);
      if (tabBtn) {
        DOM.tabs.forEach((t) => t.classList.remove("active"));
        tabBtn.classList.add("active");
        currentTab = tabParam;
        applyFilters();
      }
    }
    if (pokemonParam && pokemonData[pokemonParam]) {
      const p = pokemonData[pokemonParam];
      openModal(p.id, p.cleanName);
    }
  } catch (e) {
    console.error("Data load failed:", e);
    if (DOM.loadingSkeleton) DOM.loadingSkeleton.style.display = "none";
    DOM.list.innerHTML = `<tr><td colspan="4" class="loading"><strong>Error loading data:</strong> ${e.message}<br><br>Make sure localDB.js is in the same directory as index.html.</td></tr>`;
  }
}

init();
