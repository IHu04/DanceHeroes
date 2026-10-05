import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LoadingScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate a loading period, then navigate to the next page
    const timer = setTimeout(() => {
      navigate("/success");
    }, 3000); // 3 seconds loading period

    return () => clearTimeout(timer); // Cleanup the timer
  }, [navigate]);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", backgroundColor: "#282c34" }}>
      <h1 style={{ color: "white" }}>Processing your file...</h1>
    </div>
  );
};

export default LoadingScreen;
