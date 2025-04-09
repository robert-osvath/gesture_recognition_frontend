import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const VideoRecorder = () => {
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('');
    
    // Initialize the video stream
    useEffect(() => {
        const initializeStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true, 
                    audio: true 
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setError(`Error accessing media devices: ${err.message}`);
                console.error('Error accessing media devices:', err);
            }
        };
        
        initializeStream();
        
        // Cleanup function
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);
    
    // Start recording
    const startRecording = () => {
        if (!streamRef.current) {
            setError('No media stream available');
            return;
        }
        
        try {
            const mediaRecorder = new MediaRecorder(streamRef.current, {
                mimeType: 'video/webm;codecs=vp8,opus'
            });
            
            mediaRecorderRef.current = mediaRecorder;
            
            // Set up data handling for streaming
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    // Send data to backend in real-time
                    sendDataToBackend(event.data);
                }
            };
            
            // Start recording with a timeslice to get data chunks
            mediaRecorder.start(1000); // Get data every second
            setIsRecording(true);
            setUploadStatus('Recording started');
        } catch (err) {
            setError(`Error starting recording: ${err.message}`);
            console.error('Error starting recording:', err);
        }
    };
    
    // Stop recording
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setUploadStatus('Recording stopped');
        }
    };
    
    // Send data to backend using Axios
    const sendDataToBackend = async (data) => {
        try {
            setUploadStatus('Uploading...');
            
            // Create a FormData object to send the video chunk
            const formData = new FormData();
            formData.append('video', data);
            
            // Send to your backend endpoint using Axios
            const response = await axios.post('http://localhost:5000/api/stream-video', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // Add upload progress tracking
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadStatus(`Uploading: ${percentCompleted}%`);
                },
            });
            
            // Handle response
            console.log('Data sent successfully:', response.data);
            setUploadStatus('Upload complete');
        } catch (err) {
            console.error('Error sending data to backend:', err);
            setError(`Error sending data: ${err.message}`);
            setUploadStatus('Upload failed');
        }
    };
    
    return (
        <div className="video-recorder">
            <h2>Video Recorder</h2>
            {error && <div className="error-message">{error}</div>}
            {uploadStatus && <div className="status-message">{uploadStatus}</div>}
            
            <div className="video-container">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="video-preview"
                />
            </div>
            
            <div className="controls">
                {!isRecording ? (
                    <button 
                        onClick={startRecording}
                        className="record-button"
                        disabled={!streamRef.current}
                    >
                        Start Recording
                    </button>
                ) : (
                    <button 
                        onClick={stopRecording}
                        className="stop-button"
                    >
                        Stop Recording
                    </button>
                )}
            </div>
        </div>
    );
};

export default VideoRecorder;
