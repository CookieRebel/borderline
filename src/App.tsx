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
import StartScreen from './components/Layout/StartScreen';
import AnalyticsScreen from './components/Layout/AnalyticsScreen';
import GameEndModal from './components/Layout/GameEndModal';

const sparkleUrl = new URL('./assets/sparkle.mp3', import.meta.url).href;

// Play sparkle sound
const playSparkleSound = () => {
  try {
    const audio = new Audio(sparkleUrl);
    audio.volume = 0.5;
    audio.play();
  } catch (e) {
    console.log('Audio not supported', e);
  }
};

function App() {
  const { userId, streak, highScores, refetchUser } = useUsername();
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
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
    resetGame: resetGameLogic,
    startGame,
    difficulty,
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

  // Wrapper to reset game, close modal, and start new game
  const playAgain = () => {
    setShowResultsModal(false);
    resetGameLogic(true);
  };

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
        onPlay={() => {
          setShowStartScreen(false);
          startGame();
        }}
        onAnalytics={() => {
          setShowStartScreen(false);
          setShowAnalytics(true);
        }}
        userId={userId}
        streak={streak}
      />
    );
  }

  // Show instructions screen


  // Show analytics screen
  if (showAnalytics) {
    return (
      <AnalyticsScreen
        userId={userId}
        onBack={() => {
          setShowAnalytics(false);
          setShowStartScreen(true);
        }}
      />
    );
  }

  const isGameOver = gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'given_up';

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
          onShowResults={() => setShowResultsModal(true)}
          isMobile={isMobile}
          mapCanvasRef={mapCanvasRef}
          guessInputRef={guessInputRef}
        />
      </Container>

      {/* Game End Modal - only show when user clicks Results */}
      {isGameOver && showResultsModal && (
        <GameEndModal
          isOpen={true}
          countryName={gameState.targetCountry?.properties?.name || ''}
          countryCode={gameState.targetCountry?.properties?.['ISO3166-1-Alpha-2']}
          resultMessage={gameState.message}
          won={gameState.status === 'won'}
          onPlayAgain={playAgain}
        />
      )}
    </div>
  );
}

export default App;
