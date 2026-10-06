/*
 * 결과 화면용 3D 보기 도우미: 엔진 결과(후보 안) → 장면 객체 → Before/After 정면·위에서 본 이미지.
 * 의존: layout.js(LayoutEngine), scene_logic.js, scene3d.js(three.js 필요). three.js가 없으면 null을 돌려준다.
 */
(function (root) {
  const E = root.LayoutEngine, L = root.SceneLogic;
  const ok = () => !!(root.Scene3D && L && E);
  const ROOM_ADD = {
    living: ["rug", "lamp", "chair", "curtain", "cushion", "moodLamp", "sidetable", "plant", "ottoman", "frame", "lightSet", "cabinet"],
    master: ["bedding", "nightstand", "rugSmall", "lamp", "curtain", "mirror", "moodLamp", "plant", "lightSet", "cabinet", "frame", "ottoman", "chair"],
    small: ["desk", "chair", "deskLamp", "bookcase", "shelf", "rugSmall", "curtain", "bedding", "hanger", "plant", "mirror", "frame", "moodLamp", "nightstand"],
    room: ["bedding", "nightstand", "desk", "chair", "deskLamp", "rugSmall", "curtain", "shelf", "hanger", "mirror", "plant", "moodLamp", "lightSet", "cabinet", "frame"],
  };
  const NAMES = { bed: "침대", wardrobe: "옷장", sofa: "소파", tvconsole: "TV장", coffeetable: "커피테이블", desk: "책상", nightstand: "협탁", pillar: "기둥", rug: "러그", floorlamp: "플로어 램프", armchair: "1인 의자", lowbookcase: "낮은 책장" };

  function ctxOf(opts, U) {
    const wsz = (E.WIN_SIZES[opts.view.winSize] || E.WIN_SIZES.md).w;
    return { U, windows: (opts.view.windows || []).map((w) => ({ wall: w, w: wsz })), door: opts.view.door || "right" };
  }
  const labelAll = (objs, names) => objs.map((o) => Object.assign(o, { label: o.key ? ((names[o.key] || {}).name || o.key) : (NAMES[o.type] || o.type) }));

  // 지금 배치(Before)
  function before(r, opts, names) {
    const cur = E.currentScene(r, opts), ctx = ctxOf(opts, cur.usable);
    return { cur, ctx, objs: labelAll(L.buildObjects({ U: ctx.U, pieces: cur.pieces, items: null, windows: ctx.windows, door: ctx.door }), names || {}) };
  }
  // 후보 안(After): 구매 품목 키 목록이 있으면 그 품목만 둔다
  function after(c, b, keys, names) {
    return labelAll(L.buildObjects({ U: b.ctx.U, pieces: c.pieces, basePieces: b.cur.pieces, items: keys, windows: b.ctx.windows, door: b.ctx.door }), names || {});
  }
  const keysOf = (objs) => objs.filter((o) => !o.base && o.key && o.mount !== undefined).map((o) => o.key);

  function pairHtml(b, afterObjs, ctx, w, h) {
    if (!ok()) return "";
    const room = { U: ctx.U, windows: ctx.windows, door: ctx.door }, S = root.Scene3D, fig = (src, cap, alt) => `<figure style="margin:0"><img src="${src}" alt="${alt}" style="width:100%;border-radius:8px;display:block"><figcaption class="mut" style="font-size:12px;text-align:center">${cap}</figcaption></figure>`;
    try {
      return `<div class="v3"><div class="v3row">${fig(b.front || (b.front = S.snapshot(room, b.objs, "front", w || 480, h || 360)), "Before · 지금 (문에서 본 모습)", "Before 정면")}${fig(S.snapshot(room, afterObjs, "front", w || 480, h || 360), "After · 추천 배치", "After 정면")}</div>
        <div class="v3row" style="margin-top:6px">${fig(b.top || (b.top = S.snapshot(room, b.objs, "top", w || 480, h || 360)), "Before · 위에서 본 모습", "Before 위에서")}${fig(S.snapshot(room, afterObjs, "top", w || 480, h || 360), "After · 위에서 본 모습", "After 위에서")}</div>
        <p class="mut" style="font-size:12px;margin:6px 0 0"><span style="display:inline-block;width:10px;height:10px;background:#ff9a3c;opacity:.7;vertical-align:middle"></span> 주황색은 문이 열리는 공간이에요. 이곳에는 가구를 두지 마세요. 모양은 단순하게 그린 예시예요.</p></div>`;
    } catch (e) { return ""; }
  }
  root.Views3D = { ok, ctxOf, before, after, keysOf, pairHtml, ROOM_ADD, labelAll };
})(typeof window !== "undefined" ? window : globalThis);
