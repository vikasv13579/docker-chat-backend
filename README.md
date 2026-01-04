# Doctor-Chat Application

A real-time chat application connecting patients with doctors, featuring user authentication, patient onboarding, and live messaging capabilities.

## 🏥 Overview

Doctor-Chat is a Node.js-based web application that enables seamless communication between patients and healthcare providers. The platform includes user registration, multi-step patient onboarding, doctor assignment, and real-time chat functionality powered by Socket.io.

## ✨ Features

- **User Authentication**: Secure registration and login system with JWT tokens
- **Role-Based Access**: Separate interfaces for patients and doctors
- **Patient Onboarding**: Multi-step form to collect patient information
- **Real-Time Chat**: Live messaging between patients and assigned doctors
- **Room Management**: Automatic creation and management of patient-doctor chat rooms
- **Message History**: Persistent storage of all conversations
- **Online Status**: Real-time user presence indicators
- **Unread Messages**: Track unread message counts per conversation

## 🛠️ Tech Stack

- **Backend**: Node.js with Express.js
- **Real-Time**: Socket.io for WebSocket connections
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (JSON Web Tokens) with bcryptjs
- **Environment**: dotenv for configuration management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher recommended)
- **npm** (comes with Node.js)
- **Supabase Account** (for database hosting)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/vikasv13579/docker-chat-backend.git
cd docker-chat-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables for immediate access:

```env
# Supabase Configuration
SUPABASE_URL=https://uelkiwdjebqbnvzzfxdu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbGtpd2RqZWJxYm52enpmeGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0OTE1MTYsImV4cCI6MjA4MzA2NzUxNn0.m_0IEIkm8tBtyCyK9Xsmnr9Ql6BV8y0TCgKW-CuU9B4

# JWT Secret
JWT_SECRET=c3441493d018798ba54b4b56afb12e0ab4bd31f8c49642534128bc9da00cae517662e2be2288ada0f6b8bba802c42ff0785c48e185b55c04ae31849288a6080a

# Server Configuration
PORT=3000
NODE_ENV=development
```

> [!NOTE]
> These credentials are provided for **demonstration purposes** only. Anyone who clones this project can use these keys to run the application instantly without setting up their own Supabase project. For production use, please replace these with your own secure credentials.

### 4. Set Up the Database

1. Log in to your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to the SQL Editor
3. Copy the contents of `schema.sql` from this repository
4. Paste and execute the SQL script in the Supabase SQL Editor

This will create:
- `users` table (for patients and doctors)
- `onboarding_forms` table (for patient information)
- `rooms` table (for chat rooms)
- `messages` table (for chat messages)
- Three seed doctor accounts for testing

### 5. Run the Application

**Development Mode:**
```bash
npm start
```

The server will start on `http://localhost:3000` (or the PORT specified in your `.env` file).

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## 📁 Project Structure

```
docker-chat-backend/
├── public/              # Static frontend files
├── src/
│   ├── controllers/     # Route handlers
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── doctorController.js
│   │   └── onboardingController.js
│   ├── middleware/      # Authentication middleware
│   │   └── auth.js
│   ├── db.js           # Supabase client configuration
│   ├── routes.js       # API route definitions
│   └── socket.js       # Socket.io event handlers
├── index.js            # Application entry point
├── schema.sql          # Database schema
├── .env                # Environment variables (not in git)
├── .gitignore
└── package.json
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user (patient or doctor)
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user information (requires auth)

### Onboarding
- `POST /api/onboarding/draft` - Save onboarding form draft (requires auth)
- `GET /api/onboarding/status` - Get onboarding status (requires auth)
- `POST /api/onboarding/submit` - Submit completed onboarding form (requires auth)

### Chat
- `GET /api/chat/rooms` - Get all chat rooms for current user (requires auth)
- `GET /api/chat/rooms/:roomId/messages` - Get message history for a room (requires auth)
- `POST /api/chat/rooms` - Create a new chat room (requires auth)

### Doctors
- `GET /api/doctors` - List all available doctors (requires auth)

## 🔌 Socket.io Events

### Client → Server
- `join_room` - Join a specific chat room
- `send_message` - Send a message to a room
- `mark_as_read` - Mark messages as read

### Server → Client
- `new_message` - Receive a new message
- `user_online` - User came online
- `user_offline` - User went offline
- `message_read` - Message was marked as read

## 🧪 Testing

You can use the included `test-api.js` file to test the API endpoints:

```bash
node test-api.js
```

### Default Test Credentials

**Doctors** (seeded in database):
- Email: `dr.house@example.com` | Password: `password123`
- Email: `dr.grey@example.com` | Password: `password123`
- Email: `dr.strange@example.com` | Password: `password123`

**Patients**: Register through the application

## 🚢 Deployment

### Deploy to Render

This project includes a `render.yaml` configuration file for easy deployment to Render:

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new Web Service on [Render](https://render.com)
3. Connect your repository
4. Render will automatically detect the `render.yaml` file
5. Add your environment variables in the Render dashboard
6. Deploy!

### Environment Variables on Render

Make sure to set these environment variables in your Render dashboard:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Use strong, unique values for `JWT_SECRET`
- Keep your Supabase service role key confidential
- In production, configure CORS to only allow your frontend domain
- Use HTTPS in production environments

## 🐛 Troubleshooting

### Port Already in Use
If you see an error about the port being in use:
```bash
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Database Connection Issues
- Verify your Supabase credentials in `.env`
- Check that your IP is allowed in Supabase settings
- Ensure the database schema has been properly initialized

### Socket.io Connection Errors
- Check that CORS is properly configured
- Verify the Socket.io client is connecting to the correct URL
- Check browser console for connection errors

## 📝 License

ISC

## 👥 Support

For issues and questions, please open an issue in the repository.

---

Built with ❤️ for better patient-doctor communication
