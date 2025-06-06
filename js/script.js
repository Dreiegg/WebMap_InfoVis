// Initialize the Leaflet map centered on specified coordinates with zoom level 9
const map = L.map("map").setView([47.3, 12.1], 9);

// Add a legend control in the bottom-left corner
const legend = L.control({ position: "bottomleft" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "info legend");
  const grades = [1, 2, 3, 4, 5]; // Star rating levels
  const labels = grades.map(
    (grade) =>
      `<i style="background:${getColor(grade)}; width: 12px; height: 12px; display: inline-block; margin-right: 6px;"></i> ${grade}`
  );
  div.innerHTML = "<strong>⭐ Rating</strong><br>" + labels.join("<br>");
  div.style.backgroundColor = "var(--sidebar-bg)";
  div.style.padding = "8px";
  div.style.borderRadius = "4px";
  div.style.border = "1px solid var(--sidebar-border)";
  div.style.fontSize = "12px";
  div.style.color = "var(--text-color)";
  return div;
};

legend.addTo(map);

// Add base tile layer using CartoDB dark style
// Copyright (c) 2018, CartoDB Inc. [https://github.com/CartoDB/basemap-styles]

L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>; All rights reserved.',
  maxZoom: 19,
}).addTo(map);

// Storage for ratings and map layers
let ratings = {};
let geojson;
let geojsonLayer;
let markersById = {}; // For quick access to feature markers

// Combine searchable text fields into one lowercase string
function getSearchableText(feature) {
  const props = feature.properties || {};
  const parts = [
    props.name || "",
    props["addr:city"] || "",
    props["addr:street"] || "",
    props["addr:postcode"] || "",
    props["addr:place"] || "",
  ];
  return parts.join(" ").toLowerCase();
}

// Check if all tokens exist in the searchable text
function matchesSearch(feature, tokens) {
  const text = getSearchableText(feature);
  return tokens.every((token) => text.includes(token));
}

// Return color based on rating
function getColor(rating) {
  if (!rating) return "var(--map-bg)";
  const r = Math.min(Math.max(Math.round(rating), 1), 5);
  const gradient = ["#007ba8", "#3f5a6d", "#7f834a", "#bfac27", "#ffd61e"];
  return gradient[r - 1];
}

// Override dietary flags using external rating data
function applyRatingOverrides() {
  geojson.features.forEach((feature) => {
    const id = feature.id;
    const ratingEntry = ratings[id];
    if (!ratingEntry) return;

    if (ratingEntry.diet) {
      const dietValue = ratingEntry.diet.toLowerCase();
      if (dietValue === "vegan") {
        feature.properties["diet:vegan"] = "yes";
        feature.properties["diet:vegetarian"] = "yes";
      } else if (dietValue === "vegetarian") {
        feature.properties["diet:vegetarian"] = "yes";
        if (feature.properties["diet:vegan"]) {
          delete feature.properties["diet:vegan"];
        }
      } else {
        delete feature.properties["diet:vegan"];
        delete feature.properties["diet:vegetarian"];
      }
    }
  });
}

// Draw the GeoJSON features on the map with filtering and styling
function drawGeoJSON(
  onlyRated = false,
  tokens = [],
  onlyVegan = false,
  onlyVegetarian = false,
  preserveId = null
) {
  if (geojsonLayer) {
    geojsonLayer.remove();
    markersById = {};
  }

  // Sort features by rating
  const sortedFeatures = [...geojson.features].sort((a, b) => {
    const ratingA = ratings[a.id]?.rating || 0;
    const ratingB = ratings[b.id]?.rating || 0;
    return ratingA - ratingB;
  });

  geojsonLayer = L.geoJSON(sortedFeatures, {
    // Apply filters
    filter: (feature) => {
      if (feature.id === preserveId) return true;
      const id = feature.id;
      const rating = ratings[id]?.rating;
      if (onlyRated && !rating) return false;
      if (onlyVegan && feature.properties["diet:vegan"] !== "yes") return false;
      if (onlyVegetarian && feature.properties["diet:vegetarian"] !== "yes") return false;
      if (tokens.length > 0 && !matchesSearch(feature, tokens)) return false;
      return true;
    },
    // Style the markers based on rating
    pointToLayer: (feature, latlng) => {
      const id = feature.id;
      const ratingInfo = ratings[id] || {};
      const rating = ratingInfo.rating || 0;
      const zoom = map.getZoom();
      const unratedRadius = 7;
      const ratedMinRadius = 7;
      const ratedMaxRadius = 12;
      const zoomFactor = Math.max(1, 1.5 - (zoom - 10) * 0.1);
      const radius = rating
        ? (ratedMinRadius + ((rating - 1) / 4) * (ratedMaxRadius - ratedMinRadius)) * zoomFactor
        : unratedRadius * zoomFactor;

      return L.circleMarker(latlng, {
        radius: radius,
        fillColor: getColor(rating),
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
      });
    },
    // Attach popup and tooltip to each marker
    onEachFeature: (feature, layer) => {
      const props = feature.properties;
      const id = feature.id;
      const ratingInfo = ratings[id] || {};

      let popup = `<strong>${props.name || "Unnamed"}</strong><br/>`;
      if (props.opening_hours) popup += `🕒 ${props.opening_hours}<br/>`;
      if (props["diet:vegan"] === "yes") {
        popup += `🌱 Vegan friendly<br/>`;
      } else if (props["diet:vegetarian"] === "yes") {
        popup += `🥦 Vegetarian friendly<br/>`;
      }
      if (ratingInfo.rating) popup += `⭐ Rating: ${ratingInfo.rating}<br/>`;
      if (ratingInfo.note) popup += `📝 ${ratingInfo.note}<br/>`;

      popup += `<small style="color:rgb(148, 169, 175);">ID: ${id}</small>`;

      layer.bindPopup(popup);
      layer.bindTooltip(props.name || "Unnamed", {
        direction: "top",
        offset: [0, -8],
        opacity: 0.9,
      });

      markersById[id] = layer;
    },
  }).addTo(map);
}

// Load ratings, then geojson, apply ratings, draw
fetch("data/ratings.json")
  .then((res) => res.json())
  .then((ratingData) => {
    ratingData.forEach((entry) => {
      ratings[entry.id] = {
        rating: entry.rating,
        note: entry.note,
        diet: entry.diet,
      };
    });

    return fetch("data/cafes_bakeries.geojson");
  })
  .then((res) => res.json())
  .then((data) => {
    geojson = data;

    applyRatingOverrides();
    drawGeoJSON(false);
  });

// Preset map location shortcuts
const locations = {
  "Tirol Region": { coords: [47.2682, 11.3926], zoom: 10, region: "tirol" },
  "Salzburg Region": { coords: [47.799, 12.995], zoom: 10, region: "salzburg" },
  "Salzburg City": { coords: [47.8095, 13.055], zoom: 15, region: "salzburg" },
  Hallein: { coords: [47.6819009, 13.0948644], zoom: 15, region: "salzburg" },
  Kufstein: { coords: [47.5833, 12.1667], zoom: 15, region: "tirol" },
  Innsbruck: { coords: [47.2692, 11.4041], zoom: 15, region: "tirol" },
};

// UI setup and search/filter handling
window.addEventListener("DOMContentLoaded", () => {
  const controlsDiv = document.getElementById("controls");
  const extraSpaceDiv = document.getElementById("extra-space");

  // Add search input box
  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.placeholder = "Search cafés and bakeries...";
  searchInput.setAttribute("aria-label", "Search cafés and bakeries");
  searchInput.style.width = "100%";
  searchInput.style.padding = "8px";
  searchInput.style.fontSize = "14px";
  searchInput.style.borderRadius = "4px";
  searchInput.style.border = "1px solid var(--sidebar-border)";
  searchInput.style.backgroundColor = "var(--sidebar-bg)";
  searchInput.style.color = "var(--text-color)";
  searchInput.style.marginBottom = "4px";

  extraSpaceDiv.appendChild(searchInput);

  // Suggestions list below search
  const suggestions = document.createElement("div");
  suggestions.style.position = "relative";
  suggestions.style.zIndex = "999";
  suggestions.style.maxHeight = "200px";
  suggestions.style.overflowY = "auto";
  suggestions.style.backgroundColor = "var(--sidebar-bg)";
  suggestions.style.border = "1px solid var(--sidebar-border)";
  suggestions.style.borderTop = "none";
  suggestions.style.borderRadius = "0 0 4px 4px";
  suggestions.style.display = "none";
  extraSpaceDiv.appendChild(suggestions);

  // Helper to create filter checkboxes
  function createFilterCheckbox(id, emoji, labelText) {
    const label = document.createElement("label");
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "6px";
    label.style.margin = "6px 0";
    label.style.fontSize = "14px";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;

    const text = document.createTextNode(`${emoji} ${labelText}`);

    label.appendChild(checkbox);
    label.appendChild(text);
    extraSpaceDiv.appendChild(label);

    return checkbox;
  }

  // Rating/diet filter controls
  const checkbox = createFilterCheckbox("filterRated", "⭐", "Only show rated");
  const veganCheckbox = createFilterCheckbox("filterVegan", "🌱", "Only show vegan");
  const vegetarianCheckbox = createFilterCheckbox("filterVegetarian", "🥦", "Only show vegetarian");

  // Group locations by region for navigation
  const groupedLocations = { salzburg: [], tirol: [] };
  for (const [name, loc] of Object.entries(locations)) {
    groupedLocations[loc.region].push({ name, ...loc });
  }

  // Build location buttons dynamically
  Object.entries(groupedLocations).forEach(([region, locs]) => {
    const regionContainer = document.createElement("div");
    regionContainer.style.marginBottom = "15px";

    const regionColor = region === "tirol" ? "var(--purple-color)" : "var(--blue-color)";
    const childColor = region === "tirol" ? "var(--purple-child-color)" : "var(--blue-child-color)";

    const mainRegion = locs.find((l) => l.name.toLowerCase().includes("region"));
    if (mainRegion) {
      const btnRegion = document.createElement("button");
      btnRegion.textContent = mainRegion.name;
      btnRegion.classList.add("region-button");
      btnRegion.style.backgroundColor = regionColor;
      btnRegion.addEventListener("click", () => {
        map.setView(mainRegion.coords, mainRegion.zoom);
      });
      regionContainer.appendChild(btnRegion);
    }

    locs
      .filter((l) => l !== mainRegion)
      .forEach((loc) => {
        const btn = document.createElement("button");
        btn.textContent = loc.name;
        btn.classList.add("region-button", "subregion");
        btn.style.backgroundColor = childColor;
        btn.addEventListener("click", () => {
          map.setView(loc.coords, loc.zoom);
        });
        regionContainer.appendChild(btn);
      });

    controlsDiv.appendChild(regionContainer);
  });

  // Autocomplete suggestions logic
  function updateSuggestions(tokens, onlyRated, onlyVegan, onlyVegetarian) {
    suggestions.innerHTML = "";

    if (tokens.length === 0) {
      suggestions.style.display = "none";
      return;
    }

    const matches = geojson.features
      .filter((feature) => {
        const rating = ratings[feature.id]?.rating;
        if (onlyRated && !rating) return false;
        if (onlyVegan && feature.properties["diet:vegan"] !== "yes") return false;
        if (onlyVegetarian && feature.properties["diet:vegetarian"] !== "yes") return false;
        return matchesSearch(feature, tokens);
      })
      .slice(0, 10);

    if (matches.length === 0) {
      suggestions.style.display = "none";
      return;
    }

    matches.forEach((feature) => {
      const name = feature.properties.name || "Unnamed";
      const city = feature.properties["addr:city"] || "";
      const street = feature.properties["addr:street"] || "";
      const region = city || street ? `${city}${city && street ? ", " : ""}${street}` : "unknown location";

      const div = document.createElement("div");
      div.textContent = `${name} (${region})`;
      div.style.padding = "6px 8px";
      div.style.cursor = "pointer";
      div.style.borderBottom = "1px solid var(--sidebar-border)";
      div.style.color = "var(--text-color)";

      div.addEventListener("mouseenter", () => {
        div.style.backgroundColor = "var(--sidebar-hover-bg)";
      });
      div.addEventListener("mouseleave", () => {
        div.style.backgroundColor = "transparent";
      });

      div.addEventListener("click", () => {
        const selectedId = feature.id;
        const latlng = [feature.geometry.coordinates[1], feature.geometry.coordinates[0]];

        suggestions.style.display = "none";
        map.setView(latlng, 15);
        searchInput.value = "";

        drawGeoJSON(checkbox.checked, [], veganCheckbox.checked, vegetarianCheckbox.checked, selectedId);

        const newMarker = markersById[selectedId];
        if (newMarker) {
          newMarker.openPopup();
        }
      });

      suggestions.appendChild(div);
    });

    suggestions.style.display = "block";
  }

  // Redraw map and update suggestions
  function updateAndDraw() {
    const raw = searchInput.value.trim().toLowerCase();
    const tokens = raw.split(/\s+/).filter((t) => t.length > 0);
    const onlyRated = checkbox.checked;
    const onlyVegan = veganCheckbox.checked;
    const onlyVegetarian = vegetarianCheckbox.checked;

    drawGeoJSON(onlyRated, tokens, onlyVegan, onlyVegetarian);
    updateSuggestions(tokens, onlyRated, onlyVegan, onlyVegetarian);
  }

  // Hook up input/filter events
  searchInput.addEventListener("input", updateAndDraw);
  checkbox.addEventListener("change", updateAndDraw);
  veganCheckbox.addEventListener("change", updateAndDraw);
  vegetarianCheckbox.addEventListener("change", updateAndDraw);

  // Hide suggestions when clicking the map
  map.on("click", () => {
    suggestions.style.display = "none";
  });
});
