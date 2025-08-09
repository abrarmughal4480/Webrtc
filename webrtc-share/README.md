# Videodesk Frontend (Next.js)

### Overview
Next.js app for Videodesk: dashboard, room join/admin, uploads (share code), public share pages, OTP auth, and real‑time features. Includes a high‑quality WebRTC hook optimized for mobile and desktop cameras, feedback flow with tailored redirect, and client APIs to the backend.

### Requirements
- Node 18+
- Backend running at `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`)

### Setup
1) Install
```bash
npm install
```
2) Environment (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```
3) Run
```bash
npm run dev
```

### Project Structure
- `app/` App Router pages:
  - `/` marketing + feedback dialog
  - `/dashboard` main app (requires cookie auth)
  - `/room/[id]` visitor join, `/room/admin/[id]` admin side
  - `/share/[id]` public meeting share
  - `/reset-password/[token]`
  - `api/proxy/route.js` simple proxy for remote images
- `components/` UI, dialogs, sections, layout
- `hooks/` `useWebRTC.js` (signaling + capture/record), utilities
- `http/` axios clients and API methods to backend (`authHttp`, `meetingHttp`, `uploadHttp`, `chatHttp`)
- `provider/` `UserProvider` (load current user), `DilogsProvider`
- `lib/`, `utils/` helpers

### Environment Variables
- `NEXT_PUBLIC_API_URL` base URL used by axios clients (e.g., `http://localhost:4000`)
- `NEXT_PUBLIC_BACKEND_URL` used by WebRTC socket initialization; if not set, derived from API URL

### WebRTC Flow (useWebRTC)
- Signaling via Socket.IO to backend. Events: `offer`, `answer`, `ice-candidate`, `user-disconnected`
- ICE config uses multiple Google STUNs and a TURN relay
- Admin initiates dummy outbound track; resident captures camera (video-only)
- Screenshots: canvas capture with duplicate prevention (hash), debounce, and metadata
- Recordings: MediaRecorder with high bitrates and supported mime selection
- End call redirects to feedback with optional tailored URL

### Key Pages and UX
- Home `/` shows sections, chatbot, enter‑share‑code dialog opener (via URL params), and feedback modal when `?show-feedback=true` is present. If `redirectUrl` is present, user auto-redirected after rating or countdown.
- Room `/room/[id]` integrates WebRTC hook. Admin variant listens/starts offer.
- Dashboard `/dashboard` interacts with meetings/uploads via `http/*`.

### API Clients (summary)
- Auth: login/register/verify OTP, load me, logout, password reset, settings, feedback/support/demo/callback
- Meetings: CRUD, search, archive/unarchive, special notes (raw/structured), share, visitor logging
- Uploads: sessioned uploads to S3 via backend, list/search/trash/restore/permanent, access logging and notifications, validate access codes
- Chat history: save/update/get/delete sessions and message feedback

### Images Configuration
`next.config.mjs` allows remote images from S3 bucket. Add your bucket hostname under `images.remotePatterns` if different.

### Cookies & Auth
Backend sets `token` cookie (httpOnly). Ensure frontend origin matches backend CORS and cookies. For cross‑site, use HTTPS + `sameSite: none`.

### Build & Deploy
```bash
npm run build
npm start
```
Deploy on Vercel or any Node host. Set `NEXT_PUBLIC_API_URL` to your backend URL and allow that origin in backend CORS.

