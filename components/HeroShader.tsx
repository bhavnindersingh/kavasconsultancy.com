"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * The one WebGL moment: a slow, grainy ink-wash field in paper tones.
 * Doubles as the hero media placeholder until real imagery is dropped in.
 * Honors prefers-reduced-motion (renders a single still frame) and
 * pauses when offscreen.
 */

const frag = /* glsl */ `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  varying vec2 vUv;

  // hash + value noise + fbm
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(13.7, 7.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * vec2(uRes.x / uRes.y, 1.0);
    float t = uTime * 0.05;

    // domain-warped ink wash
    vec2 q = vec2(fbm(p * 1.6 + t), fbm(p * 1.6 - t * 0.7));
    vec2 r = vec2(fbm(p * 1.2 + q * 1.8 + vec2(1.7, 9.2)),
                  fbm(p * 1.2 + q * 1.8 + vec2(8.3, 2.8)));
    float f = fbm(p * 1.4 + r * 1.5);

    // paper → warm gray → ink shadow
    vec3 paper = vec3(0.972, 0.972, 0.968);
    vec3 warm  = vec3(0.855, 0.845, 0.830);
    vec3 ink   = vec3(0.35, 0.315, 0.290);

    vec3 col = mix(paper, warm, smoothstep(0.25, 0.75, f));
    col = mix(col, ink, smoothstep(0.72, 1.05, f + r.y * 0.35) * 0.55);

    // vignette + grain
    float vig = smoothstep(1.25, 0.45, distance(uv, vec2(0.5)));
    col = mix(col * 0.985, col, vig);
    col += (hash(uv * uRes + fract(t) * 100.0) - 0.5) * 0.035;

    gl_FragColor = vec4(col, 1.0);
  }
`;

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

export default function HeroShader({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      fragmentShader: frag,
      vertexShader: vert,
      uniforms,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    let visible = true;
    const start = performance.now();
    const loop = () => {
      uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
      if (!reduced && visible) raf = requestAnimationFrame(loop);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduced) {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(mount);

    loop(); // always render at least one frame

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      renderer.dispose();
      mat.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
