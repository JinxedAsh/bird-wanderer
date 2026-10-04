import React from 'react';
import type { AccessInformation } from '../types';

export function HotspotAccess({ access }: { access?: AccessInformation | null }) {
  if (!access) return <p className="text-[12px] text-[#42493e]">No reviewed access information for this hotspot. Hours, fees, camera rules and entrance location are unverified; check the site operator before travel.</p>;
  return <div className="space-y-3 text-[12px] text-[#42493e]">
    <p>Official-source snapshot reviewed {access.checkedAt}. Confirm changes and closures before travel. {access.reviewOverdue && <strong>Review overdue; historical values are withheld.</strong>}</p>
    {([['Gates Opening Hours', access.openingHours], ['Entry Fee', access.entryFee], ['Still Camera Pass / Rules', access.cameraPass], ['Approach / Entry Gates', access.approach]] as const).map(([label, fact]) => (
      <div key={label} className="space-y-1 break-words"><h4 className="font-bold text-[#181c20]">{label}</h4>
        <p>{access.reviewOverdue ? 'Unavailable pending source review.' : fact?.text || 'Not verified from a reviewed official source.'}</p>
        {fact?.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="mr-3 inline-block underline text-[#154212]">{source.label}</a>)}
      </div>
    ))}
    <p>Directions use the eBird hotspot point, not a verified entrance. This information does not grant commercial, tripod or drone permission.</p>
  </div>;
}
