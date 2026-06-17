# 제목학원 / 깜놀 그랑프리 — 짤 이미지 출처

전부 CC0 또는 퍼블릭 도메인(PDM). 상업적 사용 가능, 별도 출처표기 의무 없음(예의상 기록).

## 깜놀 그랑프리 — 사진 풀 (500장)

`grandprix/photos/` 의 500장(동물 280 · 2인 이상 인물 220)은 **Openverse API**로 수급한 **CC0 / PDM** 사진이다.
- 수급 파이프라인: `grandprix/tools/source_photos.py` (Openverse 키 불필요 · sips로 900px·q66 리사이즈)
- **장당 전체 출처·라이선스·작가·원본링크**: `grandprix/photos.manifest.json` (자동 생성, 저작권 추적용)
- 재수급/증량: `cd grandprix/tools && python3 source_photos.py` (환경변수 `TARGET` / `ANIMAL` / `PEOPLE` / `CAP`)

## 깜놀 그랑프리 — 사운드: Animalese (캐릭터 보이스)

`grandprix/animalese.wav` 는 캐릭터가 답을 "말하는" 애니멀리즈 보이스 샘플(A–Z)이다.
- 출처: **animalese.js** by **Josh Simmons** — https://github.com/Acedio/animalese.js
- 오디오(`animalese.wav`): **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) — 상업 사용 가능, 출처표기 필수
- 합성 코드: 원작 MIT 라이선스 로직을 참고해 재구현(글자 샘플→AudioBuffer→녹음 버스 라우팅). © 2014 Josh Simmons
- 변경 사항: 한글 등 비-알파벳은 무작위 A–Z로 치환하여 재생, RIFFWAVE/`<audio>` 의존 제거하고 Web Audio로 직접 재생.
- ⚠️ Animal Crossing은 Nintendo의 저작물이며 본 프로젝트는 Nintendo와 무관함.

## 제목학원 — 큐레이션 7장 (legends 포함)

- **01.jpg** — Funny cats ! · cc0 1.0 · by boklm (flickr) · https://www.flickr.com/photos/85825630@N00/495324793
- **02.jpg** — Funny Dog · pdm 1.0 · by APPLE BOUTIQUE (flickr) · https://www.flickr.com/photos/81108486@N00/22271021268
- **03.jpg** — Pug Puppy · cc0 1.0 · by Image Catalog (flickr) · https://www.flickr.com/photos/132795455@N08/23681617486
- **05.jpg** — Mountain goats on Sepulcher Mountain · pdm 1.0 · by YellowstoneNPS (flickr) · https://www.flickr.com/photos/80223459@N05/8468633942
- **06.jpg** — 2010/365/2 A Face Only a Llama Mother Could Love · cc0 1.0 · by cogdogblog (flickr) · https://www.flickr.com/photos/37996646802@N01/4238580321
- **08.jpg** — Harlequin Duck (Long exposure) · pdm 1.0 · by GlacierNPS (flickr) · https://www.flickr.com/photos/43288043@N04/19185339079
- **10.jpg** — Bull Frog · pdm 1.0 · by U. S. Fish and Wildlife Service - Northeast Region (flickr) · https://www.flickr.com/photos/43322816@N08/5278271076
