# WebRTC Share - Real-time Video Collaboration Platform

## Features

### 👆 Real-time Pointer Tracking
The platform now includes real-time pointer tracking (mouse and touch) between admin and user in video sessions. This feature allows both parties to see each other's pointer actions in real-time.

#### How it works:
1. **Admin-Only Control**: Only admin can send pointer events to guide users
2. **Immediate Response**: No delay - indicator appears instantly on click/touch
3. **Live Tracking**: While holding, the indicator follows the pointer movement in real-time
4. **Real-time Sync**: All pointer events are sent via WebSocket to the user in real-time
5. **Visual Indicators**: 
   - **Red circle**: Appears immediately when admin clicks/touches
   - **Blue circle with green dot**: Shows during live tracking movement
   - **Immediate Hide**: Indicator disappears as soon as the pointer is released
   - **Smooth transitions**: All movements are animated for better user experience

#### Controls:
- **Admin-Only**: Pointer tracking is automatically enabled for admin users
- **Immediate Response**: No delay or hold required - instant indicator
- **Performance**: Optimized to only send events when needed

#### Use Cases:
- **Remote Support**: Admin can guide users by showing exactly where to click
- **Collaborative Work**: Both parties can see what the other is pointing at
- **Training Sessions**: Perfect for remote training and demonstrations
- **Technical Support**: Support staff can visually guide users through processes

#### Technical Details:
- Uses WebSocket for real-time communication
- Pointer coordinates are normalized to percentage values for cross-device compatibility
- Supports both mouse (desktop) and touch (mobile) events
- Works with both desktop and mobile devices
- Automatically adjusts for different screen resolutions

## Installation

```bash
npm install
```

## Usage

1. Start the backend server
2. Run the frontend application
3. Join a room as admin to control pointer tracking
4. Pointer tracking is automatically enabled for admin
5. Click/touch anywhere to show the indicator instantly

## Configuration

Pointer tracking is automatically enabled for admin users only and cannot be disabled.

