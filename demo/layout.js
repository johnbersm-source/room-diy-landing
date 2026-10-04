/*
 * 셀프 인테리어 배치 후보 엔진 (프로토타입, 순수 JS, 의존성 없음).
 *
 * 기준 좌표(실제 방): x = 입구에서 본 왼쪽→오른쪽, y = 맞은편 벽(0) → 입구 벽(D).
 *   즉 "문을 열고 들어서서 사진을 찍는 위치"가 기준이다. 창은 어느 벽에 있어도 된다.
 * 내부 계산은 큰 가구(소파/침대)가 놓인 벽을 왼쪽으로 돌린 "정규 좌표"에서 하고, 결과를 실제 좌표로 되돌린다.
 *
 * 안전 여유(실제 적용 가능성을 높이기 위한 보수적 계산):
 *  - 방은 입력값의 ROOM_SHRINK 배로 줄여서 계산 (걸레받이·측정오차 대비)
 *  - 모든 가구는 한 변당 PAD cm 더 큰 크기로 계산 (문 열림·손 닿는 여유)
 * 면적→방 크기, 가구 크기, 허용 간격, 가격 범위는 일반적 가정값이며 실측/공식 기준이 아니다.
 */
(function (root) {
  const PAD = 10;
  const ROOM_SHRINK = 0.97;
  const PYEONG = 3.3058;

  /* ---------- 집 종류 3가지와 크기 선택지 ----------
   * 공급평형↔전용면적: 아파트 전용 19/33/45/59/74/84/114㎡ ≈ 9/15/20/25/30/34/43평형(조사 자료).
   * 방 크기 기준점: 30평형(전용 74㎡) 거실 약 390×430, 안방 약 340×330, 작은방 약 300×300cm
   *   (커뮤니티 글 기반 가정) 를 기준으로 면적 비의 제곱근으로 줄이고 늘린다. */
  const HOUSING = [
    { id: "apt", label: "아파트", desc: "공급평형(분양 때 부르는 평수)으로 골라요", targets: ["living", "master", "small"],
      areas: [
        { sqm: 20, label: "9평형", desc: "아주 작은 소형(방 1)" },
        { sqm: 33, label: "15평형", desc: "소형(방 1~2)" },
        { sqm: 45, label: "20평형", desc: "방 2 + 작은 거실" },
        { sqm: 59, label: "24~25평형", desc: "방 2~3 + 거실. 흔히 24평형이라 불러요" },
        { sqm: 74, label: "30평형", desc: "방 3 + 거실" },
        { sqm: 84, label: "32~34평형", desc: "국민평형. 방 3 + 거실" },
        { sqm: 114, label: "43평형", desc: "넓은 평형. 방 4 안팎" },
      ] },
    { id: "villa", label: "빌라·다세대·연립", desc: "4층 이하 공동주택(전용면적으로 골라요)", targets: ["living", "master", "small"],
      areas: [
        { sqm: 25, label: "전용 25㎡", desc: "소형. 원룸~1.5룸" },
        { sqm: 33, label: "전용 33㎡", desc: "1.5룸~투룸" },
        { sqm: 45, label: "전용 45㎡", desc: "투룸" },
        { sqm: 59, label: "전용 59㎡", desc: "투룸~쓰리룸" },
        { sqm: 75, label: "전용 75㎡", desc: "쓰리룸" },
      ] },
    { id: "studio", label: "원룸·오피스텔", desc: "방 하나에 침대·책상·옷장이 같이 있어요", targets: ["room"],
      areas: [
        { sqm: 15, label: "전용 15㎡", desc: "아주 작은 원룸" },
        { sqm: 20, label: "전용 20㎡", desc: "일반적인 원룸형" },
        { sqm: 26, label: "전용 26㎡", desc: "넉넉한 원룸 / 1.5룸형" },
        { sqm: 33, label: "전용 33㎡", desc: "큰 원룸 / 소형 오피스텔" },
        { sqm: 40, label: "전용 40㎡", desc: "소형 오피스텔의 상한(40㎡ 이하)" },
        { sqm: 50, label: "전용 50㎡", desc: "방 2개 구분이 가능한 크기" },
      ] },
  ];
  HOUSING.forEach((h) => h.areas.forEach((a) => { a.id = h.id + a.sqm; a.pyeong = Math.round(a.sqm / PYEONG * 10) / 10; }));

  const TARGETS = {
    living: { label: "거실", desc: "소파·TV 중심 공간", anchor: [390, 430] },
    master: { label: "안방", desc: "큰 침대와 옷장 중심", anchor: [340, 330] },
    small: { label: "작은방", desc: "아이방·서재. 침대와 책상", anchor: [300, 300] },
    room: { label: "방 전체", desc: "침대·책상·옷장이 한 방에", anchor: null },
  };
  const SHAPES = [
    { id: "std", label: "일반적인 방", desc: "가로세로가 무난한 보통 형태" },
    { id: "sq", label: "정사각형에 가까움", desc: "가로세로가 거의 같은 방" },
    { id: "long", label: "길쭉한 방", desc: "한쪽이 긴 직사각형(복도형·좁고 긴 방)" },
  ];
  const SHAPE_RATIO = { sq: 1.0, long: 0.62 }; // 가로/세로. std는 기준점 비율

  function roomFor(housingId, areaId, target, shape) {
    const h = HOUSING.find((x) => x.id === housingId);
    const a = h.areas.find((x) => x.id === areaId);
    const t = TARGETS[target] ? target : h.targets[0];
    let W, D;
    if (t === "room") {
      const area = a.sqm * 0.65 * 10000;
      const ratio = shape === "sq" ? SHAPE_RATIO.sq : shape === "long" ? SHAPE_RATIO.long : 0.72;
      W = Math.sqrt(area * ratio); D = area / W;
    } else {
      const f = Math.sqrt(a.sqm / 74);
      const [aw, ad] = TARGETS[t].anchor;
      W = aw * f; D = ad * f;
      if (shape && shape !== "std") {
        const area = W * D, ratio = SHAPE_RATIO[shape];
        W = Math.sqrt(area * ratio); D = area / W;
      }
    }
    const r10 = (v) => Math.round(v / 10) * 10;
    return { W: Math.max(200, r10(W)), D: Math.max(250, r10(D)), sqm: a.sqm, pyeong: a.pyeong, target: t, shape: shape || "std" };
  }

  /* ---------- 가구 크기 선택지 (보편 규격, 출처: docs/RESEARCH_housing_and_monetization.md) ---------- */
  const SIZE_OPTIONS = {
    sofa: [{ id: "s2", label: "2인용", v: 150 }, { id: "s3", label: "3인용", v: 200 }, { id: "s4", label: "4인용", v: 240 }],
    tv: [{ id: "t12", label: "소형 장", v: 120 }, { id: "t18", label: "중형 장", v: 180 }, { id: "t24", label: "대형 장", v: 240 }],
    table: [{ id: "tb1", label: "작은 테이블", w: 50, l: 90 }, { id: "tb2", label: "보통 테이블", w: 60, l: 120 }, { id: "tb3", label: "큰 테이블", w: 75, l: 150 }],
    bed: [{ id: "S", label: "싱글", v: 100 }, { id: "SS", label: "슈퍼싱글", v: 110 }, { id: "D", label: "더블", v: 140 },
          { id: "Q", label: "퀸", v: 150 }, { id: "K", label: "킹", v: 160 }],
    desk: [{ id: "d0", label: "책상 없음", v: 0 }, { id: "d10", label: "소형", v: 100 }, { id: "d12", label: "보통", v: 120 }, { id: "d14", label: "큰 책상", v: 140 }],
    ward: [{ id: "w8", label: "작은 옷장", v: 80 }, { id: "w12", label: "보통 옷장", v: 120 }, { id: "w16", label: "큰 옷장", v: 160 }],
  };
  const DEFAULT_SIZES = { sofa: 200, tvL: 180, tableW: 60, tableL: 120, bed: 100, ward: 80, desk: 120 };
  // 공간별 기본 가구 구성
  const TARGET_DEFAULTS = {
    living: {},
    master: { bed: 150, ward: 120, desk: 0 },
    small: { bed: 110, ward: 80, desk: 120 },
    room: { bed: 100, ward: 80, desk: 120 },
  };

  /* ---------- 입구에서 본 모습 선택지 ---------- */
  const WALLS = { far: "맞은편 벽", left: "왼쪽 벽", right: "오른쪽 벽" };
  const BIG_WALLS = { left: "왼쪽 벽", right: "오른쪽 벽", far: "맞은편 벽", near: "입구가 있는 벽" };
  const DOOR_POS = { left: "입구 벽의 왼쪽", center: "입구 벽의 가운데", right: "입구 벽의 오른쪽" };
  const WIN_SIZES = { sm: { label: "작은 창", w: 90 }, md: { label: "보통 창", w: 150 }, lg: { label: "통창·큰 발코니창", w: 240 } };
  const OBSTACLES = { none: { label: "없음", s: 0 }, pillar: { label: "기둥·작은 돌출", s: 45 }, notch: { label: "큰 돌출·ㄱ자 모서리", s: 120 } };
  const CORNERS = { fl: "맞은편 왼쪽 모서리", fr: "맞은편 오른쪽 모서리", nl: "입구 쪽 왼쪽 모서리", nr: "입구 쪽 오른쪽 모서리" };
  const DEFAULT_VIEW = { windows: ["far"], bigWall: "left", door: "right", winSize: "md", obstacle: { size: "none", corner: "fl" } };

  const FIXED_PROMPT =
    "방의 벽·창문·바닥·천장과 언급되지 않은 기존 가구는 원본 그대로 유지한다. " +
    "방 사진의 카메라 각도·원근을 유지하고 조명 방향·색온도에 맞춰 그림자·하이라이트를 렌더링한다. " +
    "참고 이미지의 배경·워터마크·로고·텍스트는 포함하지 않는다. 상품의 실제 크기 비율을 방 크기에 맞게 사실적으로 조정한다.";

  /* ---------- 구매 연결(판매처) ----------
   * 지금은 모두 수수료가 없는 검색 링크(임시). 제휴 프로그램 조건·수수료는 docs/RESEARCH_housing_and_monetization.md 참고. */
  const MERCHANTS = [
    { id: "coupang", label: "쿠팡", url: (q) => "https://www.coupang.com/np/search?q=" + encodeURIComponent(q) },
    { id: "naver", label: "네이버쇼핑", url: (q) => "https://search.shopping.naver.com/search/all?query=" + encodeURIComponent(q) },
    { id: "ohou", label: "오늘의집", url: (q) => "https://ohou.se/productions/feed?query=" + encodeURIComponent(q) },
  ];

  // 구매 품목 (가격은 임의 가정 범위 — 상품 연결 후 실제 가격으로 대체)
  const ITEM = {
    rug: { name: "라운드 러그", size: "지름 160cm", price: [30000, 80000], diff: "쉬움", min: 10, tools: "없음", keyword: "라운드 러그 160",
      steps: ["바닥 먼지를 닦는다", "테이블 중앙에 오도록 펴서 놓는다", "미끄럼 방지 패드를 깐다(권장)"] },
    rugSmall: { name: "소형 러그(침대 옆)", size: "약 100×150cm", price: [20000, 50000], diff: "쉬움", min: 10, tools: "없음", keyword: "러그 100x150 침실",
      steps: ["침대 옆 바닥을 닦는다", "침대 발이 러그 가장자리에 오도록 놓는다", "미끄럼 방지 패드를 깐다(권장)"] },
    lamp: { name: "플로어 램프", size: "높이 150~165cm, 받침 지름 35cm 이하", price: [25000, 70000], diff: "쉬움", min: 5, tools: "없음", keyword: "플로어 램프 스탠드 조명",
      steps: ["콘센트 위치를 확인한다", "받침을 조립하고 전구를 끼운다", "벽·가구와 10cm 이상 띄운다"] },
    chair: { name: "1인 의자", size: "폭 75cm 이하", price: [50000, 150000], diff: "쉬움", min: 20, tools: "드라이버(조립 시)", keyword: "1인 암체어 1인용 소파",
      steps: ["상자를 열고 다리를 조립한다", "창가에 놓고 문 열림 반경을 확인한다"] },
    shelf: { name: "무타공 선반", size: "폭 60~80cm", price: [10000, 30000], diff: "쉬움", min: 15, tools: "없음", tag: "무타공", keyword: "무타공 선반",
      steps: ["붙일 벽을 알코올로 닦는다", "수평을 맞춰 붙이고 24시간 두었다 올린다", "허용 하중을 확인한다"] },
    nightstand: { name: "협탁", size: "가로·세로 40cm 안팎", price: [20000, 60000], diff: "쉬움", min: 20, tools: "드라이버", keyword: "협탁 침대 사이드테이블",
      steps: ["조립해서 침대 옆에 놓는다", "충전선 위치를 확인한다"] },
    deskLamp: { name: "책상용 스탠드", size: "클램프/받침형", price: [15000, 40000], diff: "쉬움", min: 5, tools: "없음", keyword: "LED 책상 스탠드",
      steps: ["책상 모서리에 고정한다", "눈높이보다 아래로 빛을 향하게 한다"] },
    bookcase: { name: "낮은 책장", size: "폭 80cm, 깊이 30cm, 높이 90cm 이하", price: [40000, 100000], diff: "보통", min: 40, tools: "드라이버, 고무망치", keyword: "낮은 책장 수납장 80cm",
      steps: ["부품을 확인하고 조립한다", "벽 전도 방지 고정구를 사용한다(임대는 무타공 제품)", "침대 발치에 둔다"] },
    desk: { name: "소형 책상", size: "폭 100cm, 깊이 50cm", price: [50000, 120000], diff: "보통", min: 40, tools: "드라이버", keyword: "소형 책상 100cm",
      steps: ["조립해서 창 밑에 놓는다", "의자 빼는 공간 90cm를 확인한다"] },
    hanger: { name: "문걸이 수납", size: "문 두께 호환 확인", price: [10000, 30000], diff: "쉬움", min: 5, tools: "없음", tag: "무타공", keyword: "도어 행거 문걸이",
      steps: ["문 두께를 잰다", "걸어서 사용한다(못 불필요)"] },
    // 예산이 넉넉할 때 이어서 담는 추가 품목
    curtain: { name: "암막 커튼", size: "창 폭의 1.5~2배", price: [30000, 90000], diff: "쉬움", min: 20, tools: "없음(커튼봉이 있을 때)", keyword: "암막 커튼",
      steps: ["창 폭·높이를 잰다", "규격에 맞는 제품을 고른다", "기존 커튼봉에 건다(봉이 없으면 압축봉)"] },
    cushion: { name: "쿠션 세트", size: "45cm 안팎 2~4개", price: [20000, 50000], diff: "쉬움", min: 3, tools: "없음", keyword: "쿠션 커버 세트",
      steps: ["색을 기존 가구와 맞춘다", "소파·침대에 놓는다"] },
    moodLamp: { name: "무드등", size: "탁상형", price: [15000, 40000], diff: "쉬움", min: 3, tools: "없음", keyword: "무드등 탁상 조명",
      steps: ["콘센트·충전 방식을 확인한다", "협탁이나 선반 위에 둔다"] },
    sidetable: { name: "사이드 테이블", size: "지름 40~50cm", price: [30000, 80000], diff: "쉬움", min: 15, tools: "드라이버", keyword: "사이드 테이블 원형",
      steps: ["조립한다", "소파 옆 여유 공간에 놓는다"] },
    plant: { name: "화분(인조/생화)", size: "높이 60~100cm", price: [10000, 40000], diff: "쉬움", min: 5, tools: "없음", keyword: "인테리어 화분 대형",
      steps: ["빛이 드는 곳을 정한다", "통로를 막지 않게 둔다"] },
    ottoman: { name: "수납 오토만", size: "폭 40~60cm", price: [30000, 80000], diff: "쉬움", min: 10, tools: "없음", keyword: "수납 오토만 스툴",
      steps: ["소파 앞이나 침대 발치에 둔다", "수납 용도로 정리한다"] },
    frame: { name: "스탠드형 액자", size: "A3~A2", price: [10000, 50000], diff: "쉬움", min: 5, tools: "없음", tag: "무타공", keyword: "스탠드 액자 인테리어",
      steps: ["선반·TV장 위에 세워 둔다(못 불필요)"] },
    bedding: { name: "침구 세트", size: "침대 크기에 맞춤", price: [40000, 120000], diff: "쉬움", min: 15, tools: "없음", keyword: "침구 세트 이불 커버",
      steps: ["침대 크기를 확인한다", "색을 방 분위기와 맞춘다"] },
    mirror: { name: "스탠드 전신거울", size: "높이 150cm 안팎", price: [30000, 90000], diff: "쉬움", min: 10, tools: "없음", keyword: "스탠드 전신거울",
      steps: ["옷장 옆 벽에 기대어 둔다", "전도 방지 패드를 붙인다"] },
  };
  const LIVING_EXTRAS = ["curtain", "cushion", "moodLamp", "plant", "sidetable", "ottoman", "frame"];
  const BED_EXTRAS = ["bedding", "curtain", "mirror", "moodLamp", "plant"];
  const RENTAL_SENSITIVE = ["shelf", "hanger", "bookcase", "curtain", "frame"];
  const mkItem = (key) => {
    const it = ITEM[key];
    return Object.assign({ key, links: MERCHANTS.map((m) => ({ id: m.id, label: m.label, url: m.url(it.keyword) })) }, it);
  };

  const R = (id, label, x, y, w, h, kind) => ({ id, label, x, y, w, h, kind: kind || "furniture" });
  const S = (n) => n + PAD;
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const yOver = (a, b) => a.y < b.y + b.h && b.y < a.y + a.h;
  const xOver = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w;
  const solidsOf = (ps) => ps.filter((p) => !["rug", "zone", "small"].includes(p.kind));
  const usableRoom = (room) => ({ W: Math.round(room.W * ROOM_SHRINK), D: Math.round(room.D * ROOM_SHRINK) });

  /* ---------- 좌표 변환: 실제(입구 기준) ↔ 정규(큰 가구 벽이 왼쪽) ---------- */
  function frameFor(U, bigWall) {
    const W = U.W, D = U.D, cp = (r, o) => Object.assign({}, r, o);
    switch (bigWall) {
      case "right": { const f = (r) => cp(r, { x: W - r.x - r.w }); return { Wc: W, Dc: D, toReal: f, toCanon: f }; }
      case "far": { const f = (r) => cp(r, { x: r.y, y: r.x, w: r.h, h: r.w }); return { Wc: D, Dc: W, toReal: f, toCanon: f }; }
      case "near": return { Wc: D, Dc: W,
        toReal: (r) => cp(r, { x: r.y, y: D - r.x - r.w, w: r.h, h: r.w }),
        toCanon: (r) => cp(r, { x: D - r.y - r.h, y: r.x, w: r.h, h: r.w }) };
      default: { const f = (r) => cp(r, {}); return { Wc: W, Dc: D, toReal: f, toCanon: f }; }
    }
  }
  function windowRects(U, walls, ww) {
    return (walls || []).map((wall) => {
      const len = wall === "far" ? U.W : U.D, w = Math.min(ww, len - 40);
      if (wall === "far") return { wall, rect: { x: U.W / 2 - w / 2, y: 0, w, h: 12 } };
      if (wall === "left") return { wall, rect: { x: 0, y: U.D / 2 - w / 2, w: 12, h: w } };
      return { wall, rect: { x: U.W - 12, y: U.D / 2 - w / 2, w: 12, h: w } };
    });
  }
  function entranceRect(U, door) {
    const x = door === "left" ? 0 : door === "center" ? U.W / 2 - 45 : U.W - 90;
    return { x, y: U.D - 90, w: 90, h: 90 };
  }
  function swingRect(U, wall) {
    if (wall === "far") return { x: U.W / 2 - 80, y: 0, w: 160, h: 80 };
    if (wall === "left") return { x: 0, y: U.D / 2 - 80, w: 80, h: 160 };
    return { x: U.W - 80, y: U.D / 2 - 80, w: 80, h: 160 };
  }

  // 받침 유무에 따라 조사를 붙인다 (이/가, 은/는, 와/과)
  const hasJong = (w) => { const c = String(w).trim().slice(-1).charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
  const iga = (w) => w + (hasJong(w) ? "이" : "가");
  const eunn = (w) => w + (hasJong(w) ? "은" : "는");
  const wagwa = (w) => w + (hasJong(w) ? "과" : "와");

  const lvl = (v, errBelow, warnBelow, okMsg, errMsg, warnMsg) =>
    v < errBelow ? { level: "error", msg: errMsg } : v < warnBelow ? { level: "warn", msg: warnMsg } : { level: "ok", msg: okMsg };

  function basicChecks(pieces, Uc, regions) {
    const out = [];
    const solids = solidsOf(pieces);
    for (let i = 0; i < solids.length; i++)
      for (let j = i + 1; j < solids.length; j++)
        if (overlap(solids[i], solids[j])) out.push({ level: "error", msg: `${wagwa(solids[i].label)} ${iga(solids[j].label)} 겹침` });
    pieces.forEach((p) => {
      if (p.x < 0 || p.y < 0 || p.x + p.w > Uc.W || p.y + p.h > Uc.D) out.push({ level: "error", msg: `${iga(p.label)} 방 밖으로 나감` });
    });
    (regions || []).forEach((r) => {
      const hit = solids.filter((p) => overlap(p, r.rect));
      if (hit.length) out.push({ level: "error", msg: `${r.label}에 ${iga(hit.map((h) => h.label).join(", "))} 걸림` });
      else out.push({ level: "ok", msg: `${r.label} 확보` });
    });
    return out;
  }

  /* ---------- 자리 찾기: 벽·모서리에 붙여 놓을 수 있는 곳 중 기준점에 가장 가까운 자리 ---------- */
  function freeSpot(w, h, pieces, regions, Uc, pref) {
    const solids = solidsOf(pieces);
    let best = null;
    for (let x = 5; x <= Uc.W - w - 5; x += 5)
      for (let y = 5; y <= Uc.D - h - 5; y += 5) {
        if (Math.min(x, y, Uc.W - x - w, Uc.D - y - h) > 20) continue;
        const r = { x, y, w, h };
        if (solids.some((s) => overlap(r, s)) || regions.some((g) => overlap(r, g.rect))) continue;
        const d = Math.hypot(x + w / 2 - pref.x, y + h / 2 - pref.y);
        if (!best || d < best.d) best = { x, y, d };
      }
    return best;
  }
  const centerOf = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

  function freeLeft(p, solids) { let g = p.x; solids.forEach((s) => { if (s !== p && yOver(p, s) && s.x + s.w <= p.x) g = Math.min(g, p.x - (s.x + s.w)); }); return g; }
  function freeRight(p, solids, W) { let g = W - (p.x + p.w); solids.forEach((s) => { if (s !== p && yOver(p, s) && s.x >= p.x + p.w) g = Math.min(g, s.x - (p.x + p.w)); }); return g; }
  function freeDown(p, solids, D) { let g = D - (p.y + p.h); solids.forEach((s) => { if (s !== p && xOver(p, s) && s.y >= p.y + p.h) g = Math.min(g, s.y - (p.y + p.h)); }); return g; }
  function freeUp(p, solids) { let g = p.y; solids.forEach((s) => { if (s !== p && xOver(p, s) && s.y + s.h <= p.y) g = Math.min(g, p.y - (s.y + s.h)); }); return g; }
  // 가구 앞(가장 가까운 벽의 반대쪽) 여유
  function frontClear(p, solids, Uc) {
    const d = [p.x, Uc.W - (p.x + p.w), p.y, Uc.D - (p.y + p.h)];
    const i = d.indexOf(Math.min(...d));
    return i === 0 ? freeRight(p, solids, Uc.W) : i === 1 ? freeLeft(p, solids) : i === 2 ? freeDown(p, solids, Uc.D) : freeUp(p, solids);
  }

  // 기본 배치가 현관문 열림 반경과 겹치면, 더 적게 움직이는 쪽(위/아래)으로 비킨다
  function shiftClear(p, regions, Uc) {
    let q = p;
    regions.forEach((g) => {
      if (!overlap(q, g.rect)) return;
      const up = g.rect.y - q.h - 5, down = g.rect.y + g.rect.h + 5;
      const opts = [];
      if (up >= 0) opts.push(up);
      if (down + q.h <= Uc.D) opts.push(down);
      if (!opts.length) return;
      opts.sort((a, b) => Math.abs(a - q.y) - Math.abs(b - q.y));
      q = Object.assign({}, q, { y: opts[0] });
    });
    return q;
  }

  /* ---------- 거실 (소파·TV장) ---------- */
  function livingBase(Uc, sz, regions) {
    const { W, D } = Uc;
    const sofaD = S(95), sofaL = S(sz.sofa), tvD = S(45), tvL = S(sz.tvL), tw = S(sz.tableW), tl = S(sz.tableL);
    const sofaY = Math.max(100, Math.round((D - sofaL) / 2 + 40));
    const cy = sofaY + sofaL / 2;
    const tvY = Math.min(Math.max(0, Math.round(cy - tvL / 2)), Math.max(0, D - tvL));
    const rg = regions || [];
    const sofa = shiftClear(R("sofa", "소파", 0, sofaY, sofaD, sofaL), rg, Uc);
    const tv = shiftClear(R("tv", "TV장", W - tvD, tvY, tvD, tvL), rg, Uc);
    const gap = (tv.x - (sofa.x + sofa.w) - tw) / 2;
    const cy2 = sofa.y + sofa.h / 2;
    const table = R("table", "커피테이블", Math.round(sofa.x + sofa.w + gap), Math.round(cy2 - tl / 2), tw, tl);
    return { sofa, tv, table, tw, tl };
  }

  function livingCandidates(Uc, regions, winC, sz, fixed, avoid) {
    const b = livingBase(Uc, sz, avoid);
    const pref = winC.length ? centerOf(winC[0].rect) : { x: 12, y: 12 };
    const rugFor = (t) => R("rug", "러그", Math.round(t.x + t.w / 2 - 80), Math.round(t.y + t.h / 2 - 80), 160, 160, "rug");
    const list = [];
    const baseP = [b.sofa, b.tv, b.table, ...fixed];

    {
      const rug = rugFor(b.table), pieces = [...baseP, rug];
      const sp = freeSpot(35, 35, pieces, regions, Uc, pref);
      const extra = [];
      if (sp) pieces.push(R("lamp", "플로어 램프", sp.x, sp.y, 35, 35, "small"));
      list.push({ id: "A", title: "소품 추가형", cost: "구매 필요", pieces,
        changes: ["라운드 러그(지름 160cm)를 커피테이블 아래에 추가", sp ? "플로어 램프를 창 가까운 모서리에 추가" : "플로어 램프를 놓을 자리를 찾지 못함"],
        items: Array.from(new Set(["rug", "ottoman", "lamp", ...LIVING_EXTRAS])), extraChecks: sp ? extra : [{ level: "warn", msg: "플로어 램프를 놓을 모서리 자리가 없음" }] });
    }
    {
      const stGap = 35;
      const table = R("table", "커피테이블", b.sofa.x + b.sofa.w + stGap, b.table.y, b.tw, b.tl);
      const moved = Math.round(b.table.x - table.x);
      const pieces = [b.sofa, b.tv, table, ...fixed];
      const sp = freeSpot(35, 35, pieces, regions, Uc, { x: 10, y: Math.max(10, b.sofa.y - 45) });
      if (sp) pieces.push(R("lamp", "플로어 램프", sp.x, sp.y, 35, 35, "small"));
      list.push({ id: "B", title: "재배치 0원형", cost: "0원 (기존 가구 이동)", pieces,
        changes: [`커피테이블을 소파 쪽으로 약 ${moved}cm 이동(소파–테이블 간격 ${stGap}cm)`, "TV장 앞 통로를 넓게 확보", "플로어 램프(보유 시)를 소파 끝 옆으로 이동"],
        items: [], extraChecks: [] });
    }
    {
      const pieces = [...baseP];
      let chair = null;
      [[S(75), S(75)]].forEach(([w, h]) => { chair = freeSpot(w, h, pieces, regions, Uc, pref); if (chair) pieces.push(R("chair", "1인 의자", chair.x, chair.y, w, h)); });
      let lamp = null;
      if (chair) { lamp = freeSpot(35, 35, pieces, regions, Uc, { x: chair.x + 40, y: chair.y + 40 }); if (lamp) pieces.push(R("lamp", "플로어 램프", lamp.x, lamp.y, 35, 35, "small")); }
      list.push({ id: "C", title: "창가 코너형", cost: "구매 필요", pieces,
        changes: winC.length ? ["창 가까운 곳에 1인 의자와 플로어 램프로 독서 코너를 만듦", "창·발코니 앞 통로는 비워 둠"] : ["가장 여유 있는 모서리에 1인 의자와 램프로 독서 코너를 만듦"],
        items: ["chair", "lamp", ...LIVING_EXTRAS],
        extraChecks: chair ? [] : [{ level: "error", msg: "1인 의자를 놓을 자리가 없음" }] });
    }
    list.forEach((c) => {
      const by = Object.fromEntries(c.pieces.map((p) => [p.id, p]));
      c.checks = [...basicChecks(c.pieces, Uc, regions), ...c.extraChecks];
      const tvGap = by.tv.x - (by.table.x + by.table.w);
      c.checks.push(lvl(tvGap, 60, 80, `TV장 앞 통로 ${Math.round(tvGap)}cm`, `TV장 앞 통로 ${Math.round(tvGap)}cm (최소 60cm 필요)`, `TV장 앞 통로 ${Math.round(tvGap)}cm (80cm 이상 권장)`));
      const st = by.table.x - (by.sofa.x + by.sofa.w);
      c.checks.push(st < 30 ? { level: "error", msg: `소파–테이블 간격 ${Math.round(st)}cm (너무 좁음)` }
        : st > 60 ? { level: "warn", msg: `소파–테이블 간격 ${Math.round(st)}cm (손이 닿기 멀 수 있음)` }
        : { level: "ok", msg: `소파–테이블 간격 ${Math.round(st)}cm` });
      const view = by.tv.x - (by.sofa.x + by.sofa.w);
      c.checks.push(view < 180 || view > 320 ? { level: "warn", msg: `소파–TV 거리 ${Math.round(view)}cm (55인치 기준 약 180~320cm를 가정)` }
        : { level: "ok", msg: `소파–TV 거리 ${Math.round(view)}cm` });
      if (by.rug && overlap(by.rug, by.tv)) c.checks.push({ level: "error", msg: "러그가 TV장에 닿음" });
    });
    return { list, base: { sofa: b.sofa, tv: b.tv, table: b.table } };
  }

  /* ---------- 침대 계열 (원룸·안방·작은방) ---------- */
  function bedBase(Uc, sz, hasDesk, regions) {
    const { W, D } = Uc, rg = regions || [];
    const bed = shiftClear(R("bed", "침대", 0, 10, S(sz.bed), S(200)), rg, Uc);
    const wardH = S(sz.ward);
    const ward = shiftClear(R("ward", "옷장", W - S(55), hasDesk ? 10 : D - wardH - 10, S(55), wardH), rg, Uc);
    const base = { bed, ward };
    if (hasDesk) base.desk = shiftClear(R("desk", "책상", W - S(60), ward.y + ward.h + 10, S(60), S(sz.desk)), rg, Uc);
    return base;
  }

  function bedCandidates(Uc, regions, winC, sz, hasDesk, fixed, avoid) {
    const { W, D } = Uc;
    const b = bedBase(Uc, sz, hasDesk, avoid);
    const { bed, ward, desk } = b;
    const base = (hasDesk ? [bed, ward, desk] : [bed, ward]).concat(fixed);
    const pref = winC.length ? centerOf(winC[0].rect) : { x: W / 2, y: 12 };
    const nsz = S(40);
    const list = [];
    {
      const ns = R("ns", "협탁", bed.x + bed.w, bed.y, nsz, nsz);
      const rug = R("rug", "러그", bed.x + bed.w + 5, bed.y + 70, 100, 150, "rug");
      const main = hasDesk ? ["nightstand", "rugSmall", "deskLamp", "shelf", "hanger"] : ["nightstand", "rugSmall", "lamp", "shelf"];
      list.push({ id: "A", title: "소품·수납 추가형", cost: "구매 필요", pieces: [...base, ns, rug],
        changes: ["침대 머리맡 옆에 협탁을 추가", "침대 옆 바닥에 작은 러그를 추가", hasDesk ? "책상용 스탠드와 무타공 선반으로 수납·조명 보강" : "스탠드 조명과 무타공 선반으로 분위기 보강"],
        items: [...main, ...BED_EXTRAS], extraChecks: [] });
    }
    if (hasDesk) {
      // 책상을 창 가까이로: 가로/세로 방향과 옷장 위치(오른쪽 벽을 따라 아래로)를 함께 탐색
      const dl = S(sz.desk), dd = S(60);
      let chosen = null;
      const tryDesk = (w, h) => {
        for (let wy = ward.y; wy + ward.h <= D - 5; wy += 10) {
          const w2 = R("ward", "옷장", ward.x, wy, ward.w, ward.h);
          const pieces = [bed, w2, ...fixed];
          const sp = freeSpot(w, h, pieces, regions, Uc, pref);
          if (!sp) continue;
          const d2 = R("desk", "책상", sp.x, sp.y, w, h);
          const ps = [bed, w2, d2, ...fixed];
          const fc = frontClear(d2, solidsOf(ps), Uc);
          if (fc >= 90 && !overlap(w2, d2)) { if (!chosen || sp.d < chosen.d) chosen = { ps, d: sp.d }; break; }
        }
      };
      tryDesk(dl, dd); tryDesk(dd, dl);
      const ps = chosen ? chosen.ps : [bed, ward, R("desk", "책상", Math.min(bed.x + bed.w + 10, W - dl - 5), 0, dl, dd), ...fixed];
      list.push({ id: "B", title: "재배치 0원형", cost: "0원 (기존 가구 이동)", pieces: ps,
        changes: ["책상을 창 가까이로 옮겨 자연광을 쓰도록 배치", "옷장 위치를 조정해 책상 앞 의자 공간(90cm 이상)을 확보", "기존 책상 자리는 비워 통로로 사용"],
        items: [], extraChecks: chosen ? [] : [{ level: "warn", msg: "의자 공간 90cm를 확보하는 책상 자리를 찾지 못해 가장 가까운 자리로 표시" }] });
    } else {
      const b2 = R("bed", "침대", Math.round((W - S(sz.bed)) / 2), 0, S(sz.bed), S(200));
      list.push({ id: "B", title: "재배치 0원형", cost: "0원 (기존 가구 이동)", pieces: [b2, ward, ...fixed],
        changes: ["침대를 한쪽 벽 중앙으로 옮겨 양쪽에서 오르내릴 수 있게 배치", "옷장 앞 여유 공간(80cm)을 확보"], items: [], extraChecks: [] });
    }
    if (hasDesk) {
      const shelf = R("bookcase", "낮은 책장", 0, bed.y + bed.h + 5, S(80), S(30));
      list.push({ id: "C", title: "공간 분리형", cost: "구매 필요", pieces: [...base, shelf],
        changes: ["침대 발치에 낮은 책장을 두어 잠자는 공간과 생활 공간을 구분", "책장은 허리 높이 이하로 시야 개방감 유지"], items: ["bookcase", "deskLamp", ...BED_EXTRAS], extraChecks: [] });
    } else {
      let found = null;
      [[S(100), S(50)], [S(50), S(100)]].forEach(([w, h]) => {
        const sp = freeSpot(w, h, base, regions, Uc, pref);
        if (sp) { const d = R("desk", "소형 책상", sp.x, sp.y, w, h); const fc = frontClear(d, solidsOf([...base, d]), Uc); if (!found || sp.d < found.sp.d) found = { d, sp, fc }; }
      });
      list.push({ id: "C", title: "창가 책상 코너형", cost: "구매 필요", pieces: found ? [...base, found.d] : base,
        changes: ["창 가까이에 소형 책상 코너를 추가", "의자를 빼는 공간 90cm를 확보"], items: ["desk", "deskLamp", ...BED_EXTRAS],
        extraChecks: found ? [] : [{ level: "error", msg: "소형 책상을 놓을 자리가 없음" }] });
    }
    list.forEach((c) => {
      const by = Object.fromEntries(c.pieces.map((p) => [p.id, p]));
      const solids = solidsOf(c.pieces);
      c.checks = [...basicChecks(c.pieces, Uc, regions), ...c.extraChecks];
      const bd = by.bed;
      const probe = R("probe", "", bd.x, bd.y + bd.h / 2, bd.w, bd.h / 2);
      const open = Math.max(freeLeft(probe, solids), freeRight(probe, solids, W));
      c.checks.push(lvl(open, 40, 60, `침대 옆 통로 ${Math.round(open)}cm`, `침대 옆 통로 ${Math.round(open)}cm (최소 40cm 필요)`, `침대 옆 통로 ${Math.round(open)}cm (60cm 이상 권장)`));
      const footSolids = solids.filter((x) => x.id !== "bookcase");
      const halfW = bd.w / 2;
      const foot = Math.max(freeDown(R("f1", "", bd.x, bd.y, halfW, bd.h), footSolids, D), freeDown(R("f2", "", bd.x + halfW, bd.y, halfW, bd.h), footSolids, D));
      if (foot < 60) c.checks.push({ level: "warn", msg: `침대 발치 여유 ${Math.round(foot)}cm (60cm 이상 권장)` });
      const w = by.ward;
      if (w) { const f = frontClear(w, solids, Uc); c.checks.push(lvl(f, 60, 80, `옷장 앞 여유 ${Math.round(f)}cm`, `옷장 앞 여유 ${Math.round(f)}cm (문 열림 최소 60cm 필요)`, `옷장 앞 여유 ${Math.round(f)}cm (80cm 이상 권장)`)); }
      const dk = by.desk;
      if (dk) { const f = frontClear(dk, solids, Uc); c.checks.push(lvl(f, 70, 90, `책상 앞 의자 공간 ${Math.round(f)}cm`, `책상 앞 의자 공간 ${Math.round(f)}cm (최소 70cm 필요)`, `책상 앞 의자 공간 ${Math.round(f)}cm (90cm 이상 권장)`)); }
    });
    return { list, base: b };
  }

  /* ---------- 공통 ---------- */
  function score(checks) {
    const e = checks.filter((c) => c.level === "error").length;
    const w = checks.filter((c) => c.level === "warn").length;
    return Math.max(0, 100 - 25 * e - 8 * w);
  }

  // 예산 안에서 품목을 앞에서부터 담는다 (가격은 가정 범위의 중간값)
  function planPurchase(keys, budget) {
    let items = keys.map(mkItem);
    // 예산이 10만원 이하면 가성비 순(싼 것부터)으로 담아 더 많은 품목을 준비할 수 있게 한다
    if (budget != null && budget <= 100000) items = items.map((it, i) => [it, i]).sort((a, b) => (a[0].price[0] + a[0].price[1]) - (b[0].price[0] + b[0].price[1]) || a[1] - b[1]).map((x) => x[0]);
    let spent = 0; const inBudget = [], over = [];
    items.forEach((it) => {
      const mid = Math.round((it.price[0] + it.price[1]) / 2);
      if (budget == null || spent + mid <= budget) { spent += mid; inBudget.push(Object.assign({ mid }, it)); }
      else over.push(Object.assign({ mid }, it));
    });
    return { inBudget, over, total: spent };
  }

  function normalize(opts) {
    const o = Object.assign({ housing: "apt", target: "living", door: "sliding", locked: [], budget: null, rental: false }, opts || {});
    o.sizes = Object.assign({}, DEFAULT_SIZES, o.sizes || {});
    o.view = Object.assign({}, DEFAULT_VIEW, o.view || {});
    o.view.obstacle = Object.assign({}, DEFAULT_VIEW.obstacle, (opts && opts.view && opts.view.obstacle) || {});
    return o;
  }

  function setup(room, optsIn) {
    const opts = normalize(optsIn);
    const h = HOUSING.find((x) => x.id === opts.housing) || HOUSING[0];
    const target = h.targets.includes(opts.target) ? opts.target : h.targets[0];
    const family = target === "living" ? "living" : "bed";
    const hasDesk = family === "bed" && opts.sizes.desk > 0;
    const U = usableRoom(room);
    const fr = frameFor(U, opts.view.bigWall);
    const Uc = { W: fr.Wc, D: fr.Dc };
    const winW = (WIN_SIZES[opts.view.winSize] || WIN_SIZES.md).w;
    const winReal = windowRects(U, opts.view.windows, winW);
    const winC = winReal.map((w) => ({ wall: w.wall, rect: fr.toCanon(w.rect) }));
    const regions = [{ label: "현관문 열림 반경", rect: fr.toCanon(entranceRect(U, opts.view.door)) }];
    if (family === "living" && opts.door === "swing" && opts.view.windows.length)
      regions.push({ label: "여닫이문 열림 반경", rect: fr.toCanon(swingRect(U, opts.view.windows[0])) });
    // 기둥·돌출 모서리: 움직일 수 없는 고정 장애물(실제 좌표 → 정규 좌표)
    const ob = opts.view.obstacle, osz = (OBSTACLES[ob.size] || OBSTACLES.none).s;
    let fixed = [];
    if (osz > 0) {
      const rx = ob.corner === "fr" || ob.corner === "nr" ? U.W - osz : 0, ry = ob.corner === "nl" || ob.corner === "nr" ? U.D - osz : 0;
      fixed = [Object.assign(R("pillar", "기둥·돌출", 0, 0, osz, osz, "fixed"), fr.toCanon({ x: rx, y: ry, w: osz, h: osz }))];
    }
    const avoid = regions.concat(fixed.map((f) => ({ label: "고정 장애물", rect: f })));
    return { opts, family, hasDesk, U, fr, Uc, winReal, winC, regions, target, fixed, avoid, winW };
  }

  function finalize(c, ctx) {
    c.pieces = c.pieces.map((p) => Object.assign({}, p, ctx.fr.toReal(p)));
    c.regions = ctx.regions.map((r) => ({ label: r.label, rect: ctx.fr.toReal(r.rect) }));
    c.usable = ctx.U; c.family = ctx.family;
    c.view = { windows: ctx.winReal.map((w) => w.wall), door: ctx.opts.view.door, winW: ctx.winW };
  }

  function candidates(room, optsIn) {
    const ctx = setup(room, optsIn), { opts } = ctx;
    const built = ctx.family === "living" ? livingCandidates(ctx.Uc, ctx.regions, ctx.winC, opts.sizes, ctx.fixed, ctx.avoid) : bedCandidates(ctx.Uc, ctx.regions, ctx.winC, opts.sizes, ctx.hasDesk, ctx.fixed, ctx.avoid);
    const locked = new Set(opts.locked || []);
    built.list.forEach((c) => {
      c.blocked = false; c.blockedBy = [];
      Object.values(built.base).forEach((bp) => {
        if (!bp || !bp.id || !locked.has(bp.id)) return;
        const np = c.pieces.find((p) => p.id === bp.id);
        if (np && (Math.abs(np.x - bp.x) > 1 || Math.abs(np.y - bp.y) > 1 || Math.abs(np.w - bp.w) > 1)) {
          c.checks.unshift({ level: "error", msg: `${eunn(bp.label)} 이동 불가로 지정돼 이 안은 적용할 수 없어요` });
          c.blocked = true; c.blockedBy.push(bp.id);
        }
      });
      c.score = c.blocked ? 0 : score(c.checks);
      c.purchase = planPurchase(c.items, opts.budget);
      // 이 방에서 놓을 자리를 확인했는지(구매 전 불안 줄이기)
      const pm = { rug: "rug", rugSmall: "rug", lamp: "lamp", chair: "chair", nightstand: "ns", bookcase: "bookcase", desk: "desk" };
      c.purchase.inBudget.forEach((it) => {
        const pid = pm[it.key];
        it.fit = pid ? (c.pieces.find((p) => p.id === pid) ? "이 방에서 놓을 자리를 확인했어요" : "놓을 자리를 찾지 못했어요. 더 작은 크기를 고려하세요")
          : ["ottoman", "sidetable", "plant", "mirror"].includes(it.key) ? "바닥에 놓는 소품이에요. 놓을 자리를 직접 한 번 재보세요" : "놓을 공간을 거의 차지하지 않는 소품이에요";
      });
      c.rentalNote = opts.rental && c.items.some((k) => RENTAL_SENSITIVE.includes(k)) ? "임대: 못·타공 없이 쓰는 제품만 고르세요" : "";
      c.prompt = c.changes.join(". ") + ". " + FIXED_PROMPT;
      finalize(c, ctx);
    });
    return built.list;
  }

  // 현재 방 구조(이동 불가 지정용 미리보기)
  function currentScene(room, optsIn) {
    const ctx = setup(room, optsIn);
    let pieces;
    if (ctx.family === "living") { const b = livingBase(ctx.Uc, ctx.opts.sizes, ctx.avoid); pieces = [b.sofa, b.tv, b.table]; }
    else { const b = bedBase(ctx.Uc, ctx.opts.sizes, ctx.hasDesk, ctx.avoid); pieces = ctx.hasDesk ? [b.bed, b.ward, b.desk] : [b.bed, b.ward]; }
    pieces = pieces.concat(ctx.fixed);
    const c = { title: "현재 구조", pieces, checks: [] };
    finalize(c, ctx);
    return c;
  }

  // 방 크기에 맞는 기본 가구 크기 추천 (작은 방일수록 작은 가구)
  function suggestSizes(room, target) {
    const base = Object.assign({}, DEFAULT_SIZES, TARGET_DEFAULTS[target] || {});
    const W = room.W * ROOM_SHRINK, D = room.D * ROOM_SHRINK;
    if (target === "living") {
      if (W < 300 || D < 360) Object.assign(base, { sofa: 150, tvL: 120, tableW: 50, tableL: 90 });
      else if (W < 360 || D < 420) Object.assign(base, { sofa: 200, tvL: 180, tableW: 50, tableL: 90 });
      else if (W >= 440 && D >= 500) Object.assign(base, { sofa: 240, tvL: 240, tableW: 60, tableL: 120 });
    } else {
      if (W < 250) { base.bed = 100; base.ward = 80; base.desk = target === "master" ? 0 : Math.min(base.desk, 100); }
      else if (W < 290) { base.bed = Math.min(base.bed, 110); base.ward = Math.min(base.ward, 80); }
      if (D < 330) base.desk = 0;
    }
    return base;
  }

  function anyApplicable(cs) { return cs.some((c) => !c.blocked); }

  /* ---------- 견적서를 열 때마다 달라지는 제안 ----------
   * 실제 가격·재고 데이터가 없으므로 가격이 내려갔다는 식의 제안은 하지 않는다(가짜 정보 금지).
   * 지금은 견적서 내용(진행 상황·점검 결과·예산·다른 안)에서 만들 수 있는 제안만 한다. */
  function suggestions(cands, candId, checkedKeys, budget, views, ctx) {
    ctx = ctx || {};
    const c = cands.find((x) => x.id === candId);
    if (!c) return [];
    const done = new Set(checkedKeys || []);
    const todo = c.purchase.inBudget.filter((i) => !done.has(i.key));
    const pool = [];
    if (todo.length) pool.push({ kind: "next", title: "다음으로 할 일", body: `${todo[0].name}부터 해보세요 (${todo[0].diff}, 약 ${todo[0].min}분). 먼저 ${todo[0].steps[0]}` });
    else if (c.purchase.inBudget.length) pool.push({ kind: "done", title: "모두 준비했어요", body: "견적서의 품목을 모두 준비했어요. 설치한 모습은 다른 방 견적에도 참고해보세요." });
    const free = cands.find((x) => x.id !== c.id && !x.blocked && x.purchase.total === 0 && x.score >= c.score - 10);
    if (free && c.purchase.total > 0) pool.push({ kind: "free", title: "돈 안 드는 방법도 있어요", body: `${free.title}: ${free.changes[0]}. 구매 전에 먼저 해보고 부족할 때 사도 늦지 않아요.` });
    const over = c.purchase.over[0];
    if (over) { const need = Math.max(0, c.purchase.total + over.mid - budget); pool.push({ kind: "upsell", title: "예산을 조금 늘리면", body: `예산을 약 ${need.toLocaleString("ko-KR")}원(임시 가정 가격) 늘리면 ${over.name}도 담을 수 있어요.` }); }
    const tight = c.checks.filter((k) => k.level === "warn" || k.level === "error")[0];
    pool.push({ kind: "measure", title: "사기 전에 한 번 더 재볼까요", body: tight ? `가장 여유가 적은 곳은 "${tight.msg}"이에요. 구매 전에 줄자로 확인하세요.` : "여유 있게 들어가는 구성이에요. 그래도 구매 전에 놓을 자리를 한 번 재보세요." });
    pool.push({ kind: "compare", title: "판매처를 비교해보세요", body: "같은 품목도 쿠팡·네이버쇼핑·오늘의집에서 가격과 배송이 다를 수 있어요. 가격은 판매처에서 직접 확인하세요." });
    const tier = [50000, 150000, 300000, 500000, 1000000].find((t) => t > budget);
    if (tier) { const alt = planPurchase(c.items, tier), gain = alt.inBudget.length - c.purchase.inBudget.length;
      if (gain > 0) pool.push({ kind: "budget", title: "예산을 바꿔보면", body: `예산을 ${tier / 10000}만원으로 올리면 ${alt.inBudget.length}개(+${gain}개)까지 준비할 수 있어요. 견적서 위쪽에서 예산을 바꿔볼 수 있어요.` }); }
    pool.push({ kind: "timing", title: "급하지 않다면", body: "판매처의 세일 일정을 확인하고 사는 방법도 있어요. 가격은 시기마다 달라질 수 있어요." });
    if ([3, 4, 9, 10].includes(ctx.month)) pool.push({ kind: "season", title: "이사철이에요", body: "3~4월과 9~10월은 가구 수요가 몰리는 시기로 알려져 있어요. 배송·설치 일정은 판매처에서 미리 확인하세요." });
    if (ctx.daysOld >= 7) pool.push({ kind: "stale", title: `견적서를 만든 지 ${ctx.daysOld}일 지났어요`, body: "가격과 재고는 달라졌을 수 있어요. 구매 전에 판매처에서 다시 확인하세요." });
    pool.push({ kind: "nextroom", title: "다른 방도 꾸며볼까요?", body: "같은 방식으로 침실이나 작은방 견적도 받아볼 수 있어요." });
    const tipItem = c.purchase.inBudget[(views || 0) % Math.max(1, c.purchase.inBudget.length)];
    if (tipItem) pool.push({ kind: "tip", title: `${tipItem.name} 설치 팁`, body: tipItem.steps.join(" → ") });
    const v = Math.max(0, views || 0), out = [];
    for (let i = 0; i < Math.min(2, pool.length); i++) out.push(pool[(v * 2 + i) % pool.length]);
    return out;
  }

  /* ---------- 견적서: 구매를 단계로 나누고 요약한다 (PDF 저장·공유용) ---------- */
  function buildQuote(cand, meta) {
    const inB = cand.purchase.inBudget;
    const phases = [
      { title: "1단계 · 먼저 하면 효과가 큰 것", items: inB.slice(0, 2) },
      { title: "2단계 · 여유가 되면", items: inB.slice(2, 5) },
      { title: "3단계 · 마무리 소품", items: inB.slice(5) },
    ].filter((p) => p.items.length);
    phases.forEach((p) => { p.subtotal = p.items.reduce((s, i) => s + i.mid, 0); });
    return { id: "Q" + Date.now().toString(36).toUpperCase(), plan: cand.id + ". " + cand.title, cost: cand.cost, meta,
      phases, total: cand.purchase.total, excluded: cand.purchase.over, changes: cand.changes, checks: cand.checks,
      precheck: ["배송 예정일과 도착 방식(설치·조립 포함 여부)", "반품·교환 시 비용(반품비, 위약금)", "배송비가 별도로 붙는지(무료배송 조건)", "실물 색상·크기 후기(사진과 다를 수 있음)"],
      notices: ["가격은 임시 가정 범위이며 판매처의 실제 가격과 재고를 확인하세요.", "AI 이미지는 참고용이며 실제와 다를 수 있습니다.",
        "제휴 링크가 포함될 수 있습니다. 현재는 수수료 없는 검색 링크입니다.", "치수는 일반 가정값이므로 구매 전에 실측으로 확인하세요."] };
  }

  /* ---------- 평면도 SVG (코드로 그림, 위쪽 = 맞은편 벽, 아래쪽 = 입구) ---------- */
  function svg(room, cand, opts) {
    opts = opts || {};
    const locked = new Set(opts.locked || []);
    const U = cand.usable || usableRoom(room);
    const m = 30, W = U.W, D = U.D, s = Math.min(300 / W, 340 / D);
    const px = (v) => Math.round(v * s * 10) / 10;
    const vw = px(W) + m * 2, vh = px(D) + m * 2 + 12;
    let o = `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="평면도 ${cand.title}">`;
    o += `<rect x="${m}" y="${m}" width="${px(W)}" height="${px(D)}" fill="none" stroke="var(--fg)" stroke-width="2"/>`;
    const ww = (cand.view && cand.view.winW) || 150;
    (cand.view && cand.view.windows || []).forEach((wall) => {
      if (wall === "far") { const w = px(Math.min(ww, W - 40)); o += `<rect x="${m + (px(W) - w) / 2}" y="${m - 3}" width="${w}" height="6" fill="var(--acc)"/><text x="${m + px(W) / 2}" y="${m - 8}" font-size="9" text-anchor="middle" fill="var(--mut)">창</text>`; }
      else { const h2 = px(Math.min(ww, D - 40)), x = wall === "left" ? m - 3 : m + px(W) - 3; o += `<rect x="${x}" y="${m + (px(D) - h2) / 2}" width="6" height="${h2}" fill="var(--acc)"/><text x="${wall === "left" ? m - 10 : m + px(W) + 10}" y="${m + px(D) / 2}" font-size="9" text-anchor="middle" fill="var(--mut)">창</text>`; }
    });
    // 입구(사진 찍는 위치)
    const door = cand.view ? cand.view.door : "right";
    const dx = door === "left" ? 0 : door === "center" ? W / 2 - 45 : W - 90;
    o += `<rect x="${m + px(dx)}" y="${m + px(D) - 3}" width="${px(90)}" height="6" fill="var(--bg)" stroke="var(--acc)"/>`;
    o += `<text x="${m + px(dx + 45)}" y="${m + px(D) + 14}" font-size="9" text-anchor="middle" fill="var(--acc)">▲ 입구(여기서 촬영)</text>`;
    (cand.regions || []).forEach((r) => {
      o += `<rect x="${m + px(r.rect.x)}" y="${m + px(r.rect.y)}" width="${px(r.rect.w)}" height="${px(r.rect.h)}" fill="none" stroke="var(--acc)" stroke-dasharray="3 3"/>`;
    });
    cand.pieces.forEach((p) => {
      const x = m + px(p.x), y = m + px(p.y), w = px(p.w), hh = px(p.h);
      const lk = locked.has(p.id);
      const fill = lk ? "var(--lock)" : "var(--card)";
      const attrs = opts.interactive && !["rug", "small"].includes(p.kind) ? ` data-id="${p.id}" style="cursor:pointer"` : "";
      if (p.kind === "fixed") o += `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="var(--line)" stroke="var(--fg)" stroke-dasharray="2 2"/><text x="${x + w / 2}" y="${y + hh / 2 + 3}" font-size="8" text-anchor="middle" fill="var(--fg)">기둥</text>`;
      else if (p.kind === "rug") o += `<${p.w === p.h ? `circle cx="${x + w / 2}" cy="${y + hh / 2}" r="${w / 2}"` : `rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="8"`} fill="var(--acc)" fill-opacity=".15" stroke="var(--acc)" stroke-dasharray="4 3"/>`;
      else if (p.kind === "small") o += `<circle cx="${x + w / 2}" cy="${y + hh / 2}" r="${w / 2}" fill="var(--card)" stroke="var(--fg)"/>`;
      else {
        o += `<g${attrs}><rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="3" fill="${fill}" stroke="var(--fg)" stroke-width="${lk ? 2 : 1}"/>`;
        o += `<text x="${x + w / 2}" y="${y + hh / 2 + 3}" font-size="9" text-anchor="middle" fill="var(--fg)">${lk ? "🔒 " : ""}${p.label}</text></g>`;
      }
    });
    o += `<text x="${m + px(W) / 2}" y="${vh - 2}" font-size="10" text-anchor="middle" fill="var(--mut)">여유 반영 ${W}×${D}cm (입력 ${room.W}×${room.D})</text>`;
    return o + "</svg>";
  }

  const api = { PAD, ROOM_SHRINK, PYEONG, HOUSING, TARGETS, SHAPES, SIZE_OPTIONS, DEFAULT_SIZES, TARGET_DEFAULTS,
    WALLS, BIG_WALLS, DOOR_POS, DEFAULT_VIEW, MERCHANTS, FIXED_PROMPT, ITEM,
    WIN_SIZES, OBSTACLES, CORNERS, roomFor, suggestSizes, candidates, currentScene, anyApplicable, suggestions, buildQuote, svg, score, planPurchase, usableRoom };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LayoutEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
