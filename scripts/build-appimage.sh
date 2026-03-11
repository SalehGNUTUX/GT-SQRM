#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#  GT-SQRM — سكريبت البناء الكامل
#  يحمّل ffmpeg و yt-dlp ويبني AppImage + DEB
# ═══════════════════════════════════════════════════════
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_DIR/resources/bin"

echo "═══════════════════════════════════════"
echo "  GT-SQRM Build Script"
echo "═══════════════════════════════════════"

# ── 1. تحميل ffmpeg الثابت (static build) ────────────
echo ""
echo "▶ [1/4] تحميل ffmpeg…"
mkdir -p "$BIN_DIR"

FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
FFMPEG_TAR="$BIN_DIR/ffmpeg-static.tar.xz"

if [ ! -f "$BIN_DIR/ffmpeg" ]; then
  echo "  → تحميل من: $FFMPEG_URL"
  curl -L --progress-bar "$FFMPEG_URL" -o "$FFMPEG_TAR"
  echo "  → فك الضغط…"
  tar -xf "$FFMPEG_TAR" -C "$BIN_DIR" --wildcards "*/ffmpeg" --strip-components=1
  rm -f "$FFMPEG_TAR"
  chmod +x "$BIN_DIR/ffmpeg"
  echo "  ✅ ffmpeg: $($BIN_DIR/ffmpeg -version 2>&1 | head -1)"
else
  echo "  ✅ ffmpeg موجود مسبقاً"
fi

# ── 2. تحميل yt-dlp ──────────────────────────────────
echo ""
echo "▶ [2/4] تحميل yt-dlp…"

YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"

if [ ! -f "$BIN_DIR/yt-dlp" ]; then
  echo "  → تحميل من: $YTDLP_URL"
  curl -L --progress-bar "$YTDLP_URL" -o "$BIN_DIR/yt-dlp"
  chmod +x "$BIN_DIR/yt-dlp"
  echo "  ✅ yt-dlp: $($BIN_DIR/yt-dlp --version)"
else
  echo "  ✅ yt-dlp موجود مسبقاً"
fi

# ── 3. تثبيت تبعيات Node ─────────────────────────────
echo ""
echo "▶ [3/4] تثبيت تبعيات Node.js…"
cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
  npm install
  echo "  ✅ تمت التبعيات"
else
  echo "  ✅ node_modules موجودة"
fi

# ── 4. بناء AppImage + DEB ────────────────────────────
echo ""
echo "▶ [4/4] بناء AppImage…"
npm run build

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ اكتمل البناء!"
echo "  📦 المخرجات في: $PROJECT_DIR/dist/"
ls -lh "$PROJECT_DIR/dist/"*.AppImage 2>/dev/null || true
ls -lh "$PROJECT_DIR/dist/"*.deb      2>/dev/null || true
echo "═══════════════════════════════════════"
