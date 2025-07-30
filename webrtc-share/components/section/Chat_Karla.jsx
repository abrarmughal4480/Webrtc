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
    <section className="py-12 md:py-16 bg-amber-400 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full opacity-10 -translate-x-16 -translate-y-16"></div>
      <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full opacity-15 translate-x-12 translate-y-12"></div>
      
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-3 text-center text-white">
            Hello, I'm Karla
            </h2>
            
            <p className="text-xl md:text-2xl lg:text-3xl max-w-2xl mx-auto leading-relaxed font-medium text-white">
              I'm a Damp and Mould AI Assistant
            </p>
          </div>
          
          {/* Features List */}
          <div className="max-w-2xl mx-auto mb-8 md:mb-12">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-6 text-center">
              I can offer:
            </h3>
            <div className="space-y-4 text-center">
              {features.map((feature, index) => (
                <div key={index} className="group">
                  <p className="text-base md:text-lg text-gray-800 leading-relaxed font-medium group-hover:text-gray-900 transition-colors duration-300">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* CTA Section */}
          <div className="text-center">
            <Button 
              onClick={handleStart}
              className="bg-white hover:bg-gray-50 text-amber-600 font-medium py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-white"
              
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
