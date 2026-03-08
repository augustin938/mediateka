"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="text-6xl">💥</div>
      <div className="space-y-2">
        <h2 className="font-display font-bold text-xl text-foreground">Что-то пошло не так</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Произошла ошибка при загрузке страницы «Коллекция».
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/50">Код: {error.digest}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
      >
        Попробовать снова
      </button>
    </div>
  );
}
