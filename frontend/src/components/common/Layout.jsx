import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children, currentView, setCurrentView }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header on top of everything */}
      <Header />

      <div className="flex">
        {/* Sidebar stays fixed under header */}
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

        {/* Main content with padding for header & sidebar */}
        <main className="flex-1 p-6 ml-64 pt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
