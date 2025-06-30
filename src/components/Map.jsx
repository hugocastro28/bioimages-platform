import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L, { Point } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import ArcConnection from './ArcConnection';
import ItemIcon from './ItemIcon';
import ItemPopup from './ItemPopup';
import clusterIcon from './ClusterIcon';
import MapNavigation from './MapNavigation';
import { propertyColorMap, getWikimediaImageUrl } from '../utils';
import "leaflet/dist/leaflet.css";
import '@changey/react-leaflet-markercluster/dist/styles.min.css';
import 'rc-slider/assets/index.css';
import '../css/Map.css';
import 'rc-tooltip/assets/bootstrap.css';

const WikibaseMap = ({items, properties, visibleItems, visibleConnections, propertyMap, mapView, onMapViewChange }) => {
    const [connectionLines, setConnectionLines] = useState([]);
    const [selectedConnection, setSelectedConnection] = useState({ conn: null, timestamp: 0 });
    const mapRef = useRef(null);
    const propertyDetailsMap = new Map(
        properties.map(prop => [prop.id.split('/').pop(), prop])
    );
    const markerCache = useRef(new Map());
    const connectionLineCache = useRef(new Map());
    const [hoveredItemId, setHoveredItemId] = useState(null);
    const itemLabelMap = new Map(items ? Array.from(items.entries()).map(([internalId, item]) => [internalId, item.label]) : []);
    const [zoom, setZoom] = useState(mapView.zoom);

    /**
     * Update the map view when the mapView prop changes
     */
    useEffect(() => {
        if (mapRef.current && mapView.center) {
            mapRef.current.setView(mapView.center, mapView.zoom);
        }
    }, [mapView]);

    /**
     * Automatically adjust the map view to focus on the last selected connection
     */
    useEffect(() => {
        if (!selectedConnection.conn || !mapRef.current) return;
    
        const map = mapRef.current;
        const { from, to } = selectedConnection.conn;
        const center = map.getCenter();
    
        const distanceToFrom = map.distance(center, L.latLng(from));
        const distanceToTo = map.distance(center, L.latLng(to));
        const target = distanceToFrom > distanceToTo ? from : to;

        onMapViewChange({ center: target, zoom: 15 });

    }, [selectedConnection.timestamp]);

    /**
     * Memoize the visible items map to avoid recalculating it on every render
     */
    const visibleItemsMap = useMemo(() => {
        //console.log("🔍 Number of visible items:", visibleItems.length);
        return new Map(visibleItems.map(item => [item.internalId, item]));
    }, [visibleItems]);

    /**
     * Update connection lines based on visible connections and items
     */
    useEffect(() => {
        if (!visibleConnections.length || !visibleItems.length) {
            connectionLineCache.current.clear();
            setConnectionLines([]);
            return;
        }

        const getColorForProperty = (propId, targetId) => {
            if (propId === "P3") {
                const targetLabel = itemLabelMap.get(targetId)?.toLowerCase();
                if (targetLabel === "project" || targetLabel === "creative work"  || targetLabel === "visual artwork") {
                    return "#1434A4";
                }
            }
            return propertyColorMap[propId] || '#888'; // fallback gray
        };
    
        const newConnectionLineMap = new Map();
    
        visibleConnections.forEach(({ source, target, property, qualifiers }) => {
            
            // Filter by hovered item
            if (hoveredItemId && source !== hoveredItemId && target !== hoveredItemId) {
                return;
            }

            const sourceItem = visibleItemsMap.get(source);
            const targetItem = visibleItemsMap.get(target);
            if (!sourceItem || !targetItem) return;
    
            const sourceCoords = sourceItem.coordinates;
            const targetCoords = targetItem.coordinates;
            if (!sourceCoords || !targetCoords) return;
    
            const propertyLabel = propertyMap.get(property) || "Unknown";
            const key = `${source}|${target}|${property}`;

            const newLine = {
                sourceLabel: sourceItem.label,
                sourceCoords,
                targetLabel: targetItem.label,
                targetCoords,
                property,
                propertyLabel,
                color: getColorForProperty(property, target),
                qualifiers: qualifiers || {},
            };
            newConnectionLineMap.set(key, newLine);
      
        });
    
        const hasChanged = Array.from(newConnectionLineMap.keys()).some(
            key => !connectionLineCache.current.has(key)
        );
        
        if (hasChanged || newConnectionLineMap.size !== connectionLineCache.current.size) {
            connectionLineCache.current = newConnectionLineMap;
            setConnectionLines(Array.from(newConnectionLineMap.values()));
        }
    }, [visibleConnections, visibleItemsMap, propertyMap, hoveredItemId]);

    /**
     * Memoize visible items with coordinates to avoid recalculating on every render
     */
    const visibleItemsWithCoords = useMemo(() =>
        visibleItems.map(item => {
            const coord = item.coordinates;
            return coord ? { item, coord } : null;
        }).filter(Boolean), [visibleItems]
    );

    /**
     * Generate markers for visible items with coordinates
     */
    const markers = useMemo(() => {
        const newMarkers = [];
    
        visibleItemsWithCoords.forEach(({ item, coord }) => {
            const image = getWikimediaImageUrl(item.properties.get("P6")?.[0])|| null;
            const cacheKey = item.internalId + JSON.stringify(coord);
    
            if (!markerCache.current.has(cacheKey)) {
                const marker = (
                    <Marker
                        key={item.internalId}
                        position={coord}
                        icon={ItemIcon(item, image)}
                        eventHandlers={{
                            mouseover: () => setHoveredItemId(item.internalId),
                            mouseout: () => setHoveredItemId(null)
                        }}
                    >
                        <Popup className="popup-item" closeButton={true}>
                            <ItemPopup
                                items={items}
                                item={item}
                                image={image}
                                propertyDetailsMap={propertyDetailsMap}
                            />
                        </Popup>
                    </Marker>
                );
                markerCache.current.set(cacheKey, marker);
            }
    
            newMarkers.push(markerCache.current.get(cacheKey));
        });
    
        return newMarkers;
    }, [visibleItemsWithCoords, items]);

    /**
     * Memoize arc connections data to avoid recalculating on every render
     */
    const arcConnectionsData = useMemo(() =>

        connectionLines.map(({ sourceLabel, sourceCoords, targetLabel, targetCoords, color, property, propertyLabel, qualifiers }) => {
            const qualifierInfo = [];
    
            for (const [qProp, values] of Object.entries(qualifiers || {})) {
                const qLabel = propertyMap.get(qProp) || qProp;
                const resolvedValues = values.map(val => {
                    if (typeof val === 'object' && val !== null) {
                        // Check if it is a coordinate object
                        if ('latitude' in val && 'longitude' in val) {
                            return `(${val.latitude.toFixed(4)}, ${val.longitude.toFixed(4)})`;
                        }
                        return JSON.stringify(val);
                    }
                    return itemLabelMap.get(val) || val;
                });

                qualifierInfo.push({
                    label: qLabel,
                    value: resolvedValues.join(", "),
                    color: propertyColorMap[qProp] || "#666"
                });

            }
    
            return {
                source: sourceLabel,
                from: sourceCoords,
                target: targetLabel,
                to: targetCoords,
                color,
                property: property,
                name: propertyLabel,
                qualifierInfo: qualifierInfo.length > 0 ? qualifierInfo : null
            };
        }), [connectionLines, propertyMap, itemLabelMap]
    );

    return (
        <div className="map-slider-container">
            {/* Leaflet Map */}
            <MapContainer
                className='map-container'
                ref={mapRef}
                center={mapView.center}
                zoom={mapView.zoom}
                whenCreated={(mapInstance) => {
                    mapRef.current = mapInstance;
                    mapInstance.on('moveend', () => {
                    const center = mapInstance.getCenter();
                    const zoom = mapInstance.getZoom();
                    onMapViewChange({ center: [center.lat, center.lng], zoom });
                    });
                }}
                maxZoom={17} 
                minZoom={3} 
            >
                <TileLayer 
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
                <MapNavigation onUpdate={(view) => console.log("Current view:", view)}/>
                <MarkerClusterGroup
                    iconCreateFunction={clusterIcon}
                    showCoverageOnHover = {false}
                    spiderfyOnMaxZoom = {true}
                    spiderfyShapePositions={(count, centerPt) => {
                        const separation = 80;
                        const startY = centerPt.y - ((count - 1) * separation) / 2;
                    
                        return Array.from({ length: count }, (_, i) =>
                            new Point(centerPt.x, startY + i * separation)
                        );
                        }}
                    maxClusterRadius = {45}
                    >
                    {markers}
                </MarkerClusterGroup>

                {/* Arc Connections */}
                <ArcConnection
                    connections={arcConnectionsData}
                    onClick={(conn) => {
                        setSelectedConnection({ conn, timestamp: Date.now() });
                    }}
                />
            </MapContainer>
            <div className="last-connection-info">
            {selectedConnection.conn ? (
                <>
                <div className="from">
                    <strong>From:</strong> {selectedConnection.conn.source}
                </div>
                <div className="property">
                    <strong>Property:</strong> {selectedConnection.conn.name}
                </div>
                <div className="to">
                    <strong>To:</strong> {selectedConnection.conn.target}
                </div>
                </>
            ) : (
                <div className="no-connection-message">
                    Last connection selected
                </div>
            )}
            </div>
        </div>
    );
};

export default WikibaseMap;