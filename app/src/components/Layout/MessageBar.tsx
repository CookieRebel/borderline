import styles from './MessageBar.module.css';

interface MessageBarProps {
    status: 'loading' | 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    message: string;
}

const MessageBar = ({ status, message }: MessageBarProps) => {
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
        <div className="d-flex align-items-center justify-content-between mb-1 slide-in">
            <span
                className={`flex-grow-1 d-flex align-items-center justify-content-center gap-2 border rounded py-1 px-3 fw-medium ${getBgClass()} ${getBorderClass()} ${getTextClass()} ${styles.messageSpan}`}
            >
                12{message}
            </span>
        </div>
    );
};

export default MessageBar;
