import { useState, useEffect, RefObject } from 'react';

export interface PopupPos {
  top: number;
  left: number;
  width: number;
}

const MARGIN = 8;

function compute(trigger: HTMLElement, popup: HTMLElement | null, desiredWidth: number): PopupPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tr = trigger.getBoundingClientRect();

  const width = Math.min(desiredWidth, vw - MARGIN * 2);

  let left = tr.left;
  if (left + width > vw - MARGIN) left = vw - MARGIN - width;
  if (left < MARGIN) left = MARGIN;

  const popupH = popup ? popup.getBoundingClientRect().height : 200;
  const spaceBelow = vh - tr.bottom - MARGIN;
  const top = spaceBelow >= Math.min(popupH, 60) || spaceBelow >= tr.top - MARGIN ? tr.bottom + 6 : tr.top - 6 - popupH;

  return { top: Math.max(MARGIN, top), left, width };
}

/**
 * Keeps popup anchored to trigger on scroll/resize.
 */
export function usePopupPosition(
  triggerRef: RefObject<HTMLElement | null>,
  popupRef: RefObject<HTMLElement | null>,
  open: boolean,
  desiredWidth: number,
): PopupPos {
  const [pos, setPos] = useState<PopupPos>({ top: 0, left: 0, width: desiredWidth });

  useEffect(() => {
    if (!open || !triggerRef.current) return;

    const update = () => {
      if (triggerRef.current) setPos(compute(triggerRef.current, popupRef.current, desiredWidth));
    };

    update();

    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update, { passive: true });
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [open, desiredWidth]); // eslint-disable-line react-hooks/exhaustive-deps

  return pos;
}

/** @deprecated use usePopupPosition — clamp is now built-in */
export function usePopupClamp(
  _popupRef: RefObject<HTMLElement | null>,
  _triggerRef: RefObject<HTMLElement | null>,
  _open: boolean,
  _setPos: (p: PopupPos) => void,
  _width: number,
) {}
