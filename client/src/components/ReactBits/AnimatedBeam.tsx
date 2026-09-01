import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedBeamProps {
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
  fromRef?: React.RefObject<HTMLElement>;
  toRef?: React.RefObject<HTMLElement>;
  curvature?: number;
  reverse?: boolean;
  duration?: number;
  delay?: number;
  pathColor?: string;
  gradientStartColor?: string;
  gradientStopColor?: string;
}

export const AnimatedBeam: React.FC<AnimatedBeamProps> = ({
  className = '',
  curvature = 0,
  reverse = false,
  duration = 4,
  delay = 0,
  pathColor = 'rgba(255, 255, 255, 0.1)',
  gradientStartColor = '#ffffff',
  gradientStopColor = 'rgba(255, 255, 255, 0)',
}) => {
  const id = React.useId();

  return (
    <svg
      fill="none"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none absolute inset-0 transform-gpu ${className}`}
      viewBox="0 0 800 240"
    >
      {/* Background static dashed track */}
      <path
        d="M 50 60 C 250 60, 250 120, 400 120 C 550 120, 550 60, 750 60"
        stroke={pathColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <path
        d="M 50 180 C 250 180, 250 120, 400 120 C 550 120, 550 180, 750 180"
        stroke={pathColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />

      {/* Top Animated Pulse Stream */}
      <motion.path
        d="M 50 60 C 250 60, 250 120, 400 120 C 550 120, 550 60, 750 60"
        stroke={`url(#${id}-grad-top)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0.25, pathOffset: reverse ? 1 : 0 }}
        animate={{ pathOffset: reverse ? 0 : 1 }}
        transition={{
          duration,
          delay,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Bottom Animated Pulse Stream */}
      <motion.path
        d="M 50 180 C 250 180, 250 120, 400 120 C 550 120, 550 180, 750 180"
        stroke={`url(#${id}-grad-bottom)`}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0.25, pathOffset: reverse ? 1 : 0 }}
        animate={{ pathOffset: reverse ? 0 : 1 }}
        transition={{
          duration: duration * 1.2,
          delay: delay + 0.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <defs>
        <linearGradient id={`${id}-grad-top`} gradientUnits="userSpaceOnUse">
          <stop stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-grad-bottom`} gradientUnits="userSpaceOnUse">
          <stop stopColor={gradientStartColor} stopOpacity="1" />
          <stop offset="100%" stopColor={gradientStopColor} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
};
