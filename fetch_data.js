import https from 'https';
import fs from 'fs';

const url = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        const geojson = JSON.parse(data);
        console.log('First feature properties:', geojson.features[0].properties);

        if (!fs.existsSync('src/data')) {
            fs.mkdirSync('src/data');
        }

        fs.writeFileSync('src/data/countries.json', JSON.stringify(geojson, null, 2));
        console.log(`Saved ${geojson.features.length} countries to src/data/countries.json`);
    });
}).on('error', (err) => {
    console.error('Error fetching data:', err);
});
