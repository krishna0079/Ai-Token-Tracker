import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Eye, EyeOff, Sparkles, Loader2 } from "lucide-react";
import api from "../services/api";

// Google Client ID — replace with your own from Google Cloud Console
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const Pupil = ({ size = 12, maxDistance = 5, pupilColor = "black", forceLookX, forceLookY }) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }
    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;
    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();

  return (
    <div ref={pupilRef} className="rounded-full"
      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: pupilColor,
        transform: `translate(${pos.x}px, ${pos.y}px)`, transition: 'transform 0.1s ease-out' }}
    />
  );
};

const EyeBall = ({ size = 48, pupilSize = 16, maxDistance = 10, eyeColor = "white", pupilColor = "black", isBlinking = false, forceLookX, forceLookY }) => {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };
    const eye = eyeRef.current.getBoundingClientRect();
    const deltaX = mouseX - (eye.left + eye.width / 2);
    const deltaY = mouseY - (eye.top + eye.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pos = calculatePupilPosition();

  return (
    <div ref={eyeRef} className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{ width: `${size}px`, height: isBlinking ? '2px' : `${size}px`, backgroundColor: eyeColor, overflow: 'hidden' }}>
      {!isBlinking && (
        <div className="rounded-full"
          style={{ width: `${pupilSize}px`, height: `${pupilSize}px`, backgroundColor: pupilColor,
            transform: `translate(${pos.x}px, ${pos.y}px)`, transition: 'transform 0.1s ease-out' }}
        />
      )}
    </div>
  );
};

// Google SVG icon
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef(null);
  const blackRef = useRef(null);
  const yellowRef = useRef(null);
  const orangeRef = useRef(null);
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/google', { credential: response.credential });
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Google sign-in failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGoogleFallback = async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In requires a Client ID. Add VITE_GOOGLE_CLIENT_ID to your .env file.');
      return;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => { setMouseX(e.clientX); setMouseY(e.clientY); };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Blinking
  useEffect(() => {
    const blink = (setter) => {
      const schedule = () => {
        const t = setTimeout(() => {
          setter(true);
          setTimeout(() => { setter(false); schedule(); }, 150);
        }, Math.random() * 4000 + 3000);
        return t;
      };
      return schedule();
    };
    const t1 = blink(setIsPurpleBlinking);
    const t2 = blink(setIsBlackBlinking);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const t = setTimeout(() => setIsLookingAtEachOther(false), 800);
      return () => clearTimeout(t);
    } else { setIsLookingAtEachOther(false); }
  }, [isTyping]);

  useEffect(() => {
    if (password.length > 0 && showPassword) {
      const t = setTimeout(() => {
        setIsPurplePeeking(true);
        setTimeout(() => setIsPurplePeeking(false), 800);
      }, Math.random() * 3000 + 2000);
      return () => clearTimeout(t);
    } else { setIsPurplePeeking(false); }
  }, [password, showPassword]);

  // Google Sign-In initialization
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    
    let script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'filled_black',
          size: 'large',
          width: '100%',
          text: isSignUp ? 'signup_with' : 'signin_with',
          shape: 'rectangular',
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      script = null;
    };
  }, [isSignUp, handleGoogleResponse]);

  const calculatePosition = (ref) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };
    const rect = ref.current.getBoundingClientRect();
    const deltaX = mouseX - (rect.left + rect.width / 2);
    const deltaY = mouseY - (rect.top + rect.height / 3);
    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const endpoint = isSignUp ? '/auth/signup' : '/auth/login';
      const { data } = await api.post(endpoint, { email, password });
      localStorage.setItem('token', data.token);
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Enter your email address first, then click forgot password.");
      return;
    }
    setForgotMsg(`Password reset link sent to ${email}. Check your inbox.`);
    setError("");
    setTimeout(() => setForgotMsg(""), 5000);
  };

  return (
    <div className="h-[100dvh] overflow-hidden grid lg:grid-cols-2">
      {/* Left — Animated Characters */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-violet-600/90 via-violet-600 to-violet-600/80 p-8 xl:p-12 text-white">
        <div className="relative z-20">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="size-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <span>TokenMonitor</span>
          </div>
        </div>

        <div className="relative z-20 flex items-end justify-center h-[400px] xl:h-[500px]">
          <div className="relative w-[450px] xl:w-[550px]" style={{ height: '350px', maxWidth: '100%' }}>
            {/* Purple */}
            <div ref={purpleRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{ left: '70px', width: '180px',
                height: (isTyping || (password.length > 0 && !showPassword)) ? '440px' : '400px',
                backgroundColor: '#6C3FF5', borderRadius: '10px 10px 0 0', zIndex: 1,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)`
                  : (isTyping || (password.length > 0 && !showPassword)) ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)`
                  : `skewX(${purplePos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-8 transition-all duration-700 ease-in-out"
                style={{ left: (password.length > 0 && showPassword) ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px` }}>
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
                <EyeBall size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isPurpleBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined} />
              </div>
            </div>
            {/* Black */}
            <div ref={blackRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{ left: '240px', width: '120px', height: '310px', backgroundColor: '#2D2D2D', borderRadius: '8px 8px 0 0', zIndex: 2,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)`
                  : isLookingAtEachOther ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                  : (isTyping || (password.length > 0 && !showPassword)) ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)`
                  : `skewX(${blackPos.bodySkew || 0}deg)`,
                transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-6 transition-all duration-700 ease-in-out"
                style={{ left: (password.length > 0 && showPassword) ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
                  top: (password.length > 0 && showPassword) ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px` }}>
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
                <EyeBall size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
                  forceLookX={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? 0 : undefined}
                  forceLookY={(password.length > 0 && showPassword) ? -4 : isLookingAtEachOther ? -4 : undefined} />
              </div>
            </div>
            {/* Orange */}
            <div ref={orangeRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{ left: '0px', width: '240px', height: '200px', zIndex: 3, backgroundColor: '#FF9B6B', borderRadius: '120px 120px 0 0',
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-8 transition-all duration-200 ease-out"
                style={{ left: (password.length > 0 && showPassword) ? '50px' : `${82 + (orangePos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? '85px' : `${90 + (orangePos.faceY || 0)}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
            </div>
            {/* Yellow */}
            <div ref={yellowRef} className="absolute bottom-0 transition-all duration-700 ease-in-out"
              style={{ left: '310px', width: '140px', height: '230px', backgroundColor: '#E8D754', borderRadius: '70px 70px 0 0', zIndex: 4,
                transform: (password.length > 0 && showPassword) ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`, transformOrigin: 'bottom center' }}>
              <div className="absolute flex gap-6 transition-all duration-200 ease-out"
                style={{ left: (password.length > 0 && showPassword) ? '20px' : `${52 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? '35px' : `${40 + (yellowPos.faceY || 0)}px` }}>
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
                <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={(password.length > 0 && showPassword) ? -5 : undefined} forceLookY={(password.length > 0 && showPassword) ? -4 : undefined} />
              </div>
              <div className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
                style={{ left: (password.length > 0 && showPassword) ? '10px' : `${40 + (yellowPos.faceX || 0)}px`,
                  top: (password.length > 0 && showPassword) ? '88px' : `${88 + (yellowPos.faceY || 0)}px` }} />
            </div>
          </div>
        </div>

        <div className="relative z-20 flex items-center gap-8 text-sm text-white/60">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>

        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
        <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 size-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      {/* Right — Login/Signup Form */}
      <div className="flex items-center justify-center p-4 sm:p-8 bg-black text-white overflow-y-auto">
        <div className="w-full max-w-[420px]">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12">
            <div className="size-8 rounded-lg bg-violet-600/10 flex items-center justify-center">
              <Sparkles className="size-4 text-violet-500" />
            </div>
            <span>TokenMonitor</span>
          </div>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {forgotMode ? "Reset password" : isSignUp ? "Create account" : "Welcome back!"}
            </h1>
            <p className="text-neutral-400 text-sm">
              {forgotMode ? "Enter your email to receive a reset link" : isSignUp ? "Sign up to start tracking your AI usage" : "Please enter your details"}
            </p>
          </div>

          {/* Success message */}
          {forgotMsg && (
            <div className="mb-4 p-3 text-sm text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 rounded-lg">
              {forgotMsg}
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 text-sm text-red-400 bg-red-950/20 border border-red-900/30 rounded-lg">
              {error}
            </div>
          )}

          {forgotMode ? (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
                <Input id="forgot-email" type="email" placeholder="you@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="h-12 bg-neutral-900 border-neutral-800 focus:border-violet-500 text-white" />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-medium bg-violet-600 hover:bg-violet-500 text-white" size="lg">
                Send reset link
              </Button>
              <div className="text-center">
                <button type="button" onClick={() => { setForgotMode(false); setError(""); setForgotMsg(""); }}
                  className="text-sm text-violet-400 hover:underline font-medium">
                  Back to login
                </button>
              </div>
            </form>
          ) : (
            /* Login / Sign Up Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input id="email" type="email" placeholder="anna@gmail.com" value={email} autoComplete="off"
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsTyping(true)} onBlur={() => setIsTyping(false)}
                  required className="h-12 bg-neutral-900 border-neutral-800 focus:border-violet-500 text-white" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    className="h-12 pr-10 bg-neutral-900 border-neutral-800 focus:border-violet-500 text-white" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" className="border-neutral-700 bg-neutral-900" />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer text-neutral-300">
                      Remember for 30 days
                    </Label>
                  </div>
                  <button type="button" onClick={() => { setForgotMode(true); setError(""); }}
                    className="text-sm text-violet-400 hover:underline font-medium">
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" className="w-full h-12 text-base font-medium bg-violet-600 hover:bg-violet-500 text-white" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isSignUp ? "Sign Up" : "Log In"}
              </Button>

              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-neutral-800" /></div>
                <div className="relative flex justify-center text-xs"><span className="px-2 bg-black text-neutral-500">or</span></div>
              </div>

              {/* Google Sign-In */}
              {GOOGLE_CLIENT_ID ? (
                <div ref={googleBtnRef} className="w-full" />
              ) : (
                <Button type="button" variant="outline" onClick={handleGoogleFallback}
                  className="w-full h-12 bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white">
                  <GoogleIcon />
                  {isSignUp ? "Sign up with Google" : "Log in with Google"}
                </Button>
              )}
            </form>
          )}

          {/* Toggle Sign Up / Log In */}
          {!forgotMode && (
            <div className="text-center text-sm text-neutral-400 mt-8">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-white font-medium hover:underline">
                {isSignUp ? "Log In" : "Sign Up"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
