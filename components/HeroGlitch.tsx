"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * WebGL hero statement.
 *
 * The headline is drawn to a canvas in the site's serif, uploaded as a
 * texture, and sampled three times per pixel with a shifting offset —
 * so it reads as clean type at rest and fractures into slices and
 * colour fringing as the cursor moves across it, then resolves.
 *
 * The real <h1> stays in the DOM for screen readers and SEO; only its
 * pixels are hidden. Falls back to plain type when WebGL is missing or
 * the reader prefers reduced motion.
 */

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const frag = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uHover;
  uniform vec3 uBg;
  uniform vec3 uInk;
  varying vec2 vUv;

  float hash11(float p) {
    return fract(sin(p * 127.1) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);

    // proximity to the cursor, measured in aspect-corrected space
    float d = distance(vec2(uv.x * aspect, uv.y), vec2(uMouse.x * aspect, uMouse.y));
    float prox = smoothstep(0.55, 0.0, d);
    float amt = uHover * (0.25 + prox * 0.9);

    // horizontal slices tear sideways, re-rolled a few times a second
    float bands = 20.0;
    float bandId = floor(uv.y * bands);
    float r = hash11(bandId + floor(uTime * 11.0) * 3.13);
    float tear = (step(0.70, r) * ((r - 0.70) / 0.30) - 0.25) * 0.075 * amt;

    // rare idle flicker so the type feels alive before you touch it
    float beat = floor(uTime * 1.7);
    float idle = step(0.93, hash11(beat * 7.77)) * 0.5;
    float idleShift = idle * 0.004 * sin(uv.y * 60.0 + uTime * 40.0);

    vec2 duv = uv + vec2(tear + idleShift, 0.0);

    // chromatic split — widens with cursor proximity
    float sep = 0.0075 * amt + idle * 0.0035;
    float aR = texture2D(uTex, duv + vec2(sep, 0.0)).a;
    float aG = texture2D(uTex, duv).a;
    float aB = texture2D(uTex, duv - vec2(sep, 0.0)).a;

    vec3 col = uBg;
    col.r = mix(col.r, uInk.r, aR);
    col.g = mix(col.g, uInk.g, aG);
    col.b = mix(col.b, uInk.b, aB);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function HeroGlitch({ line }: { line: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const heading = headingRef.current;
    if (!wrap || !heading) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      return; // no WebGL — the DOM heading stays visible
    }

    const dpr = Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(dpr);
    wrap.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      width: "100%",
      height: "100%",
      display: "block",
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // ——— text → canvas → texture ———
    const tc = document.createElement("canvas");
    const ctx = tc.getContext("2d")!;
    const texture = new THREE.CanvasTexture(tc);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    // A raw ShaderMaterial writes gl_FragColor straight to the framebuffer
    // with no colour-space conversion, so colours must be kept as literal
    // sRGB values — otherwise the quad renders a shade off the page and the
    // canvas shows as a visible band.
    const readColor = (v: string, fallback: string) => {
      const raw =
        getComputedStyle(document.documentElement).getPropertyValue(v).trim() ||
        fallback;
      return new THREE.Color().setStyle(raw, THREE.LinearSRGBColorSpace);
    };

    const uniforms = {
      uTex: { value: texture },
      uRes: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTime: { value: 0 },
      uHover: { value: 0 },
      uBg: { value: readColor("--page-bg", "#f8f8f7") },
      uInk: {
        value: new THREE.Color().setStyle("#140700", THREE.LinearSRGBColorSpace),
      },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    /** draw the headline into the canvas, wrapping to the available width */
    const paint = () => {
      const cs = getComputedStyle(heading);
      const fontSize = parseFloat(cs.fontSize);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
      const lineHeight = fontSize * 1.08;
      const maxWidth = wrap.clientWidth;

      // wrap into lines
      ctx.font = font;
      const words = line.split(" ");
      const lines: string[] = [];
      let current = "";
      for (const w of words) {
        const next = current ? `${current} ${w}` : w;
        if (ctx.measureText(next).width > maxWidth && current) {
          lines.push(current);
          current = w;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);

      const h = Math.ceil(lines.length * lineHeight + fontSize * 0.5);
      wrap.style.height = `${h}px`;

      tc.width = Math.max(1, Math.round(maxWidth * dpr));
      tc.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, maxWidth, h);
      ctx.font = font;
      ctx.fillStyle = "#fff"; // alpha channel is all the shader reads
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => ctx.fillText(l, maxWidth / 2, startY + i * lineHeight));

      texture.needsUpdate = true;
      renderer.setSize(maxWidth, h, false);
      uniforms.uRes.value.set(maxWidth, h);
      uniforms.uBg.value = readColor("--page-bg", "#f8f8f7");
    };

    // fonts must be ready or the canvas draws in a fallback face
    if (document.fonts?.ready) document.fonts.ready.then(paint);
    paint();

    const ro = new ResizeObserver(paint);
    ro.observe(wrap);

    // ——— interaction ———
    let targetHover = 0;
    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      uniforms.uMouse.value.set(
        (e.clientX - r.left) / r.width,
        1 - (e.clientY - r.top) / r.height
      );
      targetHover = 1;
    };
    const onLeave = () => {
      targetHover = 0;
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      uniforms.uTime.value = (performance.now() - start) / 1000;
      uniforms.uHover.value +=
        (targetHover - uniforms.uHover.value) * 0.08; // eased settle
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    // only paint pixels once WebGL is definitely running
    heading.style.visibility = "hidden";

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      renderer.dispose();
      material.dispose();
      texture.dispose();
      if (renderer.domElement.parentNode === wrap)
        wrap.removeChild(renderer.domElement);
      heading.style.visibility = "";
    };
  }, [line]);

  return (
    <div ref={wrapRef} className="hero-glitch">
      {/* stays for assistive tech and crawlers; pixels hidden once WebGL runs */}
      <h1 ref={headingRef} className="hero-h hero-glitch__text">
        {line}
      </h1>
    </div>
  );
}
