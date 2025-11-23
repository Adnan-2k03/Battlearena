import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

type Team = "blue" | "red";
type Role = "striker" | "guardian";
type GamePhase = "lobby" | "playing" | "ended";

interface Player {
  id: string;
  nickname: string;
  team: Team | null;
  role: Role | null;
  roomId: string;
}

interface TeamState {
  hp: number;
  shield: number;
}

interface GameRoom {
  id: string;
  players: Map<string, Player>;
  phase: GamePhase;
  blueTeam: TeamState;
  redTeam: TeamState;
  winner: Team | null;
}

const rooms = new Map<string, GameRoom>();

const STRIKER_WORDS = ["ATTACK", "BURST", "SHOOT", "CRUSH", "STRIKE", "BLAST", "SLAM", "POUND"];
const GUARDIAN_WORDS = ["PROTECT", "SHIELD", "HOLD", "REPAIR", "DEFEND", "GUARD", "BLOCK", "RESTORE"];

function getRandomWords(role: Role, count: number): string[] {
  const wordList = role === "striker" ? STRIKER_WORDS : GUARDIAN_WORDS;
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on("join_room", ({ nickname, roomId }: { nickname: string; roomId: string }) => {
      let room = rooms.get(roomId);

      if (!room) {
        room = {
          id: roomId,
          players: new Map(),
          phase: "lobby",
          blueTeam: { hp: 100, shield: 0 },
          redTeam: { hp: 100, shield: 0 },
          winner: null
        };
        rooms.set(roomId, room);
      }

      if (room.players.size >= 4) {
        socket.emit("room_full");
        return;
      }

      const playerCount = room.players.size;
      const team: Team = playerCount < 2 ? "blue" : "red";
      const role: Role = playerCount % 2 === 0 ? "striker" : "guardian";

      const player: Player = {
        id: socket.id,
        nickname,
        team,
        role,
        roomId
      };

      room.players.set(socket.id, player);
      socket.join(roomId);

      const playersList = Array.from(room.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        role: p.role
      }));

      io.to(roomId).emit("room_update", {
        players: playersList,
        canStart: room.players.size >= 2,
        phase: room.phase
      });

      console.log(`${nickname} joined room ${roomId} as ${team} ${role}`);
    });

    socket.on("start_match", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      if (!room || room.players.size < 2) return;

      room.phase = "playing";
      room.blueTeam = { hp: 100, shield: 0 };
      room.redTeam = { hp: 100, shield: 0 };
      room.winner = null;

      const gameState = {
        phase: "playing",
        blueTeam: room.blueTeam,
        redTeam: room.redTeam
      };

      io.to(roomId).emit("match_started", gameState);

      room.players.forEach((player) => {
        const words = getRandomWords(player.role!, 3);
        io.to(player.id).emit("new_words", { words });
      });

      console.log(`Match started in room ${roomId}`);
    });

    socket.on("word_typed", ({ roomId, word }: { roomId: string; word: string }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== "playing") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      const wordUpper = word.toUpperCase().trim();
      const validWords = player.role === "striker" ? STRIKER_WORDS : GUARDIAN_WORDS;

      if (!validWords.includes(wordUpper)) {
        socket.emit("word_invalid");
        return;
      }

      if (player.role === "striker") {
        const enemyTeam = player.team === "blue" ? "red" : "blue";
        const enemyState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;

        if (enemyState.shield > 0) {
          const damage = Math.min(10, enemyState.shield);
          enemyState.shield -= damage;
        } else {
          enemyState.hp = Math.max(0, enemyState.hp - 15);
        }

        io.to(roomId).emit("damage_dealt", {
          attackerTeam: player.team,
          targetTeam: enemyTeam,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });

        if (enemyState.hp <= 0) {
          room.phase = "ended";
          room.winner = player.team;
          io.to(roomId).emit("match_ended", {
            winner: player.team,
            blueTeam: room.blueTeam,
            redTeam: room.redTeam
          });
          return;
        }
      } else if (player.role === "guardian") {
        const myTeamState = player.team === "blue" ? room.blueTeam : room.redTeam;
        myTeamState.shield = Math.min(100, myTeamState.shield + 10);

        io.to(roomId).emit("shield_restored", {
          team: player.team,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });
      }

      const newWords = getRandomWords(player.role!, 3);
      socket.emit("new_words", { words: newWords });
      socket.emit("word_correct");
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);

      rooms.forEach((room, roomId) => {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);

          if (room.players.size === 0) {
            rooms.delete(roomId);
          } else {
            const playersList = Array.from(room.players.values()).map(p => ({
              id: p.id,
              nickname: p.nickname,
              team: p.team,
              role: p.role
            }));

            io.to(roomId).emit("room_update", {
              players: playersList,
              canStart: room.players.size >= 2,
              phase: room.phase
            });
          }
        }
      });
    });
  });

  return httpServer;
}
