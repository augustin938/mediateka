import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { assertFriends, getOrCreateConversation } from "@/lib/chat/server";
import { chatBus } from "@/lib/chat/pubsub";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const withUserId = url.searchParams.get("with");
  if (!withUserId) return new Response("with is required", { status: 400 });

  try {
    await assertFriends(session.user.id, withUserId);
  } catch {
    return new Response("Not friends", { status: 403 });
  }

  const conversation = await getOrCreateConversation(session.user.id, withUserId);
  const topic = `conversation:${conversation.id}`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send("ready", { conversationId: conversation.id });

      const off = chatBus.on(topic, (payload) => send("chat", payload));

      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
      }, 25000);

      const close = () => {
        clearInterval(keepAlive);
        off();
        try { controller.close(); } catch {}
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req.signal as any)?.addEventListener?.("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

