/**
 * useAlertBadge — manages a timed alert badge shared across MetricsBar, MetricsPanel and Dashboard.
 *
 * The badge shows the highest-priority alert for BADGE_TTL_MS milliseconds.
 * When a new alert arrives it immediately replaces the current one (no queue).
 * The component layout is not affected — the badge slot has a fixed width.
 */
import { useState, useEffect, useRef } from 'react';
import { Alert } from '../utils/alerts.js';

const BADGE_TTL_MS = 5000;

/**
 * @param alerts - Current list of active alerts from detectAlerts().
 * @returns The alert to display right now, or null when the timer has expired.
 */
export function useAlertBadge(alerts: Alert[]): Alert | null {
  const [badge, setBadge] = useState<Alert | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const top = alerts.find((a) => a.level === 'crit') ?? alerts[0] ?? null;
    if (!top) return;
    setBadge(top);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setBadge(null), BADGE_TTL_MS);
  }, [alerts]);

  return badge;
}
