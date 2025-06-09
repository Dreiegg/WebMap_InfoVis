
# Café Map of Tirol and Salzburg

This map is a fun, personal project, a kind of digital notebook where I keep track of cafés I’ve visited with friends. I’ve added some light design to match my portfolio site so it fits in visually, but the main focus is just having a space to look back at where we’ve been.

> View the map @ https://dreiegg.github.io/WebMap_InfoVis/

## Base Info
### Title: 
Toni's Café Guide

### Legend/Layer Control: 
There is a small legend that sums up what the gradient means in rating. There are also three kinds of filters: only rated, only vegan, only vegetarian.

### Interaction:
I stopped tracking where I added interaction to the map, but here are those I can think of: a search function with name+place-based suggestions; a map navigation that sends you to the most important places on button click; filters to only display certain aspects; mouse hover to show name only (this is a little buggy); and the popup that is shown when we click on a marker or on a suggestion.

### Basemap Design
Basemap design is by CATRO, basemap-styles – Copyright (c) 2018, CartoDB Inc.  
I got it from their repository: https://github.com/CartoDB/basemap-styles

### Target Group
My target group is everyone I want to show a little bit of me personally. As the map will be embedded in my portfolio, it is for all the people looking to get to know me better. It is a small reflection of my personality—an interactive and non-intrusive way to show a little of my personality while also featuring a nice little project.

### Data Sources
- GeoJSON data is sourced from OpenStreetMap, using the query I listed at the end of this document.

- Ratings JSON is a handwritten dataset I created, containing personal notes and ratings about specific areas. For this, it might be nice to have a graphical overlay I can use to add things, but this would bring more overhead I want to avoid.

- Basemap: as mentioned above, the basemap is from Carto. I imported it via:  
  ```js
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/" target="_blank">CARTO</a>'
    // (other stuff)
  }).addTo(map);

## Methodology
### Setup
I started by setting up the library and then immediately grabbing the CSS of my portfolio. I asked Copilot to remove all the specific styles and only keep body, h1, sidebar, etc. I also made sure to get all the color variables so I have the same color scheme as the portfolio.

I then researched if there were already designed maps that fit the dark-themed style of my portfolio and found the dark-style basemap from CARTO. Then I messed around to get a nice desktop sidebar-to-map ratio. From there the design base was set, and I started on the functionality in the JS.

### Navigation
First thing I added was the navigation to jump to specific coordinates (and zoom) on button click.

```js
const locations = {
  "Tirol Region": { coords: [47.2682, 11.3926], zoom: 10, region: "tirol" },
  "Salzburg Region": { coords: [47.799, 12.995], zoom: 10, region: "salzburg" },
  "Salzburg City": { coords: [47.8095, 13.055], zoom: 15, region: "salzburg" },
  Hallein: { coords: [47.6819009, 13.0948644], zoom: 15, region: "salzburg" },
  Kufstein: { coords: [47.5833, 12.1667], zoom: 15, region: "tirol" },
  Innsbruck: { coords: [47.2692, 11.4041], zoom: 15, region: "tirol" },
};

// (...)

Object.entries(groupedLocations).forEach(([region, locs]) => {
    const regionContainer = document.createElement("div");
    regionContainer.style.marginBottom = "15px";

    const regionColor =
      region === "tirol" ? "var(--purple-color)" : "var(--blue-color)";
    const childColor =
      region === "tirol"
        ? "var(--purple-child-color)"
        : "var(--blue-child-color)";

    const mainRegion = locs.find((l) =>
      l.name.toLowerCase().includes("region")
    );
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
```
#### Marker Rendering
After setting up the region navigation, the next major task was to render the markers from a GeoJSON file. I used fetch() to load the GeoJSON data, then looped through each feature to render it on the map using Leaflet. I also created a marker group so that all markers could be easily controlled and filtered later.

#### binding the custom ratings.json
Integrated an external JSON to enrich existing GeoJSON features by matching on feature ID.
```js
fetch("data/ratings.json")
  .then((res) => res.json())
  .then((ratingData) => {
    ratingData.forEach((entry) => {
      ratings[entry.id] = {
        rating: entry.rating,
        note: entry.note,
        diet: entry.diet, //this was added later, after i implemented the vegan filter and found it wildly incomplete.
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
```

#### added popup and tooltip
I then added a popup with all the information I wanted it to have and also gave the marker a tooltip to display the café name on hover.
```js
onEachFeature: (feature, layer) => {
  const props = feature.properties;
  const id = feature.id;
  const ratingInfo = ratings[id] || {};

  let popup = `<strong>${props.name || "Unnamed"}</strong><br/>`;
  if (props.opening_hours) popup += `🕒 ${props.opening_hours}<br/>`;
  if (props["diet:vegan"] === "yes") popup += `🌱 Vegan friendly<br/>`;
  else if (props["diet:vegetarian"] === "yes") popup += `🥦 Vegetarian friendly<br/>`;
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
}
```
#### search functionality
I added a search bar so you can find cafés by name. This was refined to also filter for location and give suggestions based on that. There is live filtering as you type in your search.
```js
// input setup
const searchInput = document.createElement("input");
searchInput.type = "search";
searchInput.placeholder = "Search cafés and bakeries...";
searchInput.setAttribute("aria-label", "Search cafés and bakeries");
extraSpaceDiv.appendChild(searchInput);


//token matching
function matchesSearch(feature, tokens) {
  const text = getSearchableText(feature);
  return tokens.every((token) => text.includes(token));
}

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

// display dropdown
function updateSuggestions(tokens, onlyRated, onlyVegan, onlyVegetarian) {
  suggestions.innerHTML = "";
  if (tokens.length === 0) {
    suggestions.style.display = "none";
    return;
  }

  const matches = geojson.features
    .filter((feature) => {
      // Filtering logic based on search and diet
    })
    .slice(0, 10);

  matches.forEach((feature) => {
    const div = document.createElement("div");
    div.textContent = `${feature.properties.name || "Unnamed"} (...)`;
    div.addEventListener("click", () => {
      const selectedId = feature.id;
      map.setView([...], 15);
      drawGeoJSON(..., selectedId);
      markersById[selectedId]?.openPopup();
    });
    suggestions.appendChild(div);
  });

  suggestions.style.display = "block";
}

```
#### Filtering for specific features
I added checkboxes to search for rated only, vegan and vegetarian places. Although I find the vegetarian tag a bit useless now, as cafés usually are vegetarian. But this showed a big flaw in the OSM data, as most cafés weren't listed under vegetarian.


```js
function createFilterCheckbox(id, emoji, labelText) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = id;
  ...
  return checkbox;
}

const checkbox = createFilterCheckbox("filterRated", "⭐", "Only show rated");
const veganCheckbox = createFilterCheckbox("filterVegan", "🌱", "Only show vegan");
const vegetarianCheckbox = createFilterCheckbox("filterVegetarian", "🥦", "Only show vegetarian");

checkbox.addEventListener("change", updateAndDraw);
veganCheckbox.addEventListener("change", updateAndDraw);
vegetarianCheckbox.addEventListener("change", updateAndDraw);

// draw:
filter: (feature) => {
  if (onlyRated && !ratings[feature.id]?.rating) return false;
  if (onlyVegan && feature.properties["diet:vegan"] !== "yes") return false;
  if (onlyVegetarian && feature.properties["diet:vegetarian"] !== "yes") return false;
  ...
  return true;
}

```

#### injection of customized diet information from ratings.json
Due to the faulty data from OSM I added the option to append the diet field on the ratings so I can easily add a custom dietary note.
```js
function applyRatingOverrides() {
  geojson.features.forEach((feature) => {
    const id = feature.id;
    const ratingEntry = ratings[id];
    if (!ratingEntry) return;

    const dietValue = ratingEntry.diet?.toLowerCase();
    if (dietValue === "vegan") {
      feature.properties["diet:vegan"] = "yes";
      feature.properties["diet:vegetarian"] = "yes";
    } else if (dietValue === "vegetarian") {
      feature.properties["diet:vegetarian"] = "yes";
      delete feature.properties["diet:vegan"];
    } else {
      delete feature.properties["diet:vegan"];
      delete feature.properties["diet:vegetarian"];
    }
  });
}
```

#### additional notes
There are a lot of things that I also added, such as the legend, but these are neither interestingly implemented nor can I remember everything I did and why. I covered the majority here but I am writing this methodology after a 1am coding session.


### Design Choices
The visual and interactive design draws directly from my existing portfolio's aesthetic:

- **Color Scheme**: Each main region is color-coded with hues derived from the portfolio palette. Subregions use darker tones of their parent region, reinforcing hierarchy and visual grouping. The colors are color variables (at the start of the CSS) I directly ported over from the portfolio.

- **Highlighting**: The gradient markers, from my base blue to a vivid yellow, tie into the portfolio's visual identity, with the blue being my main highlight color in the portfolio. The yellow aligns with the star emoji ⭐ used in ratings, signifying top-rated areas.

### Analysis
As expected, the thing I noticed most with my dataset is that for Tirol, the cafés rarely extend to places outside the Inntal. The Inntal holds the most clustered amount of cafés; once the Inntal ends, the cafés scatter. Also, it is notable that both Innsbruck and Salzburg City have around the same amount of cafés, at least by the looks of their clusters. The café culture still seems to be an Austrian-wide thing apparently. Hallein and Kufstein are an unfair comparison in terms of café-amount, as Kufstein is a border city and big in tourism.

### Potential Improvements + Critical Reflection
The most important improvement would be a graphical review interface, so I don't have to write each review into the JSON by hand. This would also allow my friends (who definitely do not know how to write JSON) to add their notes themselves. The whole thing also isn't responsive, which is why I won't add it to my portfolio yet.

After noticing the vegetarian information is both very incomplete and obsolete (because cafés are never not vegetarian-friendly) I thought of removing the filter, however, I implemented it, and so it stays for now.

I probably should not have let Copilot ravage through my portfolio CSS, as quite a lot of styles now overwrite each other, creating obsolete code. But all in all, it looks fine.

### Key Takeaways
I noticed that I tend to display data too small for people to comprehend. I like small text and small details, but especially for interaction, we want to have big markers and text for easier navigation.

I also found a strange appreciation for emojis, which I avoided previously. In everything gamedev, using emoji in designs looks very tacky, but for this map, it was nice to have them in combination with text for quicker information take-in.

I also accidentally created a system where I can easily add new shortcut regions, because the buttons are created dynamically. For that I'd only have to swap out the OSM data and then I could easily extend the café area.

I also find JavaScript very ugly and it should be banned from programming permanently.


## Overpass Turbo query:

```
[out:json][timeout:25];
// Define the area (Salzburg + Tyrol)
area["name"="Salzburg"]["boundary"="administrative"]->.a;
area["name"="Tirol"]["boundary"="administrative"]->.b;

// Search for cafés, bakeries, patisseries, confectioneries, and pastry shops
(
  node["amenity"="cafe"](area.a);
  way["amenity"="cafe"](area.a);
  relation["amenity"="cafe"](area.a);

  node["shop"="bakery"](area.a);
  way["shop"="bakery"](area.a);
  relation["shop"="bakery"](area.a);

  node["shop"="patisserie"](area.a);
  way["shop"="patisserie"](area.a);
  relation["shop"="patisserie"](area.a);

  node["shop"="confectionery"](area.a);
  way["shop"="confectionery"](area.a);
  relation["shop"="confectionery"](area.a);

  node["shop"="pastry"](area.a);
  way["shop"="pastry"](area.a);
  relation["shop"="pastry"](area.a);

  node["amenity"="cafe"](area.b);
  way["amenity"="cafe"](area.b);
  relation["amenity"="cafe"](area.b);

  node["shop"="bakery"](area.b);
  way["shop"="bakery"](area.b);
  relation["shop"="bakery"](area.b);

  node["shop"="patisserie"](area.b);
  way["shop"="patisserie"](area.b);
  relation["shop"="patisserie"](area.b);

  node["shop"="confectionery"](area.b);
  way["shop"="confectionery"](area.b);
  relation["shop"="confectionery"](area.b);

  node["shop"="pastry"](area.b);
  way["shop"="pastry"](area.b);
  relation["shop"="pastry"](area.b);
);
out center;

```