import React, { useMemo } from 'react';
import { motion } from 'motion/react';

const ParticleBackground: React.FC = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      size: Math.random() * 400 + 200,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 40 + 40,
      delay: Math.random() * -40,
      opacity: Math.random() * 0.08 + 0.02,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-slate-950">
      {/* Aurora Gradients */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-indigo-900/40 rounded-full blur-[140px]" 
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-900/30 rounded-full blur-[140px]" 
      />
      
      {/* Floating Particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white blur-3xl shadow-[0_0_50px_white]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: p.opacity,
          }}
          animate={{
            x: [0, Math.random() * 100 - 50, 0],
            y: [0, Math.random() * 100 - 50, 0],
            opacity: [p.opacity, p.opacity * 1.2, p.opacity * 0.8, p.opacity],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Grid Overlay for Tech Look */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] contrast-150" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
    </div>
  );
};

export default ParticleBackground;
