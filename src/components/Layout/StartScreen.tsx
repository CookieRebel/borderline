import { Button } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';

interface StartScreenProps {
    onPlay: () => void;
    streak?: number;
}

const StartScreen = ({ onPlay, streak = 0 }: StartScreenProps) => {
    const { username, loading } = useUsername();

    return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 text-center px-4">
            {/* Logo */}
            <div className="mb-4">
                <img
                    src="/borderline_logo.png"
                    alt="BorderLINE"
                    style={{ height: '120px' }}
                    className="mb-3"
                />
                <p className="text-muted mb-0">Guess the country or territory from its shape</p>
            </div>

            {/* Greeting & Streak */}
            <div className="mb-4">
                {loading ? (
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                ) : (
                    <>
                        <p className="h5 text-dark mb-2">Hi, {username}.</p>
                        {streak > 0 && (
                            <p className="text-success fw-medium mb-0">
                                🔥 Continue your {streak} day streak?
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Buttons */}
            <div className="d-flex flex-column gap-2 mb-5" style={{ width: '200px' }}>
                <Button
                    className="btn-gold py-2"
                    size="lg"
                    onClick={onPlay}
                >
                    Play
                </Button>
                <Button
                    color="secondary"
                    outline
                    disabled
                    className="opacity-50"
                >
                    Sign Up
                </Button>
                <Button
                    color="secondary"
                    outline
                    disabled
                    className="opacity-50"
                >
                    Instructions
                </Button>
            </div>

            {/* Copyright */}
            <div className="position-fixed bottom-0 end-0 p-3">
                <small className="text-muted">© 2025 Enjoy Software</small>
            </div>
        </div>
    );
};

export default StartScreen;
