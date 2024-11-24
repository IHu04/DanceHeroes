import './App.css'
import { useState } from 'react';
import danceheroes from './assets/danceheroes.png';
import { useNavigate } from "react-router-dom";
import PressToStart from './PresstoStart.tsx';
import AudioToggle from './AudioToggle.tsx';
import Instructions from "./Instructions";
import instructionsIcon from "./assets/instructions.png"

function IntroScreen() {
  const navigate = useNavigate();
  const [showInstructions, setShowInstructions] = useState(false);
  const toggleInstructions = () => {
    setShowInstructions((prev) => !prev);
  };
  const handleScreenClick = () => {
    console.log("Clicked!");
    navigate("/screen-two");
  };

  return (
    <div>
      <div className="responsive-image-container" onClick={handleScreenClick}>
        <img src={danceheroes} alt="Dance Heroes" className="responsive-image" />
      </div>
      <PressToStart/>
      <AudioToggle/>
      <div className="instructions-icon-container" onClick={toggleInstructions}>
        <img
          src={instructionsIcon}
          alt="Instructions"
          className="instructions-icon"
        />
      </div>
      {showInstructions && <Instructions />}

    </div>
  );
}

export default IntroScreen;
