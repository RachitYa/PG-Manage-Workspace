import React, { useEffect, useState } from 'react';

export default function SplashScreen({ children }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Always show splash for 2.5s on first render
    const fadeTimer = setTimeout(() => setFadeOut(true), 2000);
    const hideTimer = setTimeout(() => setShowSplash(false), 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {/* Always render children underneath so Firebase Auth & Router initialize immediately */}
      <div style={{ display: showSplash ? 'none' : 'block' }}>
        {children}
      </div>

      {/* Splash overlay on top */}
      {showSplash && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(160deg, #0c1a2e 0%, #0f2847 50%, #0c3461 100%)',
          opacity: fadeOut ? 0 : 1,
          transition: 'opacity 0.5s ease',
          fontFamily: "'Inter', sans-serif",
        }}>
          {/* Decorative blobs */}
          <div style={{ position: 'absolute', top: -80, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'rgba(56,189,248,0.10)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(74,153,140,0.12)', pointerEvents: 'none' }} />

          <div style={{
            width: 100, height: 100, borderRadius: 26, overflow: 'hidden',
            boxShadow: '0 0 60px rgba(56,189,248,0.35)',
            border: '2px solid rgba(56,189,248,0.3)',
            animation: 'splashPulse 2s infinite ease-in-out',
            marginBottom: 24,
          }}>
            <img src="/Admin-app-logo.png" alt="Febebo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <h1 style={{
            color: '#38bdf8',
            fontSize: 36, fontWeight: 800, margin: '0 0 6px', letterSpacing: -0.5,
          }}>Febebo</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: 0 }}>
            PG Management Platform
          </p>

          {/* Animated dots */}
          <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: i === 1 ? 20 : 6, height: 6, borderRadius: 3,
                background: i === 1 ? '#38bdf8' : 'rgba(255,255,255,0.2)',
                animation: `splashDot 1.2s ${i * 0.2}s infinite ease-in-out`,
              }} />
            ))}
          </div>

          <style>{`
            @keyframes splashPulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.06); }
              100% { transform: scale(1); }
            }
            @keyframes splashDot {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}
    </>
  );
}
