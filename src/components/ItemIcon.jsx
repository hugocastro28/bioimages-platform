import L from 'leaflet';
import { capitalizeFirstLetter } from '../utils';

const ItemIcon = (item, image) => {
  const isRoot = item.properties?.has('P10');
  const containerClass = isRoot ? "root-item-icon-image" : "item-icon-image";
  const fallbackClass = isRoot ? "root-item-icon-text" : "item-icon-text";

  const iconSize = [110, 120];
  const iconAnchor = [60, 55];
  const popupAnchor = [0, 150];

  const label = capitalizeFirstLetter(item.label);

  if (image) {
    return new L.DivIcon({
      html: `
        <div class="${containerClass}">
          <div class="image-container">
            <img src="${image}" alt="Item Icon"/>
          </div>
          <div class="item-label">${label}</div>
        </div>`,
      className: "custom-icon-container",
      iconSize,
      iconAnchor,
      popupAnchor,
    });
  } else {
    return new L.DivIcon({
      html: `
        <div class="${fallbackClass}">
          <div class="item-label">${label}</div>
        </div>`,
      className: "custom-icon-container",
      iconSize: [100, 20],
      iconAnchor: [50, 10],
      popupAnchor: [0, 50],
    });
  }
};

export default ItemIcon;