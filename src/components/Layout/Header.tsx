import { useState } from 'react';
import { useUsername } from '../../hooks/useUsername';

const Header = () => {
    const { username, updateUsername } = useUsername();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    const handleClick = () => {
        setEditValue(username);
        setIsEditing(true);
    };

    const handleBlur = () => {
        if (editValue.trim()) {
            updateUsername(editValue);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleBlur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    return (
        <div className="position-relative text-center mb-3 fade-in">
            <h1 className="h2 fw-bold mb-1 text-emerald d-inline-flex align-items-center gap-2">
                <img
                    src="/borderline_globe_small.png"
                    alt="Globe"
                    style={{ height: '1.5em' }}
                />
                BorderLINE
            </h1>
            {username && (
                <span className="position-absolute end-0 bottom-0">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="border-0 bg-transparent text-muted text-end"
                            style={{ fontSize: '0.7rem', width: '120px', outline: 'none' }}
                        />
                    ) : (
                        <span
                            onClick={handleClick}
                            className="text-muted"
                            style={{ fontSize: '0.7rem', cursor: 'pointer' }}
                            title="Click to edit"
                        >
                            {username}
                        </span>
                    )}
                </span>
            )}
        </div>
    );
};

export default Header;
