import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "./App.css";

// Props interface (optional if always using state)
interface EndScreenProps {
  totalScore?: number; // Optional if using location state
}

const EndScreen: React.FC<EndScreenProps> = () => {
  const location = useLocation();
  const totalScore = location.state?.totalScore || 0; // Retrieve score from state or fallback to 0
  const [currentScore, setCurrentScore] = useState<number>(0); // State to track the animated score

  useEffect(() => {
    const increment = Math.ceil(totalScore / 100); // Increment size based on the total score
    const interval = setInterval(() => {
      setCurrentScore((prevScore) => {
        if (prevScore + increment >= totalScore) {
          clearInterval(interval); // Stop the interval when we reach the target
          return totalScore;
        }
        return prevScore + increment;
      });
    }, 10); // Adjust for smoother animation (10ms interval)

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [totalScore]);

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Dance Finished!</h1>
      <p style={styles.score}>Final Score: {currentScore}</p>
    </div>
  );
};

// Inline styles (you can replace this with a CSS/SCSS module)
const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    backgroundColor: "#333",
    color: "#fff",
    zIndex: 1000,
  } as React.CSSProperties,
  header: {
    fontSize: "3rem",
    marginBottom: "1rem",
  } as React.CSSProperties,
  score: {
    fontSize: "2rem",
  } as React.CSSProperties,
};

export default EndScreen;
