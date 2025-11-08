import React, { useState } from 'react';
import PropTypes from 'prop-types';

const LandingPage = ({ onGetStarted }) => {
  const [isHovered, setIsHovered] = useState(null);

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Real-Time Detection",
      description: "Instant object recognition powered by YOLOv8 computer vision",
      color: "emerald"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      title: "Natural Language",
      description: "AI-generated scene descriptions using Gemini 1.5 Pro",
      color: "blue"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      title: "Accessible Design",
      description: "Built for independence with intuitive voice feedback",
      color: "purple"
    }
  ];

  const stats = [
    { value: "<1s", label: "Detection Speed" },
    { value: "80+", label: "Object Types" },
    { value: "24/7", label: "Availability" }
  ];

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
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        
        .feature-card:hover {
          transform: translateY(-4px);
        }
      `}</style>

      {/* Animated background */}
      <div className="fixed inset-0 grid-pattern opacity-30"></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-400/5 rounded-full blur-[100px] animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-8 py-6">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-2xl blur-xl"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">VisionTalk AI</h2>
                <p className="text-slate-400 text-xs font-medium">INTELLIGENT VISUAL ASSISTANCE</p>
              </div>
            </div>
            
            <button className="glass-morphism px-6 py-2.5 rounded-full text-slate-200 text-sm font-medium hover:bg-white/5 transition-all">
              About
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-8 pt-20 pb-32">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left: Content */}
              <div className="space-y-8 animate-slide-up">
                <div className="inline-flex items-center gap-2 glass-morphism px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-sm font-semibold">AI-Powered Accessibility</span>
                </div>

                <h1 className="text-6xl lg:text-7xl font-bold text-white leading-[1.1]">
                  See the world
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                    through AI
                  </span>
                </h1>

                <p className="text-xl text-slate-300 leading-relaxed max-w-xl">
                  VisionTalk AI combines real-time computer vision with natural language processing to help you navigate and understand your environment with confidence.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <button 
                    onClick={() => window.location.href = '/camera'}
                    className="group relative px-8 py-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl font-semibold text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Get Started
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>

                  <button 
                    onClick={() => window.location.href = '/camera'}
                    className="glass-morphism px-8 py-4 rounded-2xl font-semibold text-white hover:bg-white/5 transition-all"
                  >
                    Watch Demo
                  </button>
                </div>

                {/* Stats */}
                <div className="flex gap-8 pt-8">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="animate-slide-up" style={{animationDelay: `${idx * 100}ms`}}>
                      <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-slate-400 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Visual Demo */}
              <div className="relative animate-slide-up" style={{animationDelay: '200ms'}}>
                <div className="relative group">
                  <div className="absolute -inset-[1px] bg-gradient-to-br from-emerald-500/50 via-blue-500/30 to-emerald-500/50 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                  
                  <div className="relative glass-morphism rounded-3xl p-8 space-y-6">
                    {/* Mock camera view */}
                    <div className="relative h-80 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl overflow-hidden border border-white/5">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative animate-float">
                          <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-xl"></div>
                          <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Mock detection overlay */}
                      <div className="absolute bottom-4 left-4 right-4 glass-morphism rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-white text-xs font-semibold uppercase tracking-wider">Live Detection</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-emerald-200 text-xs font-semibold">
                            Person · Center
                          </div>
                          <div className="px-3 py-1.5 bg-blue-500/20 border border-blue-400/40 rounded-lg text-blue-200 text-xs font-semibold">
                            Chair · Left
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mock controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-morphism rounded-xl p-4 text-center hover:bg-white/5 transition-all cursor-pointer">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                        <div className="text-white text-sm font-semibold">Live Mode</div>
                      </div>
                      <div className="glass-morphism rounded-xl p-4 text-center hover:bg-white/5 transition-all cursor-pointer">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          </svg>
                        </div>
                        <div className="text-white text-sm font-semibold">Explain</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-8 py-20">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
                Built for everyone
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Advanced AI technology made simple and accessible
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <div
                  key={idx}
                  className="feature-card glass-morphism rounded-2xl p-8 transition-all duration-300 hover:border-white/20 cursor-pointer animate-slide-up"
                  style={{animationDelay: `${idx * 100}ms`}}
                  onMouseEnter={() => setIsHovered(idx)}
                  onMouseLeave={() => setIsHovered(null)}
                >
                  <div className={`w-16 h-16 bg-gradient-to-br from-${feature.color}-500/20 to-${feature.color}-600/20 rounded-2xl flex items-center justify-center mb-6 border border-${feature.color}-500/30 transition-transform duration-300 ${
                    isHovered === idx ? 'scale-110' : ''
                  }`}>
                    <div className={`text-${feature.color}-400`}>
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-8 py-20">
          <div className="max-w-[1000px] mx-auto">
            <div className="relative group">
              <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
              
              <div className="relative glass-morphism rounded-3xl p-16 text-center">
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
                  Ready to experience
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                    intelligent vision?
                  </span>
                </h2>
                <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                  Start using VisionTalk AI today and discover a new way to interact with the world around you.
                </p>
                <button 
                  onClick={() => window.location.href = '/camera'}
                  className="group px-10 py-5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl font-bold text-white text-lg shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  <span className="flex items-center gap-3">
                    Launch Application
                    <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-12 border-t border-white/5">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-bold">VisionTalk AI</div>
                  <div className="text-slate-500 text-sm">Clear vision, human connection</div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-sm text-slate-400">
                <span>Powered by YOLOv8 & Gemini AI</span>
                <span>•</span>
                <span>© 2024 VisionTalk</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )};

  
export default LandingPage;


LandingPage.propTypes = {
  onGetStarted: PropTypes.func
};