/* AI 스타일 리디자인 프리셋. 브라우저(칩 UI)와 Worker(허용 목록)가 같은 파일을 쓴다.
 * 프롬프트는 서버가 id로만 찾는다: 클라이언트가 자유 문장을 보내지 못하게 해 주입과 비용 남용을 막는다.
 * 시험 근거: scripts/style_test.py (FLUX.2 klein 3차 시험). */
(function (g) {
  const KEEP = "Redesign the interior of this real room photo. Keep exactly as they are: the room shape, windows, doors, ceiling, " +
    "camera angle and perspective, and any TV wall panel, shelves or built-in cabinets. " +
    "Everything else should be replaced to strongly match the style below: the furniture (seating, bed, tables), rug or floor covering, " +
    "curtains, lighting and wall color. Do not keep the original furniture colors. " +
    "Add at most 5 decor items. Never hang or place any light, plant or object in front of a window or door. " +
    "Do not add, duplicate or remove windows, doors, TVs or other existing fixtures. The style must be clearly recognizable. Style: ";
  const list = [
    { id: "modern", emoji: "🏠", label: "모던", desc: "깔끔한 선, 무채색", prompt: "Modern: sleek low-profile light gray fabric furniture, glass and black metal tables, flat-weave neutral rug, white sheer curtains, slim floor lamp." },
    { id: "scandinavian", emoji: "🌲", label: "북유럽", desc: "밝은 원목, 화이트", prompt: "Scandinavian: white linen upholstery with light oak legs, round pale-birch table, cream wool rug, light oak floor, off-white curtains, paper pendant lamp." },
    { id: "japanese", emoji: "🧘", label: "일본식(젠)", desc: "다다미, 낮은 가구", prompt: "Japanese minimalist (Zen): low floor seating on a wooden platform, low solid-wood table, tatami mat floor, beige linen curtains, paper lantern light." },
    { id: "industrial", emoji: "🏗️", label: "인더스트리얼", desc: "가죽, 콘크리트, 철제", prompt: "Industrial: brown leather chesterfield seating, black iron and reclaimed wood table, concrete-gray floor, exposed-bulb lights, dark curtains." },
    { id: "boho", emoji: "🪴", label: "보헤미안", desc: "라탄, 패턴 러그, 식물", prompt: "Bohemian: mustard velvet furniture with patterned cushions, round rattan table, layered kilim rug, macrame wall hanging, potted plants, warm earthy curtains." },
    { id: "natural", emoji: "🌿", label: "내추럴 우드", desc: "원목과 베이지 톤", prompt: "Natural wood: warm honey-oak furniture, beige and oatmeal fabrics, jute rug, linen curtains, soft warm lamp, a few green plants." },
    { id: "midcentury", emoji: "🪑", label: "미드센추리", desc: "테이퍼 다리, 레트로", prompt: "Midcentury modern: walnut furniture with tapered legs, mustard and teal accents, geometric rug, sunburst wall clock, brass lamp." },
    { id: "hotel", emoji: "🏨", label: "호텔식", desc: "고급 패브릭, 은은한 조명", prompt: "Boutique hotel: plush tufted upholstery in greige, brass and marble tables, thick ivory rug, floor-length drapes, warm layered lamp lighting." },
  ];
  const api = { KEEP, list, promptFor: (id) => { const s = list.find((x) => x.id === id); return s ? KEEP + s.prompt : null; } };
  g.RedesignStyles = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
