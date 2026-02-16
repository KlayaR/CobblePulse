const fs = require("fs");
const axios = require("axios");

// --- CONFIGURATION ---
const SPREADSHEET_CSV_URL =
  "https://raw.githubusercontent.com/KlayaR/CobblePulse/main/spawns.csv";

const smogonToPokeApiMap = {
  meowscarada: "meowscarada",
  "iron-valiant": "iron-valiant",
  "roaring-moon": "roaring-moon",
  "great-tusk": "great-tusk",
  "walking-wake": "walking-wake",
  "iron-leaves": "iron-leaves",
};

let pokemonDB = {};

/**
 * HELPER: BULLETPROOF CSV PARSER
 * This safely handles commas inside quotes (e.g. "Oak Forest, Birch Forest")
 */
function parseCSV(text) {
  // Auto-detect the delimiter by checking the first line
  const firstLine = text.split("\n")[0];
  const delimiter =
    firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";

  let result = [],
    row = [],
    inQuotes = false,
    val = "";

  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        val += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        val += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        // Clean up newlines inside cells to be neat comma lists
        row.push(val.trim().replace(/\n|\r/g, ", "));
        val = "";
      } else if (char === "\n" || char === "\r") {
        row.push(val.trim().replace(/\n|\r/g, ", "));
        result.push(row);
        row = [];
        val = "";
        if (char === "\r" && text[i + 1] === "\n") i++; // Handle Windows line breaks
      } else {
        val += char;
      }
    }
  }
  if (val || text[text.length - 1] === delimiter)
    row.push(val.trim().replace(/\n|\r/g, ", "));
  if (row.length > 0) result.push(row);
  return result;
}

/**
 * STRATEGY PARSER
 * Extracts abilities, items, and moves from Smogon tier data
 */
function parseSets(name, stats, setsData) {
  const variants = [name, name.replace("-", " "), name.split("-")[0]];
  let sets = null;
  for (const v of variants) {
    if (setsData[v]) {
      sets = setsData[v];
      break;
    }
  }
  if (!sets) return [];

  return Object.entries(sets).map(([setName, details]) => {
    let rawAbility =
      details.abilities ||
      details.ability ||
      details.Abilities ||
      details.Ability;
    if (!rawAbility || rawAbility === "Any") {
      rawAbility =
        Object.keys(stats.abilities || {}).sort(
          (a, b) => stats.abilities[b] - stats.abilities[a],
        )[0] || "Any";
    }
    return {
      name: setName,
      ability: Array.isArray(rawAbility)
        ? rawAbility.join(" / ")
        : typeof rawAbility === "object"
          ? Object.values(rawAbility).join(" / ")
          : rawAbility,
      item: (Array.isArray(details.item)
        ? details.item.join(" / ")
        : String(details.item || "None")
      )
        .split(",")
        .join(" / "),
      nature: Array.isArray(details.nature || details.natures)
        ? (details.nature || details.natures).join(" / ")
        : details.nature || "Hardy",
      teraType: Array.isArray(details.teratypes || details.teraType)
        ? (details.teratypes || details.teraType).join(" / ")
        : details.teraType || "Normal",
      evs:
        Object.entries(details.evs || {})
          .map(([s, v]) => `${v} ${s.toUpperCase()}`)
          .join(" / ") || "None",
      moves: (details.moves || [])
        .map((m) => (Array.isArray(m) ? m.join(" / ") : m))
        .slice(0, 4),
    };
  });
}

/**
 * MAIN BUILD ENGINE
 */
async function buildDatabase() {
  console.log("🚀 STARTING FINAL CONSOLIDATED BUILD...");
  try {
    // 1. Process Spreadsheet Spawns
    console.log("🔍 Fetching and parsing spawns.csv...");
    const spreadsheetRes = await axios.get(SPREADSHEET_CSV_URL);
    const rows = parseCSV(spreadsheetRes.data);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length < 5 || !row[1]) continue;

      const nameRaw = row[1];
      const cleanName = nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
      const spawn = row[3] || "Unknown";
      const rarity = row[4] || "Standard";
      const condition = row[5] || "";
      const forms = row[6] || "";

      if (!pokemonDB[cleanName]) {
        pokemonDB[cleanName] = { name: nameRaw, locations: [], allRanks: [] };
      }

      pokemonDB[cleanName].locations.push({
        spawn: spawn,
        rarity: rarity,
        condition: condition,
        forms: forms,
      });
    }
    console.log(
      `✅ Processed spreadsheet spawns for ${Object.keys(pokemonDB).length} Pokémon!`,
    );

    // 2. Enrich with Smogon Competitive Data
    const tiers = ["ubers", "ou", "uu", "ru", "lc"];
    for (const tier of tiers) {
      console.log(`📦 ENRICHING TIER: ${tier.toUpperCase()}`);
      try {
        const statsRes = await axios.get(
          `https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`,
        );
        const setsRes = await axios.get(
          `https://pkmn.github.io/smogon/data/sets/gen9${tier}.json`,
        );
        const statsData =
          statsRes.data.pokemon || statsRes.data.data || statsRes.data;
        const setsData = setsRes.data;

        Object.entries(statsData).forEach(([smogonName, stats], index) => {
          let cleanName = smogonName.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (smogonToPokeApiMap[cleanName])
            cleanName = smogonToPokeApiMap[cleanName];

          if (!pokemonDB[cleanName]) {
            pokemonDB[cleanName] = {
              name: smogonName,
              locations: [],
              allRanks: [],
            };
          }

          const usage = stats.usage
            ? typeof stats.usage === "number"
              ? stats.usage
              : stats.usage.weighted || 0
            : 0;
          pokemonDB[cleanName].allRanks.push({
            tier: tier,
            rank: index + 1,
            usage: (usage * 100).toFixed(2),
            strategies: parseSets(smogonName, stats, setsData),
          });
        });
      } catch (e) {
        /* Skip missing tiers */
      }
    }

    // 3. Final Fallback for Untiered Pokémon (like Charmander)
    Object.values(pokemonDB).forEach((p) => {
      if (p.allRanks.length === 0) {
        p.allRanks.push({
          tier: "Untiered",
          rank: "N/A",
          usage: "0.00",
          strategies: [
            {
              name: "Standard",
              ability: "Any",
              item: "Leftovers",
              nature: "Any",
              teraType: "Normal",
              evs: "N/A",
              moves: ["Tackle"],
            },
          ],
        });
      }
    });

    // 4. Save to localDB.json
    fs.writeFileSync("localDB.json", JSON.stringify(pokemonDB, null, 2));
    console.log("✅ DONE! localDB.json is fixed and complete.");
  } catch (error) {
    console.error("❌ ERROR:", error.message);
  }
}

buildDatabase();
