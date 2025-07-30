"use client"
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

import ChatBot from '@/components/ChatBot';

export default function ChatKarla() {
  const [isChatOpen, setIsChatOpen] = useState(false);


  const handleStart = () => {
    setIsChatOpen(true);
  };

  const features = [
    "Advice and Guidance on damp and mould issues",
    "Making any referrals to our Damp and Mould Team",
    "Personalized solutions for your specific situation",
    "I'm here 24/7 for instant support and advice"
  ];

  return (
    <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-amber-400 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-16 sm:w-24 md:w-32 h-16 sm:h-24 md:h-32 bg-white rounded-full opacity-10 -translate-x-8 sm:-translate-x-12 md:-translate-x-16 -translate-y-8 sm:-translate-y-12 md:-translate-y-16"></div>
      <div className="absolute bottom-0 right-0 w-12 sm:w-16 md:w-24 h-12 sm:h-16 md:h-24 bg-white rounded-full opacity-15 translate-x-6 sm:translate-x-8 md:translate-x-12 translate-y-6 sm:translate-y-8 md:translate-y-12"></div>
      
      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-center text-white leading-tight">
              Hello, I'm Karla
            </h2>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-xl sm:max-w-2xl mx-auto leading-relaxed font-medium text-white px-2 sm:px-0">
              I'm a Damp and Mould AI Assistant
            </p>
          </div>
          
          {/* Features List */}
          <div className="max-w-xl sm:max-w-2xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 text-center">
              I can offer:
            </h3>
            <div className="space-y-3 sm:space-y-4 text-center px-2 sm:px-0">
              {features.map((feature, index) => (
                <div key={index} className="group">
                  <p className="text-sm sm:text-base md:text-lg text-gray-800 leading-relaxed font-medium group-hover:text-gray-900 transition-colors duration-300">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="text-center px-4 sm:px-0">
            <Button 
              onClick={handleStart}
              className="bg-white hover:bg-gray-50 text-amber-600 font-medium py-2.5 sm:py-3 px-6 sm:px-8 rounded-full text-base sm:text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-white w-full sm:w-auto max-w-xs sm:max-w-none"
            >
              Start Chat with Karla
            </Button>
          </div>
          

        </div>
      </div>
      
      {/* Chat Modal */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </section>
  );
}
