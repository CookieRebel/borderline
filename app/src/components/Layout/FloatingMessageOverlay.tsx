
import styles from './FloatingMessageOverlay.module.css';

interface FloatingMessageOverlayProps {
    message: string;
}

const FloatingMessageOverlay = ({ message }: FloatingMessageOverlayProps) => {
    if (!message) return null;

    return (
        <div className={styles.overlayContainer}>
            <div key={message} className={styles.floatingMessage}>
                {message}
            </div>
        </div>
    );
};

export default FloatingMessageOverlay;
