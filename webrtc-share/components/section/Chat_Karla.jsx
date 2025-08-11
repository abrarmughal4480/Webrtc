"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { requestDemoRequest } from '@/http/authHttp';

import ChatBot from '@/components/ChatBot';

export default function ChatKarla() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [isDemoCodePopupOpen, setIsDemoCodePopupOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [demoCode, setDemoCode] = useState('');
  const [chatDemoCode, setChatDemoCode] = useState('');
  const [chatDemoCodeError, setChatDemoCodeError] = useState('');
  const [demoCodeBlocks, setDemoCodeBlocks] = useState(['', '', '', '']);
  const canvasRef = useRef(null);

  // Valid demo codes - you can modify this array as needed
  const validDemoCodes = ['7002'];

  // Neural Network Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Node class for neural network
    class Node {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.radius = Math.random() * 2 + 1;
        this.connections = [];
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += 0.08;

        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y >= canvas.height) this.vy *= -1;

        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw() {
        const alpha = 0.7 + 0.3 * Math.sin(this.pulse);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        
        // Enhanced glow effect
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Add inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.3})`;
        ctx.fill();
      }
    }

    // Create nodes
    const nodes = [];
    const nodeCount = Math.min(80, Math.floor((canvas.width * canvas.height) / 15000));
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ));
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      nodes.forEach(node => {
        node.update();
        node.draw();
      });

      // Draw connections with enhanced linking
      nodes.forEach((node, i) => {
        nodes.slice(i + 1).forEach(otherNode => {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + 
            Math.pow(node.y - otherNode.y, 2)
          );
          
          if (distance < 180) {
            const alpha = Math.max(0, 1 - distance / 180);
            const pulseEffect = Math.sin(Date.now() * 0.003 + i * 0.1) * 0.2 + 0.8;
            
            // Main connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.4 * pulseEffect})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            
            // Enhanced glow to connections
            ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Add pulsing dots along the connection
            if (distance < 120) {
              const steps = 3;
              for (let step = 1; step < steps; step++) {
                const t = step / steps;
                const x = node.x + (otherNode.x - node.x) * t;
                const y = node.y + (otherNode.y - node.y) * t;
                const dotPulse = Math.sin(Date.now() * 0.005 + step * 0.5) * 0.3 + 0.7;
                
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6 * dotPulse})`;
                ctx.fill();
              }
            }
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const handleStart = () => {
    setIsDemoCodePopupOpen(true);
  };

  const handleDemoOpen = () => {
    setIsDemoOpen(true);
  };

  const handleDemoClose = () => {
    setIsDemoOpen(false);
    setDemoName('');
    setDemoEmail('');
    setSubmitMessage('');
    setIsSubmitting(false);
  };

  const handleDemoCodeClose = () => {
    setIsDemoCodePopupOpen(false);
    setChatDemoCode('');
    setChatDemoCodeError('');
    setDemoCodeBlocks(['', '', '', '']);
  };

  const handleDemoCodeChange = (index, value) => {
    // Only allow alphanumeric characters and limit to 1 character per block
    if (value.length <= 1 && /^[A-Za-z0-9]*$/.test(value)) {
      const newBlocks = [...demoCodeBlocks];
      newBlocks[index] = value.toUpperCase();
      setDemoCodeBlocks(newBlocks);
      
      // Auto-focus next input
      if (value && index < 3) {
        const nextInput = document.getElementById(`demo-code-${index + 1}`);
        if (nextInput) nextInput.focus();
      }
      
      // Update the combined demo code
      setChatDemoCode(newBlocks.join(''));
    }
  };

  const handleDemoCodeKeyDown = (index, e) => {
    // Handle backspace to go to previous input
    if (e.key === 'Backspace' && !demoCodeBlocks[index] && index > 0) {
      const prevInput = document.getElementById(`demo-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleDemoCodeSubmit = (e) => {
    e.preventDefault();
    const combinedCode = demoCodeBlocks.join('');
    if (combinedCode.length === 4) {
      if (validDemoCodes.some(code => code.includes(combinedCode))) {
        setChatDemoCodeError('');
        setIsDemoCodePopupOpen(false);
        setChatDemoCode('');
        setDemoCodeBlocks(['', '', '', '']);
        setIsChatOpen(true);
      } else {
        setChatDemoCodeError('Invalid demo code. Please try again.');
      }
    } else {
      setChatDemoCodeError('Please enter a complete 4-character demo code.');
    }
  };

  const handleDemoRequest = async (e) => {
    e.preventDefault();
    if (!demoName.trim() || !demoEmail.trim()) {
      setSubmitMessage('Please fill in both name and email fields.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await requestDemoRequest({
        name: demoName.trim(),
        email: demoEmail.trim()
      });
      
      if (response.data.success) {
        setSubmitMessage('Thank you! Your demo code has been sent to your email.');
        setDemoName('');
        setDemoEmail('');
        
        // Close the popup after 3 seconds
        setTimeout(() => {
          handleDemoClose();
        }, 3000);
      } else {
        setSubmitMessage('Sorry, there was an error sending your request. Please try again.');
      }
    } catch (error) {
      console.error('Demo request error:', error);
      setSubmitMessage('Sorry, there was an error sending your request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const residentFeatures = [
    "Advice and guidance on Damp and Mould issues",
    "Referrals to your Landlord's D&M Team",
    "Personalized solutions for your situation",
    "I'm here 24/7 for instant support and advice"
  ];

  const landlordFeatures = [
    "Automate your Damp and Mould reporting processes",
    "Eliminate repetitive tasks, freeing up Officer time",
    "Offer advice to your residents 24/7",
    "Help you to get ready for Awaabs Law"
  ];

  return (
    <section className="py-8 sm:py-10 md:py-12 lg:py-16 bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] relative overflow-hidden">
      {/* Neural Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40"
        style={{ zIndex: 1 }}
      />
      
      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
                         <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-center text-white leading-tight">
                  Hello, I'm an AI Damp and Mould Assistant
             </h2>
             
             <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-xl sm:max-w-2xl mx-auto leading-relaxed font-medium text-purple-100 px-2 sm:px-0">
               I'm here to help you <br/> with damp and mould issues
             </p>
          </div>
          
          {/* Features List */}
          <div className="max-w-4xl mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12">
            {/* For Residents Section */}
            <div className="mb-8 sm:mb-10">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-purple-200 mb-4 sm:mb-6 text-center underline decoration-purple-300 decoration-2">
                For residents, I can offer:
              </h3>
              <div className="space-y-3 sm:space-y-4 text-center px-2 sm:px-0">
                {residentFeatures.map((feature, index) => (
                  <div key={index} className="group">
                    <p className="text-sm sm:text-base md:text-lg text-purple-100 leading-relaxed font-medium group-hover:text-purple-50 transition-colors duration-300">
                      {feature}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* For Social Landlords Section */}
            <div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-purple-200 mb-4 sm:mb-6 text-center underline decoration-purple-300 decoration-2">
                For Social Landlords, I can:
              </h3>
              <div className="space-y-3 sm:space-y-4 text-center px-2 sm:px-0">
                {landlordFeatures.map((feature, index) => (
                  <div key={index} className="group">
                                         {index === 0 ? (
                       <p className="text-sm sm:text-base md:text-lg text-purple-100 leading-relaxed font-medium group-hover:text-purple-50 transition-colors duration-300">
                         <span className="block sm:inline">Automate your Damp and Mould </span>
                         <span className="block sm:inline">reporting processes</span>
                       </p>
                     ) : (
                      <p className="text-sm sm:text-base md:text-lg text-purple-100 leading-relaxed font-medium group-hover:text-purple-50 transition-colors duration-300">
                        {feature}
                    </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
                    {/* CTA Section */}
          <div className="text-center px-4 sm:px-0 mb-8 sm:mb-10">
                         <Button 
               onClick={handleStart}
               className="bg-white text-[#9452FF] font-medium py-2.5 sm:py-3 px-6 sm:px-8 rounded-full text-base sm:text-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-[#9452FF] hover:bg-purple-50 w-full sm:w-auto max-w-xs sm:max-w-none block mx-auto flex justify-center items-center"
             >
               Start Chat
             </Button>
          </div>
          

        </div>
      </div>
      
      {/* Chat Modal */}
      <ChatBot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      
      {/* Demo Request Modal */}
      {isDemoOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-none"></div>
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-bold text-center">Request Demo</span>
                </div>
                <button
                  onClick={handleDemoClose}
                  className="absolute right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-2 rounded-full shadow"
                  aria-label="Close"
                >
                  <span style={{fontWeight: 'bold', fontSize: 20}}>×</span>
                </button>
              </div>
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
                <form className="space-y-4 w-full" onSubmit={handleDemoRequest}>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 ml-1">Name<span className="text-red-500">*</span><br /></label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 ml-1">Email<span className="text-red-500">*</span><br /></label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  {submitMessage && <div className="text-red-600 text-xs font-semibold text-center">{submitMessage}</div>}
                  <button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full disabled:opacity-60"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Request Demo'}
                  </button>
                </form>
                
                {/* Link to enter demo code */}
                <div className="text-center mt-1 pt-1">
                  <p className="text-sm text-gray-600">
                    Already have a demo code?{' '}
                    <button
                      onClick={() => {
                        setIsDemoOpen(false);
                        setDemoName('');
                        setDemoEmail('');
                        setSubmitMessage('');
                        setIsSubmitting(false);
                        setIsDemoCodePopupOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 font-semibold underline transition-colors"
                    >
                      Enter it here
                    </button>
                  </p>
                </div>
                
                {/* Required field indicator */}
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-500">
                    <span className="text-red-500">*</span>required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Demo Code Popup Modal */}
      {isDemoCodePopupOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-none"></div>
          <div className="fixed inset-0 z-[200] flex items-center justify-center">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-bold text-center">Enter Demo Code</span>
                </div>
                <button
                  onClick={handleDemoCodeClose}
                  className="absolute right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-2 rounded-full shadow"
                  aria-label="Close"
                >
                  <span style={{fontWeight: 'bold', fontSize: 20}}>×</span>
                </button>
              </div>
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
                <form className="space-y-4 w-full" onSubmit={handleDemoCodeSubmit}>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 ml-1">Demo Code<br /></label>
                    <div className="flex justify-center gap-2 mt-2">
                      {demoCodeBlocks.map((block, index) => (
                        <input
                          key={index}
                          id={`demo-code-${index}`}
                          type="text"
                          className="w-12 h-12 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                          value={block}
                          onChange={(e) => handleDemoCodeChange(index, e.target.value)}
                          onKeyDown={(e) => handleDemoCodeKeyDown(index, e)}
                          maxLength={1}
                        />
                      ))}
                    </div>
                  </div>
                  {chatDemoCodeError && <div className="text-red-600 text-xs font-semibold text-center">{chatDemoCodeError}</div>}
                  <button 
                    type="submit" 
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full"
                  >
                    Start Chat
                  </button>
                </form>
                
                {/* Link to request demo code */}
                <div className="text-center mt-1 pt-1">
                  <p className="text-sm text-gray-600">
                    Don't have a demo code?{' '}
                    <button
                      onClick={() => {
                        setIsDemoCodePopupOpen(false);
                        setChatDemoCode('');
                        setChatDemoCodeError('');
                        setDemoCodeBlocks(['', '', '', '']);
                        setIsDemoOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-700 font-semibold underline transition-colors"
                    >
                      Request one here
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
