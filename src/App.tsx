import { useRef, useEffect, useState } from 'react';
import { Container } from 'reactstrap';
import confetti from 'canvas-confetti';
import MapCanvas from './components/Game/MapCanvas';
import GuessInput from './components/Game/GuessInput';
import type { GuessInputRef } from './components/Game/GuessInput';
import GuessHistory from './components/Game/GuessHistory';
import Keyboard from './components/Game/Keyboard';
import { useGameLogic } from './hooks/useGameLogic';

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
  const { gameState, handleGuess, handleGiveUp, resetGame, startGame, difficulty, setDifficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh, highScore, liveScore } = useGameLogic();
  const guessInputRef = useRef<GuessInputRef>(null);
  const hasPlayedCelebration = useRef(false);

  // Pending difficulty change (for quit confirmation)
  const [pendingDifficulty, setPendingDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  // Detect mobile device (touch-capable or narrow screen)
  const isMobile = 'ontouchstart' in window || window.matchMedia('(max-width: 768px)').matches;

  // Handle difficulty change with confirmation if mid-game
  const handleDifficultyChange = (newDifficulty: 'easy' | 'medium' | 'hard') => {
    if (gameState.status === 'playing') {
      setPendingDifficulty(newDifficulty);
    } else {
      setDifficulty(newDifficulty);
    }
  };

  // Confirm quit and change difficulty
  const confirmQuit = () => {
    if (pendingDifficulty) {
      setDifficulty(pendingDifficulty);
      setPendingDifficulty(null);
    }
  };

  // Trigger confetti and sound on win
  useEffect(() => {
    if (gameState.status === 'won' && !hasPlayedCelebration.current) {
      hasPlayedCelebration.current = true;

      // Play sound
      playSparkleSound();

      // Fire confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Second burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 200);
    } else if (gameState.status === 'playing') {
      hasPlayedCelebration.current = false;
    }
  }, [gameState.status]);


  return (
    <div className="app-container">
      <Container className="p-0" style={{ maxWidth: '900px' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 'var(--spacing-md)', // Reduced from xl
          animation: 'fadeIn 0.5s ease-out'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            marginBottom: 'var(--spacing-xs)', // Reduced from sm
            background: 'linear-gradient(135deg, var(--color-accent) 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            BorderLINE
          </h1>
        </div>

        {/* Ad Banner Placeholder */}
        <div style={{
          backgroundColor: '#f3f4f6',
          border: '1px dashed #d1d5db',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '8px',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#9ca3af'
        }}>
          Ad Space
        </div>

        {/* Game Card */}
        <div className="game-card" style={{
          backgroundColor: 'var(--color-bg-card)',
          marginBottom: 'var(--spacing-sm)',
          animation: 'fadeIn 0.6s ease-out 0.1s both'
        }}>
          {/* Message + Level Dropdown Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
            padding: '0 4px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <span style={{
              flex: 1,
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: gameState.status === 'won'
                ? 'var(--color-accent-light)'
                : gameState.status === 'given_up'
                  ? '#fee2e2'
                  : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${gameState.status === 'won'
                ? 'var(--color-accent)'
                : gameState.status === 'given_up'
                  ? '#fca5a5'
                  : '#3b82f6'}`,
              color: gameState.status === 'won'
                ? 'var(--color-accent)'
                : gameState.status === 'given_up'
                  ? '#ef4444'
                  : '#3b82f6',
              borderRadius: 'var(--radius-md)',
              fontWeight: '500',
              padding: '0 0.75rem',
              fontSize: '0.875rem',
              marginRight: '8px'
            }}>
              {gameState.message}
              {(gameState.status === 'won' || gameState.status === 'given_up') && (
                <button
                  onClick={resetGame}
                  style={{
                    padding: '2px 10px',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: gameState.status === 'won' ? 'var(--color-accent)' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Play Again
                </button>
              )}
            </span>
            <select
              value={difficulty}
              onChange={(e) => handleDifficultyChange(e.target.value as 'easy' | 'medium' | 'hard')}
              style={{
                height: '28px',
                padding: '0 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
                flexShrink: 0
              }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Map Frame - Edge to Edge */}
          <div style={{
            backgroundColor: '#ffffff',
            marginBottom: '4px',
            aspectRatio: '4/3',
            width: '100%',
            position: 'relative'
          }}>
            <MapCanvas
              targetCountry={gameState.targetCountry}
              revealedNeighbors={gameState.revealedNeighbors}
              gameStatus={gameState.status}
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
              {gameState.status === 'playing' && (
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: '#374151',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  Score: {liveScore}
                </div>
              )}
              {gameState.status === 'won' && (
                <div style={{
                  backgroundColor: 'rgba(16,185,129,0.95)',
                  border: '1px solid #10b981',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  Score: {gameState.score}
                </div>
              )}
            </div>

            <GuessHistory guesses={gameState.guessHistory} />
          </div>

          {/* Input Row with Buttons + Keyboard */}
          <div style={{ marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <GuessInput
                  ref={guessInputRef}
                  onGuess={handleGuess}
                  disabled={gameState.status !== 'playing'}
                  guessHistory={gameState.guessHistory}
                  isMobile={isMobile}
                />
              </div>
              <button
                onClick={handleGiveUp}
                disabled={gameState.status !== 'playing'}
                title="Give Up"
                style={{
                  padding: '0.25rem',
                  backgroundColor: gameState.status === 'playing' ? '#fee2e2' : 'var(--color-bg-elevated)',
                  border: '1px solid',
                  borderColor: gameState.status === 'playing' ? '#fca5a5' : 'var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: gameState.status === 'playing' ? '#ef4444' : 'var(--color-text-secondary)',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: gameState.status === 'playing' ? 'pointer' : 'not-allowed',
                  opacity: gameState.status === 'playing' ? 1 : 0.4,
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Keyboard - Mobile only */}
            {isMobile && (
              <Keyboard
                onKeyPress={(key) => guessInputRef.current?.handleKeyPress(key)}
                onBackspace={() => guessInputRef.current?.handleBackspace()}
                onEnter={() => guessInputRef.current?.handleEnter()}
                disabled={gameState.status !== 'playing'}
              />
            )}
          </div>
        </div>

      </Container>

      {/* Ready Modal */}
      {gameState.status === 'ready' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px 48px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>Ready?</h2>
            <p style={{ margin: '12px 0 24px', color: '#6b7280', fontSize: '0.9rem' }}>
              {gameState.message}
            </p>
            <button
              onClick={startGame}
              style={{
                padding: '12px 48px',
                fontSize: '1.25rem',
                fontWeight: '600',
                backgroundColor: 'var(--color-accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
              }}
            >
              Go!
            </button>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {pendingDifficulty && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px 32px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#374151' }}>Quit current game?</h3>
            <p style={{ margin: '12px 0 20px', color: '#6b7280', fontSize: '0.875rem' }}>
              You'll lose your progress on this round.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setPendingDifficulty(null)}
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmQuit}
                style={{
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
