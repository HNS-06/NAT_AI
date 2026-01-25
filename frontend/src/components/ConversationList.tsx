import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2, Trash } from 'lucide-react';
import type { Conversation } from '../types';
import { useDeleteConversation, useClearAllConversations } from '../hooks/useQueries';
import { toast } from 'sonner';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
}

export default function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: ConversationListProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const deleteConversation = useDeleteConversation();
  const clearAllConversations = useClearAllConversations();

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        await deleteConversation.mutateAsync(id);
        toast.success('Conversation deleted');
        if (currentConversationId === id) {
          onSelectConversation(''); // Deselect if current
        }
      } catch (error) {
        toast.error('Failed to delete conversation');
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete ALL conversations? This cannot be undone.')) {
      try {
        await clearAllConversations.mutateAsync();
        toast.success('All conversations deleted');
        onSelectConversation('');
      } catch (error) {
        toast.error('Failed to clear conversations');
      }
    }
  };

  return (
    <Card className="backdrop-blur-xl bg-card/20 border-border/20 shadow-xl h-full rounded-none sm:rounded-none border-0 sm:border-r">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Conversations</CardTitle>
          <div className="flex items-center gap-1">
            {conversations.length > 0 && (
              <Button
                onClick={handleClearAll}
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                title="Clear all"
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={onNewConversation}
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-16rem)] lg:h-[calc(100vh-14rem)]">
          <div className="space-y-1 p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <Button
                  onClick={onNewConversation}
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-full"
                >
                  Start chatting
                </Button>
              </div>
            ) : (
              conversations.map((conv) => {
                const lastMessage = conv.messages[conv.messages.length - 1];
                const preview = lastMessage?.content.slice(0, 30) || 'New conversation';
                const isActive = conv.id === currentConversationId;

                return (
                  <div
                    key={conv.id}
                    className={`w-full group flex items-center justify-between p-2 rounded-lg transition-all ${isActive
                      ? 'bg-accent/70 backdrop-blur-sm border border-border/50 shadow-sm'
                      : 'hover:bg-accent/30'
                      }`}
                  >
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="flex-1 flex items-start gap-3 min-w-0 text-left"
                    >
                      <MessageSquare className={`h-4 w-4 mt-1 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground conversation-preview-active' : 'text-foreground/80'}`}>
                          {preview}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDate(conv.lastActive)}
                        </p>
                      </div>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, conv.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
