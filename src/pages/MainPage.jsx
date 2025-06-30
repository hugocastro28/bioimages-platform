import React, { useState, useEffect, useMemo } from "react";
import '../css/MainPage.css'
import SearchBox from "../components/SearchBox";
import WikibaseMap from '../components/Map';
import QueryGraph from '../components/Graph'
import useWikibaseData from "../hooks/useWikibaseData";
import Slider from 'rc-slider';
import { generateVisibleData, getPropertyValues } from "../utils";
import Histogram from "../components/Histogram";

const MainPage = () => {
    const {
        items,
        connections,
        properties,
        propertyMap,
    } = useWikibaseData();
    const [visibleItems, setVisibleItems] = useState([]);
    const [visibleConnections, setVisibleConnections] = useState([]);
    const [selectedProperties, setSelectedProperties] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedView, setView] = useState("map");
    const [narrativeValues, setNarrativeValues] = useState([]);
    const [selectedNarrative, setNarrative] = useState("Ecology of Images");
    const [selectionValues, setSelectionValues] = useState([]);
    const [selectedSelection, setSelectedSelection] = useState([]);
    const [vocabularyValues, setVocabularyValues] = useState([]);
    const [selectedVocabulary, setSelectedVocabulary] = useState([]);
    const [searchMode, setSearchMode] = useState({ items: false, properties: true});
    const defaultView = { center: [45, -50], zoom: 2 };
    const [mapView, setMapView] = useState(defaultView);
    const [yearRange, setYearRange] = useState([1750, 1950]);

    /**
     * Toggle the selected narrative
     * @param {String} narrative - The narrative to toggle
     */
    const toggleNarrative = (narrative) => {
        if(narrative != selectedNarrative) {
            setNarrative(narrative);
        }
        else {
            setNarrative("");
        }
    };

    /**
     * Toggle the axis selection
     * @param {String} selection - The axis to toggle
     */
    const toggleSelection = (selection) => {
        setSelectedSelection(prev => {
            if (prev.includes(selection)) {
                return prev.filter(s => s !== selection);
            } else {
                return [...prev, selection];
            }
        });
    };

    /**
     * Toggle the vocabulary selection
     * @param {String} vocabulary - The vocabulary to toggle
     */
    const toggleVocabulary = (vocabulary) => {
        setSelectedVocabulary(prev => {
            if (prev.includes(vocabulary)) {
                return prev.filter(v => v !== vocabulary);
            } else {
                return [...prev, vocabulary];
            }
        });
    }

    /**
     * Handle item selection from the search box
     * @param {*} item - The selected item
     */
    const handleItemSelect = (item) => {
        if (item?.coordinates) {
            setMapView({ center: item.coordinates, zoom: 15 });
        }
    };

    /**
     * Filter properties that are time-related, excluding specific ones
     * @param {Array} properties - List of properties from Wikibase
     */
    const timeProperties = useMemo(() => {
        const excludedProps = new Set(["P52", "P53", "P45", "P48"]);
        return new Set(
            properties
                .filter(prop => prop.datatype.includes("time"))
                .map(prop => prop.id.split("/").pop())
                .filter(propId => !excludedProps.has(propId))
        );
    }, [properties]);

    /**
     * Get values for properties based on the items, properties, and connections
     */
    useEffect(() => {
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported");
            return;
        }
    
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setMapView({ center: [latitude, longitude], zoom: 8 });
            },
            (error) => {
                console.warn("Geolocation error:", error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    }, []);

    /**
     * Get values for narratives, selections, and vocabularies
     */
    useEffect(() => {
        setNarrativeValues(getPropertyValues(items, properties, connections, "P85"));
        setSelectionValues(getPropertyValues(items, properties, connections, "P62"));
        setVocabularyValues(getPropertyValues(items, properties, connections, "P63"));
    }, [items, properties, connections])

    /**
     * Generate visible items and connections based on the current filters
     */
    useEffect(() => {
        if (!items || items.size === 0) return;
    
        const { visibleItems, visibleConnections } = generateVisibleData(
            items, connections, yearRange, selectedNarrative, selectedSelection, selectedVocabulary, timeProperties
        );
        setVisibleItems(Array.from(visibleItems.values()));
        setVisibleConnections(visibleConnections);
    }, [items, connections, yearRange, selectedNarrative, selectedSelection, selectedVocabulary]);

    /**
     * Filter visible items based on selected properties, items, and connections
     */
    const filteredVisibleItems = useMemo(() => {
        if (!visibleItems.length) return [];
    
        const selectedPropertyIds = selectedProperties
            .map(label => [...propertyMap.entries()].find(([id, lbl]) => lbl === label)?.[0])
            .filter(Boolean);
    
        const connectionItemIds = new Set();
    
        visibleConnections.forEach(({ source, target, property }) => {
            if (selectedPropertyIds.length === 0 || selectedPropertyIds.includes(property)) {
                connectionItemIds.add(source);
                connectionItemIds.add(target);
            }
        });
    
        return visibleItems.filter(item => {
            if (selectedPropertyIds.length > 0 && !connectionItemIds.has(item.internalId)) {
                return false;
            }

            if (selectedItems.length > 0 && !selectedItems.includes(item.label)) {
                return false;
            }
    
            return true;
        });
    }, [
        visibleItems,
        visibleConnections,
        selectedProperties,
        selectedItems,
        selectedSelection,
        selectedVocabulary,
        items,
        propertyMap,
    ]);
    
    /**
     * Filter visible connections based on selected properties, items, and qualifiers
     */
    const filteredVisibleConnections = useMemo(() => {
        if (!visibleConnections.length) return [];
    
        const visibleIds = new Set(filteredVisibleItems.map(item => item.internalId));
        const selectedPropertyIds = selectedProperties
            .map(label => [...propertyMap.entries()].find(([id, lbl]) => lbl === label)?.[0])
            .filter(Boolean);
    
        return visibleConnections.filter(({ source, target, property, qualifiers }) => {
            if (!visibleIds.has(source) || !visibleIds.has(target)) {
                return false;
            }
    
            // Filter selected properties
            if (selectedPropertyIds.length > 0 && !selectedPropertyIds.includes(property)) {
                return false;
            }

            // Filtrar qualifiers
            if (qualifiers) {
                for (const [qualifierProp, values] of Object.entries(qualifiers)) {
                    //console.log("qualifierProp: ", qualifierProp);
                    if (timeProperties.has(qualifierProp)) {
                        for (const value of values) {
                            const dateValue = value?.time;
                            const match = dateValue.match(/\d{4}/);
                            if (match) {
                                const itemYear = parseInt(match[0], 10);
                                if (itemYear < yearRange[0] || itemYear > yearRange[1]) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }

            return true;
        });
    }, [filteredVisibleItems, visibleConnections, selectedProperties, propertyMap]);

    const currentYear = new Date().getFullYear();

    return (
        <div className ="menu-content">
            <div className="menu">
                <div className="view">
                    <h3>View</h3>
                    <div className="scrollable-content">
                        <button variant="text" onClick={() => setView("map")} className={selectedView === "map" ? "menu-active" : "menu-inactive"}>Map</button>
                        {/*<button variant="text" onClick={() => setView("histogram")} className={selectedView === "histogram" ? "menu-active" : "menu-inactive"}>Histogram</button>*/}
                        {/*<button variant="text" onClick={() => setView("graph")} className={selectedView === "graph" ? "menu-active" : "menu-inactive"}>Graph</button>*/}
                    </div>
                </div>
                <div className="narrative">
                    <h3>Narrative</h3>
                    <div className="scrollable-content">
                        {
                            narrativeValues.map((narrative) => (
                                <button 
                                    key={narrative} 
                                    onClick={() => toggleNarrative(narrative)} 
                                    className={selectedNarrative === narrative ? "menu-active" : "menu-inactive"}
                                >
                                    {narrative.charAt(0).toUpperCase() + narrative.slice(1).toLowerCase()}
                                </button>
                            ))
                        }
                    </div>
                </div>
                <div className="selection">
                    <h3>Axis</h3>
                    <div className="scrollable-content">
                        {
                            selectionValues.map((selection) => (
                                <button 
                                    key={selection} 
                                    onClick={() => toggleSelection(selection)} 
                                    className={selectedSelection.includes(selection) ? "menu-active" : "menu-inactive"}
                                >
                                    {selection.charAt(0).toUpperCase() + selection.slice(1).toLowerCase()}
                                </button>
                            ))
                        }
                    </div>
                </div>
                <div className="vocabulary">
                    <h3>Vocabulary</h3>
                    <div className="scrollable-content">
                        {
                            vocabularyValues.map((vocabulary) => (
                                <button 
                                    key={vocabulary} 
                                    onClick={() => toggleVocabulary(vocabulary)} 
                                    className={selectedVocabulary.includes(vocabulary) ? "menu-active" : "menu-inactive"}
                                >
                                    {vocabulary.charAt(0).toUpperCase() + vocabulary.slice(1).toLowerCase()}
                                </button>
                            ))
                        }
                    </div>
                </div>
            </div>
            <div className="content">
                {/* Timeline Slider */}
                <div className="slider-container">
                    <Slider
                        range
                        className = {"slider"}
                        onChange= {setYearRange}
                        value = {yearRange}
                        min = {1500}
                        max = {currentYear}
                        allowCross = {false}  
                    />
                    <div className="year-range">{yearRange[0]} - {yearRange[1]}</div>
                </div>
                {
                selectedView === "map"
                ? <WikibaseMap
                        items = {items}
                        properties = {properties}
                        visibleItems = {filteredVisibleItems}
                        visibleConnections = {filteredVisibleConnections}
                        propertyMap = {propertyMap}
                        mapView={mapView}
                        onMapViewChange={setMapView}
                    /> 
                : selectedView === "histogram"
                ? <Histogram
                        items = {visibleItems}
                    />
                : <QueryGraph/>}
            </div>
            <SearchBox
                properties={properties}
                items={Array.from(filteredVisibleItems.values())}
                searchMode={searchMode}
                selectedProperties={selectedProperties}
                setSelectedProperties={setSelectedProperties}
                onItemSelect={handleItemSelect}
            />
        </div>
    )
}

export default MainPage