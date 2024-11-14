# video-chat-app - Frontend
=======

This is the frontend for the app, providing a responsive user interface for real-time video and audio communication. Built with React, Next.js, and Tailwind CSS, the app includes user authentication, session management, and signaling for WebRTC.

## Table of Contents

- [Project Setup](#project-setup)
- [How to Test](#how-to-test)
- [Deployment](#deployment)
- [Production Link](#production-link)

## Project Setup
1. Clone the Repository

```bash
git clone https://gitlab.com/homeproject2674842/hack-house.git
```
2. Install Dependencies
Open terminal and type:

```bash
npm install
```

3. Environment Configuration:
Create a .env file in root directory
Add the necessary environment variables:
```plaintext
API_URL=env.example
NEXT_PUBLIC_ICE_SERVERS_URL=env.example
NEXT_PUBLIC_WEBSOCKET_URL=env.example
```

4. Available Scripts
-- Start Development Server
Runs the app in development mode on http://localhost:3000

```bash
npm run dev
```

-- Build for Production
Builds the app for production to the build folder
```bash
npm run build
```

-- Run the Production Server
To test the build locally
```bash
npm run start
```

-- Run Linter
Lints the code for consistency and standards compliance.
```bash
npm run lint
```

## How to Test
To test the app's video call functionality
1. Open two different browsers and navigate to http://localhost:3000 in both.
2. Register and log in on both browsers.
3. In Browser 1:
    - Click Create Room to generate a room code
    - Copy the room code displayed on the screen
4. In Browser 2:
    - Click Join Room
    - Paste the room code from Browser 1 into the input field.
    - Click Join Room
5. Expected Result:
    - Both users should see each other's video feed
    - The left video player represents "You", and the right video player shows the other participant.

## Deployment
This project uses AWS Amplify to automate the deployment process. Once changes are pushed to the main branch on Gitlab, Amplify will build and deploy the frontend automatically.

## Production Link :
[Video Chat App](https://main.d2xkbos8gv8b9m.amplifyapp.com/)