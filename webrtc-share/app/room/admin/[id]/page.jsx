"use client"
import { useState, useRef, use, useEffect, useCallback } from "react"
import { Trash2, Plus, Maximize2, VideoIcon, PlayIcon, Save, Edit, Minimize2, Expand, ZoomIn, ZoomOut, Pencil, X, Play, ChevronDown, Eraser, Palette, RotateCcw, Loader2, Copy, Link as LinkIcon, ExternalLink, Check, Zap } from "lucide-react"
import useWebRTC from "@/hooks/useWebRTC"
import useDrawingTools from "@/hooks/useDrawingTools"
import { createRequest, getMeetingByMeetingId, deleteRecordingRequest, deleteScreenshotRequest, getSpecialNotes, getStructuredSpecialNotes, saveStructuredSpecialNotes } from "@/http/meetingHttp"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useDialog } from "@/provider/DilogsProvider"
import { Button } from "@/components/ui/button"
import { logoutRequest } from "@/http/authHttp"
import { useUser } from "@/provider/UserProvider"
import FloatingResendButton from "@/components/FloatingResendButton"
import SpecialNotesDialog from "@/components/dialogs/SpecialNotesDialog"

export default function Page({ params }) {
  if (!params) {
    console.error('Missing params in Page component');
    return <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}><p>Loading...</p></div>;
  }

  const resolvedParams = use(params);
  const id = resolvedParams?.id;

  if (!id) {
    console.error('Missing meeting ID');
    return <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}><p>Invalid meeting ID</p></div>;
  }

  const router = useRouter();



  const [ui, setUI] = useState({
    isClient: false,
    showDropdown: false,
    showTTDropdown: null,
    showSpecialNotes: false,
    maximizedItem: null,
    showPencilDropdown: null,
    activePencilScreenshot: null,
    clickPosition: { x: 0, y: 0 }
  });

  const [form, setForm] = useState({
    targetTime: "Emergency 24 Hours",
    selectedTTValues: {},
    residentName: "",
    first_name: "",
    last_name: "",
    house_name_number: "",
    flat_apartment_room: "",
    street_road: "",
    city: "",
    country: "",
    postCode: "",
    actualPostCode: "",
    phoneNumber: "",
    repairDetails: "",
    specialNotes: "",
    workDetails: []
  });

  const [media, setMedia] = useState({
    recordings: [],
    existingScreenshots: [],
    isRecording: false,
    mediaRecorder: null,
    recordingStream: null,
    playingVideos: new Set(),
    recordingStartTime: null,
    currentRecordingDuration: 0,
    videoProgress: {}
  });

  const [app, setApp] = useState({
    callDuration: 0,
    existingMeetingData: null,
    isLoadingMeetingData: true,
    screenshotSavedStatus: new Map(),
    isSaving: false,
    isEndingSave: false,
    isEndingVideo: false,
    savingRecordingId: null,
    savingScreenshotIndex: null,
    savingScreenshotIds: new Set(),
    saveInProgress: false,
    tokenLandlordInfo: null,
    isLoadingTokenInfo: true,
    zoomLevel: 1,
    videoPanX: 0,
    videoPanY: 0,
    torchEnabled: false
  });

  const [structuredSpecialNotes, setStructuredSpecialNotes] = useState({});

  const {
    colors, tools, selectedColor, setSelectedColor, selectedTool, setSelectedTool,
    lineWidth, setLineWidth, initializeCanvas, startDrawing, draw, stopDrawing,
    clearCanvas, mergeWithBackground, drawingData
  } = useDrawingTools();

  const videoRef = useRef(null);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const recordingChunks = useRef([]);
  const recordingTimerRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const processedItemsRef = useRef(new Set());

  const {
    handleDisconnect, isConnected, screenshots, takeScreenshot, startPeerConnection, deleteScreenshot, handleVideoPlay, showVideoPlayError, isCapturingScreenshot, updateScreenshotProperties,
    handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, mousePosition, isMouseDown,
    handleCameraZoom, handleCameraTorch
  } = useWebRTC(true, id, videoRef);
  const { setResetOpen, setMessageOpen, setLandlordDialogOpen, setTickerOpen, setFeedbackOpen, setFaqOpen, setShareLinkOpen, setInviteOpen } = useDialog();
  const { user, isAuth, setIsAuth, setUser } = useUser();

  const ttOptions = ["Emergency 24 Hours", "Urgent (7 Days)", "Routine (28 Days)", "Follow Up Work", "Other"];

  const updateUI = (updates) => setUI(prev => ({ ...prev, ...updates }));
  const updateForm = (updates) => setForm(prev => ({ ...prev, ...updates }));
  const updateMedia = (updates) => setMedia(prev => ({ ...prev, ...updates }));
  const updateApp = (updates) => setApp(prev => ({ ...prev, ...updates }));

  const handleTTDropdownToggle = (fieldId) => updateUI({ showTTDropdown: ui.showTTDropdown === fieldId ? null : fieldId });

  const handleTTOptionSelect = (fieldId, option) => {
    updateForm({ selectedTTValues: { ...form.selectedTTValues, [fieldId]: option } });
    updateUI({ showTTDropdown: null });
  };

  const getTTDisplayText = (fieldId) => {
    const selected = form.selectedTTValues[fieldId];
    return selected ? selected.substring(0, 3) + '...' : 'T T';
  };

  const addAddressLine = () => updateForm({ addressLines: [...form.addressLines, ""] });
  const updateAddressLine = (index, value) => updateForm({ addressLines: form.addressLines.map((line, i) => i === index ? value : line) });
  const removeAddressLine = (index) => updateForm({ addressLines: form.addressLines.filter((_, i) => i !== index) });

  const addWorkDetail = () => updateForm({ workDetails: [...form.workDetails, ""] });
  const updateWorkDetail = (index, value) => updateForm({ workDetails: form.workDetails.map((detail, i) => i === index ? value : detail) });
  const removeWorkDetail = (index) => updateForm({ workDetails: form.workDetails.filter((_, i) => i !== index) });

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
      updateApp({ isEndingVideo: true });
      if (saveAction) await saveAction();
      handleDisconnect(false); // Don't redirect here, we'll do it manually

      // Explicitly redirect to dashboard after save
      setTimeout(() => {
        router.push("../../../dashboard");
      }, 500);
    } catch (error) {
      console.error('Error in save and redirect:', error);
      updateApp({ isEndingVideo: false });
    }
  };

  useEffect(() => {
    try {
      updateUI({ isClient: true });
    } catch (error) {
      console.error('Error setting isClient:', error);
    }
  }, []);

  useEffect(() => {
    if (!ui.isClient || !id) return;

    const fetchExistingMeetingData = async () => {
      updateApp({ isLoadingMeetingData: true });
      try {

        const response = await getMeetingByMeetingId(id);

        if (response?.data?.success) {
          if (response?.data?.isNewMeeting) {
            // This is a new meeting - no existing data to load

            updateApp({ existingMeetingData: null });
          } else if (response?.data?.meeting) {
            // Existing meeting found - load the data
            const meetingData = response.data.meeting;


            updateForm({
              residentName: meetingData.name || "",
              first_name: meetingData.first_name || "",
              last_name: meetingData.last_name || "",
              house_name_number: meetingData.house_name_number || "",
              flat_apartment_room: meetingData.flat_apartment_room || "",
              street_road: meetingData.street_road || "",
              city: meetingData.city || "",
              country: meetingData.country || "",
              postCode: meetingData.reference || "",
              actualPostCode: meetingData.post_code || "",
              phoneNumber: meetingData.phone_number || "",
              repairDetails: meetingData.repair_detail || "",
              targetTime: meetingData.target_time || "Emergency 24 Hours",
              specialNotes: meetingData.special_notes || "",
              workDetails: Array.isArray(meetingData.work_details) ? meetingData.work_details : []
            });

            if (meetingData.work_details && Array.isArray(meetingData.work_details)) {
              let workDetail1Text = "", workDetail2Text = "", workDetail3Text = "";
              const additionalWorkDetails = [], ttValues = {};

              meetingData.work_details.forEach((wd) => {
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

              updateForm({
                workDetail1: workDetail1Text,
                workDetail2: workDetail2Text,
                workDetail3: workDetail3Text,
                workDetails: additionalWorkDetails,
                selectedTTValues: ttValues
              });
            }

            if (meetingData.recordings?.length > 0) {
              const existingRecordings = meetingData.recordings.map(rec => ({
                id: rec._id || Date.now() + Math.random(),
                url: rec.url,
                blob: null,
                timestamp: new Date(rec.timestamp).toLocaleString(),
                duration: rec.duration || 0,
                isExisting: true
              }));
              updateMedia({ recordings: existingRecordings });
            }

            if (meetingData.screenshots?.length > 0) {
              const existingScreenshotsData = meetingData.screenshots.map(screenshot => ({
                id: screenshot._id || Date.now() + Math.random(),
                url: screenshot.url,
                timestamp: new Date(screenshot.timestamp).toLocaleString(),
                isExisting: true
              }));
              updateMedia({ existingScreenshots: existingScreenshotsData });

            }

            updateApp({ existingMeetingData: meetingData });
          }
        }
      } catch (error) {
        if (error.code === 'ERR_NETWORK') {
          // Cannot connect to server - this is normal if server is starting up
        } else if (error?.response?.status === 500) {
          // Server error while fetching meeting data - this may be temporary
        } else if (error.code === 'ECONNABORTED') {
          // Request timeout while fetching meeting data
        } else {
          // Error fetching meeting data
        }
      } finally {
        updateApp({ isLoadingMeetingData: false, isLoadingTokenInfo: false });
      }
    };

    fetchExistingMeetingData();
  }, [id, ui.isClient]);

  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const debouncedSave = useCallback((saveFunction) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (!app.saveInProgress) saveFunction();
    }, 300);
  }, [app.saveInProgress]);

  const isSaveDisabled = useCallback(() => {
    return (!isConnected && media.recordings.length === 0 && screenshots.length === 0) || app.isSaving || app.isEndingSave || app.saveInProgress;
  }, [isConnected, media.recordings.length, screenshots.length, app.isSaving, app.isEndingSave, app.saveInProgress]);

  const performSave = useCallback(async (options = {}) => {
    const { disconnectVideo = false } = options;


    const newRecordings = media.recordings.filter(recording => !recording.isExisting && recording.blob);
    const existingRecordings = media.recordings.filter(recording => recording.isExisting);
    const recordingsData = [], processedRecordings = new Set();

    for (let i = 0; i < newRecordings.length; i++) {
      const recording = newRecordings[i];
      const recordingKey = `${recording.id}-${recording.timestamp}`;

      if (processedRecordings.has(recordingKey)) {

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

      } catch (error) {

      }
    }

    const screenshotsData = [], processedScreenshots = new Set();

    for (let i = 0; i < screenshots.length; i++) {
      const screenshot = screenshots[i];
      let screenshotIdentifier, screenshotData, screenshotId;

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

      if (getScreenshotStatus(screenshotId)) {

        continue;
      }

      const screenshotKey = `screenshot-${i}-${screenshotIdentifier}`;

      if (processedScreenshots.has(screenshotKey)) {

        continue;
      }

      processedScreenshots.add(screenshotKey);

      try {
        let finalScreenshotData = typeof screenshotData === 'string' ? screenshotData : String(screenshotData);
        if (finalScreenshotData.indexOf('#') > 0) {
          finalScreenshotData = finalScreenshotData.split('#')[0];
        }

        const canvasId = screenshotId;


        let hasDrawings = false;
        if (drawingData[canvasId]?.strokes?.length > 0) {

          try {
            const mergedData = await mergeWithBackground(finalScreenshotData, canvasId);
            if (mergedData && mergedData !== finalScreenshotData) {
              finalScreenshotData = mergedData;
              hasDrawings = true;
            }
          } catch (mergeError) {
            // Error merging drawings for screenshot
          }
        } else {
          const alternativeCanvasIds = [`new-${i}`, `screenshot-${i}`, screenshotIdentifier];

          for (const altCanvasId of alternativeCanvasIds) {
            if (drawingData[altCanvasId]?.strokes?.length > 0) {

              try {
                const mergedData = await mergeWithBackground(finalScreenshotData, altCanvasId);
                if (mergedData && mergedData !== finalScreenshotData) {
                  finalScreenshotData = mergedData;
                  hasDrawings = true;

                  break;
                }
              } catch (mergeError) {

              }
            }
          }

          if (!hasDrawings) {

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


      } catch (error) {

        let fallbackData;
        try {
          fallbackData = typeof screenshotData === 'object' ? JSON.stringify(screenshotData) : String(screenshotData);
          if (typeof fallbackData === 'string' && fallbackData.indexOf('#') > 0) {
            fallbackData = fallbackData.split('#')[0];
          }
        } catch (fallbackError) {

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
    }

    const formData = {
      meeting_id: id,
      name: form.residentName,
      first_name: form.first_name,
      last_name: form.last_name,
      house_name_number: form.house_name_number,
      flat_apartment_room: form.flat_apartment_room,
      street_road: form.street_road,
      city: form.city,
      country: form.country,
      post_code: form.actualPostCode,
      phone_number: form.phoneNumber,
      reference: form.postCode,
      repair_detail: form.repairDetails,
      work_details: [
        ...(form.repairDetails?.trim() ? [{
          detail: form.repairDetails.trim(),
          target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...(form.workDetail1?.trim() ? [{
          detail: form.workDetail1.trim(),
          target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...(form.workDetail2?.trim() ? [{
          detail: form.workDetail2.trim(),
          target_time: form.selectedTTValues['field2'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...(form.workDetail3?.trim() ? [{
          detail: form.workDetail3.trim(),
          target_time: form.selectedTTValues['field3'] || "Emergency 24 Hours",
          timestamp: new Date().toISOString()
        }] : []),
        ...form.workDetails
          .filter(detail => detail?.trim())
          .map((detail, index) => ({
            detail: detail.trim(),
            target_time: form.selectedTTValues[`workDetail${index}`] || "Emergency 24 Hours",
            timestamp: new Date().toISOString()
          }))
      ],
      target_time: form.targetTime,
      special_notes: form.specialNotes,
      recordings: recordingsData,
      screenshots: screenshotsData,
      update_mode: app.existingMeetingData ? 'update' : 'create'
    };



    try {
      const response = await createRequest(formData);


      if (response?.data?.upload_summary || response?.data?.media_summary) {
        const summary = response.data.upload_summary || response.data.media_summary;
        const recordingsUploaded = summary.recordings_uploaded || summary.new_recordings_added || 0;
        const recordingsAttempted = summary.recordings_attempted || recordingsData.length;
        const screenshotsUploaded = summary.screenshots_uploaded || summary.new_screenshots_added || 0;
        const screenshotsAttempted = summary.screenshots_attempted || screenshotsData.length;

        const recordingsFailed = recordingsAttempted - recordingsUploaded;
        const screenshotsFailed = screenshotsAttempted - screenshotsUploaded;
        const totalSuccessful = recordingsUploaded + screenshotsUploaded;
        const totalFailed = recordingsFailed + screenshotsFailed;

        if (totalFailed === 0 && totalSuccessful > 0) {
          toast.success("All content saved successfully!", {
            description: `${screenshotsUploaded} screenshots and ${recordingsUploaded} recordings saved.`
          });
        } else if (totalSuccessful > 0 && totalFailed > 0) {
          let description = `${totalSuccessful} items saved successfully.`;
          if (recordingsFailed > 0) {
            description += ` ${recordingsFailed} recording(s) failed (file too large - max 10MB).`;
          }
          if (screenshotsFailed > 0) {
            description += ` ${screenshotsFailed} screenshot(s) failed.`;
          }

          toast.warning("Partial save completed", { description });
        } else if (totalFailed > 0 && totalSuccessful === 0) {
          let description = "Save failed. ";
          if (recordingsFailed > 0) {
            description += `${recordingsFailed} recording(s) too large (max 10MB). `;
          }
          if (screenshotsFailed > 0) {
            description += `${screenshotsFailed} screenshot(s) failed. `;
          }
          description += "Try reducing file sizes.";

          toast.error("Save failed");
        }
      }

      // Get backend IDs from response and update local screenshots
      if (response?.data?.meeting?.screenshots && screenshotsData.length > 0) {
        const backendScreenshots = response.data.meeting.screenshots;
        const recentScreenshots = backendScreenshots.filter(s => {
          const screenshotTime = new Date(s.timestamp);
          const now = new Date();
          const timeDiff = now - screenshotTime;
          return timeDiff < 60000; // Within last minute
        });



        // Update local screenshots with backend IDs
        const updatedScreenshots = screenshots.map((screenshot, index) => {
          const screenshotData = typeof screenshot === 'object' ? screenshot.data : screenshot;
          const screenshotId = typeof screenshot === 'object' ?
            (screenshot.id || `screenshot-${screenshot.timestamp || Date.now()}-${Math.random()}`) :
            `screenshot-${index}-${Date.now()}-${Math.random()}`;

          // Find matching backend screenshot
          const matchingBackendScreenshot = recentScreenshots.find(bs => {
            // Try to match by timestamp or other criteria
            const bsTime = new Date(bs.timestamp);
            const now = new Date();
            const timeDiff = Math.abs(now - bsTime);
            return timeDiff < 60000; // Within last minute
          });

          if (matchingBackendScreenshot) {
            const updatedScreenshot = {
              ...screenshot,
              backendId: matchingBackendScreenshot._id,
              isSaved: true,
              savedAt: new Date().toISOString()
            };
            console.log('Updated screenshot with backend ID:', updatedScreenshot.backendId, 'Local ID:', screenshotId);
            return updatedScreenshot;
          }

          return screenshot;
        });

        console.log('Updated local screenshots with backend IDs');

        // Use updateScreenshotProperties to update each screenshot
        screenshots.forEach((screenshot, index) => {
          const screenshotId = typeof screenshot === 'object' ? screenshot.id : null;
          if (screenshotId) {
            const matchingBackendScreenshot = recentScreenshots.find(bs => {
              const bsTime = new Date(bs.timestamp);
              const now = new Date();
              const timeDiff = Math.abs(now - bsTime);
              return timeDiff < 60000; // Within last minute
            });

            if (matchingBackendScreenshot) {
              updateScreenshotProperties(screenshotId, {
                backendId: matchingBackendScreenshot._id,
                isSaved: true,
                savedAt: new Date().toISOString()
              });


              // Verify the update worked
              setTimeout(() => {
                const updatedScreenshot = screenshots.find(s => s.id === screenshotId);

              }, 100);
            } else {
              updateScreenshotProperties(screenshotId, {
                isSaved: true,
                savedAt: new Date().toISOString()
              });

            }
          }
        });
      }

      // Save structured special notes if present
      try {
        if (structuredSpecialNotes && Object.keys(structuredSpecialNotes).length > 0) {
          await saveStructuredSpecialNotes(id, structuredSpecialNotes);
        }
      } catch (err) {
        toast.error("Failed to save special notes");
      }

    } catch (error) {

      if (error?.response?.data?.message?.includes('File size too large')) {
        toast.error("Recording too large", {
          description: "Video file exceeds 10MB limit. Try recording shorter videos or reduce quality."
        });
      } else if (error?.response?.data?.message?.includes('timeout')) {
        toast.error("Upload timeout", {
          description: "Upload took too long. Please try again with smaller files."
        });
      } else {
        toast.error("Save failed");
      }

      throw error;
    }

    updateUI({ activePencilScreenshot: null, showPencilDropdown: null });

    screenshotsData.forEach(screenshot => {
      if (screenshot.canvasId && drawingData[screenshot.canvasId]) {

        delete drawingData[screenshot.canvasId];
      }
      if (screenshot.originalScreenshotId) {
        markScreenshotAsSaved(screenshot.originalScreenshotId);

      }
    });

    updateMedia({ recordings: media.recordings.map(rec => ({ ...rec, isExisting: true })) });

    if (!app.existingMeetingData) {
      updateApp({
        existingMeetingData: {
          meeting_id: id,
          name: form.residentName,
          first_name: form.first_name,
          last_name: form.last_name,
          house_name_number: form.house_name_number,
          flat_apartment_room: form.flat_apartment_room,
          street_road: form.street_road,
          city: form.city,

          country: form.country,
          post_code: form.actualPostCode,
          phone_number: form.phoneNumber,
          repair_detail: form.repairDetails,
          target_time: form.targetTime
        }
      });
    }

    return { recordingsData, screenshotsData };
  }, [
    media.recordings, screenshots, drawingData, mergeWithBackground, deleteScreenshot,
    id, form, app.existingMeetingData, structuredSpecialNotes
  ]);

  const handleZoom = (direction) => {
    updateApp(prev => {
      const newZoom = direction === 'in'
        ? Math.min(prev.zoomLevel + 0.25, 3)
        : Math.max(prev.zoomLevel - 0.25, 0.5);

      console.log(`Zooming ${direction} to:`, newZoom);

      if (newZoom <= 1) {
        return { zoomLevel: newZoom, videoPanX: 0, videoPanY: 0 };
      }

      return { zoomLevel: newZoom };
    });
  };

  const handleZoomReset = () => {
    updateApp({ zoomLevel: 1, videoPanX: 0, videoPanY: 0 });
    console.log('Zoom reset to 1x');
  };

  const handleVideoPan = (e) => {
    if (app.zoomLevel <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const panX = (centerX - mouseX) * 0.5;
    const panY = (centerY - mouseY) * 0.5;

    updateApp({ videoPanX: panX, videoPanY: panY });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            handleZoom('in');
            break;
          case '-':
            e.preventDefault();
            handleZoom('out');
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
      updateApp({ zoomLevel: 1, videoPanX: 0, videoPanY: 0 });
    }
  }, [isConnected]);

  const handleEndVideoAndSave = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    e?.stopImmediatePropagation?.();

    if (app.isEndingSave || app.isSaving || app.saveInProgress) {
      console.log('End video save already in progress');
      return;
    }

    try {
      updateApp({ saveInProgress: true, isEndingSave: true });
      console.log('Starting End Video and Save process...');

      if (isConnected) handleDisconnect();
      if (media.isRecording) stopScreenRecording();

      await new Promise(resolve => setTimeout(resolve, 1000));
      await performSave({ disconnectVideo: true });

      console.log('Video ended and content saved');
      updateApp({ isLoadingMeetingData: false, saveInProgress: false, isEndingSave: false });
      router.push("../../../dashboard");

    } catch (error) {
      console.error('End Video and Save failed:', error);

      if (!error?.handledByPerformSave) {
        toast.error("Failed to end video and save content");
      }
    } finally {
      updateApp({ isEndingSave: false, saveInProgress: false });
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    e?.stopImmediatePropagation?.();

    if (app.isSaving || app.isEndingSave || app.saveInProgress) {

      return;
    }

    try {
      updateApp({ saveInProgress: true, isSaving: true });
      await performSave();

    } catch (error) {


      if (!error?.handledByPerformSave) {
        toast.error("Failed to save repair");
      }
    } finally {
      updateApp({ isSaving: false, saveInProgress: false });
    }
  };

  const handleLogout = async () => {
    try {
      const res = await logoutRequest();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=none";
      toast("Logout Successful", { description: res.data.message });
      setIsAuth(false);
      setUser(null);
      router.push('../');
    } catch (error) {
      setIsAuth(false);
      setUser(null);
      localStorage.clear();
      toast("Logout Unsuccessful", { description: "Failed to logout properly. Please refresh the page." });
      router.push('../');
    }
  };

  const handleDashboard = () => {
    updateApp({ isLoadingMeetingData: false, saveInProgress: false, isEndingSave: false, isSaving: false });
    router.push("/dashboard");
  };

  useEffect(() => {
    if (!ui.isClient) return;

    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);
    const savedDuration = localStorage.getItem(`call-duration-${id}`);

    if (isConnected && !startTimeRef.current) {
      if (savedStartTime) {
        const savedTime = parseInt(savedStartTime);
        const elapsedSinceStart = Math.floor((Date.now() - savedTime) / 1000);
        startTimeRef.current = savedTime;
        updateApp({ callDuration: elapsedSinceStart });

      } else {
        const startTime = Date.now();
        startTimeRef.current = startTime;
        localStorage.setItem(`call-start-time-${id}`, startTime.toString());

      }

      timerRef.current = setInterval(() => {
        const currentDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        updateApp({ callDuration: currentDuration });
        localStorage.setItem(`call-duration-${id}`, currentDuration.toString());
      }, 1000);
    }

    if (!isConnected && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      startTimeRef.current = null;
      updateApp({ callDuration: 0 });
      localStorage.removeItem(`call-start-time-${id}`);
      localStorage.removeItem(`call-duration-${id}`);

    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, id, ui.isClient]);

  useEffect(() => {
    if (!ui.isClient) return;

    const savedDuration = localStorage.getItem(`call-duration-${id}`);
    const savedStartTime = localStorage.getItem(`call-start-time-${id}`);

    if (savedDuration && savedStartTime && !isConnected) {
      const duration = parseInt(savedDuration);
      updateApp({ callDuration: duration });

    }
  }, [id, ui.isClient]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatRecordingTime = (seconds) => formatTime(seconds);

  useEffect(() => {
    if (media.isRecording && media.recordingStartTime) {
      recordingTimerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - media.recordingStartTime) / 1000);
        updateMedia({ currentRecordingDuration: elapsed });
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      updateMedia({ currentRecordingDuration: 0 });
    }

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [media.isRecording, media.recordingStartTime]);

  const startScreenRecording = async () => {


    try {
      if (!videoRef.current?.srcObject) {

        toast.error('No video stream available');
        return;
      }



      const startTime = Date.now();
      updateMedia({ recordingStartTime: startTime });

      if (videoRef.current) {
        videoRef.current.controls = false;
        videoRef.current.style.pointerEvents = 'none';
      }

      const stream = videoRef.current.srcObject;
      updateMedia({ recordingStream: stream });

      const recorderOptions = [
        { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 150000000, audioBitsPerSecond: 256000 },
        { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 120000000 },
        { mimeType: 'video/webm;codecs=h264,avc1', videoBitsPerSecond: 100000000 },
        { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 80000000 },
        { mimeType: 'video/webm', videoBitsPerSecond: 60000000 }
      ];

      let selectedOption = recorderOptions.find(option => MediaRecorder.isTypeSupported(option.mimeType));

      if (!selectedOption) {

        toast.error('Recording format not supported');
        return;
      }



      const recorder = new MediaRecorder(stream, selectedOption);
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

        const blob = new Blob(recordingChunks.current, { type: selectedOption.mimeType });
        const videoUrl = URL.createObjectURL(blob);

        const newRecording = {
          id: Date.now(),
          url: videoUrl,
          blob: blob,
          timestamp: new Date().toLocaleString(),
          duration: duration
        };

        setMedia(prev => ({
          ...prev,
          recordings: [...prev.recordings, newRecording],
          isRecording: false,
          recordingStartTime: null
        }));



        const fileSizeMB = blob.size / 1024 / 1024;
        if (fileSizeMB > 8) {
          toast.warning(`Recording saved but file is large (${fileSizeMB.toFixed(1)}MB)`);
        } else {
          toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
        }
      };

      updateMedia({ mediaRecorder: recorder, isRecording: true });
      recorder.start(50);
      toast.success('Video recording started');

    } catch (error) {

      toast.error('Failed to start recording');

      try {
        console.log('Attempting fallback recording...');

        const stream = videoRef.current.srcObject;
        const startTime = Date.now();
        updateMedia({ recordingStartTime: startTime });

        const recorder = new MediaRecorder(stream, {
          mimeType: 'video/webm',
          videoBitsPerSecond: 50000000,
          audioBitsPerSecond: 192000
        });

        if (videoRef.current) {
          videoRef.current.controls = false;
          videoRef.current.style.pointerEvents = 'none';
        }

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

          setMedia(prev => ({
            ...prev,
            recordings: [...prev.recordings, newRecording],
            isRecording: false,
            recordingStartTime: null
          }));

          const fileSizeMB = blob.size / 1024 / 1024;
          if (fileSizeMB > 8) {
            toast.warning(`Recording saved but file is large (${fileSizeMB.toFixed(1)}MB)`);
          } else {
            toast.success(`Recording completed (${fileSizeMB.toFixed(1)}MB)`);
          }
        };

        updateMedia({ mediaRecorder: recorder, isRecording: true });
        recorder.start(100);
        toast.success('Video recording started');
      } catch (fallbackError) {

        toast.error('Failed to start video recording');
        updateMedia({ recordingStartTime: null, isRecording: false });
      }
    }
  };

  const stopScreenRecording = () => {
    if (media.mediaRecorder?.state === 'recording') {
      media.mediaRecorder.stop();
      if (videoRef.current) {
        videoRef.current.style.pointerEvents = 'auto';
      }
      toast.success('Recording stopped');
    }
  };

  const handleRecordingToggle = () => {
    if (media.isRecording) {
      stopScreenRecording();
    } else {
      startScreenRecording();
    }
  };

  const saveIndividualRecording = useCallback(async (recording) => {
    if (recording.isExisting) {
      toast.info("Recording already saved");
      return;
    }

    const itemKey = `recording-${recording.id}`;

    if (processedItemsRef.current.has(itemKey)) {

      return;
    }

    processedItemsRef.current.add(itemKey);

    try {
      updateApp({ savingRecordingId: recording.id });


      toast.loading("Saving recording...", { id: `save-recording-${recording.id}` });

      const base64Data = await blobToBase64(recording.blob);
      const recordingsData = [{
        data: base64Data,
        timestamp: recording.timestamp,
        duration: recording.duration,
        size: recording.blob.size
      }];

      const formData = {
        meeting_id: id,
        name: form.residentName,
        first_name: form.first_name,
        last_name: form.last_name,
        house_name_number: form.house_name_number,
        flat_apartment_room: form.flat_apartment_room,
        street_road: form.street_road,
        city: form.city,
        country: form.country,
        post_code: form.postCode,
        phone_number: form.phoneNumber,
        reference: form.postCode,
        repair_detail: form.repairDetails,
        work_details: [
          { detail: form.repairDetails, target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours", timestamp: new Date().toISOString() },
          ...(form.workDetail1?.trim() ? [{ detail: form.workDetail1.trim(), target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...(form.workDetail2?.trim() ? [{ detail: form.workDetail2.trim(), target_time: form.selectedTTValues['field2'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...(form.workDetail3?.trim() ? [{ detail: form.workDetail3.trim(), target_time: form.selectedTTValues['field3'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...form.workDetails.map((detail, index) => ({ detail: detail.trim(), target_time: form.selectedTTValues[`workDetail${index}`] || "Emergency 24 Hours", timestamp: new Date().toISOString() }))
        ].filter(item => item.detail?.trim()),
        target_time: form.targetTime,
        special_notes: form.specialNotes,
        recordings: recordingsData,
        screenshots: [],
        update_mode: app.existingMeetingData ? 'update' : 'create'
      };

      const response = await createRequest(formData);

      if (response?.data?.upload_summary || response?.data?.media_summary) {
        const summary = response.data.upload_summary || response.data.media_summary;
        const recordingsUploaded = summary.recordings_uploaded || summary.new_recordings_added || 0;

        if (recordingsUploaded > 0) {
          toast.success("Recording saved successfully!", { id: `save-recording-${recording.id}` });
          setMedia(prev => ({
            ...prev,
            recordings: prev.recordings.map(r => r.id === recording.id ? { ...r, isExisting: true } : r)
          }));
        } else {
          toast.error("Recording too large", {
            id: `save-recording-${recording.id}`,
            description: "Video file exceeds 10MB limit. Try recording shorter videos."
          });
        }
      } else {
        toast.success("Recording saved successfully!", { id: `save-recording-${recording.id}` });
        setMedia(prev => ({
          ...prev,
          recordings: prev.recordings.map(r => r.id === recording.id ? { ...r, isExisting: true } : r)
        }));
      }

    } catch (error) {


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
        toast.error("Failed to save recording");
      }
    } finally {
      updateApp({ savingRecordingId: null });
      processedItemsRef.current.delete(itemKey);
    }
  }, [id, form, app.existingMeetingData, media.recordings]);

  const deleteRecording = async (recording) => {
    try {
      if (recording.isExisting) {


        try {
          const response = await deleteRecordingRequest(id, recording.id);
          toast.success(response.data.timeout ? "Recording deletion requested (processing in background)" : "Recording deleted successfully!");
        } catch (error) {

          toast.info("Recording removed from view but backend deletion failed");
        }
      } else {

      }

      setMedia(prev => ({
        ...prev,
        recordings: prev.recordings.filter(r => {
          if (r.id === recording.id && r.url) {
            URL.revokeObjectURL(r.url);
          }
          return r.id !== recording.id;
        })
      }));

      if (!recording.isExisting) {
        toast.success("Recording removed!");
      }
    } catch (error) {

      toast.error("Failed to delete recording");
    }
  };

  const deleteExistingScreenshot = async (screenshot) => {
    try {
      // Handle different input formats
      let backendId;
      if (typeof screenshot === 'object' && screenshot !== null) {
        // Case 1: Full screenshot object (from maximized view)
        if (screenshot.backendId) {
          backendId = screenshot.backendId;
        } else if (screenshot.id && screenshot.id.match(/^[0-9a-fA-F]{24}$/)) {
          // Case 2: Object with MongoDB ObjectId as id
          backendId = screenshot.id;
        } else {
          // Case 3: Object with local screenshot id (not a backend ID)

          toast.error("Cannot delete screenshot - invalid ID format");
          return;
        }
      } else {

        toast.error("Cannot delete screenshot - invalid parameter");
        return;
      }

      const response = await deleteScreenshotRequest(id, backendId);

      toast.success(response.data.timeout ? "Screenshot deletion requested (processing in background)" : "Screenshot deleted successfully!");

      // Remove from existing screenshots if it's there
      setMedia(prev => {
        const filteredScreenshots = prev.existingScreenshots.filter(s => s.id !== backendId);
        return {
          ...prev,
          existingScreenshots: filteredScreenshots
        };
      });

      // Also remove from local screenshots array if it has the same backend ID
      const localScreenshotIndex = screenshots.findIndex(s => s.backendId === backendId);
      if (localScreenshotIndex !== -1) {
        deleteScreenshot(localScreenshotIndex);
      }

    } catch (error) {

      toast.error("Failed to delete screenshot");
    }
  };

  const deleteNewScreenshot = (screenshotIndex, screenshotId) => {
    try {


      const canvasId = screenshotId || `new-${screenshotIndex}`;
      if (drawingData[canvasId]) {

        delete drawingData[canvasId];
      }

      deleteScreenshot(screenshotIndex);
      toast.success("Screenshot removed!");
    } catch (error) {

      toast.error("Failed to delete screenshot");
    }
  };

  const markScreenshotAsSaved = (screenshotId) => {
    updateApp({ screenshotSavedStatus: new Map(app.screenshotSavedStatus).set(screenshotId, true) });
  };

  const getScreenshotStatus = (screenshotId) => {
    // Check the saved status map first
    const savedStatus = app.screenshotSavedStatus.get(screenshotId);
    if (savedStatus) return true;

    // Also check if the screenshot object itself has isSaved property
    const screenshot = screenshots.find(s => {
      const id = typeof s === 'object' ? s.id : null;
      return id === screenshotId;
    });

    return screenshot?.isSaved || false;
  };



  const saveIndividualScreenshot = useCallback(async (screenshotData, index, screenshotId) => {
    const itemKey = `screenshot-${screenshotId || index}`;

    if (processedItemsRef.current.has(itemKey) || app.savingScreenshotIds.has(screenshotId)) {

      return;
    }

    processedItemsRef.current.add(itemKey);

    try {
      updateApp({
        savingScreenshotIndex: index,
        savingScreenshotIds: new Set(app.savingScreenshotIds).add(screenshotId)
      });


      toast.loading("Saving screenshot...", { id: `save-screenshot-${screenshotId}` });

      let finalScreenshotData = screenshotData.split('#')[0];

      const possibleCanvasIds = [
        screenshotId,
        `new-${index}`,
        `maximized-canvas-${screenshotId}`,
        `maximized-canvas-new-${index}`,
        `screenshot-${index}-${Date.now()}-${Math.random()}`
      ].filter(Boolean);



      let foundCanvasId = null;
      let foundDrawingData = null;

      for (const canvasId of possibleCanvasIds) {
        if (drawingData[canvasId]?.strokes?.length > 0) {
          foundCanvasId = canvasId;
          foundDrawingData = drawingData[canvasId];

          break;
        }
      }

      if (foundCanvasId && foundDrawingData) {

        try {
          finalScreenshotData = await mergeWithBackground(finalScreenshotData, foundCanvasId);

        } catch (mergeError) {

        }
      }

      const screenshotsData = [{
        data: finalScreenshotData,
        timestamp: new Date().toISOString(),
        size: finalScreenshotData.length,
        quality: 'ultra_high',
        index: index,
        hasDrawings: foundCanvasId !== null && foundDrawingData !== null
      }];

      const formData = {
        meeting_id: id,
        name: form.residentName,
        first_name: form.first_name,
        last_name: form.last_name,
        house_name_number: form.house_name_number,
        flat_apartment_room: form.flat_apartment_room,
        street_road: form.street_road,
        city: form.city,
        country: form.country,
        post_code: form.actualPostCode,
        phone_number: form.phoneNumber,
        reference: form.postCode,
        repair_detail: form.repairDetails,
        work_details: [
          ...(form.repairDetails?.trim() ? [{ detail: form.repairDetails.trim(), target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...(form.workDetail1?.trim() ? [{ detail: form.workDetail1.trim(), target_time: form.selectedTTValues['field1'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...(form.workDetail2?.trim() ? [{ detail: form.workDetail2.trim(), target_time: form.selectedTTValues['field2'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...(form.workDetail3?.trim() ? [{ detail: form.workDetail3.trim(), target_time: form.selectedTTValues['field3'] || "Emergency 24 Hours", timestamp: new Date().toISOString() }] : []),
          ...form.workDetails
            .filter(detail => detail?.trim())
            .map((detail, workIndex) => ({ detail: detail.trim(), target_time: form.selectedTTValues[`workDetail${workIndex}`] || "Emergency 24 Hours", timestamp: new Date().toISOString() }))
        ],
        target_time: form.targetTime,
        special_notes: form.specialNotes,
        recordings: [],
        screenshots: screenshotsData,
        update_mode: app.existingMeetingData ? 'update' : 'create'
      };



      const response = await createRequest(formData);

      if (response?.data?.upload_summary || response?.data?.media_summary) {

        const summary = response.data.upload_summary || response.data.media_summary;
        const screenshotsUploaded = summary.screenshots_uploaded || summary.new_screenshots_added || 0;

        if (screenshotsUploaded > 0) {
          toast.success(
            screenshotsData[0].hasDrawings
              ? "Screenshot with drawings saved successfully!"
              : "Screenshot saved successfully!",
            { id: `save-screenshot-${screenshotId}` }
          );

          markScreenshotAsSaved(screenshotId);



          // Get the backend ID from the response
          let backendId = null;
          if (response?.data?.meeting?.screenshots) {
            // Find the newly added screenshot by matching the data or timestamp
            const newScreenshots = response.data.meeting.screenshots.filter(s => {
              // Check if this screenshot was just added (has recent timestamp)
              const screenshotTime = new Date(s.timestamp);
              const now = new Date();
              const timeDiff = now - screenshotTime;
              return timeDiff < 60000; // Within last minute
            });



            if (newScreenshots.length > 0) {
              // Get the most recent one
              const latestScreenshot = newScreenshots[newScreenshots.length - 1];
              backendId = latestScreenshot._id;

            }
          }




          // Update the screenshot in the local array to include backend ID and mark as saved
          const updatedScreenshots = screenshots.map((screenshot, i) => {
            if (i === index) {
              const updatedScreenshot = {
                ...screenshot,
                backendId: backendId,
                isSaved: true,
                savedAt: new Date().toISOString()
              };

              return updatedScreenshot;
            }
            return screenshot;
          });

          // Update the screenshots array without removing it
          // Note: This assumes screenshots is managed by useWebRTC hook
          // We need to update the local state to reflect the saved status

          // Use the updateScreenshotProperties function to update the screenshot
          if (backendId) {
            updateScreenshotProperties(screenshotId, {
              backendId: backendId,
              isSaved: true,
              savedAt: new Date().toISOString(),
              data: finalScreenshotData,
              url: finalScreenshotData
            });


            // Verify the update worked
            setTimeout(() => {
              const updatedScreenshot = screenshots.find(s => s.id === screenshotId);
            }, 100);
          } else {
            updateScreenshotProperties(screenshotId, {
              isSaved: true,
              savedAt: new Date().toISOString()
            });
            console.log('Screenshot marked as saved using updateScreenshotProperties');
          }



          updateUI({ activePencilScreenshot: null, showPencilDropdown: null });

          if (foundCanvasId && drawingData[foundCanvasId]) {
            console.log('Cleaning up drawing data after successful save');
            delete drawingData[foundCanvasId];

            const relatedCanvasIds = [
              `maximized-canvas-${screenshotId}`,
              `new-${index}`,
              `maximized-canvas-new-${index}`
            ];

            relatedCanvasIds.forEach(relatedId => {
              if (drawingData[relatedId]) {
                console.log('Also clearing related canvas data:', relatedId);
                delete drawingData[relatedId];
              }
            });
          }

          console.log(`Screenshot ${index} successfully saved with backend ID: ${backendId}`);
        } else {
          toast.error("Screenshot too large", {
            id: `save-screenshot-${screenshotId}`,
            description: "Screenshot file is too large. Try reducing image quality."
          });
        }
      } else {
        toast.success("Screenshot saved successfully!", { id: `save-screenshot-${screenshotId}` });

        markScreenshotAsSaved(screenshotId);
        // Update the screenshot in the local array to mark as saved
        const updatedScreenshots = screenshots.map((screenshot, i) => {
          if (i === index) {
            return {
              ...screenshot,
              isSaved: true,
              savedAt: new Date().toISOString()
            };
          }
          return screenshot;
        });

        console.log('Screenshot marked as saved locally');

        // Use updateScreenshotProperties for the fallback case too
        updateScreenshotProperties(screenshotId, {
          isSaved: true,
          savedAt: new Date().toISOString()
        });
        console.log('Screenshot marked as saved using updateScreenshotProperties (fallback)');
      }

    } catch (error) {
      console.error('Save screenshot failed:', error);

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
        toast.error("Failed to save screenshot");
      }
    } finally {
      updateApp({
        savingScreenshotIndex: null,
        savingScreenshotIds: new Set([...app.savingScreenshotIds].filter(id => id !== screenshotId))
      });
      processedItemsRef.current.delete(itemKey);
    }
  }, [
    id, form, app.existingMeetingData, drawingData, mergeWithBackground,
    app.savingScreenshotIds, markScreenshotAsSaved, screenshots, updateScreenshotProperties
  ]);

  const maximizeVideo = useCallback((recording) => {
    updateUI({ maximizedItem: { type: 'video', id: recording.id, data: recording } });
  }, []);

  const maximizeScreenshot = useCallback((screenshot, index, isExisting = false) => {
    updateUI({ maximizedItem: { type: 'screenshot', id: screenshot.id, data: screenshot, index: isExisting ? null : index, isExisting } });
  }, []);

  const handleScreenshotTaken = useCallback((screenshot, index) => {
    maximizeScreenshot(screenshot, index, false);
  }, [maximizeScreenshot]);

  const closeMaximized = useCallback(() => {
    if (ui.maximizedItem?.type === 'screenshot' && !ui.maximizedItem.isExisting) {
      const screenshotId = ui.maximizedItem.data.id;
      const canvasId = screenshotId;

      const mergedScreenshotKey = `merged-${screenshotId}`;
      if (window.tempMergedScreenshots?.[mergedScreenshotKey]) {
        console.log('Cleaning up temporary merged screenshot data:', mergedScreenshotKey);
        delete window.tempMergedScreenshots[mergedScreenshotKey];
      }

      const img = document.getElementById(`maximized-img-${ui.maximizedItem.id}`);
      if (img?.cleanupPositioning) {
        console.log('Cleaning up positioning event listeners');
        img.cleanupPositioning();
      }

      if (drawingData[canvasId]?.isSaved) {
        console.log('Cleaning up saved drawing data on close:', canvasId);
        delete drawingData[canvasId];

        const relatedCanvasIds = [
          `maximized-canvas-${screenshotId}`,
          `new-${ui.maximizedItem.index}`,
          `maximized-canvas-new-${ui.maximizedItem.index}`
        ];

        relatedCanvasIds.forEach(relatedId => {
          if (drawingData[relatedId]?.isSaved) {
            console.log('Also clearing related saved canvas data:', relatedId);
            delete drawingData[relatedId];
          }
        });
      }
    }

    updateUI({ activePencilScreenshot: null, showPencilDropdown: null, maximizedItem: null });
  }, [ui.maximizedItem, drawingData]);

  useEffect(() => {
    return () => {
      const images = document.querySelectorAll('[id^="maximized-img-"]');
      images.forEach(img => {
        if (img.cleanupPositioning) {
          img.cleanupPositioning();
        }
      });

      if (window.tempMergedScreenshots) {
        delete window.tempMergedScreenshots;
      }
    };
  }, []);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (ui.maximizedItem) closeMaximized();
        if (ui.showTTDropdown) updateUI({ showTTDropdown: null });
        if (ui.showPencilDropdown) updateUI({ showPencilDropdown: null, activePencilScreenshot: null });
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [ui.maximizedItem, ui.showTTDropdown, ui.showPencilDropdown]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const isCanvasClick = e.target.tagName === 'CANVAS' ||
        e.target.closest('[data-canvas-id]') ||
        e.target.hasAttribute('data-canvas-id');

      if (ui.showTTDropdown) {
        const dropdownElement = document.querySelector(`[data-dropdown-id="${ui.showTTDropdown}"]`);
        if (dropdownElement && !dropdownElement.contains(e.target)) {
          updateUI({ showTTDropdown: null });
        }
      }
      if (ui.showPencilDropdown && !isCanvasClick) {
        const pencilDropdownElement = document.querySelector(`[data-pencil-dropdown-id="${ui.showPencilDropdown}"]`);
        const toolsButton = document.querySelector('[data-tools-button]');

        if (pencilDropdownElement && !pencilDropdownElement.contains(e.target) &&
          (!toolsButton || !toolsButton.contains(e.target))) {
          updateUI({ showPencilDropdown: null, activePencilScreenshot: null });
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ui.showTTDropdown, ui.showPencilDropdown]);

  const handlePencilClick = useCallback((canvasId, screenshotId, screenshotData = null, index = null) => {
    console.log('Pencil button clicked for canvas:', canvasId, 'screenshot ID:', screenshotId);
    console.log('Current state - active:', ui.activePencilScreenshot, 'dropdown:', ui.showPencilDropdown);

    const activeId = screenshotId || canvasId;
    const isInMinimizedView = !ui.maximizedItem;

    if (isInMinimizedView && screenshotData && index !== null) {
      console.log('Pencil clicked in minimized view - maximizing screenshot');

      maximizeScreenshot(screenshotData, index, false);
      setSelectedTool('brush');
      updateUI({ activePencilScreenshot: activeId });

      console.log('Screenshot maximized with pencil tool activated (no dropdown)');
      return;
    }

    if (ui.showPencilDropdown === activeId) {
      console.log('Closing dropdown for:', activeId);
      updateUI({ showPencilDropdown: null, activePencilScreenshot: null });
    } else {
      console.log('Opening dropdown for:', activeId);
      updateUI({ activePencilScreenshot: activeId, showPencilDropdown: activeId });

      if (selectedTool !== 'brush') {
        setSelectedTool('brush');
      }
    }
  }, [ui.activePencilScreenshot, ui.showPencilDropdown, ui.maximizedItem, maximizeScreenshot, selectedTool]);

  const getLandlordName = () => app.tokenLandlordInfo?.landlordName || user?.landlordInfo?.landlordName || null;

  const getLandlordLogo = () => {
    const isValidImageUrl = (url) => url && (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://'));

    if (app.tokenLandlordInfo?.landlordLogo && isValidImageUrl(app.tokenLandlordInfo.landlordLogo)) {
      return app.tokenLandlordInfo.landlordLogo;
    }
    if (user?.landlordInfo?.landlordLogo && isValidImageUrl(user.landlordInfo.landlordLogo)) {
      return user.landlordInfo.landlordLogo;
    }
    return null;
  };

  const getTotalRecordingsCount = () => media.recordings.length;
  const displayRecordingsCount = () => getTotalRecordingsCount() || null;

  const getScreenshotSavedCount = () => {
    let savedCount = media.existingScreenshots.length;
    screenshots.forEach((screenshot, index) => {
      const screenshotId = typeof screenshot === 'object' ?
        (screenshot.id || `screenshot-${index}-${Date.now()}`) :
        `screenshot-${index}-${Date.now()}`;
      if (getScreenshotStatus(screenshotId) || screenshot.isSaved) {
        savedCount++;
      }
    });
    return savedCount;
  };

  const getScreenshotUnsavedCount = () => {
    let unsavedCount = 0;
    screenshots.forEach((screenshot, index) => {
      const screenshotId = typeof screenshot === 'object' ?
        (screenshot.id || `screenshot-${index}-${Date.now()}`) :
        `screenshot-${index}-${Date.now()}`;
      if (!getScreenshotStatus(screenshotId) && !screenshot.isSaved) {
        unsavedCount++;
      }
    });
    return unsavedCount;
  };

  const getTotalScreenshotCount = () => media.existingScreenshots.length + screenshots.length;

  const getProfileImage = () => {
    const isValidImageUrl = (url) => url && (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://'));

    if (app.tokenLandlordInfo?.profileImage && isValidImageUrl(app.tokenLandlordInfo.profileImage)) {
      return app.tokenLandlordInfo.profileImage;
    }

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

  // Helper function to get profile shape class
  const getProfileShapeClass = () => {
    const shape = user?.landlordInfo?.profileShape || app.tokenLandlordInfo?.profileShape;
    if (shape === 'square') {
      return 'rounded-lg';
    } else if (shape === 'circle') {
      return 'rounded-full';
    }
    return 'rounded-full'; // default
  };

  // Helper function to get image object fit class based on shape
  const getImageObjectFitClass = () => {
    const shape = user?.landlordInfo?.profileShape || app.tokenLandlordInfo?.profileShape;
    if (shape === 'square') {
      return 'object-contain'; // For square, use contain to show full image
    } else {
      return 'object-cover'; // For circle, use cover to fill the circle
    }
  };

  const getDisplayName = () => {
    const landlordName = getLandlordName();
    // if (landlordName) return landlordName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

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

  // --- Share Link Generator State ---
  const [shareLink, setShareLink] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkGenerated, setLinkGenerated] = useState(false);

  // --- Generate Share Link Function (copied/enhanced from DilogsProvider.js) ---
  const generateShareLink = () => {
    if (!id) return "";
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    let shareUrl = `${baseUrl}/share/${id}`;
    const urlParams = new URLSearchParams();
    if (user?.landlordInfo?.landlordName) {
      urlParams.append('senderName', encodeURIComponent(user.landlordInfo.landlordName));
    }
    // Always add landlordLogo if available (dashboard style)
    if (user?.landlordInfo?.landlordLogo && (user.landlordInfo.landlordLogo.startsWith('http') || user.landlordInfo.landlordLogo.startsWith('data:'))) {
      urlParams.append('landlordLogo', encodeURIComponent(user.landlordInfo.landlordLogo));
    }
    if (user?.landlordInfo?.useLandlordLogoAsProfile && user?.landlordInfo?.landlordLogo) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.landlordLogo));
      urlParams.append('profileType', 'logo');
      if (user?.landlordInfo?.profileShape) {
        urlParams.append('profileShape', user.landlordInfo.profileShape);
      }
    } else if (user?.landlordInfo?.officerImage) {
      urlParams.append('senderProfile', encodeURIComponent(user.landlordInfo.officerImage));
      urlParams.append('profileType', 'officer');
      if (user?.landlordInfo?.profileShape) {
        urlParams.append('profileShape', user.landlordInfo.profileShape);
      }
    }
    const paramString = urlParams.toString();
    if (paramString) {
      shareUrl += `?${paramString}`;
    }
    return shareUrl;
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      processedItemsRef.current.clear();
    };
  }, []);

  // Add state for first and last name
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const isInitialLoad = useRef(true);
  // Dialog state for Special Notes
  const [specialNotesDialogOpen, setSpecialNotesDialogOpen] = useState(false);
  const [specialNotesDialogData, setSpecialNotesDialogData] = useState(null);
  const [specialNotesLoading, setSpecialNotesLoading] = useState(false);

  // When loading meeting data, split residentName only on initial load
  useEffect(() => {
    if (isInitialLoad.current && form.residentName) {
      const parts = form.residentName.split(" ");
      if (parts.length > 1) {
        setFirstName(parts[0]);
        setLastName(parts.slice(1).join(" "));
      } else {
        setFirstName(form.residentName);
        setLastName("");
      }
      isInitialLoad.current = false;
    }
    // eslint-disable-next-line
  }, [form.residentName]);

  // When firstName or lastName changes, update form.residentName
  useEffect(() => {
    if (!isInitialLoad.current) {
      updateForm({ residentName: (firstName + (lastName ? " " + lastName : "")).trim() });
    }
    // eslint-disable-next-line
  }, [firstName, lastName]);

  // When opening dialog, use local state
  const handleOpenSpecialNotesDialog = async () => {
    setSpecialNotesDialogOpen(true);
  };

  // Dialog save: only update local state
  const handleSpecialNotesDialogSave = (dialogState) => {
    setStructuredSpecialNotes(dialogState);
    setSpecialNotesDialogOpen(false);
  };

  // Handler for dialog close
  const handleSpecialNotesDialogClose = () => {
    setSpecialNotesDialogOpen(false);
  };

  // When loading meeting data, also load structured special notes from backend (if meeting exists)
  useEffect(() => {
    if (!ui.isClient || !id) return;

    // Only fetch structured notes if we have an existing meeting
    if (!app.existingMeetingData) {
      setStructuredSpecialNotes({});
      return;
    }

    const fetchStructuredNotes = async () => {
      try {
        console.log('Fetching structured special notes for existing meeting');
        const res = await getStructuredSpecialNotes(id);
        setStructuredSpecialNotes(res.data.structured_special_notes || {});
      } catch (err) {
        console.log('Failed to fetch structured notes:', err.message);
        setStructuredSpecialNotes({});
      }
    };
    fetchStructuredNotes();
  }, [id, ui.isClient, app.existingMeetingData]);

  if (!ui.isClient) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>Loading video session...</p>
        </div>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  if (!id) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <p style={{ color: '#ef4444', fontSize: '18px', fontWeight: '600' }}>Error: Invalid meeting ID</p>
      </div>
    );
  }

  return (
    <>
      {app.isEndingVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e5e7eb', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '500' }}>Redirecting you to the Dashboard screen...</p>
        </div>
      )}

      <div className="hide-scrollbar" style={{ width: '100vw', height: 'auto', minHeight: '100vh', margin: 0, padding: '1vh 1vw', fontFamily: 'sans-serif', overflow: 'auto', boxSizing: 'border-box' }}>
        <style dangerouslySetInnerHTML={{ __html: `* { box-sizing: border-box; } .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; overflow-x: hidden; } body { overflow-x: hidden; } .responsive-column { padding: 1vh 1vw; height: auto; overflow-y: visible; overflow-x: hidden; } .responsive-content { width: 100%; height: auto; min-height: fit-content; }` }} />

        {ui.maximizedItem && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '2vh 2vw' }}>
            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ui.maximizedItem.type === 'video' && (
                <>
                  <button
                    id="maximize-close-button-video"
                    onClick={closeMaximized}
                    style={{ position: 'absolute', top: '10%', right: '33.3%', zIndex: 100, padding: '8px', backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.4)', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backdropFilter: 'blur(10px)', opacity: '1', visibility: 'visible' }}
                  >
                    <X style={{ width: '18px', height: '18px', strokeWidth: '3' }} />
                  </button>

                  <video
                    src={ui.maximizedItem.data.url}
                    controls={true}
                    autoPlay={false}
                    muted={false}
                    style={{ maxWidth: '90vw', maxHeight: '90vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    onLoadedMetadata={(e) => {
                      console.log('Video resolution:', e.target.videoWidth, 'x', e.target.videoHeight);
                    }}
                  />
                </>
              )}

              {ui.maximizedItem.type === 'screenshot' && (() => {
                const screenshotId = ui.maximizedItem.data.id;
                const canvasId = `maximized-canvas-${screenshotId}`;
                const mergedScreenshotKey = `merged-${screenshotId}`;
                const mergedData = window.tempMergedScreenshots?.[mergedScreenshotKey];
                let isSaved = getScreenshotStatus(screenshotId);

                let screenshotUrl = ui.maximizedItem.isExisting ? ui.maximizedItem.data.url : ui.maximizedItem.data.url;
                if (mergedData && isSaved && mergedData.originalIndex === ui.maximizedItem.index) {
                  screenshotUrl = mergedData.mergedData;
                  console.log('Using merged screenshot data for display');
                }

                const isActive = ui.activePencilScreenshot === screenshotId;

                if (isSaved) ui.maximizedItem.isExisting = true;
                if (ui.maximizedItem.isExisting) isSaved = true;

                return (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <div className="relative flex items-center justify-center w-full h-full" style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 2rem)', minWidth: '300px', minHeight: '300px' }}>
                      <div
                        id={`tools-panel-${screenshotId}`}
                        style={{ position: 'absolute', top: '20px', right: '27%', zIndex: 30, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '16px', borderRadius: '16px', border: '2px solid rgba(59, 130, 246, 0.3)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.05)', transition: 'all 0.3s ease' }}>

                        {/* Close button positioned at top-right corner of tools panel */}
                        <button
                          id="maximize-close-button-screenshot"
                          onClick={closeMaximized}
                          style={{ position: 'absolute', top: '-15px', right: '-15px', zIndex: 100, padding: '6px', backgroundColor: 'rgba(220, 38, 38, 0.9)', color: 'white', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.8)', cursor: 'pointer', transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', backdropFilter: 'blur(10px)', opacity: '1', visibility: 'visible', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = 'rgba(220, 38, 38, 1)';
                            e.target.style.transform = 'scale(1.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'rgba(220, 38, 38, 0.9)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          <X style={{ width: '14px', height: '14px', strokeWidth: '3' }} />
                        </button>

                        <div style={{ color: '#1f2937', fontSize: '12px', fontWeight: '700', marginBottom: '4px', textAlign: 'center', width: '100%', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Tools</div>

                        {(!isSaved || !ui.maximizedItem.isExisting) && (
                          <button
                            onClick={async () => {
                              const screenshotData = ui.maximizedItem.data.url;
                              const index = ui.maximizedItem.index;
                              const screenshotId = ui.maximizedItem.data.id;
                              console.log('Saving screenshot from maximized view:', { index, screenshotId });

                              try {
                                await saveIndividualScreenshot(screenshotData, index, screenshotId);
                                setTimeout(() => {
                                  closeMaximized();
                                }, 500);
                              } catch (error) {
                                console.error('Error saving screenshot:', error);
                              }
                            }}
                            className={`group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg ${app.savingScreenshotIds.has(ui.maximizedItem.data.id)
                              ? 'bg-gray-400 border-gray-300 text-white cursor-not-allowed'
                              : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-600 hover:from-green-500 hover:to-emerald-500 hover:border-green-400 hover:text-white hover:transform hover:scale-105'
                              }`}
                            title={app.savingScreenshotIds.has(ui.maximizedItem.data.id) ? "Saving..." : "Save & Close"}
                            disabled={app.savingScreenshotIds.has(ui.maximizedItem.data.id)}
                          >
                            {app.savingScreenshotIds.has(ui.maximizedItem.data.id) ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Save className="w-5 h-5" />
                            )}
                            {!app.savingScreenshotIds.has(ui.maximizedItem.data.id) && (
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            )}
                          </button>
                        )}

                        <button
                          data-tools-button="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.target.getBoundingClientRect();
                            updateUI({ clickPosition: { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) } });
                            console.log('More tools clicked for maximized canvas:', canvasId);
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

                        <button
                          onClick={() => clearCanvas(canvasId)}
                          className="group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-600 hover:from-red-500 hover:to-pink-500 hover:border-red-400 hover:text-white hover:transform hover:scale-105"
                          title="Clear All Drawings"
                        >
                          <Eraser className="w-5 h-5" />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </button>

                        <button
                          onClick={() => {
                            if (ui.maximizedItem.isExisting) {
                              console.log('Deleting existing screenshot from maximized view:', ui.maximizedItem.data);
                              deleteExistingScreenshot(ui.maximizedItem.data);
                            } else {
                              const index = ui.maximizedItem.index;
                              const screenshotId = ui.maximizedItem.data.id;
                              console.log('Deleting new screenshot from maximized view:', { index, screenshotId });
                              deleteNewScreenshot(index, screenshotId);
                            }
                            closeMaximized();
                          }}
                          className="group relative p-3 rounded-xl transition-all duration-300 border-2 w-12 h-12 flex items-center justify-center shadow-lg bg-gradient-to-r from-red-50 to-orange-50 border-red-200 text-red-600 hover:from-red-500 hover:to-orange-500 hover:border-red-400 hover:text-white hover:transform hover:scale-105"
                          title="Delete Screenshot"
                        >
                          <Trash2 className="w-5 h-5" />
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-400 to-orange-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </button>
                      </div>

                      <div id={ui.maximizedItem.id}>
                        <Loader2 className="text-green-500 text-4xl animate-spin" size={50} />
                      </div>

                      <img
                        id={`maximized-img-${ui.maximizedItem.id}`}
                        src={screenshotUrl}
                        alt="Maximized screenshot"
                        className="w-full h-full object-contain hidden opacity-0 transition-opacity duration-300"
                        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                        onLoad={async (e) => {
                          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
                          await sleep(2000);

                          if (window.document.getElementById(ui.maximizedItem.id)) window.document.getElementById(ui.maximizedItem.id).style.display = "none"
                          e.target.style.opacity = '1';
                          const img = e.target;

                          img.style.maxWidth = '100%';
                          img.style.maxHeight = '100%';
                          img.style.width = 'auto';
                          img.style.height = 'auto';
                          img.style.objectFit = 'contain';
                          img.style.display = 'block';

                          const updateDropdownPosition = () => {
                            const dropdown = document.querySelector(`[data-pencil-dropdown-id="${screenshotId}"]`);
                            const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);

                            if (dropdown && toolsPanel) {
                              const toolsPanelRect = toolsPanel.getBoundingClientRect();
                              dropdown.style.top = `${toolsPanelRect.top}px`;
                              console.log(`Dropdown synced with tools panel at top: ${toolsPanelRect.top}px`);
                            }
                          };

                          const positionToolsPanel = () => {
                            const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);
                            if (toolsPanel && img) {
                              const imgRect = img.getBoundingClientRect();
                              const containerRect = img.parentElement.getBoundingClientRect();

                              const imageLeft = imgRect.left - containerRect.left;
                              const imageTop = imgRect.top - containerRect.top;
                              const imageRight = imgRect.right - containerRect.left;

                              const toolsPanelLeft = imageRight + 20;
                              const toolsPanelTop = imageTop;

                              toolsPanel.style.left = `${toolsPanelLeft}px`;
                              toolsPanel.style.top = `${toolsPanelTop}px`;
                              toolsPanel.style.right = 'auto';
                              toolsPanel.style.transform = 'none';

                              const dropdown = document.querySelector(`[data-pencil-dropdown-id="${screenshotId}"]`);
                              if (dropdown) {
                                dropdown.style.top = `${toolsPanelTop + containerRect.top}px`;
                                console.log(`Dropdown positioned at top: ${toolsPanelTop + containerRect.top}px`);
                              }

                              const viewportWidth = window.innerWidth;
                              const toolsPanelWidth = toolsPanel.offsetWidth || 100;

                              if (toolsPanelLeft + toolsPanelWidth > viewportWidth - 20) {
                                const leftSidePosition = imageLeft - toolsPanelWidth - 20;
                                if (leftSidePosition > 20) {
                                  toolsPanel.style.left = `${leftSidePosition}px`;
                                  console.log(`Tools panel repositioned to left: left=${leftSidePosition}px`);
                                } else {
                                  toolsPanel.style.left = `${imageLeft + 10}px`;
                                  console.log(`Tools panel positioned inside screenshot: left=${imageLeft + 10}px`);
                                }
                              }

                              setTimeout(updateDropdownPosition, 100);
                            }
                          };

                          setTimeout(positionToolsPanel, 50);
                          setTimeout(positionToolsPanel, 150);
                          setTimeout(positionToolsPanel, 300);

                          const handleResize = () => {
                            positionToolsPanel();
                            setTimeout(updateDropdownPosition, 50);
                          };

                          window.addEventListener('resize', handleResize);

                          setTimeout(() => {
                            window.removeEventListener('resize', handleResize);
                          }, 30000);

                          const attemptCanvasSync = (attempt = 1) => {
                            const displayWidth = img.offsetWidth;
                            const displayHeight = img.offsetHeight;
                            const boundingRect = img.getBoundingClientRect();


                            const finalWidth = Math.round(boundingRect.width);
                            const finalHeight = Math.round(boundingRect.height);

                            if (finalWidth > 50 && finalHeight > 50) {
                              const canvas = img.parentElement.querySelector(`canvas[data-canvas-id="${canvasId}"]`);
                              if (canvas) {
                                const imgRect = img.getBoundingClientRect();
                                const containerRect = img.parentElement.getBoundingClientRect();

                                canvas.width = finalWidth;
                                canvas.height = finalHeight;
                                canvas.style.width = finalWidth + 'px';
                                canvas.style.height = finalHeight + 'px';
                                canvas.style.position = 'absolute';
                                canvas.style.top = (imgRect.top - containerRect.top) + 'px';
                                canvas.style.left = (imgRect.left - containerRect.left) + 'px';
                                canvas.style.zIndex = '15';

                                setTimeout(positionToolsPanel, 100);
                                initializeCanvas(canvas, screenshotUrl, canvasId);
                                return true;
                              }
                            }

                            if (attempt < 5) {
                              setTimeout(() => attemptCanvasSync(attempt + 1), 100 * attempt);
                            }
                            return false;
                          };

                          setTimeout(() => attemptCanvasSync(), 50);
                        }}
                        onError={(e) => {
                          console.error('Error loading maximized screenshot:', e);
                          e.target.style.opacity = '1';
                        }}
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 transition-opacity duration-300" style={{ opacity: screenshotUrl ? '0' : '1', pointerEvents: 'none' }}>
                        <div className="text-center text-gray-500">
                          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                          <div className="text-sm">Loading screenshot...</div>
                        </div>
                      </div>

                      <canvas
                        key={`maximized-canvas-${screenshotId}`}
                        data-canvas-id={canvasId}
                        data-screenshot-id={screenshotId}
                        className={`transition-all ${isActive ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-none'}`}
                        style={{
                          position: 'absolute',
                          pointerEvents: isActive ? 'auto' : 'none',
                          touchAction: isActive ? 'none' : 'auto',
                          zIndex: ui.maximizedItem.isExisting ? 1 : (isActive ? 999 : 10),
                          border: isActive ? '2px solid #3b82f6' : 'none',
                          opacity: isActive ? 1 : 0.8,
                          display: ui.maximizedItem.isExisting ? 'none' : 'block'
                        }}
                        onMouseDown={(e) => {
                          if (isActive) {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Mouse down on maximized canvas:', canvasId);
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

                      {isActive && ui.showPencilDropdown === screenshotId && (
                        <div
                          data-pencil-dropdown-id={screenshotId}
                          style={{ position: 'fixed', left: `${Math.min(ui.clickPosition.x + 65, window.innerWidth - 280)}px`, zIndex: 1000, backgroundColor: 'white', borderRadius: '16px', border: '2px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)', padding: '20px', minWidth: '280px', maxWidth: '320px', maxHeight: '70vh', overflowY: 'auto', backdropFilter: 'blur(10px)', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}
                          ref={(el) => {
                            if (el) {
                              setTimeout(() => {
                                const toolsPanel = document.getElementById(`tools-panel-${screenshotId}`);
                                if (toolsPanel) {
                                  const toolsPanelRect = toolsPanel.getBoundingClientRect();
                                  el.style.top = `${toolsPanelRect.top}px`;
                                  console.log(`Dropdown auto-positioned at: ${toolsPanelRect.top}px`);
                                }
                              }, 100);
                            }
                          }}
                        >
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Tools:</p>
                              <div className="grid grid-cols-5 gap-1">
                                {tools.map((tool) => (
                                  <button
                                    key={tool.name}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Tool selected:', tool.name, 'for maximized canvas:', canvasId);
                                      setSelectedTool(tool.name);
                                    }}
                                    className={`p-2 text-xs border rounded hover:scale-105 transition-all duration-200 flex flex-col items-center gap-1 ${selectedTool === tool.name ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-gray-50 border-gray-300 hover:bg-gray-100'}`}
                                    title={tool.title}
                                  >
                                    <span className="text-sm">{tool.icon}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-2">Colors:</p>
                              <div className="grid grid-cols-6 gap-1">
                                {colors.map((color) => (
                                  <button
                                    key={color}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Color selected:', color, 'for maximized canvas:', canvasId);
                                      setSelectedColor(color);
                                    }}
                                    className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110 ${selectedColor === color ? 'border-gray-800 scale-110 ring-2 ring-gray-300' : 'border-gray-300 hover:border-gray-500'}`}
                                    style={{ backgroundColor: color }}
                                    title={`Select ${color}`}
                                  />
                                ))}
                              </div>
                            </div>

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
                                  console.log('Line width changed:', newWidth, 'for maximized canvas:', canvasId);
                                  setLineWidth(newWidth);
                                }}
                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(lineWidth / 20) * 100}%, #e5e7eb ${(lineWidth / 20) * 100}%, #e5e7eb 100%)` }}
                              />
                            </div>

                            <div className="bg-gray-50 p-2 rounded border text-center">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium text-gray-800">
                                  {tools.find(t => t.name === selectedTool)?.icon} {selectedTool}
                                </span>
                                {selectedTool !== 'eraser' && (
                                  <>
                                    {' '}- <span className="inline-block w-3 h-3 rounded border align-middle mx-1" style={{ backgroundColor: selectedColor }}></span>
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

        <div className="hide-scrollbar" style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(400px, 2fr) minmax(250px, 1fr)', height: 'auto', minHeight: '95vh', width: '100%', maxWidth: '100vw', gap: 0, margin: 0, padding: 0, overflowY: 'visible', overflowX: 'hidden', boxSizing: 'border-box' }}>
          <div className="responsive-column hide-scrollbar" style={{ borderRight: '1px solid #d1d5db', padding: '2vh 1.5vw 1vh 1.5vw', overflowY: 'visible', overflowX: 'hidden', minWidth: '250px', maxWidth: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2vh', padding: '1vh 0', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1vw' }}>
                <div className={`w-12 h-12 overflow-hidden ${getProfileShapeClass()}`} style={{ width: '3vw', height: '6vh', minWidth: '48px', minHeight: '48px' }}>
                  {getProfileImage() ? (
                    <img
                      src={getProfileImage()}
                      alt="Profile Image"
                      className={`w-full h-full ${getImageObjectFitClass()}`}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold ${getProfileShapeClass()}`} style={{ fontSize: '1.2vw' }}>
                      {getInitials(getDisplayName())}
                    </div>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: '0.8vw', color: '#6b7280', margin: 0, minFontSize: '12px' }}>Hello,</p>
                  <p style={{ fontWeight: '600', margin: 0, fontSize: '1vw', minFontSize: '14px' }}>{getDisplayName()}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                <div className="flex items-center gap-2 cursor-pointer" style={{ minWidth: '120px' }}>
                  {getLandlordLogo() ? (
                    <img
                      src={getLandlordLogo()}
                      alt="Landlord Logo"
                      className="max-h-10 max-w-[120px] object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                        {/* Optionally, add a placeholder icon here */}
                      </div>
                      <span className="text-gray-600">Your logo here</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', width: '90%', marginBottom: '2vh', marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ backgroundColor: '#e5e7eb', borderRadius: '1.5vw', overflow: 'hidden', position: 'relative', width: '100%', height: 'auto', minHeight: '25vh', padding: 0, margin: 0, boxSizing: 'border-box' }}>
                <video
                  id="live-video"
                  ref={videoRef}
                  autoPlay
                  playsInline
                  controls={false}
                  style={{ width: 'calc(100% + 2px)', height: 'auto', objectFit: 'cover', position: 'relative', borderRadius: '1.5vw', transition: 'transform 0.3s ease-out', transform: `scale(${app.zoomLevel}) translate(${app.videoPanX}px, ${app.videoPanY}px)`, transformOrigin: 'center center', display: 'block', maxWidth: 'calc(100% + 2px)', padding: 0, margin: '-1px', border: 'none', outline: 'none', boxSizing: 'border-box', verticalAlign: 'top', ...(media.isRecording && { pointerEvents: 'none', outline: 'none', border: 'none' }), ...(app.zoomLevel > 1 && !media.isRecording && { cursor: 'grab' }) }}
                  onMouseMove={(e) => {
                    if (app.zoomLevel > 1) {
                      handleVideoPan(e);
                    } else if (!media.isRecording) {
                      handleMouseMove(e);
                    }
                  }}
                  onMouseDown={(e) => { 
                    if (app.zoomLevel > 1) { 
                      e.currentTarget.style.cursor = 'grabbing'; 
                    } else if (!media.isRecording) {
                      handleMouseDown(e);
                    }
                  }}
                  onMouseUp={(e) => { 
                    if (app.zoomLevel > 1) { 
                      e.currentTarget.style.cursor = 'grab'; 
                    } else if (!media.isRecording) {
                      handleMouseUp(e);
                    }
                  }}
                  onMouseLeave={(e) => { 
                    if (app.zoomLevel > 1) { 
                      e.currentTarget.style.cursor = 'grab'; 
                    } else if (!media.isRecording) {
                      handleMouseLeave(e);
                    }
                  }}
                />

                {/* Mouse trail overlay for admin - ONLY over the video element */}
                {!media.isRecording && app.zoomLevel <= 1 && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: '0px', 
                      left: '0px', 
                      right: '0px', 
                      bottom: '0px', 
                      pointerEvents: 'none',
                      zIndex: 15,
                      borderRadius: '1.5vw',
                      overflow: 'hidden',
                      isolation: 'isolate'
                    }}
                  >
                    {/* Current mouse position indicator */}
                    {isMouseDown && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${mousePosition.x}%`,
                          top: `${mousePosition.y}%`,
                          width: '20px',
                          height: '20px',
                          backgroundColor: 'rgba(255, 0, 0, 0.9)',
                          borderRadius: '50%',
                          transform: 'translate(-50%, -50%)',
                          border: '3px solid white',
                          zIndex: 16,
                          transition: 'all 0.1s ease',
                          boxShadow: '0 0 8px rgba(255, 0, 0, 0.6)',
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                  </div>
                )}



                {/* Play button positioned over the entire video area */}
                {showVideoPlayError && (
                  <button className="w-[3rem] h-[3rem] bg-amber-500 text-white rounded-full absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] flex items-center justify-center cursor-pointer" title="Play Video" onClick={handleVideoPlay} style={{ zIndex: 25, display: isMouseDown ? 'none' : 'block' }}>
                    <Play className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Video controls positioned outside the video container */}
              <div style={{ position: 'absolute', top: '2vh', left: '1.5vw', zIndex: 30, display: isMouseDown ? 'none' : 'block' }}>
                {media.isRecording ? (
                  <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.8vh 1.2vw', fontSize: '0.9vw', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5vw', borderRadius: '1.2vw', minFontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    <span style={{ width: '0.8vw', height: '1.5vh', borderRadius: '50%', backgroundColor: 'white', animation: 'pulse 1s infinite', minWidth: '12px', minHeight: '12px' }}></span>
                    <span>REC {formatRecordingTime(media.currentRecordingDuration)}</span>
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.8vh 1.2vw', fontSize: '0.9vw', fontWeight: '600', borderRadius: '1.2vw', minFontSize: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                    {isConnected ? "● Live" : "● Disconnected"}
                  </div>
                )}
              </div>

              {isConnected && (
                <div style={{ position: 'absolute', top: '2vh', right: '1.5vw', zIndex: 30, display: isMouseDown ? 'none' : 'block' }}>
                  <button onClick={handleEndVideo} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors" style={{ fontSize: '0.9vw', minFontSize: '14px' }}>
                    End Video
                  </button>
                </div>
              )}

              <div className="absolute bottom-2 left-[50%] -translate-x-[50%] text-white px-3 py-1 text-sm font-medium flex items-center gap-3" style={{ display: media.isRecording ? 'none' : (isMouseDown ? 'none' : 'flex'), zIndex: 30 }}>
                <span className="w-4 h-4 rounded-full bg-red-600 block"></span>
                <span className="text-white text-lg">{isConnected ? formatTime(app.callDuration) : "0:00"}</span>
              </div>

              <div className="absolute bottom-2 right-0 text-white px-3 py-1 text-sm font-medium flex items-center gap-3 flex-col" style={{ display: media.isRecording ? 'none' : (isMouseDown ? 'none' : 'flex'), zIndex: 30 }}>
                {/* Torch Button - Controls User Camera */}
                <button 
                  className="p-1 rounded text-white cursor-pointer hover:bg-black/20 transition-colors" 
                  onClick={async () => {
                    try {
                      console.log('🔦 Torch button clicked');
                      const newTorchState = !app.torchEnabled;
                      console.log('🔦 Setting torch state:', newTorchState);
                      
                      setApp(prev => ({ ...prev, torchEnabled: newTorchState }));
                      
                      if (handleCameraTorch) {
                        console.log('🔦 Calling handleCameraTorch with:', newTorchState);
                        await handleCameraTorch(newTorchState);
                        console.log('✅ Torch command sent successfully');
                      } else {
                        console.error('❌ handleCameraTorch function not available');
                      }
                    } catch (error) {
                      console.error('❌ Error in torch button click:', error);
                    }
                  }}
                  title={`Turn ${app.torchEnabled ? 'OFF' : 'ON'} user torch`}
                >
                  <Zap className={`w-4 h-4 ${app.torchEnabled ? 'text-yellow-300' : ''}`} />
                </button>

                {/* Zoom In Button - Controls User Camera */}
                <button className="p-1 rounded text-white cursor-pointer hover:bg-black/20 transition-colors" onClick={async () => {
                  try {
                    console.log('🔍 Zoom In button clicked');
                    if (handleCameraZoom) {
                      console.log('🔍 Calling handleCameraZoom with: in');
                      await handleCameraZoom('in');
                      console.log('✅ Zoom In command sent successfully');
                    } else {
                      console.error('❌ handleCameraZoom function not available');
                    }
                  } catch (error) {
                    console.error('❌ Error in zoom in button click:', error);
                  }
                }} disabled={app.zoomLevel >= 3} title="Zoom In User Camera">
                  <ZoomIn className={`w-4 h-4 ${app.zoomLevel >= 3 ? 'opacity-50' : ''}`} />
                </button>

                <button className="text-xs bg-black/30 px-2 py-1 rounded hover:bg-black/50 transition-colors" onClick={() => handleZoomReset()} title="Click to reset zoom">
                  {Math.round(app.zoomLevel * 100)}%
                </button>

                {/* Zoom Out Button - Controls User Camera */}
                <button className="p-1 rounded text-white cursor-pointer hover:bg-black/20 transition-colors" onClick={async () => {
                  try {
                    console.log('🔍 Zoom Out button clicked');
                    if (handleCameraZoom) {
                      console.log('🔍 Calling handleCameraZoom with: out');
                      await handleCameraZoom('out');
                      console.log('✅ Zoom Out command sent successfully');
                    } else {
                      console.error('❌ handleCameraZoom function not available');
                    }
                  } catch (error) {
                    console.error('❌ Error in zoom out button click:', error);
                  }
                }} disabled={app.zoomLevel <= 0.5} title="Zoom Out User Camera">
                  <ZoomOut className={`w-4 h-4 ${app.zoomLevel <= 0.5 ? 'opacity-50' : ''}`} />
                </button>
              </div>
            </div>

            <div style={{ width: '90%', marginLeft: 'auto', marginRight: 'auto' }}>
              <div className="w-full flex gap-2 mt-2">
                <button
                  onClick={handleRecordingToggle}
                  disabled={!isConnected}
                  className={`disabled:opacity-50 flex flex-col items-center justify-center gap-2 font-medium py-3 rounded-md transition-colors flex-1 ${media.isRecording ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
                >
                  <div className="text-center leading-tight">
                    {media.isRecording ? (
                      <div>
                        <div>Stop</div>
                        <div className="text-sm">({formatRecordingTime(media.currentRecordingDuration)})</div>
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
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mx-auto mb-1"></div>
                    ) : (
                      <>
                        <div>Take</div>
                        <div>Screenshot</div>
                      </>
                    )}
                  </div>
                </button>
              </div>

              {/* Enhanced Dashboard Link - Below action buttons */}
              <div className="w-full mt-3">
                <button
                  onClick={handleDashboard}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-3 rounded-md font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                  title="Go to Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="text-lg">Dashboard</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6 border-r border-gray-300 min-w-0 flex flex-col items-start justify-start hide-scrollbar" style={{ maxHeight: '100%', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingTop: '3vh', paddingLeft: '1vw', paddingRight: '1vw', paddingBottom: '1vh' }}>
            <div className="w-full px-4">
              <h2 className="text-lg font-medium mb-3 text-left ml-3 mr-3">Video Recording(s): {displayRecordingsCount()}</h2>
              <div className="overflow-y-visible min-h-[8rem]">
                <div className="flex gap-3 overflow-x-auto pb-2 justify-start ml-3 mr-3" style={{ scrollbarWidth: 'thin' }}>
                  {media.recordings.length === 0 && <h1>No recordings</h1>}

                  {media.recordings.map((recording) => (
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
                          onPlay={() => updateMedia({ playingVideos: new Set(media.playingVideos).add(recording.id) })}
                          onPause={() => updateMedia({ playingVideos: new Set([...media.playingVideos].filter(id => id !== recording.id)) })}
                        />

                        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              saveIndividualRecording(recording);
                            }}
                            className={`p-1 hover:bg-black/20 rounded text-white ${recording.isExisting || app.savingRecordingId === recording.id ? 'opacity-50' : ''}`}
                            title={recording.isExisting ? "Already saved" : "Save recording"}
                            disabled={recording.isExisting || app.savingRecordingId === recording.id}
                          >
                            {app.savingRecordingId === recording.id ? (
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
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full px-4">
              <h2 className="text-lg font-medium mb-3 text-left">Screenshot(s): {getTotalScreenshotCount() > 0 && getTotalScreenshotCount()}</h2>
              <div className="overflow-y-visible min-h-[8rem]">
                <div className="flex gap-3 overflow-x-auto pb-2 justify-start" style={{ scrollbarWidth: 'thin' }}>
                  {(media.existingScreenshots.length === 0 && screenshots.length === 0) && <h1>No screenshots</h1>}

                  {media.existingScreenshots
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map((screenshot, index) => (
                      <div key={`existing-${screenshot.id}`} className="flex-shrink-0 w-[15vw] min-w-[180px]">
                        <img src="/icons/ci_label.svg" className="mb-2" />
                        <div className="aspect-square bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center relative cursor-pointer group"
                          onClick={() => maximizeScreenshot(screenshot, index, true)}>
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
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </div>
                      </div>
                    ))}

                  {[...screenshots].map((screenshot, index) => {
                    const screenshotData = typeof screenshot === 'object' ? screenshot.data : screenshot;
                    const screenshotId = typeof screenshot === 'object' ?
                      (screenshot.id || `screenshot-${screenshot.timestamp || Date.now()}-${Math.random()}`) :
                      `screenshot-${index}-${Date.now()}-${Math.random()}`;

                    const isSaved = getScreenshotStatus(screenshotId) || screenshot.isSaved;
                    const backendId = screenshot.backendId;
                    const canvasId = screenshotId;
                    const isActive = ui.activePencilScreenshot === canvasId;
                    const cleanScreenshotUrl = screenshotData.split('#')[0];

                    return (
                      <div key={`screenshot-container-${screenshotId}`} className="relative pencil-dropdown-container flex-shrink-0 w-[15vw] min-w-[180px]">
                        <img src="/icons/ci_label.svg" className="mb-2" />
                        <div className={`aspect-square bg-gradient-to-br ${isSaved
                            ? 'from-green-50 to-green-100 border-green-200'
                            : 'from-blue-50 to-blue-100 border-blue-200'
                          } border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center relative cursor-pointer group`}
                          onClick={() => {
                            console.log('Maximizing screenshot:', { index, cleanScreenshotUrl, backendId });
                            maximizeScreenshot({ ...screenshot, id: screenshotId }, index, false);
                          }}>
                          <div className={`text-center ${isSaved ? 'text-green-700' : 'text-blue-700'
                            } p-6 transition-all duration-300 ${isSaved ? 'group-hover:text-green-800' : 'group-hover:text-blue-800'
                            }`}>
                            <div className={`w-12 h-12 mx-auto mb-3 ${isSaved ? 'bg-green-200' : 'bg-blue-200'
                              } rounded-full flex items-center justify-center ${isSaved ? 'group-hover:bg-green-300' : 'group-hover:bg-blue-300'
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
                              Screenshot {media.existingScreenshots.length + index + 1}
                              {isSaved && <><br />Saved</>}
                            </div>
                          </div>

                          <div className={`absolute inset-0 rounded-xl ${isSaved
                              ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                              : 'bg-gradient-to-r from-blue-400 to-purple-400'
                            } opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>

                          <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isSaved && !app.savingScreenshotIds.has(screenshotId)) {
                                  saveIndividualScreenshot(cleanScreenshotUrl, index, screenshotId);
                                }
                              }}
                              className={`p-1 hover:bg-black/20 rounded text-white ${isSaved || app.savingScreenshotIds.has(screenshotId) ? 'opacity-50' : ''
                                }`}
                              title={isSaved ? "Already saved" : "Save screenshot"}
                              disabled={isSaved || app.savingScreenshotIds.has(screenshotId)}
                            >
                              {app.savingScreenshotIds.has(screenshotId) ? (
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
                                if (backendId) {
                                  // If it has a backend ID, delete from backend
                                  console.log(`🗑️ Deleting screenshot with backend ID: ${backendId}`);
                                  deleteExistingScreenshot({ id: backendId });
                                } else {
                                  // If no backend ID, delete locally
                                  console.log(`🗑️ Deleting local screenshot: ${screenshotId}`);
                                  deleteNewScreenshot(index, screenshotId);
                                }
                              }}
                              className="p-1 hover:bg-black/20 rounded text-white"
                              title={backendId ? "Delete from server" : "Delete locally"}
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

            {/* Enhanced Share Link Section */}
            <div className="w-full flex flex-col items-center justify-center mt-8 mb-2 gap-2">
              <h3 className="w-full text-left text-lg font-semibold mb-1 text-gray-800">Share Link:</h3>
              <div className="w-full flex flex-row items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 transition-all duration-150 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  placeholder="Click Generate to get link"
                  className="flex-1 px-2 py-1 rounded-lg bg-transparent text-gray-700 text-sm font-mono select-all truncate outline-none border-none focus:ring-0"
                  style={{ minWidth: 0, cursor: shareLink ? 'pointer' : 'not-allowed' }}
                  onFocus={e => e.target.select()}
                  title={shareLink || 'No link generated yet'}
                  aria-label="Share link"
                />
                <button
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg shadow transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-200 flex items-center gap-2"
                  onClick={() => {
                    if (shareLink) {
                      toast.info("Link already generated");
                      return;
                    }
                    const link = generateShareLink();
                    setShareLink(link);
                    setCopied(false);
                    setLinkGenerated(true);
                  }}
                  type="button"
                  style={{ minWidth: 120 }}
                  aria-label="Generate share link"
                >
                  {linkGenerated && shareLink ? null : null}
                  {linkGenerated && shareLink ? "Generated!" : "Generate Link"}
                </button>
                <button
                  onClick={async () => {
                    if (!shareLink) return;
                    try {
                      if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(shareLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                        toast.success("Share link copied to clipboard!");
                      } else {
                        const textArea = document.createElement('textarea');
                        textArea.value = shareLink;
                        textArea.style.position = 'fixed';
                        textArea.style.left = '-999999px';
                        textArea.style.top = '-999999px';
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        try {
                          const successful = document.execCommand('copy');
                          if (successful) {
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                            toast.success("Share link copied to clipboard!");
                          } else {
                            throw new Error('Copy command failed');
                          }
                        } catch (err) {
                          window.prompt('Copy this link:', shareLink);
                          toast.success("Link displayed for manual copy");
                        }
                        document.body.removeChild(textArea);
                      }
                    } catch (error) {
                      window.alert(`Copy this link: ${shareLink}`);
                      toast.error("Please copy the link manually from the alert");
                    }
                  }}
                  className={`p-2 rounded-lg border flex items-center justify-center ml-1 transition-colors duration-150 ${shareLink ? (copied ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-200 hover:bg-gray-300 border-gray-300 cursor-pointer') : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                  title={shareLink ? "Copy share link" : "Generate a link first"}
                  type="button"
                  disabled={!shareLink}
                  aria-label="Copy share link"
                >
                  {copied ? (
                    <span className="font-semibold">Copied</span>
                  ) : (
                    <>
                      <Copy className="w-5 h-5 mr-1" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <span className="text-xs font-normal text-gray-500">(Copy and paste link to your job ticket or any system)</span>
            </div>

            <div className="w-full flex items-center gap-4 mt-6">
              <button
                onClick={() => handleSaveAndRedirect(null)}
                disabled={!isConnected || app.isEndingVideo}
                className={`${app.isEndingVideo ? 'bg-red-400' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-50 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre`}
              >
                {app.isEndingVideo ? (
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
                disabled={isSaveDisabled() || app.isEndingVideo}
                className={`${app.isEndingVideo ? 'bg-green-400' : 'bg-green-500 hover:bg-green-600'} disabled:opacity-50 text-white font-medium py-4 rounded-md transition-colors flex-1 whitespace-pre`}
              >
                {app.isEndingVideo ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mb-1" />
                    <span className="text-xs">Saving & Ending...</span>
                  </div>
                ) : (
                  <div className="text-center">
                    Save Images and <br />
                    Form Data
                  </div>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-6 hide-scrollbar" style={{ maxHeight: 'none', overflowY: 'visible', overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none', paddingTop: '2vh', paddingLeft: '1.5vw', paddingRight: '1.5vw', paddingBottom: '1vh', minWidth: '250px', maxWidth: '100%' }}>
            <div>
              <label htmlFor="residentFirstName" className="block text-lg font-medium mb-2">Resident Name:</label>
              <div className="flex flex-col md:flex-row gap-4 mb-4 min-w-0">
                <input
                  type="text"
                  id="residentFirstName"
                  value={form.first_name}
                  onChange={e => updateForm({ first_name: e.target.value })}
                  placeholder="First Name"
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-gray-400 transition-all duration-200 hover:bg-orange-50"
                  style={{ borderWidth: '2px' }}
                />
                <input
                  type="text"
                  id="residentLastName"
                  value={form.last_name}
                  onChange={e => updateForm({ last_name: e.target.value })}
                  placeholder="Last Name"
                  className="w-full p-3 bg-white border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 placeholder-gray-400 transition-all duration-200 hover:bg-orange-50"
                  style={{ borderWidth: '2px' }}
                />
              </div>
            </div>

            <div>
              <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-3">
                <div className="flex-1">
                  <label htmlFor="residentAddress" className="block text-lg font-medium mb-2">Resident Address :</label>

                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="House/Building Number or Name"
                      value={form.house_name_number}
                      onChange={e => updateForm({ house_name_number: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>

                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Flat/Apartment/Room Number"
                      value={form.flat_apartment_room}
                      onChange={e => updateForm({ flat_apartment_room: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>

                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Street/Road Name"
                      value={form.street_road}
                      onChange={e => updateForm({ street_road: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>

                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Town/City"
                      value={form.city}
                      onChange={e => updateForm({ city: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="County"
                      value={form.country}
                      onChange={e => updateForm({ country: e.target.value })}
                      className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-3 ">
                <div className="w-[62.5%]">
                  <textarea
                    placeholder="Postcode:"
                    value={form.actualPostCode}
                    onChange={(e) => updateForm({ actualPostCode: e.target.value })}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                    rows={1}
                  />
                </div>
              </div>

              <div className="mb-3">
                <textarea
                  placeholder="Phone no:"
                  value={form.phoneNumber}
                  onChange={(e) => updateForm({ phoneNumber: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  rows={1}
                />
              </div>

              <div className="mb-3">
                <textarea
                  id="postCode"
                  value={form.postCode}
                  onChange={(e) => updateForm({ postCode: e.target.value })}
                  placeholder="Ref:"
                  rows={1}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-2 flex-nowrap">
                <label className="block text-lg font-medium whitespace-nowrap">Repair/Work Details:</label>
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

              {[
                { value: form.workDetail1, setter: (val) => updateForm({ workDetail1: val }), field: 'field1', placeholder: 'Work detail 1' },
                { value: form.workDetail2, setter: (val) => updateForm({ workDetail2: val }), field: 'field2', placeholder: 'Work detail 2' },
                { value: form.workDetail3, setter: (val) => updateForm({ workDetail3: val }), field: 'field3', placeholder: 'Work detail 3' }
              ].map((detail, idx) => (
                <div key={idx} className="mb-3 flex items-center gap-2 relative">
                  <textarea
                    placeholder={detail.placeholder}
                    value={detail.value}
                    onChange={(e) => detail.setter(e.target.value)}
                    rows={1}
                    className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                  <div className="relative" data-dropdown-id={detail.field}>
                    <button
                      onClick={() => handleTTDropdownToggle(detail.field)}
                      className="p-3 bg-gray-50 text-black border border-gray-300 rounded-full flex items-center gap-1 hover:bg-gray-100 transition-colors"
                      title="Target Time Dropdown"
                    >
                      <span className="text-sm font-medium">{getTTDisplayText(detail.field)}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {ui.showTTDropdown === detail.field && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                        {ttOptions.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleTTOptionSelect(detail.field, option)}
                            className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${form.selectedTTValues[detail.field] === option
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
              ))}

              {form.workDetails.map((detail, index) => (
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

                    {ui.showTTDropdown === `workDetail${index}` && (
                      <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                        {ttOptions.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            onClick={() => handleTTOptionSelect(`workDetail${index}`, option)}
                            className={`w-full text-left px-4 py-2 text-sm first:rounded-t-lg last:rounded-b-lg transition-colors duration-200 ${form.selectedTTValues[`workDetail${index}`] === option
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
              ))}
            </div>

            <div className="mt-6">
              <div className="flex items-center gap-3 mb-2">
                <label className="block text-lg font-medium">Special Notes:</label>
                <div className="flex bg-gray-200 rounded-full p-1 items-center">
                  <button
                    onClick={() => updateUI({ showSpecialNotes: true })}
                    className={`px-3 py-1 rounded-full transition-colors text-sm font-medium ${ui.showSpecialNotes
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-green-100'
                      }`}
                    title="Show Special Notes"
                  >
                    Show
                  </button>
                  <button
                    onClick={() => updateUI({ showSpecialNotes: false })}
                    className={`px-3 py-1 rounded-full transition-colors text-sm font-medium ${!ui.showSpecialNotes
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-300'
                      }`}
                    title="Hide Special Notes"
                  >
                    Hide
                  </button>
                </div>
                <button onClick={handleOpenSpecialNotesDialog} title="Support / Special Notes" className="ml-4 p-0 bg-transparent border-none cursor-pointer flex items-center">
                  <img src="/icons/help-desk.png" alt="Support" className="object-contain" style={{ width: '34px', height: '34px', display: 'inline-block', verticalAlign: 'middle' }} />
                </button>
              </div>

              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${ui.showSpecialNotes ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <textarea
                  value={typeof form.specialNotes === 'string' ? form.specialNotes : JSON.stringify(form.specialNotes, null, 2)}
                  onChange={e => updateForm({ specialNotes: e.target.value })}
                  rows={5}
                  placeholder="Enter any special notes or additional information..."
                  className="w-full p-4 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-vertical"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Resend Button */}
      <FloatingResendButton />
      {/* Special Notes Dialog */}
      <SpecialNotesDialog
        open={specialNotesDialogOpen}
        initialData={structuredSpecialNotes}
        onSave={handleSpecialNotesDialogSave}
        onClose={handleSpecialNotesDialogClose}
      />
    </>
  );
}