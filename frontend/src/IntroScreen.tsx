import './App.css'
import { useState } from 'react';
import danceheroes from './assets/danceheroes.png';
import { useNavigate } from "react-router-dom";
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
      <button className="press-to-start" style={{pointerEvents: 'auto', background: 'transparent', border: 0, cursor: 'pointer'}} onClick={handleScreenClick}>Press to start</button>
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
