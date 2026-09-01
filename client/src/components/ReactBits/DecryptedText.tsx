import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: 'view' | 'hover';
}

export const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 50,
  maxIterations = 10,
  characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+',
  className = '',
  parentClassName = '',
  encryptedClassName = 'text-zinc-500',
  animateOn = 'hover',
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const intervalRef = useRef<any>(null);

  const startScramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);
    setIsScrambling(true);

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((letter, index) => {
            if (letter === ' ') return ' ';
            if (index < iteration) {
              return text[index];
            }
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current);
        setIsScrambling(false);
      }

      iteration += 1 / (maxIterations / text.length || 1);
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'view') {
      startScramble();
    }
    return () => clearInterval(intervalRef.current);
  }, []);

  return (
    <motion.span
      className={`inline-block font-mono ${parentClassName}`}
      onMouseEnter={() => {
        setIsHovering(true);
        if (animateOn === 'hover') startScramble();
      }}
      onMouseLeave={() => setIsHovering(false)}
    >
      <span className={isScrambling ? encryptedClassName : className}>
        {displayText}
      </span>
    </motion.span>
  );
};
