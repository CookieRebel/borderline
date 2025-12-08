import React, { useEffect, useRef, useState, useMemo } from 'react';
import { geoPath, geoOrthographic, geoGraticule, geoCentroid } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import type { Feature } from 'geojson';

interface MapCanvasProps {
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    gameStatus: 'playing' | 'won' | 'lost' | 'given_up';
    difficulty: 'easy' | 'medium' | 'hard';
    allFeatures: Feature[];
}

const MapCanvas: React.FC<MapCanvasProps> = ({ targetCountry, revealedNeighbors, gameStatus, difficulty, allFeatures }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for dimensions
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    // State for projection parameters
    const [rotation, setRotation] = useState<[number, number]>([0, 0]);
    const [scale, setScale] = useState<number>(250);

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

    // Refs for interaction state to prevent stale closures and re-renders
    const zoomBehaviorRef = useRef<any>(null);
    const previousTransformRef = useRef<any>(zoomIdentity.scale(250));

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

        // 3. Reset Zoom Behavior State
        // We need to update the d3-zoom transform state to match our new manual scale/rotation
        // so that the next user interaction starts from here, not from where the zoom behavior last was.
        if (canvasRef.current && zoomBehaviorRef.current) {
            const canvas = select(canvasRef.current);
            const newTransform = zoomIdentity.scale(newScale);

            // Update the d3-zoom internal state
            // IMPORTANT: Update the ref BEFORE calling the transform to prevent the zoom handler
            // from calculating a huge delta (jump) and rotating the map away from the center.
            previousTransformRef.current = newTransform;

            // We use .call() to apply the transform to the selection
            // This synchronously fires the 'zoom' event
            canvas.call(zoomBehaviorRef.current.transform, newTransform);
        }

    }, [targetCountry, dimensions.width, dimensions.height]);

    // Setup Interaction Behaviors (Zoom & Drag) - Run ONCE
    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = select(canvasRef.current);

        const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
            .scaleExtent([100, 5000])
            .on('zoom', (event) => {
                const { transform } = event;
                const { k, x, y } = transform;

                // Calculate delta from previous transform
                const prev = previousTransformRef.current;
                const dx = x - prev.x;
                const dy = y - prev.y;

                // Update Scale
                setScale(k);

                // Update Rotation (Pan)
                if (k > 0) {
                    const sensitivity = 75 / k;
                    setRotation(curr => [curr[0] + dx * sensitivity, curr[1] - dy * sensitivity]);
                }

                // Update previous transform ref
                previousTransformRef.current = transform;
            });

        zoomBehaviorRef.current = zoomBehavior;
        canvas.call(zoomBehavior);

        return () => {
            canvas.on('.zoom', null);
        };
    }, []); // Run once on mount

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
        context.strokeStyle = 'rgba(229, 231, 235, 0.3)'; // #e5e7eb with opacity
        context.lineWidth = 0.5;
        context.stroke();

        // 3. Globe Outline
        context.beginPath();
        pathGenerator({ type: 'Sphere' } as any);
        context.strokeStyle = 'rgba(229, 231, 235, 0.7)';
        context.lineWidth = 0.5;
        context.stroke();

        // 4. Faint World Map (Easy Mode)
        if (difficulty === 'easy' && allFeatures.length > 0) {
            context.beginPath();
            // Render all features as a single path for performance
            pathGenerator({ type: 'FeatureCollection', features: allFeatures } as any);
            context.strokeStyle = 'rgba(156, 163, 175, 0.6)'; // #9ca3af (Darker gray)
            context.lineWidth = 0.8; // Slightly thicker
            context.stroke();
        }

        // 5. Visible Neighbors (Draw BEFORE target so target is on top)
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

        // 6. Target Country (Draw LAST to be on top)
        if (targetCountry) {
            context.beginPath();
            pathGenerator(targetCountry);
            context.strokeStyle = 'rgba(16, 185, 129, 0.8)'; // Emerald-500 with 0.8 opacity
            context.lineWidth = 1.5; // Slightly thicker than background
            context.stroke();
        }

        // 7. Labels (Game Over)
        if (gameStatus === 'won' || gameStatus === 'given_up') {
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.lineJoin = 'round';

            // Target Label
            if (targetCountry) {
                // Check if centroid is visible (not clipped)
                // geoPath.centroid returns [x, y] or undefined/NaN if clipped
                // Actually d3-geo centroid might return a point even if clipped? 
                // Let's use projection check.
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

    }, [dimensions, projection, targetCountry, revealedNeighbors, gameStatus, difficulty, allFeatures]);

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
                Canvas Renderer • {revealedNeighbors.length} neighbors
            </div>
        </div>
    );
};

export default MapCanvas;
