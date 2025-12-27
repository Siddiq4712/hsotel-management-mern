import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children, currentView, setCurrentView }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header on top of everything */}
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex">
        {/* Sidebar with toggle */}
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />

        {/* Toggle button for sidebar - visible on smaller screens */}
        <button 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed bottom-6 right-6 lg:hidden z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Toggle Menu"
        >
          <Menu size={24} />
        </button>

        {/* Main content with padding - note the added blur effect when sidebar is open */}
        <main 
          className={`flex-1 p-6 lg:ml-64 pt-16 transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-64 filter blur-sm lg:blur-none' : ''
          }`}
        >
          <div 
            className={`transition-opacity duration-300 ${sidebarOpen ? 'lg:opacity-100 opacity-30' : 'opacity-100'}`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
