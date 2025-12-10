import { useState, useEffect, useMemo } from 'react';
import type { FeatureCollection, Feature } from 'geojson';
import { geoCentroid, geoDistance, geoArea } from 'd3-geo';
import countriesDataLow from '../data/countries_low.json';
import countriesDataHigh from '../data/countries_high.json';
import landDataLow from '../data/land_low.json';
import landDataHigh from '../data/land_high.json';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Guess {
    name: string;
    distance: number; // in km
    color: string;
}

const GUESS_COLORS = [
    '#9333ea', // Purple
    '#1e3a8a', // Navy
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#ec4899', // Pink
    '#eab308', // Gold
    '#06b6d4', // Cyan
];

export interface GameState {
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    score: number;
    status: 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    wrongGuesses: number;
    guessHistory: Guess[];
    difficulty: Difficulty;
}

// Easy mode countries - larger, well-known countries
const EASY_COUNTRIES = [
    // A
    'AFG', 'ALB', 'DZA', 'AGO', 'ARG', 'ARM', 'AUS', 'AUT', 'AZE',
    // B  
    'BHR', 'BGD', 'BLR', 'BEL', 'BEN', 'BTN', 'BOL', 'BIH', 'BWA', 'BRA', 'BRN', 'BGR', 'BFA', 'BDI',
    // C
    'KHM', 'CMR', 'CAN', 'CAF', 'TCD', 'CHL', 'CHN', 'COL', 'COG', 'COD', 'CRI', 'HRV', 'CUB', 'CYP', 'CZE',
    // D
    'DNK', 'DOM',
    // E
    'ECU', 'EGY', 'ERI', 'EST', 'ETH',
    // F
    'FIN', 'FRA',
    // G
    'GAB', 'GEO', 'DEU', 'GHA', 'GRC', 'GTM', 'GIN', 'GNB', 'GUY',
    // H
    'HTI', 'HND', 'HUN',
    // I
    'ISL', 'IND', 'IDN', 'IRN', 'IRQ', 'IRL', 'ISR', 'ITA', 'CIV',
    // J
    'JAM', 'JPN', 'JOR',
    // K
    'KAZ', 'KEN', 'XKX', 'KWT', 'KGZ',
    // L
    'LAO', 'LVA', 'LBN', 'LSO', 'LBR', 'LBY', 'LTU', 'LUX',
    // M
    'MDG', 'MWI', 'MYS', 'MDV', 'MLI', 'MHL', 'MRT', 'MEX', 'MDA', 'MCO', 'MNG', 'MNE', 'MAR', 'MOZ', 'MMR',
    // N
    'NAM', 'NPL', 'NLD', 'NZL', 'NIC', 'NER', 'NGA', 'PRK', 'MKD', 'NOR',
    // O
    'OMN',
    // P
    'PAK', 'PAN', 'PNG', 'PRY', 'PER', 'PHL', 'POL', 'PRT',
    // Q
    'QAT',
    // R
    'ROU', 'RUS', 'RWA',
    // S
    'SAU', 'SEN', 'SRB', 'SLE', 'SGP', 'SVK', 'SVN', 'SOM', 'ZAF', 'KOR', 'SSD', 'ESP', 'LKA', 'SDN', 'SUR', 'SWE', 'CHE', 'SYR',
    // T
    'TJK', 'TZA', 'THA', 'TLS', 'TGO', 'TUN', 'TUR', 'TKM',
    // U
    'UGA', 'UKR', 'ARE', 'GBR', 'USA', 'URY', 'UZB',
    // V
    'VEN', 'VNM',
    // Y
    'YEM',
    // Z
    'ZMB', 'ZWE'
];

export const useGameLogic = () => {
    const [difficulty, setDifficulty] = useState<Difficulty>(() => {
        const saved = localStorage.getItem('borderline_difficulty');
        return (saved === 'easy' || saved === 'medium' || saved === 'hard') ? saved : 'easy';
    });

    useEffect(() => {
        localStorage.setItem('borderline_difficulty', difficulty);
    }, [difficulty]);

    const [gameState, setGameState] = useState<GameState>({
        targetCountry: null,
        revealedNeighbors: [],
        score: 5000,
        status: 'playing',
        message: 'Guess the country or territory!',
        wrongGuesses: 0,
        guessHistory: [],
        difficulty: difficulty
    });

    // Process low-detail data (used for game logic and default rendering)
    const dataLow = useMemo(() => {
        const collection = countriesDataLow as FeatureCollection;

        // Preprocess to refine geometries
        const refinedFeatures = collection.features.map(feature => {
            const iso = feature.properties?.['ISO3166-1-Alpha-3'];

            // Configuration for geometry refinement: ISO Code -> Number of largest polygons to keep
            const GEO_REFINEMENTS: Record<string, number> = {
                'NZL': 3, // North, South, Stewart
                'USA': 2, // Mainland, Alaska (Excludes Hawaii & Territories)
                'FRA': 1, // Metropolitan France (Excludes Guiana, Reunion, etc.)
                'NLD': 1, // European Netherlands (Excludes Caribbean)
                'NOR': 1, // Mainland (Excludes Svalbard)
                'GBR': 1, // Great Britain (Excludes overseas if present)
            };

            if (iso && GEO_REFINEMENTS[iso] && feature.geometry.type === 'MultiPolygon') {
                const polygons = feature.geometry.coordinates;
                const keepCount = GEO_REFINEMENTS[iso];

                // Calculate area for each polygon
                const polygonsWithArea = polygons.map(poly => {
                    const tempFeature: Feature = {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Polygon',
                            coordinates: poly
                        }
                    };
                    return {
                        poly,
                        area: geoArea(tempFeature)
                    };
                });

                // Sort by area descending and keep top N
                const sorted = polygonsWithArea.sort((a, b) => b.area - a.area);
                const topPolygons = sorted.slice(0, keepCount).map(p => p.poly);

                return {
                    ...feature,
                    geometry: {
                        ...feature.geometry,
                        coordinates: topPolygons
                    }
                };
            }
            return feature;
        });

        return {
            ...collection,
            features: refinedFeatures
        };
    }, []);

    // Calculate Taiwan's area for "Hard" threshold
    const taiwanArea = useMemo(() => {
        const taiwan = dataLow.features.find((f: any) => f.properties['ISO3166-1-Alpha-3'] === 'TWN');
        return taiwan ? geoArea(taiwan as any) : 0.0005; // Fallback if not found
    }, [dataLow]);

    useEffect(() => {
        // Reset game when difficulty changes or on initial load
        initializeGame();
    }, [difficulty, dataLow]);

    const initializeGame = () => {
        const features = dataLow.features;
        if (!features || features.length === 0) return;

        // Filter potential targets based on difficulty
        let potentialTargets = features;

        if (difficulty === 'easy') {
            potentialTargets = features.filter((f: any) =>
                EASY_COUNTRIES.includes(f.properties['ISO3166-1-Alpha-3'])
            );
        } else if (difficulty === 'hard') {
            // Small island nations and territories up to the size of Taiwan
            potentialTargets = features.filter((f: any) => {
                const area = geoArea(f as any);
                return area <= taiwanArea && area > 0;
            });
        } else {
            // Medium: All countries larger than Taiwan (excludes small islands)
            potentialTargets = features.filter((f: any) => {
                const area = geoArea(f as any);
                return area > taiwanArea;
            });
        }

        // Fallback if filtering leaves no countries
        if (potentialTargets.length === 0) {
            console.warn(`No countries found for difficulty ${difficulty}, using all.`);
            potentialTargets = features;
        }

        // 1. Pick a random country from the filtered list
        const randomIndex = Math.floor(Math.random() * potentialTargets.length);
        const target = potentialTargets[randomIndex];
        const targetIso = target.properties?.['ISO3166-1-Alpha-3'];

        setGameState({
            targetCountry: target,
            revealedNeighbors: [],
            score: 5000,
            status: 'playing',
            message: 'Guess the country or territory!',
            wrongGuesses: 0,
            guessHistory: [],
            difficulty: difficulty
        });

        console.log(`Difficulty: ${difficulty}`);
        console.log(`Target: ${target.properties?.name} (${targetIso})`);
    };

    const handleGiveUp = () => {
        if (gameState.status !== 'playing') return;

        // On give up, we DON'T reveal all neighbors anymore, 
        // to keep the map clean (only show guesses and target).
        // The MapCanvas will handle showing the target label.

        setGameState(prev => ({
            ...prev,
            status: 'given_up',
            message: `The country was ${gameState.targetCountry?.properties?.name}.`,
            // Keep existing revealed neighbors (guesses), don't add all others
            revealedNeighbors: prev.revealedNeighbors
        }));
    };

    const handleGuess = (guess: string) => {
        if (gameState.status !== 'playing') return;

        const normalizedGuess = guess.trim().toLowerCase();
        const targetName = gameState.targetCountry?.properties?.name?.toLowerCase();
        const targetIso = gameState.targetCountry?.properties?.['ISO3166-1-Alpha-3'];

        // Find the guessed feature
        const guessedFeature = dataLow.features.find((f: any) => f.properties.name.toLowerCase() === normalizedGuess);

        // Calculate distance
        let distance = 0;

        if (gameState.targetCountry && targetIso && guessedFeature) {
            // 1. Calculate Distance
            const targetCentroid = geoCentroid(gameState.targetCountry as any);
            const guessedCentroid = geoCentroid(guessedFeature as any);
            distance = geoDistance(targetCentroid, guessedCentroid) * 6371;
        }

        // Determine color for this guess
        const colorIndex = gameState.wrongGuesses % GUESS_COLORS.length;
        const guessColor = GUESS_COLORS[colorIndex];

        // Add to guess history
        const newGuess: Guess = { name: guess.trim(), distance, color: guessColor };
        const newGuessHistory = [...gameState.guessHistory, newGuess];

        if (normalizedGuess === targetName) {
            setGameState(prev => ({
                ...prev,
                status: 'won',
                message: `Correct! It is ${gameState.targetCountry?.properties?.name}.`,
                guessHistory: newGuessHistory
            }));
        } else {
            // Wrong guess
            const newWrongGuesses = gameState.wrongGuesses + 1;
            let newRevealedNeighbors = [...gameState.revealedNeighbors];

            // Add the guessed country to the map if it's not already there
            if (guessedFeature && !newRevealedNeighbors.some(r => r.properties?.['ISO3166-1-Alpha-3'] === guessedFeature.properties?.['ISO3166-1-Alpha-3'])) {
                // Clone the feature to avoid mutating the original data and add color
                const coloredFeature = {
                    ...guessedFeature,
                    properties: {
                        ...guessedFeature.properties,
                        color: guessColor
                    }
                };
                newRevealedNeighbors.push(coloredFeature);
            }

            const message = 'Guess again';
            const scorePenalty = 500; // Fixed penalty

            setGameState(prev => ({
                ...prev,
                wrongGuesses: newWrongGuesses,
                revealedNeighbors: newRevealedNeighbors,
                score: Math.max(0, prev.score - scorePenalty),
                message: message,
                guessHistory: newGuessHistory
            }));
        }
    };


    return {
        gameState,
        handleGuess,
        handleGiveUp,
        difficulty,
        setDifficulty,
        allFeaturesLow: dataLow.features as Feature[],
        allFeaturesHigh: countriesDataHigh.features as unknown as Feature[],
        allLandLow: (landDataLow as FeatureCollection).features as Feature[],
        allLandHigh: (landDataHigh as FeatureCollection).features as Feature[],
        resetGame: initializeGame
    };
};
