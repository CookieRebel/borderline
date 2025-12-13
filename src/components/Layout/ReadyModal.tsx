import { Modal, ModalBody, Button, ButtonGroup } from 'reactstrap';
import type { Difficulty } from '../../hooks/useGameLogic';
import styles from './ReadyModal.module.css';

interface ReadyModalProps {
    message: string;
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
    onStart: () => void;
}

const ReadyModal = ({ message, difficulty, onDifficultyChange, onStart }: ReadyModalProps) => {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    const handleNoMoveClick = () => {
        alert('Coming soon!');
    };

    return (
        <Modal isOpen centered>
            <ModalBody className="text-center py-4 px-5">
                <h2 className="h4 text-dark mb-2">Ready?</h2>
                <p className="text-muted small mb-3">{message}</p>

                <div className="d-flex gap-1 justify-content-center flex-wrap mb-3">
                    <ButtonGroup size="sm">
                        {difficulties.map((level) => (
                            <Button
                                key={level}
                                outline={difficulty !== level}
                                className={`${difficulty === level ? 'btn-emerald' : ''} ${styles.difficultyBtn}`}
                                color={difficulty === level ? undefined : 'secondary'}
                                onClick={() => onDifficultyChange(level)}
                            >
                                {level}
                            </Button>
                        ))}
                        <Button
                            size="sm"
                            color="secondary"
                            outline
                            className={`opacity-75 ${styles.difficultyBtn}`}
                            onClick={handleNoMoveClick}
                        >
                            No Move
                        </Button>
                    </ButtonGroup>
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
