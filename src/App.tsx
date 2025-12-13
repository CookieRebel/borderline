import { useRef, useEffect } from 'react';
import { Container } from 'reactstrap';
import confetti from 'canvas-confetti';
import type { MapCanvasRef } from './components/Game/MapCanvas';
import type { GuessInputRef } from './components/Game/GuessInput';
import { useGameLogic } from './hooks/useGameLogic';

// Layout components
import Header from './components/Layout/Header';
import AdBanner from './components/Layout/AdBanner';
import GameCard from './components/Layout/GameCard';
import ReadyModal from './components/Layout/ReadyModal';

// Play sparkle sound
const playSparkleSound = () => {
  try {
    const audio = new Audio('/sparkle.mp3');
    audio.volume = 0.5;
    audio.play();
  } catch (e) {
    console.log('Audio not supported');
  }
};

function App() {
  const {
    gameState,
    handleGuess,
    handleGiveUp,
    resetGame,
    startGame,
    difficulty,
    setDifficulty,
    allFeaturesLow,
    allFeaturesHigh,
    allLandLow,
    allLandHigh,
    highScore
  } = useGameLogic();

  const guessInputRef = useRef<GuessInputRef>(null);
  const mapCanvasRef = useRef<MapCanvasRef>(null);
  const hasPlayedCelebration = useRef(false);

  // Detect mobile device
  const isMobile = 'ontouchstart' in window || window.matchMedia('(max-width: 768px)').matches;

  // Trigger confetti and sound on win
  useEffect(() => {
    if (gameState.status === 'won' && !hasPlayedCelebration.current) {
      hasPlayedCelebration.current = true;
      playSparkleSound();

      // Single centered confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { x: 0.5, y: 0.5 }
      });
    } else if (gameState.status === 'playing') {
      hasPlayedCelebration.current = false;
    }
  }, [gameState.status]);

  return (
    <div className="app-container">
      <Container className="p-0" style={{ maxWidth: '900px' }}>
        <Header />
        <AdBanner />
        <GameCard
          status={gameState.status}
          message={gameState.message}
          targetCountry={gameState.targetCountry}
          revealedNeighbors={gameState.revealedNeighbors}
          guessHistory={gameState.guessHistory}
          score={gameState.score}
          highScore={highScore}
          difficulty={difficulty}
          allFeaturesLow={allFeaturesLow}
          allFeaturesHigh={allFeaturesHigh}
          allLandLow={allLandLow}
          allLandHigh={allLandHigh}
          onPlayAgain={resetGame}
          onGuess={handleGuess}
          onGiveUp={handleGiveUp}
          isMobile={isMobile}
          mapCanvasRef={mapCanvasRef}
          guessInputRef={guessInputRef}
        />
      </Container>

      {/* Ready Modal */}
      {gameState.status === 'ready' && (
        <ReadyModal
          message={gameState.message}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
          onStart={startGame}
        />
      )}
    </div>
  );
}

export default App;
