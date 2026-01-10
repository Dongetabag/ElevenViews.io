import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { appStore } from '../services/appStore';

interface ResetPasswordPageProps {
  onBackToLogin: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onBackToLogin }) => {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // Extract token from URL and verify it
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setError('No reset token provided. Please request a new password reset.');
      setIsLoading(false);
      return;
    }

    setToken(tokenParam);

    // Verify the token
    appStore.verifyResetToken(tokenParam).then((result) => {
      if (result.valid && result.email) {
        setTokenValid(true);
        setEmail(result.email);
      } else {
        setError(result.error || 'Invalid or expired reset link. Please request a new one.');
      }
      setIsLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!token) {
      setError('Invalid reset token.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await appStore.resetPasswordWithToken(token, newPassword);

      if (result.success) {
        setSuccess(true);
        // Clear the token from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        setError(result.error || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to Login */}
        <button
          onClick={onBackToLogin}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Sign In
        </button>

        <div className="glass border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b border-white/5 bg-white/5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center mb-4">
              <KeyRound className="w-8 h-8 text-brand-gold" />
            </div>
            <h1 className="text-2xl font-bold text-white font-orbitron uppercase tracking-widest">
              {success ? 'Password Reset' : 'Create New Password'}
            </h1>
            {email && !success && (
              <p className="text-sm text-gray-500 mt-2">for {email}</p>
            )}
          </div>

          {/* Content */}
          <div className="p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-brand-gold/30 border-t-brand-gold rounded-full animate-spin mb-4" />
                <p className="text-gray-400">Verifying reset link...</p>
              </div>
            ) : success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Password Updated!</h3>
                <p className="text-gray-400 mb-6">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>
                <button
                  onClick={onBackToLogin}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-brand-gold text-black font-bold text-sm rounded-2xl transition-all shadow-xl shadow-brand-gold/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="font-orbitron tracking-widest">SIGN IN NOW</span>
                </button>
              </div>
            ) : error && !tokenValid ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Link Invalid</h3>
                <p className="text-gray-400 mb-6">{error}</p>
                <button
                  onClick={onBackToLogin}
                  className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white/10 text-white font-bold text-sm rounded-2xl transition-all hover:bg-white/20"
                >
                  <span className="font-orbitron tracking-widest">BACK TO LOGIN</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      required
                      minLength={6}
                      autoFocus
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

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword || !confirmPassword}
                  className={`w-full flex items-center justify-center gap-3 px-8 py-4 bg-brand-gold text-black font-bold text-sm rounded-2xl transition-all shadow-xl shadow-brand-gold/20 ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span className="font-orbitron tracking-widest">UPDATING...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-5 h-5" />
                      <span className="font-orbitron tracking-widest">UPDATE PASSWORD</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
