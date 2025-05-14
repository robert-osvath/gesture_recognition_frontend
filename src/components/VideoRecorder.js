import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './VideoRecorder.css';

const VideoRecorder = ({ onVideoRecorded, onResponseReceived }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isStreamInitialized, setIsStreamInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const countdownIntervalRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const uploadControllerRef = useRef(null);
  
  // Initialize media stream when component mounts
  useEffect(() => {
    const initializeStream = async () => {
      try {
        setIsInitializing(true);
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }, 
          audio: false
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsStreamInitialized(true);
        setIsInitializing(false);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera and microphone. Please check permissions.');
        setIsStreamInitialized(false);
        setIsInitializing(false);
        
        // Show error notification
        if (window.showNotification) {
          window.showNotification('Could not access camera and microphone. Please check permissions.', 'error', 5000);
        }
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
  
  // Handle countdown timer
  useEffect(() => {
    if (countdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && isRecording) {
      startRecording();
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown, isRecording]);
  
  // Handle recording timer
  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording, isPaused]);
  
  const startCountdown = () => {
    setCountdown(3);
    setIsRecording(true);
    
    // Show countdown notification
    if (window.showNotification) {
      window.showNotification('Recording will start in 3 seconds...', 'info', 3000);
    }
  };
  
  const startRecording = () => {
    if (!streamRef.current) {
      console.error('No media stream available');
      return;
    }
    
    try {
      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/mp4',
        videoBitsPerSecond: 2500000
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);

        // Show success notification
        if (window.showNotification) {
          window.showNotification('Recording completed successfully!', 'success', 3000);
        }
        
        // Upload the video
        await uploadVideo(blob, videoUrl);
      };
      
      mediaRecorder.start(); 
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please try again.');
      
      // Show error notification
      if (window.showNotification) {
        window.showNotification('Failed to start recording. Please try again.', 'error', 5000);
      }
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      setIsPaused(false);
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      // Show pause notification
      if (window.showNotification) {
        window.showNotification('Recording paused', 'info', 2000);
      }
    }
  };
  
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Show resume notification
      if (window.showNotification) {
        window.showNotification('Recording resumed', 'info', 2000);
      }
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Remove the onstop handler before stopping to prevent upload
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setCountdown(0);
    setRecordingTime(0);
    setIsPaused(false);
    chunksRef.current = [];
    
    // Show cancel notification
    if (window.showNotification) {
      window.showNotification('Recording cancelled', 'info', 2000);
    }
  };
  
  const uploadVideo = async (blob, videoUrl) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    // Create a new AbortController for this upload
    uploadControllerRef.current = new AbortController();
    
    try {
      // Create FormData with metadata
      const formData = new FormData();
      formData.append('video', blob, 'recording.webm');
      formData.append('metadata', JSON.stringify({
        timestamp: new Date().toISOString(),
        duration: recordingTime,
        format: 'mp4',
        resolution: {
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight
        }
      }));
      
      // Make the actual API call to the backend using axios
      const response = await axios.post('http://localhost:8000/upload-video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        signal: uploadControllerRef.current.signal,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
        responseType: "blob",
      });

      // Show success notification
      if (window.showNotification) {
        window.showNotification('Video uploaded successfully!', 'success', 3000);
      }
      
      // Call the callback with the video URL and any response data
      if (onVideoRecorded) {
        onVideoRecorded(videoUrl, response.data);
      }

      // Call the prediction
      const chatbotResponse = await axios.get('http://localhost:8000/get-response');

      // Call the callback with the message response
      if (onResponseReceived) {
        onResponseReceived(chatbotResponse.data);
      }
      
      // Reset upload state
      setIsUploading(false);
      setUploadProgress(0);
    } catch (err) {
      console.error('Error uploading video:', err);
      
      // Show error notification with more specific error message
      if (window.showNotification) {
        const errorMessage = err.response?.data?.detail || err.message || 'Backend server not available';
        window.showNotification(
          `Failed to upload video: ${errorMessage}`,
          'error',
          5000
        );
      }
      
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  const cancelUpload = () => {
    if (uploadControllerRef.current) {
      uploadControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
    
    // Show cancel notification
    if (window.showNotification) {
      window.showNotification('Upload cancelled', 'info', 2000);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="video-recorder">
      <div className="video-container">
        {isInitializing ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Initializing camera...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={isRecording ? 'recording' : ''}
            />
            
            {countdown > 0 && (
              <div className="countdown-overlay">
                <div className="countdown-circle">{countdown}</div>
              </div>
            )}
            
            {isRecording && (
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                <span className="recording-text">
                  {isPaused ? 'PAUSED' : 'RECORDING'} {formatTime(recordingTime)}
                </span>
              </div>
            )}
            
            {isUploading && (
              <div className="upload-overlay">
                <div className="upload-progress-container">
                  <div 
                    className="upload-progress-bar" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                  <span className="upload-progress-text">{uploadProgress}%</span>
                </div>
                <button 
                  className="cancel-upload-button"
                  onClick={cancelUpload}
                >
                  Cancel Upload
                </button>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="controls">
        {!isRecording && !isUploading && (
          <button 
            className="record-button"
            onClick={startCountdown}
            disabled={!isStreamInitialized || isInitializing}
          >
            {isInitializing ? 'Initializing...' : 'Start Recording'}
          </button>
        )}
        
        {isRecording && !isUploading && (
          <>
            {isPaused ? (
              <button 
                className="resume-button"
                onClick={resumeRecording}
              >
                Resume
              </button>
            ) : (
              <button 
                className="pause-button"
                onClick={pauseRecording}
              >
                Pause
              </button>
            )}
            
            <button 
              className="stop-button"
              onClick={stopRecording}
            >
              Stop
            </button>
            
            <button 
              className="cancel-button"
              onClick={cancelRecording}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoRecorder;
