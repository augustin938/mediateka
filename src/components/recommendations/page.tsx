import RecommendationsClient from "@/components/recommendations/RecommendationsClient";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Рекомендации</h1>
        <p className="text-muted-foreground mt-1">
          Подобраны специально для тебя на основе коллекции
        </p>
      </div>
      <RecommendationsClient />
    </div>
  );
}