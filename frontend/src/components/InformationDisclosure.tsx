import React from 'react';

// Keep the opened panel within the current phone viewport, including controls
// near the left edge or bottom of the page. No application state is changed.
export function positionInformationPanel(event: React.SyntheticEvent<HTMLDetailsElement>) {
  if (!event.currentTarget.open) return;
  const panel = event.currentTarget.querySelector<HTMLElement>('.reference-info-panel');
  if (!panel) return;
  panel.style.transform = '';
  const rect = panel.getBoundingClientRect();
  const x = rect.left < 12 ? 12 - rect.left : Math.min(0, window.innerWidth - 12 - rect.right);
  const y = Math.min(0, window.innerHeight - 12 - rect.bottom);
  panel.style.transform = `translate(${x}px, ${y}px)`;
}

// Native disclosure keeps supporting information keyboard-accessible without
// expanding the reference screen's default card layout.
export function InformationDisclosure({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <details onToggle={positionInformationPanel} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }} className={`reference-info ${className}`}>
    <summary aria-label={label} title={label}><span aria-hidden="true" className="material-symbols-outlined text-[18px]">info</span><span className="sr-only">{label}</span></summary>
    <div className="reference-info-panel">{children}</div>
  </details>;
}
