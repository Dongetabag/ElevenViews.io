// Box OAuth Callback Handler
import React, { useEffect, useState } from 'react';
import { Box, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { boxService } from '../services/boxService';

interface BoxCallbackProps {
  onComplete: () => void;
  onNavigate: (module: string) => void;
}

const BoxCallback: React.FC<BoxCallbackProps> = ({ onComplete, onNavigate }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Connecting to Box...');

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Check for errors from Box
      if (error) {
        setStatus('error');
        setMessage(errorDescription || 'Authorization was denied');
        return;
      }

      // Validate state parameter
      const savedState = localStorage.getItem('box_oauth_state');
      if (state && savedState && state !== savedState) {
        setStatus('error');
        setMessage('Security validation failed. Please try again.');
        return;
      }

      // Need authorization code
      if (!code) {
        setStatus('error');
        setMessage('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens
        setMessage('Exchanging authorization code...');
        await boxService.exchangeCodeForToken(code);

        // Clean up state and URL
        localStorage.removeItem('box_oauth_state');
        window.history.replaceState({}, document.title, window.location.pathname);

        // Get user info to verify connection
        setMessage('Verifying connection...');
        const user = await boxService.getCurrentUser();

        setStatus('success');
        setMessage(`Connected as ${user.name || user.login}`);

        // Redirect back to assets after a short delay
        setTimeout(() => {
          onComplete();
          onNavigate('assets');
        }, 2000);
      } catch (err) {
        console.error('Box OAuth error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Failed to connect to Box');
      }
    };

    handleCallback();
  }, [onComplete, onNavigate]);

  const handleBack = () => {
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
    localStorage.removeItem('box_oauth_state');
    onComplete();
    onNavigate('assets');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 text-center border border-gray-700">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Box size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Box Connection</h2>
        </div>

        <div className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 size={48} className="text-blue-500 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle size={48} className="text-green-500" />
          )}
          {status === 'error' && (
            <XCircle size={48} className="text-red-500" />
          )}

          <p className={`text-lg ${
            status === 'success' ? 'text-green-400' :
            status === 'error' ? 'text-red-400' :
            'text-gray-300'
          }`}>
            {message}
          </p>

          {status === 'success' && (
            <p className="text-sm text-gray-400">Redirecting to Media Library...</p>
          )}

          {status === 'error' && (
            <button
              onClick={handleBack}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Back to Media Library
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BoxCallback;
