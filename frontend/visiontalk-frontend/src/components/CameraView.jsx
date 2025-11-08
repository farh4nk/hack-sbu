import React, { useRef, useState, useEffect } from 'react';

const CameraView = () => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [debugInfo, setDebugInfo] = useState('');
  const [detections, setDetections] = useState([]);

  // ------------------- CAMERA CONTROL -------------------

  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      setStatus('Requesting camera...');
      setDebugInfo('Requesting camera permission...');

      // stop old tracks if any
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      console.log('✅ Camera stream obtained:', stream);
      setDebugInfo(`Stream active: ${stream.active}, Tracks: ${stream.getTracks().length}`);

      if (!videoRef.current) throw new Error('Video element not found');
      videoRef.current.srcObject = stream;

      // wait for metadata
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for metadata')), 5000);
        videoRef.current.onloadedmetadata = () => {
          clearTimeout(timeout);
          console.log('✅ Metadata loaded');
          resolve();
        };
      });

      await videoRef.current.play();
      console.log('✅ Video playing', videoRef.current.videoWidth, videoRef.current.videoHeight);
      setIsStreaming(true);
      setStatus('Camera active');
      setDebugInfo(`Video dimensions: ${videoRef.current.videoWidth}x${videoRef.current.videoHeight}`);

    } catch (err) {
      console.error('❌ Camera access error:', err);
      alert('Camera error: ' + err.message + '\n\nCheck:\n1. Browser camera permission\n2. HTTPS/localhost\n3. Camera not used by another app');
      setStatus(`Error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setStatus('Camera stopped');
    setDetections([]);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // ------------------- FRAME CAPTURE -------------------

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !isStreaming) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  // ------------------- BACKEND CALL -------------------

  const analyzeFrame = async (imageData, userMode) => {
    try {
      setStatus(`Analyzing (${userMode})...`);
      console.log("📤 Sending frame to backend...");

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode: userMode }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      console.log("✅ Backend response:", data);
      if (data.detections) setDetections(data.detections);
      return data;

    } catch (err) {
      console.warn('⚠️ Using demo mode:', err.message);
      setStatus('Backend not connected - demo mode');
      return simulateBackendResponse(userMode);
    }
  };

  // ------------------- DEMO RESPONSE -------------------

  const simulateBackendResponse = (userMode) => {
    const demoDetections = [
      { label: 'person', confidence: 0.92, direction: 'center', priority: 5 },
      { label: 'chair', confidence: 0.85, direction: 'left', priority: 2 },
      { label: 'laptop', confidence: 0.78, direction: 'right', priority: 1 },
    ];

    setDetections(demoDetections);

    if (userMode === 'live') {
      const critical = demoDetections.find(d => d.priority >= 5);
      return {
        summary: critical ? `${critical.label} detected in ${critical.direction}` : '',
        detections: demoDetections,
      };
    }

    return {
      summary: 'Indoor scene. Person in front, chair left, laptop right.',
      detections: demoDetections,
    };
  };

  // ------------------- SPEECH -------------------

  const speakText = (text) => {
    console.log('🔊 Speak:', text);
  };

  // ------------------- LIVE MODE -------------------

  const startLiveMode = async () => {
    console.log("🎬 Starting Live Mode...");

    if (!isStreaming) await startCamera();

    // Wait until stream is ready
    await new Promise((resolve) => {
      const checkStream = setInterval(() => {
        if (videoRef.current && isStreaming && videoRef.current.videoWidth > 0) {
          clearInterval(checkStream);
          resolve();
        }
      }, 200);
    });

    console.log("✅ Streaming confirmed:", videoRef.current.videoWidth, videoRef.current.videoHeight);
    setMode('live');
    setStatus('Live monitoring active');

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) {
        console.warn("⚠️ Skipping frame (video not ready)");
        return;
      }

      console.log("📸 Capturing frame...");
      const result = await analyzeFrame(frame, 'live');

      if (result?.summary) speakText(result.summary);
      if (result?.objects) {
        setDetections(result.objects.map(([label, direction]) => ({
          label,
          direction,
          priority: 3,
        })));
      }
    }, 2000);

    console.log("🔁 Live mode loop started");
  };

  const stopLiveMode = () => {
    console.log("🛑 Stopping Live Mode");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMode(null);
    setStatus('Ready');
    stopCamera();
  };

  // ------------------- EXPLAIN SCENE -------------------

  const explainScene = async () => {
    console.log("🖼️ Explain Scene pressed");

    if (!isStreaming) {
      await startCamera();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const frame = captureFrame();
    if (!frame) {
      setStatus('Unable to capture frame');
      return;
    }

    const result = await analyzeFrame(frame, 'explain');
    if (result?.summary) {
      speakText(result.summary);
      setDetections(
        result.objects?.map(([label, direction]) => ({
          label,
          direction,
          priority: 3,
        })) || []
      );
    }
  };

  // ------------------- CLEANUP -------------------

  useEffect(() => {
    return () => stopCamera();
  }, []);

  // ------------------- UI -------------------

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-4">
      <div className="w-full max-w-5xl">
        <h1 className="text-5xl font-bold text-white mb-2 text-center">VisionTalk AI</h1>
        <p className="text-blue-200 text-center mb-6 text-lg">
          AI-Powered Visual Assistant for the Visually Impaired
        </p>

        {/* STATUS */}
        <div className={`px-6 py-3 rounded-xl mb-6 text-center font-semibold text-lg transition-all 
          ${mode === 'live' ? 'bg-green-600 animate-pulse' :
            isStreaming ? 'bg-blue-600' : 'bg-gray-700'}`}>
          <span className="text-white">● {status}</span>
        </div>

        {/* CAMERA */}
        <div className="relative bg-black mb-8 shadow-2xl rounded-xl" style={{ minHeight: '500px' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl"
            style={{ display: 'block', maxHeight: '600px' }}
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-center p-12">
              <div>
                <p className="text-white text-2xl font-semibold mb-2">Camera Ready</p>
                <p className="text-gray-400 text-lg">Press a button below to activate</p>
              </div>
            </div>
          )}
          {mode === 'live' && (
            <div className="absolute top-6 left-6 bg-red-600 text-white px-4 py-2 rounded-full font-bold flex items-center gap-2 animate-pulse">
              <span className="w-3 h-3 bg-white rounded-full"></span> LIVE
            </div>
          )}
          {detections.length > 0 && (
            <div className="absolute bottom-6 left-6 right-6 bg-black bg-opacity-70 rounded-xl p-4">
              <h3 className="text-white font-bold mb-2">Detected Objects</h3>
              <div className="flex flex-wrap gap-2">
                {detections.map((det, i) => (
                  <span key={i} className={`px-3 py-1 rounded-full text-sm font-semibold 
                    ${det.priority >= 5 ? 'bg-red-600' :
                      det.priority >= 3 ? 'bg-yellow-600' : 'bg-gray-600'} text-white`}>
                    {det.label} ({det.direction})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BUTTONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={mode === 'live' ? stopLiveMode : startLiveMode}
            className={`px-8 py-6 rounded-2xl font-bold text-2xl transition-all transform hover:scale-105 shadow-xl 
              ${mode === 'live' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}>
            {mode === 'live' ? 'Stop Live Mode' : 'Start Live Mode'}
          </button>

          <button
            onClick={explainScene}
            disabled={mode === 'live'}
            className="px-8 py-6 rounded-2xl font-bold text-2xl bg-blue-600 hover:bg-blue-700 text-white 
              disabled:bg-gray-600 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-xl disabled:transform-none">
            Explain Scene
          </button>
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-center text-gray-400 text-sm">
          <p>Powered by YOLOv8 Computer Vision + Gemini AI</p>
          {status.includes('demo mode') && (
            <p className="mt-2 text-yellow-400">
              ⚠️ Running in demo mode — connect backend at http://localhost:8000/analyze
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraView;
