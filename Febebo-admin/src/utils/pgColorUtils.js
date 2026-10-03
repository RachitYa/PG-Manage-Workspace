/**
 * pgColorUtils.js
 * Multi-PG Theme Color Palettes and Resolution Utilities
 * Assigns distinct, recognizable color palettes to different PGs in multi-PG setups.
 */

export const PG_COLOR_PALETTES = [
  {
    id: 'indigo',
    name: 'Royal Indigo',
    primary: '#4f46e5',
    bg: '#eef2ff',
    border: '#c7d2fe',
    text: '#3730a3',
    badgeBg: '#e0e7ff',
    stripe: '#4f46e5',
    dot: '#6366f1',
    cardBg: '#fafafa',
    chipBg: '#eef2ff',
    chipText: '#4338ca',
    glow: 'rgba(99, 102, 241, 0.18)'
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    primary: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
    badgeBg: '#d1fae5',
    stripe: '#059669',
    dot: '#10b981',
    cardBg: '#fafafa',
    chipBg: '#ecfdf5',
    chipText: '#047857',
    glow: 'rgba(16, 185, 129, 0.18)'
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    primary: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
    badgeBg: '#fef3c7',
    stripe: '#d97706',
    dot: '#f59e0b',
    cardBg: '#fafafa',
    chipBg: '#fffbeb',
    chipText: '#b45309',
    glow: 'rgba(245, 158, 11, 0.18)'
  },
  {
    id: 'purple',
    name: 'Vibrant Purple',
    primary: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    text: '#5b21b6',
    badgeBg: '#ede9fe',
    stripe: '#7c3aed',
    dot: '#8b5cf6',
    cardBg: '#fafafa',
    chipBg: '#f5f3ff',
    chipText: '#6d28d9',
    glow: 'rgba(139, 92, 246, 0.18)'
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    primary: '#e11d48',
    bg: '#fff1f2',
    border: '#fecdd3',
    text: '#9f1239',
    badgeBg: '#ffe4e6',
    stripe: '#e11d48',
    dot: '#f43f5e',
    cardBg: '#fafafa',
    chipBg: '#fff1f2',
    chipText: '#be123c',
    glow: 'rgba(244, 63, 94, 0.18)'
  },
  {
    id: 'cyan',
    name: 'Ocean Cyan',
    primary: '#0891b2',
    bg: '#ecfeff',
    border: '#a5f3fc',
    text: '#155e75',
    badgeBg: '#cffafe',
    stripe: '#0891b2',
    dot: '#06b6d4',
    cardBg: '#fafafa',
    chipBg: '#ecfeff',
    chipText: '#0e7490',
    glow: 'rgba(6, 182, 212, 0.18)'
  },
  {
    id: 'pink',
    name: 'Magenta Pink',
    primary: '#db2777',
    bg: '#fdf2f8',
    border: '#fbcfe8',
    text: '#9d174d',
    badgeBg: '#fce7f3',
    stripe: '#db2777',
    dot: '#ec4899',
    cardBg: '#fafafa',
    chipBg: '#fdf2f8',
    chipText: '#be185d',
    glow: 'rgba(236, 72, 153, 0.18)'
  },
  {
    id: 'sky',
    name: 'Marine Sky',
    primary: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    text: '#075985',
    badgeBg: '#e0f2fe',
    stripe: '#0284c7',
    dot: '#0ea5e9',
    cardBg: '#fafafa',
    chipBg: '#f0f9ff',
    chipText: '#0369a1',
    glow: 'rgba(14, 165, 233, 0.18)'
  }
];

/**
 * Returns a deterministic color palette for a PG given its ID, index, or name.
 */
export const getPgColor = (pgId, pgIndex = -1, customName = '') => {
  if (pgIndex >= 0 && pgIndex < PG_COLOR_PALETTES.length) {
    return PG_COLOR_PALETTES[pgIndex];
  }
  const str = String(pgId || customName || 'primary');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PG_COLOR_PALETTES.length;
  return PG_COLOR_PALETTES[index];
};

/**
 * Builds a fast lookup map of PG metadata & colors from a pgList array and admin UID.
 */
export const buildPgLookupMap = (pgList = [], adminUid = '') => {
  const map = {};

  pgList.forEach((pg, index) => {
    const color = getPgColor(pg.id, index, pg.pgName || pg.name);
    const pgObj = {
      id: pg.id,
      name: pg.pgName || pg.name || (pg.id === 'primary' ? 'Main PG' : `Branch PG #${index + 1}`),
      color: color,
      isPrimary: pg.id === 'primary' || pg.id === adminUid,
      location: pg.location || ''
    };

    map[pg.id] = pgObj;
    if (pg.id === 'primary' && adminUid) {
      map[adminUid] = pgObj;
    }
  });

  // Fallback for primary if pgList was empty or loading
  if (!map['primary']) {
    const defaultColor = PG_COLOR_PALETTES[0];
    const defaultObj = {
      id: 'primary',
      name: 'Main PG',
      color: defaultColor,
      isPrimary: true,
      location: ''
    };
    map['primary'] = defaultObj;
    if (adminUid) map[adminUid] = defaultObj;
  }

  return map;
};

/**
 * Resolve PG info for a single document / notification
 */
export const resolveDocPgInfo = (docPgId, pgLookupMap = {}, adminUid = '') => {
  if (!docPgId || docPgId === 'primary' || (adminUid && docPgId === adminUid)) {
    return pgLookupMap['primary'] || pgLookupMap[adminUid] || {
      id: 'primary',
      name: 'Main PG',
      color: PG_COLOR_PALETTES[0],
      isPrimary: true
    };
  }

  if (pgLookupMap[docPgId]) {
    return pgLookupMap[docPgId];
  }

  // Fallback if not found in list yet
  const color = getPgColor(docPgId);
  return {
    id: docPgId,
    name: 'PG ' + docPgId.slice(0, 6).toUpperCase(),
    color: color,
    isPrimary: false
  };
};
