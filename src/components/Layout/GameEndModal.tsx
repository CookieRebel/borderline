import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalBody, Button, Spinner } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';
import countryFacts from '../../data/countryFacts.json';
import DifficultySelector from '../Game/DifficultySelector';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    display_name: string;
    total_score: number;
    games_played: number;
}

interface CountryFact {
    country: string;
    facts: string[];
}

interface GameEndModalProps {
    isOpen: boolean;
    countryName: string;
    countryCode?: string; // ISO Alpha-2 code for flag
    resultMessage: string;
    won: boolean;
    difficulty: string; // For leaderboard query
    onPlayAgain: () => void;
}

// Convert ISO Alpha-2 code to emoji flag
const getFlag = (alpha2: string | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return '';
    return String.fromCodePoint(
        ...alpha2.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
};

const GameEndModal = ({
    isOpen,
    countryName,
    countryCode,
    resultMessage,
    won,
    difficulty,
    onPlayAgain,
}: GameEndModalProps) => {
    const { userId } = useUsername();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState('');

    const flag = getFlag(countryCode);

    // Pick a random fact for the country
    const randomFact = useMemo(() => {
        const countryData = (countryFacts as CountryFact[]).find(
            c => c.country.toLowerCase() === countryName.toLowerCase()
        );
        if (!countryData || countryData.facts.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * countryData.facts.length);
        return countryData.facts[randomIndex];
    }, [countryName]);

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
        <>
            <Modal isOpen={isOpen} centered backdrop="static">
                <ModalBody className="text-center py-4">
                    {/* Result message */}
                    <div className="mb-4">
                        <h4 className={won ? 'text-dark' : 'text-muted'}>
                            {resultMessage}
                        </h4>
                    </div>

                    {/* Fun Fact Section - only show if facts available */}
                    {randomFact && (
                        <div className="text-start mb-4 p-3 bg-light rounded">
                            <h6 className="text-dark mb-2">{flag} Fun fact about {countryName}</h6>
                            <p className="text-muted small mb-0">
                                {randomFact}
                            </p>
                        </div>
                    )}

                    {/* Leaderboard */}
                    <div className="text-start mb-4">
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

                    {/* Difficulty Selector */}
                    <DifficultySelector />

                    {/* Play Again button */}
                    <Button
                        className="btn-gold px-5 py-2"
                        size="lg"
                        onClick={onPlayAgain}
                    >
                        Play Again
                    </Button>
                </ModalBody>
            </Modal>
        </>
    );
};

export default GameEndModal;
