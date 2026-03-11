"use strict";

const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
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

  // السماح بالقائمة السياقية (نقر أيمن) في حقول الإدخال
  mainWindow.webContents.on("context-menu", (_e, params) => {
    const { editFlags, isEditable } = params;
    if (!isEditable) return;

    const { Menu, MenuItem } = require("electron");
    const menu = new Menu();

    if (editFlags.canCut)   menu.append(new MenuItem({ label: "قص",   role: "cut" }));
    if (editFlags.canCopy)  menu.append(new MenuItem({ label: "نسخ",  role: "copy" }));
    if (editFlags.canPaste) menu.append(new MenuItem({ label: "لصق",  role: "paste" }));
    menu.append(new MenuItem({ type: "separator" }));
    if (editFlags.canSelectAll) menu.append(new MenuItem({ label: "تحديد الكل", role: "selectAll" }));

    menu.popup({ window: mainWindow });
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
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
  if (dlSaveMode === "permanent" && dlSavePath) {
    try {
      if (!fs.existsSync(dlSavePath)) fs.mkdirSync(dlSavePath, { recursive: true });
      saveDir = dlSavePath;
    } catch (_) {
      event.sender.send("ytdlp-progress", { line: "⚠️ فشل إنشاء المجلد — سيُستخدم /tmp" });
    }
  }
  event.sender.send("ytdlp-progress", { line: `📁 مجلد الحفظ: ${saveDir}` });

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

  // نطاق الوقت
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
      // yt-dlp يكتب تقدم التحميل في stderr
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
      // ابحث في stdout أيضاً
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
  const { url, tool, type } = opts;

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

  const tmpFile = path.join(os.tmpdir(), `gt-sqrm-direct-${Date.now()}.${ext}`);

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
