import { forwardRef, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import GuessInput from '../Game/GuessInput';
import type { GuessInputRef } from '../Game/GuessInput';
import Keyboard from '../Game/Keyboard';
import type { Guess } from '../../hooks/useGameLogic';
import styles from './InputBar.module.css';

interface InputBarProps {
    onGuess: (guess: string) => void;
    onGiveUp: () => void;
    disabled: boolean;
    guessHistory: Guess[];
    isMobile: boolean;
}

const InputBar = forwardRef<GuessInputRef, InputBarProps>(
    ({ onGuess, onGiveUp, disabled, guessHistory, isMobile }, ref) => {
        const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);

        const handleGiveUpClick = () => {
            setShowGiveUpConfirm(true);
        };

        const confirmGiveUp = () => {
            setShowGiveUpConfirm(false);
            onGiveUp();
        };

        return (
            <div className="mb-2 px-1">
                <div className="d-flex gap-1 align-items-start mb-2">
                    <div className={`flex-grow-1 ${styles.inputWrapper}`}>
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
                        onClick={handleGiveUpClick}
                        disabled={disabled}
                        title="Give Up"
                        className={`d-flex align-items-center justify-content-center ${styles.giveUpBtn}`}
                    >
                        ✕
                    </Button>
                </div>

                {/* Give Up Confirmation Modal */}
                <Modal
                    isOpen={showGiveUpConfirm}
                    toggle={() => setShowGiveUpConfirm(false)}
                    centered
                    size="sm"
                    className="modal-dialog-centered"
                >
                    <ModalBody className="text-center py-4">
                        <h5 className="mb-0">Give up?</h5>
                    </ModalBody>
                    <ModalFooter className="justify-content-center border-0 pt-0 pb-3">
                        <Button color="secondary" outline onClick={() => setShowGiveUpConfirm(false)} className="px-4">
                            No
                        </Button>
                        <Button color="danger" onClick={confirmGiveUp} className="px-4">
                            Yes
                        </Button>
                    </ModalFooter>
                </Modal>

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
