/**
 * 🪐 Canvas 3D Celestial Modeler Engine (canvas-3d-modeler.js)
 * Antigravity Deep Space Planetary Observatory
 *
 * Provides pure HTML5 Canvas 3D planetary modeling, procedural terrain meshes,
 * Renaissance armillary spheres, real-time 3D cross-hatching, quantum holograms,
 * and geological core cutaway models with interactive 360° orbit controls.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Canvas3DModeler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- DETERMINISTIC PSEUDO-RANDOM GENERATOR ---
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function makePrng(seed) {
    let s = (seed % 2147483647);
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // --- 3D VECTOR & MATRIX UTILITIES ---
  const V3 = {
    create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
    add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
    sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
    scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
    dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
    cross: (a, b) => ({
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    }),
    length: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
    normalize: (v) => {
      const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      return len > 0.00001 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 1, z: 0 };
    },
    rotate: (p, pitch, yaw, roll) => {
      // Pitch (X-axis)
      const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
      const y1 = p.y * cosP - p.z * sinP;
      const z1 = p.y * sinP + p.z * cosP;
      // Yaw (Y-axis)
      const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
      const x2 = p.x * cosY + z1 * sinY;
      const z2 = -p.x * sinY + z1 * cosY;
      // Roll (Z-axis)
      const cosR = Math.cos(roll), sinR = Math.sin(roll);
      const x3 = x2 * cosR - y1 * sinR;
      const y3 = x2 * sinR + y1 * cosR;
      return { x: x3, y: y3, z: z2 };
    }
  };

  // --- PROCEDURAL GEOMETRY GENERATORS ---

  // 1. Procedural Spherical Terrain Heightmap
  function computeElevation(nx, ny, nz, seed, category) {
    const s = seed * 0.001;
    const f1 = Math.sin(nx * 3.2 + s) * Math.cos(ny * 3.8 + s * 1.3) * Math.sin(nz * 3.1);
    const f2 = Math.sin(nx * 7.1 - s) * Math.cos(nz * 6.9 + s * 0.7) * 0.45;
    const f3 = Math.sin(ny * 13.5 + nz * 11.2 + s * 2.1) * 0.22;
    let h = f1 + f2 + f3;

    if (category === 'ai') {
      // Crystal facets & neural plateau cliffs
      h = Math.sign(h) * Math.pow(Math.abs(h), 0.7) * 1.3;
    } else if (category === 'security') {
      // Impact craters and massive mountain fortress ridges
      h = (h > 0.15 ? h * 1.6 : h * 0.4) - (Math.sin(nx * 14) * Math.cos(nz * 14) > 0.5 ? 0.35 : 0);
    } else if (category === 'platform') {
      // Gas giant atmospheric jet stream bands
      h = Math.sin(ny * 10 + s) * 0.5 + h * 0.15;
    } else if (category === 'finance') {
      // Stepped geological terraces
      h = Math.floor(h * 5) / 5;
    } else if (category === 'mcp') {
      // Pulsating hyperspace singularity spikes
      h = Math.sin(Math.atan2(nz, nx) * 12 + ny * 8) * 0.7;
    }
    return h * 0.11; // 11% radial displacement
  }

  // 2. Generate UV Sphere Mesh with Elevation
  function generateSphereMesh(planet, radius, latSegments = 20, lonSegments = 28) {
    const seed = hashString((planet.id || planet.name || 'world') + '_terrain_3d');
    const vertices = [];
    const faces = [];

    // Vertices
    for (let lat = 0; lat <= latSegments; lat++) {
      const theta = (lat / latSegments) * Math.PI; // 0 to PI
      const sinT = Math.sin(theta);
      const cosT = Math.cos(theta);

      for (let lon = 0; lon <= lonSegments; lon++) {
        const phi = (lon / lonSegments) * 2 * Math.PI; // 0 to 2*PI
        const sinP = Math.sin(phi);
        const cosP = Math.cos(phi);

        // Unit normal
        const nx = sinT * cosP;
        const ny = -cosT;
        const nz = sinT * sinP;

        const elev = computeElevation(nx, ny, nz, seed, planet.category);
        const r = radius * (1.0 + elev);

        vertices.push({
          x: nx * r,
          y: ny * r,
          z: nz * r,
          nx, ny, nz,
          elev,
          u: lon / lonSegments,
          v: lat / latSegments
        });
      }
    }

    // Faces (quads split into triangles)
    const stride = lonSegments + 1;
    for (let lat = 0; lat < latSegments; lat++) {
      for (let lon = 0; lon < lonSegments; lon++) {
        const i0 = lat * stride + lon;
        const i1 = i0 + 1;
        const i2 = (lat + 1) * stride + lon;
        const i3 = i2 + 1;

        // Quad polygon with 4 indices for clean wireframe and 2 sub-triangles
        const v0 = vertices[i0];
        const v1 = vertices[i1];
        const v2 = vertices[i2];
        const v3 = vertices[i3];

        const avgElev = (v0.elev + v1.elev + v2.elev + v3.elev) * 0.25;
        const avgY = (v0.ny + v1.ny + v2.ny + v3.ny) * 0.25;

        // Determine biome type
        let biome = 'land';
        if (avgElev < -0.02) biome = 'ocean';
        else if (avgElev > 0.065) biome = 'mountain';
        if (Math.abs(avgY) > 0.82) biome = 'polar';

        // Tri 1
        faces.push({
          indices: [i0, i1, i3],
          biome,
          avgElev,
          centerNorm: {
            x: (v0.nx + v1.nx + v3.nx) / 3,
            y: (v0.ny + v1.ny + v3.ny) / 3,
            z: (v0.nz + v1.nz + v3.nz) / 3
          }
        });

        // Tri 2
        faces.push({
          indices: [i0, i3, i2],
          biome,
          avgElev,
          centerNorm: {
            x: (v0.nx + v3.nx + v2.nx) / 3,
            y: (v0.ny + v3.ny + v2.ny) / 3,
            z: (v0.nz + v3.nz + v2.nz) / 3
          }
        });
      }
    }

    return { vertices, faces, radius };
  }

  // 3. Generate Armillary Celestial Circles
  function generateArmillaryMesh(radius) {
    const rings = [];
    const segments = 56;

    // A. Equatorial ring (XZ plane)
    const equator = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      equator.push({ x: Math.cos(a) * radius * 1.35, y: 0, z: Math.sin(a) * radius * 1.35 });
    }
    rings.push({ points: equator, type: 'equator', color: '#DFBA73', width: 2.2 });

    // B. Prime Meridian colure (YZ plane)
    const meridian = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      meridian.push({ x: 0, y: Math.cos(a) * radius * 1.35, z: Math.sin(a) * radius * 1.35 });
    }
    rings.push({ points: meridian, type: 'meridian', color: '#818CF8', width: 1.8 });

    // C. Solstitial colure (XY plane)
    const colure = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      colure.push({ x: Math.cos(a) * radius * 1.35, y: Math.sin(a) * radius * 1.35, z: 0 });
    }
    rings.push({ points: colure, type: 'colure', color: '#38BDF8', width: 1.5 });

    // D. Oblique Ecliptic (tilted at 23.5 degrees)
    const ecliptic = [];
    const tilt = (23.5 * Math.PI) / 180;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const bx = Math.cos(a) * radius * 1.42;
      const bz = Math.sin(a) * radius * 1.42;
      ecliptic.push({
        x: bx,
        y: -bz * Math.sin(tilt),
        z: bz * Math.cos(tilt)
      });
    }
    rings.push({ points: ecliptic, type: 'ecliptic', color: '#F59E0B', width: 2.4, isEcliptic: true });

    // E. Tropic of Cancer & Capricorn parallels
    const tropicY = Math.sin(tilt) * radius * 1.15;
    const tropicR = Math.cos(tilt) * radius * 1.15;
    const tropicN = [], tropicS = [];
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      tropicN.push({ x: Math.cos(a) * tropicR, y: -tropicY, z: Math.sin(a) * tropicR });
      tropicS.push({ x: Math.cos(a) * tropicR, y: tropicY, z: Math.sin(a) * tropicR });
    }
    rings.push({ points: tropicN, type: 'tropic', color: 'rgba(197, 160, 89, 0.45)', width: 1.0 });
    rings.push({ points: tropicS, type: 'tropic', color: 'rgba(197, 160, 89, 0.45)', width: 1.0 });

    // F. Polar Spindle Axis line with brass pointer
    const spindle = [
      { x: 0, y: -radius * 1.65, z: 0 },
      { x: 0, y: radius * 1.65, z: 0 }
    ];

    return { rings, spindle };
  }

  // 4. Generate 3D Planetary Rings Mesh
  function generateRingsMesh(radius, innerMult = 1.45, outerMult = 2.4, segments = 54) {
    const rInner = radius * innerMult;
    const rOuter = radius * outerMult;
    const ringVerts = [];
    const ringFaces = [];

    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);

      ringVerts.push({ x: cosA * rInner, y: 0, z: sinA * rInner }); // inner
      ringVerts.push({ x: cosA * rOuter, y: 0, z: sinA * rOuter }); // outer
    }

    for (let i = 0; i < segments; i++) {
      const i0 = i * 2;
      const i1 = i0 + 1;
      const i2 = (i + 1) * 2;
      const i3 = i2 + 1;

      ringFaces.push({ indices: [i0, i1, i3] });
      ringFaces.push({ indices: [i0, i3, i2] });
    }

    return { vertices: ringVerts, faces: ringFaces };
  }

  // 5. Generate Core Dissection / Cutaway Mesh
  function generateCutawayLayers(radius) {
    return [
      {
        name: 'Inner Core',
        radius: radius * 0.28,
        color: '#FFFFFF',
        glowColor: '#F59E0B',
        spec: 'Solid Crystalline Nickel-Iron (5,400 K)'
      },
      {
        name: 'Outer Core / Mantle',
        radius: radius * 0.60,
        color: '#EA580C',
        glowColor: '#DC2626',
        spec: 'High-Density Liquid Silicate & Plasma (3,800 K)'
      },
      {
        name: 'Lithosphere / Crust',
        radius: radius * 0.92,
        color: '#0D9488',
        glowColor: '#10B981',
        spec: 'Tectonic Basalt & Neural Silicate (48 km thickness)'
      },
      {
        name: 'Ionosphere & Exosphere',
        radius: radius * 1.12,
        color: '#6366F1',
        glowColor: '#818CF8',
        spec: 'Ionized Magnetospheric Envelope (0.84 atm)'
      }
    ];
  }

  // --- 3D CANVAS MODELER INSTANCE CLASS ---
  class ModelViewer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.options = Object.assign({
        fov: 340,
        cameraDist: 340,
        mode: 'solid', // 'solid', 'wireframe', 'sketch', 'hologram', 'cutaway'
        autoSpin: true,
        spinSpeed: 0.008,
        axialTilt: (21 * Math.PI) / 180,
        zoom: 1.0,
        exploded: 0.0,
        lightAngle: Math.PI * 0.75,
        interactive: true,
        enableParticles: true,
        onSelectPlanet: null
      }, options);

      this.planet = null;
      this.sphereMesh = null;
      this.armillaryMesh = null;
      this.ringsMesh = null;
      this.cutawayLayers = null;
      this.particles = [];

      // Euler Orientation Angles
      this.pitch = 0.22;
      this.yaw = 0.45;
      this.roll = 0.0;

      // Pointer Orbit Interaction
      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;
      this.velocityX = 0;
      this.velocityY = 0;

      // Holographic Scanner Beam
      this.scanY = -1.0;
      this.scanDir = 1.0;

      this.animationFrame = null;
      this.lastTime = performance.now();

      this.initEvents();
      this.initParticles();
    }

    initParticles() {
      this.particles = [];
      const count = 48;
      for (let i = 0; i < count; i++) {
        const dist = 90 + Math.random() * 110;
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.004 + (Math.random() - 0.5) * 0.008;
        const yOff = (Math.random() - 0.5) * 45;
        this.particles.push({ dist, angle, speed, yOff, size: 1 + Math.random() * 1.8 });
      }
    }

    initEvents() {
      if (!this.options.interactive) return;

      const c = this.canvas;

      const onDown = (x, y) => {
        this.isDragging = true;
        this.lastMouseX = x;
        this.lastMouseY = y;
        this.velocityX = 0;
        this.velocityY = 0;
      };

      const onMove = (x, y) => {
        if (!this.isDragging) return;
        const dx = x - this.lastMouseX;
        const dy = y - this.lastMouseY;
        this.yaw += dx * 0.008;
        this.pitch += dy * 0.008;
        // Clamp pitch to prevent gimbal singularity
        this.pitch = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.pitch));
        this.velocityX = dx * 0.008;
        this.velocityY = dy * 0.008;
        this.lastMouseX = x;
        this.lastMouseY = y;
      };

      const onUp = () => {
        this.isDragging = false;
      };

      // Mouse
      c.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY));
      window.addEventListener('mousemove', (e) => {
        if (this.isDragging) onMove(e.clientX, e.clientY);
      });
      window.addEventListener('mouseup', onUp);

      // Touch
      c.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          onDown(e.touches[0].clientX, e.touches[0].clientY);
          e.preventDefault();
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (this.isDragging && e.touches.length === 1) {
          onMove(e.touches[0].clientX, e.touches[0].clientY);
        }
      });
      window.addEventListener('touchend', onUp);

      // Wheel Zoom
      c.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.08 : 0.92;
        this.setZoom(this.options.zoom * delta);
      }, { passive: false });
    }

    loadPlanet(planet) {
      this.planet = planet;
      const baseR = Math.max(38, Math.min(68, (planet.size || 28) * 1.5));
      this.sphereMesh = generateSphereMesh(planet, baseR);
      this.armillaryMesh = generateArmillaryMesh(baseR);
      this.ringsMesh = planet.ring ? generateRingsMesh(baseR) : null;
      this.cutawayLayers = generateCutawayLayers(baseR);
    }

    setMode(mode) {
      if (['solid', 'wireframe', 'sketch', 'hologram', 'cutaway'].includes(mode)) {
        this.options.mode = mode;
      }
    }

    setZoom(z) {
      this.options.zoom = Math.max(0.5, Math.min(3.2, z));
    }

    setExploded(val) {
      this.options.exploded = Math.max(0.0, Math.min(1.0, val));
    }

    setSpinSpeed(s) {
      this.options.spinSpeed = s;
    }

    toggleAutoSpin() {
      this.options.autoSpin = !this.options.autoSpin;
      return this.options.autoSpin;
    }

    project(v, cx, cy) {
      const rot = V3.rotate(v, this.pitch, this.yaw, this.roll);
      const dist = this.options.cameraDist + rot.z;
      if (dist <= 5) return null;
      const s = (this.options.fov / dist) * this.options.zoom;
      return {
        x: cx + rot.x * s,
        y: cy + rot.y * s,
        z: rot.z,
        scale: s
      };
    }

    start() {
      if (this.animationFrame) return;
      const loop = (time) => {
        this.render(time);
        this.animationFrame = requestAnimationFrame(loop);
      };
      this.animationFrame = requestAnimationFrame(loop);
    }

    stop() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
    }

    render(time) {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      if (!ctx || w === 0 || h === 0) return;

      const dt = (time - this.lastTime) * 0.001;
      this.lastTime = time;

      // Inertial damping / Auto-spin
      if (!this.isDragging) {
        if (this.options.autoSpin) {
          this.yaw += this.options.spinSpeed;
        } else {
          this.yaw += this.velocityX;
          this.pitch += this.velocityY;
          this.velocityX *= 0.92;
          this.velocityY *= 0.92;
        }
      }

      // Update Scanner Beam
      this.scanY += this.scanDir * 0.015;
      if (this.scanY > 1.2) { this.scanY = 1.2; this.scanDir = -1.0; }
      if (this.scanY < -1.2) { this.scanY = -1.2; this.scanDir = 1.0; }

      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const p = this.planet;
      if (!p || !this.sphereMesh) return;

      const lightDir = V3.normalize({
        x: Math.cos(this.options.lightAngle),
        y: -0.45,
        z: Math.sin(this.options.lightAngle)
      });

      // 1. Render Background Particles / Stellar Dust
      if (this.options.enableParticles) {
        this.renderParticleCloud(ctx, cx, cy, p);
      }

      // 2. Branch into active 3D Model Render Mode
      switch (this.options.mode) {
        case 'wireframe':
          this.renderWireframeModel(ctx, cx, cy, p);
          break;
        case 'sketch':
          this.renderSketchModel(ctx, cx, cy, p, lightDir, time);
          break;
        case 'hologram':
          this.renderHologramModel(ctx, cx, cy, p, time);
          break;
        case 'cutaway':
          this.renderCutawayModel(ctx, cx, cy, p, lightDir);
          break;
        case 'solid':
        default:
          this.renderSolidModel(ctx, cx, cy, p, lightDir);
          break;
      }

      // 3. Render 3D Planetary Rings (if present)
      if (p.ring && this.ringsMesh && this.options.mode !== 'cutaway') {
        this.renderRings(ctx, cx, cy, p, lightDir);
      }
    }

    // --- RENDER PARTICLES ---
    renderParticleCloud(ctx, cx, cy, p) {
      ctx.save();
      this.particles.forEach(pt => {
        pt.angle += pt.speed;
        const wx = Math.cos(pt.angle) * pt.dist;
        const wz = Math.sin(pt.angle) * pt.dist;
        const wy = pt.yOff;
        const proj = this.project({ x: wx, y: wy, z: wz }, cx, cy);
        if (proj) {
          const alpha = Math.max(0.1, (proj.z + 180) / 360) * 0.7;
          ctx.fillStyle = p.secondaryColor || p.color || '#38BDF8';
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, Math.max(0.8, pt.size * proj.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    }

    // --- MODE 1: SOLID 3D TEXTURED MODEL ---
    renderSolidModel(ctx, cx, cy, p, lightDir) {
      const mesh = this.sphereMesh;
      const projectedVerts = mesh.vertices.map(v => this.project(v, cx, cy));

      // Calculate Face Depths and Normals
      const renderedFaces = [];
      for (let i = 0; i < mesh.faces.length; i++) {
        const f = mesh.faces[i];
        const p0 = projectedVerts[f.indices[0]];
        const p1 = projectedVerts[f.indices[1]];
        const p2 = projectedVerts[f.indices[2]];
        if (!p0 || !p1 || !p2) continue;

        // Backface culling via 2D cross product
        const cross2D = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        if (cross2D <= 0) continue; // Face is pointing away

        // 3D Rotated Normal for Lighting
        const rotNorm = V3.rotate(f.centerNorm, this.pitch, this.yaw, this.roll);
        const diffuse = Math.max(0.08, V3.dot(rotNorm, lightDir));

        // Specular highlight
        const viewDir = { x: 0, y: 0, z: -1 };
        const halfVec = V3.normalize(V3.add(lightDir, viewDir));
        const spec = Math.pow(Math.max(0, V3.dot(rotNorm, halfVec)), 14) * 0.45;

        // Depth for Painter's algorithm
        const avgZ = (p0.z + p1.z + p2.z) / 3;

        renderedFaces.push({
          p0, p1, p2,
          diffuse, spec,
          avgZ,
          biome: f.biome,
          elev: f.avgElev
        });
      }

      // Sort Back-to-Front
      renderedFaces.sort((a, b) => b.avgZ - a.avgZ);

      // Outer Corona Atmospheric Glow
      const screenR = mesh.radius * (this.options.fov / this.options.cameraDist) * this.options.zoom;
      const glowGrad = ctx.createRadialGradient(cx, cy, screenR * 0.8, cx, cy, screenR * 1.55);
      glowGrad.addColorStop(0, p.color || '#818CF8');
      glowGrad.addColorStop(0.5, p.secondaryColor || 'rgba(99, 102, 241, 0.4)');
      glowGrad.addColorStop(1, 'transparent');
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, screenR * 1.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Render Polygons
      renderedFaces.forEach(f => {
        ctx.beginPath();
        ctx.moveTo(f.p0.x, f.p0.y);
        ctx.lineTo(f.p1.x, f.p1.y);
        ctx.lineTo(f.p2.x, f.p2.y);
        ctx.closePath();

        // Biome Color Computation
        let baseColor = p.color;
        if (f.biome === 'ocean') {
          baseColor = p.secondaryColor || '#0B162C';
        } else if (f.biome === 'mountain') {
          baseColor = '#E2E8F0';
        } else if (f.biome === 'polar') {
          baseColor = '#FFFFFF';
        }

        // Shading intensity
        ctx.fillStyle = this.shadeColor(baseColor, f.diffuse + f.spec);
        ctx.fill();

        // Subtle wireframe edge
        ctx.strokeStyle = 'rgba(2, 6, 18, 0.25)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // Fresnel Atmospheric Limb Halo
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, screenR * 0.98, 0, Math.PI * 2);
      ctx.strokeStyle = p.secondaryColor || '#C5A059';
      ctx.lineWidth = Math.max(1.5, 2.5 * this.options.zoom);
      ctx.globalAlpha = 0.45;
      ctx.stroke();
      ctx.restore();
    }

    // --- MODE 2: CELESTIAL ARMILLARY & WIREFRAME ---
    renderWireframeModel(ctx, cx, cy, p) {
      const arm = this.armillaryMesh;
      const mesh = this.sphereMesh;

      // 1. Base Spherical Wireframe Grid
      const stride = 29;
      ctx.save();
      ctx.lineWidth = 0.8;
      for (let lat = 0; lat < 20; lat += 2) {
        ctx.beginPath();
        for (let lon = 0; lon <= 28; lon++) {
          const v = mesh.vertices[lat * stride + lon];
          const proj = this.project(v, cx, cy);
          if (proj) {
            if (lon === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.28)';
        ctx.stroke();
      }

      for (let lon = 0; lon <= 28; lon += 2) {
        ctx.beginPath();
        for (let lat = 0; lat <= 20; lat++) {
          const v = mesh.vertices[lat * stride + lon];
          const proj = this.project(v, cx, cy);
          if (proj) {
            if (lat === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.strokeStyle = 'rgba(129, 140, 248, 0.28)';
        ctx.stroke();
      }
      ctx.restore();

      // 2. Renaissance Brass & Celestial Rings
      arm.rings.forEach(ring => {
        ctx.save();
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.width;
        ctx.beginPath();
        ring.points.forEach((pt, idx) => {
          const proj = this.project(pt, cx, cy);
          if (proj) {
            if (idx === 0) ctx.moveTo(proj.x, proj.y);
            else ctx.lineTo(proj.x, proj.y);
          }
        });
        ctx.closePath();
        ctx.stroke();

        // If ecliptic, draw zodiacal coordinate ticks
        if (ring.isEcliptic) {
          ctx.strokeStyle = '#DFBA73';
          ctx.lineWidth = 1.2;
          for (let i = 0; i < ring.points.length; i += 4) {
            const pt = ring.points[i];
            const proj = this.project(pt, cx, cy);
            if (proj) {
              const tickOuter = V3.scale(pt, 1.08);
              const projOuter = this.project(tickOuter, cx, cy);
              if (projOuter) {
                ctx.beginPath();
                ctx.moveTo(proj.x, proj.y);
                ctx.lineTo(projOuter.x, projOuter.y);
                ctx.stroke();
              }
            }
          }
        }
        ctx.restore();
      });

      // 3. Polar Spindle Axis Line with Arrowtips
      const topP = this.project(arm.spindle[0], cx, cy);
      const botP = this.project(arm.spindle[1], cx, cy);
      if (topP && botP) {
        ctx.save();
        ctx.strokeStyle = '#DFBA73';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(topP.x, topP.y);
        ctx.lineTo(botP.x, botP.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // North arrow head
        ctx.fillStyle = '#DFBA73';
        ctx.beginPath();
        ctx.arc(topP.x, topP.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // South arrow head
        ctx.beginPath();
        ctx.arc(botP.x, botP.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- MODE 3: 3D REAL-TIME SKETCH & CROSS-HATCH MODEL ---
    renderSketchModel(ctx, cx, cy, p, lightDir, time) {
      const mesh = this.sphereMesh;
      const projectedVerts = mesh.vertices.map(v => this.project(v, cx, cy));

      // 1. Soft Watercolor Wash Background Sphere
      const screenR = mesh.radius * (this.options.fov / this.options.cameraDist) * this.options.zoom;
      const washGrad = ctx.createRadialGradient(cx - screenR * 0.35, cy - screenR * 0.35, screenR * 0.1, cx, cy, screenR);
      washGrad.addColorStop(0, '#FFFFFF');
      washGrad.addColorStop(0.25, p.color || '#C5A059');
      washGrad.addColorStop(0.75, p.secondaryColor || '#4338CA');
      washGrad.addColorStop(1, '#050B18');
      ctx.save();
      ctx.fillStyle = washGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, screenR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2. Render 3D Cross-Hatch Lines on Shadow Faces
      ctx.save();
      ctx.strokeStyle = 'rgba(8, 16, 32, 0.85)';
      ctx.lineWidth = 1.0;
      ctx.lineCap = 'round';

      for (let i = 0; i < mesh.faces.length; i++) {
        const f = mesh.faces[i];
        const p0 = projectedVerts[f.indices[0]];
        const p1 = projectedVerts[f.indices[1]];
        const p2 = projectedVerts[f.indices[2]];
        if (!p0 || !p1 || !p2) continue;

        const cross2D = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        if (cross2D <= 0) continue;

        const rotNorm = V3.rotate(f.centerNorm, this.pitch, this.yaw, this.roll);
        const diffuse = V3.dot(rotNorm, lightDir);

        // If in shadow, draw curved hatch lines
        if (diffuse < 0.45) {
          const midX = (p0.x + p1.x + p2.x) / 3;
          const midY = (p0.y + p1.y + p2.y) / 3;
          ctx.beginPath();
          ctx.moveTo(p0.x * 0.6 + midX * 0.4, p0.y * 0.6 + midY * 0.4);
          ctx.lineTo(p1.x * 0.6 + midX * 0.4, p1.y * 0.6 + midY * 0.4);
          ctx.stroke();

          // Deep shadow cross-hatch
          if (diffuse < 0.15) {
            ctx.beginPath();
            ctx.moveTo(p1.x * 0.6 + midX * 0.4, p1.y * 0.6 + midY * 0.4);
            ctx.lineTo(p2.x * 0.6 + midX * 0.4, p2.y * 0.6 + midY * 0.4);
            ctx.stroke();
          }
        }
      }
      ctx.restore();

      // 3. Multi-Pass Organic Sketch Outlines
      ctx.save();
      ctx.strokeStyle = '#0B162C';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      // Jittered outline loop
      const outlineSteps = 36;
      for (let i = 0; i <= outlineSteps + 2; i++) {
        const a = (i / outlineSteps) * Math.PI * 2;
        const jitter = Math.sin(a * 4 + 2) * 1.5;
        const ox = cx + Math.cos(a) * (screenR + jitter);
        const oy = cy + Math.sin(a) * (screenR + jitter);
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
      }
      ctx.stroke();

      // Secondary ghost pencil outline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(cx, cy, screenR * 1.015, 0, Math.PI * 2);
      ctx.stroke();

      // White Chalk Specular Highlight Arc
      ctx.strokeStyle = 'rgba(255, 252, 240, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(cx, cy, screenR * 0.88, -Math.PI * 0.75, -Math.PI * 0.28);
      ctx.stroke();
      ctx.restore();
    }

    // --- MODE 4: 3D QUANTUM HOLOGRAPHIC SCANNER ---
    renderHologramModel(ctx, cx, cy, p, time) {
      const mesh = this.sphereMesh;
      const projectedVerts = mesh.vertices.map(v => this.project(v, cx, cy));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 1. Pulsing Wireframe Facets
      ctx.strokeStyle = p.color || '#38BDF8';
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.45;

      for (let i = 0; i < mesh.faces.length; i += 2) {
        const f = mesh.faces[i];
        const p0 = projectedVerts[f.indices[0]];
        const p1 = projectedVerts[f.indices[1]];
        const p2 = projectedVerts[f.indices[2]];
        if (!p0 || !p1 || !p2) continue;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.stroke();
      }

      // 2. Glowing Laser Altitude Scanning Plane
      const screenR = mesh.radius * (this.options.fov / this.options.cameraDist) * this.options.zoom;
      const planeY = cy + this.scanY * screenR;
      const planeHalfW = Math.sqrt(Math.max(0, screenR * screenR - Math.pow(this.scanY * screenR, 2))) * 1.15;

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx - planeHalfW, planeY);
      ctx.lineTo(cx + planeHalfW, planeY);
      ctx.stroke();

      // Scanning text telemetry badge
      ctx.font = '9px monospace';
      ctx.fillStyle = '#DFBA73';
      ctx.fillText(`SCAN ALT: ${(this.scanY * 1420).toFixed(0)} KM // QUANTUM SYNC`, cx - 60, planeY - 6);

      // 3. Highlighted Vertex Nodes
      ctx.fillStyle = '#FFFFFF';
      for (let i = 0; i < projectedVerts.length; i += 8) {
        const pt = projectedVerts[i];
        if (pt && pt.z < 0) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // --- MODE 5: 3D GEOLOGICAL CORE DISSECTION / CUTAWAY ---
    renderCutawayModel(ctx, cx, cy, p, lightDir) {
      const layers = this.cutawayLayers;
      const explodeOffset = this.options.exploded * 38;

      ctx.save();
      // Render layers from inner to outer
      layers.forEach((layer, idx) => {
        const r = (layer.radius + idx * explodeOffset) * (this.options.fov / this.options.cameraDist) * this.options.zoom;

        // Spherical layer disc
        const grad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.3, layer.color);
        grad.addColorStop(0.85, layer.glowColor);
        grad.addColorStop(1, '#050B18');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 90-degree quadrant slice cutout
        ctx.save();
        ctx.fillStyle = 'rgba(5, 11, 24, 0.85)';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r + 2, 0, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Stratum border ring
        ctx.strokeStyle = layer.glowColor;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Annotation callout line
        if (idx === 0 || idx === 2) {
          const calloutX = cx + r + 25;
          const calloutY = cy - r * 0.6;
          ctx.strokeStyle = '#DFBA73';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(cx + r * 0.7, cy - r * 0.4);
          ctx.lineTo(calloutX, calloutY);
          ctx.lineTo(calloutX + 50, calloutY);
          ctx.stroke();

          ctx.font = 'bold 9px monospace';
          ctx.fillStyle = '#DFBA73';
          ctx.fillText(layer.name.toUpperCase(), calloutX, calloutY - 4);
          ctx.font = '8px sans-serif';
          ctx.fillStyle = '#E2E8F0';
          ctx.fillText(layer.spec, calloutX, calloutY + 10);
        }
      });
      ctx.restore();
    }

    // --- RENDER 3D PLANETARY RINGS ---
    renderRings(ctx, cx, cy, p, lightDir) {
      const rings = this.ringsMesh;
      if (!rings) return;

      const axialTilt = this.options.axialTilt;
      const projVerts = rings.vertices.map(v => {
        // Apply axial tilt before camera pitch/yaw
        const tiltedY = -v.z * Math.sin(axialTilt);
        const tiltedZ = v.z * Math.cos(axialTilt);
        return this.project({ x: v.x, y: tiltedY, z: tiltedZ }, cx, cy);
      });

      // Render Ring Polygons
      ctx.save();
      ctx.fillStyle = p.ringColor || 'rgba(197, 160, 89, 0.45)';
      ctx.strokeStyle = 'rgba(223, 186, 115, 0.6)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < rings.faces.length; i++) {
        const f = rings.faces[i];
        const p0 = projVerts[f.indices[0]];
        const p1 = projVerts[f.indices[1]];
        const p2 = projVerts[f.indices[2]];
        if (!p0 || !p1 || !p2) continue;

        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- COLOR SHADING UTILITY ---
    shadeColor(color, percent) {
      let f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = (f >> 8) & 0x00ff,
        B = f & 0x0000ff;
      return (
        '#' +
        (
          0x1000000 +
          (Math.round((t - R) * p) + R) * 0x10000 +
          (Math.round((t - G) * p) + G) * 0x100 +
          (Math.round((t - B) * p) + B)
        )
          .toString(16)
          .slice(1)
      );
    }

    // --- EXPORT HIGH-RES TECHNICAL BLUEPRINT ---
    exportBlueprint() {
      const blueprintCanvas = document.createElement('canvas');
      blueprintCanvas.width = 1200;
      blueprintCanvas.height = 800;
      const bctx = blueprintCanvas.getContext('2d');

      // Cyan Blueprint / Architectural Grid Background
      bctx.fillStyle = '#061024';
      bctx.fillRect(0, 0, 1200, 800);

      // Grid Lines
      bctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      bctx.lineWidth = 1;
      for (let x = 0; x < 1200; x += 40) {
        bctx.beginPath();
        bctx.moveTo(x, 0);
        bctx.lineTo(x, 800);
        bctx.stroke();
      }
      for (let y = 0; y < 800; y += 40) {
        bctx.beginPath();
        bctx.moveTo(0, y);
        bctx.lineTo(1200, y);
        bctx.stroke();
      }

      // Draw Main 3D Model in Blueprint
      const tempViewer = new ModelViewer(blueprintCanvas, {
        fov: 480,
        cameraDist: 480,
        mode: this.options.mode,
        zoom: 1.6,
        interactive: false
      });
      tempViewer.pitch = this.pitch;
      tempViewer.yaw = this.yaw;
      tempViewer.roll = this.roll;
      tempViewer.loadPlanet(this.planet);
      tempViewer.render(performance.now());

      // Technical Title Block
      bctx.fillStyle = '#DFBA73';
      bctx.font = 'bold 22px monospace';
      bctx.fillText(`ANTIGRAVITY // 3D CELESTIAL CAD SCHEMATIC: ${this.planet.name.toUpperCase()}`, 50, 60);

      bctx.font = '12px monospace';
      bctx.fillStyle = '#94A3B8';
      bctx.fillText(`SECTOR: 2026 // BIOME: ${this.planet.biome || 'STANDARD'} // MASS RATIO: ${this.planet.surfaceGravity || '1.0g'}`, 50, 85);
      bctx.fillText(`TECH STACK: ${this.planet.atmosphere || 'FastMCP Protocol, Autonomous Agents'}`, 50, 105);

      // Border & Caliper Markings
      bctx.strokeStyle = '#DFBA73';
      bctx.lineWidth = 2;
      bctx.strokeRect(30, 30, 1140, 740);

      return blueprintCanvas.toDataURL('image/png');
    }
  }

  return {
    createViewer: function (canvas, options) {
      return new ModelViewer(canvas, options);
    },
    computeElevation,
    generateSphereMesh,
    generateArmillaryMesh,
    generateRingsMesh,
    generateCutawayLayers
  };
});
