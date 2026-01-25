import { useState, useEffect, useRef } from 'react';
import { useGetUserConversations, useGetConversation, useCreateConversation, useAddMessage } from '../hooks/useQueries';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Send, Mic, Image as ImageIcon, Paperclip, PanelLeft, Sparkles, Check } from 'lucide-react';
import MessageBubble from './MessageBubble';
import VoiceRecorder from './VoiceRecorder';
import FileUploader from './FileUploader';
import ConversationList from './ConversationList';
import { toast } from 'sonner';
import { MessageType, type Message } from '../types';

const PERSONALITY_MODES = [
  { id: 'default', name: 'Friendly', description: 'Helpful & Witty' },
  { id: 'professional', name: 'Professional', description: 'Concise & Formal' },
  { id: 'creative', name: 'Creative', description: 'Imaginative & Colorful' },
  { id: 'coder', name: 'Coder', description: 'Technical & Optimized' },
];

export default function ChatInterface() {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMode, setSelectedMode] = useState('default');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useGetUserConversations();
  const { data: currentConversation } = useGetConversation(currentConversationId);
  const createConversation = useCreateConversation();
  const addMessage = useAddMessage();

  // No longer locking to first conversation automatically
  // User starts fresh or selects one.

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConversation?.messages]);

  const handleNewConversation = async () => {
    const newId = `conv_${Date.now()}`;
    try {
      await createConversation.mutateAsync(newId);
      setCurrentConversationId(newId);
      toast.success('New conversation started');
    } catch (error) {
      toast.error('Failed to create conversation');
      console.error(error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    let conversationId = currentConversationId;

    if (!conversationId) {
      // Auto-create conversation
      conversationId = `conv_${Date.now()}`;
      try {
        await createConversation.mutateAsync(conversationId);
        setCurrentConversationId(conversationId);
      } catch (error) {
        toast.error('Failed to start conversation');
        console.error(error);
        return;
      }
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: inputMessage.trim(),
      timestamp: new Date().toISOString(),
      messageType: 'text',
    };

    try {
      setInputMessage('');
      setIsTyping(true);

      await addMessage.mutateAsync({
        conversationId,
        message: userMessage,
        mode: selectedMode,
      });

      setIsTyping(false);
    } catch (error) {
      toast.error('Failed to send message');
      console.error(error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-5rem)] w-full relative">
      <div className="absolute left-4 top-4 z-10">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full shadow-lg backdrop-blur-md bg-background/50 border-border/50">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0 backdrop-blur-2xl bg-background/20 border-r border-border/30">
            <ConversationList
              conversations={conversations}
              currentConversationId={currentConversationId}
              onSelectConversation={(id) => setCurrentConversationId(id)}
              onNewConversation={handleNewConversation}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 content-center flex flex-col overflow-hidden relative">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4 max-w-5xl mx-auto pt-10">
            {(!currentConversation || currentConversation.messages.length === 0) && (
              <div className="text-center py-12 space-y-4">
                <img
                  src="/assets/logo.png"
                  alt="Nat"
                  className="w-24 h-24 mx-auto opacity-80"
                />
                <p className="text-muted-foreground text-lg">How can I help you today?</p>
              </div>
            )}

            {currentConversation?.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center flex-shrink-0">
                  <img
                    src="/assets/logo.png"
                    alt="Nat"
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div className="backdrop-blur-xl bg-accent/50 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/20 p-4 bg-background/20 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your message..."
                  className="min-h-[60px] max-h-[200px] resize-none backdrop-blur-sm bg-background/40 rounded-2xl pr-12 focus-visible:ring-primary/50"
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || addMessage.isPending}
                size="icon"
                className="h-[60px] w-[60px] rounded-full bg-gradient-to-r from-primary to-chart-1 hover:opacity-90 transition-opacity flex-shrink-0 shadow-lg shadow-primary/20"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-center sm:justify-start relative">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="rounded-full gap-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
                >
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="hidden sm:inline">{PERSONALITY_MODES.find(m => m.id === selectedMode)?.name}</span>
                </Button>
                {showModeSelector && (
                  <div className="absolute bottom-full mb-2 left-0 w-48 p-1 rounded-xl bg-popover border border-border/50 shadow-xl backdrop-blur-xl z-20 animate-in slide-in-from-bottom-2">
                    <div className="space-y-1">
                      {PERSONALITY_MODES.map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => {
                            setSelectedMode(mode.id);
                            setShowModeSelector(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${selectedMode === mode.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
                        >
                          <span>{mode.name}</span>
                          {selectedMode === mode.id && <Check className="h-3 w-3" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVoiceRecorder(true)}
                className="rounded-full gap-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
              >
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Voice</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUploader(true)}
                className="rounded-full gap-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Image</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUploader(true)}
                className="rounded-full gap-2 border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50"
              >
                <Paperclip className="h-4 w-4" />
                <span className="hidden sm:inline">File</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {
        showVoiceRecorder && (
          <VoiceRecorder
            onClose={() => setShowVoiceRecorder(false)}
            conversationId={currentConversationId}
          />
        )
      }

      {
        showFileUploader && (
          <FileUploader
            onClose={() => setShowFileUploader(false)}
            conversationId={currentConversationId}
          />
        )
      }
    </div >
  );
}
