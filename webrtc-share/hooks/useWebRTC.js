import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { useIsMobile } from "./useIsMobile";
import { toast } from "sonner";

// Enhanced useWebRTC hook with duplicate prevention

// 1. Add content-based duplicate detection
const generateImageHash = async (imageData) => {
    // Simple hash generation for image content
    const encoder = new TextEncoder();
    const data = encoder.encode(imageData.substring(0, 1000)); // Sample first 1000 chars
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};

// Optimized peer configuration for maximum quality
const peerConfig = {
    iceTransportPolicy: "all", // Changed from "relay" to allow direct connections for better quality
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun.l.google.com:5349" },
        { urls: "stun:stun1.l.google.com:3478" },
        { urls: "stun:stun1.l.google.com:5349" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:5349" },
        { urls: "stun:stun3.l.google.com:3478" },
        { urls: "stun:stun3.l.google.com:5349" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:5349" },
        {
            urls: "turn:relay1.expressturn.com:3480",
            username: "174776437859052610",
            credential: "ZKziYTYdi6V/oRdHNuUn/INQkq4=",
        },
        {
            urls: "turn:relay1.expressturn.com:3480?transport=tcp",
            username: "174776437859052610",
            credential: "ZKziYTYdi6V/oRdHNuUn/INQkq4=",
        }
    ]
}

const useWebRTC = (isAdmin, roomId, videoRef) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const socketConnection = useRef(null);
    const peerConnectionRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [screenshots, setScreenshots] = useState([]);
    const [recordings, setRecordings] = useState([]);
    const [recordingActive, setRecordingActive] = useState(false);
    const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
    const mediaRecorderRef = useRef(null);
    const mediaRecordingChunks = useRef([]);
    const localStreamRef = useRef(null);
    const [showVideoPlayError, setShowVideoPlayError] = useState(false);
    const router = useRouter();
    const isMobile = useIsMobile();

    // 2. Enhanced state management for duplicate prevention
    const [screenshotHashes, setScreenshotHashes] = useState(new Set());
    const [captureInProgress, setCaptureInProgress] = useState(false);
    const lastCaptureTime = useRef(0);
    const processedItemsRef = useRef(new Set());
    const [savingScreenshotIds, setSavingScreenshotIds] = useState(new Set());

    useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const socketUrl = backendUrl.replace('/api/v1', '');

        socketConnection.current = io(socketUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ['websocket'],
        });

        socketConnection.current.on('connect', () => {
            socketConnection.current.emit('join-room', roomId);

            if (isAdmin) {
                startPeerConnection();
            }
        });

        // Cleanup on unmount
        return () => {
            if (socketConnection.current) {
                socketConnection.current.disconnect();
            }
        };
    }, [roomId, isAdmin]);

    // Enhanced getUserMedia with comprehensive device error handling
    const getUserMedia = async () => {
        try {
            console.log('🎥 Starting camera access (video only mode)...');

            // Step 1: Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
            }

            // Step 2: Check permissions first (if supported)
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' });
                console.log('📷 Camera permission status:', permissionStatus.state);

                if (permissionStatus.state === 'denied') {
                    throw new Error('Camera permission denied. Please enable camera access in browser settings and refresh the page.');
                }
            } catch (permError) {
                console.log('⚠️ Permission API not supported, proceeding...');
            }

            // Step 3: Enumerate available devices to check what's actually available
            let availableDevices = [];
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                availableDevices = devices.filter(device => device.kind === 'videoinput');
                console.log('📹 Available video devices:', availableDevices.length);

                if (availableDevices.length === 0) {
                    throw new Error('No camera devices found. Please connect a camera and refresh the page.');
                }

                // Log device info (without sensitive details)
                availableDevices.forEach((device, index) => {
                    console.log(`Camera ${index + 1}:`, {
                        label: device.label || 'Unknown Camera',
                        deviceId: device.deviceId ? 'present' : 'missing'
                    });
                });

            } catch (enumError) {
                console.log('⚠️ Could not enumerate devices, proceeding with basic constraints');
            }

            // Step 4: ENHANCED Progressive constraint strategy (from best to basic) - ULTRA HIGH QUALITY VIDEO ONLY
            const constraintStrategies = isMobile ? [
                // Strategy 1: Ultra High Quality 4K with back camera preference
                {
                    name: "Ultra High Quality 4K Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 1920, ideal: 3840, max: 7680 },
                            height: { min: 1080, ideal: 2160, max: 4320 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 2: High Quality 2K with back camera preference
                {
                    name: "High Quality 2K Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 1280, ideal: 2560, max: 3840 },
                            height: { min: 720, ideal: 1440, max: 2160 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 3: Premium Full HD with back camera preference
                {
                    name: "Premium Full HD Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 1280, ideal: 1920, max: 2560 },
                            height: { min: 720, ideal: 1080, max: 1440 },
                            frameRate: { min: 30, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 4: Basic quality with any back camera
                {
                    name: "Basic Back Camera",
                    constraints: {
                        video: {
                            facingMode: "environment"
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 5: Ultra High quality any camera
                {
                    name: "Ultra High Quality Any Camera",
                    constraints: {
                        video: {
                            width: { min: 1920, ideal: 3840, max: 7680 },
                            height: { min: 1080, ideal: 2160, max: 4320 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 6: High quality any camera
                {
                    name: "High Quality Any Camera",
                    constraints: {
                        video: {
                            width: { min: 1280, ideal: 1920, max: 3840 },
                            height: { min: 720, ideal: 1080, max: 2160 },
                            frameRate: { min: 30, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 16 / 9 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 7: Basic quality any camera
                {
                    name: "Basic Quality Any Camera",
                    constraints: {
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 8: Very basic - just video only
                {
                    name: "Very Basic Video Only",
                    constraints: {
                        video: true,
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 9: Default front camera if available
                {
                    name: "Front Camera Fallback",
                    constraints: {
                        video: {
                            facingMode: "user"
                        },
                        audio: false  // Audio disabled
                    }
                }
            ] : [
                // Strategy 1: Ultra High Quality 4K with back camera preference
                {
                    name: "Ultra High Quality 4K Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 1080, ideal: 2160, max: 4320 },
                            height: { min: 1920, ideal: 3840, max: 7680 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 9 / 16 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 2: High Quality 2K with back camera preference
                {
                    name: "High Quality 2K Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 720, ideal: 1440, max: 2160 },
                            height: { min: 1280, ideal: 2560, max: 3840 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 9 / 16 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 3: Premium Full HD with back camera preference
                {
                    name: "Premium Full HD Back Camera",
                    constraints: {
                        video: {
                            facingMode: { ideal: "environment" },
                            width: { min: 720, ideal: 1080, max: 1440 },
                            height: { min: 1280, ideal: 1920, max: 2560 },
                            frameRate: { min: 30, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 9 / 16 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 4: Basic quality with any back camera
                {
                    name: "Basic Back Camera",
                    constraints: {
                        video: {
                            facingMode: "environment"
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 5: Ultra High quality any camera
                {
                    name: "Ultra High Quality Any Camera",
                    constraints: {
                        video: {
                            width: { min: 1080, ideal: 2160, max: 4320 },
                            height: { min: 1920, ideal: 3840, max: 7680 },
                            frameRate: { min: 24, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 9 / 16 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 6: High quality any camera
                {
                    name: "High Quality Any Camera",
                    constraints: {
                        video: {
                            width: { min: 1280, ideal: 1920, max: 3840 },
                            height: { min: 720, ideal: 1080, max: 2160 },
                            frameRate: { min: 30, ideal: 60, max: 120 },
                            aspectRatio: { ideal: 9 / 16 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 7: Basic quality any camera
                {
                    name: "Basic Quality Any Camera",
                    constraints: {
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        },
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 8: Very basic - just video only
                {
                    name: "Very Basic Video Only",
                    constraints: {
                        video: true,
                        audio: false  // Audio disabled
                    }
                },
                // Strategy 9: Default front camera if available
                {
                    name: "Front Camera Fallback",
                    constraints: {
                        video: {
                            facingMode: "user"
                        },
                        audio: false  // Audio disabled
                    }
                }
            ];

            let stream = null;
            let usedStrategy = null;
            let lastError = null;

            // Try each strategy until one works
            for (const strategy of constraintStrategies) {
                try {
                    console.log(`🔄 Trying strategy: ${strategy.name}`);
                    stream = await navigator.mediaDevices.getUserMedia(strategy.constraints);
                    usedStrategy = strategy.name;
                    console.log(`✅ Success with strategy: ${strategy.name}`);
                    break;
                } catch (strategyError) {
                    lastError = strategyError;
                    console.log(`❌ Strategy "${strategy.name}" failed:`, strategyError.message);

                    // If it's a specific constraint error, try without problematic constraints
                    if (strategyError.name === 'OverconstrainedError' ||
                        strategyError.message.includes('Requested device not found') ||
                        strategyError.message.includes('facingMode') ||
                        strategyError.message.includes('constraint')) {

                        try {
                            // Remove problematic constraints and try again
                            const fallbackConstraints = { ...strategy.constraints };

                            if (fallbackConstraints.video && typeof fallbackConstraints.video === 'object') {
                                // Remove specific constraints that might be causing issues
                                delete fallbackConstraints.video.facingMode;
                                delete fallbackConstraints.video.width;
                                delete fallbackConstraints.video.height;
                                delete fallbackConstraints.video.frameRate;

                                console.log(`🔄 Retrying "${strategy.name}" with relaxed constraints`);
                                stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
                                usedStrategy = strategy.name + " (relaxed constraints)";
                                console.log(`✅ Success with modified strategy: ${usedStrategy}`);
                                break;
                            }
                        } catch (fallbackError) {
                            console.log(`❌ Fallback also failed for "${strategy.name}":`, fallbackError.message);
                        }
                    }

                    // Continue to next strategy
                    continue;
                }
            }

            // If no strategy worked
            if (!stream) {
                console.error('❌ All camera access strategies failed');

                // Provide detailed error message based on the last error
                let userMessage = 'Unable to access camera (video only mode). ';

                if (lastError) {
                    if (lastError.name === 'NotFoundError' || lastError.message.includes('Requested device not found')) {
                        userMessage += 'No camera found. Please ensure a camera is connected and not being used by another application.';
                    } else if (lastError.name === 'NotAllowedError' || lastError.message.includes('Permission denied')) {
                        userMessage += 'Camera permission denied. Please allow camera access when prompted or enable it in browser settings.';
                    } else if (lastError.name === 'NotReadableError') {
                        userMessage += 'Camera is busy or being used by another application. Please close other camera apps and try again.';
                    } else if (lastError.name === 'SecurityError') {
                        userMessage += 'Camera access blocked. Please use HTTPS or localhost.';
                    } else {
                        userMessage += 'Please check camera permissions and device availability.';
                    }
                } else {
                    userMessage += 'Please check camera permissions and device availability.';
                }

                const error = new Error(userMessage);
                error.originalError = lastError;
                throw error;
            }

            // Step 5: Log actual stream capabilities and success info
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            if (videoTrack) {
                const settings = videoTrack.getSettings();

                console.log('📹 Video track settings:', {
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    facingMode: settings.facingMode,
                    deviceId: settings.deviceId ? 'present' : 'missing'
                });

                // Try to get capabilities if supported
                try {
                    const capabilities = videoTrack.getCapabilities();
                    console.log('📹 Video capabilities:', {
                        maxWidth: capabilities.width?.max,
                        maxHeight: capabilities.height?.max,
                        maxFrameRate: capabilities.frameRate?.max,
                        facingModes: capabilities.facingMode
                    });
                } catch (capError) {
                    console.log('⚠️ Could not get video capabilities');
                }
            }

            if (audioTrack) {
                const settings = audioTrack.getSettings();
                console.log('🎵 Audio track active:', settings);
            }

            // Step 6: Set up the stream
            setLocalStream(stream);
            localStreamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(playError => {
                    console.log('⚠️ Video autoplay failed (this is normal):', playError.message);
                });
            }

            console.log(`✅ Camera stream acquired successfully using: ${usedStrategy}`);
            console.log(`📊 Final stream stats:`, {
                videoTracks: stream.getVideoTracks().length,
                audioTracks: stream.getAudioTracks().length,
                active: stream.active
            });

            return stream;

        } catch (error) {
            console.error('❌ Failed to get user media:', error);

            // Re-throw the error for handling in the calling code
            throw error;
        }
    };

    const createDummyVideoTrack = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 640;
        canvas.height = 480;

        const context = canvas.getContext("2d");
        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width, canvas.height);

        const stream = canvas.captureStream(30); // 30 FPS
        return stream;
    };

    const createRTCPeerConnection = () => {
        if (peerConnectionRef.current) {
            try {
                peerConnectionRef.current.close();
            } catch (error) {
                console.error('Error closing peer connection:', error);
            }
        }

        const peerConnection = new RTCPeerConnection(peerConfig);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socketConnection.current.emit('ice-candidate', event.candidate, roomId);
            }
        }

        if (!isAdmin) {
            localStreamRef.current.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStreamRef.current);
            });
        } else {
            const stream = createDummyVideoTrack();
            stream.getTracks().forEach(track => {
                peerConnection.addTrack(track, stream);
            });
        }

        peerConnection.ontrack = (event) => {
            if (!isAdmin) return;
            setRemoteStream(event.streams[0]);
            setTimeout(() => {
                videoRef.current.srcObject = event.streams[0];
                videoRef.current.play().then(() => {
                    setIsConnected(true);
                }).catch((error) => {
                    setIsConnected(true);
                    setShowVideoPlayError(true);
                });
            }, 3000)

        }

        peerConnection.onnegotiationneeded = async () => {
            try {

            } catch (error) {
                console.error('Error creating offer:', error);
            }
        }

        peerConnection.onicecandidateerror = (error) => {
            // Only log if there's meaningful error information
            if (error && (error.errorCode || error.errorText || error.url)) {
                console.error('ICE candidate error:', {
                    errorCode: error.errorCode,
                    errorText: error.errorText,
                    url: error.url
                });
            }
            // ICE candidate errors are often normal during connection establishment
            // so we don't need to take any action here
        }

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE connection state changed:', peerConnection.iceConnectionState);
            if (peerConnection.iceConnectionState == "disconnected") {
                setIsConnected(false);
                if (!isAdmin) {
                    router.push('/');
                }
            }
        }

        peerConnection.onicegatheringstatechange = () => {
            console.log('ICE gathering state changed:', peerConnection.iceGatheringState);
        }

        return peerConnection;

    }

    const handleVideoPlay = () => {
        videoRef.current.play();
        setIsConnected(true);
        setShowVideoPlayError(false);
    }

    const startPeerConnection = async () => {
        try {
            if (!isAdmin) {
                await getUserMedia();
            }
            const peerConnection = createRTCPeerConnection();
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socketConnection.current.emit('offer', offer, roomId);
            console.log('Offer sent');

            peerConnectionRef.current = peerConnection;
        } catch (error) {
            console.error('Error starting peer connection:', error);
        }
    }




    const handleOffer = async (offer) => {
        console.log('handleOffer');
        try {
            const peerConnection = createRTCPeerConnection();
            peerConnectionRef.current = peerConnection;
            await peerConnectionRef.current.setRemoteDescription(offer);
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);
            socketConnection.current.emit('answer', answer, roomId);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }




    const handleAnswer = async (answer) => {
        console.log('handleAnswer');
        try {
            await peerConnectionRef.current.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    const handleIceCandidate = async (candidate) => {
        console.log('handleIceCandidate');
        try {
            await peerConnectionRef.current.addIceCandidate(candidate);
        } catch (error) {
            console.error('Error handling ice candidate:', error);
        }
    }

    const handleDisconnect = (shouldRedirect = true) => {
        try {
            socketConnection.current.emit('user-disconnected', roomId);
            setIsConnected(false);
            peerConnectionRef.current.close();
            localStream?.getTracks().forEach(track => track.stop());
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
            }

            // Only redirect if shouldRedirect is true
            if (shouldRedirect) {
                if (!isAdmin) {
                    router.push('/?show-feedback=true');
                }
                else {
                    router.push(`../../../dashboard/`);
                }
            } else {
                console.log('📞 Video disconnected without redirect');
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
        }
    }

    const handleUserDisconnected = () => {
        console.log('👤 User disconnected');
        setIsConnected(false);
        setShowVideoPlayError(false);

        if (!isAdmin) {
            // Get redirect URL from localStorage as fallback
            const redirectUrl = localStorage.getItem("redirectUrl");
            if (redirectUrl) {
                console.log('🔗 Admin ended call, redirecting with tailored URL:', redirectUrl);
                window.location.href = `/?show-feedback=true&redirectUrl=${encodeURIComponent(redirectUrl)}`;
            } else {
                console.log('🔗 Admin ended call, redirecting without tailored URL');
                router.push('/?show-feedback=true');
            }
        }
    }

    // Setup listeners for incoming offers
    useEffect(() => {
        if (!socketConnection.current) return;

        socketConnection.current.on('offer', handleOffer);
        socketConnection.current.on('answer', handleAnswer);
        socketConnection.current.on('ice-candidate', handleIceCandidate);
        socketConnection.current.on('user-disconnected', handleUserDisconnected);

        return () => {
            if (socketConnection.current) {
                socketConnection.current.off('offer', handleOffer);
                socketConnection.current.off('answer', handleAnswer);
                socketConnection.current.off('ice-candidate', handleIceCandidate);
                socketConnection.current.off('user-disconnected', handleUserDisconnected);
            }
        }
    }, [isAdmin, roomId]);    // 3. Enhanced takeScreenshot function with duplicate prevention
    const takeScreenshot = async (onScreenshotTaken = null) => {
        // Prevent rapid successive calls
        const now = Date.now();
        if (now - lastCaptureTime.current < 2000) { // 2 second cooldown
            console.log('📸 Screenshot cooldown active, please wait...');
            toast.info('Please wait before taking another screenshot');
            return;
        }

        if (!remoteStream && !localStream) {
            console.error('❌ No stream available for screenshot');
            return;
        }

        // Prevent multiple concurrent captures
        if (captureInProgress) {
            console.log('📸 Screenshot capture already in progress...');
            return;
        }

        setCaptureInProgress(true);
        setIsCapturingScreenshot(true);
        lastCaptureTime.current = now;

        const screenshotStartTime = Date.now();

        try {
            const stream = isAdmin ? remoteStream : localStream;
            if (!stream) {
                console.error('❌ Stream not available');
                return;
            }

            const videoTrack = stream.getVideoTracks()[0];
            if (!videoTrack) {
                console.error('❌ No video track available');
                return;
            }

            const settings = videoTrack.getSettings();
            const timestamp = Date.now();
            const uniqueId = Math.random().toString(36).substring(2, 15);

            console.log('📸 Taking ULTRA HIGH QUALITY screenshot from stream:', {
                width: settings.width,
                height: settings.height,
                frameRate: settings.frameRate,
                timestamp: new Date(timestamp).toISOString(),
                uniqueId: uniqueId
            });

            // Use the actual video element for capturing
            const sourceVideo = videoRef.current;
            if (!sourceVideo) {
                console.error('❌ Video element not available');
                return;
            }

            const captureFrame = async () => {
                try {
                    // Force video to current time to ensure fresh frame
                    const currentTime = sourceVideo.currentTime;
                    console.log('📸 Capturing frame at video time:', currentTime, 'with unique ID:', uniqueId);

                    // Get the actual video dimensions - ENHANCED for ultra high resolution
                    const videoWidth = sourceVideo.videoWidth || settings.width || 3840;
                    const videoHeight = sourceVideo.videoHeight || settings.height || 2160;

                    console.log('📸 Capturing ULTRA HIGH QUALITY frame:', {
                        videoWidth,
                        videoHeight,
                        readyState: sourceVideo.readyState,
                        currentTime: currentTime,
                        paused: sourceVideo.paused,
                        timestamp: timestamp,
                        uniqueId: uniqueId
                    });

                    // Create moderate-resolution canvas with unique ID for 5-10MB file size
                    const canvas = document.createElement('canvas');
                    canvas.id = `screenshot-canvas-${timestamp}-${uniqueId}`;
                    const scale = 1; // 1x resolution for optimal file size (5-10MB target)
                    canvas.width = videoWidth * scale;
                    canvas.height = videoHeight * scale;

                    const ctx = canvas.getContext('2d');

                    // Apply moderate quality settings for optimal file size
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'medium';

                    // Additional quality settings
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.filter = 'none';

                    // Clear canvas first to ensure fresh capture
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Scale the context for ultra high-resolution rendering
                    ctx.scale(scale, scale);

                    // Direct draw with forced refresh
                    ctx.drawImage(sourceVideo, 0, 0, videoWidth, videoHeight);

                    // Verify the canvas has actual image data
                    const imageData = ctx.getImageData(0, 0, Math.min(100, videoWidth * scale), Math.min(100, videoHeight * scale));
                    const hasData = imageData.data.some(pixel => pixel !== 0);

                    if (!hasData) {
                        console.warn('⚠️ Canvas appears empty, trying alternative capture method');
                        throw new Error('Canvas empty');
                    }

                    // Generate ultra high quality PNG
                    const screenshot = canvas.toDataURL('image/png', 1.0);

                    // Check for duplicate content using hash
                    const imageHash = await generateImageHash(screenshot);
                    if (screenshotHashes.has(imageHash)) {
                        console.log('⚠️ Duplicate screenshot detected, skipping...');
                        toast.info('Duplicate screenshot detected');
                        canvas.remove();
                        return;
                    }

                    // Add hash to prevent future duplicates
                    setScreenshotHashes(prev => new Set(prev).add(imageHash));

                    const completelyUniqueScreenshot = {
                        id: `screenshot-${timestamp}-${uniqueId}`,
                        data: screenshot,
                        timestamp: timestamp,
                        uniqueId: uniqueId,
                        captureTime: currentTime,
                        hash: imageHash,
                        url: `${screenshot}#unique-${timestamp}-${uniqueId}`
                    };

                    // Add completely unique screenshot as object with proper structure
                    setScreenshots((prev) => {
                        const newScreenshots = [...prev, completelyUniqueScreenshot];

                        // Call the callback with the screenshot and its index
                        if (onScreenshotTaken) {
                            const screenshotIndex = newScreenshots.length - 1;
                            onScreenshotTaken(completelyUniqueScreenshot, screenshotIndex);
                        }

                        return newScreenshots;
                    });

                    console.log('✅ ULTRA HIGH QUALITY screenshot captured:', {
                        resolution: `${canvas.width}x${canvas.height}`,
                        scale: `${scale}x`,
                        size: `${Math.round(screenshot.length / 1024)}KB`,
                        format: 'PNG (Maximum Quality)',
                        timestamp: new Date(timestamp).toISOString(),
                        videoTime: currentTime,
                        uniqueId: uniqueId,
                        hash: imageHash,
                        screenshotId: completelyUniqueScreenshot.id
                    });

                    // Clean up canvas
                    canvas.remove();

                } catch (captureError) {
                    console.error('❌ Error capturing frame:', captureError);
                }
            };

            // Simplified capture strategy with better timing
            if (sourceVideo.readyState >= 2) { // HAVE_CURRENT_DATA
                // Add small delay to ensure frame is fresh
                setTimeout(() => {
                    captureFrame();
                }, 100);
            } else {
                // Wait for video to be ready
                const handleLoadedData = () => {
                    setTimeout(() => {
                        captureFrame();
                    }, 100);
                    sourceVideo.removeEventListener('loadeddata', handleLoadedData);
                };
                sourceVideo.addEventListener('loadeddata', handleLoadedData);

                // Fallback timeout
                setTimeout(() => {
                    sourceVideo.removeEventListener('loadeddata', handleLoadedData);
                    captureFrame();
                }, 1500);
            }

        } catch (error) {
            console.error('❌ Error in takeScreenshot:', error);
            toast.error('Failed to capture screenshot');
        } finally {
            // Reset states with minimum loading time
            const elapsedTime = Date.now() - screenshotStartTime;
            const minimumLoadTime = 2000; // 2 seconds minimum
            const remainingTime = Math.max(0, minimumLoadTime - elapsedTime);

            setTimeout(() => {
                setIsCapturingScreenshot(false);
                setCaptureInProgress(false);
            }, remainingTime);
        }
    };

    // ENHANCED recording function with ULTRA HIGH quality
    const takeRecording = () => {
        if (!remoteStream && !localStream) {
            console.error('❌ No stream available for recording');
            return;
        }

        const stream = isAdmin ? remoteStream : localStream;
        if (!stream) {
            console.error('❌ Stream not available');
            return;
        }

        if (!recordingActive) {
            // ENHANCED: Ultra-high quality recording options - ULTRA HIGH BITRATE VIDEO ONLY
            const qualityOptions = [
                {
                    mimeType: 'video/webm;codecs=vp9,opus',
                    videoBitsPerSecond: 100000000,  // 100 Mbps - ultra premium quality
                    bitsPerSecond: 100000000
                },
                {
                    mimeType: 'video/webm;codecs=vp9',
                    videoBitsPerSecond: 80000000   // 80 Mbps - premium quality fallback
                },
                {
                    mimeType: 'video/webm;codecs=h264,avc1',
                    videoBitsPerSecond: 60000000   // 60 Mbps - high quality H.264
                },
                {
                    mimeType: 'video/webm;codecs=vp8',
                    videoBitsPerSecond: 40000000   // 40 Mbps fallback
                },
                {
                    mimeType: 'video/webm;codecs=h264',
                    videoBitsPerSecond: 30000000   // H.264 fallback
                },
                {
                    mimeType: 'video/webm',
                    videoBitsPerSecond: 25000000   // Basic WebM
                },
                {
                    mimeType: 'video/mp4',
                    videoBitsPerSecond: 20000000   // MP4 fallback
                }
            ];

            let selectedOptions = null;

            // Find the best supported option
            for (const option of qualityOptions) {
                if (MediaRecorder.isTypeSupported(option.mimeType)) {
                    selectedOptions = option;
                    console.log(`✅ Selected ULTRA HIGH QUALITY recording format: ${option.mimeType} @ ${option.videoBitsPerSecond / 1000000}Mbps`);
                    break;
                }
            }

            if (!selectedOptions) {
                console.error('❌ No supported recording format found');
                return;
            }

            console.log('🎥 Starting ULTRA HIGH QUALITY video recording with:', selectedOptions);

            try {
                setRecordingActive(true);
                mediaRecordingChunks.current = [];

                const mediaRecorder = new MediaRecorder(stream, selectedOptions);

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data && event.data.size > 0) {
                        mediaRecordingChunks.current.push(event.data);
                        console.log(`📊 ULTRA HIGH QUALITY Recording chunk: ${(event.data.size / 1024 / 1024).toFixed(2)} MB`);
                    }
                };

                mediaRecorder.onstop = () => {
                    if (mediaRecordingChunks.current.length > 0) {
                        const recordingBlob = new Blob(mediaRecordingChunks.current, {
                            type: selectedOptions.mimeType
                        });

                        const recordingUrl = URL.createObjectURL(recordingBlob);
                        setRecordings(prev => [recordingUrl, ...prev]);

                        console.log('✅ ULTRA HIGH QUALITY video recording saved:', {
                            format: selectedOptions.mimeType,
                            bitrate: `${selectedOptions.videoBitsPerSecond / 1000000}Mbps`,
                            size: `${Math.round(recordingBlob.size / 1024 / 1024 * 100) / 100}MB`,
                            chunks: mediaRecordingChunks.current.length,
                            type: 'Ultra High Quality Video Only'
                        });

                        mediaRecordingChunks.current = [];
                    }
                    setRecordingActive(false);
                };

                mediaRecorder.onerror = (event) => {
                    console.error('❌ Recording error:', event.error);
                    setRecordingActive(false);
                };

                // ENHANCED: Start recording with optimal chunk size for high quality
                mediaRecorder.start(100); // 100ms chunks for ultra smooth recording
                mediaRecorderRef.current = mediaRecorder;

                console.log('✅ ULTRA HIGH QUALITY video recording started (audio disabled, ultra high bitrate)');

            } catch (error) {
                console.error('❌ Error starting recording:', error);
                setRecordingActive(false);
            }
        } else {
            // Stop recording
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
                console.log('🛑 ULTRA HIGH QUALITY Recording stopped');
            } else {
                setRecordingActive(false);
            }
        }
    };

    // Function to delete a screenshot at specific index
    const deleteScreenshot = (index) => {
        setScreenshots(prev => {
            const newScreenshots = [...prev];
            if (index >= 0 && index < newScreenshots.length) {
                newScreenshots.splice(index, 1);
                console.log(`🗑️ Screenshot ${index} deleted`);
            }
            return newScreenshots;
        });
    };

    // 4. Enhanced save function with additional duplicate prevention
    const saveIndividualScreenshot = useCallback(async (screenshotData, index, screenshotId, getScreenshotStatus) => {
        const itemKey = `screenshot-${screenshotId}`;

        // Prevent duplicate processing
        if (processedItemsRef.current.has(itemKey) || savingScreenshotIds.has(screenshotId)) {
            console.log('⚠️ Screenshot already being processed:', itemKey);
            return;
        }

        // Check if screenshot was already saved
        if (getScreenshotStatus && getScreenshotStatus(screenshotId)) {
            console.log('⚠️ Screenshot already saved:', screenshotId);
            toast.info('Screenshot already saved');
            return;
        }

        processedItemsRef.current.add(itemKey);

        try {
            setSavingScreenshotIds(prev => new Set(prev).add(screenshotId));

            // Here you would implement your actual save logic
            // This is a placeholder that should be replaced with actual save functionality
            console.log('💾 Saving screenshot:', screenshotId);

            // Simulate save operation
            await new Promise(resolve => setTimeout(resolve, 1000));

            console.log('✅ Screenshot saved successfully:', screenshotId);
            toast.success('Screenshot saved successfully');

        } catch (error) {
            console.error('❌ Save screenshot failed:', error);
            toast.error('Failed to save screenshot');
        } finally {
            setSavingScreenshotIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(screenshotId);
                return newSet;
            });
            processedItemsRef.current.delete(itemKey);
        }
    }, []);

    // 5. Cleanup function to reset hashes when needed
    const clearScreenshotHashes = useCallback(() => {
        setScreenshotHashes(new Set());
        console.log('🧹 Screenshot hashes cleared');
    }, []);

    // Cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup all streams and connections on unmount
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            if (remoteStream) {
                remoteStream.getTracks().forEach(track => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
            if (socketConnection.current) {
                socketConnection.current.disconnect();
            } console.log('🧹 Cleanup completed (video only)');
        };
    }, []);

    const updateScreenShortId = (old, newId) => {
        setScreenshots(prev =>
            prev.map(screenshot =>
                screenshot.id === old
                    ? { ...screenshot, id: newId }
                    : screenshot
            )
        );
    };

    // Add function to update screenshot properties (backendId, isSaved, etc.)
    const updateScreenshotProperties = (screenshotId, properties) => {
        setScreenshots(prev =>
            prev.map(screenshot =>
                screenshot.id === screenshotId
                    ? { ...screenshot, ...properties }
                    : screenshot
            )
        );
    };

    // Add this function to handle end call with tailored/default redirect
    const endCallWithRedirect = (isDefaultRedirectUrl, redirectUrl) => {
        try {
            console.log('🎬 endCallWithRedirect called with:', {
                isDefaultRedirectUrl,
                redirectUrl,
                hasRedirectUrl: !!redirectUrl,
                redirectUrlType: typeof redirectUrl,
                redirectUrlLength: redirectUrl ? redirectUrl.length : 0
            });
            
            handleDisconnect(false); // Only disconnect, don't redirect yet
            
            console.log('🔍 Checking redirect conditions:', {
                isDefaultRedirectUrl: isDefaultRedirectUrl,
                hasRedirectUrl: !!redirectUrl,
                condition1: !isDefaultRedirectUrl,
                condition2: !!redirectUrl,
                finalCondition: !isDefaultRedirectUrl && !!redirectUrl
            });
            
            if (!isDefaultRedirectUrl && redirectUrl) {
                // Tailored URL - redirect to feedback page with redirect URL
                const feedbackUrl = `/?show-feedback=true&redirectUrl=${encodeURIComponent(redirectUrl)}`;
                console.log('🔗 Will redirect to feedback page with tailored URL after 3 seconds:', feedbackUrl);
                setTimeout(() => {
                    console.log('🚀 Executing redirect to feedback page with tailored URL');
                    window.location.href = feedbackUrl;
                }, 3000); // Reduced to 3 seconds for faster feedback
            } else {
                // Default URL - redirect to feedback page after 3 seconds
                console.log('🔗 Default URL - redirecting to feedback page after 3 seconds');
                setTimeout(() => {
                    console.log('🚀 Executing redirect to feedback page (default)');
                    window.location.href = '/?show-feedback=true';
                }, 3000); // Reduced to 3 seconds for faster feedback
            }
        } catch (error) {
            console.error('Error ending video call:', error);
            // Fallback - go to home page after 5 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 5000); // Reduced from 22 seconds to 5 seconds
        }
    }

    return {
        localStream,
        remoteStream,
        socket,
        socketConnection,
        handleDisconnect,
        startPeerConnection,
        isConnected,
        screenshots,
        recordings,
        recordingActive,
        isCapturingScreenshot,
        takeScreenshot,
        takeRecording,
        handleVideoPlay,
        showVideoPlayError,
        deleteScreenshot,
        // Enhanced exports for duplicate prevention
        saveIndividualScreenshot,
        clearScreenshotHashes,
        screenshotHashes: screenshotHashes.size, // For debugging
        captureInProgress,
        savingScreenshotIds,
        updateScreenShortId,
        // Add the new function to exports
        endCallWithRedirect,
        updateScreenshotProperties
    }
}

export default useWebRTC;
