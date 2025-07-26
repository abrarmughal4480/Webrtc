import React, { useState, useEffect } from "react";
import { validateAccessCode } from "../http/uploadHttp";
import { useRouter } from "next/navigation";

export default function EnterShareCodeDialog({ open, setOpen, onSubmit }) {
  const [form, setForm] = useState({ code: '', house: '', postcode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setForm({ code: '', house: '', postcode: '' });
      setError("");
      setLoading(false);
    }
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await validateAccessCode(form);
      if (res.data.valid && res.data.accessCode) {
        // Set session flag
        sessionStorage.setItem(`accessCodeValidated:${res.data.accessCode}`, "true");
        setOpen(false);
        router.push(`/room/upload/${res.data.accessCode}`);
      } else {
        setError("Invalid details. Please check and try again.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid details. Please check and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] pointer-events-none"></div>
      <div className="fixed inset-0 z-[200] flex items-center justify-center">
        <div className="min-w-[0] max-w-[95vw] w-full sm:w-[400px] bg-white rounded-2xl shadow-2xl pointer-events-auto flex flex-col mx-2 sm:mx-0">
          {/* Purple header strip above modal */}
          <div className="flex items-center justify-center bg-purple-500 text-white p-3 sm:p-4 m-0 rounded-t-2xl relative">
            <div className="flex-1 flex items-center justify-center">
              <span className="text-base sm:text-lg font-bold text-center">Enter Share Code</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 bg-purple-500 hover:bg-purple-700 text-white transition p-2 rounded-full shadow"
              aria-label="Close"
            >
              <span style={{fontWeight: 'bold', fontSize: 20}}>×</span>
            </button>
          </div>
          <div className="w-full bg-white rounded-b-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 flex flex-col items-center gap-3 pointer-events-auto">
            <form className="space-y-4 w-full" onSubmit={handleSubmit}>
              <div>
                <label className="text-xs font-semibold text-gray-600 ml-1">Share Code<br /></label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="Enter Share Code"
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-1/2">
                  <label className="text-xs font-semibold text-gray-600 ml-1">House/Flat number<br /></label>
                  <input
                    type="text"
                    className="w-full max-w-[180px] sm:max-w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    value={form.house}
                    onChange={e => setForm(f => ({ ...f, house: e.target.value }))}
                    placeholder="House/ Flat Number"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="w-full sm:w-1/2">
                  <label className="text-xs font-semibold text-gray-600 ml-1">Postcode<br /></label>
                  <input
                    type="text"
                    className="w-full max-w-[180px] sm:max-w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    value={form.postcode}
                    onChange={e => setForm(f => ({ ...f, postcode: e.target.value }))}
                    placeholder="Enter postcode"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              {error && <div className="text-red-600 text-xs font-semibold text-center">{error}</div>}
              <button 
                type="submit" 
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-full transition-all w-full disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
} 