# Squat With Me - Web Application Specification

## Overview
Squat With Me is a social fitness web application that encourages users to perform 100 squats daily. The app promotes accountability and community support through a shared commitment to fitness.

## Core Features

### User Management
- Anonymous authentication using device fingerprinting
- Username-based account system
- Account recovery system with security questions
- JWT-based authentication with refresh token mechanism

### Squat Tracking
- Daily squat logging (one entry per day)
- Streak tracking for consecutive days of squats
- Real-time updates of user activities
- Visual grid display showing all users' squat history

### Social Features
- Community dashboard showing all participants
- Real-time user count of daily participants
- Streak leaderboard
- Community statistics

### UI/UX
- Responsive design for mobile and desktop
- Dark/light theme toggle
- Modern, clean interface
- Motivational messaging throughout the app

## Technical Requirements

### Frontend
- Pure JavaScript (Vanilla JS) for client-side logic
- CSS for styling with CSS Grid for layout
- Local storage for auth tokens and preferences

### Backend
- Vercel serverless functions for API endpoints
- WebSocket server for real-time updates
- KV storage for data persistence
- JWT-based authentication system

### API Endpoints
1. Authentication
   - `/api/auth/verify` - Verify JWT token
   - `/api/auth/refresh` - Refresh access token
   - `/api/check-username` - Check username availability

2. Core Functionality
   - `/api/record-squat` - Record daily squat
   - `/api/ws` - WebSocket endpoint for real-time updates

3. Admin
   - `/api/admin/auth` - Admin authentication
   - `/api/admin/cleanup` - Data maintenance

### Data Models

#### User
```json
{
  "userId": "string",
  "username": "string",
  "deviceId": "string",
  "recoveryAnswer": "string (hashed)",
  "createdAt": "timestamp"
}
```

#### Squat Record
```json
{
  "userId": "string",
  "date": "YYYY-MM-DD",
  "timestamp": "number"
}
```

#### Stats
```json
{
  "activeUsers": "number",
  "totalSquats": "number",
  "longestStreak": "number",
  "streakHolder": "string"
}
```

## Security Requirements
- Secure password-less authentication
- Device fingerprinting for anonymous users
- JWT token rotation
- Rate limiting on API endpoints
- XSS protection
- CORS configuration

## Performance Requirements
- Initial page load under 2 seconds
- Real-time updates with < 1 second latency
- Optimized for mobile devices
- Graceful degradation when offline

## Deployment
- Vercel hosting
- Environment-based configuration
- Automated deployments
- Development and production environments

## Development Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run WebSocket server
npm run ws

# Run both servers concurrently
npm run dev:all
```

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers
- Progressive enhancement for older browsers

## Future Enhancements
- Social authentication (Google, GitHub)
- Custom squat goals
- Achievement system
- Mobile app version
- Exercise variation tracking
- Social sharing features 