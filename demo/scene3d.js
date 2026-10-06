/*
 * 3D 방 장면(three.js): 같은 장면을 "문에서 본 정면"과 "위에서 본 도면" 두 시점으로 그리고,
 * 어느 쪽에서 끌어도 같은 물체가 함께 움직인다. 물체는 눌러서 선택해 끌기·회전·크기·삭제를 할 수 있다.
 * 모델은 단순한 입체 도형이며 실제 제품이 아니다(실사 이미지는 'AI 실사로 보기'로 따로 만든다).
 * 좌표·규칙은 scene_logic.js 참고. three.js(CDN)가 없으면 아무것도 하지 않는다.
 */
(function (root) {
  const T = root.THREE, L = root.SceneLogic;
  if (!T || !L) { root.Scene3D = null; return; }

  const WALL_H = 240, FRONT_BG = 0xe9e5dd, TOP_BG = 0xf7f5f0;
  const PAL = { wood: 0xc9a27a, woodDark: 0x8a6a4a, white: 0xf3f0ea, grey: 0xaab0b8, greyDark: 0x6e747c, sage: 0x9db39a, cream: 0xeadfcb, black: 0x2b2b2f, warm: 0xffe2a8, green: 0x4f8a55, blue: 0x7ea6c4, rose: 0xd8a7a0 };
  const mats = {};
  const M = (c) => mats[c] || (mats[c] = new T.MeshLambertMaterial({ color: c }));
  const EDGE = new T.LineBasicMaterial({ color: 0x5b5348 });
  function B(parent, w, h, d, color, x, y, z) { const geo = new T.BoxGeometry(w, h, d), m = new T.Mesh(geo, M(color)); m.position.set(x || 0, (y || 0) + h / 2, z || 0); if (w > 6 && h > 3 && d > 3) m.add(new T.LineSegments(new T.EdgesGeometry(geo), EDGE)); parent.add(m); return m; }
  function C(parent, rt, rb, h, color, x, y, z, seg) { const m = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), M(color)); m.position.set(x || 0, (y || 0) + h / 2, z || 0); parent.add(m); return m; }
  function S(parent, r, color, x, y, z) { const m = new T.Mesh(new T.SphereGeometry(r, 14, 10), M(color)); m.position.set(x, y, z); parent.add(m); return m; }
  const glow = (c) => new T.MeshBasicMaterial({ color: c });

  /* ---------- 모델 (원점 = 바닥 중심, 앞면 = +Z, 너비 = X, 깊이 = Z) ---------- */
  const BUILD = {
    bed(g, o) {
      const { w, d } = o;
      B(g, w + 4, 22, d, PAL.woodDark, 0, 0, 0);
      B(g, w, 20, d - 6, PAL.white, 0, 22, 4);
      B(g, w + 6, 70, 6, PAL.woodDark, 0, 0, -d / 2 + 3);
      B(g, w * 0.36, 8, 30, PAL.white, -w * 0.22, 42, -d / 2 + 24); B(g, w * 0.36, 8, 30, PAL.white, w * 0.22, 42, -d / 2 + 24);
      B(g, w, 6, d * 0.58, PAL.grey, 0, 42, d * 0.17);
    },
    bedding(g, o) { B(g, o.w * 0.97, 8, o.d * 0.66, PAL.sage, 0, 0, o.d * 0.15); B(g, o.w * 0.4, 8, 26, PAL.cream, -o.w * 0.22, 0, -o.d * 0.34); B(g, o.w * 0.4, 8, 26, PAL.cream, o.w * 0.22, 0, -o.d * 0.34); },
    wardrobe(g, o) {
      const { w, d, h } = o; B(g, w, h, d, PAL.white, 0, 0, 0);
      const n = w > 110 ? 3 : 2; for (let i = 1; i < n; i++) B(g, 1.2, h - 6, 1, PAL.greyDark, -w / 2 + (w / n) * i, 3, d / 2 + 0.2);
      for (let i = 0; i < n; i++) B(g, 2, 14, 3, PAL.greyDark, -w / 2 + (w / n) * (i + 0.5) + 6, h * 0.45, d / 2 + 1.5);
    },
    nightstand(g, o) { B(g, o.w, o.h - 4, o.d, PAL.wood, 0, 4, 0); B(g, o.w - 4, 1.5, 1, PAL.woodDark, 0, o.h * 0.55, o.d / 2 + 0.2); B(g, o.w * 0.3, 3, 3, PAL.black, 0, o.h * 0.62, o.d / 2 + 1.5); [-1, 1].forEach((a) => [-1, 1].forEach((b2) => B(g, 3, 4, 3, PAL.woodDark, a * (o.w / 2 - 3), 0, b2 * (o.d / 2 - 3)))); },
    sofa(g, o) {
      const { w, d } = o; B(g, w, 24, d, PAL.greyDark, 0, 8, 0); B(g, w - 28, 16, d - 24, PAL.grey, 0, 32, 10);
      B(g, w, 56, 20, PAL.grey, 0, 24, -d / 2 + 10); B(g, 16, 36, d, PAL.greyDark, -w / 2 + 8, 24, 0); B(g, 16, 36, d, PAL.greyDark, w / 2 - 8, 24, 0);
      [-1, 1].forEach((a) => B(g, 6, 8, 6, PAL.black, a * (w / 2 - 6), 0, d / 2 - 6)); },
    tvconsole(g, o) { B(g, o.w, o.h, o.d, PAL.wood, 0, 0, 0); B(g, o.w * 0.78, 52, 4, PAL.black, 0, o.h + 8, 0); B(g, 30, 8, 18, PAL.black, 0, o.h, 0); },
    coffeetable(g, o) { B(g, o.w, 4, o.d, PAL.wood, 0, o.h - 4, 0); [-1, 1].forEach((a) => [-1, 1].forEach((b2) => B(g, 4, o.h - 4, 4, PAL.woodDark, a * (o.w / 2 - 6), 0, b2 * (o.d / 2 - 6)))); },
    desk(g, o) { B(g, o.w, 4, o.d, PAL.wood, 0, o.h - 4, 0); [-1, 1].forEach((a) => B(g, 3, o.h - 4, o.d - 6, PAL.woodDark, a * (o.w / 2 - 4), 0, 0)); B(g, o.w - 8, 16, 2, PAL.woodDark, 0, o.h - 22, -o.d / 2 + 4); },
    armchair(g, o) { B(g, o.w, 22, o.d, PAL.rose, 0, 14, 0); B(g, o.w, 46, 14, PAL.rose, 0, 30, -o.d / 2 + 7); [-1, 1].forEach((a) => B(g, 10, 30, o.d, PAL.rose, a * (o.w / 2 - 5), 22, 0)); [-1, 1].forEach((a) => [-1, 1].forEach((b2) => B(g, 4, 14, 4, PAL.woodDark, a * (o.w / 2 - 6), 0, b2 * (o.d / 2 - 6)))); },
    lowbookcase(g, o) { B(g, o.w, o.h, o.d, PAL.wood, 0, 0, 0); for (let i = 1; i <= 2; i++) B(g, o.w - 4, 1.5, 1, PAL.woodDark, 0, (o.h / 3) * i, o.d / 2 + 0.3);
      [PAL.blue, PAL.rose, PAL.sage, PAL.cream].forEach((c, i) => B(g, 6, 20, 14, c, -o.w / 2 + 12 + i * 8, o.h / 3 + 2, 0)); },
    rug(g, o) { if (Math.abs(o.w - o.d) < 4) C(g, o.w / 2, o.w / 2, 2, PAL.cream, 0, 0, 0, 36); else B(g, o.w, 2, o.d, PAL.cream, 0, 0, 0); },
    rugsmall(g, o) { B(g, o.w, 2, o.d, PAL.sage, 0, 0, 0); B(g, o.w - 10, 2.4, o.d - 10, PAL.cream, 0, 0, 0); },
    floorlamp(g, o) { C(g, 12, 12, 3, PAL.black, 0, 0, 0); C(g, 1.5, 1.5, o.h - 20, PAL.black, 0, 3, 0); const sh = C(g, 12, 18, 22, PAL.warm, 0, o.h - 22, 0); sh.material = glow(PAL.warm); },
    desklamp(g, o) { C(g, 6, 6, 2, PAL.black, 0, 0, 0); C(g, 1, 1, 26, PAL.black, 0, 2, 0); const sh = C(g, 3, 8, 8, PAL.warm, 0, 28, 3); sh.material = glow(PAL.warm); },
    moodlamp(g, o) { const s = S(g, 6, PAL.warm, 0, 6, 0); s.material = glow(PAL.warm); C(g, 5, 5, 1, PAL.black, 0, 0, 0); },
    lightset(g, o) { [-1, 1].forEach((a) => { const s = S(g, 5, PAL.warm, a * 14, 8, 0); s.material = glow(PAL.warm); C(g, 4, 4, 2, PAL.black, a * 14, 0, 0); }); },
    plant(g, o) { C(g, 14, 10, 24, PAL.white, 0, 0, 0); S(g, 22, PAL.green, 0, 50, 0); S(g, 16, PAL.green, 8, 68, 4); S(g, 14, 0x3d7a46, -9, 40, -4); },
    ottoman(g, o) { C(g, o.w / 2, o.w / 2, o.h, PAL.sage, 0, 0, 0, 24); C(g, o.w / 2 - 3, o.w / 2 - 3, 3, PAL.cream, 0, o.h, 0, 24); },
    sidetable(g, o) { C(g, o.w / 2, o.w / 2, 3, PAL.wood, 0, o.h - 3, 0, 24); C(g, 2.5, 2.5, o.h - 3, PAL.woodDark, 0, 0, 0); C(g, 12, 12, 2, PAL.woodDark, 0, 0, 0); },
    cushions(g, o) { [[-22, PAL.sage], [0, PAL.rose], [22, PAL.cream]].forEach(([x, c], i) => { const b = B(g, 18, 18, 8, c, x, 0, 0); b.rotation.z = (i - 1) * 0.15; }); },
    curtain(g, o) { const pw = o.w * 0.3; [-1, 1].forEach((a) => B(g, pw, o.h, 8, PAL.cream, a * (o.w / 2 - pw / 2), 0, 0)); B(g, o.w + 10, 3, 3, PAL.black, 0, o.h - 3, 2); },
    frame(g, o) { B(g, o.w, o.h, 3, PAL.black, 0, 0, 0); B(g, o.w - 8, o.h - 8, 3.4, PAL.cream, 0, 4, 0); B(g, o.w * 0.5, o.h * 0.35, 3.8, PAL.blue, -4, o.h * 0.3, 0); B(g, o.w * 0.3, o.h * 0.25, 3.8, PAL.rose, o.w * 0.15, o.h * 0.55, 0); },
    wallshelf(g, o) { B(g, o.w, 4, o.d, PAL.wood, 0, 0, 0); [PAL.blue, PAL.rose, PAL.sage, PAL.cream, PAL.green].forEach((c, i) => B(g, 5, 20 - i * 2, 13, c, -o.w / 2 + 8 + i * 7, 4, 0)); },
    mirror(g, o) { const m = new T.Group(); B(m, o.w, o.h, 3, PAL.woodDark, 0, 0, 0); B(m, o.w - 6, o.h - 6, 3.4, 0xcfe3ee, 0, 3, 0.2); m.rotation.x = -0.09; m.position.z = 4; g.add(m); },
    sideboard(g, o) { B(g, o.w, o.h, o.d, PAL.white, 0, 0, 0); B(g, 1, o.h - 10, 1, PAL.greyDark, 0, 5, o.d / 2 + 0.2); [-1, 1].forEach((a) => B(g, 2, 12, 3, PAL.greyDark, a * 8, o.h * 0.5, o.d / 2 + 1.5)); },
    doorhanger(g, o) { B(g, o.w, 3, 3, PAL.black, 0, 0, 0); [-1, 0, 1].forEach((a) => B(g, 3, 8, 6, PAL.black, a * 10, -8, 3)); },
    pillar(g, o) { B(g, o.w, o.h, o.d, PAL.grey, 0, 0, 0); },
  };

  function buildModel(o) {
    const g = new T.Group(), fn = BUILD[o.type];
    if (fn) fn(g, o); else B(g, o.w, o.h, o.d, PAL.grey, 0, 0, 0);
    g.userData.id = o.id;
    g.traverse((m) => { if (m.isMesh) m.userData.ownerId = o.id; });
    return g;
  }

  /* ---------- 방 (바닥·벽·창·문) ---------- */
  function plankTexture() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256; const x = c.getContext("2d");
    x.fillStyle = "#d8c6aa"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#d2bfa1" : "#dccbb0"; x.fillRect(0, i * 32, 256, 32); x.fillStyle = "rgba(90,60,30,.25)"; x.fillRect(0, i * 32, 256, 1.5); x.fillRect(((i * 97) % 256), i * 32, 1.5, 32); }
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  let _plank = null;
  function textSprite(text, w, h, color) {
    const c = document.createElement("canvas"); c.width = 512; c.height = Math.round(512 * h / w); const x = c.getContext("2d");
    x.fillStyle = "rgba(255,255,255,0)"; x.fillRect(0, 0, c.width, c.height); x.fillStyle = color || "#b25b00"; x.textAlign = "center"; x.textBaseline = "middle";
    const lines = String(text).split("\n"); let fs = Math.min(64, Math.floor(c.height * 0.9 / (lines.length * 1.15))); x.font = `bold ${fs}px sans-serif`; const mw = Math.max(...lines.map((ln) => x.measureText(ln).width)); if (mw > c.width * 0.92) { fs = Math.floor(fs * c.width * 0.92 / mw); x.font = `bold ${fs}px sans-serif`; }
    lines.forEach((ln, i) => x.fillText(ln, c.width / 2, c.height / 2 + (i - (lines.length - 1) / 2) * fs * 1.15));
    const t = new T.CanvasTexture(c), m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; return m;
  }
  function buildRoom(U, windows, door) {
    const g = new T.Group(); _plank = _plank || plankTexture();
    const fl = _plank.clone(); fl.needsUpdate = true; fl.repeat.set(U.W / 120, U.D / 120);
    const floor = new T.Mesh(new T.PlaneGeometry(U.W, U.D), new T.MeshLambertMaterial({ map: fl })); floor.rotation.x = -Math.PI / 2; floor.position.set(U.W / 2, 0, U.D / 2); g.add(floor);
    const wallMat = M(0xfbf8f2), TH = 6;
    const far = new T.Mesh(new T.BoxGeometry(U.W + TH * 2, WALL_H, TH), wallMat); far.position.set(U.W / 2, WALL_H / 2, -TH / 2); g.add(far);
    const left = new T.Mesh(new T.BoxGeometry(TH, WALL_H, U.D), wallMat); left.position.set(-TH / 2, WALL_H / 2, U.D / 2); g.add(left);
    const right = new T.Mesh(new T.BoxGeometry(TH, WALL_H, U.D), wallMat); right.position.set(U.W + TH / 2, WALL_H / 2, U.D / 2); g.add(right);
    const near = new T.Mesh(new T.BoxGeometry(U.W + TH * 2, WALL_H, TH), wallMat); near.position.set(U.W / 2, WALL_H / 2, U.D + TH / 2); near.layers.set(1); g.add(near); // 위에서 볼 때만
    (windows || []).forEach((w) => {
      const ww = Math.min(w.w, (w.wall === "far" ? U.W : U.D) - 30), p = L.wallPlace(w.wall, 0.5, U, ww, 4);
      const wg = new T.Group(); B(wg, ww + 8, 150, 3, 0xffffff, 0, 0, 0);
      const glass = new T.Mesh(new T.PlaneGeometry(ww, 142), new T.MeshBasicMaterial({ color: 0xcfe8ff })); glass.position.set(0, 75, 1.8); wg.add(glass);
      B(wg, 2, 142, 3.4, 0xffffff, 0, 4, 0.2);
      wg.position.set(p.cx, 70, p.cz + (w.wall === "far" ? 0 : 0)); wg.rotation.y = p.rot; g.add(wg);
    });
    // 문 열림 공간(주황, 위에서 볼 때 강조) + 문 표시
    const dr = L.doorRect(U, door), zone = new T.Mesh(new T.PlaneGeometry(dr.w, dr.h), new T.MeshBasicMaterial({ color: 0xff7a00, transparent: true, opacity: 0.5 }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(dr.x + dr.w / 2, 0.6, dr.y + dr.h / 2); zone.userData.hideForAI = true; g.add(zone);
    const zb = new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(dr.w, dr.h)), new T.LineBasicMaterial({ color: 0xc85800 })); zb.rotation.x = -Math.PI / 2; zb.position.set(dr.x + dr.w / 2, 0.9, dr.y + dr.h / 2); zb.layers.set(1); zb.userData.hideForAI = true; g.add(zb);
    const lbl = textSprite("문 열림 공간\n(비워 두세요)", dr.w, dr.h * 0.7, "#8a3d00"); lbl.position.set(dr.x + dr.w / 2, 0.8, dr.y + dr.h / 2); lbl.layers.set(1); lbl.userData.hideForAI = true; g.add(lbl);
    const doorBar = new T.Mesh(new T.BoxGeometry(80, 4, 5), M(0x8a6a4a)); doorBar.position.set(dr.x + dr.w / 2, 2, U.D + 1); doorBar.layers.set(1); doorBar.userData.hideForAI = true; g.add(doorBar);
    return g;
  }

  /* ---------- 카메라 ---------- */
  function frontCamera(U, door, aspect) {
    const cam = new T.PerspectiveCamera(74, aspect, 5, 3000), dx = door === "left" ? 50 : door === "center" ? U.W / 2 : U.W - 50;
    cam.position.set(dx, 135, U.D + 70); cam.lookAt(U.W / 2, 85, 0); return cam;
  }
  function topCamera(U, aspect) {
    const m = 25, hw = U.W / 2 + m, hh = U.D / 2 + m; let w = hw, h = hh;
    if (w / h < aspect) w = h * aspect; else h = w / aspect;
    const cam = new T.OrthographicCamera(-w, w, h, -h, 10, 3000); cam.position.set(U.W / 2, 1000, U.D / 2); cam.up.set(0, 0, -1); cam.lookAt(U.W / 2, 0, U.D / 2); cam.layers.enable(1); return cam;
  }
  function newScene(U, windows, door, bg) {
    const sc = new T.Scene(); sc.background = new T.Color(bg);
    sc.add(new T.HemisphereLight(0xffffff, 0xa89c8c, 0.82)); const dl = new T.DirectionalLight(0xffffff, 0.4); dl.position.set(U.W * 0.3, 600, U.D * 1.2); sc.add(dl);
    sc.add(buildRoom(U, windows, door)); return sc;
  }

  /* ---------- 객체 그룹 ---------- */
  function placeGroup(g, o) {
    g.position.set(o.cx, o.elev || 0, o.cz); g.rotation.y = o.rot; g.rotation.x = 0;
  }
  function syncAttached(objs) {
    const by = Object.fromEntries(objs.map((o) => [o.id, o]));
    objs.forEach((o) => {
      if (o.mount !== "on" || !by[o.host]) return; const h = by[o.host];
      if (!o.off) { const dx = o.cx - h.cx, dz = o.cz - h.cz, c = Math.cos(-h.rot), s = Math.sin(-h.rot); o.off = { x: dx * c + dz * s, z: -dx * s + dz * c }; }
      const c = Math.cos(h.rot), s = Math.sin(h.rot); o.cx = h.cx + o.off.x * c + o.off.z * s; o.cz = h.cz - o.off.x * s + o.off.z * c; o.rot = h.rot;
      if (o.type === "bedding") { o.w = h.w; o.d = h.d; }
      o.elev = L.HOST_TOP[h.type] || o.elev;
    });
  }
  function fillScene(sc, objs) {
    const old = []; sc.children.forEach((c) => { if (c.userData && c.userData.isObj) old.push(c); }); old.forEach((c) => { sc.remove(c); c.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); });
    syncAttached(objs);
    objs.forEach((o) => {
      const g = buildModel(o); g.userData.isObj = true; placeGroup(g, o); sc.add(g);
      if (o.label && o.mount === "floor" && o.type !== "pillar" && Math.max(o.w, o.d) > 24) { // 위에서 볼 때만 보이는 이름표
        const lw = Math.min(Math.max(o.w, o.d) * 1.05, 150), lb = textSprite(String(o.label).replace(/\(.*\)/, "").trim(), lw, lw * 0.3, "#2b2b2f");
        lb.position.set(o.cx, (o.elev || 0) + (o.h || 0) + 2, o.cz); lb.layers.set(1); lb.userData.isObj = true; lb.userData.label = true; lb.userData.hideForAI = true; sc.add(lb);
      }
    });
  }
  function disposeScene(sc) { sc.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }

  /* ---------- 정지 이미지(카드·AI 입력용) ---------- */
  let shared = null;
  function sharedRenderer(w, h) {
    if (!shared) { const cv = document.createElement("canvas"); shared = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); }
    shared.setPixelRatio(1); shared.setSize(w, h, false); return shared;
  }
  function hideAI(sc, hide) { sc.traverse((m) => { if (m.userData && m.userData.hideForAI) m.visible = !hide; }); }
  function snapshot(room, objs, view, w, h, clean) {
    w = w || 480; h = h || 360; const r = sharedRenderer(w, h), sc = newScene(room.U, room.windows, room.door, view === "top" ? TOP_BG : FRONT_BG);
    fillScene(sc, objs.map((o) => Object.assign({}, o)));
    const cam = view === "top" ? topCamera(room.U, w / h) : frontCamera(room.U, room.door, w / h);
    if (clean) hideAI(sc, true); r.render(sc, cam); const url = r.domElement.toDataURL("image/jpeg", 0.88); disposeScene(sc); return url;
  }

  /* ---------- 편집 화면 ---------- */
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function modal() {
    let m = document.getElementById("sceneModal");
    if (!m) { m = document.createElement("div"); m.id = "sceneModal"; m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:70;display:none;align-items:flex-end;justify-content:center;user-select:none;-webkit-user-select:none"; document.body.appendChild(m); }
    return m;
  }

  /* opts: { room:{U,windows,door}, objs, names:{key:{name}}, label(id)->이름, onSave(objs), compose(dataUrl, view)->Promise<dataUrl>, addable:[키...] } */
  function openEditor(opts) {
    const m = modal(), U = opts.room.U, objs = opts.objs.map((o) => Object.assign({}, o));
    const names = opts.names || {}, nameOf = (o) => o.key ? ((names[o.key] || {}).name || o.key) : ({ bed: "침대", wardrobe: "옷장", sofa: "소파", tvconsole: "TV장", coffeetable: "커피테이블", desk: "책상", nightstand: "협탁", pillar: "기둥" }[o.type] || o.type);
    objs.forEach((o) => { o.label = nameOf(o); });
    let sel = null, dirty = true, drag = null, alive = true;
    m.innerHTML = `<div style="background:var(--bg);color:var(--fg);width:100%;max-width:680px;max-height:96vh;overflow:auto;border-radius:16px 16px 0 0;padding:12px;user-select:none;-webkit-user-select:none">
      <h3 style="margin:0 0 4px">입체로 꾸며보기</h3>
      <p class="mut" style="margin:0 0 6px">제품을 끌어서 옮겨요. 정면과 위에서 본 모습이 함께 움직여요. 눌러서 선택하면 둥근 손잡이(●)를 돌려 방향을 바꿀 수 있어요(두 손가락으로 비틀기·마우스 휠도 돼요).</p>
      <div class="mut" style="font-size:12px">문에서 본 모습</div><div id="s3Front" style="width:100%;aspect-ratio:4/3;border-radius:10px;overflow:hidden;touch-action:none"></div>
      <div class="mut" style="font-size:12px;margin-top:6px">위에서 본 모습 <span style="color:#b25b00">(주황색 = 문 열림 공간)</span></div><div id="s3Top" style="width:100%;border-radius:10px;overflow:hidden;touch-action:none"></div>
      <div class="row seg" style="margin-top:6px"><button type="button" data-s3="rotl">↺ 왼쪽으로</button><button type="button" data-s3="rotr">↻ 오른쪽으로</button><button type="button" data-s3="small">− 작게</button><button type="button" data-s3="big">+ 크게</button><button type="button" data-s3="del" id="s3Del">✕ 지우기</button></div>
      <div class="mut" id="s3Sel" style="margin-top:4px">물체를 눌러 선택하세요</div>
      <ul class="chk" id="s3Chk"></ul>
      <div class="mut" style="margin-top:6px">놓은 제품 <span style="font-size:12px">(✕를 누르면 지워요)</span></div><div class="row seg" id="s3Placed"></div>
      <div class="mut" style="margin-top:6px">더하기</div><div class="row seg" id="s3Add"></div>
      <div id="s3Out"></div>
      <p class="mut">3D 모양은 제품을 단순하게 그린 예시예요. 실제 제품의 모양·색·크기와 달라요.</p>
      <div class="row"><button class="cta" type="button" data-s3="save">이 배치 저장하기</button>${opts.compose ? '<button class="cta ghost" type="button" data-s3="aif">AI 실사로 보기(정면)</button><button class="cta ghost" type="button" data-s3="ait">AI 실사로 보기(위에서)</button>' : ""}<button class="cta ghost" type="button" data-s3="close">닫기</button></div></div>`;
    m.style.display = "flex";
    const sc = newScene(U, opts.room.windows, opts.room.door, FRONT_BG), scTop = sc; // 같은 장면을 두 시점이 함께 쓴다
    const fw = m.querySelector("#s3Front"), tw = m.querySelector("#s3Top");
    const fr = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }), tr = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const topAspect = Math.min(1.6, Math.max(0.75, (U.W + 50) / (U.D + 50))); tw.style.aspectRatio = topAspect + "";
    fw.appendChild(fr.domElement); tw.appendChild(tr.domElement);
    [fr, tr].forEach((r) => { r.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none"; });
    const fcam = frontCamera(U, opts.room.door, 4 / 3), tcam = topCamera(U, topAspect);
    const views = [{ r: fr, cam: fcam, el: fw }, { r: tr, cam: tcam, el: tw }];
    function resize() { views.forEach((v) => { const w = v.el.clientWidth || 300, h = v.el.clientHeight || 225; v.r.setPixelRatio(Math.min(2, root.devicePixelRatio || 1)); v.r.setSize(w, h, false); }); dirty = true; }
    resize(); const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null; if (ro) { ro.observe(fw); ro.observe(tw); }
    const selGroup = new T.Group(); sc.add(selGroup);
    function rebuild() { fillScene(sc, objs); buildSel(); dirty = true; refreshUi(); }
    function buildSel() {
      while (selGroup.children.length) selGroup.remove(selGroup.children[0]);
      const o = objs.find((x) => x.id === sel); if (!o || o.mount === "on") return;
      const rad = Math.max(o.w, o.d) / 2 + 12, ring = new T.Mesh(new T.RingGeometry(rad, rad + 3, 40), new T.MeshBasicMaterial({ color: 0x2f7352, side: T.DoubleSide, depthTest: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(o.cx, 1.5, o.cz); ring.renderOrder = 5; selGroup.add(ring);
      if (o.mount === "floor") {
        const f = { x: Math.sin(o.rot), z: Math.cos(o.rot) }, kr = rad + 16, knob = new T.Mesh(new T.SphereGeometry(8, 14, 10), new T.MeshBasicMaterial({ color: 0x2f7352, depthTest: false }));
        knob.position.set(o.cx + f.x * kr, 8, o.cz + f.z * kr); knob.userData.knob = true; knob.renderOrder = 6; selGroup.add(knob);
        const ln = new T.Mesh(new T.BoxGeometry(2, 1, kr - rad), new T.MeshBasicMaterial({ color: 0x2f7352, depthTest: false })); ln.position.set(o.cx + f.x * (rad + kr) / 2, 2, o.cz + f.z * (rad + kr) / 2); ln.rotation.y = o.rot; ln.renderOrder = 5; selGroup.add(ln);
      }
    }
    function refreshUi() {
      const o = objs.find((x) => x.id === sel);
      m.querySelector("#s3Sel").textContent = o ? `선택: ${o.label} · 방향 ${Math.round((o.rot * 180 / Math.PI + 360) % 360)}° · 크기 ${Math.round((o.s || 1) * 100)}%` : "물체를 눌러 선택하세요";
      const delBtn = m.querySelector("#s3Del"); delBtn.disabled = !o || o.base;
      m.querySelector("#s3Chk").innerHTML = (() => { const ck = L.checksOf(objs, U, opts.room.door); return (ck.length ? ck : [{ level: "ok", msg: "겹침·문 열림 공간 문제 없음(간단 점검)" }]).map((k) => `<li class="${k.level}">${esc(k.msg)}</li>`).join(""); })();
      m.querySelector("#s3Placed").innerHTML = objs.filter((x) => !x.base && x.key).map((x) => `<button type="button" data-rm="${esc(x.id)}" aria-pressed="${x.id === sel}">${esc(x.label)} ✕</button>`).join("") || '<span class="mut">추가한 제품이 없어요</span>';
      const have = new Set(objs.map((x) => x.key).filter(Boolean));
      m.querySelector("#s3Add").innerHTML = (opts.addable || []).filter((k) => !have.has(k)).map((k) => `<button type="button" data-add="${esc(k)}">+ ${esc((names[k] || {}).name || k)}</button>`).join("") || '<span class="mut">모두 놓았어요</span>';
    }
    // 입력 처리 -------------------------------------------------
    const ray = new T.Raycaster(), ndc = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
    function pick(v, e) {
      const r = v.r.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, v.cam);
      ray.layers.enableAll(); sc.updateMatrixWorld(true);
      const kn = ray.intersectObjects(selGroup.children, false).find((h) => h.object.userData.knob); if (kn) return { knob: true };
      const meshes = []; sc.children.forEach((c) => { if (c.userData && c.userData.isObj && !c.userData.label) c.traverse((mm) => { if (mm.isMesh && mm.userData.ownerId) meshes.push(mm); }); });
      const hit = ray.intersectObjects(meshes, false)[0]; return hit ? { id: hit.object.userData.ownerId } : null;
    }
    function floorPoint(v, e) { const r = v.r.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, v.cam); const p = new T.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; }
    function clampMove(o) {
      const a = L.aabb(o), hx = a.w / 2, hz = a.h / 2;
      if (o.mount === "wall") { const w = L.nearestWall(o, U), t = (w === "left" || w === "right") ? o.cz / U.D : o.cx / U.W, p = L.wallPlace(w, Math.min(0.95, Math.max(0.05, t)), U, o.w, o.d); o.cx = p.cx; o.cz = p.cz; o.rot = p.rot; return; }
      o.cx = Math.min(U.W - hx, Math.max(hx, o.cx)); o.cz = Math.min(U.D - hz, Math.max(hz, o.cz));
      if (!["rug", "rugsmall", "coffeetable"].includes(o.type)) { // 벽 가까이 놓으면 벽에 붙인다
        if (o.cx - hx < 12) o.cx = hx; else if (U.W - (o.cx + hx) < 12) o.cx = U.W - hx; if (o.cz - hz < 12) o.cz = hz; else if (U.D - (o.cz + hz) < 12) o.cz = U.D - hz;
      }
    }
    const pointers = new Map();
    views.forEach((v) => {
      const el = v.r.domElement;
      el.addEventListener("pointerdown", (e) => {
        e.preventDefault(); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, v });
        if (pointers.size === 2 && sel) { const [a, b] = [...pointers.values()]; drag = { twist: true, ang: Math.atan2(b.y - a.y, b.x - a.x) }; return; }
        const h = pick(v, e); const p = floorPoint(v, e);
        if (h && h.knob) { drag = { rotate: true, v }; try { el.setPointerCapture(e.pointerId); } catch (er) {} return; }
        if (h && h.id) { const o = objs.find((x) => x.id === h.id); sel = (o && o.mount === "on") ? o.host : h.id; const so = objs.find((x) => x.id === sel);
          drag = { v, dx: p ? so.cx - p.x : 0, dz: p ? so.cz - p.z : 0, move: true }; try { el.setPointerCapture(e.pointerId); } catch (er) {} } else { sel = null; drag = null; }
        buildSel(); refreshUi(); dirty = true;
      });
      el.addEventListener("pointermove", (e) => {
        if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, v });
        const o = objs.find((x) => x.id === sel); if (!o || !drag) return; e.preventDefault();
        if (drag.twist && pointers.size >= 2) { const [a, b] = [...pointers.values()], ang = Math.atan2(b.y - a.y, b.x - a.x); o.rot = L.norm(o.rot - (ang - drag.ang)); drag.ang = ang; }
        else if (drag.rotate) { const p = floorPoint(drag.v, e); if (p) { let a = Math.atan2(p.x - o.cx, p.z - o.cz); a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12); o.rot = L.norm(a); } }
        else if (drag.move) { const p = floorPoint(drag.v, e); if (p) { o.cx = p.x + drag.dx; o.cz = p.z + drag.dz; clampMove(o); } }
        syncAttached(objs); fillScene(sc, objs); buildSel(); refreshUi(); dirty = true;
      });
      const up = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2 && drag && drag.twist) drag = null; if (!pointers.size) drag = null; };
      el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      el.addEventListener("wheel", (e) => { const o = objs.find((x) => x.id === sel); if (!o || o.mount !== "floor") return; e.preventDefault(); o.rot = L.norm(o.rot + (e.deltaY > 0 ? 1 : -1) * Math.PI / 36); syncAttached(objs); fillScene(sc, objs); buildSel(); refreshUi(); dirty = true; }, { passive: false });
    });
    const resizeObj = (o, k) => { const s2 = Math.min(1.8, Math.max(0.5, (o.s || 1) * k)), f = s2 / (o.s || 1); o.w *= f; o.d *= f; o.h *= f; o.s = s2; };
    const snapshotView = (which) => { const v = which === "top" ? views[1] : views[0]; selGroup.visible = false; hideAI(sc, true); v.r.render(sc, v.cam); const u = v.r.domElement.toDataURL("image/jpeg", 0.88); hideAI(sc, false); selGroup.visible = true; dirty = true; return u; };
    function close() { alive = false; if (ro) ro.disconnect(); views.forEach((v) => v.r.dispose()); disposeScene(sc); m.style.display = "none"; m.onclick = null; m.innerHTML = ""; }
    m.onclick = async (e) => {
      if (e.target === m) { close(); return; }
      const rm = e.target.closest("[data-rm]"); if (rm) { const id = rm.dataset.rm; for (let i = objs.length - 1; i >= 0; i--) if (objs[i].id === id || objs[i].host === id) objs.splice(i, 1); sel = null; rebuild(); return; }
      const ad = e.target.closest("[data-add]"); if (ad) { const p = L.placeItem(ad.dataset.add, objs, { U, windows: opts.room.windows, door: opts.room.door }); if (p) { p.label = nameOf(p); objs.push(p); sel = p.id; rebuild(); } else alert("놓을 빈 자리가 없어요. 다른 제품을 지우고 시도해보세요."); return; }
      const b = e.target.closest("[data-s3]"); if (!b) return; const k = b.dataset.s3, o = objs.find((x) => x.id === sel);
      if (k === "rotl" && o) { o.rot = L.norm(o.rot + Math.PI / 12); rebuild(); }
      else if (k === "rotr" && o) { o.rot = L.norm(o.rot - Math.PI / 12); rebuild(); }
      else if (k === "big" && o) { resizeObj(o, 1.1); clampMove(o); rebuild(); }
      else if (k === "small" && o) { resizeObj(o, 1 / 1.1); rebuild(); }
      else if (k === "del" && o && !o.base) { for (let i = objs.length - 1; i >= 0; i--) if (objs[i].id === o.id || objs[i].host === o.id) objs.splice(i, 1); sel = null; rebuild(); }
      else if (k === "close") close();
      else if (k === "save") { const out = objs.map((x) => { const c = Object.assign({}, x); delete c.label; delete c.off; return c; }); close(); opts.onSave(out); }
      else if (k === "aif" || k === "ait") {
        const out = m.querySelector("#s3Out"); out.innerHTML = '<p class="mut">AI가 실사 사진처럼 바꾸는 중이에요(약 10~30초)…</p>';
        try { const res = await opts.compose(snapshotView(k === "ait" ? "top" : "front"), k === "ait" ? "top" : "front"), src = res.src || res; out.innerHTML = `<div style="position:relative;line-height:0"><img src="${src}" alt="AI 실사" style="width:100%;aspect-ratio:${res.aspect || 1};object-fit:fill;border-radius:10px"><span style="position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:2px 6px;font-size:12px;line-height:1.4">✦ AI 생성</span></div><p class="mut">AI가 만든 예시예요. 실제 제품과 다를 수 있어요.</p>`; }
        catch (err) { out.innerHTML = `<p class="mut">${esc(err.message)} 잠시 후 다시 시도해주세요.</p>`; }
      }
    };
    root.__s3dbg = { views, selGroup, objs, THREE: T, sc, pick, getSel: () => sel };
    rebuild();
    (function loop() { if (!alive) return; if (dirty) { dirty = false; views.forEach((v) => v.r.render(sc, v.cam)); } requestAnimationFrame(loop); })();
  }

  root.Scene3D = { snapshot, openEditor, buildModel, frontCamera, topCamera };
})(typeof window !== "undefined" ? window : globalThis);
