import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Lock, ArrowRight } from 'lucide-react';
import { Button, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { authAPI } from '../../services/api';
import './Login.css'; // Import the CSS file

const Login = () => {
  const [credentials, setCredentials] = useState({ userName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useAuth();
  const location = useLocation();

  // Handle OAuth error messages from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const errorMessage = urlParams.get('message');
    const logindirect = urlParams.get('logindirect');
    
    if (logindirect) {
      setSessionTimedOut(true);
    }
    
    if (error) {
      let displayMessage = 'Authentication failed';
      
      switch (error) {
        case 'access_denied':
          displayMessage = 'Access denied. Please try again.';
          break;
        case 'not_registered':
          displayMessage = errorMessage ? 
            decodeURIComponent(errorMessage) : 
            'Your account is not registered in the system. Please contact your administrator.';
          break;
        case 'account_inactive':
          displayMessage = 'Your account is inactive. Please contact your administrator.';
          break;
        case 'invalid_role':
          displayMessage = 'Your account does not have valid permissions.';
          break;
        case 'server_error':
          displayMessage = 'Server error occurred. Please try again later.';
          break;
        case 'oauth_failed':
          displayMessage = 'Google authentication failed. Please try again.';
          break;
        default:
          displayMessage = 'An error occurred during authentication.';
      }
      
      setOauthError(displayMessage);
      message.error(displayMessage, 8);
      
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOauthError('');

    const result = await login(credentials);

    if (result.success) {
      window.location.href = '/';
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
    if (oauthError) setOauthError('');
  };

  const handleGoogleLogin = () => {
    setError('');
    setOauthError('');
    setGoogleLoading(true);
    authAPI.googleLogin();
  };

  return (
    <div 
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat" 
      style={{ 
        backgroundImage: `url(/nec_image.jpg)`, 
      }}
    >
      {/* Top Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-4 animate-fadeInLeft">
          <img 
            src="/nec_logo.jpeg" 
            alt="National Engineering College"
            className="h-12 w-auto hover:scale-110 transition-transform duration-300"
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">National Engineering College</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white bg-opacity-90 backdrop-blur-md rounded-2xl shadow-2xl p-8 animate-slideUp border border-white/30">
          {/* College Logo */}
          <div className="text-center mb-4">
            <div className="inline-block">
              <img 
                src="/nec_logo.jpeg" 
                alt="NEC"
                className="mx-auto h-24 w-auto mb-4 hover:scale-110 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Sign In Title */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Sign In
            </h2>
            <p className="text-gray-600 text-sm mt-2">Welcome back to your hostel portal</p>
          </div>

          {/* Session Timed Out Message */}
          {sessionTimedOut && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg animate-slideDown flex items-center gap-2">
              <span className="text-xl">⏱️</span>
              Your session has timed out. Please log in again.
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-shake flex items-center gap-2">
              <span className="text-xl">❌</span>
              {error}
            </div>
          )}

          {/* OAuth Error */}
          {oauthError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg animate-shake flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              {oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* userName Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-blue-500 group-focus-within:text-blue-700 transition-colors" />
              </div>
              <input
                id="userName"
                name="userName"
                type="text"
                required
                value={credentials.userName}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 group-focus-within:shadow-lg group-focus-within:shadow-blue-200"
                placeholder="userName or Roll Number"
              />
            </div>

            {/* Password Field */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-blue-500 group-focus-within:text-blue-700 transition-colors" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 hover:border-blue-300 group-focus-within:shadow-lg group-focus-within:shadow-blue-200"
                placeholder="Password"
              />
            </div>

            {/* Creative Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 overflow-hidden rounded-lg font-semibold text-white transition-all duration-300 mt-6"
            >
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-blue-500/50"></div>
              
              {/* Shine Effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-shimmer"></div>
              
              {/* Content */}
              <div className="relative flex items-center justify-center gap-2 h-full">
                {loading ? (
                  <>
                    <div className="animate-spin">⏳</div>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </div>
            </button>
          </form>

          {/* Lost Password Link */}
          <div className="mt-4 text-center">
            <a 
              href="#" 
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-300 font-medium"
            >
              Lost password?
            </a>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500 font-medium">or continue with</span>
            </div>
          </div>

          {/* Creative Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading || googleLoading}
            className="group relative w-full h-12 overflow-hidden rounded-lg font-semibold text-gray-800 transition-all duration-300 border-2 border-gray-300 hover:border-gray-400"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-white transition-all duration-300 group-hover:bg-gray-50"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-blue-100 to-transparent transform -skew-x-12 animate-shimmer"></div>
            
            {/* Content */}
            <div className="relative flex items-center justify-center gap-3 h-full">
              {googleLoading ? (
                <>
                  <div className="animate-spin">🔄</div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <GoogleOutlined className="text-xl group-hover:scale-125 transition-transform duration-300" />
                  <span>Continue with Google</span>
                  <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    →
                  </div>
                </>
              )}
            </div>
          </button>

          {/* Additional Info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200 text-center text-xs text-gray-600">
            💡 <strong>Tip:</strong> You can use either your userName or roll number to log in.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white text-center py-4 text-sm shadow-lg">
        © 2025 National Engineering College. All rights reserved.
      </footer>
    </div>
  );
};

export default Login;
