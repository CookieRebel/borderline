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
            gap: '6px',
            padding: '8px',
            backgroundColor: 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
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
                                    border: 'none',
                                    borderRadius: '4px',
                                    backgroundColor: disabled ? '#9ca3af' : '#374151',
                                    color: 'white',
                                    fontSize: isWideKey ? '11px' : '14px',
                                    fontWeight: '600',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    opacity: disabled ? 0.5 : 1,
                                    transition: 'background-color 0.1s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                onTouchStart={(e) => {
                                    if (!disabled) {
                                        e.currentTarget.style.backgroundColor = '#4b5563';
                                    }
                                }}
                                onTouchEnd={(e) => {
                                    if (!disabled) {
                                        e.currentTarget.style.backgroundColor = '#374151';
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
