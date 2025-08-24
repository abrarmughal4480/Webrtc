"use client"
import React, { useState } from 'react';
import { requestDemoRequest } from '@/http/authHttp';

export default function DemoCode({ 
  isOpen, 
  onClose, 
  onSubmit, 
  error, 
  onRequestDemo,
  useCase = 'karla'
}) {
  const [demoCodeBlocks, setDemoCodeBlocks] = useState(['', '', '', '']);
  const [isDemoRequestOpen, setIsDemoRequestOpen] = useState(false);
  const [demoName, setDemoName] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleDemoCodeChange = (index, value) => {
    const newBlocks = [...demoCodeBlocks];
    newBlocks[index] = value.toUpperCase();
    setDemoCodeBlocks(newBlocks);
    
    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`demo-code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleDemoCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !demoCodeBlocks[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      const prevInput = document.getElementById(`demo-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Valid demo codes for different use cases
  const validDemoCodes = {
    karla: ['7002'],
    analyzer: ['6868', '6869', '6870', '6871', '6872', '6873', '6874', '6875', '6876', '6877', '6878', '6879', '6880']
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = demoCodeBlocks.join('');
    
    // Validate the code based on use case
    const currentValidCodes = validDemoCodes[useCase] || validDemoCodes.karla;
    
    if (code.length === 4) {
      if (currentValidCodes.some(validCode => validCode.includes(code))) {
        // Store demo code in localStorage for analyzer use case
        if (useCase === 'analyzer') {
          localStorage.setItem('analyzerDemoCode', code);
          console.log('Demo code stored:', code);
        }
        onSubmit(code);
      } else {
        // Show error message for invalid code
        const errorMessage = `Invalid demo code for ${useCase === 'analyzer' ? 'Image Analyzer' : 'Chat Karla'}. Please try again.`;
        // Pass error back to parent component to display in toast
        onSubmit(code, { error: errorMessage });
      }
    } else {
      const errorMessage = 'Please enter a complete 4-character demo code.';
      onSubmit(code, { error: errorMessage });
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
        email: demoEmail.trim(),
        useCase: useCase // Send the useCase to backend
      });
      
      if (response.data.success) {
        setSubmitMessage('Thank you! Your demo code has been sent to your email.');
        setDemoName('');
        setDemoEmail('');
        
        // Close the popup after 3 seconds
        setTimeout(() => {
          setIsDemoRequestOpen(false);
          setSubmitMessage('');
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

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-none"></div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
          {/* Purple header strip above modal */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-base sm:text-lg font-bold text-center">
                {useCase === 'analyzer' ? 'Enter Image Analyser Demo Code' : 'Enter Demo Code'}
              </span>
            </div>
            <button
              onClick={onClose}
              className="absolute right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-2 rounded-full shadow"
              aria-label="Close"
            >
              <span style={{fontWeight: 'bold', fontSize: 20}}>×</span>
            </button>
          </div>
          <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
            <form className="space-y-4 w-full" onSubmit={handleSubmit}>
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
              {error && <div className="text-red-600 text-xs font-semibold text-center">{error}</div>}
              <button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full"
              >
                {useCase === 'analyzer' ? 'Start Analysis' : 'Start Chat'}
              </button>
            </form>
            
            {/* Link to request demo code */}
            <div className="text-center mt-1 pt-1">
              <p className="text-sm text-gray-600">
                Don't have a demo code?{' '}
                <button
                  onClick={() => setIsDemoRequestOpen(true)}
                  className="text-purple-600 hover:text-purple-700 font-semibold underline transition-colors"
                >
                  Request one here
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Request Modal */}
      {isDemoRequestOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[250] pointer-events-none"></div>
          <div className="fixed inset-0 z-[300] flex items-center justify-center">
            <div className="min-w-[0] max-w-[95vw] w-full sm:w-[500px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
              {/* Purple header strip above modal */}
              <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-base sm:text-lg font-bold text-center">Request Demo Code</span>
                </div>
                <button
                  onClick={() => setIsDemoRequestOpen(false)}
                  className="absolute right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-2 rounded-full shadow"
                  aria-label="Close"
                >
                  <span style={{fontWeight: 'bold', fontSize: 20}}>×</span>
                </button>
              </div>
              <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
                <form className="space-y-4 w-full" onSubmit={handleDemoRequest}>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Name</label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                      value={demoName}
                      onChange={(e) => setDemoName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                    <input
                      type="email"
                      placeholder="Enter your work email address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none bg-white"
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  {submitMessage && (
                    <div className={`text-sm font-semibold text-center p-3 rounded-lg w-full ${
                      submitMessage.includes('Thank you') 
                        ? 'bg-green-50 text-green-700 border border-green-200' 
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {submitMessage}
                    </div>
                  )}
                  
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-semibold px-4 py-3 rounded-full transition-all w-full flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending Request...
                      </>
                    ) : (
                      'Request Demo Code'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
