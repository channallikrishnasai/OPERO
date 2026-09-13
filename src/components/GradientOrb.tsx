"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type ColorTriple = [number, number, number];

export type GradientOrbConfig = {
  colors?: [ColorTriple, ColorTriple, ColorTriple];
  rotationSpeed?: number;
  noiseScale?: number;
  innerRadius?: number;
};

const WHITE: ColorTriple = [1, 1, 1];

const defaults: Required<GradientOrbConfig> = {
  colors: [WHITE, WHITE, WHITE],
  rotationSpeed: 0.3,
  noiseScale: 0.65,
  innerRadius: 0.1,
};

/* ═══════════════════════════════════════════════
   GLSL SHADERS — EXPLICIT RGB COLORS
   ═══════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float iTime;
  uniform vec3 iResolution;
  uniform vec3 color0;
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float rot;
  uniform float noiseScale;
  uniform float innerRadius;

  varying vec2 vUv;

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
  }

  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(
      dot(d0, hash33(i)),
      dot(d1, hash33(i + i1)),
      dot(d2, hash33(i + i2)),
      dot(d3, hash33(i + 1.0))
    );
    return dot(vec4(31.316), n);
  }

  vec4 extractAlpha(vec3 colorIn) {
    float a = max(max(colorIn.r, colorIn.g), colorIn.b);
    return vec4(colorIn.rgb / (a + 1e-5), a);
  }

  float light1(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * attenuation);
  }

  float light2(float intensity, float attenuation, float dist) {
    return intensity / (1.0 + dist * dist * attenuation);
  }

  vec4 draw(vec2 uv) {
    float len = length(uv);
    float invLen = len > 0.0 ? 1.0 / len : 0.0;

    float pulse = sin(iTime * 1.5) * 0.02;

    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;

    float r0 = mix(mix(innerRadius + pulse, 1.0, 0.4), mix(innerRadius + pulse, 1.0, 0.6), n0);

    float d0 = distance(uv, (r0 * invLen) * uv);
    float v0 = light1(1.0, 10.0, d0);
    v0 *= smoothstep(r0 * 1.05, r0, len);
    float cl = cos(atan(uv.y, uv.x) + iTime * 2.0) * 0.5 + 0.5;

    float a = iTime * -1.0;
    vec2 pos = vec2(cos(a), sin(a)) * r0;
    float d = distance(uv, pos);
    float v1 = light2(1.5, 5.0, d);
    v1 *= light1(1.0, 50.0, d0);

    float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
    float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);

    vec3 col = mix(color1, color2, cl);
    col = mix(col, color0, n0);
    col = mix(vec3(0.0), col, v0);
    col = (col + v1) * v2 * v3;
    col = clamp(col, 0.0, 1.0);

    return extractAlpha(col);
  }

  void main() {
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (vUv * iResolution.xy - center) / size * 2.0;

    float s = sin(rot);
    float c = cos(rot);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

    vec4 col = draw(uv);
    gl_FragColor = vec4(col.rgb * col.a, col.a);
  }
`;

/* ═══════════════════════════════════════════════
   GRADIENT SCENE (R3F)
   ═══════════════════════════════════════════════ */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function GradientScene({ config }: { config: Required<GradientOrbConfig> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const rotRef = useRef(0);
  const lastTimeRef = useRef(0);

  const curColor0 = useRef(new THREE.Vector3(...config.colors[0]));
  const curColor1 = useRef(new THREE.Vector3(...config.colors[1]));
  const curColor2 = useRef(new THREE.Vector3(...config.colors[2]));
  const curRotSpeed = useRef(config.rotationSpeed);
  const curNoise = useRef(config.noiseScale);
  const curRadius = useRef(config.innerRadius);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)
    );
    geo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2)
    );
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(size.width, size.height, 1) },
      color0: { value: new THREE.Vector3(...config.colors[0]) },
      color1: { value: new THREE.Vector3(...config.colors[1]) },
      color2: { value: new THREE.Vector3(...config.colors[2]) },
      rot: { value: 0 },
      noiseScale: { value: config.noiseScale },
      innerRadius: { value: config.innerRadius },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

  useFrame((state) => {
    if (!materialRef.current) return;

    const t = state.clock.elapsedTime;
    const dt = t - lastTimeRef.current;
    lastTimeRef.current = t;

    curRotSpeed.current = lerp(curRotSpeed.current, config.rotationSpeed, 0.03);
    rotRef.current += dt * curRotSpeed.current;
    curNoise.current = lerp(curNoise.current, config.noiseScale, 0.03);
    curRadius.current = lerp(curRadius.current, config.innerRadius, 0.03);

    curColor0.current.lerp(new THREE.Vector3(...config.colors[0]), 0.03);
    curColor1.current.lerp(new THREE.Vector3(...config.colors[1]), 0.03);
    curColor2.current.lerp(new THREE.Vector3(...config.colors[2]), 0.03);

    const u = materialRef.current.uniforms;
    u.iTime.value = t;
    u.color0.value.copy(curColor0.current);
    u.color1.value.copy(curColor1.current);
    u.color2.value.copy(curColor2.current);
    u.rot.value = rotRef.current;
    u.noiseScale.value = curNoise.current;
    u.innerRadius.value = curRadius.current;
    u.iResolution.value.set(
      size.width * viewport.dpr,
      size.height * viewport.dpr,
      size.width / size.height
    );
  });

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

/* ═══════════════════════════════════════════════
   GRADIENT ORB — EXPORTED COMPONENT
   ═══════════════════════════════════════════════ */

export function GradientOrb({
  config: configOverrides,
  className = "",
}: {
  config?: GradientOrbConfig;
  className?: string;
}) {
  const {
    colors = defaults.colors,
    rotationSpeed = defaults.rotationSpeed,
    noiseScale = defaults.noiseScale,
    innerRadius = defaults.innerRadius,
  } = configOverrides ?? {};

  const config = useMemo(
    () => ({ colors, rotationSpeed, noiseScale, innerRadius }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors[0][0], colors[0][1], colors[0][2], colors[1][0], colors[1][1], colors[1][2], colors[2][0], colors[2][1], colors[2][2], rotationSpeed, noiseScale, innerRadius]
  );

  return (
    <div
      className={`w-full h-full ${className}`}
      style={{ background: "transparent" }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <GradientScene config={config} />
      </Canvas>
    </div>
  );
}

export default GradientOrb;
