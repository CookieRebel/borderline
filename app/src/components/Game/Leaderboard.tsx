import { useState, useEffect } from 'react';
import { Spinner } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';
import { useDifficulty } from '../../hooks/useDifficulty';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    display_name: string;
    total_score: number;
    games_played: number;
}

interface LeaderboardProps {
    refreshKey?: number;
    compact?: boolean; // If true, maybe show fewer rows or simplified view?
}

const Leaderboard = ({ refreshKey = 0, compact = false }: LeaderboardProps) => {
    const { userId } = useUsername();
    const { difficulty: selectedDifficulty } = useDifficulty();
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [weekStartDate, setWeekStartDate] = useState('');

    useEffect(() => {
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
    }, [selectedDifficulty, userId, refreshKey]);

    return (
        <div className="text-start mb-4">
            <h5 className="text-dark mb-2 d-flex justify-content-between align-items-center">
                <span>Weekly Leaderboard</span>
                <small className="text-muted fw-normal" style={{ fontSize: '0.75rem' }}>Week of {weekStartDate}</small>
            </h5>

            {loading ? (
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
                            {/* Generate rows */}
                            {Array.from({ length: compact ? 6 : 11 }).map((_, rowIndex) => {
                                // 1. Determine which entry goes here
                                let entry: LeaderboardEntry | undefined;
                                let isUserRow = false;

                                // Current User's Entry from the full list (which is Top 10 + User)
                                const userEntry = leaderboard.find(e => e.user_id === userId);
                                // Check if user is ALREADY in the displayed list
                                // If compact (top 5), check if in top 5
                                const limit = compact ? 5 : 10;
                                const userInDisplayed = userEntry && leaderboard.indexOf(userEntry) < limit;

                                // Slot 0-(limit-1): Top N
                                if (rowIndex < limit) {
                                    entry = leaderboard[rowIndex];
                                }
                                // Slot limit (Nth row): User if outside top N
                                else if (rowIndex === limit) {
                                    if (!userInDisplayed && userEntry) {
                                        entry = userEntry;
                                        isUserRow = true;
                                    }
                                    // Otherwise empty
                                }

                                // If no entry for this slot, return null (do not show empty rows)
                                if (!entry) {
                                    return null;
                                }

                                // Render populated row
                                const isMe = entry.user_id === userId;
                                // Highlight user row always
                                const rowClass = isMe || isUserRow ? 'table-warning' : '';

                                // If this is the 11th row (User) and there is a gap, visually separate
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
                                            {entry.rank || '-'}
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
    );
};

export default Leaderboard;
