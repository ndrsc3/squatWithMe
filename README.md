# 🏋️‍♂️ Squat With Me

A real-time web application for group accountability in daily squats. Built with vanilla JavaScript and WebSocket for live updates.

![Squat With Me Screenshot](screenshot.png)

## 🌟 Features

- **Daily Squat Tracking**: Record your daily squats with one click
- **Real-time Updates**: See when others complete their squats instantly
- **Streak Tracking**: Maintain and view your current streak
- **Leaderboard**: Compare progress with other participants
- **Offline Support**: Record squats even when offline
- **Responsive Design**: Works seamlessly on mobile and desktop

## 🛠️ Technology Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Node.js with WebSocket
- **Deployment**: Vercel
- **Database**: JSON file-based storage
- **Real-time**: WebSocket for live updates

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm/yarn
- Vercel CLI (optional, for deployment)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/ndrsc3/squatWithMe.git
cd squatWithMe
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
vercel dev
```

4. Visit http://localhost:3000 in your browser

### Deployment

The app is configured for easy deployment on Vercel:

```bash
vercel
```

## 🔍 Code Structure

```
├── api/                # Backend API endpoints
│   ├── check-username.js
│   ├── get-users.js
│   ├── record-squat.js
│   ├── save-user.js
│   └── ws.js          # WebSocket handler
├── app.js             # Main application logic
├── styles.css         # Global styles
└── index.html         # Entry point
```

## 🎯 Key Features Explained

### Real-time Updates
The application uses WebSocket connections to provide instant updates when any user completes their daily squat. This creates a sense of community and motivation among users.

### Streak Tracking
The app maintains streak counts for each user, encouraging consistent daily participation. A fire emoji (🔥) appears next to active streaks, adding a fun visual element.

### Offline Support
Built with offline-first functionality, the app stores squat records locally when offline and syncs them when connection is restored.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

Your Name
- Twitter: [@ndrsc3](https://twitter.com/ndrsc3)
- GitHub: [@ndrsc3](https://github.com/ndrsc3)

## 🙏 Acknowledgments

- Inspired by the #75Hard challenge
- Thanks to all contributors and early adopters
- Built during my journey to maintain a daily squat habit

## 📈 Future Plans

- [ ] Add user profiles with progress graphs
- [ ] Implement incentivization (Smart Contract Integration)
- [ ] Add Share Button

---
Made with ❤️ for the squat community