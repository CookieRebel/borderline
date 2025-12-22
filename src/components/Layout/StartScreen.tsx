import { useState, useEffect } from 'react';
import { Button, Toast, ToastBody } from 'reactstrap';
import { Edit2 } from 'react-feather';
import { useUsername } from '../../hooks/useUsername';
// import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import DifficultySelector from '../Game/DifficultySelector';
import styles from './StartScreen.module.css';
import BackgroundGlobe from './BackgroundGlobe';
import logo from '../../assets/borderline_logo_no_background.png';
import { AudioManager } from '../../utils/audioManager';
interface StartScreenProps {
    onPlay: () => void;
    onAnalytics: () => void;
    userId: string;
    streak?: number;
}

const StartScreen = ({ onPlay, onAnalytics, userId, streak = 0 }: StartScreenProps) => {
    const usernameData = useUsername();
    const { username, updateUsername, loading, playedToday } = usernameData;
    // const { user } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSnapped, setIsSnapped] = useState(false);

    // Admin user ID (hardcoded for now)
    const ADMIN_USER_ID = 'bad83e41-5d35-463d-882f-30633f5301ff';
    const isAdmin = userId === ADMIN_USER_ID;

    // Initialize audio
    useEffect(() => {
        const audioUrl = new URL('../../assets/poing.mp3', import.meta.url).href;
        AudioManager.load(audioUrl);
    }, []);

    const handlePlayClick = () => {
        const audioUrl = new URL('../../assets/poing.mp3', import.meta.url).href;
        AudioManager.play(audioUrl);

        setIsSnapped(true);
        setTimeout(() => setIsSnapped(false), 150);

        // Slight delay before starting game to allow animation/sound to register
        setTimeout(() => {
            onPlay();
        }, 100);
    };

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
        <div className={styles.appContainer + " d-flex flex-column align-items-center justify-content-center text-center px-4 position-relative"}>
            <BackgroundGlobe />

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

            {/* Borderline Logo */}
            <img src={logo} alt="Borderline Logo" className="mb-4" />

            {/* Greeting & Streak */}
            <div className="mb-4">
                {loading ? (
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                ) : (
                    <>
                        <div className="h5 text-dark mb-2 d-inline-flex align-items-center">
                            Hi
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleBlur}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="ms-1 border-0 border-bottom bg-transparent text-dark text-center fw-medium"
                                    style={{ width: '150px', outline: 'none' }}
                                />
                            ) : (
                                <span
                                    onClick={handleClick}
                                    className="ms-1 d-inline-flex align-items-center gap-1"
                                    style={{ cursor: 'pointer' }}
                                    title="Click to edit"
                                >
                                    {username}
                                    <Edit2 size={14} />
                                </span>
                            )}

                        </div>
                        {streak > 0 && (
                            <p className="text-success fw-medium mb-0">
                                🔥 {playedToday ? 'Ready for another round?' : `Continue your ${streak} day streak!`}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Difficulty Selector */}
            <DifficultySelector />

            {/* Buttons */}
            <div className="d-flex flex-column gap-2 mb-5" style={{ width: '200px' }}>
                <Button
                    className="btn-gold py-2 pulse-glow"
                    size="lg"
                    onClick={handlePlayClick}
                    style={{
                        transition: 'transform 0.1s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isSnapped ? 'scale(0.9)' : 'scale(1)'
                    }}
                >
                    Play Now!
                </Button>


                {isAdmin && (
                    <Button
                        color="dark"
                        outline
                        onClick={onAnalytics}
                    >
                        Analytics
                    </Button>
                )}
            </div>


        </div>
    );
};

export default StartScreen;
