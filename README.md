<div align="center">

# GT-SQRM
### GnuTux Short Quran Reels Maker
<img src="https://github.com/SalehGNUTUX/GT-SQRM/blob/main/GT-SQRM-icon.png" width="256" alt="GT-SQRM Logo" />

**نسخة سطح المكتب من GT-SQR — حصرياً لنظام GNU/Linux**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
[![Platform: Linux](https://img.shields.io/badge/Platform-GNU%2FLinux-orange?logo=linux)](https://github.com/SalehGNUTUX/GT-SQRM)
[![Electron](https://img.shields.io/badge/Built%20with-Electron-47848F?logo=electron)](https://www.electronjs.org/)
[![ffmpeg](https://img.shields.io/badge/Export-ffmpeg%20V2-green?logo=ffmpeg)](https://ffmpeg.org/)
[![Version](https://img.shields.io/badge/Version-3.4.0-brightgreen)](./CHANGELOG.md)

</div>

---

## 📖 نبذة عن البرنامج

**GT-SQRM** هو تطوير سطح المكتب لـ **GT-SQR** (نسخة المتصفح PWA). الإصدار **3.4.0** ينقل من GT-SIRM v1.2 نِظام Undo/Redo عامّ، إعماء (hidden) لكُلّ مَقطع خَلفيّة، تَقليم لكُلّ مَقطع (per-clip trim)، 11 نَمط اِنتقال بَديل عن fade فَقط، عَلامة مائيّة مُطَوَّرة بتوگل تَفعيل + إزاحة رَأسيّة، وإصلاحات جَوهريّة في تَشغيل مَقاطع الخَلفيّة (الوَميض/الصَوت المُستَمِرّ/استعادة المَحذوف). الإصدار 3.0.0 كان قَد أضاف اسم السورة في الأعلى، 10 أنماط ظهور للآيات، 9 أنماط ألوان، 9 أشكال ذَبذبات صوتية، قوالب منصات قابلة للحفظ، تحزيم Linux ثلاثي (AppImage/DEB/RPM)، ومزامنة كاملة بين النسختين.

> 🌐 **النسخة الويب التجريبية متاحة على:** [salehgnutux.github.io/GT-SQR](https://salehgnutux.github.io/GT-SQR/)

---

## 🆕 الجَديد في v3.4.0 (منقول من GT-SIRM v1.2)

### 🎬 مقاطع الخَلفيّة (playlist) — 12 تَحسيناً وإصلاحاً
- **👁️ إعماء (hidden) لِكُلّ مَقطع** — يَبقى في القائمة، يُتَخَطّى في التَبديل والـcrossfade والتَصدير. زَرّ 👁️/👁️‍🗨️ في كُلّ صَفّ.
- **✂️ تَقليم لِكُلّ مَقطع (per-clip trim)** — حَقلا "من/إلى" بجَنب كُلّ مَقطع + زَرّ ↺ إفراغ. يَعمَل في المُعاينَة والتَصدير (ffmpeg xfade+trim).
- **🎨 11 نَمط اِنتقال** — بَديل عن fade فَقط: `wipeleft/right/slideleft/right/up/down/circleopen/close/radial/dissolve`. عامّ + per-clip من dropdown في كُلّ صَفّ. نُعومة حَواف قابِلة للضَبط (0-100%).
- **↩️ Undo/Redo عامّ** — 30 إجراءً مَحفوظاً، أزرار في شَريط الأدوات، اختصارات `Ctrl+Z` / `Ctrl+Y` / `Ctrl+Shift+Z`.
- **♻️ استعادة آخر مَقطع مَحذوف** — بضَغطة زَرّ.
- **🌟 وميض ذَهبيّ عِند النَقل** — تَمييز بَصريّ + scroll إلى الصَفّ.
- **🖱️ نَقر عَلى صَفّ يُنَشِّط المُعاينَة** — بَدون الحاجة لأَزرار.
- **🐛 Bug#4** — المَقطع القَديم يُوقَف بَعد التَبديل (كان يَستَمِرّ يَعمَل في الخَلفيّة).
- **✨ إصلاح الوَميض** — الاِنتقال فَوريّ عِند نِهاية المَقطع بَدَل اِنتظار `ended`.
- **🔊 صَوت مُستَمِرّ** — كُلّ المَقاطع المَرئيّة تُبقي مَواضِعها في timeline (يُصلِح: صَوت مَقطع واحد كان يَتَوَقَّف قَبل نِهاية الفيديو المُصَدَّر).
- **📥 استعادة تَتابُعيّة** — عَند فَتح مَشروع، تُطَبَّق الإعدادات مُباشَرَةً على كُلّ مَقطع بَعد `await`.
- **🎬 WebM Infinity fix** — تَقليم يَعمَل مَع WebM بمُدّة `Infinity`.

### 🏷️ العَلامة المائيّة
- **توگل تَفعيل** `#wm-on` (اِفتراضيّاً مُفَعَّل حِفاظاً عَلى السُلوك السابِق).
- **إزاحة رَأسيّة** 0-40% مَع مُراعاة المَواضِع الأَربعة.

### ⏯️ إصلاحات المُشَغِّل
- التِلاوة تَبدأ من مَوضِع `S.elapsed` (يَدعَم استئناف من مَنتَصَف الآية).
- `pausePlayer` / `startPlayer` يَشمَلان الآن `S.bgVidNext` أَيضاً.
- `restartAll` يُعيد ضَبط `S.bgVid` + `bgVidNext` + `bgVidFadeProgress` + preview.

راجع [`CHANGELOG.md`](./CHANGELOG.md) لِلتَفاصيل الكامِلة.

---

## ✨ المميزات الرئيسية (v3.0.0)

### 🎬 محرّك تصدير V2 حتمي (Frame-pipe)
- **رسم إطار-بإطار** عند `t = i/FPS` بالضبط → لا تقطّع نهائياً
- **Raw RGBA pipe** مباشر لـ ffmpeg → 5× أسرع من JPEG
- **استخراج إطارات الخلفية مسبقاً** كـ JPEG → لا اختفاء فيديو
- **مزامنة صوت كاملة** عبر `OfflineAudioContext` → WAV
- **مدة MP4 صحيحة** تلقائياً (لا حاجة لمعالجة موس)
- **Crossfade سلس** بين مقاطع خلفية متعدّدة عبر `xfade` filter

### 📿 عرض كلمة-بكلمة للآيات
- خيار رابع لظهور الآيات يكشف الكلمات تتابعياً
- 4 إيقاعات (تلقائي + يدوي)
- إبقاء/إخفاء الكلمات السابقة
- مدّة تلاشي قابلة للضبط
- **يحافظ على تخطيط wrapText** بدون قفز

### 🔍 بحث الآيات والسور بتطبيع التشكيل
- بحث في كامل القرآن (6,236 آية) بدون تشكيل
- `الفاتحه` يطابق `الفَاتِحَة`
- `الرحمن` يطابق `الرَّحْمَٰن`
- تظليل النص المُطابِق بـ ذهبي
- نقر النتيجة → انتقال فوري

### 📚 العمل دون اتصال (Offline-first)
- القرآن الكامل (~1.5MB) محفوظ محلياً
- الترجمات مخزَّنة لكل (سورة، نسخة)
- قائمة السور دائمة (`localStorage`)
- 3 طبقات fallback: محلي → جلسة → API

### 🎥 رفع متعدد لخلفيات الفيديو
- عدة مقاطع دفعة واحدة عبر `multiple` input
- قائمة قابلة لإعادة الترتيب (▲ ▼ ✕)
- تتابع تلقائي مع crossfade
- **تأثير فوري عند إعادة الترتيب**

### ✂️ تقطيع زمني للوسائط المحلية
- توجل + حقول بداية/نهاية تحت كل من:
  - فيديو الخلفية
  - صوت الخلفية
- يطبَّق في المعاينة والتصدير V2

### 🎯 قوالب جاهزة للمنصات
- Reels/Shorts/TikTok 1080×1920
- YouTube 1920×1080 / 1280×720
- Instagram Square 1080×1080 / Portrait 1080×1350
- Cinema 21:9 2560×1080
- نسبة 4:5 مضافة لراديوهات `fmt`

### 🔠 16 خط عربي قرآني
| الخط | المصدر | الترخيص |
|---|---|---|
| Amiri Quran | المشروع | OFL |
| Uthmanic Hafs | مدمج | — |
| **خط نسخ العثماني** | المستخدم | — |
| **AALMaghribi** | المستخدم | — |
| **Scheherazade New** | SIL | OFL |
| **Lateef** | SIL | OFL |
| **Harmattan** | SIL/Google | OFL |
| **Reem Kufi** | Google | OFL |
| **Tajawal** | Google | OFL |
| Noto Sans Arabic (3 أوزان) | Google | OFL |
| Ubuntu Arabic (2) | Canonical | UFL |
| KAHandNaskh | حر | — |
| Arslan Wessam | حر | — |

### ✨ التأثيرات البصرية (20+)
- **بصرية**: Vignette · Grain · Stars · Rays · Bokeh
- **إطار ذهبي** بلون قابل للتخصيص
- **متقدّمة (8)**: Pixelate · Mosaic · Ripple · Wave · Swirl · Kaleidoscope · Glitch · Old Film
- **9 أنماط ألوان** (v3): عادي · دافئ · بارد · ليلي · صحراء · سينمائي · B&W · Sepia · بنفسجي رمضاني
- **سمات لونية** (8): زمرد · ذهبي · ليلي · وردي · محيط · صحراء · بنفسجي · داكن

### 🎵 نظام صوتي متطوّر
- **9 أشكال لموجة الصوت** (v3): bars · line · area · dots · mirror · radial · blocks · pulse · wave3D
- **مضاعف الحدّة** `wave-gain` يصل إلى 300%
- **فصل تام** بين كتم المعاينة وكتم التصدير
- **صوت per-clip** لكل خلفية فيديو (تشغيل/كتم/مستوى مستقل)
- **30+ قارئ** مدمج (مع إمكانية إضافة قراء مخصصين)
- **8 ترجمات/تفاسير** (تفسير ميسر، جلالين، Sahih، Pickthall، Hamidullah، أردو)

### 🎭 ظهور الآيات (v3 — 10 أنماط + المختلط)
- مباشر · تلاشي · انزلاق · تكبير · سقوط · صعود · ضبابي · دوران · ارتداد · يمين-يسار
- **وضع مختلط**: يدوّر الأنماط بترتيب ثابت حسب رقم الآية
- مزامنة بين "ظهور الآيات" في تبويب النصوص و"انتقالات الآيات" في تبويب التأثيرات

### 📿 اسم السورة في الأعلى (جديد v3)
- قسم مستقل في **أعلى** تبويب النصوص
- الموضع العمودي + حجم الخط + اللون + البادئة
- ثلاث صياغات: `سُورَةُ [الاسم]` / `[الاسم]` فقط / `حِزْبُ [الاسم]`

### 🖼️ شعار مخصّص محفوظ
- صور (PNG/SVG/JPG) → محفوظة في `localStorage` بين الجلسات
- فيديو MOV/WebM شفّاف → يعمل لكن لا يُحفظ (حجمه كبير)
- موضع + حجم + شفافية قابلة للتخصيص

### 📥 استيراد الوسائط
- **yt-dlp**: تنزيل من يوتيوب ومئات المواقع
- **wget / aria2c**: روابط مباشرة (mp4/jpg/mp3)
- تقطيع زمني عند التنزيل
- خيار مجلد حفظ دائم منفصل عن مجلد التصدير

### 💾 قوالب + تصدير دفعي
- حفظ كل الإعدادات كقالب باسم
- استرجاع بنقرة واحدة
- تصدير دفعي لقائمة سور دفعة واحدة

---

## 🆕 ما الجديد في v3.0.0

راجع [`CHANGELOG.md`](./CHANGELOG.md) للتفاصيل الكاملة. الأبرز:

| المقياس | v2.0 | v3.0 |
|---|---|---|
| **أنماط ظهور الآيات** | 4 | **10 + المختلط** |
| **أنماط الألوان** | 4 | **9** |
| **أشكال موجة الصوت** | 6 | **9** + مضاعف 300% |
| **اسم السورة في الأعلى** | ✗ | ✅ |
| **قوالب المنصات الكاملة** | أبعاد فقط | **أنماط + قوالب مستخدم محفوظة** |
| **صوت per-clip** | ✗ | ✅ |
| **صيغ التحزيم Linux** | AppImage + DEB | **AppImage + DEB + RPM** |
| **مزامنة النسختين** | جزئية | **مدققة كاملاً (354 ID)** |

---

## 📥 التحميل والتنصيب

### التحميل المباشر
- **AppImage** (يعمل على كل توزيعات Linux): [GT-SQRM-3.4.0.AppImage](https://github.com/SalehGNUTUX/GT-SQRM/releases)
- **حزمة Deb** (Debian/Ubuntu/Mint): [GT-SQRM-3.4.0.deb](https://github.com/SalehGNUTUX/GT-SQRM/releases)
- **حزمة RPM** (Fedora/RHEL/openSUSE): [GT-SQRM-3.4.0.rpm](https://github.com/SalehGNUTUX/GT-SQRM/releases)

### تثبيت AppImage
```bash
chmod +x GT-SQRM-3.4.0.AppImage
./GT-SQRM-3.4.0.AppImage
```

### تثبيت حزمة Deb (Debian/Ubuntu)
```bash
sudo dpkg -i GT-SQRM-3.4.0.deb
sudo apt --fix-broken install  # إذا لزم
```

### تثبيت حزمة RPM (Fedora/RHEL/openSUSE)
```bash
sudo dnf install ./GT-SQRM-3.4.0.rpm         # Fedora / RHEL 9+
# أو:
sudo rpm -i GT-SQRM-3.4.0.rpm
# أو على openSUSE:
sudo zypper install ./GT-SQRM-3.4.0.rpm
```

### دمج AppImage في قائمة البرامج
```bash
flatpak install flathub it.mijorus.gearlever
# ثم اسحب AppImage إلى نافذة GearLever
```

---

## 🛠️ البناء من المصدر

### المتطلبات
- Node.js 18+
- npm
- ffmpeg (مطلوب)
- yt-dlp (اختياري لاستيراد الوسائط)

### الخطوات
```bash
git clone https://github.com/SalehGNUTUX/GT-SQRM.git
cd GT-SQRM
npm install
npm run dev          # وضع التطوير
npm run build        # بناء AppImage فقط
npm run build:deb    # بناء DEB
npm run build:rpm    # بناء RPM (يلزم rpmbuild على النظام)
npm run build:all    # بناء الصيغ الثلاث دفعة واحدة
```

### متطلبات بناء RPM
على أنظمة Debian/Ubuntu يلزم تثبيت أدوات RPM لتمكين البناء المتقاطع:
```bash
sudo apt install rpm
```
على Fedora/RHEL تكون متوفرة بشكل افتراضي.

### هيكل المشروع
```
GT-SQRM/
├── src/
│   ├── main/main.js              # Main process + ffmpeg IPC + V2 pipeline
│   ├── preload/preload.js        # API bridge آمن
│   └── renderer/
│       ├── index.html            # الواجهة
│       ├── app.js                # كل المنطق
│       ├── export-engine.js      # محرّك V2 الحتمي
│       ├── ytdlp-panel.js        # لوحة yt-dlp
│       └── fonts/                # 16 خط عربي
├── resources/bin/                # ffmpeg + yt-dlp (تُحمَّل عبر build script)
├── scripts/
│   ├── build-appimage.sh         # بناء AppImage كامل
│   └── dev-setup.sh              # إعداد بيئة التطوير
├── CHANGELOG.md                  # سجل التغييرات
├── ../ROADMAP.md                 # خارطة الطريق المشتركة
└── package.json
```

---

## 🗺️ خارطة الطريق

راجع [`../ROADMAP.md`](../ROADMAP.md) للخطّة الكاملة. الأولويات القادمة لـ v3.x / v4.0:

1. **تسجيل تلاوة من الميكروفون** داخل التطبيق
2. **تصدير SRT/VTT** بجانب الفيديو
3. **تخزين الصوتيات بالطلب** (سور كاملة بدون اتصال)
4. **معاينة الترجمة في القماش** بدل تبويب منفصل
5. **مكتبة قوالب جاهزة من المجتمع** (استيراد/تصدير قوالب)
6. **حزمة Flatpak و Snap** بجانب AppImage/DEB/RPM

---

## 🤝 المساهمة والدعم

- **المستودع**: [GitHub](https://github.com/SalehGNUTUX/GT-SQRM)
- **الإصدارات**: [Releases](https://github.com/SalehGNUTUX/GT-SQRM/releases)
- **تتبع المشاكل**: [Issues](https://github.com/SalehGNUTUX/GT-SQRM/issues)
- **النسخة الويب**: [GT-SQR](https://github.com/SalehGNUTUX/GT-SQR) (PWA)

---

## 📄 الرخصة

GNU General Public License v3.0 — مفتوح المصدر بالكامل.

---

<div align="center">
تم التطوير بـ ❤️ لخدمة القرآن الكريم
<br>
<a href="https://github.com/SalehGNUTUX/GT-SQRM">⭐ GitHub</a>
</div>
