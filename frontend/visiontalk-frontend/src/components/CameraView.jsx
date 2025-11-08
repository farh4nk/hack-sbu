import React, { useRef, useState, useEffect } from 'react';

const ELEVEN_API_KEY = "sk_c21de707cdac86954d314ea6395d3ca74120192983274c84";
const ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 

  const speakWithElevenLabs = async (text) => {
    if (window.__ELEVEN_ACTIVE__) {
  console.log("⏸ Skipping ElevenLabs: already active");
  return;
}

  try {
    // mark ElevenLabs as active to pause browser speech
    window.__ELEVEN_ACTIVE__ = true;

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_settings: { stability: 0.3, similarity_boost: 0.8 },
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ElevenLabs`);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    // flag off when playback ends
    audio.onended = () => {
      console.log("🎧 ElevenLabs finished speaking");
      window.__ELEVEN_ACTIVE__ = false;
    };

    // attempt to play audio
    try {
      await audio.play();
    } catch (playErr) {
      console.error("Audio playback error:", playErr);
      window.__ELEVEN_ACTIVE__ = false;
    }
  } catch (err) {
    console.error("ElevenLabs TTS error:", err);
    window.__ELEVEN_ACTIVE__ = false;
  }
};


// speech recognition
const listenForCommand = (callback) => {
  if (!("webkitSpeechRecognition" in window)) {
    console.error("Speech recognition not supported in this browser.");
    return;
  }

  const recognition = new window.webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    console.log("🎙️ Heard:", transcript);

    if (transcript.includes("live")) callback("live");
    else if (transcript.includes("snapshot") || transcript.includes("scene"))
      callback("snapshot");
    else {
      speakWithElevenLabs("Sorry, I didn’t catch that. Please say live or snapshot.");
      setTimeout(() => listenForCommand(callback), 4000);
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    speakWithElevenLabs("I couldn't hear you clearly. Please try again.");
    setTimeout(() => listenForCommand(callback), 4000);
  };

  recognition.start();
  console.log("🎧 Listening for user response...");
};

const CameraView = () => {
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState(null); // 'live' or 'explain'
  const [status, setStatus] = useState('Ready');


  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setStatus('Camera active');
      }
    } catch (error) {
      console.error('Camera access error:', error);
      setStatus('Camera access denied');
      alert('Please allow camera access to use this app');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      setIsStreaming(false);
      setStatus('Camera stopped');
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    // Return base64 image (JPEG format, 0.8 quality for compression)
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const analyzeFrame = async (imageData, userMode) => {
    try {
      setStatus(`Analyzing (${userMode} mode)...`);
      const canvas = document.createElement('canvas');
      // Ensure canvas matches the video dimensions
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        console.log("converting to blob!")
        const formData = new FormData();
        formData.append("frame", blob, "frame.jpg");
        const response = await fetch('http://localhost:8000/analyze', {
          method: 'POST',
        
          body: formData
        });
        // ---- error handling ---- 
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(data);

        if (data.summary){
        speakText(data.summary);
      }
      }, "image/jpeg", 0.8);


      

      // const response = await fetch('http://localhost:8000/analyze', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     image: imageData,
      //     user_mode: userMode
      //   })
      // });
      
     
      // return data; // Should contain { narration, audio_url? }
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Analysis failed - check if backend is running');
      return null;
    }
  };

  const speechQueue = [];
  let isSpeaking = false;

  const speakText = (text) => {

  if (window.__ELEVEN_ACTIVE__) {
  console.log("⏸ Skipping browser speech: ElevenLabs active");
  return;
}

  // add new text to queue
  speechQueue.push(text);
  processQueue();
  };

  const processQueue = () => {
  // if already speaking or nothing to say, stop
  if (isSpeaking) return;
  if (speechQueue.length === 0) return;

  // get next sentence
  const text = speechQueue.shift();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  utterance.onstart = () => {
    isSpeaking = true;
    setStatus('Speaking...');
  };

  utterance.onend = () => {
    isSpeaking = false;

    // restore correct status after speaking
    if (mode === 'live') {
      setStatus('Monitoring...');
    } else {
      setStatus('Ready');
    }

    // check if another sentence is waiting
    if (speechQueue.length > 0) {
      processQueue();
    }
  };

  // start speaking
  window.speechSynthesis.speak(utterance);
};


  // Alternative: Play audio from ElevenLabs URL
  const playAudioFromURL = (audioUrl) => {
    const audio = new Audio(audioUrl);
    audio.play()
      .then(() => setStatus('Playing audio...'))
      .catch(err => console.error('Audio playback error:', err));
  };

  const startLiveMode = () => {
    setMode('live');
    setStatus('Live monitoring active');
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Capture and analyze every 1 second
    intervalRef.current = setInterval(async () => {
      const frame = captureFrame();
      if (!frame) return;
      
      const result = await analyzeFrame(frame, 'live');
      
      if (result?.narration) {
        // Only speak if there's something important (backend filters this)
        speakText(result.narration);
      }
    }, 2000); // 1 second interval (adjust as needed)
  };

  const stopLiveMode = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMode(null);
    setStatus('Ready');
    window.speechSynthesis.cancel();
  };

  const explainScene = async () => {
    setMode('explain');
    
    const frame = captureFrame();
    if (!frame) {
      alert('Unable to capture frame');
      return;
    }
    
    const result = await analyzeFrame(frame, 'explain_scene');
    
    if (result?.narration) {
      speakText(result.narration);
    } else {
      setStatus('No description available');
    }
    
    // Reset mode after explanation
    setTimeout(() => setMode(null), 1000);
  };

  useEffect(() => {
  // prevent double execution under React Strict Mode
  if (window.__VOICE_INIT_DONE__) return;
  window.__VOICE_INIT_DONE__ = true;

  const initVoicePrompt = async () => {
    window.speechSynthesis.cancel(); // stop any queued browser voices

    await speakWithElevenLabs(
      "Welcome to VisionTalk. Would you like to go live and receive real time descriptions of your surroundings, or take a snapshot and describe your current view? Say live or snapshot."
    );

    const waitForEleven = setInterval(() => {
      if (!window.__ELEVEN_ACTIVE__) {
        clearInterval(waitForEleven);
        listenForCommand(async (command) => {
          if (command === "live") {
            speakWithElevenLabs("Starting live mode now.");
            startLiveMode();
          } else if (command === "snapshot") {
  await speakWithElevenLabs("Taking a snapshot now.");
  
  // Wait until ElevenLabs finishes
  const waitUntilDone = setInterval(() => {
    if (!window.__ELEVEN_ACTIVE__) {
      clearInterval(waitUntilDone);
      explainScene();
    }
  }, 500);
}
        });
      }
    }, 1000);
  };

  startCamera();
  initVoicePrompt();

  return () => {
    stopCamera();
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, []);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-4 text-center">VisionTalk AI</h1>

        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4 text-center">
          Status: {status}
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden mb-6">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto" style={{ maxHeight: '60vh' }} />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
              <p className="text-white text-lg">Initializing camera...</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={mode === 'live' ? stopLiveMode : startLiveMode}
            disabled={!isStreaming}
            className={`px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
              mode === 'live' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } text-white disabled:bg-gray-600 disabled:cursor-not-allowed`}
          >
            {mode === 'live' ? 'Stop Live Mode' : 'Start Live Mode'}
          </button>

          <button
            onClick={explainScene}
            disabled={!isStreaming || mode === 'live'}
            className="px-6 py-4 rounded-lg font-semibold text-lg bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Explain Scene
          </button>
        </div>

        <div className="mt-6 text-gray-300 text-sm text-center">
          <p><strong>Live Mode:</strong> Continuous alerts about nearby risks</p>
          <p><strong>Explain Scene:</strong> Detailed description of current view</p>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
