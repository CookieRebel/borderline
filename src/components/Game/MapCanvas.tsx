import React, { useEffect, useRef, useState, useMemo } from 'react';
import { geoPath, geoOrthographic, geoGraticule, geoCentroid, geoDistance } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import type { Feature } from 'geojson';

interface MapCanvasProps {
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    gameStatus: 'playing' | 'won' | 'lost' | 'given_up';
    difficulty: 'easy' | 'medium' | 'hard';
    allFeaturesLow: Feature[];
    allFeaturesHigh: Feature[];
    allLandLow: Feature[];
    allLandHigh: Feature[];
}

const LOD_THRESHOLD = 500; // Scale threshold for switching to high detail

const MapCanvas: React.FC<MapCanvasProps> = ({ targetCountry, revealedNeighbors, gameStatus, difficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for dimensions
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // State for projection parameters
    const [rotation, setRotation] = useState<[number, number]>([0, 0]);
    const [scale, setScale] = useState<number>(250);

    // Refs for zoom sync
    const zoomBehaviorRef = useRef<any>(null);
    const previousKRef = useRef<number>(250);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;
                setDimensions({ width: clientWidth, height: clientHeight });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial size

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initialize/Reset view when target country changes
    useEffect(() => {
        if (!targetCountry || !canvasRef.current) return;

        // 1. Calculate center rotation
        const centroid = geoCentroid(targetCountry);
        const newRotation: [number, number] = [-centroid[0], -centroid[1]];
        setRotation(newRotation);

        // 2. Calculate fit scale
        const padding = 50;
        const tempProj = geoOrthographic()
            .rotate(newRotation)
            .fitExtent(
                [[padding, padding], [dimensions.width - padding, dimensions.height - padding]],
                targetCountry
            );
        const newScale = Math.min(tempProj.scale(), 12000); // Clamp to max zoom
        setScale(newScale);

        // 3. Sync d3-zoom transform with new scale
        if (zoomBehaviorRef.current) {
            const canvas = select(canvasRef.current);
            const newTransform = zoomIdentity.scale(newScale);
            canvas.call(zoomBehaviorRef.current.transform, newTransform);
            previousKRef.current = newScale;
        }

    }, [targetCountry, dimensions.width, dimensions.height]);

    // Animate rotation to latest guess
    useEffect(() => {
        if (revealedNeighbors.length === 0 || gameStatus !== 'playing') return;

        // Get the most recent guess (last in the array)
        const latestGuess = revealedNeighbors[revealedNeighbors.length - 1];
        if (!latestGuess) return;

        const centroid = geoCentroid(latestGuess);
        const targetRotation: [number, number] = [-centroid[0], -centroid[1]];

        // Animate from current rotation to target
        const startRotation = rotation;
        const duration = 500; // 500ms animation
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - t, 3);

            const newRotation: [number, number] = [
                startRotation[0] + (targetRotation[0] - startRotation[0]) * eased,
                startRotation[1] + (targetRotation[1] - startRotation[1]) * eased
            ];
            setRotation(newRotation);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [revealedNeighbors.length]); // Only trigger when a new guess is added

    // Setup Interaction Behaviors (Zoom & Drag) - only once
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = select(canvasRef.current);

        // Store previous transform
        let previousX = 0;
        let previousY = 0;

        const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([100, 12000]) // Increased to 12000 for smaller islands
            .on('zoom', (event) => {
                const { transform, sourceEvent } = event;
                const { k, x, y } = transform;

                // Only update scale (wheel/pinch events)
                if (k !== previousKRef.current) {
                    setScale(k);
                    previousKRef.current = k;
                }

                // Only rotate on single-finger drag (not wheel or multi-touch pinch)
                const isWheelEvent = sourceEvent?.type === 'wheel';
                const isPinchGesture = sourceEvent?.touches?.length >= 2;
                const isSingleFingerDrag = !isWheelEvent && !isPinchGesture && (x !== previousX || y !== previousY);

                if (isSingleFingerDrag) {
                    const dx = x - previousX;
                    const dy = y - previousY;
                    const sensitivity = 75 / k;
                    setRotation(curr => [curr[0] + dx * sensitivity, curr[1] - dy * sensitivity]);
                }

                previousX = x;
                previousY = y;
            });

        canvas.call(zoomBehavior);
        zoomBehaviorRef.current = zoomBehavior;

        // Initialize zoom transform
        const initialTransform = zoomIdentity.scale(250);
        canvas.call(zoomBehavior.transform, initialTransform);

        return () => {
            canvas.on('.zoom', null);
        };
    }, []); // Empty dependency - only run once

    // Projection
    const projection = useMemo(() => {
        return geoOrthographic()
            .rotate([rotation[0], rotation[1], 0])
            .scale(scale)
            .translate([dimensions.width / 2, dimensions.height / 2])
            .clipAngle(90); // Clip at the visible hemisphere edge
    }, [rotation, scale, dimensions]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1;
        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        context.scale(dpr, dpr);
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;

        const pathGenerator = geoPath(projection, context);
        const graticule = geoGraticule();

        // Clear Canvas
        context.clearRect(0, 0, dimensions.width, dimensions.height);

        // 1. Globe Background (Ocean)
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.fillStyle = '#f0f9ff';
        context.fill();

        // 2. Graticules
        context.beginPath();
        pathGenerator(graticule());
        context.strokeStyle = 'rgba(229, 231, 235, 0.7)'; // #e5e7eb with opacity
        context.lineWidth = 0.5;
        context.stroke();

        // 3. Globe Outline
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.strokeStyle = 'rgba(229, 231, 235, 0.7)';
        context.lineWidth = 0.5;
        context.stroke();

        // 4. Faint World Map (Easy & Medium Mode) - with LOD switching
        if (difficulty === 'easy' || difficulty === 'medium') {
            // Choose LOD based on zoom level
            const isHighDetail = scale > LOD_THRESHOLD;

            // Easy Mode: Show Country Borders
            // Medium Mode: Show Continents (Land Mass) only
            let features = isHighDetail ? allFeaturesHigh : allFeaturesLow;
            if (difficulty === 'medium') {
                features = isHighDetail ? allLandHigh : allLandLow;
            }

            // Visibility culling: calculate actual visible angle based on zoom
            // At scale 250 (default), we see roughly the hemisphere (PI/2 radians = 90°)
            // Higher scale = smaller visible area
            // Formula: visible angle = arcsin(canvasRadius / scale)
            // Since we're on a unit sphere, canvasRadius ≈ min(width, height) / 2
            const canvasRadius = Math.min(dimensions.width, dimensions.height) / 2;
            const visibleAngle = Math.asin(Math.min(1, canvasRadius / scale));

            const viewCenter: [number, number] = [-rotation[0], -rotation[1]];

            // For continents (land data), always render them to avoid culling issues with large polygons
            // Land features typically have empty or minimal properties compared to countries
            const isLandFeature = (f: Feature) => !f.properties || Object.keys(f.properties).length === 0;

            const isFeatureVisible = (feature: Feature) => {
                const center = geoCentroid(feature);
                // Add larger buffer for features at the edge, especially at high zoom
                // Use a minimum visible angle to prevent over-aggressive culling
                const effectiveVisibleAngle = Math.max(visibleAngle + 0.5, Math.PI / 4); // At least 45 degrees
                return geoDistance(viewCenter, center) < effectiveVisibleAngle;
            };

            const visibleFeatures = features.filter(f => isLandFeature(f) || isFeatureVisible(f));

            if (visibleFeatures.length > 0) {
                context.beginPath();
                pathGenerator({ type: 'FeatureCollection', features: visibleFeatures } as any);
                context.strokeStyle = 'rgba(209, 213, 219, 0.9)'; // Same grey for both LOD levels
                context.lineWidth = 0.5;
                context.stroke();
            }
        }

        // 5. Target Country - use high-res when zoomed in
        if (targetCountry) {
            // If zoomed in, find and use high-detail version of target
            let countryToRender = targetCountry;
            if (scale > LOD_THRESHOLD) {
                // Use name for lookup, not ISO code (22 countries share ISO -99)
                const targetName = targetCountry.properties?.name;
                const highResVersion = allFeaturesHigh.find(
                    f => f.properties?.name === targetName
                );
                if (highResVersion) {
                    countryToRender = highResVersion;
                }
            }

            context.beginPath();
            pathGenerator(countryToRender);
            // Filled grey with 0.1 opacity
            context.fillStyle = 'rgba(128, 128, 128, 0.1)';
            context.fill();
            // Stroke border
            context.strokeStyle = 'rgba(6, 90, 30, 0.9)';
            context.lineWidth = 1.5;
            context.stroke();
        }

        // 6. Visible Neighbors
        revealedNeighbors.forEach(feature => {
            // Check visibility (clipping)
            // d3-geo's path generator handles clipping for drawing, 
            // but we might want to skip invisible ones for slight perf gain if needed.
            // For now, just draw them.

            context.beginPath();
            pathGenerator(feature);
            context.strokeStyle = feature.properties?.color || "#6b7280";
            context.lineWidth = 1;
            context.stroke();
        });

        // 7. Labels (Game Over)
        if (gameStatus === 'won' || gameStatus === 'given_up') {
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.lineJoin = 'round';

            // Target Label
            if (targetCountry) {
                // Check if centroid is visible (not clipped)
                const center = geoCentroid(targetCountry);
                const projected = projection(center);

                // Simple visibility check: is the point on the front hemisphere?
                // Orthographic clipping angle is 90 deg.
                // d3-geo projection returns null if clipped.

                if (projected) {
                    const [x, y] = projected;

                    // Stroke (Halo)
                    context.font = '700 14px Inter, sans-serif';
                    context.strokeStyle = 'white';
                    context.lineWidth = 3;
                    context.strokeText(targetCountry.properties?.name, x, y);

                    // Fill
                    context.fillStyle = '#065f46';
                    context.fillText(targetCountry.properties?.name, x, y);
                }
            }

            // Neighbor Labels
            context.font = '500 12px Inter, sans-serif';
            revealedNeighbors.forEach(feature => {
                const center = geoCentroid(feature);
                const projected = projection(center);

                if (projected) {
                    const [x, y] = projected;

                    context.strokeStyle = 'white';
                    context.lineWidth = 3;
                    context.strokeText(feature.properties?.name, x, y);

                    context.fillStyle = '#374151';
                    context.fillText(feature.properties?.name, x, y);
                }
            });
        }

    }, [dimensions, projection, targetCountry, revealedNeighbors, gameStatus, difficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh, scale, rotation]);

    return (
        <div ref={containerRef} className="map-container" style={{ width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ cursor: 'grab', display: 'block', width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default MapCanvas;
