import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Eye, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const ObserverLinkGenerator = ({ meetingId, isObserverEnabled }) => {
    const [observerEmail, setObserverEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [loading, setLoading] = useState(false);

    const generateObserverLink = async () => {
        if (!observerEmail.trim()) {
            toast.error('Please enter an observer email');
            return;
        }

        if (!isObserverEnabled) {
            toast.error('Observer mode is not enabled for this meeting');
            return;
        }

        setLoading(true);
        try {
            // Add observer to meeting
            const response = await fetch(`/api/v1/meeting/${meetingId}/observer/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    observer_email: observerEmail.trim()
                })
            });

            const data = await response.json();
            
            if (data.success) {
                // Generate observer link
                const baseUrl = window.location.origin;
                const observerLink = `${baseUrl}/observer/${meetingId}`;
                setGeneratedLink(observerLink);
                toast.success('Observer added and link generated');
            } else {
                toast.error(data.message || 'Failed to add observer');
            }
        } catch (error) {
            console.error('Error generating observer link:', error);
            toast.error('Failed to generate observer link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(generatedLink);
            toast.success('Observer link copied to clipboard');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            toast.error('Failed to copy link');
        }
    };

    const openObserverLink = () => {
        window.open(generatedLink, '_blank');
    };

    const shareLink = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Meeting Observer Link',
                    text: 'Join as an observer for this meeting',
                    url: generatedLink
                });
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            copyToClipboard();
        }
    };

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center">
                    <Eye className="w-5 h-5 mr-2" />
                    Generate Observer Link
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="observer-email">Observer Email</Label>
                    <Input
                        id="observer-email"
                        type="email"
                        placeholder="Enter observer email"
                        value={observerEmail}
                        onChange={(e) => setObserverEmail(e.target.value)}
                        disabled={!isObserverEnabled}
                    />
                </div>

                <Button
                    onClick={generateObserverLink}
                    disabled={loading || !isObserverEnabled || !observerEmail.trim()}
                    className="w-full"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <Share2 className="w-4 h-4 mr-2" />
                            Generate Link
                        </>
                    )}
                </Button>

                {generatedLink && (
                    <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-2">Observer Link:</p>
                            <p className="text-sm font-mono break-all">{generatedLink}</p>
                        </div>

                        <div className="flex space-x-2">
                            <Button
                                onClick={copyToClipboard}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                            <Button
                                onClick={openObserverLink}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Open
                            </Button>
                            <Button
                                onClick={shareLink}
                                variant="outline"
                                size="sm"
                                className="flex-1"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                            </Button>
                        </div>
                    </div>
                )}

                {!isObserverEnabled && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            Observer mode must be enabled to generate observer links.
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ObserverLinkGenerator;
