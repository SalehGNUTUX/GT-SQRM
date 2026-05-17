#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  GT-SQRM — سكربت البناء التلقائي لجميع حزم Linux
#  AppImage + DEB + RPM (مع fallback عبر alien إن لزم)
#
#  الاستخدام:
#    ./scripts/build-all.sh              # كل الأهداف
#    ./scripts/build-all.sh appimage     # AppImage فقط
#    ./scripts/build-all.sh deb          # DEB فقط
#    ./scripts/build-all.sh rpm          # RPM فقط
#    ./scripts/build-all.sh clean        # تنظيف dist/ و cache التالف
# ═══════════════════════════════════════════════════════════════
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BIN_DIR="$PROJECT_DIR/resources/bin"
DIST_DIR="$PROJECT_DIR/dist"

cd "$PROJECT_DIR"

echo "══════════════════════════════════════════════════════════"
echo "   GT-SQRM v3.0.0 — سكربت البناء التلقائي"
echo "══════════════════════════════════════════════════════════"

# ── التحقق من المتطلبات الأساسية ────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js غير مثبّت. يتطلب المشروع Node.js v18 أو أحدث."
    exit 1
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ إصدار Node.js ($NODE_VERSION) قديم جداً. يلزم v18 أو أحدث."
    exit 1
fi
echo "✅ Node.js: $(node -v)"
echo "✅ npm:     $(npm -v)"
echo ""

# ── خيار التنظيف ────────────────────────────────────────────────
if [ "${1:-}" = "clean" ]; then
    echo "🧹 تنظيف مخرجات البناء والكاش التالف..."
    rm -rf "$DIST_DIR"
    rm -rf "$HOME/.cache/electron-builder/appimage"
    rm -rf "$HOME/.cache/electron-builder/fpm"
    rm -rf "$HOME/.cache/electron-builder/fpm@2.1.4"
    echo "   ✅ حذف dist/ و كاش AppImage/fpm التالف"
    echo "   ℹ تشغيل البناء التالي سيعيد التنزيل تلقائياً"
    exit 0
fi

# ── إصلاح كاش AppImage إذا كان تالفاً (ينقصه runtime-x64) ──────
APPIMG_CACHE="$HOME/.cache/electron-builder/appimage/appimage-12.0.1"
if [ -d "$APPIMG_CACHE" ] && [ ! -f "$APPIMG_CACHE/runtime-x64" ] \
   && [ ! -f "$APPIMG_CACHE/linux-x64/runtime-x64" ]; then
    echo "⚠️  كاش AppImage تالف (runtime-x64 مفقود) — يُحذَف لإعادة التنزيل"
    rm -rf "$APPIMG_CACHE"
    echo ""
fi

# ── إصلاح كاش fpm إذا كان تالفاً (ينقصه الملف التنفيذي fpm) ───
FPM_CACHE="$HOME/.cache/electron-builder/fpm/fpm-1.9.3-2.3.1-linux-x86_64"
if [ -d "$FPM_CACHE" ] && [ ! -f "$FPM_CACHE/fpm" ]; then
    echo "⚠️  كاش fpm تالف (الملف التنفيذي مفقود) — يُحذَف لإعادة التنزيل"
    rm -rf "$HOME/.cache/electron-builder/fpm"
    echo ""
fi
FPM2_CACHE_PARENT="$HOME/.cache/electron-builder/fpm@2.1.4"
if [ -d "$FPM2_CACHE_PARENT" ]; then
    FPM2_BIN=$(find "$FPM2_CACHE_PARENT" -name "fpm" -type f 2>/dev/null | head -1)
    if [ -z "$FPM2_BIN" ]; then
        echo "⚠️  كاش fpm@2.1.4 تالف — يُحذَف لإعادة التنزيل"
        rm -rf "$FPM2_CACHE_PARENT"
        echo ""
    fi
fi

# ── تحميل ffmpeg الثابت ─────────────────────────────────────────
echo "▶ [1/5] التأكد من ffmpeg…"
mkdir -p "$BIN_DIR"

FFMPEG_URL="https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz"
FFMPEG_TAR="$BIN_DIR/ffmpeg-static.tar.xz"

if [ ! -f "$BIN_DIR/ffmpeg" ]; then
    echo "   → تحميل ffmpeg الثابت…"
    curl -L --progress-bar "$FFMPEG_URL" -o "$FFMPEG_TAR"
    echo "   → فك الضغط…"
    tar -xf "$FFMPEG_TAR" -C "$BIN_DIR" --wildcards "*/ffmpeg" --strip-components=1
    rm -f "$FFMPEG_TAR"
    chmod +x "$BIN_DIR/ffmpeg"
    echo "   ✅ ffmpeg: $("$BIN_DIR/ffmpeg" -version 2>&1 | head -1)"
else
    echo "   ✅ ffmpeg موجود مسبقاً"
fi
echo ""

# ── تحميل yt-dlp ────────────────────────────────────────────────
echo "▶ [2/5] التأكد من yt-dlp…"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux"

if [ ! -f "$BIN_DIR/yt-dlp" ]; then
    echo "   → تحميل yt-dlp…"
    curl -L --progress-bar "$YTDLP_URL" -o "$BIN_DIR/yt-dlp"
    chmod +x "$BIN_DIR/yt-dlp"
    echo "   ✅ yt-dlp: $("$BIN_DIR/yt-dlp" --version)"
else
    echo "   ✅ yt-dlp موجود مسبقاً"
fi
echo ""

# ── تثبيت تبعيات Node ───────────────────────────────────────────
echo "▶ [3/5] التأكد من node_modules…"
if [ ! -d node_modules ]; then
    echo "   → npm install…"
    npm install
    echo "   ✅ تمت التبعيات"
else
    echo "   ✅ node_modules موجودة"
fi
echo ""

# ── البناء ──────────────────────────────────────────────────────
echo "▶ [4/5] بناء الحزم…"
echo ""

BUILT=()
FAILED=()

build_target() {
    local target="$1"
    echo "📦 جاري بناء: $target ..."
    if npx electron-builder --linux "$target" 2>&1; then
        echo "✅ نجح بناء: $target"
        BUILT+=("$target")
    else
        echo "⚠️  فشل بناء: $target"
        FAILED+=("$target")
    fi
    echo ""
}

# بناء RPM ذكي: electron-builder الأصلي ← alien+rpmbuild ← تعليمات
build_rpm() {
    echo "📦 جاري بناء: rpm ..."

    # ١. المحاولة الأصلية عبر electron-builder
    if command -v rpmbuild >/dev/null 2>&1; then
        echo "   → محاولة بناء RPM أصلي (electron-builder)..."
        if npx electron-builder --linux rpm 2>&1; then
            echo "✅ نجح بناء: rpm"
            BUILT+=("rpm")
            echo ""
            return
        fi
        echo "   ⚠ فشل electron-builder — الانتقال إلى alien..."
    else
        echo "   ⚠ rpmbuild غير مثبّت — الانتقال إلى alien..."
    fi

    # ٢. التأكد من وجود DEB أولاً
    local deb_file
    deb_file=$(ls "$DIST_DIR"/*.deb 2>/dev/null | head -1)
    if [ -z "$deb_file" ]; then
        echo "   ⚠ لا يوجد ملف DEB — سيُبنى DEB أولاً..."
        echo ""
        build_target deb
        deb_file=$(ls "$DIST_DIR"/*.deb 2>/dev/null | head -1)
        if [ -z "$deb_file" ]; then
            echo "❌ تعذّر الحصول على DEB — لا يمكن إنشاء RPM"
            FAILED+=("rpm")
            echo ""
            return
        fi
    fi

    # ٣. alien -g + rpmbuild
    if command -v alien >/dev/null 2>&1 && command -v rpmbuild >/dev/null 2>&1; then
        local deb_name tmpdir pkgdir spec rpm_file outdir
        deb_name=$(basename "$deb_file")
        tmpdir=$(mktemp -d)
        outdir="$DIST_DIR"

        echo "   → توليد مجلد RPM من $deb_name عبر alien..."
        cp "$deb_file" "$tmpdir/"

        if ! (cd "$tmpdir" && fakeroot alien -r -g "$deb_name") 2>&1; then
            echo "❌ فشل alien في توليد المجلد"
            rm -rf "$tmpdir"
            FAILED+=("rpm")
            echo ""
            return
        fi

        spec=$(find "$tmpdir" -name "*.spec" | head -1)
        if [ -z "$spec" ]; then
            echo "❌ لم يُعثر على ملف .spec بعد alien -g"
            rm -rf "$tmpdir"
            FAILED+=("rpm")
            echo ""
            return
        fi

        # تصحيح Summary الفارغ (alien لا يملؤه عند الأوصاف العربية)
        sed -i 's/^Summary:[[:space:]]*$/Summary: GnuTux Short Quran Reels Maker/' "$spec"

        pkgdir=$(dirname "$spec")
        echo "   → rpmbuild من $(basename "$pkgdir") ..."
        if (cd "$pkgdir" && fakeroot rpmbuild --buildroot="$pkgdir" -bb --target x86_64 "$(basename "$spec")") 2>&1; then
            rpm_file=$(find "$tmpdir" -name "*.rpm" | head -1)
            if [ -n "$rpm_file" ]; then
                cp "$rpm_file" "$outdir/"
                echo "✅ نجح بناء: rpm (alien + rpmbuild)"
                BUILT+=("rpm (alien)")
            else
                echo "❌ بُني RPM لكن لم يُعثر على الملف في $tmpdir"
                FAILED+=("rpm")
            fi
        else
            echo "❌ فشل rpmbuild"
            FAILED+=("rpm")
        fi
        rm -rf "$tmpdir"
        echo ""
        return
    fi

    # ٤. لا أدوات — تعليمات للمستخدم
    echo ""
    echo "❌ تعذّر بناء RPM. المطلوب على Debian/Ubuntu:"
    if ! command -v alien >/dev/null 2>&1; then
        echo "   sudo apt install alien rpm fakeroot"
    else
        echo "   sudo apt install rpm fakeroot"
    fi
    echo "   ثم أعد التشغيل: $0 rpm"
    FAILED+=("rpm")
    echo ""
}

# اختيار الأهداف
TARGETS="${1:-all}"
case "$TARGETS" in
    all)
        build_target AppImage
        build_target deb
        build_rpm
        ;;
    appimage|AppImage)
        build_target AppImage
        ;;
    deb)
        build_target deb
        ;;
    rpm)
        build_rpm
        ;;
    *)
        echo "الاستخدام: $0 [all|appimage|deb|rpm|clean]"
        exit 1
        ;;
esac

# ── تقرير النتائج ───────────────────────────────────────────────
echo "▶ [5/5] التقرير النهائي"
echo "══════════════════════════════════════════════════════════"
[ ${#BUILT[@]}  -gt 0 ] && echo "   ✅ نجح:  ${BUILT[*]}"
[ ${#FAILED[@]} -gt 0 ] && echo "   ❌ فشل:  ${FAILED[*]}"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "الحزم الجاهزة في $DIST_DIR/:"
ls -lh "$DIST_DIR"/*.AppImage "$DIST_DIR"/*.deb "$DIST_DIR"/*.rpm 2>/dev/null \
    || echo "   (لا توجد مخرجات)"
echo ""
echo "💡 تشغيل AppImage: chmod +x $DIST_DIR/*.AppImage && $DIST_DIR/*.AppImage"
echo "💡 تثبيت DEB:    sudo dpkg -i $DIST_DIR/*.deb"
echo "💡 تثبيت RPM:    sudo rpm -i  $DIST_DIR/*.rpm"
echo ""

[ ${#BUILT[@]} -eq 0 ] && exit 1 || exit 0
