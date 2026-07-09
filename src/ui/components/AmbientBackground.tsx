import { useEffect, useRef } from 'react';

/**
 * A living casino backdrop. A single full-screen fragment shader paints a
 * slow-drifting gold/magenta/violet nebula with roaming glow spots, a vignette
 * and a touch of grain. It sits behind everything (fixed, -z). If WebGL is
 * unavailable or the shader fails to compile, the CSS gradient fallback below
 * shows through unchanged, so this never breaks the app.
 */

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
  float t = u_time * 0.045;

  float n1 = fbm(p * 1.6 + vec2(t, -t * 0.7));
  float n2 = fbm(p * 2.4 - vec2(t * 0.6, t));
  float n3 = fbm(p * 1.1 + vec2(-t, t * 0.8));

  vec3 col = vec3(0.028, 0.020, 0.055);
  col += vec3(1.0, 0.78, 0.30) * pow(n1, 3.0) * 0.42;
  col += vec3(1.0, 0.25, 0.60) * pow(n2, 3.0) * 0.36;
  col += vec3(0.52, 0.26, 0.92) * pow(n3, 4.0) * 0.5;

  float g1 = smoothstep(0.7, 0.0, length(p - vec2(sin(t * 2.0) * 0.55, cos(t * 1.7) * 0.32)));
  float g2 = smoothstep(0.6, 0.0, length(p - vec2(cos(t * 1.3) * 0.6, sin(t * 2.3) * 0.4)));
  col += vec3(1.0, 0.82, 0.4) * g1 * 0.14;
  col += vec3(1.0, 0.3, 0.7) * g2 * 0.10;

  float vig = smoothstep(1.25, 0.2, length(uv - 0.5));
  col *= mix(0.35, 1.0, vig);
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.015;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const gl = (canvas.getContext('webgl', { antialias: false, alpha: false, depth: false }) ??
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return; // CSS fallback shows through

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => {
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let start = 0;
    const render = (now: number) => {
      if (!start) start = now;
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    const onLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{
        background:
          'radial-gradient(120% 90% at 20% 10%, #1a1030 0%, transparent 55%),' +
          'radial-gradient(120% 90% at 85% 90%, #2a0f2a 0%, transparent 55%),' +
          'linear-gradient(160deg, #07060d 0%, #0d0a1a 100%)',
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
