import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Fingerprint, KeyRound, Eye, EyeOff } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export default function Login({ setAuthenticated }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const enabled = localStorage.getItem('biometrics_enabled') === 'true';
    setIsBiometricsEnabled(enabled);
  }, []);

  const generateRandomBuffer = () => {
    const buffer = new Uint8Array(32);
    window.crypto.getRandomValues(buffer);
    return buffer;
  };

  const loginWithFirebase = async () => {
    const backendEmail = 'febebo.in@gmail.com';
    const backendPass = 'Febebo.in@2026';
    
    try {
      await signInWithEmailAndPassword(auth, backendEmail, backendPass);
    } catch (signInErr) {
      await createUserWithEmailAndPassword(auth, backendEmail, backendPass);
    }
    
    localStorage.setItem('superadmin_auth', 'true');
    setAuthenticated(true);
    navigate('/');
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (password === 'FebeboPawan@2026') {
      // If biometrics isn't enabled yet, offer to set it up
      if (!isBiometricsEnabled) {
        setIsRegistering(true);
        try {
          if (Capacitor.isNativePlatform()) {
            const result = await NativeBiometric.isAvailable();
            if (result.isAvailable) {
              await NativeBiometric.setCredentials({
                username: "superadmin",
                password: "secure_password",
                server: "febebo"
              });
              localStorage.setItem('biometrics_enabled', 'true');
              setIsBiometricsEnabled(true);
            } else {
              console.warn("Biometrics not available on device");
            }
          } else {
            // WebAuthn fallback for Live Server/Web
            const publicKey = {
              challenge: generateRandomBuffer(),
              rp: { name: "Febebo Superadmin", id: window.location.hostname },
              user: {
                id: generateRandomBuffer(),
                name: "superadmin",
                displayName: "Pawan (Super Admin)",
              },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
              authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
              timeout: 60000,
              attestation: "none"
            };
            const cred = await navigator.credentials.create({ publicKey });
            if (cred) {
              localStorage.setItem('biometrics_enabled', 'true');
              setIsBiometricsEnabled(true);
            }
          }
        } catch (err) {
          console.warn("User cancelled or failed biometric registration", err);
          alert("Fingerprint setup is not fully supported or was cancelled. It will be skipped for now.");
        }
        setIsRegistering(false);
      }
      
      await loginWithFirebase();
    } else {
      setError('Invalid password. Access denied.');
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.verifyIdentity({
          reason: "For easy log in",
          title: "Febebo Login"
        });
        await loginWithFirebase();
      } else {
        // WebAuthn fallback for Live Server/Web
        const publicKey = {
          challenge: generateRandomBuffer(),
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000
        };
        const assertion = await navigator.credentials.get({ publicKey });
        if (assertion) {
          await loginWithFirebase();
        }
      }
    } catch (err) {
      console.error(err);
      setError('Fingerprint verification failed or was cancelled.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900">
      {/* Premium animated background elements for login */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="glass-card p-10 rounded-3xl shadow-2xl w-full max-w-md z-10 animate-slide-up border border-white/20 relative overflow-hidden">
        {/* Shimmer effect line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>

        <div className="flex flex-col items-center justify-center mb-10">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-500/30 mb-5 relative group">
            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Shield className="w-10 h-10 text-white relative z-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight text-center">
            Febebo HQ
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium tracking-wide uppercase">Authorized Access Only</p>
        </div>
        
        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm text-center font-medium animate-fade-in shadow-sm">
            {error}
          </div>
        )}
        
        {isRegistering ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-8 animate-fade-in">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full animate-pulse">
              <Fingerprint className="w-12 h-12" />
            </div>
            <p className="text-gray-900 font-bold text-center">Registering Fingerprint...</p>
            <p className="text-gray-500 text-sm text-center">Please follow your device prompt to secure the app.</p>
          </div>
        ) : (
          <>
            {isBiometricsEnabled ? (
              <div className="space-y-6 animate-fade-in">
                <button
                  onClick={handleBiometricLogin}
                  className="w-full flex flex-col items-center justify-center gap-3 bg-gradient-to-tr from-blue-50 to-indigo-50 border-2 border-blue-100 hover:border-blue-300 rounded-2xl p-6 transition-all duration-300 group cursor-pointer"
                >
                  <div className="p-4 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300 text-blue-600">
                    <Fingerprint className="w-10 h-10" />
                  </div>
                  <div className="text-center">
                    <span className="block font-extrabold text-gray-900 text-lg">Login with Fingerprint</span>
                    <span className="block text-sm font-medium text-gray-500 mt-1">Tap to quickly unlock</span>
                  </div>
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-wider">or use password</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>
              </div>
            ) : null}

            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-gray-700 ml-1">Admin Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-11 pr-12 py-3.5 bg-white/50 backdrop-blur-sm border border-gray-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all duration-300 shadow-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/30 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  {isBiometricsEnabled ? 'Sign In' : 'Authenticate & Secure Device'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
