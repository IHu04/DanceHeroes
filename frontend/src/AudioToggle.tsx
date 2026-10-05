import { useState, useRef } from "react";
import pauseImg from "./assets/play.png"; // Play icon image
import playImg from "./assets/pause.png"; // Pause icon image
import audioFile from "./assets/amongus.mp3"; // Audio file
import './GradientBackground.css';

const AudioToggle = () => {
  const [isPlaying, setIsPlaying] = useState(false); // Track play/pause state
  const audioRef = useRef<HTMLAudioElement | null>(null); // Reference to audio element

  const handleAudioToggle = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause(); // Pause audio
    } else {
      audioRef.current.play(); // Play audio
    }
    setIsPlaying(!isPlaying); // Toggle play/pause state
  };

  return (
    <div className="audio-container">
      {/* Audio element */}
      <audio ref={audioRef} src={audioFile} loop />

      {/* Toggle button */}
      <img
        src={isPlaying ? pauseImg : playImg} // Show play/pause image based on state
        alt="Audio Toggle"
        onClick={handleAudioToggle}
        style={{ cursor: "pointer", width: "50px", height: "50px" }}
      />
    </div>
  );
};

export default AudioToggle;
