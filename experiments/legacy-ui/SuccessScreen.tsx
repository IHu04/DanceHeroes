import React, { useState, useEffect } from "react";
import './App.css';
import CameraFeed from './CameraComponent';

const SuccessScreen: React.FC = () => {
  const [countdown, setCountdown] = useState<number>(3); // Start countdown at 3
  const [showContent, setShowContent] = useState<boolean>(false); // Controls content visibility

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000); // Decrease every second
      return () => clearTimeout(timer); // Cleanup timer
    } else {
      setShowContent(true); // Show content after countdown ends
    }
  }, [countdown]);

  return (
    <div className="success-screen-container">
      {!showContent ? (
        <div className="countdown">
          <h1 style={{ fontSize: "5rem", color: "white" }}>{countdown}</h1>
        </div>
      ) : (
        <div className="container">
          <div className="left">
            <CameraFeed />
          </div>
          <div className="right">
            <h1>Generated Model Placeholder</h1>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuccessScreen;
