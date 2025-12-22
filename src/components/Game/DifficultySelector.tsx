import { useState, useRef, useEffect } from 'react';
import { Button, Toast, ToastBody } from 'reactstrap';
import { useDifficulty, type Difficulty } from '../../hooks/useDifficulty';

const DifficultySelector = () => {
    const { difficulty, setDifficulty } = useDifficulty();
    const [showNoMoveToast, setShowNoMoveToast] = useState(false);
    const [snapped, setSnapped] = useState<string | null>(null);
    const [isShaking, setIsShaking] = useState(false);

    const poingAudioRef = useRef<HTMLAudioElement | null>(null);
    const gongAudioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        const poingUrl = new URL('../../assets/poing.mp3', import.meta.url).href;
        const gongUrl = new URL('../../assets/punch.mp3', import.meta.url).href; // "Gong" variable name kept for logic, playing punch.mp3

        poingAudioRef.current = new Audio(poingUrl);
        poingAudioRef.current.preload = 'auto';
        poingAudioRef.current.load();

        gongAudioRef.current = new Audio(gongUrl);
        gongAudioRef.current.preload = 'auto';
        gongAudioRef.current.load();
    }, []);

    const playSound = (type: 'poing' | 'gong') => {
        const audio = type === 'gong' ? gongAudioRef.current : poingAudioRef.current;
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(() => { /* Ignore autoplay errors */ });
        }
    };

    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    const subtitles: Record<string, string> = {
        easy: "Learn the game.",
        medium: "Continents only. Pretty easy.",
        hard: "Brutal. No outlines.",
        extreme: "Tiny islands. Big regret.",
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
            <div className="mb-4">
                <p className="text-muted small mb-2">Select difficulty:</p>
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {difficulties.map((level) => (
                        <Button
                            key={level}
                            outline={difficulty !== level}
                            className={`${difficulty === level ? 'btn-emerald' : ''} ${level === 'extreme' && isShaking ? 'shake' : ''} d-flex flex-column align-items-center justify-content-center py-2 px-3`}
                            color={difficulty === level ? undefined : 'secondary'}
                            onClick={() => handleDifficultyClick(level)}
                            style={{
                                minWidth: '130px',
                                transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy
                                transform: snapped === level ? 'scale(0.9)' : 'scale(1)'
                            }}
                        >
                            <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{level}</span>
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>{subtitles[level]}</span>
                        </Button>
                    ))}

                    {/* No Move Button */}
                    <Button
                        color="secondary"
                        outline
                        className={`opacity-75 ${snapped === 'nomove' && isShaking ? 'shake' : ''} d-flex flex-column align-items-center justify-content-center py-2 px-3`}
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
                            minWidth: '130px',
                            transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                            transform: snapped === 'nomove' ? 'scale(0.9)' : 'scale(1)'
                        }}
                    >
                        <span style={{ fontWeight: 'bold' }}>No Move</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Pure suffering.</span>
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
