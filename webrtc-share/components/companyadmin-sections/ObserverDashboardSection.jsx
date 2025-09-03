import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
    Eye, 
    EyeOff, 
    Users, 
    Plus, 
    Trash2, 
    Settings,
    Monitor,
    Camera,
    Download,
    ExternalLink,
    Clock,
    User
} from 'lucide-react';
import { toast } from 'sonner';
import { observerApi } from '@/http/observerHttp';

const ObserverDashboardSection = () => {
    const [observableMeetings, setObservableMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [observerSettings, setObserverSettings] = useState({
        enabled: false,
        permissions: {
            can_view_screen: true,
            can_control_camera: false,
            can_take_screenshots: false
        },
        observers: []
    });
    const [newObserverEmail, setNewObserverEmail] = useState('');

    // Load observable meetings
    useEffect(() => {
        loadObservableMeetings();
    }, []);

    const loadObservableMeetings = async () => {
        setLoading(true);
        try {
            const response = await observerApi.getObservableMeetings();
            if (response.success) {
                setObservableMeetings(response.meetings);
            }
        } catch (error) {
            console.error('Error loading observable meetings:', error);
            toast.error('Failed to load observable meetings');
        } finally {
            setLoading(false);
        }
    };

    const loadMeetingObserverSettings = async (meetingId) => {
        try {
            const response = await observerApi.getMeetingObservers(meetingId);
            if (response.success) {
                setObserverSettings({
                    enabled: response.observer_enabled,
                    permissions: response.observer_permissions,
                    observers: response.observers
                });
            }
        } catch (error) {
            console.error('Error loading observer settings:', error);
            toast.error('Failed to load observer settings');
        }
    };

    const handleMeetingSelect = (meeting) => {
        setSelectedMeeting(meeting);
        loadMeetingObserverSettings(meeting.meeting_id);
    };

    const enableObserverMode = async () => {
        if (!selectedMeeting) return;

        setLoading(true);
        try {
            const response = await observerApi.enableObserverMode(
                selectedMeeting.meeting_id, 
                observerSettings.permissions
            );
            
            if (response.success) {
                setObserverSettings(prev => ({ ...prev, enabled: true }));
                toast.success('Observer mode enabled');
            } else {
                toast.error(response.message || 'Failed to enable observer mode');
            }
        } catch (error) {
            console.error('Error enabling observer mode:', error);
            toast.error('Failed to enable observer mode');
        } finally {
            setLoading(false);
        }
    };

    const disableObserverMode = async () => {
        if (!selectedMeeting) return;

        setLoading(true);
        try {
            const response = await observerApi.disableObserverMode(selectedMeeting.meeting_id);
            
            if (response.success) {
                setObserverSettings(prev => ({ 
                    ...prev, 
                    enabled: false, 
                    observers: [] 
                }));
                toast.success('Observer mode disabled');
            } else {
                toast.error(response.message || 'Failed to disable observer mode');
            }
        } catch (error) {
            console.error('Error disabling observer mode:', error);
            toast.error('Failed to disable observer mode');
        } finally {
            setLoading(false);
        }
    };

    const addObserver = async () => {
        if (!selectedMeeting || !newObserverEmail.trim()) {
            toast.error('Please enter an observer email');
            return;
        }

        setLoading(true);
        try {
            const response = await observerApi.addObserver(
                selectedMeeting.meeting_id, 
                newObserverEmail.trim()
            );
            
            if (response.success) {
                setObserverSettings(prev => ({
                    ...prev,
                    observers: [...prev.observers, response.observer]
                }));
                setNewObserverEmail('');
                toast.success('Observer added successfully');
            } else {
                toast.error(response.message || 'Failed to add observer');
            }
        } catch (error) {
            console.error('Error adding observer:', error);
            toast.error('Failed to add observer');
        } finally {
            setLoading(false);
        }
    };

    const removeObserver = async (observerId) => {
        if (!selectedMeeting) return;

        setLoading(true);
        try {
            const response = await observerApi.removeObserver(
                selectedMeeting.meeting_id, 
                observerId
            );
            
            if (response.success) {
                setObserverSettings(prev => ({
                    ...prev,
                    observers: prev.observers.filter(obs => obs.observer_id !== observerId)
                }));
                toast.success('Observer removed successfully');
            } else {
                toast.error(response.message || 'Failed to remove observer');
            }
        } catch (error) {
            console.error('Error removing observer:', error);
            toast.error('Failed to remove observer');
        } finally {
            setLoading(false);
        }
    };

    const updatePermissions = (permission, value) => {
        setObserverSettings(prev => ({
            ...prev,
            permissions: {
                ...prev.permissions,
                [permission]: value
            }
        }));
    };

    const joinAsObserver = (meetingId) => {
        window.open(`/observer/${meetingId}`, '_blank');
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        Observer Dashboard
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Observable Meetings List */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Available Meetings</h3>
                            {loading ? (
                                <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="text-gray-600 mt-2">Loading meetings...</p>
                                </div>
                            ) : observableMeetings.length > 0 ? (
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {observableMeetings.map((meeting) => (
                                        <div
                                            key={meeting.meeting_id}
                                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                                selectedMeeting?.meeting_id === meeting.meeting_id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                            onClick={() => handleMeetingSelect(meeting)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium">{meeting.name || 'Unnamed Meeting'}</p>
                                                    <p className="text-sm text-gray-600">
                                                        {meeting.first_name} {meeting.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Created: {new Date(meeting.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Badge variant={meeting.observer_info?.is_active ? "default" : "secondary"}>
                                                        {meeting.observer_info?.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            joinAsObserver(meeting.meeting_id);
                                                        }}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-600">No observable meetings available</p>
                            )}
                        </div>

                        {/* Observer Management */}
                        {selectedMeeting && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Observer Management</h3>
                                
                                {/* Meeting Info */}
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-medium">{selectedMeeting.name || 'Unnamed Meeting'}</p>
                                    <p className="text-sm text-gray-600">
                                        {selectedMeeting.first_name} {selectedMeeting.last_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        Meeting ID: {selectedMeeting.meeting_id}
                                    </p>
                                </div>

                                {/* Observer Mode Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium">Observer Mode</h4>
                                        <p className="text-sm text-gray-600">
                                            Allow authorized users to observe this meeting
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {observerSettings.enabled ? (
                                            <Button
                                                onClick={disableObserverMode}
                                                variant="destructive"
                                                size="sm"
                                                disabled={loading}
                                            >
                                                <EyeOff className="w-4 h-4 mr-2" />
                                                Disable
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={enableObserverMode}
                                                size="sm"
                                                disabled={loading}
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                Enable
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {observerSettings.enabled && (
                                    <>
                                        {/* Observer Permissions */}
                                        <div className="space-y-3">
                                            <h4 className="font-medium">Observer Permissions</h4>
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="view-screen"
                                                        checked={observerSettings.permissions.can_view_screen}
                                                        onCheckedChange={(checked) => updatePermissions('can_view_screen', checked)}
                                                    />
                                                    <Label htmlFor="view-screen" className="flex items-center">
                                                        <Monitor className="w-4 h-4 mr-1" />
                                                        View Screen
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="control-camera"
                                                        checked={observerSettings.permissions.can_control_camera}
                                                        onCheckedChange={(checked) => updatePermissions('can_control_camera', checked)}
                                                    />
                                                    <Label htmlFor="control-camera" className="flex items-center">
                                                        <Camera className="w-4 h-4 mr-1" />
                                                        Control Camera
                                                    </Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <Switch
                                                        id="take-screenshots"
                                                        checked={observerSettings.permissions.can_take_screenshots}
                                                        onCheckedChange={(checked) => updatePermissions('can_take_screenshots', checked)}
                                                    />
                                                    <Label htmlFor="take-screenshots" className="flex items-center">
                                                        <Download className="w-4 h-4 mr-1" />
                                                        Take Screenshots
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add Observer */}
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Add Observer</h4>
                                            <div className="flex space-x-2">
                                                <Input
                                                    type="email"
                                                    placeholder="Enter observer email"
                                                    value={newObserverEmail}
                                                    onChange={(e) => setNewObserverEmail(e.target.value)}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    onClick={addObserver}
                                                    disabled={loading || !newObserverEmail.trim()}
                                                    size="sm"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Observer List */}
                                        <div className="space-y-2">
                                            <h4 className="font-medium">Current Observers</h4>
                                            {observerSettings.observers.length > 0 ? (
                                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                                    {observerSettings.observers.map((observer) => (
                                                        <div
                                                            key={observer.observer_id}
                                                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                                                        >
                                                            <div className="flex items-center space-x-2">
                                                                <User className="w-4 h-4 text-gray-500" />
                                                                <div>
                                                                    <p className="text-sm font-medium">{observer.observer_name}</p>
                                                                    <p className="text-xs text-gray-600">{observer.observer_email}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <Badge variant={observer.is_active ? "default" : "secondary"}>
                                                                    {observer.is_active ? "Active" : "Inactive"}
                                                                </Badge>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() => removeObserver(observer.observer_id)}
                                                                    disabled={loading}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-600">No observers added yet</p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ObserverDashboardSection;
