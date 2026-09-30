import React, { createContext, useContext, useState } from 'react';
import './LoadingContext.css';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  const [loadingCount, setLoadingCount] = useState(0);

  const startLoading = () => setLoadingCount(prev => prev + 1);
  const stopLoading = () => setLoadingCount(prev => Math.max(0, prev - 1));

  return (
    <LoadingContext.Provider value={{ startLoading, stopLoading }}>
      {loadingCount > 0 && (
        <div className="global-spinner-overlay">
          <div className="global-spinner"></div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
};
