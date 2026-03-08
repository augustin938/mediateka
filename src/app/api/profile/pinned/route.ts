import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { pinnedItems } = await req.json();
  if (!Array.isArray(pinnedItems) || pinnedItems.length > 3) {
    return Response.json({ error: "Max 3 items" }, { status: 400 });
  }

  await db.update(users)
    .set({ pinnedItems } as any)
    .where(eq(users.id, session.user.id));

  return Response.json({ ok: true });
}