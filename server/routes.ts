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

interface ElementCharges {
  fire: number;
  water: number;
  leaf: number;
}

interface Player {
  id: string;
  nickname: string;
  team: Team | null;
  role: Role | null;
  roomId: string;
  stats: PlayerStats;
  currentWords: WordWithType[];
  elementCharges: ElementCharges;
  isAdmin: boolean;
}

interface TeamState {
  hp: number;
  shield: number;
  barrier?: {
    element: Element;
    strength: number;
  } | null;
}

interface PlayerNickname {
  socketId: string;
  nickname: string;
}

interface BotPlayer extends Player {
  isBot: true;
  currentWords: WordWithType[];
  typingTimeout?: NodeJS.Timeout;
}

interface AdminSettings {
  unlimitedEnemyHealth: boolean;
  enemyBarrierElement: Element | null;
  enemyBarrierStrength: number;
  godMode: boolean;
  instantCharge: boolean;
  controlledTeam: Team | null;
  gameSpeedMultiplier: number;
}

interface GameRoom {
  id: string;
  players: Map<string, Player | BotPlayer>;
  spectators: Set<string>;
  phase: GamePhase;
  blueTeam: TeamState;
  redTeam: TeamState;
  winner: Team | null;
  matchStartTime: number;
  botTimers: NodeJS.Timeout[];
  adminSettings: AdminSettings;
}

const rooms = new Map<string, GameRoom>();
const matchmakingQueue: PlayerNickname[] = [];

function isBot(player: Player | BotPlayer): player is BotPlayer {
  return 'isBot' in player && player.isBot === true;
}

const BOT_NAMES = ["EasyBot", "SlowTyper", "BeginnerBot", "NoobMaster"];

function createBot(id: string, team: Team, role: Role, roomId: string): BotPlayer {
  const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)] + Math.floor(Math.random() * 100);
  return {
    id,
    nickname: botName,
    team,
    role,
    roomId,
    isBot: true,
    currentWords: [],
    elementCharges: { fire: 0, water: 0, leaf: 0 },
    stats: {
      wordsTyped: 0,
      correctWords: 0,
      incorrectWords: 0,
      damageDealt: 0,
      shieldRestored: 0,
      startTime: 0
    },
    isAdmin: false
  };
}

const STRIKER_WORDS = ["ATTACK", "BURST", "SHOOT", "CRUSH", "STRIKE", "BLAST", "SLAM", "POUND"];
const GUARDIAN_WORDS = ["PROTECT", "SHIELD", "HOLD", "REPAIR", "DEFEND", "GUARD", "BLOCK", "RESTORE"];
const POWERUP_WORDS = {
  striker: ["MEGABLAST", "CRITICAL", "DEVASTATE"],
  guardian: ["FORTRESS", "REGENERATE", "BARRIER"]
};

// Elemental words system
type Element = "fire" | "water" | "leaf";

const ELEMENT_WORDS = {
  fire: {
    charge: ["INFERNO", "BLAZE", "IGNITE"],
    normal: ["BURN", "FLAME", "HEAT", "EMBER", "TORCH"]
  },
  water: {
    charge: ["TSUNAMI", "TORRENT", "DELUGE"],
    normal: ["WAVE", "FLOW", "SPLASH", "TIDE", "RAIN"]
  },
  leaf: {
    charge: ["OVERGROW", "SPROUT", "BLOOM"],
    normal: ["VINE", "ROOT", "GROW", "SEED", "BRANCH"]
  }
};

type WordType = "normal" | "double_damage" | "full_shield" | "stun";

interface WordWithType {
  word: string;
  type: WordType;
}

interface WordWithElement {
  word: string;
  element: Element;
  isCharge: boolean;
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

function getRandomElementalWords(count: number): WordWithElement[] {
  const words: WordWithElement[] = [];
  const elements: Element[] = ["fire", "water", "leaf"];
  
  for (let i = 0; i < count; i++) {
    const element = elements[Math.floor(Math.random() * elements.length)];
    const isCharge = Math.random() < 0.3;
    
    const wordPool = isCharge ? ELEMENT_WORDS[element].charge : ELEMENT_WORDS[element].normal;
    const word = wordPool[Math.floor(Math.random() * wordPool.length)];
    
    words.push({ word, element, isCharge });
  }
  
  return words;
}

function startBotTyping(bot: BotPlayer, room: GameRoom, io: SocketIOServer) {
  if (!bot.currentWords || bot.currentWords.length === 0) return;
  
  const typingDelay = 2000 + Math.random() * 3000; // 2-5 seconds between words
  
  bot.typingTimeout = setTimeout(() => {
    if (room.phase !== 'playing' || !bot.currentWords || bot.currentWords.length === 0) return;
    
    // Pick a random word from bot's current words
    const randomIndex = Math.floor(Math.random() * bot.currentWords.length);
    const wordObj = bot.currentWords[randomIndex] as any;
    
    if (!wordObj) {
      startBotTyping(bot, room, io);
      return;
    }
    
    // Simulate typing the word
    bot.stats.wordsTyped++;
    bot.stats.correctWords++;
    
    // Update bot's element charge
    const { element, isCharge } = wordObj;
    const elementType = element as Element;
    const chargeIncrease = isCharge ? 30 : 10;
    bot.elementCharges[elementType] = Math.min(100, bot.elementCharges[elementType] + chargeIncrease);
    
    // Non-charge words deal small damage to enemy
    const botTeamState = bot.team === 'blue' ? room.blueTeam : room.redTeam;
    const botEnemyTeam = bot.team === 'blue' ? 'red' : 'blue';
    const botEnemyState = botEnemyTeam === 'blue' ? room.blueTeam : room.redTeam;
    
    if (!isCharge) {
      // Small damage: 3 HP to enemy
      let damage = 3;
      
      // If enemy has a barrier, damage it first
      if (botEnemyState.barrier) {
        const barrierDamage = Math.min(damage, botEnemyState.barrier.strength);
        botEnemyState.barrier.strength -= barrierDamage;
        damage -= barrierDamage;
        
        if (botEnemyState.barrier.strength <= 0) {
          botEnemyState.barrier = null;
        }
      }
      
      // Apply remaining damage to HP
      if (damage > 0) {
        const adminPlayer = Array.from(room.players.values()).find(p => p.isAdmin);
        const shouldPreventDamage = adminPlayer && 
          adminPlayer.team && 
          botEnemyTeam === (adminPlayer.team === 'blue' ? 'red' : 'blue') && 
          room.adminSettings.unlimitedEnemyHealth;
        
        if (!shouldPreventDamage) {
          botEnemyState.hp = Math.max(0, botEnemyState.hp - damage);
        }
      }
      
      bot.stats.damageDealt += 3;
    }
    
    // Get new words for the bot
    const newWords = getRandomElementalWords(6);
    bot.currentWords = newWords as any;
    
    // Randomly decide to use element if bot has enough charge (check actual charge)
    const shouldUseElement = Math.random() < 0.2 && bot.elementCharges[elementType] >= 100; // 20% chance if charged
    
    if (shouldUseElement) {
      const action = Math.random() < 0.7 ? 'attack' : 'barrier'; // 70% attack, 30% barrier
      
      // Consume the charge
      bot.elementCharges[elementType] = 0;
      
      if (action === 'attack') {
        const enemyTeam = bot.team === 'blue' ? 'red' : 'blue';
        const enemyState = enemyTeam === 'blue' ? room.blueTeam : room.redTeam;
        
        let damage = 30;
        let isCritical = false;
        
        if (enemyState.barrier) {
          const advantage = getElementAdvantage(elementType, enemyState.barrier.element);
          if (advantage === 'critical') {
            damage = 60;
            isCritical = true;
          } else if (advantage === 'weak') {
            damage = 15;
          }
          
          const barrierDamage = Math.min(damage, enemyState.barrier.strength);
          enemyState.barrier.strength -= barrierDamage;
          damage -= barrierDamage;
          
          if (enemyState.barrier.strength <= 0) {
            enemyState.barrier = null;
          }
        }
        
        if (damage > 0) {
          const adminPlayer = Array.from(room.players.values()).find(p => p.isAdmin);
          const shouldPreventDamage = adminPlayer && 
            adminPlayer.team && 
            enemyTeam === (adminPlayer.team === 'blue' ? 'red' : 'blue') && 
            room.adminSettings.unlimitedEnemyHealth;
          
          if (!shouldPreventDamage) {
            enemyState.hp = Math.max(0, enemyState.hp - damage);
          }
        }
        
        bot.stats.damageDealt += damage;
        
        io.to(room.id).emit('attack_landed', {
          attackerTeam: bot.team,
          element: elementType,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          isCritical
        });
        
        if (enemyState.hp <= 0) {
          room.phase = 'ended';
          room.winner = bot.team;
          
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
          
          io.to(room.id).emit('match_ended', {
            winner: bot.team,
            blueTeam: room.blueTeam,
            redTeam: room.redTeam,
            stats: playerStats
          });
          return;
        }
      } else {
        const myTeamState = bot.team === 'blue' ? room.blueTeam : room.redTeam;
        myTeamState.barrier = {
          element: elementType,
          strength: 100
        };
        
        io.to(room.id).emit('barrier_created', {
          team: bot.team,
          element: elementType,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });
      }
    }
    
    // Broadcast element charges update
    const playerCharges = Array.from(room.players.values()).map(p => ({
      id: p.id,
      team: p.team,
      charges: p.isAdmin ? { fire: 100, water: 100, leaf: 100 } : p.elementCharges
    }));
    io.to(room.id).emit("element_charges_update", { playerCharges });
    
    // Continue bot typing
    startBotTyping(bot, room, io);
  }, typingDelay);
  
  room.botTimers.push(bot.typingTimeout);
}

function getElementAdvantage(attacker: Element, defender: Element): 'critical' | 'normal' | 'weak' {
  if (attacker === 'fire' && defender === 'leaf') return 'critical';
  if (attacker === 'water' && defender === 'fire') return 'critical';
  if (attacker === 'leaf' && defender === 'water') return 'critical';
  
  if (attacker === 'fire' && defender === 'water') return 'weak';
  if (attacker === 'water' && defender === 'leaf') return 'weak';
  if (attacker === 'leaf' && defender === 'fire') return 'weak';
  
  return 'normal';
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

    socket.on("join_queue", ({ nickname, mode = "team" }: { nickname: string; mode?: "team" | "solo" }) => {
      matchmakingQueue.push({ socketId: socket.id, nickname });
      console.log(`${nickname} joined ${mode} matchmaking queue. Queue size: ${matchmakingQueue.length}`);

      const timeout = setTimeout(() => {
        const queueIndex = matchmakingQueue.findIndex(p => p.socketId === socket.id);
        if (queueIndex === -1) return;
        
        const playerData = matchmakingQueue.splice(0, matchmakingQueue.length);
        const roomId = `auto-${Date.now()}`;
        const maxPlayers = mode === "solo" ? 2 : 4;
        
        const room: GameRoom = {
          id: roomId,
          players: new Map(),
          spectators: new Set(),
          phase: "lobby",
          blueTeam: { hp: 100, shield: 0 },
          redTeam: { hp: 100, shield: 0 },
          winner: null,
          matchStartTime: 0,
          botTimers: [],
          adminSettings: {
            unlimitedEnemyHealth: false,
            enemyBarrierElement: null,
            enemyBarrierStrength: 100,
            godMode: false,
            instantCharge: false,
            controlledTeam: null,
            gameSpeedMultiplier: 1.0
          }
        };
        
        playerData.forEach(({ socketId: playerId, nickname: playerNickname }, index) => {
          const team: Team = mode === "solo" ? (index === 0 ? "blue" : "red") : (index < 2 ? "blue" : "red");
          const role: Role = mode === "solo" ? "striker" : (index % 2 === 0 ? "striker" : "guardian");
          
          const playerSocket = io.sockets.sockets.get(playerId);
          if (!playerSocket) return;
          
          const isAdmin = playerNickname.toLowerCase().startsWith('admin');
          const player: Player = {
            id: playerId,
            nickname: playerNickname,
            team,
            role,
            roomId,
            elementCharges: isAdmin ? { fire: 100, water: 100, leaf: 100 } : { fire: 0, water: 0, leaf: 0 },
            stats: {
              wordsTyped: 0,
              correctWords: 0,
              incorrectWords: 0,
              damageDealt: 0,
              shieldRestored: 0,
              startTime: 0
            },
            currentWords: [],
            isAdmin
          };
          
          room.players.set(playerId, player);
          playerSocket.join(roomId);
          
          playerSocket.emit("matched", { roomId, team, role });
        });
        
        while (room.players.size < maxPlayers) {
          const index = room.players.size;
          const team: Team = mode === "solo" ? (index === 0 ? "blue" : "red") : (index < 2 ? "blue" : "red");
          const role: Role = mode === "solo" ? "striker" : (index % 2 === 0 ? "striker" : "guardian");
          const botId = `bot-${Date.now()}-${index}`;
          const bot = createBot(botId, team, role, roomId);
          room.players.set(botId, bot);
        }
        
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
        
        console.log(`Match created: ${roomId} with ${room.players.size} players (${playerData.length} human, ${room.players.size - playerData.length} bots)`);
        
        setTimeout(() => {
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
            const words = getRandomElementalWords(6);
            player.currentWords = words as any;
            if (isBot(player)) {
              startBotTyping(player, room, io);
            }
          });

          console.log(`Match auto-started in room ${roomId}`);
        }, 1000);
      }, 2000);
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
          matchStartTime: 0,
          botTimers: [],
          adminSettings: {
            unlimitedEnemyHealth: false,
            enemyBarrierElement: null,
            enemyBarrierStrength: 100,
            godMode: false,
            instantCharge: false,
            controlledTeam: null,
            gameSpeedMultiplier: 1.0
          }
        };
        rooms.set(roomId, room);
      }

      let team: Team;
      let role: Role;
      let replacedBot: BotPlayer | null = null;

      if (room.players.size >= 4) {
        const botInRoom = Array.from(room.players.values()).find(p => isBot(p));
        
        if (!botInRoom) {
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
        
        replacedBot = botInRoom as BotPlayer;
        team = replacedBot.team!;
        role = replacedBot.role!;
        
        if (replacedBot && replacedBot.typingTimeout) {
          clearTimeout(replacedBot.typingTimeout);
          room.botTimers = room.botTimers.filter(t => t !== replacedBot!.typingTimeout);
        }
        
        room.players.delete(replacedBot.id);
        console.log(`Replacing bot ${replacedBot.nickname} with human player ${nickname}`);
      } else {
        const playerCount = room.players.size;
        team = playerCount < 2 ? "blue" : "red";
        role = playerCount % 2 === 0 ? "striker" : "guardian";
      }

      const isAdmin = nickname.toLowerCase().startsWith('admin');
      const player: Player = {
        id: socket.id,
        nickname,
        team,
        role,
        roomId,
        elementCharges: isAdmin ? { fire: 100, water: 100, leaf: 100 } : { fire: 0, water: 0, leaf: 0 },
        stats: {
          wordsTyped: 0,
          correctWords: 0,
          incorrectWords: 0,
          damageDealt: 0,
          shieldRestored: 0,
          startTime: 0
        },
        currentWords: [],
        isAdmin
      };

      room.players.set(socket.id, player);
      socket.join(roomId);

      while (room.players.size < 4) {
        const index = room.players.size;
        const botTeam: Team = index < 2 ? "blue" : "red";
        const botRole: Role = index % 2 === 0 ? "striker" : "guardian";
        const botId = `bot-${Date.now()}-${index}`;
        const bot = createBot(botId, botTeam, botRole, roomId);
        room.players.set(botId, bot);
      }

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

      console.log(`${nickname} joined room ${roomId} as ${team} ${role} (filled with ${room.players.size - 1} bots)`);
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
        const words = getRandomElementalWords(6);
        player.currentWords = words as any;
        if (isBot(player)) {
          startBotTyping(player, room, io);
        }
      });

      console.log(`Match started in room ${roomId}`);
    });

    socket.on("player_ready", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player) return;

      if (player.currentWords.length === 0) {
        const words = getRandomElementalWords(6);
        player.currentWords = words as any;
      }

      socket.emit("new_words", { words: player.currentWords });
      console.log(`Sent words to ${player.nickname} on ready: ${player.currentWords.map((w: any) => w.word).join(', ')}`);
    });


    socket.on("word_typed", ({ roomId, word }: { roomId: string; word: string }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== "playing") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      const wordUpper = word.toUpperCase().trim();
      const matchedWord = player.currentWords.find((w: any) => w.word === wordUpper);

      player.stats.wordsTyped++;

      if (!matchedWord) {
        player.stats.incorrectWords++;
        socket.emit("word_invalid");
        return;
      }

      player.stats.correctWords++;

      const { element, isCharge } = matchedWord as any;
      const elementType = element as Element;
      
      // Update element charge (admin mode keeps charges at 100)
      if (!player.isAdmin) {
        const chargeIncrease = isCharge ? 30 : 10;
        player.elementCharges[elementType] = Math.min(100, player.elementCharges[elementType] + chargeIncrease);
      }
      
      // Non-charge words deal small damage to enemy
      const myTeamState = player.team === "blue" ? room.blueTeam : room.redTeam;
      const enemyTeam = player.team === "blue" ? "red" : "blue";
      const enemyState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;
      
      if (!isCharge) {
        // Small damage: 3 HP to enemy
        let damage = 3;
        
        // If enemy has a barrier, damage it first
        if (enemyState.barrier) {
          const barrierDamage = Math.min(damage, enemyState.barrier.strength);
          enemyState.barrier.strength -= barrierDamage;
          damage -= barrierDamage;
          
          if (enemyState.barrier.strength <= 0) {
            enemyState.barrier = null;
          }
        }
        
        // Apply remaining damage to HP
        if (damage > 0) {
          enemyState.hp = Math.max(0, enemyState.hp - damage);
        }
        
        player.stats.damageDealt += 3;
      }

      const newWords = getRandomElementalWords(6);
      player.currentWords = newWords as any;
      socket.emit("new_words", { words: newWords });
      socket.emit("word_correct", { element, isCharge });
      
      // Broadcast element charges to all players in the room
      const playerCharges = Array.from(room.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        role: p.role,
        charges: p.isAdmin ? { fire: 100, water: 100, leaf: 100 } : p.elementCharges
      }));
      io.to(roomId).emit("element_charges_update", { playerCharges });
      
      // If non-charge word dealt damage, notify teams
      if (!isCharge) {
        io.to(roomId).emit("small_boost", {
          team: player.team,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });
        
        // Check if enemy HP is now zero
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
      }
    });

    socket.on("use_element", ({ roomId, element, action }: { roomId: string; element: Element; action: 'attack' | 'barrier' }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== "playing") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // Check if player has enough charge (skip for admin mode)
      if (!player.isAdmin && player.elementCharges[element] < 100) {
        socket.emit("not_enough_charge", { element, current: player.elementCharges[element] });
        return;
      }

      // Consume the charge (admin mode keeps charges at 100)
      if (!player.isAdmin) {
        player.elementCharges[element] = 0;
      }

      if (action === 'attack') {
        const enemyTeam = player.team === "blue" ? "red" : "blue";
        const enemyState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;

        let damage = 30;
        let isCritical = false;

        if (enemyState.barrier) {
          const advantage = getElementAdvantage(element, enemyState.barrier.element);
          if (advantage === 'critical') {
            damage = 60;
            isCritical = true;
          } else if (advantage === 'weak') {
            damage = 15;
          }

          const barrierDamage = Math.min(damage, enemyState.barrier.strength);
          enemyState.barrier.strength -= barrierDamage;
          damage -= barrierDamage;

          if (enemyState.barrier.strength <= 0) {
            enemyState.barrier = null;
          }
        }

        if (damage > 0) {
          const adminPlayer = Array.from(room.players.values()).find(p => p.isAdmin);
          const shouldPreventDamage = adminPlayer && 
            adminPlayer.team && 
            enemyTeam === (adminPlayer.team === 'blue' ? 'red' : 'blue') && 
            room.adminSettings.unlimitedEnemyHealth;
          
          if (!shouldPreventDamage) {
            enemyState.hp = Math.max(0, enemyState.hp - damage);
          }
        }

        player.stats.damageDealt += damage;

        io.to(roomId).emit("attack_landed", {
          attackerTeam: player.team,
          element,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          isCritical
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
      } else if (action === 'barrier') {
        const myTeamState = player.team === "blue" ? room.blueTeam : room.redTeam;
        myTeamState.barrier = {
          element,
          strength: 100
        };

        io.to(roomId).emit("barrier_created", {
          team: player.team,
          element,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });
      }
      
      // Broadcast updated element charges after using an element
      const playerCharges = Array.from(room.players.values()).map(p => ({
        id: p.id,
        nickname: p.nickname,
        team: p.team,
        role: p.role,
        charges: p.isAdmin ? { fire: 100, water: 100, leaf: 100 } : p.elementCharges
      }));
      io.to(roomId).emit("element_charges_update", { playerCharges });
    });

    socket.on("player_typing", ({ roomId, keyIndex }: { roomId: string; keyIndex: number }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== "playing") return;

      const player = room.players.get(socket.id);
      if (!player) return;

      // Broadcast typing event to all players in the room
      io.to(roomId).emit("player_typing", { playerId: socket.id, keyIndex });
    });

    socket.on("admin_update_settings", ({ roomId, settings }: { roomId: string; settings: Partial<AdminSettings> }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player || !player.isAdmin) {
        socket.emit("admin_error", { message: "Only admins can update settings" });
        return;
      }

      room.adminSettings = { ...room.adminSettings, ...settings };

      if (settings.enemyBarrierElement !== undefined && player.team) {
        const adminTeam = player.team;
        const enemyTeam = adminTeam === "blue" ? "red" : "blue";
        const enemyTeamState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;
        
        if (settings.enemyBarrierElement === null) {
          enemyTeamState.barrier = null;
        } else {
          enemyTeamState.barrier = {
            element: settings.enemyBarrierElement,
            strength: room.adminSettings.enemyBarrierStrength
          };
        }
      } else if (settings.enemyBarrierStrength !== undefined && player.team) {
        const adminTeam = player.team;
        const enemyTeam = adminTeam === "blue" ? "red" : "blue";
        const enemyTeamState = enemyTeam === "blue" ? room.blueTeam : room.redTeam;
        
        if (enemyTeamState.barrier) {
          enemyTeamState.barrier.strength = settings.enemyBarrierStrength;
        }
      }

      io.to(roomId).emit("admin_settings_updated", { 
        adminSettings: room.adminSettings,
        blueTeam: room.blueTeam,
        redTeam: room.redTeam
      });
    });

    socket.on("admin_control_bot", ({ roomId, botId, action }: { roomId: string; botId: string; action: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (!player || !player.isAdmin) return;

      const bot = room.players.get(botId);
      if (!bot || !isBot(bot)) return;

      if (action === 'trigger_attack') {
        const botTeamState = bot.team === "blue" ? room.blueTeam : room.redTeam;
        const enemyTeamState = bot.team === "blue" ? room.redTeam : room.blueTeam;
        
        const elements: Element[] = ['fire', 'water', 'leaf'];
        const element = elements[Math.floor(Math.random() * elements.length)];
        
        bot.elementCharges[element] = 100;
        
        let damage = 15;
        if (enemyTeamState.barrier && enemyTeamState.barrier.element === element) {
          damage = Math.floor(damage * 0.5);
          enemyTeamState.barrier.strength = Math.max(0, enemyTeamState.barrier.strength - 30);
          if (enemyTeamState.barrier.strength === 0) {
            enemyTeamState.barrier = null;
          }
        } else if (enemyTeamState.barrier) {
          const barrierElement = enemyTeamState.barrier.element;
          if ((element === 'fire' && barrierElement === 'leaf') || 
              (element === 'water' && barrierElement === 'fire') || 
              (element === 'leaf' && barrierElement === 'water')) {
            damage = Math.floor(damage * 1.5);
            enemyTeamState.barrier.strength = Math.max(0, enemyTeamState.barrier.strength - 50);
            if (enemyTeamState.barrier.strength === 0) {
              enemyTeamState.barrier = null;
            }
          }
        }

        if (enemyTeamState.shield > 0) {
          const shieldDamage = Math.min(enemyTeamState.shield, damage);
          enemyTeamState.shield -= shieldDamage;
          damage -= shieldDamage;
        }
        
        if (damage > 0) {
          const adminPlayer = Array.from(room.players.values()).find(p => p.isAdmin);
          const botEnemyTeam = bot.team === 'blue' ? 'red' : 'blue';
          const shouldPreventDamage = adminPlayer && 
            adminPlayer.team && 
            botEnemyTeam === (adminPlayer.team === 'blue' ? 'red' : 'blue') && 
            room.adminSettings.unlimitedEnemyHealth;
          
          if (!shouldPreventDamage) {
            enemyTeamState.hp = Math.max(0, enemyTeamState.hp - damage);
          }
        }

        bot.elementCharges[element] = 0;

        io.to(roomId).emit("attack_executed", {
          attackerId: botId,
          element,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam,
          damage,
          attackerTeam: bot.team
        });
      } else if (action === 'trigger_barrier') {
        const adminPlayer = Array.from(room.players.values()).find(p => p.isAdmin);
        const adminEnemyTeam = adminPlayer?.team === 'blue' ? 'red' : 'blue';
        const isEnemyBot = adminPlayer?.team && bot.team === adminEnemyTeam;
        
        let element: Element;
        if (isEnemyBot && room.adminSettings.enemyBarrierElement) {
          element = room.adminSettings.enemyBarrierElement;
        } else {
          const elements: Element[] = ['fire', 'water', 'leaf'];
          element = elements[Math.floor(Math.random() * elements.length)];
        }
        
        bot.elementCharges[element] = 100;
        
        const botTeamState = bot.team === "blue" ? room.blueTeam : room.redTeam;
        const barrierStrength = isEnemyBot && room.adminSettings.enemyBarrierStrength !== undefined 
          ? room.adminSettings.enemyBarrierStrength 
          : 100;
        
        botTeamState.barrier = {
          element,
          strength: barrierStrength
        };

        bot.elementCharges[element] = 0;

        io.to(roomId).emit("barrier_created", {
          team: bot.team,
          element,
          blueTeam: room.blueTeam,
          redTeam: room.redTeam
        });
      }
    });

    socket.on("leave_match", ({ roomId }: { roomId: string }) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.get(socket.id);
      const wasSpectator = room.spectators.has(socket.id);
      
      if (player) {
        room.players.delete(socket.id);
        socket.leave(roomId);
      } else if (wasSpectator) {
        room.spectators.delete(socket.id);
        socket.leave(roomId);
      }
      
      if (player || wasSpectator) {

        if (room.players.size === 0 && room.spectators.size === 0) {
          room.botTimers.forEach(t => clearTimeout(t));
          room.botTimers = [];
          rooms.delete(roomId);
        } else {
          const playersList = Array.from(room.players.values()).map(p => ({
            id: p.id,
            nickname: p.nickname,
            team: p.team,
            role: p.role
          }));

          if (player) {
            io.to(roomId).emit("player_left", {
              playerId: socket.id,
              nickname: player.nickname
            });
          }

          io.to(roomId).emit("room_update", {
            players: playersList,
            canStart: room.players.size >= 2,
            phase: room.phase
          });
        }

        socket.emit("left_match", { success: true });
      }
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
            room.botTimers.forEach(t => clearTimeout(t));
            room.botTimers = [];
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
            room.botTimers.forEach(t => clearTimeout(t));
            room.botTimers = [];
            rooms.delete(roomId);
          }
        }
      });
    });
  });

  return httpServer;
}
