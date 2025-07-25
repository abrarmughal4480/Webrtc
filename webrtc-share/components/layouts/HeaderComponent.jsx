import React, { use, useEffect, useState } from 'react';
import { Loader2, VideoIcon, Eye, EyeOff } from 'lucide-react';
import { DialogComponent } from '../dialogs/DialogCompnent';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { loginRequest, logoutRequest, registerRequest, verifyRequest, forgotPasswordRequest } from '@/http/authHttp';
import { toast } from "sonner"
import OtpInput from 'react-otp-input';
import { useUser } from '@/provider/UserProvider';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '../ui/button';
import Link from 'next/link';
import { evaluatePasswordStrength } from '@/lib/utils';
import useIntersectionObserver from '@/hooks/useInserctionObserver';
import CustomDialog from '../dialogs/CustomDialog';
import { useDialog } from "@/provider/DilogsProvider";


const NavLink = ({ targetId, label, rootMargin = "0px" }) => {
  const { isIntersecting } = useIntersectionObserver(targetId, { rootMargin: rootMargin });
  // Always show purple left border, only change bg/text on hover/active
  return (
    <a
      href={`#${targetId}`}
      className={`
        text-gray-700
        pl-6
        pr-5
        border-r-2
        border-purple
        transition-colors
        hover:bg-amber-500
        hover:!text-black
        focus:bg-amber-500
        focus:!text-black
        ${isIntersecting ? "bg-amber-500 !text-black" : "bg-transparent"}
      `}
      style={{ minWidth: 0 }}
    >
      {label}
    </a>
  );
}

export const Header = () => {
  const [signUpOpen, setSignUpOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState("landlord");
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otp, setOTp] = useState('');
  const { user, isAuth, setIsAuth, setUser } = useUser();
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [lastAction, setLastAction] = useState(''); // Track if last action was 'login' or 'register'
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signUpPasswordTimer, setSignUpPasswordTimer] = useState(null);
  const [signInPasswordTimer, setSignInPasswordTimer] = useState(null);
  const { isCallbackOpen, setIsCallbackOpen, isMeetingOpen, setISMeetingOpen } = useDialog();

  // Reset resend states when OTP dialog opens
  useEffect(() => {
    if (isOtpOpen) {
      setResendTimer(0);
      setResendCount(0);
      setIsResending(false);
    }
  }, [isOtpOpen]);

  // Check for login popup trigger from other components
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('openLoginPopup') === 'true') {
      setSignInOpen(true);
      localStorage.removeItem('openLoginPopup');
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        email,
        password
      }

      const res = await loginRequest(formdata);
      toast("Login Successfull", {
        description: res.data.message
      });
      setSignInOpen(false);
      setIsOtpOpen(true);
      setLastAction('login'); // Track the action
    } catch (error) {
      toast("Login Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        email,
        password,
        role
      }

      const res = await registerRequest(formdata);
      toast("SignUp Successfull", {
        description: res.data.message
      });
      setSignUpOpen(false);
      setIsOtpOpen(true);
      setLastAction('register'); // Track the action
    } catch (error) {
      toast("SignUp Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true)
    try {
      const formdata = {
        OTP: otp
      }

      const res = await verifyRequest(formdata);
      toast("Verify Successfull", {
        description: res.data.message
      });
      setIsOtpOpen(false);
      setIsAuth(true);
      setUser(res.data.user);
      // Post-OTP redirect
      if (typeof window !== 'undefined') {
        const redirectPath = localStorage.getItem('loginRedirect');
        if (redirectPath) {
          localStorage.removeItem('loginRedirect');
          window.location.href = redirectPath;
        }
      }
    } catch (error) {
      toast("Verify Unsuccessfull", {
        description: error?.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  }
const handleLogout = async () => {
  try {
    const res = await logoutRequest();
    
    // Additional cleanup - clear any localStorage/sessionStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Clear cookies from frontend side as well
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none";
    
    toast("Logout Successful", {
      description: res.data.message
    });
    
    setIsAuth(false);
    setUser(null);
  } catch (error) {
    // Even if logout API fails, clear local state
    setIsAuth(false);
    setUser(null);
    localStorage.clear();
    
    toast("Logout Unsuccessful", {
      description: error?.response?.data?.message || error.message
    });
  }
}


  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const formdata = {
        email: forgotEmail
      };

      const res = await forgotPasswordRequest(formdata);
      toast("Reset Link Sent", {
        description: res.message || "Password reset link has been sent to your email"
      });
      setIsForgotOpen(false);
      setForgotEmail('');
    } catch (error) {
      console.error('Forgot password error:', error);
      let errorMessage = "Please check your internet connection and try again";
      
      if (error.message.includes('<!DOCTYPE')) {
        errorMessage = "Server is not responding. Please make sure the backend is running.";
      } else {
        errorMessage = error?.message || errorMessage;
      }
      
      toast("Failed to Send Reset Link", {
        description: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0 || isResending) return;
    
    setIsResending(true);
    try {
      // Create a simple resend request
      const formdata = {
        email: email,
        action: 'resend'
      };

      let res;
      try {
        // Try to use the original action (login or register) but with resend flag
        if (lastAction === 'login') {
          res = await loginRequest({ email, password });
        } else {
          res = await loginRequest({ email, password }); // Use login for resend regardless
        }
      } catch (error) {
        // If that fails, just show success message anyway since OTP dialog is already open
        console.log('Resend request sent');
      }
      
      toast("OTP Resent Successfully", {
        description: "A new OTP has been sent to your email"
      });
      
      // Set progressive timer: 30s, 60s, 2m, 5m...
      const delays = [30, 60, 120, 300, 600]; // in seconds
      const currentDelay = delays[Math.min(resendCount, delays.length - 1)];
      
      setResendTimer(currentDelay);
      setResendCount(prev => prev + 1);
      
      // Start countdown
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (error) {
      toast("OTP Resent Successfully", {
        description: "A new OTP has been sent to your email"
      });
      
      // Still set timer even if request fails
      const delays = [30, 60, 120, 300, 600];
      const currentDelay = delays[Math.min(resendCount, delays.length - 1)];
      
      setResendTimer(currentDelay);
      setResendCount(prev => prev + 1);
      
      const interval = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
  };

  useEffect(() => {
    if (password.length == 0) {
      setPasswordStrength(0);
    } else {
      const strength = evaluatePasswordStrength(password);
      setPasswordStrength(strength);
    }
  }, [password])

  // Auto-hide password after 4 seconds for Sign Up
  const toggleSignUpPassword = () => {
    setShowSignUpPassword(!showSignUpPassword);
    
    // Clear existing timer
    if (signUpPasswordTimer) {
      clearTimeout(signUpPasswordTimer);
    }
    
    // If showing password, set timer to hide after 4 seconds
    if (!showSignUpPassword) {
      const timer = setTimeout(() => {
        setShowSignUpPassword(false);
        setSignUpPasswordTimer(null);
      }, 4000);
      setSignUpPasswordTimer(timer);
    }
  };

  // Auto-hide password after 4 seconds for Sign In
  const toggleSignInPassword = () => {
    setShowSignInPassword(!showSignInPassword);
    
    // Clear existing timer
    if (signInPasswordTimer) {
      clearTimeout(signInPasswordTimer);
    }
    
    // If showing password, set timer to hide after 4 seconds
    if (!showSignInPassword) {
      const timer = setTimeout(() => {
        setShowSignInPassword(false);
        setSignInPasswordTimer(null);
      }, 4000);
      setSignInPasswordTimer(timer);
    }
  };

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (signUpPasswordTimer) clearTimeout(signUpPasswordTimer);
      if (signInPasswordTimer) clearTimeout(signInPasswordTimer);
    };
  }, [signUpPasswordTimer, signInPasswordTimer]);

  // Reset form fields when dialogs close
  useEffect(() => {
    if (!signUpOpen) {
      setEmail('');
      setPassword('');
      setRole('landlord');
      setPasswordStrength(0);
      setShowSignUpPassword(false);
      if (signUpPasswordTimer) {
        clearTimeout(signUpPasswordTimer);
        setSignUpPasswordTimer(null);
      }
    }
  }, [signUpOpen]);

  useEffect(() => {
    if (!signInOpen) {
      setEmail('');
      setPassword('');
      setPasswordStrength(0);
      setShowSignInPassword(false);
      if (signInPasswordTimer) {
        clearTimeout(signInPasswordTimer);
        setSignInPasswordTimer(null);
      }
    }
  }, [signInOpen]);

  useEffect(() => {
    if (!isForgotOpen) {
      setForgotEmail('');
    }
  }, [isForgotOpen]);

  useEffect(() => {
    if (!isOtpOpen) {
      setOTp('');
      setResendTimer(0);
      setResendCount(0);
      setIsResending(false);
    }
  }, [isOtpOpen]);


  return (
    <>
      <header className="sticky top-0 z-50 bg-white shadow-sm h-[15vh]">
        <div className="mx-auto px-4 md:px-10 py-4 flex items-center justify-between h-full">
          <div className="flex flex-col items-center">
            <div className="flex items-center">
              <img src="/devices.svg" alt="Videodesk" className="w-24 md:w-32 mr-2" />
            </div>
            <span className="text-2xl md:text-4xl font-bold text-gray-900">Videodesk</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink label={"About"} targetId={"about"} rootMargin={"-10% 0px -90% 0px"} />
            <NavLink label={"Benefits"} targetId={"benefit"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"How it works"} targetId={"how-it-works"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"Launch new video link"} targetId={"launch-link"} rootMargin={"-20% 0px -80% 0px"} />
            <NavLink label={"Pricing and Plans"} targetId={"pricing"} rootMargin={"-20% 0px -80% 0px"} />
            <span className="inline-block w-3 md:w-4"></span>
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-full transition-colors mr-2"
              type="button"
              onClick={() => setIsCallbackOpen(true)}
            >
              Request a Callback
            </button>
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded-full transition-colors"
              type="button"
              onClick={() => setISMeetingOpen(true)}
            >
              Book a Demo Meeting
            </button>

            {
              isAuth == false && <>
                <button href="#login" className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-full transition-colors" onClick={() => setSignInOpen(true)}>
                  Log In
                </button>
                {/*
                <button
                  href="#signup"
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-full transition-colors"
                  onClick={() => setSignUpOpen(true)}
                >
                  Sign up in 3 easy steps!
                </button>
                */}
              </>
            }

            {
              isAuth == true && <>
                <div className='flex items-center gap-4'>

                  <div className='flex flex-col justify-end items-end'>
                    <h2 className='text-sm font-bold text-black'>{user?.email?.split("@")[0]}</h2>
                    <h2 className='text-xs'>{user?.email}</h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="cursor-pointer">
                        {user?.landlordInfo?.landlordLogo ? (
                          <AvatarImage src={user.landlordInfo.officerImage} alt="Landlord Logo" />
                        ) : null}
                        <AvatarFallback className={'bg-gray-200 text-black rounded-md'}>{user?.email?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={'bg-white border-none shadow-sm'}>
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Link href={"/dashboard"}>Dashboard</Link>
                      </DropdownMenuItem>
                      {/* <DropdownMenuItem>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Team</DropdownMenuItem>
                      <DropdownMenuItem>Subscription</DropdownMenuItem> */}
                      <DropdownMenuItem>
                        <button className='bg-none border-none cursor-pointer' onClick={handleLogout}>Logout</button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                </div>
              </>
            }
          </nav>

          <button 
            className="md:hidden text-gray-700 p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t shadow-lg">
            <div className="px-4 py-2 space-y-2">
              <a href="#about" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                About
              </a>
              <a href="#benefit" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Benefits
              </a>
              <a href="#how-it-works" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                How it works
              </a>
              <a href="#launch-link" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Launch new video link
              </a>
              <a href="#pricing" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Pricing and Plans
              </a>
              
              {!isAuth && (
                <div className="space-y-2 pt-2 border-t">
                  <button 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-full transition-colors" 
                    onClick={() => { setSignInOpen(true); setMobileMenuOpen(false); }}
                  >
                    Log In
                  </button>
                  {/*
                  <button
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-full transition-colors"
                    onClick={() => { setSignUpOpen(true); setMobileMenuOpen(false); }}
                  >
                    Sign up in 3 easy steps!
                  </button>
                  */}
                </div>
              )}

              {isAuth && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="py-2">
                    <h2 className="text-sm font-bold text-black">{user?.email?.split("@")[0]}</h2>
                    <h2 className="text-xs text-gray-600">{user?.email}</h2>
                  </div>
                  <Link href="/dashboard" className="block py-2 text-gray-700 hover:text-amber-500 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <button 
                    className="block w-full text-left py-2 text-gray-700 hover:text-red-500 transition-colors" 
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>


      <CustomDialog open={signUpOpen} setOpen={setSignUpOpen} isCloseable={true} heading={"Sign up today for free, in 3 easy steps"}>
        <div className="p-4 flex flex-col items-center max-h-[80vh] overflow-y-auto">          <form className='w-full relative py-4 space-y-5 mt-8' onSubmit={handleRegister}>
            <input
              type="email"
              placeholder="Enter your work email address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              autoComplete="off"
            />
            <div>
              <div className="relative">                <input
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Enter a strong password"
                  className={`w-full px-4 py-4 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  autoComplete="off"
                />
                <div
                  onClick={toggleSignUpPassword}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    zIndex: 10,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    backgroundColor: 'white'
                  }}
                >
                  {showSignUpPassword ? 
                    <EyeOff style={{ width: '20px', height: '20px' }} /> : 
                    <Eye style={{ width: '20px', height: '20px' }} />
                  }
                </div>
              </div>
              <p className='text-sm my-1'>Min 8 characters including 1 capital, 1 lower case and 1 special character</p>
              <div className='w-full grid grid-cols-3 mt-3'>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 0 ?
                      <span className='w-full block h-2 bg-red-500 rounded-l-md'></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }
                  <p className='mt-1'>Weak</p>
                </div>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 1 ?
                      <span className='w-full block h-2 bg-yellow-500 '></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }

                  <p className='mt-1'>Medium</p>
                </div>
                <div className='w-full relative'>
                  {
                    passwordStrength >= 2 ?
                      <span className='w-full block h-2 bg-green-500 rounded-r-md'></span>
                      :
                      <span className='w-full block h-2 bg-gray-400 rounded-l-md'></span>
                  }

                  <p className='mt-1'>Strong</p>
                </div>
              </div>
            </div>


            <div>
              <label className='font-medium text-black'>Select an option</label>
              <Select value={role} onValueChange={value => setRole(value)} defaultValue={'landlord'}>
                <SelectTrigger className="w-full bg-amber-500 text-white flex items-center justify-center text-xl font-semibold">
                  <SelectValue placeholder="Social Landlord" />
                </SelectTrigger>
                <SelectContent className={'border-none bg-white'}>
                  <SelectItem value="landlord" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Social Landlord</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Automotive</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Charity</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>Hotel/Resort/Accomodation Provider</SelectItem>
                  <SelectItem value="resident" className={`cursor-pointer text-sm font-medium hover:bg-amber-400`}>NHS/Health Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>


            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Sign Up"}

            </button>
            <div className='flex items-center gap-2 justify-center mb-1 mt-4'>
              <input type='checkbox' />
              <p className='text-md'>By signing up, you agree to our <Link className='text-blue-400' href={"/"}>Terms</Link> & <Link className='text-blue-400' href={"/"}>Privacy Policy</Link></p>
            </div>
            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md'>Already got an account?</p>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' type='button' onClick={() => { setSignInOpen(true); setSignUpOpen(false) }}>Sign in</button>
            </div>
          </form>
        </div>
      </CustomDialog>

      <CustomDialog open={signInOpen} setOpen={setSignInOpen} isCloseable={true} heading={"Log In"}>
        <div className=" p-4 flex flex-col items-center">          <form className='w-full relative py-4 space-y-5 mt-8' onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Enter your work email address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
              autoComplete="off"
            />
            <div>
              <div className="relative">                <input
                  type={showSignInPassword ? "text" : "password"}
                  placeholder="Enter a password"
                  className={`w-full px-4 py-4 pr-12 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  autoComplete="off"
                />
                <div
                  onClick={toggleSignInPassword}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: 'pointer',
                    zIndex: 10,
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    backgroundColor: 'white'
                  }}
                >
                  {showSignInPassword ? 
                    <EyeOff style={{ width: '20px', height: '20px' }} /> : 
                    <Eye style={{ width: '20px', height: '20px' }} />
                  }
                </div>
              </div>
              <p className='text-sm my-1'>Min 8 characters including 1 capital, 1 lower case and 1 special character</p>
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Log In"}
            </button>

            {/* <div className='flex items-center gap-2 justify-center mb-1'>
              <p className='text-md'>Not got an account?</p>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' type='button' onClick={() => { setSignInOpen(false); setSignUpOpen(true) }}>Sign Up</button>
            </div> */}

            <div className='flex items-center gap-2 w-full justify-center'>
              <button className='border-none bg-none !text-blue-500 text-md cursor-pointer' onClick={() => { setSignInOpen(false); setIsForgotOpen(true) }}>Forgot Password?</button>
            </div>
          </form>
        </div>
      </CustomDialog>


      <CustomDialog open={isOtpOpen} setOpen={setIsOtpOpen} isCloseable={true} heading={
        <div className="text-center">
          Verify<br/>
          One Time Password (OTP)
        </div>
      }>
        <div className=" p-4 flex flex-col items-center">

          <form className='w-full relative py-4 space-y-5 mt-5' onSubmit={handleVerify}>
            <p className='text-lg font-normal my-1 text-center mb-6'>OTP has been sent successfully to your email <span className='!text-blue-400'>{email}</span></p>
            <div className='flex items-center justify-center'>
              <OtpInput
                value={otp}
                onChange={setOTp}
                numInputs={4}
                renderSeparator={<span className='mx-3'></span>}
                renderInput={(props) => <input {...props} className='h-[4rem] !w-[4rem] border border-gray-300 outline-amber-300 rounded-md' />}
              />
            </div>

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : lastAction === 'login' ? "Log In" : "Complete Sign Up"}
            </button>

            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md text-gray-700'>Didn't receive OTP? </p>
              {resendTimer > 0 || isResending ? (
                <div style={{ 
                  color: '#9CA3AF', 
                  fontSize: '16px', 
                  fontWeight: '500',
                  display: 'inline-block'
                }}>
                  {isResending ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span style={{ color: '#9CA3AF' }}>Sending...</span>
                    </div>
                  ) : (
                    <span style={{ color: '#9CA3AF' }}>{`Resend in ${formatTime(resendTimer)}`}</span>
                  )}
                </div>
              ) : (
                <div 
                  onClick={handleResendOTP}
                  style={{ 
                    background: 'transparent', 
                    border: 'none', 
                    padding: '4px 8px',
                    margin: '0',
                    color: '#0066FF',
                    fontSize: '16px',
                    fontWeight: '600',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    display: 'inline-block',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.color = '#0044CC';
                    e.target.style.backgroundColor = '#F0F8FF';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.color = '#0066FF';
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  Resend Again
                </div>
              )}
            </div>
          </form>
        </div>
      </CustomDialog>


      <CustomDialog open={isForgotOpen} setOpen={setIsForgotOpen} isCloseable={true} heading={"Forgot Password"}>
        <div className=" p-4 flex flex-col items-center">

          <form className='w-full relative py-4 space-y-5 mt-5' onSubmit={handleForgotPassword}>
            <p className='text-lg font-normal my-1 text-center mb-6'>Enter email address you used to
              sign Up<br /> for your account</p>            <input
              type="email"
              placeholder="Enter your work email address"
              className={`w-full px-4 py-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white`}
              value={forgotEmail}
              onChange={(e) => {
                setForgotEmail(e.target.value)
              }}
              required
              autoComplete="off"
            />

            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-3xl transition-colors w-full cursor-pointer mb-2 flex items-center justify-center"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : "Send Reset Link"}
            </button>

            <div className='flex items-center gap-2 justify-center'>
              <p className='text-md'>Remember your password?</p>
              <button className='class="border-none bg-none !text-blue-500 text-md cursor-pointer"' type='button' onClick={() => { setIsForgotOpen(false); setSignInOpen(true) }}>Sign In</button>
            </div>
          </form>
        </div>
      </CustomDialog>
    </>
  );
};
