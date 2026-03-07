import ActivityClient from "@/components/activity/ActivityClient";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">История активности</h1>
        <p className="text-muted-foreground mt-1">Всё что происходило с твоей коллекцией</p>
      </div>
      <ActivityClient />
    </div>
  );
}