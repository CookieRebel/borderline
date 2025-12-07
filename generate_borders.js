import fs from 'fs';

const rawData = fs.readFileSync('countries_raw.json', 'utf8');
const countries = JSON.parse(rawData);

const borders = {};

countries.forEach(country => {
    const iso3 = country.cca3;
    const countryBorders = country.borders || [];
    if (iso3) {
        borders[iso3] = countryBorders;
    }
});

const outputContent = `export const borders: Record<string, string[]> = ${JSON.stringify(borders, null, 4)};`;

fs.writeFileSync('src/data/borders.ts', outputContent);
console.log('Successfully generated src/data/borders.ts');
