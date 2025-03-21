/**
 * Theme configuration for the NBA Stats Tracker
 */

export const theme = {
  colors: {
    primary: {
      light: '#3B82F6', // Blue
      dark: '#1E40AF',  // Dark Blue
    },
    secondary: {
      light: '#F59E0B', // Amber
      dark: '#B45309',  // Dark Amber
    },
    background: {
      light: '#F9FAFB', // Light Gray
      dark: '#111827',  // Dark Gray
    },
    text: {
      light: '#1F2937', // Dark Gray
      dark: '#F9FAFB',  // Light Gray
    },
    accent: {
      light: '#10B981', // Emerald
      dark: '#047857',  // Dark Emerald
    },
    error: {
      light: '#EF4444', // Red
      dark: '#B91C1C',  // Dark Red
    },
    warning: {
      light: '#F59E0B', // Amber
      dark: '#B45309',  // Dark Amber
    },
    success: {
      light: '#10B981', // Emerald
      dark: '#047857',  // Dark Emerald
    },
    info: {
      light: '#3B82F6', // Blue
      dark: '#1E40AF',  // Dark Blue
    },
  },
  
  // Team colors for each NBA team
  teamColors: {
    ATL: { primary: '#E03A3E', secondary: '#C1D32F' },
    BOS: { primary: '#007A33', secondary: '#BA9653' },
    BKN: { primary: '#000000', secondary: '#FFFFFF' },
    CHA: { primary: '#1D1160', secondary: '#00788C' },
    CHI: { primary: '#CE1141', secondary: '#000000' },
    CLE: { primary: '#860038', secondary: '#041E42' },
    DAL: { primary: '#00538C', secondary: '#002B5E' },
    DEN: { primary: '#0E2240', secondary: '#FEC524' },
    DET: { primary: '#C8102E', secondary: '#1D42BA' },
    GSW: { primary: '#1D428A', secondary: '#FFC72C' },
    HOU: { primary: '#CE1141', secondary: '#000000' },
    IND: { primary: '#002D62', secondary: '#FDBB30' },
    LAC: { primary: '#C8102E', secondary: '#1D428A' },
    LAL: { primary: '#552583', secondary: '#FDB927' },
    MEM: { primary: '#5D76A9', secondary: '#12173F' },
    MIA: { primary: '#98002E', secondary: '#F9A01B' },
    MIL: { primary: '#00471B', secondary: '#EEE1C6' },
    MIN: { primary: '#0C2340', secondary: '#236192' },
    NOP: { primary: '#0C2340', secondary: '#C8102E' },
    NYK: { primary: '#006BB6', secondary: '#F58426' },
    OKC: { primary: '#007AC1', secondary: '#EF3B24' },
    ORL: { primary: '#0077C0', secondary: '#C4CED4' },
    PHI: { primary: '#006BB6', secondary: '#ED174C' },
    PHX: { primary: '#1D1160', secondary: '#E56020' },
    POR: { primary: '#E03A3E', secondary: '#000000' },
    SAC: { primary: '#5A2D81', secondary: '#63727A' },
    SAS: { primary: '#C4CED4', secondary: '#000000' },
    TOR: { primary: '#CE1141', secondary: '#000000' },
    UTA: { primary: '#002B5C', secondary: '#00471B' },
    WAS: { primary: '#002B5C', secondary: '#E31837' },
  },
  
  // Font sizes
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
  },
  
  // Spacing
  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
    40: '10rem',
    48: '12rem',
    56: '14rem',
    64: '16rem',
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
}; 