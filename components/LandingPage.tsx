import React from 'react';
// Mobile-optimized landing page - v2.1
import HexGridBackground from './HexGridBackground.tsx';
import { Play, Camera, Globe, ChevronRight, LogIn, Aperture } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-brand-dark text-white flex items-center justify-center relative overflow-hidden font-sans">
      <HexGridBackground />

      {/* Cinematic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-dark via-brand-dark to-brand-surface"></div>
      <div className="absolute top-0 left-0 w-full h-full opacity-30">
        <div className="hidden sm:block absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-gold/5 blur-[150px] rounded-full"></div>
        <div className="hidden sm:block absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-amber/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="text-center relative z-10 p-4 sm:p-6 max-w-full sm:max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-full bg-brand-gold/5 border border-brand-gold/15 mb-10 animate-glow">
          <Aperture className="w-4 h-4 text-brand-gold" />
          <span className="text-sm sm:text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-gold/90">Members Only</span>
        </div>

        {/* Main Title */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight text-white leading-none mb-4">
            ELEVEN<span className="text-brand-gold">VIEWS</span>
          </h1>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-brand-gold/50"></div>
            <span className="text-sm sm:text-xs uppercase tracking-[0.3em] text-gray-500 font-medium">Est. 2021</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-brand-gold/50"></div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl lg:text-2xl text-gray-400 mb-6 max-w-2xl mx-auto font-light leading-relaxed">
          A creative collective of
          <span className="text-white font-normal"> industry professionals.</span>
        </p>

        <p className="text-sm text-gray-500 mb-12 max-w-xl mx-auto">
          An exclusive members portal for creatives in music, film, fashion & design.
          Service clients. Grow the brand. Build together.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-16">
          <button
            onClick={onRegister}
            className="group relative flex items-center gap-3 px-10 py-5 min-h-[44px] sm:min-h-0 bg-brand-gold text-brand-dark font-semibold text-base transition-all duration-300 rounded-xl hover:bg-brand-gold/90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(201,169,98,0.15)]"
          >
            <span className="font-display tracking-wide">Join the Views</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onLogin}
            className="group relative flex items-center gap-3 px-8 py-5 min-h-[44px] sm:min-h-0 bg-white/5 border border-white/10 text-white font-medium text-base transition-all duration-300 rounded-xl hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5 text-brand-gold/80" />
            <span className="font-display tracking-wide">Crew Login</span>
          </button>
        </div>

        {/* Industries Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto mb-16">
          <div className="glass-gold rounded-2xl p-5 text-center hover:border-brand-gold/20 transition-all">
            <Play className="w-7 h-7 text-brand-gold mx-auto mb-2" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Music</h3>
            <p className="text-sm sm:text-[10px] text-gray-500">Artists & Labels</p>
          </div>
          <div className="glass-gold rounded-2xl p-5 text-center hover:border-brand-gold/20 transition-all">
            <Camera className="w-7 h-7 text-brand-gold mx-auto mb-2" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Film</h3>
            <p className="text-sm sm:text-[10px] text-gray-500">Directors & Producers</p>
          </div>
          <div className="glass-gold rounded-2xl p-5 text-center hover:border-brand-gold/20 transition-all">
            <Globe className="w-7 h-7 text-brand-gold mx-auto mb-2" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Fashion</h3>
            <p className="text-sm sm:text-[10px] text-gray-500">Designers & Stylists</p>
          </div>
          <div className="glass-gold rounded-2xl p-5 text-center hover:border-brand-gold/20 transition-all">
            <Aperture className="w-7 h-7 text-brand-gold mx-auto mb-2" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Design</h3>
            <p className="text-sm sm:text-[10px] text-gray-500">Creatives & Visionaries</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-4 sm:gap-8 px-4 sm:px-8 py-5 glass rounded-2xl">
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">11</p>
              <p className="text-sm sm:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Core Members</p>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">4</p>
              <p className="text-sm sm:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Industries</p>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">1</p>
              <p className="text-sm sm:text-[10px] uppercase tracking-widest text-gray-500 mt-1">Vision</p>
            </div>
          </div>
        </div>

        {/* Member Benefits */}
        <div className="mt-16 opacity-60">
          <p className="text-sm sm:text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4">Member Benefits</p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap text-sm sm:text-xs text-gray-500 font-medium">
            <span>Client Access</span>
            <span className="hidden md:inline">•</span>
            <span>Project Tools</span>
            <span className="hidden md:inline">•</span>
            <span>AI Suite</span>
            <span className="hidden md:inline">•</span>
            <span>Crew Network</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
