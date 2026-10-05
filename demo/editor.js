/*
 * 화면 보조 모듈(브라우저 전용): 품목 아이콘·제품 보기·적용 미리보기·예산 올리기 안내·끌어서 배치 편집기.
 * 아이콘은 코드로 그린 일러스트이며 실제 제품 사진이 아니다(실제 사진은 상품 DB/판매처 연동 후 제공).
 */
(function () {
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => n.toLocaleString("ko-KR") + "원";

  /* ---------- 아이콘 (48×48) ---------- */
  const S = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICON = {
    rug: `<ellipse cx="24" cy="28" rx="19" ry="9" fill="currentColor" fill-opacity=".18" ${S}/><ellipse cx="24" cy="28" rx="11" ry="4.5" ${S}/>`,
    rugSmall: `<rect x="8" y="14" width="32" height="22" rx="4" fill="currentColor" fill-opacity=".18" ${S}/><path d="M13 20h22M13 30h22" ${S}/>`,
    lamp: `<path d="M16 6h16l4 12H12z" fill="currentColor" fill-opacity=".2" ${S}/><path d="M24 18v22M16 42h16" ${S}/>`,
    chair: `<path d="M13 22c0-8 22-8 22 0v8H13z" fill="currentColor" fill-opacity=".2" ${S}/><path d="M10 24v10h28V24M15 34v8M33 34v8" ${S}/>`,
    shelf: `<path d="M6 18h36M6 34h36" ${S}/><rect x="12" y="8" width="8" height="10" ${S}/><rect x="24" y="12" width="6" height="6" ${S}/><rect x="14" y="24" width="12" height="10" ${S}/>`,
    nightstand: `<rect x="10" y="14" width="28" height="26" rx="2" fill="currentColor" fill-opacity=".15" ${S}/><path d="M10 27h28M22 21h4M22 34h4M13 40v4M35 40v4" ${S}/>`,
    deskLamp: `<path d="M12 40h18M21 40V24l10-12" ${S}/><path d="M28 8l10 6-6 8z" fill="currentColor" fill-opacity=".2" ${S}/>`,
    bookcase: `<rect x="9" y="6" width="30" height="36" rx="2" ${S}/><path d="M9 18h30M9 30h30M15 6v12M22 18v12M30 30v12" ${S}/>`,
    desk: `<rect x="6" y="14" width="36" height="5" rx="1" fill="currentColor" fill-opacity=".2" ${S}/><path d="M10 19v21M38 19v21M28 19v10h10" ${S}/>`,
    hanger: `<path d="M18 6v10c0 3 12 3 12 0V6M12 18h24v22H12z" ${S}/><path d="M18 26h12M18 33h12" ${S}/>`,
    curtain: `<path d="M6 6h36" ${S}/><path d="M8 8c6 10 6 24 0 34h12c-6-10-6-24 0-34zM40 8c-6 10-6 24 0 34H28c6-10 6-24 0-34z" fill="currentColor" fill-opacity=".2" ${S}/>`,
    cushion: `<rect x="9" y="12" width="30" height="24" rx="6" fill="currentColor" fill-opacity=".2" ${S}/><path d="M14 17l20 14M34 17L14 31" ${S} stroke-opacity=".5"/>`,
    moodLamp: `<path d="M14 34a10 10 0 1 1 20 0z" fill="currentColor" fill-opacity=".25" ${S}/><path d="M12 40h24" ${S}/>`,
    sidetable: `<ellipse cx="24" cy="16" rx="14" ry="5" fill="currentColor" fill-opacity=".2" ${S}/><path d="M24 21v19M15 42h18" ${S}/>`,
    plant: `<path d="M16 32h16l-3 11H19z" fill="currentColor" fill-opacity=".2" ${S}/><path d="M24 32V16M24 24c-9 0-10-10-10-14 7 0 10 6 10 14zM24 20c8 0 10-8 10-12-6 0-10 5-10 12z" ${S}/>`,
    ottoman: `<ellipse cx="24" cy="18" rx="15" ry="6" fill="currentColor" fill-opacity=".2" ${S}/><path d="M9 18v14c0 7 30 7 30 0V18" ${S}/>`,
    frame: `<rect x="8" y="8" width="32" height="32" ${S}/><rect x="13" y="13" width="22" height="22" fill="currentColor" fill-opacity=".15" ${S}/><path d="M13 30l7-8 6 6 4-4 5 6" ${S}/>`,
    bedding: `<rect x="6" y="20" width="36" height="16" rx="3" fill="currentColor" fill-opacity=".2" ${S}/><path d="M6 36v6M42 36v6M6 20v-8h12v8" ${S}/>`,
    mirror: `<ellipse cx="24" cy="22" rx="12" ry="17" fill="currentColor" fill-opacity=".12" ${S}/><path d="M18 14c2-2 5-3 8-3M24 39v6" ${S}/>`,
    cabinet: `<rect x="8" y="10" width="32" height="30" rx="2" fill="currentColor" fill-opacity=".15" ${S}/><path d="M24 10v30M20 25h-2M30 25h-2M12 40v4M36 40v4" ${S}/>`,
    lightSet: `<path d="M4 10c10 12 30 12 40 0" ${S}/><circle cx="12" cy="19" r="2.5" fill="currentColor"/><circle cx="24" cy="23" r="2.5" fill="currentColor"/><circle cx="36" cy="19" r="2.5" fill="currentColor"/>`,
  };
  const icon = (key, px) => `<svg class="ico" viewBox="0 0 48 48" width="${px || 36}" height="${px || 36}" aria-hidden="true" style="color:var(--acc)">${ICON[key] || ICON.cushion}</svg>`;

  /* ---------- 2026 트렌드 태그: 기사 요약에서 확인한 키워드(보그 코리아·오늘의집 등)에 품목을 연결한 것 ---------- */
  const TREND = {
    rug: "워밍 뉴트럴", rugSmall: "워밍 뉴트럴", lamp: "레이어드 조명", moodLamp: "레이어드 조명", lightSet: "레이어드 조명", deskLamp: "레이어드 조명",
    ottoman: "곡선 디자인", sidetable: "곡선 디자인", mirror: "곡선 디자인", plant: "플랜테리어", curtain: "텍스타일", cushion: "어시 컬러", bedding: "텍스타일",
    frame: "대형 아트", shelf: "무타공·공간 맞춤", hanger: "무타공·공간 맞춤", bookcase: "내추럴 우드", desk: "내추럴 우드", nightstand: "내추럴 우드",
    chair: "곡선 디자인", cabinet: "내추럴 우드",
  };

  /* ---------- 제품 보기(모달) ---------- */
  function ensureModal() {
    let m = document.getElementById("itemModal");
    if (!m) {
      m = document.createElement("div"); m.id = "itemModal";
      m.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:50;display:none;align-items:flex-end;justify-content:center";
      m.addEventListener("click", (e) => { if (e.target === m || e.target.closest("[data-closemodal]")) m.style.display = "none"; });
      document.body.appendChild(m);
    }
    return m;
  }
  function showItem(it, links) {
    const m = ensureModal();
    m.innerHTML = `<div style="background:var(--bg);color:var(--fg);width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:16px 16px 0 0;padding:18px">
      <div style="text-align:center">${icon(it.key, 96)}</div>
      <h3 style="margin:6px 0 2px;text-align:center">${esc(it.name)}</h3>
      <p class="mut" style="text-align:center;margin:0">${esc(it.size)}</p>
      <p style="text-align:center;margin:8px 0"><b>${won(it.price[0])} ~ ${won(it.price[1])}</b> <span class="mut">${esc(it.priceNote || "임시 가정 범위")}</span></p>
      ${TREND[it.key] ? `<p style="text-align:center;margin:4px 0"><span class="tag" style="color:var(--acc)">2026 트렌드 · ${esc(TREND[it.key])}</span></p>` : ""}
      <p class="mut">그림은 품목을 설명하는 일러스트예요. 실제 제품 사진·색·모양은 판매처에서 확인하세요(제품 사진 연동은 준비 중).</p>
      <details><summary>직접 하는 방법 · ${esc(it.diff)} · 약 ${it.min}분 · 준비물 ${esc(it.tools)}</summary><ol>${it.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>
      <div class="qlinks" style="margin-top:10px">${(links || it.links || []).map((l, k) => `<a ${k === 0 ? 'class="pri"' : ""} href="${esc(l.url)}" target="_blank" rel="noopener" data-click="${esc(it.key)}" data-m="${esc(l.id || "")}">${esc(l.label)}에서 보기</a>`).join("")}</div>
      <button class="cta ghost" type="button" data-closemodal style="margin-top:10px">닫기</button></div>`;
    m.style.display = "flex";
  }

  /* ---------- 적용 미리보기: 구매 품목을 방 그림(또는 사진 위 표시 자리)에 배치 ---------- */
  const SLOT = { // 100×62 방 그림 안의 [x, y(중심), 크기]
    rug: [50, 50, 24], rugSmall: [22, 52, 18], lamp: [10, 34, 18], chair: [88, 42, 16], shelf: [70, 14, 14], nightstand: [88, 46, 14], deskLamp: [74, 33, 9],
    bookcase: [88, 38, 17], desk: [74, 40, 17], hanger: [96, 20, 10], curtain: [30, 16, 20], cushion: [38, 38, 9], moodLamp: [84, 36, 9], sidetable: [66, 50, 13],
    plant: [94, 50, 14], ottoman: [58, 54, 12], frame: [50, 12, 14], bedding: [50, 40, 22], mirror: [10, 16, 14], cabinet: [92, 38, 16], lightSet: [50, 5, 22],
  };
  function preview(items, o) {
    o = o || {};
    const keys = items.map((i) => i.key);
    const body = (o.photo && o.pins)
      ? keys.filter((k) => o.pins[k]).map((k) => `<span style="position:absolute;left:${o.pins[k].x}%;top:${o.pins[k].y}%;transform:translate(-50%,-50%);background:rgba(255,255,255,.88);border-radius:50%;padding:2px;line-height:0;box-shadow:0 0 0 1px var(--acc)">${icon(k, 30)}</span>`).join("")
      : "";
    if (o.photo && o.pins)
      return `<div style="position:relative;line-height:0"><img src="${esc(o.photo)}" alt="" style="width:100%;border-radius:10px">${body}</div><p class="mut">사진 위에 구매 품목을 놓을 자리에 표시했어요(일러스트, 실제 제품·색은 다를 수 있어요).</p>`;
    // 사진이 없으면 도식 그림은 보여주지 않는다(실제 모습과 달라 오해를 준다). 사진 합성은 AI 이미지 연결 후 제공.
    return `<div class="afterbox">적용 모습 · 준비 중<br>구매 품목 ${keys.length}개를 <b>내 방 사진에 올려 놓은 모습</b>은 AI 이미지 생성을 연결하면 이 자리에 나와요. 지금은 견적서에서 사진 위에 놓을 자리를 표시해 볼 수 있어요.</div>`;
  }

  /* ---------- 간결한 품목 줄 + 제외 항목 + 예산 올리기 ---------- */
  function row(it, over) {
    return `<div class="item${over ? " over" : ""}" style="display:flex;gap:10px;align-items:center;padding:8px 0">
      <button type="button" data-view="${esc(it.key)}" aria-label="${esc(it.name)} 제품 보기" style="border:1px solid var(--line);border-radius:10px;background:var(--card);padding:4px;line-height:0;flex:none">${icon(it.key, 40)}</button>
      <div style="flex:1;min-width:0;word-break:keep-all"><b>${esc(it.name)}</b>${it.tag ? ` <span class="tag" style="color:var(--acc)">${esc(it.tag)}</span>` : ""}
        <div class="meta">${won(it.price[0])}~${won(it.price[1])}${TREND[it.key] ? ` · ${esc(TREND[it.key])}` : ""}</div></div>
      <button type="button" class="cta2" data-view="${esc(it.key)}" style="width:auto;display:inline-block;margin:0;padding:8px 14px;font-size:13px;border:0;cursor:pointer;flex:none;white-space:nowrap">보기</button></div>`;
  }
  // 예산을 올리면 추가할 수 있는 것: 제외 품목을 싼 순으로 단계별 누적(최저가 기준)
  function ladder(purchase, budget) {
    const steps = []; let sum = purchase.total;
    [...purchase.over].sort((a, b) => a.mid - b.mid).forEach((it) => {
      sum += it.mid;
      if (sum > budget) steps.push({ need: Math.ceil(sum / 10000) * 10000, it });
    });
    // 같은 예산 단계로 묶는다
    const g = []; steps.forEach((s) => { const l = g[g.length - 1]; if (l && l.need === s.need) l.names.push(s.it.name); else g.push({ need: s.need, names: [s.it.name] }); });
    return g;
  }
  function more(purchase, budget, attr) {
    if (!purchase.over.length) return "";
    const g = ladder(purchase, budget);
    return `<div class="sug"><b>예산을 올리면 이런 것도 더할 수 있어요</b>
      ${g.map((x) => `<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:4px 0"><span>${x.names.map(esc).join(" · ")}</span><button type="button" class="cta2" style="width:auto;display:inline-block;margin:0;padding:8px 14px;font-size:13px;border:0;cursor:pointer;flex:none;white-space:nowrap" ${attr}="${x.need}">${x.need / 10000}만원으로</button></div>`).join("")}
      <p class="mut">필요 예산은 각 품목의 중간 예상가를 더한 값이에요. 꼭 늘릴 필요는 없어요.</p></div>`;
  }

  /* ---------- 끌어서 배치 편집기 ---------- */
  const PALETTE = [["소파", 200, 95, "furniture"], ["침대", 150, 200, "furniture"], ["책상", 120, 60, "furniture"], ["의자", 55, 55, "furniture"], ["수납장", 80, 40, "furniture"],
    ["협탁", 40, 40, "furniture"], ["러그", 160, 160, "rug"], ["식물", 35, 35, "small"]];
  const NARROW = 60; // 통로로 보는 최소 간격(cm), 일반 기준에 따른 가정값
  const M = 30;
  function rectGap(a, b) {
    const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w)), dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
    return { dx, dy };
  }
  function checks(pieces, U, regions) {
    const out = [], hard = pieces.filter((p) => p.kind !== "rug");
    pieces.forEach((p) => { if (p.x < 0 || p.y < 0 || p.x + p.w > U.W || p.y + p.h > U.D) out.push({ level: "error", msg: `${p.label}이(가) 방 밖으로 나가요` }); });
    for (let i = 0; i < hard.length; i++) for (let j = i + 1; j < hard.length; j++) {
      const g = rectGap(hard[i], hard[j]);
      if (g.dx < 0 && g.dy < 0) out.push({ level: "error", msg: `${hard[i].label}과(와) ${hard[j].label}이(가) 겹쳐요` });
      else if ((g.dx < 0 && g.dy < NARROW && g.dy > 0) || (g.dy < 0 && g.dx < NARROW && g.dx > 0) ) out.push({ level: "warn", msg: `${hard[i].label}–${hard[j].label} 사이가 ${Math.round(Math.max(g.dx, g.dy))}cm로 좁아요(통로는 보통 ${NARROW}cm 이상)` });
    }
    (regions || []).forEach((r) => hard.filter((p) => p.kind !== "fixed").forEach((p) => {
      const g = rectGap(p, r.rect); if (g.dx < 0 && g.dy < 0) out.push({ level: "warn", msg: `${p.label}이(가) ${r.label} 안에 있어요` });
    }));
    const used = hard.reduce((s, p) => s + p.w * p.h, 0) / (U.W * U.D);
    if (used > 0.55) out.push({ level: "warn", msg: `가구가 바닥의 ${Math.round(used * 100)}%를 차지해요(답답해 보일 수 있어요)` });
    if (!out.length) out.push({ level: "ok", msg: "겹침·통로 문제 없음(간단 점검)" });
    return out;
  }
  function open(cand, room, onSave) {
    const U = cand.usable || { W: room.W, D: room.D }, s = Math.min(300 / U.W, 340 / U.D), px = (v) => Math.round(v * s * 10) / 10;
    let P = cand.pieces.map((p) => Object.assign({}, p)), sel = -1, drag = null, n = 0;
    const m = ensureModal(); const vw = px(U.W) + M * 2, vh = px(U.D) + M * 2;
    function draw() {
      const g = P.map((p, i) => {
        const x = M + px(p.x), y = M + px(p.y), w = px(p.w), h = px(p.h), on = i === sel;
        if (p.kind === "fixed") return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="var(--line)" stroke="var(--fg)" stroke-dasharray="2 2"/><text x="${x + w / 2}" y="${y + h / 2 + 3}" font-size="8" text-anchor="middle" fill="var(--fg)">기둥</text></g>`;
        const shape = p.kind === "rug" ? `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--acc)" fill-opacity=".15" stroke="var(--acc)" stroke-dasharray="4 3"/>`
          : `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--card)" stroke="${on ? "var(--acc)" : "var(--fg)"}" stroke-width="${on ? 3 : 1}"/>`;
        return `<g data-i="${i}" style="cursor:grab;touch-action:none">${shape}<text x="${x + w / 2}" y="${y + h / 2 + 3}" font-size="9" text-anchor="middle" fill="var(--fg)" pointer-events="none">${esc(p.label)}</text></g>`;
      }).join("");
      const rg = (cand.regions || []).map((r) => `<rect x="${M + px(r.rect.x)}" y="${M + px(r.rect.y)}" width="${px(r.rect.w)}" height="${px(r.rect.h)}" fill="none" stroke="var(--acc)" stroke-dasharray="3 3" pointer-events="none"/>`).join("");
      document.getElementById("edSvg").innerHTML = `<rect x="${M}" y="${M}" width="${px(U.W)}" height="${px(U.D)}" fill="none" stroke="var(--fg)" stroke-width="2"/>${rg}${g}`;
      document.getElementById("edChk").innerHTML = checks(P, U, cand.regions).map((k) => `<li class="${k.level}">${esc(k.msg)}</li>`).join("");
      document.getElementById("edSel").textContent = sel >= 0 ? `선택: ${P[sel].label} (${P[sel].w}×${P[sel].h}cm)` : "가구를 끌어서 옮기고, 눌러서 선택하세요";
    }
    m.innerHTML = `<div style="background:var(--bg);color:var(--fg);width:100%;max-width:560px;max-height:94vh;overflow:auto;border-radius:16px 16px 0 0;padding:14px">
      <h3 style="margin:0 0 6px">끌어서 직접 배치 <span class="mut">(${esc(cand.id)}안에서 시작)</span></h3>
      <svg id="edSvg" viewBox="0 0 ${vw} ${vh}" style="width:100%;touch-action:none;background:var(--card);border-radius:10px"></svg>
      <p class="mut" id="edSel"></p>
      <div class="row seg"><button type="button" data-ed="rot">회전</button><button type="button" data-ed="del">삭제</button><button type="button" data-ed="reset">처음으로</button></div>
      <div class="mut" style="margin-top:6px">추가</div><div class="row seg" id="edPal">${PALETTE.map((p, i) => `<button type="button" data-add="${i}">+ ${p[0]}</button>`).join("")}</div>
      <ul class="chk" id="edChk"></ul>
      <p class="mut">간단 점검이에요(겹침·방 밖·통로 ${NARROW}cm·열림 반경). 실제 치수는 줄자로 확인하세요.</p>
      <div class="row"><button class="cta" type="button" data-ed="save">이 배치로 견적서 받기</button><button class="cta ghost" type="button" data-closemodal>닫기</button></div></div>`;
    m.style.display = "flex"; draw();
    const svgEl = document.getElementById("edSvg");
    const pt = (e) => { const p = svgEl.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svgEl.getScreenCTM().inverse()); return { x: (q.x - M) / s, y: (q.y - M) / s }; };
    const snap = (v) => Math.round(v / 5) * 5;
    svgEl.addEventListener("pointerdown", (e) => {
      const g = e.target.closest("[data-i]"); if (!g) { sel = -1; draw(); return; }
      sel = Number(g.dataset.i); const q = pt(e); drag = { dx: q.x - P[sel].x, dy: q.y - P[sel].y };
      svgEl.setPointerCapture(e.pointerId); draw();
    });
    svgEl.addEventListener("pointermove", (e) => {
      if (!drag || sel < 0) return; const q = pt(e), p = P[sel];
      p.x = snap(Math.min(Math.max(q.x - drag.dx, 0), U.W - p.w)); p.y = snap(Math.min(Math.max(q.y - drag.dy, 0), U.D - p.h)); draw();
    });
    const end = () => { drag = null; }; svgEl.addEventListener("pointerup", end); svgEl.addEventListener("pointercancel", end);
    m.onclick = (e) => {
      if (e.target === m || e.target.closest("[data-closemodal]")) { m.style.display = "none"; m.onclick = null; return; }
      const a = e.target.closest("[data-add]");
      if (a) { const [label, w, h, kind] = PALETTE[Number(a.dataset.add)]; n++; P.push({ id: "u" + n, label, x: snap((U.W - w) / 2), y: snap((U.D - h) / 2), w, h, kind }); sel = P.length - 1; draw(); return; }
      const b = e.target.closest("[data-ed]"); if (!b) return; const k = b.dataset.ed;
      if (k === "rot" && sel >= 0 && P[sel].kind !== "fixed") { const p = P[sel], t = p.w; p.w = p.h; p.h = t; p.x = Math.min(p.x, Math.max(0, U.W - p.w)); p.y = Math.min(p.y, Math.max(0, U.D - p.h)); draw(); }
      else if (k === "del" && sel >= 0 && P[sel].kind !== "fixed") { P.splice(sel, 1); sel = -1; draw(); }
      else if (k === "reset") { P = cand.pieces.map((p) => Object.assign({}, p)); sel = -1; draw(); }
      else if (k === "save") { m.style.display = "none"; m.onclick = null; onSave(P.map((p) => Object.assign({}, p))); }
    };
  }

  const api = { icon, ICON, TREND, showItem, preview, row, more, ladder, open, checks };
  if (typeof window !== "undefined") window.Editor = api;
  if (typeof module !== "undefined") module.exports = api;
})();
