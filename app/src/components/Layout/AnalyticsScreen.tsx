import { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Alert } from 'reactstrap';
import { ArrowLeft, TrendingUp, TrendingDown, Users, PlayCircle, RefreshCcw } from 'react-feather';
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
    returningUsers: number;
    returningGames: number;
    unfinishedGames: number;
    unfinishedPercentage: number;
}

interface GamesByDifficulty {
    easy: number;
    medium: number;
    hard: number;
    extreme: number;
}

interface Totals {
    totalUsers: number;
    totalRegisteredUsers: number;
    totalGames: number;
    gamesByDifficulty: GamesByDifficulty;
}

interface Retention {
    averageStreak: number;
    oneDayRetention: number;
    sevenDayRetention: number;
}

interface AverageGuesses {
    overall: number;
    byDifficulty: GamesByDifficulty;
}

interface HourlyData {
    hour: number;
    newUsers: number;
    returningUsers: number;
}

interface TodayStatus {
    gamesLost: number;
    gamesLostPercentage: number;
    unfinishedGames: number;
    unfinishedPercentage: number;
}

interface AnalyticsData {
    daily: PeriodStats;
    weekly: PeriodStats;
    monthly: PeriodStats;
    dailyData: PeriodData[];
    weeklyData: PeriodData[];
    monthlyData: PeriodData[];
    hourlyActiveUsers: HourlyData[];
    todayStatus: TodayStatus;
    totals: Totals;
    retention: Retention;
    averageGuesses: AverageGuesses;
}

const AnalyticsScreen = ({ onBack, userId }: AnalyticsScreenProps) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`/api/analytics`);

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
    }, [userId]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

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
                                <PlayCircle size={20} className="text-success me-2 mt-1" />
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

    const renderHourlyChart = (data: HourlyData[]) => {
        return (
            <div className="card shadow-sm">
                <div className="card-body">
                    <h6 className="card-title mb-3">Today's Hourly Activity</h6>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="hour"
                                tickFormatter={(tick) => `${tick}:00`}
                                tick={{ fontSize: 11 }}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => `${label}:00 - ${label}:59`}
                                formatter={(value, name) => [value, name]}
                            />
                            <Legend />
                            <Bar
                                dataKey="newUsers"
                                stackId="a"
                                fill="#198754" // Green
                                name="New Users"
                            />
                            <Bar
                                dataKey="returningUsers"
                                stackId="a"
                                fill="#ffc107" // Yellow
                                name="Returning Users"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    const renderChart = (title: string, data: PeriodData[], metric: 'newUsers' | 'newGames' | 'returningUsers' | 'returningGames' | 'unfinishedGames') => {
        let metricName = '';
        let color = '';

        switch (metric) {
            case 'newUsers':
                metricName = 'New Users';
                color = '#198754'; // Green
                break;
            case 'newGames':
                metricName = 'New Games';
                color = '#dc3545'; // Red
                break;
            case 'returningUsers':
                metricName = 'Returning Users';
                color = '#ffc107'; // Yellow
                break;
            case 'returningGames':
                metricName = 'Returning Games';
                color = '#0d6efd'; // Blue
                break;
            case 'unfinishedGames':
                metricName = 'Unfinished Games';
                color = '#0dcaf0'; // Light Blue
                break;
        }

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

    const renderPercentageChart = (title: string, data: PeriodData[], color: string) => {
        // No transformation needed, data already has percentage

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
                            <YAxis unit="%" />
                            <Tooltip
                                formatter={(value: number | undefined) => [`${value}%`, 'Unfinished']}
                            />
                            <Legend />
                            <Bar
                                dataKey="unfinishedPercentage"
                                fill={color}
                                name="Unfinished Games %"
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
                    <div className="flex-grow-1">
                        <h2 className="mb-0">Analytics Dashboard</h2>
                    </div>
                    <Button
                        color="light"
                        className="d-flex align-items-center"
                        onClick={fetchAnalytics}
                        disabled={loading}
                    >
                        <RefreshCcw size={18} className={`me-2 ${loading ? 'spin-animation' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Stats Cards (Periods) */}
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

                {/* Live Status Section */}
                <div className="row g-4 mb-4">
                    <div className="col-12 col-md-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="p-2 rounded-circle bg-danger bg-opacity-10 me-2">
                                        <TrendingDown size={24} className="text-danger" />
                                    </div>
                                    <h5 className="card-title mb-0">Games Lost Today</h5>
                                </div>
                                <div className="d-flex align-items-baseline">
                                    <div className="h2 mb-0 me-2">{data.todayStatus.gamesLost}</div>
                                    <div className="text-danger fw-medium">
                                        ({data.todayStatus.gamesLostPercentage}%)
                                    </div>
                                </div>
                                <div className="text-muted small">Games ended in defeat</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-md-4">
                        <div className="card shadow-sm h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="p-2 rounded-circle bg-warning bg-opacity-10 me-2">
                                        <PlayCircle size={24} className="text-warning" />
                                    </div>
                                    <h5 className="card-title mb-0">Unfinished Games</h5>
                                </div>
                                <div className="d-flex align-items-baseline">
                                    <div className="h2 mb-0 me-2">{data.todayStatus.unfinishedGames}</div>
                                    <div className="text-warning fw-medium">
                                        ({data.todayStatus.unfinishedPercentage}%)
                                    </div>
                                </div>
                                <div className="text-muted small">Started today, not ended</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-12 col-md-4">
                        {/* Placeholder for future metric */}
                    </div>
                </div>

                {/* Hourly Activity Chart */}
                <div className="row g-4 mb-4">
                    <div className="col-12">
                        {renderHourlyChart(data.hourlyActiveUsers)}
                    </div>
                </div>


                {/* Totals Section */}
                <div className="row g-4 mb-4">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title mb-3">Overall Statistics</h5>
                                <div className="row g-4">
                                    {/* Total Users */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-primary bg-opacity-10 rounded">
                                            <Users size={32} className="text-primary mb-2" />
                                            <div className="h3 mb-0">{data.totals.totalUsers.toLocaleString()}</div>
                                            <div className="text-muted small">Total Users</div>
                                        </div>
                                    </div>

                                    {/* Total Games */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-success bg-opacity-10 rounded">
                                            <PlayCircle size={32} className="text-success mb-2" />
                                            <div className="h3 mb-0">{data.totals.totalGames.toLocaleString()}</div>
                                            <div className="text-muted small">Total Games</div>
                                        </div>
                                    </div>

                                    {/* Active Players (Registered) */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                                            <Users size={32} className="text-info mb-2" />
                                            <div className="h3 mb-0">{data.totals.totalRegisteredUsers.toLocaleString()}</div>
                                            <div className="text-muted small">Active Players</div>
                                        </div>
                                    </div>

                                    {/* Games by Difficulty */}
                                    <div className="col-12">
                                        <div className="p-3 bg-light rounded">
                                            <div className="text-muted small mb-2">Games by Difficulty</div>
                                            <div className="row g-2">
                                                <div className="col-6 col-md-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-success mb-1">Easy</div>
                                                        <div className="fw-medium">{data.totals.gamesByDifficulty.easy.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-warning mb-1">Medium</div>
                                                        <div className="fw-medium">{data.totals.gamesByDifficulty.medium.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-danger mb-1">Hard</div>
                                                        <div className="fw-medium">{data.totals.gamesByDifficulty.hard.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-md-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-dark mb-1">Extreme</div>
                                                        <div className="fw-medium">{data.totals.gamesByDifficulty.extreme.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Retention Metrics Section */}
                <div className="row g-4 mb-4">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title mb-3">User Retention Metrics</h5>
                                <div className="row g-4">
                                    {/* Average Streak */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-warning bg-opacity-10 rounded">
                                            <div className="text-warning mb-2">🔥</div>
                                            <div className="h3 mb-0">{data.retention.averageStreak}</div>
                                            <div className="text-muted small">Average Streak (days)</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                Among active users
                                            </div>
                                        </div>
                                    </div>

                                    {/* 1-Day Retention */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-info bg-opacity-10 rounded">
                                            <div className="text-info mb-2">📅</div>
                                            <div className="h3 mb-0">{data.retention.oneDayRetention}%</div>
                                            <div className="text-muted small">1-Day Retention</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                Users who return next day
                                            </div>
                                        </div>
                                    </div>

                                    {/* 7-Day Retention */}
                                    <div className="col-12 col-md-4">
                                        <div className="text-center p-3 bg-purple bg-opacity-10 rounded" style={{ backgroundColor: 'rgba(128, 0, 128, 0.1)' }}>
                                            <div className="mb-2" style={{ color: '#800080' }}>📊</div>
                                            <div className="h3 mb-0">{data.retention.sevenDayRetention}%</div>
                                            <div className="text-muted small">7-Day Retention</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                Users who return on day 7
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Average Guesses Section */}
                <div className="row g-4 mb-4">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body">
                                <h5 className="card-title mb-3">Average Guesses per Game</h5>
                                <div className="row g-4">
                                    {/* Overall Average */}
                                    <div className="col-12 col-md-6 col-lg-3">
                                        <div className="text-center p-3 bg-secondary bg-opacity-10 rounded">
                                            <div className="text-secondary mb-2">🎯</div>
                                            <div className="h3 mb-0">{data.averageGuesses.overall}</div>
                                            <div className="text-muted small">Overall Average</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                Across all difficulties
                                            </div>
                                        </div>
                                    </div>

                                    {/* By Difficulty */}
                                    <div className="col-12 col-md-6 col-lg-9">
                                        <div className="p-3 bg-light rounded">
                                            <div className="text-muted small mb-2">By Difficulty Level</div>
                                            <div className="row g-2">
                                                <div className="col-6 col-sm-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-success mb-1">Easy</div>
                                                        <div className="fw-medium">{data.averageGuesses.byDifficulty.easy} guesses</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-sm-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-warning mb-1">Medium</div>
                                                        <div className="fw-medium">{data.averageGuesses.byDifficulty.medium} guesses</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-sm-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-danger mb-1">Hard</div>
                                                        <div className="fw-medium">{data.averageGuesses.byDifficulty.hard} guesses</div>
                                                    </div>
                                                </div>
                                                <div className="col-6 col-sm-3">
                                                    <div className="text-center">
                                                        <div className="badge bg-dark mb-1">Extreme</div>
                                                        <div className="fw-medium">{data.averageGuesses.byDifficulty.extreme} guesses</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                <div className="row g-4 mb-4">
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

                {/* Charts - Returning Users */}
                <h4 className="mb-3">Returning Users Trends</h4>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Days', data.dailyData, 'returningUsers')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Weeks', data.weeklyData, 'returningUsers')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Months', data.monthlyData, 'returningUsers')}
                    </div>
                </div>

                {/* Charts - Returning Games */}
                <h4 className="mb-3">Returning User Games Trends</h4>
                <div className="row g-4 mb-4">
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Days', data.dailyData, 'returningGames')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Weeks', data.weeklyData, 'returningGames')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderChart('Last 10 Months', data.monthlyData, 'returningGames')}
                    </div>
                </div>

                {/* Charts - Unfinished Games (Percentages) */}
                <h4 className="mb-3">Unfinished Games Trends (%)</h4>
                <div className="row g-4">
                    <div className="col-12 col-lg-4">
                        {renderPercentageChart('Last 10 Days', data.dailyData, '#0dcaf0')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderPercentageChart('Last 10 Weeks', data.weeklyData, '#0dcaf0')}
                    </div>
                    <div className="col-12 col-lg-4">
                        {renderPercentageChart('Last 10 Months', data.monthlyData, '#0dcaf0')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsScreen;
