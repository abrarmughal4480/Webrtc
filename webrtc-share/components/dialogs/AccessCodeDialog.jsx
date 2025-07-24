"use client";
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Copy, Check, Share2 } from 'lucide-react';
import { toast } from "sonner";

const AccessCodeDialog = ({ isOpen, onOpenChange, accessCode, onAfterCloseCopy, onCopy, showSignupPrompt, setShowSignupPrompt, password, setPassword, confirmPassword, setConfirmPassword, email, router }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    if (onAfterCloseCopy) onAfterCloseCopy();
    if (onCopy) onCopy();
    setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Videodesk Share Code',
      text: `Here is your share code for Videodesk: ${accessCode}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(shareData.text);
        toast.info("Sharing not supported. Code copied to clipboard instead.");
      }
    } catch (error) {
      toast.error("Something went wrong while trying to share.");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-none"></div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="sm:max-w-md max-w-[95vw] w-full bg-white rounded-2xl shadow-2xl pointer-events-auto relative mx-2 sm:mx-0">
          {/* Header strip */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-lg sm:text-2xl font-bold text-center">Your Share Code</span>
            </div>
            <button
              onClick={() => onOpenChange && onOpenChange(false)}
              className="absolute right-4 text-white hover:text-gray-200 transition p-2 rounded-full"
              aria-label="Close"
            >
              <span style={{fontSize: '1.25rem', fontWeight: 'bold'}}>&times;</span>
            </button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="text-center text-gray-500 pt-2 text-sm sm:text-base">
              Use this code to share your saved information.
            </div>
            <div className="flex flex-col items-center justify-center p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="text-3xl sm:text-5xl font-bold tracking-widest text-purple-600 bg-purple-50 p-4 sm:p-6 rounded-2xl border-2 border-purple-200">
                {accessCode}
              </div>
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg shadow-sm hover:shadow-md"
                >
                  {copied ? (
                    <>
                      <Check className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      <span className="font-semibold">Copy</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full h-12 flex items-center justify-center gap-2 transition-all duration-300 transform hover:-translate-y-0.5 rounded-lg shadow-sm hover:shadow-md"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="font-semibold">Share</span>
                </Button>
              </div>
            </div>
            <div className="text-center text-xs text-gray-400 px-2 sm:px-6 pb-4">
              Please save this code somewhere safe.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccessCodeDialog; 