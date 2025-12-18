import { useState, useEffect } from 'react';
import { Button, Spinner, Alert } from 'reactstrap';
import { ArrowLeft, TrendingUp, TrendingDown, Users, Gamepad2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsScreenProps {
    onBack: () => void;
    userId: string;
}

interface PeriodStats {
    newUsers: number;
    newGames: number;
    usersChange: number;
    gamesChange: number;
}

interface PeriodData {
    label: string;
    newUsers: number;
    newGames: number;
}

interface AnalyticsData {
    daily: PeriodStats;
    weekly: PeriodStats;
    monthly: PeriodStats;
    dailyData: PeriodData[];
    weeklyData: PeriodData[];
    monthlyData: PeriodData[];
}

const AnalyticsScreen = ({ onBack, userId }: AnalyticsScreenProps) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/analytics?user_id=${userId}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch analytics data');
                }

                const analyticsData = await response.json();
                setData(analyticsData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [userId]);

    const renderStatCard = (
        title: string,
        period: PeriodStats,
        icon: React.ReactNode,
        color: string
    ) => {
        return (
            <div className="card shadow-sm h-100">
                <div className="card-body">
                    <div className="d-flex align-items-center mb-3">
                        <div className={`p-2 rounded-circle bg-${color} bg-opacity-10 me-2`}>
                            {icon}
                        </div>
                        <h5 className="card-title mb-0">{title}</h5>
                    </div>

                    <div className="row g-3">
                        <div className="col-6">
                            <div className="d-flex align-items-start">
                                <Users size={20} className="text-primary me-2 mt-1" />
                                <div>
                                    <div className="text-muted small">New Users</div>
                                    <div className="h4 mb-1">{period.newUsers}</div>
                                    <div className={`small d-flex align-items-center ${period.usersChange >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {period.usersChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        <span className="ms-1">{Math.abs(period.usersChange)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-6">
                            <div className="d-flex align-items-start">
                                <Gamepad2 size={20} className="text-success me-2 mt-1" />
                                <div>
                                    <div className="text-muted small">New Games</div>
                                    <div className="h4 mb-1">{period.newGames}</div>
                                    <div className={`small d-flex align-items-center ${period.gamesChange >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {period.gamesChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        <span className="ms-1">{Math.abs(period.gamesChange)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderChart = (title: string, data: PeriodData[], metric: 'newUsers' | 'newGames') => {
        const metricName = metric === 'newUsers' ? 'New Users' : 'New Games';
        const color = metric === 'newUsers' ? '#0d6efd' : '#28a745';

        return (
            <div className="card shadow-sm">
                <div className="card-body">
                    <h6 className="card-title mb-3">{title}</h6>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11 }}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey={metric}
                                fill={color}
                                name={metricName}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center min-vh-100">
                <Spinner color="success" />
                <p className="mt-3 text-muted">Loading analytics...</p>
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
                    Back to Start
                </Button>
            </div>
        );
    }

    if (!data) {
        return null;
    }

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
                    <div>
                        <h2 className="mb-0">Analytics Dashboard</h2>
                        <p className="text-muted mb-0 small">BorderLINE Statistics</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="row g-4 mb-4">
                    <div className="col-12 col-md-4">
                        {renderStatCard(
                            'Today',
                            data.daily,
                            <Users size={24} className="text-primary" />,
                            'primary'
                        )}
                    </div>
                    <div className="col-12 col-md-4">
                        {renderStatCard(
                            'This Week',
                            data.weekly,
                            <Users size={24} className="text-info" />,
                            'info'
                        )}
                    </div>
                    <div className="col-12 col-md-4">
                        {renderStatCard(
                            'This Month',
                            data.monthly,
                            <Users size={24} className="text-success" />,
                            'success'
                        )}
                    </div>
                </div>

                {/* Charts - New Users */}
                <h4 className="mt-4 mb-3">New Users Trends</h4>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Days', data.dailyData, 'newUsers')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Weeks', data.weeklyData, 'newUsers')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Months', data.monthlyData, 'newUsers')}
                    </div>
                </div>

                {/* Charts - New Games */}
                <h4 className="mb-3">New Games Trends</h4>
                <div className="row g-4">
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Days', data.dailyData, 'newGames')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Weeks', data.weeklyData, 'newGames')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Months', data.monthlyData, 'newGames')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsScreen;
