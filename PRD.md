Product Requirements Document (PRD)
Telegram Web Client with WhatsApp UX

Version Date Author Status
1.0 2026-06-19 — Draft

1. Executive Summary
   This project aims to build a web-based Telegram client that replicates the look, feel, and interaction patterns of WhatsApp. It is a self‑hosted, single‑user application powered by Bun, Hono, mtcute, React, and shadcn/ui. The user authenticates with their Telegram account via the MTProto protocol, and all chats, messages, and media are presented through a WhatsApp‑style interface (green accents, compact chat list, floating action buttons, familiar message bubbles, etc.).

2. Problem Statement
   Telegram’s official web clients (WebK, WebZ) offer a functional but distinct UX that differs from WhatsApp’s widely adopted design. Users migrating from WhatsApp or who prefer its minimalist, conversation‑focused interface lack a Telegram client that matches that experience. Existing third‑party solutions are either desktop‑only, outdated, or do not provide a clean, modern web UI. This project fills the gap by delivering a performant, browser‑based Telegram client with a familiar WhatsApp‑inspired UX, using a modern, lightweight tech stack.

3. Goals and Objectives
   Primary Goal: Provide a fully functional Telegram web client with a WhatsApp‑like UI/UX.

Secondary Goals:

Self‑hostable (single user per instance, session persisted on server).

Real‑time messaging with low latency.

Support core Telegram features: private chats, groups, channels, media, stickers, voice messages.

Responsive design (desktop first, adaptive to tablet).

Secure handling of user credentials and MTProto sessions.

Non‑Goals (v1):

Multi‑user / SaaS platform.

Voice/video calls (WebRTC integration).

Bots, payments, or advanced Telegram features.

Mobile‑optimized layout (future).

4. Target Users
   Primary: Individual users who prefer WhatsApp’s interface but use Telegram for its feature set.

Secondary: Developers and self‑hosting enthusiasts who want full control over their messaging client.

User needs:

Log in quickly with phone number / QR code.

Browse chats in a familiar left‑pane / right‑pane layout.

Send/receive text, emoji, images, video, documents, voice notes.

See online status, typing indicators, read receipts.

Search messages and contacts.

Manage groups/channels (view only in v1, no admin actions).

Dark mode (WhatsApp’s dark theme).

5. Functional Requirements
   5.1 Authentication & Session Management
   FR‑A1: Login via phone number (international format) – request verification code.

FR‑A2: Support password‑based 2FA if enabled on the account.

FR‑A3: Persist the MTProto session on the server (file or SQLite) across restarts.

FR‑A4: Display logged‑in user’s profile photo, name, and phone number in the sidebar header.

FR‑A5: Logout – destroy session on server and clear client state.

5.2 Chat List (Left Panel)
FR‑C1: Show list of recent conversations (private, group, channel) sorted by last message timestamp (WhatsApp‑style: most recent on top).

FR‑C2: Each chat item displays: avatar (or placeholder), contact/group name, last message preview (sender prefix for groups), timestamp, unread count badge (green circle).

FR‑C3: Pinned chats appear at the top with a subtle background.

FR‑C4: “Archived chats” folder (collapsed) accessible via bottom section.

FR‑C5: Search bar for filtering chats/contacts by name or phone number.

FR‑C6: Click on a chat to open it in the right pane; highlight active chat.

FR‑C7: Context menu on right‑click (or long‑press) offering: archive, pin, mark as unread, mute notifications (UI only, no actual notification delivery yet).

5.3 Chat View (Right Panel)
FR‑M1: Header with avatar, name, online/last seen status, and action buttons (search in conversation, media gallery placeholder).

FR‑M2: Message list – infinite scroll, loading older messages on demand (pagination with offset ID).

FR‑M3: Message bubbles styled like WhatsApp:

Own messages: right‑aligned, green background.

Others’ messages: left‑aligned, white (light) or dark grey (dark) background.

Timestamps inside bubbles.

System messages (e.g., “John joined”) displayed as centered plain text.

FR‑M4: Message status indicators: single grey check (sent), double grey checks (delivered/read), double blue checks (read), clock icon (pending).

FR‑M5: Support rich media:

Images/videos – clickable thumbnails, open in a lightbox overlay.

Documents – file name, size, download button.

Voice messages – playable inline with waveform visualization (minimal).

Stickers and animated stickers (static preview for animations).

Emoji/GIF picker (basic emoji set via browser’s Emoji Mart or similar).

FR‑M6: Typing indicator – show “typing…” or “recording audio…” at the bottom of the conversation when a participant is typing.

FR‑M7: Read receipts – display sender’s avatar mini bubble for group messages that are unread (WhatsApp behaviour optional; simplified to double‑check logic).

FR‑M8: Message input area:

Text field with send button.

Attachment clip button for files, images (camera option not required).

Emoji button to open emoji picker.

Voice message recording button (microphone, hold to record).

FR‑M9: Auto‑scroll to bottom on new received message or when user is already near the bottom.

5.4 Notifications (In‑App)
FR‑N1: Update chat list with new messages in real‑time via WebSocket.

FR‑N2: Unread count badge on browser tab (dynamic favicon/title).

FR‑N3: Sound alert (optional) on new incoming message (user configurable).

5.5 Search
FR‑S1: Global search (accessible from left panel header) searches contacts, chat names, and messages (server‑side via mtcute search methods).

5.6 Settings
FR‑SET1: Basic user profile display (avatar, name, bio, phone number).

FR‑SET2: Toggle dark/light mode (persisted in localStorage, applied via shadcn theme).

FR‑SET3: Logout button.

6. Non‑Functional Requirements
   Performance: Initial load < 2s, message sending appears instantaneous (< 100ms local update), message sync via WebSocket with < 300ms latency.

Reliability: Auto‑reconnect mtcute session and WebSocket. Session persistence across server restarts.

Security:

Session stored with restricted permissions (file owned by user, running in isolated environment).

API calls authenticated via server‑side session token; client never sees raw MTProto credentials.

Input sanitization to prevent XSS.

HTTPS mandatory for production.

Compatibility: Works on modern browsers (Chrome, Firefox, Edge) and Bun runtime (v1.x+).

Maintainability: Clean separation of server (Hono API + mtcute) and client (React + shadcn). TypeScript throughout.

7. UI/UX Design Guidelines (WhatsApp‑Inspired)
   Color palette:

Light theme: #008069 (WhatsApp green header), #ffffff background, #efeae2 chat wallpaper pattern.

Dark theme: #1f2c33 header, #0b141a background, #1e2c33 bubbles.

Typography: System font stack (Segoe UI, Helvetica, etc.), identical to WhatsApp Web.

Layout: Flexbox two‑column layout. Left panel fixed width 380px, right panel fluid. On smaller screens (tablet) left panel collapses to a narrow list.

Components: Reuse shadcn/ui primitives (Button, Input, Avatar, DropdownMenu, Dialog, ScrollArea) and customize to WhatsApp style.

Interactions:

Click chat → open conversation with slide animation (optional).

Long press or right‑click for context menus.

Hover effects on chat list items, buttons.

Smooth scroll behavior.

Swipe gestures not required for desktop web.

8. Technical Architecture & Stack
   8.1 Overview
   text
   Browser (React) <-- HTTP/WebSocket --> Bun Server (Hono + mtcute) <-- MTProto --> Telegram Servers
   8.2 Technology Choices
   Layer Technology Purpose
   Runtime Bun Server runtime, package manager, bundler (Vite optional)
   Web Framework Hono Serve API routes, WebSocket upgrades, static files
   MTProto Client mtcute Interact with Telegram API, manage user session, handle updates
   Frontend React 18+ UI library
   UI Components shadcn/ui + Tailwind Pre‑styled primitives, easily themed to WhatsApp
   State Mgmt Zustand / React Query Client state, cache, server synchronization
   Real‑time WebSocket (Hono) Push updates (new messages, status changes)
   Storage SQLite (bun:sqlite) or JSON file Persist mtcute session string and optionally local cache
   8.3 Project Structure
   text
   telegram-wa-web/
   ├── server/
   │ ├── index.ts # Hono app entry
   │ ├── tg-client.ts # mtcute client singleton, lifecycle
   │ ├── routes/
   │ │ ├── auth.ts # login, logout, 2FA
   │ │ ├── chats.ts # fetch dialogs, messages, search
   │ │ └── media.ts # file downloads (proxied)
   │ ├── ws.ts # WebSocket manager
   │ └── utils/
   ├── client/
   │ ├── src/
   │ │ ├── App.tsx
   │ │ ├── components/ # Custom WhatsApp‑styled components
   │ │ ├── hooks/ # useTelegram, useChat, etc.
   │ │ ├── lib/ # API client, WebSocket hook
   │ │ └── styles/
   │ ├── index.html
   │ └── package.json
   └── package.json
9. System Components (Detailed)
   9.1 Server Side
   9.1.1 mtcute Client Lifecycle
   On server start, attempt to load saved session from session.json or sessions.db.

If no session, expose /api/auth/requestCode endpoint.

Handle authentication steps, 2FA. Upon successful login, save session string.

Subscribe to mtcute updates (newMessage, editMessage, deleteMessage, userStatus, etc.) and push them to the WebSocket subscribers.

Handle reconnection automatically (mtcute does internally).

9.1.2 Hono API Routes
All routes return JSON. Protected by checking that mtcute client is logged in (throw 401 otherwise).

Method Path Description
POST /api/auth/requestCode Body: { phone } -> request SMS code
POST /api/auth/login Body: { phone, code, password? } -> login
POST /api/auth/logout Destroy session
GET /api/me Get logged‑in user info
GET /api/dialogs List dialogs (pagination optional)
GET /api/messages/{peerId} Get messages for a chat (offset, limit)
POST /api/sendMessage Body: { peerId, text }
POST /api/sendMedia multipart: file upload + metadata
GET /api/search Query param q - search contacts and messages
GET /api/file/{fileId} Stream file data (proxy)
POST /api/readHistory Mark chat as read
... (other actions) Typing indicator, delete message, etc.
9.1.3 WebSocket Management
Endpoint: ws://host/ws (upgrade handled by Hono).

Client sends authenticated token (pre‑shared session key) during handshake or via cookie.

Server pushes events: new_message, update_message, user_status, typing, read_history.

Client can send typing notification request via WS.

Maintain a Map of connected clients (only one for single‑user app, but design for multiple tabs).

9.1.4 Session Storage
Use bun:sqlite to store session key, or simple JSON file (adequate for single user).

Encryption at rest is recommended but optional in v1.

9.2 Client Side (React + shadcn)
9.2.1 Component Tree
text
App
├── AuthScreen (if not logged in)
│ ├── PhoneInput
│ ├── CodeInput
│ └── PasswordInput (2FA)
└── MainLayout
├── Sidebar
│ ├── Header (profile)
│ ├── SearchBar
│ └── ChatList
│ └── ChatItem (memo)
├── ChatView (when a chat is selected)
│ ├── ChatHeader
│ ├── MessageList (virtualized or infinite scroll)
│ │ └── MessageBubble (text, media, voice, etc.)
│ ├── TypingIndicator
│ └── MessageInput
└── (modals: Lightbox, EmojiPicker, etc.)
9.2.2 State & Data Flow
API Client: Fetch wrapper for Hono endpoints, using React Query for caching and server state (dialogs, messages).

Real‑time Updates: Custom hook useWebSocket that listens for events and updates React Query cache optimistically.

Auth State: Zustand store holding isLoggedIn, user.

Chat Selection: Store active chat ID.

9.2.3 WhatsApp Styling
Extend Tailwind theme with WhatsApp colors.

Use shadcn’s button, input, avatar, dropdown-menu components; override default variants using className or by creating custom variants.

Message bubbles: build a MessageBubble component with conditional styles (sent/received), include media layout similar to WhatsApp (image captions, file cards).

The chat background uses a subtle doodle pattern (light theme) or solid dark.

10. Data Flow Examples
    Sending a text message:

User types in input, hits Enter/click send.

Optimistically add message to local state (React Query cache) with temporary ID and “pending” check.

POST /api/sendMessage with peer and text.

Server uses mtcute sendMessage method; on success returns real message object.

Update cache to replace temporary with real message, show delivered status.

WS event may later deliver “read” status; update check marks.

Receiving a message:

mtcute updateNewMessage fires → server pushes new_message over WebSocket.

Client receives event, checks if it’s the active chat; if yes, append to message list and auto‑scroll; else update chat list last message and unread count.

11. API Design (Hono + mtcute)
    All responses follow a standard envelope: { success: boolean, data?: any, error?: string }.

Example: Get Dialogs

json
GET /api/dialogs?limit=30
Response:
{
"success": true,
"data": {
"dialogs": [
{
"peer": { "id": "...", "type": "user" },
"title": "John Doe",
"avatar": "...",
"lastMessage": { "text": "Hey!", "date": 1716172800 },
"unreadCount": 2,
"isPinned": false
}
]
}
} 12. Security Considerations
Session Isolation: The mtcute session must not be exposed to the client. The server acts as a proxy; the browser never accesses the MTProto key material.

CORS: Restrict to the same origin or trusted domains.

Input Validation: Validate all client inputs on the server before passing to mtcute.

File Uploads: Limit size (e.g., 2 GB as per Telegram) and scan for type, but no additional antivirus.

HTTPS: Required in production; Bun’s built‑in TLS or reverse proxy.

Secrets: Use environment variables for sensitive config (e.g., session encryption key).

13. Development Phases & Milestones
    Phase 1: Core Infrastructure (Week 1‑2)
    Set up Bun project with Hono server, mtcute integration.

Implement login flow (request code, login, session persistence).

Establish WebSocket connection for real‑time updates.

Basic React app with chat list (static data).

Phase 2: Core Messaging (Week 3‑4)
Dialogs fetching and rendering with real‑time updates.

Message view with text bubbles, infinite scroll, sending text messages.

Read receipts and online status indicators.

WhatsApp‑like theming (green header, bubbles, light/dark mode).

Phase 3: Media and Rich Features (Week 5‑6)
Image/document upload and download proxying.

Voice messages (recording and playback, waveform stub).

Sticker and emoji support.

Search functionality (chat/message search).

Phase 4: Polish and UI Refinements (Week 7‑8)
Context menus (pin, archive).

Notification badges and tab title updates.

Lightbox for images/videos.

Responsive layout adjustments for tablet.

Error handling, loading states, empty states.

Testing and performance optimization (memoization, virtualized message list).

Phase 5: Documentation & Release (Week 9)
README with setup instructions, environment variables, deployment guide.

Dockerfile (optional).

Publish to GitHub.

14. Risks and Open Issues
    mtcute Maturity: As a relatively new MTProto library, it may have edge‑case bugs; fallback to alternative libs (e.g., @mtproto/core) if needed.

Single‑User Limitation: Session handling not designed for multi‑user; future scaling would require per‑user client instances and resource management.

Browser Support for Voice Recording: MediaRecorder API limitations; may need codec adjustments (Opus in WebM).

WhatsApp Design Replication: Achieving pixel‑perfect parity may require significant CSS effort; acceptable to have close approximation.

Telegram API Changes: MTProto layer upgrades might break the library; need to pin versions.

15. Success Metrics
    User can log in, view chat list, and exchange messages within 30 seconds.

UI matches WhatsApp Web with at least 90% visual similarity (subjective assessment).

No critical security vulnerability (session leak, XSS).

Application runs with memory footprint < 200 MB for a typical user (1‑2k chats).

16. Appendices
    Wireframes: (to be added – left panel showing chat list with green header, right panel with message bubbles, green input bar).

Dependencies: bun, hono, @mtcute/core, @mtcute/bun, react, shadcn/ui, tailwindcss, zustand, @tanstack/react-query, react-virtuoso (for virtualization), emoji-mart or similar.
