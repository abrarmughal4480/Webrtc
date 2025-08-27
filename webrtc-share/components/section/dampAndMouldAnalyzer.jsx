"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import PagesAnalyzer from './PagesAnalyzer';
import DemoCode from '@/components/DemoCode';
import { toast } from "sonner";

export default function DampAndMouldAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isPagesAnalyzerOpen, setIsPagesAnalyzerOpen] = useState(false);
  const [isDemoCodeOpen, setIsDemoCodeOpen] = useState(false);
  const [demoCodeError, setDemoCodeError] = useState('');
  const canvasRef = useRef(null);

  // Analysis features
  const analysisFeatures = [
    "Real-time photo analysis",
    "AI-powered damp detection algorithms",
    "Mould growth prediction and effect models",
    "Prevention recommendations",
    "24/7 Automated reporting"
  ];

  // Benefits
  const benefits = [
    {
      icon: "🔍",
      title: "Early Detection",
      description: "Identify damp issues before they become severe problems"
    },
    {
      icon: "📊",
      title: "Data Analytics",
      description: "Comprehensive reports with actionable insights"
    },
    {
      icon: "🛡️",
      title: "Prevention",
      description: "Proactive measures to prevent mould growth"
    },
    {
      icon: "💰",
      title: "Cost Savings",
      description: "Save money by addressing issues early"
    }
  ];

  // Neural Network Animation for Analysis
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

    // Analysis node class
    class AnalysisNode {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.6;
        this.radius = Math.random() * 3 + 2;
        this.connections = [];
        this.pulse = Math.random() * Math.PI * 2;
        this.type = Math.random() > 0.5 ? 'damp' : 'mould';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.pulse += 0.06;

        // Bounce off edges
        if (this.x <= 0 || this.x >= canvas.width) this.vx *= -1;
        if (this.y <= 0 || this.y >= canvas.height) this.vy *= -1;

        // Keep within bounds
        this.x = Math.max(0, Math.min(canvas.width, this.x));
        this.y = Math.max(0, Math.min(canvas.height, this.y));
      }

      draw() {
        const alpha = 0.8 + 0.2 * Math.sin(this.pulse);
        const color = this.type === 'damp' ? 'rgba(0, 150, 255, 0.8)' : 'rgba(255, 100, 0, 0.8)';

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = color.replace('0.8', alpha);
        ctx.fill();

        // Enhanced glow effect
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Add inner glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = color.replace('0.8', alpha * 0.4);
        ctx.fill();
      }
    }

    // Create analysis nodes
    const nodes = [];
    const nodeCount = Math.min(60, Math.floor((canvas.width * canvas.height) / 20000));

    for (let i = 0; i < nodeCount; i++) {
      nodes.push(new AnalysisNode(
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

          if (distance < 200) {
            const alpha = Math.max(0, 1 - distance / 200);
            const pulseEffect = Math.sin(Date.now() * 0.002 + i * 0.1) * 0.3 + 0.7;

            // Main connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.5 * pulseEffect})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Enhanced glow to connections
            ctx.shadowColor = 'rgba(100, 200, 255, 0.8)';
            ctx.shadowBlur = 10;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Add pulsing dots along the connection
            if (distance < 150) {
              const steps = 4;
              for (let step = 1; step < steps; step++) {
                const t = step / steps;
                const x = node.x + (otherNode.x - node.x) * t;
                const y = node.y + (otherNode.y - node.y) * t;
                const dotPulse = Math.sin(Date.now() * 0.004 + step * 0.5) * 0.4 + 0.6;

                ctx.beginPath();
                ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(100, 200, 255, ${alpha * 0.7 * dotPulse})`;
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

        const handleDemoCodeSubmit = (code, errorData) => {
      if (errorData && errorData.error) {
        // Show error message in toast
        toast.error("Invalid demo code. Please try again.");
        setDemoCodeError("Invalid demo code. Please try again.");
        return;
      }
      
      // DemoCode component now handles validation
      setDemoCodeError('');
      setIsDemoCodeOpen(false);
      setIsPagesAnalyzerOpen(true);
    };

  const handleDemoCodeClose = () => {
    setIsDemoCodeOpen(false);
    setDemoCodeError('');
  };

  const handleStartAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate analysis progress
    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsAnalyzing(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <section id="damp-mould-analyzer" className="py-8 sm:py-10 md:py-12 lg:py-16 bg-gradient-to-br from-[#1e3a8a] via-[#1e40af] to-[#3b82f6] relative overflow-hidden">
      {/* Analysis Network Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full opacity-30"
        style={{ zIndex: 1 }}
      />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-10 md:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 text-center text-white leading-tight">
              AI-Powered Damp & Mould Image Analysis
            </h2>

            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl max-w-2xl sm:max-w-3xl mx-auto leading-relaxed font-medium text-blue-100 px-2 sm:px-0">
              Advanced technology to detect, analyze and prevent damp and mould issues
            </p>
          </div>

          {/* Features List */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 text-center">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-blue-200 mb-6 sm:mb-8 underline">
              Key Features:
            </h3>
            <ul className="space-y-4 max-w-2xl mx-auto list-none">
              {analysisFeatures.map((feature, index) => (
                <li key={index} className="text-sm sm:text-base md:text-lg text-blue-100 leading-relaxed font-medium group-hover:text-white transition-colors duration-300">
                  {feature}
                </li>
              ))}
            </ul>
          </div>



          {/* Start Analyzing Button */}
          <div className="text-center">
            <Button
              onClick={() => setIsDemoCodeOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-4 px-10 rounded-full text-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-xl border-2 border-blue-500 hover:from-blue-600 hover:to-blue-700"
            >
              Start Image Analyser
            </Button>
          </div>
        </div>
      </div>

      {/* Demo Code Modal */}
      <DemoCode
        isOpen={isDemoCodeOpen}
        onClose={handleDemoCodeClose}
        onSubmit={handleDemoCodeSubmit}
        error={demoCodeError}
        useCase="analyzer"
        onRequestDemo={() => {
          setIsDemoCodeOpen(false);
          // You can add logic here to redirect to demo request page
        }}
      />

      {/* Pages Analyzer Modal */}
      <PagesAnalyzer
        isOpen={isPagesAnalyzerOpen}
        onClose={() => setIsPagesAnalyzerOpen(false)}
      />
    </section>
  );
}