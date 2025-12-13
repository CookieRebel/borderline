import { forwardRef } from 'react';
import GuessInput from '../Game/GuessInput';
import type { GuessInputRef } from '../Game/GuessInput';
import Keyboard from '../Game/Keyboard';
import type { Guess } from '../../hooks/useGameLogic';

interface InputBarProps {
    onGuess: (guess: string) => void;
    onGiveUp: () => void;
    disabled: boolean;
    guessHistory: Guess[];
    isMobile: boolean;
}

const InputBar = forwardRef<GuessInputRef, InputBarProps>(
    ({ onGuess, onGiveUp, disabled, guessHistory, isMobile }, ref) => {
        return (
            <div style={{ marginBottom: '8px', padding: '0 4px' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <GuessInput
                            ref={ref}
                            onGuess={onGuess}
                            disabled={disabled}
                            guessHistory={guessHistory}
                            isMobile={isMobile}
                        />
                    </div>
                    <button
                        onClick={onGiveUp}
                        disabled={disabled}
                        title="Give Up"
                        style={{
                            padding: '0.25rem',
                            backgroundColor: !disabled ? '#f3f4f6' : 'var(--color-bg-elevated)',
                            border: '1px solid',
                            borderColor: !disabled ? '#d1d5db' : 'var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            color: !disabled ? '#6b7280' : 'var(--color-text-secondary)',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: !disabled ? 'pointer' : 'not-allowed',
                            opacity: !disabled ? 1 : 0.4,
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
                {isMobile && ref && typeof ref !== 'function' && (
                    <Keyboard
                        onKeyPress={(key) => ref.current?.handleKeyPress(key)}
                        onBackspace={() => ref.current?.handleBackspace()}
                        onEnter={() => ref.current?.handleEnter()}
                        disabled={disabled}
                    />
                )}
            </div>
        );
    }
);

InputBar.displayName = 'InputBar';

export default InputBar;
