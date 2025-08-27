"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from '@/components/ui/button';
import { saveFeedbackRequest, removeFeedbackRequest } from '@/http';
import { createAnalyserSession, uploadAnalyserImages, saveAnalysisResults, updateAnalysisFeedback } from '@/http/analyzerHttp';
import { useUser } from '@/provider/UserProvider';

const AFFECTED_COLOURS = {
  Walls: "bg-blue-50 border-blue-200 text-blue-800",
  Ceiling: "bg-indigo-50 border-indigo-200 text-indigo-800",
  Floor: "bg-amber-50 border-amber-200 text-amber-800",
  Windows: "bg-cyan-50 border-cyan-200 text-cyan-800",
  Doors: "bg-emerald-50 border-emerald-200 text-emerald-800",
  Corners: "bg-pink-50 border-pink-200 text-pink-800",
};

export default function PagesAnalyzer({ isOpen, onClose }) {
  const { user, isAuth } = useUser();
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({}); // Store individual results for each image
  const [error, setError] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(null); // Track which image is being analyzed
  const [expandedImage, setExpandedImage] = useState(null); // Track which image is expanded
  const [isAudioPlaying, setIsAudioPlaying] = useState(false); // Track audio playing status
  const [analyzerSessionId, setAnalyzerSessionId] = useState(null); // Store analyzer session ID
  const [isSessionCreated, setIsSessionCreated] = useState(false); // Track if session is created
  const [isSavingToBackend, setIsSavingToBackend] = useState(false); // Track backend save status
  const [saveSuccess, setSaveSuccess] = useState(false); // Track if save was successful
  const [demoCode, setDemoCode] = useState(''); // Store the demo code that was entered

  const analysedAt = useMemo(() => {
    return new Date().toLocaleString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [Object.keys(results).length]);

  const thumbs = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  // Store thumb URLs in results to prevent them from being lost
  const getThumbUrl = (index) => {
    // First check if we have a stored thumb in results
    if (results[index]?.thumb) {
      return results[index].thumb;
    }
    // Fallback to thumbs array
    if (thumbs[index]) {
      return thumbs[index];
    }
    // If still no thumb, try to create one from files
    if (files[index]) {
      const newUrl = URL.createObjectURL(files[index]);
      return newUrl;
    }
    return '';
  };

  useEffect(() => {
    return () => thumbs.forEach((u) => URL.revokeObjectURL(u));
  }, [thumbs]);

  // Prevent background scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup when component unmounts
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Load voices for speech synthesis
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;

      const voices = window.speechSynthesis.getVoices();
      // Find the best British female voice
      const britishVoice = voices.find(v =>
        /en-GB/i.test(v.lang) &&
        (v.name.includes('Female') || v.name.includes('female') || v.name.includes('Samantha') || v.name.includes('Victoria'))
      ) || voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));

      if (britishVoice) {
      } else {
      }
    };

    // Load voices immediately if available
    loadVoices();

    // Also listen for voices loaded event
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Load demo code from localStorage when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedDemoCode = localStorage.getItem('analyzerDemoCode');
      if (storedDemoCode) {
        setDemoCode(storedDemoCode);
      }
    }
  }, []);

  const onFileChange = async (e) => {
    const list = Array.from(e.target.files || []);
    // If there are existing files, append new ones; otherwise replace
    setFiles(prevFiles => [...prevFiles, ...list]);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files || []);
    const imageFiles = list.filter(file =>
      file.type.startsWith('image/') &&
      (file.type.includes('jpeg') || file.type.includes('png'))
    );
    if (imageFiles.length > 0) {
      // If there are existing files, append new ones; otherwise replace
      setFiles(prevFiles => [...prevFiles, ...imageFiles]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Create analyzer session - but don't create it immediately
  const createAnalyzerSessionHandler = async () => {
    // Don't create session yet - wait for analyze button click
  };

  const handleAnalyze = async () => {
    setError(null);

    if (!files.length) {
      setError("Please upload at least one photo.");
      return;
    }

    // Get demo code from localStorage or prompt user
    let currentDemoCode = demoCode;
    if (!currentDemoCode) {
      // Try to get from localStorage
      const storedDemoCode = localStorage.getItem('analyzerDemoCode');
      if (storedDemoCode) {
        currentDemoCode = storedDemoCode;
        setDemoCode(storedDemoCode);
      } else {
        setError("Please enter a demo code first.");
        return;
      }
    }

    // Store all analysis results in a temporary array
    const analysisResults = [];

    // Analyze each image individually FIRST
    for (let i = 0; i < files.length; i++) {
      if (results[i]) continue; // Skip if already analyzed

      setAnalyzingImage(i);
      try {
        const imageDataUrl = await fileToDataUrl(files[i]);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: [imageDataUrl],
            notes: notes || `Analysis for Photo ${i + 1}`
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.error || `HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        // Store result in temporary array
        const resultData = {
          summary: data.summary,
          severity: data.severity,
          confidence: data.confidence,
          affected: data.affected || [],
          analysedAt: new Date().toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          thumb: imageDataUrl,
          fileIndex: i,
        };

        analysisResults.push(resultData);

        // Also update the state
        setResults(prev => ({
          ...prev,
          [i]: resultData
        }));

      } catch (e) {
        const errorResult = {
          error: e.message || "Failed to analyze this photo",
          analysedAt: new Date().toLocaleString(),
          thumb: thumbs[i] || '',
          fileIndex: i,
        };

        analysisResults.push(errorResult);

        setResults(prev => ({
          ...prev,
          [i]: errorResult
        }));
      }
    }
    setAnalyzingImage(null);

    // NOW create session and save everything to backend
    if (analysisResults.length > 0) {
      try {
        setIsSavingToBackend(true);

        // Create session with demo code (no email required)
        const sessionData = {
          userEmail: `demo_${currentDemoCode}@analyzer.com`, // Use demo code as identifier
          notes: notes || `Analysis session with demo code: ${currentDemoCode}`,
          demoCode: currentDemoCode
        };

        const sessionResponse = await createAnalyserSession(sessionData);

        if (sessionResponse.success) {
          const sessionId = sessionResponse.data.sessionId;
          setAnalyzerSessionId(sessionId);
          setIsSessionCreated(true);

          // Upload images to the new session
          const fileObjects = files.filter(file => file instanceof File);
          if (fileObjects.length > 0) {
            try {
              await uploadAnalyserImages(sessionId, fileObjects);
            } catch (uploadError) {
              throw new Error('Image upload failed');
            }
          }

          // Save analysis results
          try {
            await saveAnalysisResults(sessionId, analysisResults);
          } catch (saveError) {
            throw new Error('Analysis results save failed');
          }

          // Show success message to user
          setError(null);
          setSaveSuccess(true);
          // Hide success message after 5 seconds
          setTimeout(() => setSaveSuccess(false), 5000);
        } else {
          throw new Error('Session creation failed');
        }
      } catch (error) {
        setError('Analysis completed but failed to save data to server. Please try again.');
      } finally {
        setIsSavingToBackend(false);
      }
    }
  };

  const handleAnalyzeSingle = async (imageIndex) => {
    setError(null);
    setAnalyzingImage(imageIndex);

    try {
      const imageDataUrl = await fileToDataUrl(files[imageIndex]);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: [imageDataUrl],
          notes: notes || `Analysis for Photo ${imageIndex + 1}`
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error('Analysis request failed');
      }

      const data = await res.json();
      setResults(prev => ({
        ...prev,
        [imageIndex]: {
          summary: data.summary,
          severity: data.severity,
          confidence: data.confidence,
          affected: data.affected || [],
          analysedAt: new Date().toLocaleString(undefined, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          thumb: imageDataUrl,
          fileIndex: imageIndex,
        }
      }));
    } catch (e) {
      console.error(`Analysis error for image ${imageIndex}:`, e);
      setResults(prev => ({
        ...prev,
        [imageIndex]: {
          error: "Failed to analyze this photo",
          analysedAt: new Date().toLocaleString(),
          thumb: thumbs[imageIndex] || '',
          fileIndex: imageIndex,
        }
      }));
    } finally {
      setAnalyzingImage(null);
    }
  };

  const speakRef = useRef(null);

  // Function to speak only the summary
  const handleSpeakSummary = (summary) => {
    if (!summary) return;

    // Check if speech synthesis is supported
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAudioPlaying(false);
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      setIsAudioPlaying(false);
      return;
    }

    // Immediately set audio playing state for instant button change
    setIsAudioPlaying(true);

    try {
      let voices = synth.getVoices();

      // If no voices are loaded yet, wait for them
      if (voices.length === 0) {
        synth.addEventListener('voiceschanged', () => {
          voices = synth.getVoices();
          proceedWithSummarySpeech(voices, summary, synth);
        }, { once: true });
        return;
      }

      proceedWithSummarySpeech(voices, summary, synth);

    } catch (error) {
      speakRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const handleSpeak = (result) => {
    if (!result) return;

    // Check if speech synthesis is supported
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsAudioPlaying(false);
      return;
    }

    const synth = window.speechSynthesis;
    if (!synth) {
      setIsAudioPlaying(false);
      return;
    }

    // Immediately set audio playing state for instant button change
    setIsAudioPlaying(true);

    try {
      let voices = synth.getVoices();

      // If no voices are loaded yet, wait for them
      if (voices.length === 0) {
        synth.addEventListener('voiceschanged', () => {
          voices = synth.getVoices();
          proceedWithSpeech(voices, result, synth);
        }, { once: true });
        return;
      }

      proceedWithSpeech(voices, result, synth);

    } catch (error) {
      speakRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const proceedWithSummarySpeech = (voices, summary, synth) => {
    try {
      // Log all available voices for debugging
      console.log('🎤 Available voices for summary speech:', voices.map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
        voiceURI: v.voiceURI
      })));

      // Always prioritize Microsoft Sonia Online (Natural) - English (United Kingdom)
      let voice = voices.find(v => 
        v.name === "Microsoft Sonia Online (Natural) - English (United Kingdom)" ||
        v.voiceURI === "Microsoft Sonia Online (Natural) - English (United Kingdom)"
      );

      // Fallback to any Microsoft voice if Sonia not found
      if (!voice) {
        voice = voices.find(v => 
          v.voiceURI?.includes('Microsoft') && /en-GB/i.test(v.lang)
        );
      }

      // Final fallback to any British voice
      if (!voice) {
        voice = voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
      }

      // Log the selected voice details
      if (voice) {
        console.log('🔊 Selected voice for summary speech:', {
          name: voice.name,
          lang: voice.lang,
          default: voice.default,
          localService: voice.localService,
          voiceURI: voice.voiceURI,
          company: voice.voiceURI?.includes('Microsoft') ? 'Microsoft' : 
                   voice.voiceURI?.includes('Apple') ? 'Apple' : 
                   voice.voiceURI?.includes('Google') ? 'Google' : 
                   voice.voiceURI?.includes('Amazon') ? 'Amazon' : 'Unknown'
        });
      } else {
        console.log('⚠️ No suitable voice found for summary speech');
      }

      const text = `Summary: ${summary}`;

      const utter = new SpeechSynthesisUtterance(text);

      if (voice) {
        utter.voice = voice;
      }

      // Optimize for British accent
      utter.rate = 0.85; // Slightly slower for clarity
      utter.pitch = 1.05; // Slightly higher pitch for female voice
      utter.lang = voice?.lang || "en-GB";

      // Stop any current speech
      synth.cancel();

      // Add event listeners for better control
      utter.onend = () => {
        speakRef.current = null;
        setIsAudioPlaying(false); // Reset state when audio ends
      };

      utter.onerror = (event) => {
        speakRef.current = null;
        setIsAudioPlaying(false); // Reset state on error
      };

      // Start new speech
      synth.speak(utter);
      speakRef.current = utter;

    } catch (error) {
      speakRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const proceedWithSpeech = (voices, result, synth) => {
    try {
      // Log all available voices for debugging
      console.log('🎤 Available voices for full speech:', voices.map(v => ({
        name: v.name,
        lang: v.lang,
        default: v.default,
        localService: v.localService,
        voiceURI: v.voiceURI
      })));

      // Always prioritize Microsoft Sonia Online (Natural) - English (United Kingdom)
      let voice = voices.find(v => 
        v.name === "Microsoft Sonia Online (Natural) - English (United Kingdom)" ||
        v.voiceURI === "Microsoft Sonia Online (Natural) - English (United Kingdom)"
      );

      // Fallback to any Microsoft voice if Sonia not found
      if (!voice) {
        voice = voices.find(v => 
          v.voiceURI?.includes('Microsoft') && /en-GB/i.test(v.lang)
        );
      }

      // Final fallback to any British voice
      if (!voice) {
        voice = voices.find(v => /en-GB/i.test(v.lang)) || voices.find(v => /^en/i.test(v.lang));
      }

      // Log the selected voice details
      if (voice) {
        console.log('🔊 Selected voice for full speech:', {
          name: voice.name,
          lang: voice.lang,
          default: voice.default,
          localService: voice.localService,
          voiceURI: voice.voiceURI,
          company: voice.voiceURI?.includes('Microsoft') ? 'Microsoft' : 
                   voice.voiceURI?.includes('Apple') ? 'Apple' : 
                   voice.voiceURI?.includes('Google') ? 'Google' : 
                   voice.voiceURI?.includes('Amazon') ? 'Amazon' : 'Unknown'
        });
      } else {
        console.log('⚠️ No suitable voice found for full speech');
      }

      const affectedLine = result.affected?.length ? result.affected.join(", ") : "none";
      const text = `Analysis Results. Severity: ${result.severity || "unknown"}. Confidence: ${result.confidence ?? 0} percent. Affected areas: ${affectedLine}. Summary: ${result.summary}`;

      const utter = new SpeechSynthesisUtterance(text);

      if (voice) {
        utter.voice = voice;
      }

      // Optimize for British accent
      utter.rate = 0.85; // Slightly slower for clarity
      utter.pitch = 1.05; // Slightly higher pitch for female voice
      utter.lang = voice?.lang || "en-GB";

      // Stop any current speech
      synth.cancel();

      // Add event listeners for better control
      utter.onend = () => {
        speakRef.current = null;
        setIsAudioPlaying(false); // Reset state when audio ends
      };

      utter.onerror = (event) => {
        speakRef.current = null;
        setIsAudioPlaying(false); // Reset state on error
      };

      // Start new speech
      synth.speak(utter);
      speakRef.current = utter;

    } catch (error) {
      speakRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const stopSpeak = () => {
    try {
      const synth = window.speechSynthesis;
      if (synth) {
        synth.cancel();
        speakRef.current = null;
        setIsAudioPlaying(false); // Immediately reset state for instant button change
      }
    } catch (error) {
      // Even if there's an error, reset the state
      speakRef.current = null;
      setIsAudioPlaying(false);
    }
  };

  const handleFeedback = async (imageIndex, type) => {
    // Get current result data
    const currentResult = results[imageIndex];
    if (!currentResult) return;

    // IMMEDIATE UI UPDATE - No waiting for API
    if (type === currentResult.feedback) {
      // User is unchecking the same feedback - remove it immediately
      setResults(prev => ({
        ...prev,
        [imageIndex]: {
          ...prev[imageIndex],
          feedback: null
        }
      }));
    } else {
      // User is giving new feedback or changing feedback - update immediately
      setResults(prev => ({
        ...prev,
        [imageIndex]: {
          ...prev[imageIndex],
          feedback: type
        }
      }));
    }

    // Now make API call in background (async)
    try {
      // Save feedback to analyzer backend if session exists
      if (analyzerSessionId) {
        try {
          await updateAnalysisFeedback(analyzerSessionId, imageIndex, type);
        } catch (error) {
          // Silent fail
        }
      }

      // Also save to existing feedback system for backward compatibility
      // Determine user email - either from logged in user or guest
      let userEmail = 'guest@anonymous.com';

      if (isAuth && user) {
        userEmail = user.email;
      } else {
        // Fallback: check localStorage as well
        const localStorageUser = window.localStorage.getItem('user');
        const localStorageToken = window.localStorage.getItem('token');

        if (localStorageUser && localStorageToken) {
          try {
            const user = JSON.parse(localStorageUser);
            userEmail = user.email;
          } catch (error) {
            // Silent fail
          }
        }
      }

      // Always save feedback regardless of login status
      // Use existing analysisId or generate new one
      let analysisId = currentResult.analysisId;
      if (!analysisId) {
        analysisId = `analysis_${Date.now()}_${imageIndex}`;
        setResults(prev => ({
          ...prev,
          [imageIndex]: {
            ...prev[imageIndex],
            analysisId
          }
        }));
      }

      // Get image data - convert blob URL to base64
      const imageUrl = getThumbUrl(imageIndex);
      let imageData = imageUrl;

      if (imageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          imageData = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          // Silent fail
        }
      }

      // Prepare analysis response data
      const analysisResponse = {
        summary: currentResult.summary,
        severity: currentResult.severity,
        confidence: currentResult.confidence,
        affected: currentResult.affected || [],
        analysedAt: currentResult.analysedAt
      };

      if (type === currentResult.feedback) {
        // User is unchecking the same feedback - remove it
        try {
          await removeFeedbackRequest({
            userEmail,
            imageIndex,
            analysisId
          });
        } catch (error) {
          // Silent fail
        }
      } else {
        // User is giving new feedback or changing feedback
        try {
          await saveFeedbackRequest({
            userEmail,
            imageIndex,
            analysisId,
            feedbackType: type,
            imageData,
            analysisResponse
          });
        } catch (error) {
          // Silent fail
        }
      }
    } catch (error) {
      // Silent fail - no user notification as requested
    }
  };

  const severityPill = (label) => {
    const { bg, fg } = severityColours(label);
    return (
      <span className={`inline-block rounded-full px-3 py-1 border text-sm font-semibold`} style={{ background: bg, color: fg, borderColor: "rgba(0,0,0,0.08)" }}>
        Severity: {label || "—"}
      </span>
    );
  };

  const resetForm = () => {
    setFiles([]);
    setNotes("");
    setResults({});
    setError(null);
    setAnalyzingImage(null);
    setAnalyzerSessionId(null);
    setIsSessionCreated(false);
    setSaveSuccess(false);
    setIsSavingToBackend(false);
    // Don't clear demo code - keep it for next analysis
  };

  const clearEverything = () => {
    setFiles([]);
    setNotes("");
    setResults({});
    setError(null);
    setAnalyzingImage(null);
    setAnalyzerSessionId(null);
    setIsSessionCreated(false);
    setSaveSuccess(false);
    setIsSavingToBackend(false);
    setDemoCode('');
    localStorage.removeItem('analyzerDemoCode');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-1 sm:p-2 md:p-4 border-b border-green-500 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">Damp & Mould Image Analyser</h2>
            <p className="text-green-100 mt-1 sm:mt-2 text-sm sm:text-base">Upload photos and get AI-powered analysis with printable reports</p>
            {isSavingToBackend && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-200 text-xs">
                  Saving data to server...
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 text-white p-2 sm:p-3 rounded-full transition-colors absolute right-4"
          >
            <svg className="w-5 h-5 sm:w-6 sm:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6 w-full max-w-4xl mx-auto">
          {/* Upload photos */}
          <div className="mb-6">
            {files.length === 0 && (
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-green-400 transition-colors max-w-xl mx-auto"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  onChange={onFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <svg className="w-16 h-16 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 text-sm">Click to select photos or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">Only JPG and PNG images supported • Multiple images allowed</p>
                </label>
              </div>
            )}

            {files.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Selected Photos ({files.length})</p>
                  <button
                    onClick={resetForm}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 px-3 py-1 rounded-md transition-colors"
                  >
                    Clear Analysis
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {thumbs.map((src, i) => (
                    <div key={i} className="relative rounded-lg border border-gray-200 overflow-hidden group">
                      <img src={src} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover" />

                      {/* Maximize Icon */}
                      <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                        onClick={() => setExpandedImage({ src, index: i, filename: `Photo ${i + 1}` })}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </div>

                      {/* Remove Icon */}
                      <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        onClick={() => setFiles(files.filter((_, index) => index !== i))}>
                        ×
                      </div>
                      <div className="text-xs text-gray-600 px-2 py-1 bg-white/80">Photo {i + 1}</div>

                      {/* Individual Analyze Button */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                        {results[i] ? (
                          <div className="text-center">
                            <span className="text-xs flex items-center justify-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Analyzed
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAnalyzeSingle(i)}
                            disabled={analyzingImage === i}
                            className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 rounded transition-colors disabled:opacity-50"
                          >
                            {analyzingImage === i ? 'Analyzing...' : 'Analyze'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center">
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    multiple
                    onChange={onFileChange}
                    className="hidden"
                    id="add-more-files"
                  />
                  <label htmlFor="add-more-files" className="cursor-pointer inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-sm hover:bg-green-50 px-4 py-2 rounded-md transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add More Photos
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <Button
              onClick={handleAnalyze}
              disabled={Object.keys(results).length === files.length}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
            >
              {Object.keys(results).length === files.length ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All Photos Analyzed
                </span>
              ) : (
                "Analyze All Photos"
              )}
            </Button>

            <Button
              onClick={resetForm}
              variant="outline"
              className="px-6 py-3 rounded-lg font-medium border-gray-300 hover:bg-gray-50"
            >
              Clear Analysis
            </Button>

            {/* Removed Test Backend Button */}

          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {error}
              </span>
            </div>
          )}

          {/* Individual Results */}
          {Object.keys(results).length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 text-center flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Individual Image Analysis Results
              </h3>

              {Object.entries(results).map(([imageIndex, result]) => (
                <div key={imageIndex} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="max-w-[794px] mx-auto">


                    {/* Three Column Layout */}
                    <div className="flex flex-col md:flex-row items-center justify-center gap-0 mb-6">
                      {/* Column 1: Photo */}
                      <div className="flex flex-col items-center px-6 w-full md:w-1/4">
                        <div className="w-full max-w-40 h-28 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0 relative group">
                          {getThumbUrl(parseInt(imageIndex)) ? (
                            <img src={getThumbUrl(parseInt(imageIndex))} alt={`Photo ${parseInt(imageIndex) + 1}`} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                          {/* Maximize Icon for Result Image */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-blue-600"
                              onClick={() => {
                                const thumbUrl = getThumbUrl(parseInt(imageIndex));
                                if (thumbUrl) {
                                  setExpandedImage({ src: thumbUrl, index: parseInt(imageIndex), filename: `Photo ${parseInt(imageIndex) + 1}` });
                                }
                              }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-center">Photo {parseInt(imageIndex) + 1}</p>
                      </div>

                      {/* Vertical Divider Line 1 */}
                      <div className="hidden md:block w-px h-40 bg-gray-300 mx-2"></div>

                      {/* Column 2: Confidence */}
                      <div className="flex flex-col items-center px-6 w-full md:w-1/4">
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-200 mb-3">
                          <h4 className="text-lg font-semibold text-center">Confidence:</h4>
                        </div>
                        <div className="w-full max-w-40 h-28 flex flex-col items-center justify-center">
                          {result.error ? (
                            <div className="text-center">
                              <p className="text-red-600 font-medium">Error</p>
                            </div>
                          ) : result.isInvalid ? (
                            <div className="text-center">
                              <p className="text-orange-600 font-medium">Invalid</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-3xl font-bold text-green-600">{result.confidence ?? "—"}%</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vertical Divider Line 2 */}
                      <div className="hidden md:block w-px h-40 bg-gray-300 mx-2"></div>

                      {/* Column 3: Severity */}
                      <div className="flex flex-col items-center px-6 w-full md:w-1/4">
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-200 mb-3">
                          <h4 className="text-lg font-semibold text-center">Severity:</h4>
                        </div>
                        <div className="w-full max-w-40 h-28 flex flex-col items-center justify-center">
                          {result.error ? (
                            <div className="text-center">
                              <p className="text-red-600 font-medium">Error</p>
                            </div>
                          ) : result.isInvalid ? (
                            <div className="text-center">
                              <p className="text-orange-600 font-medium">Invalid</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-xl font-bold text-center px-2" style={{
                                color: severityColours(result.severity).fg
                              }}>{result.severity || "—"}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vertical Divider Line 3 */}
                      <div className="hidden md:block w-px h-40 bg-gray-300 mx-2"></div>

                      {/* Column 4: Affected Areas */}
                      <div className="flex flex-col items-center px-6 w-full md:w-1/4">
                        <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg border border-gray-200 mb-3">
                          <h4 className="text-lg font-semibold text-center">Affected Areas:</h4>
                        </div>
                        <div className="w-full max-w-40 h-28 flex flex-col items-center justify-center">
                          {result.error ? (
                            <div className="text-center">
                              <p className="text-red-600 font-medium">Error</p>
                            </div>
                          ) : result.isInvalid ? (
                            <div className="text-center">
                              <p className="text-orange-600 font-medium">Invalid</p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <span className="text-lg font-semibold text-gray-800 text-center px-2">{result.affected?.length ? result.affected.join(", ") : "—"}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>


                    {result.error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        <span className="flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          {result.error}
                        </span>
                      </div>
                    ) : result.isInvalid ? (
                      <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="font-semibold">Invalid Image for Analysis</span>
                        </div>
                        <p className="text-sm">{result.summary}</p>
                        <div className="mt-3 p-3 bg-white rounded border">
                          <p className="text-xs text-orange-600 font-medium flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 11.707-1.414" />
                            </svg>
                            Please upload photos of:
                          </p>
                          <ul className="text-xs text-orange-600 mt-1 ml-4 list-disc">
                            <li>Walls, ceilings, or floors with moisture damage</li>
                            <li>Areas with visible mould growth</li>
                            <li>Windows or doors with damp issues</li>
                            <li>Building corners with water ingress</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Summary */}
                        <hr className="my-4 border-dashed border-gray-300" />
                        <div className="flex items-center justify-between mb-3">
                          <div className="font-semibold text-lg flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Analysis Summary
                          </div>

                          {/* Audio Button - Right Side */}
                          {!isAudioPlaying ? (
                            <button
                              onClick={() => handleSpeakSummary(result.summary)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                              Listen
                            </button>
                          ) : (
                            <button
                              onClick={stopSpeak}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                              </svg>
                              Stop
                            </button>
                          )}
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="leading-7 whitespace-pre-wrap text-gray-800">{result.summary}</p>
                        </div>

                        {/* Feedback Section */}
                        <div className="mt-4 flex items-center justify-end">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 mr-2">Rate this analysis</span>
                            <button
                              onClick={() => handleFeedback(parseInt(imageIndex), 'thumbsUp')}
                              className={`p-2 rounded-lg transition-colors duration-200 ${result.feedback === 'thumbsUp'
                                  ? 'text-green-600 bg-green-50'
                                  : 'text-slate-500 hover:text-green-600 hover:bg-green-50'
                                }`}
                              title="Helpful Analysis"
                            >
                              <svg className="w-5 h-5" fill={result.feedback === 'thumbsUp' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleFeedback(parseInt(imageIndex), 'thumbsDown')}
                              className={`p-2 rounded-lg transition-colors duration-200 ${result.feedback === 'thumbsDown'
                                  ? 'text-red-600 bg-red-50'
                                  : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                                }`}
                              title="Not Helpful Analysis"
                            >
                              <svg className="w-5 h-5" fill={result.feedback === 'thumbsDown' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Footer note */}
                    <hr className="my-4 border-dashed border-gray-300" />
                    <p className="text-gray-500 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200 flex items-start gap-2">
                      <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      This is a visual assessment based on the uploaded photo and any notes provided.
                      For a full survey, consider a site visit and moisture readings.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {expandedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 md:p-4">
          <div className="relative max-w-full md:max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {/* Image container */}
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Close button */}
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute top-4 right-4 z-10 p-2.5 md:p-3 bg-red-600 hover:bg-red-700 text-white rounded-full border-2 border-white/80 transition-all duration-300 hover:scale-110 flex items-center justify-center w-8 md:w-10 h-8 md:h-10 backdrop-blur-sm shadow-lg"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={expandedImage.src}
                alt={expandedImage.filename}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                onClick={() => setExpandedImage(null)}
              />
              {/* Image info */}
              <div className="absolute bottom-2 md:bottom-4 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded-full px-4 md:px-6 py-2 md:py-3">
                <p className="text-white text-xs md:text-sm font-medium">{expandedImage.filename}</p>
              </div>
            </div>
          </div>
          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setExpandedImage(null)}
          ></div>
        </div>
      )}
    </div>
  );
}

// --- utils ---
async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function severityColours(label) {
  const l = (label || "").toLowerCase();
  if (l.startsWith("no")) return { bg: "#e8f5e9", fg: "#1b5e20" };
  if (l.startsWith("light")) return { bg: "#fff8e1", fg: "#8d6e00" };
  if (l.startsWith("moderate")) return { bg: "#fff3e0", fg: "#e65100" };
  if (l.startsWith("severe")) return { bg: "#ffebee", fg: "#b71c1c" };
  if (l.startsWith("critical")) return { bg: "#fce4ec", fg: "#880e4f" };
  return { bg: "#e9ecef", fg: "#222" };
}
