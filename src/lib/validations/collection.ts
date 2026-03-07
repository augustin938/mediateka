import { z } from "zod";

export const collectionStatusSchema = z.enum([
  "WANT",
  "IN_PROGRESS",
  "COMPLETED",
  "DROPPED",
]);

export const addToCollectionSchema = z.object({
  mediaItemId: z.string().min(1),
  status: collectionStatusSchema.default("WANT"),
  // Media item data to cache
  externalId: z.string().min(1),
  type: z.enum(["movie", "book", "game"]),
  title: z.string().min(1),
  originalTitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  posterUrl: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  genres: z.array(z.string()).optional(),
  externalRating: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
  director: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  developer: z.string().nullable().optional(),
});

export const updateCollectionItemSchema = z.object({
  status: collectionStatusSchema.optional(),
  rating: z.number().int().min(1).max(10).nullable().optional(),
  review: z.string().max(2000).nullable().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().min(3).max(200),
  type: z.enum(["all", "movie", "book", "game"]).default("all"),
});

export const registerSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type AddToCollectionInput = z.infer<typeof addToCollectionSchema>;
export type UpdateCollectionItemInput = z.infer<
  typeof updateCollectionItemSchema
>;
export type SearchQuery = z.infer<typeof searchQuerySchema>;
