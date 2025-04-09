import React from 'react';
import './App.css';
import VideoRecorder from './components/VideoRecorder';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Video Streaming</h1>
      </header>
      <main>
        <VideoRecorder />
      </main>
      <footer>
        <p>Video streaming application</p>
      </footer>
    </div>
  );
}

export default App;
