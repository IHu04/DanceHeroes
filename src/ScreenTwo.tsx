import React from "react";
import { useNavigate } from "react-router-dom";
import DragDropUploader from "./DragDropUploader";
import "./App.css"

const ScreenTwo: React.FC = () => {
  const navigate = useNavigate(); // React Router navigation hook

  const handleDemoClick = () => {
    navigate("/gamescene"); // Navigate to the demo page
  };

  return (
    <div>
      <h1 style={{ textAlign: "center", color: "white" }}>Upload your music here!</h1>
      <DragDropUploader />

      <button className="demoButton"
        onClick={handleDemoClick}
      >
        Song: Example
      </button>
    </div>
  );
};

export default ScreenTwo;
