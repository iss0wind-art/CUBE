# CUBE 핸드오프 (2026-07-16)

> 다음 세션/작업자가 이 문서 + `VISION.md`만 읽으면 이어서 작업할 수 있게 쓴다.

## 현재 상태: VISION 로드맵 Phase 0~5 전부 구현 완료

| Phase | 내용 | 상태 |
|---|---|---|
| 0 | AI Studio CSS 3D 큐브 셸 | ✅ |
| 1 | 터미널의 방 (PTY, 셀=터미널, 4분할 도킹, 천장 메뉴 존) | ✅ |
| 1.5 | 내부 360° 카메라 (셀 단위 평면), 잠금/정렬 | ✅ |
| 2 | 세계수 (진짜 git 데이터) + 2.5 다중 프로젝트 숲 | ✅ |
| 3 | 마인드맵 연결 빔 | ✅ |
| 4 | 포털 (SSH 차원 이동, ~/.ssh/config 프로필) | ✅ |
| 5 | 복셀 모델링 바닥, 터치 조작, PWA | ✅ |
| — | 협업 (별=타인의 큐브, 포털 너머 연결선) | ⬜ 미착수 (서버 인프라 필요) |
| — | XR (VR/AR) | ⬜ 전략만 문서화 (VISION.md "XR 전략") |

## 실행

```bash
npm install
npm run dev   # 4개 프로세스 동시 기동
```

백엔드(3001~3003)는 vite 프록시로 same-origin 경로에 매핑된다
(`/ws/pty`, `/ws/portal`, `/api/*`, `/portal/*`) — 단일 호스트(터널)로 전부 통한다.

원격 접속: **https://cube.iss0wind.kr** (전용 네임드 터널 `cube`, 6fb92162)
```bash
cloudflared --config C:\Users\USER\.cloudflared\cube-config.yml tunnel run cube
# 기존 ~/.cloudflared/config.yml(구 터널, boq/dream→3001 규칙 포함)은 절대 실행하지 마라 —
# 3001은 이제 CUBE PTY라 PowerShell이 공개 주소로 노출된다. cube 전용 config만 쓴다.
# origin이 localhost가 아니라 172.25.0.1인 이유: 127.0.0.1:3000은 VS Code 포워더가 점유
# 경고: 이 URL = 이 PC의 PowerShell 원격 셸. 공유 금지. Cloudflare Access 인증 추가 권장
```

| 포트 | 프로세스 | 파일 | 역할 |
|---|---|---|---|
| 3000 | web | vite | 프론트 (strictPort — 점유 시 실패) |
| 3001 | pty | server/index.ts | 로컬 PowerShell PTY (WS) |
| 3002 | tree | server/tree.ts | 세계수 git API (+POST /api/projects) |
| 3003 | portal | server/portal.ts | SSH 게이트웨이 (ssh.exe PTY, /profiles) |

## 절대 주의사항

1. **PTY 서버(:3001)를 함부로 재시작하지 마라.** 사용자가 그 안의 터미널에서
   실제 작업(Claude Code 등)을 돌리는 중일 수 있다. 세션은 서버 프로세스와
   함께 죽는다. 그래서 tree/portal을 별도 프로세스로 분리해 놓았다.
2. **Chrome 시점 평면 컬링**: z=perspective 평면을 가로지르는 요소는
   서브트리째 사라진다. 그래서 (a) cube-room은 0×0 앵커, (b) 벽은 셀 단위
   개별 평면, (c) 연결 빔은 세그먼트 분할이다. 새 3D 요소를 추가할 때
   이 규칙을 지켜라. 실험 스크립트 패턴: Playwright로 순수 HTML 페이지 렌더.
3. **좀비 Vite**: 포트 3000을 다른 프로세스가 잡고 있으면 옛 코드가 서빙되는
   대참사가 난다(실제로 겪음). strictPort로 방지했지만, "변경이 반영 안 된다"
   싶으면 먼저 `netstat -ano | grep 300` 확인.
4. 검증은 **Playwright 스크린샷**으로 직접 본다 (`chromium.launch()` →
   goto localhost:3000 → 스크린샷). tsc 통과 ≠ 화면 정상.

## 아키텍처 요점

- React 19 + Vite + Tailwind 4, **CSS 3D transform** (WebGL 아님 — xterm DOM을
  벽에 그대로 붙이기 위한 의도적 선택. XR 시 three.js 렌더러 추가 전략은 VISION 참조)
- 방 좌표계: x,y ±400, z -600(모니터벽)..+500(포털벽), 셀 100px
  - 기하 헬퍼: `cellTransform()`(셀 배치), `cellCenter()`(빔/복셀 좌표)
- 카메라: COORDS(내부 1인칭, 눈=방 중심, perspective 700, SEAT_ZOOM -120),
  ORBIT(전지적), PLAN(=STRUCTURE 엑스레이), AXIS, SECTION
- 세션 상태: `cellSessions`(셀→세션), `docked`(최대 4, 벽 그룹 기반 L/R열),
  `links`(연결), `voxels`(복셀), `menuCells`(천장 메뉴) — 뒤 셋은 localStorage
- 세션 ID 규칙: `MAIN`, `LEFT_n`/`RIGHT_n`/`TOP_n`/`BOTTOM_n`(벽 셀),
  `TREE_*`(세계수, cwd=워크트리), `SSH_*`(포털, :3003 소속 — `clientFor()`)

## 미해결 / 알려진 결함

- 모바일: 동작하나 레이아웃이 데스크톱 기준 (HUD 겹침). 전용 레이아웃 필요.
- 벽 셀 틈으로 별빛이 약간 샘 (세계관상 방치 중, 원하면 셀 border 조정)
- STRUCTURE에서 포털 패널이 함께 열려 있을 수 있음 (패널 배타 처리 안 됨)
- Firebase/Drive 저장은 AI Studio 프로젝트 설정이라 로컬 로그인 실패 가능
  → 사용자 Firebase 프로젝트로 교체 필요
- GEMINI_API_KEY 아직 미사용 (AI 기능 미착수)

## 다음 후보

1. 다듬기 라운드 (사용자 실사용 피드백 수집 후)
2. 협업 챕터: 별=타인의 큐브, 프레즌스 서버, 포털 간 연결선
3. XR 렌더러 (three.js + xterm 캔버스 텍스처, VISION의 전략 참조)
4. Gemini 연동 (원래 AI Studio 앱이었으니 AI 어시스턴트 셀?)

## 공용 왕복 형식 (Interchange v1) — 2D 오르카 큐브 ↔ 3D 왕복 (2026-07-19)

**목적**: 나스 2D 오르카 큐브(cube.iss0wind.kr)와 이 3D를 **한 파일로 왕복**. 오토캐드↔스케치업처럼
공용 뼈대 + 각 앱 전용 블록(상대는 보존만) → 무손실.

- `src/lib/interchange.ts` 추가: `toInterchange(arch, name, preserved)` / `fromInterchange(file)`.
  - 봉투 = 공용코어(acts·molecules·atoms·links) + `ext.architect3d`(이 앱 소유) + `ext.orca2d`(2D 로직층).
  - **무손실 철칙**: 3D가 모르는 코어·`ext.orca2d`는 `preservedRef`에 담아뒀다 저장 때 그대로 되돌림.
- `src/App.tsx` 배선 4곳: interchange import / `preservedRef`(useRef) / 저장 시 `toInterchange`로 감쌈 /
  불러오기 시 `fromInterchange`로 언랩(구형 순정 3D 파일도 하위호환).
- 검증: 변환기 round-trip 14/14(node --experimental-strip-types). 2D가 만든 파일을 3D가 열고 다시
  저장해도 `ext.orca2d`·코어 바이트 동일 확인. **나스에서 `tsc --noEmit`(lint) + `vite build` 모두 통과(EXIT 0, 1693 모듈)** — 컴파일 검증 완료.
  프론트엔드 저장/불러오기는 PTY 백엔드와 무관해 나스 빌드로 충분히 검증됨. 남은 유일한 사람 손 = Google Drive 로그인 후 실제 저장→불러오기 왕복 테스트(아무 브라우저에서나 가능).
- 규격서 정본: 나스 2D 레포 `docs/CUBE_INTERCHANGE_FORMAT_v1.md`.
- **방부장 머지 절차**: 이 브랜치 `feat/interchange-format`를 `feat/phase1-terminals`에 머지 →
  `npm run dev`로 빌드 확인 → Drive에 저장/불러오기 왕복 테스트.
