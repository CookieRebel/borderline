import { useEffect, useRef, useState, useMemo } from 'react';
import { geoPath, geoOrthographic, geoGraticule, geoCentroid } from 'd3-geo';
import type { Feature, FeatureCollection } from 'geojson';
import countriesDataLow from '../../data/countries_low.json';
import landDataLow from '../../data/land_low.json';

const BackgroundGlobe = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [targetRotation, setTargetRotation] = useState<[number, number]>([0, 0]);
    const [currentRotation, setCurrentRotation] = useState<[number, number]>([0, 0]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Loop to pick new targets
    useEffect(() => {
        const features = (countriesDataLow as FeatureCollection).features as Feature[];

        const pickRandom = () => {
            const randomFeature = features[Math.floor(Math.random() * features.length)];
            const centroid = geoCentroid(randomFeature);
            setTargetRotation([-centroid[0], -centroid[1]]);
        };

        // Initial pick
        pickRandom();

        const interval = setInterval(pickRandom, 5000);
        return () => clearInterval(interval);
    }, []);

    // Animation Effect
    useEffect(() => {
        const duration = 2000; // 2 seconds transition
        const startTime = Date.now();
        const startRot = currentRotation;

        let frameId: number;

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Easing (InOutQuad)
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

            const nextRot: [number, number] = [
                startRot[0] + (targetRotation[0] - startRot[0]) * eased,
                startRot[1] + (targetRotation[1] - startRot[1]) * eased
            ];

            setCurrentRotation(nextRot);

            if (t < 1) {
                frameId = requestAnimationFrame(animate);
            }
        };

        frameId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameId);
    }, [targetRotation]); // Animate whenever target changes

    // Projection
    const projection = useMemo(() => {
        const minDim = Math.min(dimensions.width, dimensions.height);
        return geoOrthographic()
            .rotate([currentRotation[0], currentRotation[1], 0])
            .scale(minDim * 0.8) // 80% of screen min dimension
            .translate([dimensions.width / 2, dimensions.height / 2])
            .clipAngle(90);
    }, [currentRotation, dimensions]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        context.scale(dpr, dpr);
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;

        const pathGenerator = geoPath(projection, context);
        const graticule = geoGraticule();

        context.clearRect(0, 0, dimensions.width, dimensions.height);

        // 1. Globe Sphere (Very faint fill)
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.fillStyle = 'rgba(200, 200, 200, 0.05)';
        context.fill();

        // 2. Graticules (Faint)
        context.beginPath();
        pathGenerator(graticule());
        context.strokeStyle = 'rgba(200, 200, 200, 0.1)';
        context.lineWidth = 0.5;
        context.stroke();

        // 3. Land (Faint)
        const landFeatures = (landDataLow as FeatureCollection).features as Feature[];
        context.beginPath();
        pathGenerator({ type: 'FeatureCollection', features: landFeatures } as any);
        context.fillStyle = 'rgba(150, 150, 150, 0.1)';
        context.fill();

        // 4. Globe Outline
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.strokeStyle = 'rgba(150, 150, 150, 0.2)';
        context.lineWidth = 1;
        context.stroke();

    }, [dimensions, projection]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: -1,
                pointerEvents: 'none',
                opacity: 0.6
            }}
        />
    );
};

export default BackgroundGlobe;
