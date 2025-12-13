import { useState } from 'react';
import { Button } from 'reactstrap';
import { Edit2 } from 'react-feather';
import { useUsername } from '../../hooks/useUsername';

interface StartScreenProps {
    onPlay: () => void;
    onInstructions: () => void;
    streak?: number;
}

const StartScreen = ({ onPlay, onInstructions, streak = 0 }: StartScreenProps) => {
    const { username, updateUsername, loading, playedToday } = useUsername();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const handleClick = () => {
        setEditValue(username);
        setIsEditing(true);
    };

    const handleBlur = () => {
        if (editValue.trim()) {
            updateUsername(editValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center px-4">
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
                                🔥 {playedToday ? 'Playing again today?' : `Continue your ${streak} day streak?`}
                            </p>
                        )}
                    </>
                )}
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
        </div>
    );
};

export default StartScreen;
