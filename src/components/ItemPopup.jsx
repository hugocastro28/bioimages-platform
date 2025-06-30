import React from "react";
import { getWikimediaImageUrl, getLocalImageUrl, capitalizeFirstLetter } from "../utils";

/**
 * Processes a property and its values to format them for display in the popup.
 * @param {String} property - The property identifier (e.g., "P31").
 * @param {Map} propertyDetailsMap - Map containing details about properties.
 * @param {*} values - The values associated with the property.
 * @param {Map} items - map of items where keys are item IDs and values are item objects.
 * @returns 
 */
const processProperty = (property, propertyDetailsMap, values, items) => {
    
    const propertyDetail = propertyDetailsMap.get(property);
    const datatype = propertyDetail?.datatype || "";
    const label = propertyDetail?.label || "";

    let formattedValues;

    // Handle item
    if (datatype.includes("item")) {
        formattedValues = values.map(id => items.get(id)?.label || id).join(", ");

    // Handle url
    } else if (datatype.includes("url")) {
        formattedValues = values.map(url => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer">{url}</a>
        ));

    // Handle time    
    } else if (datatype.includes("time")) {
        formattedValues = values.map(v => {
            const match = v.time.match(/\d{4}/);
            return match ? match[0] : v;
        }).join(", ");

    // Handle coordinate
    } else if (datatype.includes("coordinate")) {
        if (property === "P27") {
            formattedValues = values.map(coord => {
                const lat = coord.latitude;
                const lon = coord.longitude;
                return (
                    <a key={coord} href={`https://maps.google.com/?q=${lat},${lon}`} target="_blank" rel="noopener noreferrer">
                        {lat}, {lon}
                    </a>
                );
            });
        }
        else { return (<></>);}
    
    // Handle commonsMedia
    } else if (datatype.includes("commonsMedia")) {
        if (property === "P6")
            return <></>
        formattedValues = values.map(image => {
            const imageUrl = getWikimediaImageUrl(image);
            return (
                <img key={image} src={imageUrl} alt="Item Image"/>
            );
        });
        return (
            <div key={property} className="property-value">
                <span className="property-label">{capitalizeFirstLetter(label)}: </span>
                <div className="item-images">
                    {formattedValues}
                </div>
            </div>
        )

    // Handle localMedia
    } else if (datatype.includes("localMedia")) {
        if (property === "P6")
            return <></>
        formattedValues = values.map(image => {
            const imageUrl = getLocalImageUrl(image);
            return (
                <img key={image} src={imageUrl} alt="Item Image"/>
            );
        });
        return (
            <div key={property} className="property-value">
            <span className="property-label">{capitalizeFirstLetter(label)}: </span>
            <div className="item-images">
                {formattedValues}
            </div>
            </div>
        )

    // Handle property
    } else if (datatype.includes("property")) {
        formattedValues = values.map(id => {
            const prop = propertyDetailsMap.get(id);
            if (prop) {
            const propId = id.split("/").pop();
            const propLabel = prop.label || propId;
            return (
                <span key={id}>{propLabel}</span>
            );
            }
            return <span key={id}>{id}</span>;
        }).reduce((acc, curr, idx) => 
            idx === 0 ? [curr] : [...acc, ', ', curr], []
        );
    
    // other datatypes
    } else {
        formattedValues = values.join(", ");
    }
    return (
        <div key={property} className="property-value">
            <span className="property-label">{capitalizeFirstLetter(label)}: </span>
            <span className="property-value-text">{formattedValues}</span>
        </div>
    );
};

/**
 * ItemPopup component displays detailed information about an item, including its label, description, and properties
 */
const ItemPopup = ({items, item, image, propertyDetailsMap }) => {
    const prefix = "https://wikibase.echoimages.labs.wikimedia.pt/wiki/Item:";
    return (
        <div className="popup-item-content">
            <div className="popup-scroll">
                <div className="image-label">
                    {image && <img src={image} alt="Item Icon"/>}
                    <div className="label-text">
                        <a href={`${prefix}${item.id}`} target="_blank" rel = "noopener noreferrer">{capitalizeFirstLetter(item.label)}</a>
                        {item.description ? (
                            <div className="item-description">{capitalizeFirstLetter(item.description)}</div>
                        ) : (
                            (() => {
                                const longDescIds = item.properties.get("P89");
                                if (longDescIds && longDescIds.length > 0) {
                                    const fallbackDesc = longDescIds
                                        .map(id => items.get(id)?.label || id)
                                        .join(", ");
                                    return <div className="item-description">{capitalizeFirstLetter(fallbackDesc)}</div>;
                                }
                                return null;
                            })()
                        )}
                    </div>
                </div>
                {Array.from(item.properties.entries())
                    .filter(([prop]) => prop !== "P89")
                    .map(([prop, values]) => (
                        <React.Fragment key={prop}>
                            {processProperty(prop, propertyDetailsMap, values, items)}
                        </React.Fragment>
                    ))
                }
            </div>
        </div>
    );
}

export default React.memo(ItemPopup);