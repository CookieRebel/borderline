// No imports needed - using text arrow

interface InstructionsScreenProps {
    onBack: () => void;
}

const InstructionsScreen = ({ onBack }: InstructionsScreenProps) => {
    return (
        <div className="d-flex flex-column min-vh-100 px-4 py-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
            {/* Back button */}
            <button
                onClick={onBack}
                className="btn btn-link text-muted p-0 mb-3 d-inline-flex align-items-center gap-1"
                style={{ width: 'fit-content' }}
            >
                ← Back
            </button>

            {/* Logo */}
            <div className="text-center mb-4">
                <img
                    src="/borderline_logo.png"
                    alt="BorderLINE"
                    style={{ height: '60px' }}
                />
            </div>

            {/* Instructions content */}
            <div className="flex-grow-1">
                <h2 className="h4 text-dark mb-3">How to Play</h2>
                <p className="text-muted mb-4">
                    Your goal is simple: guess the country or territory from its outline.
                    Type your answer, submit, repeat until you're right—or dramatically wrong.
                </p>

                <h3 className="h5 text-dark mb-3">Difficulty Levels</h3>

                <div className="mb-3">
                    <strong className="text-success">Easy</strong>
                    <p className="text-muted small mb-2">
                        All country and territory outlines are visible. Perfect for warm-up laps and quiet confidence.
                    </p>
                </div>

                <div className="mb-3">
                    <strong className="text-warning">Medium</strong>
                    <p className="text-muted small mb-2">
                        Only continent outlines are shown. You get context, not hand-holding.
                    </p>
                </div>

                <div className="mb-3">
                    <strong className="text-danger">Hard</strong>
                    <p className="text-muted small mb-2">
                        No outlines at all. Just the target shape floating in space. Pure cartographic nerve.
                    </p>
                </div>

                <div className="mb-3">
                    <strong style={{ color: '#6f42c1' }}>Extreme</strong>
                    <p className="text-muted small mb-2">
                        No outlines, and only small islands and territories. Blink and you'll miss them.
                    </p>
                </div>

                <div className="mb-4">
                    <strong className="text-secondary">No Move</strong>
                    <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }}>Coming soon</span>
                </div>

                <h3 className="h5 text-dark mb-3">What's in the Game</h3>
                <ul className="text-muted mb-4">
                    <li>195 UN-recognised countries</li>
                    <li>2 observer states: Vatican City, Palestine</li>
                    <li>39 territories</li>
                </ul>
                <p className="text-muted small mb-4">Yes, all of them. No hiding.</p>

                <h3 className="h5 text-dark mb-3">Scoring</h3>
                <ul className="text-muted mb-3">
                    <li>Maximum score: <strong>2000 points</strong></li>
                    <li>Wrong guess: <strong>−200 points</strong></li>
                    <li>Time penalty: <strong>−10 points per second</strong></li>
                    <li>Easy mode: <strong>no time penalty</strong></li>
                </ul>
                <p className="text-muted fst-italic">Speed matters. Accuracy matters more.</p>
            </div>

            {/* Copyright */}
            <div className="text-end mt-4">
                <small className="text-muted">© 2025 Enjoy Software</small>
            </div>
        </div>
    );
};

export default InstructionsScreen;
