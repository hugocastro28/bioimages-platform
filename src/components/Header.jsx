import '../css/Header.css';

function Header() {
    return (
        <header className="header">
            <div className="logo">
                <a href="/">
                    <img
                        src={"/bioimages_vect.svg"}
                        alt="Bioimages Logo">
                    </img>
                </a>
            </div>
        </header>
    )
}

export default Header;