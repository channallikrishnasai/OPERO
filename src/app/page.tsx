"use client";

import { useEffect, useRef, useState } from "react";

type Stage = "idle" | "listening" | "thinking" | "investigating" | "approval" | "executing" | "verified" | "stopped";

const incidents = [
  { id: "INC-1042", title: "Pressure valve failure", machine: "M-07", severity: "CRITICAL", age: "8m ago" },
  { id: "INC-1038", title: "Temperature anomaly", machine: "M-03", severity: "HIGH", age: "31m ago" },
];

const orders = [
  { id: "ORD-4821", customer: "Northstar Labs", status: "Delayed", amount: "$18,420" },
  { id: "ORD-4817", customer: "Vertex Systems", status: "Delayed", amount: "$9,850" },
  { id: "ORD-4809", customer: "Apex Industries", status: "Delayed", amount: "$6,240" },
];

export default function Home() {
  const [stage, setStage] = useState<Stage>("idle");
  const [logs, setLogs] = useState<string[]>([
    "Operator initialized",
    "Connected to Operations Core",
    "Awaiting instruction",
  ]);
  const [approved, setApproved] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  const addLog = (text: string) =>
    setLogs((x) => [...x.slice(-7), text]);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  useEffect(() => () => clearTimer(), []);

  const runDemo = () => {
    clearTimer();
    setApproved(false);
    setShowOrders(false);
    setStage("thinking");
    setLogs(["Request received", "Understanding operational intent..."]);

    timer.current = setTimeout(() => {
      setStage("investigating");
      addLog("Scanning incidents, orders and inventory...");
    }, 900);

    timer.current = setTimeout(() => {
      addLog("Critical incident detected: INC-1042");
      addLog("Checking replacement inventory...");
    }, 1900);

    timer.current = setTimeout(() => {
      setStage("approval");
      addLog("Replacement valve PV-204 available");
      addLog("Action requires human approval");
    }, 2900);
  };

  const approve = () => {
    setApproved(true);
    setStage("executing");
    addLog("Approval received");
    addLog("Reserving PV-204 for machine M-07...");

    timer.current = setTimeout(() => {
      setStage("verified");
      addLog("Reservation executed");
      addLog("State verified: inventory 1 → 0");
    }, 1600);
  };

  const reject = () => {
    setStage("stopped");
    addLog("Action rejected by operator");
    addLog("No system state was changed");
  };

  const stop = () => {
    clearTimer();
    setStage("stopped");
    addLog("Operation interrupted by operator");
    addLog("Pending actions discarded");
  };

  const askOrders = () => {
    clearTimer();
    setStage("thinking");
    setLogs(["Request received", "Searching delayed orders..."]);

    timer.current = setTimeout(() => {
      setShowOrders(true);
      setStage("verified");
      addLog("Found 3 delayed orders");
      addLog("No action taken without instruction");
    }, 1100);
  };

  const active = stage !== "idle" && stage !== "verified" && stage !== "stopped";

  return (
    <main className="min-h-screen bg-[#07090d] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_-10%,rgba(90,120,255,.13),transparent_40%)]" />

      <header className="h-16 border-b border-white/[.07] flex items-center justify-between px-6 relative z-10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white text-black grid place-items-center font-black text-sm">
            O
          </div>
          <div>
            <div className="font-semibold tracking-wide">OPERO</div>
            <div className="text-[9px] text-white/35 tracking-[.22em]">AI OPERATIONS OPERATOR</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" />
          SYSTEM ONLINE
        </div>
      </header>

      <div className="grid lg:grid-cols-[220px_1fr_310px] min-h-[calc(100vh-64px)] relative z-10">
        <aside className="hidden lg:block border-r border-white/[.07] p-4">
          <div className="text-[10px] uppercase tracking-[.2em] text-white/25 px-3 mb-4">
            Workspace
          </div>

          {["Overview", "Incidents", "Orders", "Inventory", "Tasks"].map((x, i) => (
            <div
              key={x}
              className={`px-3 py-2.5 rounded-lg mb-1 text-sm ${
                i === 0 ? "bg-white/[.07] text-white" : "text-white/40"
              }`}
            >
              {x}
            </div>
          ))}

          <div className="h-px bg-white/[.06] my-5" />

          <div className="text-[10px] uppercase tracking-[.2em] text-white/25 px-3 mb-3">
            Governance
          </div>

          <div className="px-3 py-2.5 text-sm text-white/40">Approvals</div>
          <div className="px-3 py-2.5 text-sm text-white/40">Audit Trail</div>

          <div className="absolute bottom-5 left-4 right-4">
            <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-3">
              <div className="text-[10px] text-white/30 mb-2">CONNECTED SYSTEMS</div>
              {["Orders", "Inventory", "Machines"].map((x) => (
                <div key={x} className="flex items-center gap-2 py-1 text-xs text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {x}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="p-5 lg:p-8 flex flex-col max-w-5xl mx-auto w-full">
          <div className="flex-1">
            <div className="mb-7">
              <div className="text-xs text-white/30 mb-2">GOOD MORNING, OPERATOR</div>
              <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
                What needs your attention?
              </h1>
              <p className="text-white/35 mt-2 text-sm">
                OPERO investigates operational issues and takes governed action.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-5">
              <Metric label="Critical" value="1" detail="incident" danger />
              <Metric label="Delayed" value="3" detail="orders" />
              <Metric label="Low stock" value="2" detail="items" />
            </div>

            <div className="rounded-2xl border border-white/[.08] bg-white/[.025] backdrop-blur-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[.06] flex justify-between">
                <span className="text-xs text-white/35 uppercase tracking-[.16em]">
                  Live Operator
                </span>
                <span className="text-xs text-white/25">
                  {stage === "idle" ? "Ready" : stage.toUpperCase()}
                </span>
              </div>

              <div className="min-h-[310px] flex flex-col items-center justify-center p-8">
                <div
                  className={`relative h-28 w-28 rounded-full border border-white/10 grid place-items-center transition-all duration-700 ${
                    active ? "scale-110 border-white/25" : ""
                  }`}
                >
                  {active && (
                    <>
                      <span className="absolute inset-[-12px] rounded-full border border-white/5 animate-ping" />
                      <span className="absolute inset-[-24px] rounded-full border border-white/[.025]" />
                    </>
                  )}

                  <div className={`h-16 w-16 rounded-full grid place-items-center transition-all ${
                    active ? "bg-white text-black" : "bg-white/[.06]"
                  }`}>
                    {stage === "verified" ? "✓" : stage === "stopped" ? "Ⅱ" : "◉"}
                  </div>
                </div>

                <div className="mt-7 text-center">
                  <div className="font-medium">
                    {stage === "idle" && "Ready for instruction"}
                    {stage === "thinking" && "Understanding request"}
                    {stage === "investigating" && "Investigating operations"}
                    {stage === "approval" && "Approval required"}
                    {stage === "executing" && "Executing action"}
                    {stage === "verified" && "Operation verified"}
                    {stage === "stopped" && "Operation stopped"}
                  </div>

                  <div className="text-sm text-white/35 mt-1">
                    {stage === "idle" && "Ask OPERO anything about your operations."}
                    {stage === "thinking" && "Analyzing your intent..."}
                    {stage === "investigating" && "Tracing the relevant operational state..."}
                    {stage === "approval" && "A human decision is required before execution."}
                    {stage === "executing" && "Changing system state..."}
                    {stage === "verified" && "The resulting state has been checked."}
                    {stage === "stopped" && "No unauthorized action was performed."}
                  </div>
                </div>

                {(stage === "approval" || stage === "executing") && (
                  <div className="mt-6 w-full max-w-md rounded-xl border border-amber-400/20 bg-amber-400/[.04] p-4">
                    <div className="text-[10px] text-amber-300/70 uppercase tracking-widest mb-2">
                      Action
                    </div>
                    <div className="font-medium">Reserve Pressure Valve PV-204</div>
                    <div className="text-xs text-white/35 mt-1">
                      Machine M-07 · Inventory 1 → 0
                    </div>

                    {stage === "approval" && !approved && (
                      <div className="flex gap-2 mt-4">
                        <button onClick={reject} className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-white/50 hover:bg-white/5">
                          Reject
                        </button>
                        <button onClick={approve} className="flex-1 rounded-lg bg-white text-black py-2 text-xs font-semibold hover:bg-white/90">
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-white/[.06] p-4 flex gap-2">
                <button
                  onClick={runDemo}
                  className="flex-1 rounded-xl bg-white text-black py-3 text-sm font-semibold hover:bg-white/90 transition"
                >
                  {stage === "idle" ? "▶ Run operator demo" : "↻ Run again"}
                </button>

                <button
                  onClick={askOrders}
                  className="rounded-xl border border-white/10 px-4 text-xs text-white/55 hover:bg-white/5"
                >
                  Find delayed orders
                </button>

                {active && (
                  <button
                    onClick={stop}
                    className="rounded-xl border border-red-400/20 px-4 text-xs text-red-300 hover:bg-red-400/10"
                  >
                    Stop
                  </button>
                )}
              </div>
            </div>

            {showOrders && (
              <div className="mt-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-5">
                <div className="flex justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-white/35">
                    Delayed Orders
                  </span>
                  <span className="text-xs text-amber-300">3 found</span>
                </div>

                <div className="space-y-2">
                  {orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[.025]">
                      <div>
                        <div className="text-sm">{o.id}</div>
                        <div className="text-xs text-white/30">{o.customer}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-amber-300">{o.status}</div>
                        <div className="text-xs text-white/30">{o.amount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="border-l border-white/[.07] p-5 bg-black/10">
          <div className="text-[10px] uppercase tracking-[.2em] text-white/25 mb-4">
            Live Activity
          </div>

          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={`${log}-${i}`} className="flex gap-3 text-xs animate-[fadeIn_.3s_ease-out]">
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                  i === logs.length - 1 ? "bg-white shadow-[0_0_8px_white]" : "bg-white/20"
                }`} />
                <span className={i === logs.length - 1 ? "text-white/75" : "text-white/30"}>
                  {log}
                </span>
              </div>
            ))}
          </div>

          <div className="h-px bg-white/[.06] my-7" />

          <div className="text-[10px] uppercase tracking-[.2em] text-white/25 mb-4">
            Current State
          </div>

          <div className="space-y-2">
            <StateRow label="Permission" value={stage === "approval" ? "APPROVAL" : "GOVERNED"} />
            <StateRow label="Execution" value={stage === "executing" ? "ACTIVE" : "CONTROLLED"} />
            <StateRow label="Verification" value={stage === "verified" ? "PASSED" : "PENDING"} />
          </div>

          <div className="mt-8 rounded-xl border border-white/[.07] p-4">
            <div className="text-[10px] text-white/25 uppercase tracking-widest mb-3">
              OPERO Loop
            </div>
            <div className="text-xs leading-6 text-white/40">
              Speak → Understand → Investigate → Decide → Act → Verify → Report
            </div>
          </div>
        </aside>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value, detail, danger }: {
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[.07] bg-white/[.025] p-4">
      <div className="text-[10px] uppercase tracking-widest text-white/25">{label}</div>
      <div className={`text-2xl font-semibold mt-2 ${danger ? "text-red-300" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-white/25">{detail}</div>
    </div>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center rounded-lg bg-white/[.025] px-3 py-2.5">
      <span className="text-xs text-white/30">{label}</span>
      <span className="text-[10px] text-white/55">{value}</span>
    </div>
  );
}