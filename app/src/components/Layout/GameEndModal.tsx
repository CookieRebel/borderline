import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalBody, Button, Spinner } from 'reactstrap';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useUsername } from '../../hooks/useUsername';
import { useDifficulty } from '../../hooks/useDifficulty';

import DifficultySelector from '../Game/DifficultySelector';
import { getAssetUrl } from '../../utils/assetUtils';

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
    onClose: () => void;
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
    onClose,
}: GameEndModalProps) => {
    const { userId } = useUsername();
    const { difficulty: selectedDifficulty } = useDifficulty();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState('');


    const [countryFacts, setCountryFacts] = useState<CountryFact[]>([]);

    useEffect(() => {
        fetch(getAssetUrl('/data/countryFacts.json'))
            .then(res => res.json())
            .then(data => setCountryFacts(data))
            .catch(e => console.error("Failed to load facts", e));
    }, []);

    const flag = getFlag(countryCode);

    // Get all facts for the country
    const countryFactsList = useMemo(() => {
        const countryData = countryFacts.find(
            c => c.country.toLowerCase() === countryName.toLowerCase()
        );
        return countryData?.facts || [];
    }, [countryName, countryFacts]);

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
                <ModalBody className="text-center py-4 position-relative">
                    {/* Close Button */}
                    <Button
                        color="link"
                        className="position-absolute top-0 end-0 p-3 text-muted text-decoration-none"
                        onClick={onClose}
                        aria-label="Close"
                        style={{ zIndex: 10 }}
                    >
                        <X size={24} />
                    </Button>

                    {/* Result message */}
                    <div className="mb-4 mt-2">
                        <h4 className={won ? 'text-dark' : 'text-muted'}>
                            {resultMessage}
                        </h4>
                    </div>

                    {/* Fun Facts Carousel - only show if facts available */}
                    {countryFactsList.length > 0 && (
                        <div className="text-start mb-3 py-2 bg-light rounded position-relative">
                            <h6 className="text-dark mb-1 text-center" style={{ fontSize: '0.8rem' }}>{flag} Fun facts about {countryName}</h6>
                            <div className="d-flex align-items-center justify-content-between">
                                <Button
                                    color="link"
                                    className="text-dark p-0 text-decoration-none"
                                    style={{ minWidth: '30px' }}
                                    onClick={handlePrevFact}
                                    aria-label="Previous fact"
                                >
                                    <ChevronLeft size={20} />
                                </Button>

                                <div className="flex-grow-1 px-1 text-center">
                                    <p className="text-muted small mb-1" style={{ fontSize: '0.75rem', lineHeight: '1.2', minHeight: '2.5em' }}>
                                        {countryFactsList[factIndex]}
                                    </p>
                                    <small className="text-muted opacity-50" style={{ fontSize: '0.65rem' }}>
                                        {factIndex + 1} / {countryFactsList.length}
                                    </small>
                                </div>


                                <Button
                                    color="link"
                                    className="text-dark p-0 text-decoration-none"
                                    style={{ minWidth: '30px' }}
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
                        <h5 className="text-dark mb-2 d-flex justify-content-between align-items-center">
                            <span>Weekly Leaderboard</span>
                            <small className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Week of {weekStartDate}</small>
                        </h5>

                        {loading ? (
                            <div className="table-responsive">
                                {/* Use same table structure for loading state to maintain exact layout */}
                                <table className="table table-sm mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr className="text-muted border-bottom">
                                            <th style={{ width: '15%' }} className="ps-2">#</th>
                                            <th style={{ width: '45%' }}>Player</th>
                                            <th className="text-end" style={{ width: '20%' }}>Score</th>
                                            <th className="text-end pe-2" style={{ width: '20%' }}>Games</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Render 11 empty/skeleton rows */}
                                        {Array.from({ length: 11 }).map((_, i) => (
                                            <tr key={i} style={{ height: '31px' }}>
                                                {i === 5 ? (
                                                    <td colSpan={4} className="text-center">
                                                        <Spinner size="sm" color="secondary" />
                                                    </td>
                                                ) : (
                                                    <td colSpan={4}>&nbsp;</td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-sm mb-0 align-middle" style={{ fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr className="text-muted border-bottom">
                                            <th style={{ width: '15%' }} className="ps-2">#</th>
                                            <th style={{ width: '45%' }}>Player</th>
                                            <th className="text-end" style={{ width: '20%' }}>Score</th>
                                            <th className="text-end pe-2" style={{ width: '20%' }}>Games</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Generate exactly 11 rows */}
                                        {Array.from({ length: 11 }).map((_, rowIndex) => {
                                            // 1. Determine which entry goes here
                                            let entry: LeaderboardEntry | undefined;
                                            let isUserRow = false;

                                            // Recalculate ranks for the whole raw list first (handling ties)
                                            const rankedConnect = (() => {
                                                const withRanks: (LeaderboardEntry & { calculatedRank: number })[] = [];
                                                let currentRank = 1;

                                                leaderboard.forEach((item, idx) => {
                                                    if (idx > 0) {
                                                        const prev = leaderboard[idx - 1];
                                                        // If score is different, rank catches up to index + 1
                                                        if (item.total_score < prev.total_score) {
                                                            currentRank = idx + 1;
                                                        }
                                                        // If score is same, rank stays calculating (1, 2, 2, 4...) is WRONG?
                                                        // Standard: 1, 2, 2, 4. 
                                                        // Logic above: 1 (idx 0). Next (idx 1) same score -> rank 1. 
                                                        // Next (idx 2) lower score -> rank 3 (idx+1). Correct.
                                                    }
                                                    withRanks.push({ ...item, calculatedRank: currentRank });
                                                });
                                                return withRanks;
                                            })();

                                            // Current User's Entry from the full list
                                            const userEntry = rankedConnect.find(e => e.user_id === userId);
                                            const userInTop10 = userEntry && rankedConnect.indexOf(userEntry) < 10;

                                            // Slot 0-9: Top 10
                                            if (rowIndex < 10) {
                                                entry = rankedConnect[rowIndex];
                                            }
                                            // Slot 10 (11th row): User if outside top 10
                                            else if (rowIndex === 10) {
                                                if (!userInTop10 && userEntry) {
                                                    entry = userEntry;
                                                    isUserRow = true;
                                                }
                                                // Otherwise empty
                                            }

                                            // If no entry for this slot, render empty row to maintain height
                                            if (!entry) {
                                                return (
                                                    <tr key={`empty-${rowIndex}`} style={{ height: '31px' }}>
                                                        <td colSpan={4}>&nbsp;</td>
                                                    </tr>
                                                );
                                            }

                                            // Render populated row
                                            const isMe = entry.user_id === userId;
                                            // Highlight user row always
                                            const rowClass = isMe || isUserRow ? 'table-warning' : '';

                                            // If this is the 11th row (User) and there is a gap, visually separate?
                                            // User requested "remove ... row", just standard grid.
                                            // But if I am Rank 55 at row 11, it might look like Rank 11 without a separator line.
                                            // I'll add a thicker top border for the 11th row if it's the user specific row
                                            const isSeparatedUser = rowIndex === 10 && isUserRow;

                                            return (
                                                <tr
                                                    key={entry.user_id}
                                                    className={rowClass}
                                                    style={{
                                                        height: '31px', // Fixed height (~31px matches small font)
                                                        borderTop: isSeparatedUser ? '2px solid #dee2e6' : undefined
                                                    }}
                                                >
                                                    <td className="ps-2 text-muted fw-bold">
                                                        {(entry as any).calculatedRank}
                                                    </td>
                                                    <td className="text-truncate" style={{ maxWidth: '120px' }}>
                                                        {entry.display_name}
                                                        {isMe && <span className="fw-bold ms-1 text-dark">(You)</span>}
                                                    </td>
                                                    <td className="text-end fw-medium">
                                                        {Number(entry.total_score).toLocaleString()}
                                                    </td>
                                                    <td className="text-end pe-2 text-muted">
                                                        {entry.games_played}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
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
