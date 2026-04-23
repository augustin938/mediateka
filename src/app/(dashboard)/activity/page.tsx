import ActivityClient from "@/components/activity/ActivityClient";
import NeonSectionHeader from "@/components/layout/NeonSectionHeader";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "История",
  description: "Вся твоя активность — добавления, оценки и изменения",
};
export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <NeonSectionHeader
        title="История активности"
        subtitle="Всё что происходило с твоей коллекцией"
      />
      <ActivityClient />
    </div>
  );
}