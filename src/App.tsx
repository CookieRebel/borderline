import { useState, useRef, useEffect } from 'react';
import { Container } from 'reactstrap';
import confetti from 'canvas-confetti';
import type { MapCanvasRef } from './components/Game/MapCanvas';
import type { GuessInputRef } from './components/Game/GuessInput';
import { useGameLogic } from './hooks/useGameLogic';
import { useUsername } from './hooks/useUsername';

// Layout components
import Header from './components/Layout/Header';
import AdBanner from './components/Layout/AdBanner';
import GameCard from './components/Layout/GameCard';
import ReadyModal from './components/Layout/ReadyModal';
import StartScreen from './components/Layout/StartScreen';
import InstructionsScreen from './components/Layout/InstructionsScreen';
import GameEndModal from './components/Layout/GameEndModal';

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
  const { userId, streak, highScores, refetchUser } = useUsername();
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // Callback to refresh stats and high scores after game ends
  const onGameEnd = () => {
    setStatsRefreshKey(k => k + 1);
    refetchUser(); // Refresh high scores
  };

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
  } = useGameLogic(userId, highScores, onGameEnd);

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

  // Show start screen first
  if (showStartScreen) {
    return (
      <StartScreen
        onPlay={() => setShowStartScreen(false)}
        onInstructions={() => {
          setShowStartScreen(false);
          setShowInstructions(true);
        }}
        streak={streak}
      />
    );
  }

  // Show instructions screen
  if (showInstructions) {
    return (
      <InstructionsScreen onBack={() => {
        setShowInstructions(false);
        setShowStartScreen(true);
      }} />
    );
  }

  return (
    <div className="app-container">
      <Container className="p-0" style={{ maxWidth: '900px' }}>
        <AdBanner />
        <Header difficulty={difficulty} refreshKey={statsRefreshKey} />
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

      {/* Game End Modal */}
      {(gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'given_up') && (
        <GameEndModal
          isOpen={true}
          countryName={gameState.targetCountry?.properties?.name || ''}
          resultMessage={gameState.message}
          won={gameState.status === 'won'}
          difficulty={difficulty}
          onPlayAgain={resetGame}
        />
      )}
    </div>
  );
}

export default App;
