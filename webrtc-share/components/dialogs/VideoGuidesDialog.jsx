import React, { useState, useEffect, useRef } from 'react';
import { X, Play, Clock, BookOpen, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const VideoGuidesDialog = ({ open, setOpen }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoDurations, setVideoDurations] = useState({});
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showPlayOverlay, setShowPlayOverlay] = useState(false);
  const videoRefs = useRef({});
  const fallbackTimerRef = useRef(null);
  const iframeRef = useRef(null);

  // Video guides data with Google Drive embeds
  const videoGuides = [
    {
      id: 1,
      title: "Launching a New Video Link",
      description: "Learn the basics of using Videodesk for video calls and sharing",
      thumbnail: "https://drive.google.com/thumbnail?id=1UYVX7P5_QDluYAtcxuEi7zvcqJlYCdbT&sz=w400",
      embedUrl: "https://drive.google.com/file/d/1UYVX7P5_QDluYAtcxuEi7zvcqJlYCdbT/preview",
      videoUrl: "https://drive.google.com/uc?export=download&id=1UYVX7P5_QDluYAtcxuEi7zvcqJlYCdbT",
      // Alternative embed URL that might work better
      alternativeEmbedUrl: "https://drive.google.com/embed?authuser=0&id=1UYVX7P5_QDluYAtcxuEi7zvcqJlYCdbT",
    }
  ];

  // Function to format duration from seconds to MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Function to calculate video duration
  const calculateVideoDuration = (videoId, videoUrl) => {
    if (!videoRefs.current[videoId]) return;

    const video = videoRefs.current[videoId];
    
    const handleLoadedMetadata = () => {
      const duration = video.duration;
      setVideoDurations(prev => ({
        ...prev,
        [videoId]: formatDuration(duration)
      }));
    };

    const handleError = () => {
      console.log(`Could not load video ${videoId} for duration calculation`);
      setVideoDurations(prev => ({
        ...prev,
        [videoId]: "0:00"
      }));
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    
    // Set video source
    video.src = videoUrl;
    video.load();

    // Cleanup
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  };

  // Handle video selection
  const handleVideoSelect = (video) => {
    console.log('Video selected:', video.title);
    
    // Clear any existing fallback timer
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }

    setSelectedVideo(video);
    setIsVideoLoading(true);
    setLoadError(false);
    
    // Immediately try to load the iframe
    if (iframeRef.current) {
      const embedUrl = `${video.embedUrl}`;
      iframeRef.current.src = embedUrl;
      console.log('Loading video with URL:', embedUrl);
    }
    
    // Fallback: Reset loading after 10 seconds to prevent infinite loading
    fallbackTimerRef.current = setTimeout(() => {
      console.log('Fallback timer triggered - video failed to load');
      setIsVideoLoading(false);
      setLoadError(true);
    }, 10000);
  };

  // Retry loading video
  const handleRetryLoad = () => {
    if (selectedVideo && iframeRef.current) {
      setIsVideoLoading(true);
      setLoadError(false);
      
      // Try alternative URL if available
      const newSrc = selectedVideo.alternativeEmbedUrl || selectedVideo.embedUrl;
      const embedUrl = `${newSrc}`;
      
      console.log('Retrying with URL:', embedUrl);
      
      // Force reload the iframe with new URL
      iframeRef.current.src = '';
      setTimeout(() => {
        iframeRef.current.src = embedUrl;
      }, 200);
      
      // Reset fallback timer
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
      }
      fallbackTimerRef.current = setTimeout(() => {
        console.log('Retry fallback timer triggered');
        setIsVideoLoading(false);
        setLoadError(true);
      }, 10000);
    }
  };

  // Handle iframe load events
  const handleIframeLoad = () => {
    console.log('Iframe loaded successfully');
    // Clear the fallback timer since iframe loaded successfully
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsVideoLoading(false);
    setLoadError(false);
    
    // Show play overlay after iframe loads
    setTimeout(() => {
      setShowPlayOverlay(true);
    }, 500);
  };

  const handleIframeError = () => {
    console.error('Iframe failed to load');
    // Clear the fallback timer since iframe failed to load
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsVideoLoading(false);
    setLoadError(true);
  };

  // Function to handle play button click
  const handlePlayClick = () => {
    setShowPlayOverlay(false);
    // Try to focus the iframe and send a click event
    if (iframeRef.current) {
      iframeRef.current.focus();
      // Create a click event at the center of the iframe
      const rect = iframeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Simulate a click at the center of the iframe
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: centerX,
        clientY: centerY
      });
      
      iframeRef.current.dispatchEvent(clickEvent);
    }
  };

  // Calculate durations when popup opens
  useEffect(() => {
    if (open) {
      videoGuides.forEach(video => {
        calculateVideoDuration(video.id, video.videoUrl);
      });
    }
  }, [open]);

  // Cleanup fallback timer when dialog closes
  useEffect(() => {
    if (!open) {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      setIsVideoLoading(false);
      setLoadError(false);
    }
  }, [open]);

  // Handle iframe loading when selectedVideo changes
  useEffect(() => {
    if (selectedVideo && iframeRef.current && open) {
      console.log('useEffect: Selected video changed, loading iframe...');
      const embedUrl = `${selectedVideo.embedUrl}`;
      iframeRef.current.src = embedUrl;
    }
  }, [selectedVideo?.id, open]); // Changed dependency to selectedVideo?.id

  // Ensure iframe is loaded when dialog opens with selected video
  useEffect(() => {
    if (open && selectedVideo && iframeRef.current) {
      console.log('Dialog opened with selected video, ensuring iframe is loaded...');
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (iframeRef.current) {
          const embedUrl = `${selectedVideo.embedUrl}`;
          iframeRef.current.src = embedUrl;
        }
      }, 100);
    }
  }, [open, selectedVideo?.id]);

  if (!open) return null;

  return createPortal(
    <>
      {/* Hidden video elements for duration calculation */}
      <div style={{ display: 'none' }}>
        {videoGuides.map(video => (
          <video
            key={video.id}
            ref={el => videoRefs.current[video.id] = el}
            preload="metadata"
            muted
          />
        ))}
      </div>

      {/* Enhanced Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150] transition-all duration-300" 
        onClick={() => setOpen(false)}
      />
      
      {/* Enhanced Modal */}
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-gray-100 transform transition-all duration-300 scale-100">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-purple-700/20"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold">How to Video Guides</h2>
                  <p className="text-purple-100 text-sm mt-1">Master Videodesk with our comprehensive tutorials</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-3 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
                aria-label="Close dialog"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          {/* Enhanced Content */}
          <div className="max-h-[calc(95vh-120px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Enhanced Video Player - Right Side */}
              <div className="lg:col-span-2 p-6 bg-gray-50">
                <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-xl border-4 border-gray-800 relative">
                  {selectedVideo ? (
                    <>
                      {isVideoLoading && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                          <div className="text-center text-white">
                            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                            <p className="text-lg">Loading video...</p>
                          </div>
                        </div>
                      )}
                      {loadError && (
                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                          <div className="text-center text-white">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                              <X className="w-8 h-8 text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Failed to Load Video</h3>
                            <p className="text-gray-300 mb-4">The video couldn't be loaded. Please try again.</p>
                            <div className="space-y-3">
                              <button
                                onClick={handleRetryLoad}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                              >
                                Retry
                              </button>
                              <button
                                onClick={() => {
                                  if (iframeRef.current) {
                                    const embedUrl = `${selectedVideo.embedUrl}`;
                                    iframeRef.current.src = embedUrl;
                                    setIsVideoLoading(true);
                                    setLoadError(false);
                                  }
                                }}
                                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200 ml-2"
                              >
                                Manual Load
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      <iframe
                        key={selectedVideo.id}
                        ref={iframeRef}
                        title={selectedVideo.title}
                        className="w-full h-full min-h-[400px]"
                        frameBorder="0"
                        allowFullScreen
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope"
                        onLoad={handleIframeLoad}
                        onError={handleIframeError}
                        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                      />
                    </>
                  ) : (
                    <div className="w-full min-h-[400px] flex items-center justify-center text-white bg-gradient-to-br from-gray-900 to-gray-800">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                          <Play className="w-10 h-10 text-white ml-1" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Select a Video Guide</h3>
                        <p className="text-gray-300">Choose from our collection of tutorials to get started</p>
                      </div>
                    </div>
                  )}
                </div>
                {selectedVideo && (
                  <div className="mt-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">{selectedVideo.title}</h3>
                      </div>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{selectedVideo.description}</p>
                  </div>
                )}
              </div>

              {/* Enhanced Video List - Left Side */}
              <div className="lg:col-span-1 p-6 bg-white">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Available Guides</h3>
                  <p className="text-gray-600 text-sm">Click on any video to start learning</p>
                </div>
                <div className="space-y-4">
                  {videoGuides.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => {
                        console.log('Thumbnail clicked for video:', video.title);
                        handleVideoSelect(video);
                      }}
                      className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group ${
                        selectedVideo?.id === video.id 
                          ? 'border-purple-500 bg-purple-50 shadow-lg' 
                          : 'border-gray-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-800 ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-gray-800 text-sm mb-2 leading-tight">{video.title}</h4>
                        <p className="text-gray-600 text-xs leading-relaxed">{video.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default VideoGuidesDialog; 