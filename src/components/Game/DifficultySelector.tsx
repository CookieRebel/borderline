import { useState } from 'react';
import { Button, ButtonGroup, Toast, ToastBody } from 'reactstrap';
import type { Difficulty } from '../../hooks/useGameLogic';

interface DifficultySelectorProps {
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
}

const DifficultySelector = ({ difficulty, onDifficultyChange }: DifficultySelectorProps) => {
    const [showNoMoveToast, setShowNoMoveToast] = useState(false);
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    return (
        <>
            <div className="mb-4">
                <p className="text-muted small mb-2">Select difficulty:</p>
                <div className="d-flex gap-1 justify-content-center flex-wrap">
                    <ButtonGroup size="sm">
                        {difficulties.map((level) => (
                            <Button
                                key={level}
                                outline={difficulty !== level}
                                className={difficulty === level ? 'btn-emerald' : ''}
                                color={difficulty === level ? undefined : 'secondary'}
                                onClick={() => onDifficultyChange(level)}
                                style={{ textTransform: 'capitalize' }}
                            >
                                {level}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            color="secondary"
                            outline
                            className="opacity-75"
                            onClick={() => {
                                setShowNoMoveToast(true);
                                setTimeout(() => setShowNoMoveToast(false), 2000);
                            }}
                        >
                            No Move
                        </Button>
                    </ButtonGroup>
                </div>
            </div>

            {/* No Move Toast */}
            <div
                className="position-fixed top-50 start-50 translate-middle"
                style={{ zIndex: 1100 }}
            >
                <Toast isOpen={showNoMoveToast} style={{ opacity: 1, backgroundColor: 'white' }}>
                    <ToastBody className="text-center">
                        New "No Move" level coming soon to BorderLINE.
                        Stay tuned!
                    </ToastBody>
                </Toast>
            </div>
        </>
    );
};

export default DifficultySelector;
