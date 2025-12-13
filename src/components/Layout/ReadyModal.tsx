import { Modal, ModalBody, Button, ButtonGroup } from 'reactstrap';
import type { Difficulty } from '../../hooks/useGameLogic';

interface ReadyModalProps {
    message: string;
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
    onStart: () => void;
}

const ReadyModal = ({ message, difficulty, onDifficultyChange, onStart }: ReadyModalProps) => {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    return (
        <Modal isOpen centered>
            <ModalBody className="text-center py-4 px-5">
                <h2 className="h4 text-dark mb-2">Ready?</h2>
                <p className="text-muted small mb-3">{message}</p>

                {/* Difficulty Selector */}
                <div className="d-flex gap-1 justify-content-center flex-wrap mb-3">
                    <ButtonGroup size="sm">
                        {difficulties.map((level) => (
                            <Button
                                key={level}
                                outline={difficulty !== level}
                                className={difficulty === level ? 'btn-emerald' : ''}
                                color={difficulty === level ? undefined : 'secondary'}
                                onClick={() => onDifficultyChange(level)}
                                style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}
                            >
                                {level}
                            </Button>
                        ))}
                    </ButtonGroup>
                    <Button
                        disabled
                        size="sm"
                        color="secondary"
                        outline
                        className="opacity-50"
                        style={{ fontSize: '0.65rem' }}
                    >
                        No Move
                    </Button>
                </div>

                <Button
                    className="btn-gold px-5 py-2"
                    size="lg"
                    onClick={onStart}
                >
                    Go!
                </Button>
            </ModalBody>
        </Modal>
    );
};

export default ReadyModal;
