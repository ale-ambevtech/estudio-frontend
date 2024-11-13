export const MARKER_COLORS = [
    '#00FF00', // Lime
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Green
    '#FFC0CB', // Pink
    '#A52A2A', // Brown
    '#808080', // Gray
    '#FFD700', // Gold
    '#4B0082', // Indigo
    '#7FFF00', // Chartreuse
    '#FF4500', // OrangeRed
    '#1E90FF', // DodgerBlue
    '#8B4513', // SaddleBrown
    '#FF1493', // DeepPink
    '#00CED1', // DarkTurquoise
    '#8B008B', // DarkMagenta
    '#556B2F', // DarkOliveGreen
    '#FF6347', // Tomato
    '#00FA9A', // MediumSpringGreen
    '#4682B4', // SteelBlue
    '#9932CC', // DarkOrchid
    '#2F4F4F', // DarkSlateGray
    '#D2691E', // Chocolate
    '#DC143C', // Crimson
    '#7B68EE', // MediumSlateBlue
    '#6B8E23', // OliveDrab
    '#48D1CC', // MediumTurquoise
    '#C71585', // MediumVioletRed
    '#191970', // MidnightBlue
    '#F4A460', // SandyBrown
    '#00BFFF', // DeepSkyBlue
    '#CD5C5C', // IndianRed
    '#32CD32', // LimeGreen
    '#DAA520', // GoldenRod
    '#8FBC8F', // DarkSeaGreen
    '#5F9EA0', // CadetBlue
    '#9400D3', // DarkViolet
    '#FF69B4', // HotPink
    '#CD853F', // Peru
    '#708090', // SlateGray
    '#00FF7F', // SpringGreen
    '#4169E1', // RoyalBlue
    '#8A2BE2', // BlueViolet
    '#20B2AA', // LightSeaGreen
    '#B8860B', // DarkGoldenRod
] as const;

export const UI_COLORS = {
  TIMELINE: {
    PROGRESS: 'rgb(255, 157, 0)',
    PROGRESS_BG: 'rgba(255, 157, 0, 0.4)'
  },
  GENERAL_MARKER: '#ffc400',
  DANGER: {
    DEFAULT: '#ff4d4d',
    HOVER: '#ff3333',
    ACTIVE: '#e60000'
  }
} as const; 