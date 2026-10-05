import { Routes, Route, Navigate } from 'react-router-dom';
import IntroScreen from './IntroScreen';
import ScreenTwo from './ScreenTwo';
import GameScene from './GameScene.jsx';
import EndScreen from './EndScreen';
import GradientBackground from './GradientBackground';
import './App.css';

export default function App() {
  return (
    <main className="app-shell">
      <div className="background-container"><GradientBackground /></div>
      <Routes>
        <Route path="/" element={<IntroScreen />} />
        <Route path="/screen-two" element={<ScreenTwo />} />
        <Route path="/gamescene" element={<GameScene />} />
        <Route path="/EndScreen" element={<EndScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
