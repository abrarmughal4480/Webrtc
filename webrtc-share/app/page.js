"use client"
import { Header } from '@/components/layouts/HeaderComponent'
import { HeroSection } from '@/components/section/HeroSectionComponent'
import { AboutSection } from '@/components/section/AboutSectionComponents'
import { FeaturesSection } from '@/components/section/FeatureSectionComponent'
import { HowItWorksSection } from '@/components/section/HowItsWorkSectionComponent'
import { LaunchLinkSection } from '@/components/section/LunchLinkSectionComponent'
import { Footer } from '@/components/layouts/FooterComponent'
import React, { useState, useEffect, Suspense, useCallback } from 'react'
import { FeedbackDialogComponent } from '@/components/dialogs/FeedbackDialogComponent'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { StarIcon } from 'lucide-react'
import PriceAndPlan from '@/components/section/PriceAndPlanSectionComponent'
import SendFriendSectionComponent from '@/components/section/SendFriendSectionComponent'

const FeedbackDialog = () => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClose = useCallback(() => {
    // Don't close the modal, only redirect
    
    // Get redirectUrl directly from searchParams to avoid timing issues
    const currentRedirectUrl = searchParams.get("redirectUrl");
    
    // Also check localStorage as fallback
    const localStorageRedirectUrl = localStorage.getItem("redirectUrl");
    
    console.log('🔗 handleClose called with redirectUrl from state:', redirectUrl);
    console.log('🔗 handleClose called with redirectUrl from searchParams:', currentRedirectUrl);
    console.log('🔗 handleClose called with redirectUrl from localStorage:', localStorageRedirectUrl);
    
    // Use searchParams value as fallback if state is not set, localStorage as final fallback
    let finalRedirectUrl = redirectUrl || currentRedirectUrl || localStorageRedirectUrl;
    
    // Clear localStorage after use
    if (localStorageRedirectUrl) {
      localStorage.removeItem("redirectUrl");
    }
    
    // Ensure URL has proper protocol
    if (finalRedirectUrl && !finalRedirectUrl.startsWith('http://') && !finalRedirectUrl.startsWith('https://')) {
      finalRedirectUrl = `https://${finalRedirectUrl}`;
      console.log('🔗 Added https:// to URL:', finalRedirectUrl);
    }
    
    // Only redirect, don't close modal
    if (finalRedirectUrl) {
      // Redirect to tailored URL immediately
      console.log('🔗 Redirecting to tailored URL:', finalRedirectUrl);
      // Use immediate redirect without setTimeout
      window.location.href = finalRedirectUrl;
    } else {
      // Default behavior - stay on home page
      console.log('🔗 No redirect URL, staying on home page');
      router.push("/");
    }
  }, [redirectUrl, router, searchParams]);

  useEffect(() => {
    const feedbackParam = searchParams.get("show-feedback");
    const redirectUrlParam = searchParams.get("redirectUrl");
    
    console.log('📝 Feedback dialog params:', {
      showFeedback: !!feedbackParam,
      redirectUrl: redirectUrlParam,
      hasRedirectUrl: !!redirectUrlParam
    });
    
    setShowFeedback(!!feedbackParam);
    
    // Use URL parameter first, then localStorage as fallback
    const finalRedirectUrl = redirectUrlParam || localStorage.getItem("redirectUrl") || '';
    setRedirectUrl(finalRedirectUrl);
    
    // Debug: Check localStorage as well
    const localStorageRedirectUrl = localStorage.getItem("redirectUrl");
    console.log('📝 localStorage redirectUrl:', localStorageRedirectUrl);
    console.log('📝 Final redirectUrl set to:', finalRedirectUrl);
  }, [searchParams, handleClose]);

  // Countdown effect for redirect
  useEffect(() => {
    if (showFeedback && redirectUrl) {
      // Reset countdown to 10 when dialog opens
      setCountdown(10);
      
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleClose(); // This will only redirect, not close modal
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showFeedback, redirectUrl, handleClose]);

  // Additional effect to handle redirect URL changes
  useEffect(() => {
    if (redirectUrl) {
      console.log('🔄 Redirect URL state updated:', redirectUrl);
    }
  }, [redirectUrl]);

  const handleStarClick = (starValue) => {
    setRating(starValue);
    // You can add API call here to submit feedback
    console.log(`User rated: ${starValue} stars`);
    
    // Auto redirect after 1 second (reduced from 1.5 seconds)
    setTimeout(() => {
      console.log('⭐ Star rating submitted, redirecting...');
      handleClose(); // This will only redirect, not close modal
    }, 1000);
  };

  const handleStarHover = (starValue) => {
    setHoverRating(starValue);
  };

  const handleStarLeave = () => {
    setHoverRating(0);
  };

  const getFeedbackText = (rating) => {
    if (rating === 1) return "Very Bad";
    if (rating === 2) return "Bad";
    if (rating === 3) return "Okay";
    if (rating === 4) return "Good";
    if (rating === 5) return "Very Good";
    return "";
  };

  const getStarColor = (star, currentRating) => {
    if (star <= currentRating) {
      if (currentRating <= 2) return "text-red-500";
      if (currentRating === 3) return "text-yellow-500";
      return "text-green-500";
    }
    return "text-gray-300 hover:text-gray-400";
  };

  const getTextColor = (rating) => {
    if (rating <= 2) return "text-red-500";
    if (rating === 3) return "text-yellow-500";
    return "text-green-500";
  };

  return (
    <FeedbackDialogComponent 
      open={showFeedback} 
      setOpen={handleClose} 
      isCloseable={true}
      overlayColor={redirectUrl ? "bg-orange-500" : "bg-black/50"}
    >
      <div className="h-[38rem] p-4 flex flex-col items-center justify-start overflow-hidden pt-8">
        {/* Top section - fixed height */}
        <div className="flex flex-col items-center flex-shrink-0">
          <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={150} height={150} />
          <h2 className="text-xl font-bold mt-10 text-center">
            Thank you for joining the video session. 
            The link has now ended.
          </h2>
          <h2 className="text-xl font-bold text-center mt-5">
            How was it?
          </h2>
        </div>
        
        {/* Stars section - fixed height */}
        <div className='flex items-center justify-center mt-8 gap-2 flex-shrink-0'>
          {[1, 2, 3, 4, 5].map((star) => (
            <StarIcon 
              key={star}
              className={`w-10 h-10 cursor-pointer transition-colors duration-200 ${
                getStarColor(star, hoverRating || rating)
              }`}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => handleStarHover(star)}
              onMouseLeave={handleStarLeave}
              fill={star <= (hoverRating || rating) ? 'currentColor' : 'none'}
            />
          ))}
        </div>

        {/* Feedback text section - fixed height to prevent layout shift */}
        <div className="mt-4 h-8 flex items-center justify-center min-h-[2rem] flex-shrink-0">
          {(rating > 0 || hoverRating > 0) && (
            <div className={`text-lg font-semibold ${getTextColor(hoverRating || rating)}`}>
              {getFeedbackText(hoverRating || rating)}
            </div>
          )}
        </div>

        {/* Bottom section - fixed height */}
        <div className="flex flex-col items-center justify-center mt-6 flex-shrink-0">
          <Image src="/devices.svg" alt="Videodesk" width={200} height={50} />
          
          {/* Fixed height container for bottom messages */}
          <div className="mt-4 text-center min-h-[3rem] flex flex-col justify-center flex-shrink-0">
            {/* Countdown message for redirect */}
            {redirectUrl && (
              <div>
                <p className="text-sm text-gray-600">
                  You will be redirected in {countdown} second{countdown !== 1 ? 's' : ''}
                </p>
                {countdown <= 3 && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    Redirecting...
                  </p>
                )}
              </div>
            )}
            
            {/* Show different message if no redirect URL */}
            {!redirectUrl && (
              <div>
                <p className="text-sm text-gray-600">
                  Thank you for your feedback!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </FeedbackDialogComponent>
  );
};

const Page = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header/>
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <HowItWorksSection />
      <LaunchLinkSection />
      <PriceAndPlan/>
      <SendFriendSectionComponent/>
      <Footer />

      <Suspense fallback={null}>
        <FeedbackDialog />
      </Suspense>
    </div>
  )
}

export default Page
