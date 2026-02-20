// --- ABILITY IMMUNITIES MAP ---
// (TYPE_CHART_DATA is defined in typeEffectiveness.js and exposed as window.TYPE_CHART_DATA)
// Bug fix #9: removed the duplicate TYPE_CHART constant that lived here.
// getWeaknesses() and getImmunities() now read from window.TYPE_CHART_DATA so there
// is a single source of truth for type matchups shared by the modal, teamBuilder, and
// the interactive type-chart tab.

const ABILITY_IMMUNITIES = {
  levitate:          { type: "ground",   label: "Ground (Levitate)" },
  "flash-fire":      { type: "fire",     label: "Fire (Flash Fire)" },
  "water-absorb":    { type: "water",    label: "Water (Water Absorb)" },
  "dry-skin":        { type: "water",    label: "Water (Dry Skin)" },
  "volt-absorb":     { type: "electric", label: "Electric (Volt Absorb)" },
  "motor-drive":     { type: "electric", label: "Electric (Motor Drive)" },
  "lightning-rod":   { type: "electric", label: "Electric (Lightning Rod)" },
  "sap-sipper":      { type: "grass",    label: "Grass (Sap Sipper)" },
  "earth-eater":     { type: "ground",   label: "Ground (Earth Eater)" },
  "well-baked-body": { type: "fire",     label: "Fire (Well-Baked Body)" },
  "wind-rider":      { type: "flying",   label: "Flying (Wind Rider)" },
  soundproof:        { type: "sound",    label: "Sound moves (Soundproof)" },
  bulletproof:       { type: "bullet",   label: "Ball/Bomb moves (Bulletproof)" },
};

// Bug fix #9: derive weaknesses from window.TYPE_CHART_DATA (weaknesses/resistances/immunities
// format) instead of the old local TYPE_CHART (attacker-keyed multiplier format).
// Falls back gracefully if TYPE_CHART_DATA is not yet loaded.
function getWeaknesses(types) {
  const TC = window.TYPE_CHART_DATA;
  if (!TC) return {};

  const multipliers = {};

  // For every possible attacking type, compute the combined multiplier
  // against this Pokémon's type combination.
  Object.keys(TC).forEach(attacker => {
    let mult = 1;
    types.forEach(defender => {
      const data = TC[defender];
      if (!data) return;
      if (data.immunities && data.immunities.includes(attacker))  { mult *= 0; }
      else if (data.weaknesses  && data.weaknesses.includes(attacker))  { mult *= 2; }
      else if (data.resistances && data.resistances.includes(attacker)) { mult *= 0.5; }
    });
    if (mult > 1) multipliers[attacker] = mult;
  });

  return multipliers;
}

function getImmunities(types, abilities) {
  const TC = window.TYPE_CHART_DATA;
  const immunities = [];

  if (TC) {
    // Derive type-based immunities directly from TYPE_CHART_DATA
    Object.keys(TC).forEach(attacker => {
      let mult = 1;
      types.forEach(defender => {
        const data = TC[defender];
        if (!data) return;
        if (data.immunities && data.immunities.includes(attacker)) mult *= 0;
      });
      if (mult === 0 && !immunities.find(i => i.type === attacker)) {
        immunities.push({ type: attacker, label: attacker, source: "typing" });
      }
    });
  }

  (abilities || []).forEach(a => {
    const ab = ABILITY_IMMUNITIES[a.name];
    if (ab && !immunities.find(i => i.type === ab.type)) {
      immunities.push({ type: ab.type, label: ab.label, source: "ability", isHidden: a.isHidden });
    }
  });

  return immunities;
}
