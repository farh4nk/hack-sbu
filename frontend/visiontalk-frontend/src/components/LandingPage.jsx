import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Subcomponents
const Logo = ({ size = 'default', onClick }) => {
  const sizes = {
    small: 'w-10 h-10',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  };
  
  const iconSizes = {
    small: 'w-6 h-6',
    default: 'w-7 h-7',
    large: 'w-9 h-9'
  };

  return (
    <button 
      onClick={onClick}
      className="relative group focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#0A0E27] rounded-2xl"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
      <div className={`relative ${sizes[size]} bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300`}>
        <svg className={`${iconSizes[size]} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </div>
    </button>
  );
};

const StatCard = ({ value, label, delay = 0 }) => (
  <div className="animate-slide-up" style={{animationDelay: `${delay}ms`}}>
    <div className="text-3xl font-bold text-white mb-1 tracking-tight">{value}</div>
    <div className="text-sm text-slate-400 font-medium">{label}</div>
  </div>
);

const FeatureCard = ({ icon, title, description, color, isHovered, onHover, onLeave }) => (
  <div
    className="feature-card glass-morphism rounded-2xl p-8 transition-all duration-300 hover:border-white/20 cursor-pointer"
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
  >
    <div className={`w-16 h-16 bg-gradient-to-br from-${color}-500/20 to-${color}-600/20 rounded-2xl flex items-center justify-center mb-6 border border-${color}-500/30 transition-transform duration-300 ${
      isHovered ? 'scale-110' : ''
    }`}>
      <div className={`text-${color}-400`}>
        {icon}
      </div>
    </div>
    <h3 className="text-white text-xl font-bold mb-3 tracking-tight">{title}</h3>
    <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
  </div>
);

const Button = ({ children, onClick, variant = 'primary', fullWidth = false, disabled = false }) => {
  const variants = {
    primary: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:from-emerald-400 hover:to-emerald-500',
    secondary: 'glass-morphism hover:bg-white/5',
    ghost: 'bg-transparent hover:bg-white/5'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${variants[variant]} ${fullWidth ? 'w-full' : ''}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};

const LandingPage = ({ onGetStarted }) => {
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: "Real-Time Detection",
      description: "Instant object recognition powered by YOLOv8 computer vision with sub-second response times",
      color: "emerald"
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      title: "Natural Language",
      description: "AI-generated scene descriptions using Gemini 1.5 Pro for human-friendly environmental context",
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
      description: "Built for independence with intuitive voice feedback and WCAG AA compliant interfaces",
      color: "purple"
    }
  ];

  const stats = [
    { value: "<1s", label: "Detection Speed" },
    { value: "80+", label: "Object Types" },
    { value: "24/7", label: "Availability" }
  ];

  const handleNavigation = () => {
    if (onGetStarted) {
      onGetStarted();
    } else {
      window.location.href = '/camera';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E27] relative overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        
        * { 
          font-family: 'Sora', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        h1, h2, h3, button {
          font-family: 'Space Grotesk', monospace;
          letter-spacing: -0.03em;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
          33% { transform: translateY(-20px) translateX(10px) rotate(2deg); }
          66% { transform: translateY(-10px) translateX(-10px) rotate(-2deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        
        .animate-float { animation: float 8s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-slide-up { animation: slide-up 0.6s ease-out forwards; }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        
        .grid-pattern {
          background-image: 
            linear-gradient(rgba(16, 185, 129, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse 80% 50% at 50% 50%, black 40%, transparent 100%);
        }
        
        .feature-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .feature-card:hover {
          transform: translateY(-6px);
          border-color: rgba(255, 255, 255, 0.15);
        }
        
        .shimmer-effect {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          background-size: 1000px 100%;
          animation: shimmer 3s infinite;
        }
      `}</style>

      {/* Animated background layers */}
      <div className="fixed inset-0 grid-pattern opacity-40"></div>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-emerald-500/8 rounded-full blur-[140px] animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[140px] animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-emerald-400/4 rounded-full blur-[120px] animate-pulse-slow"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="px-8 py-6">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="default" />
              <div>
                <h2 className="text-white text-xl font-bold tracking-tight">Mira</h2>
                <p className="text-slate-400 text-xs font-medium tracking-wider">MACHINE INTELLIGENT RECOGNITION ASSISTANT</p>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="px-8 pt-16 pb-28">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid lg:grid-cols-2 gap-20 items-center">
              {/* Left: Content */}
              <div className="space-y-8 animate-slide-up">
                <div className="inline-flex items-center gap-2 glass-morphism px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-emerald-400 text-sm font-semibold tracking-wide">ML-POWERED ACCESSIBILITY</span>
                </div>

                <h1 className="text-6xl lg:text-7xl font-bold text-white leading-[1.05]">
                  See the world
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
                    through AI vision
                  </span>
                </h1>

                <p className="text-xl text-slate-300 leading-relaxed max-w-xl font-light">
                  Mira combines real-time computer vision with natural language processing to help you navigate and understand your environment with confidence and independence.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <Button onClick={handleNavigation} variant="primary">
                    Get Started
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Button>

                  <Button onClick={handleNavigation} variant="secondary">
                    Watch Demo
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex gap-12 pt-8 border-t border-white/5">
                  {stats.map((stat, idx) => (
                    <StatCard key={idx} value={stat.value} label={stat.label} delay={idx * 100} />
                  ))}
                </div>
              </div>

              {/* Right: Visual Demo */}
              <div className="relative animate-slide-up" style={{animationDelay: '200ms'}}>
                <div className="relative group">
                  <div className="absolute -inset-[2px] bg-gradient-to-br from-emerald-500/40 via-blue-500/20 to-emerald-500/40 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                  
                  <div className="relative glass-morphism rounded-3xl p-8 space-y-6">
                    {/* Mock camera view */}
                    <div className="relative h-80 bg-gradient-to-br from-slate-800/40 to-slate-900/60 rounded-2xl overflow-hidden border border-white/10">
                      <div className="absolute inset-0 shimmer-effect"></div>
                      
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative animate-float">
                          <div className="absolute inset-0 bg-emerald-500/15 rounded-3xl blur-2xl"></div>
                          <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 rounded-3xl flex items-center justify-center border border-emerald-500/30 backdrop-blur-sm">
                            <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Mock detection overlay */}
                      <div className="absolute bottom-4 left-4 right-4 glass-morphism rounded-xl p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                          <span className="text-white text-xs font-semibold uppercase tracking-wider">Live Detection</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <div className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-400/30 rounded-lg text-emerald-200 text-xs font-semibold backdrop-blur-sm">
                            Person · Center
                          </div>
                          <div className="px-3 py-1.5 bg-blue-500/15 border border-blue-400/30 rounded-lg text-blue-200 text-xs font-semibold backdrop-blur-sm">
                            Chair · Left
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mock controls */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-morphism rounded-xl p-5 text-center hover:bg-white/5 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-emerald-500/15 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          </svg>
                        </div>
                        <div className="text-white text-sm font-semibold">Live Mode</div>
                      </div>
                      <div className="glass-morphism rounded-xl p-5 text-center hover:bg-white/5 transition-all cursor-pointer group">
                        <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <section className="px-8 py-24 border-t border-white/5">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
                Built for everyone
              </h2>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                Advanced AI technology made simple and accessible
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <FeatureCard
                  key={idx}
                  {...feature}
                  isHovered={hoveredFeature === idx}
                  onHover={() => setHoveredFeature(idx)}
                  onLeave={() => setHoveredFeature(null)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-8 py-24">
          <div className="max-w-[1000px] mx-auto">
            <div className="relative group">
              <div className="absolute -inset-[2px] bg-gradient-to-r from-emerald-500/50 via-blue-500/30 to-emerald-500/50 rounded-3xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
              
              <div className="relative glass-morphism rounded-3xl p-20 text-center border border-white/10">
                <h2 className="text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
                  Ready to experience
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-blue-400 bg-clip-text text-transparent">
                    intelligent vision?
                  </span>
                </h2>
                <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                  Start using Mira today and discover a new way to interact with the world around you.
                </p>
                <Button onClick={handleNavigation} variant="primary">
                  Launch Application
                  <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-8 py-12 border-t border-white/5">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Logo size="small" />
                <div>
                  <div className="text-white font-bold tracking-tight">Mira</div>
                  <div className="text-slate-500 text-sm">Clear vision, human connection</div>
                </div>
              </div>

              <div className="flex items-center gap-8 text-sm text-slate-400">
                <span>Powered by YOLOv8 & Gemini AI</span>
                <span>•</span>
                <span>© 2025 Mira</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

LandingPage.propTypes = {
  onGetStarted: PropTypes.func
};

Logo.propTypes = {
  size: PropTypes.oneOf(['small', 'default', 'large']),
  onClick: PropTypes.func
};

StatCard.propTypes = {
  value: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  delay: PropTypes.number
};

FeatureCard.propTypes = {
  icon: PropTypes.node.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  color: PropTypes.string.isRequired,
  isHovered: PropTypes.bool,
  onHover: PropTypes.func,
  onLeave: PropTypes.func
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'ghost']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool
};

export default LandingPage;