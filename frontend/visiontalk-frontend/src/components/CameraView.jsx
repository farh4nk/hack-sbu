import React, { useRef, useState, useEffect } from 'react';

const CameraView = () => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [debugInfo, setDebugInfo] = useState('');
  const [detections, setDetections] = useState([]);

  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      setStatus('Requesting camera...');
      setDebugInfo('Requesting camera permission...');
      
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      console.log('✅ Camera stream obtained:', stream);
      setDebugInfo(`Stream obtained - Active: ${stream.active}, Tracks: ${stream.getTracks().length}`);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          videoRef.current.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log('✅ Metadata loaded');
            setDebugInfo('Metadata loaded, playing video...');
            resolve();
          };
        });
        
        await videoRef.current.play();
        
        console.log('✅ Video playing');
        setDebugInfo(`Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);
        setIsStreaming(true);
        setStatus('Camera active');
        
      } else {
        throw new Error('Video element not found');
      }
    } catch (error) {
      console.error('❌ Camera access error:', error);
      setStatus(`Error: ${error.message}`);
      setDebugInfo(`Error: ${error.message}`);
      alert('Camera error: ' + error.message + '\n\nPlease check:\n1. Camera permissions in browser\n2. Camera not used by another app\n3. Using HTTPS or localhost');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatus('Camera stopped');
    setDebugInfo('Camera stopped');
    setDetections([]);
  };

  const captureFrame = () => {
    if (!videoRef.current || !isStreaming) {
      console.warn('Cannot capture: video not ready');
      return null;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    if (canvas.width === 0 || canvas.height === 0) {
      console.warn('Video dimensions are 0');
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const analyzeFrame = async (imageData, userMode) => {
    try {
      setStatus(`Analyzing (${userMode} mode)...`);
      
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          user_mode: userMode
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update detections if available
      if (data.detections) {
        setDetections(data.detections);
      }
      
      return data;
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Backend not connected - using demo mode');
      
      // DEMO MODE: Simulate backend response for testing
      return simulateBackendResponse(userMode);
    }
  };

  // Simulated backend response for frontend testing
  const simulateBackendResponse = (userMode) => {
    const demoDetections = [
      { label: 'person', confidence: 0.92, direction: 'center', priority: 5 },
      { label: 'chair', confidence: 0.85, direction: 'left', priority: 2 },
      { label: 'laptop', confidence: 0.78, direction: 'right', priority: 1 }
    ];
    
    setDetections(demoDetections);
    
    if (userMode === 'live') {
      // Only report high-priority items in live mode
      const criticalItems = demoDetections.filter(d => d.priority >= 5);
      if (criticalItems.length > 0) {
        return {
          narration: `${criticalItems[0].label} detected in ${criticalItems[0].direction}`,
          detections: demoDetections
        };
      }
      return { narration: '', detections: demoDetections };
    } else {
      // Full scene description for explain mode
      return {
        narration: 'You are in an indoor space. There is a person in front of you, a chair to your left, and a laptop on your right.',
        detections: demoDetections
      };
    }
  };

  const speakText = (text) => {
    if (!text || text.trim() === '') return;
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    utterance.onstart = () => setStatus('Speaking...');
    utterance.onend = () => setStatus(mode === 'live' ? 'Monitoring...' : 'Ready');
    
    window.speechSynthesis.speak(utterance);
  };

  const startLiveMode = async () => {
    if (!isStreaming) {
      await startCamera();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setMode('live');
    setStatus('Live monitoring active');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Capture and analyze every 2 seconds in live mode
    intervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) {
        console.warn('Failed to capture frame');
        return;
      }
      
      const result = await analyzeFrame(frame, 'live');
      
      if (result?.narration && result.narration.trim() !== '') {
        speakText(result.narration);
      }
    }, 2000);
  };

  const stopLiveMode = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMode(null);
    setStatus('Ready');
    window.speechSynthesis.cancel();
    setDetections([]);
    stopCamera();
  };

  const explainScene = async () => {
    if (!isStreaming) {
      await startCamera();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setMode('explain');
    setStatus('Capturing scene...');
    
    const frame = captureFrame();
    if (!frame) {
      setStatus('Unable to capture frame');
      setMode(null);
      return;
    }
    
    const result = await analyzeFrame(frame, 'explain_scene');
    
    if (result?.narration) {
      speakText(result.narration);
    } else {
      setStatus('No description available');
    }
    
    setTimeout(() => setMode(null), 1000);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="w-full max-w-5xl">
        <h1 className="text-5xl font-bold text-white mb-2 text-center tracking-tight">
          VisionTalk AI
        </h1>
        <p className="text-blue-200 text-center mb-6 text-lg">
          AI-Powered Visual Assistant for the Visually Impaired
        </p>
        
        {/* Status Display */}
        <div className={`px-6 py-3 rounded-xl mb-6 text-center font-semibold text-lg transition-all ${
          mode === 'live' ? 'bg-green-600 animate-pulse' : 
          isStreaming ? 'bg-blue-600' : 
          'bg-gray-700'
        }`}>
          <span className="text-white">● {status}</span>
        </div>
        
        {/* Camera Preview */}
        <div className="relative bg-black mb-8 shadow-2xl" style={{ minHeight: '500px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${isStreaming ? 'block' : 'hidden'}`}
            style={{ display: isStreaming ? 'block' : 'none' }}
          />
          
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-center p-12">
              <div>
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-700 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white text-2xl font-semibold mb-2">Camera Ready</p>
                <p className="text-gray-400 text-lg">Press a button below to activate</p>
              </div>
            </div>
          )}
          
          {/* Live Mode Indicator */}
          {mode === 'live' && (
            <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-pulse">
              <span className="w-3 h-3 bg-white rounded-full"></span>
              LIVE
            </div>
          )}
          
          {/* Detection Overlay */}
          {detections.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 bg-black bg-opacity-70 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Detected Objects
              </h3>
              <div className="flex flex-wrap gap-2">
                {detections.map((det, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      det.priority >= 5 ? 'bg-red-600' : 
                      det.priority >= 3 ? 'bg-yellow-600' : 
                      'bg-gray-600'
                    } text-white`}
                  >
                    {det.label} ({det.direction})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Control Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={mode === 'live' ? stopLiveMode : startLiveMode}
            className={`px-8 py-6 rounded-2xl font-bold text-2xl transition-all transform hover:scale-105 shadow-xl ${
              mode === 'live'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mode === 'live' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                )}
              </svg>
              {mode === 'live' ? 'Stop Live Mode' : 'Start Live Mode'}
            </div>
          </button>
          
          <button
            onClick={explainScene}
            disabled={mode === 'live'}
            className="px-8 py-6 rounded-2xl font-bold text-2xl bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-xl disabled:transform-none"
          >
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Explain Scene
            </div>
          </button>
        </div>
        
        {/* Help Text */}
        <div className="mt-8 bg-gray-800 bg-opacity-70 rounded-xl p-6">
          <div className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div>
              <h3 className="text-green-400 font-bold text-xl mb-2 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
                Live Mode
              </h3>
              <p className="text-sm">Continuous real-time monitoring with instant alerts about nearby risks and hazards</p>
            </div>
            <div>
              <h3 className="text-blue-400 font-bold text-xl mb-2 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                </svg>
                Explain Scene
              </h3>
              <p className="text-sm">Detailed one-time description of your entire surroundings and environment</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Powered by YOLOv8 Computer Vision + Google Gemini AI</p>
          {status.includes('demo mode') && (
            <p className="mt-2 text-yellow-400">⚠️ Running in demo mode - connect backend at http://localhost:8000/analyze</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraView;