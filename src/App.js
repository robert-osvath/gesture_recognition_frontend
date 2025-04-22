import React, { useState, useEffect } from 'react';
import './App.css';
import VideoRecorder from './components/VideoRecorder';
import ChatInterface from './components/ChatInterface';
import NotificationContainer from './components/NotificationContainer';

function App() {
  const [messages, setMessages] = useState([]);
  
  // Function to handle when a video is recorded and uploaded
  const handleVideoRecorded = (videoUrl, responseData) => {
    // Create a new message for the user's video
    const userMessage = {
      sender: 'user',
      type: 'video',
      content: videoUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    // Add the user message to the chat
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Simulate a bot response after a short delay
    setTimeout(() => {
      const botMessage = {
        sender: 'bot',
        type: 'text',
        content: 'Thank you for your video message! I\'m processing it now.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    }, 1500);
  };
  
  // Add a welcome message when the app first loads
  useEffect(() => {
    const welcomeMessage = {
      sender: 'bot',
      type: 'text',
      content: 'Hello! I\'m your video chatbot. Record a video message to start our conversation.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([welcomeMessage]);
  }, []);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Video Chatbot</h1>
      </header>
      <main className="split-screen">
        <div className="chat-panel">
          <ChatInterface messages={messages} />
        </div>
        <div className="recorder-panel">
          <VideoRecorder onVideoRecorded={handleVideoRecorded} />
        </div>
      </main>
      <footer className="App-footer">
        <p>© 2023 Video Chatbot</p>
      </footer>
      <NotificationContainer />
    </div>
  );
}

export default App;
