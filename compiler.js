const fs   = require("fs");
const axios = require("axios");

// --- CONFIGURATION ---
const SPREADSHEET_CSV_URL = "https://raw.githubusercontent.com/KlayaR/CobblePulse/main/spawns.csv";

// How many PokéAPI requests to fire simultaneously.
// 20 is safe — high enough to be fast, low enough to avoid rate limiting.
const POKEAPI_BATCH_SIZE = 20;

// ms to wait between batches to be polite to PokéAPI
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

  // Ursaluna (#901) — FIX: was incorrectly "nursalunabloodmoon"
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

// --- POKEMON THAT NEED A SPECIFIC POKEAPI FORM SLUG (not just dex number) ---
// Used in Phase 3 to fetch the correct form's sprite/types/stats
const cleanNameToPokeApiFormSlug = {
  ursalunabloodmoon: "ursaluna-bloodmoon",
  giratinaorigin:    "giratina-origin",
  dialgarorigin:     "dialga-origin",
  palkiaorigin:      "palkia-origin",
  kyuremblack:       "kyurem-black",
  kyuremwhite:       "kyurem-white",
  shayminsky:        "shaymin-sky",
  hoopaunbound:      "hoopa-unbound",
  urshifurapidstrike:"urshifu-rapid-strike",
  calyrexice:        "calyrex-ice",
  calyrexshadow:     "calyrex-shadow",
  zaciancrowned:     "zacian-crowned",
  zamazentacrowned:  "zamazenta-crowned",
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

// --- HELPER: Fix UTF-8 mojibake from misread CSV encoding ---
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
    .replace(/�/g,  "'");
}

// --- HELPER: Bulletproof CSV parser (handles commas inside quoted cells) ---
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

// --- HELPER: Extract competitive strategies from Smogon set data ---
function parseSets(name, stats, setsData) {
  const variants = [name, name.replace("-", " "), name.split("-")[0]];
  let sets = null;
  for (const v of variants) {
    if (setsData[v]) { sets = setsData[v]; break; }
  }
  if (!sets) return [];

  return Object.entries(sets).map(([setName, details]) => {
    let rawAbility = details.abilities || details.ability || details.Abilities || details.Ability;
    if (!rawAbility || rawAbility === "Any") {
      rawAbility = Object.keys(stats.abilities || {}).sort((a, b) => stats.abilities[b] - stats.abilities[a])[0] || "Any";
    }
    return {
      name:     setName,
      ability:  Array.isArray(rawAbility)           ? rawAbility.join(" / ")              : typeof rawAbility === "object" ? Object.values(rawAbility).join(" / ") : rawAbility,
      item:     (Array.isArray(details.item)         ? details.item.join(" / ")            : String(details.item || "None")).split(",").join(" / "),
      nature:   Array.isArray(details.nature || details.natures) ? (details.nature || details.natures).join(" / ") : details.nature || "Hardy",
      teraType: Array.isArray(details.teratypes || details.teraType) ? (details.teratypes || details.teraType).join(" / ") : details.teraType || "Normal",
      evs:      Object.entries(details.evs || {}).map(([s, v]) => `${v} ${s.toUpperCase()}`).join(" / ") || "None",
      moves:    (details.moves || []).map((m) => (Array.isArray(m) ? m.join(" / ") : m)).slice(0, 4),
    };
  });
}

// --- HELPER: Run an async fn on items in chunks, with a delay between batches ---
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

  try {
    // ─────────────────────────────────────────────────────────────
    // PHASE 1 — Parse spawns.csv
    // ─────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────
    // PHASE 2 — Enrich with Smogon competitive data
    // ─────────────────────────────────────────────────────────────
    console.log("\n⚔️  PHASE 2: Fetching Smogon tier data (parallel)...");
    const tiers = ["ubers", "ou", "uu", "ru", "nu", "pu", "lc"];

    await Promise.all(tiers.map(async (tier) => {
      try {
        const [statsRes, setsRes] = await Promise.all([
          axios.get(`https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`),
          axios.get(`https://pkmn.github.io/smogon/data/sets/gen9${tier}.json`),
        ]);
        const statsData = statsRes.data.pokemon || statsRes.data.data || statsRes.data;
        const setsData  = setsRes.data;

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
            };
          }

          const usage = stats.usage
            ? typeof stats.usage === "number" ? stats.usage : (stats.usage.weighted || 0)
            : 0;

          pokemonDB[cleanName].allRanks.push({
            tier:       tier,
            rank:       index + 1,
            usage:      (usage * 100).toFixed(2),
            strategies: parseSets(smogonName, stats, setsData),
          });
        });
        console.log(`  ✅ ${tier.toUpperCase()} done`);
      } catch (e) {
        console.log(`  ⚠️  ${tier.toUpperCase()} skipped — ${e.message}`);
      }
    }));

    // Mark untiered Pokémon
    Object.values(pokemonDB).forEach((p) => {
      if (p.allRanks.length === 0) {
        p.allRanks.push({ tier: "Untiered", rank: "N/A", usage: "0.00", strategies: [] });
      }
    });
    console.log(`✅ Phase 2 done`);

    // ─────────────────────────────────────────────────────────────
    // PHASE 3 — Enrich with PokéAPI data
    // For forms with a specific PokéAPI slug (e.g. ursaluna-bloodmoon),
    // fetch that form endpoint instead of the base dex number.
    // ─────────────────────────────────────────────────────────────
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
        // For form slugs, species is always fetched by dex number
        const [pokemonRes, speciesRes] = await Promise.all([
          axios.get(`https://pokeapi.co/api/v2/pokemon/${pokemonKey}`),
          axios.get(`https://pokeapi.co/api/v2/pokemon-species/${dexNumber}`),
        ]);

        const data    = pokemonRes.data;
        const species = speciesRes.data;

        pokemonDB[cleanName].id          = dexNumber; // keep dex id for sprite consistency
        pokemonDB[cleanName].sprite      = data.sprites.front_default ||
          `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png`;
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

    // ─────────────────────────────────────────────────────────────
    // PHASE 4 — Write output files
    // ─────────────────────────────────────────────────────────────
    console.log("\n💾 PHASE 4: Writing output files...");
    fs.writeFileSync("localDB.json", JSON.stringify(pokemonDB, null, 2));
    console.log("  ✅ localDB.json saved");

    fs.writeFileSync("localDB.js", `window.localDB = ${JSON.stringify(pokemonDB, null, 2)};`);
    console.log("  ✅ localDB.js saved");

    console.log("\n🎉 BUILD COMPLETE!");

  } catch (error) {
    console.error("❌ FATAL ERROR:", error.message);
  }
}

buildDatabase();
