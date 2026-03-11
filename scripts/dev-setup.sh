#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
#  GT-SQRM — إعداد بيئة التطوير
#  للمطورين الذين يريدون التشغيل بدون بناء AppImage
# ═══════════════════════════════════════════════════════
set -e

echo "═══════════════════════════════════════"
echo "  GT-SQRM — إعداد بيئة التطوير"
echo "═══════════════════════════════════════"

# التحقق من المتطلبات
echo ""
echo "▶ فحص المتطلبات…"

check_cmd() {
  if command -v "$1" &>/dev/null; then
    echo "  ✅ $1: $(command -v $1)"
  else
    echo "  ❌ $1 غير موجود — قم بتثبيته أولاً"
    MISSING=1
  fi
}

MISSING=0
check_cmd node
check_cmd npm
check_cmd ffmpeg
check_cmd yt-dlp
check_cmd git

if [ "$MISSING" = "1" ]; then
  echo ""
  echo "  لتثبيت ffmpeg:"
  echo "    Debian/Ubuntu: sudo apt install ffmpeg"
  echo "    Fedora:        sudo dnf install ffmpeg"
  echo "    Arch:          sudo pacman -S ffmpeg"
  echo ""
  echo "  لتثبيت yt-dlp:"
  echo "    pip install yt-dlp"
  echo "    أو: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp"
  exit 1
fi

# نسخ ملفات الواجهة من GT-SQR
echo ""
echo "▶ هل تريد نسخ الواجهة من مجلد GT-SQR موجود؟ (y/n)"
read -r COPY_SRC

if [ "$COPY_SRC" = "y" ]; then
  echo "  أدخل مسار مجلد GT-SQR:"
  read -r GTSQR_PATH
  if [ -d "$GTSQR_PATH" ]; then
    cp "$GTSQR_PATH/app.js"    "$(dirname "$0")/../src/renderer/"
    cp "$GTSQR_PATH/index.html" "$(dirname "$0")/../src/renderer/"
    [ -d "$GTSQR_PATH/fonts" ] && cp -r "$GTSQR_PATH/fonts" "$(dirname "$0")/../src/renderer/"
    echo "  ✅ نُسخت ملفات الواجهة"
  else
    echo "  ⚠️ المسار غير موجود، تخطي"
  fi
fi

# تثبيت Node dependencies
echo ""
echo "▶ تثبيت تبعيات Node.js…"
cd "$(dirname "$0")/.."
npm install
echo "  ✅ تمت التبعيات"

echo ""
echo "═══════════════════════════════════════"
echo "  ✅ البيئة جاهزة!"
echo ""
echo "  لتشغيل التطبيق في وضع التطوير:"
echo "    npm run dev"
echo ""
echo "  لبناء AppImage:"
echo "    npm run build"
echo "═══════════════════════════════════════"
