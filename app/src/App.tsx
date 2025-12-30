import { useState, useRef, useEffect } from 'react';
import { Container } from 'reactstrap';
import confetti from 'canvas-confetti';
import type { MapCanvasRef } from './components/Game/MapCanvas';
import type { GuessInputRef } from './components/Game/GuessInput';
import { useGameLogic } from './hooks/useGameLogic';
import { useUsername } from './hooks/useUsername';
import { useDifficulty, type Difficulty } from './hooks/useDifficulty';
import { AudioManager } from './utils/audioManager';

// Layout components
import Header from './components/Layout/Header';
import GameCard from './components/Layout/GameCard';
import StartScreen from './components/Layout/StartScreen';
import AnalyticsScreen from './components/Layout/AnalyticsScreen';
import GameEndModal from './components/Layout/GameEndModal';

import styles from './App.module.css';

const sparkleUrl = new URL('./assets/sparkle.mp3', import.meta.url).href;

/**
 * Plays a sparkle sound effect using the shared AudioManager.
 */
const playSparkleSound = () => {
  AudioManager.play(sparkleUrl, 0.5);
};

/**
 * Main Application Component
 * Manages the top-level game state, routing between screens (Start, Cloud, Analytics),
 * and initializing the game session.
 */
function App() {
  // 1. State Variables
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);

  // 2. Hooks
  const { userId, streak, highScores, refetchUser, isAdmin } = useUsername();
  const guessInputRef = useRef<GuessInputRef>(null);
  const mapCanvasRef = useRef<MapCanvasRef>(null);
  const hasPlayedCelebration = useRef(false);

  const { setDifficulty } = useDifficulty();

  // Preload sparkle sound
  useEffect(() => {
    AudioManager.load(sparkleUrl);
  }, []);

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
    allFeaturesLow,
    allFeaturesHigh,
    allLandLow,
    allLandHigh,
    highScore
  } = useGameLogic(userId, highScores, onGameEnd, isAdmin);

  // Detect mobile device (could use a hook, but currently logic)
  const isMobile = 'ontouchstart' in window || window.matchMedia('(max-width: 768px)').matches;

  const params = new URLSearchParams(window.location.search);
  const level = params.get('level');

  // Auto-start if level param is present AND game is ready
  useEffect(() => {
    const isValidLevel = level === 'easy' || level === 'medium' || level === 'hard' || level === 'extreme';

    if (isValidLevel && gameState.status === 'ready') {
      console.log('Auto-starting game...');
      setShowStartScreen(false);
      // Ensure difficulty matches URL before starting
      if (difficulty !== level) {
        console.log('Difficulty does not match URL. Setting difficulty...');
        setDifficulty(level as Difficulty);
        return; // Wait for re-render
      }
      startGame();
      // Remove search param
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [gameState.status, level, startGame, difficulty, setDifficulty]);

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
      hasPlayedCelebration.current = false;
    }
  }, [gameState.status]);

  // 3. Normal Methods
  /**
   * Resets the game state and starts a new session.
   * Called when the user clicks "Play Again" in the modal.
   */
  const playAgain = async () => {
    console.log('Playing again...');
    setShowResultsModal(false);
    await resetGame();
    startGame();
  };

  const isGameOver = gameState.status === 'won' || gameState.status === 'lost' || gameState.status === 'given_up';

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

  return (
    <div>
      <Container className={`p-0 ${styles.gameContainer}`}>
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
          onClose={() => setShowResultsModal(false)}
        />
      )}
    </div>
  );
}

export default App;
