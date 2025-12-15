import { useState, useEffect } from 'react';
import { Toast, ToastBody } from 'reactstrap';
import { Edit2 } from 'react-feather';
import { useUsername } from '../../hooks/useUsername';
import type { Difficulty } from '../../hooks/useDifficulty';

interface HeaderProps {
    difficulty: Difficulty;
    refreshKey?: number;
}

const Header = ({ difficulty, refreshKey = 0 }: HeaderProps) => {
    const { userId, username, updateUsername } = useUsername();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [todayScore, setTodayScore] = useState(0);
    const [bestDayScore, setBestDayScore] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Auto-dismiss error after 3 seconds
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Fetch stats when userId, difficulty, or refreshKey changes
    useEffect(() => {
        const fetchStats = async () => {
            if (!userId) return;

            try {
                const response = await fetch(`/api/stats?user_id=${userId}&level=${difficulty}`);
                if (response.ok) {
                    const data = await response.json();
                    setTodayScore(data.todayScore || 0);
                    setBestDayScore(data.bestDayScore || 0);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };

        fetchStats();
    }, [userId, difficulty, refreshKey]);

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
        handleCommit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setError(null);
        }
    };

    return (
        <>
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

            <div className="position-relative text-center mb-3 mt-3 fade-in">
                <img
                    src="/borderline_logo.png"
                    alt="BorderLINE"
                    style={{ height: '50px' }}
                />
                {username && (
                    <div className="position-absolute end-0 bottom-0 text-end">
                        {/* Username with edit */}
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleBlur}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                className="border-0 bg-transparent text-muted text-end"
                                style={{ fontSize: '0.7rem', width: '120px', outline: 'none' }}
                            />
                        ) : (
                            <span
                                onClick={handleClick}
                                className="text-muted d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '0.7rem', cursor: 'pointer' }}
                                title="Click to edit"
                            >
                                {username}
                                <Edit2 size={10} />
                            </span>
                        )}
                        {/* Day scores */}
                        <div style={{ fontSize: '0.65rem' }} className="text-muted">
                            Today: {todayScore.toLocaleString()} | Best Day: {bestDayScore.toLocaleString()}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default Header;
