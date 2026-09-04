import React from 'react';
import FloatingButton from './FloatingButton';
import ChatWindow from './ChatWindow';
import { useAuth } from '../../context/AuthContext';

export const ChatWidget = () => {
  const { user } = useAuth();

  // HostelMate is available only after authentication.
  if (!user) return null;

  return (
    <>
      <FloatingButton />
      <ChatWindow />
    </>
  );
};

export default ChatWidget;
