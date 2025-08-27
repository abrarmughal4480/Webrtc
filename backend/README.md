# Videodesk Backend (WebRTC + Upload + OTP)

### Overview
Express/MongoDB backend for Videodesk. Handles auth with OTP, meetings storage, high-quality media uploads to S3, share-code uploads, real‑time signaling via Socket.IO, emails (Nodemailer), and SMS (Twilio). Includes clustering, request timeouts, Redis stub, and cron cleanup.

### Tech Stack
- Node.js (Express 5), MongoDB (Mongoose)
- Socket.IO 4 (signaling + notifications)
- AWS S3 SDK v3 (multipart uploads), Nodemailer, Twilio
- JWT auth (HTTP‑only cookie), dotenv, pino logging, compression

### Directory Layout
- `index.js` server boot, CORS/cookies/compression, timeouts, clustering, socket initialization, cron
- `route.js` primary API router (v1)
- `controllers/` auth, meetings, uploads, chat history, demo/callback, room info
- `models/` `user.js`, `meetings.js`, `upload.js`, `chatHistory.js`
- `middlewares/` `auth.js`, `catchAsyncError.js`, `error.js`
- `services/` `socketService.js`, `mailService.js`, `twilloService.js`
- `utils/` database, error/response helpers, OTP, token helpers

### Getting Started
1) Install
```bash
npm install
```
2) Environment (.env)
See full list below. Minimum to start:
```bash
PORT=4000
DB_URL=mongodb://localhost:27017/videodesk
JWT_SECRET=replace_with_long_random
FRONTEND_URL=http://localhost:3000

# Email
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=apikey_or_user
MAIL_PASS=secret
MAIL_FROM="Videodesk <no-reply@videodesk.co.uk>"

# AWS S3
AWS_REGION=ap-southeast-2
S3_ACCESS_KEY=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=your-bucket

# Optional
REQUEST_TIMEOUT=60000
MAX_FILE_SIZE=100mb
ENABLE_CLUSTER=false
```
3) Run
```bash
npm run dev   # nodemon
npm start     # production
```

### Environment Variables (complete)
- Core: `PORT`, `NODE_ENV`, `DB_URL`, `JWT_SECRET`, `FRONTEND_URL`
- Email: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`, `FEEDBACK_EMAIL`, `SUPPORT_TICKET_EMAIL`, `DEMO_MEETING_EMAIL`, `CALLBACK_REQUEST_EMAIL`
- Twilio: `TWILLIO_ACCOUNT_SID`, `TWILLIO_AUTH_TOKEN`, `TWILLIO_PHONE_NUMBER`
- S3: `AWS_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_PART_SIZE`, `S3_QUEUE_SIZE`, `S3_MAX_RETRIES`, `S3_CONNECTION_TIMEOUT`, `S3_SOCKET_TIMEOUT`, `S3_USE_ACCELERATE`, `S3_STORAGE_CLASS`, `S3_ENABLE_DELETE`
- Performance: `REQUEST_TIMEOUT` (ms), `MAX_FILE_SIZE` (e.g., 100mb)
- Optional: `REDIS_URL`, `ENABLE_CLUSTER`

### Auth Flow (OTP + Cookie)
- `POST /api/v1/register` creates user and emails OTP
- `POST /api/v1/login` emails OTP for verification
- `POST /api/v1/verify` validates OTP, issues JWT cookie `token` (httpOnly, sameSite/secure depend on `NODE_ENV`)
- `GET /api/v1/me` fetches current user, `GET /api/v1/logout` clears cookie

### WebRTC Signaling (Socket.IO)
Socket events in `services/socketService.js`:
- Rooms: `join-room`, `admin-waiting`
- Presence: `user-opened-link`, `user-started-session`, `user-disconnected`
- Signaling: `offer`, `answer`, `ice-candidate`
- Updates: `meeting-data-available`, `message-settings-updated`
- Notifications (per user email): `join-notification-room`, `leave-notification-room`, server emits `new-notification`

### Meetings API (selected)
Base prefix: `/api/v1`
- `POST /meetings/create` create meeting and upload media (S3 multipart). If `meeting_id` exists, only new media added.
- `GET /meetings/all?archived|deleted` list user’s meetings (owner/userId/created_by)
- `POST /meetings/search` advanced search (name/address/ref/notes/date range/archived/deleted etc.)
- `GET /meetings/:id` get one (auth)
- `PUT /meetings/:id` update fields (auth)
- `DELETE /meetings/:id` soft delete (trash)
- `PUT /meetings/:id/archive` / `PUT /meetings/:id/unarchive`
- `PUT /meetings/restore/:id` restore from trash
- `DELETE /meetings/permanent/:id` hard-delete + S3 cleanup
- `GET /meetings/archived-count` stats
- `GET /meetings/by-meeting-id/:id` lookup by `meeting_id`
- `DELETE /meetings/:meetingId/recordings/:recordingId` delete one recording (S3 delete attempted)
- `DELETE /meetings/:meetingId/screenshots/:screenshotId` delete one screenshot
- Special Notes: `GET|POST /meetings/:meeting_id/special-notes`, Structured: `GET|PATCH /meetings/:meeting_id/structured-special-notes`
- Public share: `GET /meetings/share/:id`, record visitor: `POST /meetings/share/:id/access`

### Uploads (Share Code) API
- Sessioned uploads:
  - `POST /upload/session` start session and capture metadata
  - `POST /upload/file/:sessionId` send each image/video (base64 → S3)
  - `POST /upload/complete/:sessionId` store DB record and close session
  - `GET /upload/progress/:sessionId`
- Non-session bulk: `POST /upload` with arrays `images[]/videos[]`
- Public fetch: `GET /upload/:accessCode`
- Access logging: `POST /upload/:accessCode/access`
- My uploads: `GET /uploads/my`, latest `GET /uploads/my-latest`, trash `GET /uploads/trash`
- Delete/Restore/Permanent: `DELETE /uploads/:id`, `PUT /uploads/restore/:id`, `DELETE /uploads/permanent/:id`
- Notifications: `GET /uploads/notification/check`, `POST /uploads/notification/mark-sent/:accessCode`
- Search: `POST /uploads/search`
- Validation: `POST /validate-access-code` (access code + house + postcode)

### Chat History API
- `GET /chat/sessions` list
- `POST /chat/sessions` create/update by `sessionId`
- `GET /chat/sessions/:sessionId` get with messages
- `DELETE /chat/sessions/:sessionId`
- `PUT /chat/sessions/:sessionId/title`
- `PUT /chat/sessions/:sessionId/messages/:messageId/feedback`

### User/Settings API
- `PUT /user/update`, `PUT /user/change-password`, forgot/reset password
- Branding & redirects: `PUT /user/update-logo`, `PUT /user/update-landlord-info`
- Message settings: `PUT|GET /user/message-settings`
- Pagination settings: `PUT|GET /user/pagination-settings`
- Folders: `GET /folders`, `POST /folders`, `PUT /folders/:folderId`, `DELETE /folders/:folderId`, `PUT /folders/:folderId/trash`, `PUT /folders/:folderId/restore`, `POST /folders/assign-meeting`, `GET /folders/meeting-assignments`
- Misc: `POST /send-friend-link`, `POST /send-feedback`, `POST /raise-support-ticket`, `POST /request-callback`, `POST /book-demo-meeting`, `POST /request-demo`
- Token-based invite links: `GET /send-token`, `GET /resend-token`
- Room sender info: `GET /room-user-info?userId=<encrypted>`

### Data Models (high level)
- `User`: email, password(bcrypt), role, OTP, logo, landlordInfo, messageSettings, paginationSettings, folders, meetingFolders, reset tokens, login timestamps
- `Meeting`: identity, customer/contact/address fields, notes (structured/raw), arrays of recordings/screenshots with S3 keys and metadata, access history, archived/deleted flags, ownership (`owner|userId|created_by`), counters
- `Upload`: resident form fields, images/videos arrays with S3 keys, access history, counters, trash flags, notification flags
- `ChatHistory`: per user + `sessionId`, title/preview/messages array with feedback

### Operational Concerns
- CORS open (`origin: true`) with `credentials: true` for cookies
- Request/Response timeouts controlled by `REQUEST_TIMEOUT` (DELETE gets shorter)
- Max payload via `MAX_FILE_SIZE` (413 responses on exceed)
- Clustering: enable via `ENABLE_CLUSTER=true` (dev or explicit)
- Redis (optional): if `REDIS_URL` set, connected for future caching
- Cron: auto hard-delete meetings in trash older than 10 days (runs every minute)
- Graceful shutdown: closes HTTP and Redis on signals

### Emails & SMS
- `mailService.js` uses SMTP from env; HTML templates adapt logo/button colors
- `twilloService.js` sends SMS, includes region checks, trial/geo-permission guidance, and message personalization

### AWS S3 Strategy
- Multipart uploads (lib-storage Upload) with tuned `partSize`, `queueSize`, retry and HTTP/2
- Videos preserved as provided (webm/mp4), images as PNG/JPEG; stored under logical prefixes: `videodesk_recordings/`, `videodesk_screenshots/`, `upload_images/`, `upload_videos/`, etc.
- Delete uses `DeleteObjectCommand` with retry and safe fallbacks when permissions are restricted

### Local Development Tips
- Ensure `FRONTEND_URL` matches the Next.js origin (for cookies), set CORS accordingly
- If using HTTPS locally, set cookies `sameSite: none` and `secure: true` (already handled by env)
- If uploads are large, adjust `MAX_FILE_SIZE`, `S3_PART_SIZE`, `S3_QUEUE_SIZE`, `REQUEST_TIMEOUT`
