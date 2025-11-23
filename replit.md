# Multiplayer 2v2 Battle Game

## Overview

This is a real-time multiplayer typing battle game where two teams (Blue vs Red) compete in a 2v2 format. Each team has two players with distinct roles: a Striker (attacker) and a Guardian (defender). Players type words to either attack the enemy team or defend their own team by restoring shields. The game uses WebSocket communication through Socket.io for real-time synchronization, with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture

**Problem**: Need a unified development and production environment for a real-time multiplayer game.

**Solution**: Monorepo structure with separate client and server directories, using Vite for frontend development and Express for the backend server.

**Rationale**: 
- Single repository simplifies deployment and code sharing
- Vite provides fast HMR for React development
- Express handles both API routes and WebSocket connections
- Shared schema types ensure type safety across client and server

**Key Components**:
- `client/`: React frontend with TypeScript
- `server/`: Express backend with Socket.io
- `shared/`: Common types and database schemas
- Development mode (`index-dev.ts`) uses Vite middleware
- Production mode (`index-prod.ts`) serves pre-built static files

### Frontend Architecture

**Problem**: Build an interactive real-time game UI with complex state management.

**Solution**: React with Zustand for state management, Socket.io client for real-time communication, and a component-based UI using Radix UI primitives.

**Design Patterns**:
- **Component Structure**: Three main views (Lobby, GameArena, SpectatorView)
- **State Management**: Zustand stores for game state and audio management
- **Real-time Updates**: Socket.io event handlers update local state
- **UI Framework**: Tailwind CSS with shadcn/ui components for consistent design

**Key Files**:
- `App.tsx`: Main application controller managing game phases and modes
- `components/Lobby.tsx`: Player matchmaking and room management
- `components/GameArena.tsx`: Core gameplay interface
- `components/VictoryModal.tsx`: End-game statistics and results
- `lib/stores/useGame.tsx`: Game phase state management
- `lib/stores/useAudio.tsx`: Sound effects management

### Backend Architecture

**Problem**: Handle real-time multiplayer game logic with room management and player synchronization.

**Solution**: Express server with Socket.io for WebSocket communication, in-memory game state management.

**Design Decisions**:
- **Room-Based Architecture**: Each game room maintains independent state
- **Role Assignment**: Automatic assignment of Striker/Guardian roles based on join order
- **Team Balancing**: First two players join Blue team, next two join Red team
- **Game Loop**: Server authoritative game state with client-side prediction
- **Matchmaking**: Queue system for automatic room creation and player pairing

**Key Components**:
- `server/routes.ts`: Socket.io event handlers and game logic
- Room state includes: players, teams, HP/shield values, game phase
- Player stats tracking: words typed, accuracy, damage dealt, shields restored
- Spectator mode support for full rooms

**Pros**:
- Centralized game logic prevents cheating
- In-memory storage is fast for real-time games
- Simple room-based scaling

**Cons**:
- In-memory state lost on server restart
- No persistence between sessions
- Limited to single-server deployment

### Database Layer

**Problem**: Need structured data storage with type-safe schemas.

**Solution**: Drizzle ORM with PostgreSQL dialect, though currently using in-memory storage implementation.

**Current State**:
- Schema defined in `shared/schema.ts` (users table)
- Drizzle configuration points to PostgreSQL
- Actual implementation uses `MemStorage` class for in-memory data
- Database credentials expected via `DATABASE_URL` environment variable

**Future Considerations**:
- Current game state is ephemeral (in-memory maps)
- User authentication schema exists but not actively used in game flow
- Easy migration path to persistent storage by swapping storage implementation

### Real-Time Communication

**Problem**: Synchronize game state across multiple clients in real-time.

**Solution**: Socket.io for bidirectional WebSocket communication with fallback to polling.

**Event Architecture**:
- **Client → Server**: Join room, start match, submit word
- **Server → Client**: Room updates, game state changes, match results
- **Broadcast Patterns**: Team-specific updates, room-wide notifications

**Key Events**:
- `join_room` / `join_matchmaking`: Player connection
- `room_update`: Player list and readiness state
- `match_started`: Game initialization
- `submit_word`: Gameplay action
- `team_update`: HP/shield changes
- `match_ended`: Victory conditions

### UI Component System

**Problem**: Build a consistent, accessible, and responsive UI quickly.

**Solution**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS.

**Benefits**:
- Pre-built accessible components
- Customizable through Tailwind classes
- TypeScript support
- Mobile-responsive by default

**Component Categories**:
- Form controls: Input, Button, Select
- Layout: Card, Dialog, Sheet
- Feedback: Toast, Progress, Alert
- Data display: Table, Tabs, Badge

### Audio System

**Problem**: Manage game sound effects with user control.

**Solution**: Zustand store managing HTML5 Audio elements with mute toggle.

**Implementation**:
- Sound files loaded as Audio objects
- Muted by default (user must unmute)
- Cloned audio elements allow overlapping sounds
- Keyboard shortcut (M key) for mute toggle
- Separate sounds for hits, success, and background music

## External Dependencies

### Core Framework Dependencies

- **React 18** with **React DOM**: UI framework
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **Express**: Backend web framework
- **Socket.io**: Real-time bidirectional communication
- **Node.js**: Runtime environment

### Database & ORM

- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`): Type-safe database toolkit
- **@neondatabase/serverless**: PostgreSQL driver (configured but not actively used)
- **Zod**: Schema validation (via `drizzle-zod`)

### UI Libraries

- **Radix UI**: Headless component primitives (20+ component packages)
- **Tailwind CSS**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx** / **tailwind-merge**: CSS class utilities
- **Lucide React**: Icon library

### 3D Graphics (Unused in Current Implementation)

- **@react-three/fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers for react-three-fiber
- **@react-three/postprocessing**: Post-processing effects
- **vite-plugin-glsl**: GLSL shader support

### State Management & Data Fetching

- **Zustand**: Lightweight state management
- **@tanstack/react-query**: Server state management (configured but minimal usage)

### Session Management

- **express-session**: Session middleware
- **connect-pg-simple**: PostgreSQL session store

### Utilities

- **nanoid**: Unique ID generation
- **date-fns**: Date manipulation
- **cmdk**: Command palette component

### Development Tools

- **tsx**: TypeScript execution for development
- **esbuild**: Fast bundler for production build
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@jridgewell/trace-mapping**: Source map utilities