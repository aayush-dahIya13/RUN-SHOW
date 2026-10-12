export type FloatingSide = 'top' | 'right' | 'bottom' | 'left';
export interface FloatingPoint { left: number; top: number; side: FloatingSide }

export function getFloatingPosition(trigger: DOMRect, floating: DOMRect, preferred: FloatingSide, gap = 9): FloatingPoint {
  const edge = 8;
  const candidates: FloatingSide[] = preferred === 'right' ? ['right', 'left', 'bottom', 'top']
    : preferred === 'left' ? ['left', 'right', 'bottom', 'top']
      : preferred === 'top' ? ['top', 'bottom', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  const place = (side: FloatingSide): FloatingPoint => {
    if (side === 'right') return { side, left: trigger.right + gap, top: trigger.top + (trigger.height - floating.height) / 2 };
    if (side === 'left') return { side, left: trigger.left - floating.width - gap, top: trigger.top + (trigger.height - floating.height) / 2 };
    if (side === 'top') return { side, left: trigger.left + (trigger.width - floating.width) / 2, top: trigger.top - floating.height - gap };
    return { side, left: trigger.left + (trigger.width - floating.width) / 2, top: trigger.bottom + gap };
  };
  const fits = (point: FloatingPoint) => point.left >= edge && point.top >= edge
    && point.left + floating.width <= window.innerWidth - edge
    && point.top + floating.height <= window.innerHeight - edge;
  const point = candidates.map(place).find(fits) ?? place(candidates[0]);
  return {
    ...point,
    left: Math.min(Math.max(edge, point.left), Math.max(edge, window.innerWidth - floating.width - edge)),
    top: Math.min(Math.max(edge, point.top), Math.max(edge, window.innerHeight - floating.height - edge)),
  };
}
