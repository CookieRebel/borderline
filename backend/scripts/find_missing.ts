
import fs from 'fs';
import path from 'path';

const allCountriesPath = path.join(process.cwd(), 'src/data/allCountries.ts');
const countriesLowPath = path.join(process.cwd(), 'src/data/countries_low.json');

const allCountriesContent = fs.readFileSync(allCountriesPath, 'utf-8');
// Extract the array content roughly
const match = allCountriesContent.match(/export const allCountries = \[(.*?)\]\.sort\(\);/s);
if (!match) {
    console.error("Could not parse allCountries.ts");
    process.exit(1);
}

const allCountriesList = eval(`[${match[1]}]`);
const countriesLow = JSON.parse(fs.readFileSync(countriesLowPath, 'utf-8'));

const targetNames = countriesLow.features.map((f: any) => f.properties.name);

const missing = targetNames.filter((name: string) => !allCountriesList.includes(name));

console.log("Missing countries:", missing);
