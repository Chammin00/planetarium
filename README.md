# 🪐 Antigravity Deep Space Planetary Observatory & Sector Atlas 2026

The **Deep Space Planetary Observatory** charts and visualizes all 64 discovered planetary bodies, orbital super-stations, and hyperspace relays in the Antigravity Star Sector.

Framed with strict **astronomical rigor and exoplanetary science nomenclature**, the observatory delivers complete physical metrics, atmospheric compositions, geological surveys, active mission directives, and **native bidirectional prompting to Google Antigravity**.

---

## ⚡ Antigravity Agent Uplink & In-Orbit Prompting

Each planet features an interactive **Antigravity Mission Control Console** inside its observation deck:

### 1. 1-Click Prompting Templates
- **`⚡ Execute Directive`**: Automatically generates an action prompt directing Antigravity to implement the planet's exact next step:
  > *"Antigravity, please execute the immediate mission directive for ollama (G:/My Drive/Antigravity/Projects/ollama): 'Expand sync_skills_to_ollama.py daemon to auto-ingest newly mapped architectural blueprints...'"*
- **`🔍 Deep Code Audit`**: Commands Antigravity to run an anti-slop, architecture, and security inspection on that planet's codebase.
- **`🧪 Test Suite (100%)`**: Directs Antigravity to inspect and generate/run automated unit and integration tests (Pytest/Pester).
- **`🚀 Verify Deploy`**: Directs Antigravity to run diagnostic health checks and sync with `deploy/PROJECT_CATALOG.json`.

### 2. Live Message Dispatching
- **Sidecar Native Dispatch**: When running inside Antigravity as a UI Extension panel, clicking **"🚀 Dispatch to Antigravity"** directly invokes `window.sidecar.agent.sendMessage(directive)` via the native IPC bridge into your active Antigravity chat conversation!
- **Universal Clipboard Uplink**: When running standalone in your desktop browser, clicking **"Dispatch"** or **"📋"** instantly copies the crafted prompt to your system clipboard with a glowing confirmation toast, ready to paste (`Ctrl+V`) into any Antigravity conversation.

---

## 🔌 Opening Planetarium Inside Antigravity (UI Extension Plugin)

The Planetarium is packaged as an official Antigravity plugin located in:
`%USERPROFILE%\.gemini\config\plugins\planetarium\`

### To Enable & Open in the Antigravity Side Pane:
1. Open **Antigravity**.
2. Click the **Customizations** icon (puzzle piece) in the left-hand navigation bar and select the **Installed** tab.
3. Locate **Planetarium** and ensure it is toggled **ON** (the background Node.js sidecar starts automatically).
4. In any conversation, open the **⋮** (three-dot) menu in the top right, and select **Planetarium** from the **Extensions** menu.
5. The full panoramic Planetarium will render directly in the auxiliary side pane next to your conversation, with direct `sendMessage` dispatching active!

---

## 🌌 Widescreen Panoramic Scaling & Viewport Coverage

1. **Auto-Fit Panoramic Projection (`[F]`)**:
   - The planetary engine maps orbital trajectories across a wide-aspect elliptical field matching 16:9 and 16:10 displays.
   - On load or resize, `fitGalaxyToScreen()` scales the sector to fill **88–92% of the active viewport**.
   - Press **`F`** at any time to re-center and auto-fit the full galaxy.

2. **Full Webpage Spatial Utilization**:
   - Concentric distance tracks (from **140 AU** out to **420 AU**) expand dynamically to utilize wide screens.
   - Radar minimap in the lower right displays live camera viewport bounds relative to the 2,400 AU galactic expanse.

---

## 🛸 Navigation Controls & Keybindings

| Feature | Action / Purpose | Keybinding |
| :--- | :--- | :---: |
| **Observation Deck** | Slide-in telemetry deck with 3D rotating hologram & prompt console. | Click Planet |
| **Planetary Manifest** | Left-hand collapsible catalog listing all 64 planets. | `M` |
| **Celestial Tour** | Autonomous hands-free flight between worlds with audio chimes. | `T` |
| **Auto-Fit Screen** | Scales and centers all planets to fill window cleanly. | `F` |
| **Cycle Planets** | Previous or Next planet in active sector. | `[` / `]` or `←` / `→` |
| **Pause Orbit** | Freeze/resume continuous planetary orbital drift. | `Space` |
| **Search & Warp** | Instant autocomplete search for planets and directives. | `/` |
| **MCP Matrix** | Slide-out drawer showcasing all 7 global MCP servers. | Header Button |
