# WebRTC Backend

## Overview
This is the backend server for the WebRTC application. It handles authentication, meetings, user management, and real-time communication services.

## Structure
- `index.js`: Main server entry point.
- `controllers/`: Request handling logic (authentication, meetings, user info, etc.).
- `routes/`: API endpoint definitions and routing.
- `middlewares/`: Express middleware (auth, error handling, async error catching).
- `models/`: Mongoose models for MongoDB (e.g., User, Meeting).
- `services/`: Business logic/services (mail, sockets, Twilio integration).
- `utils/`: Utility functions (OTP, email, error handling, token, etc.).
- `public/`: Static assets (SVGs, images, etc.).
- `package.json`: Node.js dependencies and scripts.

## Technologies
- Node.js, Express.js
- MongoDB, Mongoose
- JWT (authentication)
- Socket.io (real-time communication)
- Twilio (SMS/voice, if used)
- Nodemailer (email)
- dotenv (environment variables)

## Project Flow
1. User requests (e.g., login, join meeting) hit the Express server.
2. Routes direct requests to the appropriate controller.
3. Controllers use models to interact with MongoDB and services for business logic.
4. Middlewares handle authentication, errors, and async logic.
5. Socket.io enables real-time features (e.g., WebRTC signaling).
6. Responses are sent back to the frontend.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up a `.env` file with required environment variables (MongoDB URI, JWT secret, etc.).
3. Start the server:
   ```bash
   npm start
   ``` 