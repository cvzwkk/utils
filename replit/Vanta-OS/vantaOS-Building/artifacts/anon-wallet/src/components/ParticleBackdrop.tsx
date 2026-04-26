import React, { useEffect, useRef } from 'react';
import { create } from 'zustand';

export const useParticleStore = create<{ burst: (x: number, y: number) => void }>((set) => ({
  burst: () => {},
}));

class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  isBurst: boolean;

  constructor(x: number, y: number, isBurst = false) {
    this.x = x;
    this.y = y;
    this.isBurst = isBurst;
    
    if (isBurst) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.life = 1.0;
      this.size = Math.random() * 2 + 1;
    } else {
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.life = Infinity;
      this.size = Math.random() * 1.5 + 0.5;
    }

    const colors = [
      'rgba(0, 255, 255, ', // Cyan
      'rgba(57, 255, 20, ', // Acid Green
      'rgba(180, 0, 255, ' // Ultraviolet
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
  }

  update(width: number, height: number, mouseX: number, mouseY: number) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.isBurst) {
      this.life -= 0.02;
      return this.life > 0;
    }

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;

    // Mouse interaction
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 150 * 150 && distSq > 30 * 30) {
      // Attract
      const dist = Math.sqrt(distSq);
      this.vx += (dx / dist) * 0.02;
      this.vy += (dy / dist) * 0.02;
    } else if (distSq <= 30 * 30) {
      // Repel
      const dist = Math.sqrt(distSq);
      this.vx -= (dx / dist) * 0.1;
      this.vy -= (dy / dist) * 0.1;
    }

    // Dampen
    this.vx *= 0.99;
    this.vy *= 0.99;
    
    // Minimum speed
    if (Math.abs(this.vx) < 0.1) this.vx += (Math.random() - 0.5) * 0.1;
    if (Math.abs(this.vy) < 0.1) this.vy += (Math.random() - 0.5) * 0.1;

    return true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + (this.isBurst ? this.life : 0.5) + ')';
    ctx.fill();
  }
}

export function ParticleBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let particles: Particle[] = [];
    const numParticles = 200;

    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle(Math.random() * width, Math.random() * height));
    }

    let mouseX = -1000;
    let mouseY = -1000;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    useParticleStore.setState({
      burst: (x: number, y: number) => {
        for (let i = 0; i < 30; i++) {
          particles.push(new Particle(x, y, true));
        }
      }
    });

    let animationId: number;

    const render = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // Update and draw
      particles = particles.filter(p => p.update(width, height, mouseX, mouseY));
      
      // Lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < 100 * 100) {
            const dist = Math.sqrt(distSq);
            const alpha = 1 - (dist / 100);
            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.2})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
        particles[i].draw(ctx);
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: '#0a0a0a' }}
      />
      <div className="scanlines fixed inset-0 z-10 pointer-events-none opacity-20" />
    </>
  );
}
