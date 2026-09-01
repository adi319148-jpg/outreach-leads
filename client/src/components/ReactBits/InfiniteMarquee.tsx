import React from 'react';
import { motion } from 'framer-motion';

interface InfiniteMarqueeProps {
  items: string[];
  speed?: number;
  direction?: 'left' | 'right';
  className?: string;
}

export const InfiniteMarquee: React.FC<InfiniteMarqueeProps> = ({
  items,
  speed = 25,
  direction = 'left',
  className = '',
}) => {
  const repeatedItems = [...items, ...items, ...items];

  return (
    <div className={`overflow-hidden whitespace-nowrap flex select-none py-2 ${className}`}>
      <motion.div
        className="flex shrink-0 items-center gap-6"
        animate={{
          x: direction === 'left' ? ['0%', '-50%'] : ['-50%', '0%'],
        }}
        transition={{
          repeat: Infinity,
          ease: 'linear',
          duration: speed,
        }}
      >
        {repeatedItems.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            <span>{item}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
