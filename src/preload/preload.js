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

                                // ── التصدير عبر ffmpeg ────────────────────────────
                                ffmpegEncode: (opts)     => ipcRenderer.invoke("ffmpeg-encode", opts),
                                ffmpegCancel: ()         => ipcRenderer.send("ffmpeg-cancel"),
                                onFfmpegProgress: (cb)   => ipcRenderer.on("ffmpeg-progress", (_e, d) => cb(d)),
                                offFfmpegProgress: ()    => ipcRenderer.removeAllListeners("ffmpeg-progress"),

                                // ── yt-dlp ────────────────────────────────────────
                                ytdlpDownload: (opts)    => ipcRenderer.invoke("ytdlp-download", opts),
                                ytdlpCancel:   ()        => ipcRenderer.send("ytdlp-cancel"),
                                onYtdlpProgress: (cb)    => ipcRenderer.on("ytdlp-progress", (_e, d) => cb(d)),
                                offYtdlpProgress: ()     => ipcRenderer.removeAllListeners("ytdlp-progress"),

                                // ── حوارات الملفات ────────────────────────────────
                                dialogSave: (opts) => ipcRenderer.invoke("dialog-save", opts),
                                dialogOpen: (opts) => ipcRenderer.invoke("dialog-open", opts),

                                // ── تحميل مباشر (wget / aria2c) ─────────────────────
                                directDownload: (opts) => ipcRenderer.invoke("direct-download", opts),

                                // ── أدوات النظام ──────────────────────────────────
                                writeTempBuffer: (arr) => ipcRenderer.invoke("write-temp-buffer", arr),
                                deleteTempFile:  (p)   => ipcRenderer.invoke("delete-temp-file", p),
                                openFolder: (path) => ipcRenderer.invoke("open-folder", path),
                                sysInfo:    ()     => ipcRenderer.invoke("sys-info"),

                                // ── قراءة ملفات محلية (للخطوط) ─────────────────────
                                readLocalFile: (rel) => ipcRenderer.invoke("read-local-file", rel),

                                // ── نسخة التطبيق ──────────────────────────────────
                                version: process.env.npm_package_version || "1.0.0",
                                isDesktop: true, // علامة للواجهة: هذا تطبيق سطح مكتب وليس متصفحاً
});
