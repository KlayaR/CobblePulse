# CobblePulse 🎮

Your complete guide to **Cobblemon** — a Minecraft mod bringing Pokémon into your world. Find spawn locations, competitive tier rankings, and battle strategies for every Pokémon.

## Features

✨ **Complete Pokédex** - All Cobblemon Pokémon with detailed information  
🗺️ **Spawn Locations** - Server-specific spawn data from Cobbleverse  
🏆 **Competitive Tiers** - Rankings from Smogon University (Ubers, OU, UU, RU, NU, PU, LC)  
⚔️ **Battle Strategies** - Movesets, EVs, natures, and abilities for competitive play  
🔍 **Smart Search** - Fuzzy search with typo tolerance, filter by type, ability, move, stats  
⭐ **Favorites System** - Save your favorite Pokémon for quick access  
📱 **Mobile Responsive** - Optimized for all devices  

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3 with glassmorphism design
- **Data Sources**: [Cobbleverse](https://www.lumyverse.com/cobbleverse/), [Smogon](https://www.smogon.com/), [PokéAPI](https://pokeapi.co/)
- **Build System**: Node.js compiler with intelligent strategy deduplication
- **CI/CD**: GitHub Actions for automated database compilation

## Development

### Project Structure

```
CobblePulse/
├── data/                  # Source JSON data files
│   ├── cobbleverse/       # Spawn location data
│   └── smogon/           # Competitive strategy data
├── scripts/              # Frontend JavaScript
│   ├── main.js           # App initialization & state
│   ├── modal.js          # Pokémon detail modals
│   ├── filters.js        # Search & filtering logic
│   ├── typeChart.js      # Type effectiveness data
│   └── tooltip.js        # Interactive tooltips
├── styles/
│   └── main.css          # Complete styling (25KB)
├── .github/workflows/
│   └── build.yml         # Auto-compile on data changes
├── compiler.js           # Compiles JSON → localDB.js
├── localDB.js            # Generated database (git-ignored)
└── index.html            # Single-page application
```

### Build Process

The `compiler.js` script:
1. Reads all JSON files from `data/`
2. Deduplicates strategies across tiers (single source of truth)
3. Calculates tier rankings based on usage stats
4. Adds build timestamp metadata
5. Outputs `localDB.js` in optimized format

The build runs automatically via GitHub Actions whenever:
- Files in `data/**` are modified
- `compiler.js` is updated
- Manually triggered via Actions tab

### Local Development

```bash
# Clone the repository
git clone https://github.com/KlayaR/CobblePulse.git
cd CobblePulse

# Run the compiler to generate localDB.js
node compiler.js

# Serve locally (any HTTP server works)
python -m http.server 8000
# or
npx serve
```

Then open `http://localhost:8000` in your browser.

### Adding New Data

1. Add JSON files to `data/cobbleverse/` or `data/smogon/`
2. Commit and push to main branch
3. GitHub Actions automatically compiles and commits `localDB.js`

## Search Syntax

CobblePulse supports advanced search queries:

- **By name**: `pikachu` or `#25` (dex number)
- **By type**: `type:fire` or `type:water`
- **By ability**: `ability:levitate`
- **By move**: `move:earthquake`
- **By tier**: `tier:ou`
- **By stat**: `speed>100`, `atk>=120`, `hp<80`
- **Fuzzy matching**: Typos within 2 characters still work (e.g., `pikachoo` finds Pikachu)

## Architecture Highlights

### Performance Optimizations
- **PokeAPI caching**: Each Pokémon's data fetched once per session
- **Stale request guard**: Prevents race conditions when rapidly clicking Pokémon
- **Parallel API calls**: Species + evolution data fetched simultaneously
- **Lazy loading**: Images loaded on-demand
- **Loading skeleton**: Smooth UX while data loads

### Code Quality
- **Zero inline styles**: All styling extracted to CSS classes
- **Mobile-first responsive**: Breakpoints at 768px and 480px
- **Glassmorphism design**: Modern frosted-glass aesthetic
- **Accessibility**: Semantic HTML, keyboard navigation support

## Data Attribution

- **Spawn Data**: [Cobbleverse](https://www.lumyverse.com/cobbleverse/)
- **Competitive Data**: [Smogon University](https://www.smogon.com/)
- **Pokémon Info**: [PokéAPI](https://pokeapi.co/)
- **Cobblemon Mod**: [Cobblemon Official](https://cobblemon.com/)

## Contributing

Contributions welcome! Areas for improvement:
- Adding more server spawn data
- Updating Smogon strategies for new metas
- UI/UX enhancements
- Mobile optimization
- Additional search filters

## License

This project is for educational and community use. All Pokémon-related content is property of Nintendo/Game Freak/Creatures Inc.

---

**Last Build**: Auto-updated on every data change via GitHub Actions
