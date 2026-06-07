"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SQRM — Export Engine V2 (Deterministic frame-pipe)
//  يرسم كل إطار يدوياً عند t = i/FPS، يحوّله إلى JPEG،
//  ويرسله مباشرةً إلى ffmpeg عبر stdin مع مسار صوتي WAV
//  مختلَط مسبقاً عبر OfflineAudioContext.
//  النتيجة: لا تقطّع، لا انجراف زمني، جودة احترافية.
// ═══════════════════════════════════════════════════════

const EXPORT_CODECS = {
  "mp4-h264":  { label: "MP4 — H.264 (متوافق عالمياً)", ext: "mp4", codec: "libx264",    audioCodec: "aac",     defaultCrf: 20, presets: ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"] },
  "mp4-h265":  { label: "MP4 — H.265/HEVC (أصغر حجماً)", ext: "mp4", codec: "libx265",    audioCodec: "aac",     defaultCrf: 25, presets: ["ultrafast","superfast","veryfast","faster","fast","medium","slow","slower","veryslow"] },
  "webm-vp9":  { label: "WebM — VP9 (مفتوح المصدر)",     ext: "webm",codec: "libvpx-vp9", audioCodec: "libopus", defaultCrf: 31, presets: ["realtime","good","best"] },
  "mkv-av1":   { label: "MKV — AV1 (أعلى كفاءة - بطيء)",  ext: "mkv", codec: "libaom-av1", audioCodec: "libopus", defaultCrf: 32, presets: ["realtime","good","best"] },
};

// ── FFT صغير (Cooley-Tukey radix-2) لتحليل طيف الصوت ──
//   يُستخدم لحساب بيانات الموجة الصوتية لكل إطار في V2
function fftMagnitudes(input) {
  const N = input.length;
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let i = 0; i < N; i++) re[i] = input[i];
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp;
      tmp = im[i]; im[i] = im[j]; im[j] = tmp;
    }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang), wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cRe = 1, cIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const tRe = cRe * re[b] - cIm * im[b];
        const tIm = cRe * im[b] + cIm * re[b];
        re[b] = re[a] - tRe; im[b] = im[a] - tIm;
        re[a] += tRe; im[a] += tIm;
        const ncr = cRe * wRe - cIm * wIm;
        cIm = cRe * wIm + cIm * wRe;
        cRe = ncr;
      }
    }
  }
  const mag = new Float32Array(N >> 1);
  for (let i = 0; i < (N >> 1); i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) / N;
  return mag;
}

function precomputeWaveDataForExport(mixed, totalFrames, FPS) {
  // يحاكي تماماً سلوك AnalyserNode المُستخدم في المعاينة:
  //   fftSize=512, smoothingTimeConstant=0.82
  //   minDecibels=-100, maxDecibels=-30 (افتراضيّات Web Audio API)
  // الناتج: ذبذبات هابطة بانسيابيّة مطابقة للمعاينة (slow falling).
  const sr = mixed.sampleRate;
  const ch0 = mixed.getChannelData(0);
  const ch1 = mixed.numberOfChannels > 1 ? mixed.getChannelData(1) : null;
  const N = 512;
  const halfN = N >> 1;
  const bins = 64;

  // نافذة Blackman (المستخدمة فعلياً في AnalyserNode — أدقّ من Hann)
  const blackman = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    blackman[i] = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1))
                       + 0.08 * Math.cos((4 * Math.PI * i) / (N - 1));
  }

  // نطاق الصوت البشريّ (مطابق للمعاينة)
  const voiceStart = 1;
  const voiceEnd = Math.min(35, halfN - 1);
  const voiceLen = voiceEnd - voiceStart + 1;

  const SMOOTHING = 0.82;
  const MIN_DB = -100;
  const MAX_DB = -30;
  const DB_RANGE = MAX_DB - MIN_DB;

  const smoothedDB = new Float32Array(halfN);
  for (let i = 0; i < halfN; i++) smoothedDB[i] = MIN_DB;

  const window = new Float32Array(N);
  const out = new Array(totalFrames);

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / FPS;
    const startSample = Math.max(0, Math.floor(t * sr) - halfN);
    for (let i = 0; i < N; i++) {
      const idx = startSample + i;
      let s = 0;
      if (idx < ch0.length) {
        s = ch0[idx];
        if (ch1) s = (s + ch1[idx]) * 0.5;
      }
      window[i] = s * blackman[i];
    }

    const mag = fftMagnitudes(window);

    for (let i = 0; i < halfN; i++) {
      const m = Math.max(mag[i], 1e-10);
      const db = 20 * Math.log10(m);
      smoothedDB[i] = SMOOTHING * smoothedDB[i] + (1 - SMOOTHING) * db;
    }

    const data = new Uint8Array(bins);
    for (let b = 0; b < bins; b++) {
      const srcIdx = voiceStart + Math.floor((b / bins) * voiceLen);
      const normalized = (smoothedDB[srcIdx] - MIN_DB) / DB_RANGE;
      data[b] = Math.max(0, Math.min(255, Math.floor(normalized * 255)));
    }
    out[frame] = data;
  }
  return out;
}

// ── خلط الصوت إلى AudioBuffer واحد ───────────────────
async function mixAudioToBuffer({
  audioBuffers, ayaStarts,
  bgBuffer, bgGain, bgLoop,
  bgVidAudioItems,          // [{buffer, gain, dur}] لخلفيات الفيديو مع صوت
  bgVidCrossfadeSec,
  totalDuration, recGain, sampleRate = 44100,
}) {
  const channels = 2;
  const length = Math.max(1, Math.ceil(totalDuration * sampleRate));
  const oac = new OfflineAudioContext(channels, length, sampleRate);

  // 1) المسار الرئيسي (التلاوة)
  (audioBuffers || []).forEach((buf, i) => {
    if (!buf) return;
    const src = oac.createBufferSource();
    src.buffer = buf;
    const gain = oac.createGain();
    gain.gain.value = recGain ?? 1;
    src.connect(gain);
    gain.connect(oac.destination);
    src.start(ayaStarts[i] ?? 0);
  });

  // 2) صوت الخلفية (مع التكرار إن طُلب)
  if (bgBuffer) {
    const dur = bgBuffer.duration;
    let t = 0;
    let safety = 0;
    while (t < totalDuration && safety++ < 4096) {
      const src = oac.createBufferSource();
      src.buffer = bgBuffer;
      const gain = oac.createGain();
      gain.gain.value = bgGain ?? 0.3;
      src.connect(gain);
      gain.connect(oac.destination);
      const remaining = totalDuration - t;
      if (remaining < dur) src.start(t, 0, remaining);
      else                 src.start(t);
      if (!bgLoop) break;
      t += dur;
    }
  }

  // 3) أصوات خلفيات الفيديو (per-clip) — تحترم crossfade overlap
  if (Array.isArray(bgVidAudioItems) && bgVidAudioItems.length) {
    const xf = Math.max(0, bgVidCrossfadeSec || 0);
    const starts = [];
    let cum = 0;
    for (let i = 0; i < bgVidAudioItems.length; i++) {
      starts.push(cum);
      cum += Math.max(0.1, (bgVidAudioItems[i].dur || 0) - xf);
    }
    const cycleDur = cum + xf;
    let cycleStart = 0, safety = 0;
    while (cycleStart < totalDuration && safety++ < 100) {
      for (let i = 0; i < bgVidAudioItems.length; i++) {
        const it = bgVidAudioItems[i];
        if (!it.buffer) continue;
        const startTime = cycleStart + starts[i];
        if (startTime >= totalDuration) break;
        const src = oac.createBufferSource();
        src.buffer = it.buffer;
        const gain = oac.createGain();
        gain.gain.value = it.gain ?? 0.5;
        src.connect(gain); gain.connect(oac.destination);
        const remaining = totalDuration - startTime;
        if (remaining < it.buffer.duration) src.start(startTime, 0, remaining);
        else                                src.start(startTime);
      }
      if (cycleDur <= 0.1) break;
      cycleStart += cycleDur;
    }
  }

  return await oac.startRendering();
}

// ── قطع AudioBuffer لنطاق زمني محدّد ────────────────
function sliceAudioBuffer(buf, startSec, endSec) {
  const sr = buf.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sr));
  const endSample   = Math.min(buf.length, Math.floor(endSec * sr));
  const length = Math.max(1, endSample - startSample);
  // إنشاء AudioBuffer جديد عبر OfflineAudioContext (تجنّب new AudioBuffer مباشرة)
  const ctx = new OfflineAudioContext(buf.numberOfChannels, length, sr);
  const newBuf = ctx.createBuffer(buf.numberOfChannels, length, sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch);
    const dst = newBuf.getChannelData(ch);
    for (let i = 0; i < length; i++) dst[i] = src[startSample + i];
  }
  return newBuf;
}

// ── تحويل AudioBuffer إلى WAV (PCM 16-bit) ───────────
function audioBufferToWav(buffer) {
  const numCh = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);

  // RIFF header
  writeStr(view, 0, "RIFF");
  view.setUint32(4, totalSize - 8, true);
  writeStr(view, 8, "WAVE");
  // fmt chunk
  writeStr(view, 12, "fmt ");
  view.setUint32(16, 16, true);           // PCM chunk size
  view.setUint16(20, 1, true);            // format = PCM
  view.setUint16(22, numCh, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);           // bits per sample
  // data chunk
  writeStr(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // interleave + clamp
  const chans = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = chans[c][i];
      s = Math.max(-1, Math.min(1, s));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }
  }
  return ab;
}

function writeStr(view, offset, str) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

// ── الالتقاط الخام من canvas (RGBA) ───────────────────
//   getImageData على canvas بـ willReadFrequently:true سريع جداً
//   ولا يمر عبر ترميز/فكّ JPEG — هذا هو طريق الأداء العالي
function canvasToRgbaBuffer(ctx, W, H) {
  const data = ctx.getImageData(0, 0, W, H).data;
  // الـ ImageData الجديد دائماً يبدأ في byteOffset=0 ويملك بافر بطول W*H*4 بالضبط
  // → نُرسل البافر مباشرة دون نسخة إضافية. IPC سيقوم بنسخه مرة واحدة فقط.
  return data.buffer;
}

// ── تحميل JPEG من القرص كـ ImageBitmap ─────────────────
//   نستخدم IPC لقراءة البايتات لأن fetch("file://...") محظور
//   تحت webSecurity:true (Chromium يعتبر كل URL مختلف origin)
async function loadBitmapFromPath(filePath) {
  const buf = await window.SQRM.readTmpFile(filePath);
  if (!buf) throw new Error("readTmpFile returned null for " + filePath);
  // Buffer من Node يصل كـ Uint8Array في الـ renderer
  const blob = new Blob([buf], { type: "image/jpeg" });
  return await createImageBitmap(blob);
}

// ── استخراج بايتات الفيديو من HTMLVideoElement ─────────
async function fetchVideoBytes(vid) {
  if (!vid || !vid.src) return null;
  try {
    const res = await fetch(vid.src);
    const ab  = await res.arrayBuffer();
    return ab;
  } catch (_) { return null; }
}

// ═══════════════════════════════════════════════════════
//  المحرّك الرئيسي (V2)
// ═══════════════════════════════════════════════════════
async function startDesktopExportV2(opts) {
  const {
    canvas,
    drawFrame,           // (t, frameIndex) => void  — يرسم على canvas مباشرة
    setStateForTime,     // (t) => void              — يحدّث S.currentAya/elapsed للواجهة
    setBgFrameImage,     // (img) => void            — يضع إطار الخلفية الحالي
    totalDuration,
    fps,
    audioBuffers,
    ayaStarts,
    bgBuffer,            // AudioBuffer لصوت الخلفية (اختياري)
    bgGain,
    bgLoop,
    recGain,
    bgVideo,             // HTMLVideoElement لخلفية الفيديو (اختياري)
    bgVideoBytes,        // ArrayBuffer واحد للفيديو
    bgVideoBytesList,    // Array<ArrayBuffer> لـ playlist (يضمّ في ffmpeg)
    bgClipDurations,     // مدد المقاطع (للـ xfade)
    bgCrossfadeSec,      // مدة الـ crossfade بالثواني
    bgVidTrim,           // {start,end} لتقطيع فيديو الخلفية (اختياري)
    bgAudioTrim,         // {start,end} لتقطيع صوت الخلفية (اختياري)
    codecKey,
    crf,
    preset,
    audioBitrate,
    outputPath,
    onProgress,          // (pct, label, log?) => void
    cancelRef,           // { canceled: boolean }
  } = opts;

  const fmt = EXPORT_CODECS[codecKey] || EXPORT_CODECS["mp4-h264"];
  const FPS = Math.max(1, Math.floor(fps || 30));
  const totalFrames = Math.max(1, Math.ceil(totalDuration * FPS));
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // ── 1) خلط الصوت ──────────────────────────────────
  // قطع مقطع صوت الخلفية حسب نطاق التقطيع (إن وُجد) قبل الخلط
  let bgBufferTrimmed = bgBuffer;
  if (bgBuffer && bgAudioTrim && bgAudioTrim.end > bgAudioTrim.start) {
    bgBufferTrimmed = sliceAudioBuffer(bgBuffer, bgAudioTrim.start, bgAudioTrim.end);
  }
  onProgress(2, "🎵 جاري خلط المسار الصوتي…");
  // اجمع صوت خلفيات الفيديو المُفعّل صوتها
  const bgVidAudioItems = (typeof S !== "undefined" && Array.isArray(S.bgVidItems))
    ? S.bgVidItems
        .filter(it => it.audioEnabled && it.audioBuffer)
        .map(it => ({ buffer: it.audioBuffer, gain: it.audioGain, dur: it.dur }))
    : [];
  const mixed = await mixAudioToBuffer({
    audioBuffers, ayaStarts,
    bgBuffer: bgBufferTrimmed, bgGain, bgLoop,
    bgVidAudioItems,
    bgVidCrossfadeSec: bgCrossfadeSec || 0,
    totalDuration, recGain,
  });
  const wavAb = audioBufferToWav(mixed);
  if (cancelRef?.canceled) throw new Error("cancelled");

  // ── 1.5) بيانات الموجة الصوتية لكل إطار (FFT مسبق) ──
  onProgress(3, "📊 حساب بيانات الموجة الصوتية…");
  const exportWaveData = precomputeWaveDataForExport(mixed, totalFrames, FPS);

  // ── 2) كتابة الصوت في ملف مؤقت ─────────────────────
  onProgress(4, "💾 حفظ المسار الصوتي…");
  const audioPath = await window.SQRM.writeTempBuffer(wavAb, "wav");

  // ── 3) استخراج إطارات فيديو الخلفية مسبقاً (إن وُجد) ──
  let bgFramesDir = null;
  let bgFramePaths = null;
  const hasMulti = Array.isArray(bgVideoBytesList) && bgVideoBytesList.length > 1;
  if (bgVideo || bgVideoBytes || hasMulti) {
    try {
      if (hasMulti) {
        onProgress(5, `🎥 ضمّ ${bgVideoBytesList.length} مقاطع خلفية…`);
      } else {
        onProgress(5, "🎥 جاري قراءة فيديو الخلفية…");
      }
      const vidBytes = !hasMulti ? (bgVideoBytes || (bgVideo ? await fetchVideoBytes(bgVideo) : null)) : null;
      if (vidBytes || hasMulti) {
        onProgress(6, "🎞 استخراج إطارات الخلفية مسبقاً عبر ffmpeg…");
        const extracted = await window.SQRM.extractBgFrames({
          videoBytes: vidBytes,
          videoBytesList: hasMulti ? bgVideoBytesList : null,
          clipDurations:  hasMulti ? bgClipDurations : null,
          crossfadeSec:   hasMulti ? bgCrossfadeSec  : 0,
          fps: FPS,
          width:  W,
          height: H,
          totalDuration,
          trimStart: hasMulti ? undefined : bgVidTrim?.start,
          trimEnd:   hasMulti ? undefined : bgVidTrim?.end,
        });
        bgFramesDir  = extracted.dir;
        bgFramePaths = extracted.files;
        console.log(`[V2] bg frames extracted: ${bgFramePaths?.length || 0} files (expected ~${totalFrames})`);
        if (!bgFramePaths || bgFramePaths.length < 2) {
          console.warn("[V2] only", bgFramePaths?.length, "bg frames produced — bg will appear static");
        }
      } else {
        console.warn("Could not fetch bg video bytes — falling back to live video element");
      }
    } catch (e) {
      console.warn("bg frame extraction failed:", e);
      bgFramesDir = null; bgFramePaths = null;
    }
  }
  if (cancelRef?.canceled) {
    if (bgFramesDir) { try { await window.SQRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    try { await window.SQRM.deleteTempFile(audioPath); } catch (_) {}
    throw new Error("cancelled");
  }

  // ── 4) تشغيل ffmpeg ─ raw RGBA ───────────────────
  onProgress(7, "🎬 بدء ffmpeg…");
  await window.SQRM.ffmpegPipeStart({
    fps: FPS,
    audioPath,
    outputPath,
    codec:        fmt.codec,
    crf:          (crf != null) ? crf : fmt.defaultCrf,
    preset:       preset || "medium",
    audioCodec:   fmt.audioCodec,
    audioBitrate: audioBitrate || "192k",
    width:        W,
    height:       H,
    pixFormat:    "rgba",
  });

  // ── 5) حلقة الإطارات (حتمية وسريعة) ────────────────
  //    تحميل الـ ImageBitmap مسبقاً بـ 6 إطارات أمام
  //    لإخفاء كلفة IPC + JPEG decode خلف الترميز
  const PREFETCH = 6;
  const bmpCache = new Map();   // index -> Promise<ImageBitmap | null>

  let bmpLoadErrors = 0;
  const prefetch = (idx) => {
    if (!bgFramePaths) return;
    for (let k = idx; k < Math.min(bgFramePaths.length, idx + PREFETCH); k++) {
      if (!bmpCache.has(k)) {
        bmpCache.set(k, loadBitmapFromPath(bgFramePaths[k]).catch(err => {
          if (bmpLoadErrors++ < 3) console.warn("bg bmp load failed:", bgFramePaths[k], err);
          return null;
        }));
      }
    }
  };

  let lastUiTick = 0;
  try {
    for (let i = 0; i < totalFrames; i++) {
      if (cancelRef?.canceled) throw new Error("cancelled");

      const t = i / FPS;

      // إطار الخلفية المسبق
      if (bgFramePaths) {
        const idx = Math.min(i, bgFramePaths.length - 1);
        prefetch(idx);
        const bmp = await bmpCache.get(idx);
        if (setBgFrameImage) setBgFrameImage(bmp || null);
        // حرّر القديم لتفادي تضخم الذاكرة
        const oldKey = idx - PREFETCH;
        if (bmpCache.has(oldKey)) {
          const old = await bmpCache.get(oldKey);
          if (old && old.close) try { old.close(); } catch (_) {}
          bmpCache.delete(oldKey);
        }
      }

      // بيانات الموجة الصوتية للإطار الحالي (V2 يخلط الصوت offline فلا توجد analyser data)
      S._exportWaveData = exportWaveData[i];
      if (setStateForTime) setStateForTime(t);
      drawFrame(t);

      const frameBuf = canvasToRgbaBuffer(ctx, W, H);
      await window.SQRM.ffmpegPipeFrame(frameBuf);

      const now = performance.now();
      if (now - lastUiTick > 200 || i === totalFrames - 1) {
        lastUiTick = now;
        const encodePct = Math.round(((i + 1) / totalFrames) * 90);
        onProgress(7 + encodePct, `🎞 إطار ${i + 1}/${totalFrames}  ·  ${formatTime(t)} / ${formatTime(totalDuration)}`);
      }
    }
  } catch (err) {
    try { window.SQRM.ffmpegPipeCancel(); } catch (_) {}
    try { await window.SQRM.deleteTempFile(audioPath); } catch (_) {}
    if (bgFramesDir) { try { await window.SQRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    if (setBgFrameImage) setBgFrameImage(null);
    S._exportWaveData = null;
    throw err;
  }

  // ── 6) إغلاق وإنهاء ffmpeg ─────────────────────────
  onProgress(98, "📦 جاري إنهاء التغليف…");
  try {
    await window.SQRM.ffmpegPipeEnd();
  } finally {
    try { await window.SQRM.deleteTempFile(audioPath); } catch (_) {}
    if (bgFramesDir) { try { await window.SQRM.cleanupBgFrames(bgFramesDir); } catch (_) {} }
    if (setBgFrameImage) setBgFrameImage(null);
    S._exportWaveData = null;
    // أغلق جميع ImageBitmaps المتبقية
    for (const v of bmpCache.values()) {
      try { const bmp = await v; if (bmp && bmp.close) bmp.close(); } catch (_) {}
    }
    bmpCache.clear();
  }

  onProgress(100, "✅ اكتمل التصدير!");
  return { ok: true, outputPath };
}

function formatTime(s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2,"0")}:${String(r).padStart(2,"0")}`;
}

// ── تصدير عمومي ───────────────────────────────────────
window.EXPORT_CODECS         = EXPORT_CODECS;
window.startDesktopExportV2  = startDesktopExportV2;
window.audioBufferToWav      = audioBufferToWav;
