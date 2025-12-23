const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');

// Paths
const lowResSource = require.resolve('world-atlas/land-110m.json');
const highResSource = require.resolve('world-atlas/land-50m.json');

const lowResDest = path.join(__dirname, '../src/data/land_low.json');
const highResDest = path.join(__dirname, '../src/data/land_high.json');

// Helper to process file
function processFile(sourcePath, destPath) {
    console.log(`Processing ${path.basename(sourcePath)}...`);
    const topology = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

    // Extract land geometry
    // The land object is usually 'land' in world-atlas/land-*.json
    const landGeoJSON = topojson.feature(topology, topology.objects.land);

    // Wrap in FeatureCollection if it's not already (topojson.feature might return a Feature or FeatureCollection)
    // For 'land', it returns a single Feature (MultiPolygon) typically.
    // Our app expects FeatureCollection in useGameLogic (we added handling for this, but standardizing is good)

    let output;
    if (landGeoJSON.type === 'FeatureCollection') {
        output = landGeoJSON;
    } else {
        output = {
            type: 'FeatureCollection',
            features: [landGeoJSON]
        };
    }

    fs.writeFileSync(destPath, JSON.stringify(output));
    console.log(`Wrote ${destPath} (${(fs.statSync(destPath).size / 1024).toFixed(2)} KB)`);
}

// Run
try {
    processFile(lowResSource, lowResDest);
    processFile(highResSource, highResDest);
    console.log('Done generating land data from world-atlas.');
} catch (err) {
    console.error('Error generating land data:', err);
    process.exit(1);
}
