import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, MessageCircle, X } from 'lucide-react';
import { getPersonality } from '@/lib/data/laptop-personalities';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'companion';
  timestamp: number;
}

interface LaptopCompanionChatProps {
  laptopId: string;
  onClose?: () => void;
}

const COMPANION_TIPS = [
  "Type faster by focusing on accuracy first, speed will come naturally!",
  "Keep your eyes on the screen, not the keyboard. Trust your muscle memory!",
  "Take short breaks to maintain your typing speed throughout the match.",
  "Practice the same words multiple times to build muscle memory.",
  "Proper posture helps! Keep your wrists straight and fingers curved.",
  "Don't look at the keyboard! It slows you down significantly.",
  "Rhythm is key - find a steady pace that works for you.",
  "Common words like 'the', 'and', 'for' should be automatic for you!",
  "Stay calm under pressure - panicking leads to more mistakes.",
  "The more you play, the better you'll get. Keep practicing!"
];

const ENCOURAGEMENT = [
  "You're doing great! Keep it up!",
  "I believe in you! Victory is within reach!",
  "Your typing is improving every match!",
  "That's the spirit! Keep pushing forward!",
  "You've got this! Stay focused!",
  "Excellent work! You're on fire!",
  "Amazing! Your skills are showing!",
  "Keep going! You're unstoppable!",
  "Fantastic performance! I'm proud of you!",
  "You're a natural! Keep typing!"
];

const GREETINGS = [
  "Hey there! Ready to dominate the arena?",
  "Welcome back, champion!",
  "Hi! Let's type our way to victory!",
  "Greetings! I'm here to help you win!",
  "Hello! Ready for another battle?"
];

export function LaptopCompanionChat({ laptopId, onClose }: LaptopCompanionChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const personality = getPersonality(laptopId);

  useEffect(() => {
    const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    addCompanionMessage(greeting);
    
    setTimeout(() => {
      addCompanionMessage("I'm your battle companion! Ask me for typing tips, encouragement, or just chat with me!");
    }, 1500);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addCompanionMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'companion',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const getCompanionResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('tip') || lowerMessage.includes('help') || lowerMessage.includes('advice')) {
      return COMPANION_TIPS[Math.floor(Math.random() * COMPANION_TIPS.length)];
    }

    if (lowerMessage.includes('encourage') || lowerMessage.includes('motivation') || lowerMessage.includes('nervous') || lowerMessage.includes('scared')) {
      return ENCOURAGEMENT[Math.floor(Math.random() * ENCOURAGEMENT.length)];
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return personality.clickResponses[Math.floor(Math.random() * personality.clickResponses.length)];
    }

    if (lowerMessage.includes('who are you') || lowerMessage.includes('what are you')) {
      return `I'm your ${personality.personality} battle companion! I'm here to help you become a typing champion!`;
    }

    if (lowerMessage.includes('how') && lowerMessage.includes('win')) {
      return "To win, focus on accuracy and speed! Type the words correctly as fast as you can. Your typing charges your power and damages enemies!";
    }

    if (lowerMessage.includes('strategy') || lowerMessage.includes('tactic')) {
      return "Smart strategy: Focus on accuracy first, then speed. Use your power-ups wisely, and keep an eye on your opponent's health!";
    }

    if (lowerMessage.includes('thank')) {
      return "You're welcome! I'm always here to help you succeed!";
    }

    if (lowerMessage.includes('game') || lowerMessage.includes('match') || lowerMessage.includes('battle')) {
      return "Every battle is a chance to improve! Stay focused, type accurately, and victory will be yours!";
    }

    const responses = [
      ...personality.clickResponses,
      "That's interesting! Tell me more!",
      "I'm here to support you in every battle!",
      "Let's focus on winning together!",
      "Your typing skills are impressive!",
      "Keep practicing and you'll be unstoppable!"
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const response = getCompanionResponse(input);
      addCompanionMessage(response);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full bg-slate-900/95 border-slate-700 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Battle Companion Chat</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}
            >
              {message.sender === 'companion' && (
                <div className="text-xs text-slate-400 mb-1">💻 Companion</div>
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask for tips, encouragement, or just chat..."
            className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Try: "Give me a tip" or "I need encouragement" or "How to win?"
        </p>
      </div>
    </Card>
  );
}
