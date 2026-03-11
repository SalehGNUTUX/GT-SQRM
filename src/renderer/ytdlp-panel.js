"use strict";

// ═══════════════════════════════════════════════════════
//  GT-SQRM — yt-dlp Panel
//  استيراد الخلفيات من يوتيوب ومواقع أخرى
// ═══════════════════════════════════════════════════════

let _dlInProgress = false;

// ── فتح/إغلاق لوحة yt-dlp ────────────────────────────
function openYtdlpPanel() {
  const panel = document.getElementById("ytdlp-panel");
  if (panel) panel.classList.add("open");
}

function closeYtdlpPanel() {
  const panel = document.getElementById("ytdlp-panel");
  if (panel) panel.classList.remove("open");
}

// ── تنفيذ التحميل ────────────────────────────────────
async function runYtdlpDownload() {
  if (_dlInProgress) return;

  const url  = document.getElementById("ytdlp-url")?.value?.trim();
  const type = document.querySelector('input[name="dl-type"]:checked')?.value || "video";

  if (!url) { showYtdlpMsg("⚠️ أدخل رابط الفيديو أولاً", "warn"); return; }
  if (!url.startsWith("http")) { showYtdlpMsg("⚠️ رابط غير صالح", "warn"); return; }

  _dlInProgress = true;
  setYtdlpUI(true);
  showYtdlpMsg("⏳ جاري التحميل…", "info");
  clearYtdlpLog();

  // الاستماع لتقدم التحميل
  window.SQRM.onYtdlpProgress(({ line }) => appendYtdlpLog(line));

  try {
    const result = await window.SQRM.ytdlpDownload({ url, type });

    window.SQRM.offYtdlpProgress();

    if (type === "video") {
      // حمّل الفيديو كخلفية مباشرة
      applyDownloadedBackground(result.filePath, "video");
      showYtdlpMsg("✅ تم التحميل وتطبيق الخلفية!", "success");
    } else {
      // حمّل الصوت كموسيقى خلفية
      applyDownloadedBackground(result.filePath, "audio");
      showYtdlpMsg("✅ تم التحميل وتطبيق صوت الخلفية!", "success");
    }
  } catch (err) {
    window.SQRM.offYtdlpProgress();
    if (err.message === "cancelled") {
      showYtdlpMsg("🚫 تم الإلغاء", "warn");
    } else {
      showYtdlpMsg("❌ فشل التحميل: " + err.message.slice(0, 120), "error");
    }
  }

  _dlInProgress = false;
  setYtdlpUI(false);
}

// ── تطبيق الملف المحمّل كخلفية ────────────────────────
function applyDownloadedBackground(filePath, type) {
  // نحوّل مسار الملف إلى file:// URL
  const fileUrl = "file://" + filePath;

  if (type === "video") {
    // تطبيق كخلفية فيديو — نفس منطق GT-SQR
    if (S.bgVid) { S.bgVid.pause(); S.bgVid.src = ""; }
    const vid = document.createElement("video");
    vid.src = fileUrl; vid.loop = true; vid.muted = true; vid.autoplay = true;
    vid.play().catch(() => {});
    S.bgVid = vid;
    toast("✅ تطبيق خلفية الفيديو");
  } else {
    // تطبيق كصوت خلفية
    if (S.bgAudioEl) { S.bgAudioEl.pause(); }
    const audio = new Audio(fileUrl);
    audio.loop  = true;
    S.bgAudioEl = audio;
    // لا نُشغّله حتى يضغط المستخدم تشغيل
    toast("✅ تطبيق صوت الخلفية");
  }
}

// ── مساعدات واجهة ────────────────────────────────────
function setYtdlpUI(loading) {
  const btn    = document.getElementById("ytdlp-dl-btn");
  const cancel = document.getElementById("ytdlp-cancel-btn");
  if (btn)    { btn.disabled = loading; btn.textContent = loading ? "⏳ جاري التحميل…" : "⬇️ تحميل"; }
  if (cancel) { cancel.style.display = loading ? "inline-flex" : "none"; }
}

function showYtdlpMsg(msg, type = "info") {
  const el = document.getElementById("ytdlp-msg");
  if (!el) return;
  el.textContent = msg;
  el.className   = "ytdlp-msg " + type;
  el.style.display = "block";
}

function clearYtdlpLog() {
  const el = document.getElementById("ytdlp-log");
  if (el) el.textContent = "";
}

function appendYtdlpLog(line) {
  const el = document.getElementById("ytdlp-log");
  if (!el) return;
  el.textContent += line + "\n";
  el.scrollTop    = el.scrollHeight;
}

function cancelYtdlpDownload() {
  window.SQRM.ytdlpCancel();
}

// ── تصدير ────────────────────────────────────────────
window.openYtdlpPanel      = openYtdlpPanel;
window.closeYtdlpPanel     = closeYtdlpPanel;
window.runYtdlpDownload    = runYtdlpDownload;
window.cancelYtdlpDownload = cancelYtdlpDownload;
