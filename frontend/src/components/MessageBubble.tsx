import type { Message } from '../types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User, Copy, Volume2 } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.sender === 'user';
  const timestamp = new Date(message.timestamp);

  return (
    <div className={`flex items-start gap-3 group ${isUser ? 'flex-row-reverse' : ''}`}>
      <Avatar className={`w-8 h-8 flex-shrink-0 ${isUser ? 'bg-gradient-to-br from-chart-2 to-chart-3' : 'bg-gradient-to-br from-primary to-chart-1'}`}>
        {isUser ? (
          <>
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarImage src="/assets/logo.png" />
            <AvatarFallback>
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`backdrop-blur-xl rounded-2xl px-4 py-3 ${isUser
            ? 'bg-gradient-to-br from-primary/80 to-chart-1/80 text-primary-foreground rounded-tr-sm'
            : 'bg-accent/50 rounded-tl-sm'
            }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => navigator.clipboard.writeText(message.content)} className="p-1 hover:bg-white/10 rounded">
            <Copy className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={() => {
            const u = new SpeechSynthesisUtterance(message.content);
            window.speechSynthesis.speak(u);
          }} className="p-1 hover:bg-white/10 rounded">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground px-2">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
