# WebRTC Frontend

## Overview
This is the frontend for the WebRTC application, built with Next.js and React. It provides the user interface for meetings, authentication, and sharing features.

## Structure
- `app/`: Next.js app directory (routes, pages, layouts).
- `components/`: Reusable React components (dialogs, UI, layouts, sections, etc.).
- `hooks/`: Custom React hooks (WebRTC, mobile detection, etc.).
- `http/`: API request logic (auth, meetings, etc.).
- `lib/`: Utility functions for the frontend.
- `provider/`: React context providers (dialogs, user state, etc.).
- `public/`: Static assets (images, icons, etc.).
- `utils/`: Frontend utility functions (cookies, MongoDB ID validation, etc.).
- `package.json`: Frontend dependencies and scripts.
- `next.config.mjs`: Next.js configuration.
- `postcss.config.mjs`: PostCSS configuration for styling.
- `eslint.config.mjs`: ESLint configuration for code quality.
- `jsconfig.json`: JS/TS path aliases and config.

## Technologies
- Next.js (React framework)
- React (UI library)
- Socket.io-client (real-time communication)
- Axios or fetch (API requests)
- Tailwind CSS or similar (styling)
- Context API (state management)
- Custom hooks (WebRTC, device detection, etc.)

## Project Flow
1. User navigates to a page (e.g., dashboard, room, share).
2. Components render UI and use hooks for logic (e.g., WebRTC).
3. HTTP layer communicates with the backend for data.
4. Providers manage global state (user, dialogs).
5. Socket.io-client connects to backend for real-time features.

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
