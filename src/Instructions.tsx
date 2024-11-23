import "./Instructions.css"; // Import styles for the component

const Instructions = () => {
  return (
    <div className="instructions-container">
      <h1>How to Play</h1>
      <ul>
        <li>Choose a song</li>
        <li>Follow along to the dance model</li>
        <li>The closer your dance moves are to the model, the more points you get!</li>
        <li>Maximize your points, and become a Dance Hero!</li>
      </ul>
    </div>
  );
};

export default Instructions;
