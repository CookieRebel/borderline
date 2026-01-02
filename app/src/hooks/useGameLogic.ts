import { useState, useEffect, useMemo, useRef } from 'react';
import type { FeatureCollection, Feature } from 'geojson';
import { geoArea, geoCentroid, geoDistance } from 'd3-geo';
import { allCountries } from '../data/allCountries';

import { useDifficulty, type Difficulty } from './useDifficulty';
import { getAssetUrl } from '../utils/assetUtils';
import type { HighScores } from './useUsername';

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
    status: 'loading' | 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    wrongGuesses: number;
    guessHistory: Guess[];
    difficulty: Difficulty;
    rankMessage: string;
}

// Scoring system: Start 2000, -200 per guess, -10 per second
function scoreRound(guessNumber: number, timeSeconds: number, difficulty: Difficulty): number {
    const baseScore = 2000;
    const guessPenalty = (guessNumber - 1) * 200; // First guess is free

    // Easy mode: no time penalty
    if (difficulty === 'easy') {
        return Math.max(0, baseScore - guessPenalty);
    }

    const timePenalty = Math.floor(timeSeconds * 10);
    return Math.max(0, baseScore - guessPenalty - timePenalty);
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

// ... (Define submitGameResult outside or inside? It was outside. Updating it to use PUT)

// Submit game result to backend
const submitGameResult = async (gameId: string | null, level: string, guesses: number, time: number, score: number, won: boolean, targetIso?: string) => {
    if (!gameId) return null; // Require gameId now

    try {
        const res = await fetch('/api/game', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: gameId,
                // handled by cookie
                level,
                guesses,
                time,
                score,
                won,
                target_code: targetIso,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })
        });
        const data = await res.json();
        // onGameEnd is now called by the caller to handle race conditions or ordering
        return data;
    } catch (e) {
        console.error("Failed to submit game result:", e);
        return null;
    }
};



export const useGameLogic = (isAdmin: boolean, userIsLoading: boolean, userId?: string, userHighScores?: HighScores, onGameEnd?: () => void) => {
    // console.log('useGameLogic isAdmin', isAdmin);
    const { difficulty } = useDifficulty();

    const [gameState, setGameState] = useState<GameState>({
        targetCountry: null,
        revealedNeighbors: [],
        score: 0,
        roundScore: 0,
        status: 'loading',
        message: 'Guess the country or territory!',
        wrongGuesses: 0,
        guessHistory: [],
        difficulty: difficulty,
        rankMessage: '',
    });

    const [gameId, setGameId] = useState<string | null>(null); // New state for game session ID
    const [countriesDataLow, setCountriesDataLow] = useState<FeatureCollection | null>(null);
    const [countriesDataHigh, setCountriesDataHigh] = useState<FeatureCollection | null>(null);
    const [landDataLow, setLandDataLow] = useState<FeatureCollection | null>(null);
    const [landDataHigh, setLandDataHigh] = useState<FeatureCollection | null>(null);

    // Fetch data on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                const [cLow, cHigh, lLow, lHigh] = await Promise.all([
                    fetch(getAssetUrl('/data/countries_low.json')).then(r => r.json()),
                    fetch(getAssetUrl('/data/countries_high.json')).then(r => r.json()),
                    fetch(getAssetUrl('/data/land_low.json')).then(r => r.json()),
                    fetch(getAssetUrl('/data/land_high.json')).then(r => r.json())
                ]);

                setCountriesDataLow(cLow);
                setCountriesDataHigh(cHigh);
                setLandDataLow(lLow);
                setLandDataHigh(lHigh);
            } catch (error) {
                console.error("Failed to load map data:", error);
            }
        }

        loadData();
    }, []);

    // High scores from backend (passed in from useUsername)
    const highScores = userHighScores || { easy: 0, medium: 0, hard: 0, extreme: 0 };

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

    // Update live score every 1000ms while playing
    useEffect(() => {
        if (gameState.status !== 'playing') return;

        const interval = setInterval(() => {
            const timeSeconds = (Date.now() - roundStartTime.current) / 1000;
            const guessNumber = gameState.guessHistory.length + 1; // Next guess number
            const potentialScore = scoreRound(guessNumber, timeSeconds, difficulty);
            setLiveScore(potentialScore);
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState.status, gameState.guessHistory.length, difficulty]);

    // ... (Data processing logic remains same, hidden for brevity in prompt) ...
    // Process low-detail data (used for game logic and default rendering)
    const dataLow = useMemo(() => {
        if (!countriesDataLow) return { type: 'FeatureCollection', features: [] } as any;
        const collection = countriesDataLow as FeatureCollection;
        // ... (reuse existing refinement logic) ...
        const refinedFeatures = collection.features.map(feature => {
            const iso = feature.properties?.['ISO3166-1-Alpha-3'];
            const GEO_REFINEMENTS: Record<string, number> = {
                'NZL': 3, 'USA': 2, 'FRA': 1, 'NLD': 1, 'NOR': 1, 'GBR': 1,
            };
            if (iso && GEO_REFINEMENTS[iso] && feature.geometry.type === 'MultiPolygon') {
                const polygons = feature.geometry.coordinates;
                const keepCount = GEO_REFINEMENTS[iso];
                const polygonsWithArea = polygons.map(poly => {
                    const tempFeature: Feature = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: poly } };
                    return { poly, area: geoArea(tempFeature) };
                });
                const sorted = polygonsWithArea.sort((a, b) => b.area - a.area);
                const topPolygons = sorted.slice(0, keepCount).map(p => p.poly);
                return { ...feature, geometry: { ...feature.geometry, coordinates: topPolygons } };
            }
            return feature;
        });
        return {
            ...collection,
            features: refinedFeatures.filter((f: any) => allCountries.includes(f.properties.name))
        };
    }, [countriesDataLow]);

    const taiwanArea = useMemo(() => {
        if (!dataLow.features.length) return 0.0005;
        const taiwan = dataLow.features.find((f: any) => f.properties['ISO3166-1-Alpha-3'] === 'TWN');
        return taiwan ? geoArea(taiwan as any) : 0.0005;
    }, [dataLow]);

    // Toggle body class for hiding navigation
    useEffect(() => {
        if (gameState.status === 'playing') {
            document.body.classList.add('game-playing');
        } else {
            document.body.classList.remove('game-playing');
        }
        return () => document.body.classList.remove('game-playing');
    }, [gameState.status]);

    // Start a new game session on backend
    const startBackendGame = async () => {
        // if (!userId) return; // UserId is now implicit via cookie, but we might want to wait for auth check?
        // Actually, we should wait until user is loaded to ensure cookie exists. userId prop checks that.
        if (userIsLoading || !userId) return;

        try {
            const res = await fetch('/api/game', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    level: difficulty,
                    // week/year calculated on backend
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                })
            });
            const data = await res.json();
            if (data.id) {
                setGameId(data.id);
            }
        } catch (e) {
            console.error("Failed to start game session:", e);
        }
    };

    const resetGame = (): Promise<void> => {
        // console.log('Resetting game...');
        setGameState({
            targetCountry: null, revealedNeighbors: [], score: 0, roundScore: 0,
            status: 'loading',
            message: 'Can you guess the country?', wrongGuesses: 0, guessHistory: [], difficulty: difficulty,
            rankMessage: '',
        });
        if (!userId) {
            console.error('No user ID found');
            return Promise.resolve();
        }

        const features = dataLow.features;
        if (!features || features.length === 0) {
            console.error('No features found in dataLow');
            return Promise.resolve();
        }
        // const allCountryCodes = features.map((f: any) => f.properties['ISO3166-1-Alpha-3']);
        // console.log('allCountryCodes', allCountryCodes);
        let potentialTargets = features;
        // ... (Filtering Logic same as before) ...
        if (difficulty === 'easy') {
            // Only include easy countries
            potentialTargets = features.filter((f: any) => EASY_COUNTRIES.includes(f.properties['ISO3166-1-Alpha-3']));
        } else if (difficulty === 'extreme') {
            // Only include countries smaller than Taiwan
            potentialTargets = features.filter((f: any) => { const area = geoArea(f as any); return area <= taiwanArea && area > 0; });
        } else if (difficulty === 'hard') {
            // Exclude very recognisable countries
            const HARD_EXCLUSIONS = ['USA', 'CAN', 'AUS', 'RUS', 'CHN', 'IND', 'ITA', 'ZAF', 'GBR', 'BRA', 'CHL', 'ARG', 'DEU', 'FRA', 'ESP'];
            potentialTargets = features.filter((f: any) => { const iso = f.properties['ISO3166-1-Alpha-3']; const area = geoArea(f as any); return area > taiwanArea && !HARD_EXCLUSIONS.includes(iso); });
        } else {
            // Exclude obvious countries
            const MEDIUM_EXCLUSIONS = ['USA', 'AUS', 'ITA', 'CHL'];
            potentialTargets = features.filter((f: any) => { const iso = f.properties['ISO3166-1-Alpha-3']; const area = geoArea(f as any); return area > taiwanArea && !MEDIUM_EXCLUSIONS.includes(iso); });
        }

        if (potentialTargets.length === 0) potentialTargets = features;

        // Admins can overrride the country using ?country=IDN (for Indonesia)
        const params = new URLSearchParams(window.location.search);
        const forcedCountry = params.get('country')?.toUpperCase();
        // console.log('forcedCountry', forcedCountry);
        // console.log('isAdmin', isAdmin);
        if (isAdmin && forcedCountry) {
            const forcedTarget = features.find((f: any) => f.properties['ISO3166-1-Alpha-3'] === forcedCountry);
            if (forcedTarget) {
                // console.log('Admin override: Setting target to', forcedCountry);
                setGameState({
                    targetCountry: forcedTarget, revealedNeighbors: [], score: 0, roundScore: 0,
                    status: 'ready',
                    message: 'Can you guess the country?', wrongGuesses: 0, guessHistory: [], difficulty: difficulty, rankMessage: ''
                });
                setGameId(null);
                return Promise.resolve();
            }
        }
        const candidates = potentialTargets.map((f: any) => f.properties['ISO3166-1-Alpha-3']);

        return fetch('/api/pick_target', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidates })
        })
            .then(res => res.json())
            .then(data => {
                let target;
                if (data.target) target = potentialTargets.find((f: any) => f.properties['ISO3166-1-Alpha-3'] === data.target);
                if (!target) {
                    const randomIndex = Math.floor(Math.random() * potentialTargets.length);
                    target = potentialTargets[randomIndex];
                }

                const highScoreMessage = highScore > 0 ? highScore < 2000 ? `Can you beat your all-time level high score of ${highScore}?` : `Can you repeat your high score of ${highScore}?` : 'Can you guess the country or territory?';

                // Transition from loading (or whatever) to ready
                setGameState({
                    targetCountry: target, revealedNeighbors: [], score: 0, roundScore: 0,
                    status: 'ready',
                    message: highScoreMessage, wrongGuesses: 0, guessHistory: [], difficulty: difficulty, rankMessage: ''
                });
                setGameId(null);
                // console.log('Game reset');
            })
            .catch(err => {
                console.error('Failed to pick target. Selecting a fallback target locally:', err);
                const randomIndex = Math.floor(Math.random() * potentialTargets.length);
                const target = potentialTargets[randomIndex];
                setGameState({
                    targetCountry: target, revealedNeighbors: [], score: 0, roundScore: 0,
                    status: 'ready',
                    message: 'Can you guess the country?', wrongGuesses: 0, guessHistory: [], difficulty: difficulty, rankMessage: ''
                });
            });
    };

    // Trigger reset when data is finally ready and userId is present
    useEffect(() => {
        // console.log('useEffect dataLow', dataLow);   
        // console.log('useEffect userId', userId); 
        // console.log('useEffect userIsLoading', userIsLoading);
        // Only reset if we have data and user.
        if (!userIsLoading && userId && dataLow.features.length > 0) {
            resetGame();
        }
    }, [dataLow, userId, userIsLoading]);

    const startGame = () => {
        // console.log('Starting game...');
        roundStartTime.current = Date.now();
        startBackendGame(); // Start session on manual start
        setGameState(prev => {
            if (prev.status !== 'ready') return prev;
            return { ...prev, status: 'playing' };
        });
    };

    const handleGiveUp = () => {
        if (gameState.status !== 'playing') return;
        setGameState(prev => ({
            ...prev, status: 'given_up',
            message: `The country was ${gameState.targetCountry?.properties?.name}.`,
            revealedNeighbors: prev.revealedNeighbors
        }));

        const elapsedSeconds = Math.floor((Date.now() - roundStartTime.current) / 1000);
        const guessCount = gameState.guessHistory.length;
        if (userId) {
            const targetIso = gameState.targetCountry?.properties?.['ISO3166-1-Alpha-3'];
            submitGameResult(gameId, difficulty, guessCount, elapsedSeconds, 0, false, targetIso).then(() => {
                if (onGameEnd) onGameEnd();
            });
        }
    };

    const handleGuess = (guess: string) => {
        if (gameState.status !== 'playing' || !dataLow.features.length) return;
        const normalizedGuess = guess.trim().toLowerCase();
        const targetName = gameState.targetCountry?.properties?.name?.toLowerCase();
        const targetIso = gameState.targetCountry?.properties?.['ISO3166-1-Alpha-3'];
        const guessedFeature = dataLow.features.find((f: any) => f.properties.name.toLowerCase() === normalizedGuess);

        // ... (Distance calculation logic remains same) ...
        let distance = 0;
        if (gameState.targetCountry && targetIso && guessedFeature) {
            const targetCentroid = geoCentroid(gameState.targetCountry as any);
            const guessedCentroid = geoCentroid(guessedFeature as any);
            distance = geoDistance(targetCentroid, guessedCentroid) * 6371;
        }

        const colorIndex = gameState.wrongGuesses % GUESS_COLORS.length;
        const guessColor = GUESS_COLORS[colorIndex];
        const newGuess: Guess = { name: guess.trim(), distance, color: guessColor };
        const newGuessHistory = [...gameState.guessHistory, newGuess];

        if (normalizedGuess === targetName) {
            const timeSeconds = (Date.now() - roundStartTime.current) / 1000;
            const guessNumber = newGuessHistory.length;
            const roundScore = scoreRound(guessNumber, timeSeconds, difficulty);
            const isHighScore = roundScore > highScore;
            const guessCount = newGuessHistory.length;

            const countryName = gameState.targetCountry?.properties?.name || 'the country';
            const guessWord = guessCount === 1 ? 'guess' : 'guesses';
            const winMessage = isHighScore
                ? `🏆 ${countryName} in ${guessCount} ${guessWord}.`
                : `${countryName} in ${guessCount} ${guessWord}.`;

            // Set won state immediately for UI responsiveness
            setGameState(prev => ({
                ...prev, status: 'won', message: winMessage, guessHistory: newGuessHistory, roundScore: roundScore, score: roundScore
            }));

            const elapsedSeconds = Math.floor((Date.now() - roundStartTime.current) / 1000);
            if (userId) { // Still checking userId to ensure we are "logged in" contextually
                submitGameResult(gameId, difficulty, guessCount, elapsedSeconds, roundScore, true, targetIso)
                    .then(data => {
                        if (data && data.rankMessage) {
                            // console.log("Setting Game State rankMessage", data.rankMessage);
                            setGameState(prev => ({ ...prev, rankMessage: data.rankMessage }));
                        }
                        if (onGameEnd) onGameEnd();
                    });
            }
        } else {
            // ... (Wrong guess logic) ...
            const newWrongGuesses = gameState.wrongGuesses + 1;
            let newRevealedNeighbors = [...gameState.revealedNeighbors];
            if (guessedFeature && !newRevealedNeighbors.some(r => r.properties?.['ISO3166-1-Alpha-3'] === guessedFeature.properties?.['ISO3166-1-Alpha-3'])) {
                const coloredFeature = { ...guessedFeature, properties: { ...guessedFeature.properties, color: guessColor } };
                newRevealedNeighbors.push(coloredFeature);
            }
            setGameState(prev => ({
                ...prev, wrongGuesses: newWrongGuesses, revealedNeighbors: newRevealedNeighbors,
                score: Math.max(0, prev.score - 500), message: `Guess #${newWrongGuesses}: ${guess}. Incorrect. `, guessHistory: newGuessHistory
            }));
        }
    };

    return {
        gameState, handleGuess, handleGiveUp, difficulty,
        allFeaturesLow: countriesDataLow?.features as Feature[] || [],
        allFeaturesHigh: countriesDataHigh?.features as Feature[] || [],
        allLandLow: landDataLow?.features as Feature[] || [],
        allLandHigh: landDataHigh?.features as Feature[] || [],
        resetGame, startGame, highScore, liveScore
    };
};
