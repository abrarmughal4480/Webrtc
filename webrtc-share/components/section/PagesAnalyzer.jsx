"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from '@/components/ui/button';

const AFFECTED_COLOURS = {
  Walls: "bg-blue-50 border-blue-200 text-blue-800",
  Ceiling: "bg-indigo-50 border-indigo-200 text-indigo-800",
  Floor: "bg-amber-50 border-amber-200 text-amber-800",
  Windows: "bg-cyan-50 border-cyan-200 text-cyan-800",
  Doors: "bg-emerald-50 border-emerald-200 text-emerald-800",
  Corners: "bg-pink-50 border-pink-200 text-pink-800",
};

export default function PagesAnalyzer({ isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({}); // Store individual results for each image
  const [error, setError] = useState(null);
  const [analyzingImage, setAnalyzingImage] = useState(null); // Track which image is being analyzed

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

  const onFileChange = (e) => {
    const list = Array.from(e.target.files || []);
    // If there are existing files, append new ones; otherwise replace
    setFiles(prevFiles => [...prevFiles, ...list]);
  };

  const handleDrop = (e) => {
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

  const handleAnalyze = async () => {
    setError(null);

    if (!files.length) {
      setError("Please upload at least one photo.");
      return;
    }

    // Analyze each image individually
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
        setResults(prev => ({
          ...prev,
          [i]: {
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
            thumb: thumbs[i],
            fileIndex: i,
          }
        }));
      } catch (e) {
        console.error(`Analysis error for image ${i}:`, e);
        setResults(prev => ({
          ...prev,
          [i]: {
            error: e.message || "Failed to analyze this photo",
            analysedAt: new Date().toLocaleString(),
            thumb: thumbs[i],
            fileIndex: i,
          }
        }));
      }
    }
    setAnalyzingImage(null);
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
        throw new Error(errorData?.error || `HTTP ${res.status}: ${res.statusText}`);
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
          thumb: thumbs[imageIndex],
          fileIndex: imageIndex,
        }
      }));
    } catch (e) {
      console.error(`Analysis error for image ${imageIndex}:`, e);
      setResults(prev => ({
        ...prev,
        [imageIndex]: {
          error: e.message || "Failed to analyze this photo",
          analysedAt: new Date().toLocaleString(),
          thumb: thumbs[imageIndex],
          fileIndex: imageIndex,
        }
      }));
    } finally {
      setAnalyzingImage(null);
    }
  };

  const speakRef = useRef(null);
  const handleSpeak = () => {
    if (!result) return;
    const synth = window.speechSynthesis;
    if (!synth) return alert("Speech synthesis not supported in this browser.");

    const voices = synth.getVoices();
    let voice =
      voices.find((v) => /en-GB|British/i.test(v.lang) || /UK|British/i.test(v.name)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null;

    const affectedLine = result.affected?.length ? result.affected.join(", ") : "none";
    const text = `Severity: ${result.severity || "unknown"}. Confidence ${result.confidence ?? 0} percent. Affected areas: ${affectedLine}. Summary: ${result.summary}`;

    const utter = new SpeechSynthesisUtterance(text);
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;
    utter.lang = voice?.lang || "en-GB";
    synth.cancel();
    synth.speak(utter);
    speakRef.current = utter;
  };

  const stopSpeak = () => {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
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
                          onClick={() => setFiles([])}
                          className="text-red-600 hover:text-red-700 text-sm font-medium hover:bg-red-50 px-3 py-1 rounded-md transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {thumbs.map((src, i) => (
                          <div key={i} className="relative rounded-lg border border-gray-200 overflow-hidden group">
                            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-32 object-cover" />
                            <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                 onClick={() => setFiles(files.filter((_, index) => index !== i))}>
                              ×
                            </div>
                            <div className="text-xs text-gray-600 px-2 py-1 bg-white/80">Photo {i + 1}</div>
                            
                            {/* Individual Analyze Button */}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2">
                              {results[i] ? (
                                <div className="text-center">
                                  <span className="text-xs">✓ Analyzed</span>
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
                 "All Photos Analyzed ✓"
               ) : (
                 "Analyze All Photos"
               )}
             </Button>
             
             <Button
               onClick={resetForm}
               variant="outline"
               className="px-6 py-3 rounded-lg font-medium border-gray-300 hover:bg-gray-50"
             >
               Clear
             </Button>
            
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              ⚠️ {error}
            </div>
          )}

          {/* Individual Results */}
          {Object.keys(results).length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-gray-800 text-center">📊 Individual Image Analysis Results</h3>
              
              {Object.entries(results).map(([imageIndex, result]) => (
                <div key={imageIndex} className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="max-w-[794px] mx-auto">
                    {/* Image Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
                        <img src={result.thumb} alt={`Photo ${parseInt(imageIndex) + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-800">Photo {parseInt(imageIndex) + 1}</h4>
                        <p className="text-sm text-gray-600">Analyzed at: {result.analysedAt}</p>
                      </div>
                    </div>

                    {result.error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                        ⚠️ {result.error}
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
                          <p className="text-xs text-orange-600 font-medium">💡 Please upload photos of:</p>
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
                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                          <div className="text-sm bg-white px-3 py-2 rounded-lg border">
                            <b>🎯 Confidence:</b> {result.confidence ?? "—"}%
                          </div>
                          <div>{severityPill(result.severity)}</div>
                        </div>

                        <hr className="my-4 border-dashed border-gray-300" />

                        {/* Affected areas */}
                        <div className="text-sm bg-white px-3 py-2 rounded-lg border mb-4">
                          <b>📍 Affected areas:</b>{" "}
                          {result.affected?.length ? result.affected.join(", ") : "—"}
                        </div>

                        {/* Summary */}
                        <hr className="my-4 border-dashed border-gray-300" />
                        <div className="font-semibold text-lg mb-3">📋 Analysis Summary</div>
                        <div className="bg-white p-4 rounded-lg border">
                          <p className="leading-7 whitespace-pre-wrap text-gray-800">{result.summary}</p>
                        </div>
                      </>
                    )}

                    {/* Footer note */}
                    <hr className="my-4 border-dashed border-gray-300" />
                    <p className="text-gray-500 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      ⚠️ This is a visual assessment based on the uploaded photo and any notes provided. 
                      For a full survey, consider a site visit and moisture readings.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
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
