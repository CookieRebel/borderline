import { Container, Alert } from 'reactstrap';
import MapCanvas from './components/Game/MapCanvas';
import GuessInput from './components/Game/GuessInput';
import GuessHistory from './components/Game/GuessHistory';
import { useGameLogic } from './hooks/useGameLogic';

function App() {
  const { gameState, handleGuess, handleGiveUp, resetGame, difficulty, setDifficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh } = useGameLogic();

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
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.95rem',
            marginBottom: 'var(--spacing-md)' // Reduced from lg
          }}>
            Guess the country or territory from its outline
          </p>

          {/* Difficulty Switcher */}
          <div style={{
            display: 'inline-flex',
            backgroundColor: 'var(--color-bg-elevated)',
            padding: '2px', // Reduced from 4px
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)'
          }}>
            {(['easy', 'medium', 'hard'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                style={{
                  padding: '4px 12px', // Reduced from 6px 16px
                  borderRadius: 'calc(var(--radius-md) - 2px)',
                  border: 'none',
                  backgroundColor: difficulty === level ? 'white' : 'transparent',
                  color: difficulty === level ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  fontWeight: difficulty === level ? '600' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  boxShadow: difficulty === level ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.2s ease',
                  textTransform: 'capitalize'
                }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Game Card */}
        <div className="game-card" style={{
          backgroundColor: 'var(--color-bg-card)',
          marginBottom: 'var(--spacing-sm)',
          animation: 'fadeIn 0.6s ease-out 0.1s both'
        }}>
          {/* Message Alert - Above Map */}
          {gameState.message && (
            <div style={{
              marginBottom: '4px',
              padding: '0 4px',
              animation: 'slideIn 0.3s ease-out'
            }}>
              <Alert
                color={gameState.status === 'won' ? 'success' : gameState.status === 'given_up' ? 'danger' : 'info'}
                style={{
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
                  textAlign: 'center',
                  fontWeight: '500',
                  padding: '0.5rem',
                  marginBottom: 0
                }}
              >
                {gameState.message}
              </Alert>
            </div>
          )}

          {/* Map Frame - Edge to Edge */}
          <div style={{
            backgroundColor: '#ffffff',
            marginBottom: '4px',
            aspectRatio: '4/3',
            width: '100%'
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
          </div>

          {/* Guess Input */}
          <div style={{ marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <GuessInput
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
                  padding: '0.375rem',
                  backgroundColor: gameState.status === 'playing' ? '#fee2e2' : 'var(--color-bg-elevated)',
                  border: '1px solid',
                  borderColor: gameState.status === 'playing' ? '#fca5a5' : 'var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: gameState.status === 'playing' ? '#ef4444' : 'var(--color-text-secondary)',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  cursor: gameState.status === 'playing' ? 'pointer' : 'not-allowed',
                  opacity: gameState.status === 'playing' ? 1 : 0.4,
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                ✕
              </button>
              <button
                onClick={resetGame}
                title="Play Again"
                style={{
                  padding: '0.375rem',
                  backgroundColor: 'var(--color-accent)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 'var(--radius-md)',
                  color: 'white',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'all 0.2s ease'
                }}
              >
                ↻
              </button>
            </div>
          </div>

          {/* Guess History */}
          <div style={{ padding: '0 4px' }}>
            <GuessHistory guesses={gameState.guessHistory} />
          </div>
        </div>

      </Container>
    </div>
  );
}

export default App;
