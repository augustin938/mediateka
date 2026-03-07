# Mediateka - Project Structure

mediateka/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Dashboard with search
│   │   │   ├── collection/page.tsx   # My Collection
│   │   │   └── profile/page.tsx      # User Profile
│   │   ├── api/
│   │   │   ├── auth/[...all]/route.ts
│   │   │   ├── search/route.ts
│   │   │   ├── collection/route.ts
│   │   │   └── collection/[id]/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                  # Landing
│   ├── components/
│   │   ├── ui/                       # shadcn components
│   │   ├── search/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── MediaCard.tsx
│   │   ├── collection/
│   │   │   ├── CollectionGrid.tsx
│   │   │   ├── CollectionItem.tsx
│   │   │   └── StatusBadge.tsx
│   │   ├── modals/
│   │   │   └── MediaDetailModal.tsx
│   │   └── layout/
│   │       ├── Navbar.tsx
│   │       └── Sidebar.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle schema
│   │   │   └── index.ts              # DB connection
│   │   ├── auth/
│   │   │   └── index.ts              # Better Auth config
│   │   ├── api/
│   │   │   ├── tmdb.ts
│   │   │   ├── openLibrary.ts
│   │   │   └── rawg.ts
│   │   └── validations/
│   │       └── collection.ts         # Zod schemas
│   └── types/
│       └── index.ts
├── drizzle/
│   └── migrations/
├── drizzle.config.ts
├── .env.example
└── package.json
