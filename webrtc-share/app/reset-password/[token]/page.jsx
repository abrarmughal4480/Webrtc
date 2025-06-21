"use client"
import React, { useState, use } from 'react';
import { Loader2, VideoIcon, LockIcon, CheckCircle, XCircle } from 'lucide-react';
import { toast } from "sonner";
import { useRouter } from 'next/navigation';
import { evaluatePasswordStrength } from '@/lib/utils';

const ResetPasswordPage = ({ params }) => {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast("Password Mismatch", {
        description: "Passwords do not match"
      });
      return;
    }

    if (password.length < 8) {
      toast("Password Too Short", {
        description: "Password must be at least 8 characters long"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/reset-password/${token}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password })
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast("Password Reset Successful", {
          description: "Your password has been reset successfully"
        });
        
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      toast("Reset Failed", {
        description: error.message || "Failed to reset password. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (value) => {
    setPassword(value);
    const strength = evaluatePasswordStrength(value);
    setPasswordStrength(strength);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset Successful!</h2>
          <p className="text-gray-600 mb-6">Your password has been updated successfully. You will be redirected to the login page shortly.</p>
          <div className="flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-purple-500 mr-2" />
            <span className="text-sm text-gray-500">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-center">
            <VideoIcon className="mr-2 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">Videodesk.co.uk</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-purple-500 text-white p-6 text-center">
            <LockIcon className="w-8 h-8 mx-auto mb-2" />
            <h2 className="text-xl font-bold">Reset Your Password</h2>
            <p className="text-purple-100 text-sm mt-1">Enter your new password below</p>
          </div>

          {/* Form */}
          <div className="p-6">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Min 8 characters including 1 capital, 1 lower case and 1 special character
                </p>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="w-full grid grid-cols-3 mt-2 gap-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-full h-2 rounded-l-md ${passwordStrength >= 0 ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1 text-gray-600">Weak</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-full h-2 ${passwordStrength >= 1 ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1 text-gray-600">Medium</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-full h-2 rounded-r-md ${passwordStrength >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs mt-1 text-gray-600">Strong</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <div className="flex items-center mt-1 text-red-500">
                    <XCircle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Passwords do not match</span>
                  </div>
                )}
                {confirmPassword && password === confirmPassword && password.length > 0 && (
                  <div className="flex items-center mt-1 text-green-500">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-xs">Passwords match</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || password !== confirmPassword || password.length < 8}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              <button
                onClick={() => router.push('/')}
                className="text-sm text-purple-600 hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm">
        <img src="/device-icons.png" alt="Videodesk" className="w-20 mx-auto mb-4" />
        <p>© 2024 Videodesk.co.uk. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default ResetPasswordPage;
