import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
import { useAddMessage } from '../hooks/useQueries';
import { MessageType, type Message } from '../types';

interface VoiceRecorderProps {
  onClose: () => void;
  conversationId: string | null;
}

export default function VoiceRecorder({ onClose, conversationId }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const addMessage = useAddMessage();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioURL) URL.revokeObjectURL(audioURL);
    };
  }, [audioURL]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Failed to access microphone');
      console.error(error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioURL) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSend = async () => {
    if (!conversationId || !audioURL) return;

    const message: Message = {
      id: `msg_${Date.now()}`,
      sender: 'user',
      content: '[Voice message]',
      timestamp: new Date().toISOString(),
      messageType: 'voice',
    };

    try {
      await addMessage.mutateAsync({ conversationId, message });
      toast.success('Voice message sent');
      onClose();
    } catch (error) {
      toast.error('Failed to send voice message');
      console.error(error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle>Voice Message</DialogTitle>
          <DialogDescription>
            Record a voice message to send to Nat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-chart-1 flex items-center justify-center ${isRecording ? 'animate-pulse' : ''}`}>
                <img
                  src="/assets/nat-avatar.png"
                  alt="Voice"
                  className="w-20 h-20 object-contain"
                />
              </div>
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-destructive animate-ping" />
              )}
            </div>

            <div className="text-center">
              <p className="text-2xl font-mono font-bold">{formatTime(recordingTime)}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isRecording ? 'Recording...' : audioURL ? 'Recording complete' : 'Ready to record'}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            {!audioURL ? (
              <>
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="rounded-full gap-2"
                  >
                    <Mic className="h-5 w-5" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    variant="destructive"
                    className="rounded-full gap-2"
                  >
                    <Square className="h-5 w-5" />
                    Stop Recording
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={togglePlayback}
                  size="lg"
                  variant="outline"
                  className="rounded-full gap-2"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button
                  onClick={handleSend}
                  size="lg"
                  className="rounded-full gap-2"
                  disabled={addMessage.isPending}
                >
                  Send Message
                </Button>
              </>
            )}
          </div>

          {audioURL && (
            <audio
              ref={audioRef}
              src={audioURL}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
