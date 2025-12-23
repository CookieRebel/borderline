import React from 'react';

interface KeyboardProps {
    onKeyPress: (key: string) => void;
    onBackspace: () => void;
    onEnter: () => void;
    disabled?: boolean;
}

const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫']
];

const Keyboard: React.FC<KeyboardProps> = ({ onKeyPress, onBackspace, onEnter, disabled }) => {
    const handleClick = (key: string) => {
        if (disabled) return;

        if (key === '⌫') {
            onBackspace();
        } else if (key === 'ENTER') {
            onEnter();
        } else {
            onKeyPress(key.toLowerCase());
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 0',
            userSelect: 'none'
        }}>
            {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '4px'
                }}>
                    {row.map((key) => {
                        const isWideKey = key === 'ENTER' || key === '⌫';
                        return (
                            <button
                                key={key}
                                onClick={() => handleClick(key)}
                                disabled={disabled}
                                style={{
                                    minWidth: isWideKey ? '52px' : '32px',
                                    height: '42px',
                                    padding: '0 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    backgroundColor: disabled ? '#e5e7eb' : '#ffffff',
                                    color: disabled ? '#9ca3af' : '#1f2937',
                                    fontSize: isWideKey ? '11px' : '14px',
                                    fontWeight: '600',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.7 : 1,
                                    transition: 'background-color 0.1s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}
                                onTouchStart={(e) => {
                                    if (!disabled) {
                                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (!disabled) {
                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                    }
                                }}
                            >
                                {key}
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default Keyboard;
