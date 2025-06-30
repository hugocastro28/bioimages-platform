import { useState } from "react";
import { unvisibleProperties } from "../utils";
import { Tooltip } from "react-tooltip";
import '../css/MainPage.css';
import { propertyColorMap } from "../utils";

/**
 * SearchBox component for searching properties and items.
 * It allows users to filter properties and items based on a search term
 */
const SearchBox = ({ properties, items, selectedProperties, setSelectedProperties, onItemSelect }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [searchMode, setSearchMode] = useState({properties: true, items: false});

    const filteredProperties = searchMode.properties
        ? properties
            .filter((prop) => {
                const propId = prop.id.split('/').pop(); // Extract "P12" from full URL
                return (
                    !unvisibleProperties.includes(propId) &&
                    prop.label.toLowerCase().includes(searchTerm.toLowerCase())
                );
            })
            .sort((a, b) => {
                const aSelected = selectedProperties.includes(a.label);
                const bSelected = selectedProperties.includes(b.label);
                const aHasColor = !!propertyColorMap[a.id.split('/').pop()];
                const bHasColor = !!propertyColorMap[b.id.split('/').pop()];

                // 1. Selected always come first
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;

                // 2. Among selected: those with color go last
                if (aSelected && bSelected) {
                    if (aHasColor && !bHasColor) return 1;
                    if (!aHasColor && bHasColor) return -1;
                }
                // 3. Among unselected: those with color go first
                if (!aSelected && !bSelected) {
                    if (aHasColor && !bHasColor) return -1;
                    if (!aHasColor && bHasColor) return 1;
                }
                // 4. Otherwise, sort alphabetically
                return a.label.localeCompare(b.label);
            })
        : [];

    const filteredItems = searchMode.items
        ? items        
            .filter(item =>
                item.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
                item.internalId.startsWith("Q")
            )
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];

    const toggleProperty = (label) => {
        if (selectedProperties.includes(label)) {
            setSelectedProperties(selectedProperties.filter(item => item !== label));
        } else {
            setSelectedProperties([...selectedProperties, label]);
        }
        setSearchTerm("");
    };

    const handleItemClick = (item) => {
        onItemSelect?.(item);  // call the map flyTo logic
    };

    return (
        <div className="search-box">
            <div className="search-box-buttons">
                <button variant="text" onClick={() => setSearchMode({properties:true, items:false})} className={searchMode.properties? "search-active" : "search-inactive"}>Properties</button>
                <button variant="text" onClick={() => setSearchMode({properties:false, items:true})} className={searchMode.items ? "search-active" : "search-inactive"}>Items</button>
            </div>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder= {
                    searchMode.properties && searchMode.items
                    ? "Search for items and properties"
                    : searchMode.properties
                    ? "Search for properties"
                    : searchMode.items
                    ? "Search for items"
                    : "Search..."
                }
            />  
            <div className="results-container">
                {filteredProperties.map((prop) => (
                    <div 
                        key={prop.id}
                        data-tooltip-id = {prop.id}
                        data-tooltip-content={prop.description}
                        className={`property-box ${selectedProperties.includes(prop.label) ? "selected" : ""}`} 
                        onClick={() => toggleProperty(prop.label)}
                        style={{ border: `3px solid ${propertyColorMap[prop.id.split('/').pop()] || "transparent"}` }}
                    >
                        {prop.label.charAt(0).toUpperCase() + prop.label.slice(1)}
                        {prop.description &&
                            <Tooltip
                                id={prop.id}
                                effect="solid"
                                place="top"
                                className="tooltip-property"
                            ></Tooltip>
                        }
                    </div>
                ))}
                {filteredItems.map((item) => (
                    <div
                        key={item.internalId}
                        className="property-box"
                        onClick={() => handleItemClick(item)}
                    >
                        {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                    </div>
                ))}
            </div>
            <div className="button-container">
                <button
                    className="clear-button"
                    onClick={() => {
                        setSelectedProperties([]);
                        setSearchTerm("");
                    }}
                >
                    Clear
                </button>
            </div>          
        </div>
    );
};

export default SearchBox;
