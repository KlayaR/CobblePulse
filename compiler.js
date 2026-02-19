// CobblePulse Database Compiler v2.0
// Automatically compiles JSON data sources into optimized localDB.js
// Features: Strategy deduplication, tier rankings, build timestamps, PokéAPI enrichment

const fs   = require("fs");
const axios = require("axios");

// --- CONFIGURATION ---
const SPREADSHEET_CSV_URL = "https://raw.githubusercontent.com/KlayaR/CobblePulse/main/spawns.csv";

// How many Pokéapi requests to fire simultaneously.
const POKEAPI_BATCH_SIZE = 20;

// ms to wait between batches
const POKEAPI_BATCH_DELAY = 300;

// --- SMOGON NAME → POKEAPI SLUG OVERRIDES ---
const smogonToPokeApiMap = {
  meowscarada:    "meowscarada",
  "iron-valiant": "iron-valiant",
  "roaring-moon": "roaring-moon",
  "great-tusk":   "great-tusk",
  "walking-wake": "walking-wake",
  "iron-leaves":  "iron-leaves",
};

// --- FORM NAME → BASE DEX NUMBER ---
const formToDexMap = {
  // Legendary Forms
  zaciancrowned:       888,
  zamazentacrowned:    889,
  necrozmaduskmane:    800,
  necrozmadawnwings:   800,
  calyrexice:          898,
  calyrexshadow:       898,
  giratinaorigin:      487,
  dialgarorigin:       483,
  dialgaorigin:        483,
  palkiaorigin:        484,
  kyuremblack:         646,
  kyuremwhite:         646,
  shayminsky:          492,
  hoopaunbound:        720,
  urshifurapidstrike:  892,
  urshifusingledtrike: 892,

  // Mega Forms (both possible cleanName spellings included for safety)
  charizardmegax:  6,   charizardmegay:  6,
  venusaurmega:    3,   blastoismega:    9,
  dianciemega:     719, lopunnymega:     428,
  scizormega:      212, latiosmega:      381,
  latiasmega:      380, tyranitarmega:   248,
  mawilemega:      303, swampertmega:    260,
  pinsirmega:      127, heracrossmega:   214,
  aggronmega:      306,
  banettmega:      354, banettemega:     354,
  absolmega:       359, garchompmega:    445,
  lucariomega:     448, alakazammega:    65,
  gengarmega:      94,  kangaskhanmega:  115,
  aerodactylmega:  142, ampharosmega:    181,
  steelixmega:     208, houndoommega:    229,
  manectricmega:   310, sharpedomega:    319,
  cameruptmega:    323, altariamega:     334,
  salamencemega:   373, metagrossmega:   376,
  rayquazamega:    384, slowbromega:     80,
  audinomega:      531, gallademega:     475,
  gardevoirmega:   282,
  medichamega:     308, medichammega:    308,
  gyaradosmega:    130, sableyemega:     302,
  beedrillmega:    15,  sceptilemega:    254,
  abomasnowmega:   460, pidgeotmega:     16,
  glaliemega:      362, blazikenmega:    257,

  // Zygarde Forms (#718)
  zygarde10:       718, zygarde50:       718, zygardecomplete: 718,

  // Gourgeist Forms (#711)
  gourgeistsuper:   711, gourgeistlarge:   711,
  gourgeistsmall:   711, gourgeistaverage: 711,

  // Silvally Forms (#773)
  silvallyfire:     773, silvallywater:    773, silvallyelectric: 773,
  silvallygrass:    773, silvallyice:      773, silvallyfighting: 773,
  silvallypoison:   773, silvallyground:   773, silvallyflying:   773,
  silvallypsychic:  773, silvallybug:      773, silvallyrock:     773,
  silvallyghost:    773, silvallydragon:   773, silvallydark:     773,
  silvallysteel:    773, silvallyfairy:    773, silvallynormal:   773,

  // Arceus Forms (#493)
  arceusfairy:    493, arceusground:   493, arceuswater:    493,
  arceusghost:    493, arceuselectric: 493, arceusflying:   493,
  arceussteel:    493, arceusdark:     493, arceusfire:     493,
  arceuspoison:   493, arceuspsychic:  493, arceusice:      493,
  arceusfighting: 493, arceusgrass:    493, arceusrock:     493,
  arceusdragon:   493, arceusbug:      493, arceusnormal:   493,

  // Deoxys Forms (#386)
  deoxysattack: 386, deoxysspeed: 386, deoxysdefense: 386, deoxysnormal: 386,

  // Forces of Nature
  landorustherian:  645,
  thundurustherian: 642,
  tornadustherian:  641,
  enamorustherian:  905,

  // Ogerpon Forms (#1017)
  ogerponhearthflame: 1017, ogerponwellspring: 1017,
  ogerponcornerstone: 1017, ogerponteal:       1017,

  // Ursaluna (#901)
  ursalunabloodmoon: 901,

  // Rotom Forms (#479)
  rotomwash: 479, rotomheat: 479, rotomfrost: 479,
  rotommow:  479, rotomfan:  479,

  // Alolan Forms
  ninetalesalola:  38,  raichualola:    26,  sandslashalola: 28,
  sandshrewalola:  27,  exeggutoralola: 103, golemalola:     76,
  dugtrioalola:    51,  diglettalola:   50,  grimeralola:    88,
  meowthalola:     52,  geodudealola:   74,  persianalola:   53,
  marowakalola:    105, raticatealola:  20,  rattatalola:    19,
  vulpixalola:     37,  mukalola:       89,

  // Galarian Forms
  weezinggalar:    110, slowkinggalar:  199, slowbrogalar:   80,
  slowpokegalar:   79,  meowthgalar:    52,  corsolagalar:   222,
  moltresgalar:    146, zapdosgalar:    145, articunogalar:  144,
  ponytagalar:     77,  rapidashgalar:  78,  farfetchdgalar: 83,
  mrrimegalar:     122, darmanitangalar:555, darumakagalar:  554,
  yamaskgalar:     562, stunfiskgalar:  618, zigzagoongalar: 263,
  linoonegalar:    264,

  // Hisuian Forms
  samurotthisui:   503, zoroarkhisui:  571, goodrahisui:   706,
  qwilfishhisui:   211, lilliganthisui:549, arcaninehisui: 59,
  typhlosionhisui: 157, decidueyehisui:724, electrodehisui:101,
  braviaryhisui:   628, sliggoohisui:  705, sneaselhisui:  215,
  growlithehisui:  58,  zoruahisui:    570, avalugghisui:  713,
  voltorbhisui:    100,

  // Paldean Forms
  taurospaldeablaze:  128, taurospaldeaaqua: 128,
  taurospaldeacombat: 128, wooperpaldea:     194,

  // Basculegion (#902)
  basculegionf: 902, basculegion: 902,

  // Oricorio Forms (#741)
  oricoriopompom: 741, oricoriosensu: 741,
  oricoriopau:    741, oricoriobaile: 741,

  // Other Forms
  lycanrocdusk:      745, lycanrocmidnight:    745, lycanrocday:    745,
  crabominable:      740, vivillon:            666, flabebe:        669,
  gimmighoulroaming: 999, gimmighoulchest:     999, rockruffdusk:   744,
  indeedeef:         876, indeedem:            876,
};

// --- POKEMON THAT NEED A SPECIFIC POKEAPI FORM SLUG ---
// Used in Phase 3 to fetch the right data + sprite ID from PokeAPI
const cleanNameToPokeApiFormSlug = {
  // Special legendaries & alternate forms with unique sprites/stats
  ursalunabloodmoon:  "ursaluna-bloodmoon",
  giratinaorigin:     "giratina-origin",
  dialgarorigin:      "dialga-origin",
  palkiaorigin:       "palkia-origin",
  kyuremblack:        "kyurem-black",
  kyuremwhite:        "kyurem-white",
  shayminsky:         "shaymin-sky",
  hoopaunbound:       "hoopa-unbound",
  urshifurapidstrike: "urshifu-rapid-strike",
  calyrexice:         "calyrex-ice",
  calyrexshadow:      "calyrex-shadow",
  zaciancrowned:      "zacian-crowned",
  zamazentacrowned:   "zamazenta-crowned",

  // Mega Forms
  charizardmegax:  "charizard-mega-x",
  charizardmegay:  "charizard-mega-y",
  venusaurmega:    "venusaur-mega",
  blastoismega:    "blastoise-mega",
  alakazammega:    "alakazam-mega",
  gengarmega:      "gengar-mega",
  kangaskhanmega:  "kangaskhan-mega",
  pinsirmega:      "pinsir-mega",
  gyaradosmega:    "gyarados-mega",
  aerodactylmega:  "aerodactyl-mega",
  ampharosmega:    "ampharos-mega",
  scizormega:      "scizor-mega",
  heracrossmega:   "heracross-mega",
  houndoommega:    "houndoom-mega",
  tyranitarmega:   "tyranitar-mega",
  blazikenmega:    "blaziken-mega",
  gardevoirmega:   "gardevoir-mega",
  mawilemega:      "mawile-mega",
  aggronmega:      "aggron-mega",
  medichamega:     "medicham-mega",
  medichammega:    "medicham-mega",
  manectricmega:   "manectric-mega",
  sharpedomega:    "sharpedo-mega",
  cameruptmega:    "camerupt-mega",
  altariamega:     "altaria-mega",
  sableyemega:     "sableye-mega",
  banettmega:      "banette-mega",
  banettemega:     "banette-mega",
  absolmega:       "absol-mega",
  glaliemega:      "glalie-mega",
  salamencemega:   "salamence-mega",
  metagrossmega:   "metagross-mega",
  latiasmega:      "latias-mega",
  latiosmega:      "latios-mega",
  rayquazamega:    "rayquaza-mega",
  lopunnymega:     "lopunny-mega",
  garchompmega:    "garchomp-mega",
  lucariomega:     "lucario-mega",
  audinomega:      "audino-mega",
  slowbromega:     "slowbro-mega",
  steelixmega:     "steelix-mega",
  pidgeotmega:     "pidgeot-mega",
  beedrillmega:    "beedrill-mega",
  dianciemega:     "diancie-mega",
  gallademega:     "gallade-mega",
  sceptilemega:    "sceptile-mega",
  swampertmega:    "swampert-mega",
  abomasnowmega:   "abomasnow-mega",

  // Alolan Forms
  ninetalesalola:  "ninetales-alola",
  raichualola:     "raichu-alola",
  sandslashalola:  "sandslash-alola",
  sandshrewalola:  "sandshrew-alola",
  exeggutoralola:  "exeggutor-alola",
  golemalola:      "golem-alola",
  dugtrioalola:    "dugtrio-alola",
  diglettalola:    "diglett-alola",
  grimeralola:     "grimer-alola",
  meowthalola:     "meowth-alola",
  geodudealola:    "geodude-alola",
  persianalola:    "persian-alola",
  marowakalola:    "marowak-alola",
  raticatealola:   "raticate-alola",
  rattatalola:     "rattata-alola",
  vulpixalola:     "vulpix-alola",
  mukalola:        "muk-alola",

  // Galarian Forms
  weezinggalar:    "weezing-galar",
  slowkinggalar:   "slowking-galar",
  slowbrogalar:    "slowbro-galar",
  slowpokegalar:   "slowpoke-galar",
  meowthgalar:     "meowth-galar",
  corsolagalar:    "corsola-galar",
  moltresgalar:    "moltres-galar",
  zapdosgalar:     "zapdos-galar",
  articunogalar:   "articuno-galar",
  ponytagalar:     "ponyta-galar",
  rapidashgalar:   "rapidash-galar",
  farfetchdgalar:  "farfetchd-galar",
  mrrimegalar:     "mr-mime-galar",
  darmanitangalar: "darmanitan-galar-standard",
  darumakagalar:   "darumaka-galar",
  yamaskgalar:     "yamask-galar",
  stunfiskgalar:   "stunfisk-galar",
  zigzagoongalar:  "zigzagoon-galar",
  linoonegalar:    "linoone-galar",

  // Hisuian Forms
  samurotthisui:   "samurott-hisui",
  zoroarkhisui:    "zoroark-hisui",
  goodrahisui:     "goodra-hisui",
  qwilfishhisui:   "qwilfish-hisui",
  lilliganthisui:  "lilligant-hisui",
  arcaninehisui:   "arcanine-hisui",
  typhlosionhisui: "typhlosion-hisui",
  decidueyehisui:  "decidueye-hisui",
  electrodehisui:  "electrode-hisui",
  braviaryhisui:   "braviary-hisui",
  sliggoohisui:    "sliggoo-hisui",
  sneaselhisui:    "sneasel-hisui",
  growlithehisui:  "growlithe-hisui",
  zoruahisui:      "zorua-hisui",
  avalugghisui:    "avalugg-hisui",
  voltorbhisui:    "voltorb-hisui",

  // Paldean Forms
  taurospaldeablaze:  "tauros-paldea-blaze",
  taurospaldeaaqua:   "tauros-paldea-aqua",
  taurospaldeacombat: "tauros-paldea-combat",
  wooperpaldea:       "wooper-paldea",
};

let pokemonDB = {};

// --- HELPER: Convert Pokémon name to PokéAPI slug ---
function nameToPokeAPI(name) {
  let apiName = name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, "-")
    .replace(/♀/g, "-f")
    .replace(/♂/g, "-m");

  const specialCases = {
    "nidoran-f": "nidoran-f",
    "nidoran-m": "nidoran-m",
    "mr-mime":   "mr-mime",
    "mime-jr":   "mime-jr",
    farfetchd:   "farfetchd",
    sirfetchd:   "sirfetchd",
    "type-null": "type-null",
    "jangmo-o":  "jangmo-o",
    "hakamo-o":  "hakamo-o",
    "kommo-o":   "kommo-o",
    "tapu-koko": "tapu-koko",
    "tapu-lele": "tapu-lele",
    "tapu-bulu": "tapu-bulu",
    "tapu-fini": "tapu-fini",
    "porygon-z": "porygon-z",
    "ho-oh":     "ho-oh",
  };

  return specialCases[apiName] || apiName;
}

// --- HELPER: Abbreviate tier name for badges ---
function abbreviateTier(tierName) {
  const abbrevs = {
    "National Dex": "NDex",
    "National Dex Ubers": "NDex Ubers",
    "National Dex UU": "NDex UU",
    "National Dex RU": "NDex RU",
    "National Dex Monotype": "NDex Mono",
    "Doubles OU": "DOU",
    "VGC 2024 Reg F": "VGC24F",
    "VGC 2025 Reg G": "VGC25G",
    "VGC 2025 Reg H": "VGC25H",
    "Almost Any Ability": "AAA",
    "Balanced Hackmons": "BH",
    "Mix and Mega": "MnM",
  };

  if (abbrevs[tierName]) return abbrevs[tierName];

  // Generic abbreviation: "Some Long Tier" → "SLT"
  return tierName
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase())
    .join("")
    .slice(0, 8);
}

// --- HELPER: Fix UTF-8 mojibake ---
function cleanText(text) {
  if (!text) return text;
  return text
    .replace(/â€™/g, "'")
    .replace(/â€"/g, "—")
    .replace(/â€"/g, "–")
    .replace(/â€œ/g, '"')
    .replace(/â€/g,  '"')
    .replace(/Ã©/g,  "é")
    .replace(/Ã¨/g,  "è")
    .replace(/Ã /g,  "à")
    .replace(/Ã¡/g,  "á")
    .replace(/Ã/g,   "í")
    .replace(/Ã³/g,  "ó")
    .replace(/Ãº/g,  "ú")
    .replace(/Ã±/g,  "ñ")
    .replace(/Ã§/g,  "ç")
    .replace(/â€¦/g, "...")
    .replace(/â€¢/g, "•")
    .replace(/\uFFFD/g, "'");
}

// --- HELPER: Bulletproof CSV parser ---
function parseCSV(text) {
  const firstLine = text.split("\n")[0];
  const delimiter = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  let result = [], row = [], inQuotes = false, val = "";

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { val += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { val += char; }
    } else {
      if      (char === '"')                     { inQuotes = true; }
      else if (char === delimiter)               { row.push(val.trim().replace(/\n|\r/g, ", ")); val = ""; }
      else if (char === "\n" || char === "\r")  {
        row.push(val.trim().replace(/\n|\r/g, ", "));
        result.push(row);
        row = []; val = "";
        if (char === "\r" && text[i + 1] === "\n") i++;
      } else { val += char; }
    }
  }

  if (val || text[text.length - 1] === delimiter) row.push(val.trim().replace(/\n|\r/g, ", "));
  if (row.length > 0) result.push(row);
  return result;
}

// --- HELPER: Format a single EV spread object into a display string ---
function formatEvSpread(evs) {
  return Object.entries(evs).map(([s, v]) => `${v} ${s.toUpperCase()}`).join(" / ");
}

// --- HELPER: Map one set's details to a strategy object ---
function mapSetDetails(setName, details, stats, tierName) {
  let rawAbility = details.abilities || details.ability || details.Abilities || details.Ability;
  if (!rawAbility || rawAbility === "Any") {
    rawAbility = Object.keys(stats.abilities || {}).sort((a, b) => stats.abilities[b] - stats.abilities[a])[0] || "Any";
  }
  return {
    name:     setName,
    tier:     tierName,
    ability:  Array.isArray(rawAbility)  ? rawAbility.join(" / ") :
              typeof rawAbility === "object" ? Object.values(rawAbility).join(" / ") : rawAbility,
    item:     (Array.isArray(details.item) ? details.item.join(" / ") : String(details.item || "None")).split(",").join(" / "),
    nature:   Array.isArray(details.nature || details.natures)
                ? (details.nature || details.natures).join(" / ")
                : (details.nature || "Hardy"),
    teraType: Array.isArray(details.teratypes || details.teraType)
                ? (details.teratypes || details.teraType).join(" / ")
                : (details.teraType || "Normal"),
    evs:      Array.isArray(details.evs)
                ? details.evs.map(formatEvSpread).join(" OR ")
                : formatEvSpread(details.evs || {}) || "None",
    moves:    (details.moves || []).map((m) => (Array.isArray(m) ? m.join(" / ") : m)),
  };
}

// --- HELPER: Extract ALL strategies from gen9.json for a given Pokémon name ---
// NEW: Returns deduplicated strategies array instead of repeating per tier
function getAllStrategies(smogonName, stats, gen9AllSets) {
  const lowerIndex = {};
  for (const key of Object.keys(gen9AllSets)) {
    lowerIndex[key.toLowerCase()] = key;
  }

  const candidates = [
    smogonName,
    smogonName.toLowerCase(),
    smogonName.replace(/-/g, " "),
    smogonName.replace(/-/g, ""),
    smogonName.replace(/ /g, "-"),
    smogonName.toLowerCase().replace(/-/g, " "),
    smogonName.toLowerCase().replace(/-/g, ""),
    smogonName.toLowerCase().replace(/ /g, "-"),
  ];

  let pokemonEntry = null;
  for (const c of candidates) {
    if (gen9AllSets[c])              { pokemonEntry = gen9AllSets[c]; break; }
    if (lowerIndex[c.toLowerCase()]) { pokemonEntry = gen9AllSets[lowerIndex[c.toLowerCase()]]; break; }
  }

  if (!pokemonEntry) return [];

  // Detect flat structure: { "Set Name": { moves, item, ... }, ... }
  const firstValue = Object.values(pokemonEntry)[0];
  const isFlat = firstValue && typeof firstValue === "object" &&
    ("moves" in firstValue || "item" in firstValue || "ability" in firstValue || "abilities" in firstValue);

  if (isFlat) {
    return Object.entries(pokemonEntry).map(([setName, details]) => mapSetDetails(setName, details, stats, "Mixed"));
  }

  // Nested: each key is a tier block containing sets
  // Collect ALL sets from ALL tier blocks, deduplicating by set name
  const seen = new Set();
  const allSets = [];
  for (const [tierName, tierBlock] of Object.entries(pokemonEntry)) {
    if (tierBlock && typeof tierBlock === "object" && !Array.isArray(tierBlock)) {
      for (const [setName, details] of Object.entries(tierBlock)) {
        if (!seen.has(setName) && details && typeof details === "object" &&
            ("moves" in details || "item" in details || "ability" in details || "abilities" in details)) {
          seen.add(setName);
          allSets.push(mapSetDetails(setName, details, stats, tierName));
        }
      }
    }
  }
  return allSets;
}

// --- HELPER: Run an async fn on items in chunks ---
async function batchedAsync(items, batchSize, delayMs, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

// --- MAIN BUILD ENGINE ---
async function buildDatabase() {
  console.log("🚀 STARTING BUILD...");
  const buildTimestamp = new Date().toISOString();

  try {
    // ────────────────────────────────────────────────────────────────────────
    // PHASE 1 — Parse spawns.csv
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n📋 PHASE 1: Parsing spawns.csv...");
    const spreadsheetRes = await axios.get(SPREADSHEET_CSV_URL, { responseType: "text", responseEncoding: "utf8" });
    const rows = parseCSV(spreadsheetRes.data);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5 || !row[1]) continue;

      const dexNumber = parseInt((row[0] || "").replace("#", "").trim()) || null;
      const nameRaw   = cleanText(row[1]);
      const cleanName = nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (!pokemonDB[cleanName]) {
        pokemonDB[cleanName] = {
          name:      nameRaw,
          cleanName: cleanName,
          dex:       dexNumber,
          id:        dexNumber || 0,
          sprite:    dexNumber ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png` : "",
          locations: [],
          allRanks:  [],
          types:     [],
          strategies: [],
        };
      }

      pokemonDB[cleanName].locations.push({
        spawn:     cleanText(row[3] || "Unknown"),
        rarity:    row[4] || "Standard",
        condition: cleanText(row[5] || ""),
        forms:     cleanText(row[6] || ""),
      });
    }
    console.log(`✅ Phase 1 done — ${Object.keys(pokemonDB).length} Pokémon from spawns.csv`);

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 2 — Enrich with Smogon competitive data
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n⚔️  PHASE 2: Fetching Smogon data...");

    const tiers = [
      "ubers", "ou", "uu", "ru", "nu", "pu", "zu", "lc",
      "vgc2025",
      "nationaldex",
      "doublesou",
      "monotype",
    ];

    let gen9AllSets = {};
    try {
      const allSetsRes = await axios.get("https://pkmn.github.io/smogon/data/sets/gen9.json");
      gen9AllSets = allSetsRes.data;
      console.log(`  ✅ gen9.json loaded — ${Object.keys(gen9AllSets).length} Pokémon entries`);
    } catch (e) {
      console.log(`  ⚠️  gen9.json failed — ${e.message} (sets will be empty)`);
    }

    await Promise.all(tiers.map(async (tier) => {
      try {
        const statsRes  = await axios.get(`https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`);
        const statsData = statsRes.data.pokemon || statsRes.data.data || statsRes.data;

        Object.entries(statsData).forEach(([smogonName, stats], index) => {
          let cleanName = smogonName.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (smogonToPokeApiMap[cleanName]) cleanName = smogonToPokeApiMap[cleanName];

          if (!pokemonDB[cleanName]) {
            const dexNum = formToDexMap[cleanName] || null;
            pokemonDB[cleanName] = {
              name:      smogonName,
              cleanName: cleanName,
              dex:       dexNum,
              id:        dexNum || 0,
              sprite:    dexNum ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNum}.png` : "",
              locations: [],
              allRanks:  [],
              types:     [],
              strategies: [],
            };
          }

          const usage = stats.usage
            ? typeof stats.usage === "number" ? stats.usage : (stats.usage.weighted || 0)
            : 0;

          // Strategies only stored ONCE at top level
          if (pokemonDB[cleanName].strategies.length === 0) {
            pokemonDB[cleanName].strategies = getAllStrategies(smogonName, stats, gen9AllSets);
          }

          pokemonDB[cleanName].allRanks.push({
            tier:  tier,
            rank:  index + 1,
            usage: (usage * 100).toFixed(2),
          });
        });
        console.log(`  ✅ ${tier.toUpperCase()} done`);
      } catch (e) {
        console.log(`  ⚠️  ${tier.toUpperCase()} skipped — ${e.message}`);
      }
    }));

    // For Pokémon with no tier data, still try to get their strategies
    Object.values(pokemonDB).forEach((p) => {
      if (p.allRanks.length === 0) {
        p.allRanks.push({ tier: "Untiered", rank: "N/A", usage: "0.00" });
      }
      if (p.strategies.length === 0) {
        p.strategies = getAllStrategies(p.name, {}, gen9AllSets);
      }
    });
    console.log(`✅ Phase 2 done`);

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 3 — Enrich with PokéAPI data
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n🌐 PHASE 3: Fetching PokéAPI data in parallel batches...");
    const allEntries = Object.keys(pokemonDB);
    let successCount = 0;
    let failCount    = 0;

    await batchedAsync(allEntries, POKEAPI_BATCH_SIZE, POKEAPI_BATCH_DELAY, async (cleanName) => {
      const dexNumber  = pokemonDB[cleanName].dex;
      const formSlug   = cleanNameToPokeApiFormSlug[cleanName];
      const pokemonKey = formSlug || dexNumber;

      if (!pokemonKey) {
        console.log(`  ⚠️  Skipped ${cleanName} — no dex number`);
        failCount++;
        return;
      }

      try {
        const [pokemonRes, speciesRes] = await Promise.all([
          axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonKey}`),
          axios.get(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`),
        ]);

        const data    = pokemonRes.data;
        const species = speciesRes.data;

        // Store the actual sprite ID from pokemonRes.data.id
        // For base forms this equals dexNumber, for regional/alt forms it's unique
        pokemonDB[cleanName].id          = data.id;
        pokemonDB[cleanName].sprite      = data.sprites.front_default ||
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`;
        pokemonDB[cleanName].types       = data.types.map((t) => t.type.name);
        pokemonDB[cleanName].abilities   = data.abilities.map((a) => ({ name: a.ability.name, isHidden: a.is_hidden }));
        pokemonDB[cleanName].stats       = Object.fromEntries(data.stats.map((s) => [s.stat.name, s.base_stat]));
        pokemonDB[cleanName].isLegendary = species.is_legendary;
        pokemonDB[cleanName].isMythical  = species.is_mythical;

        successCount++;
      } catch (e) {
        console.log(`  ⚠️  PokéAPI failed for ${pokemonDB[cleanName].name} (#${pokemonKey}) — ${e.message}`);
        failCount++;
      }
    });

    console.log(`✅ Phase 3 done — ${successCount} enriched, ${failCount} skipped`);

    // ────────────────────────────────────────────────────────────────────────
    // PHASE 4 — Write output files
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n💾 PHASE 4: Writing output files...");
    
    const finalDB = {
      _meta: { buildTimestamp },
      pokemon: pokemonDB,
    };

    fs.writeFileSync("localDB.json", JSON.stringify(finalDB, null, 2));
    console.log("  ✅ localDB.json saved");

    fs.writeFileSync("localDB.js", `window.localDB = ${JSON.stringify(finalDB, null, 2)};`);
    console.log("  ✅ localDB.js saved");

    console.log("\n🎉 BUILD COMPLETE!");
    console.log(`📊 Database size: ${(fs.statSync("localDB.js").size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`⏰ Built at: ${buildTimestamp}`);

  } catch (error) {
    console.error("❌ FATAL ERROR:", error.message);
  }
}

buildDatabase();
