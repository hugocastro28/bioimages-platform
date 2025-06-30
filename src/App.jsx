import {BrowserRouter as Router, Routes, Route} from "react-router-dom";
import './App.css'
import Header from './components/Header'
import Footer from './components/Footer'
import MainPage from "./pages/MainPage";
import AboutPage from "./pages/AboutPage";

function App() {

  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<MainPage/>}/>
        <Route path="/about" element={<AboutPage/>}/>
        <Route />
      </Routes>
      <Footer />
    </Router>
  )
}

export default App
