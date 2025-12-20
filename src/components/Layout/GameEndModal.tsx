import { useState, useEffect, useMemo, Fragment } from 'react';
import { Modal, ModalBody, Button, Spinner } from 'reactstrap';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUsername } from '../../hooks/useUsername';
import { useDifficulty } from '../../hooks/useDifficulty';
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
    onPlayAgain,
}: GameEndModalProps) => {
    const { userId } = useUsername();
    const { difficulty: selectedDifficulty } = useDifficulty();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState('');

    const flag = getFlag(countryCode);

    // Get all facts for the country
    const countryFactsList = useMemo(() => {
        const countryData = (countryFacts as CountryFact[]).find(
            c => c.country.toLowerCase() === countryName.toLowerCase()
        );
        return countryData?.facts || [];
    }, [countryName]);

    // Track current fact index
    const [factIndex, setFactIndex] = useState(0);

    // Reset index when country changes
    useEffect(() => {
        setFactIndex(0);
    }, [countryName]);

    const handlePrevFact = () => {
        setFactIndex(prev => (prev === 0 ? countryFactsList.length - 1 : prev - 1));
    };

    const handleNextFact = () => {
        setFactIndex(prev => (prev === countryFactsList.length - 1 ? 0 : prev + 1));
    };

    useEffect(() => {
        if (!isOpen) return;

        const fetchLeaderboard = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ level: selectedDifficulty });
                if (userId) params.append('user_id', userId);

                const response = await fetch(`/api/leaderboard?${params.toString()}`);
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
    }, [isOpen, selectedDifficulty, userId]);

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

                    {/* Fun Facts Carousel - only show if facts available */}
                    {countryFactsList.length > 0 && (
                        <div className="text-start mb-4 p-3 bg-light rounded">
                            <h6 className="text-dark mb-2 text-center">{flag} Fun facts about {countryName}</h6>
                            <div className="d-flex align-items-center justify-content-between">
                                <Button
                                    color="link"
                                    className="text-muted p-0"
                                    onClick={handlePrevFact}
                                    aria-label="Previous fact"
                                >
                                    <ChevronLeft size={20} />
                                </Button>

                                <div className="flex-grow-1 px-3 text-center">
                                    <p className="text-muted small mb-1" style={{ minHeight: '3em' }}>
                                        {countryFactsList[factIndex]}
                                    </p>
                                    <small className="text-muted opacity-50" style={{ fontSize: '0.7rem' }}>
                                        {factIndex + 1} / {countryFactsList.length}
                                    </small>
                                </div>

                                <Button
                                    color="link"
                                    className="text-muted p-0"
                                    onClick={handleNextFact}
                                    aria-label="Next fact"
                                >
                                    <ChevronRight size={20} />
                                </Button>
                            </div>
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
                                    {leaderboard.map((entry, index) => {
                                        const prevEntry = leaderboard[index - 1];
                                        const showSeparator = prevEntry && (entry.rank > prevEntry.rank + 1);

                                        return (
                                            <Fragment key={entry.user_id}>
                                                {showSeparator && (
                                                    <tr className="text-muted small">
                                                        <td colSpan={4} className="text-center py-1">...</td>
                                                    </tr>
                                                )}
                                                <tr
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
                                            </Fragment>
                                        );
                                    })}
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
