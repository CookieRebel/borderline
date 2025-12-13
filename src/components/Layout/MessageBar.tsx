import { Button } from 'reactstrap';

interface MessageBarProps {
    status: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    onPlayAgain: () => void;
}

const MessageBar = ({ status, message, onPlayAgain }: MessageBarProps) => {
    const getBgClass = () => {
        if (status === 'won') return 'bg-success bg-opacity-10';
        if (status === 'given_up') return 'bg-danger bg-opacity-10';
        return 'bg-success bg-opacity-10';
    };

    const getBorderClass = () => {
        if (status === 'won') return 'border-emerald';
        if (status === 'given_up') return 'border-danger';
        return 'border-emerald';
    };

    const getTextClass = () => {
        if (status === 'won') return 'text-emerald';
        if (status === 'given_up') return 'text-danger';
        return 'text-emerald';
    };

    return (
        <div className="d-flex align-items-center justify-content-between mb-1 px-1 slide-in">
            <span
                className={`flex-grow-1 d-flex align-items-center justify-content-center gap-2 border rounded py-1 px-3 fw-medium me-2 ${getBgClass()} ${getBorderClass()} ${getTextClass()}`}
                style={{ height: '28px', fontSize: '0.875rem' }}
            >
                {message}
                {(status === 'won' || status === 'given_up') && (
                    <Button
                        size="sm"
                        className={status === 'won' ? 'btn-emerald' : 'btn-danger'}
                        onClick={onPlayAgain}
                        style={{ padding: '2px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                        Play Again
                    </Button>
                )}
            </span>
        </div>
    );
};

export default MessageBar;
