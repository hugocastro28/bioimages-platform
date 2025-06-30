import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useMap } from 'react-leaflet';

const ArcConnection = ({ connections, onClick }) => {
    const map = useMap();
    const containerRef = useRef();

    useEffect(() => {
        if (!map || !connections.length) return;

        if (containerRef.current) {
            d3.select(containerRef.current).remove();
        }

        const tooltip = d3.select("body").append("div")
        .attr("class", "d3-tooltip")
        .style("position", "absolute")
        .style("color", "#1A1A1A")
        .style("padding", "5px 10px")
        .style("pointer-events", "none")
        .style("z-index", 1000) 
        .style("display", "none");


        const svg = d3.select(map.getPanes().overlayPane)
            .append("svg")
            .attr("class", "d3-overlay")
            
        const g = svg.append("g").attr("class", "leaflet-zoom-hide");
        containerRef.current = svg.node();

        const project = ([lat, lng]) => map.latLngToLayerPoint([lat, lng]);

        const update = () => {
            const bounds = map.getBounds();
            const topLeft = map.latLngToLayerPoint(bounds.getNorthWest());

            svg.style("width", map.getSize().x + "px")
                .style("height", map.getSize().y + "px")
                .style("left", topLeft.x + "px")
                .style("top", topLeft.y + "px");

            g.attr("transform", `translate(${-topLeft.x},${-topLeft.y})`);

            const pathData = connections.map(conn => {
                const source = project(conn.from);
                const target = project(conn.to);
                const qualifierInfo = conn.qualifierInfo || null;
                const dx = target.x - source.x;
                const dy = target.y - source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
                const uniqueId = `${conn.name}-${conn.from[0]}-${conn.from[1]}-${conn.to[0]}-${conn.to[1]}`;
                // Get target label if available
                const targetLabel = conn.targetLabel || (conn.targetItem ? conn.targetItem.label : undefined);
                return {
                    d: `M${source.x},${source.y} A${dr},${dr} 0 0,1 ${target.x},${target.y}`,
                    id: uniqueId,
                    color: conn.color,
                    name: conn.name,
                    qualifierInfo: qualifierInfo,
                    conn,
                    targetLabel: targetLabel
                };
            });

            const paths = g.selectAll("path").data(pathData);
           
            // Draw invisible, thick hover paths for better mouse interaction
            const hoverPaths = g.selectAll(".hover-path").data(pathData, d => d.id + d.color);
            hoverPaths.enter()
                .append("path")
                .attr("class", "hover-path")
                .attr("d", d => d.d)
                .attr("stroke", "transparent")
                .attr("stroke-width", 18)
                .attr("fill", "none")
                .style("cursor", "pointer")
                .style("pointer-events", "stroke")
                .attr("opacity", 0)
                .merge(hoverPaths)
                .attr("d", d => d.d); // update on every redraw
            hoverPaths.exit().remove();

            // Draw visible paths as before, but after hover paths so they're on top
            const visiblePaths = g.selectAll(".visible-path").data(pathData, d => d.id + d.color);
            const enteringPaths = visiblePaths.enter()
                .append("path")
                .attr("class", "visible-path")
                .attr("stroke", d => d.color)
                .attr("stroke-width", 4)
                .attr("fill", "none")
                .style("cursor", "pointer")
                .style("z-index", 1)
                .attr("pointer-events", "none");
            enteringPaths.transition()
                .duration(200)
                .attr("opacity", 1);
            enteringPaths.merge(visiblePaths)
                .attr("d", d => d.d)
                .attr("stroke", d => d.color)
                .attr("fill", "none")
                .attr("stroke-width", 4)
                .attr("pointer-events", "none")
                .classed("visible", true);
            visiblePaths.exit().remove();

            // Attach events to hover paths, and on hover, select the corresponding visible path by index
            g.selectAll(".hover-path")
                .on("mouseover", function (event, d, i) {
                    // Find the corresponding visible path
                    const allVisible = g.selectAll(".visible-path").nodes();
                    const idx = g.selectAll(".hover-path").nodes().indexOf(this);
                    if (allVisible[idx]) {
                        d3.select(allVisible[idx])
                            .attr("stroke-width", 6)
                            .attr("opacity", 1);
                    }
                    tooltip
                        .style("display", "block")
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px")
                        .html(`
                            <div style="font-weight: 500; margin-bottom: 4px;">
                                ${d.name}
                            </div>
                            <div style="font-size: 13px; color: #555; margin-bottom: 2px;">
                                <span style="
                                    background-color: #eee;
                                    padding: 2px 6px;
                                    font-weight: 500;
                                    color: #333;
                                "> ${d.targetLabel || d.conn.target || ''} 
                                </span>
                            </div>
                            ${
                                Array.isArray(d.qualifierInfo)
                                ? d.qualifierInfo.map(q =>
                                    `<div style=\"color: ${q.color}; font-style: italic;\">${q.label}: ${q.value}</div>`
                                  ).join("")
                                : ""
                            }
                        `);
                })
                .on("mousemove", function (event) {
                    tooltip
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 20) + "px");
                })
                .on("mouseout", function (event, d) {
                    // Find the corresponding visible path
                    const allVisible = g.selectAll(".visible-path").nodes();
                    const idx = g.selectAll(".hover-path").nodes().indexOf(this);
                    if (allVisible[idx]) {
                        d3.select(allVisible[idx])
                            .transition()
                            .duration(200)
                            .attr("stroke-width", 4)
                            .attr("opacity", 1);
                    }
                    tooltip.style("display", "none");
                })
                .on("click", function (event, d) {
                    tooltip.style("display", "none");
                    if (onClick) onClick(d.conn);
                });
                
        };
        
        map.on("zoomend viewreset move", update);
        update();
    

        return () => {
            map.off("zoom move", update);
            map.off("zoomend moveend", update);
            map.off("zoomend viewreset move", update);
            d3.select(containerRef.current).remove();
            tooltip.remove();
        };
    }, [map, connections, onClick]);

    return null;
};

export default React.memo(ArcConnection);
