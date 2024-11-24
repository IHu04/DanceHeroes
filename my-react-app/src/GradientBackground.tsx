import React from 'react';
import './GradientBackground.css';
import Stars from "./stars.tsx";

const GradientBackground: React.FC = () => {
  return (
    <>
    <div className="background-container">
      <div className="gradient-overlay"></div>
    </div>
    <Stars />
    </>
  );
};

export default GradientBackground;
