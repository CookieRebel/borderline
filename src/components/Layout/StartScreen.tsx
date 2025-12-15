import { useState, useEffect } from 'react';
import { Button, ButtonGroup, Toast, ToastBody } from 'reactstrap';
import { Edit2 } from 'react-feather';
import { useUsername } from '../../hooks/useUsername';
import type { Difficulty } from '../../hooks/useGameLogic';

interface StartScreenProps {
    onPlay: () => void;
    onInstructions: () => void;
    streak?: number;
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
}

const StartScreen = ({ onPlay, onInstructions, streak = 0, difficulty, onDifficultyChange }: StartScreenProps) => {
    const { username, updateUsername, loading, playedToday } = useUsername();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [showNoMoveToast, setShowNoMoveToast] = useState(false);
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard', 'extreme'];

    // Auto-dismiss error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const handleClick = () => {
        setEditValue(username);
        setIsEditing(true);
        setError(null);
    };

    const handleCommit = async () => {
        if (!editValue.trim()) {
            setIsEditing(false);
            return;
        }

        if (editValue === username) {
            setIsEditing(false);
            return;
        }

        const result = await updateUsername(editValue);

        if (result === 'taken') {
            setError(`Username "${editValue}" is already taken`);
            setIsEditing(false);
        } else if (result === false) {
            setError('Failed to update username');
            setIsEditing(false);
        } else {
            setIsEditing(false);
            setError(null);
        }
    };

    const handleBlur = () => {
        // Delay slightly to confirm if user pressed Enter (which handles its own commit)
        // or to allow existing async operations
        handleCommit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent blur from firing twice if possible
            e.currentTarget.blur(); // Trigger blur which triggers commit
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setError(null);
        }
    };

    return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center px-4 position-relative">
            {/* Error Toast */}
            {error && (
                <div className="position-fixed top-0 start-50 translate-middle-x mt-4" style={{ zIndex: 1050 }}>
                    <Toast className="bg-danger text-white">
                        <ToastBody>
                            {error}
                        </ToastBody>
                    </Toast>
                </div>
            )}

            {/* Logo */}
            <div className="mb-4">
                <img
                    src="/borderline_logo.png"
                    alt="BorderLINE"
                    style={{ height: '120px' }}
                    className="mb-3"
                />
                <p className="text-muted mb-0">Guess the country or territory from its shape</p>
            </div>

            {/* Greeting & Streak */}
            <div className="mb-4">
                {loading ? (
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                ) : (
                    <>
                        <div className="h5 text-dark mb-2 d-inline-flex align-items-center gap-2">
                            Hi,{' '}
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleBlur}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="border-0 border-bottom bg-transparent text-dark text-center fw-medium"
                                    style={{ width: '150px', outline: 'none' }}
                                />
                            ) : (
                                <span
                                    onClick={handleClick}
                                    className="d-inline-flex align-items-center gap-1"
                                    style={{ cursor: 'pointer' }}
                                    title="Click to edit"
                                >
                                    {username}
                                    <Edit2 size={14} />
                                </span>
                            )}
                            .
                        </div>
                        {streak > 0 && (
                            <p className="text-success fw-medium mb-0">
                                🔥 {playedToday ? 'Let\'s play again!' : `Let's continue your ${streak} day streak!`}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Difficulty Selector */}
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

            {/* Buttons */}
            <div className="d-flex flex-column gap-2 mb-5" style={{ width: '200px' }}>
                <Button
                    className="btn-gold py-2"
                    size="lg"
                    onClick={onPlay}
                >
                    Play
                </Button>
                <Button
                    color="secondary"
                    outline
                    disabled
                    className="opacity-50"
                >
                    Sign Up
                </Button>
                <Button
                    color="secondary"
                    outline
                    onClick={onInstructions}
                >
                    Instructions
                </Button>
            </div>

            {/* Copyright */}
            <div className="position-fixed bottom-0 end-0 p-3">
                <small className="text-muted">© 2025 Enjoy Software</small>
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
        </div>
    );
};

export default StartScreen;
