import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfile, Conversation, Message, UploadedFile, FileType } from '../types';

const API_BASE = 'http://localhost:3002/api';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }
  return res.json();
}

export function useGetCallerUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: () => fetchAPI<UserProfile | null>('/profile'),
    retry: false,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => fetchAPI('/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useGetUserConversations() {
  return useQuery<Conversation[]>({
    queryKey: ['userConversations'],
    queryFn: () => fetchAPI<Conversation[]>('/conversations'),
  });
}

export function useGetConversation(conversationId: string | null) {
  return useQuery<Conversation | null>({
    queryKey: ['conversation', conversationId],
    queryFn: () => {
      if (!conversationId) return null;
      return fetchAPI<Conversation | null>(`/conversations/${conversationId}`);
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => fetchAPI('/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: conversationId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userConversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => fetchAPI(`/conversations/${conversationId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userConversations'] });
    },
  });
}

export function useClearAllConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => fetchAPI('/conversations', {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userConversations'] });
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, message, mode, fileId }: { conversationId: string; message: Message; mode?: string; fileId?: string }) =>
      fetchAPI(`/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, mode, fileId }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['userConversations'] });
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, fileName, fileType }: { file: Uint8Array<ArrayBuffer>; fileName: string; fileType: FileType }) => {
      const formData = new FormData();
      const blob = new Blob([file]);
      formData.append('file', blob, fileName);
      formData.append('fileType', fileType);

      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploadedFiles'] });
    },
  });
}

export function useGetUploadedFiles() {
  return useQuery<UploadedFile[]>({
    queryKey: ['uploadedFiles'],
    queryFn: () => fetchAPI<UploadedFile[]>('/files'),
  });
}

