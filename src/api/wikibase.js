import axios from "axios";
import { cloneProperties } from "../utils";

const API_URL = "https://wikibase.echoimages.labs.wikimedia.pt/w/api.php"
const SPARQL_URL = "https://query.echoimages.labs.wikimedia.pt/proxy/wdqs/bigdata/namespace/wdq/sparql"

export const fetchItemsAPI = async () => {
    //console.log("Fetching items from API...");
    try {
        const idsQuery = `
        SELECT ?item WHERE {
            ?item rdfs:label ?itemLabel.
            FILTER(STRSTARTS(STR(?item), "https://wikibase.echoimages.labs.wikimedia.pt/entity/Q"))
            
            BIND( xsd:integer(STRAFTER(STR(?item), "https://wikibase.echoimages.labs.wikimedia.pt/entity/Q")) AS ?itemNumber )
        }
        ORDER BY ASC(?itemNumber)
        `
        const url = `${SPARQL_URL}?query=${encodeURIComponent(idsQuery)}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        const ids = data.results.bindings.map(b => b.item.value.split("/").pop());
        // Batch fetch using wbgetentities (max 50 IDs per request is recommended)
        const batchSize = 50;
        const items = new Map();
        const connections = [];
        const cloneIds = new Set();

        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize).join("|");

            const entityResponse = await axios.get(API_URL, {
                params: {
                    action: "wbgetentities",
                    format: "json",
                    ids: batch,
                    origin: "*"
                },
            });

            const entities = entityResponse.data.entities;
            //console.log("Entities:", entities);

            for (const [id, entity] of Object.entries(entities)) {
                const label = entity.labels?.en?.value || "No Label";
                const description = entity.descriptions?.en?.value || "";
                const claims = entity.claims || {};

                const item = {
                    id,
                    internalId: id,
                    label,
                    description,
                    properties: new Map()
                };

                for (const [prop, claimArray] of Object.entries(claims)) {
                    const values = [];

                    claimArray.forEach(claim => {
                        const value = claim.mainsnak?.datavalue?.value;
                        const qualifiers = claim.qualifiers || {};

                        let targetId = null;

                        // Handle different datatypes
                        if (value && typeof value === "object" && value.id) {
                            targetId = value.id;
                            values.push(targetId);

                            // Add connection if it's an entity
                            if (/^Q\d+$/.test(targetId)) {
                                const qualifiersParsed = {};

                                for (const [qProp, qVals] of Object.entries(qualifiers)) {
                                    qualifiersParsed[qProp] = qVals.map(q => {
                                        const qValue = q.datavalue?.value;
                                        return typeof qValue === "object" && qValue.id ? qValue.id : qValue;
                                    });
                                }

                                if (cloneProperties.includes(prop)) {
                                    const randomSuffix = Math.floor(Math.random() * 10000); // Random 4-digit number
                                    targetId = `modified_${targetId}_${randomSuffix}`; // Prefix for modified items
                                    cloneIds.add(targetId); // Add to duplicates set
                                }

                                connections.push({
                                    source: id,
                                    target: targetId,
                                    property: prop,
                                    qualifiers: qualifiersParsed
                                });
                            }
                        } else if (value !== undefined) {
                            values.push(value);
                        }
                    });

                    if (values.length > 0) {
                        item.properties.set(prop, values);
                    }
                }

                items.set(id, item);
            }
        }

        // After processing all batches and before returning the result
        for (const modifiedId of cloneIds) {
            // Extract the original QID (remove "modified_" prefix)
            const originalId = modifiedId.split('_')[1]; // Takes "Q2" from "modified_Q2_1234"

            // Get the original item
            const originalItem = items.get(originalId);
            
            if (originalItem) {
                // Create a copy of the original item with the modified ID
                const modifiedItem = {
                    ...originalItem,
                    id: originalId,
                    internalId: modifiedId 
                };
                
                // Add to the items Map
                items.set(modifiedId, modifiedItem);
            }
        }

        //console.log("Fetched items from API:", items);

        return { items, connections };

    } catch (error) {
        console.error("❌ Error fetching items:", error);
        return { items: new Map(), connections: [] };
    }
};

export const fetchPropertiesAPI = async () => {
    try {
        const idsQuery = `
            SELECT ?property WHERE {
            ?property a wikibase:Property.
            BIND( xsd:integer(STRAFTER(STR(?item), "https://wikibase.echoimages.labs.wikimedia.pt/entity/P")) AS ?itemNumber )
            }
            ORDER BY ASC(?itemNumber)
        `
        const url = `${SPARQL_URL}?query=${encodeURIComponent(idsQuery)}&format=json`;
        const response = await fetch(url);
        const data = await response.json();
        const ids = data.results.bindings.map(b => b.property.value.split("/").pop());
        // Batch fetch using wbgetentities (max 50 IDs per request is recommended)
        const batchSize = 50;
        const properties = new Map();

        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize).join("|");

            const entityResponse = await axios.get(API_URL, {
                params: {
                    action: "wbgetentities",
                    format: "json",
                    ids: batch,
                    origin: "*"
                },
            });

            const entities = entityResponse.data.entities;

            //console.log("Entities:", entities);

            for (const [id, entity] of Object.entries(entities)) {
                const label = entity.labels?.en?.value || "No Label";
                const aliases = entity.aliases?.en || [];
                const description = entity.descriptions?.en?.value || "";
                const datatype = entity.datatype || "";
                const claims = entity.claims || {};

                const property = {
                    id,
                    label,
                    aliases,
                    description,
                    datatype,
                    claims: new Map()
                };

                for (const [prop, claimArray] of Object.entries(claims)) {
                    const values = [];
                    //console.log("ClaimArray: ", prop, claimArray);   

                    claimArray.forEach(claim => {
                        const value = claim.mainsnak?.datavalue?.value;

                        let targetId = null;

                        // Handle different datatypes
                        if (value && typeof value === "object" && value.id) {
                            targetId = value.id;
                            values.push(targetId);
                        } else if (value !== undefined) {
                            values.push(value);
                        }
                    });
                    if (values.length > 0) {
                        property.claims.set(prop, values);
                    }
                }

                properties.set(id, property);
            }
        }
        
        return properties;

    } catch (error) {
        console.error("❌ Error fetching properties:", error);
        return { properties: new Map(), connections: [] };
    }
};
