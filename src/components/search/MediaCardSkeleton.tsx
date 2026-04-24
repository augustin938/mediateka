// Основной экспортируемый компонент файла.
export default function MediaCardSkeleton() {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="aspect-[2/3] skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 skeleton rounded-md w-full" />
        <div className="h-3 skeleton rounded-md w-2/3" />
      </div>
    </div>
  );
}
