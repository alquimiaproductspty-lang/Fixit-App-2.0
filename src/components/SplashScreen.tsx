import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  FIXIT_COLORS,
  WRENCH_PATH,
  SCREWDRIVER_HANDLE_PATH,
  SCREWDRIVER_TIP_PATH,
} from './FixitLogo';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

/**
 * FIXI OFFICIAL ANIMATED SPLASH SCREEN
 *
 * Sequence:
 * 1. Background in official FIXI Navy (#082D60) - full viewport with safe area padding.
 * 2. Centers the official FIXI vector logo (F-I-X-I-T with integrated crossed tools in the X).
 * 3. Smooth animation (850 - 950 ms):
 *    - FASE 1: Begins at scale ~0.85 and opacity 0.
 *    - FASE 2: Smoothly scales to 1.0 while opacity transitions to 1.0 with a natural cubic-bezier curve.
 *    - FASE 3: Subtle micro-scale settling (1.0 -> 1.03 -> 1.0) with zero bounce or distortion.
 * 4. Accessibility: Respects prefers-reduced-motion.
 * 5. Clean exit fade (250 ms) directly into the existing initial screen with no white flash.
 * 6. No texts, no audio, no external assets.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 900,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Clean up pre-hydration background marker from index.html if present
    const staticSplash = document.getElementById('initial-splash');
    if (staticSplash) {
      staticSplash.remove();
    }

    // Check system accessibility preference
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setPrefersReducedMotion(true);
    }

    const timer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, durationMs);

    return () => clearTimeout(timer);
  }, [onFinish, durationMs]);

  // Motion variants based on user accessibility preferences
  const logoVariants = prefersReducedMotion
    ? {
        initial: { opacity: 1, scale: 1 },
        animate: { opacity: 1, scale: 1 },
      }
    : {
        initial: {
          opacity: 0,
          scale: 0.85,
        },
        animate: {
          opacity: [0, 1, 1, 1],
          scale: [0.85, 1.0, 1.03, 1.0],
          transition: {
            duration: 0.88,
            times: [0, 0.52, 0.78, 1],
            ease: [0.16, 1, 0.3, 1], // Natural, elegant ease-out
          },
        },
      };

  return (
    <motion.div
      key="fixi-splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: {
          duration: 0.25,
          ease: [0.4, 0, 0.2, 1],
        },
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center select-none overflow-hidden"
      style={{
        backgroundColor: FIXIT_COLORS.navy,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        height: '100dvh',
        width: '100vw',
      }}
      aria-hidden="true"
      id="fixi-splash-container"
    >
      {/* Centered Official FIXI Logo */}
      <motion.div
        variants={logoVariants}
        initial="initial"
        animate="animate"
        className="relative z-10 flex items-center justify-center px-6"
      >
        <svg
          width="260"
          height="90"
          viewBox="0 0 288 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[62vw] max-w-[280px] sm:max-w-[320px] h-auto drop-shadow-sm"
          aria-label="FIXI"
        >
          {/* LETTER 'F' */}
          <path
            d="M 12 16 H 58 V 30 H 28 V 46 H 52 V 59.5 H 28 V 84 H 12 V 16 Z"
            fill="#FFFFFF"
          />

          {/* LETTER 'I' (first) */}
          <rect
            x="74"
            y="16"
            width="16"
            height="68"
            rx="1"
            fill="#FFFFFF"
          />

          {/* LETTER 'X' (Integrated Tools Symbol) */}
          <g transform="translate(144, 50)">
            {/* Screwdriver: Top-Left to Bottom-Right (+45°) */}
            <g transform="rotate(45)">
              <path d={SCREWDRIVER_HANDLE_PATH} fill="#FFFFFF" />
              <path d={SCREWDRIVER_TIP_PATH} fill="#FFFFFF" />
              <line
                x1="-35"
                y1="-2"
                x2="-21"
                y2="-2"
                stroke="#061630"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
              />
              <line
                x1="-35"
                y1="2"
                x2="-21"
                y2="2"
                stroke="#061630"
                strokeWidth="1"
                strokeLinecap="round"
                opacity="0.6"
              />
            </g>

            {/* Wrench: Bottom-Left to Top-Right (-45°) */}
            <g transform="rotate(-45)">
              <path
                d={WRENCH_PATH}
                fillRule="evenodd"
                clipRule="evenodd"
                fill={FIXIT_COLORS.electricBlue}
              />
            </g>
          </g>

          {/* LETTER 'I' (second) */}
          <rect
            x="198"
            y="16"
            width="16"
            height="68"
            rx="1"
            fill="#FFFFFF"
          />

          {/* LETTER 'T' */}
          <path
            d="M 230 16 H 276 V 30 H 261 V 84 H 245 V 30 H 230 V 16 Z"
            fill="#FFFFFF"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};
