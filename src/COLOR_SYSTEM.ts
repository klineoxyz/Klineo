/**
 * KLINEO Color System
 * 
 * Terminal-inspired professional dark theme
 * Late 1990s trading software aesthetic, modernized
 */

export const KlineoColors = {
  // Core Terminal Colors
  background: '#0B0D10',        // Terminal black - primary background
  card: '#12151A',              // Slightly lighter for cards
  border: '#2A2D35',            // Thin dividers
  
  // Text
  foreground: '#E6E6E6',        // Off-white primary text
  muted: '#8B8B8B',             // Secondary text
  
  // Accent (USE SPARINGLY)
  primary: '#FFB000',           // Terminal amber - THE ONLY accent color
  
  // Functional Colors (ONLY for specific purposes)
  success: '#10B981',           // Green - for profits, positive PnL
  destructive: '#EF4444',       // Red - for losses, warnings, liquidations
  
  // Chart Colors
  chart1: '#FFB000',            // Amber
  chart2: '#10B981',            // Green
  chart3: '#EF4444',            // Red
  chart4: '#3B82F6',            // Blue
  chart5: '#8B5CF6',            // Purple
} as const;

/**
 * Color Usage Rules:
 * 
 * 1. NEVER use accent colors for decoration
 * 2. Red/green ONLY for:
 *    - PnL displays
 *    - Chart lines
 *    - Risk warnings
 *    - Liquidation prices
 * 3. Amber (primary) ONLY for:
 *    - Important CTAs
 *    - Active states
 *    - Platform branding
 * 4. Everything else uses grayscale
 */

export {};
