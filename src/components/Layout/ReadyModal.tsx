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
                            disabled
                            size="sm"
                            color="secondary"
                            outline
                            className={`opacity-50 ${styles.difficultyBtn}`}
                            title="Coming Soon!"
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
