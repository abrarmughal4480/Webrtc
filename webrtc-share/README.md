# WebRTC Share - Real-time Video Collaboration Platform

## Features

### 👆 Real-time Pointer Tracking
The platform now includes real-time pointer tracking (mouse and touch) between admin and user in video sessions. This feature allows both parties to see each other's pointer actions in real-time.

#### How it works:
1. **Pointer Hold Detection**: When a user or admin holds down the mouse button or touches the screen for 2 seconds, it triggers the indicator
2. **Live Tracking**: While holding, the indicator follows the pointer movement in real-time
3. **Real-time Sync**: All pointer events are sent via WebSocket to the other party in real-time
4. **Visual Indicators**: 
   - **Red circle**: Appears after 2 seconds of continuous pointer hold (static position)
   - **Blue circle with green dot**: Shows during live tracking movement
   - **Immediate Hide**: Indicator disappears as soon as the pointer is released
   - **Smooth transitions**: All movements are animated for better user experience

#### Controls:
- **Always Active**: Pointer tracking is automatically enabled when joining a room
- **Hold Duration**: 2-second hold required to show the indicator
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
3. Join a room as either admin or user
4. Pointer tracking is automatically enabled
5. Hold down mouse button or touch screen for 2 seconds to see the indicator

## Configuration

Pointer tracking is automatically enabled for all sessions and cannot be disabled.

