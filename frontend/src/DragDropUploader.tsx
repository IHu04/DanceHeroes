import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './DragDrop.css';

export default function DragDropUploader() {
  const [available, setAvailable] = useState(false);
  const [message, setMessage] = useState('Checking music generation…');
  const [processing, setProcessing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    axios.get('/api/health', { signal: controller.signal }).then(({ data }) => {
      setAvailable(data.generation_available);
      setMessage(data.generation_available ? 'Choose or drop a WAV file (up to 50 MB).' :
        'Custom music generation needs the EDGE setup described in the README. The demo dance is ready to play.');
    }).catch(() => { if (!controller.signal.aborted) setMessage('Start the backend with npm start to enable uploads and scoring.'); });
    return () => controller.abort();
  }, []);
  async function upload(file?: File) {
    if (!file || !available || processing) return;
    if (!file.name.toLowerCase().endsWith('.wav') || file.size > 50 * 1024 * 1024) {
      setMessage('Choose a WAV file smaller than 50 MB.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    setProcessing(true);
    setMessage('Generating choreography. This can take several minutes…');
    try {
      const { data } = await axios.post('/api/upload', form, { timeout: 620000 });
      navigate('/gamescene', { state: data });
    } catch (error) {
      setMessage(axios.isAxiosError(error) ? error.response?.data?.error || 'Unable to upload. Check the backend terminal.' : 'Unable to upload the file.');
    } finally { setProcessing(false); }
  }
  return (
    <div>
      <button className="drag-drop-area" disabled={!available || processing}
        onClick={() => input.current?.click()}
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); void upload(event.dataTransfer.files[0]); }}>
        {processing ? 'Generating…' : 'Choose WAV audio'}
      </button>
      <input ref={input} type="file" accept=".wav" hidden onChange={event => { void upload(event.target.files?.[0]); }} />
      <p role="status">{message}</p>
    </div>
  );
}
