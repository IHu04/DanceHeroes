import { useNavigate } from 'react-router-dom';
import DragDropUploader from './DragDropUploader';
import './App.css';

export default function ScreenTwo() {
  const navigate = useNavigate();
  return (
    <section className="song-screen">
      <h1>Choose your dance</h1>
      <p>Play the bundled routine, or upload WAV audio with a configured choreography generator.</p>
      <button className="primary-button" onClick={() => navigate('/gamescene')}>Play demo dance</button>
      <h2>Generate a dance from your music</h2>
      <DragDropUploader />
      <button onClick={() => navigate('/')}>Back to title</button>
    </section>
  );
}
