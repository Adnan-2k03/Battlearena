import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";

type Team = "blue" | "red";
type Role = "striker" | "guardian";
type GamePhase = "lobby" | "playing" | "ended";

interface PlayerStats {
  wordsTyped: number;
  correctWords: number;
  incorrectWords: number;
  damageDealt: number;
  shieldRestored: number;
  startTime: number;
}

interface Player {
  id: string;
  nickname: string;
  team: Team | null;
  role: Role | null;
  roomId: string;
  stats: PlayerStats;
}

interface TeamState {
  hp: number;
  shield: number;
}

interface PlayerNickname {
  socketId: string;
  nickname: string;
}

interface GameRoom {
  id: string;
  players: Map<string, Player>;
  spectators: Set<string>;
  phase: GamePhase;
  blueTeam: TeamState;
  redTeam: TeamState;
  winner: Team | null;
  matchStartTime: number;
}

const rooms = new Map<string, GameRoom>();
const matchmakingQueue: PlayerNickname[] = [];

const STRIKER_WORDS = ["ATTACK", "BURST", "SHOOT", "CRUSH", "STRIKE", "BLAST", "SLAM", "POUND"];
const GUARDIAN_WORDS = ["PROTECT", "SHIELD", "HOLD", "REPAIR", "DEFEND", "GUARD", "BLOCK", "RESTORE"];
const POWERUP_WORDS = {
  striker: ["MEGABLAST", "CRITICAL", "DEVASTATE"],
  guardian: ["FORTRESS", "REGENERATE", "BARRIER"]
};

type WordType = "normal" | "double_damage" | "full_shield" | "stun";

interface WordWithType {
  word: string;
  type: WordType;
}

function getRandomWords(role: Role, count: number): WordWithType[] {
  const normalWords = role === "striker" ? STRIKER_WORDS : GUARDIAN_WORDS;
  const powerWords = role === "striker" ? POWERUP_WORDS.striker : POWERUP_WORDS.guardian;
  
  const words: WordWithType[] = [];
  
  for (let i = 0; i < count; i++) {
    const isPowerUp = Math.random() < 0.2;
    
    if (isPowerUp) {
      const powerWord = powerWords[Math.floor(Math.random() * powerWords.length)];
      let type: WordType;
      
      if (role === "striker") {
        type = powerWord === "MEGABLAST" ? "double_damage" : powerWord === "CRITICAL" ? "double_damage" : "stun";
      } else {
        type = powerWord === "FORTRESS" ? "full_shield" : "full_shield";
      }
      
      words.push({ word: powerWord, type });
    } else {
      const normalWord = normalWords[Math.floor(Math.random() * normalWords.length)];
      words.push({ word: normalWord, type: "normal" });
    }
  }
  
  return words;
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

    socket.on("join_queue", ({ nickname }: { nickname: string }) => {
      matchmakingQueue.push({ socketId: socket.id, nickname });
      console.log(`${nickname} joined matchmaking queue. Queue size: ${matchmakingQueue.length}`);

      if (matchmakingQueue.length >= 4) {
        const playerData = matchmakingQueue.splice(0, 4);
        const roomId = `auto-${Date.now()}`;
        
        const room: GameRoom = {
          id: roomId,
          players: new Map(),
          spectators: new Set(),
          phase: "lobby",
          blueTeam: { hp: 100, shield: 0 },
          redTeam: { hp: 100, shield: 0 },
          winner: null,
          matchStartTime: 0
        };
        
        playerData.forEach(({ socketId: playerId, nickname: playerNickname }, index) => {
          const team: Team = index < 2 ? "blue" : "red";
          const role: Role = index % 2 === 0 ? "striker" : "guardian";
          
          const playerSocket = io.sockets.sockets.get(playerId);
          if (!playerSocket) return;
          
          const player: Player = {
            id: playerId,
            nickname: playerNickname,
            team,
            role,
            roomId,
            stats: {
              wordsTyped: 0,
              correctWords: 0,
              incorrectWords: 0,
              damageDealt: 0,
              shieldRestored: 0,
              startTime: 0
            }
          };
          
          room.players.set(playerId, player);
          playerSocket.join(roomId);
          
          playerSocket.emit("matched", { roomId, team, role });
        });
        
        rooms.set(roomId, room);
        
        const playersList = Array.from(room.players.values()).map(p => ({
          id: p.id,
          nickname: p.nickname,
          team: p.team,
          role: p.role
        }));
        
        io.to(roomId).emit("room_update", {
          players: playersList,
          canStart: true,
          phase: room.phase
        });
        
        console.log(`Match created: ${roomId} with ${room.players.size} players`);
      } else {
        socket.emit("queue_update", { position: matchmakingQueue.length });
      }
    });

    socket.on("join_room", ({ nickname, roomId }: { nickname: string; roomId: string }) => {
      let room = rooms.get(roomId);

      if (!room) {
        room = {
          id: roomId,
          players: new Map(),
          spectators: new Set(),
          phase: "lobby",
          blueTeam: { hp: 100, shield: 0 },
          redTeam: { hp: 100, shield: 0 },
          winner: null,
          matchStartTime: 0
        };
        rooms.set(roomId, room);
      }

      if (room.players.size >= 4) {
        room.spectators.add(socket.id);
        socket.join(roomId);
        
        socket.emit("joined_as_spectator", {
          roomId,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          phase: room.phase,
          players: Array.from(room.players.values()).map(p => ({
            id: p.id,
            nickname: p.nickname,
            team: p.team,
            role: p.role
          }))
        });
        
        console.log(`${nickname} joined room ${roomId} as spectator`);
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
        roomId,
        stats: {
          wordsTyped: 0,
          correctWords: 0,
          incorrectWords: 0,
          damageDealt: 0,
          shieldRestored: 0,
          startTime: 0
        }
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
      room.matchStartTime = Date.now();

      const startTime = Date.now();
      room.players.forEach((player) => {
        player.stats = {
          wordsTyped: 0,
          correctWords: 0,
          incorrectWords: 0,
          damageDealt: 0,
          shieldRestored: 0,
          startTime
        };
      });

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

    socket.on("word_typed", ({ roomId, word, wordType }: { roomId: string; word: string; wordType?: WordType }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== "playing") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      const wordUpper = word.toUpperCase().trim();
      const allValidWords = [
        ...(player.role === "striker" ? STRIKER_WORDS : GUARDIAN_WORDS),
        ...(player.role === "striker" ? POWERUP_WORDS.striker : POWERUP_WORDS.guardian)
      ];

      player.stats.wordsTyped++;

      if (!allValidWords.includes(wordUpper)) {
        player.stats.incorrectWords++;
        socket.emit("word_invalid");
        return;
      }

      player.stats.correctWords++;

      if (player.role === "striker") {
        const enemyTeam = player.team === "blue" ? "red" : "blue";
        const enemyState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;

        let damage = 15;
        let isStun = false;

        if (wordType === "double_damage") {
          damage = 30;
        } else if (wordType === "stun") {
          damage = 15;
          isStun = true;
        }

        if (enemyState.shield > 0) {
          const shieldDamage = Math.min(damage, enemyState.shield);
          enemyState.shield -= shieldDamage;
          damage -= shieldDamage;
        }
        
        if (damage > 0) {
          enemyState.hp = Math.max(0, enemyState.hp - damage);
        }

        player.stats.damageDealt += damage;

        io.to(roomId).emit("damage_dealt", {
          attackerTeam: player.team,
          targetTeam: enemyTeam,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          isPowerUp: wordType === "double_damage" || wordType === "stun",
          isStun
        });

        if (enemyState.hp <= 0) {
          room.phase = "ended";
          room.winner = player.team;
          
          const endTime = Date.now();
          const matchDuration = (endTime - room.matchStartTime) / 60000;
          const playerStats = Array.from(room.players.values()).map(p => {
            const wpm = matchDuration > 0 ? Math.round(p.stats.correctWords / matchDuration) : 0;
            const accuracy = p.stats.wordsTyped > 0 
              ? Math.round((p.stats.correctWords / p.stats.wordsTyped) * 100) 
              : 100;
            
            return {
              id: p.id,
              nickname: p.nickname,
              team: p.team,
              role: p.role,
              wpm,
              accuracy,
              damageDealt: p.stats.damageDealt,
              shieldRestored: p.stats.shieldRestored
            };
          });

          io.to(roomId).emit("match_ended", {
            winner: player.team,
            blueTeam: room.blueTeam,
            redTeam: room.redTeam,
            stats: playerStats
          });
          return;
        }
      } else if (player.role === "guardian") {
        const myTeamState = player.team === "blue" ? room.blueTeam : room.redTeam;
        const oldShield = myTeamState.shield;
        
        if (wordType === "full_shield") {
          myTeamState.shield = 100;
        } else {
          myTeamState.shield = Math.min(100, myTeamState.shield + 10);
        }

        const shieldGained = myTeamState.shield - oldShield;
        player.stats.shieldRestored += shieldGained;

        io.to(roomId).emit("shield_restored", {
          team: player.team,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          isPowerUp: wordType === "full_shield"
        });
      }

      const newWords = getRandomWords(player.role!, 3);
      socket.emit("new_words", { words: newWords });
      socket.emit("word_correct");
    });

    socket.on("disconnect", () => {
      console.log(`Player disconnected: ${socket.id}`);

      const queueIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
      if (queueIndex > -1) {
        matchmakingQueue.splice(queueIndex, 1);
        console.log(`Player removed from queue. Queue size: ${matchmakingQueue.length}`);
      }

      rooms.forEach((room, roomId) => {
        if (room.players.has(socket.id)) {
          room.players.delete(socket.id);

          if (room.players.size === 0 && room.spectators.size === 0) {
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
        } else if (room.spectators.has(socket.id)) {
          room.spectators.delete(socket.id);
          if (room.players.size === 0 && room.spectators.size === 0) {
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  return httpServer;
}
