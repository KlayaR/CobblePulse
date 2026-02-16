const fs = require("fs");

const smogonToPokeApiMap = {
  meowscarada: "meowscarada",
  "iron-valiant": "iron-valiant",
  "roaring-moon": "roaring-moon",
};

const pokemonDB = {};

async function buildDatabase() {
  console.log("🚀 STARTING DEEP-SCAN BUILD...");
  try {
    await processSmogonTiers();
    fs.writeFileSync("localDB.json", JSON.stringify(pokemonDB, null, 2));
    console.log("✅ DONE! Check localDB.json now.");
  } catch (error) {
    console.error("❌ CRITICAL ERROR:", error);
  }
}

async function processSmogonTiers() {
  const tiers = ["ubers", "ou", "uu", "ru"];

  for (const tier of tiers) {
    console.log(`\n📦 PROCESSING TIER: ${tier.toUpperCase()}`);

    const statsRes = await fetch(
      `https://pkmn.github.io/smogon/data/stats/gen9${tier}.json`,
    );
    const setsRes = await fetch(
      `https://pkmn.github.io/smogon/data/sets/gen9${tier}.json`,
    );

    if (!statsRes.ok || !setsRes.ok) {
      console.log(`⚠️  Skipping ${tier} - API not responding.`);
      continue;
    }

    const statsData = await statsRes.json();
    const setsData = await setsRes.json();
    const pokemonStats = statsData.pokemon || statsData.data || statsData;

    Object.entries(pokemonStats).forEach(([smogonName, stats], index) => {
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

      let strategies = [];
      // Look for the Pokemon in the sets data (handling name variations)
      const curatedSets =
        setsData[smogonName] || setsData[smogonName.replace("-", " ")] || {};

      if (Object.keys(curatedSets).length > 0) {
        for (const [setName, setDetails] of Object.entries(curatedSets)) {
          // --- BRUTE FORCE ABILITY DETECTION ---
          // We check every possible variation Smogon uses
          let rawAbility =
            setDetails.abilities ||
            setDetails.ability ||
            setDetails.Abilities ||
            setDetails.Ability ||
            "Any";

          // Smogon often stores abilities as an array: ["Multiscale"]
          // Or an object: { "0": "Multiscale" }
          let abilityValue = "Any";
          if (Array.isArray(rawAbility)) {
            abilityValue = rawAbility.join(" / ");
          } else if (typeof rawAbility === "object" && rawAbility !== null) {
            abilityValue = Object.values(rawAbility).join(" / ");
          } else {
            abilityValue = rawAbility;
          }

          // --- BRUTE FORCE TERA DETECTION ---
          let rawTera =
            setDetails.teratypes ||
            setDetails.teraTypes ||
            setDetails.teraType ||
            "Normal";
          let teraValue = Array.isArray(rawTera)
            ? rawTera.join(" / ")
            : rawTera;

          // --- BRUTE FORCE NATURE DETECTION ---
          let rawNature = setDetails.natures || setDetails.nature || "Hardy";
          let natureValue = Array.isArray(rawNature)
            ? rawNature.join(" / ")
            : rawNature;

          // --- MOVES & EVs ---
          const parsedMoves = (setDetails.moves || [])
            .map((m) => (Array.isArray(m) ? m.join(" / ") : m))
            .slice(0, 4);
          const evs = setDetails.evs || {};
          const evString =
            Object.entries(evs)
              .map(([s, v]) => `${v} ${s.toUpperCase()}`)
              .join(" / ") || "None";

          strategies.push({
            name: setName,
            ability: abilityValue,
            item: setDetails.item || "Leftovers",
            nature: natureValue,
            teraType: teraValue,
            evs: evString,
            moves: parsedMoves,
          });
        }
      }

      // Fallback for Usage Stats
      const usage = stats.usage
        ? typeof stats.usage === "number"
          ? stats.usage
          : stats.usage.weighted || 0
        : 0;

      pokemonDB[cleanName].allRanks.push({
        tier: tier,
        rank: index + 1,
        usage: (usage * 100).toFixed(2),
        strategies:
          strategies.length > 0
            ? strategies
            : [
                {
                  name: "Standard Usage",
                  ability: "Check Stats",
                  item: "Multiple",
                  nature: "Various",
                  teraType: "Normal",
                  evs: "Standard",
                  moves: [],
                },
              ],
      });
    });
  }
}

buildDatabase();
