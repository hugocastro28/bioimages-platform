import React, { useEffect, useState } from "react";
import { WebsiteCarbonBadge } from "react-websitecarbon-badge";

const CarbonBadge = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const match = window.matchMedia("(prefers-color-scheme: dark)");
    const updateTheme = (e) => setIsDarkMode(e.matches);

    setIsDarkMode(match.matches); // Initial check
    match.addEventListener("change", updateTheme); // Listen for changes

    return () => {
      match.removeEventListener("change", updateTheme);
    };
  }, []);

  return (
    <div style={{ marginTop: "20px", textAlign: "center" }}>
      <WebsiteCarbonBadge dark={isDarkMode} url="https://echoimages.labs.wikimedia.pt/" />
    </div>
  );
};

export default CarbonBadge;
