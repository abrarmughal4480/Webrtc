"use client"
import { Header } from '@/components/layouts/HeaderComponent'
import { HeroSection } from '@/components/section/HeroSectionComponent'
import { AboutSection } from '@/components/section/AboutSectionComponents'
import { FeaturesSection } from '@/components/section/FeatureSectionComponent'
import { HowItWorksSection } from '@/components/section/HowItsWorkSectionComponent'
import { LaunchLinkSection } from '@/components/section/LunchLinkSectionComponent'
import { Footer } from '@/components/layouts/FooterComponent'
import React, { useState, useEffect, Suspense } from 'react'
import { DialogComponent } from '@/components/dialogs/DialogCompnent'
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClose = () => {
    setShowFeedback(false);
    // Immediate redirect when dialog closes
    if (redirectUrl) {
      // Redirect to tailored URL immediately
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 100);
    } else {
      // Default behavior - stay on home page
      setTimeout(() => {
        router.push("/");
      }, 100);
    }
  };

  useEffect(() => {
    const feedbackParam = searchParams.get("show-feedback");
    const redirectUrlParam = searchParams.get("redirectUrl");
    setShowFeedback(!!feedbackParam);
    setRedirectUrl(redirectUrlParam || '');
    
    // Auto close after 20 seconds
    if (feedbackParam) {
      const timer = setTimeout(() => {
        handleClose();
      }, 20000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, router]);

  const handleStarClick = (starValue) => {
    setRating(starValue);
    // You can add API call here to submit feedback
    console.log(`User rated: ${starValue} stars`);
    
    // Auto submit after 1.5 seconds
    setTimeout(() => {
      handleClose();
    }, 1500);
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
    <DialogComponent open={showFeedback} setOpen={handleClose} isCloseable={true}>
      <div className="h-[33rem] p-4 flex flex-col items-center justify-center">
        <Image src="/paper-plane.svg" alt="video-link-dialog-bg" className='object-contain' width={150} height={150} />
        <h2 className="text-xl font-bold mt-10 text-center">
          Thank you for joining the video session. 
          The link has now ended.
        </h2>
        <h2 className="text-xl font-bold text-center mt-5">
          How was it?
        </h2>
        
        <div className='flex items-center justify-center mt-8 gap-2'>
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

        <div className="mt-4 h-8 flex items-center justify-center">
          {(rating > 0 || hoverRating > 0) && (
            <div className={`text-lg font-semibold ${getTextColor(hoverRating || rating)}`}>
              {getFeedbackText(hoverRating || rating)}
            </div>
          )}
        </div>

        <Image src="/devices.svg" alt="Videodesk" className="mt-6" width={200} height={50} />
      </div>
    </DialogComponent>
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