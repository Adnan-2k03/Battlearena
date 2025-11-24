# Multiplayer 2v2 Battle Game

## Overview

This project is a real-time multiplayer typing battle game designed for two teams (Blue vs. Red) in a 2v2 format. Each team comprises a Striker (attacker) and a Guardian (defender). Players engage by typing words to either launch attacks on the opposing team or defend their own by restoring shields. The game leverages WebSocket communication via Socket.io for real-time synchronization, featuring a React frontend and an Express backend. The ambition is to create an engaging and competitive typing game experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Full-Stack Architecture

The project utilizes a monorepo structure with distinct client and server directories to streamline development and deployment. The frontend is built with React and Vite, while the backend uses Express with Socket.io for real-time communication. Shared TypeScript schemas ensure type safety across the entire application.

### Frontend Architecture

The frontend is a React application managing complex real-time game states. It uses Zustand for state management and Socket.io for real-time updates. The UI is component-based, leveraging Radix UI primitives and styled with Tailwind CSS for a consistent design. Key views include Lobby, GameArena, and SpectatorView.

### Backend Architecture

The backend is an Express server responsible for real-time multiplayer game logic, room management, and player synchronization via Socket.io. It employs a room-based architecture where each game room maintains an independent state. Role assignment (Striker/Guardian) and team balancing are handled automatically. The server maintains authoritative game state, with in-memory storage for fast real-time operations, though this means state is ephemeral.

### Database Layer

The project is configured to use Drizzle ORM with a PostgreSQL dialect, defining schemas in `shared/schema.ts`. However, the current implementation utilizes an in-memory storage (`MemStorage`) for game data. This design allows for a clear migration path to persistent storage in the future.

### Real-Time Communication

Socket.io is used for real-time bidirectional WebSocket communication between the client and server. This enables synchronization of game state, player actions (e.g., submitting words), and game events (e.g., HP changes, match outcomes). Events are structured for client-to-server actions (e.g., `join_room`, `submit_word`) and server-to-client updates (e.g., `room_update`, `match_ended`).

### UI Component System

The UI is built using shadcn/ui, which is based on Radix UI primitives and styled with Tailwind CSS. This provides a consistent, accessible, and responsive component library for rapid UI development.

### Audio System

Game sound effects are managed through a Zustand store that controls HTML5 Audio elements. The system supports a mute toggle, and audio elements are cloned to allow for overlapping sounds, enhancing the game's auditory feedback.

### Companion Room - Outdoor Biking Experience

An interactive "Companion Room" features a real-world outdoor biking experience. Players can physically move their laptop character outside the room to mount a bike. The system includes proximity-based mounting, full riding controls (WASD/Arrow keys), animated bike components (wheels, pedals), and an enhanced outdoor environment with dynamic lighting and textured terrain.

### Customization System

The game includes a customization system with cosmetic Laptop Skins and gameplay-modifying Abilities. Laptop skins are visually represented in the 3D arena on the player's keyboard, featuring unique colors and effects. Admin users have automatic access to all customization options.

### Projectile-Based Damage System

Damage calculation is delayed to synchronize with visual projectile travel time. Shields are checked at the moment of projectile impact, and the server validates game state before applying damage to prevent race conditions.

## External Dependencies

### Core Framework Dependencies

- **React 18** with **React DOM**
- **Vite**
- **TypeScript**
- **Express**
- **Socket.io**
- **Node.js**

### Database & ORM

- **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`)
- **@neondatabase/serverless** (PostgreSQL driver, configured)
- **Zod**

### UI Libraries

- **Radix UI**
- **Tailwind CSS**
- **class-variance-authority**
- **clsx** / **tailwind-merge**
- **Lucide React**

### State Management

- **Zustand**

### Utilities

- **nanoid**
- **date-fns**
- **cmdk**