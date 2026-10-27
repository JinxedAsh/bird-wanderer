// Keep refresh gestures local to the feed, without intercepting forms or normal scrolling.
export function attachPullToRefresh(
  element: HTMLElement,
  canRefresh: () => boolean,
  onRefresh: () => void,
  onDistance: (distance: number) => void,
) {
  let start: { x: number; y: number } | null = null;
  let distance = 0;
  const reset = () => { start = null; distance = 0; onDistance(0); };
  const atTop = (target: EventTarget | null) => {
    if ((element.ownerDocument.scrollingElement?.scrollTop ?? 0) > 0) return false;
    for (let node = target as HTMLElement | null; node; node = node.parentElement) {
      if (node.scrollTop > 0) return false;
    }
    return true;
  };
  const begin = (event: TouchEvent) => {
    reset();
    if (event.touches.length !== 1 || !canRefresh() || !atTop(event.target)) return;
    const target = event.target as Element | null;
    if (target?.closest('button, input, textarea, select, a, audio, video, [role="dialog"], [contenteditable="true"]')) return;
    start = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const move = (event: TouchEvent) => {
    if (!start) return;
    if (event.touches.length !== 1 || !canRefresh() || !atTop(event.target)) { reset(); return; }
    const dy = event.touches[0].clientY - start.y;
    const dx = Math.abs(event.touches[0].clientX - start.x);
    if (dy < 0 || (dx > 10 && dx > dy)) { reset(); return; }
    if (dy < 10 || dy < dx) return;
    if (event.cancelable) event.preventDefault();
    distance = Math.min(96, dy / 2);
    onDistance(distance);
  };
  const end = (event: TouchEvent) => {
    const ready = Boolean(start) && distance >= 64 && event.touches.length === 0 && canRefresh();
    reset();
    if (ready) onRefresh();
  };
  element.addEventListener('touchstart', begin, { passive: true });
  element.addEventListener('touchmove', move, { passive: false });
  element.addEventListener('touchend', end);
  element.addEventListener('touchcancel', reset);
  return () => {
    element.removeEventListener('touchstart', begin);
    element.removeEventListener('touchmove', move);
    element.removeEventListener('touchend', end);
    element.removeEventListener('touchcancel', reset);
  };
}
