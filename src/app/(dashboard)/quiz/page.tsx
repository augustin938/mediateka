import QuizClient from "@/components/quiz/QuizClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Квиз",
  description: "Проверь, как хорошо ты помнишь свою коллекцию",
};
export default function QuizPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">🎯 Квиз</h1>
        <p className="text-muted-foreground mt-1">Угадай что из твоей коллекции</p>
      </div>
      <QuizClient />
    </div>
  );
}