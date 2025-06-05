
# Café Map of Tirol and Salzburg

This map is a fun, personal project—a kind of digital notebook where I keep track of cafes I’ve visited with friends. I’ve added some light design to match my portfolio site so it fits in visually, but the main focus is just having a space to look back at where we’ve been.

### Data Sources
- GeoJSON data is sourced from OpenStreetMap, using a custom query I listed at the end of this document.

- Ratings JSON is a handwritten dataset I created, containing personal notes and ratings about specific areas. This injects a layer of subjectivity and narrative into the otherwise objective spatial data.

### Design Principles
The visual and interactive design draws directly from my existing portfolio's aesthetic:

- Color Scheme: Each main region is color-coded with hues derived from the portfolio palette. Subregions use darker tones of their parent region, reinforcing hierarchy and visual grouping.

- Highlighting: The gradient markers, from my base blue to a vivid yellow, ties into the portfolio's visual identity. The yellow aligns with the star emoji ⭐ used in ratings, signifying top-rated areas.

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