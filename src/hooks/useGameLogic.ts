import { useState, useEffect, useMemo, useRef } from 'react';
import type { FeatureCollection, Feature } from 'geojson';
import { geoCentroid, geoDistance, geoArea } from 'd3-geo';
import countriesDataLow from '../data/countries_low.json';
import countriesDataHigh from '../data/countries_high.json';
import landDataLow from '../data/land_low.json';
import landDataHigh from '../data/land_high.json';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

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
    roundScore: number;
    status: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    wrongGuesses: number;
    guessHistory: Guess[];
    difficulty: Difficulty;
}

// Scoring system
const GUESS_POINTS = [0, 700, 500, 380, 290, 220, 160, 110, 70];

function scoreRound(guessNumber: number, timeSeconds: number, difficulty: Difficulty): number {
    const g = Math.max(1, Math.min(guessNumber, 8));
    const guessPoints = GUESS_POINTS[g];
    // Easy mode: no time penalty
    if (difficulty === 'easy') {
        return guessPoints;
    }
    // Time bonus: decays slowly, minimum 50 points even after 5 minutes
    // Starts at 300, loses 1 point per second after 5s grace period
    const timeBonus = Math.max(50, 300 - Math.max(0, timeSeconds - 5));
    return Math.round(guessPoints + timeBonus);
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
        score: 0,
        roundScore: 0,
        status: 'playing',
        message: 'Guess the country or territory!',
        wrongGuesses: 0,
        guessHistory: [],
        difficulty: difficulty
    });

    // High scores per difficulty from localStorage
    const [highScores, setHighScores] = useState<Record<Difficulty, number>>(() => {
        const saved = localStorage.getItem('borderline_highscores');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure extreme exists (for backwards compatibility)
                return { easy: 0, medium: 0, hard: 0, extreme: 0, ...parsed };
            } catch {
                return { easy: 0, medium: 0, hard: 0, extreme: 0 };
            }
        }
        return { easy: 0, medium: 0, hard: 0, extreme: 0 };
    });

    // Current difficulty's high score
    const highScore = highScores[difficulty];

    // Timer for scoring
    const roundStartTime = useRef<number>(Date.now());

    // Reset timer when difficulty changes
    useEffect(() => {
        roundStartTime.current = Date.now();
    }, [difficulty]);

    // Live score that updates as timer ticks
    const [liveScore, setLiveScore] = useState<number>(0);

    // Update live score every 100ms while playing
    useEffect(() => {
        if (gameState.status !== 'playing') return;

        const interval = setInterval(() => {
            const timeSeconds = (Date.now() - roundStartTime.current) / 1000;
            const guessNumber = gameState.guessHistory.length + 1; // Next guess number
            const potentialScore = scoreRound(guessNumber, timeSeconds, difficulty);
            setLiveScore(potentialScore);
        }, 100);

        return () => clearInterval(interval);
    }, [gameState.status, gameState.guessHistory.length, difficulty]);

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
        } else if (difficulty === 'extreme') {
            // Extreme: Small island nations and territories smaller than Taiwan
            potentialTargets = features.filter((f: any) => {
                const area = geoArea(f as any);
                return area <= taiwanArea && area > 0;
            });
        } else if (difficulty === 'hard') {
            // Hard: All countries except obvious ones, and larger than Taiwan
            const HARD_EXCLUSIONS = [
                'USA', 'CAN', 'AUS', 'RUS', 'CHN', 'IND', 'ITA',
                'ZAF', 'GBR', 'BRA', 'CHL', 'ARG', 'DEU', 'FRA', 'ESP'
            ];
            potentialTargets = features.filter((f: any) => {
                const iso = f.properties['ISO3166-1-Alpha-3'];
                const area = geoArea(f as any);
                return area > taiwanArea && !HARD_EXCLUSIONS.includes(iso);
            });
        } else {
            // Medium: All countries larger than Taiwan, excluding very obvious ones
            const MEDIUM_EXCLUSIONS = ['USA', 'AUS', 'ITA', 'CHL'];
            potentialTargets = features.filter((f: any) => {
                const iso = f.properties['ISO3166-1-Alpha-3'];
                const area = geoArea(f as any);
                return area > taiwanArea && !MEDIUM_EXCLUSIONS.includes(iso);
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

        const highScoreMessage = highScore > 0
            ? `Can you beat your high score of ${highScore}?`
            : 'Can you guess the country or territory?';

        setGameState({
            targetCountry: target,
            revealedNeighbors: [],
            score: 0,
            roundScore: 0,
            status: 'ready', // Start in ready state, waiting for Go!
            message: highScoreMessage,
            wrongGuesses: 0,
            guessHistory: [],
            difficulty: difficulty
        });

        console.log(`Difficulty: ${difficulty}`);
        console.log(`Target: ${target.properties?.name} (${targetIso})`);
    };

    // Start the game (called when user clicks Go!)
    const startGame = () => {
        if (gameState.status !== 'ready') return;
        roundStartTime.current = Date.now();
        setGameState(prev => ({
            ...prev,
            status: 'playing'
        }));
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
            // Calculate score based on guesses and time
            const timeSeconds = (Date.now() - roundStartTime.current) / 1000;
            const guessNumber = newGuessHistory.length;
            const roundScore = scoreRound(guessNumber, timeSeconds, difficulty);
            // Check for high score (per difficulty)
            const isHighScore = roundScore > highScore;
            if (isHighScore) {
                const newHighScores = { ...highScores, [difficulty]: roundScore };
                setHighScores(newHighScores);
                localStorage.setItem('borderline_highscores', JSON.stringify(newHighScores));
            }

            const winMessage = isHighScore
                ? `🏆 High Score! ${roundScore} pts`
                : `Correct! ${roundScore} pts`;

            setGameState(prev => ({
                ...prev,
                status: 'won',
                message: winMessage,
                guessHistory: newGuessHistory,
                roundScore: roundScore,
                score: roundScore
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
        resetGame: initializeGame,
        startGame,
        highScore,
        liveScore
    };
};
