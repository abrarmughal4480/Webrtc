'use client'
import React, { useState, useEffect } from 'react';

export const HeroSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Detect screen size for mobile and viewport height
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
      setViewportHeight(window.innerHeight);
    };
    
    checkMobile(); // initial check
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);

  const slides = [
    {
      id: 1,
      backgroundImage: "url('/hero-section-bg.png')",
      content: (
        <div className="mx-auto relative z-10 min-h-[85vh] px-4 md:px-10 flex flex-col justify-center items-start">
          <div className="max-w-2xl ml-4 md:ml-14 mt-35">
            <div className='mb-4'>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">Videodesk.co.uk</h1>
              <p className="text-base md:text-lg font-normal">
                Connect inbound or outbound customer service calls with <br className="hidden sm:block" />
                instant video links and see what your customers see <br className="hidden sm:block" />
                in real time
              </p>
            </div>
            
            <div className='flex flex-col sm:flex-row gap-2 items-start sm:items-center mt-10'>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105"
              >
                How it works
              </a>
              {/* <a
                href="#signup"
                className="w-full sm:w-auto text-center bg-amber-500 hover:bg-amber-600 text-white font-medium py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105"
              >
                Sign up in 3 easy steps!
              </a> */}
            </div>
          </div>

        </div>
      )
    },
    {
      id: 2,
      backgroundImage: isMobile ? "url('/mobile_2.jpg')" : "url('/slide-2-bg.jpg')",
      content: (
        <div className="mx-auto relative z-10 px-10 flex flex-col justify-start pt-5">
          {/* Add your slide 2 content here if needed */}
        </div>
      )
    },
    {
      id: 3,
      backgroundImage: isMobile ? "url('/mobile_3.jpg')" : "url('/slide-3-bg.png')",
      content: (
        <div className="mx-auto relative z-10 h-[85vh] flex flex-row">
          {/* Built for Social Landlords - Top (Mobile only) */}
          {isMobile && (
            <div 
              className="absolute left-2 xs:left-3 sm:left-4 right-2 xs:right-3 sm:right-4 w-full z-20"
              style={{
                top: Math.max(32, viewportHeight * 0.12),
                maxWidth: 'calc(100vw - 32px)'
              }}
            >
            </div>
          )}
          
          {/* Reduce service calls - Bottom (Mobile only) */}
          {isMobile && (
            <div 
              className="absolute left-2 xs:left-3 sm:left-4 right-2 xs:right-3 sm:right-4 w-full z-20"
                                            style={{
                bottom: Math.max(40, viewportHeight * 0.12),
                maxWidth: 'calc(100vw - 32px)'
              }}
            >
              <div className="max-w-2xl">
                <h4 className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-black leading-tight drop-shadow-lg">
                  Reduce service calls and improve <br />
                  <span className="font-extrabold">first-time resolution</span> for <br />
                  repairs reporting.
                </h4>
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  useEffect(() => {
    const autoPlay = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 7000);

    return () => clearInterval(autoPlay);
  }, [slides.length]);

  return (
    <section className="relative bg-gray-800 text-white min-h-[85vh] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out bg-cover bg-center ${
            index === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
          style={{
            backgroundImage: slide.backgroundImage,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: slide.id === 2 ? "center 100%" : slide.id === 3 ? (isMobile ? "center 90%" : "center") : "center"
          }}
        >
          {slide.content}
        </div>
      ))}

      <div className="flex space-x-2 mt-12 absolute bottom-10 left-[50%] -translate-x-[50%] z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              activeSlide === index ? 'bg-amber-500' : 'bg-gray-300 bg-opacity-50'
            }`}
          />
        ))}
      </div>
    </section>
  );
};