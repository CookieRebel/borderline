import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, InputGroup, ListGroup, ListGroupItem } from 'reactstrap';
import { allCountries } from '../../data/allCountries';
import type { Guess } from '../../hooks/useGameLogic';
import Keyboard from './Keyboard';

interface GuessInputProps {
    onGuess: (guess: string) => void;
    disabled: boolean;
    guessHistory: Guess[];
}

const GuessInput: React.FC<GuessInputProps> = ({ onGuess, disabled, guessHistory }) => {
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

    const updateSuggestions = (input: string) => {
        if (input.trim().length > 0) {
            const normalizedHistory = guessHistory.map(g => normalize(g.name));
            const normalizedInput = normalize(input);
            const filtered = allCountries.filter(
                country =>
                    normalize(country).includes(normalizedInput) &&
                    !normalizedHistory.includes(normalize(country))
            );
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

    // Keyboard handlers
    const handleKeyboardPress = (key: string) => {
        const newValue = value + key;
        setValue(newValue);
        updateSuggestions(newValue);
    };

    const handleKeyboardBackspace = () => {
        const newValue = value.slice(0, -1);
        setValue(newValue);
        updateSuggestions(newValue);
    };

    const handleKeyboardEnter = () => {
        // If there are suggestions, select the first one
        if (suggestions.length > 0) {
            handleSuggestionClick(suggestions[0]);
        } else {
            handleSubmit();
        }
    };

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
                        placeholder="Enter country name..."
                        value={value}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className="bg-dark text-light border-secondary"
                        autoComplete="off"
                        readOnly // Prevent native keyboard on mobile
                    />
                    <Button
                        color="primary"
                        type="submit"
                        style={{ padding: '0.375rem 0.75rem' }}
                        disabled={!canSubmit}
                    >
                        Go
                    </Button>
                </InputGroup>
            </form>

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

            {/* On-screen Keyboard */}
            <div style={{ marginTop: '12px' }}>
                <Keyboard
                    onKeyPress={handleKeyboardPress}
                    onBackspace={handleKeyboardBackspace}
                    onEnter={handleKeyboardEnter}
                    disabled={disabled}
                />
            </div>
        </div>
    );
};

export default GuessInput;
