import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchItemsAPI, fetchPropertiesAPI } from "../api/wikibase";

/**
 * Custom hook to fetch Wikibase data.
 * @returns {Object} An object containing:
 * - items: Array of items fetched from the API.
 * - connections: Array of connections fetched from the API.
 * - properties: Array of properties fetched from the API.
 * - propertyMap: Map where keys are property IDs and values are property labels.
 */
const useWikibaseData = () => {
    const [items, setItems] = useState([]);
    const [connections, setConnections] = useState([]);
    const [properties, setProperties] = useState([]);

    const getItems = useCallback(async () => {
        try{
            const result = await fetchItemsAPI();
            setItems(result.items);
            setConnections(result.connections);
        } catch (error) {
            console.log("Error fetching new items", error);
        }
    },[]);

    const getProperties = useCallback(async () => {
        try {
            const result = await fetchPropertiesAPI();
            setProperties(Array.from(result.values()));
        } catch (error) {
            console.error("Error fetching properties:", error);
        }
    }, []);

    const propertyMap = useMemo(() => {
        return new Map(properties.map(p => [
            p.id,
            p.label,
        ]));
    }, [properties]);

    useEffect(() => {
        Promise.all([getItems(), getProperties()])
            .catch(error => console.error("Error in fetching data:", error));
    }, [getItems, getProperties]);

    return {
        items,
        connections,
        properties,
        propertyMap,
    };
}

export default useWikibaseData;
