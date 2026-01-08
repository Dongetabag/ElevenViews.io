import React, { useState, useEffect } from 'react';
import { X, LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, Users } from 'lucide-react';
import { appStore } from '../services/appStore.ts';

interface LoginModalProps {
  show: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  onSwitchToRegister: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ show, onClose, onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUsers, setRegisteredUsers] = useState<{name: string, email: string, avatar?: string}[]>([]);
  const [showUserList, setShowUserList] = useState(false);

  useEffect(() => {
    if (show) {
      // Load registered users for quick access
      const users = appStore.getUsers();
      setRegisteredUsers(users.map(u => ({ name: u.name, email: u.email, avatar: u.avatar })));
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = appStore.login(email, password);

    if (result.success && result.user) {
      onSuccess(result.user);
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setIsLoading(false);
  };

  const handleQuickLogin = (userEmail: string) => {
    setEmail(userEmail);
    setShowUserList(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-xl animate-fadeIn" onClick={onClose} />

      <div className="relative w-full max-w-md glass border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center">
              <LogIn className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron uppercase tracking-widest">Sign In</h2>
              <p className="text-xs text-gray-500 font-medium">Access your Recipe Labs account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick User Select */}
          {registeredUsers.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowUserList(!showUserList)}
                className="flex items-center gap-2 text-xs text-brand-gold hover:text-brand-gold/80 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>{showUserList ? 'Hide' : 'Show'} team members ({registeredUsers.length})</span>
              </button>

              {showUserList && (
                <div className="bg-white/5 rounded-xl p-2 max-h-40 overflow-y-auto space-y-1">
                  {registeredUsers.map((user, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleQuickLogin(user.email)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
                    >
                      <img
                        src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`}
                        alt={user.name}
                        className="w-8 h-8 rounded-full bg-brand-gold/20"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-3 h-3" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@recipelabs.ai"
              autoFocus
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3 h-3" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !email || !password}
            className={`w-full flex items-center justify-center gap-3 px-8 py-4 bg-brand-gold text-black font-bold text-sm rounded-2xl transition-all shadow-xl shadow-brand-gold/20 ${
              isLoading || !email || !password
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span className="font-orbitron tracking-widest">AUTHENTICATING...</span>
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span className="font-orbitron tracking-widest">SIGN IN</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="px-8 pb-8 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-brand-gold hover:text-brand-gold/80 font-medium transition-colors"
            >
              Create Account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
