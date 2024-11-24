// GameScene.jsx

import React, { useState } from 'react';
import InitialModelComponent from './InitialModelComponent.jsx';
import GameModelComponent from './GameModelComponent.jsx';
import './GameScene.css';
import { useNavigate } from 'react-router-dom';
import Testing from './test.jsx';

const GameScene = () => {
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [score, setScore] = useState(0); // State to hold the score
  const navigate = useNavigate();

  const handleStartGame = () => {
    console.log('Start Game button clicked');
    setIsGameStarted(true);
    console.log('isGameStarted:', isGameStarted);
    playAudio();
  };

  const playAudio = () => {
    const audio = new Audio('/src/assets/amongus.mp3');
    audio.play();
  };

  const handleEndGame = () => {
    const totalScore = score; // Use the current score
    navigate('/EndScreen', { state: { totalScore } });
  };

  const updateScore = (newScore) => {
    setScore(newScore);
  };

  return (
    <div className="game-container">
      {!isGameStarted && (
        <button className="start-game-button" onClick={handleStartGame}>
          Start Game
        </button>
      )}
      {isGameStarted && (
        <>
          <button className="end-game-button" onClick={handleEndGame}>
            End Game
          </button>
          
        </>
      )} 
      {/* <div id="modledisplay">
        <div className="left-half">
          <InitialModelComponent
            isGameStarted={isGameStarted}
            updateScore={updateScore}
          />
        </div>
        <div className="divider"></div>
        <div className="right-half">
          <Testing isGameStarted={isGameStarted}/>
        </div>
      </div> */}
      <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
        {/* Left side for InitialModelComponent */}
        <div style={{ flex: 1 }}>
          <InitialModelComponent isGameStarted={isGameStarted} updateScore={updateScore} />
        </div>

        {/* Right side for Testing */}
        <div style={{ flex: 1 }}>
          <Testing isGameStarted={isGameStarted} />
        </div>
      </div>
    </div>
  );
};

export default GameScene;
