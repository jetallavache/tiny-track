/**
 * BytesDisplay — renders a byte value with a visually de-emphasised unit.
 *
 * The numeric part keeps the caller's color; the unit is rendered slightly
 * smaller, further away, and in a muted gray so it doesn't compete with
 * the value itself.
 *
 * @example
 *   <BytesDisplay bytes={1_500_000} color="#38bdf8" />
 *   // → "1.4 <span style="color:#6b7280;font-size:0.8em">MB</span>"
 */
import { splitBytes } from '../utils/format.js';

interface BytesDisplayProps {
  bytes: number;
  /** Color for the numeric value. */
  color?: string;
  /** Append a "/s" suffix after the unit (for network rates). */
  perSec?: boolean;
}

export function BytesDisplay({ bytes, color, perSec }: BytesDisplayProps) {
  const { value, unit } = splitBytes(bytes);
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ color }}>{value}</span>
      <span style={{ color: '#6b7280', fontSize: '0.8em', marginLeft: '0.25em' }}>
        {unit}
        {perSec ? '/s' : ''}
      </span>
    </span>
  );
}
