import { useRef } from 'react';
import { Container } from 'reactstrap';
import MapCanvas from './components/Game/MapCanvas';
import GuessInput from './components/Game/GuessInput';
import type { GuessInputRef } from './components/Game/GuessInput';
import GuessHistory from './components/Game/GuessHistory';
import Keyboard from './components/Game/Keyboard';
import { useGameLogic } from './hooks/useGameLogic';

function App() {
  const { gameState, handleGuess, handleGiveUp, resetGame, difficulty, setDifficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh } = useGameLogic();
  const guessInputRef = useRef<GuessInputRef>(null);

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
              padding: '0.25rem 0.75rem',
              fontSize: '0.875rem'
            }}>
              {gameState.message}
            </span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              style={{
                padding: '0.25rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize'
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
              <button
                onClick={resetGame}
                title="Play Again"
                style={{
                  padding: '0.25rem',
                  backgroundColor: 'var(--color-accent)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                ↻
              </button>
            </div>

            {/* Keyboard - Full width */}
            <Keyboard
              onKeyPress={(key) => guessInputRef.current?.handleKeyPress(key)}
              onBackspace={() => guessInputRef.current?.handleBackspace()}
              onEnter={() => guessInputRef.current?.handleEnter()}
              disabled={gameState.status !== 'playing'}
            />
          </div>
        </div>

      </Container>
    </div>
  );
}

export default App;
