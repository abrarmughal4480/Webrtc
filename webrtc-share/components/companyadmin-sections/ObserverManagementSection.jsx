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
    Download
} from 'lucide-react';
import { toast } from 'sonner';

const ObserverManagementSection = ({ meetingId, userData }) => {
    const [observerEnabled, setObserverEnabled] = useState(false);
    const [observerPermissions, setObserverPermissions] = useState({
        can_view_screen: true,
        can_control_camera: false,
        can_take_screenshots: false
    });
    const [observers, setObservers] = useState([]);
    const [newObserverEmail, setNewObserverEmail] = useState('');
    const [loading, setLoading] = useState(false);

    // Load observer settings
    useEffect(() => {
        loadObserverSettings();
    }, [meetingId]);

    const loadObserverSettings = async () => {
        try {
            const response = await fetch(`/api/v1/meeting/${meetingId}/observers`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setObserverEnabled(data.observer_enabled);
                setObserverPermissions(data.observer_permissions || {
                    can_view_screen: true,
                    can_control_camera: false,
                    can_take_screenshots: false
                });
                setObservers(data.observers || []);
            }
        } catch (error) {
            console.error('Error loading observer settings:', error);
        }
    };

    const enableObserverMode = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/meeting/${meetingId}/observer/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    permissions: observerPermissions
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setObserverEnabled(true);
                toast.success('Observer mode enabled');
            } else {
                toast.error(data.message || 'Failed to enable observer mode');
            }
        } catch (error) {
            console.error('Error enabling observer mode:', error);
            toast.error('Failed to enable observer mode');
        } finally {
            setLoading(false);
        }
    };

    const disableObserverMode = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/meeting/${meetingId}/observer/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                setObserverEnabled(false);
                setObservers([]);
                toast.success('Observer mode disabled');
            } else {
                toast.error(data.message || 'Failed to disable observer mode');
            }
        } catch (error) {
            console.error('Error disabling observer mode:', error);
            toast.error('Failed to disable observer mode');
        } finally {
            setLoading(false);
        }
    };

    const addObserver = async () => {
        if (!newObserverEmail.trim()) {
            toast.error('Please enter an observer email');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/v1/meeting/${meetingId}/observer/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    observer_email: newObserverEmail.trim()
                })
            });

            const data = await response.json();
            
            if (data.success) {
                setObservers([...observers, data.observer]);
                setNewObserverEmail('');
                toast.success('Observer added successfully');
            } else {
                toast.error(data.message || 'Failed to add observer');
            }
        } catch (error) {
            console.error('Error adding observer:', error);
            toast.error('Failed to add observer');
        } finally {
            setLoading(false);
        }
    };

    const removeObserver = async (observerId) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/meeting/${meetingId}/observer/${observerId}/remove`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                setObservers(observers.filter(obs => obs.observer_id !== observerId));
                toast.success('Observer removed successfully');
            } else {
                toast.error(data.message || 'Failed to remove observer');
            }
        } catch (error) {
            console.error('Error removing observer:', error);
            toast.error('Failed to remove observer');
        } finally {
            setLoading(false);
        }
    };

    const updatePermissions = (permission, value) => {
        setObserverPermissions(prev => ({
            ...prev,
            [permission]: value
        }));
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Eye className="w-5 h-5 mr-2" />
                        Observer Management
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Observer Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium">Observer Mode</h3>
                            <p className="text-sm text-gray-600">
                                Allow authorized users to observe this meeting
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {observerEnabled ? (
                                <Button
                                    onClick={disableObserverMode}
                                    variant="destructive"
                                    disabled={loading}
                                >
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Disable
                                </Button>
                            ) : (
                                <Button
                                    onClick={enableObserverMode}
                                    disabled={loading}
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Enable
                                </Button>
                            )}
                        </div>
                    </div>

                    {observerEnabled && (
                        <>
                            {/* Observer Permissions */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Observer Permissions</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            id="view-screen"
                                            checked={observerPermissions.can_view_screen}
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
                                            checked={observerPermissions.can_control_camera}
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
                                            checked={observerPermissions.can_take_screenshots}
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
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Add Observer</h3>
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
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add
                                    </Button>
                                </div>
                            </div>

                            {/* Observer List */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Current Observers</h3>
                                {observers.length > 0 ? (
                                    <div className="space-y-2">
                                        {observers.map((observer) => (
                                            <div
                                                key={observer.observer_id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                            >
                                                <div>
                                                    <p className="font-medium">{observer.observer_name}</p>
                                                    <p className="text-sm text-gray-600">{observer.observer_email}</p>
                                                    <p className="text-xs text-gray-500">
                                                        Joined: {new Date(observer.joined_at).toLocaleString()}
                                                    </p>
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
                                    <p className="text-gray-600">No observers added yet</p>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ObserverManagementSection;
