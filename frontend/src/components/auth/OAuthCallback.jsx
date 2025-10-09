import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spin, message } from 'antd';

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const userData = urlParams.get('user');
      const error = urlParams.get('error');
      const errorMessage = urlParams.get('message');

      if (error) {
        let displayMessage = 'Authentication failed';
        
        switch (error) {
          case 'access_denied':
            displayMessage = 'Access denied. Please try again.';
            break;
          case 'not_registered':
            displayMessage = errorMessage ? decodeURIComponent(errorMessage) : 'Your account is not registered in the system. Please contact your administrator.';
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
          default:
            displayMessage = 'An error occurred during authentication.';
        }
        
        message.error(displayMessage, 5); // Show for 5 seconds
        navigate('/login');
        return;
      }

      if (token && userData) {
        try {
          const user = JSON.parse(decodeURIComponent(userData));
          
          // Store token and user data
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          message.success(`Welcome back, ${user.first_name || user.username}!`);
          
          // Redirect based on user role
          switch (user.role) {
            case 'admin':
              navigate('/admin');
              break;
            case 'warden':
              navigate('/warden');
              break;
            case 'mess':
              navigate('/mess');
              break;
            case 'student':
              navigate('/student');
              break;
            default:
              message.error('Invalid user role');
              navigate('/login');
          }
        } catch (err) {
          console.error('Error parsing user data:', err);
          message.error('Error processing authentication data');
          navigate('/login');
        }
      } else {
        message.error('Authentication data not received');
        navigate('/login');
      }
    };

    handleOAuthCallback();
  }, [location, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <Spin size="large" />
      <span style={{ marginTop: 16, fontSize: '16px' }}>
        Verifying your account...
      </span>
    </div>
  );
};

export default OAuthCallback;
