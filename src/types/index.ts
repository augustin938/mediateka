import type { MediaItem, CollectionItem } from "@/lib/db/schema";

export type MediaType = "movie" | "book" | "game";
export type CollectionStatus = "WANT" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface SearchResultItem extends Omit<MediaItem, "createdAt" | "updatedAt"> {
  inCollection?: boolean;
  collectionStatus?: CollectionStatus;
  collectionItemId?: string | null;
}

export interface CollectionItemWithMedia extends CollectionItem {
  mediaItem: MediaItem;
  tags?: Tag[];
}

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  WANT: "Хочу",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершено",
  DROPPED: "Брошено",
};

export const STATUS_COLORS: Record<CollectionStatus, string> = {
  WANT: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  DROPPED: "bg-red-500/20 text-red-400 border-red-500/30",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "Фильм/Сериал",
  book: "Книга",
  game: "Игра",
};

export const MEDIA_TYPE_ICONS: Record<MediaType, string> = {
  movie: "🎬",
  book: "📚",
  game: "🎮",
};
// ─── Quiz ──────────────────────────────────────────────────────────────────
export type QuizMode     = "classic" | "endless";
export type QuizCategory = "all" | "movie" | "book" | "game";

export interface QuizResult {
  id:        string;
  mode:      QuizMode;
  category:  QuizCategory;
  score:     number;
  total:     number;
  streak:    number;
  createdAt: string;
}

// ─── Friends ───────────────────────────────────────────────────────────────
export interface FriendUser {
  id:               string;
  name:             string;
  email:            string;
  image:            string | null;
  friendshipId?:    string | null;
  friendshipStatus?: string | null;
}

export interface FriendEntry {
  id:          string;
  status:      string;
  requesterId: string;
  addresseeId: string;
  other:       FriendUser;
}

// ─── Notifications ─────────────────────────────────────────────────────────
export interface Notification {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  read:      boolean;
  link:      string | null;
  createdAt: string;
}
