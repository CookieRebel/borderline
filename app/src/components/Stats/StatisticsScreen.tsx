import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Alert } from 'reactstrap';
import { ArrowLeft, TrendingUp, BarChart2, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StatisticsScreenProps {
    onBack: () => void;
    userId: string;
}

interface DailyStat {
    date: string;
    avgScore: number;
    gamesPlayed: number;
    label: string;
}

type StatsHistory = Record<string, DailyStat[]>; // 'easy' | 'medium' ... -> stats[]

const LEVELS = ['easy', 'medium', 'hard', 'extreme'] as const;
const LEVEL_LABELS: Record<string, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    extreme: 'Extreme'
};
const LEVEL_COLORS: Record<string, string> = {
    easy: '#198754',   // success
    medium: '#ffc107', // warning
    hard: '#dc3545',   // danger
    extreme: '#212529' // dark
};

const StatisticsScreen = ({ onBack, userId }: StatisticsScreenProps) => {
    const [data, setData] = useState<StatsHistory | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/stats_history');

            if (response.status === 401) {
                throw new Error('You must be logged in to view statistics.');
            }
            if (!response.ok) {
                throw new Error('Failed to fetch statistics data');
            }

            const statsData = await response.json();
            setData(statsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [userId]); // Add userId dependency

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const renderLevelCharts = (level: string) => {
        const levelData = data?.[level];
        // Only render if there is at least one game played in the history
        if (!levelData || levelData.every(d => d.gamesPlayed === 0)) return null;

        const color = LEVEL_COLORS[level] || '#6c757d';
        const label = LEVEL_LABELS[level] || level;

        return (
            <div key={level} className="mb-5">
                <div className="d-flex align-items-center mb-3">
                    <div className="badge rounded-pill me-2" style={{ backgroundColor: color, fontSize: '1rem' }}>
                        {label}
                    </div>
                </div>

                <div className="row g-4">
                    {/* Average Score Chart */}
                    <div className="col-12 col-lg-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="card-title mb-3 d-flex align-items-center">
                                    <TrendingUp size={18} className="me-2" style={{ color }} />
                                    Average Score per Game (Last 14 Days)
                                </h6>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={levelData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis />
                                        <Tooltip
                                            formatter={(value: any) => [value, 'Avg Score']}
                                            labelFormatter={(label) => `${label}`}
                                        />
                                        <Legend />
                                        <Bar dataKey="avgScore" name="Avg Score" fill={color} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Games Played Chart */}
                    <div className="col-12 col-lg-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <h6 className="card-title mb-3 d-flex align-items-center">
                                    <Activity size={18} className="me-2" style={{ color }} />
                                    Games Played (Last 14 Days)
                                </h6>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={levelData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip
                                            formatter={(value: any) => [value, 'Games']}
                                            labelFormatter={(label) => `${label}`}
                                        />
                                        <Legend />
                                        <Bar dataKey="gamesPlayed" name="Games Played" fill={color} fillOpacity={0.6} stroke={color} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center min-vh-100">
                <Spinner color="success" />
                <p className="mt-3 text-muted">Loading statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 px-4">
                <Alert color="danger" className="w-100" style={{ maxWidth: '500px' }}>
                    <h5 className="alert-heading">Error</h5>
                    <p className="mb-0">{error}</p>
                </Alert>
                <Button color="secondary" onClick={onBack} className="mt-3">
                    <ArrowLeft size={16} className="me-2" />
                    Back
                </Button>
            </div>
        );
    }

    const hasAnyData = LEVELS.some(l => data?.[l]?.some(d => d.gamesPlayed > 0));

    return (
        <div className="min-vh-100 bg-light py-4">
            <div className="container" style={{ maxWidth: '1200px' }}>
                {/* Header */}
                <div className="d-flex align-items-center mb-4">
                    <Button
                        color="link"
                        className="p-0 me-3 text-dark"
                        onClick={onBack}
                        style={{ textDecoration: 'none' }}
                    >
                        <ArrowLeft size={24} />
                    </Button>
                    <div className="flex-grow-1">
                        <h2 className="mb-0">Your Statistics</h2>
                        <p className="text-muted mb-0 small">Weekly progress tracking</p>
                    </div>
                </div>

                {!hasAnyData ? (
                    <div className="text-center py-5">
                        <BarChart2 size={48} className="text-muted mb-3" />
                        <h4>No Data Yet</h4>
                        <p className="text-muted">Play some games to see your history charts here!</p>
                    </div>
                ) : (
                    LEVELS.map(level => renderLevelCharts(level))
                )}
            </div>
        </div>
    );
};

export default StatisticsScreen;
