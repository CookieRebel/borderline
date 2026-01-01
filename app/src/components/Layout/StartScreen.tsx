import { useEffect, useState } from 'react';
import { Edit2 } from 'react-feather';
import { Button, Toast, ToastBody } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';
// import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { AudioManager } from '../../utils/audioManager';
import DifficultySelector from '../Game/DifficultySelector';
import BackgroundGlobe from './BackgroundGlobe';
import styles from './StartScreen.module.css';
import Leaderboard from '../Game/Leaderboard';

interface StartScreenProps {
    onPlay: () => void;
    onAnalytics: () => void;
    streak?: number;
}

const StartScreen = ({ onPlay, onAnalytics, streak = 0 }: StartScreenProps) => {
    const { username, updateUsername, userIsLoading, playedToday, isAdmin } = useUsername();
    // const { user } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSnapped, setIsSnapped] = useState(false);

    // Initialize audio
    useEffect(() => {
        const audioUrl = new URL('../../assets/poing.mp3', import.meta.url).href;
        AudioManager.load(audioUrl);

        // Add start-screen class to body
        document.body.classList.add('start-screen');
        return () => document.body.classList.remove('start-screen');
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
        <div className={styles.appContainer + " d-flex flex-column align-items-center mt-2 text-center px-4 position-relative"}>
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

            <div className={styles.startCard}>

                {/* Greeting & Streak */}
                <div className="mb-2">
                    {userIsLoading ? (
                        <div className="spinner-border spinner-border-sm text-success" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    ) : (
                        <>
                            {streak > 0 && (
                                <p className={styles.startRound}>
                                    {playedToday ? 'Continue another game ...' : `Continue your ${streak} day streak.`}
                                </p>
                            )}
                            <div className={styles.username + " h5 mb-2 d-inline-flex align-items-center"}>

                                Playing as
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
                        </>
                    )}
                </div>

                {/* Difficulty Selector */}
                <DifficultySelector />

                {/* Buttons */}
                <div className="d-flex flex-column gap-2 mb-2" style={{ width: '200px' }}>
                    <Button
                        className={"btn-accent py-2 pulse-glow " + styles.startButton}
                        size="lg"
                        onClick={handlePlayClick}
                        disabled={userIsLoading}
                        style={{
                            transform: isSnapped ? 'translateY(-5px)' : 'translateY(0)',
                            transition: 'transform 0.1s ease-in-out',
                        }}
                    >
                        Start -&gt;
                    </Button>


                    {isAdmin && (
                        <Button
                            color="primary"
                            outline
                            onClick={onAnalytics}
                        >
                            Analytics
                        </Button>
                    )}
                </div>

                <div className={"mt-2 " + styles.leaderboard}>
                    <Leaderboard />
                </div>
            </div>



        </div>
    );
};

export default StartScreen;
