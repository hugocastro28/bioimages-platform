import L from "leaflet";

const clusterIcon = (cluster) => {
    const count = cluster.getChildCount();

    return L.divIcon({
        html: `<div class="polaroid-cluster">
                <div class="polaroid-frame">
                    <div class="polaroid-photo">
                        <span>${count}</span>
                    </div>
                </div>
            </div>`,
        className: "custom-cluster-container",
        iconSize: L.point(70, 70),
        iconAnchor: L.point(35, 40),
    })
}

export default clusterIcon