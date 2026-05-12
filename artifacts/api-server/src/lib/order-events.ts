import type { Response } from "express";

const listeners = new Map<number, Set<Response>>();

export function subscribeToOrder(orderId: number, res: Response) {
  if (!listeners.has(orderId)) listeners.set(orderId, new Set());
  listeners.get(orderId)!.add(res);
}

export function unsubscribeFromOrder(orderId: number, res: Response) {
  listeners.get(orderId)?.delete(res);
  if (listeners.get(orderId)?.size === 0) listeners.delete(orderId);
}

export function emitOrderStatus(orderId: number, status: string, transactionId?: string | null) {
  const subs = listeners.get(orderId);
  if (!subs || subs.size === 0) return;
  const payload = JSON.stringify({ status, transactionId: transactionId ?? null });
  for (const res of subs) {
    try {
      res.write(`data: ${payload}\n\n`);
    } catch {}
  }
}
