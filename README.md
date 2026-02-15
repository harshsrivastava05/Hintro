# Hintro

Hintro is a modern, real-time collaborative task management platform built with Next.js 15. It enables teams to organize tasks visually, collaborate in real-time, and track progress efficiently.

## 🚀 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Real-time:** [Socket.io](https://socket.io/) (WebSockets)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Drag & Drop:** [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **Authentication:** Custom JWT-based auth (bcryptjs + jsonwebtoken)
- **Images:** [Unsplash API](https://unsplash.com/developers)

## ✨ Key Features

### 🔐 Authentication
- Secure user registration and login.
- JWT-based session management using HTTP-only cookies.

### 📊 Dashboard
- **Create Boards:** Easily create new project boards.
- **Search:** Filter boards instantly by title.
- **Pagination:** seamless navigation with 12 boards per page.
- **Join Boards:** Collaborative via unique Board IDs.

### 📋 Board Management
- **Lists & Tasks:** Create unlimited lists and tasks to organize your workflow.
- **Drag-and-Drop:** Intuitive drag-and-drop interface for reordering tasks and lists.
- **Real-time Sync:** All changes (moves, edits, creations) sync instantly to all connected users via WebSockets.
- **Board Sharing:** Share your board ID to invite others to collaborate.
- **Custom Backgrounds:** Personalize boards with beautiful images from Unsplash.

### 📝 Task Details
- **Rich Editing:** Update task content and details.
- **Assignments:** Assign tasks to specific board members with visual avatars.
- **Activity Log:** Comprehensive, paginated history of all actions (task moves, content updates, assignments) on the board.


## 🏗️ Architecture

Hintro uses a hybrid architecture combining Next.js Server Actions for data persistence and Socket.io for real-time state synchronization. This ensures that users receive instant feedback while maintaining data integrity.

```mermaid
graph TD
    Client[Next.js Client] <-->|HTTP/Server Actions| Server[Node.js Custom Server]
    Client <-->|WebSocket| Socket[Socket.IO Server]
    Server <-->|Prisma Client| DB[(PostgreSQL)]
    
    subgraph "Server Environment"
        Server
        Socket
    end
```

### 🔄 Data Flow

The application follows an **Optimistic UI** pattern for instant feedback, backed by reliable server-side persistence and real-time broadcasting.

```mermaid
sequenceDiagram
    participant User
    participant Client
    participant ServerAction
    participant DB
    participant SocketIO
    participant OtherClients

    User->>Client: Interactions (e.g., Drag & Drop)
    Client->>Client: Optimistic Update (Immediate UI Change)
    Client->>ServerAction: Call Server Action (Persistence)
    ServerAction->>DB: Update Database
    DB-->>ServerAction: Confirm Success
    ServerAction->>SocketIO: Emit Update Event to Room
    SocketIO-->>Client: Broadcast Event
    SocketIO-->>OtherClients: Broadcast Event
    Client->>Client: Reconcile State (Confirm/Rollback)
    OtherClients->>OtherClients: Real-time UI Update
```

## 📂 Project Structure

```
src/
├── actions/      # Server Actions (auth, board, list, task/...)
├── app/          # App Router pages and layouts
├── components/   # React components (UI, Board, Providers)
├── lib/          # Utilities (Prisma client, Socket helper)
└── server/       # Custom Node.js server (Next.js + Socket.io)
```

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL installed and running

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd hintro
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database connection string
   DATABASE_URL="postgresql://user:password@localhost:5432/hintro?schema=public"

   # Security
   JWT_SECRET="your-super-secret-jwt-key"

   # App URL (for Socket.io) - Optional, defaults to window.location.origin
   NEXT_PUBLIC_SITE_URL="http://localhost:3000"

   # Unsplash API Key (Required for Board Backgrounds)
   NEXT_PUBLIC_UNSPLASH_ACCESS_KEY="your-unsplash-access-key"
   ```

4. **Initialize Database:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   
   The server will start at `http://localhost:3000`.

## 🤝 Collaboration
To test real-time features locally:
1. Open `http://localhost:3000` in two different browsers (or one Incognito window).
2. Log in as different users.
3. User A creates a board and shares the **Board ID** (found in "Share" dialog).
4. User B clicks **"Join a Board"** on their dashboard and pastes the ID.
5. Both users can now drag tasks, edit content, and see changes instantly!


## 🔌 API Documentation

Since Hintro is built on Next.js Server Actions, the "API" primarily consists of asynchronous functions called directly from the client components. These actions handle database mutations and trigger real-time updates.

### Key Server Actions (`src/actions`)

| Action | Description | Triggers Socket Event |
|--------|-------------|-----------------------|
| `createBoard(title)` | Creates a new board | - |
| `updateBoard(id, title)` | Renames a board | `board-updated` |
| `deleteBoard(id)` | Deletes a board and its contents | - |
| `createList(boardId, title)` | Adds a new list to a board | `list-created` |
| `deleteList(id, boardId)` | Removes a list and its tasks | `list-deleted` |
| `createTask(listId, content, boardId)` | Adds a new task | `task-created` |
| `updateTask(taskId, listId, order, boardId)` | Moves a task (within/across lists) | `task-moved` |
| `assignTask(taskId, userId, boardId)` | Assigns a user to a task | `task-updated` |

### Real-time Events (Socket.io)

Events are emitted to rooms namespaced by board ID (`board:{id}`).

| Event Name | Payload | usage |
|------------|---------|-------|
| `join-board` | `boardId` | Client joins a board room |
| `task-created` | `{ task, listId }` | A new task was added |
| `task-updated` | `{ task }` | A task's content or assignee changed |
| `task-moved` | `{ updates: [] }` | One or more tasks were reordered |
| `list-created` | `{ list }` | A new list was added |
| `list-deleted` | `{ listId }` | A list was removed |
| `activity-updated` | `{ boardId }` | New activity log entry generated |

## ⚖️ Assumptions & Trade-offs

### Assumptions
1.  **Authentication**: The application assumes a secure, cookie-based session is present for all mutations. Middleware protects routes, and server actions verify the user before execution.
2.  **Socket Connectivity**: Real-time features assume a stable WebSocket connection. While the app functions for the initiator without sockets (due to server actions), other collaborators rely on sockets for updates.
3.  **Single Region**: The current architecture uses a single persistent server for Socket.io, assuming all users connect to the same instance (no Redis adapter for multi-server scaling yet).

### Trade-offs

#### 1. Custom Server vs. Serverless
*   **Decision**: We use a custom Node.js server (`server.ts`) instead of standard Next.js routing.
*   **Trade-off**: This allows us to host the Socket.io server on the same instance/port as the Next.js app, simplifying deployment on VPS/containers.
*   **Consequence**: We cannot deploy to Vercel/Netlify "zero-config" platforms freely, as they require serverless functions which don't support persistent WebSocket servers.

#### 2. Optimistic UI
*   **Decision**: The UI updates immediately upon user interaction (e.g., dragging a task), then sends the request to the server.
*   **Trade-off**: Provides a snappy, native-like feel but risks desynchronization if the server request fails.
*   **Mitigation**: The app reconciles state when a socket event is received, effectively "correcting" the UI if the server's truth differs.

#### 3. Activity Logging
*   **Decision**: Activity logs are generated transactionally or immediately after key actions.
*   **Trade-off**: Slightly increases the latency of write operations (create/move/update) to ensure the audit trail is accurate.


## 🚀 Deployment

Since this project uses a custom server for WebSockets, it requires a persistent environment (Docker/VPS).

👉 **[Read the Deployment Guide](DEPLOYMENT.md)** for instructions on deploying to **Render** (Free) or **Railway**.

## 📜 License
This project is open-source and available under the MIT License.
