import { Routes, Route, useLocation } from "react-router-dom";
import ScreenOne from "./IntroScreen";
import ScreenTwo from "./ScreenTwo";
import { useState } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import './App.css';
import GradientBackground from "./GradientBackground";
import SuccessScreen from "./SuccessScreen";
import GLTFViewer from "./FBXVisualizer.jsx";
import GameScene from "./GameScene.jsx";
import EndScreen from "./EndScreen";
import Testing from "./test.jsx";
const App = () => {
  const location = useLocation();
  
  return (
    <div className="background-container">
    
      <GradientBackground />
      <TransitionGroup>
        <CSSTransition key={location.key} classNames="fade" timeout={1000}>
          <div>
            <Routes location={location}>
              <Route path="/" element={<ScreenOne />} />
              <Route path="/screen-two" element={<ScreenTwo />}/>
              <Route path="/success" element={<SuccessScreen />}/>
              <Route path="/gamescene" element={<GameScene />}/>
              <Route path="/visualizeModel" element={<GLTFViewer />}/>
              <Route path="/EndScreen" element={<EndScreen/>}/>
              <Route path="/test" element={<Testing/>}/>
            </Routes>
          </div>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
};

export default App;

