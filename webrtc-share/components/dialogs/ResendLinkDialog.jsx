"use client"
import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { X, Mail, Phone, Edit3, Send, Clock, AlertCircle, CheckCircle, Zap, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

export default function ResendLinkDialog({ 
  isOpen, 
  onClose, 
  originalPhone, 
  originalEmail, 
  token,
  senderId,
  onResendSuccess 
}) {
  const [phone, setPhone] = useState(originalPhone || '');
  const [email, setEmail] = useState(originalEmail || '');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSentLink, setLastSentLink] = useState(null);

  // Load last sent link from localStorage and calculate remaining time
  useEffect(() => {
    const storedLink = localStorage.getItem('lastSentLink');
    if (storedLink) {
      try {
        const linkData = JSON.parse(storedLink);
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        
        if (linkData.timestamp > tenMinutesAgo) {
          setLastSentLink(linkData);
          
          // Calculate remaining time based on stored timestamp
          const elapsedTime = Math.floor((Date.now() - linkData.timestamp) / 1000);
          const remainingTime = Math.max(0, 600 - elapsedTime); // 600 seconds = 10 minutes
          
          if (remainingTime > 0) {
            setTimeLeft(remainingTime);
          } else {
            // Time has expired, close dialog
            onClose();
          }
        } else {
          // Link has expired, close dialog
          onClose();
        }
      } catch (error) {
        console.error('Error parsing last sent link:', error);
        localStorage.removeItem('lastSentLink');
        onClose();
      }
    } else {
      // No link found, close dialog
      onClose();
    }
  }, [isOpen, onClose]);

  // Real-time countdown timer
  useEffect(() => {
    if (!isOpen || !lastSentLink) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose, lastSentLink]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPhone(originalPhone || '');
      setEmail(originalEmail || '');
      setIsEditing(false);
      setShowSuccess(false);
    }
  }, [isOpen, originalPhone, originalEmail]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (!phone && !email) {
      toast.error("Please enter either phone number or email address");
      return;
    }

    setIsLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const queryParams = new URLSearchParams();
      
      if (phone) queryParams.append('number', phone);
      if (email) queryParams.append('email', email);
      if (token) queryParams.append('token', token); // Use existing token
      
      // Use senderId from props or from stored data
      const effectiveSenderId = senderId || lastSentLink?.senderId;
      console.log('🔍 ResendLinkDialog: senderId prop:', senderId);
      console.log('🔍 ResendLinkDialog: lastSentLink?.senderId:', lastSentLink?.senderId);
      console.log('🔍 ResendLinkDialog: effectiveSenderId:', effectiveSenderId);
      
      if (effectiveSenderId) queryParams.append('senderId', effectiveSenderId);
      
      const res = await axios.get(`${backendUrl}/resend-token?${queryParams.toString()}`);
      
      if (res.data.success) {
        setShowSuccess(true);
        
        // Update localStorage with new timestamp
        const updatedLink = { 
          phone, 
          email, 
          token, 
          senderId: effectiveSenderId,
          timestamp: Date.now() 
        };
        localStorage.setItem('lastSentLink', JSON.stringify(updatedLink));
        
        // Dispatch custom event to notify dashboard about localStorage update
        window.dispatchEvent(new Event('lastSentLinkUpdated'));
        
        setTimeout(() => {
          setShowSuccess(false);
          onClose();
        }, 2000);
        if (onResendSuccess) {
          onResendSuccess();
        }
      } else {
        throw new Error(res.data.message || 'Failed to resend link');
      }
    } catch (error) {
      console.error('Error resending token:', error);
      toast.error("Failed to resend link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyAdminLink = () => {
    const adminLink = `${window.location.origin}/room/admin/${token}`;
    navigator.clipboard.writeText(adminLink).then(() => {
      toast.success("Admin link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const openAdminLink = () => {
    const adminLink = `${window.location.origin}/room/admin/${token}`;
    window.open(adminLink, '_blank');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast.success("Contact details updated!");
  };

  const handleCancelEdit = () => {
    setPhone(originalPhone || '');
    setEmail(originalEmail || '');
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden">
        {/* Gradient Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold">Resend Video Link</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                <Clock className="w-4 h-4" />
                <span className="font-bold text-sm">{formatTime(timeLeft)}</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success State */}
          {showSuccess && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Link Resent Successfully!</h3>
              <p className="text-gray-600">The video link has been sent to the updated contact details.</p>
            </div>
          )}

          {/* Normal State */}
          {!showSuccess && (
            <>
              {/* Contact Information */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <h3 className="font-bold text-gray-800">Contact Details</h3>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 text-amber-600 hover:text-amber-700 text-sm font-medium bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Enter phone number"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter email address"
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button
                          onClick={handleSaveEdit}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl"
                        >
                          Save Changes
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {phone && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <Phone className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="text-gray-700 font-medium">{phone}</span>
                        </div>
                      )}
                      {email && (
                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-amber-600" />
                          </div>
                          <span className="text-gray-700 font-medium">{email}</span>
                        </div>
                      )}
                      {!phone && !email && (
                        <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <AlertCircle className="w-5 h-5 text-yellow-600" />
                          <span className="text-yellow-700 text-sm">No contact details available</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleResend}
                  disabled={isLoading || (!phone && !email)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5" />
                      <span>Resend Video Link</span>
                    </div>
                  )}
                </Button>

                {/* Admin Link Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={copyAdminLink}
                    variant="outline"
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Live Video Room Link
                  </Button>
                  <Button
                    onClick={openAdminLink}
                    variant="outline"
                    className="flex-1 border-amber-200 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Re-open Live Video Room
                  </Button>
                </div>
              </div>

              {/* Info message */}
              <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3 h-3 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-800 font-medium mb-1">
                      Quick Resend Feature
                    </p>
                    <p className="text-xs text-amber-700">
                      This popup will automatically close in {formatTime(timeLeft)}. 
                      You can resend the same video link or edit contact details.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 