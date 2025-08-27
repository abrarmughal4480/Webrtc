import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Archive, Trash2, Monitor, Smartphone, Save, History, ArchiveRestore, ExternalLink, FileSearch, MailIcon, Loader2 as Loader2Icon, LockIcon, XIcon, X, Link, Copy, Eye, EyeOff, ChevronLeft, ArrowLeft, ChevronRight, Phone, Calendar, MessageCircle } from 'lucide-react';
import { getAllTickets, updateTicketByAdmin, assignTicket, getDashboardStats, getSuperAdminAllTickets } from '@/http/supportTicketHttp';
import { toast } from 'sonner';
import AdminChatScreen from '@/components/AdminChatScreen';

const SupportTicketManagementSection = () => {
    const [tickets, setTickets] = useState([]);
    const [callbackRequests, setCallbackRequests] = useState([]);
    const [demoMeetings, setDemoMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [callbackLoading, setCallbackLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState({});
    const [showTicketDetails, setShowTicketDetails] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('support-tickets-active-tab') || 'tickets';
        }
        return 'tickets';
    });

    const [editingCallbackStatus, setEditingCallbackStatus] = useState(null);
    const [editingCallbackStatusValue, setEditingCallbackStatusValue] = useState('');
    const [editingDemoStatus, setEditingDemoStatus] = useState(null);
    const [editingDemoStatusValue, setEditingDemoStatusValue] = useState('');
    
    // Chat screen state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatTicketInfo, setChatTicketInfo] = useState(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('support-tickets-active-tab', activeTab);
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'tickets') {
            loadTickets();
        } else if (activeTab === 'callbacks') {
            loadCallbackRequests();
        } else if (activeTab === 'demo-meetings') {
            loadDemoMeetings();
        }
        
        // Set up 5-second interval to refresh data (only for data, not loading state)
        const interval = setInterval(() => {
            if (activeTab === 'tickets' && !loading) {
                loadTickets();
            } else if (activeTab === 'callbacks' && !callbackLoading) {
                loadCallbackRequests();
            } else if (activeTab === 'demo-meetings' && !demoLoading) {
                loadDemoMeetings();
            }
        }, 5000);
        
        // Cleanup interval on component unmount
        return () => clearInterval(interval);
    }, [activeTab, loading, callbackLoading, demoLoading]);

    const loadTickets = async () => {
        try {
            // Only show loading skeleton on initial load, not on refresh
            if (tickets.length === 0) {
                setLoading(true);
            }
            
            // Use super admin endpoint to get ALL tickets without restrictions
            const response = await getSuperAdminAllTickets();
            if (response.success) {
                setTickets(response.data);
            } else {
                toast.error('Failed to load tickets');
            }
        } catch (error) {
            console.error('Error loading tickets:', error);
            toast.error('Failed to load tickets');
        } finally {
            setLoading(false);
        }
    };

    const loadCallbackRequests = async () => {
        try {
            if (callbackRequests.length === 0) {
                setCallbackLoading(true);
            }
            
            console.log('🔄 Loading callback requests...'); // Debug log
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/callback-requests`, {
                credentials: 'include'
            });
            
            console.log('📡 Callback requests response status:', response.status); // Debug log
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Callback requests response data:', data); // Debug log
                
                if (data.success && data.data && data.data.callbackRequests) {
                    console.log('✅ Callback requests loaded:', data.data.callbackRequests.length); // Debug log
                    setCallbackRequests(data.data.callbackRequests);
                } else {
                    console.error('❌ Invalid callback requests response structure:', data);
                    setCallbackRequests([]);
                }
            } else {
                console.error('❌ Failed to load callback requests:', response.status, response.statusText);
                setCallbackRequests([]);
            }
        } catch (error) {
            console.error('❌ Error loading callback requests:', error);
            setCallbackRequests([]);
        } finally {
            console.log('🏁 Callback requests loading finished, setting loading to false'); // Debug log
            setCallbackLoading(false);
        }
    };

    const loadDemoMeetings = async () => {
        try {
            if (demoMeetings.length === 0) {
                setDemoLoading(true);
            }
            
            console.log('🔄 Loading demo meetings...'); // Debug log
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo-meetings`, {
                credentials: 'include'
            });
            
            console.log('📡 Demo meetings response status:', response.status); // Debug log
            
            if (response.ok) {
                const data = await response.json();
                console.log('📊 Demo meetings response data:', data); // Debug log
                
                if (data.success && data.data && data.data.demoMeetings) {
                    console.log('✅ Demo meetings loaded:', data.data.demoMeetings.length); // Debug log
                    setDemoMeetings(data.data.demoMeetings);
                } else {
                    console.error('❌ Invalid demo meetings response structure:', data);
                    setDemoMeetings([]);
                }
            } else {
                console.error('❌ Failed to load demo meetings:', response.status, response.statusText);
                setDemoMeetings([]);
            }
        } catch (error) {
            console.error('❌ Error loading demo meetings:', error);
            setDemoMeetings([]);
        } finally {
            console.log('🏁 Demo meetings loading finished, setting loading to false'); // Debug log
            setDemoLoading(false);
        }
    };

    const handleStatusUpdate = async (ticketId, newStatus) => {
        try {
            // Set loading for specific ticket
            setUpdatingStatus(prev => ({ ...prev, [ticketId]: true }));
            
            const response = await updateTicketByAdmin(ticketId, { status: newStatus });
            if (response.success) {
                // Update local state
                setTickets(prev => prev.map(ticket => 
                    ticket._id === ticketId 
                        ? { ...ticket, status: newStatus }
                        : ticket
                ));
                toast.success('Ticket status updated successfully');
            } else {
                toast.error('Failed to update ticket status');
            }
        } catch (error) {
            console.error('Error updating ticket status:', error);
            toast.error('Failed to update ticket status');
        } finally {
            // Remove loading for specific ticket
            setUpdatingStatus(prev => ({ ...prev, [ticketId]: false }));
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'unassigned';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'unassigned';
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        const hourStr = ampm === 'am' ? String(displayHours).padStart(2, '0') : (displayHours < 10 ? ` ${displayHours}` : String(displayHours));
        const timeStr = `${hourStr}:${String(minutes).padStart(2, '0')} ${ampm}`;
        
        return {
            date: `${day}/${month}/${year}`,
            time: timeStr
        };
    };

    // Skeleton component for table rows
    const TableSkeleton = () => (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
            <div className="mb-4">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(8)].map((_, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Skeleton for callback requests table
    const CallbackTableSkeleton = () => (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
            <div className="mb-4">
                <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(6)].map((_, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Skeleton for demo meetings table
    const DemoTableSkeleton = () => (
        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
            <div className="mb-4">
                <div className="h-6 bg-gray-200 rounded w-36 animate-pulse"></div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                            </th>
                            <th className="text-left py-3 px-4 font-medium text-gray-700">
                                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(6)].map((_, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Handle tab change
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        // Load data for the selected tab
        if (tabName === 'tickets') {
            loadTickets();
        } else if (tabName === 'callbacks') {
            loadCallbackRequests();
        } else if (tabName === 'demo-meetings') {
            loadDemoMeetings();
        }
    };

    // Handle double-click on callback status to start editing
    const handleCallbackStatusDoubleClick = (requestId, currentStatus) => {
        setEditingCallbackStatus(requestId);
        setEditingCallbackStatusValue(currentStatus || 'pending');
    };

    // Handle callback status edit save
    const handleCallbackStatusEditSave = async (requestId) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/callback-requests/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: editingCallbackStatusValue })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setCallbackRequests(prev => prev.map(request => 
                        request._id === requestId 
                            ? { ...request, status: editingCallbackStatusValue }
                            : request
                    ));
                    toast.success('Callback request status updated successfully');
                    setEditingCallbackStatus(null);
                    setEditingCallbackStatusValue('');
                } else {
                    toast.error('Failed to update callback request status');
                }
            } else {
                toast.error('Failed to update callback request status');
            }
        } catch (error) {
            console.error('Error updating callback request status:', error);
            toast.error('Failed to update callback request status');
        }
    };

    // Handle callback status edit cancel
    const handleCallbackStatusEditCancel = () => {
        setEditingCallbackStatus(null);
        setEditingCallbackStatusValue('');
    };

    // Handle double-click on demo meeting status to start editing
    const handleDemoStatusDoubleClick = (meetingId, currentStatus) => {
        setEditingDemoStatus(meetingId);
        setEditingDemoStatusValue(currentStatus || 'pending');
    };

    // Handle demo meeting status edit save
    const handleDemoStatusEditSave = async (meetingId) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo-meetings/${meetingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ status: editingDemoStatusValue })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setDemoMeetings(prev => prev.map(meeting => 
                        meeting._id === meetingId 
                            ? { ...meeting, status: editingDemoStatusValue }
                            : meeting
                    ));
                    toast.success('Demo meeting status updated successfully');
                    setEditingDemoStatus(null);
                    setEditingDemoStatusValue('');
                } else {
                    toast.error('Failed to update demo meeting status');
                }
            } else {
                toast.error('Failed to update demo meeting status');
            }
        } catch (error) {
            console.error('Error updating demo meeting status:', error);
            toast.error('Failed to update demo meeting status');
        }
    };

    // Handle demo meeting status edit cancel
    const handleDemoStatusEditCancel = () => {
        setEditingDemoStatus(null);
        setEditingDemoStatusValue('');
    };

    // Handle chat button click
    const handleChatClick = (ticket) => {
        setChatTicketInfo(ticket);
        setIsChatOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Toggle Buttons */}
            <div className="flex flex-wrap gap-3 justify-end mb-6">
                <button
                    onClick={() => handleTabChange('tickets')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                        activeTab === 'tickets'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                >
                    <MailIcon className={`w-5 h-5 ${activeTab === 'tickets' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-sm">Support Tickets</span>
                </button>
                <button
                    onClick={() => handleTabChange('callbacks')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                        activeTab === 'callbacks'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                >
                    <Phone className={`w-5 h-5 ${activeTab === 'callbacks' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-sm">Callback Requests</span>
                </button>
                <button
                    onClick={() => handleTabChange('demo-meetings')}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                        activeTab === 'demo-meetings'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg scale-105'
                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                    }`}
                >
                    <Calendar className={`w-5 h-5 ${activeTab === 'demo-meetings' ? 'text-white' : 'text-purple-600'}`} />
                    <span className="text-sm">Demo Meetings</span>
                </button>
            </div>

            {/* Support Tickets Tab */}
            {activeTab === 'tickets' && (
                <>
                    {loading ? (
                        <TableSkeleton />
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-gray-600">No support tickets found.</p>
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Support Tickets</h2>
                            </div>
                            <table className="min-w-full text-left text-xs sm:text-sm">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="h-14 align-middle">
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            User
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Company
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Category
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Date & Time
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Status
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Attachments
                                        </th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/7 h-14 align-middle">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket, idx) => {
                                        const { date, time } = formatDate(ticket.createdAt);
                                        return (
                                            <tr key={ticket._id} className="hover:bg-gray-50 group">
                                                <td className="px-4 py-3 w-1/7">
                                                    <span>
                                                        {ticket.userId?.email || ticket.userId?.landlordInfo?.landlordName || 'unassigned'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <span>
                                                        {ticket.companyId?.name || 'unassigned'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <span className="font-medium">{ticket.category || 'unassigned'}</span>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <div className="flex items-center">
                                                        <span className="font-mono">{date}</span>
                                                        <span className="mx-2"></span>
                                                        <span className="font-mono">{time}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <span>{ticket.status || 'unassigned'}</span>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <span className="text-center">{ticket.attachments?.length || 0}</span>
                                                </td>
                                                <td className="px-4 py-3 w-1/7">
                                                    <div className="flex items-center gap-2">
                                                        {/* Details Button */}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTicket(ticket);
                                                                setShowTicketDetails(true);
                                                            }}
                                                            className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-all duration-200 hover:bg-blue-50 px-2 py-1.5 rounded-lg"
                                                            title="View ticket details"
                                                        >
                                                            <span>Details</span>
                                                        </button>
                                                        
                                                        {/* Support Chat Button */}
                                                        <button
                                                            onClick={() => handleChatClick(ticket)}
                                                            className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg"
                                                            title="Open support chat"
                                                        >
                                                            <span>Support Chat</span>
                                                        </button>
                                                        
                                                        {/* Quick Status Update */}
                                                        <Select
                                                            value={ticket.status || 'Open'}
                                                            onValueChange={(value) => handleStatusUpdate(ticket._id, value)}
                                                            disabled={loading || updatingStatus[ticket._id]}
                                                        >
                                                            <SelectTrigger className="w-32 h-7 text-xs bg-gray-50 text-gray-700 border border-purple-500 flex items-center justify-center font-medium rounded-md">
                                                                {updatingStatus[ticket._id] ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-500"></div>
                                                                        <span className="text-xs">Updating...</span>
                                                                    </div>
                                                                ) : (
                                                                    <SelectValue defaultValue={ticket.status || 'Open'} />
                                                                )}
                                                            </SelectTrigger>
                                                            <SelectContent className="border border-purple-500 bg-white shadow-lg rounded-b-md [&_svg]:hidden [&_[data-radix-select-item-indicator]]:hidden">
                                                                <SelectItem value="Open" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Open</SelectItem>
                                                                <SelectItem value="In Progress" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">In Progress</SelectItem>
                                                                <SelectItem value="Resolved" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Resolved</SelectItem>
                                                                <SelectItem value="Closed" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Closed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Callback Requests Tab */}
            {activeTab === 'callbacks' && (
                <>
                    {callbackLoading ? (
                        <CallbackTableSkeleton />
                    ) : callbackRequests.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-white p-8 rounded-xl shadow-md">
                                <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Callback Requests</h3>
                                <p className="text-gray-600">No callback requests found.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Callback Requests ({callbackRequests.length})</h2>
                            </div>
                            <table className="min-w-full text-left text-xs sm:text-sm">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="h-14 align-middle">
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Name</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Email</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Phone</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Preferred Time</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Status</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {callbackRequests.map((request) => (
                                        <tr key={request._id} className="hover:bg-gray-50 group">
                                            <td className="px-4 py-3 w-1/6">
                                                <span className="font-medium">{request.name}</span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <span>{request.email}</span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <span>{request.phone}</span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <div className="text-sm">
                                                    <div>{request.preferredDay}</div>
                                                    {request.customDate && (
                                                        <div className="text-gray-500">
                                                            {new Date(request.customDate).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    <div className="text-gray-500">
                                                        {request.preferredTime.hour}:{request.preferredTime.minute}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                {editingCallbackStatus === request._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={editingCallbackStatusValue}
                                                            onValueChange={(value) => setEditingCallbackStatusValue(value)}
                                                        >
                                                            <SelectTrigger className="w-32 h-7 text-xs bg-gray-50 text-gray-700 border border-purple-500 flex items-center justify-center font-medium rounded-md">
                                                                <SelectValue defaultValue={editingCallbackStatusValue} />
                                                            </SelectTrigger>
                                                            <SelectContent className="border border-purple-500 bg-white shadow-lg rounded-b-md [&_svg]:hidden [&_[data-radix-select-item-indicator]]:hidden">
                                                                <SelectItem value="pending" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Pending</SelectItem>
                                                                <SelectItem value="contacted" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Contacted</SelectItem>
                                                                <SelectItem value="completed" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Completed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <button
                                                            onClick={() => handleCallbackStatusEditSave(request._id)}
                                                            className="ml-2 text-green-600 hover:text-green-800 text-sm transition-all duration-200"
                                                            title="Save status"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCallbackStatusEditCancel}
                                                            className="ml-2 text-red-600 hover:text-red-800 text-sm transition-all duration-200"
                                                            title="Cancel status edit"
                                                        >
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        onDoubleClick={() => handleCallbackStatusDoubleClick(request._id, request.status)}
                                                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                                                            request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            request.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                                                            request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {request.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <div className="max-w-xs truncate" title={request.message || 'No message'}>
                                                    <span className="text-sm text-gray-700">
                                                        {request.message || 'No message'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Demo Meetings Tab */}
            {activeTab === 'demo-meetings' && (
                <>
                    {demoLoading ? (
                        <DemoTableSkeleton />
                    ) : demoMeetings.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-white p-8 rounded-xl shadow-md">
                                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Demo Meeting Requests</h3>
                                <p className="text-gray-600">No demo meeting requests found.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md overflow-x-auto mt-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Demo Meeting Requests ({demoMeetings.length})</h2>
                            </div>
                            <table className="min-w-full text-left text-xs sm:text-sm">
                                <thead className="sticky top-0 bg-white">
                                    <tr className="h-14 align-middle">
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Name</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Email</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Requested Date</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Requested Time</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Status</th>
                                        <th className="px-4 py-2 font-semibold text-black text-left w-1/6 h-14 align-middle">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demoMeetings.map((meeting) => (
                                        <tr key={meeting._id} className="hover:bg-gray-50 group">
                                            <td className="px-4 py-3 w-1/6">
                                                <span className="font-medium">{meeting.name}</span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <span>{meeting.email}</span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <span className="font-mono">
                                                    {new Date(meeting.requestedDate).toLocaleDateString()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <span className="font-mono">
                                                    {meeting.requestedTime.hour}:{meeting.requestedTime.minute}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                {editingDemoStatus === meeting._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={editingDemoStatusValue}
                                                            onValueChange={(value) => setEditingDemoStatusValue(value)}
                                                        >
                                                            <SelectTrigger className="w-32 h-7 text-xs bg-gray-50 text-gray-700 border border-purple-500 flex items-center justify-center font-medium rounded-md">
                                                                <SelectValue defaultValue={editingDemoStatusValue} />
                                                            </SelectTrigger>
                                                            <SelectContent className="border border-purple-500 bg-white shadow-lg rounded-b-md [&_svg]:hidden [&_[data-radix-select-item-indicator]]:hidden">
                                                                <SelectItem value="pending" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Pending</SelectItem>
                                                                <SelectItem value="confirmed" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Confirmed</SelectItem>
                                                                <SelectItem value="completed" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Completed</SelectItem>
                                                                <SelectItem value="rescheduled" className="cursor-pointer text-sm font-medium hover:bg-purple-50 data-[state=checked]:bg-purple-100 data-[state=checked]:text-purple-800 data-[state=checked]:font-semibold">Rescheduled</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <button
                                                            onClick={() => handleDemoStatusEditSave(meeting._id)}
                                                            className="ml-2 text-green-600 hover:text-green-800 text-sm transition-all duration-200"
                                                            title="Save status"
                                                        >
                                                            <Save className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleDemoStatusEditCancel}
                                                            className="ml-2 text-red-600 hover:text-red-800 text-sm transition-all duration-200"
                                                            title="Cancel status edit"
                                                        >
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span
                                                        onDoubleClick={() => handleDemoStatusDoubleClick(meeting._id, meeting.status)}
                                                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                                                            meeting.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            meeting.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                                            meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            meeting.status === 'rescheduled' ? 'bg-orange-100 text-orange-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        }`}
                                                    >
                                                        {meeting.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 w-1/6">
                                                <div className="max-w-xs truncate" title={meeting.message || 'No message'}>
                                                    <span className="text-sm text-gray-700">
                                                        {meeting.message || 'No message'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Ticket Details Dialog */}
            {showTicketDetails && (
                <>
                    <div className="fixed top-0 left-0 right-0 bottom-0 w-full h-full bg-black/40 backdrop-blur-sm z-[9999] pointer-events-none"></div>
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2">
                        <div className="min-w-[0] max-w-[85vw] w-full sm:w-[800px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-0">
                            {/* Purple header strip above modal */}
                            <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
                                <div className="flex-1 flex items-center justify-center">
                                    <span className="text-sm sm:text-lg font-bold text-center flex items-center gap-2">
                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                        Ticket Details
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowTicketDetails(false)}
                                    className="absolute right-2 sm:right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-1.5 sm:p-2 rounded-full shadow"
                                    aria-label="Close"
                                >
                                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </div>
                            
                            <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-3 sm:p-6 flex flex-col pointer-events-auto max-h-[85vh] sm:max-h-[80vh] overflow-y-auto">
                                {selectedTicket ? (
                                    <div className="space-y-4 sm:space-y-6">
                                        {/* Ticket Header with Status */}
                                        <div className="text-center pb-4 border-b border-gray-200">
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                {selectedTicket.status || 'Open'}
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                                                {selectedTicket.category || 'Support Ticket'}
                                            </h2>
                                            <p className="text-gray-500 text-sm">
                                                Created {formatDate(selectedTicket.createdAt).date} at {formatDate(selectedTicket.createdAt).time}
                                            </p>
                                        </div>

                                        {/* Ticket Information Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Basic Information</h3>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">Ticket ID:</span>
                                                            <span className="text-gray-900 font-mono">{selectedTicket._id}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">User:</span>
                                                            <span className="text-gray-900">{selectedTicket.userId?.email || selectedTicket.userId?.landlordInfo?.landlordName || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">Company:</span>
                                                            <span className="text-gray-900">{selectedTicket.companyId?.name || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">Category:</span>
                                                            <span className="text-gray-900">{selectedTicket.category || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">Status:</span>
                                                            <span className="text-gray-900">{selectedTicket.status || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium text-gray-600">Created:</span>
                                                            <span className="text-gray-900">{formatDate(selectedTicket.createdAt).date} at {formatDate(selectedTicket.createdAt).time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right Column */}
                                            <div className="space-y-4">
                                                {/* Query Content */}
                                                <div className="bg-white border border-gray-200 rounded-xl p-4 h-full">
                                                    <h3 className="font-semibold text-gray-900 mb-3 text-lg">Query</h3>
                                                    <div className="bg-gray-50 rounded-lg p-3 h-[calc(100%-3rem)] overflow-y-auto">
                                                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                            {selectedTicket.message || selectedTicket.description || 'No query content available.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Attachments - Full Width */}
                                        {selectedTicket.attachments && selectedTicket.attachments.length > 0 ? (
                                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Attachments ({selectedTicket.attachments.length})</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {selectedTicket.attachments.map((attachment, index) => (
                                                        <div key={index} className={`p-3 bg-gray-50 rounded-lg border border-gray-200 ${selectedTicket.attachments.length === 1 ? 'col-span-1 sm:col-span-2' : ''}`}>
                                                            <div className="flex items-center gap-3 mb-2">
                                                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                                        {attachment.originalName || attachment.filename || `File ${index + 1}`}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {attachment.fileSize ? `${(attachment.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <a
                                                                href={attachment.url || attachment.filePath}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors text-center block"
                                                            >
                                                                View File
                                                            </a>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white border border-gray-200 rounded-xl p-4">
                                                <h3 className="font-semibold text-gray-900 mb-3 text-lg">Attachments</h3>
                                                <p className="text-gray-500 text-sm">No attachments found.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>No ticket selected.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Chat Screen */}
            {isChatOpen && chatTicketInfo && (
                <AdminChatScreen
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    ticketInfo={chatTicketInfo}
                />
            )}
        </div>
    );
};

export default SupportTicketManagementSection;
