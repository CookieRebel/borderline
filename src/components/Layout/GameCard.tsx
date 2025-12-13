import { Card, CardBody, Badge } from 'reactstrap';
import type { Feature } from 'geojson';
import MapCanvas from '../Game/MapCanvas';
import type { MapCanvasRef } from '../Game/MapCanvas';
import GuessHistory from '../Game/GuessHistory';
import MessageBar from './MessageBar';
import InputBar from './InputBar';
import type { GuessInputRef } from '../Game/GuessInput';
import type { Guess, Difficulty } from '../../hooks/useGameLogic';

interface GameCardProps {
    status: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
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
    onPlayAgain: () => void;
    onGuess: (guess: string) => void;
    onGiveUp: () => void;
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
    onPlayAgain,
    onGuess,
    onGiveUp,
    isMobile,
    mapCanvasRef,
    guessInputRef
}: GameCardProps) => {
    return (
        <Card className="mb-2 border-0 fade-in">
            <CardBody className="p-0">
                {/* Message Bar */}
                <MessageBar
                    status={status}
                    message={message}
                    onPlayAgain={onPlayAgain}
                />

                {/* Map Frame */}
                <div className="bg-white mb-1 position-relative" style={{ aspectRatio: '4/3', width: '100%' }}>
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

                    {/* Score Overlays - Top Left - only after game ends */}
                    {(status === 'won' || status === 'given_up') && (
                        <div className="position-absolute top-0 start-0 m-1 d-flex gap-1" style={{ zIndex: 100 }}>
                            <Badge color="warning" className="text-dark fw-semibold" style={{ fontSize: '0.7rem' }}>
                                🏆 Best: {highScore}
                            </Badge>
                            {status === 'won' && (
                                <Badge className="bg-emerald fw-semibold" style={{ fontSize: '0.7rem' }}>
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
            </CardBody>
        </Card>
    );
};

export default GameCard;
