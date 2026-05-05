export type Role = "user" | "admin";

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: Role;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Note {
  id: string;
  ownerId: string;
  ownerUsername: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  sharedWith: { id: string; username: string }[];
  attachment: Attachment | null;
}

export interface NoteListItem {
  id: string;
  title: string;
  ownerUsername: string;
  updatedAt: string;
  shared: boolean;
}

export interface ApiError {
  error: string;
  message: string;
}
