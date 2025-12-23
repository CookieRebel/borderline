// Ultra-aggressive simplification with vertex cap AND island removal

const fs = require('fs');
const path = require('path');

// Load the original data
const dataPath = path.join(__dirname, '../src/data/countries.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Countries to EXCLUDE entirely
const EXCLUDE_COUNTRIES = new Set(['ATA']); // Antarctica

function countVertices(geometry) {
    if (!geometry) return 0;
    if (geometry.type === 'Polygon') return geometry.coordinates.reduce((sum, ring) => sum + ring.length, 0);
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.reduce((sum, polygon) => sum + polygon.reduce((pSum, ring) => pSum + ring.length, 0), 0);
    return 0;
}

// Get polygon area (simple shoelace formula for rough estimate)
function polygonArea(ring) {
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
        area += (ring[i][0] * ring[i + 1][1]) - (ring[i + 1][0] * ring[i][1]);
    }
    return Math.abs(area / 2);
}

// Keep only the N largest polygons from a MultiPolygon
function keepLargestPolygons(geometry, maxPolygons, minVerticesPerPoly) {
    if (!geometry) return geometry;

    if (geometry.type === 'Polygon') {
        return geometry;
    }

    if (geometry.type === 'MultiPolygon') {
        // Calculate area for each polygon
        const withArea = geometry.coordinates.map(polygon => ({
            polygon,
            area: polygon[0] ? polygonArea(polygon[0]) : 0,
            vertices: polygon.reduce((sum, ring) => sum + ring.length, 0)
        }));

        // Sort by area descending
        withArea.sort((a, b) => b.area - a.area);

        // Keep only top N or those with enough vertices
        const kept = withArea
            .slice(0, maxPolygons)
            .filter(p => p.vertices >= minVerticesPerPoly)
            .map(p => p.polygon);

        if (kept.length === 0) {
            // Keep at least the largest one
            return { type: 'Polygon', coordinates: withArea[0].polygon };
        }

        if (kept.length === 1) {
            return { type: 'Polygon', coordinates: kept[0] };
        }

        return { type: 'MultiPolygon', coordinates: kept };
    }

    return geometry;
}

// Downsample a ring
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

// Configuration
const MAX_POLYGONS = 10; // Max number of islands per country
const MIN_VERTICES_PER_POLY = 10; // Min vertices to keep a polygon
const MAX_VERTICES = 250; // Target vertices per country (Increased from 150)

// Countries that need more detail
const EXTRA_VERTICES = {
    'USA': 3500,
    'CAN': 3500,
    'MEX': 1000,
    'BRA': 1500,
    'CHL': 800,
    'ARG': 800,
    'RUS': 3500,
    'AUS': 1500,
    'CHN': 2500,
    'IND': 1200,
    'MNG': 800,
    'IDN': 1500,
    'NOR': 1000, // Norway has complex coast
    'GRL': 1000,
    'JPN': 1000,
    'GBR': 800,
    'NZL': 800,
    'PHL': 1000,
};

// Process features
const processedFeatures = data.features
    .filter(f => !EXCLUDE_COUNTRIES.has(f.properties['ISO3166-1-Alpha-3']))
    .map(feature => {
        const origVertices = countVertices(feature.geometry);
        const iso = feature.properties['ISO3166-1-Alpha-3'];

        // Step 1: Remove small islands
        let geometry = keepLargestPolygons(feature.geometry, MAX_POLYGONS, MIN_VERTICES_PER_POLY);

        // Step 2: Downsample to target vertices (use extra budget if available)
        const targetVertices = EXTRA_VERTICES[iso] || MAX_VERTICES;
        geometry = simplifyGeometry(geometry, targetVertices);

        const newVertices = countVertices(geometry);
        if (newVertices < origVertices) {
            console.log(`${feature.properties.name}: ${origVertices} → ${newVertices}`);
        }

        return { ...feature, geometry };
    });

// Create output
const output = { ...data, features: processedFeatures };

// Write output
const outputPath = path.join(__dirname, '../src/data/countries_optimized.json');
fs.writeFileSync(outputPath, JSON.stringify(output));

const originalSize = fs.statSync(dataPath).size;
const newSize = fs.statSync(outputPath).size;

console.log(`\nOriginal: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`New: ${(newSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`Reduction: ${((1 - newSize / originalSize) * 100).toFixed(1)}%`);
