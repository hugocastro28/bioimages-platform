import SparkMD5 from "spark-md5";

/**
 * List of properties that are used to clone items.
 */
export const cloneProperties = [
    "P3", // instance of
    "P66", // type of process
    "P70", // has effect
    "P83", // associated hazard
    "P68"  // raw material processed
]

/**
 * Map of property IDs to their corresponding colors.
 */
export const propertyColorMap = {
    //"P3": "#1434A4", //instance of
    "P38": "#1A1A1A", //source of material
    "P60": "#0096FF", //part of
    "P68": "#FFEA00", //raw material processed
    "P70": "#B90E0A", //has effect
    "P83": "#FF4D00", //associated hazard
    "P88": "#00AB66", //alternative production
}

/**
 * List of properties that are not visible in the UI.
 */
export const unvisibleProperties = [
    "P2", //subclass of
    //"P3", //instance of
    "P4", //video
    "P5", //facet of
    "P6", //image
    "P8", //OpenStreetMap tag or key
    "P9", //properties for this type
    "P10", //coordinate location
    "P11", //Wikidata item of this property
    "P12", //short name
    "P13", //inception
    "P18", //has part(s) of the class
    "P21", //price
    "P23", //consumption rate
    "P24", //consumption rate per capita
    "P26", //Wikidata property
    "P27", //coordinates of the point of view
    "P29", //is a list of
    "P30", //title 
    "P31", //name
    "P32", //subtitle
    "P34", //duration
    "P35", //Wikiadata time precision
    "P36", //type of unit for this property
    "P37", //full work available at URL
    "P39", //occupation
    "P45", //start time
    "P46", //subproperty of
    "P47", //point in time
    "P48", //end time
    "P49", //sex or gender
    "P50", //country or citizenship
    "P51", //country
    "P52", //date of birth
    "P53", //date of death
    "P55", //formatter URL
    "P56", //search formatter URL
    "P57", //URL
    "P58", //reference URL
    "P59", //Wikimedia import URL
    "P62", //EIXO
    "P64", //media modality
    "P65", //production date
    "P69", //position held
    "P72", //applies to name of subject
    "P73", //logo image
    "P76", //set in period
    "P77", //business model
    "P78", //story
    "P80", //patent number
    "P81", //publication date
    "P82", //time of discovery or invention
    "P85", //storytelling
    "P89", //long description
]

/**
 * Function to create a spiral distribution of child items around a parent item based on its coordinates.
 * @param {Array} parentCoords - [latitude, longitude] coordinates of the parent item
 * @param {number} numChildren - number of children to distribute around the parent
 * @returns {Array} - [latitude, longitude] coordinates for each child item
 */
const distributeItemsAroundParent = (parentCoords, numChildren) => {
    const baseRadius = 0.01;
    const spiralFactor = 0.004; 

    return Array.from({ length: numChildren }).map((_, i) => {
        const angle = i * (2 * Math.PI / 5); 
        const radius = baseRadius + spiralFactor * i;

        return [
            parentCoords[1] + (radius * Math.cos(angle)),
            parentCoords[0] + (radius * Math.sin(angle)),
        ];
    });
};

/**
 * Function to filter items based on a specified year range.
 * @param {Array} itemsArray - Array of items to filter
 * @param {Array} yearRange - Array with two elements representing the start and end year [startYear, endYear]
 * @param {Array} timeProperties - Array of time-related properties to check for each item
 * @returns {Array} - Filtered array of items that fall within the specified year range
 */
function filterItemsByYearRange(itemsArray, yearRange, timeProperties) {
    return itemsArray.filter(item => isItemInLifeRange(item, yearRange, timeProperties));
}

/**
 * Function to get item IDs that match a selected narrative.
 * @param {Array} filteredItems - Array of filtered items to search through
 * @param {Map} items - Map of all items where keys are item IDs and values are item objects
 * @param {Array} connections - Array of connection objects where each object has source, target, property, and qualifiers   
 * @param {string} selectedNarrative - The narrative label to match against item properties 
 * @returns {Set} - A set of item IDs that match the selected narrative
 */
function getNarrativeItemIds(filteredItems, items, connections, selectedNarrative) {
    const storytellingPropertyId = "P85";
    const narrativeRoots = new Set();
    filteredItems.forEach(item => {
        const storytellingValues = item.properties.get(storytellingPropertyId) || [];
        const matches = storytellingValues.some(valueId => {
            const linkedItem = items.get(valueId);
            return linkedItem?.label === selectedNarrative;
        });
        if (matches) {
            narrativeRoots.add(item.internalId);
        }
    });
    const visited = new Set(narrativeRoots);
    const queue = [...narrativeRoots];
    while (queue.length > 0) {
        const currentId = queue.shift();
        for (const conn of connections) {
            if (conn.source !== currentId) continue;
            if (!filteredItems.some(i => i.internalId === conn.source) || !filteredItems.some(i => i.internalId === conn.target)) continue;
            const neighborId = conn.target;
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }
    return visited;
}

/**
 * Function to traverse through selected items or vocabulary and find connected items.
 * @param {Array} filteredItems - Array of filtered items to search through
 * @param {Map} items - Map of all items where keys are item IDs and values are item objects
 * @param {Array} connections - Array of connection objects where each object has source, target, property, and qualifiers
 * @param {Set} filteredItemIds - Set of filtered item IDs to check against 
 * @param {String} propertyKey - The property key to check for connections (e.g., "P62" for selection, "P63" for vocabulary) 
 * @param {Array} selectedArray - Array of selected labels to match against item properties
 * @returns {Set} - A set of item IDs that are connected to the selected items or vocabulary
 */
function traverseSelectionOrVocabulary(filteredItems, items, connections, filteredItemIds, propertyKey, selectedArray) {
    let selectedItemsSet = new Set(filteredItems
        .filter(item => {
            const ids = item.properties.get(propertyKey) || [];
            const labels = ids.map(id => items.get(id)?.label).filter(Boolean);
            return labels.some(label => selectedArray.includes(label));
        })
        .map(item => item.internalId)
    );
    const visited = new Set(selectedItemsSet);
    const queue = [...selectedItemsSet];
    while (queue.length > 0) {
        const currentId = queue.shift();
        for (const conn of connections) {
            if (conn.source !== currentId) continue;
            if (!filteredItemIds.has(conn.source) || !filteredItemIds.has(conn.target)) continue;
            const neighborId = conn.target;
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }
    return visited;
}

/**
 * Function to generate visible data based on various filters and properties.
 * @param {Map} items - Map of items where keys are item IDs and values are item objects
 * @param {Array} connections - Array of connection objects where each object has source, target, property, and qualifiers 
 * @param {Array} yearRange - Array with two elements representing the start and end year [startYear, endYear]
 * @param {String} selectedNarrative - The narrative label to filter items by
 * @param {Array} selectedSelection - Array of selected labels to filter items by selection
 * @param {Array} selectedVocabulary - Array of selected labels to filter items by vocabulary
 * @param {Array} timeProperties - Array of time-related properties to check for each item
 * @returns {Object} - An object containing:
 * - visibleItems: A Map of items that are visible after applying the filters
 * - visibleConnections: An array of connection objects that are visible after applying the filters
 */
export function generateVisibleData(items, connections, yearRange, selectedNarrative, selectedSelection, selectedVocabulary, timeProperties) {
    let newVisibleItems = new Map();
    let newVisibleConnections = [];
    const updatedItems = new Map(items);
    const itemsArray = Array.from(items.values());

    // Filter items by yearRange
    let filteredItems = filterItemsByYearRange(itemsArray, yearRange, timeProperties);
    let filteredItemIds = new Set(filteredItems.map(item => item.internalId));

    // Narrative filter
    if (selectedNarrative && selectedNarrative.length > 0) {
        const narrativeIds = getNarrativeItemIds(filteredItems, items, connections, selectedNarrative);
        filteredItems = filteredItems.filter(i => narrativeIds.has(i.internalId));
        filteredItemIds = new Set(filteredItems.map(i => i.internalId));
    }
    // Selection filter
    if (selectedSelection && selectedSelection.length > 0) {
        const selectionIds = traverseSelectionOrVocabulary(filteredItems, items, connections, filteredItemIds, "P62", selectedSelection);
        filteredItems = filteredItems.filter(i => selectionIds.has(i.internalId));
        filteredItemIds = new Set(filteredItems.map(i => i.internalId));
    }
    // Vocabulary filter
    if (selectedVocabulary && selectedVocabulary.length > 0) {
        const vocabularyIds = traverseSelectionOrVocabulary(filteredItems, items, connections, filteredItemIds, "P63", selectedVocabulary);
        filteredItems = filteredItems.filter(i => vocabularyIds.has(i.internalId));
        filteredItemIds = new Set(filteredItems.map(i => i.internalId));
    }

    // Assign coordinates
    filteredItems.forEach(item => {
        let coord = null;
        if (item.properties.has("P10")) {
            const coordValue = item.properties.get("P10")[0];
            coord = [coordValue.latitude, coordValue.longitude];
        } else if (item.properties.has("P15")) {
            const locationId = item.properties.get("P15")[0];
            const locationItem = items.get(locationId);
            if (locationItem?.properties?.has("P10")) {
                const coordValue = locationItem.properties.get("P10")[0];
                coord = [coordValue.latitude, coordValue.longitude];
            }
        }
        if (coord) {
            const itemWithCoords = { ...item, coordinates: coord };
            newVisibleItems.set(item.internalId, itemWithCoords);
        }
    });

    // Assign coordinates to children
    let coordinatesAssigned = true;
    let iteration = 0;
    const alreadyProcessed = new Set([...newVisibleItems.keys()]);

    while (coordinatesAssigned) {
        coordinatesAssigned = false;
        iteration++;
        let newCoordsCount = 0;

        const currentVisibleItems = Array.from(newVisibleItems.values());

        currentVisibleItems.forEach((item) => {
            if (!item.coordinates) return;

            const sourceCoords = item.coordinates;

            const outgoingConnections = connections.filter(conn =>
                !unvisibleProperties.includes(conn.property) &&
                conn.source === item.internalId &&
                filteredItemIds.has(conn.target)
            );

            const targetIds = outgoingConnections
                .map(conn => conn.target)
                .filter(targetId => {
                    return !alreadyProcessed.has(targetId);
                });

            if (targetIds.length === 0) return;

            const positions = distributeItemsAroundParent(sourceCoords, targetIds.length);
            
            targetIds.forEach((targetId, index) => {
                const targetItem = updatedItems.get(targetId);
                if (targetItem) {
                    const newTargetItem = { ...targetItem, properties: new Map(targetItem.properties) };
                    newTargetItem.coordinates = [positions[index][1], positions[index][0]];
                    newVisibleItems.set(targetId, newTargetItem);
                    updatedItems.set(targetId, newTargetItem);
                    alreadyProcessed.add(targetId);
                    coordinatesAssigned = true;
                    newCoordsCount++;
                }
            });
        });

        if (newCoordsCount === 0) break;
    }

    // Build visible connections
    connections.forEach(({ source, target, property, qualifiers }) => {
        if (
            filteredItemIds.has(source) &&
            filteredItemIds.has(target) &&
            !unvisibleProperties.includes(property)
        ) {
            newVisibleConnections.push({
                source,
                target,
                property,
                qualifiers: qualifiers || {}
            });
        }
    });

    return { visibleItems: newVisibleItems, visibleConnections: newVisibleConnections };
}

/**
 * Function to check if an item is within a specified life range based on its properties.
 * @param {*} item - The item to check
 * @param {Array} yearRange - Array with two elements representing the start and end year [startYear, endYear]
 * @param {Array} timeProperties - Array of time-related properties to check for each item
 * @param {String} birthProp - Property for birth year (default: "P52")  
 * @param {String} deathProp - Property for death year (default: "P53")
 * @param {String} startProp - Property for start year (default: "P45")
 * @param {String} endProp - Property for end year (default: "P48")
 * @returns {Boolean} - True if the item is within the life range, false otherwise
 */
function isItemInLifeRange(
    item,
    yearRange,
    timeProperties,
    birthProp = "P52", deathProp = "P53",
    startProp = "P45", endProp = "P48",
    
) {
    let birthYear = null;
    let deathYear = null;
    let startYear = null;
    let endYear = null;

    for (const [property, values] of item.properties.entries()) {
        for (const value of values) {
            if (value && typeof value === "object" && value.time) {
                const match = value.time.match(/\d{4}/);
                if (match) {
                    const year = parseInt(match[0], 10);

                    if (property === birthProp) birthYear = year;
                    else if (property === deathProp) deathYear = year;
                    else if (property === startProp) startYear = year;
                    else if (property === endProp) endYear = year;
                }
            }
        }
    }

    // Use birth/death if available
    if (birthYear !== null || deathYear !== null) {
        if (birthYear === null) birthYear = deathYear;
        if (deathYear === null) deathYear = birthYear;
        return yearRange[1] >= birthYear && yearRange[0] <= deathYear;
    }

    // Use start/end time if no birth/death
    if (startYear !== null || endYear !== null) {
        if (startYear === null) startYear = endYear;
        if (endYear === null) endYear = startYear;
        return yearRange[1] >= startYear && yearRange[0] <= endYear;
    }

    let hasTimeProperty = false;

    for (const prop of timeProperties) {
        const values = item.properties.get(prop) || [];
        for (const value of values) {
            if (value && typeof value === "object" && value.time) {
                const match = value.time.match(/\d{4}/);
                if (match) {
                    hasTimeProperty = true;
                    const year = parseInt(match[0], 10);
                    
                    if (year >= yearRange[0] && year <= yearRange[1]) {
                        return true;
                    }
                }
            }
        }
    }
    if (hasTimeProperty) {
        return false;
    }

    // If no dates found, keep item
    return true;
}

/**
 * Function to get the Wikimedia image URL for a given filename.
 * @param {String} filename - The filename of the image
 * @returns {String|null} - The Wikimedia image URL or null
 */
export function getWikimediaImageUrl(filename) {

    if(!filename) return null;
    
    const normalizedFilename = filename.replace(/ /g, "_");
    
    const md5Hash = SparkMD5.hash(normalizedFilename);
    // Build the upload URL
    return `http://commons.wikimedia.org/wiki/Special:FilePath/${normalizedFilename}`;
}

/**
 * Function to get the local image URL for a given filename.
 * @param {String} filename - The filename of the image
 * @returns {String|null} - The local image URL or null
 */
export function getLocalImageUrl(filename) {
    const baseUrl = "https://wikibase.echoimages.labs.wikimedia.pt/w/images";
    if(!filename) return null;

    const normalizedFilename = filename.replace(/ /g, "_");
    const hash = SparkMD5.hash(normalizedFilename);
    const first = hash[0];
    const second = hash.substring(0, 2);

    return `${baseUrl}/${first}/${second}/${normalizedFilename}`;
}

/**
 * Function to capitalize the first letter of a string.
 * @param {String} str - The string to capitalize
 * @returns {String} - The string with the first letter capitalized
 */
export const capitalizeFirstLetter = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Function to capitalize the first letter of each word in a string.
 * @param {String} str - The string to capitalize
 * @returns {String} - The string with the first letter of each word capitalized
 */
export const capitalizeEachWord = (str) => {
    if (!str) return "";
    return str.replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Function to get property values based on property Id.
 * @param {Array} items - Array of items
 * @param {Array} properties - Array of properties
 * @param {Array} connections - Array of connections where each connection has source, target, property, and qualifiers
 * @param {String} propertyId - The property ID to filter by 
 * @returns 
 */
export function getPropertyValues(items, properties, connections, propertyId) {
    const propertyValues = new Set();
    const itemsMap = items instanceof Map
        ? items
        : new Map(items.map(item => [item.internalId, item]));

    connections.forEach(({ source, target, property }) => {
        if (property === propertyId) {
            const sourceItem = itemsMap.get(source);
            const targetItem = itemsMap.get(target);

            if (sourceItem && targetItem) {
                const sourceLabel = sourceItem.label || sourceItem.internalId;
                const targetLabel = targetItem.label || targetItem.internalId;

                propertyValues.add(targetLabel);
            }
        }
    });

    properties.forEach((property) => {
        if (property.claims.size > 0) {
            
            for (const claim of property.claims) {
                const targetItems = claim[1];
                if (claim[0] === propertyId) {
                    targetItems.forEach((item) => {
                        const itemLabel = itemsMap.get(item)?.label || item;
                        if (itemLabel) {
                            propertyValues.add(itemLabel);
                        }
                    });
                }
            }
        }
    });

    return Array.from(propertyValues);
}