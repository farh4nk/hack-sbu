import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ELEVEN_API_KEY = "sk_28f286edcb53fa29741545903ab8bc06c5a0c5d469410609";
const ELEVEN_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; 
const GEMINI_API_KEY = "AIzaSyBS4tArjXTEb3rmWeRRb8ZAZPP54YcPTow"

const speakWithElevenLabs = async (text) => {
  if (window.__ELEVEN_ACTIVE__) {
    console.log("⏸ Skipping ElevenLabs: already active");
    return;
  }

  try {
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

    audio.onended = () => {
      console.log("🎧 ElevenLabs finished speaking");
      window.__ELEVEN_ACTIVE__ = false;
    };

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
      speakWithElevenLabs("Sorry, I didn't catch that. Please say live or snapshot.");
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
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [mode, setMode] = useState(null);
  const [status, setStatus] = useState('Ready to assist');
  const [detections, setDetections] = useState([]);
  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const liveLoopActiveRef = useRef(false);
  const modeRef = useRef(mode);
  const liveRecognitionRef = useRef(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // 👇 paste the drawing useEffect right here
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const vw = videoRef.current.videoWidth;
    const vh = videoRef.current.videoHeight;
    if (!vw || !vh) return; // wait until video metadata is ready

    const canvas = canvasRef.current;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(det => {
      const x = det.x1;
      const y = det.y1;
      const width = det.x2 - det.x1;
      const height = det.y2 - det.y1;

      ctx.strokeStyle = det.priority >= 5 ? "red" : det.priority >= 3 ? "orange" : "green";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      ctx.font = "16px Sora";
      ctx.fillStyle = "white";
      ctx.fillText(det.object, x + 5, Math.max(14, y - 6));
    });
  }, [detections]);



  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
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
    if (
      !videoRef.current ||
      !videoRef.current.videoWidth ||
      !videoRef.current.videoHeight
    ) {
      return null;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Unable to capture frame'));
          }
        },
        'image/jpeg',
        0.8
      );
    });
  };

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const analyzeFrame = async (frameBlob, userMode) => {
    if (!frameBlob) return null;
    
    try {
      setStatus(`Analyzing (${userMode} mode)...`);
      const formData = new FormData();
      formData.append("frame", frameBlob, "frame.jpg");

      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(data);
      if (data.detections){
          const parsed = 
          typeof data.detections == "string"
          ? JSON.parse(data.detections)
          : data.detections;

          setDetections(parsed.scene || []);
        }

      return data;
    } catch (error) {
      console.error('Analysis error:', error);
      setStatus('Analysis failed - check if backend is running');
      return null;
    }
  };

  const speakText = (text) => {
    if (!text) return Promise.resolve();

    if (window.__ELEVEN_ACTIVE__) {
      console.log("⏸ Skipping browser speech: ElevenLabs active");
      return Promise.resolve();
    }

    console.log("DATA BEING SAID: ", text);
    return new Promise(resolve => {
      speechQueueRef.current.push({ text, resolve });
      processQueue();
    });
  };

  const processQueue = () => {
    if (isSpeakingRef.current) return;
    if (speechQueueRef.current.length === 0) return;
  
    const { text, resolve } = speechQueueRef.current.shift();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
  
    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setStatus('Speaking...');
    };
  
    utterance.onend = () => {
      isSpeakingRef.current = false;
      setStatus(modeRef.current === 'live' ? 'Monitoring...' : 'Ready');
      resolve();
      processQueue();
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      isSpeakingRef.current = false;
      resolve();
      processQueue();
    };
  
    window.speechSynthesis.speak(utterance);
  };

  const startLiveMode = async () => {
    if (liveLoopActiveRef.current) return;

    window.__LIVE_ACTIVE__ = true;
    liveLoopActiveRef.current = true;
    setMode('live');
    setStatus('Live monitoring active');

    listenDuringLive(() => {
      console.log("🗣️ Heard stop command — stopping live mode...");
      stopLiveMode();
    });
    
    while (liveLoopActiveRef.current) {
      try {
        const frame = await captureFrame();
        if (!frame) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        const result = await analyzeFrame(frame, 'live');
        if (result?.summary) {
          await speakText(result.summary);
        }
      } catch (err) {
        console.error('Live loop error:', err);
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  };


  // const startLiveMode = () => {
  //   if (window.__LIVE_ACTIVE__) return; // prevent duplicate starts
  //   window.__LIVE_ACTIVE__ = true;
  
  //   setMode('live');
  //   setStatus('Live monitoring active');
  
  //   // Start listening for voice stop commands
  //   listenDuringLive(() => {
  //     console.log("🗣️ Heard stop command — stopping live mode...");
  //     stopLiveMode();
  //   });
  
  //   // Clear any existing interval just in case
  //   if (intervalRef.current) {
  //     clearInterval(intervalRef.current);
  //   }
  
  //   // Repeatedly analyze frames only while active
  //   intervalRef.current = setInterval(async () => {
  //     if (!window.__LIVE_ACTIVE__) return; // stop loop if user said "stop"
  
  //     const frame = captureFrame();
  //     if (!frame) return;
  
  //     try {
  //       const result = await analyzeFrame(frame, 'live');
  //       if (result?.narration) speakText(result.narration);
  //     } catch (err) {
  //       console.error('Analysis error:', err);
  //     }
  //   }, 2000); // every 2 seconds
  // };

  const stopLiveListening = () => {
    if (liveRecognitionRef.current) {
      const recognition = liveRecognitionRef.current;
      liveRecognitionRef.current = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.stop();
      } catch (err) {
        console.warn('Speech recognition stop error:', err);
      }
    }
  };

  const stopLiveMode = (announce = true) => {
    if (!liveLoopActiveRef.current && !window.__LIVE_ACTIVE__) return;
  
    console.log("🛑 Stopping live mode...");
    window.__LIVE_ACTIVE__ = false;
    liveLoopActiveRef.current = false;
    stopLiveListening();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    setMode(null);
    setStatus('Ready');
    setDetections([]);
    const c = canvasRef.current;
    if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);

    if (announce) {
      speakText("Live mode stopped.");
    }
  };

  // const stopLiveMode = () => {
  //   if (!window.__LIVE_ACTIVE__) return;
  
  //   console.log("🛑 Stopping live mode...");
  //   window.__LIVE_ACTIVE__ = false;
  
  //   // stop repeating loop
  //   if (intervalRef.current) {
  //     clearInterval(intervalRef.current);
  //     intervalRef.current = null;
  //   }
  
  //   // cancel any ongoing speech output
  //   window.speechSynthesis.cancel();
  
  //   setMode(null);
  //   setStatus('Ready');
  //   speakText("Live mode stopped.");
  // };

  const listenDuringLive = (stopCallback) => {
    if (!("webkitSpeechRecognition" in window)) {
      console.error("Speech recognition not supported in this browser.");
      return;
    }

    stopLiveListening();

    const recognition = new window.webkitSpeechRecognition();
    liveRecognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();
  
      console.log("🎙️ Live mode heard:", transcript);
  
      if (transcript.includes("stop")) {
        console.log("🗣️ Heard stop, stopping live mode immediately...");
        stopLiveListening();
        if (stopCallback) stopCallback();
      }
    };
  
    recognition.onerror = (e) => {
      console.error("Speech recognition error during live mode:", e);
      if (window.__LIVE_ACTIVE__) {
        setTimeout(() => listenDuringLive(stopCallback), 1000);
      }
    };
  
    recognition.onend = () => {
      if (window.__LIVE_ACTIVE__) {
        console.log("🎧 Restarting live listener...");
        listenDuringLive(stopCallback);
      }
    };
  
    recognition.start();
    console.log("🎧 Listening for 'stop' command during live mode...");
  };

  const playAudioFromURL = (audioUrl) => {
    const audio = new Audio(audioUrl);
    audio.play()
      .then(() => setStatus('Playing audio...'))
      .catch(err => console.error('Audio playback error:', err));
  };

  




  const explainScene = async () => {
    setMode('explain');
    
    let frame;
    try {
      frame = await captureFrame();
      if (!frame) {
        alert('Unable to capture frame');
        return;
      }
    } catch (err) {
      console.error('Unable to capture frame:', err);
      setStatus('Unable to capture frame');
      return;
    }
    
    const result = await analyzeFrame(frame, 'explain_scene');
    
    if (result?.summary) {
      await speakText(result.summary);
    } else {
      setStatus('No description available');
    }
    
    setTimeout(() => setMode(null), 1000);
  };

  const explainSnapshot = async () => {
    if (!isStreaming) {
      console.log("⚙️ Camera not active, starting now...");
      await startCamera();
  
      // Wait for the video to fully initialize
      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            clearInterval(check);
            resolve();
          }
        }, 300);
      });
    }
  
    setStatus("Capturing snapshot...");
    let frameBlob;
    try {
      frameBlob = await captureFrame();
    } catch (err) {
      console.error("Unable to capture snapshot frame:", err);
      setStatus("Unable to capture snapshot");
      return;
    }
  
    if (!frameBlob) {
      setStatus("Unable to capture snapshot");
      return;
    }
  
    try {
      const frameDataUrl = await blobToBase64(frameBlob);
      setStatus("Generating detailed description...");
      speakText("Generating detailed description...");
  
      // Gemini API request
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: `You are an AI assistant helping visually impaired users understand images. Provide clear, concise descriptions that capture the essential information in 2-3 sentences, focusing on:

1. The main subject or scene
2. Important people, objects, or text visible
3. Relevant context like setting, colors, or actions

Be direct and factual. Start with the most important information first. If text is present and legible, read it aloud. Avoid unnecessary phrases like "This image shows" or "The picture contains."` },
                  { inline_data: { mime_type: "image/jpeg", data: frameDataUrl.split(",")[1] } }
                ]
              }
            ]
          }),
        }
      );
  
      const data = await res.json();
      console.log("🧠 Gemini response:", data);
  
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        setStatus("No description returned.");
        return;
      }
  
      setStatus("Speaking description...");
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.onend = () => setStatus("Snapshot explained.");
      window.speechSynthesis.speak(utterance);
  
    } catch (err) {
      console.error("❌ Gemini error:", err);
      setStatus("Gemini request failed");
    }
  };


  const handleLogoClick = () => {
    // Stop any active processes
    stopLiveMode();
    stopCamera();
    window.speechSynthesis.cancel();
    
    // Navigate back to landing page
    navigate('/');
  };

  useEffect(() => {
    if (window.__VOICE_INIT_DONE__) return;
    window.__VOICE_INIT_DONE__ = true;

    const initVoicePrompt = async () => {
      window.speechSynthesis.cancel();

      await speakWithElevenLabs(
        "Welcome to Mira. Would you like to go live and receive real time descriptions of your surroundings, or take a snapshot and describe your current view? Say live or snapshot."
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
              
              const waitUntilDone = setInterval(() => {
                if (!window.__ELEVEN_ACTIVE__) {
                  clearInterval(waitUntilDone);
                  explainSnapshot();
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
      liveLoopActiveRef.current = false;
      window.__LIVE_ACTIVE__ = false;
      stopLiveListening();
      stopCamera();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0E27] relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        * { 
          font-family: 'Sora', sans-serif;
        }
        
        h1, h2, h3, button {
          font-family: 'Space Grotesk', monospace;
          letter-spacing: -0.03em;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        
        @keyframes pulse-border {
          0%, 100% { 
            border-color: rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
          }
          50% { 
            border-color: rgba(16, 185, 129, 0.6);
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }
        
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-border { animation: pulse-border 2s ease-in-out infinite; }
        .animate-glow { animation: glow 2s ease-in-out infinite; }
        
        .scan-line {
          animation: scan-line 3s linear infinite;
        }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .button-glow {
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.3),
                      0 0 40px rgba(16, 185, 129, 0.1),
                      inset 0 0 20px rgba(16, 185, 129, 0.05);
        }
        
        .detection-tag {
          backdrop-filter: blur(8px);
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
      `}</style>

      <div className="fixed inset-0 grid-pattern opacity-30"></div>
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[100px] animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-[1600px] mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button 
                onClick={handleLogoClick}
                className="relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0A0E27] rounded-2xl"
                aria-label="Return to home"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </button>
              <div>
                <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">Mira</h1>
                <p className="text-slate-400 text-sm font-medium tracking-wide">MACHINE INTELLIGENT RECOGNITION ASSISTANT</p>
              </div>
            </div>
            
            <div className={`glass-morphism px-6 py-3 rounded-full transition-all duration-500 ${
              mode === 'live' ? 'animate-pulse-border' : ''
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative w-2.5 h-2.5">
                  <div className={`absolute inset-0 rounded-full ${
                    mode === 'live' ? 'bg-emerald-400' : isStreaming ? 'bg-blue-400' : 'bg-slate-500'
                  }`}></div>
                  {(mode === 'live' || isStreaming) && (
                    <div className={`absolute inset-0 rounded-full animate-ping ${
                      mode === 'live' ? 'bg-emerald-400' : 'bg-blue-400'
                    }`}></div>
                  )}
                </div>
                <span className="text-slate-200 font-medium text-sm">{status}</span>
                {mode === 'live' && (
                  <span className="ml-2 px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-md uppercase tracking-wider">
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-6">
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/50 via-blue-500/30 to-emerald-500/50 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative glass-morphism rounded-3xl overflow-hidden" style={{height: '700px'}}>
                {mode === 'live' && (
                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line opacity-50"></div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isStreaming ? 'block' : 'hidden'}`}
                />
                <canvas
                  ref = {canvasRef}
                  className = "absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="relative inline-block mb-8 animate-float">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-2xl animate-pulse"></div>
                        <div className="relative w-32 h-32 glass-morphism rounded-3xl flex items-center justify-center border-2 border-emerald-500/30">
                          <svg className="w-16 h-16 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Camera Standby</h3>
                      <p className="text-slate-400 text-sm">Activate a mode to begin visual analysis</p>
                    </div>
                  </div>
                )}

                {mode === 'live' && (
                  <div className="absolute top-6 left-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-500/50 rounded-full blur-md animate-pulse"></div>
                      <div className="relative flex items-center gap-2.5 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full shadow-lg shadow-red-500/30">
                        <div className="w-2 h-2 bg-white rounded-full animate-glow"></div>
                        <span className="text-white text-xs font-bold uppercase tracking-wider">Recording</span>
                      </div>
                    </div>
                  </div>
                )}

                {detections.length > 0 && (
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="glass-morphism rounded-2xl p-5 border border-white/10">
                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="relative w-5 h-5 flex items-center justify-center">
                          <div className="absolute w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></div>
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                        </div>
                        <span className="text-white font-semibold text-sm uppercase tracking-wider">Detected Objects</span>
                        <span className="ml-auto text-emerald-400 text-xs font-mono">{detections.length} items</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detections.map((det, idx) => (
                          <div 
                            key={idx}
                            className={`detection-tag px-4 py-2 rounded-lg text-xs font-semibold border backdrop-blur-sm ${
                              det.priority >= 5 
                                ? 'bg-red-500/20 border-red-400/40 text-red-200' 
                                : det.priority >= 3 
                                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                                : 'bg-slate-500/20 border-slate-400/40 text-slate-200'
                            }`}
                            style={{animationDelay: `${idx * 50}ms`}}
                          >
                            <span className="font-bold capitalize">{det.object}</span>
                            <span className="mx-1.5 opacity-50">·</span>
                            <span className="opacity-75">{det.direction}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="glass-morphism rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">YOLOv8</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">Gemini AI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span className="text-slate-400 font-medium">Real-time Processing</span>
                  </div>
                </div>
                {status.includes('Demo') && (
                  <span className="px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full font-semibold">
                    Demo Mode
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <button
              onClick={mode === 'live' ? stopLiveMode : startLiveMode}
              className={`group relative w-full rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
                mode === 'live'
                  ? 'bg-gradient-to-br from-red-500 to-red-600 button-glow'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-600 button-glow hover:from-emerald-400 hover:to-emerald-500'
              }`}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:bg-white/25 transition-colors">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {mode === 'live' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      )}
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-xl mb-1.5 tracking-tight">
                    {mode === 'live' ? 'Stop Monitoring' : 'Start Live Mode'}
                  </h3>
                  <p className="text-white/75 text-sm font-medium">Continuous hazard detection</p>
                </div>
              </div>
            </button>

            <button
              onClick={explainSnapshot}
              disabled={mode === 'live'}
              className="group relative w-full bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-8 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] button-glow hover:from-blue-400 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 group-hover:bg-white/25 transition-colors">
                    <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-white font-bold text-xl mb-1.5 tracking-tight">Explain Scene</h3>
                  <p className="text-white/75 text-sm font-medium">Detailed environment analysis</p>
                </div>
              </div>
            </button>

            <div className="space-y-3 pt-4">
              <div className="glass-morphism rounded-xl p-5 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300 group">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm mb-1.5 tracking-tight">Real-Time Monitoring</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Instant alerts for potential hazards and obstacles in your environment</p>
                  </div>
                </div>
              </div>

              <div className="glass-morphism rounded-xl p-5 border border-blue-500/20 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-300 group">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm mb-1.5 tracking-tight">Scene Understanding</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Comprehensive descriptions of your surroundings on demand</p>
                  </div>
                </div>
              </div>

              <div className="glass-morphism rounded-xl p-5 border border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 transition-all duration-300 group">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-11 h-11 bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold text-sm mb-1.5 tracking-tight">Privacy Focused</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">Local processing with secure AI inference</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
