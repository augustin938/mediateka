import {
  pgTable,
  text,
  timestamp,
  integer,
  pgEnum,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const mediaTypeEnum = pgEnum("media_type", ["movie", "book", "game"]);

export const collectionStatusEnum = pgEnum("collection_status", [
  "WANT",
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
]);

export const chatMessageTypeEnum = pgEnum("chat_message_type", ["text", "share"]);

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  pinnedItems: text("pinned_items").array().default([]),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const mediaItems = pgTable(
  "media_item",
  {
    id: text("id").primaryKey(),
    externalId: varchar("external_id", { length: 100 }).notNull(),
    type: mediaTypeEnum("type").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    description: text("description"),
    posterUrl: text("poster_url"),
    year: integer("year"),
    genres: text("genres").array().default([]),
    externalRating: text("external_rating"),
    externalUrl: text("external_url"),
    director: text("director"),
    author: text("author"),
    developer: text("developer"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    externalIdx: uniqueIndex("media_item_external_idx").on(t.externalId, t.type),
  })
);

export const collectionItems = pgTable(
  "collection_item",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaItemId: text("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    status: collectionStatusEnum("status").notNull().default("WANT"),
    rating: integer("rating"),
    review: text("review"),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userMediaIdx: uniqueIndex("collection_user_media_idx").on(
      t.userId,
      t.mediaItemId
    ),
  })
);

export const friendships = pgTable("friendship", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  requesterId: text("requester_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  addresseeId: text("addressee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const quizResults = pgTable("quiz_result", {
  id:         text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:     text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mode:       text("mode").notNull(), // Режим квиза: classic или endless.
  category:   text("category").notNull().default("all"), // Фильтр категории: all/movie/book/game.
  score:      integer("score").notNull(), // Поле оставлено для обратной совместимости старых записей.
  points:     integer("points"),
  correctAnswers: integer("correct_answers"),
  total:      integer("total").notNull(), // Количество вопросов в попытке.
  streak:     integer("streak").notNull().default(0), // Лучшая серия правильных ответов.
  createdAt:  timestamp("created_at").notNull().defaultNow(),
});

export const activityLogs = pgTable("activity_log", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  mediaTitle: text("media_title").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  posterUrl: text("poster_url"),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  collectionItems: many(collectionItems),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const mediaItemsRelations = relations(mediaItems, ({ many }) => ({
  collectionItems: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  user: one(users, { fields: [collectionItems.userId], references: [users.id] }),
  mediaItem: one(mediaItems, { fields: [collectionItems.mediaItemId], references: [mediaItems.id] }),
}));

export const notifications = pgTable("notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // Тип уведомления: заявка, подтверждение или достижение.
  title: text("title").notNull(),
  body: text("body").notNull(),
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const tags = pgTable("tag", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  userTagIdx: uniqueIndex("tag_user_name_idx").on(t.userId, t.name),
}));

export const collectionItemTags = pgTable("collection_item_tag", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  collectionItemId: text("collection_item_id").notNull().references(() => collectionItems.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
}, (t) => ({
  uniqueIdx: uniqueIndex("collection_item_tag_idx").on(t.collectionItemId, t.tagId),
}));

export const chatConversations = pgTable("chat_conversation", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userAId: text("user_a_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userBId: text("user_b_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
}, (t) => ({
  uniquePairIdx: uniqueIndex("chat_conversation_pair_idx").on(t.userAId, t.userBId),
}));

export const chatMessages = pgTable("chat_message", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text("conversation_id").notNull().references(() => chatConversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: chatMessageTypeEnum("type").notNull().default("text"),
  text: text("text"),
  sharedCollectionItemId: text("shared_collection_item_id").references(() => collectionItems.id, { onDelete: "set null" }),
  // Snapshot for shares, so chat doesn't break if collection item changes/deletes.
  sharedTitle: text("shared_title"),
  sharedType: mediaTypeEnum("shared_type"),
  sharedYear: integer("shared_year"),
  sharedPosterUrl: text("shared_poster_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  deletedAt: timestamp("deleted_at"),
  deletedByUserId: text("deleted_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const chatMessageReactions = pgTable("chat_message_reaction", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text("message_id").notNull().references(() => chatMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  emoji: varchar("emoji", { length: 32 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => ({
  uniqueIdx: uniqueIndex("chat_message_reaction_unique_idx").on(t.messageId, t.userId, t.emoji),
}));

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type MediaItem = typeof mediaItems.$inferSelect;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
export type MediaType = "movie" | "book" | "game";
export type CollectionStatus = "WANT" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";

export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatMessageReaction = typeof chatMessageReactions.$inferSelect;