/**
 * 🪐 Antigravity Deep Space Planetary Observatory Engine (planetarium.js)
 *
 * Implements:
 * - Full-webpage widescreen responsive astronomical projection & Auto-Fit
 * - Docked Astronomical Observation Deck & real-time 3D planetary hologram
 * - Collapsible Planetary Manifest drawer & quick-warp navigation
 * - Autonomous Cinematic Tour Mode through celestial worlds
 * - Dynamic Gravitational Web Filaments & Traveling Quantum Pulses
 * - Web Audio API celestial resonance generator
 * - Complete keyboard navigation choreography
 */

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    canvas: null,
    ctx: null,
    hologramCanvas: null,
    hologramCtx: null,
    minimapCanvas: null,
    minimapCtx: null,
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: Math.min(window.devicePixelRatio || 1, 2),

    // Camera
    scale: 1.0,
    minScale: 0.25,
    maxScale: 3.5,
    offsetX: window.innerWidth / 2,
    offsetY: window.innerHeight / 2,
    targetScale: 1.0,
    targetOffsetX: window.innerWidth / 2,
    targetOffsetY: window.innerHeight / 2,

    // Interaction
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    mouseScreenX: 0,
    mouseScreenY: 0,
    hoveredPlanet: null,
    selectedPlanet: null,
    activeSector: 'all',
    showWeb: true,
    orbitMotion: true,
    audioEnabled: false,
    tourActive: false,
    tourTimer: null,
    tourIndex: 0,

    pulseOffset: 0,
    starfield: [],

    // Antigravity Secondary Side Panel
    agPanelOpen: true,
    agActiveTab: 'projects',
    agDockSide: 'left',
    agWidthMode: 'normal',
    agProjectFilter: '',
    agSectorFilter: 'all',

    // Hand-Drawn Sketch & Color Shading Mode
    sketchMode: true,

    // 3D Celestial Modeler & Orrery System
    modelLabOpen: false,
    modelLabPlanet: null,
    modelLabMode: 'solid',
    orrery3D: false,
    orreryPitch: 0.52
  };

  const rawData = window.PLANETARIUM_DATA || { projects: [], starSectors: [] };

  // 3D Model Viewers Registry
  const mini3DViewers = new Map();
  let lab3DViewer = null;

  // --- DETERMINISTIC HASH & PRNG FOR HAND-DRAWN SKETCH ---
  function hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function createPrng(seed) {
    let s = (seed % 2147483647);
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generatePlanetSketch(p) {
    const rand = createPrng(hashString((p.id || p.name || 'world') + '_sketch_core'));
    const isStar = (p.id === 'MCP');
    const pSize = p.size || 20;

    // 1. Primary hand-drawn contour outline (normalized points relative to unit circle r=1.0)
    const primaryContour = [];
    const segments = 38;
    const phase1 = rand() * Math.PI * 2;
    const phase2 = rand() * Math.PI * 2;
    const startAngle = -0.14 + (rand() - 0.5) * 0.08;
    const endAngle = Math.PI * 2 + 0.18 + (rand() - 0.5) * 0.10;

    for (let i = 0; i <= segments + 2; i++) {
      const frac = i / segments;
      const theta = startAngle + frac * (endAngle - startAngle);
      const lowHarmonic = 0.024 * Math.sin(theta * 2 + phase1) + 0.014 * Math.cos(theta * 3 + phase2);
      const pencilJitter = (rand() - 0.5) * 0.038;
      const rNorm = 1.0 + lowHarmonic + pencilJitter;
      primaryContour.push({
        x: Math.cos(theta) * rNorm,
        y: Math.sin(theta) * rNorm,
        theta: theta
      });
    }

    // 2. Secondary ghost sketch pass
    const secondaryContour = [];
    const secSegments = 26;
    const secPhase = rand() * Math.PI * 2;
    for (let i = 0; i <= secSegments + 1; i++) {
      const frac = i / secSegments;
      const theta = frac * Math.PI * 2;
      const wobble = (rand() - 0.48) * 0.065 + 0.020 * Math.sin(theta * 2 + secPhase);
      const rNorm = 1.0 + wobble;
      secondaryContour.push({
        x: Math.cos(theta) * rNorm,
        y: Math.sin(theta) * rNorm
      });
    }

    // 3. Spherical Shading Hatching (Curved Latitude Arcs across shadow side)
    const hatchLines = [];
    const numHatches = Math.max(6, Math.min(13, Math.round(pSize * 0.55)));

    for (let h = 0; h < numHatches; h++) {
      const t = (h + 1) / (numHatches + 1);
      const uPos = 0.08 + Math.pow(t, 1.35) * 0.84;
      const vMax = Math.sqrt(Math.max(0, 1.0 - uPos * uPos)) * 0.96;

      if (vMax > 0.08) {
        const linePoints = [];
        const numLineSteps = 7;
        const sagitta = (1.0 - uPos * 0.6) * 0.22;

        for (let s = 0; s <= numLineSteps; s++) {
          const vFrac = (s / numLineSteps) * 2 - 1;
          const vCoord = vFrac * vMax;
          const curveOffset = (1.0 - vFrac * vFrac) * sagitta;
          const uCoord = uPos + curveOffset + (rand() - 0.5) * 0.035;

          const rotAngle = Math.PI / 4;
          const wx = uCoord * Math.cos(rotAngle) - vCoord * Math.sin(rotAngle);
          const wy = uCoord * Math.sin(rotAngle) + vCoord * Math.cos(rotAngle);
          linePoints.push({ x: wx, y: wy });
        }

        hatchLines.push({
          points: linePoints,
          alpha: 0.25 + t * 0.55,
          width: 0.7 + (rand() - 0.5) * 0.3
        });
      }
    }

    // 4. Cross-Hatching in Deep Shadow Limb
    const crossHatches = [];
    const numCross = Math.max(3, Math.min(7, Math.round(numHatches * 0.6)));
    for (let c = 0; c < numCross; c++) {
      const t = (c + 1) / (numCross + 1);
      const uPos = 0.55 + t * 0.38;
      const vMax = Math.sqrt(Math.max(0, 1.0 - uPos * uPos)) * 0.88;
      if (vMax > 0.08) {
        const angle = Math.PI / 4 + (Math.PI / 3);
        const len = vMax * 0.9;
        const cx = uPos * 0.7071 + (rand() - 0.5) * 0.05;
        const cy = uPos * 0.7071 + (rand() - 0.5) * 0.05;
        crossHatches.push({
          x1: cx - Math.cos(angle) * len * 0.5,
          y1: cy - Math.sin(angle) * len * 0.5,
          x2: cx + Math.cos(angle) * len * 0.5,
          y2: cy + Math.sin(angle) * len * 0.5,
          alpha: 0.35 + t * 0.45
        });
      }
    }

    // 5. Hand-Drawn Surface Features
    const surfaceBands = [];
    const craters = [];
    const solarRays = [];

    if (isStar) {
      const rayCount = 24;
      for (let r = 0; r < rayCount; r++) {
        const rayAngle = (r / rayCount) * Math.PI * 2 + (rand() - 0.5) * 0.12;
        const rayLen = 1.15 + rand() * 0.75 + (r % 2 === 0 ? 0.35 : 0.0);
        solarRays.push({
          x1: Math.cos(rayAngle) * 0.98,
          y1: Math.sin(rayAngle) * 0.98,
          x2: Math.cos(rayAngle) * rayLen,
          y2: Math.sin(rayAngle) * rayLen,
          width: 0.6 + rand() * 0.8,
          alpha: 0.35 + rand() * 0.45
        });
      }
    } else if (p.category === 'platform' || p.category === 'cognitive' || pSize > 22) {
      const numBands = 2 + Math.floor(rand() * 2);
      for (let b = 0; b < numBands; b++) {
        const bandY = -0.45 + (b / (numBands + 1)) * 0.9 + (rand() - 0.5) * 0.1;
        const bandHalfW = Math.sqrt(Math.max(0, 0.95 - bandY * bandY));
        if (bandHalfW > 0.15) {
          const pts = [];
          const steps = 6;
          for (let s = 0; s <= steps; s++) {
            const bx = -bandHalfW + (s / steps) * (bandHalfW * 2);
            const by = bandY + Math.sin(s * 1.2 + rand() * 3) * 0.045;
            pts.push({ x: bx, y: by });
          }
          surfaceBands.push({ points: pts, alpha: 0.35 + rand() * 0.25 });
        }
      }
    } else {
      const numCraters = 2 + Math.floor(rand() * 2);
      for (let k = 0; k < numCraters; k++) {
        const crAngle = rand() * Math.PI * 2;
        const crDist = 0.2 + rand() * 0.55;
        const crRadius = 0.08 + rand() * 0.09;
        craters.push({
          cx: Math.cos(crAngle) * crDist,
          cy: Math.sin(crAngle) * crDist,
          r: crRadius,
          tilt: rand() * Math.PI,
          hatchAlpha: 0.35 + rand() * 0.3
        });
      }
    }

    // 6. Hand-Drawn Ring Sketch Pass
    const ringSketch = [];
    let ringTicks = null;
    if (p.ring) {
      ringSketch.push({ radiusMult: 1.70, width: 0.9, alpha: 0.55 });
      ringSketch.push({ radiusMult: 1.88, width: 1.4, alpha: 0.85 });
      ringSketch.push({ radiusMult: 2.05, width: 0.8, alpha: 0.45 });

      ringTicks = [];
      const numTicks = 20;
      for (let t = 0; t < numTicks; t++) {
        const tFrac = t / numTicks;
        const tAngle = tFrac * Math.PI * 2;
        ringTicks.push({
          angle: tAngle,
          innerR: 1.68 + (rand() - 0.5) * 0.04,
          outerR: 2.06 + (rand() - 0.5) * 0.04,
          alpha: 0.25 + rand() * 0.35
        });
      }
    }

    // 7. Gouache / Chalk Illuminated Crescent Highlight
    const chalkPts = [];
    const chalkStart = -Math.PI * 0.88;
    const chalkEnd = -Math.PI * 0.28;
    for (let c = 0; c <= 8; c++) {
      const th = chalkStart + (c / 8) * (chalkEnd - chalkStart);
      const rChalk = 0.88 + (rand() - 0.5) * 0.03;
      chalkPts.push({ x: Math.cos(th) * rChalk, y: Math.sin(th) * rChalk });
    }

    return {
      primaryContour,
      secondaryContour,
      hatchLines,
      crossHatches,
      surfaceBands,
      craters,
      solarRays,
      ringSketch,
      ringTicks,
      chalkPts,
      isStar
    };
  }

  // Generate Widescreen Panoramic Planetary Layout
  function computePlanetaryCoordinates() {
    const aspectFactor = Math.max(1.35, window.innerWidth / Math.max(window.innerHeight, 600));
    return rawData.projects.map((p, idx) => {
      const rad = (p.angle * Math.PI) / 180;
      // Widescreen ellipse mapping: expands X to fit 16:9/16:10 screens majestically
      const xDist = p.distance * 1.95 * (aspectFactor * 0.72);
      const yDist = p.distance * 1.95;

      const planetObj = {
        ...p,
        baseX: Math.cos(rad) * xDist,
        baseY: Math.sin(rad) * yDist,
        x: Math.cos(rad) * xDist,
        y: Math.sin(rad) * yDist,
        currentAngle: rad,
        orbitRadiusX: xDist,
        orbitRadiusY: yDist,
        orbitSpeed: 0.00010 + (1 / (p.distance + 40)) * 0.018,
        pulsePhase: Math.random() * Math.PI * 2,
        catalogIndex: idx,
        baseSize: p.size || 20,
        z: 0
      };
      planetObj.sketch = generatePlanetSketch(planetObj);
      return planetObj;
    });
  }

  let planets = computePlanetaryCoordinates();
  const planetMap = new Map();
  planets.forEach(p => planetMap.set(p.name, p));
  planets.forEach(p => planetMap.set(p.id, p));

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playCosmicTone(freq = 528, type = 'sine', duration = 0.45, gainLevel = 0.07) {
    if (!state.audioEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio exception", e);
    }
  }

  function playHoverChime(category) {
    const freqs = {
      ai: 659.25, security: 440.0, platform: 493.88,
      gaming: 587.33, finance: 523.25, automation: 392.0,
      showcase: 698.46, mcp: 880.0
    };
    playCosmicTone(freqs[category] || 528, 'sine', 0.4, 0.05);
  }

  // --- STARFIELD GENERATOR ---
  function initStarfield() {
    const starCount = 420;
    state.starfield = [];
    const colors = ['#FFFFFF', '#D9E8FF', '#FFF4E8', '#FFD8B8', '#AECBFA', '#DFBA73'];
    for (let i = 0; i < starCount; i++) {
      state.starfield.push({
        x: (Math.random() - 0.5) * 4500,
        y: (Math.random() - 0.5) * 4500,
        radius: Math.random() * 1.8 + 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  // --- AUTO-FIT TO SCREEN BOUNDS ---
  function fitGalaxyToScreen(animate = true) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    const visiblePlanets = planets.filter(p => {
      if (state.activeSector === 'all') return true;
      if (state.activeSector === 'mcp') return p.id === 'MCP' || (p.mcpServers && p.mcpServers.length > 0);
      return p.category === state.activeSector;
    });

    if (visiblePlanets.length === 0) return;

    visiblePlanets.forEach(p => {
      minX = Math.min(minX, p.x - p.size - 40);
      maxX = Math.max(maxX, p.x + p.size + 40);
      minY = Math.min(minY, p.y - p.size - 40);
      maxY = Math.max(maxY, p.y + p.size + 40);
    });

    const boxW = Math.max(maxX - minX, 400);
    const boxH = Math.max(maxY - minY, 300);

    // Padding accounts for top header and right deck if open
    const isDeckOpen = document.getElementById('telemetry-deck')?.classList.contains('open');
    const availW = isDeckOpen ? (state.width - 460) : state.width;
    const availH = state.height - 110;

    const scaleX = (availW * 0.88) / boxW;
    const scaleY = (availH * 0.88) / boxH;
    const targetScale = Math.max(state.minScale, Math.min(state.maxScale, Math.min(scaleX, scaleY)));

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const targetOffsetX = (isDeckOpen ? (availW / 2) : (state.width / 2)) - midX * targetScale;
    const targetOffsetY = (state.height / 2 + 25) - midY * targetScale;

    if (animate) {
      state.targetScale = targetScale;
      state.targetOffsetX = targetOffsetX;
      state.targetOffsetY = targetOffsetY;
    } else {
      state.scale = targetScale;
      state.targetScale = targetScale;
      state.offsetX = targetOffsetX;
      state.targetOffsetX = targetOffsetX;
      state.offsetY = targetOffsetY;
      state.targetOffsetY = targetOffsetY;
    }

    updateZoomDisplay();
    playCosmicTone(432, 'triangle', 0.5, 0.06);
  }

  // --- INITIALIZE CANVAS & EVENTS ---
  function initCanvas() {
    state.canvas = document.getElementById('planetarium-canvas');
    state.ctx = state.canvas.getContext('2d');

    state.minimapCanvas = document.getElementById('minimap-canvas');
    if (state.minimapCanvas) state.minimapCtx = state.minimapCanvas.getContext('2d');

    state.hologramCanvas = document.getElementById('hologram-canvas');
    if (state.hologramCanvas) state.hologramCtx = state.hologramCanvas.getContext('2d');

    handleResize();
    window.addEventListener('resize', () => {
      handleResize();
      fitGalaxyToScreen(false);
    });

    setupEvents();
  }

  function handleResize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);

    state.canvas.width = state.width * state.dpr;
    state.canvas.height = state.height * state.dpr;
    state.canvas.style.width = `${state.width}px`;
    state.canvas.style.height = `${state.height}px`;

    if (state.minimapCanvas) {
      state.minimapCanvas.width = 170 * state.dpr;
      state.minimapCanvas.height = 115 * state.dpr;
    }
  }

  // --- EVENT LISTENERS (PAN, ZOOM, HOVER, CLICK) ---
  function setupEvents() {
    const c = state.canvas;

    c.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      state.isDragging = true;
      state.dragStartX = e.clientX - state.offsetX;
      state.dragStartY = e.clientY - state.offsetY;
    });

    window.addEventListener('mousemove', (e) => {
      state.mouseScreenX = e.clientX;
      state.mouseScreenY = e.clientY;

      if (state.isDragging) {
        state.offsetX = e.clientX - state.dragStartX;
        state.offsetY = e.clientY - state.dragStartY;
        state.targetOffsetX = state.offsetX;
        state.targetOffsetY = state.offsetY;
      }

      checkHover(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
      state.isDragging = false;
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      zoomAtPoint(e.clientX, e.clientY, zoomFactor);
    }, { passive: false });

    c.addEventListener('click', (e) => {
      const clicked = getPlanetAtPoint(e.clientX, e.clientY);
      if (clicked) {
        selectPlanet(clicked);
      }
    });

    // Mobile touch
    let lastTouchDist = 0;
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        state.isDragging = true;
        state.dragStartX = e.touches[0].clientX - state.offsetX;
        state.dragStartY = e.touches[0].clientY - state.offsetY;
      } else if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && state.isDragging) {
        state.offsetX = e.touches[0].clientX - state.dragStartX;
        state.offsetY = e.touches[0].clientY - state.dragStartY;
        state.targetOffsetX = state.offsetX;
        state.targetOffsetY = state.offsetY;
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (lastTouchDist > 0) {
          const factor = dist / lastTouchDist;
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          zoomAtPoint(midX, midY, factor);
        }
        lastTouchDist = dist;
      }
    });

    c.addEventListener('touchend', () => {
      state.isDragging = false;
      lastTouchDist = 0;
    });

    // Keyboard Hotkeys
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleOrbitMotion();
      } else if (e.key === 'f' || e.key === 'F') {
        fitGalaxyToScreen(true);
      } else if (e.key === 't' || e.key === 'T') {
        toggleCelestialTour();
      } else if (e.key === 'k' || e.key === 'K') {
        toggleSketchMode();
      } else if (e.key === 'l' || e.key === 'L') {
        state.modelLabOpen ? closeModelLab() : openModelLab(state.selectedPlanet ? state.selectedPlanet.id : 'MCP');
      } else if (e.key === 'o' || e.key === 'O') {
        toggleOrreryPerspective();
      } else if (e.key === 'm' || e.key === 'M' || (e.altKey && (e.key === 'a' || e.key === 'A')) || (e.ctrlKey && (e.key === 'b' || e.key === 'B'))) {
        e.preventDefault();
        toggleAntigravityPanel();
      } else if (e.key === 'ArrowRight' || e.key === ']') {
        navigatePlanet(1);
      } else if (e.key === 'ArrowLeft' || e.key === '[') {
        navigatePlanet(-1);
      } else if (e.key === 'Escape') {
        if (state.modelLabOpen) {
          closeModelLab();
        } else {
          toggleAntigravityPanel(false);
          closeTelemetryDeck();
        }
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('planet-search-input')?.focus();
      }
    });
  }

  function zoomAtPoint(screenX, screenY, factor) {
    const newScale = Math.max(state.minScale, Math.min(state.maxScale, state.scale * factor));
    if (newScale === state.scale) return;

    const worldX = (screenX - state.offsetX) / state.scale;
    const worldY = (screenY - state.offsetY) / state.scale;

    state.scale = newScale;
    state.targetScale = newScale;
    state.offsetX = screenX - worldX * newScale;
    state.offsetY = screenY - worldY * newScale;
    state.targetOffsetX = state.offsetX;
    state.targetOffsetY = state.offsetY;

    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    const el = document.getElementById('zoom-level-text');
    if (el) el.textContent = `${Math.round(state.scale * 100)}%`;
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx - state.offsetX) / state.scale,
      y: (sy - state.offsetY) / state.scale
    };
  }

  function getPlanetAtPoint(screenX, screenY) {
    const world = screenToWorld(screenX, screenY);
    for (let i = planets.length - 1; i >= 0; i--) {
      const p = planets[i];
      const dx = world.x - p.x;
      const dy = world.y - p.y;
      const hitRadius = Math.max(p.size, 18);
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return p;
      }
    }
    return null;
  }

  function checkHover(screenX, screenY) {
    const p = getPlanetAtPoint(screenX, screenY);
    if (p !== state.hoveredPlanet) {
      state.hoveredPlanet = p;
      if (p) {
        state.canvas.style.cursor = 'pointer';
        playHoverChime(p.category);
        // Only preview floating deck if Antigravity Secondary panel is closed
        if (!state.selectedPlanet && !state.agPanelOpen) {
          openTelemetryDeck(p, false);
        }
      } else {
        state.canvas.style.cursor = state.isDragging ? 'grabbing' : 'grab';
      }
    }
  }

  // --- CAMERA NAVIGATION & ORBIT FLIGHT ---
  function flyToPlanet(p, targetScale = 1.65) {
    state.selectedPlanet = p;

    let leftMargin = 0;
    let rightMargin = 0;

    const agPanel = document.getElementById('antigravity-secondary-panel');
    if (agPanel && agPanel.classList.contains('open')) {
      const panelW = agPanel.offsetWidth || 440;
      if (agPanel.classList.contains('dock-right')) {
        rightMargin += panelW;
      } else {
        leftMargin += panelW;
      }
    }

    const deck = document.getElementById('telemetry-deck');
    if (deck && deck.classList.contains('open') && (!agPanel || !agPanel.classList.contains('open') || !agPanel.classList.contains('dock-right'))) {
      rightMargin += deck.offsetWidth || 460;
    }

    const availW = Math.max(300, state.width - leftMargin - rightMargin);
    state.targetScale = targetScale;
    state.targetOffsetX = leftMargin + (availW / 2) - p.x * targetScale;
    state.targetOffsetY = (state.height / 2) - p.y * targetScale;

    playCosmicTone(432, 'triangle', 0.6, 0.07);

    // Sync Antigravity Secondary Side Panel
    highlightProjectCard(p.id);
    renderInspectorTab(p);

    // Sync Right Telemetry Deck (only if Antigravity secondary is closed)
    if (!agPanel || !agPanel.classList.contains('open')) {
      openTelemetryDeck(p, true);
    } else {
      closeTelemetryDeck();
    }
    highlightManifestItem(p.id);

    // Header active indicator update
    const badge = document.getElementById('ag-panel-status-badge');
    if (badge) {
      badge.textContent = `🪐 ${p.name.toUpperCase()}`;
    }
  }

  function selectPlanet(p) {
    flyToPlanet(p);
  }

  function navigatePlanet(direction = 1) {
    const visible = planets.filter(p => {
      if (state.activeSector === 'all') return true;
      if (state.activeSector === 'mcp') return p.id === 'MCP' || (p.mcpServers && p.mcpServers.length > 0);
      return p.category === state.activeSector;
    });

    if (visible.length === 0) return;

    let currentIndex = state.selectedPlanet ? visible.findIndex(p => p.id === state.selectedPlanet.id) : 0;
    let nextIndex = (currentIndex + direction + visible.length) % visible.length;
    flyToPlanet(visible[nextIndex]);
  }

  // --- DOCKED TELEMETRY OBSERVATION DECK ---
  function openTelemetryDeck(p, pin = true) {
    const deck = document.getElementById('telemetry-deck');
    if (!deck) return;

    const catObj = rawData.starSectors.find(c => c.id === p.category) || { name: p.category, color: p.color };
    const relativePlanets = p.links || [];

    // Atmospheric chips
    const atmosphereChips = (p.atmosphere || '').split(',').map(s => `
      <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0E1D3A] border border-[#C5A059]/30 text-slate-200">
        ${s.trim()}
      </span>
    `).join('');

    // Resonant sibling orbits
    const siblingHtml = relativePlanets.map(relName => {
      const targetP = planetMap.get(relName);
      const dotColor = targetP ? targetP.color : '#DFBA73';
      return `
        <button onclick="window.PlanetariumApp.flyTo('${relName}')"
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#050B18]/70 hover:bg-[#C5A059]/20 border border-[#C5A059]/30 hover:border-[#DFBA73] text-slate-200 hover:text-white transition-all shadow-sm">
          <span class="w-2 h-2 rounded-full shadow-sm" style="background: ${dotColor}"></span>
          <span>${relName}</span>
        </button>
      `;
    }).join('') || '<span class="text-xs text-slate-400 italic">Central Galactic Singularity</span>';

    // MCP Uplink Badge
    const mcpHtml = (p.mcpServers && p.mcpServers.length > 0) ? `
      <div class="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
        <span class="text-[#DFBA73] flex items-center gap-1 font-semibold text-[11px]">
          ⚡ MCP Hyperspace Uplink:
        </span>
        <div class="flex flex-wrap gap-1">
          ${p.mcpServers.map(s => `
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
              ${s}
            </span>
          `).join('')}
        </div>
      </div>
    ` : '';

    deck.innerHTML = `
      <div class="w-full h-full lacquer-glass-card border-l border-[#C5A059]/35 flex flex-col p-5 overflow-y-auto">
        <!-- Deck Header & Nav -->
        <div class="flex items-center justify-between pb-3 border-b border-white/10">
          <div class="flex items-center gap-2">
            <button onclick="window.PlanetariumApp.prevPlanet()"
                    class="p-1.5 rounded-lg bg-white/5 hover:bg-[#C5A059]/20 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors"
                    title="Previous Planet [">
              ◀ Prev
            </button>
            <button onclick="window.PlanetariumApp.nextPlanet()"
                    class="p-1.5 rounded-lg bg-white/5 hover:bg-[#C5A059]/20 border border-white/10 text-slate-300 hover:text-white text-xs transition-colors"
                    title="Next Planet ]">
              Next ▶
            </button>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-beacon"></span>
              ${p.readiness || 'Operational'}
            </span>
            <button onclick="window.PlanetariumApp.closeDeck()"
                    class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              ✕
            </button>
          </div>
        </div>

        <!-- Real-Time 3D Planetary Canvas Stage -->
        <div class="model-mini-3d-stage my-3.5 relative rounded-xl border border-[#C5A059]/35 bg-[#020610]/90 p-2 flex items-center justify-center overflow-hidden shadow-inner group">
          <canvas id="hologram-canvas" width="400" height="125" class="block w-full h-[125px] cursor-grab active:cursor-grabbing"></canvas>
          <div class="absolute bottom-2 left-3 text-[9px] font-mono text-[#DFBA73] tracking-widest uppercase flex items-center gap-1.5 pointer-events-none">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>3D CANVAS MODEL // ${p.spectralClass || 'CLASS G'}</span>
          </div>
          <div class="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button onclick="window.PlanetariumApp.openModelLab('${p.id}')"
                    class="p-1 px-2 rounded-lg bg-[#C5A059]/25 hover:bg-[#C5A059]/45 border border-[#DFBA73]/50 text-[#DFBA73] text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm transition-all"
                    title="Launch 3D Celestial Model Studio [L]">
              <span>🔬</span><span>3D LAB</span>
            </button>
          </div>
          <div class="absolute top-2 left-2 text-[9px] font-mono text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
            Drag to 3D Orbit
          </div>
        </div>

        <!-- Planetary Designation & Title -->
        <div class="mb-3">
          <div class="text-[11px] font-mono text-[#DFBA73] uppercase tracking-wider font-bold mb-0.5">
            ${p.designation || 'EXOPLANET // ' + p.name}
          </div>
          <h2 class="text-xl font-bold text-white tracking-tight">
            ${p.name}
          </h2>
          <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span>${catObj.icon}</span>
            <span>${catObj.name}</span>
            <span>·</span>
            <span class="text-slate-300">${p.biome || 'Dense Core'}</span>
          </div>
        </div>

        <!-- Astronomical Metrics Table -->
        <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#050B18]/60 border border-white/5 mb-3 text-center">
          <div>
            <div class="text-[9px] font-mono uppercase text-slate-400">Orbital AU</div>
            <div class="text-xs font-bold text-[#DFBA73] font-mono">${p.orbitalAU || p.distance} AU</div>
          </div>
          <div>
            <div class="text-[9px] font-mono uppercase text-slate-400">Orbit Period</div>
            <div class="text-xs font-bold text-white font-mono">${p.orbitalPeriod || '800 Cycles'}</div>
          </div>
          <div>
            <div class="text-[9px] font-mono uppercase text-slate-400">Gravity</div>
            <div class="text-xs font-bold text-emerald-400 font-mono">${p.surfaceGravity || '1.0g'}</div>
          </div>
        </div>

        <!-- ⚡ MISSION DIRECTIVE (IMMEDIATE NEXT STEPS) -->
        <div class="directive-box rounded-xl p-3.5 mb-3.5">
          <div class="flex items-center gap-1.5 text-xs font-bold text-[#DFBA73] uppercase tracking-wider mb-1">
            <span>⚡</span>
            <span>Mission Directive // Next Horizon</span>
          </div>
          <p class="text-xs text-amber-100 font-medium leading-relaxed">
            ${p.missionDirective || p.nextSteps}
          </p>
        </div>

        <!-- Planetary Survey & Geological Briefing -->
        <div class="mb-3">
          <div class="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
            Astronomical Geological Survey
          </div>
          <p class="text-xs text-slate-300 leading-relaxed bg-[#050B18]/40 p-2.5 rounded-lg border border-white/5">
            ${p.survey || p.description}
          </p>
        </div>

        <!-- Atmospheric Composition (Stack) -->
        <div class="mb-3">
          <div class="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5">
            Atmospheric Composition & Core Technology
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${atmosphereChips}
          </div>
        </div>

        <!-- Gravitational Resonances (Sister Orbits) -->
        <div class="mb-2">
          <div class="text-[10px] uppercase font-mono tracking-wider text-[#DFBA73] mb-1.5 flex items-center justify-between">
            <span>🕸️ Gravitational Resonances (${relativePlanets.length})</span>
            <span class="text-[10px] text-slate-400 font-sans">Click to orbit</span>
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            ${siblingHtml}
          </div>
        </div>

        ${mcpHtml}

        <!-- ⚡ ANTIGRAVITY MISSION CONTROL & AGENT PROMPT -->
        <div class="antigravity-console-box rounded-xl p-3.5 mb-3.5">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <span>⚡</span>
              <span>Antigravity Agent Uplink</span>
            </div>
            <span id="agent-uplink-status" class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <span id="uplink-label">${(window.sidecar && window.sidecar.agent) ? 'Sidecar Native' : 'Universal Uplink'}</span>
            </span>
          </div>

          <!-- Quick Template Directives -->
          <div class="text-[9px] text-slate-400 font-mono uppercase mb-1.5 flex items-center justify-between">
            <span>Directives Matrix</span>
            <span class="text-[9px] text-[#DFBA73]">1-Click Templating</span>
          </div>
          <div class="grid grid-cols-2 gap-1.5 mb-2.5">
            <button onclick="window.PlanetariumApp.applyPromptTemplate('directive')"
                    class="text-[10px] px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 transition-colors text-left flex items-center gap-1">
              <span>⚡</span> <span class="truncate">Execute Directive</span>
            </button>
            <button onclick="window.PlanetariumApp.applyPromptTemplate('audit')"
                    class="text-[10px] px-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 transition-colors text-left flex items-center gap-1">
              <span>🔍</span> <span class="truncate">Deep Code Audit</span>
            </button>
            <button onclick="window.PlanetariumApp.applyPromptTemplate('tests')"
                    class="text-[10px] px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 transition-colors text-left flex items-center gap-1">
              <span>🧪</span> <span class="truncate">Test Suite (100%)</span>
            </button>
            <button onclick="window.PlanetariumApp.applyPromptTemplate('deploy')"
                    class="text-[10px] px-2 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 transition-colors text-left flex items-center gap-1">
              <span>🚀</span> <span class="truncate">Verify Deploy</span>
            </button>
          </div>

          <!-- Directive Textarea -->
          <textarea id="antigravity-prompt-input"
                    rows="3"
                    class="w-full p-2.5 text-xs bg-[#050B18]/90 text-slate-100 rounded-lg border border-indigo-500/30 focus:border-[#DFBA73] focus:ring-1 focus:ring-[#DFBA73] outline-none font-mono resize-none mb-2.5 leading-relaxed"
                    placeholder="Dispatch instruction directly to Antigravity agent...">Antigravity, please execute the immediate mission directive for ${p.name} (${p.localPath}):&#10;"${p.missionDirective || p.nextSteps}"</textarea>

          <!-- Dispatch Controls -->
          <div class="flex items-center gap-2">
            <button onclick="window.PlanetariumApp.dispatchToAntigravity()"
                    id="dispatch-btn"
                    class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-[#C5A059] hover:from-indigo-500 hover:to-[#DFBA73] text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2">
              <span>🚀</span>
              <span id="dispatch-btn-label">Dispatch to Antigravity</span>
            </button>
            <button onclick="window.PlanetariumApp.copyPromptOnly()"
                    class="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                    title="Copy Directive Text to Clipboard">
              <span>📋</span>
            </button>
          </div>
        </div>

        <!-- Bottom Actions -->
        <div class="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2">
          <!-- Primary Launch Row -->
          <div class="flex items-center gap-2">
            <button onclick="window.PlanetariumApp.openIndexLink('${p.id}')"
                    class="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    title="Launch Project Live Index [index.html]">
              <span>⚡</span><span>Launch Index</span>
            </button>
            <button onclick="window.PlanetariumApp.openGalleryStudio('${p.id}')"
                    class="flex-1 px-3 py-2 rounded-xl bg-[#C5A059]/25 hover:bg-[#C5A059]/45 text-[#DFBA73] border border-[#C5A059]/50 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    title="Inspect Exhibit in 3D Art Gallery Studio Museum">
              <span>🏛️</span><span>3D Gallery</span>
            </button>
          </div>
          <!-- Secondary Utilities Row -->
          <div class="flex items-center justify-between text-xs gap-1.5">
            <button onclick="window.PlanetariumApp.focusOrbit('${p.name}')"
                    class="flex-1 px-2 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 transition-all font-semibold flex items-center justify-center gap-1 text-[11px]">
              <span>🎯</span><span>Lock Orbit</span>
            </button>
            <a href="file:///${p.localPath}" target="_blank"
               class="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all font-semibold flex items-center justify-center gap-1 text-[11px]">
              <span>📁</span><span>Folder</span>
            </a>
            <button onclick="window.PlanetariumApp.openCategorizedIndex('${p.id}')"
                    class="flex-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 transition-all font-semibold flex items-center justify-center gap-1 text-[11px]"
                    title="Open Categorized Index Hub Entry">
              <span>📑</span><span>Index Hub</span>
            </button>
          </div>
        </div>
      </div>
    `;

    deck.classList.add('open');
    document.body.classList.add('deck-open');
    renderHologram(p);
  }

  function closeTelemetryDeck() {
    const deck = document.getElementById('telemetry-deck');
    if (deck) deck.classList.remove('open');
    document.body.classList.remove('deck-open');
  }

  // --- ANTIGRAVITY PROMPTING & DISPATCH FUNCTIONS ---
  function applyPromptTemplate(type) {
    const p = state.selectedPlanet || state.hoveredPlanet;
    if (!p) return;
    const textarea = document.getElementById('antigravity-prompt-input');
    if (!textarea) return;

    let text = '';
    if (type === 'directive') {
      text = `Antigravity, please execute the immediate mission directive for ${p.name} (${p.localPath}):\n"${p.missionDirective || p.nextSteps}"`;
    } else if (type === 'audit') {
      text = `Antigravity, please conduct a comprehensive code craftsmanship, architecture, and security audit on ${p.name} located at ${p.localPath}. Identify anti-patterns and propose clean enhancements.`;
    } else if (type === 'tests') {
      text = `Antigravity, please inspect ${p.name} at ${p.localPath} and generate/run automated unit and integration tests (Pytest/Pester) to ensure 100% operational pass rate.`;
    } else if (type === 'deploy') {
      text = `Antigravity, please run health checks and verify deployment readiness for ${p.name} at ${p.localPath}. Synchronize with deploy/PROJECT_CATALOG.json and verify all checks pass.`;
    }

    textarea.value = text;
    playCosmicTone(520, 'sine', 0.2, 0.04);
    showToast(`Template loaded: ${type.toUpperCase()}`);
  }

  function dispatchToAntigravity() {
    const textarea = document.getElementById('antigravity-prompt-input');
    const message = textarea ? textarea.value.trim() : '';
    if (!message) return;

    const btnLabel = document.getElementById('dispatch-btn-label');

    // 1. Check for native Antigravity Sidecar UI Extension API
    if (window.sidecar && window.sidecar.agent && typeof window.sidecar.agent.sendMessage === 'function') {
      window.sidecar.agent.sendMessage(message);
      showToast(`⚡ Message dispatched directly to Antigravity Agent!`);
      playCosmicTone(880, 'triangle', 0.6, 0.08);
      if (btnLabel) btnLabel.textContent = "Dispatched via Sidecar!";
    } else {
      // 2. Browser fallback: copy to clipboard with instant toast
      navigator.clipboard.writeText(message).then(() => {
        showToast(`📋 Copied to clipboard! Ready to paste into Antigravity (Ctrl+V)`);
        playCosmicTone(659, 'sine', 0.45, 0.08);
        if (btnLabel) btnLabel.textContent = "Copied to Clipboard!";
      }).catch(() => {
        showToast(`Directive ready to paste`);
      });
    }

    setTimeout(() => {
      if (btnLabel) btnLabel.textContent = "Dispatch to Antigravity";
    }, 2800);
  }

  function copyPromptOnly() {
    const textarea = document.getElementById('antigravity-prompt-input');
    const message = textarea ? textarea.value.trim() : '';
    if (!message) return;

    navigator.clipboard.writeText(message).then(() => {
      showToast(`📋 Directive text copied to clipboard`);
      playCosmicTone(580, 'sine', 0.3, 0.05);
    });
  }

  function showToast(message) {
    let toast = document.getElementById('antigravity-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'antigravity-toast';
      toast.className = 'px-4 py-2.5 rounded-xl lacquer-glass border border-[#DFBA73] text-white text-xs font-semibold shadow-2xl flex items-center gap-2';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
    toast.classList.add('show');
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  // --- 3D ROTATING PLANETARY MODEL / HOLOGRAM ---
  function renderHologram(p, targetCanvasId = null) {
    if (!p) return;
    const targetIds = targetCanvasId ? [targetCanvasId] : ['hologram-canvas', 'ag-hologram-canvas'];
    targetIds.forEach(id => {
      const hCanvas = document.getElementById(id);
      if (!hCanvas) return;

      if (window.Canvas3DModeler) {
        let viewer = mini3DViewers.get(id);
        if (!viewer) {
          const parentW = hCanvas.parentElement?.clientWidth || 380;
          hCanvas.width = parentW;
          hCanvas.height = 125;
          viewer = window.Canvas3DModeler.createViewer(hCanvas, {
            fov: 280,
            cameraDist: 280,
            mode: state.sketchMode ? 'sketch' : 'solid',
            autoSpin: true,
            spinSpeed: 0.010,
            zoom: 0.95,
            interactive: true
          });
          mini3DViewers.set(id, viewer);
        }
        viewer.loadPlanet(p);
        viewer.setMode(state.sketchMode ? 'sketch' : 'solid');
        viewer.start();
        return;
      }

      const hctx = hCanvas.getContext('2d');
      const hw = hCanvas.width;
      const hh = hCanvas.height;

      hctx.clearRect(0, 0, hw, hh);

      const cx = hw / 2;
      const cy = hh / 2;
      const hr = Math.min(36, hh * 0.32);

      if (state.sketchMode) {
        drawHandDrawnPlanet(hctx, p, cx, cy, hr, performance.now(), true, true, false, true);
      } else {
        // Outer corona glow
        const hGlow = hctx.createRadialGradient(cx, cy, hr * 0.7, cx, cy, hr * 2.2);
        hGlow.addColorStop(0, p.color);
        hGlow.addColorStop(0.5, p.secondaryColor || p.color);
        hGlow.addColorStop(1, 'transparent');
        hctx.fillStyle = hGlow;
        hctx.beginPath();
        hctx.arc(cx, cy, hr * 2.2, 0, Math.PI * 2);
        hctx.fill();

        // 3D Spherical gradient
        const sGrad = hctx.createRadialGradient(cx - hr * 0.35, cy - hr * 0.35, hr * 0.1, cx, cy, hr);
        sGrad.addColorStop(0, '#FFFFFF');
        sGrad.addColorStop(0.25, p.color);
        sGrad.addColorStop(0.85, p.secondaryColor || '#050B18');
        sGrad.addColorStop(1, '#020610');
        hctx.fillStyle = sGrad;
        hctx.beginPath();
        hctx.arc(cx, cy, hr, 0, Math.PI * 2);
        hctx.fill();

        // Planetary Rings (if applicable)
        if (p.ring) {
          hctx.save();
          hctx.translate(cx, cy);
          hctx.rotate(-Math.PI / 7);
          hctx.scale(1.0, 0.3);
          hctx.strokeStyle = p.ringColor || '#C5A059';
          hctx.lineWidth = 4;
          hctx.beginPath();
          hctx.arc(0, 0, hr * 1.9, 0, Math.PI * 2);
          hctx.stroke();
          hctx.restore();
        }

        // Specular highlight arc
        hctx.beginPath();
        hctx.arc(cx, cy, hr * 0.85, -Math.PI * 0.75, -Math.PI * 0.25);
        hctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        hctx.lineWidth = 2;
        hctx.stroke();
      }
    });
  }

  // =========================================================================
  // ⚡ ANTIGRAVITY SECONDARY SIDE PANEL SYSTEM & PROJECT LIST MAPPING
  // =========================================================================

  function renderAntigravitySecondaryPanel() {
    const panel = document.getElementById('antigravity-secondary-panel');
    if (!panel) return;

    // 1. Activity Bar Tabs
    const tabButtons = panel.querySelectorAll('.ag-activity-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchAntigravityTab(tab);
      });
    });

    // 2. Dock toggle (Left / Right)
    document.getElementById('ag-panel-dock-toggle')?.addEventListener('click', toggleDockSide);

    // 3. Width toggle (Compact / Normal / Wide)
    document.getElementById('ag-panel-width-toggle')?.addEventListener('click', togglePanelWidth);

    // 4. Close & Fit Buttons
    document.getElementById('close-ag-panel-btn')?.addEventListener('click', () => toggleAntigravityPanel(false));
    document.getElementById('ag-panel-fit-btn')?.addEventListener('click', () => fitGalaxyToScreen(true));
    document.getElementById('ag-panel-brand-btn')?.addEventListener('click', () => switchAntigravityTab('projects'));

    // 5. Project Search Input
    const searchInput = document.getElementById('ag-project-search');
    const clearBtn = document.getElementById('ag-search-clear-btn');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.agProjectFilter = e.target.value.toLowerCase().trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', !state.agProjectFilter);
        renderProjectsList();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        state.agProjectFilter = '';
        clearBtn.classList.add('hidden');
        renderProjectsList();
      });
    }

    // 6. Sector Filter Chips
    const chipsContainer = document.getElementById('ag-sector-chips');
    if (chipsContainer && rawData.starSectors) {
      chipsContainer.innerHTML = rawData.starSectors.map(sec => `
        <button class="ag-sector-chip px-2 py-0.5 rounded-md whitespace-nowrap transition-all font-mono font-bold border ${sec.id === state.agSectorFilter ? 'bg-[#C5A059]/25 border-[#DFBA73] text-white' : 'bg-[#0B162C]/70 border-white/10 text-slate-400 hover:text-white hover:border-white/30'}"
                data-sector="${sec.id}">
          <span>${sec.icon}</span>
          <span>${sec.name.split(' ')[0]}</span>
        </button>
      `).join('');

      chipsContainer.querySelectorAll('.ag-sector-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const sec = btn.getAttribute('data-sector');
          state.agSectorFilter = sec;
          chipsContainer.querySelectorAll('.ag-sector-chip').forEach(b => {
            const isMatch = b.getAttribute('data-sector') === sec;
            b.className = `ag-sector-chip px-2 py-0.5 rounded-md whitespace-nowrap transition-all font-mono font-bold border ${isMatch ? 'bg-[#C5A059]/25 border-[#DFBA73] text-white' : 'bg-[#0B162C]/70 border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`;
          });
          renderProjectsList();
        });
      });
    }

    // Initial render of views
    renderProjectsList();
    renderDirectivesTab();
    renderMcpTab();
    renderAgentTab();
  }

  // --- TAB 1: RENDER PROJECT LIST (MAPS TO PLANETS) ---
  function renderProjectsList() {
    const list = document.getElementById('ag-projects-scroll-list');
    const counter = document.getElementById('ag-projects-counter');
    if (!list) return;

    const filtered = planets.filter(p => {
      // Sector filter
      if (state.agSectorFilter !== 'all') {
        if (state.agSectorFilter === 'mcp') {
          if (p.id !== 'MCP' && (!p.mcpServers || p.mcpServers.length === 0)) return false;
        } else if (p.category !== state.agSectorFilter) {
          return false;
        }
      }
      // Text query filter
      if (state.agProjectFilter) {
        const q = state.agProjectFilter;
        return (
          (p.id && p.id.toLowerCase().includes(q)) ||
          p.name.toLowerCase().includes(q) ||
          (p.designation && p.designation.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q) ||
          (p.atmosphere && p.atmosphere.toLowerCase().includes(q)) ||
          (p.missionDirective && p.missionDirective.toLowerCase().includes(q))
        );
      }
      return true;
    });

    if (counter) {
      counter.textContent = `${filtered.length} of ${planets.length} worlds`;
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs italic bg-[#050B18]/50 rounded-xl border border-white/5">
          No celestial project bodies located matching criteria.
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(p => {
      const isSelected = state.selectedPlanet && state.selectedPlanet.id === p.id;
      const catObj = rawData.starSectors.find(c => c.id === p.category) || { name: p.category, icon: '🪐' };
      const stackSnippet = (p.atmosphere || '').split(',').slice(0, 2).map(tag => `
        <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#0E1D3A]/90 border border-[#C5A059]/25 text-slate-300">
          ${tag.trim()}
        </span>
      `).join('');

      return `
        <div class="ag-project-card ${isSelected ? 'active' : ''}"
             data-id="${p.id}"
             onclick="window.PlanetariumApp.selectProject('${p.id}')">
          <div class="flex items-start gap-3">
            <!-- Miniature Planet Orb Preview -->
            <div class="ag-planet-orb mt-0.5"
                 style="color: ${p.color}; background: radial-gradient(circle at 35% 35%, #FFFFFF 0%, ${p.color} 55%, ${p.secondaryColor || '#050B18'} 100%);">
              <span class="text-[10px] select-none pointer-events-none">${catObj.icon}</span>
            </div>

            <!-- Project Details -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-1 mb-0.5">
                <h3 class="text-xs font-bold text-white group-hover:text-[#DFBA73] truncate">
                  ${p.name}
                </h3>
                <div class="flex items-center gap-1 shrink-0">
                  <button onclick="event.stopPropagation(); window.PlanetariumApp.openIndexLink('${p.id}')"
                          class="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold flex items-center gap-0.5 transition-all shadow-sm"
                          title="Launch Project Live Index File [index.html]">
                    ⚡ Index
                  </button>
                  <button onclick="event.stopPropagation(); window.PlanetariumApp.openGalleryStudio('${p.id}')"
                          class="px-1.5 py-0.5 rounded bg-[#C5A059]/20 hover:bg-[#C5A059]/40 text-[#DFBA73] border border-[#C5A059]/40 text-[9px] font-mono font-bold flex items-center gap-0.5 transition-all shadow-sm"
                          title="Inspect Exhibit in 3D Art Gallery Studio">
                    🏛️ 3D
                  </button>
                  <span class="ag-warp-btn text-[10px] font-mono text-[#DFBA73] font-semibold flex items-center gap-0.5">
                    Warp ➔
                  </span>
                </div>
              </div>

              <div class="text-[10px] text-slate-400 font-mono truncate mb-1 flex items-center justify-between">
                <span>${p.designation || p.category}</span>
                <span class="text-[#DFBA73] font-bold">${p.orbitalAU || p.distance} AU</span>
              </div>

              <!-- Tech stack tags -->
              <div class="flex flex-wrap gap-1 mb-1.5">
                ${stackSnippet}
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ${p.readiness || 'Operational'}
                </span>
              </div>

              <!-- Immediate Mission Directive Preview -->
              <div class="text-[10px] text-amber-200/90 leading-snug bg-[#030712]/70 p-1.5 rounded-lg border border-white/5 line-clamp-2">
                <span class="text-[#DFBA73] font-bold">⚡ Horizon:</span> ${p.missionDirective || p.nextSteps || 'Surveying orbit'}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Also populate legacy manifest-planet-list for backwards compatibility
    const legacyList = document.getElementById('manifest-planet-list');
    if (legacyList) {
      legacyList.innerHTML = list.innerHTML;
    }
  }

  // --- HIGHLIGHT PROJECT CARD IN SIDEBAR ---
  function highlightProjectCard(id) {
    const cards = document.querySelectorAll('.ag-project-card');
    cards.forEach(card => {
      const match = card.getAttribute('data-id') === id;
      card.classList.toggle('active', match);
      if (match) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });

    const manifestItems = document.querySelectorAll('.manifest-item');
    manifestItems.forEach(el => {
      const match = el.getAttribute('data-id') === id;
      el.classList.toggle('border-[#DFBA73]', match);
      el.classList.toggle('bg-[#C5A059]/20', match);
    });
  }

  // --- TAB 2: RENDER PLANETARY INSPECTOR ---
  function renderInspectorTab(p) {
    const view = document.getElementById('ag-view-inspector');
    if (!view) return;

    if (!p) {
      view.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-3 bg-[#050B18]/40 rounded-xl border border-white/5">
          <span class="text-3xl animate-bounce">🪐</span>
          <div class="font-bold text-white uppercase tracking-wider text-xs">No Planet Selected</div>
          <p class="text-[11px] leading-relaxed max-w-xs">
            Select any project from the <strong>Projects Explorer</strong> or click directly on a celestial body in the planetary observatory.
          </p>
        </div>
      `;
      return;
    }

    const catObj = rawData.starSectors.find(c => c.id === p.category) || { name: p.category, icon: '🪐', color: p.color };
    const relativePlanets = p.links || [];

    const atmosphereChips = (p.atmosphere || '').split(',').map(s => `
      <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#0E1D3A] border border-[#C5A059]/30 text-slate-200">
        ${s.trim()}
      </span>
    `).join('');

    const siblingHtml = relativePlanets.map(relName => {
      const targetP = planetMap.get(relName);
      const dotColor = targetP ? targetP.color : '#DFBA73';
      return `
        <button onclick="window.PlanetariumApp.selectProject('${relName}')"
                class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-[#050B18]/70 hover:bg-[#C5A059]/20 border border-[#C5A059]/30 hover:border-[#DFBA73] text-slate-200 hover:text-white transition-all shadow-sm">
          <span class="w-2 h-2 rounded-full shadow-sm" style="background: ${dotColor}"></span>
          <span>${relName}</span>
        </button>
      `;
    }).join('') || '<span class="text-xs text-slate-400 italic">Central Sector Singularity</span>';

    const mcpHtml = (p.mcpServers && p.mcpServers.length > 0) ? `
      <div class="p-2.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs mb-3">
        <span class="text-purple-300 flex items-center gap-1 font-semibold text-[11px]">
          ⚡ MCP Relays:
        </span>
        <div class="flex flex-wrap gap-1">
          ${p.mcpServers.map(s => `
            <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/40">
              ${s}
            </span>
          `).join('')}
        </div>
      </div>
    ` : '';

    view.innerHTML = `
      <!-- 3D Interactive Model Stage -->
      <div class="model-mini-3d-stage relative rounded-xl border border-[#C5A059]/35 bg-[#020610]/90 p-2 flex items-center justify-center overflow-hidden shadow-inner group">
        <canvas id="ag-hologram-canvas" width="380" height="130" class="block w-full h-[130px] cursor-grab active:cursor-grabbing"></canvas>
        <div class="absolute bottom-2 left-3 text-[9px] font-mono text-[#DFBA73] tracking-widest uppercase flex items-center gap-1.5 pointer-events-none">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>3D CANVAS MODEL // ${p.spectralClass || 'CLASS G'}</span>
        </div>
        <div class="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button onclick="window.PlanetariumApp.openModelLab('${p.id}')"
                  class="p-1 px-2 rounded-lg bg-[#C5A059]/25 hover:bg-[#C5A059]/45 border border-[#DFBA73]/50 text-[#DFBA73] text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm transition-all"
                  title="Expand Full 3D Model Studio [L]">
            <span>🔬</span><span>3D LAB</span>
          </button>
          <button onclick="window.PlanetariumApp.prevPlanet()" class="p-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-300">◀</button>
          <button onclick="window.PlanetariumApp.nextPlanet()" class="p-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-300">▶</button>
        </div>
        <div class="absolute top-2 left-2 text-[9px] font-mono text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none">
          Drag to 3D Orbit
        </div>
      </div>

      <!-- Title & Designation -->
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono text-[#DFBA73] uppercase tracking-wider font-bold">
            ${p.designation || 'EXOPLANET // ' + p.name}
          </div>
          <h2 class="text-lg font-bold text-white tracking-tight">
            ${p.name}
          </h2>
          <div class="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span>${catObj.icon}</span>
            <span>${catObj.name}</span>
            <span>·</span>
            <span class="text-slate-300">${p.biome || 'Dense Core'}</span>
          </div>
        </div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 status-beacon"></span>
          ${p.readiness || 'Operational'}
        </span>
      </div>

      <!-- Astronomical Metrics -->
      <div class="grid grid-cols-3 gap-2 p-2 rounded-xl bg-[#030712]/80 border border-white/5 text-center">
        <div>
          <div class="text-[9px] font-mono uppercase text-slate-400">Distance</div>
          <div class="text-xs font-bold text-[#DFBA73] font-mono">${p.orbitalAU || p.distance} AU</div>
        </div>
        <div>
          <div class="text-[9px] font-mono uppercase text-slate-400">Period</div>
          <div class="text-xs font-bold text-white font-mono">${p.orbitalPeriod || '800 Cycles'}</div>
        </div>
        <div>
          <div class="text-[9px] font-mono uppercase text-slate-400">Gravity</div>
          <div class="text-xs font-bold text-emerald-400 font-mono">${p.surfaceGravity || '1.0g'}</div>
        </div>
      </div>

      <!-- ⚡ Mission Directive (Immediate Horizon) -->
      <div class="directive-box rounded-xl p-3">
        <div class="flex items-center gap-1.5 text-xs font-bold text-[#DFBA73] uppercase tracking-wider mb-1">
          <span>⚡</span>
          <span>Mission Directive // Horizon</span>
        </div>
        <p class="text-xs text-amber-100 font-medium leading-relaxed mb-2">
          ${p.missionDirective || p.nextSteps}
        </p>
        <button onclick="window.PlanetariumApp.switchAntigravityTab('agent')"
                class="w-full py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/30 text-indigo-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5">
          <span>🚀</span>
          <span>Stage in Antigravity Agent</span>
        </button>
      </div>

      <!-- Geological Survey -->
      <div>
        <div class="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1">
          Geological & Systems Briefing
        </div>
        <p class="text-xs text-slate-300 leading-relaxed bg-[#030712]/60 p-2.5 rounded-lg border border-white/5">
          ${p.survey || p.description}
        </p>
      </div>

      <!-- Atmospheric Stack -->
      <div>
        <div class="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5">
          Atmospheric Composition & Core Technology
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${atmosphereChips}
        </div>
      </div>

      <!-- Gravitational Sister Orbits -->
      <div>
        <div class="text-[10px] uppercase font-mono tracking-wider text-[#DFBA73] mb-1.5 flex items-center justify-between">
          <span>🕸️ Gravitational Resonances (${relativePlanets.length})</span>
          <span class="text-[9px] text-slate-400 font-sans">Click to warp</span>
        </div>
        <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
          ${siblingHtml}
        </div>
      </div>

      ${mcpHtml}

      <!-- Bottom Quick Navigation -->
      <div class="pt-2 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <button onclick="window.PlanetariumApp.openIndexLink('${p.id}')"
                  class="flex-1 px-3 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 transition-all font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
            ⚡ Launch Index
          </button>
          <button onclick="window.PlanetariumApp.openGalleryStudio('${p.id}')"
                  class="flex-1 px-3 py-2 rounded-xl bg-[#C5A059]/25 hover:bg-[#C5A059]/45 text-[#DFBA73] border border-[#C5A059]/50 transition-all font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
            🏛️ 3D Gallery
          </button>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="window.PlanetariumApp.focusOrbit('${p.name}')"
                  class="flex-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 transition-all font-semibold text-[11px] flex items-center justify-center gap-1">
            🎯 Lock Orbit
          </button>
          <a href="file:///${p.localPath}" target="_blank"
             class="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all font-semibold text-[11px] flex items-center justify-center gap-1">
            📁 Folder
          </a>
        </div>
      </div>
    `;

    renderHologram(p, 'ag-hologram-canvas');
  }

  // --- TAB 3: RENDER DIRECTIVES MATRIX ---
  function renderDirectivesTab() {
    const view = document.getElementById('ag-view-directives');
    if (!view) return;

    view.innerHTML = `
      <div class="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
        <span>Sector Mission Directives (${planets.length})</span>
        <span class="text-[#DFBA73]">1-Click Warp & Dispatch</span>
      </div>
      <div class="space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
        ${planets.map(p => `
          <div class="p-2.5 rounded-xl bg-[#081226]/80 border border-white/10 hover:border-[#DFBA73] transition-all space-y-1.5">
            <div class="flex items-center justify-between gap-1">
              <span class="text-xs font-bold text-white flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" style="background: ${p.color}"></span>
                <span>${p.name}</span>
              </span>
              <button onclick="window.PlanetariumApp.selectProject('${p.id}')"
                      class="text-[10px] font-mono text-[#DFBA73] px-2 py-0.5 rounded bg-[#C5A059]/15 hover:bg-[#C5A059]/30 transition-all">
                Warp ➔
              </button>
            </div>
            <p class="text-[11px] text-amber-100/90 leading-relaxed font-sans bg-[#030712]/50 p-2 rounded-lg border border-white/5">
              ${p.missionDirective || p.nextSteps}
            </p>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- TAB 4: RENDER MCP MATRIX TAB ---
  function renderMcpTab() {
    const view = document.getElementById('ag-view-mcp');
    if (!view) return;

    const mcpServers = [
      { id: "game-capture", name: "Game Capture MCP", tools: 14, icon: "🎥", color: "#EC4899", desc: "OBS Studio 31, NVIDIA ShadowPlay AV1 & Xbox Game Bar DVR orchestration.", targets: ["Record my Gameplay", "game studio"] },
      { id: "game-studio", name: "Game Studio MCP", tools: 18, icon: "🎮", color: "#F97316", desc: "Unreal Engine 5.8 C++, Unity 6, Godot 4 automation, and binary ROM header/IPS modding.", targets: ["game studio", "game mods", "REA", "reverse engineer applications", "mobile game"] },
      { id: "github", name: "GitHub Developer MCP", tools: 8, icon: "🐙", color: "#38BDF8", desc: "Full git tree manipulation, repository commits, and PR reviews via GitHub REST/GraphQL.", targets: ["Github Portfolio", "deploy", "project refinement", "portfolio"] },
      { id: "puppeteer", name: "Puppeteer Web Browser MCP", tools: 7, icon: "🌐", color: "#10B981", desc: "Chromium automation for dynamic SPA rendering, DOM scraping, and visual evaluation.", targets: ["deal Finder", "track most wanted", "Track Home Value", "spam block", "bot finder"] },
      { id: "google-drive", name: "Google Drive Filesystem MCP", tools: 7, icon: "📁", color: "#EAB308", desc: "Deep workspace filesystem bridge to G:\\My Drive with transactional read/write.", targets: ["google drive organizer", "email organizer", "deploy", "My Planetarium", "note taker"] },
      { id: "ollama", name: "Ollama Local AI MCP", tools: 4, icon: "🦙", color: "#8B5CF6", desc: "Sub-millisecond local LLM inference running Qwen 2.5 Coder, Llama 3 Modelfiles.", targets: ["ollama", "How to train your AI", "personal assistant", "using ai agents for profit"] },
      { id: "google-ai-studio", name: "Google AI Studio MCP", tools: 3, icon: "✨", color: "#6366F1", desc: "Multi-modal Gemini 2.5 Flash & Pro reasoning models with ultra-deep 2M+ token contexts.", targets: ["agent 365", "ai defense", "Choogle", "My Custom Gui", "project refinement"] }
    ];

    view.innerHTML = `
      <div class="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
        <span>Hyperspace MCP Network</span>
        <span class="text-purple-400">7 Active Relays Online</span>
      </div>
      <div class="space-y-2.5 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
        ${mcpServers.map(s => `
          <div class="p-3 rounded-xl bg-[#081226]/90 border border-purple-500/30 hover:border-purple-400 transition-all space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">${s.icon}</span>
                <div>
                  <div class="text-xs font-bold text-white">${s.name}</div>
                  <div class="text-[9px] font-mono text-purple-300">${s.tools} Registered Tools</div>
                </div>
              </div>
              <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-relaxed">${s.desc}</p>
            <div>
              <div class="text-[9px] font-mono uppercase text-slate-400 mb-1">Target Planetary Outposts:</div>
              <div class="flex flex-wrap gap-1">
                ${s.targets.map(t => `
                  <button onclick="window.PlanetariumApp.selectProject('${t}')"
                          class="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-[#C5A059]/20 border border-white/10 hover:border-[#DFBA73] text-slate-300 hover:text-white transition-all flex items-center gap-1">
                    <span>🪐</span> <span>${t}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- TAB 5: RENDER ANTIGRAVITY AGENT UPLINK TAB ---
  function renderAgentTab() {
    const view = document.getElementById('ag-view-agent');
    if (!view) return;

    const p = state.selectedPlanet || planets[0];

    view.innerHTML = `
      <div class="antigravity-console-box rounded-xl p-3.5 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
            <span>⚡</span>
            <span>Antigravity Agent Uplink</span>
          </div>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            ${(window.sidecar && window.sidecar.agent) ? 'Sidecar Native' : 'Universal Uplink'}
          </span>
        </div>

        <div>
          <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Target World</label>
          <select id="ag-agent-target-select"
                  class="w-full p-2 rounded-lg bg-[#030712] border border-indigo-500/30 text-white text-xs font-mono outline-none">
            ${planets.map(planet => `
              <option value="${planet.id}" ${planet.id === p.id ? 'selected' : ''}>${planet.name} (${planet.orbitalAU || planet.distance} AU)</option>
            `).join('')}
          </select>
        </div>

        <!-- Directive Quick Templates -->
        <div class="grid grid-cols-2 gap-1.5">
          <button onclick="window.PlanetariumApp.applyPromptTemplate('directive')"
                  class="text-[10px] px-2 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 transition-colors text-left flex items-center gap-1">
            <span>⚡</span> <span class="truncate">Execute Directive</span>
          </button>
          <button onclick="window.PlanetariumApp.applyPromptTemplate('audit')"
                  class="text-[10px] px-2 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 transition-colors text-left flex items-center gap-1">
            <span>🔍</span> <span class="truncate">Deep Code Audit</span>
          </button>
          <button onclick="window.PlanetariumApp.applyPromptTemplate('tests')"
                  class="text-[10px] px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 transition-colors text-left flex items-center gap-1">
            <span>🧪</span> <span class="truncate">Test Suite (100%)</span>
          </button>
          <button onclick="window.PlanetariumApp.applyPromptTemplate('deploy')"
                  class="text-[10px] px-2 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 transition-colors text-left flex items-center gap-1">
            <span>🚀</span> <span class="truncate">Verify Deploy</span>
          </button>
        </div>

        <textarea id="ag-secondary-prompt-input"
                  rows="4"
                  class="w-full p-2.5 text-xs bg-[#030712]/90 text-slate-100 rounded-lg border border-indigo-500/30 focus:border-[#DFBA73] outline-none font-mono resize-none leading-relaxed"
                  placeholder="Dispatch prompt directly to Antigravity...">Antigravity, please execute the immediate mission directive for ${p.name} (${p.localPath}):&#10;"${p.missionDirective || p.nextSteps}"</textarea>

        <div class="flex items-center gap-2">
          <button onclick="window.PlanetariumApp.dispatchToAntigravity()"
                  class="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-[#C5A059] hover:from-indigo-500 hover:to-[#DFBA73] text-white font-bold text-xs shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2">
            <span>🚀</span>
            <span>Dispatch to Antigravity</span>
          </button>
          <button onclick="window.PlanetariumApp.copyPromptOnly()"
                  class="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1"
                  title="Copy Prompt">
            <span>📋</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('ag-agent-target-select')?.addEventListener('change', (e) => {
      window.PlanetariumApp.selectProject(e.target.value);
    });
  }

  // --- SWITCH TAB IN ANTIGRAVITY SECONDARY ---
  function switchAntigravityTab(tabName) {
    state.agActiveTab = tabName;
    const panel = document.getElementById('antigravity-secondary-panel');
    if (!panel) return;

    panel.setAttribute('data-active-tab', tabName);

    // Update Activity Bar active state
    panel.querySelectorAll('.ag-activity-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });

    // Show selected view, hide others
    const views = {
      projects: document.getElementById('ag-view-projects'),
      inspector: document.getElementById('ag-view-inspector'),
      directives: document.getElementById('ag-view-directives'),
      mcp: document.getElementById('ag-view-mcp'),
      agent: document.getElementById('ag-view-agent')
    };

    Object.keys(views).forEach(key => {
      if (views[key]) {
        views[key].classList.toggle('hidden', key !== tabName);
      }
    });

    // Update Header title
    const titles = {
      projects: 'Projects Explorer',
      inspector: 'Planetary Inspector',
      directives: 'Mission Directives Matrix',
      mcp: 'Hyperspace MCP Matrix',
      agent: 'Antigravity Agent Uplink'
    };
    const titleEl = document.getElementById('ag-panel-title');
    if (titleEl) titleEl.textContent = titles[tabName] || 'Secondary Panel';

    // If switching to inspector, render hologram
    if (tabName === 'inspector') {
      renderInspectorTab(state.selectedPlanet);
    } else if (tabName === 'agent') {
      renderAgentTab();
    }
  }

  // --- TOGGLE ANTIGRAVITY SECONDARY SIDE PANEL ---
  function toggleAntigravityPanel(forceOpen, targetTab) {
    const panel = document.getElementById('antigravity-secondary-panel');
    if (!panel) return;

    const isOpen = (typeof forceOpen === 'boolean') ? forceOpen : !panel.classList.contains('open');
    panel.classList.toggle('open', isOpen);
    state.agPanelOpen = isOpen;

    // Sync body class for overlay anti-collision
    document.body.classList.toggle('ag-panel-open', isOpen);

    // If opening secondary panel, close floating telemetry deck so details never collide
    if (isOpen) {
      closeTelemetryDeck();
    }

    if (targetTab) {
      switchAntigravityTab(targetTab);
    }

    // Refocus canvas smoothly so planets adjust around side panel
    if (state.selectedPlanet) {
      flyToPlanet(state.selectedPlanet, state.scale);
    } else {
      fitGalaxyToScreen(true);
    }
  }

  // --- TOGGLE DOCK SIDE (LEFT / RIGHT) ---
  function toggleDockSide() {
    const panel = document.getElementById('antigravity-secondary-panel');
    if (!panel) return;

    const isRight = panel.classList.toggle('dock-right');
    state.agDockSide = isRight ? 'right' : 'left';
    document.body.classList.toggle('ag-dock-right', isRight);

    // If docking to right and deck is open, close deck
    if (isRight) {
      closeTelemetryDeck();
    }

    // Recenter canvas
    if (state.selectedPlanet) {
      flyToPlanet(state.selectedPlanet, state.scale);
    } else {
      fitGalaxyToScreen(true);
    }
  }

  // --- TOGGLE PANEL WIDTH ---
  function togglePanelWidth() {
    const panel = document.getElementById('antigravity-secondary-panel');
    if (!panel) return;

    document.body.classList.remove('ag-panel-compact', 'ag-panel-wide');

    if (panel.classList.contains('panel-wide')) {
      panel.classList.remove('panel-wide');
      panel.classList.add('panel-compact');
      state.agWidthMode = 'compact';
      document.body.classList.add('ag-panel-compact');
    } else if (panel.classList.contains('panel-compact')) {
      panel.classList.remove('panel-compact');
      state.agWidthMode = 'normal';
    } else {
      panel.classList.add('panel-wide');
      state.agWidthMode = 'wide';
      document.body.classList.add('ag-panel-wide');
    }

    // Recenter canvas
    if (state.selectedPlanet) {
      flyToPlanet(state.selectedPlanet, state.scale);
    } else {
      fitGalaxyToScreen(true);
    }
  }

  // --- LEGACY MANIFEST COMPATIBILITY ---
  function toggleManifestSidebar() {
    toggleAntigravityPanel(true, 'projects');
  }

  function highlightManifestItem(id) {
    highlightProjectCard(id);
  }

  // --- CINEMATIC CELESTIAL TOUR ---
  function toggleCelestialTour() {
    state.tourActive = !state.tourActive;
    const btn = document.getElementById('toggle-tour-btn');
    const banner = document.getElementById('tour-banner');

    if (btn) btn.classList.toggle('text-[#DFBA73]', state.tourActive);
    if (banner) banner.classList.toggle('hidden', !state.tourActive);

    if (state.tourActive) {
      playCosmicTone(600, 'triangle', 0.8, 0.08);
      runTourStep();
    } else {
      clearTimeout(state.tourTimer);
      playCosmicTone(300, 'sine', 0.3, 0.05);
    }
  }

  function runTourStep() {
    if (!state.tourActive) return;

    const visible = planets.filter(p => {
      if (state.activeSector === 'all') return true;
      if (state.activeSector === 'mcp') return p.id === 'MCP' || (p.mcpServers && p.mcpServers.length > 0);
      return p.category === state.activeSector;
    });

    if (visible.length === 0) return;

    state.tourIndex = (state.tourIndex + 1) % visible.length;
    flyToPlanet(visible[state.tourIndex], 1.55);

    state.tourTimer = setTimeout(runTourStep, 6500);
  }

  function toggleOrbitMotion() {
    state.orbitMotion = !state.orbitMotion;
    const btn = document.getElementById('toggle-orbit-btn');
    if (btn) btn.classList.toggle('text-[#DFBA73]', state.orbitMotion);
    playCosmicTone(state.orbitMotion ? 580 : 320, 'sine', 0.25, 0.05);
  }

  function toggleSketchMode() {
    state.sketchMode = !state.sketchMode;
    const btn = document.getElementById('toggle-sketch-btn');
    if (btn) {
      btn.classList.toggle('text-[#DFBA73]', state.sketchMode);
      btn.classList.toggle('border-[#DFBA73]/50', state.sketchMode);
      btn.classList.toggle('bg-amber-500/20', state.sketchMode);
    }
    showToast(state.sketchMode ? '✏️ Celestial Hand-Drawn Sketch: ACTIVE' : '✨ High-Gloss Lacquer: ACTIVE');
    playCosmicTone(state.sketchMode ? 528 : 396, 'triangle', 0.4, 0.06);
    if (state.selectedPlanet) {
      renderHologram(state.selectedPlanet);
    }
  }

  // --- RENDERING LOOP ---
  function render(time) {
    requestAnimationFrame(render);

    // Smooth camera damping
    state.offsetX += (state.targetOffsetX - state.offsetX) * 0.12;
    state.offsetY += (state.targetOffsetY - state.offsetY) * 0.12;
    state.scale += (state.targetScale - state.scale) * 0.12;

    state.pulseOffset = (time * 0.002) % (Math.PI * 2);

    // Planetary orbital drift & 3D Perspective Orrery
    if (state.orbitMotion) {
      planets.forEach(p => {
        if (p.id !== 'MCP') {
          p.currentAngle += p.orbitSpeed;
        }
      });
    }

    if (state.orrery3D) {
      const pitch = state.orreryPitch || 0.52;
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);
      planets.forEach(p => {
        if (p.id === 'MCP') {
          p.x = 0;
          p.y = 0;
          p.z = 0;
          p.size = p.baseSize || p.size;
          return;
        }
        const flatX = Math.cos(p.currentAngle) * p.orbitRadiusX;
        const flatY = Math.sin(p.currentAngle) * p.orbitRadiusY;
        const y3d = flatY * cosPitch;
        const z3d = flatY * sinPitch;
        const perspective = 1400 / (1400 - z3d);
        p.x = flatX * perspective;
        p.y = y3d * perspective;
        p.z = z3d;
        p.size = (p.baseSize || p.size) * perspective;
      });
    } else {
      planets.forEach(p => {
        if (p.id !== 'MCP') {
          p.x = Math.cos(p.currentAngle) * p.orbitRadiusX;
          p.y = Math.sin(p.currentAngle) * p.orbitRadiusY;
        }
        p.z = 0;
        p.size = p.baseSize || p.size;
      });
    }

    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

    ctx.save();
    ctx.scale(state.dpr, state.dpr);

    // Subtle deep navy clear
    ctx.fillStyle = 'rgba(5, 11, 24, 0.38)';
    ctx.fillRect(0, 0, state.width, state.height);

    // Starfield
    drawStarfield(ctx);

    // Camera transform
    ctx.translate(state.offsetX, state.offsetY);
    ctx.scale(state.scale, state.scale);

    // Concentric AU distance tracks
    drawOrbitalTracks(ctx);

    // Gravitational Web Filaments
    if (state.showWeb) {
      drawGravitationalFilaments(ctx, time);
    }

    // Planets
    drawPlanets(ctx, time);

    ctx.restore();

    // Radar Minimap
    renderMinimap();
  }

  // --- DRAW STARFIELD ---
  function drawStarfield(ctx) {
    const px = state.offsetX * 0.06;
    const py = state.offsetY * 0.06;

    ctx.save();
    for (let i = 0; i < state.starfield.length; i++) {
      const s = state.starfield[i];
      let sx = (s.x + px) % state.width;
      let sy = (s.y + py) % state.height;
      if (sx < 0) sx += state.width;
      if (sy < 0) sy += state.height;

      const alpha = 0.35 + 0.45 * Math.sin(s.phase + state.pulseOffset * 1.6);
      ctx.fillStyle = s.color;
      ctx.globalAlpha = Math.max(0.12, alpha);
      ctx.beginPath();
      ctx.arc(sx, sy, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }

  // --- DRAW CONCENTRIC ORBITAL TRACKS ---
  function drawOrbitalTracks(ctx) {
    ctx.save();
    const distances = [140, 210, 260, 310, 360, 410];
    const aspectFactor = Math.max(1.35, window.innerWidth / Math.max(window.innerHeight, 600));
    const pitchRatio = state.orrery3D ? Math.cos(state.orreryPitch || 0.52) : 1.0;

    distances.forEach(d => {
      const rx = d * 1.95 * (aspectFactor * 0.72);
      const ry = d * 1.95 * pitchRatio;

      ctx.strokeStyle = state.orrery3D ? 'rgba(197, 160, 89, 0.14)' : 'rgba(197, 160, 89, 0.08)';
      ctx.lineWidth = 1 / state.scale;
      ctx.setLineDash([5, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // AU labels
      ctx.fillStyle = 'rgba(197, 160, 89, 0.28)';
      ctx.font = `${Math.max(10, 10 / state.scale)}px monospace`;
      ctx.fillText(`${d} AU`, rx + 10, 4);
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- DRAW GRAVITATIONAL FILAMENTS ---
  function drawGravitationalFilaments(ctx, time) {
    ctx.save();
    const activePlanet = state.hoveredPlanet || state.selectedPlanet;
    const isMCPFiltered = state.activeSector === 'mcp';

    for (let i = 0; i < planets.length; i++) {
      const p1 = planets[i];
      const links = p1.links || [];

      if (state.activeSector !== 'all' && !isMCPFiltered) {
        if (p1.category !== state.activeSector) continue;
      }

      for (let j = 0; j < links.length; j++) {
        const targetName = links[j];
        const p2 = planetMap.get(targetName);
        if (!p2) continue;
        if (p1.id > p2.id) continue; // Single pass

        const isConnectedToActive = activePlanet && (
          p1.id === activePlanet.id || p2.id === activePlanet.id ||
          (activePlanet.links && (activePlanet.links.includes(p1.name) || activePlanet.links.includes(p2.name)))
        );
        const isMCPConnection = p1.id === 'MCP' || p2.id === 'MCP';

        if (isConnectedToActive) {
          ctx.strokeStyle = '#DFBA73';
          ctx.lineWidth = Math.max(2.4, 2.4 / state.scale);
          ctx.shadowColor = '#DFBA73';
          ctx.shadowBlur = 14;
        } else if (isMCPFiltered && isMCPConnection) {
          ctx.strokeStyle = '#C084FC';
          ctx.lineWidth = Math.max(2.0, 2.0 / state.scale);
          ctx.shadowColor = '#A855F7';
          ctx.shadowBlur = 10;
        } else if (activePlanet) {
          ctx.strokeStyle = 'rgba(14, 29, 58, 0.22)';
          ctx.lineWidth = Math.max(0.6, 0.6 / state.scale);
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = 'rgba(197, 160, 89, 0.18)';
          ctx.lineWidth = Math.max(0.9, 0.9 / state.scale);
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Traveling quantum pulse
        if (isConnectedToActive || isMCPConnection || (!activePlanet && (i + j) % 3 === 0)) {
          const speed = isConnectedToActive ? 0.0020 : 0.0009;
          const progress = ((time * speed) + (i * 0.14)) % 1;
          const px = p1.x + (p2.x - p1.x) * progress;
          const py = p1.y + (p2.y - p1.y) * progress;

          ctx.fillStyle = isConnectedToActive ? '#FFFFFF' : '#DFBA73';
          ctx.shadowColor = isConnectedToActive ? '#DFBA73' : '#C5A059';
          ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2.6, 2.6 / state.scale), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  // --- DRAW HAND-DRAWN SKETCH PLANET WITH COLOR SHADING ---
  function drawHandDrawnPlanet(ctx, p, cx, cy, r, time, isHovered, isSelected, isConnected, isHologram = false) {
    if (!p.sketch) {
      p.sketch = generatePlanetSketch(p);
    }
    const sk = p.sketch;
    const viewScale = isHologram ? 1.0 : state.scale;

    // 1. Soft Watercolor Aura / Celestial Wash Bloom
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.55, cx, cy, r * 2.3);
    glowGrad.addColorStop(0, p.color);
    glowGrad.addColorStop(0.48, p.secondaryColor || p.color);
    glowGrad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * 0.40;
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1b. Central Star Radiant Solar Flare Rays (Engraved Sunbeams)
    if (sk.isStar && sk.solarRays) {
      ctx.save();
      ctx.strokeStyle = '#DFBA73';
      sk.solarRays.forEach(ray => {
        ctx.beginPath();
        ctx.moveTo(cx + ray.x1 * r, cy + ray.y1 * r);
        ctx.lineTo(cx + ray.x2 * r, cy + ray.y2 * r);
        ctx.lineWidth = Math.max(0.75, (ray.width * 1.1) / viewScale);
        ctx.globalAlpha = ray.alpha;
        ctx.stroke();
      });
      ctx.restore();
    }

    // 2. Watercolor Body Wash & Spherical Shading (Clipped to Hand-Drawn Contour)
    ctx.save();
    ctx.beginPath();
    const cPts = sk.primaryContour;
    if (cPts && cPts.length > 0) {
      ctx.moveTo(cx + cPts[0].x * r, cy + cPts[0].y * r);
      for (let i = 1; i < cPts.length; i++) {
        ctx.lineTo(cx + cPts[i].x * r, cy + cPts[i].y * r);
      }
    }
    ctx.closePath();
    ctx.save();
    ctx.clip(); // Clip to the organic hand-drawn contour!

    // Base Watercolor Wash (Light upper-left to deep indigo shadow)
    const lightX = cx - r * 0.38;
    const lightY = cy - r * 0.38;
    const washGrad = ctx.createRadialGradient(lightX, lightY, r * 0.08, cx, cy, r * 1.05);
    washGrad.addColorStop(0.0, '#FFFFFF'); // Paper illumination highlight
    washGrad.addColorStop(0.18, p.color); // Pure watercolor wash
    washGrad.addColorStop(0.68, p.secondaryColor || p.color); // Rich secondary pigment pooling
    washGrad.addColorStop(0.90, '#091326'); // Deep indigo shadow wash
    washGrad.addColorStop(1.0, '#030712'); // Carbon limb edge
    ctx.fillStyle = washGrad;
    ctx.fill();

    // Secondary Watercolor Bleed Layer (Adds organic watercolor pooling)
    const bleedGrad = ctx.createRadialGradient(cx + r * 0.15, cy + r * 0.15, r * 0.1, cx + r * 0.15, cy + r * 0.15, r * 0.9);
    bleedGrad.addColorStop(0, p.secondaryColor || p.color);
    bleedGrad.addColorStop(1, 'transparent');
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = bleedGrad;
    ctx.fill();
    ctx.restore();

    // Surface Sketch Features (Cloud bands or craters)
    if (sk.surfaceBands && sk.surfaceBands.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      sk.surfaceBands.forEach(b => {
        ctx.beginPath();
        ctx.moveTo(cx + b.points[0].x * r, cy + b.points[0].y * r);
        for (let j = 1; j < b.points.length; j++) {
          ctx.lineTo(cx + b.points[j].x * r, cy + b.points[j].y * r);
        }
        ctx.strokeStyle = 'rgba(6, 12, 26, ' + b.alpha + ')';
        ctx.lineWidth = Math.max(1.1, 1.3 / viewScale);
        ctx.stroke();
      });
      ctx.restore();
    } else if (sk.craters && sk.craters.length > 0) {
      ctx.save();
      sk.craters.forEach(cr => {
        const crX = cx + cr.cx * r;
        const crY = cy + cr.cy * r;
        const crR = cr.r * r;
        ctx.beginPath();
        ctx.ellipse(crX, crY, crR, crR * 0.75, cr.tilt, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(8, 16, 32, ' + cr.hatchAlpha + ')';
        ctx.lineWidth = Math.max(0.8, 1.0 / viewScale);
        ctx.stroke();
        // Inner crater hatch
        ctx.beginPath();
        ctx.moveTo(crX - crR * 0.4, crY);
        ctx.lineTo(crX + crR * 0.4, crY + crR * 0.3);
        ctx.stroke();
      });
      ctx.restore();
    }

    // 3. Spherical Shading Hatching (Curved Latitude Arcs across shadow side)
    if (sk.hatchLines && sk.hatchLines.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      sk.hatchLines.forEach(hatch => {
        ctx.beginPath();
        ctx.moveTo(cx + hatch.points[0].x * r, cy + hatch.points[0].y * r);
        for (let k = 1; k < hatch.points.length; k++) {
          ctx.lineTo(cx + hatch.points[k].x * r, cy + hatch.points[k].y * r);
        }
        ctx.strokeStyle = 'rgba(5, 11, 24, ' + hatch.alpha + ')';
        ctx.lineWidth = Math.max(0.75, (hatch.width * 1.15) / viewScale);
        ctx.stroke();
      });

      // Cross-Hatching in deepest shadow zone
      if (sk.crossHatches && sk.crossHatches.length > 0) {
        sk.crossHatches.forEach(ch => {
          ctx.beginPath();
          ctx.moveTo(cx + ch.x1 * r, cy + ch.y1 * r);
          ctx.lineTo(cx + ch.x2 * r, cy + ch.y2 * r);
          ctx.strokeStyle = 'rgba(3, 7, 18, ' + ch.alpha + ')';
          ctx.lineWidth = Math.max(0.65, 0.95 / viewScale);
          ctx.stroke();
        });
      }
      ctx.restore();
    }

    // 4. White Chalk / Gouache Crescent Highlight
    if (sk.chalkPts && sk.chalkPts.length > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + sk.chalkPts[0].x * r, cy + sk.chalkPts[0].y * r);
      for (let m = 1; m < sk.chalkPts.length; m++) {
        ctx.lineTo(cx + sk.chalkPts[m].x * r, cy + sk.chalkPts[m].y * r);
      }
      ctx.strokeStyle = 'rgba(255, 252, 240, 0.75)'; // Soft cream gouache chalk
      ctx.lineWidth = Math.max(1.3, 1.5 / viewScale);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();
    }

    // Restore clip!
    ctx.restore();

    // 5. Hand-Drawn Pencil & Ink Contour Outlines
    // Primary Ink Contour (with slight organic start/end overshoot)
    ctx.save();
    ctx.beginPath();
    if (cPts && cPts.length > 0) {
      ctx.moveTo(cx + cPts[0].x * r, cy + cPts[0].y * r);
      for (let i = 1; i < cPts.length; i++) {
        ctx.lineTo(cx + cPts[i].x * r, cy + cPts[i].y * r);
      }
    }
    ctx.strokeStyle = 'rgba(11, 21, 40, 0.95)'; // Deep ink outline
    ctx.lineWidth = Math.max(1.2, 1.5 / viewScale);
    ctx.lineCap = 'round';
    ctx.stroke();

    // Secondary Ghost Sketch Contour (lighter graphite pencil stroke)
    if (sk.secondaryContour && sk.secondaryContour.length > 0) {
      ctx.beginPath();
      const sPts = sk.secondaryContour;
      ctx.moveTo(cx + sPts[0].x * r, cy + sPts[0].y * r);
      for (let s = 1; s < sPts.length; s++) {
        ctx.lineTo(cx + sPts[s].x * r, cy + sPts[s].y * r);
      }
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.40)';
      ctx.lineWidth = Math.max(0.7, 0.85 / viewScale);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Planetary Rings (Multi-pass pencil sketch & cross-hatched ring dust)
    if (p.ring && sk.ringSketch) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-Math.PI / 6);
      ctx.scale(1.0, 0.32);

      // Watercolor ring wash
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.88, 0, Math.PI * 2);
      ctx.strokeStyle = p.ringColor || 'rgba(197, 160, 89, 0.35)';
      ctx.lineWidth = Math.max(6.0, 6.0 / viewScale);
      ctx.stroke();

      // Multi-pass pencil sketch rings
      sk.ringSketch.forEach(pass => {
        ctx.beginPath();
        ctx.arc(0, 0, r * pass.radiusMult, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(197, 160, 89, ' + pass.alpha + ')';
        ctx.lineWidth = Math.max(0.8, pass.width / viewScale);
        ctx.stroke();
      });

      // Radial graphite hatch marks across ring plane
      if (sk.ringTicks) {
        ctx.strokeStyle = 'rgba(11, 21, 40, 0.45)';
        ctx.lineWidth = Math.max(0.6, 0.8 / viewScale);
        sk.ringTicks.forEach(tick => {
          ctx.beginPath();
          ctx.moveTo(Math.cos(tick.angle) * r * tick.innerR, Math.sin(tick.angle) * r * tick.innerR);
          ctx.lineTo(Math.cos(tick.angle) * r * tick.outerR, Math.sin(tick.angle) * r * tick.outerR);
          ctx.stroke();
        });
      }
      ctx.restore();
    }

    // 7. Celestial Sextant / Compass Reticle on Hover / Select
    if ((isHovered || isSelected || isConnected) && !isHologram) {
      ctx.save();
      const reticleColor = (isHovered || isSelected) ? '#DFBA73' : '#38BDF8';
      const reticleRadius = r + 10 + 3 * Math.sin(time * 0.005 + p.pulsePhase);

      // Hand-sketched compass ring
      ctx.strokeStyle = reticleColor;
      ctx.lineWidth = Math.max(1.5, 1.8 / viewScale);
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, reticleRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Cardinal sextant tick marks
      ctx.lineWidth = Math.max(1.0, 1.2 / viewScale);
      for (let t = 0; t < 12; t++) {
        const tAngle = (t / 12) * Math.PI * 2;
        const isCardinal = (t % 3 === 0);
        const tickLen = isCardinal ? 6 : 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(tAngle) * (reticleRadius - tickLen), cy + Math.sin(tAngle) * (reticleRadius - tickLen));
        ctx.lineTo(cx + Math.cos(tAngle) * (reticleRadius + tickLen), cy + Math.sin(tAngle) * (reticleRadius + tickLen));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 8. Planetary Designation Label
    const showLabel = viewScale > 0.6 || isHovered || isSelected || isConnected || p.id === 'MCP';
    if (showLabel && !isHologram) {
      ctx.save();
      ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${Math.max(11, 12 / viewScale)}px sans-serif`;
      ctx.fillStyle = (isHovered || isSelected) ? '#FFFFFF' : '#E2E8F0';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(p.name, cx, cy + r + 15 / viewScale);
      ctx.restore();
    }

    ctx.restore();
  }

  // --- DRAW PLANETS ---
  function drawPlanets(ctx, time) {
    const activePlanet = state.hoveredPlanet || state.selectedPlanet;
    const renderPlanets = state.orrery3D ? [...planets].sort((a, b) => (a.z || 0) - (b.z || 0)) : planets;

    renderPlanets.forEach(p => {
      const isHovered = state.hoveredPlanet && state.hoveredPlanet.id === p.id;
      const isSelected = state.selectedPlanet && state.selectedPlanet.id === p.id;
      const isConnected = activePlanet && activePlanet.links && activePlanet.links.includes(p.name);

      let alpha = 1.0;
      if (state.activeSector !== 'all') {
        if (state.activeSector === 'mcp') {
          alpha = (p.id === 'MCP' || (p.mcpServers && p.mcpServers.length > 0)) ? 1.0 : 0.15;
        } else {
          alpha = (p.category === state.activeSector) ? 1.0 : 0.12;
        }
      } else if (activePlanet && !isHovered && !isSelected && !isConnected) {
        alpha = 0.35;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      const r = p.size;

      if (state.sketchMode) {
        drawHandDrawnPlanet(ctx, p, p.x, p.y, r, time, isHovered, isSelected, isConnected, false);
      } else {
        // Outer Corona Glow
        const glowGrad = ctx.createRadialGradient(p.x, p.y, r * 0.7, p.x, p.y, r * 2.3);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(0.5, p.secondaryColor || p.color);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.3, 0, Math.PI * 2);
        ctx.fill();

        // Targeting / Selection Ring
        if (isHovered || isSelected || isConnected) {
          ctx.strokeStyle = (isHovered || isSelected) ? '#DFBA73' : '#38BDF8';
          ctx.lineWidth = Math.max(2.0, 2.0 / state.scale);
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          const pulse = 4 * Math.sin(time * 0.006 + p.pulsePhase);
          ctx.arc(p.x, p.y, r + 9 + pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 3D Directional Sphere Shading
        const lightX = p.x - r * 0.35;
        const lightY = p.y - r * 0.35;
        const sphereGrad = ctx.createRadialGradient(lightX, lightY, r * 0.1, p.x, p.y, r);
        sphereGrad.addColorStop(0, '#FFFFFF');
        sphereGrad.addColorStop(0.25, p.color);
        sphereGrad.addColorStop(0.85, p.secondaryColor || '#050B18');
        sphereGrad.addColorStop(1, '#020610');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Planetary Rings
        if (p.ring) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(-Math.PI / 6);
          ctx.scale(1.0, 0.32);
          ctx.strokeStyle = p.ringColor || 'rgba(197, 160, 89, 0.75)';
          ctx.lineWidth = Math.max(3.5, 3.5 / state.scale);
          ctx.beginPath();
          ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Specular High-Gloss Glare Arc
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.85, -Math.PI * 0.75, -Math.PI * 0.25);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = Math.max(1.6, 1.6 / state.scale);
        ctx.stroke();
        ctx.restore();

        // Planetary Designation Label
        const showLabel = state.scale > 0.6 || isHovered || isSelected || isConnected || p.id === 'MCP';
        if (showLabel) {
          ctx.font = `${isHovered || isSelected ? 'bold ' : ''}${Math.max(11, 12 / state.scale)}px sans-serif`;
          ctx.fillStyle = (isHovered || isSelected) ? '#FFFFFF' : '#E2E8F0';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(p.name, p.x, p.y + r + 15 / state.scale);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();
    });
  }

  // --- RENDER MINIMAP RADAR ---
  function renderMinimap() {
    if (!state.minimapCtx) return;
    const mctx = state.minimapCtx;
    const mw = state.minimapCanvas.width;
    const mh = state.minimapCanvas.height;

    mctx.clearRect(0, 0, mw, mh);

    const mapScale = mw / 2400;
    const cx = mw / 2;
    const cy = mh / 2;

    // Draw all planet dots
    planets.forEach(p => {
      const mx = cx + p.x * mapScale;
      const my = cy + p.y * mapScale;
      mctx.fillStyle = p.color;
      mctx.beginPath();
      mctx.arc(mx, my, p.id === 'MCP' ? 4 : 2, 0, Math.PI * 2);
      mctx.fill();
    });

    // Viewport bounds
    const isDeckOpen = document.getElementById('telemetry-deck')?.classList.contains('open');
    const availW = isDeckOpen ? (state.width - 460) : state.width;

    const viewW = (availW / state.scale) * mapScale;
    const viewH = (state.height / state.scale) * mapScale;
    const viewX = cx + (-state.offsetX / state.scale) * mapScale;
    const viewY = cy + (-state.offsetY / state.scale) * mapScale;

    mctx.strokeStyle = '#DFBA73';
    mctx.lineWidth = 1.5;
    mctx.strokeRect(viewX, viewY, viewW, viewH);
  }

  // --- 3D CELESTIAL MODEL STUDIO & LAB ---
  function initModelLabUI() {
    const labModal = document.getElementById('celestial-model-lab');
    const labCanvas = document.getElementById('model-lab-canvas');
    if (!labModal || !labCanvas || !window.Canvas3DModeler) return;

    // Initialize 3D Viewer instance
    lab3DViewer = window.Canvas3DModeler.createViewer(labCanvas, {
      fov: 340,
      cameraDist: 340,
      mode: state.modelLabMode || 'solid',
      autoSpin: true,
      spinSpeed: 0.008,
      zoom: 1.15,
      interactive: true
    });

    // Angle & telemetry HUD listener
    const pitchText = document.getElementById('model-pitch-text');
    const yawText = document.getElementById('model-yaw-text');
    const polyText = document.getElementById('model-poly-count');

    setInterval(() => {
      if (!state.modelLabOpen || !lab3DViewer) return;
      if (pitchText) {
        const pDeg = (lab3DViewer.pitch * 180 / Math.PI).toFixed(1);
        pitchText.textContent = `${pDeg >= 0 ? '+' : ''}${pDeg}°`;
      }
      if (yawText) {
        const yDeg = (((lab3DViewer.yaw * 180 / Math.PI) % 360 + 360) % 360).toFixed(1);
        yawText.textContent = `${yDeg}°`;
      }
      if (polyText && lab3DViewer.sphereMesh) {
        const count = lab3DViewer.options.mode === 'wireframe'
          ? `${(lab3DViewer.armillaryMesh?.rings?.length || 5) * 48} SEG`
          : `${lab3DViewer.sphereMesh.faces?.length || 1120} TRIS`;
        polyText.textContent = count;
      }
    }, 100);

    // Render Mode Buttons
    const modeButtons = document.querySelectorAll('#model-lab-mode-group .model-mode-btn');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.getAttribute('data-mode');
        state.modelLabMode = mode;
        if (lab3DViewer) lab3DViewer.setMode(mode);
        playCosmicTone(580, 'triangle', 0.2, 0.04);
      });
    });

    // Populate Planet Select Dropdown
    const planetSelect = document.getElementById('model-lab-planet-select');
    if (planetSelect) {
      planetSelect.innerHTML = planets.map(p => `
        <option value="${p.id}">
          ${p.name} (${p.category.toUpperCase()})
        </option>
      `).join('');

      planetSelect.addEventListener('change', (e) => {
        const selected = planetMap.get(e.target.value);
        if (selected) {
          openModelLab(selected.id);
        }
      });
    }

    // Auto-Spin Toggle
    const spinBtn = document.getElementById('model-spin-toggle-btn');
    const spinIcon = document.getElementById('model-spin-icon');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => {
        if (!lab3DViewer) return;
        const spinning = lab3DViewer.toggleAutoSpin();
        if (spinIcon) spinIcon.textContent = spinning ? '⏸' : '▶';
        spinBtn.classList.toggle('text-[#DFBA73]', spinning);
      });
    }

    // Zoom Buttons
    document.getElementById('model-zoom-in-btn')?.addEventListener('click', () => {
      if (lab3DViewer) lab3DViewer.setZoom(lab3DViewer.options.zoom * 1.2);
    });
    document.getElementById('model-zoom-out-btn')?.addEventListener('click', () => {
      if (lab3DViewer) lab3DViewer.setZoom(lab3DViewer.options.zoom * 0.83);
    });

    // Reset Camera
    document.getElementById('model-reset-camera-btn')?.addEventListener('click', () => {
      if (lab3DViewer) {
        lab3DViewer.pitch = 0.38;
        lab3DViewer.yaw = 0.78;
        lab3DViewer.roll = 0.0;
        lab3DViewer.options.zoom = 1.15;
      }
    });

    // Core Dissect / Explode Slider
    const explodeSlider = document.getElementById('model-explode-slider');
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        if (lab3DViewer) {
          const factor = parseFloat(e.target.value) / 100.0;
          lab3DViewer.setExploded(factor);
          if (factor > 0 && lab3DViewer.options.mode !== 'cutaway') {
            const cutawayBtn = document.querySelector('#model-lab-mode-group [data-mode="cutaway"]');
            if (cutawayBtn) cutawayBtn.click();
          }
        }
      });
    }

    // Blueprint Export
    document.getElementById('model-lab-export-btn')?.addEventListener('click', () => {
      if (!lab3DViewer) return;
      const dataUrl = lab3DViewer.exportBlueprint();
      const a = document.createElement('a');
      a.href = dataUrl;
      const planetName = (state.modelLabPlanet?.name || 'celestial_body').replace(/\s+/g, '_').toLowerCase();
      a.download = `blueprint_${planetName}_${state.modelLabMode}.png`;
      a.click();
      showToast(`📸 Blueprint exported for ${state.modelLabPlanet?.name}`);
      playCosmicTone(880, 'sine', 0.4, 0.08);
    });

    // Close button & backdrop
    document.getElementById('close-model-lab-btn')?.addEventListener('click', closeModelLab);
    document.getElementById('celestial-model-lab-backdrop')?.addEventListener('click', closeModelLab);

    // Header buttons
    document.getElementById('open-model-lab-btn')?.addEventListener('click', () => {
      const target = state.selectedPlanet || state.hoveredPlanet || planets[0];
      openModelLab(target.id);
    });

    document.getElementById('toggle-orrery-btn')?.addEventListener('click', toggleOrreryPerspective);

    // Dispatch button in lab
    document.getElementById('model-lab-dispatch-btn')?.addEventListener('click', () => {
      if (state.modelLabPlanet) {
        dispatchToAntigravity(state.modelLabPlanet);
      }
    });
  }

  function openModelLab(planetId = null) {
    const p = (planetId ? planetMap.get(planetId) : null) || state.selectedPlanet || state.hoveredPlanet || planets[0];
    if (!p) return;

    state.modelLabOpen = true;
    state.modelLabPlanet = p;

    const labModal = document.getElementById('celestial-model-lab');
    const backdrop = document.getElementById('celestial-model-lab-backdrop');
    if (labModal) labModal.classList.remove('hidden');
    if (backdrop) backdrop.classList.remove('hidden');

    // Resize canvas to match display container
    const labCanvas = document.getElementById('model-lab-canvas');
    if (labCanvas && labCanvas.parentElement) {
      labCanvas.width = labCanvas.parentElement.clientWidth || 800;
      labCanvas.height = labCanvas.parentElement.clientHeight || 600;
    }

    if (lab3DViewer) {
      lab3DViewer.loadPlanet(p);
      lab3DViewer.setMode(state.modelLabMode || 'solid');
      lab3DViewer.start();
    }

    // Update select dropdown
    const select = document.getElementById('model-lab-planet-select');
    if (select) select.value = p.id;

    // Update Telemetry & Spec Panel
    updateModelLabSpecs(p);

    showToast(`🔬 3D Model Studio: ${p.name}`);
    playCosmicTone(523.25, 'triangle', 0.5, 0.08);
  }

  function closeModelLab() {
    state.modelLabOpen = false;
    const labModal = document.getElementById('celestial-model-lab');
    const backdrop = document.getElementById('celestial-model-lab-backdrop');
    if (labModal) labModal.classList.add('hidden');
    if (backdrop) backdrop.classList.add('hidden');
    if (lab3DViewer) lab3DViewer.stop();
  }

  function toggleOrreryPerspective() {
    state.orrery3D = !state.orrery3D;
    const btn = document.getElementById('toggle-orrery-btn');
    if (btn) {
      btn.classList.toggle('text-[#DFBA73]', state.orrery3D);
      btn.classList.toggle('border-[#DFBA73]', state.orrery3D);
      btn.classList.toggle('bg-[#DFBA73]/10', state.orrery3D);
    }
    showToast(state.orrery3D ? '🌐 3D Perspective Orrery Active' : '🗺️ 2D Planar Map Active');
    playCosmicTone(state.orrery3D ? 659.25 : 440.0, 'triangle', 0.4, 0.06);
  }

  function updateModelLabSpecs(p) {
    if (!p) return;
    const title = document.getElementById('model-lab-planet-title');
    const catPill = document.getElementById('model-lab-category-pill');
    const gravity = document.getElementById('model-lab-gravity');
    const distance = document.getElementById('model-lab-distance');
    const period = document.getElementById('model-lab-period');
    const size = document.getElementById('model-lab-size');
    const survey = document.getElementById('model-lab-survey-text');
    const directive = document.getElementById('model-lab-directive-text');
    const stackContainer = document.getElementById('model-lab-stack-tags');

    if (title) title.textContent = p.name;
    if (catPill) {
      catPill.textContent = (p.category || 'SECTOR').toUpperCase();
      catPill.style.borderColor = p.color || '#C5A059';
      catPill.style.color = p.color || '#DFBA73';
    }
    if (gravity) gravity.textContent = `${(p.mass ? (p.mass * 1.2).toFixed(2) : 1.45)}g`;
    if (distance) distance.textContent = `${Math.round(p.distanceAU || p.orbitRadius || 140)} AU`;
    if (period) period.textContent = `${Math.round(p.orbitalPeriod || 365)} Cycles`;
    if (size) size.textContent = `${(p.size * 980).toLocaleString()} km`;

    if (survey) {
      survey.textContent = p.description || p.atmosphere || 'Standard topological atmospheric survey nominal.';
    }
    if (directive) {
      directive.textContent = p.missionDirective || `Execute diagnostic probe on ${p.name} neural cluster.`;
    }

    if (stackContainer) {
      const tags = (p.stack || p.tools || ['HTML5 Canvas', 'Antigravity SDK', 'Procedural 3D']);
      stackContainer.innerHTML = tags.map(t => `
        <span class="px-2 py-0.5 rounded-md bg-[#020610] border border-white/10 text-[10px] font-mono text-slate-300">
          ${t}
        </span>
      `).join('');
    }
  }

  // --- UI CONTROLS & SECTOR TABS ---
  function initUI() {
    // Sector Tabs Bar
    const sectorBar = document.getElementById('sector-filter-bar');
    if (sectorBar) {
      sectorBar.innerHTML = rawData.starSectors.map(s => `
        <button data-sector="${s.id}"
                class="sector-pill ${s.id === 'all' ? 'active' : ''} px-3.5 py-1.5 rounded-full text-xs font-semibold border border-white/10 hover:border-[#DFBA73] text-slate-300 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span>${s.icon}</span>
          <span>${s.name}</span>
          ${s.count ? `<span class="text-[10px] opacity-75 font-mono">(${s.count})</span>` : ''}
        </button>
      `).join('');

      sectorBar.querySelectorAll('.sector-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          sectorBar.querySelectorAll('.sector-pill').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          state.activeSector = btn.getAttribute('data-sector');
          fitGalaxyToScreen(true);
          playCosmicTone(480, 'sine', 0.3, 0.05);
        });
      });
    }

    // Planetary Manifest List (Left Sidebar)
    const manifestList = document.getElementById('manifest-planet-list');
    if (manifestList) {
      manifestList.innerHTML = planets.map(p => `
        <div data-id="${p.id}"
             onclick="window.PlanetariumApp.flyTo('${p.name}')"
             class="manifest-item p-2.5 rounded-xl border border-white/10 hover:border-[#DFBA73] bg-[#050B18]/60 hover:bg-[#C5A059]/15 transition-all cursor-pointer flex items-center justify-between group">
          <div class="flex items-center gap-2.5">
            <span class="w-2.5 h-2.5 rounded-full shadow-sm" style="background: ${p.color}"></span>
            <div>
              <div class="text-xs font-bold text-white group-hover:text-[#DFBA73] transition-colors">${p.name}</div>
              <div class="text-[10px] text-slate-400 font-mono">${p.spectralClass || p.category}</div>
            </div>
          </div>
          <span class="text-[10px] font-mono text-[#DFBA73] opacity-0 group-hover:opacity-100 transition-opacity">Warp ➔</span>
        </div>
      `).join('');
    }

    // Search bar with autocomplete
    const searchInput = document.getElementById('planet-search-input');
    const searchResults = document.getElementById('search-results-dropdown');

    if (searchInput && searchResults) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          searchResults.classList.add('hidden');
          return;
        }

        const matches = planets.filter(p =>
          p.name.toLowerCase().includes(query) ||
          (p.designation && p.designation.toLowerCase().includes(query)) ||
          p.category.toLowerCase().includes(query) ||
          (p.atmosphere && p.atmosphere.toLowerCase().includes(query)) ||
          (p.missionDirective && p.missionDirective.toLowerCase().includes(query))
        ).slice(0, 8);

        if (matches.length === 0) {
          searchResults.innerHTML = `<div class="p-3 text-xs text-slate-400 italic">No celestial bodies located in sector</div>`;
        } else {
          searchResults.innerHTML = matches.map(m => `
            <div onclick="window.PlanetariumApp.flyTo('${m.name}'); document.getElementById('search-results-dropdown').classList.add('hidden');"
                 class="p-2.5 rounded-xl hover:bg-[#C5A059]/20 hover:border-[#DFBA73] border border-transparent transition-all cursor-pointer flex items-center justify-between group">
              <div class="flex items-center gap-2.5">
                <span class="w-3 h-3 rounded-full shrink-0 shadow-sm" style="background: ${m.color}"></span>
                <div>
                  <div class="text-xs font-bold text-white group-hover:text-[#DFBA73] transition-colors">${m.name}</div>
                  <div class="text-[10px] text-slate-400">${m.designation || m.category}</div>
                </div>
              </div>
              <span class="text-[10px] font-mono text-[#DFBA73] opacity-0 group-hover:opacity-100 transition-opacity">Warp ➔</span>
            </div>
          `).join('');
        }
        searchResults.classList.remove('hidden');
      });

      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
          searchResults.classList.add('hidden');
        }
      });
    }

    // Header buttons & Antigravity Secondary
    document.getElementById('toggle-antigravity-panel-btn')?.addEventListener('click', () => toggleAntigravityPanel());
    document.getElementById('toggle-manifest-btn')?.addEventListener('click', () => toggleAntigravityPanel(true, 'projects'));
    document.getElementById('close-manifest-btn')?.addEventListener('click', () => toggleAntigravityPanel(false));
    document.getElementById('fit-screen-btn')?.addEventListener('click', () => fitGalaxyToScreen(true));
    document.getElementById('toggle-tour-btn')?.addEventListener('click', toggleCelestialTour);
    document.getElementById('stop-tour-btn')?.addEventListener('click', toggleCelestialTour);
    document.getElementById('toggle-web-btn')?.addEventListener('click', () => {
      state.showWeb = !state.showWeb;
      document.getElementById('toggle-web-btn')?.classList.toggle('text-[#DFBA73]', state.showWeb);
      playCosmicTone(state.showWeb ? 540 : 360, 'sine', 0.25, 0.05);
    });
    document.getElementById('toggle-orbit-btn')?.addEventListener('click', toggleOrbitMotion);
    document.getElementById('toggle-sketch-btn')?.addEventListener('click', toggleSketchMode);
    document.getElementById('toggle-audio-btn')?.addEventListener('click', () => {
      initAudio();
      state.audioEnabled = !state.audioEnabled;
      document.getElementById('toggle-audio-btn')?.classList.toggle('text-[#DFBA73]', state.audioEnabled);
      if (state.audioEnabled) playCosmicTone(432, 'triangle', 0.8, 0.08);
    });
    document.getElementById('open-mcp-hud-btn')?.addEventListener('click', () => {
      if (window.AntigravityMCP) window.AntigravityMCP.toggleHUD();
    });

    // Zoom buttons
    document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
      zoomAtPoint(state.width / 2, state.height / 2, 1.3);
    });
    document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
      zoomAtPoint(state.width / 2, state.height / 2, 0.77);
    });

    // Initialize Antigravity Secondary Side Panel & Projects List
    renderAntigravitySecondaryPanel();

    // Initialize 3D Celestial Model Lab & HUD
    initModelLabUI();

    // Set initial anti-collision classes on body
    document.body.classList.toggle('ag-panel-open', state.agPanelOpen);
    document.body.classList.toggle('ag-dock-right', state.agDockSide === 'right');
  }

  // --- PUBLIC API EXPOSURE ---
  window.PlanetariumApp = {
    flyTo: function (identifier) {
      const p = planetMap.get(identifier);
      if (p) flyToPlanet(p);
    },
    selectProject: function (identifier) {
      const p = planetMap.get(identifier);
      if (p) flyToPlanet(p);
    },
    toggleAntigravityPanel: toggleAntigravityPanel,
    switchAntigravityTab: switchAntigravityTab,
    toggleDockSide: toggleDockSide,
    togglePanelWidth: togglePanelWidth,
    toggleSketchMode: toggleSketchMode,
    openModelLab: openModelLab,
    closeModelLab: closeModelLab,
    toggleOrreryPerspective: toggleOrreryPerspective,
    focusOrbit: function (identifier) {
      const p = planetMap.get(identifier);
      if (p) flyToPlanet(p, 1.95);
    },
    nextPlanet: function () {
      navigatePlanet(1);
    },
    prevPlanet: function () {
      navigatePlanet(-1);
    },
    closeDeck: closeTelemetryDeck,
    fitToScreen: fitGalaxyToScreen,
    applyPromptTemplate: applyPromptTemplate,
    dispatchToAntigravity: dispatchToAntigravity,
    copyPromptOnly: copyPromptOnly,
    showToast: showToast,
    openIndexLink: function (identifier) {
      const p = planetMap.get(identifier);
      const name = p ? (p.name || p.id) : identifier;
      const catItem = window.ANTIGRAVITY_CATALOG ? window.ANTIGRAVITY_CATALOG.getProjectByName(name) : null;
      if (catItem && catItem.relativeIndex) {
        window.open(catItem.relativeIndex, '_blank');
      } else if (catItem && catItem.indexFile) {
        window.open(`file:///${catItem.indexFile.replace(/\\/g, '/')}`, '_blank');
      } else if (catItem && catItem.categorizedRelative) {
        window.open(`../index folder/${catItem.categorizedRelative.replace(/^\.\//, '')}`, '_blank');
      } else if (p && p.localPath) {
        window.open(`file:///${p.localPath}/index.html`, '_blank');
      } else {
        window.open(`../${name}/index.html`, '_blank');
      }
    },
    openGalleryStudio: function (identifier) {
      const p = planetMap.get(identifier);
      const name = p ? (p.name || p.id) : identifier;
      const target = `../index folder/3d-gallery-studio.html?focus=${encodeURIComponent(name)}`;
      window.open(target, '_blank');
    },
    openCategorizedIndex: function (identifier) {
      const p = planetMap.get(identifier);
      const name = p ? (p.name || p.id) : identifier;
      const catItem = window.ANTIGRAVITY_CATALOG ? window.ANTIGRAVITY_CATALOG.getProjectByName(name) : null;
      if (catItem && catItem.categorizedRelative) {
        window.open(`../index folder/${catItem.categorizedRelative.replace(/^\.\//, '')}`, '_blank');
      } else {
        window.open('../index folder/index.html', '_blank');
      }
    },
    state: state
  };

  // --- BOOTSTRAP ---
  function bootstrap() {
    initCanvas();
    initStarfield();
    initUI();
    // Auto-fit widescreen galaxy
    setTimeout(() => {
      fitGalaxyToScreen(false);
    }, 100);

    // Deep link check for ?warp=<planetName> from 3D Art Gallery Studio or Index Hub
    const urlParams = new URLSearchParams(window.location.search);
    const warpParam = urlParams.get('warp');
    if (warpParam) {
      setTimeout(() => {
        const target = planetMap.get(warpParam);
        if (target) {
          flyToPlanet(target, 1.95);
          openTelemetryDeck(target, true);
          showToast(`Observatory Warped to ${target.name}`);
        }
      }, 400);
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
