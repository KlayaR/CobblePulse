// --- TYPE EFFECTIVENESS CHART ---
const TYPE_CHART = {
  normal:   { ghost: 0, fighting: 2 },
  fire:     { fire: 0.5, water: 2, grass: 0.5, ice: 0.5, ground: 2, rock: 2, bug: 0.5, steel: 0.5, fairy: 0.5 },
  water:    { fire: 0.5, water: 0.5, grass: 2, electric: 2, ice: 0.5, steel: 0.5 },
  grass:    { fire: 2, water: 0.5, grass: 0.5, electric: 0.5, ice: 2, poison: 2, ground: 0.5, flying: 2, bug: 2 },
  electric: { electric: 0.5, ground: 2, flying: 0.5, steel: 0.5 },
  ice:      { fire: 2, water: 1, ice: 0.5, fighting: 2, rock: 2, steel: 2 },
  fighting: { flying: 2, psychic: 2, bug: 0.5, rock: 0.5, dark: 0.5, fairy: 2 },
  poison:   { grass: 0.5, fighting: 0.5, poison: 0.5, ground: 2, psychic: 2, bug: 0.5, fairy: 0.5 },
  ground:   { water: 2, grass: 2, electric: 0, ice: 2, poison: 0.5, rock: 0.5 },
  flying:   { grass: 0.5, electric: 2, fighting: 0.5, ground: 0, ice: 2, bug: 0.5, rock: 2 },
  psychic:  { fighting: 0.5, psychic: 0.5, bug: 2, ghost: 2, dark: 2 },
  bug:      { grass: 0.5, fire: 2, fighting: 0.5, ground: 0.5, flying: 2, rock: 2 },
  rock:     { normal: 0.5, fire: 0.5, water: 2, grass: 2, fighting: 2, poison: 0.5, ground: 2, flying: 0.5, steel: 2 },
  ghost:    { normal: 0, fighting: 0, poison: 0.5, bug: 0.5, ghost: 2, dark: 2 },
  dragon:   { fire: 0.5, water: 0.5, grass: 0.5, electric: 0.5, ice: 2, dragon: 2, fairy: 2 },
  dark:     { fighting: 2, psychic: 0, bug: 2, ghost: 0.5, dark: 0.5, fairy: 2 },
  steel:    { normal: 0.5, grass: 0.5, ice: 0.5, poison: 0, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 0.5, dragon: 0.5, steel: 0.5, fairy: 0.5, fire: 2, fighting: 2, ground: 2 },
  fairy:    { fighting: 0.5, poison: 2, bug: 0.5, dragon: 0, dark: 0.5, steel: 2 },
};

// --- ABILITY IMMUNITIES MAP ---
const ABILITY_IMMUNITIES = {
  levitate:         { type: "ground",   label: "Ground (Levitate)" },
  "flash-fire":     { type: "fire",     label: "Fire (Flash Fire)" },
  "water-absorb":   { type: "water",    label: "Water (Water Absorb)" },
  "dry-skin":       { type: "water",    label: "Water (Dry Skin)" },
  "volt-absorb":    { type: "electric", label: "Electric (Volt Absorb)" },
  "motor-drive":    { type: "electric", label: "Electric (Motor Drive)" },
  "lightning-rod":  { type: "electric", label: "Electric (Lightning Rod)" },
  "sap-sipper":     { type: "grass",    label: "Grass (Sap Sipper)" },
  "earth-eater":    { type: "ground",   label: "Ground (Earth Eater)" },
  "well-baked-body":{ type: "fire",     label: "Fire (Well-Baked Body)" },
  "wind-rider":     { type: "flying",   label: "Flying (Wind Rider)" },
  soundproof:       { type: "sound",    label: "Sound moves (Soundproof)" },
  bulletproof:      { type: "bullet",   label: "Ball/Bomb moves (Bulletproof)" },
};

function getWeaknesses(types) {
  let multipliers = {};
  for (let attacker in TYPE_CHART) {
    let mult = 1;
    types.forEach((defender) => {
      const row = TYPE_CHART[attacker] || {};
      mult *= row[defender] !== undefined ? row[defender] : 1;
    });
    if (mult > 1) multipliers[attacker] = mult;
  }
  return multipliers;
}

function getImmunities(types, abilities) {
  let immunities = [];

  const typeImmunityMap = {
    normal: [], fire: [], water: [], electric: ["ground"], grass: [], ice: [],
    fighting: ["ghost"], poison: [], ground: [], flying: ["ground"], psychic: [],
    bug: [], rock: [], ghost: ["normal", "fighting"], dragon: [], dark: ["psychic"],
    steel: ["poison"], fairy: ["dragon"],
  };

  types.forEach((t) => {
    (typeImmunityMap[t] || []).forEach((immune) => {
      if (!immunities.find((i) => i.type === immune)) {
        immunities.push({ type: immune, label: immune, source: "typing" });
      }
    });
  });

  (abilities || []).forEach((a) => {
    const abilityImmunity = ABILITY_IMMUNITIES[a.name];
    if (abilityImmunity && !immunities.find((i) => i.type === abilityImmunity.type)) {
      immunities.push({ type: abilityImmunity.type, label: abilityImmunity.label, source: "ability", isHidden: a.isHidden });
    }
  });

  return immunities;
}
