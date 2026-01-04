# Technical Decisions & Architecture

This document outlines the key technical decisions made during the development of the Doctor-Chat application and the reasoning behind them.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Technology Choices](#technology-choices)
- [Database Design](#database-design)
- [Authentication Strategy](#authentication-strategy)
- [Real-Time Communication](#real-time-communication)
- [API Design](#api-design)
- [Frontend Approach](#frontend-approach)
- [Deployment Strategy](#deployment-strategy)
- [Trade-offs & Future Improvements](#trade-offs--future-improvements)

---

## Architecture Overview

We went with a traditional client-server architecture with WebSocket support for real-time features. The backend is a Node.js/Express server that handles both REST API requests and Socket.io connections. This monolithic approach made sense for an MVP because:

1. **Simplicity**: One codebase, one deployment, easier to reason about
2. **Development Speed**: No need to coordinate between multiple services
3. **Cost-Effective**: Single server instance keeps hosting costs low
4. **Real-Time Integration**: Socket.io works seamlessly alongside Express

If we needed to scale significantly, we'd probably split the Socket.io server into a separate service, but for now, this works great.

## Technology Choices

### Why Node.js + Express?

I chose Node.js for a few practical reasons:

- **JavaScript Everywhere**: Same language on frontend and backend reduces context switching
- **Event-Driven**: Perfect for real-time chat applications with lots of concurrent connections
- **Rich Ecosystem**: npm has packages for everything we need (JWT, bcrypt, Socket.io)
- **Fast Development**: Express is minimal and doesn't get in your way

Express specifically was chosen over frameworks like NestJS or Fastify because we didn't need the extra structure. For a project of this size, Express's simplicity is actually an advantage.

### Why Supabase (PostgreSQL)?

Initially, I considered a few options:
- **MongoDB**: Good for flexibility, but we have relational data (users → rooms → messages)
- **Firebase**: Easy real-time features, but vendor lock-in and less control
- **Supabase**: PostgreSQL with a great developer experience

Supabase won because:
1. **Relational Data Model**: Our data has clear relationships that SQL handles beautifully
2. **ACID Guarantees**: Important for healthcare data integrity
3. **Free Tier**: Generous limits for development and small deployments
4. **Easy Setup**: No server management, just write SQL and go
5. **Future-Proof**: It's just PostgreSQL, so we can migrate if needed

The fact that it's PostgreSQL under the hood means we're not locked into proprietary features. We could move to any PostgreSQL host if requirements change.

### Why Socket.io for Real-Time?

I evaluated a few approaches for real-time messaging:

- **Polling**: Simple but inefficient, wastes bandwidth
- **Server-Sent Events (SSE)**: One-way only, not ideal for chat
- **WebSockets (raw)**: Powerful but requires handling reconnection, fallbacks, etc.
- **Socket.io**: WebSockets with batteries included

Socket.io was the clear winner because:
- **Automatic Reconnection**: Handles network drops gracefully
- **Fallback Support**: Works even on restrictive networks
- **Room Support**: Built-in concept of rooms matches our use case perfectly
- **Event-Based**: Clean API for different message types
- **Battle-Tested**: Used by thousands of production apps

The slight overhead compared to raw WebSockets is worth it for the reliability and developer experience.

## Database Design

### Schema Philosophy

The schema follows a few key principles:

1. **Normalize Where It Matters**: Users, rooms, and messages are separate tables to avoid duplication
2. **JSONB for Flexibility**: Onboarding form data uses JSONB because requirements might change
3. **UUIDs Over Integers**: Better for distributed systems and harder to enumerate
4. **Timestamps Everywhere**: `created_at` on everything for debugging and analytics
5. **Cascading Deletes**: If a user is deleted, their data goes too (GDPR compliance)

### The Rooms Table

One interesting decision was combining "assignments" and "chat rooms" into a single `rooms` table. Originally, I thought about having separate tables:
- `assignments` (doctor assigned to patient)
- `chat_rooms` (where they communicate)

But I realized: **every assignment IS a chat room**. There's a 1:1 relationship. Combining them:
- Reduces JOIN complexity
- Prevents orphaned records
- Makes queries simpler
- Reflects the actual business logic

The `UNIQUE(patient_id, doctor_id)` constraint ensures a patient can't have duplicate rooms with the same doctor.

### Onboarding Data as JSONB

The `onboarding_forms.data` column is JSONB instead of separate columns. This was deliberate:

**Pros:**
- Flexible schema (easy to add/remove fields without migrations)
- Stores complex nested data naturally
- PostgreSQL has excellent JSONB query support

**Cons:**
- Less type safety at the database level
- Harder to enforce validation in SQL
- Slightly more complex queries

For onboarding forms that might evolve based on medical requirements, flexibility won out. We handle validation in the application layer instead.

## Authentication Strategy

### JWT Tokens

I went with JWT tokens instead of session-based auth for a few reasons:

1. **Stateless**: No session store needed, easier to scale horizontally
2. **Mobile-Friendly**: Easy to use in mobile apps (future consideration)
3. **Decentralized**: Token contains all the info needed, no database lookup per request
4. **Standard**: Well-understood, lots of libraries and tooling

**Token Contents:**
```javascript
{
  userId: "uuid",
  email: "user@example.com",
  role: "patient" | "doctor"
}
```

We include the role in the token so authorization checks don't require a database hit.

### Password Hashing

Using bcryptjs with a cost factor of 10 (default). Some might argue for Argon2, but:
- bcrypt is battle-tested and widely understood
- Cost factor 10 is secure enough for our threat model
- bcryptjs is pure JavaScript (no native dependencies, easier deployment)

If we were handling extremely sensitive data or had specific compliance requirements, we might revisit this.

### Middleware Pattern

The `verifyToken` middleware is applied to all protected routes. This keeps auth logic centralized and makes it obvious which endpoints require authentication:

```javascript
router.get('/api/chat/rooms', verifyToken, chatController.getMyRooms);
```

Clean and explicit.

## Real-Time Communication

### Socket.io Architecture

The Socket.io implementation uses a room-based model that mirrors our database structure:

1. **User Connects**: Socket joins a room named after their user ID
2. **Chat Room**: When viewing a chat, socket joins that room ID
3. **Messages**: Sent to the room, all participants receive them
4. **Presence**: Online/offline events broadcast to relevant rooms

This architecture means:
- Users only receive messages meant for them
- No manual filtering needed
- Easy to add group chats later (just add more users to a room)

### Handling Disconnections

Socket.io automatically handles reconnection, but we also:
- Store messages in the database immediately (not just in memory)
- Send message history on room join (in case they missed anything)
- Broadcast presence changes so UIs can update

This means even if someone's connection drops, they don't lose messages.

### Read Receipts

The `read_status` field on messages enables read receipts. When a user views a chat:
1. Frontend sends `mark_as_read` event
2. Backend updates all unread messages in that room
3. Backend broadcasts `message_read` event to the sender

This gives doctors visibility into whether patients have seen their messages.

## API Design

### RESTful Principles

The API follows REST conventions where it makes sense:
- `POST /api/auth/register` - Create a user
- `GET /api/chat/rooms` - List rooms
- `GET /api/chat/rooms/:roomId/messages` - Get messages for a room

But we're pragmatic about it. For example, `POST /api/onboarding/submit` isn't strictly RESTful (it's more RPC-style), but it clearly communicates intent.

### Versioning

Currently, there's no API versioning (no `/v1/` prefix). For an MVP, this is fine. If we need breaking changes later, we'd add versioning then. YAGNI (You Aren't Gonna Need It) applies here.

### Error Handling

Errors return consistent JSON:
```javascript
{
  error: "Human-readable error message"
}
```

In production, we'd want more structure (error codes, validation details), but this works for now.

## Frontend Approach

### Vanilla HTML/CSS/JavaScript

The frontend is intentionally simple - no React, Vue, or Angular. Why?

1. **No Build Step**: Faster development iteration
2. **Easy to Understand**: Anyone can read HTML/CSS/JS
3. **Lightweight**: Fast page loads, no framework overhead
4. **Sufficient for MVP**: We don't need complex state management yet

For a production app with more complex UI, we'd probably migrate to React or Vue. But for demonstrating the backend capabilities, this is perfect.

### Static File Serving

Express serves the `public/` directory directly. Simple and effective. In production, we'd probably:
- Use a CDN for static assets
- Add caching headers
- Minify JavaScript/CSS

But for development and small-scale deployment, this works fine.

## Deployment Strategy

### Render Configuration

The `render.yaml` file makes deployment dead simple:
- Push to Git
- Render detects the config
- Automatically installs dependencies and starts the server

We specify Node.js version explicitly (`22.16.0`) to ensure consistency between development and production.

### Environment Variables

All secrets and configuration go in environment variables, never in code. This follows the [12-factor app](https://12factor.net/) methodology and makes it easy to:
- Deploy to different environments (dev, staging, prod)
- Rotate secrets without code changes
- Keep sensitive data out of version control

### Single Server Deployment

For now, everything runs on one server. This is fine because:
- Render provides auto-scaling within the instance
- We can upgrade to a larger instance if needed
- Socket.io sticky sessions work out of the box

If we needed to scale horizontally (multiple servers), we'd need:
- Redis for Socket.io adapter (to sync messages across servers)
- Load balancer with sticky sessions
- Potentially separate the Socket.io server

But we'll cross that bridge when we get there.

## Trade-offs & Future Improvements

### What We Sacrificed for Speed

Building an MVP means making trade-offs. Here's what we consciously left out:

1. **Comprehensive Testing**: No unit tests or integration tests yet
   - *Why*: Faster initial development
   - *Future*: Add Jest tests for critical paths

2. **Advanced Security**: No rate limiting, input sanitization is basic
   - *Why*: Not exposed to the internet yet
   - *Future*: Add express-rate-limit, helmet.js, input validation library

3. **Logging & Monitoring**: Just console.log for now
   - *Why*: Simple debugging is sufficient
   - *Future*: Add Winston for logging, Sentry for error tracking

4. **File Uploads**: No support for sending images/files in chat
   - *Why*: Adds complexity (storage, security, UI)
   - *Future*: Add Supabase Storage integration

5. **Email Notifications**: No email when you receive a message
   - *Why*: Requires email service integration
   - *Future*: Add SendGrid or similar

6. **Video Calls**: No telemedicine video chat
   - *Why*: Significantly more complex
   - *Future*: Integrate WebRTC or Twilio Video

### Performance Considerations

Current performance is good for small-scale use, but here's what we'd optimize for scale:

1. **Database Indexing**: Add indexes on frequently queried columns
   ```sql
   CREATE INDEX idx_messages_room_id ON messages(room_id);
   CREATE INDEX idx_rooms_patient_id ON rooms(patient_id);
   ```

2. **Message Pagination**: Currently loads all messages, should paginate
3. **Connection Pooling**: Supabase handles this, but we'd tune it for high load
4. **Caching**: Add Redis for frequently accessed data (user profiles, room lists)

### Security Hardening

For production, we'd add:

1. **Rate Limiting**: Prevent brute force attacks on login
2. **Input Validation**: Use Joi or Yup for request validation
3. **SQL Injection Protection**: Supabase client handles this, but we'd audit queries
4. **XSS Prevention**: Sanitize user input before displaying
5. **CORS Restrictions**: Lock down to specific frontend domains
6. **HTTPS Only**: Enforce SSL in production
7. **Helmet.js**: Security headers for Express

### Code Organization

As the app grows, we'd refactor:

1. **Service Layer**: Move business logic out of controllers
2. **Validation Layer**: Centralize input validation
3. **Error Handling**: Custom error classes and centralized error middleware
4. **Configuration**: Move config to a dedicated module
5. **Database Migrations**: Use a migration tool instead of raw SQL

---

## Conclusion

This architecture prioritizes **speed of development** and **simplicity** while maintaining a solid foundation for growth. Every decision was made with the understanding that this is an MVP - we can always refactor and optimize later based on real usage patterns.

The key is that we haven't painted ourselves into a corner. The technology choices (PostgreSQL, JWT, Socket.io) are all industry-standard and well-supported, making it easy to evolve the application as requirements change.

