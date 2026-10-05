import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import InitialModelComponent from './InitialModelComponent.jsx';
import DanceModel from './DanceModel.jsx';
import demoAudio from './assets/amongus.mp3';
import './GameScene.css';

export default function GameScene() {
  const [sessionId, setSessionId] = useState(null);
  const [started, setStarted] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [ready, setReady] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState('');
  const targetPose = useRef(null);
  const audioRef = useRef(null);
  const navigate = useNavigate();
  const { state } = useLocation();
  const audioUrl = state?.audio_url || demoAudio;
  const animationUrl = state?.animation_url || '/models/dance.fbx';

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, [audioUrl]);

  async function start(useCamera) {
    setError('');
    try {
      const { data } = await axios.post('/api/sessions');
      await audioRef.current.play();
      setTracking(useCamera);
      setSessionId(data.session_id);
      setStarted(true);
    } catch {
      setError('Unable to start. Make sure the backend is running and audio playback is allowed.');
    }
  }
  function finish() {
    audioRef.current?.pause();
    navigate('/EndScreen', { state: { totalScore: score } });
  }

  return (
    <section className="game-container">
      <header className="game-toolbar">
        <button onClick={() => navigate('/screen-two')}>Back to songs</button>
        <strong aria-live="polite">Score: {score}</strong>
        {started ? <button onClick={finish}>End Game</button> :
          <div><button onClick={() => start(false)} disabled={!ready}>Watch demo</button> <button onClick={() => start(true)} disabled={!ready}>{ready ? 'Start Game' : 'Loading dance…'}</button></div>}
      </header>
      {error && <p role="alert" className="game-message">{error}</p>}
      <div className="dance-panels">
        <div className="dance-panel">
          <h2>Your moves</h2>
          <InitialModelComponent isGameStarted={started && tracking} sessionId={sessionId}
            getTargetPose={() => targetPose.current} updateScore={setScore} />
        </div>
        <div className="dance-panel">
          <h2>Follow the dancer</h2>
          <DanceModel isGameStarted={started} animationUrl={animationUrl}
            onPose={pose => { targetPose.current = pose; }}
            onReady={() => setReady(true)} onError={setError} />
        </div>
      </div>
      <p className="game-message">{started && !tracking ? 'Demo playback. Start a new game to try webcam scoring.' : 'Allow camera access after starting, then step back so your full body is visible.'}</p>
    </section>
  );
}
