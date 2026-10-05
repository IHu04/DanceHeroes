import React, { useState } from "react";

const generateStars = (count: number) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 100, // Random horizontal position (0-100%)
      y: Math.random() * 100, // Random vertical position (0-100%)
      opacity: Math.random() * 0.3 + 0.3, // Random brightness (0.3-0.6)
    });
  }
  return stars;
};
const Stars = ({ count = 50 }: { count?: number }) => {
  const [stars] = useState(() => generateStars(count)); // Generate once

  return (
    <div className="stars">
      {stars.map((star, index) => (
        <div
          key={index}
          className="star"
          style={{
            "--x": `${star.x}%`,
            "--y": `${star.y}%`,
            "--opacity": star.opacity,
          } as React.CSSProperties}
        ></div>
      ))}
    </div>
  );
};

export default Stars;
