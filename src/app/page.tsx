"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import dynamic from "next/dynamic";

const OperatorCore = dynamic(() => import("@/components/OperatorCore"), {
  ssr: false,
});

/* ═══════════════════════════════════════════════
   PARTICLE NETWORK CANVAS
   ═══════════════════════════════════════════════ */

function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const mouse = { x: -9999, y: -9999, radius: 180 };

    class Particle {
      x: number;
      y: number;
      directionX: number;
      directionY: number;
      size: number;
      color: string;

      constructor(
        x: number,
        y: number,
        directionX: number,
        directionY: number,
        size: number,
        color: string
      ) {
        this.x = x;
        this.y = y;
        this.directionX = directionX;
        this.directionY = directionY;
        this.size = size;
        this.color = color;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
      }

      update() {
        if (this.x > canvas!.width || this.x < 0) {
          this.directionX = -this.directionX;
        }
        if (this.y > canvas!.height || this.y < 0) {
          this.directionY = -this.directionY;
        }

        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < mouse.radius + this.size) {
            const forceDirectionX = dx / distance;
            const forceDirectionY = dy / distance;
            const force = (mouse.radius - distance) / mouse.radius;
            this.x -= forceDirectionX * force * 4;
            this.y -= forceDirectionY * force * 4;
          }
        }

        this.x += this.directionX;
        this.y += this.directionY;
        this.draw();
      }
    }

    function init() {
      particles = [];
      const numberOfParticles = Math.floor(
        (canvas!.height * canvas!.width) / 9000
      );
      const cx = canvas!.width / 2;
      const cy = canvas!.height / 2;
      const safeRadius = Math.min(canvas!.width, canvas!.height) * 0.28;

      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 1.6 + 0.6;
        let x = Math.random() * (canvas!.width - size * 2) + size * 2;
        let y = Math.random() * (canvas!.height - size * 2) + size * 2;

        /* Reduce density near center hero zone */
        const dx = x - cx;
        const dy = y - cy;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        if (distFromCenter < safeRadius && Math.random() > 0.15) {
          /* Place 85% of center-landing particles toward edges */
          const angle = Math.random() * Math.PI * 2;
          const edgeR = safeRadius + Math.random() * (Math.min(canvas!.width, canvas!.height) * 0.35);
          x = cx + Math.cos(angle) * edgeR;
          y = cy + Math.sin(angle) * edgeR;
        }

        const directionX = Math.random() * 0.3 - 0.15;
        const directionY = Math.random() * 0.3 - 0.15;

        const colors = [
          "rgba(120, 110, 255, 0.9)",
          "rgba(102, 126, 234, 0.85)",
          "rgba(130, 120, 255, 0.82)",
          "rgba(150, 135, 255, 0.78)",
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        particles.push(
          new Particle(x, y, directionX, directionY, size, color)
        );
      }
    }

    const resizeCanvas = () => {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      init();
    };

    const connect = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const distance =
            (particles[a].x - particles[b].x) *
              (particles[a].x - particles[b].x) +
            (particles[a].y - particles[b].y) *
              (particles[a].y - particles[b].y);

          const maxDist =
            (canvas!.width / 6.5) * (canvas!.height / 6.5);

          if (distance < maxDist) {
            const opacityValue = 1 - distance / 18000;

            const dxMouseA = particles[a].x - mouse.x;
            const dyMouseA = particles[a].y - mouse.y;
            const distMouseA = Math.sqrt(
              dxMouseA * dxMouseA + dyMouseA * dyMouseA
            );

            if (mouse.x && distMouseA < mouse.radius) {
              ctx!.strokeStyle = `rgba(170, 160, 255, ${opacityValue * 0.8})`;
            } else {
              ctx!.strokeStyle = `rgba(120, 110, 255, ${opacityValue * 0.48})`;
            }

            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.moveTo(particles[a].x, particles[a].y);
            ctx!.lineTo(particles[b].x, particles[b].y);
            ctx!.stroke();
          }
        }
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      ctx!.fillStyle = "#030308";
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
      }
      connect();
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    };

    const handleMouseOut = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
    />
  );
}

/* ═══════════════════════════════════════════════
   FRAMER-MOTION VARIANTS
   ═══════════════════════════════════════════════ */

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.18 + 0.4,
      duration: 0.7,
      ease: "easeOut" as const,
    },
  }),
};

/* ═══════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════ */

export default function Home() {
  const [showOperator, setShowOperator] = useState(false);

  if (showOperator) {
    return <OperatorCore />;
  }

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#030308]">
      {/* Particle Network Background */}
      <ParticleNetwork />

      {/* Vignette safe zone — clears center for hero readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 50% 46%, rgba(3, 3, 8, 0.85) 0%, rgba(3, 3, 8, 0.4) 50%, transparent 75%)",
        }}
      />

      {/* AI focal glow — subtle atmospheric convergence */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 44%, rgba(102, 126, 234, 0.06) 0%, rgba(80, 70, 180, 0.02) 30%, transparent 55%)",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-xl mx-auto">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-7"
          style={{
            background: "rgba(102, 126, 234, 0.1)",
            border: "1px solid rgba(102, 126, 234, 0.18)",
            backdropFilter: "blur(12px)",
          }}
        >
          <Zap className="h-3 w-3 text-indigo-400" />
          <span className="text-[10px] font-medium tracking-[0.15em] text-indigo-300/90 uppercase">
            AI Computer Operator
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-[0.04em] mb-5"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 20%, rgba(200, 200, 220, 0.65) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "none",
          }}
        >
          OPERO
        </motion.h1>

        {/* Tagline */}
        <motion.p
          custom={2}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-base md:text-lg text-white/70 mb-3 font-normal tracking-wide"
        >
          Your voice. Your command. Your computer.
        </motion.p>

        {/* Supporting Text */}
        <motion.p
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-[13px] text-white/40 mb-8 max-w-md mx-auto leading-relaxed"
        >
          Control your browser with natural voice commands. OPERO listens,
          understands, plans, acts, and verifies.
        </motion.p>

        {/* CTA Button */}
        <motion.div
          custom={4}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
        >
          <button
            onClick={() => setShowOperator(true)}
            className="group px-7 py-3 bg-white text-black text-sm font-semibold rounded-lg transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,255,255,0.12)] hover:brightness-105 active:scale-[0.97] flex items-center gap-2 mx-auto"
          >
            Start OPERO
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        {/* Secondary hint */}
        <motion.p
          custom={5}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-[11px] text-white/20 mt-4 tracking-wide"
        >
          Say &quot;Hey OPERO&quot; to begin
        </motion.p>
      </div>
    </div>
  );
}
