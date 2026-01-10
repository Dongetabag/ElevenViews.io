import React, { useState } from 'react';
import {
  User, Camera, Film, Globe, MapPin, Target,
  Aperture, X, Briefcase, AlertCircle,
  Lock, Eye, EyeOff, Mail, Rocket, Play, Image
} from 'lucide-react';

export type IntakeData = {
  name: string;
  email: string;
  password: string;
  role: 'Director' | 'Producer' | 'Cinematographer' | 'Client';
  agencyBrandVoice: string;
  agencyCoreCompetency: string;
  primaryClientIndustry: string;
  targetLocation: string;
  idealClientProfile: string;
  clientWorkExamples: string;
  primaryGoals: string[];
  successMetric: string;
  platformTheme: string;
  toolLayout: 'grid' | 'list';
}

interface IntakeModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: IntakeData) => void;
}

const IntakeModal: React.FC<IntakeModalProps> = ({ show, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<IntakeData>({
    name: '',
    email: '',
    password: '',
    role: 'Director',
    agencyBrandVoice: '',
    agencyCoreCompetency: '',
    primaryClientIndustry: '',
    targetLocation: '',
    idealClientProfile: '',
    clientWorkExamples: '',
    primaryGoals: [],
    successMetric: '',
    platformTheme: 'cinematic',
    toolLayout: 'grid'
  });

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!show) return null;

  const roles: { id: IntakeData['role']; icon: any; desc: string }[] = [
    { id: 'Director', icon: Film, desc: 'Film & Music' },
    { id: 'Producer', icon: Play, desc: 'Production' },
    { id: 'Cinematographer', icon: Camera, desc: 'Visual Arts' },
    { id: 'Client', icon: Briefcase, desc: 'Fashion & Design' },
  ];

  const projectTypes = [
    'Music',
    'Film',
    'Fashion',
    'Design'
  ];

  const toggleGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      primaryGoals: prev.primaryGoals.includes(goal)
        ? prev.primaryGoals.filter(g => g !== goal)
        : [...prev.primaryGoals, goal]
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isFormValid = formData.name.trim().length > 0 && isValidEmail(formData.email) && formData.password.length >= 4 && formData.agencyCoreCompetency.trim().length > 0;

  const handleFinalSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isFormValid) {
      console.log('Submitting Project Intake:', formData);
      onSubmit(formData);
    } else {
      setTouched({ name: true, email: true, password: true, agencyCoreCompetency: true });
      setError('Please complete all required fields. Email must be valid and password at least 4 characters.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-xl animate-fadeIn" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] glass border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <Aperture className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold text-white tracking-tight">Member Application</h2>
              <p className="text-xs text-gray-500 mt-1">Join the Eleven Views creative collective</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Contact */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-semibold text-brand-gold uppercase tracking-[0.2em]">Contact Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                  Full Name <span className="text-brand-gold">*</span>
                </label>
                <input
                  name="name"
                  autoFocus
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="Your name"
                  className={`w-full bg-white/5 border rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${
                    touched.name && !formData.name.trim() ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/40'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
                  <span className="text-brand-gold">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="you@company.com"
                  className={`w-full bg-white/5 border rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${
                    touched.email && !isValidEmail(formData.email) ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/40'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center">
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Password</span>
                  <span className="text-brand-gold">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur('password')}
                    placeholder="Create a password"
                    className={`w-full bg-white/5 border rounded-xl p-4 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${
                      touched.password && formData.password.length < 4 ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex justify-between">
                  Portfolio / Brand <span className="text-brand-gold">*</span>
                </label>
                <input
                  name="agencyCoreCompetency"
                  value={formData.agencyCoreCompetency}
                  onChange={handleChange}
                  onBlur={() => handleBlur('agencyCoreCompetency')}
                  placeholder="Your portfolio, brand, or project name"
                  className={`w-full bg-white/5 border rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${
                    touched.agencyCoreCompetency && !formData.agencyCoreCompetency.trim() ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/40'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Your Specialty</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                      formData.role === r.id
                        ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold shadow-[0_0_20px_rgba(201,169,98,0.1)]'
                        : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <r.icon className="w-5 h-5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{r.id}</span>
                    <span className="text-[9px] text-gray-600">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Member Profile */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-semibold text-brand-gold uppercase tracking-[0.2em]">Member Profile</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Primary Industry</label>
                <input
                  name="primaryClientIndustry"
                  value={formData.primaryClientIndustry}
                  onChange={handleChange}
                  placeholder="e.g. Music, Film, Fashion, Design"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location
                </label>
                <input
                  name="targetLocation"
                  value={formData.targetLocation}
                  onChange={handleChange}
                  placeholder="e.g. LA, NYC, Atlanta, Global"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3" /> What You Bring
                </label>
                <input
                  name="successMetric"
                  value={formData.successMetric}
                  onChange={handleChange}
                  placeholder="e.g. Creative Direction, Production"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Creative Style / Approach</label>
              <input
                name="agencyBrandVoice"
                value={formData.agencyBrandVoice}
                onChange={handleChange}
                placeholder="e.g. Cinematic, raw, editorial, avant-garde"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/30 transition-all"
              />
            </div>
          </section>

          {/* Section 3: Industry Focus */}
          <section className="space-y-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Film className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-semibold text-brand-gold uppercase tracking-[0.2em]">Select Your Industries</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {projectTypes.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleGoal(type)}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${
                    formData.primaryGoals.includes(type)
                      ? 'bg-brand-gold text-brand-dark border-brand-gold shadow-lg shadow-brand-gold/20'
                      : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${isFormValid ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-brand-gold/60 shadow-[0_0_8px_rgba(201,169,98,0.4)]'}`}></div>
            <p className="text-[10px] font-mono text-gray-500">
              {isFormValid ? 'READY TO BEGIN' : 'COMPLETE REQUIRED FIELDS'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={!isFormValid}
            className={`flex items-center gap-3 px-10 py-4 bg-brand-gold text-brand-dark font-semibold rounded-xl transition-all shadow-xl shadow-brand-gold/10 ${
              isFormValid
                ? 'hover:bg-brand-gold/90 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <Rocket className="w-5 h-5" />
            <span className="font-display tracking-wide">Join Eleven Views</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntakeModal;
