"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { CollectionItemWithMedia, CollectionStatus } from "@/types";
import { STATUS_LABELS, STATUS_COLORS, MEDIA_TYPE_ICONS } from "@/types";
import { cn } from "@/lib/utils";

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
  { value: "all",   label: "Все" },
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
const STATUS_GLOW: Record<CollectionStatus, string> = {
  WANT: "shadow-blue-500/20", IN_PROGRESS: "shadow-amber-500/20", COMPLETED: "shadow-emerald-500/20", DROPPED: "shadow-red-500/20",
};
const STATUS_ICON: Record<CollectionStatus, string> = {
  WANT: "🔖", IN_PROGRESS: "▶️", COMPLETED: "✅", DROPPED: "❌",
};

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

function StatBar({ items }: { items: CollectionItemWithMedia[] }) {
  const total = items.length;
  if (total === 0) return null;
  const counts = {
    COMPLETED:   items.filter(i=>i.status==="COMPLETED").length,
    IN_PROGRESS: items.filter(i=>i.status==="IN_PROGRESS").length,
    WANT:        items.filter(i=>i.status==="WANT").length,
    DROPPED:     items.filter(i=>i.status==="DROPPED").length,
  };
  const rated = items.filter(i=>i.rating).length;
  const avgRating = rated > 0
    ? (items.reduce((s,i)=>s+(i.rating??0),0)/rated).toFixed(1)
    : null;

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 flex-wrap">
          {(["COMPLETED","IN_PROGRESS","WANT","DROPPED"] as CollectionStatus[]).map(s=>(
            <div key={s} className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", STATUS_BAR_COLORS[s])}/>
              <span className="text-xs text-muted-foreground">{STATUS_LABELS[s]}</span>
              <span className="text-xs font-bold text-foreground">{counts[s]}</span>
            </div>
          ))}
        </div>
        {avgRating && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-bold text-amber-400">{avgRating}</span>
            <span className="text-xs text-muted-foreground">средняя</span>
          </div>
        )}
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
        {(["COMPLETED","IN_PROGRESS","WANT","DROPPED"] as CollectionStatus[]).map(s=>
          counts[s] > 0 && (
            <div key={s}
              className={cn("transition-all", STATUS_BAR_COLORS[s])}
              style={{width:`${(counts[s]/total*100).toFixed(1)}%`}}
              title={`${STATUS_LABELS[s]}: ${counts[s]}`}
            />
          )
        )}
      </div>
    </div>
  );
}

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

interface ViewProps { items:CollectionItemWithMedia[]; onSelect:(i:CollectionItemWithMedia)=>void; onEdit:(i:CollectionItemWithMedia)=>void; onRemove:(id:string)=>void; }

function GridView({
  items,
  onSelect,
  onEdit,
  onRemove,
  selectedIds,
  onToggleSelect,
  selectionMode,
  multiSelectMode,
  onClickItem,
  onShare,
}: ViewProps & {
  selectedIds: string[];
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  selectionMode: boolean;
  multiSelectMode: boolean;
  onClickItem: (item: CollectionItemWithMedia, e: React.MouseEvent) => void;
  onShare: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map(item=>(
        <div key={item.id}
          className={cn(
            "group relative rounded-2xl overflow-hidden cursor-pointer",
            "bg-card border border-border/50",
            "transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl",
            STATUS_GLOW[item.status]
          )}
          onClick={(e)=>onClickItem(item, e)}>

          {multiSelectMode && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e); }}
              className={cn(
                "absolute top-2 left-2 z-10 w-8 h-8 rounded-xl flex items-center justify-center text-sm",
                "bg-black/50 backdrop-blur-sm border border-black/10 dark:border-white/10 shadow-lg",
                "transition-all hover:bg-black/60 focus-ring",
                selectedIds.includes(item.id) && "bg-primary/60 border-primary/40"
              )}
              title={selectedIds.includes(item.id) ? "Снять выделение" : "Выбрать"}
            >
              {selectedIds.includes(item.id) ? "✓" : "◻"}
            </button>
          )}

          <div className="aspect-[2/3] bg-muted/30 relative overflow-hidden">
            {item.mediaItem.posterUrl
              // eslint-disable-next-line @next/next/no-img-element
              ?<img src={item.mediaItem.posterUrl} alt={item.mediaItem.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"/>
              :<div className={cn("w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br",getSpineColor(item.id))}>
                <span className="text-5xl opacity-80">{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                <p className="text-white/80 text-xs text-center px-3 leading-tight font-medium line-clamp-3">{item.mediaItem.title}</p>
              </div>}

            <div className={cn("absolute top-0 left-0 right-0 h-0.5", STATUS_BAR_COLORS[item.status])}/>

            {item.rating && (
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center border border-black/10 dark:border-white/10 shadow-lg">
                <span className="text-amber-400 font-bold text-[11px] leading-none">{item.rating}</span>
              </div>
            )}

            <div className="absolute top-2 left-2">
              <span className="text-sm leading-none">{STATUS_ICON[item.status]}</span>
            </div>

            <button
              onClick={(e) => { e.stopPropagation(); onShare(item.id); }}
              className={cn(
                "absolute top-2 right-2 w-8 h-8 rounded-xl flex items-center justify-center text-xs",
                "bg-black/60 backdrop-blur-sm border border-white/10 shadow-lg",
                "text-white/90 hover:text-white hover:bg-black/70 transition-all",
                "opacity-0 group-hover:opacity-100 focus:opacity-100 focus-ring"
              )}
              title="Поделиться"
            >
              ➤
            </button>

            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 gap-2">
              <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{item.mediaItem.title}</p>
              {item.mediaItem.year && <p className="text-white/50 text-[10px]">{item.mediaItem.year}</p>}
              {item.mediaItem.genres?.length
                ? <p className="text-white/60 text-[10px] line-clamp-1">{item.mediaItem.genres.slice(0,2).join(" · ")}</p>
                : null}
              {(item as any).tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {((item as any).tags as Tag[]).slice(0,2).map(tag=>(
                    <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>{tag.name}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={e=>{e.stopPropagation();onEdit(item);}}
                  className="flex-1 text-[10px] bg-white/20 hover:bg-white/30 text-white py-1.5 rounded-lg backdrop-blur-sm transition-colors font-semibold focus-ring interactive-soft"
                >
                  ✏️ Изменить
                </button>
                <button
                  onClick={e=>{e.stopPropagation();onRemove(item.id);}}
                  className="text-[10px] bg-red-500/40 hover:bg-red-500/60 text-white py-1.5 px-2 rounded-lg backdrop-blur-sm transition-colors focus-ring interactive-soft flex items-center gap-1">
                  <span>🗑</span>
                  <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-16 transition-all duration-200">Удалить</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-2.5 space-y-1.5">
            <p className="text-xs font-semibold leading-tight line-clamp-1 text-foreground">{item.mediaItem.title}</p>
            <div className="flex items-center justify-between gap-1">
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", STATUS_COLORS[item.status])}>
                {STATUS_LABELS[item.status]}
              </span>
              <span className="text-[10px] text-muted-foreground">{item.mediaItem.year ?? ""}</span>
            </div>
            {item.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({length:10}).map((_,i)=>(
                  <div key={i} className={cn("flex-1 h-0.5 rounded-full transition-colors", i<item.rating! ? "bg-amber-400" : "bg-muted/30")}/>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListView({
  items,
  onSelect,
  onEdit,
  onRemove,
  selectedIds,
  onToggleSelect,
  selectionMode,
  multiSelectMode,
  onClickItem,
  onShare,
}: ViewProps & {
  selectedIds: string[];
  onToggleSelect: (id: string, e?: React.MouseEvent) => void;
  selectionMode: boolean;
  multiSelectMode: boolean;
  onClickItem: (item: CollectionItemWithMedia, e: React.MouseEvent) => void;
  onShare: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div key={item.id}
          className="group relative glass rounded-xl overflow-hidden cursor-pointer hover:bg-card/90 transition-all duration-200 hover:shadow-lg"
          onClick={(e)=>onClickItem(item, e)}>

          <div className={cn("absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl", STATUS_BAR_COLORS[item.status])}/>

          <div className="flex items-center gap-3 p-3 pl-4">
            {multiSelectMode && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id, e); }}
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0",
                  "bg-muted/30 border border-border/70 hover:border-primary/30 hover:bg-muted/50 transition-all",
                  "focus-ring",
                  selectedIds.includes(item.id) && "bg-primary/15 border-primary/30 text-primary"
                )}
                title={selectedIds.includes(item.id) ? "Снять выделение" : "Выбрать"}
              >
                {selectedIds.includes(item.id) ? "✓" : "◻"}
              </button>
            )}
            <span className="text-xs text-muted-foreground/40 font-mono w-5 text-right flex-shrink-0 select-none">
              {idx+1}
            </span>

            <div className="w-10 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-muted/50 shadow-sm">
              {item.mediaItem.posterUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title} className="w-full h-full object-cover" loading="lazy"/>
                : <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br text-lg", getSpineColor(item.id))}>
                    {MEDIA_TYPE_ICONS[item.mediaItem.type]}
                  </div>}
            </div>

            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate text-foreground flex-1 leading-tight">{item.mediaItem.title}</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium flex-shrink-0", STATUS_COLORS[item.status])}>
                  {STATUS_LABELS[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span>{MEDIA_TYPE_ICONS[item.mediaItem.type]}</span>
                {item.mediaItem.year && <span>{item.mediaItem.year}</span>}
                {(item.mediaItem.director||item.mediaItem.author||item.mediaItem.developer) && (
                  <span className="truncate max-w-[120px]">
                    {item.mediaItem.director??item.mediaItem.author??item.mediaItem.developer}
                  </span>
                )}
                {item.mediaItem.genres?.length
                  ? <span className="hidden sm:inline truncate max-w-[100px]">{item.mediaItem.genres.slice(0,2).join(", ")}</span>
                  : null}
              </div>
              {item.review && (
                <p className="text-[11px] text-muted-foreground/70 line-clamp-1 italic hidden sm:block">"{item.review}"</p>
              )}
              {(item as any).tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {((item as any).tags as Tag[]).slice(0,3).map(tag=>(
                    <span key={tag.id} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>{tag.name}</span>
                  ))}
                </div>
              )}
            </div>

            {item.rating ? (
              <div className="flex-shrink-0 flex flex-col items-center gap-0.5">
                <span className="text-amber-400 font-bold text-base leading-none">{item.rating}</span>
                <span className="text-[9px] text-muted-foreground">/10</span>
              </div>
            ) : (
              <div className="w-6 flex-shrink-0"/>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 pl-1">
              <button
                onClick={e=>{e.stopPropagation();onEdit(item);}}
                className="p-1.5 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                title="Редактировать">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onShare(item.id); }}
                className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                title="Поделиться">
                ➤
              </button>
              <button
                onClick={e=>{e.stopPropagation();onRemove(item.id);}}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                title="Удалить">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                <span className="text-xs max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-16 transition-all duration-200">Удалить</span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailModal({ item, onClose, onEdit, onRemove, onStatusChange }: {
  item: CollectionItemWithMedia;
  onClose: ()=>void;
  onEdit: (i:CollectionItemWithMedia)=>void;
  onRemove: (id:string)=>void;
  onStatusChange: (id:string, s:CollectionStatus)=>void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md"/>
      <div className="relative glass w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden animate-fade-in" onClick={e=>e.stopPropagation()}>

        <div className="relative h-52 bg-muted/30 overflow-hidden">
          {item.mediaItem.posterUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={item.mediaItem.posterUrl} alt={item.mediaItem.title}
                className="w-full h-full object-cover scale-110 blur-sm opacity-60"
                style={{objectPosition:"center 20%"}}/>
            : <div className={cn("w-full h-full bg-gradient-to-br", getSpineColor(item.id))}/>}

          <div className="absolute inset-0 flex items-end p-5 gap-4">
            {item.mediaItem.posterUrl && (
              <div className="flex-shrink-0 w-24 h-36 rounded-xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.mediaItem.posterUrl} alt="" className="w-full h-full object-cover"/>
              </div>
            )}
            <div className="flex-1 min-w-0 pb-1">
              <div className={cn("inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium mb-1.5", STATUS_COLORS[item.status])}>
                {STATUS_ICON[item.status]} {STATUS_LABELS[item.status]}
              </div>
              <h2 className="font-bold text-xl text-white leading-tight line-clamp-2 drop-shadow-lg">{item.mediaItem.title}</h2>
              {item.mediaItem.originalTitle && item.mediaItem.originalTitle !== item.mediaItem.title && (
                <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{item.mediaItem.originalTitle}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.mediaItem.year && <span className="text-white/70 text-xs">{item.mediaItem.year}</span>}
                {item.mediaItem.director && <span className="text-white/70 text-xs">· {item.mediaItem.director}</span>}
                {item.mediaItem.author && <span className="text-white/70 text-xs">· {item.mediaItem.author}</span>}
                {item.mediaItem.developer && <span className="text-white/70 text-xs">· {item.mediaItem.developer}</span>}
              </div>
            </div>
            {item.rating && (
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 backdrop-blur-sm flex flex-col items-center justify-center">
                <span className="text-amber-300 font-bold text-xl leading-none">{item.rating}</span>
                <span className="text-amber-400/60 text-[9px]">/10</span>
              </div>
            )}
          </div>

          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-colors text-sm focus-ring interactive-soft border border-black/10 dark:border-white/10 shadow-lg">
            ✕
          </button>

          <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", STATUS_BAR_COLORS[item.status])}/>
        </div>

        <div className="p-5 space-y-4">
          {item.mediaItem.genres && item.mediaItem.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.mediaItem.genres.slice(0,6).map(g=>(
                <span key={g} className="text-xs px-2.5 py-1 rounded-full bg-muted/50 text-muted-foreground border border-border/50">{g}</span>
              ))}
            </div>
          )}

          {(item as any).tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {((item as any).tags as Tag[]).map(tag=>(
                <span key={tag.id} className="text-xs px-2.5 py-1 rounded-full text-white font-medium" style={{backgroundColor:tag.color}}>
                  🏷 {tag.name}
                </span>
              ))}
            </div>
          )}

          {item.review && (
            <div className="bg-muted/20 rounded-xl p-3.5 border border-border/40">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-semibold uppercase tracking-wider">Мой отзыв</p>
              <p className="text-sm text-foreground leading-relaxed italic">"{item.review}"</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1">
            <select value={item.status}
              onChange={e=>onStatusChange(item.id, e.target.value as CollectionStatus)}
              className={cn("col-span-1 text-xs rounded-xl border px-2 py-2.5 bg-background focus:outline-none font-medium text-center cursor-pointer", STATUS_COLORS[item.status])}>
              {(["WANT","IN_PROGRESS","COMPLETED","DROPPED"] as const).map(s=>(
                <option key={s} value={s} className="bg-background text-foreground">{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button onClick={()=>onEdit(item)}
              className="col-span-1 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-3 py-2.5 rounded-xl transition-colors font-semibold">
              ✏️ Изменить
            </button>
            <button onClick={()=>onRemove(item.id)}
              className="col-span-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3 py-2.5 rounded-xl transition-colors font-semibold">
              🗑 Удалить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ editStatus, editRating, editReview, allTags, itemTags, onStatusChange, onRatingChange, onReviewChange, onSave, onClose, onToggleTag, onCreateTag, onDeleteTag }: {
  editingId: string;
  editStatus: CollectionStatus;
  editRating: number|null;
  editReview: string;
  allTags: Tag[];
  itemTags: Tag[];
  onStatusChange: (s: CollectionStatus)=>void;
  onRatingChange: (r:number)=>void;
  onReviewChange: (r:string)=>void;
  onSave: ()=>void;
  onClose: ()=>void;
  onToggleTag: (t:Tag)=>void;
  onCreateTag: (n:string, c:string)=>void;
  onDeleteTag: (id:string)=>void;
}) {
  const [tab, setTab] = useState<"main"|"tags">("main");
  const [hoveredRating, setHoveredRating] = useState<number|null>(null);
  const [showInput, setShowInput] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const displayRating = hoveredRating ?? editRating;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}/>
      <div className="relative glass rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md space-y-5 animate-fade-in" onClick={e=>e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full bg-border/50 mx-auto sm:hidden"/>

        <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
          {[{id:"main",label:"✏️ Оценка & отзыв"},{id:"tags",label:"🏷 Теги"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id as any)}
              className={cn("flex-1 text-xs py-2 rounded-lg border transition-all font-medium",
                tab===t.id
                  ? "bg-card text-foreground border-border shadow-sm"
                  : "border-transparent text-muted-foreground hover:text-foreground")}>
              {t.label}
            </button>
          ))}
        </div>

        {tab==="main" && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Статус</label>
              <div className="grid grid-cols-2 gap-2">
                {(["WANT","IN_PROGRESS","COMPLETED","DROPPED"] as CollectionStatus[]).map(s=>(
                  <button
                    key={s}
                    onClick={()=>onStatusChange(s)}
                    className={cn(
                      "text-xs px-3 py-2.5 rounded-xl border transition-all font-semibold focus-ring",
                      editStatus===s
                        ? cn(STATUS_COLORS[s], "ring-2 ring-offset-1 ring-offset-background ring-current/30")
                        : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Оценка</label>
                {editRating && (
                  <span className="text-amber-400 font-bold text-lg">{editRating}<span className="text-muted-foreground text-xs font-normal">/10</span></span>
                )}
              </div>
              <div className="flex gap-1">
                {Array.from({length:10}).map((_,i)=>{
                  const val = i+1;
                  const isActive = displayRating !== null && val <= displayRating;
                  return (
                    <button key={i}
                      onClick={()=>onRatingChange(val)}
                      onMouseEnter={()=>setHoveredRating(val)}
                      onMouseLeave={()=>setHoveredRating(null)}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all duration-100",
                        isActive
                          ? val <= 4 ? "bg-red-500/30 border-red-500/50 text-red-300"
                            : val <= 7 ? "bg-amber-500/30 border-amber-500/50 text-amber-300"
                            : "bg-emerald-500/30 border-emerald-500/50 text-emerald-300"
                          : "bg-muted/20 border-border/50 text-muted-foreground hover:border-amber-500/40 hover:bg-amber-500/10"
                      )}>
                      {val}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>😤 Ужасно</span>
                <span>😐 Нормально</span>
                <span>🤩 Шедевр</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Отзыв</label>
              <textarea value={editReview} onChange={e=>onReviewChange(e.target.value)}
                placeholder="Поделись впечатлениями..." rows={4} maxLength={2000}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-muted-foreground/40 leading-relaxed"/>
              <p className="text-[10px] text-muted-foreground text-right">{editReview.length}/2000</p>
            </div>

            <div className="flex gap-3">
              <button onClick={onClose}
                className="flex-1 border border-border hover:bg-muted py-2.5 rounded-xl text-sm font-medium text-foreground transition-colors">
                Отмена
              </button>
              <button onClick={onSave}
                className="flex-1 bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-lg shadow-primary/20">
                Сохранить
              </button>
            </div>
          </div>
        )}

        {tab==="tags" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Выбери или создай теги</p>
              <button onClick={()=>setShowInput(s=>!s)} className="text-xs text-primary hover:text-primary/80 font-medium">+ Новый тег</button>
            </div>

            {showInput && (
              <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-xl border border-border/50">
                <input value={tagName} onChange={e=>setTagName(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"){onCreateTag(tagName,tagColor);setTagName("");setShowInput(false);}}}
                  placeholder="Название тега..." autoFocus
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"/>
                <div className="flex gap-1">
                  {TAG_COLORS.map(c=>(
                    <button key={c} onClick={()=>setTagColor(c)}
                      className={cn("w-4 h-4 rounded-full transition-transform", tagColor===c && "ring-2 ring-offset-1 ring-offset-background ring-white scale-125")}
                      style={{backgroundColor:c}}/>
                  ))}
                </div>
                <button onClick={()=>{onCreateTag(tagName,tagColor);setTagName("");setShowInput(false);}}
                  className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-medium">ОК</button>
              </div>
            )}

            <div className="flex flex-wrap gap-2 min-h-[40px]">
              {allTags.length === 0 && (
                <p className="text-xs text-muted-foreground self-center">Нет тегов — создай первый!</p>
              )}
              {allTags.map(tag=>{
                const active = itemTags.some(t=>t.id===tag.id);
                return (
                  <div key={tag.id} className="flex items-center gap-0.5">
                    <button onClick={()=>onToggleTag(tag)}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-all font-medium",
                        active ? "text-white border-transparent scale-105" : "text-muted-foreground border-border hover:border-primary/40")}
                      style={active ? {backgroundColor:tag.color,boxShadow:`0 0 10px ${tag.color}50`} : {}}>
                      {active && "✓ "}{tag.name}
                    </button>
                    <button onClick={()=>onDeleteTag(tag.id)}
                      className="text-muted-foreground hover:text-red-400 transition-colors text-xs p-1 rounded-full hover:bg-red-500/10">
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button onClick={onClose}
              className="w-full bg-primary hover:bg-primary/90 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              Готово
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [editStatus,   setEditStatus]   = useState<CollectionStatus>("WANT");
  const [allTags,      setAllTags]      = useState<Tag[]>([]);
  const [itemTags,     setItemTags]     = useState<Tag[]>([]);
  const [unratedOnly,  setUnratedOnly]  = useState(false);
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [bulkStatus,   setBulkStatus]   = useState<CollectionStatus>("WANT");
  const deleteOpRef = useRef<{ id: string; cancelled: boolean } | null>(null);
  const lastSelectedIdRef = useRef<string | null>(null);
  const selectionMode = multiSelectMode;
  const [shareItemId, setShareItemId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(()=>{ fetch("/api/tags").then(r=>r.json()).then(d=>setAllTags(d.tags??[])); },[]);
  useEffect(()=>{ if(!editingId) return; const item=items.find(i=>i.id===editingId); setItemTags((item as any)?.tags??[]); },[editingId,items]);

  const allGenres = useMemo(()=>{
    const g = new Set<string>();
    items.forEach(i=>i.mediaItem.genres?.forEach(x=>g.add(x)));
    return Array.from(g).sort();
  },[items]);

  const filtered = useMemo(()=>{
    let r = [...items];
    if(searchQuery.trim()){
      const q = searchQuery.toLowerCase();
      r = r.filter(i=>
        i.mediaItem.title.toLowerCase().includes(q) ||
        i.mediaItem.originalTitle?.toLowerCase().includes(q) ||
        i.mediaItem.author?.toLowerCase().includes(q) ||
        i.mediaItem.director?.toLowerCase().includes(q) ||
        i.mediaItem.developer?.toLowerCase().includes(q) ||
        i.review?.toLowerCase().includes(q)
      );
    }
    if(statusFilter!=="all") r = r.filter(i=>i.status===statusFilter);
    if(typeFilter!=="all")   r = r.filter(i=>i.mediaItem.type===typeFilter);
    if(unratedOnly) r = r.filter(i=>i.rating == null);
    if(yearFrom) r = r.filter(i=>(i.mediaItem.year??0)>=parseInt(yearFrom));
    if(yearTo)   r = r.filter(i=>(i.mediaItem.year??9999)<=parseInt(yearTo));
    if(genreFilter) r = r.filter(i=>i.mediaItem.genres?.some(g=>g.toLowerCase().includes(genreFilter.toLowerCase())));
    if(tagFilter)   r = r.filter(i=>((i as any).tags??[]).some((t:Tag)=>t.id===tagFilter));
    r.sort((a,b)=>{
      if(sortBy==="rating") return (b.rating??0)-(a.rating??0);
      if(sortBy==="title")  return a.mediaItem.title.localeCompare(b.mediaItem.title,"ru");
      if(sortBy==="year")   return (b.mediaItem.year??0)-(a.mediaItem.year??0);
      return new Date(b.addedAt).getTime()-new Date(a.addedAt).getTime();
    });
    return r;
  },[items,statusFilter,typeFilter,sortBy,yearFrom,yearTo,genreFilter,searchQuery,tagFilter,unratedOnly]);

  useEffect(() => {
    // Если элементы ушли из фильтра (или были удалены), чистим выбор.
    const visible = new Set(filtered.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [filtered]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    const isShift = !!e?.shiftKey;
    if (isShift && lastSelectedIdRef.current) {
      const ids = filtered.map((x) => x.id);
      const a = ids.indexOf(lastSelectedIdRef.current);
      const b = ids.indexOf(id);
      if (a !== -1 && b !== -1) {
        const [from, to] = a < b ? [a, b] : [b, a];
        const range = ids.slice(from, to + 1);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...range])));
        return;
      }
    }

    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    lastSelectedIdRef.current = id;
  };

  const selectAllVisible = () => setSelectedIds(filtered.map((x) => x.id));
  const invertVisible = () => {
    const visible = filtered.map((x) => x.id);
    const selected = new Set(selectedIds);
    setSelectedIds(visible.filter((id) => !selected.has(id)));
  };

  useEffect(() => {
    if (!selectionMode) return;

    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (t as any)?.isContentEditable) return;

      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedIds([]);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        removeItemsWithUndo(selectedIds);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllVisible();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectionMode, selectedIds, filtered]);

  const counts = useMemo(()=>{
    const c: Record<string,number> = {all:items.length};
    for(const s of ["WANT","IN_PROGRESS","COMPLETED","DROPPED"]) c[s]=items.filter(i=>i.status===s).length;
    return c;
  },[items]);

  const updateStatus = async(id:string, status:CollectionStatus)=>{
    setItems(prev=>prev.map(i=>i.id===id?{...i,status}:i));
    if(detailItem?.id===id) setDetailItem(p=>p?{...p,status}:null);
    try {
      const res = await fetch(`/api/collection/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
      if(!res.ok) throw new Error();
      toast.success("Статус обновлён");
    } catch { setItems(initialItems); toast.error("Ошибка"); }
  };

  const updateStatusBulk = async (ids: string[], status: CollectionStatus) => {
    if (ids.length === 0) return;
    const snapshot = items;
    setItems((prev) => prev.map((i) => (ids.includes(i.id) ? { ...i, status } : i)));
    try {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/collection/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      }));
      toast.success(`Статус обновлён для: ${ids.length}`);
    } catch {
      setItems(snapshot);
      toast.error("Ошибка обновления статуса");
    }
  };

  const saveEdit = async()=>{
    if(!editingId) return;
    try {
      const res = await fetch(`/api/collection/${editingId}`,{
        method:"PATCH",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status: editStatus, rating:editRating, review:editReview||null})
      });
      if(!res.ok) throw new Error();
      setItems(prev=>prev.map(i=>i.id===editingId?{...i,status: editStatus, rating:editRating,review:editReview||null}:i));
      toast.success("Сохранено");
      setEditingId(null);
    } catch { toast.error("Ошибка сохранения"); }
  };

  const removeItem = async(id:string)=>{
    setItems(prev=>prev.filter(i=>i.id!==id)); setDetailItem(null);
    try {
      const res = await fetch(`/api/collection/${id}`,{method:"DELETE"});
      if(!res.ok) throw new Error();
      toast.success("Удалено из коллекции");
    } catch { setItems(initialItems); toast.error("Ошибка удаления"); }
  };

  const removeItemsWithUndo = async (ids: string[]) => {
    if (ids.length === 0) return;
    const snapshot = items;
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    setSelectedIds([]);
    setDetailItem(null);

    const opId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    deleteOpRef.current = { id: opId, cancelled: false };

    const undo = () => {
      if (deleteOpRef.current?.id === opId) deleteOpRef.current.cancelled = true;
      setItems(snapshot);
      toast.success("Отменено");
    };

    toast("Удалено из коллекции", {
      description: ids.length === 1 ? "Элемент удалён" : `Удалено элементов: ${ids.length}`,
      action: { label: "Отменить", onClick: undo },
    } as any);

    // Даём небольшой буфер на "undo".
    await new Promise((r) => setTimeout(r, 4500));

    if (deleteOpRef.current?.id !== opId) return;
    if (deleteOpRef.current?.cancelled) return;

    try {
      await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/collection/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      }));
    } catch {
      // Если сервер не принял — возвращаем.
      setItems(snapshot);
      toast.error("Ошибка удаления");
    }
  };

  const openShare = (id: string) => {
    setShareItemId(id);
    setShareOpen(true);
  };

  const [friends, setFriends] = useState<{ id: string; other: { id: string; name: string; email: string; image: string | null } }[]>([]);
  useEffect(() => {
    fetch("/api/friends")
      .then((r) => r.json())
      .then((d) => setFriends(d.friends ?? []))
      .catch(() => {});
  }, []);

  const sendShare = async (toUserId: string) => {
    if (!shareItemId) return;
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId, collectionItemId: shareItemId }),
    });
    if (res.ok) {
      toast.success("Отправлено");
      setShareOpen(false);
      setShareItemId(null);
    } else {
      toast.error("Не удалось отправить");
    }
  };

  const startEdit = (item:CollectionItemWithMedia)=>{ setEditingId(item.id); setEditStatus(item.status); setEditRating(item.rating??null); setEditReview(item.review??""); setDetailItem(null); };

  const handleToggleTag = async(tag:Tag)=>{
    if(!editingId) return;
    const hasTag = itemTags.some(t=>t.id===tag.id);
    if(hasTag) {
      await fetch(`/api/collection/${editingId}/tags`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:tag.id})});
      setItemTags(p=>p.filter(t=>t.id!==tag.id));
      setItems(p=>p.map(i=>i.id===editingId?{...i,tags:((i as any).tags??[]).filter((t:any)=>t.id!==tag.id)}:i));
    } else {
      await fetch(`/api/collection/${editingId}/tags`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:tag.id})});
      setItemTags(p=>[...p,tag]);
      setItems(p=>p.map(i=>i.id===editingId?{...i,tags:[...((i as any).tags??[]),tag]}:i));
    }
  };

  const handleCreateTag = async(name:string, color:string)=>{
    if(!name.trim()) return;
    const res = await fetch("/api/tags",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),color})});
    if(res.status===409){ toast.error("Тег уже существует"); return; }
    const data = await res.json();
    setAllTags(p=>[...p,data.tag]);
    if(editingId) {
      await fetch(`/api/collection/${editingId}/tags`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tagId:data.tag.id})});
      setItemTags(p=>[...p,data.tag]);
    }
  };

  const deleteTag = async(tagId:string)=>{
    await fetch(`/api/tags/${tagId}`,{method:"DELETE"});
    setAllTags(p=>p.filter(t=>t.id!==tagId));
    setItemTags(p=>p.filter(t=>t.id!==tagId));
    setItems(p=>p.map(i=>({...i,tags:((i as any).tags??[]).filter((t:any)=>t.id!==tagId)})));
  };

  const resetFilters = ()=>{ setStatusFilter("all"); setTypeFilter("all"); setYearFrom(""); setYearTo(""); setGenreFilter(""); setTagFilter(null); setSearchQuery(""); };
  const hasActiveFilters = statusFilter!=="all" || typeFilter!=="all" || unratedOnly || yearFrom || yearTo || genreFilter || tagFilter || searchQuery.trim();
  const tagNameById = useMemo(() => {
    const m = new Map<string, string>();
    allTags.forEach((t) => m.set(t.id, t.name));
    return m;
  }, [allTags]);

  if(items.length===0) return (
    <div className="text-center py-32 space-y-4">
      <div className="text-6xl">📭</div>
      <p className="text-lg font-semibold text-foreground">Коллекция пуста</p>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        Перейди на <a href="/dashboard" className="text-primary hover:underline">главную страницу</a> и добавь что-нибудь интересное
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShareOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md glass rounded-2xl overflow-hidden animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <p className="font-semibold text-foreground">Поделиться с другом</p>
              <button className="w-9 h-9 rounded-xl border border-border/70 hover:bg-muted/40 transition-all focus-ring" onClick={() => setShareOpen(false)}>✕</button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {friends.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground">Нет друзей</div>
              ) : (
                friends.map((f) => (
                  <button
                    key={f.other.id}
                    onClick={() => sendShare(f.other.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/30 hover:bg-muted/40 transition-all text-left focus-ring"
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-muted/50 flex items-center justify-center flex-shrink-0">
                      {f.other.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={f.other.image} alt={f.other.name} className="w-full h-full object-cover" />
                        : <div className="text-sm font-bold text-primary">{f.other.name.slice(0, 1).toUpperCase()}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{f.other.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.other.email}</p>
                    </div>
                    <span className="text-xs text-primary">Отправить →</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <StatBar items={items}/>

      <div className="relative">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
          placeholder="Поиск по названию, автору, жанру, отзыву..."
          className="w-full bg-card/60 border border-border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"/>
        {searchQuery && (
          <button onClick={()=>setSearchQuery("")} className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        )}
      </div>

      <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Статус</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground cursor-pointer focus-ring"
            >
              <option value="all">{`Все (${counts.all})`}</option>
              <option value="WANT">{`${STATUS_LABELS.WANT} (${counts.WANT ?? 0})`}</option>
              <option value="IN_PROGRESS">{`${STATUS_LABELS.IN_PROGRESS} (${counts.IN_PROGRESS ?? 0})`}</option>
              <option value="COMPLETED">{`${STATUS_LABELS.COMPLETED} (${counts.COMPLETED ?? 0})`}</option>
              <option value="DROPPED">{`${STATUS_LABELS.DROPPED} (${counts.DROPPED ?? 0})`}</option>
            </select>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-lg border border-border bg-background/50">
            {TYPE_FILTERS.map((type) => (
              <button
                key={type.value}
                onClick={() => setTypeFilter(type.value)}
                className={cn(
                  "text-xs px-2.5 py-1.5 rounded-md border transition-all duration-200 font-medium",
                  typeFilter === type.value
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>

          <select
            value={sortBy}
            onChange={e=>setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-background border border-border rounded-lg px-3 py-2 focus:outline-none text-foreground cursor-pointer focus-ring"
          >
            {SORT_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button
            onClick={() => setUnratedOnly((p) => !p)}
            className={cn(
              "text-xs px-3 py-2 rounded-lg border transition-all",
              unratedOnly
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            )}
            title="Показать элементы без оценки"
          >
            ⭐ Не оценено
          </button>

          <button onClick={()=>setShowFilters(s=>!s)}
            className={cn(
              "text-xs px-3 py-2 rounded-lg border transition-all flex items-center gap-1.5",
              showFilters || hasActiveFilters
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:border-primary/30"
            )}>
            🎛 Доп. фильтры
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"/>}
          </button>

          {hasActiveFilters && (
            <button onClick={resetFilters}
              className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-all">
              ✕ Сбросить
            </button>
          )}
        </div>

        <button
          onClick={() => {
            setMultiSelectMode((prev) => {
              if (prev) setSelectedIds([]);
              return !prev;
            });
          }}
          className={cn(
            "text-xs px-3 py-2 rounded-lg border transition-all font-semibold",
            multiSelectMode
              ? "bg-primary/20 text-primary border-primary/30"
              : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
          )}
        >
          {multiSelectMode ? "Готово" : "Выбрать несколько"}
        </button>
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 -mt-2">
          <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wide">Активные фильтры</span>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring">
              Статус: {STATUS_LABELS[statusFilter as CollectionStatus]} ✕
            </button>
          )}
          {typeFilter !== "all" && (
            <button onClick={() => setTypeFilter("all")}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring">
              Тип: {TYPE_FILTERS.find((t) => t.value === typeFilter)?.label ?? typeFilter} ✕
            </button>
          )}
          {unratedOnly && (
            <button onClick={() => setUnratedOnly(false)}
              className="text-xs px-3 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-300 hover:bg-amber-500/15 transition-all focus-ring">
              Без оценки ✕
            </button>
          )}
          {(yearFrom || yearTo) && (
            <button onClick={() => { setYearFrom(""); setYearTo(""); }}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring">
              Год: {yearFrom || "…"}–{yearTo || "…"} ✕
            </button>
          )}
          {genreFilter && (
            <button onClick={() => setGenreFilter("")}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring">
              Жанр: {genreFilter} ✕
            </button>
          )}
          {tagFilter && (
            <button onClick={() => setTagFilter(null)}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring">
              Тег: {tagNameById.get(tagFilter) ?? "выбран"} ✕
            </button>
          )}
          {searchQuery.trim() && (
            <button onClick={() => setSearchQuery("")}
              className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-card/30 hover:bg-muted/40 transition-all focus-ring max-w-full">
              <span className="truncate inline-block max-w-[240px] align-bottom">Поиск: {searchQuery}</span> ✕
            </button>
          )}
          <button onClick={resetFilters}
            className="text-xs px-3 py-1.5 rounded-full border border-red-500/25 bg-red-500/10 text-red-300 hover:bg-red-500/15 transition-all focus-ring">
            Сбросить всё
          </button>
        </div>
      )}

      {multiSelectMode && (
        <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">Выбрано: {selectedIds.length}</span>
            <button
              onClick={selectAllVisible}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Выбрать всё
            </button>
            <button
              onClick={invertVisible}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Инвертировать
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-2 py-1"
            >
              Снять выделение
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as CollectionStatus)}
              className="text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground cursor-pointer focus-ring"
            >
              {(["WANT", "IN_PROGRESS", "COMPLETED", "DROPPED"] as CollectionStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <button
              onClick={() => updateStatusBulk(selectedIds, bulkStatus)}
              disabled={selectedIds.length === 0}
              className="text-xs px-3 py-2 rounded-lg bg-primary/15 text-primary border border-primary/25 hover:bg-primary/20 transition-all focus-ring interactive-soft"
            >
              Применить статус
            </button>
            <button
              onClick={() => removeItemsWithUndo(selectedIds)}
              disabled={selectedIds.length === 0}
              className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/15 transition-all focus-ring interactive-soft"
            >
              Удалить
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap" />

        <div className="flex bg-muted/30 border border-border rounded-xl overflow-hidden p-0.5 gap-0.5">
          {[
            { mode:"grid", label:"Сетка",
              icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg> },
            { mode:"list", label:"Список",
              icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg> },
            { mode:"shelf", label:"Полка",
              icon:<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 6a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/></svg> },
          ].map(({mode,label,icon})=>(
            <button key={mode} onClick={()=>setViewMode(mode as any)}
              title={label}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                viewMode===mode
                  ? "bg-card text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}>
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showFilters && (
        <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in border border-primary/10">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Жанр</label>
            <input type="text" value={genreFilter} onChange={e=>setGenreFilter(e.target.value)}
              placeholder="Например: боевик" list="genres-list"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"/>
            <datalist id="genres-list">{allGenres.map(g=><option key={g} value={g}/>)}</datalist>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Год от</label>
            <input type="number" value={yearFrom} onChange={e=>setYearFrom(e.target.value)} placeholder="1980"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Год до</label>
            <input type="number" value={yearTo} onChange={e=>setYearTo(e.target.value)} placeholder="2025"
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/40"/>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Тег</label>
            <select
              value={tagFilter ?? ""}
              onChange={(e) => setTagFilter(e.target.value ? e.target.value : null)}
              className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 text-foreground cursor-pointer focus-ring"
            >
              <option value="">Все теги</option>
              {allTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {hasActiveFilters
            ? <>Найдено <span className="text-foreground font-semibold">{filtered.length}</span> из {items.length}</>
            : <><span className="text-foreground font-semibold">{items.length}</span> {items.length===1?"элемент":items.length<5?"элемента":"элементов"}</>}
        </p>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-muted-foreground space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="font-medium">Ничего не найдено</p>
          <button onClick={resetFilters} className="text-primary hover:underline text-sm">Сбросить фильтры</button>
        </div>
      )}

      {viewMode==="shelf" && filtered.length>0 && (
        <ShelfView items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem}/>
      )}

      {viewMode!=="shelf" && filtered.length>0 && statusFilter==="all" && typeFilter==="all" && (() => {
        const movies = filtered.filter(i=>i.mediaItem.type==="movie");
        const books  = filtered.filter(i=>i.mediaItem.type==="book");
        const games  = filtered.filter(i=>i.mediaItem.type==="game");

        const onClickItem = (item: CollectionItemWithMedia, e: React.MouseEvent) => {
          if (selectionMode) {
            toggleSelect(item.id, e);
            return;
          }
          setDetailItem(item);
        };

        return (
          <div className="space-y-14">

            {movies.length > 0 && (
              <div className="space-y-4">
                <div className="relative flex items-center gap-0 overflow-hidden rounded-xl select-none" style={{height:52}}>
                  <div className="flex-shrink-0 flex flex-col justify-around h-full px-2 py-1 gap-1 bg-blue-950/80 border-r border-blue-800/40" style={{width:28}}>
                    {Array.from({length:4}).map((_,i)=>(
                      <div key={i} className="w-3 h-3 rounded-sm bg-background/80 border border-blue-700/30"/>
                    ))}
                  </div>
                  <div className="flex-1 flex items-center gap-4 bg-blue-950/80 px-5 h-full">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
                      </svg>
                      <span className="font-display font-black text-xl tracking-tight text-white uppercase" style={{letterSpacing:"0.06em"}}>Фильмы</span>
                    </div>
                    <div className="h-4 w-px bg-blue-700/50"/>
                    <span className="text-blue-300 font-mono text-sm font-bold">{movies.length} titles</span>
                    <div className="ml-auto flex items-center gap-1 opacity-20">
                      {Array.from({length:8}).map((_,i)=>(
                        <div key={i} className="w-2 h-4 rounded-sm bg-blue-300 border border-blue-400/30"/>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col justify-around h-full px-2 py-1 gap-1 bg-blue-950/80 border-l border-blue-800/40" style={{width:28}}>
                    {Array.from({length:4}).map((_,i)=>(
                      <div key={i} className="w-3 h-3 rounded-sm bg-background/80 border border-blue-700/30"/>
                    ))}
                  </div>
                </div>
                {viewMode==="grid"
                  ? <GridView items={movies} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>
                  : <ListView items={movies} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>}
              </div>
            )}

            {books.length > 0 && (
              <div className="space-y-4">
                <div className="relative overflow-hidden" style={{height:60}}>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60 border border-amber-800/30"/>
                  <div className="absolute inset-0 rounded-xl overflow-hidden opacity-10">
                    {Array.from({length:6}).map((_,i)=>(
                      <div key={i} className="absolute left-0 right-0 h-px bg-amber-400" style={{top: 8 + i*9}}/>
                    ))}
                  </div>
                  <div className="absolute left-14 top-0 bottom-0 w-px bg-red-400/30"/>
                  <div className="absolute left-4 top-0 bottom-0 flex flex-col justify-around py-2">
                    {[0,1,2].map(i=>(
                      <div key={i} className="w-4 h-4 rounded-full bg-background/60 border border-amber-700/30"/>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center gap-4 pl-16 pr-6">
                    <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/>
                    </svg>
                    <span className="font-display font-black text-xl text-amber-100 uppercase tracking-widest">Книги</span>
                    <span className="text-amber-500/70 text-xs font-mono italic">{books.length} шт.</span>
                    <svg className="absolute bottom-2 left-16 w-32 h-3 text-amber-600/40" viewBox="0 0 120 10" fill="none">
                      <path d="M2 7 Q30 3 60 6 Q90 9 118 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    </svg>
                  </div>
                </div>
                {viewMode==="grid"
                  ? <GridView items={books} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>
                  : <ListView items={books} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>}
              </div>
            )}

            {games.length > 0 && (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-black/60" style={{height:56}}>
                  <div className="absolute inset-0 opacity-5 pointer-events-none" style={{backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,0,0.3) 2px,rgba(0,255,0,0.3) 3px)"}}/>
                  <div className="absolute top-1.5 left-1.5 w-4 h-4 border-l-2 border-t-2 border-emerald-400/70"/>
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 border-r-2 border-t-2 border-emerald-400/70"/>
                  <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-l-2 border-b-2 border-emerald-400/70"/>
                  <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-r-2 border-b-2 border-emerald-400/70"/>
                  <div className="absolute inset-0 flex items-center gap-4 px-8">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h.01M18 12h.01M12 6h.01M12 18h.01M8.25 12a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm4.5-4.5a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm0 9a.75.75 0 111.5 0 .75.75 0 01-1.5 0zm-6.75 0a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
                    </svg>
                    <span className="font-mono font-black text-xl text-emerald-300 uppercase tracking-widest" style={{textShadow:"0 0 12px rgba(74,222,128,0.5)"}}>ИГРЫ</span>
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-emerald-500/60 font-mono text-xs">SAVE</span>
                      <div className="flex gap-0.5">
                        {Array.from({length: Math.min(games.length, 10)}).map((_,i)=>(
                          <div key={i} className="w-2 h-3 rounded-sm bg-emerald-400/70" style={{boxShadow:"0 0 4px rgba(74,222,128,0.4)"}}/>
                        ))}
                        {games.length > 10 && <span className="text-emerald-500/60 font-mono text-xs ml-1">+{games.length-10}</span>}
                      </div>
                    </div>
                    <span className="ml-auto font-mono text-emerald-500/50 text-xs">{String(games.length).padStart(3,"0")} FILES</span>
                  </div>
                </div>
                {viewMode==="grid"
                  ? <GridView items={games} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>
                  : <ListView items={games} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>}
              </div>
            )}

          </div>
        );
      })()}

      {viewMode!=="shelf" && filtered.length>0 && !(statusFilter==="all" && typeFilter==="all") && (
        (() => {
          const onClickItem = (item: CollectionItemWithMedia, e: React.MouseEvent) => {
            if (selectionMode) {
              toggleSelect(item.id, e);
              return;
            }
            setDetailItem(item);
          };
          return (
        viewMode==="grid"
          ? <GridView items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>
          : <ListView items={filtered} onSelect={setDetailItem} onEdit={startEdit} onRemove={removeItem} selectedIds={selectedIds} onToggleSelect={toggleSelect} selectionMode={selectionMode} multiSelectMode={multiSelectMode} onClickItem={onClickItem} onShare={openShare}/>
          );
        })()
      )}

      {detailItem && (
        <DetailModal item={detailItem} onClose={()=>setDetailItem(null)} onEdit={startEdit} onRemove={removeItem} onStatusChange={updateStatus}/>
      )}
      {editingId && (
        <EditModal editingId={editingId} editStatus={editStatus} editRating={editRating} editReview={editReview} allTags={allTags} itemTags={itemTags}
          onStatusChange={setEditStatus} onRatingChange={setEditRating} onReviewChange={setEditReview} onSave={saveEdit} onClose={()=>setEditingId(null)}
          onToggleTag={handleToggleTag} onCreateTag={handleCreateTag} onDeleteTag={deleteTag}/>
      )}
    </div>
  );
}