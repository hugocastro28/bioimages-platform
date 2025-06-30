import "../css/Footer.css";
import CarbonBadge from "./CarbonBadge";

function Footer() {
    return (
        <footer className="footer">
            <div className="nav-links">
                <img
                    src="/ei_vect.svg"
                    alt="EChOImages Logo"
                    className="ei_logo"
                />
                <a href="https://wikibase.echoimages.labs.wikimedia.pt/wiki/Main_Page" className="wiki-project" target="_blank" rel="noopener noreferrer">project's wiki</a>
                <CarbonBadge />
            </div>
        </footer>
    );
}

export default Footer;