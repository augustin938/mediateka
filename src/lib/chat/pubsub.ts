type Listener = (payload: any) => void;

class TopicBus {
  private topics = new Map<string, Set<Listener>>();

  on(topic: string, fn: Listener) {
    const set = this.topics.get(topic) ?? new Set<Listener>();
    set.add(fn);
    this.topics.set(topic, set);
    return () => this.off(topic, fn);
  }

  off(topic: string, fn: Listener) {
    const set = this.topics.get(topic);
    if (!set) return;
    set.delete(fn);
    if (set.size === 0) this.topics.delete(topic);
  }

  emit(topic: string, payload: any) {
    const set = this.topics.get(topic);
    if (!set) return;
    for (const fn of set) fn(payload);
  }
}

const g = globalThis as any;
export const chatBus: TopicBus = g.__mediateka_chatBus ?? (g.__mediateka_chatBus = new TopicBus());

export function publishConversationEvent(conversationId: string, payload: any) {
  chatBus.emit(`conversation:${conversationId}`, payload);
}

