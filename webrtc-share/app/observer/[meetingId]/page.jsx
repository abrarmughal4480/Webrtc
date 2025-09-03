"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Monitor, 
    Camera, 
    Users, 
    Settings, 
    ArrowLeft,
    Play,
    Square,
    Download
} from 'lucide-react';
import useObserverWebRTC from '@/hooks/useObserverWebRTC';
import { useUser } from '@/provider/UserProvider';
import { toast } from 'sonner';

const ObserverPage = () => {
    const { meetingId } = useParams();
    const router = useRouter();
    const { user, isAuth } = useUser();
    const [meetingData, setMeetingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const videoRef = useRef(null);

    // Use merged hook with all functionality
    const {
        // WebRTC functionality
        observerStream,
        isObserverConnected,
        screenShareActive,
        socketConnection,
        isConnected,
        
        // Observer functionality
        isObserving,
        observerPermissions,
        screenStream,
        observers,
        startObserving,
        stopObserving,
        requestScreenShare,
        takeScreenshot
    } = useObserverWebRTC(false, meetingId, videoRef, true, user);

    useEffect(() => {
        if (observerStream && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = observerStream;
            videoRef.current.play().catch(console.error);
        }
    }, [observerStream]);

    useEffect(() => {
        if (isConnected && !isObserving) {
            startObserving();
        }
    }, [isConnected, isObserving, startObserving]);

    useEffect(() => {
        if (isConnected && isObserving && !screenShareActive) {
            console.log('🔄 Requesting screen share from admin...');
            setTimeout(() => {
                if (socketConnection && socketConnection.current) {
                    console.log('📡 Emitting observer-request-screen event');
                    socketConnection.current.emit('observer-request-screen', meetingId, {
                        observer_id: user?.userId || 'observer',
                        observer_email: user?.email || 'observer@example.com',
                        observer_name: user?.role === 'company-admin' ? 'Company Admin Observer' : `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Observer',
                        observer_role: user?.role || 'observer'
                    });
                } else {
                    console.log('⚠️ Socket connection not available, using requestScreenShare');
                    requestScreenShare();
                }
            }, 1000);
        }
    }, [isObserving]);

    // Load meeting data when user is available
    useEffect(() => {
        const loadMeetingData = async () => {
            if (!user || !isAuth) {
                console.log('⏳ Waiting for user authentication...');
                return;
            }

            try {
                console.log('🔍 OBSERVER PAGE DEBUG START');
                console.log('📋 Meeting ID:', meetingId);
                console.log('👤 User from context:', user);
                
                // For company admins, skip meeting data check and create mock data
                if (user.role === 'company-admin') {
                    console.log('🏢 Company admin detected, creating mock meeting data');
                    setMeetingData({
                        success: true,
                        observer_enabled: true,
                        observer_permissions: {
                            can_view_screen: true,
                            can_control_camera: false,
                            can_take_screenshots: false
                        },
                        meeting: {
                            meeting_id: meetingId,
                            name: 'Company Admin Observer Session'
                        }
                    });
                    setLoading(false);
                    return;
                }

                // Get meeting data for non-company-admin users
                console.log('📊 Fetching meeting data...');
                const token = localStorage.getItem('token');
                const meetingResponse = await fetch(`/api/v1/meeting/${meetingId}/observers`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                console.log('📊 Meeting response status:', meetingResponse.status);

                if (meetingResponse.ok) {
                    const meetingData = await meetingResponse.json();
                    console.log('📊 Meeting data:', meetingData);
                    setMeetingData(meetingData);
                } else {
                    // If observer endpoint fails, try to get basic meeting info
                    console.log('⚠️ Observer endpoint failed, trying basic meeting endpoint');
                    const basicMeetingResponse = await fetch(`/api/v1/meeting/${meetingId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    console.log('📊 Basic meeting response status:', basicMeetingResponse.status);
                    
                    if (basicMeetingResponse.ok) {
                        const basicMeetingData = await basicMeetingResponse.json();
                        console.log('📊 Basic meeting data:', basicMeetingData);
                        // Create mock observer data
                        setMeetingData({
                            success: true,
                            observer_enabled: true,
                            observer_permissions: {
                                can_view_screen: true,
                                can_control_camera: false,
                                can_take_screenshots: false
                            },
                            meeting: basicMeetingData.meeting
                        });
                    } else {
                        console.error('❌ Both observer and basic meeting endpoints failed');
                        toast.error('Failed to access meeting data');
                    }
                }

            } catch (error) {
                console.error('❌ Error loading data:', error);
                toast.error('Failed to load meeting data');
            } finally {
                setLoading(false);
                console.log('🔍 OBSERVER PAGE DEBUG END');
            }
        };

        loadMeetingData();
    }, [meetingId, user, isAuth]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading observer interface...</p>
                </div>
            </div>
        );
    }

    if (!user || !isAuth) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-4">Loading...</h2>
                        <p className="text-gray-600 mb-4">Please wait while we authenticate you.</p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // For company admins, allow access even if meeting data is not available
    if (!meetingData && user.role !== 'company-admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-96">
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-4">Loading Meeting Data...</h2>
                        <p className="text-gray-600 mb-4">Please wait while we load meeting information.</p>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push('/dashboard')}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-xl font-semibold">Meeting Observer</h1>
                                <p className="text-sm text-gray-600">Meeting ID: {meetingId}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            <Badge variant={isConnected ? "default" : "secondary"}>
                                {isConnected ? "Connected" : "Disconnected"}
                            </Badge>
                            <Badge variant={isObserving ? "default" : "outline"}>
                                {isObserving ? "Observing" : "Not Observing"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Observer Interface */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Monitor className="w-5 h-5 mr-2" />
                                    Screen View
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(screenStream || observerStream) ? (
                                    <div className="relative">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-96 bg-black rounded-lg object-contain"
                                        />
                                        <div className="absolute top-4 right-4 flex space-x-2">
                                            {observerPermissions.can_take_screenshots && (
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={takeScreenshot}
                                                >
                                                    <Camera className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    if (observerStream && videoRef.current) {
                                                        console.log('🖥️ Manual video refresh');
                                                        videoRef.current.srcObject = observerStream;
                                                        videoRef.current.play().catch(console.error);
                                                    }
                                                }}
                                            >
                                                <Play className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="absolute bottom-4 left-4">
                                            <Badge variant="default" className="bg-green-600">
                                                {isObserverConnected ? "Connected" : "Connecting..."}
                                            </Badge>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-600 mb-4">
                                                {isObserving ? 'Requesting admin to share their browser tab...' : 'Connecting to meeting...'}
                                            </p>
                                            <p className="text-sm text-gray-500 mt-2">
                                                {isObserving ? 'The admin will be prompted to share their browser tab. Please wait...' : 'Please wait while we connect you to the meeting.'}
                                            </p>
                                            {!isObserving && (
                                                <div className="mt-4">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Observer Controls & Info */}
                    <div className="space-y-6">
                        {/* Observer Controls */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Settings className="w-5 h-5 mr-2" />
                                    Observer Controls
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="text-center space-y-2">
                                    <Badge variant={isObserving ? "default" : "secondary"} className="text-sm">
                                        {isObserving ? "Currently Observing" : "Connecting..."}
                                    </Badge>
                                    {isObserving && (
                                        <Button 
                                            onClick={stopObserving}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Stop Observing
                                        </Button>
                                    )}
                                </div>

                                {isObserving && !observerStream && (
                                    <div className="text-center space-y-2">
                                        <Button 
                                            onClick={requestScreenShare}
                                            variant="default"
                                            size="sm"
                                            className="w-full"
                                        >
                                            <Monitor className="w-4 h-4 mr-2" />
                                            Request Tab Sharing
                                        </Button>

                                        <p className="text-xs text-gray-500 mt-2">
                                            Ask the admin to share their browser tab
                                        </p>
                                    </div>
                                )}

                            </CardContent>
                        </Card>

                        {/* Permissions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Your Permissions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">View Screen</span>
                                    <Badge variant={observerPermissions.can_view_screen ? "default" : "secondary"}>
                                        {observerPermissions.can_view_screen ? "Allowed" : "Denied"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Control Camera</span>
                                    <Badge variant={observerPermissions.can_control_camera ? "default" : "secondary"}>
                                        {observerPermissions.can_control_camera ? "Allowed" : "Denied"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Take Screenshots</span>
                                    <Badge variant={observerPermissions.can_take_screenshots ? "default" : "secondary"}>
                                        {observerPermissions.can_take_screenshots ? "Allowed" : "Denied"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Other Observers */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Users className="w-5 h-5 mr-2" />
                                    Other Observers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {observers.length > 0 ? (
                                    <div className="space-y-2">
                                        {observers.map((observer, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                <div>
                                                    <p className="text-sm font-medium">{observer.observer_name}</p>
                                                    <p className="text-xs text-gray-600">{observer.observer_email}</p>
                                                </div>
                                                <Badge variant={observer.is_active ? "default" : "secondary"}>
                                                    {observer.is_active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">No other observers</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Debug Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Settings className="w-5 h-5 mr-2" />
                                    Debug Info
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span>Socket Connected:</span>
                                    <Badge variant={isConnected ? "default" : "secondary"}>
                                        {isConnected ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Observing:</span>
                                    <Badge variant={isObserving ? "default" : "secondary"}>
                                        {isObserving ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>WebRTC Connected:</span>
                                    <Badge variant={isObserverConnected ? "default" : "secondary"}>
                                        {isObserverConnected ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Has Stream:</span>
                                    <Badge variant={(observerStream || screenStream) ? "default" : "secondary"}>
                                        {(observerStream || screenStream) ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Observer Stream:</span>
                                    <Badge variant={observerStream ? "default" : "secondary"}>
                                        {observerStream ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Screen Stream:</span>
                                    <Badge variant={screenStream ? "default" : "secondary"}>
                                        {screenStream ? "Yes" : "No"}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span>Screen Share Active:</span>
                                    <Badge variant={screenShareActive ? "default" : "secondary"}>
                                        {screenShareActive ? "Yes" : "No"}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ObserverPage;
