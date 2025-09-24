// context/StockContext.js
import React, { createContext, useContext, useState } from 'react';

const StockContext = createContext();

export const StockProvider = ({ children }) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerStockRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <StockContext.Provider value={{ refreshTrigger, triggerStockRefresh }}>
      {children}
    </StockContext.Provider>
  );
};

export const useStockContext = () => useContext(StockContext);