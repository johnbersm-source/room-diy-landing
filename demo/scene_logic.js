/*
 * 3D 방 장면의 배치 규칙(브라우저·node 공용, 화면 그리기와 분리).
 * 평면 좌표: x = 왼쪽→오른쪽, y(z) = 맞은편 벽(0)→입구 벽(D), 단위 cm. 장면 객체는 중심 좌표(cx, cz)와 회전(rot, 라디안)을 가진다.
 * 회전 규칙: 모델의 +Z(앞면)가 향하는 방향 f=(fx,fz)에 대해 rot = atan2(fx, fz).
 */
(function (root) {
  const PAD = 10; // layout.js의 안전 여유(가구 치수에 더해진 값)
  const PADDED = new Set(["sofa", "tv", "table", "bed", "ward", "desk", "ns", "chair", "bookcase"]);
  const TYPE_OF_PIECE = { sofa: "sofa", tv: "tvconsole", table: "coffeetable", bed: "bed", ward: "wardrobe", desk: "desk", ns: "nightstand", rug: "rug", lamp: "floorlamp",
    chair: "armchair", bookcase: "lowbookcase", pillar: "pillar" };
  const ITEM_OF_PIECE = { ns: "nightstand", rug: "rug", lamp: "lamp", chair: "chair", bookcase: "bookcase", desk: "desk" };
  const TYPE_OF_ITEM = { rug: "rug", rugSmall: "rugsmall", lamp: "floorlamp", chair: "armchair", shelf: "wallshelf", nightstand: "nightstand", deskLamp: "desklamp", bookcase: "lowbookcase",
    desk: "desk", hanger: "doorhanger", curtain: "curtain", cushion: "cushions", moodLamp: "moodlamp", sidetable: "sidetable", plant: "plant", ottoman: "ottoman", frame: "frame",
    bedding: "bedding", mirror: "mirror", cabinet: "sideboard", lightSet: "lightset" };
  // 기본 크기 [너비, 깊이, 높이, 바닥에서 띄운 높이]
  const DIMS = { sofa: [200, 90, 85, 0], tvconsole: [180, 40, 50, 0], coffeetable: [110, 60, 42, 0], bed: [150, 200, 45, 0], wardrobe: [90, 55, 200, 0], desk: [120, 60, 75, 0],
    nightstand: [40, 40, 50, 0], rug: [160, 160, 2, 0], rugsmall: [100, 150, 2, 0], floorlamp: [35, 35, 160, 0], armchair: [75, 75, 85, 0], lowbookcase: [80, 30, 90, 0], pillar: [30, 30, 240, 0],
    wallshelf: [70, 18, 5, 140], desklamp: [15, 15, 40, 0], doorhanger: [30, 6, 40, 150], curtain: [180, 8, 230, 0], cushions: [45, 12, 40, 0], moodlamp: [12, 12, 16, 0],
    sidetable: [45, 45, 50, 0], plant: [40, 40, 90, 0], ottoman: [50, 50, 40, 0], frame: [60, 3, 80, 110], bedding: [150, 200, 20, 0], mirror: [45, 4, 150, 0], sideboard: [100, 35, 75, 0],
    lightset: [40, 12, 30, 0] };
  const WALL_MOUNT = new Set(["wallshelf", "frame", "curtain", "doorhanger"]);
  const ATTACH = { desklamp: ["desk", "sidetable", "nightstand"], moodlamp: ["nightstand", "sidetable", "desk", "tvconsole"], cushions: ["sofa", "bed"], bedding: ["bed"], lightset: ["nightstand", "bed"] };
  const HOST_TOP = { desk: 75, sidetable: 50, nightstand: 50, tvconsole: 50, sofa: 42, bed: 45 };

  const hasJong = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
  const wa = (w) => w + (hasJong(w) ? "과" : "와"), iga = (w) => w + (hasJong(w) ? "이" : "가");
  const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const rotOf = (fx, fz) => Math.atan2(fx, fz);
  const center = (p) => ({ x: p.x + p.w / 2, y: p.y + p.h / 2 });

  // 가장 가까운 벽의 반대쪽(= 방 안쪽)을 향하는 방향
  function awayFromWall(p, U) {
    const d = { left: p.x, right: U.W - (p.x + p.w), far: p.y, near: U.D - (p.y + p.h) };
    const k = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
    return { left: [1, 0], right: [-1, 0], far: [0, 1], near: [0, -1] }[k];
  }
  const dirToward = (p, q) => { const a = center(p), b = center(q), dx = b.x - a.x, dz = b.y - a.y; return Math.abs(dx) >= Math.abs(dz) ? [Math.sign(dx) || 1, 0] : [0, Math.sign(dz) || 1]; };

  // 엔진 조각(rect) → 장면 객체
  function fromPiece(p, byId, U) {
    const type = TYPE_OF_PIECE[p.id] || "box";
    let f;
    if (type === "bed") {
      if (p.h >= p.w) f = (p.y < U.D - (p.y + p.h)) ? [0, 1] : [0, -1]; // 머리는 가까운 벽(보통 맞은편 벽), 발은 입구 쪽
      else f = (p.x < U.W - (p.x + p.w)) ? [1, 0] : [-1, 0];
    } else if (type === "sofa") f = byId.tv ? dirToward(p, byId.tv) : awayFromWall(p, U);
    else if (type === "tvconsole") f = byId.sofa ? dirToward(p, byId.sofa) : awayFromWall(p, U);
    else if (["coffeetable", "rug", "rugsmall", "floorlamp", "pillar"].includes(type)) f = p.w >= p.h ? [0, 1] : [1, 0];
    else f = awayFromWall(p, U);
    const alongZ = f[0] === 0, pad = PADDED.has(p.id) ? PAD : 0;
    let w = (alongZ ? p.w : p.h) - pad, d = (alongZ ? p.h : p.w) - pad;
    if (["coffeetable", "rug", "rugsmall"].includes(type)) { w = Math.max(p.w, p.h) - pad; d = Math.min(p.w, p.h) - pad; }
    const dm = DIMS[type] || [w, d, 60, 0], c = center(p);
    return { id: p.id, type, cx: c.x, cz: c.y, w, d, h: dm[2], elev: dm[3] || 0, rot: rotOf(f[0], f[1]), mount: "floor", base: true, s: 1 };
  }

  const halfExt = (o) => { const c = Math.abs(Math.cos(o.rot)), s = Math.abs(Math.sin(o.rot)); return { hx: (o.w * c + o.d * s) / 2, hz: (o.w * s + o.d * c) / 2 }; };
  const aabb = (o) => { const e = halfExt(o); return { x: o.cx - e.hx, y: o.cz - e.hz, w: e.hx * 2, h: e.hz * 2 }; };
  const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const isSolid = (o) => o.mount === "floor" && !["rug", "rugsmall"].includes(o.type) && o.elev === 0;

  function doorRect(U, door) { const x = door === "left" ? 0 : door === "center" ? U.W / 2 - 45 : U.W - 90; return { x, y: U.D - 90, w: 90, h: 90 }; }

  // 벽에 붙은 자리 중 기준점(pref)에 가장 가까운 빈자리. 가까운 벽을 등지고 놓아 회전한 모양(넓이·깊이)으로 겹침을 검사한다.
  const FACE = { left: [1, 0], right: [-1, 0], far: [0, 1], near: [0, -1] };
  function findSpot(w, d, objs, regions, U, pref, plain) {
    let best = null;
    for (let x = 15; x <= U.W - 15; x += 10)
      for (let z = 15; z <= U.D - 15; z += 10) {
        const wall = nearestWall({ cx: x, cz: z }, U), side = wall === "left" || wall === "right";
        const rw = plain ? w : (side ? d : w), rh = plain ? d : (side ? w : d);
        if (x - rw / 2 < 3 || z - rh / 2 < 3 || x + rw / 2 > U.W - 3 || z + rh / 2 > U.D - 3) continue;
        if (Math.min(x - rw / 2, z - rh / 2, U.W - x - rw / 2, U.D - z - rh / 2) > 25) continue;
        const r = { x: x - rw / 2, y: z - rh / 2, w: rw, h: rh };
        if (objs.some((o) => isSolid(o) && hit(r, aabb(o))) || regions.some((g) => hit(r, g))) continue;
        const dist = Math.hypot(x - pref.x, z - pref.y);
        if (!best || dist < best.dist) best = { x, z, dist, rot: rotOf(FACE[wall][0], FACE[wall][1]), wall };
      }
    return best;
  }

  const mk = (id, type, cx, cz, w, d, rot, extra) => Object.assign({ id, type, cx, cz, w, d, h: DIMS[type][2], elev: DIMS[type][3] || 0, rot, mount: "floor", base: false, s: 1 }, extra || {});
  const byType = (objs, t) => objs.find((o) => o.type === t);

  // 벽 객체 위치: 벽 이름, 벽을 따라가는 위치(0~1)
  function wallPlace(wall, t, U, w, d) {
    const m = d / 2 + 1;
    if (wall === "far") return { cx: t * U.W, cz: m, rot: 0 };
    if (wall === "near") return { cx: t * U.W, cz: U.D - m, rot: Math.PI };
    if (wall === "left") return { cx: m, cz: t * U.D, rot: Math.PI / 2 };
    return { cx: U.W - m, cz: t * U.D, rot: -Math.PI / 2 };
  }
  function nearestWall(o, U) {
    const d = { left: o.cx, right: U.W - o.cx, far: o.cz, near: U.D - o.cz };
    return Object.keys(d).sort((a, b) => d[a] - d[b])[0];
  }

  /*
   * 품목(구매 리스트 키) → 일반적으로 두는 자리. 이미 있는 가구(objs) 중 호스트가 필요한 품목은 호스트 위에 올린다.
   * ctx: { U, windows:[{wall, w}], door }
   */
  function placeItem(key, objs, ctx) {
    const type = TYPE_OF_ITEM[key], U = ctx.U, regions = [doorRect(U, ctx.door)], dm = DIMS[type];
    const win = (ctx.windows || [])[0];
    const bed = byType(objs, "bed"), sofa = byType(objs, "sofa"), wardrobe = byType(objs, "wardrobe"), desk = byType(objs, "desk"), tv = byType(objs, "tvconsole");
    if (ATTACH[type]) {
      const host = ATTACH[type].map((t) => byType(objs, t)).find(Boolean);
      if (host) {
        const top = HOST_TOP[host.type] || 50;
        if (type === "bedding") return mk(key, type, host.cx, host.cz, host.w, host.d, host.rot, { key, mount: "on", host: host.id, elev: 0, h: 22 });
        if (type === "cushions") { // 소파: 등받이 쪽 / 침대: 머리맡
          const back = { x: -Math.sin(host.rot), z: -Math.cos(host.rot) };
          return mk(key, type, host.cx + back.x * host.d * 0.3, host.cz + back.z * host.d * 0.3, Math.min(host.w * 0.6, 90), 14, host.rot, { key, mount: "on", host: host.id, elev: top, h: 36 });
        }
        const off = type === "desklamp" ? host.w * 0.32 : 0;
        return mk(key, type, host.cx + Math.cos(host.rot) * off, host.cz - Math.sin(host.rot) * off, dm[0], dm[1], host.rot, { key, mount: "on", host: host.id, elev: top });
      }
    }
    if (type === "curtain") {
      const wall = win ? win.wall : "far", ww = win ? Math.min(win.w + 60, wall === "far" ? U.W - 10 : U.D - 10) : 180;
      const p = wallPlace(wall, 0.5, U, ww, 8); return mk(key, type, p.cx, p.cz, ww, 8, p.rot, { key, mount: "wall" });
    }
    if (type === "doorhanger") { const p = wallPlace("near", Math.min(0.9, (ctx.door === "left" ? 0.15 : ctx.door === "center" ? 0.5 : 0.85)), U, 30, 6); return mk(key, type, p.cx, p.cz - 3, 30, 6, p.rot, { key, mount: "wall" }); }
    if (type === "frame" || type === "wallshelf") {
      const anchor = bed || sofa || desk;
      let wall = anchor ? nearestWall(anchor, U) : "far";
      let t = 0.5;
      if (anchor) t = wall === "left" || wall === "right" ? anchor.cz / U.D : anchor.cx / U.W;
      if (type === "wallshelf" && desk) { wall = nearestWall(desk, U); t = wall === "left" || wall === "right" ? desk.cz / U.D : desk.cx / U.W; }
      const p = wallPlace(wall, Math.min(0.9, Math.max(0.1, t)), U, dm[0], dm[1]); return mk(key, type, p.cx, p.cz, dm[0], dm[1], p.rot, { key, mount: "wall" });
    }
    // 바닥 가구: 기준점
    let pref = { x: U.W * 0.5, y: U.D * 0.3 };
    if (type === "nightstand" && bed) { // 머리맡 옆, 문에서 먼 쪽
      const long = bed.d, head = { x: bed.cx + Math.sin(bed.rot + Math.PI) * (long / 2), z: bed.cz + Math.cos(bed.rot + Math.PI) * (long / 2) };
      const side = { x: Math.cos(bed.rot), z: -Math.sin(bed.rot) }, dd = (s) => Math.hypot(head.x + side.x * s * (bed.w / 2 + 25) - doorRect(U, ctx.door).x - 45, head.z + side.z * s * (bed.w / 2 + 25) - (U.D - 45));
      const s = dd(1) > dd(-1) ? 1 : -1; pref = { x: head.x + side.x * s * (bed.w / 2 + 25), y: head.z + side.z * s * (bed.w / 2 + 25) };
    } else if (type === "rugsmall" && bed) pref = { x: bed.cx + Math.cos(bed.rot) * (bed.w / 2 + 60), y: bed.cz - Math.sin(bed.rot) * (bed.w / 2 + 60) };
    else if (type === "rug") { const t = byType(objs, "coffeetable") || bed; if (t) { const o = mk(key, type, t.cx, t.cz, 160, 160, 0, { key }); return o; } }
    else if (type === "sidetable" && sofa) { const side = { x: Math.cos(sofa.rot), z: -Math.sin(sofa.rot) }; const s = (sofa.cz + side.z * sofa.w / 2 < U.D / 2 + 40) ? 1 : -1; pref = { x: sofa.cx + side.x * s * (sofa.w / 2 + 30), y: sofa.cz + side.z * s * (sofa.w / 2 + 30) }; }
    else if (type === "ottoman") { const t = bed || sofa; if (t) { const fwd = { x: Math.sin(t.rot), z: Math.cos(t.rot) }; pref = { x: t.cx + fwd.x * (t.d / 2 + 40), y: t.cz + fwd.z * (t.d / 2 + 40) }; } }
    else if (type === "plant") pref = win ? { x: win.wall === "left" ? 20 : win.wall === "right" ? U.W - 20 : 20, y: win.wall === "far" ? 20 : U.D / 2 } : { x: 20, y: 20 };
    else if (type === "mirror") pref = wardrobe ? { x: wardrobe.cx, y: wardrobe.cz + wardrobe.w / 2 + 40 } : { x: U.W - 20, y: U.D / 2 };
    else if (type === "sideboard") pref = { x: U.W / 2, y: U.D - 20 };
    else if (type === "floorlamp") pref = bed ? { x: bed.cx, y: bed.cz - bed.d / 2 } : win ? { x: win.wall === "left" ? 20 : U.W - 20, y: 25 } : { x: 20, y: 20 };
    else if (type === "armchair") pref = win ? { x: win.wall === "left" ? 40 : U.W - 60, y: 40 } : { x: 40, y: 40 };
    else if (type === "lowbookcase") pref = bed ? { x: bed.cx, y: bed.cz + bed.d / 2 + 25 } : { x: 20, y: U.D / 2 };
    const round = ["rug", "rugsmall", "sidetable", "ottoman", "plant", "floorlamp", "moodlamp"].includes(type);
    const sp = findSpot(dm[0], dm[1], objs, regions, U, pref, round);
    if (!sp) return null;
    const o = mk(key, type, sp.x, sp.z, dm[0], dm[1], round ? 0 : sp.rot, { key });
    if (["sidetable", "ottoman", "plant", "floorlamp", "armchair"].includes(type)) o.rot = sp.rot;
    return o;
  }

  /*
   * 장면 객체 목록 만들기.
   *  basePieces: 처음 가구(없으면 pieces 전체가 가구), pieces: 후보 안의 조각, items: 구매 품목 키(없으면 엔진 조각 중 품목은 제외)
   */
  function buildObjects(o) {
    const U = o.U, ctx = { U, windows: o.windows || [], door: o.door || "right" };
    const baseIds = new Set((o.basePieces || o.pieces).map((p) => p.id));
    const items = o.items || null;
    const keep = [];
    o.pieces.forEach((p) => {
      if (baseIds.has(p.id)) { keep.push(p); return; }
      if (p.kind === "fixed") { keep.push(p); return; }
      const key = ITEM_OF_PIECE[p.id];
      if (!items || (key && (items.includes(key) || (p.id === "rug" && items.includes("rugSmall"))))) keep.push(p);
    });
    const byId = Object.fromEntries(keep.map((p) => [p.id, p]));
    const objs = keep.map((p) => {
      const ob = fromPiece(p, byId, U);
      if (!baseIds.has(p.id) && p.kind !== "fixed") { ob.base = false; ob.key = ITEM_OF_PIECE[p.id]; if (p.id === "rug" && items && !items.includes("rug") && items.includes("rugSmall")) { ob.type = "rugsmall"; ob.key = "rugSmall"; ob.w = 100; ob.d = 150; ob.h = 2; } }
      return ob;
    });
    if (items) {
      const have = new Set(objs.map((x) => x.key).filter(Boolean));
      items.forEach((k) => { if (have.has(k) || !TYPE_OF_ITEM[k]) return; const p = placeItem(k, objs, ctx); if (p) { objs.push(p); have.add(k); } });
    }
    return objs;
  }

  // 간단 점검: 겹침, 문 열림 공간, 방 밖
  function checksOf(objs, U, door) {
    const out = [], solids = objs.filter(isSolid), reg = doorRect(U, door);
    for (let i = 0; i < solids.length; i++) for (let j = i + 1; j < solids.length; j++)
      if (hit(aabb(solids[i]), aabb(solids[j]))) out.push({ level: "error", msg: `${wa(solids[i].label || solids[i].type)} ${iga(solids[j].label || solids[j].type)} 겹쳐요` });
    solids.forEach((o) => { if (hit(aabb(o), reg)) out.push({ level: "warn", msg: `${iga(o.label || o.type)} 문 열림 공간에 있어요` }); });
    objs.forEach((o) => { const a = aabb(o); if (o.mount === "floor" && (a.x < -1 || a.y < -1 || a.x + a.w > U.W + 1 || a.y + a.h > U.D + 1)) out.push({ level: "error", msg: `${iga(o.label || o.type)} 방 밖으로 나가요` }); });
    return out;
  }

  const api = { PAD, DIMS, TYPE_OF_ITEM, TYPE_OF_PIECE, WALL_MOUNT, HOST_TOP, fromPiece, buildObjects, placeItem, findSpot, aabb, isSolid, doorRect, checksOf, wallPlace, nearestWall, norm, rotOf, hit };
  if (typeof module !== "undefined") module.exports = api;
  root.SceneLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
