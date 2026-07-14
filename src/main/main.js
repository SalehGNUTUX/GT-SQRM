"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn, execFile, exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

const isDev = process.env.NODE_ENV === "development";

// خريطة لتخزين المسارات بعد العثور عليها (تخزين مؤقت)
const binaryPaths = {
  ffmpeg: null,
  "yt-dlp": null
};

// قائمة بالمسارات الإضافية للبحث (بجانب PATH)
const EXTRA_PATHS = [
  "/usr/bin",
"/usr/local/bin",
"/opt/bin",
path.join(os.homedir(), ".local/bin"),
path.join(os.homedir(), "bin"),
// في حالة AppImage، المسار النسبي للمجلد bin بجانب التنفيذي
];

/**
 * البحث عن ملف تنفيذي في PATH وفي المسارات الإضافية
 * @param {string} name - اسم الملف التنفيذي (مثل 'ffmpeg' أو 'yt-dlp')
 * @returns {Promise<string|null>} المسار الكامل أو null إذا لم يوجد
 */
async function findBinary(name) {
  // إذا كان مخزناً مؤقتاً، أعده مباشرة
  if (binaryPaths[name]) return binaryPaths[name];

  // 1. البحث في PATH باستخدام which
  try {
    const { stdout } = await execPromise(`which ${name}`);
    const pathFromWhich = stdout.trim();
    if (pathFromWhich && fs.existsSync(pathFromWhich)) {
      binaryPaths[name] = pathFromWhich;
      return pathFromWhich;
    }
  } catch (e) {
    // which فشل، تابع البحث
  }

  // 2. البحث في المسارات الإضافية
  for (const base of EXTRA_PATHS) {
    const fullPath = path.join(base, name);
    if (fs.existsSync(fullPath)) {
      binaryPaths[name] = fullPath;
      return fullPath;
    }
  }

  // 3. في وضع الإنتاج (AppImage) ابحث بجانب التطبيق
  if (!isDev) {
    const appDir = path.dirname(app.getPath("exe"));
    const localBin = path.join(appDir, "bin", name);
    if (fs.existsSync(localBin)) {
      binaryPaths[name] = localBin;
      return localBin;
    }
  }

  // لم يتم العثور
  return null;
}

/**
 * الحصول على مسار الملف التنفيذي (مع تخزين مؤقت)
 */
async function getBinPath(name) {
  if (isDev) {
    // في وضع التطوير، نفضل البحث في PATH أولاً ثم الإضافية
    return await findBinary(name);
  } else {
    // في الإنتاج، نفضل المجلد المحلي أولاً، ثم النظام
    const appDir = path.dirname(app.getPath("exe"));
    const localBin = path.join(appDir, "bin", name);
    if (fs.existsSync(localBin)) return localBin;
    return await findBinary(name);
  }
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: "GT-SQRM — GnuTux Short Quran Reels Maker",
    icon: path.join(__dirname, "../../GT-SQRM-icons/all/512x512/GT-SQRM-icon.png"),
                                 backgroundColor: "#020b05",
                                 webPreferences: {
                                   preload: path.join(__dirname, "../preload/preload.js"),
                                 contextIsolation: true,
                                 nodeIntegration: false,
                                 sandbox: false,
                                 webSecurity: true,
                                 allowRunningInsecureContent: false,
                                 },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.webContents.on("console-message", (_e, level, msg) => {
    if (isDev) console.log(`[Renderer] ${msg}`);
  });

  // قائمة سياقية محسنة للنسخ واللصق في أي مكان
  mainWindow.webContents.on("context-menu", (_e, params) => {
    const { editFlags, isEditable, linkURL, selectionText } = params;
    const { Menu, MenuItem } = require("electron");
    const menu = new Menu();

    // إذا كان هناك نص محدد، أضف خيار نسخ
    if (selectionText) {
      menu.append(new MenuItem({ label: "نسخ النص", role: "copy" }));
    }
    // إذا كان هناك رابط، أضف خيار نسخ الرابط
    if (linkURL) {
      menu.append(new MenuItem({
        label: "نسخ الرابط",
        click: () => { clipboard.writeText(linkURL); }
      }));
    }
    // خيارات التحرير للحقول القابلة للتحرير
    if (isEditable) {
      if (editFlags.canCut)   menu.append(new MenuItem({ label: "قص",   role: "cut" }));
      if (editFlags.canCopy)  menu.append(new MenuItem({ label: "نسخ",  role: "copy" }));
      if (editFlags.canPaste) menu.append(new MenuItem({ label: "لصق",  role: "paste" }));
      menu.append(new MenuItem({ type: "separator" }));
      if (editFlags.canSelectAll) menu.append(new MenuItem({ label: "تحديد الكل", role: "selectAll" }));
    }

    if (menu.items.length > 0) {
      menu.popup({ window: mainWindow });
    }
  });

  // v3.1 — حماية الإغلاق مع modal مخصّص
  mainWindow.on("close", (e) => {
    if (mainWindow._allowClose) return;
    e.preventDefault();
    mainWindow.webContents.send("request-close-confirm");
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("confirm-close", () => {
  if (mainWindow) { mainWindow._allowClose = true; mainWindow.close(); }
});

// v3.1 — فتح ملفّ .gtsqrm من سطر الأوامر أو File Association
let _pendingProjectFile = null;
function extractProjectFileArg(argv) {
  for (const a of argv.slice(1)) {
    if (a && a.toLowerCase().endsWith(".gtsqrm") && fs.existsSync(a)) return a;
  }
  return null;
}
_pendingProjectFile = extractProjectFileArg(process.argv);

app.on("open-file", (event, filePath) => {
  event.preventDefault();
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send("project-open-from-disk", filePath);
  } else {
    _pendingProjectFile = filePath;
  }
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    const f = extractProjectFileArg(argv);
    if (f && mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send("project-open-from-disk", f);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  if (_pendingProjectFile && mainWindow) {
    mainWindow.webContents.once("did-finish-load", () => {
      mainWindow.webContents.send("project-open-from-disk", _pendingProjectFile);
      _pendingProjectFile = null;
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// v3.1 — IPC handlers للمشاريع
ipcMain.handle("project-save-dialog", async (_e, defaultName) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "حفظ المشروع",
    defaultPath: defaultName || `gt-sqrm-project-${Date.now()}.gtsqrm`,
    filters: [{ name: "GT-SQRM Project", extensions: ["gtsqrm"] }],
  });
  return result.canceled ? null : result.filePath;
});
ipcMain.handle("project-open-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "فتح مشروع",
    properties: ["openFile"],
    filters: [
      { name: "GT-SQRM Project", extensions: ["gtsqrm"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});
ipcMain.handle("project-write", async (_e, filePath, jsonStr) => {
  try { fs.writeFileSync(filePath, jsonStr, "utf8"); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});
ipcMain.handle("project-read", async (_e, filePath) => {
  try { return { ok: true, content: fs.readFileSync(filePath, "utf8") }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// ═══════════════════════════════════════════════════════
//  IPC HANDLERS
// ═══════════════════════════════════════════════════════

ipcMain.handle("check-deps", async () => {
  const results = {};

  // ffmpeg: يكتب الإصدار في stderr (الأمر الصحيح هو -version)
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) {
    results["ffmpeg"] = { ok: false, version: null };
  } else {
    try {
      // ffmpeg يكتب مخرجاته في stderr
      const { stdout, stderr } = await execPromise(
        `"${ffmpegPath}" -version`,
        { timeout: 5000 }
      ).catch(err => ({ stdout: err.stdout || "", stderr: err.stderr || "" }));
      const combined = (stdout + " " + stderr).trim();
      const ver = combined.split("\n")[0].trim();
      results["ffmpeg"] = { ok: !!ver, version: ver };
    } catch (_) {
      results["ffmpeg"] = { ok: false, version: null };
    }
  }

  // yt-dlp: يكتب الإصدار في stdout مع --version
  const ytdlpPath = await getBinPath("yt-dlp");
  if (!ytdlpPath) {
    results["yt-dlp"] = { ok: false, version: null };
  } else {
    try {
      const { stdout } = await execPromise(
        `"${ytdlpPath}" --version`,
        { timeout: 8000 }
      );
      const ver = stdout.trim().split("\n")[0];
      results["yt-dlp"] = { ok: !!ver, version: ver };
    } catch (err) {
      // حتى لو exit code != 0، إذا وجد path فهو موجود
      results["yt-dlp"] = { ok: !!ytdlpPath, version: "installed" };
    }
  }

  return results;
});

// ═══════════════════════════════════════════════════════
//  FRAME-PIPE ENCODER (محرك حتمي إطار-بإطار)
//  يستقبل إطارات JPEG عبر IPC ويضخّها لـ stdin
//  مع ملف صوت WAV لمزامنة الفيديو والصوت إلى إخراج واحد
// ═══════════════════════════════════════════════════════
const pipeState = { proc: null, stderr: "", canceled: false, drainResolver: null, lastProgressSent: 0 };

function awaitDrain(stream) {
  if (!stream || stream.writableNeedDrain === false) return Promise.resolve();
  return new Promise(res => stream.once("drain", res));
}

ipcMain.handle("ffmpeg-pipe-start", async (event, opts) => {
  const {
    fps, audioPath, outputPath,
    codec, crf, preset,
    audioCodec, audioBitrate,
    width, height,
    pixFormat,   // "rgba" (افتراضي/أسرع) | "mjpeg"
  } = opts;

  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) throw new Error("ffmpeg not found");

  if (pipeState.proc) {
    try { pipeState.proc.kill("SIGTERM"); } catch (_) {}
    pipeState.proc = null;
  }
  pipeState.stderr = "";
  pipeState.canceled = false;

  const isMp4 = /libx264|libx265/.test(codec);
  const fmt = pixFormat === "mjpeg" ? "mjpeg" : "rgba";
  const args = [
    "-y",
    "-loglevel", "info",
    "-thread_queue_size", "1024",
  ];
  if (fmt === "rgba") {
    // مدخل خام: أسرع بكثير، لا ترميز JPEG في المتصفح ولا فكّه في ffmpeg
    if (!width || !height) throw new Error("width/height required for rawvideo");
    args.push(
      "-f", "rawvideo",
      "-pix_fmt", "rgba",
      "-s", `${width}x${height}`,
      "-r", String(fps),
      "-i", "pipe:0",
    );
  } else {
    args.push(
      "-f", "image2pipe",
      "-vcodec", "mjpeg",
      "-r", String(fps),
      "-i", "pipe:0",
    );
  }

  if (audioPath) {
    args.push("-i", audioPath);
  }

  args.push(
    "-map", "0:v:0",
  );
  if (audioPath) args.push("-map", "1:a:0");

  args.push(
    "-c:v", codec,
    "-crf", String(crf),
    "-preset", preset,
    "-pix_fmt", "yuv420p",
    "-r", String(fps),
  );

  if (audioPath) {
    args.push(
      "-c:a", audioCodec,
      "-b:a", audioBitrate,
      "-shortest",
    );
  }

  if (isMp4) args.push("-movflags", "+faststart");
  args.push(outputPath);

  const proc = spawn(ffmpegPath, args);
  pipeState.proc = proc;

  pipeState.lastProgressSent = 0;
  proc.stderr.on("data", chunk => {
    const s = chunk.toString();
    pipeState.stderr += s;
    if (pipeState.stderr.length > 200000) {
      pipeState.stderr = pipeState.stderr.slice(-100000);
    }
    // throttle: 250ms على الأكثر بين رسائل التقدم — لتجنب فيضان IPC
    const now = Date.now();
    if (now - pipeState.lastProgressSent < 250) return;
    pipeState.lastProgressSent = now;
    const matches = s.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/g);
    const time = matches ? matches[matches.length - 1].replace("time=", "") : null;
    try { event.sender.send("ffmpeg-progress", { time, log: s }); } catch (_) {}
  });

  proc.stdin.on("error", err => {
    if (err.code !== "EPIPE") {
      console.error("[ffmpeg-pipe] stdin error:", err);
    }
  });

  return { ok: true, pid: proc.pid };
});

ipcMain.handle("ffmpeg-pipe-frame", async (_event, arrayBuffer) => {
  const proc = pipeState.proc;
  if (!proc) throw new Error("pipe not started");
  if (pipeState.canceled) throw new Error("cancelled");
  if (proc.exitCode !== null) {
    throw new Error(`ffmpeg exited prematurely (code ${proc.exitCode})\n${pipeState.stderr.slice(-600)}`);
  }
  const buf = Buffer.from(arrayBuffer);
  const ok = proc.stdin.write(buf);
  if (!ok) await awaitDrain(proc.stdin);
  return true;
});

ipcMain.handle("ffmpeg-pipe-end", async () => {
  const proc = pipeState.proc;
  if (!proc) return { ok: true };
  return new Promise((resolve, reject) => {
    proc.once("close", code => {
      pipeState.proc = null;
      if (pipeState.canceled) { reject(new Error("cancelled")); return; }
      if (code === 0) resolve({ ok: true });
      else reject(new Error(`ffmpeg exited with code ${code}\n${pipeState.stderr.slice(-1500)}`));
    });
    proc.once("error", err => { pipeState.proc = null; reject(err); });
    try { proc.stdin.end(); } catch (_) {}
  });
});

ipcMain.on("ffmpeg-pipe-cancel", () => {
  pipeState.canceled = true;
  if (pipeState.proc) {
    try { pipeState.proc.kill("SIGTERM"); } catch (_) {}
  }
});

// ── استخراج إطارات فيديو الخلفية مسبقاً (مرة واحدة) ───
//    أسرع وأكثر استقراراً من seek على HTMLVideoElement
ipcMain.handle("extract-bg-frames", async (event, opts) => {
  const { videoBytes, videoBytesList, clipDurations, clipTrims, transition, clipTransitions, crossfadeSec, fps, width, height, totalDuration, trimStart, trimEnd } = opts;
  // v1.2 — قائمة أَسماء xfade المَعروفة (يَحمي من قيمة مَجهولة تُفشِل ffmpeg)
  const XFADE_SAFE = new Set(["fade","wipeleft","wiperight","wipeup","wipedown","slideleft","slideright","slideup","slidedown","circleopen","circleclose","radial","dissolve","rectcrop","distance","pixelize","fadegrays","hlslice","hrslice","vuslice","vdslice"]);
  const xfadeName = (transition && XFADE_SAFE.has(transition)) ? transition : "fade";
  const xfadeAt = (i) => {
    // v1.2 — تَأثير المَقطع i إن حُدّد، وإلا العامّ
    const perClip = Array.isArray(clipTransitions) ? clipTransitions[i] : null;
    return (perClip && XFADE_SAFE.has(perClip)) ? perClip : xfadeName;
  };
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) throw new Error("ffmpeg not found");

  // ── دعم رفع متعدد للفيديوهات: نضمّها مسبقاً في ملف واحد ───
  let inputPath;
  const inputsToClean = [];
  const list = Array.isArray(videoBytesList) && videoBytesList.length ? videoBytesList : (videoBytes ? [videoBytes] : []);
  if (!list.length) throw new Error("no video data");

  if (list.length === 1) {
    inputPath = path.join(os.tmpdir(), `gt-sqrm-bg-${Date.now()}.bin`);
    fs.writeFileSync(inputPath, Buffer.from(list[0]));
    inputsToClean.push(inputPath);
  } else {
    // 1) اكتب كل مقطع في ملف مؤقت
    const tempFiles = list.map((bytes, i) => {
      const p = path.join(os.tmpdir(), `gt-sqrm-bg-src-${Date.now()}-${i}.bin`);
      fs.writeFileSync(p, Buffer.from(bytes));
      inputsToClean.push(p);
      return p;
    });
    // 2) ادمجها عبر filter_complex إلى ملف concat واحد
    const concatPath = path.join(os.tmpdir(), `gt-sqrm-bg-concat-${Date.now()}.mp4`);
    inputsToClean.push(concatPath);
    const W12 = Math.round(width * 1.2), H12 = Math.round(height * 1.2);
    // v1.2 Feature#2 — trim per-clip قبل scale/crop (setpts=PTS-STARTPTS بَعد trim)
    const hasTrims = Array.isArray(clipTrims) && clipTrims.length === tempFiles.length;
    const filterInputs = tempFiles.map((_, i) => {
      const tr = hasTrims ? clipTrims[i] : null;
      const trimSeg = (tr && (tr.start > 0.001 || tr.end > 0))
        ? `trim=start=${(tr.start || 0).toFixed(3)}:end=${(tr.end || 0).toFixed(3)},setpts=PTS-STARTPTS,`
        : "";
      return `[${i}:v:0]${trimSeg}scale=${W12}:${H12}:force_original_aspect_ratio=increase,crop=${W12}:${H12},setsar=1,fps=${fps},format=yuv420p[v${i}]`;
    }).join(";");

    // ── crossfade أو concat صلب ────────────────────────
    const xf = (typeof crossfadeSec === "number" && crossfadeSec > 0
                && Array.isArray(clipDurations) && clipDurations.length === tempFiles.length) ? crossfadeSec : 0;

    let chain;
    if (xf > 0 && tempFiles.length >= 2) {
      // xfade متسلسل: [v0][v1]xfade=offset=D0-xf[x1]; [x1][v2]xfade=offset=D0+D1-2*xf[x2]; ...
      const segs = [];
      let prev = "v0";
      let cum = 0;
      for (let i = 1; i < tempFiles.length; i++) {
        cum += Math.max(0.1, clipDurations[i - 1] - xf);
        const out = (i === tempFiles.length - 1) ? "outv" : `x${i}`;
        // v1.2 — تَأثير الاِنتقال من المَقطع (i-1) إلى (i): يَستَخدِم تَأثير المَقطع (i-1)
        segs.push(`[${prev}][v${i}]xfade=transition=${xfadeAt(i-1)}:duration=${xf}:offset=${cum.toFixed(3)}[${out}]`);
        prev = out;
      }
      chain = `${filterInputs};${segs.join(";")}`;
    } else {
      // concat صلب (افتراضي)
      const concatLabels = tempFiles.map((_, i) => `[v${i}]`).join("");
      chain = `${filterInputs};${concatLabels}concat=n=${tempFiles.length}:v=1[outv]`;
    }

    const concatArgs = ["-y", "-loglevel", "error"];
    tempFiles.forEach(p => { concatArgs.push("-i", p); });
    concatArgs.push(
      "-filter_complex", chain,
      "-map", "[outv]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p",
      concatPath
    );
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, concatArgs);
      let err = "";
      proc.stderr.on("data", d => { err += d.toString(); });
      proc.on("close", code => code === 0 ? resolve() : reject(new Error(`concat failed (${code}): ${err.slice(-400)}`)));
      proc.on("error", reject);
    });
    inputPath = concatPath;
  }

  // مجلد للإطارات
  const outDir = path.join(os.tmpdir(), `gt-sqrm-bgframes-${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });

  // 1.2× يكفي لجميع حركات الخلفية (drift/zoom/pan)
  // -q:v 6 جودة جيدة بصرياً وأسرع 30-40% في فكّ ترميز ImageBitmap
  const scaleW = Math.round(width  * 1.2);
  const scaleH = Math.round(height * 1.2);
  const totalFrames = Math.ceil(totalDuration * fps);
  const pattern = path.join(outDir, "f_%05d.jpg");

  // عند تفعيل التقطيع: -ss/-to قبل الإدخال + -stream_loop يكرّر الجزء المُقتطع فقط
  const trimArgs = [];
  if (typeof trimStart === "number" && trimStart >= 0) {
    trimArgs.push("-ss", String(trimStart));
  }
  if (typeof trimEnd === "number" && trimEnd > (trimStart || 0)) {
    trimArgs.push("-to", String(trimEnd));
  }

  const args = [
    "-y", "-loglevel", "error",
    "-stream_loop", "-1",
    ...trimArgs,
    "-i", inputPath,
    "-vf", `fps=${fps},scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH}`,
    "-frames:v", String(totalFrames),
    "-q:v", "6",
    pattern,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args);
    let stderr = "";
    proc.stderr.on("data", d => { stderr += d.toString(); });
    proc.on("close", code => {
      inputsToClean.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
      if (code !== 0) {
        try { fs.rmSync(outDir, { recursive: true, force: true }); } catch (_) {}
        reject(new Error(`bg extract failed (code ${code}): ${stderr.slice(-400)}`));
        return;
      }
      // اجمع المسارات الموجودة فعلاً (قد يقلّ عدد المخرجات إن فشلت فقرات)
      try {
        const files = fs.readdirSync(outDir)
          .filter(f => f.startsWith("f_") && f.endsWith(".jpg"))
          .sort()
          .map(f => path.join(outDir, f));
        resolve({ dir: outDir, files, width: scaleW, height: scaleH });
      } catch (e) {
        reject(e);
      }
    });
    proc.on("error", err => reject(err));
  });
});

ipcMain.handle("cleanup-bg-frames", async (_e, dir) => {
  if (!dir) return true;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
  return true;
});

// قراءة ملف من /tmp فقط (للإطارات المستخرَجة) — تتجاوز قيود SOP لـ file:// fetch
ipcMain.handle("read-tmp-file", async (_e, filePath) => {
  if (!filePath || typeof filePath !== "string") return null;
  // أمان: لا تسمح إلا بقراءة من os.tmpdir()
  const tmpRoot = os.tmpdir();
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(tmpRoot + path.sep) && resolved !== tmpRoot) {
    throw new Error("read-tmp-file: path must be under tmpdir");
  }
  return fs.readFileSync(resolved);
});

ipcMain.handle("ffmpeg-encode", async (event, opts) => {
  const { inputPath, outputPath, codec, crf, preset, audioCodec, audioBitrate } = opts;
  const ffmpegPath = await getBinPath("ffmpeg");
  if (!ffmpegPath) {
    throw new Error("ffmpeg not found");
  }

  return new Promise((resolve, reject) => {
    const args = [
      "-y", "-i", inputPath,
      "-c:v", codec, "-crf", String(crf), "-preset", preset,
                     "-c:a", audioCodec, "-b:a", audioBitrate,
                     "-movflags", "+faststart", outputPath
    ];

    const proc = spawn(ffmpegPath, args);
    let stderr = "";

    proc.stderr.on("data", chunk => {
      stderr += chunk.toString();
      const match = stderr.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/g);
      if (match) {
        const last = match[match.length - 1].replace("time=", "");
        event.sender.send("ffmpeg-progress", { time: last, log: chunk.toString() });
      }
    });

    proc.on("close", code => {
      if (code === 0) resolve({ ok: true, outputPath });
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-1000)}`));
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ffmpeg-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

ipcMain.handle("ytdlp-download", async (event, opts) => {
  const { url, type, quality, startTime, endTime, dlSaveMode, dlSavePath } = opts;
  const ytdlpPath = await getBinPath("yt-dlp");
  if (!ytdlpPath) throw new Error("yt-dlp not found");

  // تحديد مجلد الحفظ
  let saveDir = os.tmpdir();
  if (dlSaveMode === "permanent") {
    if (dlSavePath) {
      try {
        if (!fs.existsSync(dlSavePath)) {
          fs.mkdirSync(dlSavePath, { recursive: true });
        }
        saveDir = dlSavePath;
        event.sender.send("ytdlp-progress", { line: `📁 مجلد الحفظ: ${saveDir}` });
      } catch (err) {
        event.sender.send("ytdlp-progress", { line: `⚠️ فشل استخدام المجلد ${dlSavePath}: ${err.message} — سيُستخدم /tmp` });
      }
    } else {
      event.sender.send("ytdlp-progress", { line: "⚠️ لم يُحدد مجلد للحفظ — سيُستخدم /tmp" });
    }
  } else {
    event.sender.send("ytdlp-progress", { line: `📁 مجلد مؤقت: ${saveDir}` });
  }

  const outTmpl = path.join(saveDir, "gt-sqrm-%(id)s-%(title).30B.%(ext)s");

  let args;
  if (type === "audio") {
    args = ["-x", "--audio-format", "mp3", "--audio-quality", "0", "-o", outTmpl, url];
  } else {
    args = [
      "-f", quality || "bestvideo[height<=1080]+bestaudio/best[height<=1080]",
      "--merge-output-format", "mp4",
      "-o", outTmpl, url
    ];
  }

  if (startTime || endTime) {
    const s = startTime || "00:00:00";
    const e = endTime   || "99:59:59";
    args.push("--download-sections", `*${s}-${e}`);
    args.push("--force-keyframes-at-cuts");
    event.sender.send("ytdlp-progress", { line: `✂️ القطع: ${s} → ${e}` });
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(ytdlpPath, args);
    let stdout = "", stderr = "";

    proc.stdout.on("data", chunk => {
      stdout += chunk.toString();
      const lines = chunk.toString().split("\n").filter(Boolean);
      lines.forEach(line => event.sender.send("ytdlp-progress", { line }));
    });

    proc.stderr.on("data", chunk => {
      stderr += chunk.toString();
      chunk.toString().split("\n").filter(Boolean).forEach(line =>
      event.sender.send("ytdlp-progress", { line }));
    });

    proc.on("close", code => {
      // yt-dlp قد يعيد exit code != 0 في حالات بسيطة — نتحقق أولاً من الملف
      // استخرج مسار الملف من مخرجات yt-dlp (سطر [download] Destination: أو already been downloaded)
      const destMatch = stderr.match(/\[download\] Destination: (.+)/m)
      || stderr.match(/\[download\] (.+?) has already been downloaded/m);
      if (destMatch) {
        const filePath = destMatch[1].trim();
        if (fs.existsSync(filePath)) {
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
          return;
        }
      }
      const destMatchOut = stdout.match(/\[download\] Destination: (.+)/m)
      || stdout.match(/\[download\] (.+?) has already been downloaded/m);
      if (destMatchOut) {
        const filePath = destMatchOut[1].trim();
        if (fs.existsSync(filePath)) {
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
          return;
        }
      }
      if (code !== 0) { reject(new Error(stderr.slice(-800))); return; }
      // احتياط: ابحث عن أحدث ملف gt-sqrm في saveDir
      try {
        const files = fs.readdirSync(saveDir)
        .filter(f => f.startsWith("gt-sqrm-"))
        .map(f => ({ f, t: fs.statSync(path.join(saveDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
        if (files.length > 0) {
          const filePath = path.join(saveDir, files[0].f);
          event.sender.send("ytdlp-progress", { line: `✅ الملف: ${filePath}` });
          resolve({ ok: true, filePath });
        } else {
          reject(new Error("لم يُعثر على الملف المحمّل في " + saveDir));
        }
      } catch (e) {
        reject(new Error("خطأ في البحث عن الملف: " + e.message));
      }
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ytdlp-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

// ── تحميل رابط مباشر عبر wget أو aria2c ──────────────
ipcMain.handle("direct-download", async (event, opts) => {
  const { url, tool, type, dlSaveMode, dlSavePath } = opts;

  // تحديد الأداة المتاحة
  let chosenTool = tool || "wget";
  let toolPath   = await getBinPath(chosenTool);

  // احتياطي: إذا طُلبت أداة غير موجودة، جرّب الأخرى
  if (!toolPath) {
    const fallback = chosenTool === "wget" ? "aria2c" : "wget";
    toolPath = await getBinPath(fallback);
    if (toolPath) {
      chosenTool = fallback;
      event.sender.send("ytdlp-progress", {
        line: `⚠️ ${tool} غير متاح — سيُستخدم ${fallback} بدلاً`
      });
    } else {
      throw new Error(`لا توجد أداة تحميل (wget أو aria2c) — ثبّتها أولاً`);
    }
  }

  // تحديد امتداد الملف من الرابط
  let ext = path.extname(new URL(url).pathname).toLowerCase().replace(".", "") || "";
  if (!ext) {
    if (type === "video") ext = "mp4";
    else if (type === "audio") ext = "mp3";
    else ext = "jpg";
  }

  // تحديد مجلد الحفظ
  let saveDir = os.tmpdir();
  if (dlSaveMode === "permanent" && dlSavePath) {
    try {
      if (!fs.existsSync(dlSavePath)) fs.mkdirSync(dlSavePath, { recursive: true });
      saveDir = dlSavePath;
    } catch (err) {
      event.sender.send("ytdlp-progress", { line: `⚠️ فشل المجلد — يُستخدم /tmp` });
    }
  }
  event.sender.send("ytdlp-progress", { line: `📁 مجلد الحفظ: ${saveDir}` });
  const tmpFile = path.join(saveDir, `gt-sqrm-direct-${Date.now()}.${ext}`);

  // بناء الأوامر
  let args;
  if (chosenTool === "wget") {
    args = ["-O", tmpFile, "--progress=dot:default", url];
  } else { // aria2c
    args = [
      "-o", path.basename(tmpFile),
               "-d", path.dirname(tmpFile),
               "--show-console-readout=true",
               "--summary-interval=1",
               url
    ];
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(toolPath, args);
    let outBuf = "";

    const onData = chunk => {
      outBuf += chunk.toString();
      const lines = outBuf.split(/[\r\n]/);
      outBuf = lines.pop();
      lines.filter(Boolean).forEach(line => {
        event.sender.send("ytdlp-progress", { line });
      });
    };

    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData); // wget يكتب في stderr

    proc.on("close", code => {
      if (code === 0 && fs.existsSync(tmpFile)) {
        event.sender.send("ytdlp-progress", { line: `✅ تم التحميل: ${tmpFile}` });
        resolve({ ok: true, filePath: tmpFile });
      } else {
        reject(new Error(`${chosenTool} انتهى بكود ${code}`));
      }
    });

    proc.on("error", err => reject(err));

    ipcMain.once("ytdlp-cancel", () => {
      proc.kill("SIGTERM");
      reject(new Error("cancelled"));
    });
  });
});

ipcMain.handle("dialog-save", async (_e, opts) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: opts.title || "حفظ الملف",
    defaultPath: opts.defaultPath || `GT-SQRM-output.${opts.ext || "mp4"}`,
      filters: opts.filters || [{ name: "Video", extensions: ["mp4", "webm", "mkv"] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle("dialog-open", async (_e, opts) => {
  const isDir = opts.properties?.includes("openDirectory");
  const result = await dialog.showOpenDialog(mainWindow, {
    title:      opts.title || (isDir ? "اختر مجلداً" : "اختر ملفاً"),
                                             properties: opts.properties || (opts.multiple ? ["openFile", "multiSelections"] : ["openFile"]),
                                             filters:    isDir ? undefined : (opts.filters || [{ name: "All Files", extensions: ["*"] }]),
  });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle("open-folder", async (_e, filePath) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle("write-temp-file", async (_e, arrayBuffer) => {
  const tmpFile = path.join(os.tmpdir(), `gt-sqrm-tmp-${Date.now()}.webm`);
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(tmpFile, buffer);
  return tmpFile;
});

ipcMain.handle("write-temp-buffer", async (_e, arrayBuffer, ext) => {
  const safeExt = (ext || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  const tmpFile = path.join(os.tmpdir(), `gt-sqrm-buf-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`);
  fs.writeFileSync(tmpFile, Buffer.from(arrayBuffer));
  return tmpFile;
});

ipcMain.handle("read-local-file", async (_e, relPath) => {
  // مسارات نسبية تحت مجلد renderer فقط (الخطوط/الموارد المحلية)
  const safe = String(relPath || "").replace(/\\/g, "/").replace(/\.\.+/g, "");
  const full = path.join(__dirname, "..", "renderer", safe);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full);
});

ipcMain.handle("delete-temp-file", async (_e, filePath) => {
  try { fs.unlinkSync(filePath); } catch (_) { }
  return true;
});

ipcMain.handle("sys-info", () => ({
  platform: process.platform,
  arch: process.arch,
  cpus: os.cpus().length,
                                  totalMem: Math.round(os.totalmem() / 1024 / 1024 / 1024) + " GB",
                                  tmpDir: os.tmpdir(),
                                  home: os.homedir(),
                                  appVer: app.getVersion(),
}));
