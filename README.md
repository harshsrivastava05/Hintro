# Hintro

Hintro is a modern, real-time collaborative task management platform built with Next.js 15. It enables teams to organize tasks visually, collaborate in real-time, and track progress efficiently.

## 🚀 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router, Server Actions)
- **Database:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Real-time:** [Socket.io](https://socket.io/) (WebSockets)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [Shadcn UI](https://ui.shadcn.com/)
- **Drag & Drop:** [@hello-pangea/dnd](https://github.com/hello-pangea/dnd)
- **Authentication:** Custom JWT-based auth (bcryptjs + jsonwebtoken)

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
├── actions/      # Next.js Server Actions (Database mutations)
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

## 📜 License
This project is open-source and available under the MIT License.
