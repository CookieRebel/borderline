import { Card, CardBody, Badge, Button } from 'reactstrap';
import type { Feature } from 'geojson';
import MapCanvas from '../Game/MapCanvas';
import type { MapCanvasRef } from '../Game/MapCanvas';
import GuessHistory from '../Game/GuessHistory';
import MessageBar from './MessageBar';
import InputBar from './InputBar';
import type { GuessInputRef } from '../Game/GuessInput';
import type { Guess } from '../../hooks/useGameLogic';
import type { Difficulty } from '../../hooks/useDifficulty';
import styles from './GameCard.module.css';

interface GameCardProps {
    status: 'loading' | 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    /* ... */
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    guessHistory: Guess[];
    score: number;
    highScore: number;
    difficulty: Difficulty;
    allFeaturesLow: Feature[];
    allFeaturesHigh: Feature[];
    allLandLow: Feature[];
    allLandHigh: Feature[];
    onGuess: (guess: string) => void;
    onGiveUp: () => void;
    onShowResults?: () => void;
    isMobile: boolean;
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
    onGuess,
    onGiveUp,
    onShowResults,
    isMobile,
    mapCanvasRef,
    guessInputRef
}: GameCardProps) => {
    console.log("status", status);
    return (
        <Card className="mb-2 border-0 fade-in">
            <CardBody className="p-0">
                <MessageBar
                    status={status}
                    message={message}
                />

                <div className={`bg-white mb-1 position-relative ${styles.mapFrame}`}>
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

                    {(status === 'won' || status === 'given_up') && (
                        <div className={`position-absolute top-0 start-0 m-1 d-flex gap-1 ${styles.scoreOverlay}`}>
                            <Badge color="warning" className={`text-dark fw-semibold ${styles.badgeText}`}>
                                🏆 Best: {highScore}
                            </Badge>
                            {status === 'won' && (
                                <Badge className={`bg-emerald fw-semibold ${styles.badgeText}`}>
                                    Score: {score}
                                </Badge>
                            )}
                        </div>
                    )}

                    <GuessHistory
                        guesses={guessHistory}
                        onGuessClick={(guessName) => mapCanvasRef.current?.rotateToCountry(guessName)}
                        onCenterClick={() => mapCanvasRef.current?.centerOnTarget()}
                    />

                    {/* Results button at bottom center */}
                    {(status === 'won' || status === 'given_up') && onShowResults && (
                        <div
                            className="position-absolute start-50 translate-middle-x"
                            style={{ top: '30px', zIndex: 100 }}
                        >
                            <Button
                                className="btn-gold px-4 py-2 shadow"
                                onClick={onShowResults}
                            >
                                Results
                            </Button>
                        </div>
                    )}
                </div>

                <InputBar
                    ref={guessInputRef}
                    onGuess={onGuess}
                    onGiveUp={onGiveUp}
                    disabled={status !== 'playing'}
                    guessHistory={guessHistory}
                    isMobile={isMobile}
                />
            </CardBody>
        </Card>
    );
};

export default GameCard;
