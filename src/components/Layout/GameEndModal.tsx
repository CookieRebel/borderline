import { useState, useEffect } from 'react';
import { Modal, ModalBody, Button, Spinner } from 'reactstrap';
import type { Difficulty } from '../../hooks/useGameLogic';
import { useUsername } from '../../hooks/useUsername';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    display_name: string;
    total_score: number;
    games_played: number;
}

interface GameEndModalProps {
    isOpen: boolean;
    countryName: string;
    guessCount: number;
    resultMessage: string; // e.g., "That's Fantastic!"
    won: boolean;
    difficulty: Difficulty;
    onPlayAgain: () => void;
}

const GameEndModal = ({
    isOpen,
    countryName,
    guessCount,
    resultMessage,
    won,
    difficulty,
    onPlayAgain,
}: GameEndModalProps) => {
    const { userId } = useUsername();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/leaderboard?level=${difficulty}`);
                if (response.ok) {
                    const data = await response.json();
                    setLeaderboard(data.leaderboard || []);
                    setWeekStartDate(data.weekStartDate || '');
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [isOpen, difficulty]);

    return (
        <Modal isOpen={isOpen} centered backdrop="static">
            <ModalBody className="text-center py-4">
                {/* Result message */}
                <div className="mb-4">
                    <h4 className="text-dark mb-2">
                        {countryName} in {guessCount} {guessCount === 1 ? 'guess' : 'guesses'}!
                    </h4>
                    {resultMessage && (
                        <p className={won ? 'text-success fw-medium' : 'text-muted'}>
                            {resultMessage}
                        </p>
                    )}
                </div>

                {/* Play Again button */}
                <Button
                    className="btn-gold px-5 py-2 mb-4"
                    size="lg"
                    onClick={onPlayAgain}
                >
                    Play Again
                </Button>

                {/* Leaderboard */}
                <div className="text-start">
                    <h5 className="text-dark mb-3 d-flex justify-content-between align-items-center">
                        <span>Weekly Leaderboard</span>
                        <small className="text-muted fw-normal">Week of {weekStartDate}</small>
                    </h5>

                    {loading ? (
                        <div className="text-center py-3">
                            <Spinner size="sm" color="secondary" />
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <p className="text-muted text-center small">No entries yet this week</p>
                    ) : (
                        <table className="table table-sm mb-0">
                            <thead>
                                <tr className="text-muted small">
                                    <th>#</th>
                                    <th>Player</th>
                                    <th className="text-end">Score</th>
                                    <th className="text-end">Games</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((entry) => (
                                    <tr
                                        key={entry.user_id}
                                        className={entry.user_id === userId ? 'table-warning' : ''}
                                    >
                                        <td className="text-muted">{entry.rank}</td>
                                        <td>
                                            {entry.display_name}
                                            {entry.user_id === userId && (
                                                <span className="badge bg-success ms-2" style={{ fontSize: '0.65rem' }}>
                                                    You
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end fw-medium">
                                            {Number(entry.total_score).toLocaleString()}
                                        </td>
                                        <td className="text-end text-muted">{entry.games_played}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </ModalBody>
        </Modal>
    );
};

export default GameEndModal;
