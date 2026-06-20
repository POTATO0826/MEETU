// memory-graph.ts — 3D-sphere knowledge graph with progressive disclosure.
//
// Imperative, dependency-free renderer. A React wrapper feeds it real Convex
// data and an onSelect callback; all per-frame transforms run in a rAF loop
// directly on the DOM (React never re-renders per frame).

export type MemoryNodeType =
  | "advisor"
  | "person"
  | "meeting"
  | "note"
  | "decision"
  | "idea"
  | "document";

export interface MemoryNode {
  id: string;
  type: MemoryNodeType | string;
  label: string;
  sub?: string;
  conf?: number;
  summary?: string;
  insight?: string;
  source?: string;
  date?: string;
  tags?: string[];
  clientId?: string;
}

export type MemoryEdge = [string, string];

interface MemoryGraphOptions {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
  colorOf?: (type: string) => string;
  onSelect?: (id: string | null) => void;
  panelWidth?: number;
  topPad?: number;
}

type Vec3 = { x: number; y: number; z: number };
type Projected = { x: number; y: number; scale: number; z: number };
type Rendered = Projected & { vis: number };

export class MemoryGraph {
  private container: HTMLElement;
  private nodes: MemoryNode[];
  private edges: MemoryEdge[];
  private colorOf: (type: string) => string;
  private onSelect: (id: string | null) => void;
  private panelWidth: number;
  private topPad: number;

  map: Record<string, MemoryNode> = {};
  private neigh: Record<string, string[]> = {};

  private sel: string | null = null;
  private expanded: string | null = null;
  private _expand: Record<string, number> = {};
  private _hover: string | null = null;
  private rot = {
    yaw: -0.35,
    pitch: -0.16,
    vyaw: 0.0016,
    drag: false,
    lx: 0,
    ly: 0,
    moved: 0,
  };

  private hub!: string;
  private tier: Record<string, number> = {};
  private parent: Record<string, string> = {};
  private children: Record<string, string[]> = {};
  private p3: Record<string, Vec3> = {};

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private catcher!: HTMLDivElement;
  private layer!: HTMLDivElement;
  private els: Record<string, HTMLDivElement> = {};
  private badges: Record<string, HTMLElement> = {};

  private _raf: number | null = null;
  private _cleanup: (() => void) | null = null;

  constructor(container: HTMLElement, opts: MemoryGraphOptions) {
    this.container = container;
    this.nodes = opts.nodes;
    this.edges = opts.edges;
    this.colorOf = opts.colorOf ?? (() => "#555");
    this.onSelect = opts.onSelect ?? (() => {});
    this.panelWidth = opts.panelWidth ?? 376;
    this.topPad = opts.topPad ?? 0;

    this.nodes.forEach((n) => {
      this.map[n.id] = n;
      this.neigh[n.id] = [];
    });
    this.edges.forEach(([a, b]) => {
      this.neigh[a]?.push(b);
      this.neigh[b]?.push(a);
    });

    this._buildHierarchy();
    this._buildDom();
    this._seedSphere();
    this._wireDrag();
  }

  // ---- tier 0 hub -> tier 1 main topics -> tier 2 hidden detail nodes ----
  private _buildHierarchy() {
    const hub = this.nodes.find((n) => n.type === "advisor") ?? this.nodes[0];
    this.hub = hub.id;
    this.tier[hub.id] = 0;
    const t1 = new Set(this.neigh[hub.id] ?? []);
    this.nodes.forEach((n) => {
      if (n.id !== hub.id) this.tier[n.id] = t1.has(n.id) ? 1 : 2;
    });
    const score = (t: string) =>
      t === "person" ? 0 : t === "advisor" ? 1 : t === "idea" ? 3 : 2;
    this.nodes.forEach((n) => {
      if (this.tier[n.id] !== 2) return;
      const cand = (this.neigh[n.id] ?? [])
        .filter((id) => this.tier[id] === 1)
        .sort((a, b) => score(this.map[a].type) - score(this.map[b].type));
      const par = cand[0] ?? this.hub;
      this.parent[n.id] = par;
      (this.children[par] = this.children[par] ?? []).push(n.id);
    });
  }

  // ---- evenly distribute main topics on a unit sphere (Fibonacci) ----
  private _seedSphere() {
    this.p3 = { [this.hub]: { x: 0, y: 0, z: 0 } };
    const t1 = this.nodes.filter((n) => this.tier[n.id] === 1);
    const N = Math.max(1, t1.length);
    const GA = Math.PI * (3 - Math.sqrt(5));
    t1.forEach((n, i) => {
      const y = 1 - ((i + 0.5) / N) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = GA * i;
      this.p3[n.id] = { x: Math.cos(th) * r, y, z: Math.sin(th) * r };
    });
    // tier-2 nodes fan in screen space; seed them at their parent.
    this.nodes.forEach((n) => {
      if (this.tier[n.id] === 2) this.p3[n.id] = { ...this.p3[this.parent[n.id]] };
    });
  }

  private _buildDom() {
    // Only force a positioning context if the container is statically
    // positioned — otherwise we'd clobber an `absolute inset-0` stage and
    // collapse its size to zero.
    if (getComputedStyle(this.container).position === "static") {
      this.container.style.position = "relative";
    }
    this.canvas = document.createElement("canvas");
    Object.assign(this.canvas.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      pointerEvents: "none",
    });
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;

    this.catcher = document.createElement("div");
    Object.assign(this.catcher.style, {
      position: "absolute",
      inset: "0",
      cursor: "grab",
      touchAction: "none",
    });

    this.layer = document.createElement("div");
    Object.assign(this.layer.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
    });

    this.catcher.addEventListener("click", () => {
      // Ignore the click that ends a drag-rotate; only treat genuine taps on
      // empty space as "collapse everything".
      if (this.rot.moved >= 5) return;
      if (this.sel || this.expanded) {
        this.expanded = null;
        this._select(null);
      }
    });

    this.container.append(this.canvas, this.catcher, this.layer);

    this.nodes.forEach((n) => {
      const tier = this.tier[n.id];
      const size = tier === 0 ? 66 : tier === 1 ? 50 : 36;
      const round = n.type === "advisor" || n.type === "person";
      const color = this.colorOf(n.type);

      const el = document.createElement("div");
      Object.assign(el.style, {
        position: "absolute",
        left: "0",
        top: "0",
        display: "none",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        cursor: "pointer",
        pointerEvents: "none",
        willChange: "transform,opacity",
      });

      const dot = document.createElement("div");
      Object.assign(dot.style, {
        width: size + "px",
        height: size + "px",
        borderRadius: round ? "50%" : "13px",
        border: "1.5px solid " + color,
        background: n.type === "advisor" ? color : "rgba(252,250,245,0.96)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: n.type === "advisor" ? "#F4F0E6" : color,
        fontFamily: '"Hanken Grotesk", sans-serif',
        fontWeight: "700",
        fontSize: tier === 0 ? "13px" : "11px",
        letterSpacing: "0.02em",
        boxShadow: "0 8px 20px -10px rgba(35,31,23,0.5)",
        transition: "box-shadow .25s, transform .25s",
      });
      dot.textContent = glyph(n);
      el.appendChild(dot);

      const label = document.createElement("span");
      label.textContent = n.label;
      Object.assign(label.style, {
        fontFamily: '"Hanken Grotesk", sans-serif',
        fontSize: "11px",
        fontWeight: "600",
        color: "#2A261D",
        background: "rgba(252,250,245,0.86)",
        padding: "2px 8px",
        borderRadius: "7px",
        whiteSpace: "nowrap",
        maxWidth: "150px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxShadow: "0 2px 8px -6px rgba(35,31,23,0.5)",
      });
      el.appendChild(label);

      const kids = this.children[n.id] ?? [];
      if (kids.length) {
        const badge = document.createElement("span");
        badge.textContent = "+" + kids.length;
        Object.assign(badge.style, {
          position: "absolute",
          right: "-6px",
          top: "-4px",
          minWidth: "18px",
          height: "18px",
          padding: "0 5px",
          borderRadius: "9px",
          background: color,
          color: "#fff",
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: "10px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #FCFAF5",
        });
        el.appendChild(badge);
        this.badges[n.id] = badge;
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this._click(n.id);
      });
      el.addEventListener("mouseenter", () => {
        this._hover = n.id;
        dot.style.boxShadow = "0 10px 26px -8px " + color;
        dot.style.transform = "scale(1.08)";
      });
      el.addEventListener("mouseleave", () => {
        if (this._hover === n.id) this._hover = null;
        dot.style.boxShadow = "0 8px 20px -10px rgba(35,31,23,0.5)";
        dot.style.transform = "scale(1)";
      });

      this.layer.appendChild(el);
      this.els[n.id] = el;
    });
  }

  // ---- click rules: expand/collapse main topics, select details ----
  private _click(id: string) {
    const tier = this.tier[id];
    if (tier === 0) {
      this.expanded = null;
      this._select(this.hub);
      return;
    }
    if (tier === 1) {
      if (this.expanded === id && this.sel === id) {
        this.expanded = null;
        this._select(null);
      } else {
        this.expanded = id;
        this._select(id);
      }
      return;
    }
    this.expanded = this.parent[id];
    this._select(id);
  }

  private _select(id: string | null) {
    this.sel = id;
    this.onSelect(id);
  }

  /** Called from the side panel's "related" links. */
  selectExternal(id: string) {
    const tier = this.tier[id];
    this.expanded = tier === 1 ? id : tier === 2 ? this.parent[id] : null;
    this._select(id);
  }

  setSelected(id: string | null) {
    if (id === null) {
      this.expanded = null;
      this._select(null);
    } else {
      this.selectExternal(id);
    }
  }

  private _wireDrag() {
    const r = this.rot;
    const point = (ev: MouseEvent | TouchEvent) =>
      "touches" in ev ? ev.touches[0] : ev;

    const down = (ev: MouseEvent | TouchEvent) => {
      const p = point(ev);
      r.drag = true;
      r.lx = p.clientX;
      r.ly = p.clientY;
      r.moved = 0;
      this.catcher.style.cursor = "grabbing";
    };
    const move = (ev: MouseEvent | TouchEvent) => {
      if (!r.drag) return;
      const p = point(ev);
      const dx = p.clientX - r.lx;
      const dy = p.clientY - r.ly;
      r.lx = p.clientX;
      r.ly = p.clientY;
      r.yaw += dx * 0.0065;
      r.pitch = Math.max(-1.05, Math.min(1.05, r.pitch + dy * 0.0055));
      r.vyaw = dx * 0.0009;
      r.moved += Math.abs(dx) + Math.abs(dy);
      if (ev.cancelable) ev.preventDefault();
    };
    const up = () => {
      r.drag = false;
      this.catcher.style.cursor = "grab";
    };

    this.catcher.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    this.catcher.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);

    this._cleanup = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }

  start() {
    this.stop();
    const loop = () => {
      this._draw();
      this._raf = requestAnimationFrame(loop);
    };
    loop();
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    this._cleanup?.();
    this.container.innerHTML = "";
  }

  // ---- the frame: project sphere, ease expansion, fan children, draw edges ----
  private _draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W === 0 || H === 0) {
      this.hideAllNodes();
      return;
    }
    if (this.canvas.width !== Math.floor(W * dpr)) {
      this.canvas.width = Math.floor(W * dpr);
      this.canvas.height = Math.floor(H * dpr);
    }
    const t = performance.now() / 1000;
    const r = this.rot;

    const panelW = W > 600 ? this.panelWidth : 0;
    const top = this.topPad;
    const availW = W - panelW;
    const availH = H - top;
    const cx = availW / 2;
    const cy = top + availH * 0.52;
    const R = Math.min(availW, availH) * 0.34;
    const focal = R * 2.7;
    if (R <= 0 || !Number.isFinite(R) || !Number.isFinite(focal)) {
      this.hideAllNodes();
      return;
    }

    const still = !!this.sel || !!this.expanded || r.drag;
    if (!still) {
      r.yaw += r.vyaw;
      r.vyaw += (0.0016 - r.vyaw) * 0.03;
    }

    for (const par in this.children) {
      const tgt = this.expanded === par ? 1 : 0;
      this._expand[par] = (this._expand[par] ?? 0) + (tgt - (this._expand[par] ?? 0)) * 0.16;
    }
    const prog = (id: string) =>
      this.tier[id] < 2 ? 1 : this._expand[this.parent[id]] ?? 0;

    const cyaw = Math.cos(r.yaw);
    const syaw = Math.sin(r.yaw);
    const cp = Math.cos(r.pitch);
    const sp = Math.sin(r.pitch);
    const proj: Record<string, Projected> = {};
    for (const n of this.nodes) {
      const b = this.p3[n.id];
      const x = b.x * R;
      const y = b.y * R;
      const z = b.z * R;
      const x1 = x * cyaw + z * syaw;
      const z1 = -x * syaw + z * cyaw;
      const y2 = y * cp - z1 * sp;
      const z2 = y * sp + z1 * cp;
      const persp = focal / (focal - z2);
      proj[n.id] = { x: cx + x1 * persp, y: cy + y2 * persp, scale: persp, z: z2 };
    }

    const ease = (p: number) => 1 - Math.pow(1 - p, 3);
    const rpos: Record<string, Rendered> = {};
    for (const n of this.nodes) {
      const pr = proj[n.id];
      if (this.tier[n.id] === 2) {
        const par = this.parent[n.id];
        const pa = proj[par];
        const p = Math.max(0, Math.min(1, prog(n.id)));
        const e = ease(p);
        const sib = this.children[par];
        const k = sib.length;
        const idx = sib.indexOf(n.id);
        const phase = (par.charCodeAt(par.length - 1) % 7) * 0.45 - Math.PI / 2;
        const ang = phase + (idx / k) * Math.PI * 2;
        const rad = (62 + k * 6) * Math.max(0.7, Math.min(1.25, pa.scale)) * e;
        rpos[n.id] = {
          x: pa.x + Math.cos(ang) * rad,
          y: pa.y + Math.sin(ang) * rad,
          scale: pa.scale,
          z: pa.z + 0.5,
          vis: p,
        };
      } else {
        rpos[n.id] = { x: pr.x, y: pr.y, scale: pr.scale, z: pr.z, vis: 1 };
      }
    }

    for (const n of this.nodes) {
      const el = this.els[n.id];
      const pr = rpos[n.id];
      // Safety: never let a node fall back to the (0,0) corner.
      if (!Number.isFinite(pr.x) || !Number.isFinite(pr.y)) {
        el.style.display = "none";
        continue;
      }
      const grow = this.tier[n.id] === 2 ? 0.55 + 0.45 * pr.vis : 1;
      const ds = Math.max(0.5, Math.min(1.34, pr.scale)) * grow;
      const depthO = Math.max(
        0.34,
        Math.min(1, ((pr.z + R * 1.34) / (2.4 * R)) * 0.82 + 0.36),
      );
      const isSel = this.sel === n.id;
      const op = (isSel ? 1 : depthO) * pr.vis;
      el.style.transform = `translate(${pr.x.toFixed(1)}px,${pr.y.toFixed(
        1,
      )}px) translate(-50%,-50%) scale(${ds.toFixed(3)})`;
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(1000 + Math.round(pr.z) + (isSel ? 5000 : 0));
      el.style.pointerEvents = op < 0.18 || pr.vis < 0.4 ? "none" : "auto";
      el.style.display = pr.vis < 0.012 ? "none" : "flex";
      const badge = this.badges[n.id];
      if (badge) badge.style.display = this.expanded === n.id ? "none" : "flex";
    }

    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (const [ea, eb] of this.edges) {
      const a = rpos[ea];
      const b = rpos[eb];
      if (!a || !b) continue;
      const lv = Math.min(a.vis, b.vis);
      if (lv < 0.012) continue;
      const ca = this.colorOf(this.map[ea].type);
      const cb = this.colorOf(this.map[eb].type);
      let emph = 0;
      if (this._hover) emph = ea === this._hover || eb === this._hover ? 1 : 0;
      else if (this.sel) emph = ea === this.sel || eb === this.sel ? 1 : 0;
      const depth = ((a.z + b.z) / 2 + R) / (2 * R);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, ca);
      grad.addColorStop(1, cb);
      const alpha =
        (emph > 0
          ? 0.9
          : (0.12 + 0.12 * (0.5 + 0.5 * Math.sin(t * 1.1 + a.x * 0.012))) *
            (0.45 + 0.55 * depth)) * lv;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = grad;
      ctx.lineWidth = emph > 0 ? 2 : 0.8 + 0.9 * depth;
      if (emph > 0) {
        ctx.shadowColor = cb;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();

      // Travelling pulse along emphasized links.
      if (emph > 0) {
        const tt = (t * 0.6) % 1;
        const px = a.x + (b.x - a.x) * tt;
        const py = a.y + (b.y - a.y) * tt;
        ctx.save();
        ctx.globalAlpha = 0.9 * lv;
        ctx.fillStyle = cb;
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  private hideAllNodes() {
    for (const el of Object.values(this.els)) {
      el.style.display = "none";
      el.style.pointerEvents = "none";
    }
  }
}

function glyph(n: MemoryNode): string {
  if (n.type === "advisor") return "YOU";
  if (n.type === "person") return initials(n.label);
  const map: Record<string, string> = {
    meeting: "M",
    note: "N",
    decision: "D",
    idea: "I",
    document: "F",
  };
  return map[n.type] ?? "•";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
