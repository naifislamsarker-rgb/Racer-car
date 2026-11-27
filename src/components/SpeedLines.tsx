import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SpeedLinesProps {
  speed: number;
  isActive: boolean;
}

interface LineParticle {
  angle: number;
  radius: number;
  length: number;
  speedMultiplier: number;
  opacity: number;
  width: number;
}

export function SpeedLines({ speed, isActive }: SpeedLinesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const particles = useRef<LineParticle[]>([]);
  
  // Calculate relative intensity of speed above 2.5 threshold (max expected speed is ~3.2)
  const speedThreshold = 2.5;
  const maxSpeed = 3.2;
  const isTooFast = isActive && speed > speedThreshold;
  const intensity = isTooFast ? Math.min(1.0, (speed - speedThreshold) / (maxSpeed - speedThreshold)) : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high density displays (retina)
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      const count = 120;
      const list: LineParticle[] = [];
      for (let i = 0; i < count; i++) {
        list.push({
          angle: Math.random() * Math.PI * 2,
          radius: Math.random() * 400 + 100, // starting distance from center
          length: Math.random() * 80 + 40,
          speedMultiplier: Math.random() * 1.5 + 1.0,
          opacity: Math.random() * 0.6 + 0.4,
          width: Math.random() * 2.0 + 0.8
        });
      }
      particles.current = list;
    };
    initParticles();

    // Animation Loop
    const draw = () => {
      if (!canvas || !ctx) return;
      
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

      // Semi-transparent clears can create high-speed residual frame motion blur streaks!
      // Here we clear beautifully to maintain clean trails
      ctx.clearRect(0, 0, width, height);
      
      if (intensity > 0.02) {
        // Create radial gradients or plain colored lines matching the dynamic speed
        particles.current.forEach((p) => {
          // Increase radial distance based on current speed intensity
          const step = speed * 18 * p.speedMultiplier * intensity;
          p.radius += step;
          p.length = (Math.random() * 90 + 50) * (1.0 + intensity * 0.6); // Stretch lines at higher speed!

          // Recycle particles that fly past screen boundary or are too far
          if (p.radius > maxRadius) {
            p.radius = Math.random() * 80 + 30; // recycle near center
            p.angle = Math.random() * Math.PI * 2;
            p.opacity = Math.random() * 0.6 + 0.4;
          }

          const startX = centerX + Math.cos(p.angle) * p.radius;
          const startY = centerY + Math.sin(p.angle) * p.radius;
          const endX = centerX + Math.cos(p.angle) * (p.radius + p.length);
          const endY = centerY + Math.sin(p.angle) * (p.radius + p.length);

          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);

          // Build a glowing neon visual effect
          // Color ranges from icy blue to pure white hot
          const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
          gradient.addColorStop(0, `rgba(186, 230, 253, 0)`); // fade start
          gradient.addColorStop(0.3, `rgba(59, 130, 246, ${p.opacity * intensity * 0.7})`); // warm neon blue
          gradient.addColorStop(1, `rgba(255, 255, 255, ${p.opacity * intensity})`); // hot white-hot head

          ctx.strokeStyle = gradient;
          ctx.lineWidth = p.width * (0.8 + intensity * 0.5);
          ctx.lineCap = 'round';
          ctx.stroke();
        });

        // Horizontal velocity wind side-streaks at absolute extreme edges for flat forward velocity feeling
        ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.25})`;
        ctx.lineWidth = 1.0;
        const sideStretchCount = Math.floor(intensity * 6);
        for (let s = 0; s < sideStretchCount; s++) {
          const yLeft = Math.random() * height;
          const xLenLeft = Math.random() * 200 + 100;
          ctx.beginPath();
          ctx.moveTo(0, yLeft);
          ctx.lineTo(xLenLeft, yLeft);
          ctx.stroke();

          const yRight = Math.random() * height;
          const xLenRight = Math.random() * 200 + 100;
          ctx.beginPath();
          ctx.moveTo(width, yRight);
          ctx.lineTo(width - xLenRight, yRight);
          ctx.stroke();
        }
      }

      animationFrameId.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [speed, intensity]);

  return (
    <>
      {/* High-speed motion-blur radial vignette overlay */}
      <AnimatePresence>
        {isTooFast && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: intensity * 0.50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: 'radial-gradient(circle, transparent 35%, rgba(0, 0, 0, 0.4) 65%, rgba(22, 78, 99, 0.65) 100%)',
              boxShadow: 'inset 0 0 100px rgba(6, 182, 212, 0.25)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Screen edge motion blast text notification */}
      <AnimatePresence>
        {speed > 2.85 && isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.6, 1.0, 0.6], scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            className="absolute bottom-36 left-1/2 -translate-x-1/2 z-35 bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono tracking-[0.25em] py-1.5 px-4 rounded-full backdrop-blur-sm uppercase"
          >
            WARP SPEED SPEEDLINES ACTIVE
          </motion.div>
        )}
      </AnimatePresence>

      {/* The 2D Particle Speed lines Canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-35"
      />
    </>
  );
}
