import { useState, useEffect } from 'react';
import { Container, Button } from 'reactstrap';

interface AdScreenProps {
    onContinue: () => void;
}

const AdScreen: React.FC<AdScreenProps> = ({ onContinue }) => {
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowButton(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-white">
            <Container className="text-center">
                {/* 
                  The page is intentionally blank (white background) 
                  until the button appears. 
                  This is per the "Ad Page" requirement.
                */}

                {showButton && (
                    <div className="fixed-bottom p-4 text-center">
                        <Button
                            color="primary"
                            size="lg"
                            onClick={onContinue}
                            className="px-5"
                        >
                            Continue
                        </Button>
                    </div>
                )}
            </Container>
        </div>
    );
};

export default AdScreen;
