import React, { useMemo, useState, useRef, useEffect, memo } from 'react';
import { geoPath, geoGraticule, geoOrthographic, geoCentroid } from 'd3-geo';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import { select } from 'd3-selection';
import { motion } from 'framer-motion';
import type { Feature } from 'geojson';

interface MapCanvasProps {
    targetCountry: Feature | null;
    revealedNeighbors: Feature[];
    gameStatus: 'playing' | 'won' | 'lost' | 'given_up';
}

// Memoized country path component to prevent unnecessary re-renders
const CountryPath = memo(({
    feature,
    pathGenerator,
    stroke,
    useFilter,
    strokeWidth,
    strokeOpacity
}: {
    feature: Feature;
    pathGenerator: any;
    stroke: string;
    useFilter: boolean;
    strokeWidth: string;
    strokeOpacity?: number;
}) => {
    const path = pathGenerator(feature);
    if (!path) return null;

    return (
        <path
            d={path}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            filter={useFilter ? "url(#pencil)" : undefined}
        />
    );
});

CountryPath.displayName = 'CountryPath';

const MapCanvas: React.FC<MapCanvasProps> = ({ targetCountry, revealedNeighbors, gameStatus }) => {
    const [dimensions] = useState({ width: 800, height: 600 });
    const svgRef = useRef<SVGSVGElement>(null);

    // State for projection parameters
    const [rotation, setRotation] = useState<[number, number]>([0, 0]);
    const [scale, setScale] = useState<number>(250);

    // Initialize/Reset view when target country changes
    useEffect(() => {
        if (!targetCountry || !svgRef.current) return;

        // 1. Calculate center rotation
        const centroid = geoCentroid(targetCountry);
        const newRotation: [number, number] = [-centroid[0], -centroid[1]];
        setRotation(newRotation);

        // 2. Calculate fit scale
        // Create a temporary projection to find the scale that fits the country
        const padding = 50;
        const tempProj = geoOrthographic()
            .rotate(newRotation)
            .fitExtent(
                [[padding, padding], [dimensions.width - padding, dimensions.height - padding]],
                targetCountry
            );
        const newScale = tempProj.scale();
        setScale(newScale);

        // 3. Sync d3-zoom identity
        // We need to re-apply the zoom behavior to update its internal transform
        // Note: We can't easily access the 'zoomBehavior' instance here if it's created in another effect.
        // So we might need to structure the effects differently or use a ref for the zoom behavior.
        // For simplicity, we'll just let the zoom effect handle the binding, but we need to trigger it.
        // Actually, we can just update the transform directly if we have the selection.
        // But we need the zoom instance.

    }, [targetCountry, dimensions]);

    // Setup Interaction Behaviors (Zoom & Drag)
    useEffect(() => {
        if (!svgRef.current) return;
        const svg = select(svgRef.current);

        // Zoom Behavior
        const zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
            .scaleExtent([100, 5000]) // Min/Max zoom
            .filter((event: any) => {
                // Allow wheel (scroll) and pinch (touch)
                // Prevent mousedown (panning) so drag can handle it
                return event.type === 'wheel' || event.type === 'touchstart' || event.type === 'touchmove' || event.type === 'touchend';
            })
            .on('zoom', (event) => {
                setScale(event.transform.k);
            });

        // Drag Behavior (Rotation)
        const dragBehavior = d3Drag<SVGSVGElement, unknown>()
            .on('drag', (event: any) => {
                setRotation(curr => {
                    const [r0, r1] = curr;
                    // Sensitivity: slower rotation when zoomed in
                    const sensitivity = 75 / scale;
                    return [r0 + event.dx * sensitivity, r1 - event.dy * sensitivity];
                });
            });

        svg.call(zoomBehavior);
        svg.call(dragBehavior);

        // Initialize zoom transform to current scale
        // This ensures the first scroll doesn't jump the scale
        svg.call(zoomBehavior.transform, zoomIdentity.scale(scale));

        return () => {
            svg.on('.zoom', null);
            svg.on('.drag', null);
        };
    }, [scale]); // Re-binding on scale change might be inefficient, but ensures drag sensitivity is updated? 
    // Actually, drag sensitivity uses 'scale' from closure. If we don't depend on scale, it uses stale scale.
    // Better: Use a ref for scale in the drag handler, or just let it re-bind. Re-binding is fine for this.
    // BUT re-binding zoom resets the transform if we're not careful.
    // We should probably separate the initialization of behaviors from the updates.
    // However, for simplicity in this component, re-running the effect is acceptable if we preserve the transform.
    // Wait, if we re-run the effect, `svg.call(zoomBehavior.transform, ...)` will reset it to `scale` state.
    // That matches the current state, so it shouldn't jump.

    // Projection derived from state
    const projection = useMemo(() => {
        return geoOrthographic()
            .rotate([rotation[0], rotation[1], 0]) // Roll is 0
            .scale(scale)
            .translate([dimensions.width / 2, dimensions.height / 2]);
    }, [rotation, scale, dimensions]);

    const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);
    const graticuleGenerator = useMemo(() => geoGraticule(), []);

    // Viewport culling logic (Simplified for Globe)
    // For a globe, we can just rely on d3-geo's clipping (it handles hidden side).
    const visibleNeighbors = revealedNeighbors;

    // Determine rendering quality based on zoom level
    const renderQuality = useMemo(() => {
        if (scale < 150) return 'low';
        if (scale < 400) return 'medium';
        return 'high';
    }, [scale]);

    // Use pencil filter only at high quality
    const usePencilFilter = renderQuality === 'high';

    // Adjust stroke width based on quality
    const strokeWidth = renderQuality === 'low' ? '1.5' : '1';

    return (
        <div className="map-container" style={{ width: '100%', height: '100%' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                style={{ cursor: 'grab' }}
                shapeRendering={renderQuality === 'low' ? 'optimizeSpeed' : 'geometricPrecision'}
            >
                <defs>
                    <filter id="pencil">
                        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" result="noise" />
                        <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" />
                    </filter>
                </defs>

                <g>
                    {/* Render Globe Outline */}
                    <path
                        d={pathGenerator({ type: 'Sphere' } as any) || ''}
                        fill="#f8fafc"
                        stroke="#e5e7eb"
                        strokeWidth="0.5"
                        strokeOpacity="0.7"
                    />

                    {/* Render Graticules */}
                    <path
                        d={pathGenerator(graticuleGenerator()) || ''}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="0.5"
                        strokeOpacity="0.3"
                    />

                    {/* Render Target Country */}
                    {targetCountry && (
                        <motion.path
                            d={pathGenerator(targetCountry) || ''}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={strokeWidth}
                            filter={usePencilFilter ? "url(#pencil)" : undefined}
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 3, ease: "easeInOut" }}
                        />
                    )}

                    {/* Render Visible Neighbors */}
                    {visibleNeighbors.map((feature) => (
                        <CountryPath
                            key={feature.properties?.['ISO3166-1-Alpha-3']}
                            feature={feature}
                            pathGenerator={pathGenerator}
                            stroke={feature.properties?.color || "#6b7280"}
                            strokeWidth="1"
                            strokeOpacity={0.5}
                            useFilter={usePencilFilter}
                        />
                    ))}

                    {/* Render Labels (Only on Game End) */}
                    {(gameStatus === 'won' || gameStatus === 'given_up') && (
                        <g className="labels-layer">
                            {/* Target Country Label */}
                            {targetCountry && (() => {
                                const centroid = pathGenerator.centroid(targetCountry);
                                if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                                return (
                                    <text
                                        x={centroid[0]}
                                        y={centroid[1]}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            fill: '#065f46', // Dark emerald
                                            pointerEvents: 'none',
                                            paintOrder: 'stroke',
                                            stroke: 'white',
                                            strokeWidth: '3px',
                                            strokeLinejoin: 'round'
                                        }}
                                    >
                                        {targetCountry.properties?.name}
                                    </text>
                                );
                            })()}

                            {/* Neighbors Labels */}
                            {visibleNeighbors.map((feature) => {
                                const centroid = pathGenerator.centroid(feature);
                                if (!centroid || isNaN(centroid[0]) || isNaN(centroid[1])) return null;
                                return (
                                    <text
                                        key={`label-${feature.properties?.['ISO3166-1-Alpha-3']}`}
                                        x={centroid[0]}
                                        y={centroid[1]}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        style={{
                                            fontFamily: 'Inter, sans-serif',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            fill: '#374151', // Dark gray
                                            pointerEvents: 'none',
                                            paintOrder: 'stroke',
                                            stroke: 'white',
                                            strokeWidth: '3px',
                                            strokeLinejoin: 'round',
                                            opacity: 0.9
                                        }}
                                    >
                                        {feature.properties?.name}
                                    </text>
                                );
                            })}
                        </g>
                    )}
                </g>
            </svg>

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
                fontWeight: '500'
            }}>
                {visibleNeighbors.length + 1}/{revealedNeighbors.length + 1} • {renderQuality} quality
            </div>
        </div>
    );
};

export default MapCanvas;
