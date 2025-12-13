import type { Feature } from 'geojson';
import MapCanvas from '../Game/MapCanvas';
import type { MapCanvasRef } from '../Game/MapCanvas';
import GuessHistory from '../Game/GuessHistory';
import MessageBar from './MessageBar';
import InputBar from './InputBar';
import type { GuessInputRef } from '../Game/GuessInput';
import type { Guess, Difficulty } from '../../hooks/useGameLogic';

interface GameCardProps {
    // Game state
    status: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    guessHistory: Guess[];
    score: number;
    highScore: number;
    difficulty: Difficulty;

    // GeoJSON data
    allFeaturesLow: Feature[];
    allFeaturesHigh: Feature[];
    allLandLow: Feature[];
    allLandHigh: Feature[];

    // Handlers
    onPlayAgain: () => void;
    onGuess: (guess: string) => void;
    onGiveUp: () => void;

    // Mobile detection
    isMobile: boolean;

    // Refs
    mapCanvasRef: React.RefObject<MapCanvasRef | null>;
    guessInputRef: React.RefObject<GuessInputRef | null>;
}

const GameCard = ({
    status,
    message,
    targetCountry,
    revealedNeighbors,
    guessHistory,
    score,
    highScore,
    difficulty,
    allFeaturesLow,
    allFeaturesHigh,
    allLandLow,
    allLandHigh,
    onPlayAgain,
    onGuess,
    onGiveUp,
    isMobile,
    mapCanvasRef,
    guessInputRef
}: GameCardProps) => {
    return (
        <div className="game-card" style={{
            backgroundColor: 'var(--color-bg-card)',
            marginBottom: 'var(--spacing-sm)',
            animation: 'fadeIn 0.6s ease-out 0.1s both'
        }}>
            {/* Message Bar */}
            <MessageBar
                status={status}
                message={message}
                onPlayAgain={onPlayAgain}
            />

            {/* Map Frame */}
            <div style={{
                backgroundColor: '#ffffff',
                marginBottom: '4px',
                aspectRatio: '4/3',
                width: '100%',
                position: 'relative'
            }}>
                <MapCanvas
                    ref={mapCanvasRef}
                    targetCountry={targetCountry}
                    revealedNeighbors={revealedNeighbors}
                    gameStatus={status}
                    difficulty={difficulty}
                    allFeaturesLow={allFeaturesLow}
                    allFeaturesHigh={allFeaturesHigh}
                    allLandLow={allLandLow}
                    allLandHigh={allLandHigh}
                />

                {/* Score Overlays - Top Left */}
                <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '4px'
                }}>
                    <div style={{
                        backgroundColor: 'rgba(255,215,0,0.95)',
                        border: '1px solid #eab308',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#92400e',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        🏆 Best: {highScore}
                    </div>
                    {status === 'won' && (
                        <div style={{
                            backgroundColor: 'rgba(4,99,7,0.95)',
                            border: '1px solid #046307',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: 'white',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>
                            Score: {score}
                        </div>
                    )}
                </div>

                <GuessHistory
                    guesses={guessHistory}
                    onGuessClick={(guessName) => mapCanvasRef.current?.rotateToCountry(guessName)}
                    onCenterClick={() => mapCanvasRef.current?.centerOnTarget()}
                />
            </div>

            {/* Input Bar */}
            <InputBar
                ref={guessInputRef}
                onGuess={onGuess}
                onGiveUp={onGiveUp}
                disabled={status !== 'playing'}
                guessHistory={guessHistory}
                isMobile={isMobile}
            />
        </div>
    );
};

export default GameCard;
