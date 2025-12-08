import { Container, Alert } from 'reactstrap';
import MapCanvas from './components/Game/MapCanvas';
import GuessInput from './components/Game/GuessInput';
import GuessHistory from './components/Game/GuessHistory';
import { useGameLogic } from './hooks/useGameLogic';

function App() {
  const { gameState, handleGuess, handleGiveUp, difficulty, setDifficulty, allFeatures } = useGameLogic();

  return (
    <div className="app-container">
      <Container style={{ maxWidth: '900px' }}>
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
            Borderdraw
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
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '5px',
          marginBottom: 'var(--spacing-lg)',
          animation: 'fadeIn 0.6s ease-out 0.1s both'
        }}>
          {/* Map Frame */}
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            padding: '5px',
            marginBottom: 'var(--spacing-lg)',
            border: '1px solid var(--color-border)',
            aspectRatio: '4/3',
            width: '100%'
          }}>
            <MapCanvas
              targetCountry={gameState.targetCountry}
              revealedNeighbors={gameState.revealedNeighbors}
              gameStatus={gameState.status}
              difficulty={difficulty}
              allFeatures={allFeatures}
            />
          </div>

          {/* Message Alert */}
          {gameState.message && (
            <div style={{
              marginBottom: 'var(--spacing-md)',
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
                  fontWeight: '500'
                }}
              >
                {gameState.message}
              </Alert>
            </div>
          )}

          {/* Guess Input */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
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
                style={{
                  padding: '0.375rem 0.5rem',
                  backgroundColor: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: gameState.status === 'playing' ? 'pointer' : 'not-allowed',
                  opacity: gameState.status === 'playing' ? 1 : 0.5,
                  height: '38px', // Match input height
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (gameState.status === 'playing') {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                    e.currentTarget.style.color = '#ef4444';
                    e.currentTarget.style.borderColor = '#fca5a5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (gameState.status === 'playing') {
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }
                }}
              >
                Give Up
              </button>
            </div>
          </div>

          {/* Guess History */}
          <GuessHistory guesses={gameState.guessHistory} />
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'var(--color-text-muted)',
          fontSize: '0.85rem',
          animation: 'fadeIn 0.7s ease-out 0.2s both'
        }}>
          Try {gameState.guessHistory.length} • Use keyboard arrows to navigate suggestions
        </div>
      </Container>
    </div>
  );
}

export default App;
