import React from 'react';
import FloatingButton from './FloatingButton';
import ChatWindow from './ChatWindow';
import { useAuth } from '../../context/AuthContext';

export const ChatWidget = () => {
  const { user } = useAuth();

  // Hostel Genie should only be active for logged-in users (Student, Warden, Mess, Admin)
  if (!user) return null;

  return (
    <>
      <FloatingButton />
      <ChatWindow />
    </>
  );
};

export default ChatWidget;
