const fs = require("fs");
const path = require("path");

const CSV_FILE = path.join(__dirname, "spawns.csv");
const OUTPUT_FILE = path.join(__dirname, "cobbleverse_data.json");

const pokemonDB = {};

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
 * Step 1: Parse the Spreadsheet (CSV)
 */
function processSpreadsheet() {
  console.log("🔍 Reading spawns.csv spreadsheet...");

  if (!fs.existsSync(CSV_FILE)) {
    console.error(
      `❌ Could not find: ${CSV_FILE}. Please make sure you exported your spreadsheet as spawns.csv!`,
    );
    process.exit(1);
  }

  const rawCSV = fs.readFileSync(CSV_FILE, "utf-8");
  const rows = parseCSV(rawCSV);

  // Assuming row 0 is headers. We map through the data rows.
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 5 || !row[1]) continue;

    const nameRaw = row[1];
    const cleanName = nameRaw.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Mapping based on your spreadsheet columns
    const source = row[2] || "Base"; // Index 2 is SOURCE
    const spawn = row[3] || "Unknown";
    const rarity = row[4] || "Standard";
    const condition = row[5] || "";
    const forms = row[6] || "";

    if (!pokemonDB[cleanName]) {
      pokemonDB[cleanName] = {
        name: nameRaw,
        source: source, // Save the source here
        locations: [],
      };
    }

    pokemonDB[cleanName].locations.push({ spawn, rarity, condition, forms });
  }

  console.log(
    `✅ Processed spreadsheet spawns for ${Object.keys(pokemonDB).length} Pokémon!`,
  );
}

/**
 * Step 2: Fetch Smogon Data & Competitive Stats (Unchanged)
 */
async function processSmogonTiers() {
  console.log("🌐 Fetching base Smogon tiers...");
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/formats-data.ts",
    );
    const text = await response.text();
    const tierRegex = /([a-z0-9]+):\s*\{\s*tier:\s*"([^"]+)"/gi;
    let match;
    while ((match = tierRegex.exec(text)) !== null) {
      const name = match[1];
      const tier = match[2];
      if (pokemonDB[name]) pokemonDB[name].tier = tier;
      else
        pokemonDB[name] = {
          name: name.charAt(0).toUpperCase() + name.slice(1),
          tier: tier,
          locations: [],
        };
    }
  } catch (error) {
    console.error("❌ Failed base Smogon data:", error);
  }

  console.log("📈 Fetching Full Competitive Dataset...");
  // We fetch Gen 9 OU stats as the "Base" for everyone, as it contains the most comprehensive data
  // Then we fetch specific tiers to ensure Top 30 rankings are accurate.
  const datasets = ["ubers", "ou", "uu", "ru"];

  for (const tier of datasets) {
    try {
      const res = await fetch(
        `https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`,
      );
      if (!res.ok) continue;
      const data = await res.json();
      const pokemonStats = data.pokemon || data.data || data;

      const getUsage = (stats) => {
        if (!stats || !stats.usage) return 0;
        if (typeof stats.usage === "number") return stats.usage;
        return stats.usage.weighted || stats.usage.real || stats.usage.raw || 0;
      };

      Object.entries(pokemonStats).forEach(([name, stats], index) => {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, "");

        // If the Pokemon doesn't exist yet, we add it
        if (!pokemonDB[cleanName]) {
          pokemonDB[cleanName] = {
            name: name,
            locations: [],
            tier: "Untiered",
          };
        }

        // Only overwrite competitive data if it doesn't exist
        // OR if the current tier being processed is the Pokemon's native tier
        const currentTier = pokemonDB[cleanName].tier?.toLowerCase();
        if (!pokemonDB[cleanName].competitive || currentTier === tier) {
          const bestAbility =
            Object.keys(stats.abilities || {}).sort(
              (a, b) => stats.abilities[b] - stats.abilities[a],
            )[0] || "Unknown";
          const moves = Object.keys(stats.moves || {})
            .filter((m) => m !== "" && m !== "Nothing")
            .sort((a, b) => stats.moves[b] - stats.moves[a])
            .slice(0, 4);
          let bestNature = "Hardy",
            bestEVs = "252 HP / 252 Atk";
          const bestSpreadKey = Object.keys(stats.spreads || {}).sort(
            (a, b) => stats.spreads[b] - stats.spreads[a],
          )[0];

          if (bestSpreadKey) {
            const parts = bestSpreadKey.split(":");
            bestNature = parts[0];
            if (parts[1]) {
              const evParts = parts[1].split("/");
              const statsOrder = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"];
              bestEVs =
                evParts
                  .map((val, idx) =>
                    val > 0 ? `${val} ${statsOrder[idx]}` : null,
                  )
                  .filter(Boolean)
                  .join(" / ") || "None";
            }
          }

          pokemonDB[cleanName].competitive = {
            usage: (getUsage(stats) * 100).toFixed(2),
            ability: bestAbility,
            nature: bestNature,
            evs: bestEVs,
            moves: moves,
          };

          // Assign Rank ONLY for the Top 30 of that tier
          if (index < 30) {
            pokemonDB[cleanName].rank = index + 1;
          }
        }
      });
    } catch (e) {
      console.error(`❌ Error parsing ${tier}:`, e.message);
    }
  }
}
async function buildDatabase() {
  processSpreadsheet();
  await processSmogonTiers();
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(pokemonDB, null, 2));
  console.log(`🎉 Success! Master database saved to: ${OUTPUT_FILE}`);
}

buildDatabase();
