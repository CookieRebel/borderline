import { useState, useEffect } from 'react';
import { Spinner } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';
import { useDifficulty } from '../../hooks/useDifficulty';
import { getFlagFromTimezone } from '../../utils/flagUtils';
import styles from './Leaderboard.module.css';

interface LeaderboardEntry {
    rank: number;
    user_id: string;
    display_name: string;
    timezone?: string;
    total_score: number;
    games_played: number;
}

interface LeaderboardProps {
    refreshKey?: number;
    compact?: boolean;
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
            <h5 className={styles.leaderboardTitle}>
                <span>Weekly Leaderboard</span>
                <small className={styles.weekLabel}>Week of {weekStartDate}</small>
            </h5>

            {loading ? (
                <div className={styles.tableContainer}>
                    <table className={`table table-sm ${styles.table}`}>
                        <thead>
                            <tr className={styles.headerRow}>
                                <th className={styles.rankCol}>#</th>
                                <th className={styles.playerCol}>Player</th>
                                <th className={styles.scoreCol}>Score</th>
                                <th className={styles.gamesCol}>Games</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 11 }).map((_, i) => (
                                <tr key={i} className={styles.row}>
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
                <div className={styles.tableContainer}>
                    <table className={`table table-sm ${styles.table}`}>
                        <thead>
                            <tr className={styles.headerRow}>
                                <th className={styles.rankCol}>#</th>
                                <th className={styles.playerCol}>Player</th>
                                <th className={styles.scoreCol}>Score</th>
                                <th className={styles.gamesCol}>Games</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: compact ? 6 : 11 }).map((_, rowIndex) => {
                                let entry: LeaderboardEntry | undefined;
                                let isUserRow = false;

                                const userEntry = leaderboard.find(e => e.user_id === userId);
                                const limit = compact ? 5 : 10;
                                const userInDisplayed = userEntry && leaderboard.indexOf(userEntry) < limit;

                                if (rowIndex < limit) {
                                    entry = leaderboard[rowIndex];
                                }
                                else if (rowIndex === limit) {
                                    if (!userInDisplayed && userEntry) {
                                        entry = userEntry;
                                        isUserRow = true;
                                    }
                                }

                                if (!entry) {
                                    return null;
                                }

                                const isMe = entry.user_id === userId;
                                const rowClass = isMe || isUserRow ? 'table-warning' : '';
                                const isSeparatedUser = rowIndex === 10 && isUserRow;
                                const flag = entry.timezone ? getFlagFromTimezone(entry.timezone) : '';

                                return (
                                    <tr
                                        key={entry.user_id}
                                        className={`${rowClass} ${styles.row} ${isSeparatedUser ? styles.separator : ''}`}
                                    >
                                        <td className={styles.rankText}>
                                            {entry.rank || '-'}
                                        </td>
                                        <td className={`text-truncate ${styles.playerName}`}>
                                            <div className="d-flex align-items-center">
                                                {flag && <span className={styles.flag}>{flag}</span>}
                                                {entry.display_name}
                                                {isMe && <span className={styles.youLabel}>(You)</span>}
                                            </div>
                                        </td>
                                        <td className={`fw-medium ${styles.scoreCol}`}>
                                            {Number(entry.total_score).toLocaleString()}
                                        </td>
                                        <td className={`text-muted ${styles.gamesCol}`}>
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
