import React from 'react';

/**
 * FIXIT OFFICIAL BRAND IDENTITY & LOGO SYSTEM
 * 
 * Palette:
 * - Navy (Azul Oscuro): #082D60
 * - Electric Blue (Azul Eléctrico): #0988F5
 * 
 * Tool Architecture in 'X':
 * - Screwdriver: Ergonomic fluted handle (top-left) to keystone tip (bottom-right)
 * - Adjustable Wrench: Ergonomic handle with lanyard hole (bottom-left) to calibrated jaw head (top-right)
 * - Negative-space crossing: preserves silhouette integrity at any scale or in monochrome.
 */

export const FIXIT_COLORS = {
  navy: '#082D60',
  electricBlue: '#0988F5',
  white: '#FFFFFF',
  darkBg: '#061630',
  charcoal: '#111827',
} as const;

export type FixitLogoVariant =
  | 'horizontal'   // Version A: FIXIT wordmark + integrated symbol (optional tagline)
  | 'compact'      // Version B: FIXIT without tagline (pure wordmark)
  | 'isotipo'      // Version C: Standalone X with tools
  | 'icon'         // Alias for isotipo
  | 'app-icon'     // Version D: Squircle app icon
  | 'brand'        // Navbar/header responsive lockup
  | 'full'         // With tagline and secondary slogan
  | 'with-message' // Backwards compatible with tagline banner
  | 'monochrome'   // Version E: Single color
  | 'dark';        // Version F: Optimized for dark surfaces

export type FixitLogoTheme =
  | 'light'        // Navy text + Electric Blue wrench (for light backgrounds)
  | 'dark'         // Pure White text + Electric Blue wrench (for dark backgrounds)
  | 'mono-navy'    // All Navy (#082D60)
  | 'mono-black'   // All Charcoal/Black (#111827)
  | 'mono-white';  // All White (#FFFFFF)

export interface FixitLogoProps {
  variant?: FixitLogoVariant | string;
  theme?: FixitLogoTheme | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  inverted?: boolean; // Shortcut for theme="dark"
  monochrome?: boolean; // Shortcut for mono theme
  showTagline?: boolean;
  showSlogan?: boolean;
  taglineText?: string;
  sloganText?: string;
  className?: string;
  id?: string;
}

// Geometric vector paths for the crossed tools
// Wrench: bottom-left (-45°) with open jaw head at top-right
export const WRENCH_PATH = `
  M -37,5
  L 10,5
  C 13,5 16,7.5 19,11
  L 31,8.5
  C 32.5,8 33,6.5 32,5
  L 19,4.5
  L 19,-3.5
  L 32,-3.5
  C 33.5,-3.5 34,-5 33,-6.5
  L 29,-10.5
  C 25.5,-13.5 19.5,-13 14,-9
  L 10,-5
  L -37,-5
  C -40.5,-5 -42.5,-2.5 -42.5,0
  C -42.5,2.5 -40.5,5 -37,5
  Z
  M -31,-2.5 A 2.5 2.5 0 1 0 -31,2.5 A 2.5 2.5 0 1 0 -31,-2.5 Z
  M 12,-9 H 17.5 V -6.5 H 12 Z
`.replace(/\s+/g, ' ').trim();

// Screwdriver handle (top-left, +45°)
export const SCREWDRIVER_HANDLE_PATH = `
  M -37,-6
  C -40.5,-6 -42.5,-4 -42.5,0
  C -42.5,4 -40.5,6 -37,6
  L -17,6
  C -15.5,6 -15,4.5 -15,3.5
  L -11.5,3.5
  L -11.5,2.5
  L -7.5,2.5
  L -7.5,-2.5
  L -11.5,-2.5
  L -11.5,-3.5
  C -15,-3.5 -15.5,-6 -17,-6
  Z
`.replace(/\s+/g, ' ').trim();

// Screwdriver steel shank and keystone flathead tip (bottom-right)
export const SCREWDRIVER_TIP_PATH = `
  M 7.5,-2.5
  L 31,-2.5
  L 39,-1.5
  L 39,1.5
  L 31,2.5
  L 7.5,2.5
  Z
`.replace(/\s+/g, ' ').trim();

/**
 * Resolves color palette based on theme and inverted flags
 */
function resolveColors(theme?: FixitLogoTheme | string, inverted?: boolean, monochrome?: boolean) {
  if (monochrome) {
    if (inverted || theme === 'dark' || theme === 'mono-white') {
      return { text: '#FFFFFF', wrench: '#FFFFFF', screwdriver: '#FFFFFF', isDark: true };
    }
    if (theme === 'mono-black') {
      return { text: '#111827', wrench: '#111827', screwdriver: '#111827', isDark: false };
    }
    return { text: FIXIT_COLORS.navy, wrench: FIXIT_COLORS.navy, screwdriver: FIXIT_COLORS.navy, isDark: false };
  }

  if (theme === 'mono-white') {
    return { text: '#FFFFFF', wrench: '#FFFFFF', screwdriver: '#FFFFFF', isDark: true };
  }
  if (theme === 'mono-black') {
    return { text: '#111827', wrench: '#111827', screwdriver: '#111827', isDark: false };
  }
  if (theme === 'mono-navy') {
    return { text: FIXIT_COLORS.navy, wrench: FIXIT_COLORS.navy, screwdriver: FIXIT_COLORS.navy, isDark: false };
  }

  if (inverted || theme === 'dark') {
    return {
      text: '#FFFFFF',
      wrench: FIXIT_COLORS.electricBlue,
      screwdriver: '#FFFFFF',
      isDark: true,
    };
  }

  // Standard light theme
  return {
    text: FIXIT_COLORS.navy,
    wrench: FIXIT_COLORS.electricBlue,
    screwdriver: FIXIT_COLORS.navy,
    isDark: false,
  };
}

/**
 * Standard height mapping
 */
function resolveHeight(size?: string | number): number {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'xs': return 22;
    case 'sm': return 30;
    case 'md': return 40;
    case 'lg': return 54;
    case 'xl': return 72;
    default: return 40;
  }
}

// ----------------------------------------------------------------------
// 1. ISOTIPO (Version C: Crossed Tools X Symbol Standalone)
// ----------------------------------------------------------------------
export const FixitIsotipo: React.FC<{
  size?: number;
  theme?: FixitLogoTheme;
  inverted?: boolean;
  monochrome?: boolean;
  className?: string;
  id?: string;
}> = ({ size = 48, theme = 'light', inverted = false, monochrome = false, className = '', id }) => {
  const colors = resolveColors(theme, inverted, monochrome);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      id={id}
      aria-label="Isotipo FIXIT"
    >
      <g transform="translate(50, 50)">
        {/* Screwdriver: Top-Left to Bottom-Right (+45°) */}
        <g transform="rotate(45)">
          <path d={SCREWDRIVER_HANDLE_PATH} fill={colors.screwdriver} />
          <path d={SCREWDRIVER_TIP_PATH} fill={colors.screwdriver} />
          {/* Subtle handle grip ribs */}
          <line
            x1="-35" y1="-2" x2="-21" y2="-2"
            stroke={colors.isDark ? '#061630' : '#FFFFFF'}
            strokeWidth="1" strokeLinecap="round" opacity="0.6"
          />
          <line
            x1="-35" y1="2" x2="-21" y2="2"
            stroke={colors.isDark ? '#061630' : '#FFFFFF'}
            strokeWidth="1" strokeLinecap="round" opacity="0.6"
          />
        </g>

        {/* Wrench: Bottom-Left to Top-Right (-45°) */}
        <g transform="rotate(-45)">
          <path
            d={WRENCH_PATH}
            fillRule="evenodd"
            clipRule="evenodd"
            fill={colors.wrench}
          />
        </g>
      </g>
    </svg>
  );
};

// ----------------------------------------------------------------------
// 2. APP ICON (Version D: Isotipo centered in a rounded squircle)
// ----------------------------------------------------------------------
export const FixitAppIcon: React.FC<{
  size?: number;
  theme?: 'dark' | 'light' | 'mono';
  rounded?: number | boolean;
  className?: string;
  id?: string;
}> = ({ size = 48, theme = 'dark', rounded = true, className = '', id }) => {
  const radius = rounded === true ? 24 : rounded === false ? 0 : rounded;

  const bg = theme === 'light' ? '#F6F4EF' : theme === 'mono' ? '#111827' : FIXIT_COLORS.navy;
  const screwdriverColor = theme === 'light' ? FIXIT_COLORS.navy : '#FFFFFF';
  const wrenchColor = theme === 'mono' ? '#FFFFFF' : FIXIT_COLORS.electricBlue;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      id={id}
      aria-label="FIXIT App Icon"
    >
      <rect width="100" height="100" rx={radius} fill={bg} />
      <g transform="translate(50, 50)">
        {/* Screwdriver */}
        <g transform="rotate(45)">
          <path d={SCREWDRIVER_HANDLE_PATH} fill={screwdriverColor} />
          <path d={SCREWDRIVER_TIP_PATH} fill={screwdriverColor} />
          <line
            x1="-35" y1="-2" x2="-21" y2="-2"
            stroke={bg} strokeWidth="1" strokeLinecap="round" opacity="0.5"
          />
          <line
            x1="-35" y1="2" x2="-21" y2="2"
            stroke={bg} strokeWidth="1" strokeLinecap="round" opacity="0.5"
          />
        </g>

        {/* Wrench */}
        <g transform="rotate(-45)">
          <path
            d={WRENCH_PATH}
            fillRule="evenodd"
            clipRule="evenodd"
            fill={wrenchColor}
          />
        </g>
      </g>
    </svg>
  );
};

// ----------------------------------------------------------------------
// 3. FIXIT WORDMARK VECTOR (Pure Vector Geometry F-I-X-I-T)
// ----------------------------------------------------------------------
export const FixitWordmark: React.FC<{
  height?: number;
  theme?: FixitLogoTheme;
  inverted?: boolean;
  monochrome?: boolean;
  className?: string;
  id?: string;
}> = ({
  height = 36,
  theme = 'light',
  inverted = false,
  monochrome = false,
  className = '',
  id,
}) => {
  const colors = resolveColors(theme, inverted, monochrome);
  // Aspect ratio: 288 / 100 = 2.88
  const width = Math.round(height * 2.88);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 288 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      id={id}
      aria-label="FIXIT"
    >
      {/* LETTER 'F' */}
      <path
        d="M 12 16 H 58 V 30 H 28 V 46 H 52 V 59.5 H 28 V 84 H 12 V 16 Z"
        fill={colors.text}
      />

      {/* LETTER 'I' (first) */}
      <rect
        x="74" y="16" width="16" height="68" rx="1"
        fill={colors.text}
      />

      {/* LETTER 'X' (Integrated Tools Symbol) */}
      <g transform="translate(144, 50)">
        {/* Screwdriver (Top-Left to Bottom-Right, +45°) */}
        <g transform="rotate(45)">
          <path d={SCREWDRIVER_HANDLE_PATH} fill={colors.screwdriver} />
          <path d={SCREWDRIVER_TIP_PATH} fill={colors.screwdriver} />
          <line
            x1="-35" y1="-2" x2="-21" y2="-2"
            stroke={colors.isDark ? '#061630' : '#FFFFFF'}
            strokeWidth="1" strokeLinecap="round" opacity="0.6"
          />
          <line
            x1="-35" y1="2" x2="-21" y2="2"
            stroke={colors.isDark ? '#061630' : '#FFFFFF'}
            strokeWidth="1" strokeLinecap="round" opacity="0.6"
          />
        </g>

        {/* Wrench (Bottom-Left to Top-Right, -45°) */}
        <g transform="rotate(-45)">
          <path
            d={WRENCH_PATH}
            fillRule="evenodd"
            clipRule="evenodd"
            fill={colors.wrench}
          />
        </g>
      </g>

      {/* LETTER 'I' (second) */}
      <rect
        x="198" y="16" width="16" height="68" rx="1"
        fill={colors.text}
      />

      {/* LETTER 'T' */}
      <path
        d="M 230 16 H 276 V 30 H 261 V 84 H 245 V 30 H 230 V 16 Z"
        fill={colors.text}
      />
    </svg>
  );
};

// ----------------------------------------------------------------------
// 4. MAIN FIXIT LOGO COMPONENT (Supports all variants A-F)
// ----------------------------------------------------------------------
export const FixitLogo: React.FC<FixitLogoProps> = ({
  variant = 'compact',
  theme,
  size = 'md',
  inverted = false,
  monochrome = false,
  showTagline,
  showSlogan,
  taglineText = 'Soluciones para tu hogar',
  sloganText = 'Tú pides. Nosotros resolvemos.',
  className = '',
  id,
}) => {
  // Normalize variants
  const activeVariant = (variant as FixitLogoVariant) || 'compact';
  const isDarkVariant = activeVariant === 'dark' || inverted || theme === 'dark';
  const isMonoVariant = activeVariant === 'monochrome' || monochrome;

  const resolvedTheme: FixitLogoTheme =
    ((theme as FixitLogoTheme) ||
      (isMonoVariant
        ? isDarkVariant ? 'mono-white' : 'mono-navy'
        : isDarkVariant ? 'dark' : 'light')) as FixitLogoTheme;

  const height = resolveHeight(size);

  // Variant C: Isotipo
  if (activeVariant === 'isotipo' || activeVariant === 'icon') {
    return (
      <FixitIsotipo
        size={height}
        theme={resolvedTheme}
        inverted={isDarkVariant}
        monochrome={isMonoVariant}
        className={className}
        id={id}
      />
    );
  }

  // Variant D: App Icon
  if (activeVariant === 'app-icon') {
    return (
      <FixitAppIcon
        size={height}
        theme={isMonoVariant ? 'mono' : isDarkVariant ? 'dark' : 'light'}
        className={className}
        id={id}
      />
    );
  }

  // Determine tagline presence:
  // Explicit props take precedence; otherwise variant='full' or variant='with-message' trigger tagline
  const hasTagline =
    showTagline !== undefined
      ? showTagline
      : activeVariant === 'full' || activeVariant === 'with-message';

  const hasSlogan =
    showSlogan !== undefined
      ? showSlogan
      : activeVariant === 'full';

  // Variant B: Compact Logo (FIXIT without tagline)
  if (!hasTagline && !hasSlogan) {
    return (
      <div className={`inline-flex items-center ${className}`} id={id}>
        <FixitWordmark
          height={height}
          theme={resolvedTheme}
          inverted={isDarkVariant}
          monochrome={isMonoVariant}
        />
      </div>
    );
  }

  // Variant A: Horizontal Logo or Lockup with Tagline/Slogan
  const textColorClass = isDarkVariant ? 'text-white' : 'text-[#082D60]';
  const mutedColorClass = isDarkVariant ? 'text-slate-300' : 'text-[#756A5D]';

  return (
    <div className={`inline-flex flex-col items-center text-center ${className}`} id={id}>
      <FixitWordmark
        height={height}
        theme={resolvedTheme}
        inverted={isDarkVariant}
        monochrome={isMonoVariant}
      />

      {hasTagline && (
        <p
          className={`font-semibold tracking-wide uppercase mt-1 transition-colors ${
            height <= 32 ? 'text-[9px] tracking-wider' : height <= 44 ? 'text-[11px] tracking-wider' : 'text-xs sm:text-sm tracking-widest'
          } ${textColorClass}`}
        >
          {taglineText}
        </p>
      )}

      {hasSlogan && (
        <p className={`text-[11px] font-medium tracking-normal mt-0.5 ${mutedColorClass}`}>
          {sloganText}
        </p>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 5. VECTOR SVG GENERATOR FOR EXPORT / DOWNLOAD / CLIPBOARD
// ----------------------------------------------------------------------
export function getFixitSvgString({
  variant = 'compact',
  theme = 'light',
  withTagline = false,
  withSlogan = false,
  tagline = 'Soluciones para tu hogar',
  slogan = 'Tú pides. Nosotros resolvemos.',
}: {
  variant?: 'compact' | 'horizontal' | 'isotipo' | 'app-icon';
  theme?: 'light' | 'dark' | 'mono-navy' | 'mono-black' | 'mono-white';
  withTagline?: boolean;
  withSlogan?: boolean;
  tagline?: string;
  slogan?: string;
}): string {
  const isDark = theme === 'dark' || theme === 'mono-white';
  const isMono = theme.startsWith('mono');

  let textCol: string = FIXIT_COLORS.navy;
  let wrenchCol: string = FIXIT_COLORS.electricBlue;
  let driverCol: string = FIXIT_COLORS.navy;

  if (isMono) {
    const monoCol = theme === 'mono-white' ? '#FFFFFF' : theme === 'mono-black' ? '#111827' : FIXIT_COLORS.navy;
    textCol = monoCol;
    wrenchCol = monoCol;
    driverCol = monoCol;
  } else if (isDark) {
    textCol = '#FFFFFF';
    wrenchCol = FIXIT_COLORS.electricBlue;
    driverCol = '#FFFFFF';
  }

  if (variant === 'isotipo') {
    return `<svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(50, 50)">
    <g transform="rotate(45)">
      <path d="${SCREWDRIVER_HANDLE_PATH}" fill="${driverCol}" />
      <path d="${SCREWDRIVER_TIP_PATH}" fill="${driverCol}" />
      <line x1="-35" y1="-2" x2="-21" y2="-2" stroke="${isDark ? '#061630' : '#FFFFFF'}" stroke-width="1" stroke-linecap="round" opacity="0.6" />
      <line x1="-35" y1="2" x2="-21" y2="2" stroke="${isDark ? '#061630' : '#FFFFFF'}" stroke-width="1" stroke-linecap="round" opacity="0.6" />
    </g>
    <g transform="rotate(-45)">
      <path d="${WRENCH_PATH}" fillRule="evenodd" clipRule="evenodd" fill="${wrenchCol}" />
    </g>
  </g>
</svg>`;
  }

  if (variant === 'app-icon') {
    const bgCol = isMono ? (theme === 'mono-white' ? '#111827' : '#FFFFFF') : (isDark ? '#061630' : FIXIT_COLORS.navy);
    return `<svg width="200" height="200" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="24" fill="${bgCol}" />
  <g transform="translate(50, 50)">
    <g transform="rotate(45)">
      <path d="${SCREWDRIVER_HANDLE_PATH}" fill="${driverCol}" />
      <path d="${SCREWDRIVER_TIP_PATH}" fill="${driverCol}" />
      <line x1="-35" y1="-2" x2="-21" y2="-2" stroke="${bgCol}" stroke-width="1" stroke-linecap="round" opacity="0.5" />
      <line x1="-35" y1="2" x2="-21" y2="2" stroke="${bgCol}" stroke-width="1" stroke-linecap="round" opacity="0.5" />
    </g>
    <g transform="rotate(-45)">
      <path d="${WRENCH_PATH}" fillRule="evenodd" clipRule="evenodd" fill="${wrenchCol}" />
    </g>
  </g>
</svg>`;
  }

  // Wordmark with or without tagline
  const viewBoxHeight = withSlogan ? 150 : withTagline ? 130 : 100;

  return `<svg width="576" height="${viewBoxHeight * 2}" viewBox="0 0 288 ${viewBoxHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- LETTER 'F' -->
  <path d="M 12 16 H 58 V 30 H 28 V 46 H 52 V 59.5 H 28 V 84 H 12 V 16 Z" fill="${textCol}" />

  <!-- LETTER 'I' -->
  <rect x="74" y="16" width="16" height="68" rx="1" fill="${textCol}" />

  <!-- LETTER 'X' (Integrated Tools Symbol) -->
  <g transform="translate(144, 50)">
    <g transform="rotate(45)">
      <path d="${SCREWDRIVER_HANDLE_PATH}" fill="${driverCol}" />
      <path d="${SCREWDRIVER_TIP_PATH}" fill="${driverCol}" />
      <line x1="-35" y1="-2" x2="-21" y2="-2" stroke="${isDark ? '#061630' : '#FFFFFF'}" stroke-width="1" stroke-linecap="round" opacity="0.6" />
      <line x1="-35" y1="2" x2="-21" y2="2" stroke="${isDark ? '#061630' : '#FFFFFF'}" stroke-width="1" stroke-linecap="round" opacity="0.6" />
    </g>
    <g transform="rotate(-45)">
      <path d="${WRENCH_PATH}" fillRule="evenodd" clipRule="evenodd" fill="${wrenchCol}" />
    </g>
  </g>

  <!-- LETTER 'I' -->
  <rect x="198" y="16" width="16" height="68" rx="1" fill="${textCol}" />

  <!-- LETTER 'T' -->
  <path d="M 230 16 H 276 V 30 H 261 V 84 H 245 V 30 H 230 V 16 Z" fill="${textCol}" />
${
  withTagline
    ? `\n  <!-- Tagline: ${tagline} -->\n  <text x="144" y="112" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="700" fill="${textCol}" letter-spacing="1.5px">${tagline.toUpperCase()}</text>`
    : ''
}${
  withSlogan
    ? `\n  <!-- Slogan: ${slogan} -->\n  <text x="144" y="132" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="500" fill="${isDark ? '#94A3B8' : '#756A5D'}" letter-spacing="0.5px">${slogan}</text>`
    : ''
}
</svg>`;
}

// ----------------------------------------------------------------------
// 6. BACKWARDS COMPATIBILITY EXPORTS
// ----------------------------------------------------------------------
export const FixitIcon = FixitAppIcon;
export const FixiLogo = FixitLogo;
export const FixiIcon = FixitAppIcon;
