import RecommendationsClient from "@/components/recommendations/RecommendationsClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <NeonSectionHeader
        title="Рекомендации"
        subtitle="Подобраны специально для тебя на основе коллекции"
      />
      <RecommendationsClient />
    </div>
  );
}