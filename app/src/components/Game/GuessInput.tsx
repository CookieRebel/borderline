import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Input, Button, InputGroup, ListGroup, ListGroupItem } from 'reactstrap';
import { allCountries } from '../../data/allCountries';
import type { Guess } from '../../hooks/useGameLogic';

interface GuessInputProps {
    onGuess: (guess: string) => void;
    disabled: boolean;
    guessHistory: Guess[];
    isMobile?: boolean;
}

export interface GuessInputRef {
    handleKeyPress: (key: string) => void;
    handleBackspace: () => void;
    handleEnter: () => void;
}

const GuessInput = forwardRef<GuessInputRef, GuessInputProps>(({ onGuess, disabled, guessHistory, isMobile = false }, ref) => {
    const [value, setValue] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
                setSelectedIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Normalize text to remove diacritics (e.g., Å -> A)
    const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    // Calculate fuzzy match score with ordered priority
    const calculateMatchScore = (country: string, input: string): number => {
        const normalizedCountry = normalize(country);
        const normalizedInput = normalize(input);

        let score = 0;
        let lastMatchIndex = -1;
        let consecutiveMatches = 0;

        for (let i = 0; i < normalizedInput.length; i++) {
            const char = normalizedInput[i];
            // Find the character in the country name, starting after the last match
            const index = normalizedCountry.indexOf(char, lastMatchIndex + 1);

            if (index !== -1) {
                score += 1; // Base score for finding the character

                // Bonus for consecutive order (current match is exactly one position after previous)
                if (lastMatchIndex !== -1 && index === lastMatchIndex + 1) {
                    consecutiveMatches++;
                    score += (consecutiveMatches * 0.5); // Increasing bonus for longer strings of consecutive data
                } else {
                    consecutiveMatches = 0;
                }

                // Bonus for earlier matches (closer to start of string)
                // max bonus of 1, decreasing as position increases
                score += Math.max(0, (10 - index) / 20);

                lastMatchIndex = index;
            }
        }

        // Additional bonuses

        // Start of string match bonus
        if (normalizedCountry.startsWith(normalizedInput.charAt(0))) {
            score += 2;
        }

        // Full substring match bonus (very strong signal)
        if (normalizedCountry.includes(normalizedInput)) {
            score += 5;
        }

        return score;
    };

    const updateSuggestions = (input: string) => {
        if (input.trim().length > 0) {
            const normalizedHistory = guessHistory.map(g => normalize(g.name));

            // Filter out already guessed countries and calculate scores
            const scoredCountries = allCountries
                .filter(country => !normalizedHistory.includes(normalize(country)))
                .map(country => ({
                    name: country,
                    score: calculateMatchScore(country, input)
                }))
                .filter(item => item.score > 0) // Only show countries with at least one matching character
                .sort((a, b) => b.score - a.score); // Sort by score descending

            const filtered = scoredCountries.map(item => item.name);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = e.target.value;
        setValue(userInput);
        setSelectedIndex(-1);
        updateSuggestions(userInput);
    };

    const handleSuggestionClick = (suggestion: string) => {
        setValue(suggestion);
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSelectedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showSuggestions && suggestions.length > 0) {
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
            }
        } else if (e.key === 'Enter') {
            if (showSuggestions && selectedIndex >= 0 && selectedIndex < suggestions.length) {
                e.preventDefault();
                handleSuggestionClick(suggestions[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();

        const normalizedValue = value.trim().toLowerCase();
        const matchingCountry = allCountries.find(c => c.toLowerCase() === normalizedValue);
        const normalizedHistory = guessHistory.map(g => g.name.toLowerCase());
        const alreadyGuessed = matchingCountry && normalizedHistory.includes(matchingCountry.toLowerCase());

        if (matchingCountry && !alreadyGuessed) {
            onGuess(matchingCountry);
            setValue('');
            setSuggestions([]);
            setShowSuggestions(false);
            setSelectedIndex(-1);
        }
    };

    // Expose keyboard handlers via ref
    useImperativeHandle(ref, () => ({
        handleKeyPress: (key: string) => {
            const newValue = value + key;
            setValue(newValue);
            updateSuggestions(newValue);
        },
        handleBackspace: () => {
            const newValue = value.slice(0, -1);
            setValue(newValue);
            updateSuggestions(newValue);
        },
        handleEnter: () => {
            if (suggestions.length > 0) {
                handleSuggestionClick(suggestions[0]);
            } else {
                handleSubmit();
            }
        }
    }));

    const canSubmit = !disabled &&
        value.trim() &&
        allCountries.some(c => c.toLowerCase() === value.trim().toLowerCase()) &&
        !guessHistory.some(g => g.name.toLowerCase() === value.trim().toLowerCase());

    return (
        <div ref={wrapperRef} className="position-relative">
            <form onSubmit={handleSubmit}>
                <InputGroup>
                    <Input
                        innerRef={inputRef}
                        type="text"
                        placeholder="Enter country..."
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="bg-dark text-light border-secondary"
                        autoComplete="off"
                        readOnly={isMobile} // Prevent native keyboard on mobile only
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', height: '32px' }}
                    />
                    <Button
                        type="submit"
                        style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.875rem',
                            height: '32px',
                            backgroundColor: '#FFD700',
                            borderColor: '#FFD700',
                            color: '#1a1a1a',
                            fontWeight: '600'
                        }}
                        disabled={!canSubmit}
                    >
                        Go
                    </Button>
                </InputGroup>
            </form>

            {/* Dropdown above input */}
            {showSuggestions && suggestions.length > 0 && (
                <ListGroup className="position-absolute w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto', bottom: '100%', marginBottom: '4px' }}>
                    {suggestions.map((suggestion, index) => (
                        <ListGroupItem
                            key={index}
                            action
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-light border-secondary"
                            style={{
                                cursor: 'pointer',
                                backgroundColor: index === selectedIndex ? '#6c757d' : '#343a40'
                            }}
                        >
                            {suggestion}
                        </ListGroupItem>
                    ))}
                </ListGroup>
            )}
        </div>
    );
});

export default GuessInput;
