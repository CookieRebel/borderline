import { useState, useEffect, useRef } from 'react';
import { Container, Button } from 'reactstrap';

interface AdScreenProps {
    onContinue: () => void;
}

declare global {
    interface Window {
        adsbygoogle?: unknown[];
    }
}

const AdScreen: React.FC<AdScreenProps> = ({ onContinue }) => {
    const [isButtonEnabled, setIsButtonEnabled] = useState(false);
    const adRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.warn("AdSense failed to load", e);
        }
    }, []);
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsButtonEnabled(true);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-white">
            <Container className="text-center">
                <div className="ad-container" ref={adRef}>
                    <ins className="adsbygoogle"
                        style={{ display: "block" }}
                        data-ad-client="ca-pub-3667383077241340"
                        data-ad-slot="3324187743"
                        data-ad-format="auto"
                        data-full-width-responsive="true"></ins>
                </div>


                <div className="fixed-bottom p-4 text-center">
                    <Button
                        color="primary"
                        onClick={onContinue}
                        className="px-5"
                        disabled={!isButtonEnabled}
                    >
                        Continue
                    </Button>
                </div>
            </Container>
        </div>
    );
};

export default AdScreen;
