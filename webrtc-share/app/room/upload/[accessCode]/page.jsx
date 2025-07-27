"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { publicApi } from '@/http';
import { toast } from "sonner";
import Image from "next/image";
import { AlertTriangle, FileQuestion, Key, User, ImageIcon, Video, X, Printer } from "lucide-react";
import moment from "moment";
import { useRouter } from "next/navigation";
import { useUser } from '@/provider/UserProvider';

export default function ViewUploadPage() {
  const params = useParams();
  const accessCode = params?.accessCode;
  const router = useRouter();
  const { user } = useUser();
  
  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [allowed, setAllowed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valid = sessionStorage.getItem(`accessCodeValidated:${accessCode}`) === 'true';
      setAllowed(valid);
      setChecked(true);
      if (!valid) {
        router.replace('/');
        return;
      }
      
      // Only fetch data if access is allowed
      if (valid && accessCode) {
        setLoading(true);
        setError("");
        publicApi.get(`/api/v1/upload/${accessCode}`)
          .then(res => {
            setUpload(res.data?.data?.upload || null);
            setLoading(false);
            // Mark notification as sent when someone accesses the content
            if (res.data?.data?.upload && !notificationSent) {
              // Check if notification was already sent
              if (res.data?.data?.upload.notificationSent) {
                console.log('✅ Notification already sent for this upload');
                return;
              }
              
              // Check if current user is the creator (resident) of this upload
              const uploadData = res.data?.data?.upload;
              const isCreator = user?.role === 'resident' && 
                               user?.email === uploadData?.email;
              
              if (isCreator) {
                console.log('✅ Creator accessing own upload - skipping notification');
                return;
              }
              
              setNotificationSent(true);
              publicApi.post(`/api/v1/uploads/notification/mark-sent/${accessCode}`)
                .then(() => {
                  console.log('✅ Notification marked as sent for first access');
                })
                .catch(err => {
                  console.log('⚠️ Could not mark notification as sent:', err);
                  setNotificationSent(false); // Reset if failed
                });
            }
          })
          .catch(err => {
            setError(err.response?.data?.message || "Not found");
            setLoading(false);
          });
      }
    }
  }, [accessCode, router, notificationSent]);

  // Early returns after all hooks
  if (!checked) return null;
  if (!allowed) return null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Loading details...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <AlertTriangle className="text-red-500 w-16 h-16 mx-auto mb-4" />
        <p className="text-xl text-red-600 font-semibold">{error}</p>
      </div>
    </div>
  );

  if (!upload) return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
        <FileQuestion className="text-gray-400 w-16 h-16 mx-auto mb-4" />
        <p className="text-xl text-gray-600">No data found</p>
      </div>
    </div>
  );

  // Print handler for upload details
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6 relative">
        {/* Header with Close Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center w-full">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Upload Details</h1>
            <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto rounded-full"></div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full border border-blue-500 transition-all duration-200 hover:scale-105 shadow-md"
              title="Print this page"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.back()}
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-200 z-20 border-2 border-white focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close details"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Personal Information Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white mr-3">
              <User className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Customer Information</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <span className="text-gray-500 font-medium w-20">Name:</span>
                <span className="text-gray-800 font-semibold">{upload.first_name} {upload.last_name}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium w-20">Phone:</span>
                <span className="text-gray-800">{upload.phoneNumber}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium w-20">Email:</span>
                <span className="text-gray-800">{upload.email}</span>
              </div>
              {/* Created Date */}
              <div className="flex items-center">
                <span className="text-gray-500 font-medium w-20">Created:</span>
                <span className="text-gray-800">{upload.createdAt ? moment(upload.createdAt).format('D MMMM YYYY, h:mm a') : '-'}</span>
              </div>
            </div>
            <div>
              <div className="flex items-start mb-3">
                <span className="text-gray-500 font-medium w-20 mt-1">Address:</span>
                <div className="text-gray-800 leading-relaxed">
                  {upload.house_name_number}, {upload.flat_apartment_room}, {upload.street_road}, {upload.city}, {upload.country}
                </div>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 font-medium w-20">Postcode:</span>
                <span className="inline-block bg-blue-100 text-blue-800 text-lg font-bold px-3 py-1 rounded-lg">
                  {upload.actualPostCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white mr-3">
              <ImageIcon className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Images/Photos</h2>
            {upload.images?.length > 0 && (
              <span className="ml-auto bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full">
                {upload.images.length} image{upload.images.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {upload.images && upload.images.length > 0 ? (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {upload.images.map((img, index) => (
                <div key={img.url} className="w-[140px] sm:w-[180px] md:w-[200px] flex-shrink-0">
                  <div className="w-full h-[100px] sm:h-[140px] md:h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                    {!imageErrors[img.url] ? (
                      <Image
                        src={img.url}
                        alt={img.label || 'Upload image'}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover rounded-3xl cursor-pointer"
                        onClick={() => setSelectedMedia({type: 'image', ...img})}
                        onError={() => setImageErrors(prev => ({ ...prev, [img.url]: true }))}
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 rounded-3xl">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute top-2 md:top-3 left-2 md:left-3 bg-white/90 backdrop-blur-sm rounded-full px-2 md:px-3 py-0.5 md:py-1">
                      <span className="text-xs font-semibold text-gray-700">#{index + 1}</span>
                    </div>
                    <div className="absolute top-2 md:top-3 right-2 md:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={() => setSelectedMedia({type: 'image', ...img})}
                        className="p-1.5 md:p-2 bg-black/20 backdrop-blur-sm hover:bg-black/40 rounded-full text-white transition-all duration-200 hover:scale-110"
                      >
                        <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 md:mt-3 text-center px-2">
                    <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{img.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-gray-400">
              <ImageIcon className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">No images uploaded</p>
            </div>
          )}
        </div>

        {/* Videos Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-red-400 to-orange-500 rounded-full flex items-center justify-center text-white mr-3">
              <Video className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Videos</h2>
            {upload.videos?.length > 0 && (
              <span className="ml-auto bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
                {upload.videos.length} video{upload.videos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          {upload.videos && upload.videos.length > 0 ? (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {upload.videos.map((vid, index) => (
                <div key={vid.url} className="w-[180px] sm:w-[200px] md:w-[280px] flex-shrink-0">
                  <div className="w-full h-[140px] sm:h-[200px] bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl overflow-hidden relative shadow-lg hover:shadow-xl transition-all duration-300 group">
                    <video
                      src={vid.url}
                      controls
                      className="w-full h-full object-cover rounded-3xl"
                      preload="metadata"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.querySelector('.fallback-video').style.display = 'flex';
                      }}
                    />
                    <div className="fallback-video absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400 hidden rounded-3xl">
                      <Video className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="mt-2 md:mt-3 text-center px-2">
                    <div className="text-sm font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-md">{vid.label}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-gray-400">
              <Video className="w-16 h-16 mx-auto mb-4" />
              <p className="text-lg">No videos uploaded</p>
            </div>
          )}
        </div>
      </div>

      {/* Media Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="max-w-4xl max-h-full relative">
            <button 
              onClick={e => { e.stopPropagation(); setSelectedMedia(null); }}
              className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 hover:bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-200 z-10 border-2 border-white focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
            {selectedMedia.type === 'image' ? (
              <img 
                src={selectedMedia.url} 
                alt={selectedMedia.label}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ backgroundColor: 'transparent' }}
              />
            ) : (
              <video 
                src={selectedMedia.url}
                controls
                className="max-w-full max-h-full rounded-lg"
                autoPlay
              />
            )}
            <div className="text-white text-center mt-4">
              <div className="font-semibold text-lg">{selectedMedia.label}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}