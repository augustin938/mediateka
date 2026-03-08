"use client";

import { MEDIA_TYPE_ICONS, STATUS_COLORS, STATUS_LABELS } from "@/types";
import type { SearchResultItem } from "@/types";
import { cn } from "@/lib/utils";

interface MediaCardProps {
  item: SearchResultItem;
  onClick: () => void;
}

export default function MediaCard({ item, onClick }: MediaCardProps) {
  return (
    <button
      onClick={onClick}
      className="group text-left glass rounded-xl overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/20 transition-all duration-300 w-full"
    >
      {/* Poster */}
      <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-50">
              {MEDIA_TYPE_ICONS[item.type]}
            </span>
          </div>
        )}

        {/* Type badge */}
        <div className="absolute top-2 left-2 text-base bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5">
          {MEDIA_TYPE_ICONS[item.type]}
        </div>

        {/* In collection indicator */}
        {item.inCollection && (
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <span className="text-xs font-medium text-white/90">Подробнее →</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <p className="text-sm font-semibold font-display leading-tight line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center justify-between gap-1">
          {item.year && (
            <span className="text-xs text-muted-foreground">{item.year}</span>
          )}
          {item.externalRating && (
            <span className="text-xs text-amber-400 ml-auto">
              ★ {item.externalRating.split("/")[0]}
            </span>
          )}
        </div>
        {item.inCollection && item.collectionStatus && (
          <span
            className={cn(
              "inline-block text-xs px-2 py-0.5 rounded-full border",
              STATUS_COLORS[item.collectionStatus]
            )}
          >
            {STATUS_LABELS[item.collectionStatus]}
          </span>
        )}
      </div>
    </button>
  );
}
