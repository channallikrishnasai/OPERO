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
        (canvas!.height * canvas!.width) / 8500
      );
      for (let i = 0; i < numberOfParticles; i++) {
        const size = Math.random() * 1.8 + 0.8;
        const x = Math.random() * (canvas!.width - size * 2) + size * 2;
        const y = Math.random() * (canvas!.height - size * 2) + size * 2;
        const directionX = Math.random() * 0.35 - 0.175;
        const directionY = Math.random() * 0.35 - 0.175;

        const colors = [
          "rgba(130, 120, 255, 0.7)",
          "rgba(102, 126, 234, 0.7)",
          "rgba(140, 130, 255, 0.6)",
          "rgba(160, 140, 255, 0.5)",
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
              ctx!.strokeStyle = `rgba(200, 190, 255, ${opacityValue * 0.6})`;
            } else {
              ctx!.strokeStyle = `rgba(130, 120, 255, ${opacityValue * 0.35})`;
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

      {/* Subtle radial gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(102, 126, 234, 0.04), transparent 60%)",
        }}
      />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
        {/* Badge */}
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{
            background: "rgba(102, 126, 234, 0.08)",
            border: "1px solid rgba(102, 126, 234, 0.15)",
          }}
        >
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-[11px] font-medium tracking-wider text-indigo-300/80 uppercase">
            AI Computer Operator
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          custom={1}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6"
          style={{
            background:
              "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
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
          className="text-lg md:text-xl text-white/50 mb-4 font-light"
        >
          Your voice. Your command. Your computer.
        </motion.p>

        {/* Supporting Text */}
        <motion.p
          custom={3}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-sm text-white/30 mb-10 max-w-lg mx-auto leading-relaxed"
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
            className="group px-8 py-3.5 bg-white text-black font-semibold rounded-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.97] flex items-center gap-2.5 mx-auto"
          >
            Start OPERO
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </button>
        </motion.div>

        {/* Secondary hint */}
        <motion.p
          custom={5}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="text-[11px] text-white/15 mt-5 tracking-wide"
        >
          Say &quot;Hey OPERO&quot; to begin
        </motion.p>
      </div>
    </div>
  );
}
