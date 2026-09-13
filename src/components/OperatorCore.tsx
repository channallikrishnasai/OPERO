"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GradientOrb, type GradientOrbConfig } from "./GradientOrb";

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

type DemoStep = {
  stage: Stage;
  text: string;
  action?: string;
  tree?: string;
  delay: number;
};

const DEMO: DemoStep[] = [
  { stage: "listening", text: '"Hey OPERO, open Instagram..."', tree: "Open Instagram", delay: 1500 },
  { stage: "thinking", text: "Understanding your intent...", delay: 1200 },
  { stage: "planning", text: "Planning 4-step operation...", delay: 1000 },
  { stage: "executing", text: "Opening Instagram", action: "browser.navigate", tree: "Open Instagram", delay: 1800 },
  { stage: "executing", text: "Searching for Techno Gamerz", action: "browser.search", tree: "Find Techno Gamerz", delay: 2000 },
  { stage: "executing", text: "Opening latest reel", action: "browser.click", tree: "Open latest reel", delay: 1800 },
  { stage: "approval", text: 'Post comment "nice reel"?', action: "comment.post", tree: "Post comment", delay: 0 },
  { stage: "executing", text: "Posting comment...", action: "comment.submit", tree: "Post comment", delay: 1600 },
  { stage: "verified", text: "Done — reel opened, comment posted", delay: 0 },
];

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

function ActionPlan({
  steps,
  stage,
}: {
  steps: { text: string; done: boolean; active: boolean }[];
  stage: Stage;
}) {
  const show = steps.length > 0 && stage !== "idle";
  if (!show) return null;

  return (
    <div className="opero-slide-in" style={{ animationDelay: "0.1s" }}>
      <div
        className="rounded-2xl p-5 max-w-[260px]"
        style={{
          background: "rgba(8, 8, 18, 0.6)",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.02)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div
            className="w-1 h-1 rounded-full"
            style={{ background: `${STAGE_COLOR[stage]}80` }}
          />
          <span
            className="text-[9px] tracking-[.22em] uppercase font-medium"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Action Plan
          </span>
        </div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex items-start gap-3"
              style={{
                animation: `opero-fade-up 0.4s cubic-bezier(0.16,1,0.3,1) ${
                  i * 0.06
                }s both`,
              }}
            >
              <div className="flex flex-col items-center pt-[6px]">
                <div
                  className="w-[6px] h-[6px] rounded-full shrink-0 transition-all duration-500"
                  style={{
                    backgroundColor: step.done
                      ? STAGE_COLOR.verified
                      : step.active
                      ? STAGE_COLOR[stage]
                      : "rgba(255,255,255,0.08)",
                    boxShadow: step.active
                      ? `0 0 10px ${STAGE_COLOR[stage]}50`
                      : "none",
                  }}
                />
                {i < steps.length - 1 && (
                  <div
                    className="w-px h-4 mt-1"
                    style={{
                      backgroundColor: step.done
                        ? "rgba(52, 211, 153, 0.15)"
                        : "rgba(255,255,255,0.04)",
                    }}
                  />
                )}
              </div>
              <div className="pb-3 min-w-0 flex-1">
                <span
                  className={`text-[11px] leading-relaxed transition-colors duration-400 ${
                    step.done
                      ? "text-white/25 line-through"
                      : step.active
                      ? "text-white/75"
                      : "text-white/20"
                  }`}
                >
                  {step.text}
                </span>
                {step.active && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div
                      className="w-[5px] h-[5px] rounded-full animate-pulse"
                      style={{ backgroundColor: STAGE_COLOR[stage] }}
                    />
                    <span
                      className="text-[8px] tracking-wider uppercase"
                      style={{ color: `${STAGE_COLOR[stage]}cc` }}
                    >
                      {STAGE_LABEL[stage]}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   APPROVAL OVERLAY (Glass Dialog)
   ═══════════════════════════════════════════════ */

function ApprovalOverlay({
  action,
  description,
  onApprove,
  onReject,
}: {
  action: string;
  description: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center opero-fade-in"
      style={{
        background: "rgba(3, 3, 8, 0.75)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div
        className="w-full max-w-sm mx-4 opero-scale-in"
        style={{
          background: "rgba(10, 10, 20, 0.85)",
          border: "1px solid rgba(245, 158, 11, 0.12)",
          borderRadius: "20px",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03)",
          padding: "28px",
        }}
      >
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(245, 158, 11, 0.06)",
              border: "1px solid rgba(245, 158, 11, 0.12)",
            }}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white/85">
              Action Requires Approval
            </div>
            <div className="text-[11px] text-white/30 mt-0.5">
              This action needs your confirmation
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-5"
          style={{
            background: "rgba(255,255,255,0.015)",
            border: "1px solid rgba(255,255,255,0.04)",
          }}
        >
          <div className="text-[9px] tracking-[.18em] text-amber-400/40 uppercase mb-2">
            Action
          </div>
          <div className="text-sm text-white/75 mb-2">{description}</div>
          <div className="flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-white/12" />
            <span className="text-[11px] text-white/25">{action}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-3 rounded-xl text-sm text-white/40 transition-all duration-200 active:scale-[0.97]"
            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-black transition-all duration-200 active:scale-[0.97]"
            style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              boxShadow: "0 4px 20px rgba(245, 158, 11, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 6px 30px rgba(245, 158, 11, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(245, 158, 11, 0.2)";
            }}
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [stage, setStage] = useState<Stage>("idle");
  const [transcript, setTranscript] = useState("");
  const [currentAction, setCurrentAction] = useState<string | null>(null);
  const [treeSteps, setTreeSteps] = useState<
    { text: string; done: boolean; active: boolean }[]
  >([]);
  const [approval, setApproval] = useState<{
    action: string;
    description: string;
  } | null>(null);
  const [showVerifiedPulse, setShowVerifiedPulse] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const runDemo = useCallback(() => {
    clearTimers();
    setStage("listening");
    setTranscript("");
    setCurrentAction(null);
    setTreeSteps([]);
    setApproval(null);
    setShowVerifiedPulse(false);

    let elapsed = 0;
    const completed = new Set<number>();

    DEMO.forEach((step, i) => {
      elapsed += step.delay;

      const t = setTimeout(() => {
        setStage(step.stage);
        setTranscript(step.text);

        if (step.stage !== "approval") {
          setCurrentAction(step.text);
        }

        if (step.tree) {
          const treeText = step.tree;
          setTreeSteps((prev) => {
            const existing = prev.find((s) => s.text === treeText);
            if (existing) {
              return prev.map((s) =>
                s.text === treeText
                  ? { ...s, active: true, done: false }
                  : { ...s, active: false }
              );
            }
            return [
              ...prev.map((s) => ({ ...s, active: false })),
              { text: treeText, done: false, active: true },
            ];
          });
        }

        if (i > 0 && DEMO[i - 1].tree && !completed.has(i - 1)) {
          completed.add(i - 1);
          const prevTree = DEMO[i - 1].tree as string;
          setTreeSteps((prev) =>
            prev.map((s) =>
              s.text === prevTree ? { ...s, done: true, active: false } : s
            )
          );
        }

        if (step.stage === "approval" && step.action) {
          setApproval({ action: step.action, description: step.text });
        }

        if (step.stage === "verified") {
          setCurrentAction(null);
          setTreeSteps((prev) =>
            prev.map((s) => ({ ...s, done: true, active: false }))
          );
          setShowVerifiedPulse(true);
          setTimeout(() => setShowVerifiedPulse(false), 1800);
        }
      }, elapsed);

      timers.current.push(t);
    });
  }, [clearTimers]);

  const handleApprove = useCallback(() => {
    clearTimers();
    setApproval(null);
    setStage("executing");
    setTranscript("Posting comment...");
    setCurrentAction("Posting comment...");

    const t1 = setTimeout(() => {
      setTranscript("Reel opened, comment posted");
      setCurrentAction(null);
      setStage("verified");
      setTreeSteps((prev) =>
        prev.map((s) => ({ ...s, done: true, active: false }))
      );
      setShowVerifiedPulse(true);
      setTimeout(() => setShowVerifiedPulse(false), 1800);
    }, 1500);
    timers.current.push(t1);
  }, [clearTimers]);

  const handleReject = useCallback(() => {
    clearTimers();
    setApproval(null);
    setStage("stopped");
    setTranscript("Operation cancelled");
    setCurrentAction(null);
  }, [clearTimers]);

  const stop = useCallback(() => {
    clearTimers();
    setApproval(null);
    setStage("stopped");
    setTranscript("Operation cancelled by operator");
    setCurrentAction(null);
  }, [clearTimers]);

  const isActive =
    stage !== "idle" && stage !== "verified" && stage !== "stopped";
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
          {currentAction && isActive && (
            <div className="flex items-center gap-1.5 mb-1 opero-fade-in">
              <div
                className="w-1 h-1 rounded-full animate-pulse"
                style={{ backgroundColor: stateColor }}
              />
              <span
                className="text-[9px] tracking-wider uppercase"
                style={{ color: `${stateColor}88` }}
              >
                {currentAction}
              </span>
            </div>
          )}
          <p
            className="text-[12px] max-w-sm truncate transition-all duration-300"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            {transcript || STAGE_MSG[stage]}
          </p>
        </div>

        <div
          className="mt-3 flex items-center gap-3 opero-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          {stage === "idle" ||
          stage === "verified" ||
          stage === "stopped" ? (
            <button
              onClick={runDemo}
              className="group px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.9)",
                color: "#030308",
                boxShadow: "0 2px 20px rgba(255,255,255,0.06)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 30px rgba(255,255,255,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 2px 20px rgba(255,255,255,0.06)";
              }}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
                {stage === "idle" ? "Run Demo" : "Run Again"}
              </span>
            </button>
          ) : isActive ? (
            <button
              onClick={stop}
              className="px-6 py-2.5 rounded-full text-[13px] font-medium transition-all duration-300 active:scale-[0.97]"
              style={{
                border: "1px solid rgba(248, 113, 113, 0.2)",
                background: "rgba(248, 113, 113, 0.05)",
                color: "#fca5a5",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  "rgba(248, 113, 113, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  "rgba(248, 113, 113, 0.05)";
              }}
            >
              <span className="flex items-center gap-2">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <rect x="6" y="4" width="4" height="12" rx="1" />
                  <rect x="10" y="4" width="4" height="12" rx="1" />
                </svg>
                Stop
              </span>
            </button>
          ) : null}
        </div>

        {treeSteps.length > 0 && (
          <div className="fixed right-6 top-1/2 -translate-y-1/2 z-20 hidden lg:block">
            <ActionPlan steps={treeSteps} stage={stage} />
          </div>
        )}
        {treeSteps.length > 0 && (
          <div className="mt-6 w-full max-w-[280px] lg:hidden">
            <ActionPlan steps={treeSteps} stage={stage} />
          </div>
        )}
      </div>

      {stage === "idle" && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 opero-fade-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div
            className="flex items-center gap-2.5 px-4 py-2 rounded-full"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <svg
              className="w-3.5 h-3.5 text-white/20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-[10px] text-white/18 tracking-wider">
              Say &quot;Hey OPERO&quot;
            </span>
          </div>
        </div>
      )}

      {approval && (
        <ApprovalOverlay
          action={approval.action}
          description={approval.description}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

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
            <div className="text-sm text-white/28">{transcript}</div>
          </div>
        </div>
      )}
    </main>
  );
}
