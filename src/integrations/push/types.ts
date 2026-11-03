/** Rozhraní modulu upozornění (E6). Výpadek push služby nic jiného nerozbije. */
export interface PushSubscriptionRow { endpoint: string; keys: { p256dh: string; auth: string } }
export interface PushPayload { title: string; body: string; url: string }

export interface Pusher {
  /** Vrací false, když odběr už neplatí (410/404) a má se smazat. */
  send(sub: PushSubscriptionRow, payload: PushPayload): Promise<boolean>;
}
