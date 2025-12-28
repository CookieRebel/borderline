import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalBody, Button } from 'reactstrap';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import styles from './GameEndModal.module.css';
import DifficultySelector from '../Game/DifficultySelector';
import { getAssetUrl } from '../../utils/assetUtils';
import Leaderboard from '../Game/Leaderboard';

interface CountryFact {
    country: string;
    facts: string[];
}

interface GameEndModalProps {
    isOpen: boolean;
    countryName: string;
    countryCode?: string; // ISO Alpha-2 code for flag
    resultMessage: string;
    won: boolean;
    onPlayAgain: () => void;
    onClose: () => void;
}

// Convert ISO Alpha-2 code to emoji flag
const getFlag = (alpha2: string | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return '';
    return String.fromCodePoint(
        ...alpha2.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
};

const GameEndModal = ({
    isOpen,
    countryName,
    countryCode,
    resultMessage,
    won,
    onPlayAgain,
    onClose,
}: GameEndModalProps) => {
    // const { userId } = useUsername(); // Leaderboard handles this internally now
    // const { difficulty: selectedDifficulty } = useDifficulty(); // Leaderboard handles this
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

    return (
        <>
            <Modal isOpen={isOpen} centered backdrop="static">
                <ModalBody className="text-center py-4 position-relative">
                    {/* Close Button */}
                    <Button
                        color="link"
                        className="position-absolute top-0 end-0 p-3 text-muted text-decoration-none"
                        onClick={onClose}
                        aria-label="Close"
                        style={{ zIndex: 10 }}
                    >
                        <X size={18} />
                    </Button>

                    {/* Result message */}
                    <div className="mb-2 mt-2">
                        <div className={styles.resultMessage + " " + won ? 'text-dark' : 'text-muted'}>
                            {resultMessage}
                        </div>
                    </div>

                    {/* Fun Facts Carousel - only show if facts available */}
                    {countryFactsList.length > 0 && (
                        <div className="text-start mb-3 py-2 bg-light rounded position-relative">
                            <h6 className="text-dark mb-1 text-center" style={{ fontSize: '0.8rem' }}>{flag} Fun facts about {countryName}</h6>
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

                    {/* Leaderboard */}
                    {isOpen && <Leaderboard />}

                    {/* Difficulty Selector */}
                    <DifficultySelector />

                    {/* Play Again button */}
                    <Button
                        className="btn-gold px-5 py-2"
                        size="lg"
                        onClick={onPlayAgain}
                    >
                        Play Again
                    </Button>
                </ModalBody>
            </Modal>
        </>
    );
};

export default GameEndModal;
