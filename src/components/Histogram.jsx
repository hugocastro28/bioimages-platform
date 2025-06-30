import React, { useState } from "react";
import Slider from "rc-slider";

const Histogram = ({ items }) => {

    const [yearRange, setYearRange] = useState([1500, 2025]);

    return (
        <div className="histogram-slider-container">
            <div className="slider-container">
                <Slider
                    range
                    className="histogram-slider"
                    onChange={setYearRange}
                    value={yearRange}
                    min={1500}
                    max={2025}
                />

            </div>
            Hello Histogram
        </div>
    );
};

export default Histogram;




