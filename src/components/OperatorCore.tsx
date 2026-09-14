"use client";

import { useEffect, useRef, useState } from "react";
import { GradientOrb, type GradientOrbConfig } from "./GradientOrb";
import dynamic from "next/dynamic";

const VoiceOperator = dynamic(
  () => import("./voice/VoiceOperator").then((m) => m.VoiceOperator),
  { ssr: false }
);

/* ═══════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════ */

type Stage =
  | "idle"
  | "listening"
  | "thinking"
  | "planning"
  | "executing"
  | "approval"
  | "verified"
  | "stopped";

const STAGE_LABEL: Record<Stage, string> = {
  idle: "READY",
  listening: "LISTENING",
  thinking: "THINKING",
  planning: "PLANNING",
  executing: "EXECUTING",
  approval: "APPROVAL REQUIRED",
  verified: "VERIFIED",
  stopped: "STOPPED",
};

const STAGE_MSG: Record<Stage, string> = {
  idle: 'Say "Hey OPERO" to begin',
  listening: "Listening for your command...",
  thinking: "Understanding your intent...",
  planning: "Creating action plan...",
  executing: "Performing action...",
  approval: "Waiting for your approval...",
  verified: "Operation completed successfully",
  stopped: "Operation cancelled",
};

const STAGE_COLOR: Record<Stage, string> = {
  idle: "#FFD700",
  listening: "#4169E1",
  thinking: "#6495ED",
  planning: "#7B68EE",
  executing: "#DC143C",
  approval: "#FFBF00",
  verified: "#FFA500",
  stopped: "#B8860B",
};

/* eslint-disable @typescript-eslint/no-unused-vars */
type ColorTriple = [number, number, number];
/* eslint-enable @typescript-eslint/no-unused-vars */

const STAGE_ORB: Record<Stage, GradientOrbConfig> = {
  idle: {
    colors: [[1.0, 0.843, 0.0], [1.0, 0.549, 0.0], [0.196, 0.804, 0.196]],
    rotationSpeed: 0.30, noiseScale: 0.65, innerRadius: 0.10,
  },
  listening: {
    colors: [[0.255, 0.412, 0.882], [0.541, 0.169, 0.886], [0.180, 0.180, 0.550]],
    rotationSpeed: 0.50, noiseScale: 0.70, innerRadius: 0.12,
  },
  thinking: {
    colors: [[0.392, 0.584, 0.925], [0.450, 0.300, 0.850], [0.250, 0.250, 0.700]],
    rotationSpeed: 0.80, noiseScale: 0.80, innerRadius: 0.15,
  },
  planning: {
    colors: [[0.360, 0.500, 0.900], [0.400, 0.250, 0.820], [0.300, 0.200, 0.780]],
    rotationSpeed: 0.65, noiseScale: 0.75, innerRadius: 0.13,
  },
  executing: {
    colors: [[0.863, 0.078, 0.078], [0.722, 0.090, 0.150], [0.500, 0.050, 0.050]],
    rotationSpeed: 1.00, noiseScale: 0.90, innerRadius: 0.18,
  },
  approval: {
    colors: [[1.0, 0.753, 0.0], [1.0, 0.500, 0.0], [0.850, 0.650, 0.129]],
    rotationSpeed: 0.35, noiseScale: 0.55, innerRadius: 0.11,
  },
  verified: {
    colors: [[1.0, 0.880, 0.0], [1.0, 0.600, 0.0], [0.250, 0.870, 0.250]],
    rotationSpeed: 0.50, noiseScale: 0.60, innerRadius: 0.12,
  },
  stopped: {
    colors: [[0.722, 0.525, 0.040], [0.650, 0.350, 0.020], [0.400, 0.320, 0.050]],
    rotationSpeed: 0.15, noiseScale: 0.35, innerRadius: 0.08,
  },
};

/* ═══════════════════════════════════════════════
   BACKGROUND PARTICLES (Canvas 2D)
   ═══════════════════════════════════════════════ */

function BackgroundParticles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      r: 0.4 + Math.random() * 0.8,
      o: 0.04 + Math.random() * 0.08,
    }));

    let raf: number;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(102, 126, 234, ${p.o})`;
        ctx.fill();
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={ref} className="absolute inset-0 w-full h-full" />
  );
}

/* ═══════════════════════════════════════════════
   ACTION PLAN (Floating Panel)
   ═══════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════
   VERIFIED PULSE
   ═══════════════════════════════════════════════ */

function VerifiedPulse({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-32 h-32 rounded-full"
        style={{
          border: "2px solid rgba(52, 211, 153, 0.35)",
          animation: "opero-success-pulse 1.8s ease-out forwards",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   OPERATOR CORE — MAIN EXPORT
   ═══════════════════════════════════════════════ */

export default function OperatorCore() {
  const [stage] = useState<Stage>("idle");
  const [showVerifiedPulse] = useState(false);
  const stateColor = STAGE_COLOR[stage];

  return (
    <main
      className="h-screen w-screen overflow-hidden relative"
      style={{ background: "#030308" }}
    >
      <BackgroundParticles />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(102, 126, 234, 0.03), transparent 55%)",
        }}
      />

      <header
        className="fixed top-0 left-0 right-0 z-30 h-12 flex items-center justify-between px-6 opero-fade-up"
        style={{
          background: "rgba(3, 3, 8, 0.5)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] tracking-tight"
            style={{ background: "rgba(255,255,255,0.88)", color: "#030308" }}
          >
            O
          </div>
          <div>
            <div className="font-semibold text-[12px] tracking-wide text-white/85">
              OPERO
            </div>
            <div className="text-[6px] tracking-[.28em] text-white/15 uppercase">
              Universal AI Operator
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full transition-all duration-500"
            style={{
              border: `1px solid ${stateColor}18`,
              background: `${stateColor}05`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full transition-colors duration-500"
              style={{
                background: stateColor,
                boxShadow: `0 0 6px ${stateColor}70`,
              }}
            />
            <span
              className="text-[8px] tracking-[.15em] font-medium uppercase"
              style={{ color: `${stateColor}bb` }}
            >
              {STAGE_LABEL[stage]}
            </span>
          </div>
        </div>
      </header>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pt-12">
        <div
          className="text-center mb-1 opero-fade-up"
          style={{ animationDelay: "0.1s" }}
        >
          <div className="text-[11px] font-semibold tracking-[.4em] text-white/8 uppercase">
            OPERO
          </div>
          <div className="text-[7px] tracking-[.35em] text-white/12 mt-0.5 uppercase">
            Universal AI Operator
          </div>
        </div>

        <div
          className="relative flex items-center justify-center"
          style={{
            width: "min(480px, 65vw)",
            height: "min(480px, 60vh)",
          }}
        >
          <div className="absolute inset-0">
            <GradientOrb config={STAGE_ORB[stage]} />
          </div>
          <VerifiedPulse show={showVerifiedPulse} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div
              className="text-[13px] font-medium transition-colors duration-700"
              style={{ color: `${stateColor}cc` }}
            >
              {STAGE_LABEL[stage]}
            </div>
          </div>
        </div>

        <div className="text-center mt-1 h-10 flex flex-col items-center justify-center px-4">
          <p
            className="text-[12px] max-w-sm truncate transition-all duration-300"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {STAGE_MSG[stage]}
          </p>
        </div>

        <div
          className="mt-3 flex items-center gap-3 opero-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          <VoiceOperator />
        </div>
      </div>

      {stage === "stopped" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none opero-fade-in">
          <div className="text-center">
            <div className="text-lg font-semibold text-white/65 mb-2">
              Operation Stopped
            </div>
            <div className="text-sm text-white/22">
              No pending actions were executed
            </div>
          </div>
        </div>
      )}

      {stage === "verified" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none opero-fade-in">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-emerald-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  style={{
                    strokeDasharray: 24,
                    animation:
                      "opero-check-draw 0.6s ease-out 0.3s both",
                  }}
                />
              </svg>
              <span className="text-lg font-semibold text-emerald-400/85">
                Verified
              </span>
            </div>
            <div className="text-sm text-white/28">{stage}</div>
          </div>
        </div>
      )}
    </main>
  );
}
