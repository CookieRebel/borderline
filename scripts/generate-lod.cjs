// Generate high-detail version for LOD

const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../src/data/countries.json');
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
const MAX_VERTICES = 1000; // Increased from 400

const EXTRA_VERTICES = {
    'USA': 2000, 'CAN': 2000, 'MEX': 1500, 'BRA': 1500, 'CHL': 1500, 'ARG': 1500,
    'RUS': 2000, 'AUS': 1500, 'CHN': 1500, 'IND': 1200, 'IDN': 1500, 'NOR': 1500,
    'GRL': 1500, 'JPN': 1200, 'GBR': 1000, 'NZL': 1000, 'PHL': 1200,
};

const processedFeatures = data.features
    .filter(f => !EXCLUDE_COUNTRIES.has(f.properties['ISO3166-1-Alpha-3']))
    .map(feature => {
        const origVertices = countVertices(feature.geometry);
        const iso = feature.properties['ISO3166-1-Alpha-3'];

        let geometry = keepLargestPolygons(feature.geometry, MAX_POLYGONS, MIN_VERTICES_PER_POLY);
        const targetVertices = EXTRA_VERTICES[iso] || MAX_VERTICES;
        geometry = simplifyGeometry(geometry, targetVertices);

        const newVertices = countVertices(geometry);
        if (newVertices < origVertices) {
            console.log(`${feature.properties.name}: ${origVertices} → ${newVertices}`);
        }
        return { ...feature, geometry };
    });

const output = { ...data, features: processedFeatures };
const outputPath = path.join(__dirname, '../src/data/countries_high.json');
fs.writeFileSync(outputPath, JSON.stringify(output));

// Also rename current optimized to countries_low
const lowPath = path.join(__dirname, '../src/data/countries_low.json');
fs.copyFileSync(path.join(__dirname, '../src/data/countries_optimized.json'), lowPath);

console.log(`\nHigh detail: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Low detail: ${(fs.statSync(lowPath).size / 1024 / 1024).toFixed(2)} MB`);
