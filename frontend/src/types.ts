export type UserProfile = {
    id: string;
    name: string;
    preferences: {
        voiceEnabled: boolean;
        theme: string;
        language: string;
        notifications: boolean;
    };
};

export type MessageType = 'text' | 'image' | 'voice' | 'file' | 'systemMessage';

export type Message = {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    messageType: MessageType;
};

export type Conversation = {
    id: string;
    user: string;
    messages: Message[];
    startTime: string;
    lastActive: string;
};

export type FileType = 'image' | 'document' | 'audio' | 'video';

export type UploadedFile = {
    id: string;
    user: string;
    fileName: string;
    path: string;
    fileType: FileType;
    uploadTime: string;
};
