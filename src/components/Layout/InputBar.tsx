import { forwardRef } from 'react';
import { Button } from 'reactstrap';
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
            <div className="mb-2 px-1">
                <div className="d-flex gap-1 align-items-start mb-2">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <GuessInput
                            ref={ref}
                            onGuess={onGuess}
                            disabled={disabled}
                            guessHistory={guessHistory}
                            isMobile={isMobile}
                        />
                    </div>
                    <Button
                        outline
                        color="secondary"
                        onClick={onGiveUp}
                        disabled={disabled}
                        title="Give Up"
                        className="d-flex align-items-center justify-content-center"
                        style={{ width: '32px', height: '32px', padding: '0.25rem' }}
                    >
                        ✕
                    </Button>
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
