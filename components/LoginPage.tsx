import React from 'react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center p-8 bg-gray-900 rounded-lg">
        <h1 className="text-3xl font-bold mb-4">Login</h1>
        <p className="text-gray-400 mb-6">Enter your credentials to continue.</p>
        <button
          onClick={onLoginSuccess}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl"
        >
          Log In (Demo)
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
