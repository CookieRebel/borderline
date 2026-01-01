import { Button, Toast, ToastBody } from 'reactstrap';
import { useDifficulty, type Difficulty } from '../../hooks/useDifficulty';
import styles from './DifficultySelector.module.css';
import { useState } from 'react';

const DifficultySelector = () => {
    const { difficulty, setDifficulty } = useDifficulty();
    const [showNoMoveToast, setShowNoMoveToast] = useState(false);

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    const subtitles: Record<string, string> = {
        easy: "Country outlines.",
        medium: "Continents only.",
        hard: "No outlines.",
        extreme: "Tiny islands.",
    };

    const handleDifficultyClick = (level: Difficulty) => {
        setDifficulty(level);

    };

    return (
        <>
            <div className="mb-4 w-100">
                <div className={styles.container}>
                    {difficulties.map((level) => (
                        <Button
                            key={level}
                            outline={difficulty !== level}
                            className={`${difficulty === level ? 'btn-gray' : ''} ${styles.button}`}
                            color={"primary"}
                            onClick={() => handleDifficultyClick(level)}
                        >
                            <div className={styles.buttonText}>
                                <div style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{level}</div>
                                <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{subtitles[level]}</div>
                            </div>
                        </Button>
                    ))}

                    {/* Impossible Button */}
                    <Button
                        color="primary"
                        outline
                        className={`opacity-75 ${styles.button}`}
                        onClick={() => {
                            setShowNoMoveToast(true);
                            setTimeout(() => {
                                setShowNoMoveToast(false);
                            }, 2000);
                        }}
                    >   <div className={styles.buttonText}>
                            <div style={{ fontWeight: 'bold' }}>Impossible</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>No move, no zoom.</div>
                        </div>
                    </Button>
                </div>
            </div>

            {/* No Move Toast */}
            <div
                className="position-fixed top-50 start-50 translate-middle"
                style={{ zIndex: 1100, marginTop: '-100px' }}
            >
                <Toast isOpen={showNoMoveToast} style={{ opacity: 1, backgroundColor: 'white' }}>
                    <ToastBody className="text-center">
                        "Impossible" level coming soon to Borderline.
                    </ToastBody>
                </Toast>
            </div>
        </>
    );
};

export default DifficultySelector;
