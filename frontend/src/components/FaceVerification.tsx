import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import '../styles/FaceVerification.css';

interface FaceVerificationProps {
  onClose: () => void;
  onSuccess: (faceData: string) => void;
}

const FaceVerification: React.FC<FaceVerificationProps> = ({ onClose, onSuccess }) => {
  const webcamRef = useRef<Webcam>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('Loading face detection models...');
  const detectionRef = useRef<NodeJS.Timeout | null>(null);
  const capturedFacesRef = useRef<any[]>([]);
  const detectionBuffer = useRef<any[]>([]);
  const REQUIRED_SAMPLES = 3;
  const QUALITY_THRESHOLD = 0.8;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoInitialized = useRef(false);
  const [isVerificationComplete, setIsVerificationComplete] = useState(false);

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
      // Use CDN URLs for models
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      
      // Load models sequentially
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

      // Initialize detector options
      const scoreThreshold = 0.5;
      faceapi.detectSingleFace(
        new Image(), 
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold })
      );

      setIsLoading(false);
      setMessage('Please look at the camera');
      startDetection();
    } catch (error) {
      console.error('Error loading models:', error);
      setMessage('Error loading face detection. Please refresh.');
    }
  };

  const startDetection = () => {
    detectionRef.current = setInterval(detectFace, 100);
  };

  const initializeVideo = () => {
    if (!webcamRef.current?.video) return;
    const video = webcamRef.current.video;
    
    video.onloadedmetadata = () => {
      video.width = video.videoWidth;
      video.height = video.videoHeight;
      
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
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

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
            await captureHighQualityFace(detection);
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
    // Check if face is centered and large enough
    const { width, height } = detection.detection.box;
    const minSize = Math.min(width, height);
    return minSize >= 100; // Minimum face size requirement
  };

  const captureHighQualityFace = async (detection: any) => {
    if (!webcamRef.current?.video) return;
    
    try {
      if (detection && detection.detection.score > QUALITY_THRESHOLD) {
        const descriptor = Array.from(detection.descriptor);
        const landmarks = detection.landmarks.positions.map((p: { x: number; y: number }) => ({ x: p.x, y: p.y }));
        
        detectionBuffer.current.push({ descriptor, landmarks });
        setMessage(`Capturing face ${detectionBuffer.current.length}/${REQUIRED_SAMPLES}`);

        if (detectionBuffer.current.length >= REQUIRED_SAMPLES) {
          setIsProcessing(true);
          
          // First processing message
          setMessage("Processing verification...");
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Additional delay messages
          setMessage("Analyzing facial features...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setMessage("Finalizing verification...");
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const faceData = {
            descriptors: detectionBuffer.current.map(d => d.descriptor),
            landmarks: detectionBuffer.current.map(d => d.landmarks)
          };

          setIsVerificationComplete(true);
          setMessage("Verification successful! ✓");
          
          // Add small delay before closing
          setTimeout(() => {
            onSuccess(JSON.stringify(faceData));
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Face capture error:', error);
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
              <div className={`face-guide-overlay ${isFaceDetected ? 'detected' : ''} ${isVerificationComplete ? 'success' : ''}`}>
                <div className="face-guide-box" />
                {isVerificationComplete && <div className="success-checkmark">✓</div>}
              </div>
            </div>
            
            <div className="status-container">
              <p className={`status-message ${isVerificationComplete ? 'success' : ''}`}>{message}</p>
              <div className="capture-progress">
                {Array(REQUIRED_SAMPLES).fill(0).map((_, i) => (
                  <div 
                    key={i} 
                    className={`capture-dot ${i < detectionBuffer.current.length ? 'active' : ''}`} 
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FaceVerification;


