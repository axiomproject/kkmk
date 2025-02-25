import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/FaceVerification.css';

interface LoginFaceVerificationProps {
  onClose: () => void;
  onSuccess: (faceData: string) => void;
  onFailure?: () => void;
}

const LoginFaceVerification: React.FC<LoginFaceVerificationProps> = ({ onClose, onSuccess, onFailure }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('Loading face detection models...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const detectionRef = useRef<NodeJS.Timeout | null>(null);
  const attemptRef = useRef(0);
  const MAX_ATTEMPTS = 3;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoInitialized = useRef(false);

  useEffect(() => {
    loadModels();
    return () => {
      if (detectionRef.current) {
        clearInterval(detectionRef.current);
      }
    };
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      // Load models from CDN
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      setIsLoading(false);
      setMessage('Please look at the camera');
      startDetection();
    } catch (error) {
      console.error('Error loading models:', error);
      setMessage('Error loading face detection. Please refresh.');
      onFailure?.();
    }
  };

  const startDetection = () => {
    detectionRef.current = setInterval(detectFace, 100);
  };

  const initializeVideo = () => {
    if (!webcamRef.current?.video) return;
    const video = webcamRef.current.video;
    
    // Wait for video metadata to load
    video.onloadedmetadata = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      
      // Initialize canvas with video dimensions
      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth;
        canvasRef.current.height = video.videoHeight;
      }
      videoInitialized.current = true;
    };
  };

  const detectFace = async () => {
    if (isProcessing || !webcamRef.current?.video || !videoInitialized.current) return;

    try {
      const video = webcamRef.current.video;
      
      // Create offscreen canvas with willReadFrequently
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Ensure video is playing and has dimensions
      if (video.readyState === 4) {
        ctx.drawImage(video, 0, 0);
        
        const detection = await faceapi
          .detectSingleFace(
            canvas,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 224,
              scoreThreshold: 0.5
            })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          setIsFaceDetected(true);
          if (isGoodDetection(detection)) {
            await processFaceData(detection);
          }
        } else {
          setIsFaceDetected(false);
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
  };

  const isGoodDetection = (detection: any) => {
    const { width, height } = detection.detection.box;
    const minSize = Math.min(width, height);
    return minSize >= 100;
  };

  const processFaceData = async (detection: any) => {
    setIsProcessing(true);
    attemptRef.current++;

    try {
      const faceData = {
        descriptor: Array.from(detection.descriptor),
        landmarks: detection.landmarks.positions
      };

      onSuccess(JSON.stringify(faceData));
    } catch (error) {
      console.error('Error processing face data:', error);
      if (attemptRef.current >= MAX_ATTEMPTS) {
        onFailure?.();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="face-verification-container">
      <div className="face-verification-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        {isLoading ? (
          <div className="loading">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>{message}</p>
          </div>
        ) : (
          <>
            <div className="webcam-container">
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                mirrored={true}
                onUserMedia={() => {
                  initializeVideo();
                  if (webcamRef.current?.video) {
                    webcamRef.current.video.width = 640;
                    webcamRef.current.video.height = 480;
                  }
                }}
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user",
                  aspectRatio: 1.333333
                }}
              />
              <canvas 
                ref={canvasRef}
                style={{ display: 'none' }}
              />
              <div className={`face-guide-overlay ${isFaceDetected ? 'detected' : ''}`}>
                <div className="face-guide-box" />
              </div>
            </div>
            
            <div className="status-container">
              <p className="status-message">{message}</p>
              {isProcessing && <p>Processing...</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginFaceVerification;
