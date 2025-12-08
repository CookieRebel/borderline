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
}

const LOD_THRESHOLD = 500; // Scale threshold for switching to high detail

const MapCanvas: React.FC<MapCanvasProps> = ({ targetCountry, revealedNeighbors, gameStatus, difficulty, allFeaturesLow, allFeaturesHigh }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for dimensions
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // State for projection parameters
    const [rotation, setRotation] = useState<[number, number]>([0, 0]);
    const [scale, setScale] = useState<number>(250);
    const [visibleCount, setVisibleCount] = useState<number>(0);

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
        const newScale = tempProj.scale();
        setScale(newScale);

        // 3. Sync d3-zoom transform with new scale
        if (zoomBehaviorRef.current) {
            const canvas = select(canvasRef.current);
            const newTransform = zoomIdentity.scale(newScale);
            canvas.call(zoomBehaviorRef.current.transform, newTransform);
            previousKRef.current = newScale;
        }

    }, [targetCountry, dimensions.width, dimensions.height]);

    // Setup Interaction Behaviors (Zoom & Drag) - only once
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = select(canvasRef.current);

        // Store previous transform
        let previousX = 0;
        let previousY = 0;

        const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([100, 5000])
            .on('zoom', (event) => {
                const { transform, sourceEvent } = event;
                const { k, x, y } = transform;

                // Only update scale (wheel/pinch events)
                if (k !== previousKRef.current) {
                    setScale(k);
                    previousKRef.current = k;
                }

                // Only rotate on drag (mouse/touch move, not wheel)
                const isWheelEvent = sourceEvent?.type === 'wheel';
                if (!isWheelEvent && (x !== previousX || y !== previousY)) {
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
            .translate([dimensions.width / 2, dimensions.height / 2]);
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

        // 4. Faint World Map (Easy Mode) - with LOD switching
        if (difficulty === 'easy') {
            // Choose LOD based on zoom level
            const isHighDetail = scale > LOD_THRESHOLD;
            const features = isHighDetail ? allFeaturesHigh : allFeaturesLow;

            // Visibility culling: calculate actual visible angle based on zoom
            // At scale 250 (default), we see roughly the hemisphere (PI/2 radians = 90°)
            // Higher scale = smaller visible area
            // Formula: visible angle = arcsin(canvasRadius / scale)
            // Since we're on a unit sphere, canvasRadius ≈ min(width, height) / 2
            const canvasRadius = Math.min(dimensions.width, dimensions.height) / 2;
            const visibleAngle = Math.asin(Math.min(1, canvasRadius / scale));

            const viewCenter: [number, number] = [-rotation[0], -rotation[1]];
            const visibleFeatures = features.filter(feature => {
                const center = geoCentroid(feature);
                // Add small buffer for features at the edge
                return geoDistance(viewCenter, center) < visibleAngle + 0.2;
            });

            if (visibleFeatures.length > 0) {
                context.beginPath();
                pathGenerator({ type: 'FeatureCollection', features: visibleFeatures } as any);
                context.strokeStyle = 'rgba(209, 213, 219, 0.9)'; // Same grey for both LOD levels
                context.lineWidth = 0.5;
                context.stroke();
            }

            // Update visible count for debug
            setVisibleCount(visibleFeatures.length);
        }

        // 5. Target Country - use high-res when zoomed in
        if (targetCountry) {
            // If zoomed in, find and use high-detail version of target
            let countryToRender = targetCountry;
            if (scale > LOD_THRESHOLD) {
                const targetIso = targetCountry.properties?.['ISO3166-1-Alpha-3'];
                const highResVersion = allFeaturesHigh.find(
                    f => f.properties?.['ISO3166-1-Alpha-3'] === targetIso
                );
                if (highResVersion) {
                    countryToRender = highResVersion;
                }
            }

            context.beginPath();
            pathGenerator(countryToRender);
            context.strokeStyle = 'rgba(6, 90, 30, 0.9)';
            context.lineWidth = 1;
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

    }, [dimensions, projection, targetCountry, revealedNeighbors, gameStatus, difficulty, allFeaturesLow, allFeaturesHigh, scale, rotation]);

    return (
        <div ref={containerRef} className="map-container" style={{ width: '100%', height: '100%' }}>
            <canvas
                ref={canvasRef}
                style={{ cursor: 'grab', display: 'block' }}
            />

            {/* Debug info */}
            <div style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                background: 'rgba(255,255,255,0.9)',
                color: '#374151',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                border: '1px solid #e5e7eb',
                fontWeight: '500',
                pointerEvents: 'none'
            }}>
                Scale: {Math.round(scale)} • LOD: {scale > LOD_THRESHOLD ? 'HIGH' : 'LOW'} • Visible: {visibleCount}/{scale > LOD_THRESHOLD ? allFeaturesHigh.length : allFeaturesLow.length}
            </div>
        </div>
    );
};

export default MapCanvas;
