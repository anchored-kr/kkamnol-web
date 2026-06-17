#!/usr/bin/env python3
"""
깜놀 그랑프리 — 사진 풀 수급 파이프라인.

Openverse(키 불필요)에서 CC0/PDM 라이선스 사진을 검색·다운로드해
grandprix 전용 photos.json + photos/ 디렉터리를 생성한다.
"2인 이상 인물 + 동물" 위주.

사용:
  python3 source_photos.py            # 기본 TARGET=500
  TARGET=120 python3 source_photos.py # 개수 조절

출력:
  ../photos/NNNN.jpg          (sips로 1024px·q72 리사이즈)
  ../photos.json              (게임이 읽는 데이터: id/image/emoji/bg/credit)
  ../photos.manifest.json     (출처·라이선스 전체 기록 — 저작권 추적용)
"""
import json, os, sys, time, subprocess, urllib.request, urllib.parse, hashlib, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.normpath(os.path.join(HERE, "..", "photos"))
OUT_JSON = os.path.normpath(os.path.join(HERE, "..", "photos.json"))
OUT_MANIFEST = os.path.normpath(os.path.join(HERE, "..", "photos.manifest.json"))
TMP = "/tmp/gp_src"

TARGET = int(os.environ.get("TARGET", "500"))
# 카테고리 쿼터: 동물 + 2인 이상 인물 균형. (합 = TARGET)
KIND_TARGET = {"animal": int(os.environ.get("ANIMAL", "280")), "people": int(os.environ.get("PEOPLE", "220"))}
PER_QUERY_CAP = int(os.environ.get("CAP", "16"))
API = "https://api.openverse.org/v1/images/"
UA = "KkamnolGrandPrix/1.0 (photo sourcing; contact hello@kkamnol.xyz)"

# 카테고리: (검색어, emoji, 배경색). emoji/bg는 이미지 로드 실패 시 폴백용.
ANIMAL_BG = ["#ffd9a8", "#cdbfa8", "#e9c9a0", "#bcd3e6", "#d9cfc2", "#bcd0d6", "#bfe0a8", "#f3d6c0", "#cfe3d0"]
PEOPLE_BG = ["#e4d3f0", "#f0d6dd", "#d6e0f0", "#f0e3c7", "#dde7d0"]

QUERIES = [
    # 동물 (emoji 매칭)
    ("funny dog", "🐶", "animal"), ("dog portrait", "🐶", "animal"), ("puppy", "🐶", "animal"),
    ("funny cat", "🐱", "animal"), ("cat portrait", "🐱", "animal"), ("kitten", "🐱", "animal"),
    ("monkey", "🐵", "animal"), ("goat", "🐐", "animal"), ("duck", "🦆", "animal"),
    ("frog", "🐸", "animal"), ("owl", "🦉", "animal"), ("penguin", "🐧", "animal"),
    ("alpaca", "🦙", "animal"), ("llama", "🦙", "animal"), ("sloth", "🦥", "animal"),
    ("fox", "🦊", "animal"), ("bear", "🐻", "animal"), ("pig", "🐷", "animal"),
    ("horse", "🐴", "animal"), ("cow", "🐮", "animal"), ("sheep", "🐑", "animal"),
    ("rabbit", "🐰", "animal"), ("hamster", "🐹", "animal"), ("parrot", "🦜", "animal"),
    ("squirrel", "🐿️", "animal"), ("elephant", "🐘", "animal"), ("panda", "🐼", "animal"),
    ("koala", "🐨", "animal"), ("seal animal", "🦭", "animal"), ("raccoon", "🦝", "animal"),
    ("lion", "🦁", "animal"), ("tiger", "🐯", "animal"), ("otter", "🦦", "animal"),
    ("funny goose", "🦢", "animal"), ("camel", "🐫", "animal"), ("donkey", "🫏", "animal"),
    # 2인 이상 인물
    ("group of friends laughing", "👥", "people"), ("people talking", "👥", "people"),
    ("team meeting", "👥", "people"), ("crowd of people", "👥", "people"),
    ("family portrait", "👨‍👩‍👧", "people"), ("two people arguing", "👥", "people"),
    ("friends group photo", "👥", "people"), ("office workers", "👥", "people"),
    ("people at party", "🎉", "people"), ("group selfie", "🤳", "people"),
    ("people surprised", "😮", "people"), ("audience crowd", "👥", "people"),
    ("couple portrait", "💑", "people"), ("people waiting line", "👥", "people"),
    ("street performers crowd", "👥", "people"), ("people dancing", "💃", "people"),
    ("vintage group photo", "👥", "people"), ("people meeting outdoors", "👥", "people"),
]

def fetch(query, page):
    params = urllib.parse.urlencode({
        "q": query, "license": "cc0,pdm", "page_size": 20, "page": page,
        "mature": "false", "category": "photograph",
    })
    req = urllib.request.Request(API + "?" + params, headers={"Accept": "application/json", "User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:
            wait = 3 * (attempt + 1)
            print(f"  ! fetch retry {attempt+1} ({e}); sleep {wait}s", flush=True)
            time.sleep(wait)
    return None

def flickr_medium(url):
    # 큰 원본 대신 적당한 크기로(다운로드/리포 용량↓). 비-Flickr는 그대로.
    if "staticflickr.com" in url and url.endswith("_b.jpg"):
        return url[:-6] + "_c.jpg"  # 1024 -> 800
    return url

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    tmp = dest + ".dl"
    with urllib.request.urlopen(req, timeout=45) as r, open(tmp, "wb") as f:
        shutil.copyfileobj(r, f)
    if os.path.getsize(tmp) < 3000:  # 깨진/플레이스홀더
        os.remove(tmp); return False
    # sips: 최대 900px, JPEG q66 (용량 절감)
    res = subprocess.run(["sips", "-Z", "900", "-s", "format", "jpeg", "-s", "formatOptions", "66",
                          tmp, "--out", dest], capture_output=True)
    os.remove(tmp)
    return res.returncode == 0 and os.path.exists(dest) and os.path.getsize(dest) > 2000

def main():
    os.makedirs(PHOTOS_DIR, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    seen = set()
    photos, manifest = [], []
    idx = 0
    got_by_kind = {"animal": 0, "people": 0}
    # 인물 쿼리를 먼저 처리해 균형 보장 (동물은 소스가 풍부해 뒤에서 채워짐)
    ordered = sorted(QUERIES, key=lambda q: 0 if q[2] == "people" else 1)

    for qi, (query, emoji, kind) in enumerate(ordered):
        if got_by_kind[kind] >= KIND_TARGET.get(kind, 0):
            continue  # 해당 카테고리 쿼터 달성 → 스킵
        got = 0
        for page in range(1, 8):
            if got >= PER_QUERY_CAP or got_by_kind[kind] >= KIND_TARGET.get(kind, 0):
                break
            data = fetch(query, page)
            time.sleep(0.6)
            if not data or not data.get("results"):
                break
            for it in data["results"]:
                if got >= PER_QUERY_CAP or got_by_kind[kind] >= KIND_TARGET.get(kind, 0):
                    break
                oid = it.get("id")
                url = it.get("url")
                if not oid or not url or oid in seen:
                    continue
                if it.get("mature"):
                    continue
                w, h = it.get("width") or 0, it.get("height") or 0
                if w and h and (w < 500 or h < 360):  # 너무 작은 건 제외
                    continue
                seen.add(oid)
                idx += 1
                fname = f"{idx:04d}.jpg"
                dest = os.path.join(PHOTOS_DIR, fname)
                try:
                    ok = download(flickr_medium(url), dest)
                except Exception as e:
                    ok = False
                if not ok:
                    idx -= 1
                    continue
                got += 1
                got_by_kind[kind] += 1
                bg = (ANIMAL_BG if kind == "animal" else PEOPLE_BG)[idx % (len(ANIMAL_BG) if kind == "animal" else len(PEOPLE_BG))]
                slug = query.replace(" ", "-")
                photos.append({
                    "id": f"{slug}-{idx:04d}",
                    "image": f"/grandprix/photos/{fname}",
                    "emoji": emoji,
                    "bg": bg,
                    "kind": kind,
                    "credit": f"{it.get('creator') or 'Unknown'} · {it.get('source') or 'openverse'} · {(it.get('license') or '').upper()}",
                })
                manifest.append({
                    "file": fname, "query": query, "kind": kind,
                    "openverse_id": oid, "title": it.get("title"),
                    "creator": it.get("creator"), "creator_url": it.get("creator_url"),
                    "license": it.get("license"), "license_version": it.get("license_version"),
                    "license_url": it.get("license_url"),
                    "source": it.get("source"), "landing": it.get("foreign_landing_url"),
                })
                if len(photos) % 10 == 0:
                    print(f"[{len(photos)}/{TARGET}] a{got_by_kind['animal']} p{got_by_kind['people']} | {query} -> {fname}", flush=True)
        print(f"== '{query}' ({kind}) +{got} | total {len(photos)} (a{got_by_kind['animal']} p{got_by_kind['people']})", flush=True)

    with open(OUT_JSON, "w") as f:
        json.dump(photos, f, ensure_ascii=False, indent=0, separators=(",", ":"))
    with open(OUT_MANIFEST, "w") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"\nDONE: {len(photos)} photos -> {OUT_JSON}", flush=True)

if __name__ == "__main__":
    main()
