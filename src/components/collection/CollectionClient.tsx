"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CollectionItemWithMedia, CollectionStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, MEDIA_TYPE_ICONS } from "@/types";
import { cn } from "@/lib/utils";

// ─── TYPES & CONSTANTS ────────────────────────────────────────────────────────
interface Tag { id: string; name: string; color: string; }
interface CollectionClientProps { initialItems: CollectionItemWithMedia[]; }

const STATUS_FILTERS = ["all", "WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const SORT_OPTIONS = [
  { value: "addedAt", label: "По дате добавления" },
  { value: "rating",  label: "По оценке" },
  { value: "title",   label: "По названию" },
  { value: "year",    label: "По году" },
] as const;

const TYPE_FILTERS = [
  { value: "all",   label: "Все типы" },
  { value: "movie", label: "🎬 Фильмы" },
  { value: "book",  label: "📚 Книги" },
  { value: "game",  label: "🎮 Игры" },
] as const;

const SPINE_COLORS = [
  "from-violet-600 to-violet-800", "from-blue-600 to-blue-800",
  "from-emerald-600 to-emerald-800", "from-amber-600 to-amber-800",
  "from-rose-600 to-rose-800", "from-cyan-600 to-cyan-800",
  "from-indigo-600 to-indigo-800", "from-teal-600 to-teal-800",
];
const SPINE_HEX = ["#7c3aed","#2563eb","#059669","#d97706","#e11d48","#0891b2","#4338ca","#0d9488"];
const TAG_COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#06b6d4"];
const STATUS_BAR_COLORS: Record<CollectionStatus, string> = {
  WANT: "bg-blue-500", IN_PROGRESS: "bg-amber-500", COMPLETED: "bg-emerald-500", DROPPED: "bg-red-500",
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getSpineColorIndex(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % SPINE_COLORS.length;
}
function getSpineColor(id: string) { return SPINE_COLORS[getSpineColorIndex(id)]; }
function getSpineHex(id: string)   { return SPINE_HEX[getSpineColorIndex(id)]; }
function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  if (max === min) return 0;
  const d = max - min; let h = 0;
  if (max===r)      h=((g-b)/d+(g<b?6:0))/6;
  else if (max===g) h=((b-r)/d+2)/6;
  else              h=((r-g)/d+4)/6;
  return h*360;
}
function getBookHeight(id: string, hasPoster: boolean) {
  let hash=0; for (let i=0;i<id.length;i++) hash=id.charCodeAt(i)+((hash<<5)-hash);
  return hasPoster ? 120+(Math.abs(hash)%30) : 90+(Math.abs(hash)%50);
}
function getBookTilt(id: string) {
  let hash=0; for (let i=0;i<id.length;i++) hash=id.charCodeAt(i)+((hash<<5)-hash);
  return (Math.abs(hash)%5)-2;
}
function getBookWidth(id: string, hasPoster: boolean) { return hasPoster ? 52 : 26+(id.charCodeAt(2)%10); }

// ─── STAR RATING ──────────────────────────────────────────────────────────────
function StarRating({ rating, max=10 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({length:max}).map((_,i)=>(
        <svg key={i} className={cn("w-2.5 h-2.5", i<rating?"text-amber-400":"text-muted/40")} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
      <span className="text-[10px] text-amber-400 font-bold ml-1">{rating}/10</span>
    </div>
  );
}

// ─── SHELF VIEW ───────────────────────────────────────────────────────────────
const SHELF_KEY = "shelf_order_v2";
const SHELF_GAP = 3;
const SHELF_PAD = 48;

function loadSavedIds(): string[] {
  if (typeof window==="undefined") return [];
  try { return JSON.parse(localStorage.getItem(SHELF_KEY)??"[]"); } catch { return []; }
}
function applyOrder(src: CollectionItemWithMedia[], ids: string[]): CollectionItemWithMedia[] {
  if (!ids.length) return src;
  const m = new Map(ids.map((id,i)=>[id,i]));
  return [...src].sort((a,b)=>(m.has(a.id)?m.get(a.id)!:9999)-(m.has(b.id)?m.get(b.id)!:9999));
}

interface ShelfProps { items: CollectionItemWithMedia[]; onSelect:(i:CollectionItemWithMedia)=>void; onEdit:(i:CollectionItemWithMedia)=>void; onRemove:(id:string)=>void; }

function ShelfView({ items, onSelect }: ShelfProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const savedIdsRef = useRef(loadSavedIds());
  const [shelfItems, setShelfItems] = useState(()=>applyOrder(items,savedIdsRef.current));
  const [sortByColor, setSortByColor] = useState(false);
  const [dragId,    setDragId]    = useState<string|null>(null);
  const [dragOverId,setDragOverId]= useState<string|null>(null);
  const [hoveredId, setHoveredId] = useState<string|null>(null);
  const [shake,     setShake]     = useState<string|null>(null);
  const dragItem    = useRef<string|null>(null);
  const dragOverItem= useRef<string|null>(null);

  useEffect(()=>{
    const el=containerRef.current; if(!el) return;
    const ro=new ResizeObserver(([e])=>setContainerWidth(e.contentRect.width));
    ro.observe(el); setContainerWidth(el.getBoundingClientRect().width);
    return ()=>ro.disconnect();
  },[]);

  useEffect(()=>{
    setShelfItems(prev=>{
      const prevIds=new Set(prev.map(i=>i.id)), newIds=new Set(items.map(i=>i.id));
      return [...prev.filter(i=>newIds.has(i.id)), ...items.filter(i=>!prevIds.has(i.id))];
    });
  },[items]);

  const saveOrder=(ordered:CollectionItemWithMedia[])=>{
    const ids=ordered.map(i=>i.id); savedIdsRef.current=ids;
    try{localStorage.setItem(SHELF_KEY,JSON.stringify(ids));}catch{}
  };

  const getHue=(item:CollectionItemWithMedia)=>{
    if(item.mediaItem.posterUrl){let h=0;for(let i=0;i<item.mediaItem.posterUrl.length;i++)h=item.mediaItem.posterUrl.charCodeAt(i)+((h<<5)-h);return Math.abs(h)%360;}
    return hexToHue(getSpineHex(item.id));
  };

  const displayItems=useMemo(()=>sortByColor?[...shelfItems].sort((a,b)=>getHue(a)-getHue(b)):shelfItems,[shelfItems,sortByColor]);

  const rows=useMemo(()=>{
    if(!containerWidth) return [displayItems];
    const usable=containerWidth-SHELF_PAD;
    const result:CollectionItemWithMedia[][]=[];
    let row:CollectionItemWithMedia[]=[],rowW=0;
    for(const item of displayItems){
      const w=getBookWidth(item.id,!!item.mediaItem.posterUrl)+SHELF_GAP;
      if(row.length>0 && rowW+w>usable){result.push(row);row=[];rowW=0;}
      row.push(item);rowW+=w;
    }
    if(row.length) result.push(row);
    return result;
  },[displayItems,containerWidth]);

  const onDragStart=(id:string)=>{dragItem.current=id;setDragId(id);};
  const onDragEnter=(id:string)=>{dragOverItem.current=id;setDragOverId(id);};
  const onDragEnd=()=>{
    if(!dragItem.current||!dragOverItem.current||dragItem.current===dragOverItem.current){
      setDragId(null);setDragOverId(null);dragItem.current=dragOverItem.current=null;return;
    }
    const dropped=dragOverItem.current;
    setShelfItems(prev=>{
      const next=[...prev];
      const fi=next.findIndex(i=>i.id===dragItem.current),ti=next.findIndex(i=>i.id===dragOverItem.current);
      if(fi===-1||ti===-1) return prev;
      const [moved]=next.splice(fi,1);next.splice(ti,0,moved);saveOrder(next);return next;
    });
    setShake(dropped);setTimeout(()=>setShake(null),400);
    setDragId(null);setDragOverId(null);dragItem.current=dragOverItem.current=null;
  };

  const inProgress=items.filter(i=>i.status==="IN_PROGRESS");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📚 {items.length} на полке</span>
          {inProgress.length>0&&<span className="text-amber-400">· 📖 читаю {inProgress.length}</span>}
        </div>
        <div className="flex items-center gap-2">
          {sortByColor&&(
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border/50 animate-fade-in">
              <span className="text-xs text-muted-foreground">🌈</span>
              <div className="w-24 h-3 rounded-full" style={{background:"linear-gradient(90deg,#e11d48,#f97316,#eab308,#22c55e,#06b6d4,#2563eb,#7c3aed,#e11d48)"}}/>
            </div>
          )}
          <button onClick={()=>setSortByColor(s=>!s)}
            className={cn("text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
              sortByColor?"bg-primary/20 text-primary border-primary/30":"border-border text-muted-foreground hover:border-primary/30")}>
            🎨 {sortByColor?"Сброс порядка":"По цвету"}
          </button>
          <button onClick={()=>{setShelfItems(items);saveOrder(items);}}
            className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary/30 transition-all" title="Сбросить порядок">↺</button>
        </div>
      </div>

      <div ref={containerRef} className="relative rounded-2xl overflow-visible p-6 pb-0 select-none bg-secondary/60 dark:bg-[#1a1625] border border-border/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"/>
        {rows.map((rowItems,rowIdx)=>(
          <div key={rowIdx} className="mb-2">
            <div className="flex items-end px-2 min-h-[160px]" style={{gap:SHELF_GAP,width:"100%"}}>
              {rowItems.map(item=>{
                const isDragging=dragId===item.id, isOver=dragOverId===item.id&&dragId!==item.id;
                const isHovered=hoveredId===item.id, hasPoster=!!item.mediaItem.posterUrl;
                const bookH=getBookHeight(item.id,hasPoster), bookW=getBookWidth(item.id,hasPoster), tilt=getBookTilt(item.id);
                return (
                  <div key={item.id}
                    className="relative flex-shrink-0 cursor-grab active:cursor-grabbing group/book"
                    style={{width:bookW+(isOver?8:0),transition:"width 0.15s ease"}}
                    draggable onDragStart={()=>onDragStart(item.id)} onDragEnter={()=>onDragEnter(item.id)}
                    onDragEnd={onDragEnd} onDragOver={e=>e.preventDefault()}
                    onMouseEnter={()=>setHoveredId(item.id)} onMouseLeave={()=>setHoveredId(null)}>
                    {isOver&&<div className="absolute left-0 top-4 bottom-4 w-0.5 bg-primary z-20 rounded-full shadow-glow-sm"/>}
                    {item.status==="IN_PROGRESS"&&(
                      <div className="absolute -top-1 right-1 z-10 w-3 h-4 bg-amber-400 rounded-b-sm shadow-md"
                        style={{clipPath:"polygon(0 0,100% 0,100% 80%,50% 100%,0 80%)"}}/>
                    )}
                    <div
                      className={cn("rounded-t-[2px] overflow-hidden origin-bottom",isDragging?"opacity-30 scale-95":"",shake===item.id?"animate-shake":"")}
                      style={{
                        height:bookH,width:bookW,
                        transform:isDragging?"scale(0.95)":isHovered?`translateY(-14px) rotate(${tilt*0.3}deg)`:`rotate(${tilt}deg)`,
                        boxShadow:isHovered&&!isDragging?"4px 0 16px rgba(0,0,0,0.6),-1px 0 4px rgba(0,0,0,0.3)":"2px 0 6px rgba(0,0,0,0.4)",
                        transition:"transform 0.2s cubic-bezier(0.34,1.56,0.64,1),box-shadow 0.2s ease,opacity 0.15s ease",
                      }}
                      onClick={()=>!dragId&&onSelect(item)}>
                      {hasPoster
                        // eslint-disable-next-line @next/next/no-img-element
                        ?<img src={item.mediaItem.posterUrl!} alt={item.mediaItem.title} className="w-full h-full object-cover" draggable={false}/>
                        :<div className={cn("w-full h-full bg-gradient-to-b relative flex items-center justify-center",getSpineColor(item.id))}>
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/15 rounded-r-sm"/>
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-black/20"/>
                          <span className="text-white/90 font-bold text-center px-0.5 leading-tight z-10"
                            style={{fontSize:"7px",writingMode:"vertical-rl",textOrientation:"mixed",transform:"rotate(180deg)",textShadow:"0 1px 2px rgba(0,0,0,0.5)"}}>
                            {item.mediaItem.title}
                          </span>
                        </div>}
                    </div>
                    {isHovered&&!isDragging&&(
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-5 z-30 pointer-events-none animate-fade-in whitespace-nowrap">
                        <div className="glass rounded-lg px-2.5 py-1.5 text-center shadow-xl border border-primary/20">
                          <p className="text-white text-[11px] font-semibold max-w-[140px] truncate">{item.mediaItem.title}</p>
                          <div className="flex items-center justify-center gap-1.5 mt-0.5">
                            {item.mediaItem.year&&<span className="text-white/50 text-[10px]">{item.mediaItem.year}</span>}
                            {item.rating&&<span className="text-amber-400 text-[10px] font-bold">★{item.rating}</span>}
                          </div>
                        </div>
                        <div className="w-2 h-2 bg-card border-r border-b border-primary/20 rotate-45 mx-auto -mt-1"/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="relative">
              <div className="h-5 rounded-sm shadow-lg" style={{background:"linear-gradient(180deg,#a07830 0%,#8B6914 20%,#6B4F10 60%,#4a3508 100%)",boxShadow:"0 6px 16px rgba(0,0,0,0.6),inset 0 1px 0 rgba(255,255,255,0.15),inset 0 -1px 0 rgba(0,0,0,0.3)"}}/>
              <div className="absolute inset-0 opacity-20" style={{background:"repeating-linear-gradient(90deg,transparent,transparent 40px,rgba(0,0,0,0.3) 40px,rgba(0,0,0,0.3) 41px)"}}/>
              <div className="absolute bottom-0 left-0 right-0 h-2 opacity-30" style={{background:"linear-gradient(180deg,rgba(180,140,80,0.3),transparent)"}}/>
            </div>
            <div className="h-2 mx-3 rounded-b-sm opacity-60" style={{background:"linear-gradient(180deg,rgba(0,0,0,0.5),transparent)"}}/>
          </div>
        ))}
        <div className="h-8 -mx-6 rounded-b-2xl" style={{background:"linear-gradient(180deg,rgba(0,0,0,0.15),transparent)"}}/>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Перетаскивай книги чтобы менять порядок · 📖 закладка = читаю сейчас · {rows.length}{" "}
        {rows.length===1?"полка":rows.length<5?"полки":"полок"}
      </p>
    </div>
  );
}

// ─── GRID VIEW ────────────────────────────────────────────────────────────────
interface ViewProps { items:CollectionItemWithMedia[]; onSelect:(i:CollectionItemWithMedia)=>void; onEdit:(i:CollectionItemWithMedia)=>void; onRemove:(id:string)=>void; }

function GridView({ items, onSelect, onEdit, onRemove }: ViewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map(item=>(
        <div key={item.id} className="glass rounded-xl overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20" onClick={()=>onSelect(item)}>
          <div className={cn("h-1 w-full",STATUS_BAR_COLORS[item.status])}/>
          <div className="aspect-[2/3] bg-muted/50 relative overflow-hidden">
            {item.mediaItem.posterUrl
              // eslint-disable-next-line @next/next/no-img-element
              ?<img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy"/>
              :<div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-muted/30">
                <span className="text-4xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                <p className="text-xs text-muted-foreground text-center px-2 leading-tight line-clamp-3">{item.mediaItem.title}</p>
              </div>}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3 gap-2">
              {item.rating&&<StarRating rating={item.rating}/>}
              <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{item.mediaItem.title}</p>
              {item.mediaItem.genres?.length?<p className="text-white/60 text-[10px]">{item.mediaItem.genres.slice(0,2).join(" · ")}</p>:null}
              <div className="flex gap-1.5 mt-1">
                <button onClick={e=>{e.stopPropagation();onEdit(item);}} className="flex-1 text-[11px] bg-white/20 hover:bg-white/30 text-white py-1.5 rounded-lg backdrop-blur-sm transition-colors font-medium">✏️ Изменить</button>
                <button onClick={e=>{e.stopPropagation();onRemove(item.id);}} className="text-[11px] bg-red-500/30 hover:bg-red-500/50 text-white py-1.5 px-2 rounded-lg backdrop-blur-sm transition-colors">🗑</button>
              </div>
            </div>
          </div>
          <div className="p-2.5 space-y-1.5">
            <p className="text-xs font-semibold font-display leading-tight line-clamp-1 text-foreground">{item.mediaItem.title}</p>
            <div className="flex items-center justify-between gap-1">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium",STATUS_COLORS[item.status])}>{STATUS_LABELS[item.status]}</span>
              {item.mediaItem.year&&<span className="text-[10px] text-muted-foreground">{item.mediaItem.year}</span>}
            </div>
            {item.rating&&<div className="flex items-center gap-0.5">{Array.from({length:10}).map((_,i)=><div key={i} className={cn("flex-1 h-0.5 rounded-full",i<item.rating!?"bg-amber-400":"bg-muted/40")}/>)}</div>}
            {(item as any).tags?.length>0&&(
              <div className="flex flex-wrap gap-1">
                {((item as any).tags as Tag[]).slice(0,2).map(tag=><span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>{tag.name}</span>)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ items, onSelect, onEdit, onRemove }: ViewProps) {
  return (
    <div className="space-y-2">
      {items.map(item=>(
        <div key={item.id} className="glass rounded-xl p-3 flex items-center gap-3 hover:bg-card/80 transition-colors cursor-pointer group" onClick={()=>onSelect(item)}>
          <div className={cn("w-1 self-stretch rounded-full flex-shrink-0",STATUS_BAR_COLORS[item.status])}/>
          <div className="w-12 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50">
            {item.mediaItem.posterUrl
              // eslint-disable-next-line @next/next/no-img-element
              ?<img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy"/>
              :<div className="w-full h-full flex items-center justify-center text-xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start gap-2">
              <p className="font-semibold font-display text-sm truncate text-foreground flex-1">{item.mediaItem.title}</p>
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0",STATUS_COLORS[item.status])}>{STATUS_LABELS[item.status]}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {item.mediaItem.year&&<span className="text-xs text-muted-foreground">{item.mediaItem.year}</span>}
              <span className="text-xs text-muted-foreground">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
              {item.mediaItem.genres?.length?<span className="text-xs text-muted-foreground">{item.mediaItem.genres.slice(0,2).join(", ")}</span>:null}
              {item.rating&&<StarRating rating={item.rating}/>}
            </div>
            {item.review&&<p className="text-xs text-muted-foreground line-clamp-1 italic">"{item.review}"</p>}
            {(item as any).tags?.length>0&&(
              <div className="flex flex-wrap gap-1">
                {((item as any).tags as Tag[]).slice(0,3).map(tag=><span key={tag.id} className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>{tag.name}</span>)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={e=>{e.stopPropagation();onEdit(item);}} className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button onClick={e=>{e.stopPropagation();onRemove(item.id);}} className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose, onEdit, onRemove, onStatusChange }: { item:CollectionItemWithMedia; onClose:()=>void; onEdit:(i:CollectionItemWithMedia)=>void; onRemove:(id:string)=>void; onStatusChange:(id:string,s:CollectionStatus)=>void; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
      <div className="relative glass rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in" onClick={e=>e.stopPropagation()}>
        <div className="relative h-48 bg-muted/30 overflow-hidden">
          {item.mediaItem.posterUrl
            // eslint-disable-next-line @next/next/no-img-element
            ?<img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" style={{objectPosition:"center 20%"}}/>
            :<div className="w-full h-full flex items-center justify-center text-6xl">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"/>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">✕</button>
          <div className={cn("absolute bottom-0 left-0 right-0 h-1",STATUS_BAR_COLORS[item.status])}/>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-xl text-foreground leading-tight">{item.mediaItem.title}</h2>
              {item.mediaItem.originalTitle&&item.mediaItem.originalTitle!==item.mediaItem.title&&<p className="text-sm text-muted-foreground">{item.mediaItem.originalTitle}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.mediaItem.year&&<span className="text-sm text-muted-foreground">{item.mediaItem.year}</span>}
                {item.mediaItem.director&&<span className="text-sm text-muted-foreground">· {item.mediaItem.director}</span>}
                {item.mediaItem.author&&<span className="text-sm text-muted-foreground">· {item.mediaItem.author}</span>}
                {item.mediaItem.developer&&<span className="text-sm text-muted-foreground">· {item.mediaItem.developer}</span>}
              </div>
            </div>
            {item.rating&&(
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex flex-col items-center justify-center">
                <span className="text-amber-400 font-bold text-lg leading-none">{item.rating}</span>
                <span className="text-amber-400/60 text-[10px]">/10</span>
              </div>
            )}
          </div>
          {item.mediaItem.genres&&item.mediaItem.genres.length>0&&(
            <div className="flex flex-wrap gap-1.5">
              {item.mediaItem.genres.slice(0,5).map(g=><span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{g}</span>)}
            </div>
          )}
          {(item as any).tags?.length>0&&(
            <div className="flex flex-wrap gap-1.5">
              {((item as any).tags as Tag[]).map(tag=><span key={tag.id} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>🏷 {tag.name}</span>)}
            </div>
          )}
          {item.review&&(
            <div className="bg-muted/20 rounded-xl p-3 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Мой отзыв</p>
              <p className="text-sm text-foreground leading-relaxed italic">"{item.review}"</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <select value={item.status} onChange={e=>onStatusChange(item.id,e.target.value as CollectionStatus)}
              className={cn("flex-1 text-xs rounded-xl border px-3 py-2.5 bg-background focus:outline-none font-medium",STATUS_COLORS[item.status])}>
              {(["WANT","IN_PROGRESS","COMPLETED","DROPPED"] as const).map(s=><option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>)}
            </select>
            <button onClick={()=>onEdit(item)} className="flex-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-2.5 rounded-xl transition-colors font-medium">✏️ Редактировать</button>
            <button onClick={()=>onRemove(item.id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2.5 rounded-xl transition-colors">🗑</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT MODAL ───────────────────────────────────────────────────────────────
function EditModal({ editRating, editReview, allTags, itemTags, onRatingChange, onReviewChange, onSave, onClose, onToggleTag, onCreateTag, onDeleteTag }: { editingId:string; editRating:number|null; editReview:string; allTags:Tag[]; itemTags:Tag[]; onRatingChange:(r:number)=>void; onReviewChange:(r:string)=>void; onSave:()=>void; onClose:()=>void; onToggleTag:(t:Tag)=>void; onCreateTag:(n:string,c:string)=>void; onDeleteTag:(id:string)=>void; }) {
  const [tab,setTab]=useState<"main"|"tags">("main");
  const [showInput,setShowInput]=useState(false);
  const [tagName,setTagName]=useState("");
  const [tagColor,setTagColor]=useState(TAG_COLORS[0]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative glass rounded-2xl p-6 w-full max-w-md space-y-5 animate-fade-in" onClick={e=>e.stopPropagation()}>
        <div className="flex gap-2">
          {[{id:"main",label:"✏️ Оценка"},{id:"tags",label:"🏷 Теги"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className={cn("text-sm px-4 py-1.5 rounded-xl border transition-all font-medium",tab===t.id?"bg-primary/20 text-primary border-primary/30":"border-border text-muted-foreground hover:border-primary/30")}>
              {t.label}
            </button>
          ))}
        </div>
        {tab==="main"&&(
          <>
            <h3 className="font-display font-bold text-lg text-foreground">Оценка и отзыв</h3>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Оценка (1-10)</label>
              <div className="flex gap-1">
                {Array.from({length:10}).map((_,i)=>(
                  <button key={i} onClick={()=>onRatingChange(i+1)}
                    className={cn("flex-1 h-8 rounded-md transition-all text-xs font-bold border",
                      editRating!==null&&i<editRating?"bg-amber-500/30 border-amber-500/50 text-amber-400":"bg-muted/30 border-border text-muted-foreground hover:border-amber-500/30")}>
                    {i+1}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">Отзыв (опционально)</label>
              <textarea value={editReview} onChange={e=>onReviewChange(e.target.value)} placeholder="Ваши впечатления..." rows={4} maxLength={2000}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-muted-foreground/50"/>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 border border-border hover:bg-muted py-2.5 rounded-xl text-sm font-medium text-foreground transition-colors">Отмена</button>
              <button onClick={onSave} className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Сохранить</button>
            </div>
          </>
        )}
        {tab==="tags"&&(
          <>
            <h3 className="font-display font-bold text-lg text-foreground">Теги</h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Выбери или создай теги</p>
              <button onClick={()=>setShowInput(s=>!s)} className="text-xs text-primary hover:text-primary/80">+ Новый тег</button>
            </div>
            {showInput&&(
              <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl">
                <input value={tagName} onChange={e=>setTagName(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){onCreateTag(tagName,tagColor);setTagName("");setShowInput(false);}}}
                  placeholder="Название..." className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"/>
                <div className="flex gap-1">
                  {TAG_COLORS.map(c=><button key={c} onClick={()=>setTagColor(c)} className={cn("w-4 h-4 rounded-full transition-transform",tagColor===c&&"ring-2 ring-offset-1 ring-offset-background ring-white scale-125")} style={{backgroundColor:c}}/>)}
                </div>
                <button onClick={()=>{onCreateTag(tagName,tagColor);setTagName("");setShowInput(false);}} className="text-xs bg-primary text-white px-2 py-1 rounded-lg">ОК</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {allTags.length===0&&<p className="text-xs text-muted-foreground">Нет тегов — создай первый!</p>}
              {allTags.map(tag=>{
                const active=itemTags.some(t=>t.id===tag.id);
                return (
                  <div key={tag.id} className="flex items-center gap-1">
                    <button onClick={()=>onToggleTag(tag)}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-medium",active?"text-white border-transparent":"text-muted-foreground border-border hover:border-primary/30")}
                      style={active?{backgroundColor:tag.color}:{}}>{active&&"✓ "}{tag.name}</button>
                    <button onClick={()=>onDeleteTag(tag.id)} className="text-muted-foreground hover:text-red-400 transition-colors text-xs p-1 rounded-full hover:bg-red-500/10">✕</button>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} className="w-full border border-border hover:bg-muted py-2.5 rounded-xl text-sm font-medium text-foreground transition-colors">Готово</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function CollectionClient({ initialItems }: CollectionClientProps) {
  const [items, setItems] = useState<CollectionItemWithMedia[]>(initialItems);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter,   setTypeFilter]   = useState("all");
  const [sortBy,       setSortBy]       = useState<"addedAt"|"rating"|"title"|"year">("addedAt");
  const [yearFrom,     setYearFrom]     = useState("");
  const [yearTo,       setYearTo]       = useState("");
  const [genreFilter,  setGenreFilter]  = useState("");
  const [showFilters,  setShowFilters]  = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [tagFilter,    setTagFilter]    = useState<string|null>(null);
  const [viewMode,     setViewMode]     = useState<"grid"|"list"|"shelf">("grid");
  const [detailItem,   setDetailItem]   = useState<CollectionItemWithMedia|null>(null);
  const [editingId,    setEditingId]    = useState<string|null>(null);
  const [editRating,   setEditRating]   = useState<number|null>(null);
  const [editReview,   setEditReview]   = useState("");
  const [allTags,      setAllTags]      = useState<Tag[]>([]);
  const [itemTags,     setItemTags]     = useState<Tag[]>([]);

  useEffect(()=>{ fetch("/api/tags").then(r=>r.json()).then(d=>setAllTags(d.tags??[])); },[]);
  useEffect(()=>{ if(!editingId) return; const item=items.find(i=>i.id===editingId); setItemTags((item as any)?.tags??[]); },[editingId,items]);

  const allGenres=useMemo(()=>{const g=new Set<string>();items.forEach(i=>i.mediaItem.genres?.forEach(x=>g.add(x)));return Array.from(g).sort();},[items]);

  const filtered=useMemo(()=>{
    let r=[...items];
    if(searchQuery.trim()){const q=searchQuery.toLowerCase();r=r.filter(i=>i.mediaItem.title.toLowerCase().includes(q)||i.mediaItem.originalTitle?.toLowerCase().includes(q)||i.mediaItem.author?.toLowerCase().includes(q)||i.mediaItem.director?.toLowerCase().includes(q)||i.mediaItem.developer?.toLowerCase().includes(q)||i.review?.toLowerCase().includes(q));}
    if(statusFilter!=="all") r=r.filter(i=>i.status===statusFilter);
    if(typeFilter!=="all")   r=r.filter(i=>i.mediaItem.type===typeFilter);
    if(yearFrom) r=r.filter(i=>(i.mediaItem.year??0)>=parseInt(yearFrom));
    if(yearTo)   r=r.filter(i=>(i.mediaItem.year??9999)<=parseInt(yearTo));
    if(genreFilter) r=r.filter(i=>i.mediaItem.genres?.some(g=>g.toLowerCase().includes(genreFilter.toLowerCase())));
    if(tagFilter)   r=r.filter(i=>((i as any).tags??[]).some((t:Tag)=>t.id===tagFilter));
    r.sort((a,b)=>{
      if(sortBy==="rating") return (b.rating??0)-(a.rating??0);
      if(sortBy==="title")  return a.mediaItem.title.localeCompare(b.mediaItem.title,"ru");
      if(sortBy==="year")   return (b.mediaItem.year??0)-(a.mediaItem.year??0);
      return new Date(b.addedAt).getTime()-new Date(a.addedAt).getTime();
    });
    return r;
  },[items,statusFilter,typeFilter,sortBy,yearFrom,yearTo,genreFilter,searchQuery,tagFilter]);

  const counts=useMemo(()=>{const c:Record<string,number>={all:items.length};for(const s of["WANT","IN_PROGRESS","COMPLETED","DROPPED"])c[s]=items.filter(i=>i.status===s).length;return c;},[items]);

  const updateStatus=async(id:string,status:CollectionStatus)=>{
    setItems(prev=>prev.map(i=>i.id===id?{...i,status}:i));
    if(detailItem?.id===id) setDetailItem(p=>p?{...p,status}:null);
    try{const res=await fetch(`/api/collection/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});if(!res.ok)throw new Error();toast.success("Статус обновлён");}
    catch{setItems(initialItems);toast.error("Ошибка");}
  };
  const saveEdit=async()=>{
    if(!editingId) return;
    try{const res=await fetch(`/api/collection/${editingId}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({rating:editRating,review:editReview||null})});if(!res.ok)throw new Error();setItems(prev=>prev.map(i=>i.id===editingId?{...i,rating:editRating,review:editReview||null}:i));toast.success("Сохранено");setEditingId(null);}
    catch{toast.error("Ошибка сохранения");}
  };
  const removeItem=async(id:string)=>{
    setItems(prev=>prev.filter(i=>i.id!==id));setDetailItem(null);
    try{const res=await fetch(`/api/collection/${id}`,{method:"DELETE"});if(!res.ok)throw new Error();toast.success("Удалено из коллекции");}
    catch{setItems(initialItems);toast.error("Ошибка удаления");}
  };
  const startEdit=(item:CollectionItemWithMedia)=>{setEditingId(item.id);setEditRating(item.rating??null);setEditReview(item.review??"");setDetailItem(null);};
  const handleToggleTag=async(tag:Tag)=>{
    if(!editingId) return;
    const hasTag=itemTags.some(t=>t.id===tag.id);
    if(hasTag){await fetch(`/api/collection/${editingId}/tags`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:tag.id})});setItemTags(p=>p.filter(t=>t.id!==tag.id));setItems(p=>p.map(i=>i.id===editingId?{...i,tags:((i as any).tags??[]).filter((t:any)=>t.id!==tag.id)}:i));}
    else{await fetch(`/api/collection/${editingId}/tags`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:tag.id})});setItemTags(p=>[...p,tag]);setItems(p=>p.map(i=>i.id===editingId?{...i,tags:[...((i as any).tags??[]),tag]}:i));}
  };
  const handleCreateTag=async(name:string,color:string)=>{
    if(!name.trim()) return;
    const res=await fetch("/api/tags",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),color})});
    if(res.status===409){toast.error("Тег уже существует");return;}
    const data=await res.json();setAllTags(p=>[...p,data.tag]);
    if(editingId){await fetch(`/api/collection/${editingId}/tags`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:data.tag.id})});setItemTags(p=>[...p,data.tag]);}
  };
  const deleteTag=async(tagId:string)=>{
    await fetch(`/api/tags/${tagId}`,{method:"DELETE"});
    setAllTags(p=>p.filter(t=>t.id!==tagId));setItemTags(p=>p.filter(t=>t.id!==tagId));
    setItems(p=>p.map(i=>({...i,tags:((i as any).tags??[]).filter((t:any)=>t.id!==tagId)})));
  };
  const resetFilters=()=>{setStatusFilter("all");setTypeFilter("all");setYearFrom("");setYearTo("");setGenreFilter("");setTagFilter(null);setSearchQuery("");};
  const hasActiveFilters=statusFilter!=="all"||typeFilter!=="all"||yearFrom||yearTo||genreFilter||tagFilter||searchQuery.trim();

  if(items.length===0) return (
    <div className="text-center py-24 space-y-4 text-muted-foreground">
      <div className="text-6xl">📭</div>
      <p className="text-lg font-medium">Коллекция пуста</p>
      <p className="text-sm">Перейдите на <a href="/dashboard" className="text-primary hover:underline">главную страницу</a> и добавьте что-нибудь интересное</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Поиск по коллекции..."
          className="w-full bg-card/50 border border-border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/50"/>
        {searchQuery&&<button onClick={()=>setSearchQuery("")} className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map(status=>(
          <button key={status} onClick={()=>setStatusFilter(status)}
            className={cn("text-sm px-3 py-1.5 rounded-xl border transition-all duration-200 font-medium",
              statusFilter===status?status==="all"?"bg-primary/20 text-primary border-primary/30":cn(STATUS_COLORS[status as CollectionStatus]):"border-border text-muted-foreground hover:border-primary/30")}>
            {status==="all"?`Все (${counts.all})`:`${STATUS_LABELS[status as CollectionStatus]} (${counts[status]??0})`}
          </button>
        ))}
      </div>

      {/* Tag pills */}
      {allTags.length>0&&(
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground">🏷 Теги:</span>
          {allTags.map(tag=>(
            <button key={tag.id} onClick={()=>setTagFilter(tagFilter===tag.id?null:tag.id)}
              className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",tagFilter===tag.id?"text-white border-transparent":"text-muted-foreground border-border hover:border-primary/30")}
              style={tagFilter===tag.id?{backgroundColor:tag.color}:{}}>{tag.name}</button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="text-xs bg-background border border-border rounded-lg px-3 py-2 focus:outline-none text-foreground">
            {TYPE_FILTERS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value as typeof sortBy)} className="text-xs bg-background border border-border rounded-lg px-3 py-2 focus:outline-none text-foreground">
            {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={()=>setShowFilters(s=>!s)}
            className={cn("text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5",showFilters||hasActiveFilters?"bg-primary/20 text-primary border-primary/30":"border-border text-muted-foreground hover:border-primary/30")}>
            🎛 Фильтры {hasActiveFilters&&<span className="w-1.5 h-1.5 rounded-full bg-primary"/>}
          </button>
          {hasActiveFilters&&<button onClick={resetFilters} className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all">✕ Сбросить</button>}
        </div>
        <div className="flex border border-border rounded-lg overflow-hidden">
          {[
            {mode:"grid",  icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>},
            {mode:"list",  icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>},
            {mode:"shelf", icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg>},
          ].map(({mode,icon})=>(
            <button key={mode} onClick={()=>setViewMode(mode as any)} className={cn("p-2 transition-colors",viewMode===mode?"bg-primary/20 text-primary":"text-muted-foreground hover:bg-muted")}>{icon}</button>
          ))}
        </div>
      </div>

      {showFilters&&(
        <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Жанр</label>
            <input type="text" value={genreFilter} onChange={e=>setGenreFilter(e.target.value)} placeholder="Например: боевик" list="genres-list"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"/>
            <datalist id="genres-list">{allGenres.map(g=><option key={g} value={g}/>)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Год от</label>
            <input type="number" value={yearFrom} onChange={e=>setYearFrom(e.target.value)} placeholder="1990"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Год до</label>
            <input type="number" value={yearTo} onChange={e=>setYearTo(e.target.value)} placeholder="2024"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"/>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">Показано: <span className="text-foreground font-medium">{filtered.length}</span> из {items.length}</p>

      {filtered.length===0&&(
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <div className="text-4xl">🔍</div>
          <p>Ничего не найдено по выбранным фильтрам</p>
          <button onClick={resetFilters} className="text-primary hover:underline text-sm">Сбросить фильтры</button>
        </div>
      )}

      {viewMode==="shelf"&&filtered.length>0&&<ShelfView items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem}/>}
      {viewMode==="grid" &&filtered.length>0&&<GridView  items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem}/>}
      {viewMode==="list" &&filtered.length>0&&<ListView  items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem}/>}

      {detailItem&&<DetailModal item={detailItem} onClose={()=>setDetailItem(null)} onEdit={startEdit} onRemove={removeItem} onStatusChange={updateStatus}/>}
      {editingId&&<EditModal editingId={editingId} editRating={editRating} editReview={editReview} allTags={allTags} itemTags={itemTags} onRatingChange={setEditRating} onReviewChange={setEditReview} onSave={saveEdit} onClose={()=>setEditingId(null)} onToggleTag={handleToggleTag} onCreateTag={handleCreateTag} onDeleteTag={deleteTag}/>}
    </div>
  );
}