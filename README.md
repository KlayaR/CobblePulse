Here is a professional, high-quality `README.md` file for your GitHub repository. It’s designed using clean Markdown, emojis for visual flair, and a clear structure to show off the technical depth of **CobblePulse**.

---

# 🌌 CobblePulse

### *The Ultimate Competitive & Exploration Intelligence Bridge for Cobblemon*

**CobblePulse** is a high-performance, single-page web application designed for the modern Cobblemon trainer. It bridges the gap between high-level competitive strategy and immersive world exploration by fusing **Smogon’s** monthly meta-analysis with **Cobbleverse** spawn data.

---

## 🚀 The Vision

CobblePulse is built on a "Hybrid Intelligence" architecture. It doesn't just list Pokémon; it provides a living synchronization of the meta:

* **The Strategic Pulse:** Monthly-synced Smogon rankings, usage stats, and "Best-in-Slot" competitive sets (Moves, Abilities, Natures, EVs).
* **The Exploration Pulse:** Human-readable spawn instructions including biomes, rarity, and specific environmental conditions.
* **The Ancestral Pulse:** Intelligent evolution-chain tracing that highlights the easiest path to a target by displaying base-form spawn data.

---

## ✨ Key Features

* 💎 **Glassmorphism UI:** A sleek, dark-mode interface with frosted glass aesthetics and responsive design.
* 📊 **Live Competitive Tabs:** One-click filtering for **Ubers, OU, UU, and RU**, strictly capped at the Top 30 most-used Pokémon.
* 🔍 **Smart Search:** Debounced global search across 1,025+ species with type-specific filtering.
* 📍 **Deep Spawn Data:** Integrated location tracking that shows Biomes, Time, Rarity, and specific spawning conditions.
* 🔗 **Direct Research:** Deep links to **PokémonDB** for every species to view breeding groups and full movepools.
* 🤖 **Automated Sync:** Powered by GitHub Actions to update Smogon rankings and sets on the 1st of every month automatically.

---

## 🛠️ Technical Stack

* **Frontend:** HTML5, CSS3 (Custom Properties & Grid), Vanilla JavaScript (ES6+).
* **Data Sources:** [PokeAPI](https://pokeapi.co/), [Smogon Statistics](https://www.google.com/search?q=https://pkmn.github.io/smogon/), and Custom Server Spreadsheets.
* **Automation:** Node.js (Compiler script) & GitHub Actions (Monthly Cron).

---

## 📂 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CobblePulse.git
cd CobblePulse

```

### 2. Update Spawns

Edit `spawns.csv` with your server-specific biome and rarity data.

### 3. Run the Compiler

Ensure you have [Node.js](https://nodejs.org/) installed, then run the compiler to merge your spreadsheet with the latest Smogon data:

```bash
node compiler.js

```

### 4. Deploy

Simply push your changes to GitHub and enable **GitHub Pages** in the repository settings to go live!

---

## 🤖 Automation Logic

CobblePulse stays ahead of the meta without manual intervention. The included GitHub Action handles the heavy lifting:

1. **Trigger:** Midnight on the 1st of every month.
2. **Process:** Runs `compiler.js` on an Ubuntu runner.
3. **Result:** Fetches fresh usage %, sorts by rank, and updates `cobbleverse_data.json`.

---

## 📜 Credits

* **Core Mod:** [Cobblemon](https://cobblemon.com/)
* **Base Data:** [PokeAPI](https://pokeapi.co/)
* **Competitive Sets:** [Smogon](https://www.smogon.com/) / [Showdown](https://pokemonshowdown.com/)
* **Icons & Sprites:** [GitHub/PokeAPI Sprites](https://github.com/PokeAPI/sprites)
* **Spawn Data:** [Cobbleverse](https://www.lumyverse.com/cobbleverse/all-pokemon-in-cobbleverse/))

---
