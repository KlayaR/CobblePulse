// --- TOOLTIP ENGINE ---
const tooltipCache = {};
const tooltip = document.getElementById("tooltip");
const ttContent = document.getElementById("tt-content");

const DMG_CLASS_HTML = {
  physical: `<span class="tt-dmg-class tt-dmg-physical"></span>`,
  special:  `<span class="tt-dmg-class tt-dmg-special"></span>`,
  status:   `<span class="tt-dmg-class tt-dmg-status"></span>`,
};

function showTooltip(e, html) {
  ttContent.innerHTML = html;
  tooltip.classList.add("visible");
  moveTooltip(e);
}

function moveTooltip(e) {
  const x = e.clientX + 16;
  const y = e.clientY + 16;
  const w = tooltip.offsetWidth;
  const h = tooltip.offsetHeight;
  tooltip.style.left = (x + w > window.innerWidth  ? e.clientX - w - 16 : x) + "px";
  tooltip.style.top  = (y + h > window.innerHeight ? e.clientY - h - 16 : y) + "px";
}

function hideTooltip() {
  tooltip.classList.remove("visible");
}

async function fetchTooltip(type, slug) {
  const key = `${type}:${slug}`;
  if (tooltipCache[key]) return tooltipCache[key];

  try {
    const apiSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let html = "";

    if (type === "ability") {
      const res = await fetch(`https://pokeapi.co/api/v2/ability/${apiSlug}`);
      const data = await res.json();
      const entry = data.effect_entries?.find((e) => e.language.name === "en");
      const short = data.flavor_text_entries?.find((e) => e.language.name === "en");
      const desc = entry?.short_effect || short?.flavor_text || "No description available.";
      html = `<div class="tt-name">${data.name.replace(/-/g, " ")}</div><div class="tt-desc">${desc}</div>`;

    } else if (type === "move") {
      const res = await fetch(`https://pokeapi.co/api/v2/move/${apiSlug}`);
      const data = await res.json();
      const entry = data.flavor_text_entries?.find((e) => e.language.name === "en");
      const desc = entry?.flavor_text?.replace(/\f/g, " ") || "No description available.";
      const typeName = data.type?.name || "";
      const dmgClass = data.damage_class?.name || "";
      const typeTag = typeName ? `<span class="type-badge type-${typeName}" style="margin:0;font-size:0.65rem;padding:1px 6px;">${typeName}</span>` : "";
      const dmgTag  = DMG_CLASS_HTML[dmgClass] || "";
      const power = data.power    ? `<span class="tt-stat">PWR ${data.power}</span>` : "";
      const acc   = data.accuracy ? `<span class="tt-stat">ACC ${data.accuracy}%</span>` : "";
      const pp    = data.pp       ? `<span class="tt-stat">PP ${data.pp}</span>` : "";
      html = `<div class="tt-name">${data.name.replace(/-/g, " ")}</div><div class="tt-desc">${desc}</div><div class="tt-meta">${typeTag}${dmgTag}${power}${acc}${pp}</div>`;

    } else if (type === "nature") {
      const res = await fetch(`https://pokeapi.co/api/v2/nature/${apiSlug}`);
      const data = await res.json();
      const up   = data.increased_stat?.name?.replace(/-/g, " ");
      const down = data.decreased_stat?.name?.replace(/-/g, " ");
      const desc = up && down
        ? `<span style="color:#6dff8a;">▲ ${up}</span> &nbsp; <span style="color:#ff6b6b;">▼ ${down}</span>`
        : `Neutral — no stat changes.`;
      html = `<div class="tt-name">${data.name} Nature</div><div class="tt-desc" style="font-size:0.82rem;">${desc}</div>`;

    } else if (type === "item") {
      const res = await fetch(`https://pokeapi.co/api/v2/item/${apiSlug}`);
      const data = await res.json();
      const entry  = data.effect_entries?.find((e) => e.language.name === "en");
      const flavor = data.flavor_text_entries?.find((e) => e.language.name === "en");
      const desc   = entry?.short_effect || flavor?.text || "No description available.";
      const sprite = data.sprites?.default ? `<img src="${data.sprites.default}" style="width:28px;height:28px;image-rendering:pixelated;float:right;margin-left:8px;">` : "";
      html = `<div class="tt-name">${sprite}${data.name.replace(/-/g, " ")}</div><div class="tt-desc">${desc}</div>`;
    }

    tooltipCache[key] = html;
    return html;
  } catch (err) {
    return `<div class="tt-name">${slug}</div><div class="tt-desc">Could not load description.</div>`;
  }
}

async function handleTooltipHover(e, type, slug) {
  const html = await fetchTooltip(type, slug);
  if (html) showTooltip(e, html);
}

// Reposition on mouse move
document.addEventListener("mousemove", (e) => {
  if (tooltip.classList.contains("visible")) moveTooltip(e);
});
