import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, User, Lock, AlertCircle, Info, Shield, BookOpen, Users } from 'lucide-react';
import { Divider, Button, Alert, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { authAPI } from '../../services/api';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');
  const { login } = useAuth();
  const location = useLocation();

  // Handle OAuth error messages from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const errorMessage = urlParams.get('message');
    
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
    authAPI.googleLogin();
  };

  return (
    <div className="min-h-screen flex">
      
      {/* Left Side - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -mr-48 -mt-48 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-white opacity-5 rounded-full -ml-36 -mb-36 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white opacity-10 rounded-full animate-bounce delay-500"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-12">
            <div className="h-20 w-20 bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-2xl border border-white border-opacity-20">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight">NATIONAL<br />ENGINEERING COLLEGE</h1>
              <p className="text-blue-100 text-base mt-1 font-medium">Hostel Management Portal</p>
            </div>
          </div>
          
          <div className="mt-20">
            <h2 className="text-5xl font-bold text-white mb-8 leading-tight">
              Welcome to<br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Digital Hostel
              </span>
            </h2>
            <p className="text-blue-100 text-xl leading-relaxed max-w-lg">
              Hostel life, simplified. Check your mess, attendance, and room info anytime, anywhere!"
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-6">
          <div className="flex items-start space-x-4 p-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
            <div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1 text-lg">Secure Access</h3>
              <p className="text-blue-100 text-sm">Multi-layer security with encrypted data protection</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4 p-4 bg-white bg-opacity-10 backdrop-blur-sm rounded-xl border border-white border-opacity-20">
            <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold mb-1 text-lg">Unified Platform</h3>
              <p className="text-blue-100 text-sm">One portal for students, wardens, mess and administration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-blue-50 p-8 relative">
        {/* Decorative elements for mobile */}
        <div className="absolute top-10 right-10 w-20 h-20 bg-indigo-100 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-16 h-16 bg-purple-100 rounded-full opacity-30 animate-pulse delay-700"></div>
        
        <div className="max-w-md w-full relative z-10">
          
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center space-x-4">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">NATIONAL<br />ENGINEERING COLLEGE</h1>
                <p className="text-indigo-600 text-sm font-medium">Hostel Management</p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="relative">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-3">
                Sign In
              </h2>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
            <p className="text-gray-600 mt-6 text-lg">
              Access your hostel management portal
            </p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white/80 backdrop-blur-xl py-10 px-8 shadow-2xl rounded-3xl border border-white/20 relative overflow-hidden">
            {/* Card decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-indigo-50/30 rounded-3xl"></div>
            
            <div className="relative z-10">
              {/* Regular Login Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200/50 rounded-xl shadow-sm animate-fadeIn">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* OAuth Error Message */}
              {oauthError && (
                <div className="mb-6 animate-fadeIn">
                  <Alert
                    message="Google Sign-In Error"
                    description={oauthError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setOauthError('')}
                    className="rounded-xl shadow-sm"
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Username Field */}
                <div className="space-y-2">
                  <label htmlFor="username" className="block text-sm font-bold text-gray-700">
                    Username
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                    </div>
                    <input
                      id="username"
                      name="username"
                      type="text"
                      required
                      value={credentials.username}
                      onChange={handleChange}
                      className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md"
                      placeholder="Enter your username"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-bold text-gray-700">
                    Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-200" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={credentials.password}
                      onChange={handleChange}
                      className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all duration-300 bg-white/50 backdrop-blur-sm hover:bg-white/80 shadow-sm hover:shadow-md"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="relative w-full group overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-700 hover:via-blue-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 active:scale-95"
                  >
                    {/* Button background animation */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                    
                    <span className="relative flex items-center justify-center">
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Signing in...
                        </>
                      ) : (
                        <>
                          Sign In
                          <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200">
                            →
                          </div>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-6 bg-white/80 text-gray-500 font-bold rounded-full">OR</span>
                </div>
              </div>
              
              {/* Google Login Info Alert */}
              <div className="mb-6">
                <Alert
                  message="Google Sign-In"
                  description="Only authorized college users can access the system. Contact the administrator for access."
                  type="info"
                  showIcon
                  icon={<Info className="h-4 w-4" />}
                  className="rounded-xl border-blue-200/50 bg-blue-50/80 backdrop-blur-sm shadow-sm"
                />
              </div>

              {/* Google Login Button */}
              <Button 
                type="default" 
                size="large" 
                icon={<GoogleOutlined className="text-lg" />}
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-14 text-base font-bold border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 focus:border-blue-500 focus:text-blue-600 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 transform bg-white/70 backdrop-blur-sm"
              >
                Continue with Google
              </Button>

              {/* Test Credentials */}
              <div className="mt-8 pt-6 border-t-2 border-gray-100">
                <div className="bg-gradient-to-r from-gray-50/80 via-white/50 to-gray-50/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200/50 shadow-sm">
                  <p className="text-xs text-gray-600 text-center leading-relaxed">
                    <span className="font-bold text-gray-700 block mb-2">Test Credentials</span>
                    <span className="font-mono text-gray-800 bg-white/80 px-4 py-2 rounded-lg border border-gray-300/50 inline-block shadow-sm">
                      admin / admin123
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 font-medium">
              © 2025 National Engineering College. All rights reserved.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Hostel Management System v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
