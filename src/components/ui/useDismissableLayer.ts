'use client';

import { RefObject, useEffect } from 'react';

export function useDismissableLayer<T extends HTMLElement>(
  open: boolean,
  onDismiss: () => void,
  containerRef: RefObject<T | null>,
) {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) onDismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [containerRef, onDismiss, open]);
}
