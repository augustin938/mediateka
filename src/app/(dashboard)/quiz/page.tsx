import QuizClient from "@/components/quiz/QuizClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Квиз",
  description: "Проверь, как хорошо ты помнишь свою коллекцию",
};
export default function QuizPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <NeonSectionHeader
        title="🎯 Квиз"
        subtitle="Угадай что из твоей коллекции"
      />
      <QuizClient />
    </div>
  );
}