import VRMApp from "./VRMApp.jsx";
import "./GameScene.css";
import { useNavigate } from "react-router-dom";

const GameScene = () => {
    const navigate = useNavigate(); // Hook for navigation
    const totalScore = 1500;
    const endGame = () => {
      // Logic to handle end game
      navigate("/EndScreen", { state: { totalScore } });
    };
  

    return (
        <div className="game-container">
            <button className="end-game-button" onClick={endGame}>
          End Game
        </button>
            <div className="left-half">
                <VRMApp />
            </div>
            <div className="divider"></div>
            <div className="right-half">
                {/* Add components or content for the right half */}
            </div>
        </div>
    );
};

export default GameScene;
