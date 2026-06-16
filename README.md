# kkamnol-web

Kkamnol Interactive 포트폴리오 랜딩페이지. **빌드 과정 없는 정적 사이트** — Vercel이 zero-config로 배포한다.

## 구조

```
index.html    # 랜딩 (Hero · Games · For Brands · Contact)
styles.css    # 스타일 (다크 + 깜놀 옐로 액센트)
games.js      # 게임 카드 렌더 — GAMES 배열에 추가하면 카드 생성
vercel.json   # cleanUrls
```

## 게임 추가하기

`games.js`의 `GAMES` 배열에 객체 하나 추가:

```js
{ title: "깜놀타임", en: "Kkamnol Time", desc: "...", tags: ["반응속도"], status: "live", url: "https://..." }
```

- `status: "live"` + `url` → 플레이로 연결되는 카드
- `status: "soon"` → Coming soon 카드

## 로컬 미리보기

빌드 불필요. 아무 정적 서버로:

```bash
npx serve .        # 또는 python3 -m http.server
```

## 배포 (Vercel + Git)

```bash
# 1) 로컬 저장소 (이미 init/commit 되어 있음)
cd kkamnol-web

# 2) GitHub anchored-kr 조직에 원격 생성 후 푸시
#    (gh CLI 사용 시)
gh repo create anchored-kr/kkamnol-web --public --source=. --remote=origin --push
#    또는 웹에서 빈 repo 생성 후:
# git remote add origin https://github.com/anchored-kr/kkamnol-web.git
# git push -u origin main

# 3) Vercel (vercel.com/anchored) → Add New Project → kkamnol-web import
#    Framework Preset: Other (정적). Build/Output 설정 비움. Deploy.

# 4) 도메인: Vercel 프로젝트 → Settings → Domains → kkamnol.xyz 추가
#    안내되는 A/CNAME 레코드를 도메인 DNS에 등록.
```

푸시하면 이후 커밋마다 Vercel이 자동 재배포한다.

## TODO

- [ ] `og.png` (1200×630) 추가 — 공유 카드 썸네일
- [ ] `hello@kkamnol.xyz` 메일박스/포워딩 설정
- [ ] 첫 게임 "깜놀타임" 완성 후 `status: "live"` + `url` 연결
