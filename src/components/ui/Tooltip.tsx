'use client';

import { cloneElement, isValidElement, ReactElement, ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Point = { left: number; top: number; side: Side };

const TOOLTIP_EVENT = 'runshow:tooltip-open';
const GAP = 9;
const EDGE = 8;
const subscribeToMount = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

function positionTooltip(trigger: DOMRect, tooltip: DOMRect, preferred: Side): Point {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const candidates: Side[] = preferred === 'right' ? ['right', 'left', 'bottom', 'top']
    : preferred === 'left' ? ['left', 'right', 'bottom', 'top']
      : preferred === 'top' ? ['top', 'bottom', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  const place = (side: Side) => {
    if (side === 'right') return { side, left: trigger.right + GAP, top: trigger.top + (trigger.height - tooltip.height) / 2 };
    if (side === 'left') return { side, left: trigger.left - tooltip.width - GAP, top: trigger.top + (trigger.height - tooltip.height) / 2 };
    if (side === 'top') return { side, left: trigger.left + (trigger.width - tooltip.width) / 2, top: trigger.top - tooltip.height - GAP };
    return { side, left: trigger.left + (trigger.width - tooltip.width) / 2, top: trigger.bottom + GAP };
  };
  const fits = (point: Point) => point.left >= EDGE && point.top >= EDGE
    && point.left + tooltip.width <= viewportWidth - EDGE
    && point.top + tooltip.height <= viewportHeight - EDGE;
  const point = candidates.map(place).find(fits) ?? place(candidates[0]);
  return {
    ...point,
    left: Math.min(Math.max(EDGE, point.left), Math.max(EDGE, viewportWidth - tooltip.width - EDGE)),
    top: Math.min(Math.max(EDGE, point.top), Math.max(EDGE, viewportHeight - tooltip.height - EDGE)),
  };
}

export function Tooltip({ label, enabled = true, side = 'right', className = '', children }: { label: string; enabled?: boolean; side?: Side; className?: string; children: ReactNode }) {
  const id = `runshow-tooltip-${useId().replace(/:/g, '')}`;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const mounted = useSyncExternalStore(subscribeToMount, getClientMounted, getServerMounted);
  const [point, setPoint] = useState<Point | null>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerActivation = useRef(false);
  const requested = enabled && (hovered || focused) && !dismissed;

  const clearDelay = useCallback(() => {
    if (delayRef.current) clearTimeout(delayRef.current);
    delayRef.current = null;
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = wrapperRef.current?.firstElementChild?.getBoundingClientRect() ?? wrapperRef.current?.getBoundingClientRect();
    const tooltip = tooltipRef.current?.getBoundingClientRect();
    if (!trigger || !tooltip) return;
    const next = positionTooltip(trigger, tooltip, side);
    setPoint(current => current && current.left === next.left && current.top === next.top && current.side === next.side ? current : next);
  }, [side]);

  useLayoutEffect(() => {
    if (!requested || !mounted) return;
    updatePosition();
    window.dispatchEvent(new CustomEvent(TOOLTIP_EVENT, { detail: id }));
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    };
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (wrapperRef.current) observer?.observe(wrapperRef.current);
    const sidebar = wrapperRef.current?.closest('#main-sidebar');
    if (sidebar) observer?.observe(sidebar);
    if (tooltipRef.current) observer?.observe(tooltipRef.current);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      observer?.disconnect();
    };
  }, [id, mounted, requested, updatePosition]);

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) {
        setHovered(false);
        setFocused(false);
        setPoint(null);
      }
    };
    window.addEventListener(TOOLTIP_EVENT, closeOther);
    return () => window.removeEventListener(TOOLTIP_EVENT, closeOther);
  }, [id]);

  useEffect(() => clearDelay, [clearDelay]);

  if (!enabled) return <>{children}</>;

  const childDescription = isValidElement(children)
    ? (children.props as { 'aria-describedby'?: string })['aria-describedby']
    : undefined;
  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
      'aria-describedby': [childDescription, requested ? id : undefined].filter(Boolean).join(' ') || undefined,
    })
    : children;

  return (
    <>
      <span
        ref={wrapperRef}
        className={`inline-flex ${className}`}
        onPointerDown={() => { pointerActivation.current = true; }}
        onPointerUp={() => { pointerActivation.current = false; }}
        onClick={() => {
          pointerActivation.current = false;
          setHovered(false);
          setFocused(false);
          setDismissed(true);
          setPoint(null);
        }}
        onPointerEnter={event => {
          if (event.pointerType === 'touch') return;
          clearDelay();
          setDismissed(false);
          delayRef.current = setTimeout(() => setHovered(true), 350);
        }}
        onPointerLeave={() => { clearDelay(); setHovered(false); setDismissed(false); }}
        onFocus={() => {
          if (!pointerActivation.current) {
            clearDelay();
            setFocused(true);
            setDismissed(false);
          }
        }}
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setFocused(false);
            setDismissed(false);
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' && requested) {
            event.preventDefault();
            setDismissed(true);
            setPoint(null);
          }
        }}
      >
        {trigger}
      </span>
      {mounted && createPortal(
        <span
          ref={tooltipRef}
          id={id}
          role="tooltip"
          aria-hidden={!requested}
          data-side={point?.side ?? side}
          className={`pointer-events-none fixed z-[100] w-max max-w-[calc(100vw-1rem)] rounded-md border border-[var(--border)] bg-[var(--tooltip-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--tooltip-fg)] shadow-md shadow-[var(--shadow-color)] transition-opacity duration-100 motion-reduce:transition-none ${requested && point ? 'opacity-100' : 'invisible opacity-0'}`}
          style={{ left: point?.left ?? 0, top: point?.top ?? 0, whiteSpace: 'normal' }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  );
}
