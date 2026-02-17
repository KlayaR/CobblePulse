// --- STATE ---
let allPokemon  = [];
let localDB     = {};
let currentTab  = "about";
let favorites   = JSON.parse(localStorage.getItem("cobblePulseFavorites") || "[]");

let filterState = {
  types: [],
  hasSpawns: false,
  isLegendary: false,
  stats: { hp: 0, attack: 0, defense: 0, "special-attack": 0, "special-defense": 0, speed: 0 },
};

const DOM = {
  list:            document.getElementById("pokemonList"),
  searchInput:     document.getElementById("searchInput"),
  searchClear:     document.getElementById("searchClear"),
  tabs:            document.querySelectorAll(".tab-btn"),
  modalOverlay:    document.getElementById("modalOverlay"),
  modalBody:       document.getElementById("modalBody"),
  closeBtn:        document.getElementById("closeBtn"),
  toolbar:         document.getElementById("toolbar"),
  sortSelect:      document.getElementById("sortSelect"),
  randomBtn:       document.getElementById("randomBtn"),
  aboutPanel:      document.getElementById("aboutPanel"),
  tableContainer:  document.getElementById("tableContainer"),
  filterChips:     document.getElementById("filterChips"),
  typeFilterBadges:document.getElementById("typeFilterBadges"),
  spawnsChip:      document.getElementById("spawnsChip"),
  legendaryChip:   document.getElementById("legendaryChip"),
  advancedToggle:  document.getElementById("advancedToggle"),
  advancedFilters: document.getElementById("advancedFilters"),
  hpSlider:        document.getElementById("hpSlider"),
  atkSlider:       document.getElementById("atkSlider"),
  defSlider:       document.getElementById("defSlider"),
  spaSlider:       document.getElementById("spaSlider"),
  spdSlider:       document.getElementById("spdSlider"),
  speSlider:       document.getElementById("speSlider"),
};

const POKEMON_TYPES = ["normal","fire","water","grass","electric","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"];

// --- RENDER TABLE ---
function renderTable(pokemonArray) {
  DOM.list.innerHTML = `<tr><td colspan="4" class="loading">Loading...</td></tr>`;
  let html = "";
  for (const p of pokemonArray) {
    if (!p.types || !Array.isArray(p.types)) p.types = [];
    const typeHtml = p.types.map((t) => `<span class="type-badge type-${t}">${t}</span>`).join("");
    const dbEntry  = localDB[p.cleanName] || localDB[p.name] || {};

    let rank = 0;
    if (currentTab !== "all" && dbEntry.allRanks) {
      const tierData = dbEntry.allRanks.find((r) => r.tier.toLowerCase().includes(currentTab.replace("s", "")));
      if (tierData) rank = tierData.rank;
    }

    const isCompetitiveTab = currentTab !== "all";
    const rankText  = isCompetitiveTab ? `Rank #${rank}` : `Dex #${p.id}`;
    const rankColor = isCompetitiveTab ? "var(--accent-primary)" : "var(--text-muted)";
    const isFavRow  = favorites.includes(p.cleanName) ? "⭐ " : "";

    html += `
      <tr onclick="openModal(${p.id}, '${p.cleanName}')">
        <td><strong style="color:${rankColor};">${rankText}</strong></td>
        <td class="sprite-cell"><img src="${p.sprite}" alt="${p.name}" loading="lazy"></td>
        <td style="text-transform:capitalize;font-weight:bold;">${isFavRow}${p.name.replace("-", " ")}</td>
        <td>${typeHtml}</td>
      </tr>`;
  }
  if (pokemonArray.length === 0) html = `<tr><td colspan="4" class="loading">No Pokémon found.</td></tr>`;
  DOM.list.innerHTML = html;
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

  // Type filter badges
  POKEMON_TYPES.forEach((type) => {
    const badge = document.createElement("span");
    badge.className = `type-badge type-${type} type-filter-badge`;
    badge.textContent = type;
    badge.dataset.type = type;
    badge.addEventListener("click", () => {
      const index = filterState.types.indexOf(type);
      if (index > -1) { filterState.types.splice(index, 1); badge.classList.remove("active"); }
      else            { filterState.types.push(type);       badge.classList.add("active"); }
      applyFilters();
    });
    DOM.typeFilterBadges.appendChild(badge);
  });

  if (DOM.sortSelect) DOM.sortSelect.addEventListener("change", applyFilters);
  if (DOM.randomBtn)  DOM.randomBtn.addEventListener("click", () => {
    const keys = Object.keys(localDB);
    const p    = localDB[keys[Math.floor(Math.random() * keys.length)]];
    openModal(p.id, p.cleanName);
  });

  DOM.spawnsChip.addEventListener("click", () => {
    filterState.hasSpawns = !filterState.hasSpawns;
    DOM.spawnsChip.classList.toggle("active", filterState.hasSpawns);
    applyFilters();
  });
  DOM.legendaryChip.addEventListener("click", () => {
    filterState.isLegendary = !filterState.isLegendary;
    DOM.legendaryChip.classList.toggle("active", filterState.isLegendary);
    applyFilters();
  });
  DOM.advancedToggle.addEventListener("click", () => DOM.advancedFilters.classList.toggle("open"));

  // Stat sliders
  [
    { elem: DOM.hpSlider,  value: document.getElementById("hpValue"),  stat: "hp" },
    { elem: DOM.atkSlider, value: document.getElementById("atkValue"), stat: "attack" },
    { elem: DOM.defSlider, value: document.getElementById("defValue"), stat: "defense" },
    { elem: DOM.spaSlider, value: document.getElementById("spaValue"), stat: "special-attack" },
    { elem: DOM.spdSlider, value: document.getElementById("spdValue"), stat: "special-defense" },
    { elem: DOM.speSlider, value: document.getElementById("speValue"), stat: "speed" },
  ].forEach(({ elem, value, stat }) => {
    elem.addEventListener("input", () => {
      value.textContent = elem.value;
      filterState.stats[stat] = parseInt(elem.value);
      applyFilters();
    });
  });

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
    const dbResponse = await fetch("./localDB.json?v=" + Date.now());
    if (!dbResponse.ok) throw new Error(`HTTP error! status: ${dbResponse.status}`);
    const contentType = dbResponse.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await dbResponse.text();
      throw new Error("Server returned HTML instead of JSON. Make sure localDB.json exists.");
    }

    localDB    = await dbResponse.json();
    allPokemon = Object.values(localDB);
    applyFilters();

    // Restore state from URL params
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
    if (pokemonParam && localDB[pokemonParam]) {
      const p = localDB[pokemonParam];
      openModal(p.id, p.cleanName);
    }
  } catch (e) {
    console.error("Data load failed:", e);
    DOM.list.innerHTML = `<tr><td colspan="4" class="loading"><strong>Error loading data:</strong> ${e.message}<br><br>Make sure localDB.json is in the same directory as index.html.</td></tr>`;
  }
}

init();
