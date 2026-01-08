import React from 'react';
import HexGridBackground from './HexGridBackground.tsx';
import { Sparkles, FlaskConical, ChevronRight, LogIn } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center relative overflow-hidden font-sans">
      <HexGridBackground />
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-gold/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-gold/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="text-center relative z-10 p-6 max-w-4xl mx-auto animate-fadeIn">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/5 border border-brand-gold/20 mb-8 animate-glow">
          <Sparkles className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-gold">Intelligence Reimagined</span>
        </div>

        <div className="mb-8">
          <h1 className="text-7xl md:text-9xl font-black font-orbitron tracking-tighter text-white leading-none">
            RECIPE<span className="text-brand-gold">LABS</span>
          </h1>
          <div className="h-1 w-32 bg-brand-gold mx-auto mt-4 rounded-full"></div>
        </div>

        <p className="text-lg md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
          The ultimate AI-powered cognitive workspace for elite agencies. 
          <span className="text-white"> Strategy, Creation, and Growth—synchronized.</span>
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={onRegister}
            className="group relative flex items-center gap-3 px-10 py-5 bg-brand-gold text-black font-bold text-lg transition-all duration-300 rounded-2xl hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,215,0,0.2)]"
          >
            <span className="font-orbitron tracking-widest">CREATE ACCOUNT</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onLogin}
            className="group relative flex items-center gap-3 px-8 py-5 bg-white/5 border border-white/20 text-white font-bold text-lg transition-all duration-300 rounded-2xl hover:bg-white/10 hover:border-white/30 active:scale-95"
          >
            <LogIn className="w-5 h-5 text-brand-gold" />
            <span className="font-orbitron tracking-widest">SIGN IN</span>
          </button>
        </div>

        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center gap-4 px-6 py-4 glass rounded-2xl border-white/10">
            <FlaskConical className="w-6 h-6 text-brand-gold" />
            <div className="text-left">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">System Status</p>
              <p className="text-xs font-mono text-green-500">OPTIMIZED & ONLINE</p>
            </div>
          </div>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-50">
           <div>
             <p className="text-xl font-bold text-white font-orbitron">2.5s</p>
             <p className="text-[10px] uppercase tracking-widest mt-1">Synthesis Latency</p>
           </div>
           <div>
             <p className="text-xl font-bold text-white font-orbitron">99.9%</p>
             <p className="text-[10px] uppercase tracking-widest mt-1">Uptime SLA</p>
           </div>
           <div>
             <p className="text-xl font-bold text-white font-orbitron">PRO</p>
             <p className="text-[10px] uppercase tracking-widest mt-1">Enterprise Encryption</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;