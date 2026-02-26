import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spin, message, Avatar } from 'antd';
import { UserOutlined, GoogleOutlined } from '@ant-design/icons';

const normalizeRole = (role) => {
  if (role === null || role === undefined) return null;

  const normalized = String(role).trim().toLowerCase();
  const roleMap = {
    admin: 'admin',
    administrator: 'admin',
    1: 'admin',
    warden: 'warden',
    3: 'warden',
    student: 'student',
    2: 'student',
    lapc: 'lapc',
    mess: 'mess',
    messstaff: 'mess',
    'mess staff': 'mess',
    4: 'mess'
  };

  return roleMap[normalized] || normalized;
};

const OAuthCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const handleOAuthCallback = () => {
      const urlParams = new URLSearchParams(location.search);
      const token = urlParams.get('token');
      const userDataParam = urlParams.get('user');
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
        
        setErrorMsg(displayMessage);
        message.error(displayMessage, 5);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }

      if (token && userDataParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userDataParam));
          const normalizedUser = { ...user, role: normalizeRole(user.role) };
          
          // Set the user data in state to display profile info while processing
          setUserData(normalizedUser);
          
          // Retrieve Google profile picture from localStorage if available
          // This would need to be set during Google login
          const googleProfilePic = localStorage.getItem('googleProfilePic');
          
          // Store token and user data
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify({
            ...normalizedUser,
            profile_picture: normalizedUser.profile_picture || googleProfilePic || null
          }));
          
          message.success(`Welcome back, ${normalizedUser.first_name || normalizedUser.username}!`);
          
          // Add slight delay for better UX
          setTimeout(() => {
            // Redirect based on user role
            switch (normalizedUser.role) {
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
          }, 1000);
        } catch (err) {
          console.error('Error parsing user data:', err);
          setErrorMsg('Error processing authentication data');
          message.error('Error processing authentication data');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        setErrorMsg('Authentication data not received');
        message.error('Authentication data not received');
        setTimeout(() => navigate('/login'), 2000);
      }
      
      setLoading(false);
    };

    handleOAuthCallback();
  }, [location, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#f5f5f5' 
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '90%'
      }}>
        {loading ? (
          <>
            <div style={{ marginBottom: '20px' }}>
              {userData ? (
                <Avatar 
                  size={80} 
                  src={userData.profile_picture} 
                  icon={<UserOutlined />}
                  style={{ border: '2px solid #1890ff' }}
                />
              ) : (
                <Avatar 
                  size={80} 
                  icon={<GoogleOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
              )}
            </div>
            <h2 style={{ marginBottom: '20px', fontWeight: 500 }}>
              {userData ? `Welcome, ${userData.first_name || userData.username}!` : 'Verifying your account...'}
            </h2>
            <Spin size="large" />
            <p style={{ marginTop: '20px', color: '#666' }}>
              {errorMsg || 'Signing you in securely...'}
            </p>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              {errorMsg ? (
                <Avatar 
                  size={80} 
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#ff4d4f' }}
                />
              ) : (
                <Avatar 
                  size={80} 
                  src={userData?.profile_picture} 
                  icon={<UserOutlined />}
                  style={{ border: '2px solid #52c41a' }}
                />
              )}
            </div>
            <h2 style={{ marginBottom: '20px', fontWeight: 500 }}>
              {errorMsg ? 'Authentication Failed' : `Welcome, ${userData?.first_name || userData?.username}!`}
            </h2>
            <p style={{ color: errorMsg ? '#ff4d4f' : '#52c41a' }}>
              {errorMsg || 'Authentication successful! Redirecting...'}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
