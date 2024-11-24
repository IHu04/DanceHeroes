import React from "react";

const Star = ({ x, y, opacity }: { x: number; y: number; opacity: number }) => (
  <div
    className="star"
    style={{
      "--x": `${x}%`, // Pass percentage values
      "--y": `${y}%`, // Pass percentage values
      "--opacity": opacity, // Pass opacity directly
    } as React.CSSProperties}
  ></div>
);

export default Star;
