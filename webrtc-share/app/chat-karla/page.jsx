"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import DemoCode from '@/components/DemoCode';
import { toast } from "sonner";
import ChatBot from '@/components/ChatBot';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ChatKarlaPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isDemoCodePopupOpen, setIsDemoCodePopupOpen] = useState(false);
  const [chatDemoCode, setChatDemoCode] = useState('');
  const [chatDemoCodeError, setChatDemoCodeError] = useState('');
  const canvasRef = useRef(null);

  // Neural Network Animation - Optimized for better performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;
    let isActive = true;

    // Set canvas size
    const resizeCanvas = () => {
      if (!isActive) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    
    const handleResize = () => {
      if (isActive) {
        resizeCanvas();
      }
    };
    window.addEventListener('resize', handleResize);

    // Node class for neural network
    class Node {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.6; // Reduced speed for better performance
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 1.5 + 0.5; // Smaller radius for better performance
        this.connections = [];
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        if (!isActive) return;
        
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += 0.05; // Reduced pulse speed

        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y >= canvas.height) this.vy *= -1;

        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw() {
        if (!isActive) return;
        
        const alpha = 0.6 + 0.2 * Math.sin(this.pulse); // Reduced alpha for better performance
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        
        // Reduced glow effect for better performance
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Add inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.2})`;
        ctx.fill();
      }
    }

    // Create nodes - reduced count for better performance
    const nodes = [];
    const nodeCount = Math.min(40, Math.floor((canvas.width * canvas.height) / 30000)); // Reduced node count
    
    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new Node(
        Math.random() * canvas.width,
        Math.random() * canvas.height
      ));
    }

    // Animation loop with performance optimization
    const animate = () => {
      if (!isActive) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      nodes.forEach(node => {
        node.update();
        node.draw();
      });

      // Draw connections with reduced complexity for better performance
      nodes.forEach((node, i) => {
        nodes.slice(i + 1).forEach(otherNode => {
          const distance = Math.sqrt(
            Math.pow(node.x - otherNode.x, 2) + 
            Math.pow(node.y - otherNode.y, 2)
          );
          
          if (distance < 120) { // Reduced connection distance
            const alpha = Math.max(0, 1 - distance / 120);
            const pulseEffect = Math.sin(Date.now() * 0.002 + i * 0.1) * 0.15 + 0.85; // Reduced pulse effect
            
            // Main connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3 * pulseEffect})`;
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Reduced glow to connections for better performance
            ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
            ctx.shadowBlur = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Simplified pulsing dots - only for very close connections
            if (distance < 80) {
              const steps = 2; // Reduced steps
              for (let step = 1; step < steps; step++) {
                const t = step / steps;
                const x = node.x + (otherNode.x - node.x) * t;
                const y = node.y + (otherNode.y - node.y) * t;
                const dotPulse = Math.sin(Date.now() * 0.003 + step * 0.5) * 0.2 + 0.8;
                
                ctx.beginPath();
                ctx.arc(x, y, 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4 * dotPulse})`;
                ctx.fill();
              }
            }
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup function
    const cleanup = () => {
      isActive = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener('resize', handleResize);
    };

    // Cleanup on unmount
    return cleanup;
  }, []);

  const handleStart = () => {
    setIsDemoCodePopupOpen(true);
  };

  const handleDemoCodeClose = () => {
    setIsDemoCodePopupOpen(false);
    setChatDemoCode('');
    setChatDemoCodeError('');
  };

  const handleDemoCodeSubmit = (code, errorData) => {
    if (errorData && errorData.error) {
      // Show error message in toast
              toast.error("Invalid demo code. Please try again.");
      setChatDemoCodeError(errorData.error);
      return;
    }
    
    // DemoCode component now handles validation
    setChatDemoCodeError('');
    setIsDemoCodePopupOpen(false);
    setChatDemoCode('');
    setIsChatOpen(true);
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
    <div className="min-h-screen bg-gradient-to-br from-[#9452FF] via-[#8a42fc] to-[#7c3aed] relative overflow-hidden">
      {/* Neural Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-40"
        style={{ zIndex: 1 }}
      />
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-purple-200 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10 flex items-center justify-center min-h-screen">
        <div className="max-w-5xl mx-auto text-center">
          {/* Header Section */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16">
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
          <div className="text-center px-4 sm:px-0">
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
      
      {/* Demo Code Component */}
      <DemoCode
        isOpen={isDemoCodePopupOpen}
        onClose={handleDemoCodeClose}
        onSubmit={handleDemoCodeSubmit}
        error={chatDemoCodeError}
        useCase="karla"
        onRequestDemo={() => {
          setIsDemoCodePopupOpen(false);
          setChatDemoCode('');
          setChatDemoCodeError('');
        }}
      />
    </div>
  );
}
