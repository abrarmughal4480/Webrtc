import React, { useState } from 'react'
import { Button } from '../ui/button'
import { Send, Loader2 } from 'lucide-react'
import { useUser } from '@/provider/UserProvider'
import { toast } from 'sonner'
import { sendFriendLinkRequest } from '@/http/authHttp'

const SendFriendSectionComponent = () => {
    const { user, isAuth } = useUser();
    const [fromName, setFromName] = useState('');
    const [friendEmail, setFriendEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendToFriend = async (e) => {
        e.preventDefault();
        
        if (!isAuth) {
            toast("Please Login First", {
                description: "You need to be logged in to send links to friends"
            });
            return;
        }

        if (!fromName || !friendEmail || !message) {
            toast("All fields required", {
                description: "Please fill in all fields"
            });
            return;
        }

        setIsLoading(true);
        
        try {
            // Auto-detect current website URL
            const currentUrl = `${window.location.protocol}//${window.location.host}`;
            
            const res = await sendFriendLinkRequest({
                fromName,
                fromEmail: user.email,
                toEmail: friendEmail,
                message,
                websiteLink: currentUrl
            });

            toast("Link Sent Successfully", {
                description: `Video link has been sent to ${friendEmail}`
            });
            setFromName('');
            setFriendEmail('');
            setMessage('');
        } catch (error) {
            toast("Failed to Send Link", {
                description: error?.response?.data?.message || error.message || "Please try again later"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className='py-6 md:py-8 px-4 md:px-10'>
            <div className="mx-auto bg-amber-400 rounded-xl shadow-md p-4 md:p-8 relative overflow-hidden">
                <h3 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-white text-center md:text-left">Send a link to a friend or co-worker</h3>

                <form onSubmit={handleSendToFriend} className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 w-full">
                        <input
                            type="text"
                            placeholder="From: Enter your name"
                            className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white border-none text-sm md:text-base"
                            value={fromName}
                            onChange={(e) => setFromName(e.target.value)}
                            required
                            suppressHydrationWarning={true}
                        />
                    </div>

                    <div className="flex-1 w-full">
                        <input
                            type="email"
                            placeholder="Enter email for friend or co-worker..."
                            className="w-full px-3 md:px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white border-none text-sm md:text-base"
                            value={friendEmail}
                            onChange={(e) => setFriendEmail(e.target.value)}
                            required
                            suppressHydrationWarning={true}
                        />
                    </div>

                    <div className="flex-1 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white border-none flex items-center">
                        <textarea
                            placeholder="Enter your message..."
                            className="w-full px-3 md:px-4 py-2 border-none outline-none flex-1 bg-white rounded-md resize-none text-sm md:text-base"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={2}
                            required
                            suppressHydrationWarning={true}
                        />
                    </div>

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-md h-[auto] w-full md:w-[auto] p-2 md:p-[0.30rem] md:mr-1 text-sm md:text-lg cursor-pointer flex items-center gap-1 md:gap-1 justify-center transition-colors"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className='font-medium'>Sending...</span>
                            </>
                        ) : (
                            <>
                                <span className='font-medium'>Send</span>
                                <img src='/icons/send-solid.svg' className='w-6 h-6 md:w-8 md:h-8'/>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </section>
    )
}

export default SendFriendSectionComponent
