import React from 'react';
import { ListGroup, ListGroupItem } from 'reactstrap';
import { motion } from 'framer-motion';
import type { Guess } from '../../hooks/useGameLogic';

interface GuessHistoryProps {
    guesses: Guess[];
}

const GuessHistory: React.FC<GuessHistoryProps> = ({ guesses }) => {
    if (guesses.length === 0) {
        return null;
    }

    // Reverse the guesses to show the most recent first
    const reversedGuesses = [...guesses].reverse();

    return (
        <div className="guess-history mt-3">
            <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous Guesses</h6>
            <ListGroup flush className="d-flex flex-row flex-wrap gap-2">
                {reversedGuesses.map((guess, index) => {
                    const originalIndex = guesses.length - 1 - index;

                    return (
                        <motion.div
                            key={originalIndex}
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                        >
                            <ListGroupItem
                                className="border-0 py-2 px-3 d-flex align-items-center gap-2 shadow-sm"
                                style={{
                                    fontSize: '0.95rem',
                                    fontWeight: '500',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'var(--color-bg-elevated)',
                                    color: 'var(--color-text-primary)',
                                    border: '1px solid var(--color-border)',
                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                    cursor: 'default'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                }}
                            >
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--color-bg-secondary)',
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    marginRight: '4px'
                                }}>
                                    {originalIndex + 1}
                                </span>
                                <span style={{ color: guess.color || 'inherit' }}>
                                    {guess.name}
                                </span>

                                <span style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-secondary)',
                                    marginLeft: '4px',
                                    fontWeight: '400'
                                }}>
                                    {Math.round(guess.distance)} km
                                </span>
                            </ListGroupItem>
                        </motion.div>
                    );
                })}
            </ListGroup>
        </div>
    );
};

export default GuessHistory;
