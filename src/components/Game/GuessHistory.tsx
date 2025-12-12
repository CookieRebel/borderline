import React, { useState } from 'react';
import type { Guess } from '../../hooks/useGameLogic';

interface GuessHistoryProps {
    guesses: Guess[];
    onGuessClick?: (guessName: string) => void;
    onCenterClick?: () => void;
}

const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses, onGuessClick, onCenterClick }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    if (guesses.length === 0) {
        return null;
    }

    // Reverse the guesses to show the most recent first
    const reversedGuesses = [...guesses].reverse();

    return (
        <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            zIndex: 100,
            maxWidth: '180px'
        }}>
            {/* Button row */}
            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                {/* Re-Centre button */}
                <button
                    onClick={onCenterClick}
                    title="Re-Centre on target"
                    style={{
                        padding: '4px 8px',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    ⌖
                </button>
                {/* Toggle button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                >
                    Guesses ({guesses.length})
                    <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                        ▾
                    </span>
                </button>
            </div>

            {/* Collapsible list */}
            {isExpanded && (
                <div style={{
                    marginTop: '4px',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    maxHeight: '150px',
                    overflowY: 'auto'
                }}>
                    {reversedGuesses.map((guess, index) => {
                        const originalIndex = guesses.length - 1 - index;
                        return (
                            <div
                                key={originalIndex}
                                onClick={() => onGuessClick?.(guess.name)}
                                style={{
                                    padding: '3px 6px',
                                    fontSize: '0.65rem',
                                    borderBottom: index < reversedGuesses.length - 1 ? '1px solid #f3f4f6' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: onGuessClick ? 'pointer' : 'default',
                                    transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={(e) => onGuessClick && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
                                onMouseLeave={(e) => onGuessClick && (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                <span style={{
                                    width: '14px',
                                    height: '14px',
                                    borderRadius: '50%',
                                    backgroundColor: '#f3f4f6',
                                    color: '#6b7280',
                                    fontSize: '0.55rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    {originalIndex + 1}
                                </span>
                                <span style={{
                                    color: guess.color || '#374151',
                                    fontWeight: '500',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1
                                }}>
                                    {guess.name}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default GuessHistory;
