<div align="center">

# GT-SQRM
### GnuTux Short Quran Reels Maker
<img src="https://github.com/SalehGNUTUX/GT-SQRM/blob/main/GT-SQRM-icon.png" width="256" alt="GT-SQR Logo" />


**نسخة سطح المكتب من GT-SQR — حصرياً لنظام GNU/Linux**

[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-green.svg)](https://www.gnu.org/licenses/old-licenses/gpl-3.0.html)
[![Platform: Linux](https://img.shields.io/badge/Platform-GNU%2FLinux-orange?logo=linux)](https://github.com/SalehGNUTUX/GT-SQRM)
[![Electron](https://img.shields.io/badge/Built%20with-Electron-47848F?logo=electron)](https://www.electronjs.org/)
[![ffmpeg](https://img.shields.io/badge/Export-ffmpeg-green?logo=ffmpeg)](https://ffmpeg.org/)
[![yt-dlp](https://img.shields.io/badge/Import-yt--dlp-red)](https://github.com/yt-dlp/yt-dlp)

</div>

---

## الفرق عن GT-SQR (نسخة المتصفح)

| الجانب | GT-SQR (متصفح) | GT-SQRM (Linux) |
|--------|----------------|-----------------|
| التصدير | MediaRecorder (محدود) | **ffmpeg كامل** |
| الصيغ | WebM · MP4 فقط | H.264 · H.265 · VP9 · **AV1** |
| الجودة | محدودة بقيود المتصفح | **CRF كامل — لا سقف للجودة** |
| استيراد خلفيات | رفع يدوي فقط | **yt-dlp من يوتيوب** |
| الخطوط المحلية | تحتاج HTTP server | مسار ملف مباشر |
| الصوت | قيود CORS | لا قيود |
| التصدير في الخلفية | مقيّد | **حرية كاملة** |

---

## البداية السريعة

### التشغيل في وضع التطوير

```bash
git clone https://github.com/SalehGNUTUX/GT-SQRM.git
cd GT-SQRM
bash scripts/dev-setup.sh
npm run dev
```

المتطلبات: `node` · `npm` · `ffmpeg` · `yt-dlp`

### بناء AppImage

```bash
bash scripts/build-appimage.sh
# المخرج: dist/GT-SQRM-1.0.0.AppImage
chmod +x dist/GT-SQRM-*.AppImage
./dist/GT-SQRM-*.AppImage
```

السكريبت يحمّل ffmpeg و yt-dlp تلقائياً ويحزمهما داخل AppImage.

---

## هيكل المشروع

```
GT-SQRM/
├── src/
│   ├── main/
│   │   └── main.js          # Main Process — إدارة النافذة + IPC
│   ├── preload/
│   │   └── preload.js       # الجسر الآمن بين Main و Renderer
│   └── renderer/
│       ├── index.html       # الواجهة (من GT-SQR + إضافات)
│       ├── app.js           # منطق التطبيق (من GT-SQR + إضافات)
│       ├── export-engine.js # محرك التصدير عبر ffmpeg
│       └── ytdlp-panel.js   # لوحة استيراد yt-dlp
├── resources/
│   ├── icons/               # أيقونات التطبيق
│   └── bin/                 # ffmpeg + yt-dlp (تُحمَّل بواسطة build script)
├── scripts/
│   ├── build-appimage.sh    # بناء AppImage كامل
│   └── dev-setup.sh         # إعداد بيئة التطوير
└── package.json
```

---

## المصادر المضمّنة

- **ffmpeg** — static build من [johnvansickle.com](https://johnvansickle.com/ffmpeg/)
- **yt-dlp** — من [GitHub Releases الرسمي](https://github.com/yt-dlp/yt-dlp/releases)

---

## الرخصة

GNU General Public License v3.0 — مفتوح المصدر بالكامل.
