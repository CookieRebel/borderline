import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button, Container } from 'reactstrap';
import { getAssetUrl } from '../../utils/assetUtils';
import { useUsername } from '../../hooks/useUsername';
import DifficultySelector from '../Game/DifficultySelector';
import Leaderboard from '../Game/Leaderboard';
import styles from './GameEndScreen.module.css';

interface CountryFact {
    country: string;
    facts: string[];
}

interface IProps {
    isOpen: boolean;
    countryName: string;
    countryCode?: string; // ISO Alpha-2 code for flag
    resultMessage: string;
    won: boolean;
    onPlayAgain: () => void;
    onClose: () => void;
    onLogout: () => void; // New prop for external handling
    onStatistics: () => void;
    rankMessage: string;
}

// Convert ISO Alpha-2 code to emoji flag
const getFlag = (alpha2: string | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return '';
    return String.fromCodePoint(
        ...alpha2.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
};

const GameEndScreen = ({
    isOpen,
    countryName,
    countryCode,
    resultMessage,
    won,
    onPlayAgain,
    onClose,
    onLogout,
    onStatistics,
    rankMessage
}: IProps) => {
    const { isLoggedIn } = useUsername(); // Check if logged in
    const [countryFacts, setCountryFacts] = useState<CountryFact[]>([]);

    useEffect(() => {
        fetch(getAssetUrl('/data/countryFacts.json'))
            .then(res => res.json())
            .then(data => setCountryFacts(data))
            .catch(e => console.error("Failed to load facts", e));
    }, []);

    const flag = getFlag(countryCode);

    // Get all facts for the country
    const countryFactsList = useMemo(() => {
        const countryData = countryFacts.find(
            c => c.country.toLowerCase() === countryName.toLowerCase()
        );
        return countryData?.facts || [];
    }, [countryName, countryFacts]);

    // Track current fact index
    const [factIndex, setFactIndex] = useState(0);

    // Reset index when country changes
    useEffect(() => {
        setFactIndex(0);
    }, [countryName]);

    const handlePrevFact = () => {
        setFactIndex(prev => (prev === 0 ? countryFactsList.length - 1 : prev - 1));
    };

    const handleNextFact = () => {
        setFactIndex(prev => (prev === countryFactsList.length - 1 ? 0 : prev + 1));
    };

    if (!isOpen) return null;
    // console.log("GameENdModal rankMessage", rankMessage);
    return (
        <Container className={`p-0 ${styles.gameEndContainer}`}>

            {/* Close Button */}
            {/* Top Bar: Back button + Logout */}
            <div className="d-flex justify-content-between align-items-center w-100">
                <Button
                    color="link"
                    className="ps-0 text-muted text-decoration-none"
                    onClick={onClose}
                    aria-label="Close"
                >
                    &lt;- Back to game
                </Button>

                {isLoggedIn && (
                    <Button
                        color="link"
                        className="pe-0 text-muted text-decoration-none d-flex align-items-center gap-1"
                        onClick={onLogout}
                        size="sm"
                    >
                        Log Out <LogOut size={14} />
                    </Button>
                )}
            </div>


            <div className="mb-2 mt-2">
                <div className={`${styles.resultMessage} ${won ? 'text-dark' : 'text-muted'}`}>
                    {resultMessage}
                    {rankMessage}
                </div>
            </div>

            {/* Fun Facts Carousel - only show if facts available */}
            {countryFactsList.length > 0 && (
                <div className="text-start mb-3 py-2 bg-light rounded position-relative">
                    <h6 className="text-dark mb-1 text-center" style={{ fontSize: '0.8rem' }}>{flag} Facts about {countryName}</h6>
                    <div className="d-flex align-items-center justify-content-between">
                        <Button
                            color="link"
                            className="text-dark p-0 text-decoration-none"
                            style={{ minWidth: '30px' }}
                            onClick={handlePrevFact}
                            aria-label="Previous fact"
                        >
                            <ChevronLeft size={20} />
                        </Button>

                        <div className="flex-grow-1 px-1 text-center">
                            <p className="text-muted small mb-1" style={{ fontSize: '0.75rem', lineHeight: '1.2', minHeight: '2.5em' }}>
                                {countryFactsList[factIndex]}
                            </p>
                            <small className="text-muted opacity-50" style={{ fontSize: '0.65rem' }}>
                                {factIndex + 1} / {countryFactsList.length}
                            </small>
                        </div>

                        <Button
                            color="link"
                            className="text-dark p-0 text-decoration-none"
                            style={{ minWidth: '30px' }}
                            onClick={handleNextFact}
                            aria-label="Next fact"
                        >
                            <ChevronRight size={20} />
                        </Button>
                    </div>
                </div>
            )}
            {/* Difficulty Selector */}
            <DifficultySelector />

            {/* Play Again button */}
            <div className="d-flex flex-column align-items-center">
                <Button
                    color="accent"
                    onClick={onPlayAgain}
                    className="mb-2"
                >
                    Play Again
                </Button>
                {isLoggedIn && (
                    <Button
                        color="secondary"
                        outline
                        onClick={onStatistics}
                        className="mb-2"
                    >
                        My Statistics
                    </Button>
                )}
            </div>

            {/* Leaderboard */}
            {isOpen && <Leaderboard />}

        </Container>
    );
};

export default GameEndScreen;
