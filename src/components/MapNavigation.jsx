import { useEffect, useRef, useState } from "react";
import { useMapEvents } from "react-leaflet";
import { FaArrowCircleLeft, FaArrowCircleRight } from "react-icons/fa";

const MapNavigation = ({ onUpdate }) => {
    const map = useMapEvents({});
    const past = useRef([]);
    const future = useRef([]);
    const isProgrammaticMove = useRef(false);

    /**
     * Handle map move events to track history
     */
    useEffect(() => {
        const handleMoveEnd = () => {
            if (isProgrammaticMove.current) {
                isProgrammaticMove.current = false;
                return;
            }
        
            const center = map.getCenter();
            const zoom = map.getZoom();
            const view = { center: [center.lat, center.lng], zoom };
        
            past.current.push(view); // Save to back history

            const MAX_HISTORY = 50;
            if (past.current.length > MAX_HISTORY) {
                past.current.shift();
            }

            future.current = []; // Clear forward history
        };
        
        map.on('moveend', handleMoveEnd);
        return () => {
            map.off('moveend', handleMoveEnd);
        };
    }, [map]);

    const goBack = () => {
        if (past.current.length < 2) return;
    
        const current = past.current.pop();
        future.current.push(current);
    
        const previous = past.current[past.current.length - 1];
    
        isProgrammaticMove.current = true;
        map.setView(previous.center, previous.zoom);
    };
        
    const goForward = () => {
        if (future.current.length === 0) return;
    
        const next = future.current.pop();
        past.current.push(next);
    
        isProgrammaticMove.current = true;
        map.setView(next.center, next.zoom);
    };

    return (
        <div className="map-navigation">
            <button className="back-button" onClick={goBack} title="Back">
                <FaArrowCircleLeft size={24} />
            </button>
            <button className="forward-button" onClick={goForward} title="Forward">
                <FaArrowCircleRight size={24} />
            </button>
        </div>
    );
};
export default MapNavigation;