export interface DailySectionDef {
  key: string;
  title: string;      // clean, NO number
  numbered: boolean;  // false = header/appendix block
}

// Order per Procore/Raken daily-report standard
export const DAILY_SECTIONS: DailySectionDef[] = [
  { key: 'general',    title: 'General Information',        numbered: false },
  { key: 'manpower',   title: 'Manpower',                   numbered: true  },
  { key: 'logos',      title: 'Project Logos',              numbered: false },
  { key: 'equipment',  title: 'Equipment & Vehicles',       numbered: true  },
  { key: 'activities', title: 'On-Going Activities',        numbered: true  },
  { key: 'concerns',   title: 'Areas of Concern',           numbered: true  },
  { key: 'delays',     title: 'Delays / Disruptions',       numbered: true  },
  { key: 'photos',     title: 'Photographic Evidence',      numbered: false },
  { key: 'aiSummary',  title: 'AI Executive Summary',       numbered: false },
];

export function getSectionLabel(key: string): string {
  let n = 0;
  for (const s of DAILY_SECTIONS) {
    if (s.numbered) n++;
    if (s.key === key) return s.numbered ? `${n}. ${s.title}` : s.title;
  }
  throw new Error(`Unknown daily section: ${key}`);
}
