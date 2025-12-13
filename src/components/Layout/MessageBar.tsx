interface MessageBarProps {
    status: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
    onPlayAgain: () => void;
}

const MessageBar = ({ status, message, onPlayAgain }: MessageBarProps) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '4px',
            padding: '0 4px',
            animation: 'slideIn 0.3s ease-out'
        }}>
            <span style={{
                flex: 1,
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                backgroundColor: status === 'won'
                    ? 'rgba(4, 99, 7, 0.15)'
                    : status === 'given_up'
                        ? '#fee2e2'
                        : 'rgba(4, 99, 7, 0.1)',
                border: `1px solid ${status === 'won'
                    ? '#046307'
                    : status === 'given_up'
                        ? '#fca5a5'
                        : '#046307'}`,
                color: status === 'won'
                    ? '#046307'
                    : status === 'given_up'
                        ? '#ef4444'
                        : '#046307',
                borderRadius: 'var(--radius-md)',
                fontWeight: '500',
                padding: '0 0.75rem',
                fontSize: '0.875rem',
                marginRight: '8px'
            }}>
                {message}
                {(status === 'won' || status === 'given_up') && (
                    <button
                        onClick={onPlayAgain}
                        style={{
                            padding: '2px 10px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            backgroundColor: status === 'won' ? '#046307' : '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        Play Again
                    </button>
                )}
            </span>
        </div>
    );
};

export default MessageBar;
