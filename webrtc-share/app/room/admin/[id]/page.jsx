"use client"
import { useState, useRef, use, useEffect, useCallback } from "react"
import { Trash2, Plus, Maximize2, VideoIcon, PlayIcon, Save, Edit, Minimize2, Expand, ZoomIn, ZoomOut, Pencil, X, Play, ChevronDown, Eraser, Palette, RotateCcw, Loader2 } from "lucide-react"
import useWebRTC from "@/hooks/useWebRTC"
import useDrawingTools from "@/hooks/useDrawingTools"
import { createRequest, getMeetingByMeetingId, deleteRecordingRequest, deleteScreenshotRequest } from "@/http/meetingHttp"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDialog } from "@/provider/DilogsProvider"
import { Button } from "@/components/ui/button"
import { logoutRequest } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"

export default function Page({ params }) {
  if (!params) {
    console.error('Missing params in Page component');
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p>Loading...</p>
      </div>
    );
  }

  const resolvedParams = use(params);
  const id = resolvedParams?.id;
  
  if (!id) {
    console.error('Missing meeting ID');
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p>Invalid meeting ID</p>
      </div>
    );
  }

  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [targetTime, setTargetTime] = useState("Emergency 24 Hours")
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTTDropdown, setShowTTDropdown] = useState(null);
  const [selectedTTValues, setSelectedTTValues] = useState({});
  const [residentName, setResidentName] = useState("")
  const [residentAddress, setResidentAddress] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [addressLine3, setAddressLine3] = useState("")
  const [addressLines, setAddressLines] = useState([])
  const [workDetails, setWorkDetails] = useState([])
  const [workDetail1, setWorkDetail1] = useState("")
  const [workDetail2, setWorkDetail2] = useState("")
  const [workDetail3, setWorkDetail3] = useState("")
  const [postCode, setPostCode] = useState("")
  const [actualPostCode, setActualPostCode] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [repairDetails, setRepairDetails] = useState("")
  const [specialNotes, setSpecialNotes] = useState("")
  const [showSpecialNotes, setShowSpecialNotes] = useState(false)
  const [callDuration, setCallDuration] = useState(0);
  const [existingMeetingData, setExistingMeetingData] = useState(null);
  const [isLoadingMeetingData, setIsLoadingMeetingData] = useState(true);
  const [existingScreenshots, setExistingScreenshots] = useState([]);

  // Screenshot saved status tracking - single source of truth
  const [screenshotSavedStatus, setScreenshotSavedStatus] = useState(new Map());

  const [maximizedItem, setMaximizedItem] = useState(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isEndingSave, setIsEndingSave] = useState(false);
  const [isEndingVideo, setIsEndingVideo] = useState(false);
  const [savingRecordingId, setSavingRecordingId] = useState(null);
  const [savingScreenshotIndex, setSavingScreenshotIndex] = useState(null);
  const [savingScreenshotIds, setSavingScreenshotIds] = useState(new Set());

  const [saveInProgress, setSaveInProgress] = useState(false);
  const saveTimeoutRef = useRef(null);
  const processedItemsRef = useRef(new Set());

  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState([]);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordingStream, setRecordingStream] = useState(null);
  const [playingVideos, setPlayingVideos] = useState(new Set());
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [currentRecordingDuration, setCurrentRecordingDuration] = useState(0);

  const [videoProgress, setVideoProgress] = useState({});

  const [activePencilScreenshot, setActivePencilScreenshot] = useState(null);
  const [showPencilDropdown, setShowPencilDropdown] = useState(null);
  const [tokenLandlordInfo, setTokenLandlordInfo] = useState(null);
  const [isLoadingTokenInfo, setIsLoadingTokenInfo] = useState(true);
  const {
    colors,
    tools,
    selectedColor,
    setSelectedColor,
    selectedTool,
    setSelectedTool,
    lineWidth,
    setLineWidth,
    initializeCanvas,
    startDrawing,
    draw,
    stopDrawing,
    clearCanvas,
    mergeWithBackground,
    drawingData
  } = useDrawingTools();

  const videoRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const recordingChunks = useRef([]);
  const recordingTimerRef = useRef(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [videoPanX, setVideoPanX] = useState(0);
  const [videoPanY, setVideoPanY] = useState(0);

  const { handleDisconnect, isConnected, screenshots, takeScreenshot, startPeerConnection, deleteScreenshot, handleVideoPlay, showVideoPlayError, isCapturingScreenshot } = useWebRTC(true, id, videoRef);
  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setFeedbackOpen, setFaqOpen, setShareLinkOpen, setInviteOpen } = useDialog(); const { user, isAuth, setIsAuth, setUser } = useUser();  const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 });

  const ttOptions = [
    "Emergency 24 Hours",
    "Urgent (7 Days)",
    "Routine (28 Days)",
    "Follow Up Work",
    "Other"
  ];
  const handleTTDropdownToggle = (fieldId) => {
    setShowTTDropdown(showTTDropdown === fieldId ? null : fieldId);
  };

  const handleTTOptionSelect = (fieldId, option) => {
    setSelectedTTValues(prev => ({
      ...prev,
      [fieldId]: option
    }));
    setShowTTDropdown(null);
  };

  const getTTDisplayText = (fieldId) => {
    const selected = selectedTTValues[fieldId];
    if (!selected) return 'T T';
    
    return selected.substring(0, 3) + '...';
  };

  const addAddressLine = () => {
    setAddressLines(prev => [...prev, ""]);
  };
  const updateAddressLine = (index, value) => {
    setAddressLines(prev => {
      const newLines = [...prev];
      newLines[index] = value;
      return newLines;
    });
  };
  
  const removeAddressLine = (index) => {
    setAddressLines(prev => prev.filter((_, i) => i !== index));
  };

  const addWorkDetail = () => {
    setWorkDetails(prev => [...prev, ""]);
  };
  const updateWorkDetail = (index, value) => {
    setWorkDetails(prev => {
      const newDetails = [...prev];
      newDetails[index] = value;
      return newDetails;
    });
  };

  const removeWorkDetail = (index) => {
    setWorkDetails(prev => prev.filter((_, i) => i !== index));
  };

  const handleEndVideo = async () => {
    try {
      console.log('End Video button clicked - disconnecting without redirect');
      
      handleDisconnect(false);
      
    } catch (error) {
      console.error('Error ending video:', error);
    }
  };

  const handleSaveAndRedirect = async (saveAction) => {
    try {
      setIsEndingVideo(true);
      
      if (saveAction) {
        await saveAction();
      }
      
      handleDisconnect(true);
      
    } catch (error) {
      console.error('Error in save and redirect:', error);
      setIsEndingVideo(false);
    }
  };

  useEffect(() => {
    try {
      setIsClient(true);
    } catch (error) {
      console.error('Error setting isClient:', error);
    }
  }, []);
  useEffect(() => {
    if (!isClient || !id) return;

    const fetchExistingMeetingData = async () => {
      setIsLoadingMeetingData(true);
      try {
        console.log('Fetching existing meeting data for ID:', id);
        const response = await getMeetingByMeetingId(id);

        if (response?.data?.success && response?.data?.meeting) {
          const meetingData = response.data.meeting;
          console.log('Found existing meeting data:', meetingData);          setResidentName(meetingData.name || "");
          setResidentAddress(meetingData.address || "");
          setAddressLine1(meetingData.address_line_1 || "");
          setAddressLine2(meetingData.address_line_2 || "");
          setAddressLine3(meetingData.address_line_3 || "");
          setAddressLines(meetingData.additional_address_lines || []);
          setPostCode(meetingData.reference || "");
          setActualPostCode(meetingData.post_code || "");
          setPhoneNumber(meetingData.phone_number || "");          setRepairDetails(meetingData.repair_detail || "");
          setTargetTime(meetingData.target_time || "Emergency 24 Hours");
          setSpecialNotes(meetingData.special_notes || "");
          
          // Load work details if they exist
          if (meetingData.work_details && Array.isArray(meetingData.work_details)) {
            // Load work details and separate static fields from dynamic ones
            let workDetail1Text = "";
            let workDetail2Text = "";
            let workDetail3Text = "";
            const additionalWorkDetails = [];
            const ttValues = {};
            
            meetingData.work_details.forEach((wd, index) => {
              if (wd.detail) {
                if (wd.detail === meetingData.repair_detail) {
                  ttValues['field1'] = wd.target_time || "Emergency 24 Hours";
                } else {
                  if (!workDetail1Text) {
                    workDetail1Text = wd.detail;
                    ttValues['field1'] = wd.target_time || "Emergency 24 Hours";
                  } else if (!workDetail2Text) {
                    workDetail2Text = wd.detail;
                    ttValues['field2'] = wd.target_time || "Emergency 24 Hours";
                  } else if (!workDetail3Text) {
                    workDetail3Text = wd.detail;
                    ttValues['field3'] = wd.target_time || "Emergency 24 Hours";
                  } else {
                    additionalWorkDetails.push(wd.detail);
                    ttValues[`workDetail${additionalWorkDetails.length - 1}`] = wd.target_time || "Emergency 24 Hours";
                  }
                }
              }
            });
            
            setWorkDetail1(workDetail1Text);
            setWorkDetail2(workDetail2Text);
            setWorkDetail3(workDetail3Text);
            setWorkDetails(additionalWorkDetails);
            setSelectedTTValues(ttValues);
          }

          if (meetingData.recordings && meetingData.recordings.length > 0) {
            const existingRecordings = meetingData.recordings.map(rec => ({
              id: rec._id || Date.now() + Math.random(),
              url: rec.url,
              blob: null,
              timestamp: new Date(rec.timestamp).toLocaleString(),
              duration: rec.duration || 0,
              isExisting: true
            }));
            setRecordings(existingRecordings);
          }

          if (meetingData.screenshots && meetingData.screenshots.length > 0) {
            const existingScreenshotsData = meetingData.screenshots.map(screenshot => ({
              id: screenshot._id || Date.now() + Math.random(),
              url: screenshot.url,
              timestamp: new Date(screenshot.timestamp).toLocaleString(),
              isExisting: true
            }));
            setExistingScreenshots(existingScreenshotsData);
            console.log('📸 Loaded existing screenshots:', existingScreenshotsData.length);
          }

          setExistingMeetingData(meetingData);

          toast.success("Meeting data loaded successfully!", {
            description: `Found ${meetingData.recordings?.length || 0} recordings and ${meetingData.screenshots?.length || 0} screenshots`
          });
        }
      } catch (error) {
        // Handle different types of errors gracefully
        if (error.code === 'ERR_NETWORK') {
          console.log('Cannot connect to server - this is normal if server is starting up');
        } else if (error?.response?.status === 404) {
          console.log('No existing meeting data found for ID:', id, '(This is normal for new meetings)');
        } else if (error?.response?.status === 500) {
          console.log('Server error while fetching meeting data - this may be temporary');
        } else if (error.code === 'ECONNABORTED') {
          console.log('Request timeout while fetching meeting data');
        } else {
          console.log('Error fetching meeting data:', error.message);
        }
      } finally {
        setIsLoadingMeetingData(false);
        setIsLoadingTokenInfo(false);
      }
    };

    fetchExistingMeetingData();
  }, [id, isClient]);
  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const debouncedSave = useCallback((saveFunction) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (!saveInProgress) {
        saveFunction();
      }    }, 300);
  }, [saveInProgress]);

  const isSaveDisabled = useCallback(() => {
    return (
      (!isConnected && recordings.length === 0 && screenshots.length === 0) ||
      isSaving ||
      isEndingSave ||
      saveInProgress
    );
  }, [isConnected, recordings.length, screenshots.length, isSaving, isEndingSave, saveInProgress]);
  const performSave = useCallback(async (options = {}) => {
    const { disconnectVideo = false } = options;

    console.log('Starting save process...');

    const newRecordings = recordings.filter(recording => !recording.isExisting && recording.blob);
    const existingRecordings = recordings.filter(recording => recording.isExisting);

    const recordingsData = [];
    const processedRecordings = new Set();

    for (let i = 0; i < newRecordings.length; i++) {
      const recording = newRecordings[i];
      const recordingKey = `${recording.id}-${recording.timestamp}`;

      if (processedRecordings.has(recordingKey)) {
        console.log('Skipping duplicate recording:', recordingKey);
        continue;
      }

      processedRecordings.add(recordingKey);

      try {
        const base64Data = await blobToBase64(recording.blob);
        recordingsData.push({
          data: base64Data,
          timestamp: recording.timestamp,
          duration: recording.duration || Math.floor((recording.blob.size / 1000) / 16),
          size: recording.blob.size
        });
        console.log(`✅ NEW recording ${i + 1} processed successfully`);
      } catch (error) {
        console.error(`❌ Error processing NEW recording ${i + 1}:`, error);
      }
    }

    const screenshotsData = [];
    const processedScreenshots = new Set();

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];

      let screenshotIdentifier;
      let screenshotData;
      let screenshotId;

      if (typeof screenshot === 'object' && screenshot !== null) {
        screenshotIdentifier = screenshot.id || screenshot.data?.substring(0, 50) || `screenshot-${i}`;
        screenshotData = screenshot.data || screenshot;
        screenshotId = screenshot.id || `screenshot-${screenshot.timestamp || Date.now()}-${Math.random()}`;
      } else if (typeof screenshot === 'string') {
        screenshotIdentifier = screenshot.substring(0, 50);
        screenshotData = screenshot;
        screenshotId = `screenshot-${i}-${Date.now()}-${Math.random()}`;
      } else {
        screenshotIdentifier = `screenshot-${i}`;
        screenshotData = `fallback-screenshot-${i}`;
        screenshotId = `screenshot-${i}-${Date.now()}-${Math.random()}`;
      }

      // Check if this screenshot is already saved
      if (getScreenshotStatus(screenshotId)) {
        console.log('⚠️ Skipping already saved screenshot:', screenshotId);
        continue;
      }

      const screenshotKey = `screenshot-${i}-${screenshotIdentifier}`;

      if (processedScreenshots.has(screenshotKey)) {
        console.log('Skipping duplicate screenshot:', screenshotKey);
        continue;
      }

      processedScreenshots.add(screenshotKey);

      try {
        let finalScreenshotData = typeof screenshotData === 'string' ? screenshotData : String(screenshotData);
        if (finalScreenshotData.indexOf('#') > 0) {
          finalScreenshotData = finalScreenshotData.split('#')[0]; // Clean URL
        }

        // FIXED: Use screenshotId as canvasId to match the drawing system
        const canvasId = screenshotId;

        console.log(`Checking for drawings in canvas ${canvasId} for screenshot ${i + 1}`);
        console.log('Available drawing data keys:', Object.keys(drawingData));

        let hasDrawings = false;
        if (drawingData[canvasId] && drawingData[canvasId].strokes && drawingData[canvasId].strokes.length > 0) {
          console.log(`Found ${drawingData[canvasId].strokes.length} strokes for screenshot ${i + 1}. Merging drawings...`);
          try {
            const mergedData = await mergeWithBackground(finalScreenshotData, canvasId);
            if (mergedData && mergedData !== finalScreenshotData) {
              finalScreenshotData = mergedData;
              hasDrawings = true;
              console.log(`Drawing merge completed for screenshot ${i + 1}`);
            } else {
              console.log(`Merge returned same data for screenshot ${i + 1}`);
            }
          } catch (mergeError) {
            console.error(`Error merging drawings for screenshot ${i + 1}:`, mergeError);
          }
        } else {
          const alternativeCanvasIds = [
            `new-${i}`,
            `screenshot-${i}`,
            screenshotIdentifier
          ];

          for (const altCanvasId of alternativeCanvasIds) {
            if (drawingData[altCanvasId] && drawingData[altCanvasId].strokes && drawingData[altCanvasId].strokes.length > 0) {
              console.log(`Found drawings in alternative canvas ID: ${altCanvasId} for screenshot ${i + 1}`);
              try {
                const mergedData = await mergeWithBackground(finalScreenshotData, altCanvasId);
                if (mergedData && mergedData !== finalScreenshotData) {
                  finalScreenshotData = mergedData;
                  hasDrawings = true;
                  console.log(`Drawing merge completed using alternative ID ${altCanvasId} for screenshot ${i + 1}`);
                  break;
                }
              } catch (mergeError) {
                console.error(`Error merging drawings with alternative ID ${altCanvasId}:`, mergeError);
              }
            }
          }

          if (!hasDrawings) {
            console.log(`No drawings found for screenshot ${i + 1} (tried canvas IDs: ${canvasId}, ${alternativeCanvasIds.join(', ')})`);
          }
        }

        screenshotsData.push({
          data: finalScreenshotData,
          timestamp: new Date().toISOString(),
          size: finalScreenshotData.length,
          hasDrawings: hasDrawings,
          originalIndex: i,
          canvasId: canvasId,
          originalScreenshotId: screenshotId
        });

        console.log(`✅ Screenshot ${i + 1} processed successfully with drawings: ${hasDrawings}`);
      } catch (error) {
        console.error(`❌ Error processing screenshot ${i + 1}:`, error);
        // Fallback handling for invalid screenshot data
        let fallbackData;
        try {
          fallbackData = typeof screenshotData === 'object' ? JSON.stringify(screenshotData) : String(screenshotData);
          if (typeof fallbackData === 'string' && fallbackData.indexOf('#') > 0) {
            fallbackData = fallbackData.split('#')[0];
          }
        } catch (fallbackError) {
          console.error('Failed to create fallback screenshot data:', fallbackError);
          fallbackData = `fallback-screenshot-${i}`;
        }

        screenshotsData.push({
          data: fallbackData,
          timestamp: new Date().toISOString(),
          size: typeof fallbackData === 'string' ? fallbackData.length : 0,
          hasDrawings: false,
          originalIndex: i,
          canvasId: screenshotId,
          originalScreenshotId: screenshotId
        });
      }
    }    const formData = {
      meeting_id: id,
      name: residentName,
      address: residentAddress,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      address_line_3: addressLine3,
      additional_address_lines: addressLines.filter(line => line && line.trim() !== ''),
      post_code: actualPostCode, // Save the actual postcode
      phone_number: phoneNumber, // Save the phone number
      reference: postCode, // Save the reference field
      repair_detail: repairDetails,      work_details: [
        // Include the main repair detail as the first work detail (only if not empty)
        ...(repairDetails && repairDetails.trim() ? [{
          detail: repairDetails.trim(),
          target_time: selectedTTValues['field1'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        // Add static work detail fields if they have content
        ...(workDetail1 && workDetail1.trim() ? [{
          detail: workDetail1.trim(),
          target_time: selectedTTValues['field1'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...(workDetail2 && workDetail2.trim() ? [{
          detail: workDetail2.trim(),
          target_time: selectedTTValues['field2'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...(workDetail3 && workDetail3.trim() ? [{
          detail: workDetail3.trim(),
          target_time: selectedTTValues['field3'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        // Additional dynamic work details (only non-empty ones)
        ...workDetails
          .filter(detail => detail && detail.trim() !== '')
          .map((detail, index) => ({
            detail: detail.trim(),
            target_time: selectedTTValues[`workDetail${index}`] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }))
      ],
      target_time: targetTime,
      special_notes: specialNotes,
      recordings: recordingsData,
      screenshots: screenshotsData,
      update_mode: existingMeetingData ? 'update' : 'create'
    };

    console.log('📤 Sending data to server...');
    console.log('📋 Form data summary:', {
      meeting_id: id,
      update_mode: formData.update_mode,
      new_recordings_count: recordingsData.length,
      new_screenshots_count: screenshotsData.length,
      screenshots_with_drawings: screenshotsData.filter(s => s.hasDrawings).length,
      existing_recordings_count: existingRecordings.length,
      total_recordings_after_save: existingRecordings.length + recordingsData.length
    });

    try {
      const response = await createRequest(formData);
      console.log('✅ Save successful!');
      
      // Check for upload summary in response to show detailed toast
      if (response?.data?.upload_summary || response?.data?.media_summary) {
        const summary = response.data.upload_summary || response.data.media_summary;
        const recordingsUploaded = summary.recordings_uploaded || summary.new_recordings_added || 0;
        const recordingsAttempted = summary.recordings_attempted || recordingsData.length;
        const screenshotsUploaded = summary.screenshots_uploaded || summary.new_screenshots_added || 0;
        const screenshotsAttempted = summary.screenshots_attempted || screenshotsData.length;
        
        // Calculate success and failure counts
        const recordingsFailed = recordingsAttempted - recordingsUploaded;
        const screenshotsFailed = screenshotsAttempted - screenshotsUploaded;
        const totalSuccessful = recordingsUploaded + screenshotsUploaded;
        const totalFailed = recordingsFailed + screenshotsFailed;
        
        // Show appropriate toast based on results
        if (totalFailed === 0 && totalSuccessful > 0) {
          // All successful
          toast.success("All content saved successfully!", {
            description: `${screenshotsUploaded} screenshots and ${recordingsUploaded} recordings saved.`
          });
        } else if (totalSuccessful > 0 && totalFailed > 0) {
          // Partial success
          let description = `${totalSuccessful} items saved successfully.`;
          if (recordingsFailed > 0) {
            description += ` ${recordingsFailed} recording(s) failed (file too large - max 10MB).`;
          }
          if (screenshotsFailed > 0) {
            description += ` ${screenshotsFailed} screenshot(s) failed.`;
          }
          
          toast.warning("Partial save completed", {
            description: description
          });
        } else if (totalFailed > 0 && totalSuccessful === 0) {
          // All failed
          let description = "Save failed. ";
          if (recordingsFailed > 0) {
            description += `${recordingsFailed} recording(s) too large (max 10MB). `;
          }
          if (screenshotsFailed > 0) {
            description += `${screenshotsFailed} screenshot(s) failed. `;
          }
          description += "Try reducing file sizes.";
          
          toast.error("Save failed", {
            description: description
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Save failed:', error);
      
      // Handle specific error types
      if (error?.response?.data?.message?.includes('File size too large')) {
        toast.error("Recording too large", {
          description: "Video file exceeds 10MB limit. Try recording shorter videos or reduce quality."
        });
      } else if (error?.response?.data?.message?.includes('timeout')) {
        toast.error("Upload timeout", {
          description: "Upload took too long. Please try again with smaller files."
        });
      } else {
        toast.error("Save failed", {
          description: error?.response?.data?.message || error.message || "Please try again."
        });
      }
      
      // Re-throw the error so calling functions can handle it
      throw error;
    }

    setActivePencilScreenshot(null);
    setShowPencilDropdown(null);

    screenshotsData.forEach(screenshot => {
      if (screenshot.canvasId && drawingData[screenshot.canvasId]) {
        console.log('🧹 Clearing drawing data for:', screenshot.canvasId);
        delete drawingData[screenshot.canvasId];
      }
      // Mark each screenshot as saved using its original identifier
      if (screenshot.originalScreenshotId) {
        markScreenshotAsSaved(screenshot.originalScreenshotId);
        console.log('✅ Marked screenshot as saved:', screenshot.originalScreenshotId);
      }
    });

    setRecordings(prev => prev.map(rec => ({
      ...rec,
      isExisting: true
    })));

    if (screenshotsData.length > 0) {
      const newSavedScreenshots = screenshotsData.map((screenshot, index) => ({
        id: `saved-${Date.now()}-${index}-${Math.random()}`, // Add random to ensure uniqueness
        url: screenshot.data,
        timestamp: new Date(screenshot.timestamp).toLocaleString(),
        isExisting: true,
        hasDrawings: screenshot.hasDrawings,
        quality: 'high'
      }));

      setExistingScreenshots(prev => {
        const existingUrls = new Set(prev.map(s => s.url));
        const uniqueNewScreenshots = newSavedScreenshots.filter(s => !existingUrls.has(s.url));

        if (uniqueNewScreenshots.length !== newSavedScreenshots.length) {
          console.log('⚠️ Filtered out duplicate screenshots');
        }

        return [...prev, ...uniqueNewScreenshots];
      });

      const screenshotCount = screenshots.length;
      for (let i = screenshotCount - 1; i >= 0; i--) {
        deleteScreenshot(i);
      }
      console.log(`🧹 Cleared ${screenshotCount} screenshots from new screenshots array`);
    }

    if (!existingMeetingData) {
      setExistingMeetingData({
        meeting_id: id,
        name: residentName,
        address: residentAddress,
        post_code: actualPostCode,
        reference: postCode,
        repair_detail: repairDetails,
        target_time: targetTime
      });
    }

    return { recordingsData, screenshotsData };
  }, [
    recordings, screenshots, drawingData, mergeWithBackground, deleteScreenshot,
    id, residentName, residentAddress, actualPostCode, postCode, repairDetails, targetTime, existingMeetingData,
    workDetail1, workDetail2, workDetail3, workDetails, selectedTTValues, addressLine1, addressLine2, addressLine3, addressLines, phoneNumber, specialNotes
  ]);

  const handleZoomIn = () => {
    setZoomLevel(prev => {
      const newZoom = Math.min(prev + 0.25, 3); // Max zoom 3x
      console.log('Zooming in to:', newZoom);
      return newZoom;
    });
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - 0.25, 0.5); // Min zoom 0.5x
      console.log('Zooming out to:', newZoom);

      // Reset pan when zooming out to 1x
      if (newZoom <= 1) {
        setVideoPanX(0);
        setVideoPanY(0);
      }

      return newZoom;
    });
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setVideoPanX(0);
    setVideoPanY(0);
    console.log('Zoom reset to 1x');
  };

  // Add pan functionality for when zoomed in
  const handleVideoPan = (e) => {
    if (zoomLevel <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate pan offset based on mouse position
    const panX = (centerX - mouseX) * 0.5;
    const panY = (centerY - mouseY) * 0.5;

    setVideoPanX(panX);
    setVideoPanY(panY);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle zoom shortcuts when not in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoomIn();
            break;
          case '-':
            e.preventDefault();
            handleZoomOut();
            break;
          case '0':
            e.preventDefault();
            handleZoomReset();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isConnected) {
      setZoomLevel(1);
      setVideoPanX(0);
      setVideoPanY(0);
    }
  }, [isConnected]);

  const handleEndVideoAndSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }

    if (isEndingSave || isSaving || saveInProgress) {
      console.log('⚠️ End video save already in progress');
      return;
    }

    try {
      setSaveInProgress(true);
      setIsEndingSave(true);
      console.log('🎬 Starting End Video and Save process...');

      if (isConnected) {
        handleDisconnect();
      }

      if (isRecording) {
        stopScreenRecording();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = await performSave({ disconnectVideo: true });

      // Success toast is now handled inside performSave based on response
      console.log('✅ Video ended and content saved');
      
      setIsLoadingMeetingData(false);
      setSaveInProgress(false);
      setIsEndingSave(false);
      
      router.push("/dashboard");

    } catch (error) {
      console.error('❌ End Video and Save failed:', error);
      
      // Only show toast if performSave didn't already handle it
      if (!error?.handledByPerformSave) {
        toast.error("Failed to end video and save content", {
          description: error?.response?.data?.message || error.message || "Please try again."
        });
      }
    } finally {
      setIsEndingSave(false);
      setSaveInProgress(false);
    }
  };

  const handleSave = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }

    if (isSaving || isEndingSave || saveInProgress) {
      console.log('⚠️ Save already in progress');
      return;
    }

    try {
      setSaveInProgress(true);
      setIsSaving(true);

      const result = await performSave();

      // Success toast is now handled inside performSave based on response
      console.log('✅ Save operation completed');

    } catch (error) {
      console.error('❌ Save failed:', error);
      
      // Only show toast if performSave didn't already handle it
      if (!error?.handledByPerformSave) {
        toast.error("Failed to save repair", {
          description: error?.response?.data?.message || error.message || "Please try again."
        });
      }
    } finally {
      setIsSaving(false);
      setSaveInProgress(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await logoutRequest();

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();

      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none";

      toast("Logout Successful", {
        description: res.data.message
      });

      setIsAuth(false);
      setUser(null);
      router.push('../');
    } catch (error) {
      setIsAuth(false);
      setUser(null);
      localStorage.clear();

      toast("Logout Unsuccessful", {
        description: error?.response?.data?.message || error.message
      });

      router.push('../');
    }
  }

  // Add dashboard handler
  const handleDashboard = () => {
    // Clear states before navigation
    setIsLoadingMeetingData(false);
    setSaveInProgress(false);
    setIsEndingSave(false);
    setIsSaving(false);
    
    router.push("/dashboard");
  }

  // Simple timer effect that doesn't interfere with WebRTC - with localStorage persistence
  useEffect(() => {
    if (!isClient) return;

    // Load saved timer data from localStorage on component mount
    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);
    const savedDuration = localStorage.getItem(`call-duration-${id}`);

    if (isConnected && !startTimeRef.current) {
      // If there's saved data and we're reconnecting, restore it
      if (savedStartTime) {
        const savedTime = parseInt(savedStartTime);
        const elapsedSinceStart = Math.floor((Date.now() - savedTime) / 1000);
        startTimeRef.current = savedTime;
        setCallDuration(elapsedSinceStart);
        console.log('Restored call timer from localStorage:', elapsedSinceStart);
      } else {
        // New call - save start time
        const startTime = Date.now();
        startTimeRef.current = startTime;
        localStorage.setItem(`call-start-time-${id}`, startTime.toString());
        console.log('Started new call timer');
      }

      timerRef.current = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setCallDuration(currentDuration);
        // Save current duration to localStorage
        localStorage.setItem(`call-duration-${id}`, currentDuration.toString());
      }, 1000);
    }

    if (!isConnected && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      setCallDuration(0);
      // Clear localStorage when call ends
      localStorage.removeItem(`call-start-time-${id}`);
      localStorage.removeItem(`call-duration-${id}`);
      console.log('Call ended, cleared timer from localStorage');
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isConnected, id, isClient]);

  // Load saved duration on component mount (for page refresh scenarios)
  useEffect(() => {
    if (!isClient) return;

    const savedDuration = localStorage.getItem(`call-duration-${id}`);
    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);

    if (savedDuration && savedStartTime && !isConnected) {
      // If we have saved data but not connected, show the last known duration
      const duration = parseInt(savedDuration);
      setCallDuration(duration);
      console.log('Loaded call duration from localStorage on mount:', duration);
    }
  }, [id, isClient]);

  // Format time to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format recording duration
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording timer effect
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        setCurrentRecordingDuration(elapsed);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setCurrentRecordingDuration(0);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // ENHANCED Screen recording functions with ULTRA HIGH QUALITY
  const startScreenRecording = async () => {
    console.log('🎬 Starting screen recording...');
    
    try {
      // Get video stream from the video element instead of screen
      if (!videoRef.current || !videoRef.current.srcObject) {
        console.log('❌ No video stream available');
        toast.error('No video stream available');
        return;
      }

      console.log('✅ Video stream found, proceeding with recording setup');

      // Set recording start time
      const startTime = Date.now();
      setRecordingStartTime(startTime);

      // Hide video controls during recording
      if (videoRef.current) {
        videoRef.current.controls = false;
        videoRef.current.style.pointerEvents = 'none';
      }

      const stream = videoRef.current.srcObject;

      setRecordingStream(stream);

      // ENHANCED: Create MediaRecorder with ULTRA HIGH quality settings
      const recorderOptions = [
        {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 150000000, // 150 Mbps for ultra quality
          audioBitsPerSecond: 256000     // High quality audio
        },
        {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 120000000  // 120 Mbps fallback
        },
        {
          mimeType: 'video/webm;codecs=h264,avc1',
          videoBitsPerSecond: 100000000  // 100 Mbps H.264
        },
        {
          mimeType: 'video/webm;codecs=vp8',
          videoBitsPerSecond: 80000000   // 80 Mbps VP8 fallback
        },
        {
          mimeType: 'video/webm',
          videoBitsPerSecond: 60000000   // 60 Mbps basic WebM
        }
      ];

      let selectedOption = null;
      for (const option of recorderOptions) {
        if (MediaRecorder.isTypeSupported(option.mimeType)) {
          selectedOption = option;
          console.log(`✅ Selected ULTRA HIGH recording: ${option.mimeType} @ ${option.videoBitsPerSecond / 1000000}Mbps`);
          break;
        }
      }

      if (!selectedOption) {
        console.log('❌ No supported recording format found');
        toast.error('Recording format not supported');
        return;
      }

      console.log(`✅ Selected recording format: ${selectedOption.mimeType} @ ${selectedOption.videoBitsPerSecond / 1000000}Mbps`);

      const recorder = new MediaRecorder(stream, selectedOption);

      // Reset chunks
      recordingChunks.current = [];

      // ENHANCED: Handle data available event - record in smaller chunks for ultra quality
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunks.current.push(event.data);
          console.log(`📊 Ultra quality chunk: ${(event.data.size / 1024 / 1024).toFixed(2)}MB`);
        }
      };

      // Handle recording stop event
      recorder.onstop = () => {
        // Calculate final duration
        const endTime = Date.now();
        const duration = Math.floor((endTime - startTime) / 1000);

        // Restore video controls after recording
        if (videoRef.current) {
          videoRef.current.style.pointerEvents = 'auto';
        }

        const blob = new Blob(recordingChunks.current, { type: selectedOption.mimeType });
        const videoUrl = URL.createObjectURL(blob);

        const newRecording = {
          id: Date.now(),
          url: videoUrl,
          blob: blob,
          timestamp: new Date().toLocaleString(),
          duration: duration
        };

        setRecordings(prev => [...prev, newRecording]);
        setIsRecording(false);
        setRecordingStartTime(null);

        console.log('✅ ULTRA HIGH quality recording completed:', {
          duration: `${duration}s`,
          size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
          bitrate: `${selectedOption.videoBitsPerSecond / 1000000}Mbps`
        });
        
        // Show size warning if file is large
        const fileSizeMB = blob.size / 1024 / 1024;
        if (fileSizeMB > 8) {
          toast.warning(`Recording saved but file is large (${fileSizeMB.toFixed(1)}MB)`);
        } else if (fileSizeMB > 5) {
          toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
        } else {
          toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
        }
      };

      setMediaRecorder(recorder);
      // ENHANCED: Start recording with ultra small timeslice for maximum quality
      recorder.start(50); // Record in 50ms chunks for ultra smooth quality
      setIsRecording(true);
      
      // Show file size warning along with start message
      toast.success(`Video recording started`);

    } catch (error) {
      console.error('❌ Error starting ultra high quality recording:', error);
      
      // Show error toast
      toast.error('Failed to start recording');
      
      // ENHANCED: Fallback with still high quality settings
      try {
        console.log('🔄 Attempting fallback recording...');
        
        const stream = videoRef.current.srcObject;
        const startTime = Date.now();
        setRecordingStartTime(startTime);

        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: 50000000, // 50 Mbps fallback quality
          audioBitsPerSecond: 192000
        });

        // Hide controls
        if (videoRef.current) {
          videoRef.current.controls = false;
          videoRef.current.style.pointerEvents = 'none';
        }

        // Reset chunks
        recordingChunks.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordingChunks.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const endTime = Date.now();
          const duration = Math.floor((endTime - startTime) / 1000);

          if (videoRef.current) {
            videoRef.current.style.pointerEvents = 'auto';
          }

          const blob = new Blob(recordingChunks.current, { type: 'video/webm' });
          const videoUrl = URL.createObjectURL(blob);

          const newRecording = {
            id: Date.now(),
            url: videoUrl,
            blob: blob,
            timestamp: new Date().toLocaleString(),
            duration: duration
          };

          setRecordings(prev => [...prev, newRecording]);
          setIsRecording(false);
          setRecordingStartTime(null);
          
          // Show size warning if file is large
          const fileSizeMB = blob.size / 1024 / 1024;
          if (fileSizeMB > 8) {
            toast.warning(`Recording saved but file is large (${fileSizeMB.toFixed(1)}MB)`);
          } else if (fileSizeMB > 5) {
            toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
          } else {
            toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
          }
        };

        setMediaRecorder(recorder);
        recorder.start(100); // 100ms chunks for fallback
        setIsRecording(true);
        toast.success('Video recording started');
      } catch (fallbackError) {
        console.error('❌ Fallback recording also failed:', fallbackError);
        toast.error('Failed to start video recording');
        setRecordingStartTime(null);
        setIsRecording(false);
      }
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      // Restore video controls
      if (videoRef.current) {
        videoRef.current.style.pointerEvents = 'auto';
      }
      toast.success('Recording stopped');
    }
  };

  const handleRecordingToggle = () => {
    console.log('🎬 Recording toggle clicked. Current state:', { isRecording });
    
    if (isRecording) {
      console.log('🛑 Stopping recording...');
      stopScreenRecording();
    } else {
      console.log('▶️ Starting recording...');
      startScreenRecording();
    }
  };

  // Individual save functions from second code
  const saveIndividualRecording = useCallback(async (recording) => {
    if (recording.isExisting) {
      toast.info("Recording already saved");
      return;
    }

    const itemKey = `recording-${recording.id}`;

    // Prevent duplicate processing
    if (processedItemsRef.current.has(itemKey)) {
      console.log('⚠️ Recording already being processed:', itemKey);
      return;
    }

    processedItemsRef.current.add(itemKey);

    try {
      setSavingRecordingId(recording.id);
      console.log('💾 Saving individual recording...');

      // Show loading toast
      toast.loading("Saving recording...", {
        id: `save-recording-${recording.id}`
      });

      const base64Data = await blobToBase64(recording.blob);
      const recordingsData = [{
        data: base64Data,
        timestamp: recording.timestamp,
        duration: recording.duration,
        size: recording.blob.size
      }];      const formData = {
        meeting_id: id,
        name: residentName,
        address: residentAddress,
        address_line_1: addressLine1,
        address_line_2: addressLine2,
        address_line_3: addressLine3,
        additional_address_lines: addressLines,
        post_code: actualPostCode,
        phone_number: phoneNumber,
        reference: postCode,
        repair_detail: repairDetails,
        work_details: [
          {
            detail: repairDetails,
            target_time: selectedTTValues['field1'] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          },
          ...(workDetail1 && workDetail1.trim() ? [{
            detail: workDetail1.trim(),
            target_time: selectedTTValues['field1'] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }] : []),
          ...(workDetail2 && workDetail2.trim() ? [{
            detail: workDetail2.trim(),
            target_time: selectedTTValues['field2'] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }] : []),
          ...(workDetail3 && workDetail3.trim() ? [{
            detail: workDetail3.trim(),
            target_time: selectedTTValues['field3'] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }] : []),
          ...workDetails.map((detail, index) => ({
            detail: detail.trim(),
            target_time: selectedTTValues[`workDetail${index}`] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }))
        ].filter(item => item.detail && item.detail.trim() !== ''),
        target_time: targetTime,
        special_notes: specialNotes,
        recordings: recordingsData,
        screenshots: [],
        update_mode: existingMeetingData ? 'update' : 'create'
      };

      const response = await createRequest(formData);

      // Check for upload summary in response to show detailed toast
      if (response?.data?.upload_summary || response?.data?.media_summary) {
        const summary = response.data.upload_summary || response.data.media_summary;
        const recordingsUploaded = summary.recordings_uploaded || summary.new_recordings_added || 0;
        
        if (recordingsUploaded > 0) {
          // Show success toast
          toast.success("Recording saved successfully!", {
            id: `save-recording-${recording.id}`
          });
          
          // Update the recording to mark it as existing - ATOMIC UPDATE
          setRecordings(prev => prev.map(r =>
            r.id === recording.id
              ? { ...r, isExisting: true }
              : r
          ));
        } else {
          // Recording failed to upload
          toast.error("Recording too large", {
            id: `save-recording-${recording.id}`,
            description: "Video file exceeds 10MB limit. Try recording shorter videos."
          });
        }
      } else {
        // Fallback success
        toast.success("Recording saved successfully!", {
          id: `save-recording-${recording.id}`
        });
        
        // Update the recording to mark it as existing - ATOMIC UPDATE
        setRecordings(prev => prev.map(r =>
          r.id === recording.id
            ? { ...r, isExisting: true }
            : r
        ));
      }

    } catch (error) {
      console.error('❌ Save recording failed:', error);
      
      // Handle specific error types
      if (error?.response?.data?.message?.includes('File size too large')) {
        toast.error("Recording too large", {
          id: `save-recording-${recording.id}`,
          description: "Video file exceeds 10MB limit. Try recording shorter videos."
        });
      } else if (error?.response?.data?.message?.includes('timeout')) {
        toast.error("Upload timeout", {
          id: `save-recording-${recording.id}`,
          description: "Upload took too long. Please try again."
        });
      } else {
        toast.error("Failed to save recording", {
          id: `save-recording-${recording.id}`,
          description: error?.response?.data?.message || error.message || "Please try again."
        });
      }
    } finally {
      setSavingRecordingId(null);
      processedItemsRef.current.delete(itemKey);
    }
  }, [id, residentName, residentAddress, actualPostCode, postCode, repairDetails, targetTime, existingMeetingData]);

  // Updated delete recording function
  const deleteRecording = async (recording) => {
    try {
      if (recording.isExisting) {
        // Send delete request to backend for existing recordings
        console.log(`🗑️ Deleting existing recording ${recording.id} from meeting ${id}`);

        try {
          const response = await deleteRecordingRequest(id, recording.id);

          if (response.data.timeout) {
            toast.success("Recording deletion requested (processing in background)");
          } else {
            toast.success("Recording deleted successfully!");
          }
        } catch (error) {
          console.error('Error during API delete call:', error);
          // Even if API call fails, remove from UI for better user experience
          toast.info("Recording removed from view but backend deletion failed");
        }
      } else {
        // Local deletion for new recordings (not yet saved)
        console.log(`🗑️ Deleting local recording ${recording.id}`);
      }

      // Always remove from state regardless of API success
      setRecordings(prev => {
        const recordingToDelete = prev.find(r => r.id === recording.id);
        if (recordingToDelete && recordingToDelete.url) {
          URL.revokeObjectURL(recordingToDelete.url);
        }
        return prev.filter(r => r.id !== recording.id);
      });

      if (!recording.isExisting) {
        toast.success("Recording removed!");
      }
    } catch (error) {
      console.error('❌ Delete recording failed:', error);
      toast.error("Failed to delete recording", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  // Delete existing screenshot function
  const deleteExistingScreenshot = async (screenshot) => {
    try {
      console.log(`🗑️ Deleting existing screenshot ${screenshot.id} from meeting ${id}`);
      const response = await deleteScreenshotRequest(id, screenshot.id);

      if (response.data.timeout) {
        toast.success("Screenshot deletion requested (processing in background)");
      } else {
        toast.success("Screenshot deleted successfully!");
      }

      // Remove from existing screenshots state immediately
      setExistingScreenshots(prev => prev.filter(s => s.id !== screenshot.id));
    } catch (error) {
      console.error('❌ Delete screenshot failed:', error);
      toast.error("Failed to delete screenshot", {
        description: error?.response?.data?.message || error.message
      });
    }
  };

  // Local screenshot delete function (for new screenshots from useWebRTC)
  const deleteNewScreenshot = (screenshotIndex, screenshotId) => {
    try {
      console.log('🗑️ Deleting screenshot:', { index: screenshotIndex, id: screenshotId });

      // Clean up any associated drawing data before deleting
      const canvasId = screenshotId || `new-${screenshotIndex}`;
      if (drawingData[canvasId]) {
        console.log('🧹 Cleaning up drawing data for:', canvasId);
        delete drawingData[canvasId];
      }

      // Use the deleteScreenshot function from useWebRTC hook
      deleteScreenshot(screenshotIndex);
      toast.success("Screenshot removed!");
    } catch (error) {
      console.error('Error deleting screenshot:', error);
      toast.error("Failed to delete screenshot");
    }
  };

  // Update the save individual screenshot function to use screenshot ID
  const saveIndividualScreenshot = useCallback(async (screenshotData, index, screenshotId) => {
    const itemKey = `screenshot-${screenshotId || index}`;

    // Prevent duplicate processing
    if (processedItemsRef.current.has(itemKey) || savingScreenshotIds.has(screenshotId)) {
      console.log('⚠️ Screenshot already being processed:', itemKey);
      return;
    }

    processedItemsRef.current.add(itemKey);

    try {
      // FIXED: Set both index and ID tracking for proper spinner display
      setSavingScreenshotIndex(index);
      setSavingScreenshotIds(prev => new Set(prev).add(screenshotId));

      console.log('💾 Saving individual ULTRA HIGH QUALITY screenshot...', index, 'ID:', screenshotId);

      // Show loading toast
      toast.loading("Saving screenshot...", {
        id: `save-screenshot-${screenshotId}`
      });

      // FIXED: Use clean screenshot data (remove unique identifiers)
      let finalScreenshotData = screenshotData.split('#')[0]; // Remove timestamp markers

      // ENHANCED: Check multiple possible canvas IDs where drawings might exist
      const possibleCanvasIds = [
        screenshotId,                                    // Regular canvas ID
        `new-${index}`,                                  // Legacy canvas ID
        `maximized-canvas-${screenshotId}`,              // Maximized canvas ID
        `maximized-canvas-new-${index}`,                 // Legacy maximized canvas ID
        `screenshot-${index}-${Date.now()}-${Math.random()}` // Generated screenshot ID format
      ].filter(Boolean); // Remove any undefined values

      console.log('🎨 Checking for drawings in possible canvas IDs:', possibleCanvasIds);
      console.log('📊 Available drawing data keys:', Object.keys(drawingData));

      let foundCanvasId = null;
      let foundDrawingData = null;

      for (const canvasId of possibleCanvasIds) {
        if (drawingData[canvasId] && drawingData[canvasId].strokes && drawingData[canvasId].strokes.length > 0) {
          foundCanvasId = canvasId;
          foundDrawingData = drawingData[canvasId];
          console.log('🎨 Found drawings in canvas:', canvasId, 'Strokes:', foundDrawingData.strokes.length);
          break;
        }
      }

      if (foundCanvasId && foundDrawingData) {
        console.log('🖼️ Merging drawings with screenshot at ULTRA HIGH resolution...');

        try {
          finalScreenshotData = await mergeWithBackground(finalScreenshotData, foundCanvasId);
          console.log('✅ ULTRA HIGH quality drawing merge completed successfully');
        } catch (mergeError) {
          console.error('❌ Error merging drawings:', mergeError);
          console.log('📷 Proceeding with original screenshot without drawings');
        }
      } else {
        console.log('ℹ️ No drawings found in any of the possible canvas IDs');
        console.log('📋 Checked canvas IDs:', possibleCanvasIds);
        console.log('📋 Available drawing data:', Object.keys(drawingData));
      }

      if (!finalScreenshotData.startsWith('data:image/png')) {
        console.log('🔄 Converting to PNG for maximum quality...');

        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 2; 
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;

            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);

            finalScreenshotData = canvas.toDataURL('image/png', 1.0);
            console.log('✅ Enhanced to ultra high quality PNG');

            processSave(finalScreenshotData, possibleCanvasIds, foundCanvasId, foundDrawingData);
          };
          img.src = finalScreenshotData;
        });
      } else {
        processSave(finalScreenshotData, possibleCanvasIds, foundCanvasId, foundDrawingData);
      }

      async function processSave(imageData, possibleCanvasIds, foundCanvasId, foundDrawingData) {
        const screenshotsData = [{
          data: imageData,
          timestamp: new Date().toISOString(),
          size: imageData.length,
          quality: 'ultra_high',
          index: index,
          hasDrawings: foundCanvasId !== null && foundDrawingData !== null
        }];

        const formData = {
          meeting_id: id,
          name: residentName,
          address: residentAddress,
          post_code: actualPostCode,
          reference: postCode,
          repair_detail: repairDetails,
          target_time: targetTime,
          recordings: [],
          screenshots: screenshotsData,
          update_mode: existingMeetingData ? 'update' : 'create'
        };

        console.log('📤 Sending screenshot data to server:', {
          hasDrawings: screenshotsData[0].hasDrawings,
          dataSize: Math.round(imageData.length / 1024) + 'KB',
          foundCanvasId: foundCanvasId,
          checkedCanvasIds: possibleCanvasIds
        });

        const response = await createRequest(formData);

        // Check for upload summary in response to show detailed toast
        if (response?.data?.upload_summary || response?.data?.media_summary) {
          const summary = response.data.upload_summary || response.data.media_summary;
          const screenshotsUploaded = summary.screenshots_uploaded || summary.new_screenshots_added || 0;
          
          if (screenshotsUploaded > 0) {
            toast.success(
              screenshotsData[0].hasDrawings
                ? "Ultra high quality screenshot with drawings saved successfully!"
                : "Ultra high quality screenshot saved successfully!",
              {
                id: `save-screenshot-${screenshotId}`
              }
            );
            
            // Mark screenshot as saved
            markScreenshotAsSaved(screenshotId);
            
            // Update screenshot URL locally to show merged drawing immediately
            if (screenshotsData[0].hasDrawings) {
              console.log('🖼️ Updating screenshot to show merged drawing locally');
              
              // Store the merged screenshot data for immediate display
              const mergedScreenshotKey = `merged-${screenshotId}`;
              window.tempMergedScreenshots = window.tempMergedScreenshots || {};
              window.tempMergedScreenshots[mergedScreenshotKey] = {
                originalIndex: index,
                mergedData: imageData,
                timestamp: Date.now()
              };
              
              console.log('🔄 Merged screenshot stored for immediate display');
            }
            
            // Clear pencil mode
            setActivePencilScreenshot(null);
            setShowPencilDropdown(null);
            
            console.log(`✅ Screenshot ${index} marked as saved with ID: ${screenshotId}`);
            
            // DON'T clear drawing data immediately - keep it for local display
            if (foundCanvasId && drawingData[foundCanvasId]) {
              console.log('💾 Keeping drawing data for local display after save');
              drawingData[foundCanvasId].isSaved = true;
            }
          } else {
            // Screenshot failed to upload
            toast.error("Screenshot too large", {
              id: `save-screenshot-${screenshotId}`,
              description: "Screenshot file is too large. Try reducing image quality."
            });
          }
        } else {
          // Fallback success
          toast.success(
            screenshotsData[0].hasDrawings
              ? "Ultra high quality screenshot with drawings saved successfully!"
              : "Ultra high quality screenshot saved successfully!",
            {
              id: `save-screenshot-${screenshotId}`
            }
          );
          
          // Mark screenshot as saved
          markScreenshotAsSaved(screenshotId);
        }
      }

    } catch (error) {
      console.error('❌ Save ultra high quality screenshot failed:', error);
      
      // Handle specific error types
      if (error?.response?.data?.message?.includes('File size too large')) {
        toast.error("Screenshot too large", {
          id: `save-screenshot-${screenshotId}`,
          description: "Screenshot file is too large. Try reducing image quality."
        });
      } else if (error?.response?.data?.message?.includes('timeout')) {
        toast.error("Upload timeout", {
          id: `save-screenshot-${screenshotId}`,
          description: "Upload took too long. Please try again."
        });
      } else {
        toast.error("Failed to save ultra high quality screenshot", {
          id: `save-screenshot-${screenshotId}`,
          description: error?.response?.data?.message || error.message || "Please try again."
        });
      }
    } finally {
      setSavingScreenshotIndex(null);
      setSavingScreenshotIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(screenshotId);
        return newSet;
      });
      processedItemsRef.current.delete(itemKey);
    }
  }, [id, residentName, residentAddress, actualPostCode, postCode, repairDetails, targetTime, existingMeetingData, drawingData, mergeWithBackground, deleteScreenshot, savingScreenshotIds]);

  const maximizeVideo = useCallback((recording) => {
    setMaximizedItem({
      type: 'video',
      id: recording.id,
      data: recording
    });
  }, []);

  const maximizeScreenshot = useCallback((screenshot, index, isExisting = false) => {
    setMaximizedItem({
      type: 'screenshot',
      // id: isExisting ? screenshot.id : `new-${index}`,
      id: screenshot.id,
      data: screenshot,
      index: isExisting ? null : index,
      isExisting
    });
  }, []);

  const handleScreenshotTaken = useCallback((screenshot, index) => {
    console.log('📸 Screenshot taken, auto-maximizing:', screenshot);
    maximizeScreenshot(screenshot, index, false);
  }, [maximizeScreenshot]);

 // Add this to your closeMaximized function to clean up positioning

const closeMaximized = useCallback(() => {
  // Clean up drawing data when closing maximized view
  if (maximizedItem && maximizedItem.type === 'screenshot' && !maximizedItem.isExisting) {
    const screenshotId = maximizedItem.data.id;
    const canvasId = screenshotId;
    
    // Clean up temporary merged screenshot data
    const mergedScreenshotKey = `merged-${screenshotId}`;
    if (window.tempMergedScreenshots && window.tempMergedScreenshots[mergedScreenshotKey]) {
      console.log('🧹 Cleaning up temporary merged screenshot data:', mergedScreenshotKey);
      delete window.tempMergedScreenshots[mergedScreenshotKey];
    }
    
    // Clean up positioning event listeners
    const img = document.getElementById(`maximized-img-${maximizedItem.id}`);
    if (img && img.cleanupPositioning) {
      console.log('🧹 Cleaning up positioning event listeners');
      img.cleanupPositioning();
    }
    
    // Only clear drawing data if it's marked as saved
    if (drawingData[canvasId] && drawingData[canvasId].isSaved) {
      console.log('🧹 Cleaning up saved drawing data on close:', canvasId);
      delete drawingData[canvasId];
      
      // Clear related canvas data
      const relatedCanvasIds = [
        `maximized-canvas-${screenshotId}`,
        `new-${maximizedItem.index}`,
        `maximized-canvas-new-${maximizedItem.index}`
      ];
      
      relatedCanvasIds.forEach(relatedId => {
        if (drawingData[relatedId] && drawingData[relatedId].isSaved) {
          console.log('🧹 Also clearing related saved canvas data:', relatedId);
          delete drawingData[relatedId];
        }
      });
    }
  }
  
  // Reset any active pencil states
  setActivePencilScreenshot(null);
  setShowPencilDropdown(null);
  
  setMaximizedItem(null);
}, [maximizedItem, drawingData, setActivePencilScreenshot, setShowPencilDropdown]);

// Also add this useEffect to handle cleanup when component unmounts
useEffect(() => {
  return () => {
    // Clean up any remaining positioning event listeners
    const images = document.querySelectorAll('[id^="maximized-img-"]');
    images.forEach(img => {
      if (img.cleanupPositioning) {
        img.cleanupPositioning();
      }
    });
    
    // Clean up temporary merged screenshots
    if (window.tempMergedScreenshots) {
      delete window.tempMergedScreenshots;
    }
  };
}, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (maximizedItem) {
          closeMaximized();
        }
        if (showTTDropdown) {
          setShowTTDropdown(null);
        }
        if (showPencilDropdown) {
          setShowPencilDropdown(null);
          setActivePencilScreenshot(null);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [maximizedItem, showTTDropdown, showPencilDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isCanvasClick = e.target.tagName === 'CANVAS' || 
                           e.target.closest('[data-canvas-id]') ||
                           e.target.hasAttribute('data-canvas-id');
      
      if (showTTDropdown) {
        const dropdownElement = document.querySelector(`[data-dropdown-id="${showTTDropdown}"]`);
        if (dropdownElement && !dropdownElement.contains(e.target)) {
          setShowTTDropdown(null);
        }
      }
      if (showPencilDropdown && !isCanvasClick) {
        const pencilDropdownElement = document.querySelector(`[data-pencil-dropdown-id="${showPencilDropdown}"]`);
        const toolsButton = document.querySelector('[data-tools-button]');
        
        if (pencilDropdownElement && !pencilDropdownElement.contains(e.target) && 
            (!toolsButton || !toolsButton.contains(e.target))) {
          setShowPencilDropdown(null);
          setActivePencilScreenshot(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTTDropdown, showPencilDropdown]);

  const handlePencilClick = useCallback((canvasId, screenshotId, screenshotData = null, index = null) => {
    console.log('🖋️ Pencil button clicked for canvas:', canvasId, 'screenshot ID:', screenshotId);
    console.log('Current state - active:', activePencilScreenshot, 'dropdown:', showPencilDropdown);

    const activeId = screenshotId || canvasId;

    const isInMinimizedView = !maximizedItem;

    if (isInMinimizedView && screenshotData && index !== null) {
      console.log('📱 Pencil clicked in minimized view - maximizing screenshot');
      
      maximizeScreenshot(screenshotData, index, false);
      
      setSelectedTool('brush');
      
      setActivePencilScreenshot(activeId);
      
      console.log('✨ Screenshot maximized with pencil tool activated (no dropdown)');
      return;
    }

    if (showPencilDropdown === activeId) {
      console.log('Closing dropdown for:', activeId);
      setShowPencilDropdown(null);
      setActivePencilScreenshot(null);
    } else {
      console.log('Opening dropdown for:', activeId);
      setActivePencilScreenshot(activeId); 
      setShowPencilDropdown(activeId);     
      
      // Also set brush tool as default when opening dropdown
      if (selectedTool !== 'brush') {
        setSelectedTool('brush');
      }
    }
  }, [activePencilScreenshot, showPencilDropdown, maximizedItem, maximizeScreenshot, setSelectedTool, selectedTool]);

  // Helper function to get landlord name (prioritize token info)
  const getLandlordName = () => {
    if (tokenLandlordInfo?.landlordName) {
      return tokenLandlordInfo.landlordName;
    }
    return user?.landlordInfo?.landlordName || null;
  };

  // Helper function to get landlord logo (prioritize token info)
  const getLandlordLogo = () => {
    if (tokenLandlordInfo?.landlordLogo && isValidImageUrl(tokenLandlordInfo.landlordLogo)) {
      return tokenLandlordInfo.landlordLogo;
    }
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  const getTotalRecordingsCount = () => {
    return recordings.length;
  };

  // Function to display recordings count in header
  const displayRecordingsCount = () => {
    const totalCount = getTotalRecordingsCount();
    return totalCount > 0 ? totalCount : null;
  };

  // Screenshot status functions
  const getScreenshotSavedCount = () => {
    let savedCount = 0;
    // Count existing screenshots (all are saved)
    savedCount += existingScreenshots.length;
    
    // Count saved new screenshots
    screenshots.forEach((screenshot, index) => {
      const screenshotId = typeof screenshot === 'object' ? 
        (screenshot.id || `screenshot-${index}-${Date.now()}`) : 
        `screenshot-${index}-${Date.now()}`;
      if (screenshotSavedStatus.get(screenshotId)) {
        savedCount++;
      }
    });
    
    return savedCount;
  };

  const getScreenshotUnsavedCount = () => {
    let unsavedCount = 0;
    
    // Count unsaved new screenshots
    screenshots.forEach((screenshot, index) => {
      const screenshotId = typeof screenshot === 'object' ? 
        (screenshot.id || `screenshot-${index}-${Date.now()}`) : 
        `screenshot-${index}-${Date.now()}`;
      if (!screenshotSavedStatus.get(screenshotId)) {
        unsavedCount++;
      }
    });
    
    return unsavedCount;
  };

  const getTotalScreenshotCount = () => {
    return existingScreenshots.length + screenshots.length;
  };

  const markScreenshotAsSaved = (screenshotId) => {
    setScreenshotSavedStatus(prev => {
      const newMap = new Map(prev);
      newMap.set(screenshotId, true);
      return newMap;
    });
  };

  const getScreenshotStatus = (screenshotId) => {
    return screenshotSavedStatus.get(screenshotId) || false;
  };


  // Helper function to get profile image (prioritize token info)
  const getProfileImage = () => {
    // Check token info first
    if (tokenLandlordInfo?.profileImage && isValidImageUrl(tokenLandlordInfo.profileImage)) {
      return tokenLandlordInfo.profileImage;
    }

    // Fallback to current user info
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      if (isValidImageUrl(user.landlordInfo.landlordLogo)) {
        return user.landlordInfo.landlordLogo;
      }
    }

    if (user?.landlordInfo?.officerImage) {
      if (isValidImageUrl(user.landlordInfo.officerImage)) {
        return user.landlordInfo.officerImage;
      }
    }

    return null;
  };

  // Helper function to check if image URL is valid
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://');
  };

  // Helper function to get display name (prioritize token info)
  const getDisplayName = () => {
    // Use landlord name if available from token or user
    const landlordName = getLandlordName();
    if (landlordName) {
      return landlordName;
    }

    // Fallback to username from email
    if (user?.email) {
      return user.email.split('@')[0];
    }

    return 'User';
  };

  // Helper function to get initials
  const getInitials = (name) => {
    if (!name) return 'U';

    const words = name.trim().split(' ').filter(word => word.length > 0);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    } else if (words.length >= 2) {
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Add function to create and show share link for current meeting
  const handleCreateShareLink = () => {
    if (!id) {
      toast.error("No meeting ID available");
      return;
    }

    // Create a meeting object with current form data for sharing
    const meetingData = {
      meeting_id: id,
      name: residentName,
      address: residentAddress,
      post_code: postCode,
      repair_detail: repairDetails,
      target_time: targetTime,
      createdAt: new Date().toISOString(),
      recordings: recordings, // Using existing recordings array
      screenshots: [...existingScreenshots, ...screenshots.map((screenshot, index) => ({ id: `new-${index}`, url: screenshot }))]
    };

    // Open the share link dialog with meeting data
    setShareLinkOpen(true, meetingData);
  };

  // NEW: Add cleanup effect to prevent memory leaks
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      processedItemsRef.current.clear();
    };
  }, []);

  // Enhanced loading guard to prevent hydration mismatch
  if (!isClient) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>Loading video session...</p>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    );
  }

  // Add runtime check to ensure we have necessary data
  if (!id) {
    return (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: '600' }}>
          Error: Invalid meeting ID
        </p>
      </div>
    );
  }  return (
    <>
      {/* Ending Video Overlay */}
      {isEndingVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#f9fafb',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>Redirecting you to the Dashboard screen...</p>
        </div>
      )}

      <div className="hide-scrollbar" style={{
        width: '100vw',
        height: 'auto',
        minHeight: '100vh',
        margin: 0,
        padding: '1vh 1vw',
        fontFamily: 'sans-serif',
        overflow: 'auto',
        boxSizing: 'border-box'
      }}>
      <style dangerouslySetInnerHTML={{
        __html: `
          * {
            box-sizing: border-box;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
            overflow-x: hidden;
          }
          body {
            overflow-x: hidden;
          }
          .responsive-column {
            padding: 1vh 1vw;
            height: auto;
            overflow-y: visible;
            overflow-x: hidden;
          }
          .responsive-content {
            width: 100%;
            height: auto;
            min-height: fit-content;
          }
        `
      }} />
      {maximizedItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '2vh 2vw'
        }}>
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {/* Maximized Video */}
            {maximizedItem.type === 'video' && (
              <>
                {/* Close button for video */}
                <button
                  id="maximize-close-button-video"
                  onClick={closeMaximized}
                  style={{
                    position: 'absolute',
                    top: '10%',
                    right: '33.3%',
                    zIndex: 100,
                    padding: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    color: 'white',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    backdropFilter: 'blur(10px)',
                    opacity: '1',
                    visibility: 'visible'
                  }}
                >
                  <X style={{ width: '18px', height: '18px', strokeWidth: '3' }} />
                </button>
                
                <video
                  src={maximizedItem.data.url}
                  controls={true}
                  autoPlay={false}
                  muted={false}
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                  onLoadedMetadata={(e) => {
                    console.log('Video resolution:', e.target.videoWidth, 'x', e.target.videoHeight);
                  }}
                />
              </>
            )}

            {/* Maximized Screenshot */}
            {maximizedItem.type === 'screenshot' && (() => {
              // const screenshotId = maximizedItem.isExisting ? maximizedItem.data.id : `new-${maximizedItem.index}`;
              const screenshotId = maximizedItem.data.id;
              const canvasId = `maximized-canvas-${screenshotId}`;
              
              // Check if we have a merged version of this screenshot
              const mergedScreenshotKey = `merged-${screenshotId}`;
              const mergedData = window.tempMergedScreenshots?.[mergedScreenshotKey];
              let isSaved = getScreenshotStatus(screenshotId);
              
              // Use merged data if available and this screenshot is saved, otherwise use original
              let screenshotUrl = maximizedItem.isExisting ? maximizedItem.data.url : maximizedItem.data.url;
              if (mergedData && isSaved && mergedData.originalIndex === maximizedItem.index) {
                screenshotUrl = mergedData.mergedData;
                console.log('🖼️ Using merged screenshot data for display');
              }
              
              const isActive = activePencilScreenshot === screenshotId;
              
              // Debug logging
              console.log('🔍 Maximized screenshot data:', {
                isExisting: maximizedItem.isExisting,
                data: maximizedItem.data,
                screenshotUrl: screenshotUrl,
                screenshotId: screenshotId,
                isSaved: isSaved,
                hasMergedData: !!mergedData
              });

              if(isSaved) maximizedItem.isExisting = true;
              if(maximizedItem.isExisting) isSaved = true;
              
              return (
                <div className="relative w-full h-full flex items-center justify-center p-4">
                  {/* Close button for screenshot/image */}                  <button
                    id="maximize-close-button-screenshot"
                    onClick={closeMaximized}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      zIndex: 100,
                      padding: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      color: 'white',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '36px',
                      height: '36px',
                      backdropFilter: 'blur(10px)',
                      opacity: '1',
                      visibility: 'visible'
                    }}
                  >
                    <X style={{ width: '18px', height: '18px', strokeWidth: '3' }} />
                  </button>
                  
                  <div
                    className="relative flex items-center justify-center w-full h-full"
                    style={{
                      maxWidth: 'calc(100vw - 2rem)',
                      maxHeight: 'calc(100vh - 2rem)',
                      minWidth: '300px',
                      minHeight: '300px'
                    }}
                  >
                    {/* Enhanced Drawing Tools for Maximized View - Dynamic Positioning */}
                    <div 
                      id={`tools-panel-${screenshotId}`}
                      style={{
                        position: 'absolute',
                        top: '20px',
                        right: '27%',
                        zIndex: 30,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        alignItems: 'flex-start',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: '16px',
                        borderRadius: '16px',
                        border: '2px solid rgba(59, 130, 246, 0.3)',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)',
                        transition: 'all 0.3s ease'
                      }}>                      {/* Enhanced Tools Header */}
                      <div style={{
                        color: '#1f2937',
                        fontSize: '12px',
                        fontWeight: '700',
                        marginBottom: '4px',
                        textAlign: 'center',
                        width: '100%',
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase'
                      }}>
                         Tools
                      </div>

                      {/* Enhanced Save Button - Only show for new screenshots - FIRST */}
                      {/* {!maximizedItem.isExisting && ( */}
                      {(!isSaved || !maximizedItem.isExisting) && (
                        <button
                          onClick={async () => {
                            const screenshotData = maximizedItem.data.url;
                            const index = maximizedItem.index;
                            const screenshotId = maximizedItem.data.id;
                            console.log('💾 Saving screenshot from maximized view:', { index, screenshotId });
                            
                            try {
                              await saveIndividualScreenshot(screenshotData, index, screenshotId);
                              setTimeout(() => {
                                closeMaximized();
                              }, 500);
                            } catch (error) {
                              console.error('❌ Error saving screenshot:', error);
                            }
                          }}
                          className={`group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg ${savingScreenshotIds.has(maximizedItem.data.id) 
                            ? 'bg-gray-400 border-gray-300 text-white cursor-not-allowed' 
                            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-600 hover:from-green-500 hover:to-emerald-500 hover:border-green-400 hover:text-white hover:transform hover:scale-105'
                          }`}
                          title={savingScreenshotIds.has(maximizedItem.data.id) ? "Saving..." : "💾 Save & Close"}
                          disabled={savingScreenshotIds.has(maximizedItem.data.id)}
                        >
                          {savingScreenshotIds.has(maximizedItem.data.id) ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="w-5 h-5" />
                          )}
                          {!savingScreenshotIds.has(maximizedItem.data.id) && (
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                          )}
                        </button>
                      )}

                      {/* Enhanced Drawing Tools Button - SECOND (Pencil) */}
                      <button
                        data-tools-button="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.target.getBoundingClientRect();
                          setClickPosition({
                            x: rect.left + (rect.width / 2),
                            y: rect.top + (rect.height / 2)
                          });
                          console.log('🎨 More tools clicked for maximized canvas:', canvasId);
                          handlePencilClick(canvasId, screenshotId, null, null);
                        }}
                        className={`group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg ${isActive 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-300 text-white transform scale-105' 
                          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-700 hover:from-blue-50 hover:to-purple-50 hover:border-blue-300 hover:text-blue-600 hover:transform hover:scale-105'
                        }`}
                        title="Activate Drawing Mode"
                      >
                        <Palette className="w-5 h-5" />
                        {isActive && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                        )}
                      </button>
                      
                      {/* Enhanced Clear Canvas Button - THIRD (Eraser) */}
                      <button
                        onClick={() => clearCanvas(canvasId)}
                        className="group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-600 hover:from-red-500 hover:to-pink-500 hover:border-red-400 hover:text-white hover:transform hover:scale-105"
                        title="Clear All Drawings"
                      >
                        <Eraser className="w-5 h-5" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </button>

                      {/* Enhanced Delete Button - FOURTH */}
                      <button
                        onClick={() => {
                          if (maximizedItem.isExisting) {
                            console.log('🗑️ Deleting existing screenshot from maximized view:', maximizedItem.data);
                            deleteExistingScreenshot(maximizedItem.data);
                          } else {
                            const index = maximizedItem.index;
                            const screenshotId = maximizedItem.data.id;
                            console.log('🗑️ Deleting new screenshot from maximized view:', { index, screenshotId });
                            deleteNewScreenshot(index, screenshotId);
                          }
                          closeMaximized();
                        }}
                        className="group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-600 hover:from-red-500 hover:to-orange-500 hover:border-red-400 hover:text-white hover:transform hover:scale-105"
                        title="🗑️ Delete Screenshot"
                      >
                        <Trash2 className="w-5 h-5" />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </button>
                    </div>
                    
                    <div id={maximizedItem.id}>
                      <Loader2 className="text-green-500 text-4xl animate-spin" size={50}/>
                    </div>
                    {/* Screenshot Image */}
                    <img
                      id={`maximized-img-${maximizedItem.id}`}
                      // src={screenshotUrl.includes('base64') ? screenshotUrl : `/api/proxy?url=${encodeURIComponent(screenshotUrl)}`}
                      src={screenshotUrl}

                      alt="Maximized screenshot"
                      className="w-full h-full object-contain hidden opacity-0 transition-opacity duration-300"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto'
                      }}
                      onLoad={async (e) => {
                        const sleep = (ms) => new Promise((resolve, reject) => {
                          setTimeout(() => resolve(),ms)
                        });

                        await sleep(2000);
                        // Smooth fade-in to prevent flashing
                        if(window.document.getElementById(maximizedItem.id)) window.document.getElementById(maximizedItem.id).style.display = "none"
                        e.target.style.opacity = '1';
                        const img = e.target;
                        console.log(`📸 Image loaded: ${img.naturalWidth}x${img.naturalHeight} pixels`);
                        console.log(`📱 Display size: ${img.clientWidth}x${img.clientHeight} pixels`);
                        
                        // Force proper image sizing first
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '100%';
                        img.style.width = 'auto';
                        img.style.height = 'auto';
                        img.style.objectFit = 'contain';
                        img.style.display = 'block';
                        
                        // Position close button exactly at the top-right corner of the image
                        const positionCloseButton = () => {
                          const closeButton = document.getElementById('maximize-close-button');
                          if (closeButton && img) {
                            const imgRect = img.getBoundingClientRect();
                            const containerRect = img.parentElement.getBoundingClientRect();
                            
                            // Calculate the exact position where the image ends (top-right corner)
                            const imageRight = imgRect.right - containerRect.left;
                            const imageTop = imgRect.top - containerRect.top;
                            
                            // Position the close button exactly at the image's top-right corner
                            closeButton.style.left = `${imageRight - 18}px`; // 18px is half button width for perfect corner
                            closeButton.style.top = `${imageTop}px`;
                            closeButton.style.right = 'auto'; // Remove right positioning
                            closeButton.style.opacity = '1';
                            closeButton.style.visibility = 'visible';
                            
                            console.log(`🎯 Close button positioned at image top-right: left=${imageRight - 18}px, top=${imageTop}px`);
                            console.log(`📏 Image bounds: right=${imageRight}px, top=${imageTop}px`);
                          }
                        };
                        
                        // Function to update dropdown position to match tools panel
                        const updateDropdownPosition = () => {
                          const dropdown = document.querySelector(`[data-pencil-dropdown-id="${screenshotId}"]`);
                          const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);
                          
                          if (dropdown && toolsPanel) {
                            const toolsPanelRect = toolsPanel.getBoundingClientRect();
                            dropdown.style.top = `${toolsPanelRect.top}px`;
                            console.log(`🎨 Dropdown synced with tools panel at top: ${toolsPanelRect.top}px`);
                          }
                        };
                        
                        // Position tools panel dynamically based on screenshot position
                        const positionToolsPanel = () => {
                          const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);
                          if (toolsPanel && img) {
                            const imgRect = img.getBoundingClientRect();
                            const containerRect = img.parentElement.getBoundingClientRect();
                            
                            // Calculate screenshot position relative to container
                            const imageLeft = imgRect.left - containerRect.left;
                            const imageTop = imgRect.top - containerRect.top;
                            const imageRight = imgRect.right - containerRect.left;
                            
                            // Position tools panel to match screenshot's top position with 20px horizontal offset
                            const toolsPanelLeft = imageRight + 20; // 20px to the right of the screenshot
                            const toolsPanelTop = imageTop; // Match screenshot's top position
                            
                            toolsPanel.style.left = `${toolsPanelLeft}px`;
                            toolsPanel.style.top = `${toolsPanelTop}px`;
                            toolsPanel.style.right = 'auto'; // Remove right positioning
                            toolsPanel.style.transform = 'none'; // Remove any transforms
                            
                            // Also position dropdown if it exists
                            const dropdown = document.querySelector(`[data-pencil-dropdown-id="${screenshotId}"]`);
                            if (dropdown) {
                              dropdown.style.top = `${toolsPanelTop + containerRect.top}px`; // Match tools panel top + container offset
                              console.log(`🎨 Dropdown positioned at top: ${toolsPanelTop + containerRect.top}px`);
                            }
                            
                            console.log(`🛠️ Tools panel positioned: left=${toolsPanelLeft}px, top=${toolsPanelTop}px`);
                            console.log(`📸 Screenshot bounds: left=${imageLeft}px, top=${imageTop}px, right=${imageRight}px`);
                            
                            // Check if tools panel is going off-screen and adjust if needed
                            const viewportWidth = window.innerWidth;
                            const toolsPanelWidth = toolsPanel.offsetWidth || 100; // estimated width
                            
                            if (toolsPanelLeft + toolsPanelWidth > viewportWidth - 20) {
                              // Position on the left side of the screenshot instead
                              const leftSidePosition = imageLeft - toolsPanelWidth - 20;
                              if (leftSidePosition > 20) {
                                toolsPanel.style.left = `${leftSidePosition}px`;
                                console.log(`🛠️ Tools panel repositioned to left: left=${leftSidePosition}px`);
                              } else {
                                // If both sides are problematic, position inside the screenshot area
                                toolsPanel.style.left = `${imageLeft + 10}px`;
                                console.log(`🛠️ Tools panel positioned inside screenshot: left=${imageLeft + 10}px`);
                              }
                            }
                            
                            // Update dropdown position to match tools panel
                            setTimeout(updateDropdownPosition, 100);
                          }
                        };
                        
                        // Position immediately and retry for accuracy
                        setTimeout(positionCloseButton, 50);
                        setTimeout(positionCloseButton, 150);
                        setTimeout(positionCloseButton, 300);
                        
                        // Position tools panel with same timing
                        setTimeout(positionToolsPanel, 50);
                        setTimeout(positionToolsPanel, 150);
                        setTimeout(positionToolsPanel, 300);
                        
                        // Also position on window resize
                        const handleResize = () => {
                          positionCloseButton();
                          positionToolsPanel();
                          setTimeout(updateDropdownPosition, 50);
                        };
                        
                        window.addEventListener('resize', handleResize);
                        
                        // Cleanup on component unmount
                        setTimeout(() => {
                          window.removeEventListener('resize', handleResize);
                        }, 30000); // Remove after 30 seconds to prevent memory leaks
                        
                        // Multiple attempts to get correct dimensions with retries
                        const attemptCanvasSync = (attempt = 1) => {
                          const displayWidth = img.offsetWidth;
                          const displayHeight = img.offsetHeight;
                          const boundingRect = img.getBoundingClientRect();
                          
                          console.log(`📸 Attempt ${attempt} - Natural: ${img.naturalWidth}x${img.naturalHeight}`);
                          console.log(`� Attempt ${attempt} - Offset: ${displayWidth}x${displayHeight}`);
                          console.log(`📏 Attempt ${attempt} - BoundingRect: ${boundingRect.width}x${boundingRect.height}`);
                          
                          // Use bounding rect for most accurate dimensions
                          const finalWidth = Math.round(boundingRect.width);
                          const finalHeight = Math.round(boundingRect.height);
                          
                          if (finalWidth > 50 && finalHeight > 50) {
                            // Find and configure canvas
                            const canvas = img.parentElement.querySelector(`canvas[data-canvas-id="${canvasId}"]`);
                            if (canvas) {
                              // Get image position relative to container
                              const imgRect = img.getBoundingClientRect();
                              const containerRect = img.parentElement.getBoundingClientRect();
                              
                              // Reset canvas completely with exact positioning
                              canvas.width = finalWidth;
                              canvas.height = finalHeight;
                              canvas.style.width = finalWidth + 'px';
                              canvas.style.height = finalHeight + 'px';
                              canvas.style.position = 'absolute';
                              canvas.style.top = (imgRect.top - containerRect.top) + 'px';
                              canvas.style.left = (imgRect.left - containerRect.left) + 'px';
                              canvas.style.zIndex = '15';
                              
                              console.log(`🎨 Canvas positioned and sized: ${finalWidth}x${finalHeight}`);
                              console.log(`📍 Canvas position: top=${imgRect.top - containerRect.top}px, left=${imgRect.left - containerRect.left}px`);
                              
                              // Also reposition tools when canvas is ready
                              setTimeout(positionToolsPanel, 100);
                              
                              initializeCanvas(canvas, screenshotUrl, canvasId);
                              return true;
                            }
                          }
                          
                          // Retry if dimensions not ready
                          if (attempt < 5) {
                            setTimeout(() => attemptCanvasSync(attempt + 1), 100 * attempt);
                          }
                          return false;
                        };
                        
                        // Start synchronization process
                        setTimeout(() => attemptCanvasSync(), 50);
                      }}
                      onError={(e) => {
                        console.error('❌ Error loading maximized screenshot:', e);
                        e.target.style.opacity = '1'; // Show even if error
                      }}
                    />

                    {/* Loading indicator for smooth transitions */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-gray-100 transition-opacity duration-300"
                      style={{
                        opacity: screenshotUrl ? '0' : '1',
                        pointerEvents: 'none'
                      }}
                    >
                      <div className="text-center text-gray-500">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                        <div className="text-sm">Loading screenshot...</div>
                      </div>
                    </div>

                    {/* Canvas for drawings overlay on maximized view */}
                    <canvas
                      key={`maximized-canvas-${screenshotId}`}
                      data-canvas-id={canvasId}
                      data-screenshot-id={screenshotId}
                      className={`transition-all ${isActive
                        ? 'cursor-crosshair pointer-events-auto'
                        : 'pointer-events-none'
                        }`}
                      style={{
                        position: 'absolute',
                        pointerEvents: isActive ? 'auto' : 'none',
                        touchAction: isActive ? 'none' : 'auto',
                        zIndex: isActive ? 999 : 10,
                        border: isActive ? '2px solid #3b82f6' : 'none',
                        opacity: isActive ? 1 : 0.8
                      }}
                      onMouseDown={(e) => {
                        if (isActive) {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('🖱️ Mouse down on maximized canvas:', canvasId);
                          startDrawing(e);
                        }
                      }}
                      onMouseMove={(e) => {
                        if (isActive) {
                          e.preventDefault();
                          draw(e);
                        }
                      }}
                      onMouseUp={(e) => {
                        if (isActive) {
                          e.preventDefault();
                          stopDrawing(e);
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isActive) {
                          stopDrawing(e);
                        }
                      }}
                    />

                    {/* Drawing tools dropdown for maximized view */}
                    {isActive && showPencilDropdown === screenshotId && (
                      <div 
                        data-pencil-dropdown-id={screenshotId}
                        style={{
                          position: 'fixed',
                          left: `${Math.min(clickPosition.x + 65, window.innerWidth - 280)}px`,
                          zIndex: 1000,
                          backgroundColor: 'white',
                          borderRadius: '16px',
                          border: '2px solid #e5e7eb',
                          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                          padding: '20px',
                          minWidth: '280px',
                          maxWidth: '320px',
                          maxHeight: '70vh',
                          overflowY: 'auto',
                          backdropFilter: 'blur(10px)',
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
                        }}
                        ref={(el) => {
                          // Auto-position dropdown when it mounts
                          if (el) {
                            setTimeout(() => {
                              const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);
                              if (toolsPanel) {
                                const toolsPanelRect = toolsPanel.getBoundingClientRect();
                                el.style.top = `${toolsPanelRect.top}px`;
                                console.log(`🎨 Dropdown auto-positioned at: ${toolsPanelRect.top}px`);
                              }
                            }, 100);
                          }
                        }}
                      >
                        <div className="space-y-4">
                          {/* Tools Section */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Tools:</p>
                            <div className="grid grid-cols-5 gap-1">
                              {tools.map((tool) => (
                                <button
                                  key={tool.name}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🔧 Tool selected:', tool.name, 'for maximized canvas:', canvasId);
                                    setSelectedTool(tool.name);
                                  }}
                                  className={`p-2 text-xs border rounded hover:scale-105 transition-all duration-200 flex flex-col items-center gap-1 ${selectedTool === tool.name
                                    ? 'bg-blue-100 text-blue-700 border-blue-300'
                                    : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                    }`}
                                  title={tool.title}
                                >
                                  <span className="text-sm">{tool.icon}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Colors Section */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Colors:</p>
                            <div className="grid grid-cols-6 gap-1">
                              {colors.map((color) => (
                                <button
                                  key={color}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('🎨 Color selected:', color, 'for maximized canvas:', canvasId);
                                    setSelectedColor(color);
                                  }}
                                  className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110 ${selectedColor === color
                                    ? 'border-gray-800 scale-110 ring-2 ring-gray-300'
                                    : 'border-gray-300 hover:border-gray-500'
                                    }`}
                                  style={{ backgroundColor: color }}
                                  title={`Select ${color}`}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Line Width Section */}
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Size: {lineWidth}px</p>
                            <input
                              type="range"
                              min="1"
                              max="20"
                              value={lineWidth}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newWidth = parseInt(e.target.value);
                                console.log('📏 Line width changed:', newWidth, 'for maximized canvas:', canvasId);
                                setLineWidth(newWidth);
                              }}
                              className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(lineWidth / 20) * 100}%, #e5e7eb ${(lineWidth / 20) * 100}%, #e5e7eb 100%)`
                              }}
                            />
                          </div>

                          {/* Current Settings Display */}
                          <div className="bg-gray-50 p-2 rounded border text-center">
                            <p className="text-xs text-gray-600">
                              <span className="font-medium text-gray-800">
                                {tools.find(t => t.name === selectedTool)?.icon} {selectedTool}
                              </span>
                              {selectedTool !== 'eraser' && (
                                <>
                                  {' '}- <span
                                    className="inline-block w-3 h-3 rounded border align-middle mx-1"
                                    style={{ backgroundColor: selectedColor }}
                                  ></span>
                                  {lineWidth}px
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* Main 3-Column Grid Layout */}
      <div className="hide-scrollbar" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(250px, 1fr) minmax(400px, 2fr) minmax(250px, 1fr)',
        height: 'auto',
        minHeight: '95vh',
        width: '100%',
        maxWidth: '100vw',
        gap: 0,
        margin: 0,
        padding: 0,
        overflowY: 'visible',
        overflowX: 'hidden',
        boxSizing: 'border-box'
      }}>        {/* Left Column - User Profile and Video */}
        <div className="responsive-column hide-scrollbar" style={{
          borderRight: '1px solid #d1d5db',
          padding: '2vh 1.5vw 1vh 1.5vw',
          overflowY: 'visible',
          overflowX: 'hidden',
          minWidth: '250px',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          {/* User Profile and Logo side by side */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '2vh',
            padding: '1vh 0',
            width: '100%'
          }}>
            {/* User Profile */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1vw'
            }}>
              <div style={{
                width: '3vw',
                height: '6vh',
                borderRadius: '50%',
                overflow: 'hidden',
                minWidth: '48px',
                minHeight: '48px'
              }}>
                {getProfileImage() ? (
                  <img
                    src={getProfileImage()}
                    alt="Profile Image"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontWeight: '600',
                    fontSize: '1.2vw',
                    borderRadius: '50%'
                  }}>
                    {getInitials(getDisplayName())}
                  </div>
                )}
              </div>
              <div>
                <p style={{
                  fontSize: '0.8vw',
                  color: '#6b7280',
                  margin: 0,
                  minFontSize: '12px'
                }}>Hello,</p>
                <p style={{
                  fontWeight: '600',
                  margin: 0,
                  fontSize: '1vw',
                  minFontSize: '14px'
                }}>{getDisplayName()}</p>
              </div>
            </div>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {getLandlordLogo() ? (
                /* Actual Logo Image - No Box */
                <img 
                  src={getLandlordLogo()}
                  alt="Landlord Logo"
                  style={{
                    maxHeight: '40px',
                    maxWidth: '120px',
                    objectFit: 'contain'
                  }}
                  onError={(e) => {
                    console.error('Failed to load landlord logo:', e);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                /* Text "Logo" - With Box */
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  border: '2px solid black'
                }}>
                  <span style={{
                    fontSize: '1.2vw',
                    fontWeight: 'bold',
                    color: 'black',
                    minFontSize: '16px'
                  }}>Logo</span>
                </div>
              )}
            </div>
          </div>          {/* Live Video */}
          <div style={{
            position: 'relative',
            width: '90%',
            marginBottom: '2vh',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>            <div style={{
            backgroundColor: '#e5e7eb',
            borderRadius: '1.5vw',
            overflow: 'hidden',
            position: 'relative',
            width: '100%',
            height: 'auto',
            minHeight: '25vh',
            padding: 0,
            margin: 0,
            boxSizing: 'border-box'
          }}><video
                id="live-video"
                ref={videoRef}
                autoPlay
                playsInline
                controls={false} style={{
                  width: 'calc(100% + 2px)',
                  height: 'auto',
                  objectFit: 'cover',
                  position: 'relative',
                  borderRadius: '1.5vw',
                  transition: 'transform 0.3s ease-out',
                  transform: `scale(${zoomLevel}) translate(${videoPanX}px, ${videoPanY}px)`,
                  transformOrigin: 'center center',
                  display: 'block',
                  maxWidth: 'calc(100% + 2px)',
                  padding: 0,
                  margin: '-1px',
                  border: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  verticalAlign: 'top',
                  ...(isRecording && {
                    pointerEvents: 'none',
                    outline: 'none',
                    border: 'none'
                  }),
                  ...(zoomLevel > 1 && !isRecording && {
                    cursor: 'grab'
                  })
                }}
                onMouseMove={handleVideoPan}
                onMouseDown={(e) => {
                  if (zoomLevel > 1) {
                    e.currentTarget.style.cursor = 'grabbing';
                  }
                }}
                onMouseUp={(e) => {
                  if (zoomLevel > 1) {
                    e.currentTarget.style.cursor = 'grab';
                  }
                }}
                onMouseLeave={(e) => {
                  if (zoomLevel > 1) {
                    e.currentTarget.style.cursor = 'grab';
                  }
                }}
              />
            </div>

            {/* Live/Disconnected Status OR Recording Timer */}
            <div style={{
              position: 'absolute',
              top: '2vh',
              left: '1.5vw',
              zIndex: 10
            }}>
              {isRecording ? (
                /* Recording Timer - Shows in place of Live indicator when recording */
                <div style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.8vh 1.2vw',
                  fontSize: '0.9vw',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5vw',
                  borderRadius: '1.2vw',
                  minFontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  <span style={{
                    width: '0.8vw',
                    height: '1.5vh',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    animation: 'pulse 1s infinite',
                    minWidth: '12px',
                    minHeight: '12px'
                  }}></span>
                  <span>REC {formatRecordingTime(currentRecordingDuration)}</span>
                </div>
              ) : (
                /* Live/Disconnected Status - Shows when not recording */
                <div style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  padding: '0.8vh 1.2vw',
                  fontSize: '0.9vw',
                  fontWeight: '600',
                  borderRadius: '1.2vw',
                  minFontSize: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  {isConnected ? "● Live" : "● Disconnected"}
                </div>
              )}
            </div>

            {/* End Video Button - Shows when live on the right side */}
            {isConnected && (
              <div style={{
                position: 'absolute',
                top: '2vh',
                right: '1.5vw',
                zIndex: 10
              }}>
                <button
                  onClick={handleEndVideo}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{
                    fontSize: '0.9vw',
                    minFontSize: '14px'
                  }}
                >
                  End Video
                </button>
              </div>
            )}

            {
              showVideoPlayError &&
              <button
                className="w-[3rem] h-[3rem] bg-amber-500 text-white rounded-full absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] flex items-center justify-center cursor-pointer"
                title={`Play Video`}
                onClick={handleVideoPlay}
              >
                <Play />
              </button>
            }

            <div
              className="absolute bottom-2 left-[50%] -translate-x-[50%] text-white px-3 py-1 text-sm font-medium flex items-center gap-3"
              style={{ display: isRecording ? 'none' : 'flex' }}
            >
              <span className="w-4 h-4 rounded-full bg-red-600 block"></span>
              <span className="text-white text-lg">{isConnected ? formatTime(callDuration) : "0:00"}</span>
            </div>

            <div
              className="absolute bottom-2 right-0 text-white px-3 py-1 text-sm font-medium flex items-center gap-3 flex-col"
              style={{ display: isRecording ? 'none' : 'flex' }}
            >
              <button
                className="p-1 rounded text-white cursor-pointer hover:bg-black/20 transition-colors"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                title={`Zoom In (${Math.round(zoomLevel * 100)}%)`}
              >
                <ZoomIn className={`w-4 h-4 ${zoomLevel >= 3 ? 'opacity-50' : ''}`} />
              </button>

              {/* Zoom level indicator - clickable to reset */}
              <button
                className="text-xs bg-black/30 px-2 py-1 rounded hover:bg-black/50 transition-colors"
                onClick={handleZoomReset}
                title="Click to reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                className="p-1 rounded text-white cursor-pointer hover:bg-black/20 transition-colors"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                title={`Zoom Out (${Math.round(zoomLevel * 100)}%)`}
              >
                <ZoomOut className={`w-4 h-4 ${zoomLevel <= 0.5 ? 'opacity-50' : ''}`} />
              </button>
            </div>
          </div>

          {/* Record and Screenshot Controls */}
          <div style={{
            width: '90%',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            <div className="w-full flex gap-2 mt-2">
              <button
                onClick={handleRecordingToggle}
                disabled={!isConnected}
                className={`disabled:opacity-50 flex flex-col items-center justify-center gap-2 font-medium py-3 rounded-md transition-colors flex-1 ${isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
                  }`}
              >
                <div className="text-center leading-tight">
                  {isRecording ? (
                    <div>
                      <div>Stop</div>
                      <div className="text-sm">({formatRecordingTime(currentRecordingDuration)})</div>
                    </div>
                  ) : (
                    <div>
                      <div>Record</div>
                      <div>Video</div>
                    </div>
                  )}
                </div>
              </button>

              <button onClick={() => takeScreenshot(handleScreenshotTaken)} disabled={!isConnected || isCapturingScreenshot} className="disabled:opacity-50 flex flex-col items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-medium py-3 rounded-md transition-colors flex-1">
                <div className="text-center leading-tight">
                  {isCapturingScreenshot ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto mb-1"></div>
                    </>
                  ) : (
                    <>
                      <div>Take</div>
                      <div>Screenshot</div>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>        {/* Center Column - Videos and Screenshots */}
        <div className="space-y-6 border-r border-gray-300 min-w-0 flex flex-col items-start justify-start hide-scrollbar" style={{
          maxHeight: '100%',
          overflowY: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '3vh',
          paddingLeft: '1vw',
          paddingRight: '1vw',
          paddingBottom: '1vh'
        }}>
          {/* Video Recording Section */}
          <div className="w-full px-4">
            <h2 className="text-lg font-medium mb-3 text-left ml-3 mr-3">Video Recording(s): {displayRecordingsCount()}</h2>
            <div className="overflow-y-visible min-h-[8rem]">
              <div className="flex gap-3 overflow-x-auto pb-2 justify-start ml-3 mr-3" style={{ scrollbarWidth: 'thin' }}>
                {recordings.length === 0 && (
                  <h1>No recordings</h1>
                )}

                {recordings.map((recording) => (
                  <div key={recording.id} className="relative group flex-shrink-0 w-[15vw] min-w-[180px]">
                    <img src="/icons/ci_label.svg" className="mb-2" />
                    <div
                      data-recording-id={recording.id}
                      className="aspect-[9/16] bg-gray-200 rounded-md overflow-hidden relative cursor-pointer"
                      onClick={(e) => {
                        const video = e.currentTarget.querySelector('video');
                        if (video.paused) {
                          video.play();
                        } else {
                          video.pause();
                        }
                      }}>

                      <video
                        src={recording.url}
                        controls={true}
                        muted={false}
                        className="w-full h-full object-cover"
                        onPlay={() => setPlayingVideos(prev => new Set(prev).add(recording.id))}
                        onPause={() => setPlayingVideos(prev => {
                          const newSet = new Set(prev);
                          newSet.delete(recording.id);
                          return newSet;
                        })}
                      />

                      {/* Action icons moved to top left corner, vertical alignment */}
                      <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveIndividualRecording(recording);
                          }}
                          className={`p-1 hover:bg-black/20 rounded text-white ${recording.isExisting || savingRecordingId === recording.id ? 'opacity-50' : ''}`}
                          title={recording.isExisting ? "Already saved" : "Save recording"}
                          disabled={recording.isExisting || savingRecordingId === recording.id}
                        >
                          {savingRecordingId === recording.id ? (
                            <div className="w-4 h-4 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRecording(recording);
                          }}
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Minimize/Maximize icons at top right corner, horizontal alignment */}
                      <div className="absolute top-2 right-2 flex flex-row gap-1 z-10">
                        <button
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Minimize"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Minimize2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 hover:bg-black/20 rounded text-white"
                          title="Maximize"
                          onClick={(e) => {
                            e.stopPropagation();
                            maximizeVideo(recording);
                          }}
                        >
                          <Expand className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>))}              </div>
            </div>          {/*Screenshot Section */}
            <div className="w-full px-4">
              <h2 className="text-lg font-medium mb-3 text-left">
               Screenshot(s): {getTotalScreenshotCount() > 0 && getTotalScreenshotCount()}
                
              </h2>
              <div className="overflow-y-visible min-h-[8rem]">
                <div className="flex gap-3 overflow-x-auto pb-2 justify-start" style={{ scrollbarWidth: 'thin' }}>
                  {(existingScreenshots.length === 0 && screenshots.length === 0) && (
                    <h1>No screenshots</h1>
                  )}

                  {/* Sort existing screenshots to ensure chronological order (oldest first) */}
                  {existingScreenshots
                    .sort((a, b) => {
                      // Convert timestamp strings to Date objects for proper comparison
                      const dateA = new Date(a.timestamp);
                      const dateB = new Date(b.timestamp);
                      return dateA - dateB; // Ascending order (oldest first)
                    })
                    .map((screenshot, index) => (
                      <div key={`existing-${screenshot.id}`} className="flex-shrink-0 w-[15vw] min-w-[180px]">
                        <img src="/icons/ci_label.svg" className="mb-2" />
                        <div className="aspect-square bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center relative cursor-pointer group"
                             onClick={() => maximizeScreenshot(screenshot, index, true)}>
                          {/* Enhanced Click to view design for saved screenshots */}
                          <div className="text-center text-green-700 p-6 transition-all duration-300 group-hover:text-green-800">
                            <div className="w-12 h-12 mx-auto mb-3 bg-green-200 rounded-full flex items-center justify-center group-hover:bg-green-300 transition-colors duration-300">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div className="text-sm font-semibold mb-1">Click to view</div>
                            <div className="text-xs font-medium opacity-80">
                              Screenshot {index + 1}<br />
                              Saved
                            </div>
                          </div>

                          {/* Subtle border animation on hover */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    ))}

                  {/* Render new screenshots in chronological order (as they were taken) */}
                  {[...screenshots].map((screenshot, index) => {
                    // ENHANCED: Handle both object and string screenshot formats
                    const screenshotData = typeof screenshot === 'object' ? screenshot.data : screenshot;
                    // FIXED: Use more reliable unique ID for each screenshot
                    const screenshotId = typeof screenshot === 'object' ?
                      (screenshot.id || `screenshot-${screenshot.timestamp || Date.now()}-${Math.random()}`) :
                      `screenshot-${index}-${Date.now()}-${Math.random()}`;
                    const screenshotUniqueId = typeof screenshot === 'object' ? screenshot.uniqueId : `${index}`;

                    // Check if this screenshot is saved
                    const isSaved = getScreenshotStatus(screenshotId);

                    // FIXED: Use screenshot ID as canvasId to keep drawings attached to the correct screenshot
                    const canvasId = screenshotId;
                    const isActive = activePencilScreenshot === canvasId;
                    const shouldShowDropdown = showPencilDropdown === canvasId;

                    // FIXED: Use clean screenshot URL without excessive unique identifiers
                    const cleanScreenshotUrl = screenshotData.split('#')[0];

                    console.log(`🖼️ Rendering screenshot ${index}:`, { canvasId, screenshotId, isSaved }); 
                    
                    return (
                      <div key={`screenshot-container-${screenshotId}`} className="relative pencil-dropdown-container flex-shrink-0 w-[15vw] min-w-[180px]">
                        <img src="/icons/ci_label.svg" className="mb-2" />
                        <div className={`aspect-square bg-gradient-to-br ${
                          isSaved 
                            ? 'from-green-50 to-green-100 border-green-200' 
                            : 'from-blue-50 to-blue-100 border-blue-200'
                        } border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center relative cursor-pointer group`}
                             onClick={() => {
                               console.log('🔍 Maximizing screenshot:', { index, cleanScreenshotUrl });
                               maximizeScreenshot({...screenshot,id: screenshotId}, index, false);
                             }}>
                          {/* Enhanced Click to view design */}
                          <div className={`text-center ${
                            isSaved ? 'text-green-700' : 'text-blue-700'
                          } p-6 transition-all duration-300 ${
                            isSaved ? 'group-hover:text-green-800' : 'group-hover:text-blue-800'
                          }`}>
                            <div className={`w-12 h-12 mx-auto mb-3 ${
                              isSaved ? 'bg-green-200' : 'bg-blue-200'
                            } rounded-full flex items-center justify-center ${
                              isSaved ? 'group-hover:bg-green-300' : 'group-hover:bg-blue-300'
                            } transition-colors duration-300`}>
                              {isSaved ? (
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </div>
                            <div className="text-sm font-semibold mb-1">Click to view</div>
                            <div className="text-xs font-medium opacity-80">
                              Screenshot {existingScreenshots.length + index + 1}
                              {isSaved && <><br />Saved</>}
                            </div>
                          </div>

                          {/* Subtle border animation on hover */}
                          <div className={`absolute inset-0 rounded-xl ${
                            isSaved 
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400' 
                              : 'bg-gradient-to-r from-blue-400 to-purple-400'
                          } opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>                          {/* Action buttons - Only Save and Delete */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            {/* Save button - FIRST */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSaved && !savingScreenshotIds.has(screenshotId)) {
                                  saveIndividualScreenshot(cleanScreenshotUrl, index, screenshotId);
                                }
                              }}
                              className={`p-1 hover:bg-black/20 rounded text-white ${
                                isSaved || savingScreenshotIds.has(screenshotId) ? 'opacity-50' : ''
                              }`}
                              title={isSaved ? "Already saved" : "Save screenshot"}
                              disabled={isSaved || savingScreenshotIds.has(screenshotId)}
                            >
                              {savingScreenshotIds.has(screenshotId) ? (
                                <div className="w-4 h-4 flex items-center justify-center">
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>
                            {/* Delete button - SECOND */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNewScreenshot(index, screenshotId);
                              }}
                              className="p-1 hover:bg-black/20 rounded text-white"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Create Share Link Button */}
            <button
              onClick={handleCreateShareLink}
              className="w-full bg-orange-400 hover:bg-orange-500 text-white font-medium py-4 rounded-md transition-colors mt-8 mb-2 flex flex-col gap-1 items-center justify-center"
            >
              <span>Create Share Link</span>
              <span className="text-xs font-normal">(Copy and paste link to your job ticket or any system)</span>
            </button>

            {/* End Video Buttons */}
            <div className="w-full flex items-center gap-4 mt-6">
              <button 
                onClick={() => handleSaveAndRedirect(null)} 
                disabled={!isConnected || isEndingVideo} 
                className={`${isEndingVideo ? 'bg-red-400' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre`}
              >
                {isEndingVideo ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-xs">Ending...</span>
                  </div>
                ) : (
                  <>End Video Recording<br /> Without Saving</>
                )}
              </button>
              <button
                onClick={() => handleSaveAndRedirect(() => performSave({ disconnectVideo: false }))}
                disabled={isSaveDisabled() || isEndingVideo}
                className={`${isEndingVideo ? 'bg-green-400' : 'bg-green-500 hover:bg-green-600'} disabled:opacity-50 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre`}
              >
                {isEndingVideo ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-xs">Saving & Ending...</span>
                  </div>                ) : (
                  <div className="text-center">
                    Save Images and <br />
                    Form Data
                  </div>
                )}</button>
            </div>
          </div>
        </div>        {/* Right Column - MOVED OUTSIDE LEFT COLUMN */}
        <div className="space-y-6 hide-scrollbar" style={{
          maxHeight: 'none',
          overflowY: 'visible',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          paddingTop: '2vh',
          paddingLeft: '1.5vw',
          paddingRight: '1.5vw',
          paddingBottom: '1vh',
          minWidth: '250px',
          maxWidth: '100%'
        }}>{/* Resident Name */}
          <div>
            <input
              type="text"
              id="residentName"
              value={residentName}
              onChange={(e) => setResidentName(e.target.value)}
              placeholder="Resident Name"
              className="w-full p-3 bg-gray-50 border border-black rounded-lg focus:outline-none focus:border-transparent focus:ring-2 focus:ring-orange-300"
              style={{ borderWidth: '3px' }}
            />
          </div>{/* Resident Information */}
          <div>
            <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-3">
              <div className="flex-1">
                <label htmlFor="residentAddress" className="block text-lg font-medium mb-2">
                  Resident Address :
                </label>                {/* Address Line 1 */}
                <div className="mb-3">
                  <textarea
                    placeholder="Address line 1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    rows={1}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                {/* Address Line 2 */}
                <div className="mb-3">
                  <textarea
                    placeholder="Address line 2"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    rows={1}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>                {/* Address Line 3 */}                <div className="mb-3">
                  <textarea
                    placeholder="Address line 3"
                    value={addressLine3}
                    onChange={(e) => setAddressLine3(e.target.value)}
                    rows={1}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>                {/* Additional Address Lines */}
                {addressLines.map((line, index) => (
                  <div key={index} className="mb-3">
                    <textarea
                      placeholder={`Address line ${index + 4}`}
                      value={line}
                      onChange={(e) => updateAddressLine(index, e.target.value)}
                      rows={1}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                ))}

                {/* Address line + after all address lines */}
                <div className="flex justify-end mt-2">
                  <span
                    onClick={addAddressLine}
                    className="text-gray-600 cursor-pointer hover:text-gray-800 text-sm"
                    title="Add address line"
                  >
                    Address line +
                  </span>
                </div>
              </div>
            </div>            {/* Post Code */}
            <div className="mb-3 -mt-[26px]">
              <div className="w-[62.5%]">
                <textarea
                  placeholder="Postcode:"
                  value={actualPostCode}
                  onChange={(e) => setActualPostCode(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  rows={1}
                />
              </div>
            </div>
            <div className="mb-3">
              <textarea
                placeholder="Phone no:"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                rows={1}
              />
            </div>            <div className="mb-3">
              <textarea
                id="postCode"
                value={postCode}
                onChange={(e) => setPostCode(e.target.value)}
                placeholder="Ref:"
                rows={1}
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>          </div>          {/* Repair/Work Details */}          <div>            <div className="flex items-center gap-3 mb-2 flex-nowrap">
              <label className="block text-lg font-medium whitespace-nowrap">
                Repair/Work Details:
              </label>
              <Plus
                className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-800 flex-shrink-0"
                strokeWidth={3}
                title="Add work detail"
                onClick={addWorkDetail}
              />
              <button
                className="px-3 py-1 mr-4 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors mt-1 flex-shrink-0 shadow-lg"
                title="Target Time"
              >
                <span className="text-xs font-medium whitespace-nowrap">Target Time</span>
              </button>
            </div>
            {/* Default Field 1 */}            <div className="mb-3 flex items-center gap-2 relative">
              <textarea
                placeholder="Work detail 1"
                value={workDetail1}
                onChange={(e) => setWorkDetail1(e.target.value)}
                rows={1}
                className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <div className="relative" data-dropdown-id="field1">
                <button
                  onClick={() => handleTTDropdownToggle('field1')}
                  className="p-3 bg-gray-50 text-black border border-gray-300 rounded-full flex items-center gap-1 hover:bg-gray-100 transition-colors"
                  title="Target Time Dropdown"
                >
                  <span className="text-sm font-medium">{getTTDisplayText('field1')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}                {showTTDropdown === 'field1' && (                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    {ttOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleTTOptionSelect('field1', option)}
                        className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${
                          selectedTTValues['field1'] === option 
                            ? 'bg-orange-300 text-white' 
                            : 'hover:bg-orange-200 hover:bg-opacity-30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Default Field 2 */}            <div className="mb-3 flex items-center gap-2 relative">
              <textarea
                placeholder="Work detail 2"
                value={workDetail2}
                onChange={(e) => setWorkDetail2(e.target.value)}
                rows={1}
                className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <div className="relative" data-dropdown-id="field2">
                <button
                  onClick={() => handleTTDropdownToggle('field2')}
                  className="p-3 bg-gray-50 text-black border border-gray-300 rounded-full flex items-center gap-1 hover:bg-gray-100 transition-colors"
                  title="Target Time Dropdown"
                >
                  <span className="text-sm font-medium">{getTTDisplayText('field2')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}                {showTTDropdown === 'field2' && (                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    {ttOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleTTOptionSelect('field2', option)}
                        className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${
                          selectedTTValues['field2'] === option 
                            ? 'bg-orange-300 text-white' 
                            : 'hover:bg-orange-200 hover:bg-opacity-30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Default Field 3 */}            <div className="mb-3 flex items-center gap-2 relative">
              <textarea
                placeholder="Work detail 3"
                value={workDetail3}
                onChange={(e) => setWorkDetail3(e.target.value)}
                rows={1}
                className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <div className="relative" data-dropdown-id="field3">
                <button
                  onClick={() => handleTTDropdownToggle('field3')}
                  className="p-3 bg-gray-50 text-black border border-gray-300 rounded-full flex items-center gap-1 hover:bg-gray-100 transition-colors"
                  title="Target Time Dropdown"
                >
                  <span className="text-sm font-medium">{getTTDisplayText('field3')}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}                {showTTDropdown === 'field3' && (                  <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    {ttOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleTTOptionSelect('field3', option)}
                        className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${
                          selectedTTValues['field3'] === option 
                            ? 'bg-orange-300 text-white' 
                            : 'hover:bg-orange-200 hover:bg-opacity-30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>            {/* Additional Work Details */}
            {workDetails.map((detail, index) => (
              <div key={index} className="flex items-center gap-2 mb-3 relative">
                <textarea
                  placeholder={`Work detail ${index + 4}`}
                  value={detail}
                  onChange={(e) => updateWorkDetail(index, e.target.value)}
                  rows={1}
                  className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <div className="relative" data-dropdown-id={`workDetail${index}`}>
                  <button
                    onClick={() => handleTTDropdownToggle(`workDetail${index}`)}
                    className="p-3 bg-gray-50 text-black border border-gray-300 rounded-full flex items-center gap-1 hover:bg-gray-100 transition-colors"
                    title="Target Time Dropdown"
                  >
                    <span className="text-sm font-medium">{getTTDisplayText(`workDetail${index}`)}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {showTTDropdown === `workDetail${index}` && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                      {ttOptions.map((option, optionIndex) => (
                        <button
                          key={optionIndex}
                          onClick={() => handleTTOptionSelect(`workDetail${index}`, option)}
                          className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${
                            selectedTTValues[`workDetail${index}`] === option 
                              ? 'bg-orange-300 text-white' 
                              : 'hover:bg-orange-200 hover:bg-opacity-30'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>))}
          </div>
          {/* Large Text Box */}          {/* Special Notes Section with Show/Hide Toggle */}
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-2">
              <label className="block text-lg font-medium">
                Special Notes:
              </label>
              <div className="flex bg-gray-200 rounded-full p-1">
                <button
                  onClick={() => setShowSpecialNotes(true)}
                  className={`px-3 py-1 rounded-full transition-colors text-sm font-medium ${showSpecialNotes
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-300'
                    }`}
                  title="Show Special Notes"
                >
                  Show
                </button>
                <button
                  onClick={() => setShowSpecialNotes(false)}
                  className={`px-3 py-1 rounded-full transition-colors text-sm font-medium ${!showSpecialNotes
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-300'
                    }`}
                  title="Hide Special Notes"
                >
                  Hide
                </button>
              </div>
            </div>            {/* Text Area with Slide Animation */}
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showSpecialNotes ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
              <textarea
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                rows={5}
                placeholder="Enter any special notes or additional information..."
                className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-vertical"
              />
            </div>
          </div></div>
      </div>
    </div>
    </>
  )
}
