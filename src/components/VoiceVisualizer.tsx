import React, { useRef, useEffect } from 'react';

interface VoiceVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioLevel: number; // 0 to 100
  analyser?: AnalyserNode | null;
  className?: string;
}

export function VoiceVisualizer({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  audioLevel, 
  analyser,
  className = "" 
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const requestRef = useRef<number>(0);

  // Initialize particles
  useEffect(() => {
    const particles: any[] = [];
    const count = 40;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.002,
        vy: (Math.random() - 0.5) * 0.002,
        size: Math.random() * 3 + 1,
        color: i % 2 === 0 ? 'rgba(99, 102, 241, 0.6)' : 'rgba(129, 140, 248, 0.4)',
        phase: Math.random() * Math.PI * 2
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const render = (time: number) => {
      // Handle resize if needed
      if (canvas.clientWidth !== width || canvas.clientHeight !== height) {
        width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
        height = canvas.height = canvas.clientHeight * window.devicePixelRatio;
      }

      ctx.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const isActive = isListening || isSpeaking || isProcessing;
      const intensity = isActive ? (audioLevel / 100) : 0.05;
      
      // Draw background glow
      if (isActive) {
        const gradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, width / 2
        );
        const alpha = isProcessing ? 0.1 : (0.1 + intensity * 0.3);
        gradient.addColorStop(0, `rgba(99, 102, 241, ${alpha})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Update and draw particles
      const baseRadius = Math.min(width, height) * 0.3;
      const orbitRadius = baseRadius + (intensity * baseRadius * (isProcessing ? 0.2 : 0.8));

      particles.forEach((p, i) => {
        // Movement
        p.phase += 0.02 + (intensity * 0.05);
        const floatX = Math.sin(p.phase) * 0.5;
        const floatY = Math.cos(p.phase * 0.7) * 0.5;

        // Base centered position
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Spread particles in a circle
        const angle = (i / particles.length) * Math.PI * 2 + (time * 0.0005);
        const targetX = centerX + Math.cos(angle) * orbitRadius;
        const targetY = centerY + Math.sin(angle) * orbitRadius;

        // Smoothly interpolate towards target
        p.x += (targetX - p.x) * 0.1;
        p.y += (targetY - p.y) * 0.1;

        // Add some jitter/flow
        const finalX = p.x + floatX * (10 + intensity * 50);
        const finalY = p.y + floatY * (10 + intensity * 50);

        // Draw particle
        ctx.beginPath();
        const pSize = p.size * (1 + intensity * 2);
        ctx.arc(finalX, finalY, pSize, 0, Math.PI * 2);
        ctx.fillStyle = isListening && intensity > 0.5 ? 'rgba(239, 68, 68, 0.8)' : p.color;
        
        // Glow effect for particles
        ctx.shadowBlur = 10 * intensity;
        ctx.shadowColor = ctx.fillStyle as string;
        
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw connections between nearby particles (Premium neural look)
        if (isActive) {
          particles.forEach((p2, j) => {
            if (i === j) return;
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = width * 0.2;
            
            if (dist < maxDist) {
              ctx.beginPath();
              ctx.moveTo(finalX, finalY);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(99, 102, 241, ${(1 - dist / maxDist) * 0.2 * (0.5 + intensity)})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          });
        }
      });

      // Special wave for speaking/listening
      if (isActive && !isProcessing) {
        ctx.beginPath();
        ctx.ellipse(width / 2, height / 2, 
          orbitRadius * 0.8, orbitRadius * 0.8, 
          0, 0, Math.PI * 2
        );
        ctx.strokeStyle = isListening ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)';
        ctx.lineWidth = 2 + intensity * 10;
        ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isListening, isSpeaking, isProcessing, audioLevel]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full pointer-events-none ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
