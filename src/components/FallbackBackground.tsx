"use client";

import { motion } from 'framer-motion';
import { FallbackBackgroundProps } from '@/interfaces/ui-components';

export default function FallbackBackground({ className = "" }: FallbackBackgroundProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Static gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20" />
      
      {/* Animated geometric shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating circles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-blue-200/30 to-indigo-200/30 dark:from-blue-800/30 dark:to-indigo-800/30"
            style={{
              width: `${Math.random() * 120 + 60}px`,
              height: `${Math.random() * 120 + 60}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              x: [0, Math.random() * 30 - 15, 0],
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3,
            }}
          />
        ))}
        
        {/* Floating squares */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`square-${i}`}
            className="absolute bg-gradient-to-br from-purple-200/20 to-pink-200/20 dark:from-purple-800/20 dark:to-pink-800/20"
            style={{
              width: `${Math.random() * 80 + 40}px`,
              height: `${Math.random() * 80 + 40}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              borderRadius: `${Math.random() * 30 + 10}px`,
            }}
            animate={{
              rotate: [0, 180, 360],
              y: [0, -30, 0],
              x: [0, Math.random() * 20 - 10, 0],
            }}
            transition={{
              duration: 10 + Math.random() * 5,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 4,
            }}
          />
        ))}
        
        {/* Floating triangles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`triangle-${i}`}
            className="absolute"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 0,
              height: 0,
              borderLeft: `${Math.random() * 30 + 20}px solid transparent`,
              borderRight: `${Math.random() * 30 + 20}px solid transparent`,
              borderBottom: `${Math.random() * 40 + 30}px solid rgba(99, 102, 241, 0.1)`,
            }}
            animate={{
              rotate: [0, 120, 240, 360],
              y: [0, -25, 0],
              scale: [1, 1.3, 1],
            }}
            transition={{
              duration: 12 + Math.random() * 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>
      
      {/* Animated gradient overlay */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-50/10 to-transparent dark:via-blue-950/10"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
}
