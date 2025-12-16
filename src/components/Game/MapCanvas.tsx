import { useEffect, useRef, useState, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { geoPath, geoOrthographic, geoGraticule, geoCentroid, geoDistance } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import type { Feature } from 'geojson';

interface MapCanvasProps {
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    gameStatus: 'ready' | 'playing' | 'won' | 'lost' | 'given_up';
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    allFeaturesLow: Feature[];
    allFeaturesHigh: Feature[];
    allLandLow: Feature[];
    allLandHigh: Feature[];
}

export interface MapCanvasRef {
    rotateToCountry: (countryName: string) => void;
    centerOnTarget: () => void;
}

const LOD_THRESHOLD = 500; // Scale threshold for switching to high detail

// Convert ISO Alpha-2 code to emoji flag
const getFlag = (alpha2: string | undefined): string => {
    if (!alpha2 || alpha2.length !== 2) return '';
    return String.fromCodePoint(
        ...alpha2.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
    );
};

const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(({ targetCountry, revealedNeighbors, gameStatus, difficulty, allFeaturesLow, allFeaturesHigh, allLandLow, allLandHigh }, ref) => {
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

    // Preloaded swoosh audio for instant playback
    const swooshAudioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        swooshAudioRef.current = new Audio('/swoosh.mp3');
        swooshAudioRef.current.volume = 0.2;
    }, []);

    const playSwoosh = useCallback(() => {
        if (swooshAudioRef.current) {
            swooshAudioRef.current.currentTime = 0;
            swooshAudioRef.current.play().catch(() => { });
        }
    }, []);

    // Animation helper function
    const animateToCountry = useCallback((country: Feature, shouldPlaySwoosh: boolean = true) => {
        const centroid = geoCentroid(country);
        const targetRotation: [number, number] = [-centroid[0], -centroid[1]];

        // Check if we actually need to move (threshold of 1 degree)
        const rotationDiff = Math.abs(rotation[0] - targetRotation[0]) + Math.abs(rotation[1] - targetRotation[1]);
        const needsToMove = rotationDiff > 1;

        // Only play swoosh sound if we're actually moving
        if (shouldPlaySwoosh && needsToMove) {
            playSwoosh();
        }

        // Skip animation if we're already centered
        if (!needsToMove) return;

        // Animate from current rotation to target
        const startRotation = rotation;
        const duration = 700;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

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
    }, [rotation]);

    // Expose rotateToCountry via ref
    useImperativeHandle(ref, () => ({
        rotateToCountry: (countryName: string) => {
            // Play swoosh and animate
            playSwoosh();
            const country = allFeaturesLow.find(f => f.properties?.name === countryName);
            if (country) {
                animateToCountry(country, false); // false to avoid double swoosh
            }
        },
        centerOnTarget: () => {
            if (targetCountry) {
                playSwoosh();
                animateToCountry(targetCountry, false);
            }
        }
    }), [allFeaturesLow, animateToCountry, targetCountry, playSwoosh]);

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

    // Initialize/Reset view when target country changes (new game)
    useEffect(() => {
        if (!targetCountry || !canvasRef.current) return;
        // Only center when dimensions are valid
        if (dimensions.width <= 100 || dimensions.height <= 100) return;

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
        const newScale = Math.min(tempProj.scale(), 20000); // Clamp to max zoom
        setScale(newScale);
        previousKRef.current = newScale;

        // 3. Sync d3-zoom transform with new scale (reset to origin)
        if (zoomBehaviorRef.current && canvasRef.current) {
            const canvas = select(canvasRef.current);
            const newTransform = zoomIdentity.scale(newScale);
            canvas.call(zoomBehaviorRef.current.transform, newTransform);
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

        // Play swoosh sound using preloaded audio
        playSwoosh();

        // Animate from current rotation to target
        const startRotation = rotation;
        const duration = 700; // 700ms animation for smoother effect
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease-in-out cubic: slow start, fast middle, slow end
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

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

    // Center on target when game ends (won or given up) - no swoosh
    useEffect(() => {
        if ((gameStatus === 'won' || gameStatus === 'given_up') && targetCountry) {
            animateToCountry(targetCountry, false);
        }
    }, [gameStatus]);

    // Setup Interaction Behaviors (Zoom & Drag) - only once
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = select(canvasRef.current);

        // Store previous transform
        let previousX = 0;
        let previousY = 0;

        const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([100, 20000]) // Increased to 20000 for smaller islands
            .on('zoom', (event) => {
                const { transform, sourceEvent } = event;
                const { k, x, y } = transform;

                // Only update scale (wheel/pinch events)
                if (k !== previousKRef.current) {
                    setScale(k);
                    previousKRef.current = k;
                }

                // Skip rotation update for programmatic transforms (no sourceEvent)
                // This prevents overwriting rotation when we center on a new target
                if (!sourceEvent) {
                    previousX = x;
                    previousY = y;
                    return;
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
        context.strokeStyle = 'rgba(229, 231, 235, 1)'; // #e5e7eb with opacity
        context.lineWidth = 0.5;
        context.stroke();

        // 2.5 Equator
        context.beginPath();
        // Generate equator coordinates (densely sampled to ensure smooth curve)
        const equatorCoords = [];
        for (let lng = -180; lng <= 180; lng += 2) {
            equatorCoords.push([lng, 0]);
        }
        pathGenerator({ type: 'LineString', coordinates: equatorCoords } as any);
        context.strokeStyle = 'rgba(229, 231, 235, 1)'; // Same color as graticules
        context.lineWidth = 1.5; // Thicker
        context.stroke();

        // 3. Globe Outline
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.strokeStyle = 'rgba(229, 231, 235, 1)';
        context.lineWidth = 0.5;
        context.stroke();

        // 4. Faint World Map (Easy & Medium Mode) - with LOD switching
        if (difficulty === 'easy' || difficulty === 'medium') {
            const isHighDetail = scale > LOD_THRESHOLD;
            const viewCenter: [number, number] = [-rotation[0], -rotation[1]];
            const canvasRadius = Math.min(dimensions.width, dimensions.height) / 2;
            const visibleAngle = Math.asin(Math.min(1, canvasRadius / scale));

            // Visibility culling function
            const isLandFeature = (f: Feature) => !f.properties || Object.keys(f.properties).length === 0;
            const isFeatureVisible = (feature: Feature) => {
                const center = geoCentroid(feature);
                const effectiveVisibleAngle = Math.max(visibleAngle + 0.5, Math.PI / 4);
                return geoDistance(viewCenter, center) < effectiveVisibleAngle;
            };

            // EASY MODE: Fill Land + Stroke Borders
            if (difficulty === 'easy') {
                // 1. Fill Land Mass
                const landFeatures = isHighDetail ? allLandHigh : allLandLow;
                // Land features are usually few and large, render all or filter
                const visibleLand = landFeatures.filter(f => isLandFeature(f) || isFeatureVisible(f));

                if (visibleLand.length > 0) {
                    context.beginPath();
                    pathGenerator({ type: 'FeatureCollection', features: visibleLand } as any);
                    context.fillStyle = '#f3f4f6'; // Gray-100
                    context.fill();
                }

                // 2. Stroke Country Borders
                const borderFeatures = isHighDetail ? allFeaturesHigh : allFeaturesLow;
                const visibleBorders = borderFeatures.filter(f => isFeatureVisible(f));

                if (visibleBorders.length > 0) {
                    context.beginPath();
                    pathGenerator({ type: 'FeatureCollection', features: visibleBorders } as any);
                    context.strokeStyle = '#d1d5db'; // Gray-300
                    context.lineWidth = 0.5;
                    context.stroke();
                }
            }
            // MEDIUM MODE: Stroke Land Mass (Continents) only
            else if (difficulty === 'medium') {
                const landFeatures = isHighDetail ? allLandHigh : allLandLow;
                const visibleLand = landFeatures.filter(f => isLandFeature(f) || isFeatureVisible(f));

                if (visibleLand.length > 0) {
                    context.beginPath();
                    pathGenerator({ type: 'FeatureCollection', features: visibleLand } as any);
                    context.strokeStyle = 'rgba(209, 213, 219, 1)';
                    context.lineWidth = 0.5;
                    context.stroke();
                }
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
            // Filled red with 10% opacity
            context.fillStyle = 'rgba(239, 68, 68, 0.1)';
            context.fill();
            // Stroke border in red
            context.strokeStyle = 'rgba(220, 38, 38, 0.9)';
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
                // Check if point is on the visible side of the globe
                const globeCenter: [number, number] = [-rotation[0], -rotation[1]];
                const distanceFromCenter = geoDistance(center, globeCenter);
                const isVisible = distanceFromCenter < Math.PI / 2; // 90 degrees in radians

                if (projected && isVisible) {
                    const [x, y] = projected;

                    const flag = getFlag(targetCountry.properties?.['ISO3166-1-Alpha-2']);
                    const name = targetCountry.properties?.name || '';

                    if (flag) {
                        // Draw flag first (larger)
                        context.font = '700 20px Inter, sans-serif';
                        const flagWidth = context.measureText(flag).width;

                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.strokeText(flag, x - flagWidth / 2 - 20, y);
                        context.fillStyle = '#065f46';
                        context.fillText(flag, x - flagWidth / 2 - 20, y);

                        // Draw name (smaller, offset right)
                        context.font = '700 14px Inter, sans-serif';
                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.textAlign = 'left';
                        context.strokeText(name, x - flagWidth / 2 + 5, y);
                        context.fillStyle = '#065f46';
                        context.fillText(name, x - flagWidth / 2 + 5, y);
                        context.textAlign = 'center'; // Reset
                    } else {
                        // No flag, just name
                        context.font = '700 14px Inter, sans-serif';
                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.strokeText(name, x, y);
                        context.fillStyle = '#065f46';
                        context.fillText(name, x, y);
                    }
                }
            }

            // Neighbor Labels
            const globeCenter: [number, number] = [-rotation[0], -rotation[1]];
            revealedNeighbors.forEach(feature => {
                const center = geoCentroid(feature);
                const distanceFromCenter = geoDistance(center, globeCenter);
                const isVisible = distanceFromCenter < Math.PI / 2;
                const projected = projection(center);

                if (projected && isVisible) {
                    const [x, y] = projected;

                    const flag = getFlag(feature.properties?.['ISO3166-1-Alpha-2']);
                    const name = feature.properties?.name || '';

                    if (flag) {
                        // Draw flag first (larger)
                        context.font = '500 18px Inter, sans-serif';
                        const flagWidth = context.measureText(flag).width;

                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.strokeText(flag, x - flagWidth / 2 - 18, y);
                        context.fillStyle = '#374151';
                        context.fillText(flag, x - flagWidth / 2 - 18, y);

                        // Draw name (smaller, offset right)
                        context.font = '500 12px Inter, sans-serif';
                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.textAlign = 'left';
                        context.strokeText(name, x - flagWidth / 2 + 5, y);
                        context.fillStyle = '#374151';
                        context.fillText(name, x - flagWidth / 2 + 5, y);
                        context.textAlign = 'center'; // Reset
                    } else {
                        // No flag, just name
                        context.font = '500 12px Inter, sans-serif';
                        context.strokeStyle = 'white';
                        context.lineWidth = 3;
                        context.strokeText(name, x, y);
                        context.fillStyle = '#374151';
                        context.fillText(name, x, y);
                    }
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
});

export default MapCanvas;
