/*
 * 사진 위에 제품을 끌어놓는 꾸미기 화면(브라우저 전용).
 * 제품 이미지(items/*.jpg)는 흰 배경의 AI 생성 일러스트이며 실제 판매 제품 사진이 아니다.
 * 흰 배경은 mix-blend-mode: multiply 로 사진 위에서 투명하게 보이게 한다.
 */
(function () {
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 기본 배치: 100×62 방 그림 기준 [x, y(중심), 너비] → 사진 기준 %
  const SLOT = {
    rug: [50, 50, 24], rugSmall: [22, 52, 18], lamp: [10, 34, 18], chair: [88, 42, 16], shelf: [70, 14, 14], nightstand: [88, 46, 14], deskLamp: [74, 33, 9],
    bookcase: [88, 38, 17], desk: [74, 40, 17], hanger: [96, 20, 10], curtain: [30, 16, 20], cushion: [38, 38, 9], moodLamp: [84, 36, 9], sidetable: [66, 50, 13],
    plant: [94, 50, 14], ottoman: [58, 54, 12], frame: [50, 12, 14], bedding: [50, 40, 22], mirror: [10, 16, 14], cabinet: [92, 38, 16], lightSet: [50, 5, 22],
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const place = (key, pin) => { const s = SLOT[key] || [50, 40, 14]; return { key, x: pin ? pin.x : s[0], y: pin ? pin.y : Math.min(90, s[1] / 62 * 100), s: Math.round(s[2] * 1.8) }; };

  function sheet() {
    let m = document.getElementById("boardModal");
    if (!m) {
      m = document.createElement("div"); m.id = "boardModal";
      m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:60;display:none;align-items:flex-end;justify-content:center;user-select:none;-webkit-user-select:none";
      document.body.appendChild(m);
    }
    return m;
  }

  /* opts: { photo, names:{key:{name,price:[lo,hi]}}, items:[key...], pins:{key:{x,y}}, compose:async(items)=>dataUrl, onSave(items) } */
  function open(opts) {
    const m = sheet(), names = opts.names || {};
    let P = (opts.items || []).map((k) => place(k, (opts.pins || {})[k])), sel = -1, drag = null, aspect = 1.5;
    m.innerHTML = `<div style="background:var(--bg);color:var(--fg);width:100%;max-width:640px;max-height:96vh;overflow:auto;border-radius:16px 16px 0 0;padding:12px;user-select:none;-webkit-user-select:none">
      <h3 style="margin:0 0 6px">사진 위에 끌어서 꾸며보기</h3>
      <div id="bdStage" style="position:relative;width:100%;aspect-ratio:3/2;overflow:hidden;border-radius:10px;isolation:isolate;touch-action:none;background:#ddd">
        <img id="bdPhoto" src="${esc(opts.photo)}" alt="방 사진" draggable="false" style="position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none"></div>
      <p class="mut" id="bdHint" style="margin:6px 0">제품을 끌어서 옮기고, 눌러서 선택한 뒤 크기를 조절하거나 지울 수 있어요.</p>
      <div class="row seg"><button type="button" data-bd="small">− 작게</button><button type="button" data-bd="big">+ 크게</button><button type="button" data-bd="del" id="bdDel">✕ 선택한 제품 지우기</button></div>
      <div class="mut" style="margin-top:8px">놓은 제품 <span style="font-size:12px">(✕를 누르면 지워요)</span></div><div class="row seg" id="bdPlaced"></div>
      <div class="mut" style="margin-top:8px">더하기 <span style="font-size:12px">(누르면 사진에 놓여요)</span></div><div class="row seg" id="bdPalette"></div>
      <div id="bdOut"></div>
      <p class="mut">제품 그림은 AI가 그린 예시 일러스트예요. 실제 판매 제품의 모양·색·크기와 달라요. 실제 상품은 구매 리스트의 판매처에서 확인하세요.</p>
      <div class="row"><button class="cta" type="button" data-bd="save">이 배치 저장하기</button>${opts.compose ? '<button class="cta ghost" type="button" data-bd="ai">AI로 실제 모습 만들기</button>' : ""}<button class="cta ghost" type="button" data-bd="close">닫기</button></div></div>`;
    m.style.display = "flex";
    const stage = m.querySelector("#bdStage"), photo = m.querySelector("#bdPhoto");
    const im = new Image(); im.onload = () => { aspect = im.naturalWidth / im.naturalHeight; stage.style.aspectRatio = aspect + ""; }; im.src = opts.photo;

    function draw() {
      stage.querySelectorAll(".bdit").forEach((n) => n.remove());
      P.forEach((p, i) => {
        const el = document.createElement("img"); el.className = "bdit"; el.dataset.i = i; el.draggable = false;
        el.src = "items/" + p.key + ".jpg"; el.alt = (names[p.key] || {}).name || p.key;
        el.style.cssText = `position:absolute;left:${p.x}%;top:${p.y}%;width:${p.s}%;height:auto;transform:translate(-50%,-50%);mix-blend-mode:multiply;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;${i === sel ? "outline:2px dashed var(--acc);outline-offset:2px;" : ""}`;
        el.onerror = () => { el.style.display = "none"; };
        stage.appendChild(el);
      });
      m.querySelector("#bdDel").disabled = sel < 0;
      m.querySelector("#bdPlaced").innerHTML = P.length ? P.map((p, i) => `<button type="button" data-rm="${i}" aria-pressed="${i === sel}">${esc((names[p.key] || {}).name || p.key)} ✕</button>`).join("") : '<span class="mut">아직 없어요</span>';
      const used = new Set(P.map((p) => p.key));
      m.querySelector("#bdPalette").innerHTML = Object.keys(SLOT).filter((k) => !used.has(k)).map((k) => `<button type="button" data-add="${k}">+ ${esc((names[k] || {}).name || k)}</button>`).join("") || '<span class="mut">모두 놓았어요</span>';
    }
    draw();

    const pt = (e) => { const r = stage.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 }; };
    stage.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const el = e.target.closest(".bdit");
      if (!el) { sel = -1; draw(); return; }
      sel = Number(el.dataset.i); const q = pt(e); drag = { dx: q.x - P[sel].x, dy: q.y - P[sel].y };
      try { stage.setPointerCapture(e.pointerId); } catch (err) {} draw();
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag || sel < 0) return; e.preventDefault();
      const q = pt(e); P[sel].x = clamp(Math.round((q.x - drag.dx) * 10) / 10, 0, 100); P[sel].y = clamp(Math.round((q.y - drag.dy) * 10) / 10, 0, 100);
      const el = stage.querySelector(`.bdit[data-i="${sel}"]`); if (el) { el.style.left = P[sel].x + "%"; el.style.top = P[sel].y + "%"; }
    });
    const end = () => { drag = null; }; stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);

    const items = () => P.map((p) => ({ key: p.key, x: p.x, y: p.y, s: p.s }));
    m.onclick = async (e) => {
      if (e.target === m) { m.style.display = "none"; m.onclick = null; return; }
      const rm = e.target.closest("[data-rm]"); if (rm) { const i = Number(rm.dataset.rm); if (e.target.closest("button") ) { P.splice(i, 1); sel = -1; draw(); } return; }
      const add = e.target.closest("[data-add]"); if (add) { P.push(place(add.dataset.add)); sel = P.length - 1; draw(); return; }
      const b = e.target.closest("[data-bd]"); if (!b) return; const k = b.dataset.bd;
      if (k === "big" && sel >= 0) { P[sel].s = Math.min(90, Math.round(P[sel].s * 1.15)); draw(); }
      else if (k === "small" && sel >= 0) { P[sel].s = Math.max(4, Math.round(P[sel].s / 1.15)); draw(); }
      else if (k === "del" && sel >= 0) { P.splice(sel, 1); sel = -1; draw(); }
      else if (k === "close") { m.style.display = "none"; m.onclick = null; }
      else if (k === "save") { m.style.display = "none"; m.onclick = null; opts.onSave(items()); }
      else if (k === "ai") {
        const out = m.querySelector("#bdOut"); out.innerHTML = '<p class="mut">AI가 이 배치대로 실제 모습을 만드는 중이에요(약 10~30초)…</p>';
        try { const src = await opts.compose(items()); out.innerHTML = `<div style="position:relative;line-height:0"><img src="${src}" alt="AI 적용 예시" style="width:100%;aspect-ratio:${aspect};object-fit:fill;border-radius:10px"><span style="position:absolute;right:8px;bottom:8px;background:rgba(0,0,0,.55);color:#fff;border-radius:6px;padding:2px 6px;font-size:12px;line-height:1.4">✦ AI 생성</span></div><p class="mut">AI가 만든 예시예요. 실제 제품과 다를 수 있고 위치도 정확하지 않을 수 있어요.</p>`; }
        catch (err) { out.innerHTML = `<p class="mut">${esc(err.message)} 잠시 후 다시 시도해주세요.</p>`; }
      }
    };
  }

  const api = { open, place, SLOT };
  if (typeof window !== "undefined") window.Board = api;
  if (typeof module !== "undefined") module.exports = api;
})();
