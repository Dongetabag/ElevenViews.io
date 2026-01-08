import React, { useState } from 'react';
import {
  User, Palette, Edit3, Compass, Users, Shield, Target,
  FlaskConical, Globe, Rocket, Zap, X, Briefcase, AlertCircle,
  Lock, Eye, EyeOff, Mail
} from 'lucide-react';

export type IntakeData = {
  name: string;
  email: string;
  password: string;
  role: 'Designer' | 'Copywriter' | 'Strategist' | 'Account Manager';
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
    role: 'Strategist',
    agencyBrandVoice: '',
    agencyCoreCompetency: '',
    primaryClientIndustry: '',
    targetLocation: '',
    idealClientProfile: '',
    clientWorkExamples: '',
    primaryGoals: [],
    successMetric: '',
    platformTheme: 'violet',
    toolLayout: 'grid'
  });

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!show) return null;

  const roles: { id: IntakeData['role']; icon: any }[] = [
    { id: 'Strategist', icon: Compass },
    { id: 'Designer', icon: Palette },
    { id: 'Copywriter', icon: Edit3 },
    { id: 'Account Manager', icon: Users },
  ];

  const goalOptions = [
    'Accelerate Strategy', 
    'Scale Content', 
    'Enhance Pitches', 
    'Automate Data'
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
      console.log('Submitting Intake Data:', formData);
      onSubmit(formData);
    } else {
      setTouched({ name: true, email: true, password: true, agencyCoreCompetency: true });
      setError('Please fill in all required fields (marked with *). Email must be valid and password at least 4 characters.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-xl animate-fadeIn" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] glass border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron uppercase tracking-widest">Lab Initialization</h2>
              <p className="text-xs text-gray-500 font-medium">Configure your agency intelligence profile</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-shake">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Identity */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em]">Core Identity</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                  Full Name <span className="text-brand-gold">*</span>
                </label>
                <input
                  name="name"
                  autoFocus
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g. Alexander Vance"
                  className={`w-full bg-white/5 border rounded-xl p-3 text-sm text-white focus:outline-none transition-all ${
                    touched.name && !formData.name.trim() ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/50'
                  }`}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center">
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
                  className={`w-full bg-white/5 border rounded-xl p-3 text-sm text-white focus:outline-none transition-all ${
                    touched.email && !isValidEmail(formData.email) ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/50'
                  }`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex justify-between items-center">
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
                    placeholder="Min 4 characters"
                    className={`w-full bg-white/5 border rounded-xl p-3 pr-10 text-sm text-white focus:outline-none transition-all ${
                      touched.password && formData.password.length < 4 ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex justify-between">
                  Agency Specialty <span className="text-brand-gold">*</span>
                </label>
                <input
                  name="agencyCoreCompetency"
                  value={formData.agencyCoreCompetency}
                  onChange={handleChange}
                  onBlur={() => handleBlur('agencyCoreCompetency')}
                  placeholder="e.g. B2B Performance Marketing"
                  className={`w-full bg-white/5 border rounded-xl p-3 text-sm text-white focus:outline-none transition-all ${
                    touched.agencyCoreCompetency && !formData.agencyCoreCompetency.trim() ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-white/10 focus:border-brand-gold/50'
                  }`}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Your Primary Lab Role</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: r.id }))}
                    className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                      formData.role === r.id 
                        ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]' 
                        : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <r.icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase truncate w-full text-center tracking-widest">{r.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Section 2: Market Intelligence */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em]">Market Intelligence</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Client Industry</label>
                <input
                  name="primaryClientIndustry"
                  value={formData.primaryClientIndustry}
                  onChange={handleChange}
                  placeholder="e.g. E-commerce"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Target Location</label>
                <input
                  name="targetLocation"
                  value={formData.targetLocation}
                  onChange={handleChange}
                  placeholder="e.g. North America"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Success Metric</label>
                <input
                  name="successMetric"
                  value={formData.successMetric}
                  onChange={handleChange}
                  placeholder="e.g. CPA Reduction"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-gold/30 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Agency Brand Voice Descriptor</label>
              <input
                name="agencyBrandVoice"
                value={formData.agencyBrandVoice}
                onChange={handleChange}
                placeholder="e.g. Sharp, data-driven, and slightly provocative"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-brand-gold/30 transition-all"
              />
            </div>
          </section>

          {/* Section 3: Configuration */}
          <section className="space-y-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-brand-gold" />
              <h3 className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.3em]">Operational Goals</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {goalOptions.map(goal => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={`p-3 rounded-xl border text-[10px] font-bold uppercase transition-all ${
                    formData.primaryGoals.includes(goal)
                      ? 'bg-brand-gold text-black border-brand-gold shadow-lg shadow-brand-gold/30'
                      : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className={`w-2 h-2 rounded-full animate-pulse ${isFormValid ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-brand-gold shadow-[0_0_8px_#FFD700]'}`}></div>
             <p className="text-[10px] font-mono text-gray-500">
               {isFormValid ? 'SYNTHESIS ENGINE READY' : 'WAITING FOR INPUT'}
             </p>
          </div>
          <button
            type="button"
            onClick={handleFinalSubmit}
            className={`flex items-center gap-3 px-10 py-5 bg-brand-gold text-black font-bold text-sm rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-brand-gold/20 ${!isFormValid ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer'}`}
          >
            <Rocket className="w-5 h-5" />
            <span className="font-orbitron tracking-widest">FINISH SETUP</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntakeModal;