/*
 * 예시 방 목록. 이용자가 예시를 고르면 위 선택(집 종류·평형·구조·가구)이 이 방에 맞게 채워지고,
 * 견적서에서는 미리 표시한 놓을 자리(pins)와, 있으면 미리 만든 After 이미지를 보여준다.
 *  - pins: 품목 키 → 사진 위 위치(가로%, 세로%). 사람이 사진을 보고 정한 위치다(AI 자동 표시 아님).
 *  - after: 안(A/B/C) → After 이미지. AI(Gemini 앱 무료 계정)가 만든 결과이며 해당 안의 소품 일부만 반영될 수 있다.
 * 사진은 모두 자유 이용 라이선스(출처 표기 필수). 출처는 credit에 적는다.
 */
window.SAMPLES = [
  { id: "living1", label: "아파트 거실", desc: "소파·TV장이 있는 거실", img: "samples/living1.jpg",
    credit: "\"Modern living room with stylish furniture…\" by Shixart1985, CC BY 2.0, Wikimedia Commons",
    preset: { housing: "apt", target: "living", area: "apt84", shape: "std", door: "sliding",
      view: { windows: ["far"], bigWall: "left", door: "right", winSize: "lg" }, sizes: { sofa: 200, tvL: 240, tableW: 60, tableL: 120 } },
    pins: { rug: { x: 50, y: 80 }, ottoman: { x: 30, y: 91 }, lamp: { x: 29, y: 47 }, curtain: { x: 32, y: 33 }, cushion: { x: 12, y: 62 },
            moodLamp: { x: 84, y: 60 }, plant: { x: 66, y: 62 }, frame: { x: 76, y: 37 }, lightSet: { x: 85, y: 82 }, sidetable: { x: 8, y: 90 } },
    after: { A: { img: "samples/living1_after.webp", note: "라운드 러그와 플로어 램프 기준, Gemini 생성(우하단 ✦는 생성 표시)" } } },
  { id: "bedroom1", label: "아파트 안방", desc: "퀸 침대가 있는 침실", img: "samples/bedroom1.jpg",
    credit: "\"Cozy bedroom with a large bed and simple decor in a modern home\" by Shixart1985, CC BY 2.0, Wikimedia Commons",
    preset: { housing: "apt", target: "master", area: "apt84", shape: "std", door: "sliding",
      view: { windows: ["left"], bigWall: "far", door: "right", winSize: "lg" }, sizes: { bed: 150, ward: 80, desk: 0 } },
    pins: { nightstand: { x: 30, y: 50 }, rugSmall: { x: 83, y: 76 }, lamp: { x: 92, y: 40 }, shelf: { x: 20, y: 30 }, bedding: { x: 50, y: 62 },
            curtain: { x: 8, y: 35 }, mirror: { x: 91, y: 58 }, moodLamp: { x: 89, y: 52 }, plant: { x: 14, y: 82 }, lightSet: { x: 36, y: 14 }, cabinet: { x: 12, y: 70 } } },
];
