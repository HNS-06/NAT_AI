import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, X, FileText, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useUploadFile, useAddMessage } from '../hooks/useQueries';
import type { FileType, MessageType, Message } from '../types';

interface FileUploaderProps {
  onClose: () => void;
  conversationId: string | null;
}

export default function FileUploader({ onClose, conversationId }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadFile = useUploadFile();
  const addMessage = useAddMessage();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const getFileType = (file: File): FileType => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const handleUpload = async () => {
    if (!selectedFile || !conversationId) return;

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;

      await uploadFile.mutateAsync({
        file: uint8Array,
        fileName: selectedFile.name,
        fileType: getFileType(selectedFile),
      });

      const messageType: MessageType = selectedFile.type.startsWith('image/')
        ? 'image'
        : 'file';

      const message: Message = {
        id: `msg_${Date.now()}`,
        sender: 'user',
        content: `[${selectedFile.type.startsWith('image/') ? 'Image' : 'File'}: ${selectedFile.name}]`,
        timestamp: new Date().toISOString(),
        messageType,
      };

      await addMessage.mutateAsync({ conversationId, message });

      toast.success('File uploaded successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to upload file');
      console.error(error);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg backdrop-blur-xl bg-card/95">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
          <DialogDescription>
            Upload an image, document, or other file to share with Nat
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!selectedFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-accent/20 transition-all"
            >
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-20 h-20 opacity-70 text-primary" />
                <div>
                  <p className="font-medium">Click to upload</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Images, PDFs, documents, and more
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative backdrop-blur-sm bg-accent/30 rounded-xl p-4 border border-border/50">
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-8 w-8 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>

                {preview ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-64 rounded-lg object-contain"
                    />
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpload}
                className="w-full rounded-full"
                disabled={uploadFile.isPending || addMessage.isPending}
              >
                {uploadFile.isPending || addMessage.isPending ? 'Uploading...' : 'Upload & Send'}
              </Button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
