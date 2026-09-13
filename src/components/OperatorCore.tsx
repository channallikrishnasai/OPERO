"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Mesh, Material } from "three";

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
  idle: "#667eea",
  listening: "#38bdf8",
  thinking: "#fbbf24",
  planning: "#a78bfa",
  executing: "#f8fafc",
  approval: "#f59e0b",
  verified: "#34d399",
  stopped: "#f87171",
};

const STAGE_SPEED: Record<Stage, number> = {
  idle: 0.3,
  listening: 0.7,
  thinking: 1.2,
  planning: 0.9,
  executing: 1.6,
  approval: 0.4,
  verified: 0.3,
  stopped: 0.15,
};

const STAGE_AMP: Record<Stage, number> = {
  idle: 0.12,
  listening: 0.35,
  thinking: 0.6,
  planning: 0.45,
  executing: 0.8,
  approval: 0.25,
  verified: 0.08,
  stopped: 0.03,
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
   THREE.JS OPERO CORE — PREMIUM ORB
   ═══════════════════════════════════════════════ */

function OperaCoreCanvas({
  stage,
  mouse,
}: {
  stage: Stage;
  mouse: { x: number; y: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let destroyed = false;
    let raf = 0;

    const init = async () => {
      const THREE = await import("three");
      if (destroyed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      camera.position.z = 4.2;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;

      const resize = () => {
        const s = Math.min(canvas.clientWidth, canvas.clientHeight) || 1;
        renderer.setSize(s, s);
        camera.aspect = 1;
        camera.updateProjectionMatrix();
      };
      resize();

      scene.add(new THREE.AmbientLight(0x303050, 0.5));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
      keyLight.position.set(4, 6, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0x667eea, 0.35);
      fillLight.position.set(-4, -3, 4);
      scene.add(fillLight);
      const rimLight = new THREE.PointLight(0x764ba2, 0.7, 12);
      rimLight.position.set(0, 0, -4);
      scene.add(rimLight);

      const SEG = 96;
      const orbGeo = new THREE.SphereGeometry(1.1, SEG, SEG);
      const orbMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: STAGE_AMP[stage] },
          uColorA: { value: new THREE.Color(STAGE_COLOR[stage]) },
          uColorB: {
            value: new THREE.Color(STAGE_COLOR[stage]).offsetHSL(0.07, 0, 0.12),
          },
        },
        vertexShader: `
          uniform float uTime;
          uniform float uAmp;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying float vDisplace;

          vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
          vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

          float snoise(vec3 v){
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            vec3 i=floor(v+dot(v,C.yyy));
            vec3 x0=v-i+C.xxx;
            vec3 i1=step(x0.yzx,x0.xyz);
            vec3 g=step(i1.zxy,i1.xyz);
            vec3 l=1.0-g.xyz;
            vec3 i3=max(i,max(g,l));
            vec3 m1=min(i,min(g,l));
            vec3 m2=min(i3,min(i3,max(g,l)));
            vec3 x=x0+C.xxx+i1*C.yyy+g*C.zzz+l*C.www+m2*0.5-0.5;
            vec3 i2=max(min(i1-l,0.0),min(g,-i3));
            vec3 x3=x-1.0+3.0*C.xxx;
            vec4 p=permute(permute(permute(
              i.z+vec4(0.0,i1.z,i2.z,1.0))
              +i.y+vec4(0.0,i1.y,i2.y,1.0))
              +i.x+vec4(0.0,i1.x,i2.x,1.0));
            float n_=1.0/7.0;
            vec3 ns=n_*D.wyz-D.xzx;
            vec4 j=p-49.0*floor(p*ns.z*ns.z);
            vec4 x_=floor(j*ns.z);
            vec4 y_=floor(j-7.0*x_);
            vec4 xx=x_*ns.x+ns.yyyy;
            vec4 yy=y_*ns.x+ns.yyyy;
            vec4 h=1.0-abs(xx)-abs(yy);
            vec4 b0=vec4(xx.xy,yy.xy);
            vec4 b1=vec4(xx.zw,yy.zw);
            vec4 s0=floor(b0)*2.0+1.0;
            vec4 s1=floor(b1)*2.0+1.0;
            vec4 sh=-step(h,vec4(0.0));
            vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
            vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
            vec3 p0=vec3(a0.xy,h.x);
            vec3 p1=vec3(a0.zw,h.y);
            vec3 p2=vec3(a1.xy,h.z);
            vec3 p3=vec3(a1.zw,h.w);
            vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
            p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
            vec4 m=max(0.6-vec4(dot(x0,x0),dot(x0,x0),dot(x0,x0),dot(x0,x0)),0.0);
            m=m*m;
            return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x0),dot(p2,x0),dot(p3,x0)));
          }

          void main() {
            float n = snoise(position * 1.6 + uTime * 0.3) * uAmp;
            vec3 displaced = position + normal * n;
            vDisplace = n;
            vNormal = normalMatrix * normal;
            vWorldPos = (modelMatrix * vec4(displaced, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          varying float vDisplace;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            vec3 normal = normalize(vNormal);

            float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
            vec3 lightDir = normalize(vec3(4.0, 6.0, 5.0));
            float diff = max(dot(normal, lightDir), 0.0);
            vec3 halfVec = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfVec), 0.0), 64.0);

            float nMix = vDisplace * 0.5 + 0.5;
            vec3 base = mix(uColorA, uColorB, nMix);

            vec3 col = base * (0.18 + diff * 0.62);
            col += vec3(1.0) * spec * 0.4;
            col += mix(uColorA, vec3(1.0), 0.5) * fresnel * 0.85;
            col += base * 0.1;

            gl_FragColor = vec4(col, 0.96 - fresnel * 0.12);
          }
        `,
        transparent: true,
        side: THREE.FrontSide,
      });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      scene.add(orb);

      const glowGeo = new THREE.SphereGeometry(1.5, 48, 48);
      const glowMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(STAGE_COLOR[stage]) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vNormal = normalMatrix * normal;
            vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uTime;
          varying vec3 vNormal;
          varying vec3 vWorldPos;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPos);
            float fresnel = pow(1.0 - max(dot(viewDir, normalize(vNormal)), 0.0), 4.5);
            float pulse = 0.75 + sin(uTime * 1.2) * 0.25;
            float alpha = fresnel * 0.22 * pulse;
            gl_FragColor = vec4(uColor, alpha);
          }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      scene.add(glow);

      const coreLightGeo = new THREE.SphereGeometry(0.35, 32, 32);
      const coreLightMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(STAGE_COLOR[stage]) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalMatrix * normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uTime;
          varying vec3 vNormal;
          void main() {
            float pulse = 0.6 + sin(uTime * 2.0) * 0.4;
            float glow = pulse * 0.35;
            gl_FragColor = vec4(uColor * 1.5, glow);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const coreLight = new THREE.Mesh(coreLightGeo, coreLightMat);
      scene.add(coreLight);

      const rings: { mesh: Mesh; speed: number }[] = [];
      const ringParams = [
        { r: 1.65, tube: 0.005, color: 0x667eea, speed: 0.22, rotX: 1.1, rotZ: 0.2 },
        { r: 1.95, tube: 0.004, color: 0x764ba2, speed: -0.16, rotX: 0.8, rotZ: 0.5 },
        { r: 2.25, tube: 0.003, color: 0x38bdf8, speed: 0.1, rotX: 1.3, rotZ: -0.3 },
      ];
      for (const rp of ringParams) {
        const geo = new THREE.TorusGeometry(rp.r, rp.tube, 16, 160);
        const mat = new THREE.MeshBasicMaterial({
          color: rp.color,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(geo, mat);
        ring.rotation.x = rp.rotX;
        ring.rotation.z = rp.rotZ;
        rings.push({ mesh: ring, speed: rp.speed });
        scene.add(ring);
      }

      const PCOUNT = 220;
      const pPositions = new Float32Array(PCOUNT * 3);
      const pSizes = new Float32Array(PCOUNT);
      for (let i = 0; i < PCOUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 1.5 + Math.random() * 2.5;
        pPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pPositions[i * 3 + 2] = r * Math.cos(phi);
        pSizes[i] = 1.2 + Math.random() * 2.8;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
      pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSizes, 1));
      const pMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(STAGE_COLOR[stage]) },
          uTime: { value: 0 },
        },
        vertexShader: `
          attribute float aSize;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            float i = float(gl_VertexID);
            float angle = uTime * 0.12 + i * 0.31;
            pos.x += sin(angle + i) * 0.06;
            pos.z += cos(angle + i * 0.6) * 0.06;
            pos.y += sin(uTime * 0.35 + i * 0.4) * 0.04;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = aSize * (200.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
            vAlpha = 0.25 + sin(uTime * 1.8 + i) * 0.18;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float glow = exp(-d * 3.5) * vAlpha;
            gl_FragColor = vec4(uColor, glow);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const particles = new THREE.Points(pGeo, pMat);
      scene.add(particles);

      const clock = new THREE.Clock();
      const curA = new THREE.Color(STAGE_COLOR[stage]);
      const curB = new THREE.Color(STAGE_COLOR[stage]).offsetHSL(0.07, 0, 0.12);
      const curGlow = new THREE.Color(STAGE_COLOR[stage]);
      let tgtA = curA.clone();
      let tgtB = curB.clone();
      let tgtGlow = curGlow.clone();
      let rotSpeed = STAGE_SPEED[stage];
      let amp = STAGE_AMP[stage];
      let mouseX = 0;
      let mouseY = 0;

      const animate = () => {
        raf = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        curA.lerp(tgtA, 0.02);
        curB.lerp(tgtB, 0.02);
        curGlow.lerp(tgtGlow, 0.02);

        orbMat.uniforms.uColorA.value.copy(curA);
        orbMat.uniforms.uColorB.value.copy(curB);
        orbMat.uniforms.uTime.value = t;
        orbMat.uniforms.uAmp.value +=
          (amp - orbMat.uniforms.uAmp.value) * 0.035;

        glowMat.uniforms.uColor.value.copy(curGlow);
        glowMat.uniforms.uTime.value = t;

        coreLightMat.uniforms.uColor.value.copy(curA);
        coreLightMat.uniforms.uTime.value = t;

        pMat.uniforms.uColor.value.copy(curA);
        pMat.uniforms.uTime.value = t;

        orb.rotation.y += rotSpeed * 0.008;
        orb.rotation.x += rotSpeed * 0.003;
        glow.rotation.copy(orb.rotation);
        coreLight.rotation.copy(orb.rotation);

        for (const ring of rings) {
          ring.mesh.rotation.z += ring.speed * 0.006;
        }

        const tx = mouse.x * 0.35;
        const ty = mouse.y * 0.35;
        mouseX += (tx - mouseX) * 0.035;
        mouseY += (ty - mouseY) * 0.035;
        camera.position.x = mouseX;
        camera.position.y = mouseY;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => resize();
      window.addEventListener("resize", onResize);

      (
        canvas as unknown as { _updateState: (s: Stage) => void }
      )._updateState = (s: Stage) => {
        tgtA = new THREE.Color(STAGE_COLOR[s]);
        tgtB = new THREE.Color(STAGE_COLOR[s]).offsetHSL(0.07, 0, 0.12);
        tgtGlow = new THREE.Color(STAGE_COLOR[s]);
        rotSpeed = STAGE_SPEED[s];
        amp = STAGE_AMP[s];
      };

      cleanupRef.current = () => {
        destroyed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        orbGeo.dispose();
        orbMat.dispose();
        glowGeo.dispose();
        glowMat.dispose();
        coreLightGeo.dispose();
        coreLightMat.dispose();
        for (const ring of rings) {
          ring.mesh.geometry.dispose();
          (ring.mesh.material as Material).dispose();
        }
        pGeo.dispose();
        pMat.dispose();
      };
    };

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      cleanupRef.current?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      canvas &&
      (canvas as unknown as { _updateState?: (s: Stage) => void })._updateState
    ) {
      (canvas as unknown as { _updateState: (s: Stage) => void })._updateState(
        stage
      );
    }
  }, [stage]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ touchAction: "none" }}
    />
  );
}

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
   RADIAL WAVEFORM
   ═══════════════════════════════════════════════ */

function RadialWaveform({ stage }: { stage: Stage }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const active =
      stage !== "idle" &&
      stage !== "verified" &&
      stage !== "stopped";
    let raf: number;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const w = (canvas.width = canvas.offsetWidth * 2);
      const h = (canvas.height = canvas.offsetHeight * 2);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const bars = 72;
      const innerR = Math.min(w, h) * 0.3;
      const color = STAGE_COLOR[stage];

      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const barAmp = active
          ? 0.25 +
            Math.sin(Date.now() * 0.003 + i * 0.32) * 0.45 +
            Math.sin(Date.now() * 0.0018 + i * 0.12) * 0.18
          : 0.06 +
            Math.sin(Date.now() * 0.0006 + i * 0.15) * 0.04;
        const barLen = barAmp * innerR * 0.5;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * (innerR + barLen);
        const y2 = cy + Math.sin(angle) * (innerR + barLen);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = active ? 0.2 + barAmp * 0.35 : 0.06;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
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
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [showVerifiedPulse, setShowVerifiedPulse] = useState(false);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

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
            width: "min(400px, 58vw)",
            height: "min(400px, 55vh)",
          }}
        >
          <div className="absolute inset-0">
            <RadialWaveform stage={stage} />
          </div>
          <div className="absolute inset-[10%]">
            <OperaCoreCanvas stage={stage} mouse={mouse} />
          </div>
          <VerifiedPulse show={showVerifiedPulse} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <div className="text-[7px] tracking-[.5em] text-white/10 font-medium mb-1 uppercase">
              OPERO
            </div>
            <div
              className="text-[11px] font-medium transition-colors duration-700"
              style={{ color: `${stateColor}aa` }}
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
