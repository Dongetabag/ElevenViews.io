import React from 'react';
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
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-brand-gold/5 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-brand-amber/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="text-center relative z-10 p-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-brand-gold/5 border border-brand-gold/15 mb-10 animate-glow">
          <Aperture className="w-4 h-4 text-brand-gold" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-gold/90">Production Studio</span>
        </div>

        {/* Main Title */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tight text-white leading-none mb-4">
            ELEVEN<span className="text-brand-gold">VIEWS</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-brand-gold/50"></div>
            <span className="text-xs uppercase tracking-[0.3em] text-gray-500 font-medium">Est. 2024</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-brand-gold/50"></div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-lg md:text-xl lg:text-2xl text-gray-400 mb-6 max-w-2xl mx-auto font-light leading-relaxed">
          Visual storytelling through the
          <span className="text-white font-normal"> raw beauty of the world.</span>
        </p>

        <p className="text-sm text-gray-500 mb-12 max-w-xl mx-auto">
          A boutique production company crafting cinematic narratives for global brands.
          Video. Photography. Campaigns.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={onRegister}
            className="group relative flex items-center gap-3 px-10 py-5 bg-brand-gold text-brand-dark font-semibold text-base transition-all duration-300 rounded-xl hover:bg-brand-gold/90 hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_rgba(201,169,98,0.15)]"
          >
            <span className="font-display tracking-wide">Start a Project</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onLogin}
            className="group relative flex items-center gap-3 px-8 py-5 bg-white/5 border border-white/10 text-white font-medium text-base transition-all duration-300 rounded-xl hover:bg-white/10 hover:border-white/20 active:scale-[0.98]"
          >
            <LogIn className="w-5 h-5 text-brand-gold/80" />
            <span className="font-display tracking-wide">Client Portal</span>
          </button>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-16">
          <div className="glass-gold rounded-2xl p-6 text-center hover:border-brand-gold/20 transition-all">
            <Play className="w-8 h-8 text-brand-gold mx-auto mb-3" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Video Production</h3>
            <p className="text-xs text-gray-500">Cinematic narratives that move</p>
          </div>
          <div className="glass-gold rounded-2xl p-6 text-center hover:border-brand-gold/20 transition-all">
            <Camera className="w-8 h-8 text-brand-gold mx-auto mb-3" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Photography</h3>
            <p className="text-xs text-gray-500">Editorial imagery with soul</p>
          </div>
          <div className="glass-gold rounded-2xl p-6 text-center hover:border-brand-gold/20 transition-all">
            <Globe className="w-8 h-8 text-brand-gold mx-auto mb-3" />
            <h3 className="text-sm font-display font-semibold text-white mb-1">Global Campaigns</h3>
            <p className="text-xs text-gray-500">Location-driven storytelling</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-8 px-8 py-5 glass rounded-2xl">
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">40+</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Countries</p>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">200+</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Projects</p>
            </div>
            <div className="w-px h-10 bg-white/10"></div>
            <div className="text-center">
              <p className="text-xl font-display font-bold text-white">11</p>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">Perspectives</p>
            </div>
          </div>
        </div>

        {/* Featured In */}
        <div className="mt-16 opacity-40">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 mb-4">Featured In</p>
          <div className="flex items-center justify-center gap-8 flex-wrap text-xs text-gray-500 font-medium">
            <span>Condé Nast Traveler</span>
            <span className="hidden md:inline">•</span>
            <span>Monocle</span>
            <span className="hidden md:inline">•</span>
            <span>Wallpaper*</span>
            <span className="hidden md:inline">•</span>
            <span>Kinfolk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
