import type { Difficulty } from '../../hooks/useGameLogic';

interface ReadyModalProps {
    message: string;
    difficulty: Difficulty;
    onDifficultyChange: (d: Difficulty) => void;
    onStart: () => void;
}

const ReadyModal = ({ message, difficulty, onDifficultyChange, onStart }: ReadyModalProps) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px 48px',
                textAlign: 'center',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#374151' }}>Ready?</h2>
                <p style={{ margin: '12px 0 20px', color: '#6b7280', fontSize: '0.9rem' }}>
                    {message}
                </p>

                {/* Difficulty Selector */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {(['easy', 'medium', 'hard', 'extreme'] as const).map((level) => (
                        <button
                            key={level}
                            onClick={() => onDifficultyChange(level)}
                            style={{
                                padding: '3px 8px',
                                fontSize: '0.65rem',
                                fontWeight: '500',
                                backgroundColor: difficulty === level ? '#046307' : '#f3f4f6',
                                color: difficulty === level ? 'white' : '#374151',
                                border: difficulty === level ? '1px solid #046307' : '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {level}
                        </button>
                    ))}
                    {/* Coming soon - greyed out */}
                    <button
                        disabled
                        style={{
                            padding: '3px 8px',
                            fontSize: '0.65rem',
                            fontWeight: '500',
                            backgroundColor: '#e5e7eb',
                            color: '#9ca3af',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'not-allowed',
                            opacity: 0.6
                        }}
                    >
                        No Move
                    </button>
                </div>

                <button
                    onClick={onStart}
                    style={{
                        padding: '12px 48px',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        backgroundColor: '#FFD700',
                        color: '#1a1a1a',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(255,215,0,0.4)'
                    }}
                >
                    Go!
                </button>
            </div>
        </div>
    );
};

export default ReadyModal;
