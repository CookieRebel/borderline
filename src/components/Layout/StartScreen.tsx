import { useState, useEffect } from 'react';
import { Button, Toast, ToastBody } from 'reactstrap';
import { Edit2 } from 'react-feather';
import { useUsername } from '../../hooks/useUsername';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import DifficultySelector from '../Game/DifficultySelector';

interface StartScreenProps {
    onPlay: () => void;
    onInstructions: () => void;
    onAnalytics: () => void;
    userId: string;
    streak?: number;
}

const StartScreen = ({ onPlay, onInstructions, onAnalytics, userId, streak = 0 }: StartScreenProps) => {
    const usernameData = useUsername();
    const { username, updateUsername, loading, playedToday } = usernameData;
    const { user } = useUser();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Admin user ID (hardcoded for now)
    const ADMIN_USER_ID = 'bad83e41-5d35-463d-882f-30633f5301ff';
    const isAdmin = userId === ADMIN_USER_ID;

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
            <DifficultySelector />

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
                    onClick={onInstructions}
                >
                    Instructions
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

                {/* Authentication - Temporarily Disabled
                <div className="mt-2 d-flex justify-content-center">
                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button color="dark" outline className="w-100">
                                {usernameData.isLinked ? "Sign In" : "Sign In / Sign Up"}
                            </Button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <div className="d-flex align-items-center gap-2">
                             <UserButton afterSignOutUrl="/" />
                             <span className="small text-muted">{user?.primaryEmailAddress?.emailAddress}</span>
                        </div>
                    </SignedIn>
                </div>
                */}
            </div>

            {/* Copyright */}
            <div className="position-fixed bottom-0 end-0 p-3">
                <small className="text-muted">© 2025 Enjoy Software</small>
            </div>


        </div>
    );
};

export default StartScreen;
