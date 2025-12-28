import { useState, useEffect } from 'react';
import { Button, Toast, ToastBody } from 'reactstrap';
import { useDifficulty, type Difficulty } from '../../hooks/useDifficulty';
import { AudioManager } from '../../utils/audioManager';
import styles from './DifficultySelector.module.css';

const DifficultySelector = () => {
    const { difficulty, setDifficulty } = useDifficulty();
    const [showNoMoveToast, setShowNoMoveToast] = useState(false);
    const [snapped, setSnapped] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    // Audio URLs
    const poingUrl = new URL('../../assets/poing.mp3', import.meta.url).href;
    const gongUrl = new URL('../../assets/punch.mp3', import.meta.url).href;

    // Initialize audio
    useEffect(() => {
        AudioManager.load(poingUrl);
        AudioManager.load(gongUrl);
    }, []);

    const playSound = (type: 'poing' | 'gong') => {
        const url = type === 'gong' ? gongUrl : poingUrl;
        AudioManager.play(url);
    };

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    const subtitles: Record<string, string> = {
        easy: "Learn with outlines.",
        medium: "Continents only.",
        hard: "No outlines.",
        extreme: "Tiny islands.",
    };

    const handleDifficultyClick = (level: Difficulty) => {
        setSnapped(level);
        setDifficulty(level);

        if (level === 'extreme') {
            playSound('gong');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 1000);
        } else {
            playSound('poing');
        }

        setTimeout(() => setSnapped(null), 150);
    };

    return (
        <>
            <div className="mb-4 w-100">
                <div className={styles.container}>
                    {difficulties.map((level) => (
                        <Button
                            key={level}
                            outline={difficulty !== level}
                            className={`${difficulty === level ? 'btn-emerald' : ''} ${level === 'extreme' && isShaking ? 'shake' : ''} ${styles.button}`}
                            color={difficulty === level ? undefined : 'secondary'}
                            onClick={() => handleDifficultyClick(level)}
                            style={{
                                transform: snapped === level ? 'scale(0.9)' : 'scale(1)'
                            }}
                        >
                            <div className={styles.buttonText}>
                                <div style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{level}</div>
                                <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{subtitles[level]}</div>
                            </div>
                        </Button>
                    ))}

                    {/* No Move Button */}
                    <Button
                        color="secondary"
                        outline
                        className={`opacity-75 ${snapped === 'nomove' && isShaking ? 'shake' : ''} ${styles.button}`}
                        onClick={() => {
                            playSound('gong');
                            setSnapped('nomove');
                            setIsShaking(true);
                            setShowNoMoveToast(true);
                            setTimeout(() => {
                                setShowNoMoveToast(false);
                                setSnapped(null);
                                setIsShaking(false);
                            }, 2000);
                        }}
                        style={{
                            transform: snapped === 'nomove' ? 'scale(0.9)' : 'scale(1)'
                        }}
                    >   <div className={styles.buttonText}>
                            <div style={{ fontWeight: 'bold' }}>No Move</div>
                            <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>Only zoom.</div>
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
                        New "No Move" level coming soon to BorderLINE.
                        Stay tuned!
                    </ToastBody>
                </Toast>
            </div>
        </>
    );
};

export default DifficultySelector;
