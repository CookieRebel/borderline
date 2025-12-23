// Generate high-detail version for LOD

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/source_data/countries.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const EXCLUDE_COUNTRIES = new Set(['ATA']);

function countVertices(geometry) {
    if (!geometry) return 0;
    if (geometry.type === 'Polygon') return geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((sum, polygon) => sum + polygon.reduce((pSum, ring) => pSum + ring.length, 0), 0);
    return 0;
}

function polygonArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    }
    return Math.abs(area / 2);
}

function keepLargestPolygons(geometry, maxPolygons, minVerticesPerPoly) {
    if (!geometry || geometry.type === 'Polygon') return geometry;

    if (geometry.type === 'MultiPolygon') {
        const withArea = geometry.coordinates.map(polygon => ({
            polygon,
            area: polygon[0] ? polygonArea(polygon[0]) : 0,
            vertices: polygon.reduce((sum, ring) => sum + ring.length, 0)
        }));

        withArea.sort((a, b) => b.area - a.area);
        const kept = withArea.slice(0, maxPolygons).filter(p => p.vertices >= minVerticesPerPoly).map(p => p.polygon);

        if (kept.length === 0) return { type: 'Polygon', coordinates: withArea[0].polygon };
        if (kept.length === 1) return { type: 'Polygon', coordinates: kept[0] };
        return { type: 'MultiPolygon', coordinates: kept };
    }
    return geometry;
}

function downsampleRing(ring, factor) {
    if (ring.length <= 4) return ring;
    const result = [];
    for (let i = 0; i < ring.length; i++) {
        if (i % factor === 0 || i === ring.length - 1) result.push(ring[i]);
    }
    if (result.length > 0 && (result[0][0] !== result[result.length - 1][0] || result[0][1] !== result[result.length - 1][1])) {
        result.push([...result[0]]);
    }
    return result.length >= 4 ? result : ring;
}

function simplifyGeometry(geometry, targetVertices) {
    if (!geometry) return geometry;
    const currentVertices = countVertices(geometry);
    if (currentVertices <= targetVertices) return geometry;
    const factor = Math.ceil(currentVertices / targetVertices);

    if (geometry.type === 'Polygon') {
        return { type: 'Polygon', coordinates: geometry.coordinates.map(ring => downsampleRing(ring, factor)) };
    } else if (geometry.type === 'MultiPolygon') {
        return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(polygon => polygon.map(ring => downsampleRing(ring, factor))) };
    }
    return geometry;
}

// HIGH detail settings - much more detail for zoomed-in view
const MAX_POLYGONS = 20;
const MIN_VERTICES_PER_POLY = 5;
const MAX_VERTICES = 2000; // Increased from 1000

const EXTRA_VERTICES = {
    'USA': 6000, 'CAN': 6000, 'MEX': 3000, 'BRA': 3000, 'CHL': 3000, 'ARG': 3000,
    'RUS': 6000, 'AUS': 3000, 'CHN': 4000, 'IND': 3000, 'IDN': 3000, 'NOR': 3000,
    'GRL': 3000, 'JPN': 2500, 'GBR': 2000, 'NZL': 2000, 'PHL': 3000,
};

const processedFeatures = data.features
    .filter(f => !EXCLUDE_COUNTRIES.has(f.properties['ISO3166-1-Alpha-3']))
    .map(feature => {
        // Calculate area for comparison (d3-geo area is in steradians)
        // We need to do this here or pre-calculate. 
        // To be efficient, let's just calc area for valid features.
        // But we need Lesotho's area first.
        return feature;
    });

// 1. Find Lesotho Area
const lsoFeature = data.features.find(f => f.properties['ISO3166-1-Alpha-3'] === 'LSO');
// Approx area if not found (Lesotho is ~30k km2, earth is 510M km2. 30k/510M * 4pi ~= 0.00074)
// But better to calculate if possible.
const d3 = require('d3-geo');
// We need to implement or import geoArea if not available in this scope?
// The script has polygonArea function but that's 2D projected approximation on rings?
// No, existing polygonArea is simple 2D. 
// Let's use the script's existing polygonArea logic or import d3-geo if needed.
// IMPORTANT: The script doesn't import d3-geo only fs/path. 
// AND the `polygonArea` function in the script is a simple Cartesian shoelace formula on [lng, lat].
// This is NOT accurate for geodetic area but sufficient for relative comparison if consistent.

// Let's use the script's `polygonArea` helper for consistency, or improve it.
// Actually, `polygonArea` in the script is used on *rings*.
// Let's stick to the user request "smaller than Lesotho".
// We will compute 'size' using the max polygon area of the country.

let lsoArea = 0;
if (lsoFeature) {
    if (lsoFeature.geometry.type === 'Polygon') {
        lsoArea = polygonArea(lsoFeature.geometry.coordinates[0]);
    } else if (lsoFeature.geometry.type === 'MultiPolygon') {
        // Find max polygon area
        lsoArea = Math.max(...lsoFeature.geometry.coordinates.map(p => polygonArea(p[0])));
    }
}
console.log(`Lesotho Area (approx): ${lsoArea}`);

const finalFeatures = processedFeatures.map(feature => {
    const origVertices = countVertices(feature.geometry);
    const iso = feature.properties['ISO3166-1-Alpha-3'];

    // Calculate area
    let featureArea = 0;
    if (feature.geometry.type === 'Polygon') {
        featureArea = polygonArea(feature.geometry.coordinates[0]);
    } else if (feature.geometry.type === 'MultiPolygon') {
        featureArea = Math.max(...feature.geometry.coordinates.map(p => polygonArea(p[0])));
    }

    // Check if smaller than Lesotho
    const isSmall = featureArea < lsoArea;

    // Settings
    // If small, keep ALL detail (max polygons high, no vertex limit)
    // If large, use standard or extra

    let geometry = feature.geometry;

    if (isSmall) {
        // For small countries: Don't simplify, keeping max detail.
        // We might still want to clean up tiny artifacts, but "max available" implies keep it all.
        // But `keepLargestPolygons` is useful to remove noise.
        // Let's keep more polygons and lower threshold.
        geometry = keepLargestPolygons(geometry, 50, 3); // More polygons, lower vertex threshold

        // Skip `simplifyGeometry` or use origVertices as target
        if (origVertices > 0) {
            // Just pass through or simplify very lightly if it's huge? 
            // Unlikely for small country to have > 10k vertices in this dataset, but just in case.
            // User said "Increase vertices to max available".
            // So we do NOTHING to reduce vertices.
        }
        console.log(`Keeping detail for small country ${feature.properties.name} (${iso}) - Vertices: ${origVertices}`);

    } else {
        // Standard Processing
        geometry = keepLargestPolygons(feature.geometry, MAX_POLYGONS, MIN_VERTICES_PER_POLY);
        const targetVertices = EXTRA_VERTICES[iso] || MAX_VERTICES;
        geometry = simplifyGeometry(geometry, targetVertices);

        const newVertices = countVertices(geometry);
        if (newVertices < origVertices) {
            // console.log(`${feature.properties.name}: ${origVertices} → ${newVertices}`);
        }
    }

    return { ...feature, geometry };
});

const output = { ...data, features: finalFeatures };
const outputPath = path.join(__dirname, '../src/data/countries_high.json');
fs.writeFileSync(outputPath, JSON.stringify(output));

// Also rename current optimized to countries_low
// const lowPath = path.join(__dirname, '../src/data/countries_low.json');
// fs.copyFileSync(path.join(__dirname, '../src/data/countries_optimized.json'), lowPath);

console.log(`\nHigh detail: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
// console.log(`Low detail: ${(fs.statSync(lowPath).size / 1024 / 1024).toFixed(2)} MB`);
