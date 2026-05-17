"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SQRM — Preload (الجسر الآمن)
//  يعرض API محدود للواجهة عبر contextBridge
//  الواجهة لا تلمس Node.js مباشرة — هذا هو الصح أمنياً
// ═══════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("SQRM", {

  // ── فحص التبعيات ──────────────────────────────────
  checkDeps: () => ipcRenderer.invoke("check-deps"),

  // ── التصدير عبر ffmpeg (الطريقة القديمة: transcode من ملف) ─
  ffmpegEncode:      (opts)  => ipcRenderer.invoke("ffmpeg-encode", opts),
  ffmpegCancel:      ()      => ipcRenderer.send("ffmpeg-cancel"),
  onFfmpegProgress:  (cb)    => ipcRenderer.on("ffmpeg-progress", (_e, d) => cb(d)),
  offFfmpegProgress: ()      => ipcRenderer.removeAllListeners("ffmpeg-progress"),

  // ── التصدير الحتمي: بثّ إطارات raw/jpeg لـ ffmpeg مباشرة ───
  ffmpegPipeStart:  (opts)  => ipcRenderer.invoke("ffmpeg-pipe-start", opts),
  ffmpegPipeFrame:  (ab)    => ipcRenderer.invoke("ffmpeg-pipe-frame", ab),
  ffmpegPipeEnd:    ()      => ipcRenderer.invoke("ffmpeg-pipe-end"),
  ffmpegPipeCancel: ()      => ipcRenderer.send("ffmpeg-pipe-cancel"),

  // ── استخراج إطارات فيديو الخلفية مسبقاً ───────────────
  extractBgFrames:  (opts)  => ipcRenderer.invoke("extract-bg-frames", opts),
  cleanupBgFrames:  (dir)   => ipcRenderer.invoke("cleanup-bg-frames", dir),
  readTmpFile:      (p)     => ipcRenderer.invoke("read-tmp-file", p),

  // ── yt-dlp ────────────────────────────────────────
  ytdlpDownload:    (opts)  => ipcRenderer.invoke("ytdlp-download", opts),
  ytdlpCancel:      ()      => ipcRenderer.send("ytdlp-cancel"),
  onYtdlpProgress:  (cb)    => ipcRenderer.on("ytdlp-progress", (_e, d) => cb(d)),
  offYtdlpProgress: ()      => ipcRenderer.removeAllListeners("ytdlp-progress"),

  // ── حوارات الملفات ────────────────────────────────
  dialogSave: (opts) => ipcRenderer.invoke("dialog-save", opts),
  dialogOpen: (opts) => ipcRenderer.invoke("dialog-open", opts),

  // ── تحميل مباشر (wget / aria2c) ─────────────────────
  directDownload: (opts) => ipcRenderer.invoke("direct-download", opts),

  // ── أدوات النظام / ملفات مؤقتة ───────────────────────
  writeTempBuffer: (ab, ext) => ipcRenderer.invoke("write-temp-buffer", ab, ext),
  // اسم قديم محفوظ للتوافق العكسي مع شيفرات سابقة
  writeTempFile:   (ab)      => ipcRenderer.invoke("write-temp-file", ab),
  deleteTempFile:  (p)       => ipcRenderer.invoke("delete-temp-file", p),
  openFolder:      (p)       => ipcRenderer.invoke("open-folder", p),
  sysInfo:         ()        => ipcRenderer.invoke("sys-info"),

  // ── قراءة ملفات محلية (للخطوط/الموارد) ──────────────
  readLocalFile: (rel) => ipcRenderer.invoke("read-local-file", rel),

  // ── نسخة التطبيق ──────────────────────────────────
  version: process.env.npm_package_version || "1.2.0",
  isDesktop: true, // علامة للواجهة: هذا تطبيق سطح مكتب وليس متصفحاً
});
