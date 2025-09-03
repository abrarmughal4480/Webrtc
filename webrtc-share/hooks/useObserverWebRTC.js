import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { api } from '@/http';

const useObserverWebRTC = (isAdmin, roomId, videoRef, isObserver = false, userData = null) => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [observerStream, setObserverStream] = useState(null);
    const [socket, setSocket] = useState(null);
    const socketConnection = useRef(null);
    const peerConnectionRef = useRef(null);
    const observerPeerConnectionRef = useRef(null);
    const userDataRef = useRef(userData);
    
    // Update userDataRef when userData changes
    useEffect(() => {
        userDataRef.current = userData;
    }, [userData]);
    
    const [isConnected, setIsConnected] = useState(false);
    const [isObserverConnected, setIsObserverConnected] = useState(false);
    const [observers, setObservers] = useState([]);
    const [screenShareActive, setScreenShareActive] = useState(false);
    
    // Additional state from useObserver.js
    const [isObserving, setIsObserving] = useState(false);
    const [observerPermissions, setObserverPermissions] = useState({});
    const [screenStream, setScreenStream] = useState(null);
    
    // Throttling mechanism to prevent multiple screen share requests
    const lastScreenShareRequest = useRef(0);
    const screenShareThrottleTime = 3000; // 3 seconds between requests
    
    // Auto screen share throttling
    const lastAttemptTime = useRef(0);
    const attemptCount = useRef(0);
    const maxAttempts = 1; // Only 1 attempt
    const throttleTime = 5000; // 5 seconds between attempts
    const isStartingScreenShare = useRef(false); // Prevent multiple simultaneous calls

    // WebRTC configuration
    const peerConfig = {
        iceTransportPolicy: "all",
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
    };

    // Initialize socket connection
    useEffect(() => {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
        const socketUrl = backendUrl.replace('/api/v1', '');

        socketConnection.current = io(socketUrl, {
            reconnectionAttempts: 5,
            timeout: 10000,
            transports: ['websocket'],
        });

        socketConnection.current.on('connect', () => {
            console.log('🔌 Socket connected, role:', isAdmin ? 'admin' : isObserver ? 'observer' : 'user');
            setIsConnected(true);
            
            if (isObserver) {
                console.log('🔗 Observer joining rooms for:', roomId);
                socketConnection.current.emit('join-observer-room', roomId);
                // Get current user data from ref
                const currentUserData = userDataRef.current;
                socketConnection.current.emit('observer-join-room', roomId, {
                    observer_id: currentUserData?.userId || 'observer',
                    observer_email: currentUserData?.email || 'observer@example.com',
                    observer_name: currentUserData?.role === 'company-admin' ? 'Company Admin Observer' : `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Observer',
                    observer_role: currentUserData?.role || 'observer',
                    joined_at: new Date().toISOString()
                });
                
                setTimeout(() => {
                    console.log('📡 Requesting current offer from admin');
                    socketConnection.current.emit('observer-request-offer', roomId);
                }, 500);
                
            } else if (isAdmin) {
                console.log('🔗 Admin joining rooms for:', roomId);
                socketConnection.current.emit('join-admin-room', roomId);
                socketConnection.current.emit('join-observer-room', roomId);
                console.log('✅ Admin joined both admin and observer rooms');
            } else {
                console.log('🔗 Regular user joining room for:', roomId);
                socketConnection.current.emit('join-room', roomId);
            }
            setSocket(socketConnection.current);
        });

        socketConnection.current.on('disconnect', () => {
            setIsConnected(false);
            setIsObserverConnected(false);
            setIsObserving(false);
        });

        socketConnection.current.on('observer-joined', (observerData) => {
            console.log('👥 Admin received observer-joined event:', observerData);
            console.log('🔍 Admin state - isAdmin:', isAdmin, 'screenShareActive:', screenShareActive);
            setObservers(prev => [...prev, observerData]);
            
            if (isAdmin && !screenShareActive) {
                console.log('🔄 Admin starting screen share for new observer');
                const currentTime = Date.now();
                
                if (currentTime - lastAttemptTime.current < throttleTime) {
                    console.log('⏰ Throttled screen share start');
                    return;
                }
                
                if (attemptCount.current >= maxAttempts) {
                    console.log('🚫 Max attempts reached for screen share start');
                    return;
                }
                
                lastAttemptTime.current = currentTime;
                attemptCount.current += 1;
                
                setTimeout(() => {
                    try {
                        console.log('🚀 Starting screen share from observer-joined event');
                        startScreenShare();
                    } catch (error) {
                        console.error('❌ Screen share failed from observer-joined:', error);
                    }
                }, 100);
            } else if (isAdmin && screenShareActive) {
                console.log('✅ Screen share already active, sending current offer to new observer');
                if (observerPeerConnectionRef.current) {
                    const currentOffer = observerPeerConnectionRef.current.localDescription;
                    if (currentOffer) {
                        socketConnection.current.emit('observer-offer', currentOffer, roomId);
                    }
                }
            }
        });

        socketConnection.current.on('observer-left', (observerData) => {
            setObservers(prev => prev.filter(obs => obs.observer_id !== observerData.observer_id));
        });

        socketConnection.current.on('observer-requested-screen', (observerData) => {
            console.log('📥 Admin received observer screen request:', observerData);
            console.log('🔍 Admin state - isAdmin:', isAdmin, 'screenShareActive:', screenShareActive);
            if (isAdmin) {
                if (!screenShareActive) {
                    console.log('🔄 Starting screen share for observer');
                    const currentTime = Date.now();
                    
                    if (currentTime - lastAttemptTime.current < throttleTime) {
                        console.log('⏰ Throttled screen share request');
                        return;
                    }
                    
                    if (attemptCount.current >= maxAttempts) {
                        console.log('🚫 Max attempts reached for screen share');
                        return;
                    }
                    
                    lastAttemptTime.current = currentTime;
                    attemptCount.current += 1;
                    
                    setTimeout(() => {
                        try {
                            startScreenShare();
                        } catch (error) {
                            console.error('❌ Screen share failed:', error);
                        }
                    }, 100);
                } else {
                    console.log('✅ Screen share already active, sending current offer');
                    if (observerPeerConnectionRef.current) {
                        const currentOffer = observerPeerConnectionRef.current.localDescription;
                        if (currentOffer) {
                            socketConnection.current.emit('observer-offer', currentOffer, roomId);
                        }
                    }
                }
            }
        });

        socketConnection.current.on('observer-requested-offer', (roomId) => {
            console.log('📥 Admin received observer offer request for room:', roomId);
            console.log('🔍 Admin state - isAdmin:', isAdmin, 'screenShareActive:', screenShareActive, 'hasPeerConnection:', !!observerPeerConnectionRef.current);
            if (isAdmin && screenShareActive && observerPeerConnectionRef.current) {
                console.log('✅ Screen share active, sending current offer');
                const currentOffer = observerPeerConnectionRef.current.localDescription;
                if (currentOffer) {
                    console.log('📤 Sending existing offer to observer');
                    socketConnection.current.emit('observer-offer', currentOffer, roomId);
                } else {
                    console.log('⚠️ No current offer available');
                }
            } else if (isAdmin && !screenShareActive) {
                console.log('🔄 Screen share not active, starting screen share');
                setTimeout(() => {
                    startScreenShare();
                }, 200);
            } else {
                console.log('⚠️ Not admin or no peer connection');
            }
        });

        socketConnection.current.on('observer-screen-data', (screenData) => {
            if (isObserver && screenData && screenData.stream) {
                setObserverStream(screenData.stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = screenData.stream;
                    videoRef.current.play().catch(console.error);
                }
            }
        });

        return () => {
            if (socketConnection.current) {
                socketConnection.current.disconnect();
            }
        };
    }, [roomId, isAdmin, isObserver]);

    // Create peer connection for observers
    const createObserverPeerConnection = useCallback(() => {
        if (observerPeerConnectionRef.current) {
            observerPeerConnectionRef.current.close();
        }

        const peerConnection = new RTCPeerConnection(peerConfig);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Sending ICE candidate:', event.candidate.type);
                socketConnection.current.emit('observer-ice-candidate', event.candidate, roomId);
            }
        };

        peerConnection.ontrack = (event) => {
            console.log('📺 Received track event:', event.streams.length, 'streams');
            if (isObserver) {
                console.log('👁️ Observer received stream, setting up video');
                setObserverStream(event.streams[0]);
                setScreenShareActive(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = event.streams[0];
                    videoRef.current.play().then(() => {
                        console.log('✅ Observer video playing successfully');
                        setIsObserverConnected(true);
                    }).catch((error) => {
                        console.error('❌ Error playing observer stream:', error);
                    });
                } else {
                    console.log('⚠️ No video ref available for observer');
                }
            } else {
                console.log('👨‍💼 Admin received observer stream');
                setObserverStream(event.streams[0]);
                setScreenShareActive(true);
            }
        };

        return peerConnection;
    }, [roomId, isObserver]);

    const startScreenShare = useCallback(async () => {
        if (isStartingScreenShare.current) {
            return;
        }
        
        if (!isAdmin) {
            return;
        }

        if (screenShareActive) {
            return;
        }
        
        isStartingScreenShare.current = true;

        let streamToShare;
        
        try {
            if (navigator.permissions) {
                try {
                    await navigator.permissions.query({ name: 'camera' });
                } catch (permError) {
                    // Permission query failed
                }
            }
            
            streamToShare = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    displaySurface: 'browser',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    cursor: 'always',
                    frameRate: { ideal: 30 }
                },
                audio: false,
                selfBrowserSurface: 'include'
            });
            
            streamToShare.getVideoTracks()[0].onended = () => {
                stopScreenShare();
            };
            
        } catch (error) {
            try {
                streamToShare = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: false
                });
                
                streamToShare.getVideoTracks()[0].onended = () => {
                    stopScreenShare();
                };
                
            } catch (fallbackError) {
                streamToShare = null;
                setScreenShareActive(false);
                return;
            }
        }

        if (!streamToShare) {
            return;
        }

        try {
            setScreenShareActive(true);
            
            const observerPeerConnection = createObserverPeerConnection();
            observerPeerConnectionRef.current = observerPeerConnection;

            streamToShare.getTracks().forEach(track => {
                observerPeerConnection.addTrack(track, streamToShare);
            });

            const offer = await observerPeerConnection.createOffer();
            await observerPeerConnection.setLocalDescription(offer);
            
            console.log('📤 Sending observer offer to room:', roomId);
            socketConnection.current.emit('observer-offer', offer, roomId);

            toast.success('Screen sharing started for observers');
        } catch (error) {
            console.error('Error starting screen share:', error);
            toast.error('Failed to start screen sharing');
            setScreenShareActive(false);
            if (observerPeerConnectionRef.current) {
                observerPeerConnectionRef.current.close();
                observerPeerConnectionRef.current = null;
            }
        } finally {
            isStartingScreenShare.current = false;
        }
    }, [isAdmin, createObserverPeerConnection, roomId, screenShareActive]);

    const stopScreenShare = useCallback(() => {
        if (observerPeerConnectionRef.current) {
            observerPeerConnectionRef.current.close();
            observerPeerConnectionRef.current = null;
        }
        
        setScreenShareActive(false);
        setObserverStream(null);
        isStartingScreenShare.current = false;
        
        socketConnection.current.emit('observer-screen-share-stopped', roomId);
        toast.info('Screen sharing stopped for observers');
    }, [roomId]);

    const handleObserverOffer = useCallback(async (offer) => {
        if (!isObserver) {
            console.log('⚠️ Not in observer mode, ignoring offer');
            return;
        }

        try {
            console.log('🔄 Creating observer peer connection and handling offer');
            const observerPeerConnection = createObserverPeerConnection();
            observerPeerConnectionRef.current = observerPeerConnection;
            
            console.log('📝 Setting remote description');
            await observerPeerConnection.setRemoteDescription(offer);
            
            console.log('📝 Creating answer');
            const answer = await observerPeerConnection.createAnswer();
            await observerPeerConnection.setLocalDescription(answer);
            
            console.log('📤 Sending answer to admin');
            socketConnection.current.emit('observer-answer', answer, roomId);
            setIsObserverConnected(true);
            console.log('✅ Observer connection established');
        } catch (error) {
            console.error('❌ Error handling observer offer:', error);
            toast.error('Failed to establish observer connection');
        }
    }, [isObserver, createObserverPeerConnection, roomId]);

    const handleObserverAnswer = useCallback(async (answer) => {
        if (!isAdmin || !observerPeerConnectionRef.current) return;

        try {
            await observerPeerConnectionRef.current.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error handling observer answer:', error);
        }
    }, [isAdmin]);

    const handleObserverIceCandidate = useCallback(async (candidate) => {
        if (observerPeerConnectionRef.current) {
            try {
                console.log('🧊 Adding ICE candidate:', candidate.type);
                await observerPeerConnectionRef.current.addIceCandidate(candidate);
            } catch (error) {
                console.error('❌ Error adding observer ICE candidate:', error);
            }
        } else {
            console.log('⚠️ No peer connection available for ICE candidate');
        }
    }, []);

    useEffect(() => {
        if (!socketConnection.current) return;

        socketConnection.current.on('observer-offer', (offer) => {
            console.log('📥 Received observer offer:', offer);
            if (isObserver) {
                console.log('🔄 Handling observer offer as observer');
                handleObserverOffer(offer);
            } else {
                console.log('⚠️ Received observer offer but not in observer mode');
            }
        });
        socketConnection.current.on('observer-answer', handleObserverAnswer);
        socketConnection.current.on('observer-ice-candidate', handleObserverIceCandidate);
        
        socketConnection.current.on('observer-screen-share-stopped', () => {
            setObserverStream(null);
            setIsObserverConnected(false);
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        });

        socketConnection.current.on('observer-screen-data', (screenData) => {
            if (screenData && screenData.stream) {
                setScreenStream(screenData.stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = screenData.stream;
                    videoRef.current.play().catch(console.error);
                }
            }
        });

        socketConnection.current.on('observer-permissions-updated', (permissions) => {
            setObserverPermissions(permissions);
        });

        socketConnection.current.on('observers-updated', (observerList) => {
            setObservers(observerList);
        });

        return () => {
            if (socketConnection.current) {
                socketConnection.current.off('observer-offer', handleObserverOffer);
                socketConnection.current.off('observer-answer', handleObserverAnswer);
                socketConnection.current.off('observer-ice-candidate', handleObserverIceCandidate);
                socketConnection.current.off('observer-screen-data');
                socketConnection.current.off('observer-screen-share-stopped');
            }
        };
    }, [handleObserverOffer, handleObserverAnswer, handleObserverIceCandidate]);

    useEffect(() => {
        if (isObserver && observerStream && videoRef.current) {
            videoRef.current.srcObject = observerStream;
            videoRef.current.play().then(() => {
                setScreenShareActive(true);
            }).catch((error) => {
                console.error('Error playing observer stream in useEffect:', error);
            });
        }
    }, [isObserver, observerStream]);

    useEffect(() => {
        if (screenShareActive) {
            attemptCount.current = 0;
        }
    }, [screenShareActive]);

    const requestScreenShare = useCallback(() => {
        if (!socketConnection.current || !isConnected) {
            toast.error('Not connected to meeting');
            return;
        }

        const currentUserData = userDataRef.current;
        if (currentUserData?.role === 'company-admin') {
            return;
        }

        socketConnection.current.emit('observer-request-screen', roomId, {
            observer_id: currentUserData?.userId || 'observer',
            observer_email: currentUserData?.email || 'observer@example.com',
            observer_name: `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Observer'
        });


    }, [roomId, isConnected]);

    const startObserving = useCallback(async () => {
        try {
            const response = await api.post(`/meeting/${roomId}/observer/join`);
            
            if (response.data.success) {
                setIsObserving(true);
                
                const permissions = response.data.observer_permissions || {
                    can_view_screen: true,
                    can_take_screenshots: true,
                    can_control_mouse: false,
                    can_control_keyboard: false
                };
                
                setObserverPermissions(permissions);
                
                if (socketConnection.current) {
                    const currentUserData = userDataRef.current;
                    const observerData = {
                        observer_id: currentUserData?.userId || 'observer',
                        observer_email: currentUserData?.email || 'observer@example.com',
                        observer_name: `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Observer',
                        observer_role: currentUserData?.role || 'observer',
                        joined_at: new Date().toISOString()
                    };
                    
                    socketConnection.current.emit('observer-join-room', roomId, observerData);
                }
                
                if (permissions.can_view_screen && userDataRef.current?.role !== 'company-admin') {
                    requestScreenShare();
                }
            } else {
                toast.error(response.data.message || 'Failed to join as observer');
            }
        } catch (error) {
            console.error('Error starting observation:', error);
            toast.error('Failed to join as observer');
        }
    }, [roomId, requestScreenShare]);

    const stopObserving = useCallback(async () => {
        try {
            const response = await api.post(`/meeting/${roomId}/observer/leave`);
            
            if (response.data.success) {
                setIsObserving(false);
                setScreenStream(null);
                if (videoRef.current) {
                    videoRef.current.srcObject = null;
                }
                
                if (socketConnection.current) {
                    const currentUserData = userDataRef.current;
                    const observerData = {
                        observer_id: currentUserData?.userId || 'observer',
                        observer_email: currentUserData?.email || 'observer@example.com',
                        observer_name: `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 'Observer',
                        observer_role: currentUserData?.role || 'observer',
                        left_at: new Date().toISOString()
                    };
                    
                    socketConnection.current.emit('observer-leave-room', roomId, observerData);
                }
                

            } else {
                toast.error(response.data.message || 'Failed to leave observation');
            }
        } catch (error) {
            console.error('Error stopping observation:', error);
            toast.error('Failed to leave observation');
        }
    }, [roomId]);

    const takeScreenshot = useCallback(() => {
        if (!observerPermissions.can_take_screenshots) {
            toast.error('You do not have permission to take screenshots');
            return;
        }

        if (!screenStream && !observerStream) {
            toast.error('No screen stream available');
            return;
        }

        toast.info('Screenshot functionality coming soon');
    }, [observerPermissions, screenStream, observerStream]);

    useEffect(() => {
        return () => {
            if (observerPeerConnectionRef.current) {
                observerPeerConnectionRef.current.close();
            }
        };
    }, []);

    return {
        localStream,
        remoteStream,
        observerStream,
        socket,
        socketConnection,
        isConnected,
        isObserverConnected,
        screenShareActive,
        startScreenShare,
        stopScreenShare,
        setLocalStream,
        setRemoteStream,
        setIsConnected,
        isObserving,
        observerPermissions,
        screenStream,
        observers,
        startObserving,
        stopObserving,
        requestScreenShare,
        takeScreenshot
    };
};

export default useObserverWebRTC;