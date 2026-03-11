"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SQRM — Export Engine (Renderer Side)
//  يستبدل MediaRecorder بـ ffmpeg عبر IPC
// ═══════════════════════════════════════════════════════

// ── ثوابت الصيغ المتاحة ────────────────────────────────
const EXPORT_CODECS = {
  "mp4-h264": {
    label:     "MP4 — H.264 (متوافق عالمياً)",
    ext:       "mp4",
    codec:     "libx264",
    audioCodec:"aac",
    defaultCrf: 23,
    presets:   ["fast","medium","slow"],
  },
  "mp4-h265": {
    label:     "MP4 — H.265/HEVC (أصغر حجماً)",
    ext:       "mp4",
    codec:     "libx265",
    audioCodec:"aac",
    defaultCrf: 28,
    presets:   ["fast","medium","slow"],
  },
  "webm-vp9": {
    label:     "WebM — VP9 (مفتوح المصدر)",
    ext:       "webm",
    codec:     "libvpx-vp9",
    audioCodec:"libopus",
    defaultCrf: 33,
    presets:   ["realtime","good","best"],
  },
  "mkv-av1": {
    label:     "MKV — AV1 (أعلى كفاءة - بطيء)",
    ext:       "mkv",
    codec:     "libaom-av1",
    audioCodec:"libopus",
    defaultCrf: 35,
    presets:   ["realtime","good","best"],
  },
};

// ── تصدير المشروع الكامل ──────────────────────────────
// الخطوات:
// 1. Canvas → WebM خام عبر MediaRecorder (كما كان في GT-SQR)
// 2. WebM المؤقت → ffmpeg → الصيغة النهائية بجودة أعلى
// 3. حذف الملف المؤقت

async function startDesktopExport(opts) {
  const {
    canvas,         // HTMLCanvasElement
    audioStream,    // MediaStream من AudioContext
    totalDuration,  // ثواني
    formatKey,      // مفتاح EXPORT_CODECS
    crf,            // جودة
    preset,         // سرعة الترميز
    audioBitrate,   // معدل بت الصوت
    onProgress,     // callback(pct, label, log)
    onDone,         // callback(outputPath)
    onError,        // callback(err)
  } = opts;

  const fmt = EXPORT_CODECS[formatKey] || EXPORT_CODECS["mp4-h264"];

  // ── المرحلة 1: تسجيل WebM مؤقت ───────────────────
  onProgress(0, "⏺ جاري التسجيل…");

  let tmpPath;
  try {
    tmpPath = await recordToTempFile({
      canvas,
      audioStream,
      totalDuration,
      onProgress: pct => onProgress(pct * 0.5, `⏺ تسجيل… ${pct}%`),
    });
  } catch (err) {
    onError(err); return;
  }

  // ── المرحلة 2: حوار حفظ الملف ────────────────────
  onProgress(50, "📁 اختر مكان الحفظ…");

  const outputPath = await window.SQRM.dialogSave({
    title:       "حفظ الفيديو",
    defaultPath: `GT-SQRM-${Date.now()}.${fmt.ext}`,
    ext:         fmt.ext,
    filters: [{ name: fmt.label, extensions: [fmt.ext] }],
  });

  if (!outputPath) {
    // المستخدم ألغى الحوار
    cleanTmp(tmpPath);
    onError(new Error("cancelled")); return;
  }

  // ── المرحلة 3: ffmpeg encode ──────────────────────
  onProgress(52, "🎬 جاري الترميز بـ ffmpeg…");

  window.SQRM.onFfmpegProgress(({ time, log }) => {
    // تحويل HH:MM:SS.xx إلى نسبة مئوية
    const secs  = timeToSeconds(time);
    const pct   = Math.min(99, 50 + Math.round((secs / totalDuration) * 48));
    onProgress(pct, `🎬 ffmpeg: ${time}`, log);
  });

  try {
    await window.SQRM.ffmpegEncode({
      inputPath:    tmpPath,
      outputPath,
      codec:        fmt.codec,
      crf:          crf ?? fmt.defaultCrf,
      preset:       preset ?? "medium",
      audioCodec:   fmt.audioCodec,
      audioBitrate: audioBitrate ?? "192k",
    });
  } catch (err) {
    window.SQRM.offFfmpegProgress();
    cleanTmp(tmpPath);
    onError(err); return;
  }

  window.SQRM.offFfmpegProgress();
  cleanTmp(tmpPath);
  onProgress(100, "✅ اكتمل التصدير!");
  onDone(outputPath);
}

// ── تسجيل Canvas إلى ملف WebM مؤقت ────────────────────
function recordToTempFile({ canvas, audioStream, totalDuration, onProgress }) {
  return new Promise((resolve, reject) => {
    const tracks   = [...canvas.captureStream(30).getTracks(), ...audioStream.getTracks()];
    const stream   = new MediaStream(tracks);
    const chunks   = [];
    const mime     = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
                   ? "video/webm;codecs=vp9,opus" : "video/webm";
    const mr       = new MediaRecorder(stream, { mimeType: mime });
    const startedAt = performance.now();

    mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      // حفظ Blob كملف مؤقت عبر IPC
      blob.arrayBuffer().then(async buf => {
        // أرسل البيانات للـ main process ليكتبها
        try {
          const tmpPath = await window.SQRM.writeTempFile(buf);
          resolve(tmpPath);
        } catch (e) { reject(e); }
      });
    };

    mr.onerror = err => reject(err);

    // مؤقت تقدم وهمي
    const iv = setInterval(() => {
      const elapsed = (performance.now() - startedAt) / 1000;
      onProgress(Math.min(98, Math.round((elapsed / totalDuration) * 100)));
    }, 500);

    mr.start(100);
    setTimeout(() => { clearInterval(iv); mr.stop(); }, totalDuration * 1000 + 200);
  });
}

// ── أدوات مساعدة ────────────────────────────────────
function timeToSeconds(str) {
  // "00:01:23.45" → 83.45
  const [h, m, s] = str.split(":").map(parseFloat);
  return h * 3600 + m * 60 + s;
}

function cleanTmp(path) {
  if (!path) return;
  try { /* IPC call to delete */ window.SQRM.deleteTempFile?.(path); } catch (_) {}
}

// ── تصدير الثوابت والدوال ────────────────────────────
window.EXPORT_CODECS    = EXPORT_CODECS;
window.startDesktopExport = startDesktopExport;
