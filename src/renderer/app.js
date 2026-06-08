// ═══════════════════════════════════════════════════════
//  GT-SQRM v1.1 — GnuTux Short Quran Reels Maker
//  Author: SalehGNUTUX | License: GPLv3
//  نسخة سطح المكتب (Electron) — Linux AppImage
//  متوافق أيضاً مع المتصفح (PWA) والهاتف (APK)
// ═══════════════════════════════════════════════════════
"use strict";

// ── وضع التشغيل ────────────────────────────────────────
const IS_DESKTOP = !!(window.SQRM && window.SQRM.isDesktop);
if (IS_DESKTOP) document.body.classList.add("desktop");
console.log("[SQRM] Mode:", IS_DESKTOP ? "Desktop (Electron)" : "Browser/Mobile");

// ── RECITERS REGISTRY ──────────────────────────────────
const RECITERS_LIST = [
  { id: "alafasy",    name: "مشاري العفاسي",            flag: "🇰🇼", folder: "Alafasy_128kbps" },
{ id: "ghamdi",     name: "سعد الغامدي",               flag: "🇸🇦", folder: "Ghamadi_40kbps" },
{ id: "minshawi",   name: "المنشاوي مرتل",             flag: "🇪🇬", folder: "Minshawy_Murattal_128kbps" },
{ id: "husary",     name: "محمود الحصري",              flag: "🇪🇬", folder: "Husary_128kbps" },
{ id: "shaatri",    name: "أبو بكر الشاطري",           flag: "🇸🇦", folder: "abu_bakr_ash-shaatree_128kbps" },
{ id: "maher",      name: "ماهر المعيقلي",             flag: "🇸🇦", folder: "MaherAlMuaiqly128kbps" },
{ id: "yassin_w",   name: "ياسين الجزائري (ورش)",      flag: "🇩🇿", folder: "warsh/warsh_yassin_al_jazaery_64kbps" },
{ id: "hussary_w",  name: "الحصري مرتل (ورش)",         flag: "🇪🇬", folder: "warsh/Husary_Murattal_warsh_128kbps" },
];

function buildAudioUrl(folder, surahNum, ayaNum) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
  return `${AUDIO_BASE}/${cleanFolder}/${String(surahNum).padStart(3,"0")}${String(ayaNum).padStart(3,"0")}.mp3`;
}

const BUILT_IN_FONTS = [
  { id: "amiri",     name: "Amiri Quran",     css: "'Amiri Quran'",       sample: "بِسْمِ اللَّهِ" },
{ id: "reem",      name: "Reem Kufi",        css: "'Reem Kufi'",         sample: "بِسْمِ اللَّهِ" },
{ id: "scheher",   name: "Scheherazade",     css: "'Scheherazade New'",  sample: "بِسْمِ اللَّهِ" },
{ id: "cairo",     name: "Cairo Bold",       css: "'Cairo'",             sample: "بِسْمِ اللَّهِ" },
{ id: "noto",      name: "Noto Naskh",       css: "'Noto Naskh Arabic'", sample: "بِسْمِ اللَّهِ" },
{ id: "lateef",    name: "Lateef",           css: "'Lateef'",            sample: "بِسْمِ اللَّهِ" },
{ id: "harmattan", name: "Harmattan",        css: "'Harmattan'",         sample: "بِسْمِ اللَّهِ" },
{ id: "markazi",   name: "Markazi Text",     css: "'Markazi Text'",      sample: "بِسْمِ اللَّهِ" },
{ id: "ruqaa",     name: "Aref Ruqaa",       css: "'Aref Ruqaa'",        sample: "بِسْمِ اللَّهِ" },
];

const THEMES = {
  emerald: { gc1: "#0a2e1e", gc2: "#020d06", tc: "#ffffff", oc: "#c9a227" },
  gold:    { gc1: "#2a1a00", gc2: "#0d0800", tc: "#f5e6b0", oc: "#f0c842" },
  night:   { gc1: "#050a1e", gc2: "#020510", tc: "#e0e8ff", oc: "#4a9fd5" },
  rose:    { gc1: "#2a0d18", gc2: "#0d0408", tc: "#ffe0ef", oc: "#e85d8a" },
  ocean:   { gc1: "#002233", gc2: "#00080f", tc: "#d0f0ff", oc: "#00bcd4" },
  desert:  { gc1: "#2e1e06", gc2: "#100900", tc: "#f0e0c0", oc: "#d4a017" },
  purple:  { gc1: "#1a0a2e", gc2: "#08020f", tc: "#e8d8ff", oc: "#9c5cd4" },
  dark:    { gc1: "#111111", gc2: "#000000", tc: "#ffffff", oc: "#888888" },
};

const QURAN_API  = "https://api.alquran.cloud/v1";
const AUDIO_BASE = "https://everyayah.com/data";

// ── GLOBAL STATE ───────────────────────────────────────
const S = {
  surahs: [], filteredSurahs: [], verses: [], translations: [],
  currentAya: 0, playing: false,
  elapsed: 0, lastRafTs: null,
  ayaDurations: [],
  bgImg: null, bgVid: null, bgVidFile: null,
  bgVidItems: [], // [{file, vid, name, dur}] — playlist لخلفية الفيديو
  mixedAnimsOrder: [],  // ترتيب التأثيرات المُفعَّلة في وضع "مختلط"
  bgVidActiveIdx: 0,
  bgVidNext: null,         // الفيديو القادم للـ crossfade
  bgVidFadeProgress: 0,    // 0→1 خلال 500ms قبل انتهاء الحالي
  bgMotionT: 0,
  audioCtx: null, analyser: null, exportDest: null,
  recAudioEl: null, recAudioSource: null, recGainNode: null, recExportGain: null,
  logoVid: null,
  bgAudioEl: null, bgAudioSource: null, bgPreviewGain: null,
  waveData: new Uint8Array(64).fill(0),
  stars: [], bokeh: [],
  exportCancel: false, mediaRecorder: null, exportChunks: [],
  exporting: false, exportSources: [],
  exportCancelRef: null,         // مرجع للإلغاء في محرّك V2
  _exportBgFrameImg: null,       // إطار خلفية مستخرَج مسبقاً للإطار الحالي (V2)
  templates: [], reciters: [...RECITERS_LIST],
  allFonts: [...BUILT_IN_FONTS],
  rafId: null,
  logoImg: null,
  batchQueue: [],
  batchRunning: false,
  batchCurrent: 0,
  ytdlpBusy: false,
  // ── كتم الصوت ──────────────────────────────
  muteOnExport:  false,  // من الإعدادات: كتم تلقائي
  exportMuted:   false,  // حالة نافذة التصدير الحالية
  previewMuted:  false,  // كتم المعاينة
  // ── مجلد التحميل ───────────────────────────
  dlSaveMode:    "tmp",
  dlSavePath:    "",
};

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initThemeChips();
  renderFontGrid();
  restoreReciters();
  renderReciters();
  loadTemplates();
  generateParticles();
  initCanvas();
  checkOffline();
  startRenderLoop();
  await loadLocalFonts(false);
  await loadSurahList();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js")
    .then(reg => {
      console.log("[PWA] Service Worker registered:", reg.scope);
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            toast("🔄 تحديث متاح — أعد تحميل الصفحة للتطبيق", "info");
          }
        });
      });
    })
    .catch(err => console.warn("[PWA] SW registration failed:", err));
  } else {
    console.log("[PWA] Service Worker skipped (file protocol)");
  }

  initMobileLayout();
  initPwaInstall();
  initEventListeners();

  // ⚠️ الترتيب مهم: نستعيد الإعدادات بعد تسجيل المستمعين فقط
  //   حتى تصل أحداث change/input إلى onBgTypeChange/onFmtChange/إلخ
  //   فتنعكس قيم الراديو على ظهور/إخفاء اللوحات الفرعية في الواجهة
  restoreAllSettings();
  restoreLogo();
  restoreMixedAnimsOrder();
  initAutoSave();

  // تحميل فهرس القرآن الكامل في الخلفية للعمل دون اتصال
  //   لا يُعطّل بدء التطبيق — إن نجح: الـ verses تأتي من المحلي بدلاً من الـ API
  preloadQuranIndex();

  if (IS_DESKTOP) {
    initDesktopFeatures();
  }
});

// ══════════════════════════════════════════════════════
//  EVENT LISTENERS INITIALIZATION
// ══════════════════════════════════════════════════════
function initEventListeners() {
  // Tabs
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const tabName = e.currentTarget.dataset.tab;
      goTab(tabName);
      if (window.innerWidth <= 760) openMobilePanel();
      // تحميل أيقونة about عند فتح التاب
      if (tabName === "about") {
        const img = $("about-app-icon");
        if (img && !img.src.includes("icon")) {
          img.src = IS_DESKTOP
          ? "../../GT-SQRM-icons/GT-SQRM-icon.png"
          : "icons/icon-192.png";
        }
      }
    });
  });

  // Buttons
  const loadVersesBtn = $("load-verses-btn");
  if (loadVersesBtn) loadVersesBtn.addEventListener("click", loadVerses);

  const toggleAddReciterBtn = $("toggle-add-reciter-btn");
  if (toggleAddReciterBtn) toggleAddReciterBtn.addEventListener("click", toggleAddReciter);

  const addCustomReciterBtn = $("add-custom-reciter-btn");
  if (addCustomReciterBtn) addCustomReciterBtn.addEventListener("click", addCustomReciter);

  const refreshFontsBtn = $("refresh-fonts-btn");
  if (refreshFontsBtn) refreshFontsBtn.addEventListener("click", () => loadLocalFonts(true));

  const customFontsInput = $("custom-fonts-input");
  if (customFontsInput) customFontsInput.addEventListener("change", (e) => loadCustomFonts(e.target));

  const togglePlayBtn = $("toggle-play-btn");
  if (togglePlayBtn) togglePlayBtn.addEventListener("click", togglePlay);
  const btnPlay = $("btn-play");
  if (btnPlay) btnPlay.addEventListener("click", togglePlay);

  const prevAyaBtn = $("prev-aya-btn");
  if (prevAyaBtn) prevAyaBtn.addEventListener("click", prevAya);
  const nextAyaBtn = $("next-aya-btn");
  if (nextAyaBtn) nextAyaBtn.addEventListener("click", nextAya);
  // v3.3.2 — زرّ إعادة من البداية
  const restartAllBtn = $("restart-all-btn");
  if (restartAllBtn) restartAllBtn.addEventListener("click", restartAll);

  const pbar = $("pbar");
  if (pbar) pbar.addEventListener("click", seekClick);

  const openTplModalBtn = $("open-tpl-modal-btn");
  if (openTplModalBtn) openTplModalBtn.addEventListener("click", () => openModal("tpl-modal"));
  const openTplModalFromTab = $("open-tpl-modal-from-tab");
  if (openTplModalFromTab) openTplModalFromTab.addEventListener("click", () => openModal("tpl-modal"));
  const closeTplModalBtn = $("close-tpl-modal-btn");
  if (closeTplModalBtn) closeTplModalBtn.addEventListener("click", () => closeModal("tpl-modal"));
  const confirmSaveTemplateBtn = $("confirm-save-template-btn");
  if (confirmSaveTemplateBtn) confirmSaveTemplateBtn.addEventListener("click", confirmSaveTemplate);

  const cancelExportBtn = $("cancel-export-btn");
  if (cancelExportBtn) cancelExportBtn.addEventListener("click", cancelExport);

  const installPwaBtn = $("install-pwa-btn");
  if (installPwaBtn) installPwaBtn.addEventListener("click", installPwa);
  const hidePwaBannerBtn = $("hide-pwa-banner-btn");
  if (hidePwaBannerBtn) hidePwaBannerBtn.addEventListener("click", hidePwaBanner);

  const resetSettingsBtn = $("reset-settings-btn");
  if (resetSettingsBtn) resetSettingsBtn.addEventListener("click", resetAllSettings);

  // ── كتم الصوت ───────────────────────────────────
  const mutePreviewBtn = $("mute-preview-btn");
  if (mutePreviewBtn) mutePreviewBtn.addEventListener("click", togglePreviewMute);

  const exportMuteBtn = $("export-mute-btn");
  if (exportMuteBtn) exportMuteBtn.addEventListener("click", toggleExportMute);

  const muteOnExportCb = $("mute-on-export");
  if (muteOnExportCb) muteOnExportCb.addEventListener("change", e => {
    S.muteOnExport = e.target.checked;
  });

  // ── مجلد التحميل ────────────────────────────────
  document.querySelectorAll('input[name="dl-save-mode"]').forEach(r => {
    r.addEventListener("change", onDlSaveModeChange);
  });
  const dlBrowseBtn = $("dl-browse-btn");
  if (dlBrowseBtn) dlBrowseBtn.addEventListener("click", chooseDlSaveFolder);

  // File inputs
  const bgImgInput = $("bg-img-input");
  if (bgImgInput) bgImgInput.addEventListener("change", (e) => onBgMedia(e.target, "image"));
  const bgVidInput = $("bg-vid-input");
  if (bgVidInput) bgVidInput.addEventListener("change", (e) => onBgMedia(e.target, "video"));
  const bgAudioInput = $("bg-audio-input");
  if (bgAudioInput) bgAudioInput.addEventListener("change", (e) => onBgAudio(e.target));

  // تقطيع زمني للوسائط المحلية
  const bgVidTrimOn = $("bg-vid-trim-on");
  if (bgVidTrimOn) bgVidTrimOn.addEventListener("change", (e) => {
    const row = $("bg-vid-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgVid) applyBgVidTrim();
  });
  ["bg-vid-trim-start","bg-vid-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-vid-trim-on")) applyBgVidTrim(); });
  });
  const bgAudioTrimOn = $("bg-audio-trim-on");
  if (bgAudioTrimOn) bgAudioTrimOn.addEventListener("change", (e) => {
    const row = $("bg-audio-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
    if (e.target.checked && S.bgAudioEl) applyBgAudioTrim();
  });
  ["bg-audio-trim-start","bg-audio-trim-end"].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener("input", () => { if (ge("bg-audio-trim-on")) applyBgAudioTrim(); });
  });
  const logoUpload = $("logo-upload");
  if (logoUpload) logoUpload.addEventListener("change", (e) => onLogoUpload(e.target));
  const removeLogoBtn = $("remove-logo-btn");
  if (removeLogoBtn) removeLogoBtn.addEventListener("click", removeLogo);

  // Radio buttons
  document.querySelectorAll('input[name="fmt"]').forEach(radio => {
    radio.addEventListener("change", onFmtChange);
  });
  document.querySelectorAll('input[name="bgt"]').forEach(radio => {
    radio.addEventListener("change", onBgTypeChange);
  });
  document.querySelectorAll('input[name="tanim"]').forEach(radio => {
    radio.addEventListener("change", onTanimChange);
  });
  // checkboxes داخل وضع "مختلط"
  document.querySelectorAll(".mix-anim").forEach(cb => {
    cb.addEventListener("change", onMixAnimChange);
  });
  // قالب جاهز
  const presetSel = $("preset-sel");
  if (presetSel) presetSel.addEventListener("change", onPresetChange);

  // إظهار/إخفاء لوحة إعدادات اسم السورة
  const snameOn = $("sname-on");
  if (snameOn) snameOn.addEventListener("change", (e) => {
    const ctrl = $("sname-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v3.1 — لوحة عنوان المقطع
  const vtitleOn = $("vtitle-on");
  if (vtitleOn) vtitleOn.addEventListener("change", (e) => {
    const ctrl = $("vtitle-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });

  // v3.2 — Chromakey للوسائط
  const chromaOn = $("chromakey-on");
  if (chromaOn) chromaOn.addEventListener("change", (e) => {
    const ctrl = $("chromakey-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  $("chromakey-preset-green")?.addEventListener("click", () => {
    const inp = $("chromakey-color"); if (inp) { inp.value = "#00b140"; inp.dispatchEvent(new Event("change")); }
  });
  $("chromakey-preset-blue")?.addEventListener("click", () => {
    const inp = $("chromakey-color"); if (inp) { inp.value = "#0047bb"; inp.dispatchEvent(new Event("change")); }
  });

  // v3.3 — فيديو التلاوة: تفعيل/إلغاء يُلغي مصادر القرآن تلقائياً
  const recvidOn = $("recvid-on");
  if (recvidOn) recvidOn.addEventListener("change", (e) => {
    const ctrl = $("recvid-ctrl");
    const wrap = $("quran-sources-wrap");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
    if (wrap) wrap.style.display = e.target.checked ? "none" : "block";
    if (e.target.checked) {
      if (typeof stopRecitationAudio === "function") { try { stopRecitationAudio(); } catch (_) {} }
      if (typeof _recGen !== "undefined") { try { _recGen++; } catch (_) {} }
      if (S.playing) { try { togglePlay(); } catch (_) {} }
      const hasQuran = S.verses?.some(v => !v.free);
      if (hasQuran) {
        S.verses = []; S.translations = []; S.ayaDurations = []; S.currentAya = 0; S.elapsed = 0;
        if (typeof updateAyaUI === "function") updateAyaUI();
      }
      toast("🎥 وضع فيديو التلاوة مُفعَّل — مصادر القرآن مُعطَّلة مؤقّتاً", "info", 2500);
    } else {
      if (S.recVidEl) { try { S.recVidEl.pause(); } catch (_) {} }
      if (typeof onSurahChange === "function") { try { onSurahChange(); } catch (_) {} }
      toast("📖 وضع فيديو التلاوة مُعطَّل — عودة لمصادر القرآن", "info", 1800);
    }
  });
  const recvidFile = $("recvid-file");
  if (recvidFile) recvidFile.addEventListener("change", (e) => onRecVidFile(e.target));
  $("recvid-remove")?.addEventListener("click", () => { removeRecVid(); toast("🗑️ تمّت إزالة الفيديو", "info", 1500); });
  const setRecvidBg = (hex) => { const inp = $("recvid-bgcolor"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); } };
  $("recvid-bgcolor-black")?.addEventListener("click", () => setRecvidBg("#000000"));
  $("recvid-bgcolor-white")?.addEventListener("click", () => setRecvidBg("#ffffff"));
  $("recvid-bgcolor-green")?.addEventListener("click", () => setRecvidBg("#00b140"));
  $("recvid-bgcolor-blue")?.addEventListener("click", () => setRecvidBg("#0047bb"));

  // v3.2 — Chromakey للشعار
  const logoChromaOn = $("logo-chroma-on");
  if (logoChromaOn) logoChromaOn.addEventListener("change", (e) => {
    const ctrl = $("logo-chroma-ctrl");
    if (ctrl) ctrl.style.display = e.target.checked ? "block" : "none";
  });
  const setLogoChroma = (hex) => { const inp = $("logo-chroma-color"); if (inp) { inp.value = hex; inp.dispatchEvent(new Event("change")); } };
  $("logo-chroma-white")?.addEventListener("click", () => setLogoChroma("#ffffff"));
  $("logo-chroma-black")?.addEventListener("click", () => setLogoChroma("#000000"));
  $("logo-chroma-green")?.addEventListener("click", () => setLogoChroma("#00b140"));
  const surahSel = $("surah-sel");
  if (surahSel) surahSel.addEventListener("change", onSurahChange);

  // بحث السورة بالاسم (تطبيع عربي)
  const surahSearch = $("surah-search");
  if (surahSearch) {
    const debouncedFilter = debounce((e) => filterSurahs(e.target.value), 120);
    surahSearch.addEventListener("input", debouncedFilter);
  }

  // بحث الآيات (مع تطبيع التشكيل)
  const verseSearchInp = $("verse-search-inp");
  if (verseSearchInp) {
    const debouncedSearch = debounce(onVerseSearchInput, 200);
    verseSearchInp.addEventListener("input", debouncedSearch);
    verseSearchInp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { clearVerseSearch(); verseSearchInp.blur(); }
    });
  }
  const verseSearchClear = $("verse-search-clear-btn");
  if (verseSearchClear) verseSearchClear.addEventListener("click", clearVerseSearch);
  const transSel = $("trans-sel");
  if (transSel) transSel.addEventListener("change", onTransChange);
  const autoDur = $("auto-dur");
  if (autoDur) autoDur.addEventListener("change", toggleManualDur);

  // Range sliders
  const sliders = [
    { id: "aya-dur", outId: "aya-dur-v", unit: "s" },
    { id: "trans-dur", outId: "trans-dur-v", unit: "s" },
    { id: "aya-gap", outId: "aya-gap-v", unit: "s" },
    { id: "wave-gain", outId: "wave-gain-v", unit: "%" },
    { id: "vtitle-y", outId: "vtitle-y-v", unit: "%" },
    { id: "vtitle-size", outId: "vtitle-size-v", unit: "%" },
    { id: "chromakey-similarity", outId: "chromakey-similarity-v", unit: "" },
    { id: "chromakey-smoothness", outId: "chromakey-smoothness-v", unit: "" },
    { id: "chromakey-spill", outId: "chromakey-spill-v", unit: "" },
    { id: "recvid-x", outId: "recvid-x-v", unit: "%" },
    { id: "recvid-y", outId: "recvid-y-v", unit: "%" },
    { id: "recvid-scale", outId: "recvid-scale-v", unit: "%" },
    { id: "recvid-threshold", outId: "recvid-threshold-v", unit: "" },
    { id: "recvid-softness", outId: "recvid-softness-v", unit: "" },
    { id: "logo-chroma-threshold", outId: "logo-chroma-threshold-v", unit: "" },
    { id: "logo-chroma-softness", outId: "logo-chroma-softness-v", unit: "" },
    { id: "sname-y", outId: "sname-y-v", unit: "%" },
    { id: "sname-size", outId: "sname-size-v", unit: "%" },
    { id: "orn-op", outId: "orn-op-v", unit: "%" },
    { id: "dim", outId: "dim-v", unit: "%" },
    { id: "bright", outId: "bright-v", unit: "%" },
    { id: "satur", outId: "satur-v", unit: "%" },
    { id: "fsize", outId: "fsize-v", unit: "%" },
    { id: "lh", outId: "lh-v", unit: "" },
    { id: "wm-size", outId: "wm-size-v", unit: "px" },
    { id: "rec-vol", outId: "rec-vol-v", unit: "%" },
    { id: "bg-vol", outId: "bg-vol-v", unit: "%" },
    { id: "logo-size", outId: "logo-size-v", unit: "px" },
    { id: "logo-opacity", outId: "logo-opacity-v", unit: "%" },
    { id: "wave-h", outId: "wave-h-v", unit: "px" },
    { id: "vig-str", outId: "vig-str-v", unit: "%" },
    { id: "ov-op", outId: "ov-op-v", unit: "%" },
    { id: "export-vbr", outId: "export-vbr-v", unit: " Mbps" },
    { id: "export-crf", outId: "export-crf-v", unit: "" },
    { id: "pixel-size", outId: "pixel-size-v", unit: "" },
    { id: "mosaic-size", outId: "mosaic-size-v", unit: "" },
    { id: "ripple-amp", outId: "ripple-amp-v", unit: "" },
    { id: "wave-amp", outId: "wave-amp-v", unit: "" },
    { id: "swirl-factor", outId: "swirl-factor-v", unit: "" },
    { id: "kaleido-segments", outId: "kaleido-segments-v", unit: "" },
    { id: "glitch-intensity", outId: "glitch-intensity-v", unit: "" },
    { id: "word-fade-ms", outId: "word-fade-ms-v", unit: "ms" },
    { id: "bg-crossfade-ms", outId: "bg-crossfade-ms-v", unit: "ms" },
  ];
  sliders.forEach(s => {
    const el = $(s.id);
    if (el) {
      el.addEventListener("input", (e) => sv(e.target, s.outId, s.unit));
      sv(el, s.outId, s.unit);
    }
  });

  // Color picker + text sync
  const syncPairs = [
    { pick: "gc1", text: "gc1t" },
    { pick: "gc2", text: "gc2t" },
  ];
  syncPairs.forEach(p => {
    const pick = $(p.pick);
    const text = $(p.text);
    if (pick && text) {
      pick.addEventListener("input", () => syncCP(p.pick, p.text));
      text.addEventListener("input", () => syncCT(p.pick, p.text));
    }
  });

  // استيراد الوسائط
  initDlToolSwitch();
  initYtdlpPasteFix();

  const ytdlpBtn = $("ytdlp-btn");
  if (ytdlpBtn) ytdlpBtn.addEventListener("click", runUnifiedDownload);

  const dlUseTrim = $("dl-use-trim");
  if (dlUseTrim) dlUseTrim.addEventListener("change", e => {
    const row = $("dl-trim-row");
    if (row) row.style.display = e.target.checked ? "block" : "none";
  });
    const ytdlpCancelBtn = $("ytdlp-cancel-btn");
    if (ytdlpCancelBtn) ytdlpCancelBtn.addEventListener("click", cancelYtdlpDownload);

    // Batch
    const openBatchPanelBtn = $("open-batch-panel-btn");
  if (openBatchPanelBtn) openBatchPanelBtn.addEventListener("click", openBatchPanel);
  const closeBatchModalBtn = $("close-batch-modal-btn");
  if (closeBatchModalBtn) closeBatchModalBtn.addEventListener("click", closeBatchPanel);
  const addBatchItemBtn = $("add-batch-item-btn");
  if (addBatchItemBtn) addBatchItemBtn.addEventListener("click", addBatchItem);
  const addBatchModalBtn = $("add-batch-modal-btn");
  if (addBatchModalBtn) addBatchModalBtn.addEventListener("click", addBatchItem);
  const runBatchBtn = $("run-batch-modal-btn");
  if (runBatchBtn) runBatchBtn.addEventListener("click", runBatchExport);
  const stopBatchBtn = $("stop-batch-btn");
  if (stopBatchBtn) stopBatchBtn.addEventListener("click", stopBatchExport);

  // Export
  const exportWebmBtn = $("export-webm-btn");
  if (exportWebmBtn) exportWebmBtn.addEventListener("click", () => startExport("webm"));
  const exportMp4Btn = $("export-mp4-btn");
  if (exportMp4Btn) exportMp4Btn.addEventListener("click", () => startExport("mp4"));
  const exportDesktopBtn = $("export-desktop-btn");
  if (exportDesktopBtn) exportDesktopBtn.addEventListener("click", () => {
    const codec = $("export-codec")?.value || "mp4-h264";
    startExportDesktop(codec);
  });

  // Mobile
  const panelSizeSlider = $("panel-size-slider");
  if (panelSizeSlider) panelSizeSlider.addEventListener("input", (e) => onPanelSizeChange(e.target.value));
  const layVert = $("lay-vert");
  if (layVert) layVert.addEventListener("click", () => setMobLayout("vert"));
  const layHoriz = $("lay-horiz");
  if (layHoriz) layHoriz.addEventListener("click", () => setMobLayout("horiz"));
  const layFull = $("lay-full");
  if (layFull) layFull.addEventListener("click", () => setMobLayout("full"));
  const mobToggle = $("mob-toggle");
  if (mobToggle) mobToggle.addEventListener("click", toggleMobilePanel);
  const panelHandle = $("panel-handle");
  if (panelHandle) panelHandle.addEventListener("touchstart", initPanelSwipe);
  const mobBackdrop = $("mob-backdrop");
  if (mobBackdrop) mobBackdrop.addEventListener("click", closeMobilePanel);

  // Go to tab from header
  const goTplTabBtn = $("go-tpl-tab-btn");
  if (goTplTabBtn) goTplTabBtn.addEventListener("click", () => goTab("tpl"));
}

// ══════════════════════════════════════════════════════
//  DESKTOP INIT (Electron)
// ══════════════════════════════════════════════════════
async function initDesktopFeatures() {
  const deps = await window.SQRM.checkDeps().catch(() => null);
  if (deps) {
    const ffOk  = deps.ffmpeg?.ok;
    const ytOk  = deps["yt-dlp"]?.ok;
    const ffVer = deps.ffmpeg?.version?.split(" ")?.[2] || "?";
    const ytVer = deps["yt-dlp"]?.version || "?";
    const msg   = `🖥️ سطح المكتب | ffmpeg ${ffOk ? "✅ " + ffVer : "❌ غير موجود"} | yt-dlp ${ytOk ? "✅ " + ytVer : "❌ غير موجود"}`;
    toast(msg, ffOk ? "success" : "error", 5000);
    $("ex-info").textContent = msg;
    document.querySelectorAll(".desktop-only").forEach(el => el.style.display = "");
    document.querySelectorAll(".browser-only").forEach(el => el.style.display = "none");
    if (!ffOk) toast("⚠️ ffmpeg غير موجود! قم بتشغيل scripts/build-appimage.sh أولاً", "error", 7000);
  }

  const info = await window.SQRM.sysInfo().catch(() => null);
  if (info) {
    const el = $("sys-info-row");
    if (el) el.innerHTML = `
      <div class="info-row"><span class="info-k">النظام</span><span class="info-v">${info.platform} (${info.arch})</span></div>
      <div class="info-row"><span class="info-k">الذاكرة</span><span class="info-v">${info.totalMem}</span></div>
      <div class="info-row"><span class="info-k">المعالج</span><span class="info-v">${info.cpus} أنوية</span></div>
      <div class="info-row"><span class="info-k">الإصدار</span><span class="info-v">v${info.appVer}</span></div>`;
  }

  restoreDlSettings();
  await loadSystemFonts();

  setTimeout(() => {
    const selSurah = $("surah-sel");
    ["batch-surah", "batch-codec-modal"].forEach(id => {
      const bSurah = document.getElementById("batch-surah");
      if (bSurah && selSurah && !bSurah.options.length) {
        bSurah.innerHTML = selSurah.innerHTML;
      }
    });
  }, 2000);
}

// ══════════════════════════════════════════════════════
//  PWA INSTALL PROMPT
// ══════════════════════════════════════════════════════
let _pwaPrompt = null;

function initPwaInstall() {
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    _pwaPrompt = e;
    showPwaBanner();
    console.log("[PWA] Install prompt captured");
  });

  window.addEventListener("appinstalled", () => {
    _pwaPrompt = null;
    hidePwaBanner();
    toast("✅ تم تثبيت GT-SQR بنجاح!", "success");
    console.log("[PWA] App installed");
  });
}

function showPwaBanner() {
  const bar = $("pwa-bar");
  if (bar) bar.style.display = "flex";
}

function hidePwaBanner() {
  const bar = $("pwa-bar");
  if (bar) bar.style.display = "none";
}

async function installPwa() {
  if (!_pwaPrompt) {
    toast("⚠️ التثبيت غير متاح في هذا المتصفح أو التطبيق مثبت مسبقاً", "info");
    return;
  }
  _pwaPrompt.prompt();
  const { outcome } = await _pwaPrompt.userChoice;
  if (outcome === "accepted") {
    toast("⏳ جاري التثبيت…", "info");
  } else {
    toast("تم الإلغاء", "info");
  }
  _pwaPrompt = null;
  hidePwaBanner();
}

// ══════════════════════════════════════════════════════
//  RENDER LOOP
// ══════════════════════════════════════════════════════
function startRenderLoop() {
  function loop(ts) {
    S.rafId = requestAnimationFrame(loop);
    const dt = S.lastRafTs ? Math.min((ts - S.lastRafTs) / 1000, .1) : 0;
    S.lastRafTs = ts;
    // أثناء التصدير الحتمي V2: محرّك التصدير يتولّى الرسم بنفسه — لا نتدخّل
    if (S.exporting && S.exportCancelRef) return;
    if (S.playing) {
      S.elapsed += dt;
      S.bgMotionT += dt;
      checkAyaAdvance();
      updateProgressUI();
    }
    drawFrame(ts / 1000);
  }
  S.rafId = requestAnimationFrame(loop);
}

// ── فاصل صمت بين الآيات (نفس الواجهة في النسختين) ──
function getAyaGap() {
  return Math.max(0, parseFloat(gv("aya-gap")) || 0);
}
// مدة فعلية لكل "خانة" آية = مدة الصوت + الفاصل
function getEffectiveDur(i) {
  const audioDur = (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : (parseFloat(gv("aya-dur")) || 6);
  return audioDur + getAyaGap();
}

function checkAyaAdvance() {
  if (S.exporting) return;
  const dur = getEffectiveDur(S.currentAya);
  if (S.elapsed >= dur) {
    if (S.currentAya < S.verses.length - 1) {
      S.currentAya++;
      S.elapsed = 0;
      playRecitationAudio();
      updateAyaUI();
    } else {
      pausePlayer();
      S.currentAya = 0; S.elapsed = 0;
      updateAyaUI();
    }
  }
}

// ══════════════════════════════════════════════════════
//  CANVAS SETUP
// ══════════════════════════════════════════════════════
function initCanvas() { onFmtChange(); }

// أبعاد افتراضية لكل نسبة عرض — يتبع آخر تطبيق preset إن وُجد
const FMT_SIZES = {
  "9:16": { w: 720,  h: 1280 },
  "16:9": { w: 1280, h: 720  },
  "1:1":  { w: 1080, h: 1080 },
  "4:5":  { w: 1080, h: 1350 },
};

function onFmtChange() {
  const fmt = radioVal("fmt");
  const cv = $("cv");
  const sz = FMT_SIZES[fmt] || FMT_SIZES["9:16"];
  cv.width = sz.w; cv.height = sz.h;
  const lblEl = $("fmt-lbl");
  if (lblEl) lblEl.textContent = fmt;
  fitCanvas();
}

// ── القوالب الجاهزة للمنصات الشهيرة ──────────────────
const PRESETS = {
  "reel-fhd":  { fmt: "9:16", w: 1080, h: 1920, fps: 30, vbr: 10, crf: 20, label: "Reels/Shorts/TikTok 1080×1920" },
  "reel-hd":   { fmt: "9:16", w: 720,  h: 1280, fps: 30, vbr: 6,  crf: 22, label: "Reels 720×1280 (سريع)" },
  "yt-fhd":    { fmt: "16:9", w: 1920, h: 1080, fps: 30, vbr: 12, crf: 20, label: "YouTube 1920×1080" },
  "yt-hd":     { fmt: "16:9", w: 1280, h: 720,  fps: 30, vbr: 8,  crf: 22, label: "YouTube 1280×720" },
  "ig-sq":     { fmt: "1:1",  w: 1080, h: 1080, fps: 30, vbr: 8,  crf: 20, label: "Instagram Square 1080" },
  "ig-port":   { fmt: "4:5",  w: 1080, h: 1350, fps: 30, vbr: 8,  crf: 20, label: "Instagram Portrait 1080×1350" },
  "cinema":    { fmt: "16:9", w: 2560, h: 1080, fps: 30, vbr: 15, crf: 19, label: "Cinema 2560×1080 (21:9)" },
};

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;

  // 1) ثبّت أبعاد نسبة العرض في الخريطة (حتى عند تبديل fmt لاحقاً)
  FMT_SIZES[p.fmt] = { w: p.w, h: p.h };

  // 2) اختر الراديو المناسب
  const fmtRadio = document.querySelector(`input[name="fmt"][value="${p.fmt}"]`);
  if (fmtRadio) fmtRadio.checked = true;

  // 3) طبّق على canvas
  const cv = $("cv");
  cv.width = p.w; cv.height = p.h;
  const lbl = $("fmt-lbl");
  if (lbl) lbl.textContent = p.fmt;
  fitCanvas();

  // 4) FPS + جودة
  const fpsEl = $("export-fps");
  if (fpsEl) fpsEl.value = String(p.fps);
  const vbrEl = $("export-vbr");
  if (vbrEl) { vbrEl.value = String(p.vbr); if (typeof sv === "function") sv(vbrEl, "export-vbr-v", " Mbps"); }
  const crfEl = $("export-crf");
  if (crfEl) { crfEl.value = String(p.crf); if (typeof sv === "function") sv(crfEl, "export-crf-v", ""); }

  toast(`✅ تم تطبيق قالب: ${p.label}`, "success", 3000);
}

function onPresetChange(e) {
  const v = e.target.value;
  if (!v) return;
  applyPreset(v);
  // أعد الاختيار إلى "اختر قالباً" حتى يتاح إعادة التطبيق بنفس القيمة
  setTimeout(() => { e.target.value = ""; }, 100);
}

function fitCanvas() {
  const preview = $("preview");
  const cv = $("cv");
  if (!preview || !cv) return;
  const maxH = preview.clientHeight - 90;
  const maxW = preview.clientWidth - 20;
  if (maxH <= 0 || maxW <= 0) return;
  const ratio = cv.width / cv.height;
  let w = maxW, h = w / ratio;
  if (h > maxH) { h = maxH; w = h * ratio; }
  cv.style.width = Math.floor(w) + "px";
  cv.style.height = Math.floor(h) + "px";
}
window.addEventListener("resize", fitCanvas);

// ══════════════════════════════════════════════════════
//  MAIN DRAW
// ══════════════════════════════════════════════════════
function drawFrame(ts) {
  const cv = $("cv");
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);

  drawBg(ctx, W, H, ts);
  applyColorFilter(ctx, W, H);
  if (ge("fx-bokeh")) drawBokeh(ctx, W, H, ts);
  applyDim(ctx, W, H);
  applyOvColor(ctx, W, H);
  drawOrnament(ctx, W, H, ts);
  if (ge("fx-stars")) drawStars(ctx, W, H, ts);
  if (ge("fx-rays")) drawRays(ctx, W, H, ts);
  if (ge("fx-pixel")) applyPixelate(ctx, W, H);
  if (ge("fx-mosaic")) applyMosaic(ctx, W, H);
  if (ge("fx-ripple")) applyRipple(ctx, W, H, ts);
  if (ge("fx-wave")) applyWave(ctx, W, H, ts);
  if (ge("fx-swirl")) applySwirl(ctx, W, H);
  if (ge("fx-kaleido")) applyKaleido(ctx, W, H);
  if (ge("fx-glitch")) applyGlitch(ctx, W, H);
  if (ge("fx-oldfilm")) applyOldFilm(ctx, W, H, ts);
  // v3.2 — فيديو التلاوة الجاهز يستبدل النصّ/الآيات
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (recvidActive) drawRecitationVideo(ctx, W, H);
  else if (S.verses.length) drawVerse(ctx, W, H, ts);
  drawSurahName(ctx, W, H);
  drawVideoTitle(ctx, W, H);
  drawWave(ctx, W, H, ts);
  drawLogo(ctx, W, H);
  drawWatermark(ctx, W, H);
  if (ge("fx-vig")) drawVignette(ctx, W, H);
  if (ge("fx-gold")) drawGoldBorder(ctx, W, H, ts);
  if (ge("fx-grain")) drawGrain(ctx, W, H);
}

// ══════════════════════════════════════════════════════
//  BACKGROUND
// ══════════════════════════════════════════════════════
function drawBg(ctx, W, H, ts) {
  const bgt = radioVal("bgt");
  const bgm = radioVal("bgm");
  const bright = gv("bright") / 100;
  const chromaOn = ge("chromakey-on");

  ctx.save();
  ctx.filter = `brightness(${bright}) saturate(${gv("satur") / 100})`;

  // v3.2 — رسم الوسائط على canvas منفصل عند تفعيل Chromakey
  const drawMediaToCanvas = (targetCtx, applyMotion) => {
    if (bgt === "image" && S.bgImg) {
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      imgCover(targetCtx, S.bgImg, 0, 0, W, H);
      targetCtx.restore();
      return true;
    } else if (bgt === "video" && (S._exportBgFrameImg || S.bgVid)) {
      const src = S._exportBgFrameImg || S.bgVid;
      const ready = (src instanceof HTMLVideoElement) ? src.readyState >= 2 : !!src;
      if (!ready) return false;
      updateBgVidCrossfade();
      const alpha = S.bgVidFadeProgress;
      targetCtx.save();
      if (applyMotion) applyBgMotion(targetCtx, W, H, bgm, ts);
      targetCtx.globalAlpha = 1 - alpha;
      imgCover(targetCtx, src, 0, 0, W, H);
      if (S.bgVidNext && S.bgVidNext.readyState >= 2 && alpha > 0) {
        targetCtx.globalAlpha = alpha;
        imgCover(targetCtx, S.bgVidNext, 0, 0, W, H);
      }
      targetCtx.restore();
      return true;
    }
    return false;
  };

  const hasMedia = (bgt === "image" && S.bgImg) || (bgt === "video" && (S._exportBgFrameImg || S.bgVid));
  if (bgt === "gradient" || !hasMedia) {
    drawGradient(ctx, W, H);
  } else if (chromaOn) {
    drawGradient(ctx, W, H);
    const tmp = getChromakeyCanvas(W, H);
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, W, H);
    tctx.filter = ctx.filter;
    const drawn = drawMediaToCanvas(tctx, true);
    tctx.filter = "none";
    if (drawn) {
      applyChromakeyToCanvas(tctx, W, H);
      ctx.filter = "none";
      ctx.drawImage(tmp, 0, 0);
    }
  } else {
    drawMediaToCanvas(ctx, true) || drawGradient(ctx, W, H);
  }
  ctx.restore();
  ctx.filter = "none";
}

// v3.2 — Chromakey للوسائط
let _chromakeyCanvas = null;
function getChromakeyCanvas(W, H) {
  if (!_chromakeyCanvas) _chromakeyCanvas = document.createElement("canvas");
  if (_chromakeyCanvas.width !== W) _chromakeyCanvas.width = W;
  if (_chromakeyCanvas.height !== H) _chromakeyCanvas.height = H;
  return _chromakeyCanvas;
}
function hexToRgb(hex) {
  const m = (hex || "#00b140").replace("#", "");
  return {
    r: parseInt(m.substr(0, 2), 16),
    g: parseInt(m.substr(2, 2), 16),
    b: parseInt(m.substr(4, 2), 16),
  };
}
function applyChromakeyToCanvas(ctx, W, H) {
  const colorHex = $("chromakey-color")?.value || "#00b140";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const similarity = (parseFloat(gv("chromakey-similarity")) || 30);
  const smoothness = (parseFloat(gv("chromakey-smoothness")) || 15);
  const spill = (parseFloat(gv("chromakey-spill")) || 20) / 100;

  const keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128;
  const keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128;

  // النطاق العمليّ للمسافة في YCbCr ~ 0-180. ضربة ×1.5 تعطي توزيعاً مريحاً
  const sim = similarity * 1.5;
  const smooth = Math.max(0.5, smoothness * 1.5);

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
    const dx = cb - keyCb, dy = cr - keyCr;
    const dist = Math.sqrt(dx * dx + dy * dy);

    let alpha = 1;
    if (dist < sim) alpha = 0;
    else if (dist < sim + smooth) alpha = (dist - sim) / smooth;

    d[i + 3] = d[i + 3] * alpha;

    // إزالة الانعكاس اللونيّ على الموضوع (spill suppression)
    if (alpha > 0 && spill > 0) {
      // اكتشف الـ tint للون المفتاح: اطرح مكوّناً مفرطاً
      if (kG > kR && kG > kB) {
        // مفتاح أخضر: قلّل الأخضر إذا كان أعلى من المتوسّط بـ r/b
        const avg = (r + b) / 2;
        if (g > avg) d[i + 1] = g + (avg - g) * spill;
      } else if (kB > kR && kB > kG) {
        // مفتاح أزرق
        const avg = (r + g) / 2;
        if (b > avg) d[i + 2] = b + (avg - b) * spill;
      } else if (kR > kG && kR > kB) {
        // مفتاح أحمر
        const avg = (g + b) / 2;
        if (r > avg) d[i] = r + (avg - r) * spill;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// v3.2 — خوارزميّة موحّدة لإزالة لون خلفيّة (تتكيّف: أسود/أبيض → سطوع، ألوان → YCbCr)
function removeBgColorFromRegion(ctx, x, y, w, h, opts) {
  const colorHex = opts.colorHex || "#000000";
  const { r: kR, g: kG, b: kB } = hexToRgb(colorHex);
  const threshold = opts.threshold ?? 25;
  const softness = opts.softness ?? 10;

  // اكتشف هل المفتاح رماديّ (لتطبيق منطق السطوع)
  const maxCh = Math.max(kR, kG, kB);
  const minCh = Math.min(kR, kG, kB);
  const isGrayscale = (maxCh - minCh) < 25;
  const isDark = isGrayscale && maxCh < 60;
  const isLight = isGrayscale && minCh > 195;

  let mode, lo, hi, range;
  let keyCb, keyCr, sim, smooth;
  if (isDark) {
    mode = "dark";
    lo = threshold * 2.55;
    hi = lo + softness * 2.55;
    range = Math.max(0.5, hi - lo);
  } else if (isLight) {
    mode = "light";
    hi = 255 - threshold * 2.55;
    lo = hi - softness * 2.55;
    range = Math.max(0.5, hi - lo);
  } else {
    // YCbCr للألوان المُشبَعة
    mode = "ycbcr";
    keyCb = -0.168736 * kR - 0.331264 * kG + 0.5 * kB + 128;
    keyCr = 0.5 * kR - 0.418688 * kG - 0.081312 * kB + 128;
    sim = threshold * 1.5;
    smooth = Math.max(0.5, softness * 1.5);
  }

  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const len = d.length;
  for (let i = 0; i < len; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let alpha;
    if (mode === "dark") {
      const lum = Math.max(r, g, b);
      if (lum <= lo) alpha = 0;
      else if (lum >= hi) alpha = 1;
      else alpha = (lum - lo) / range;
    } else if (mode === "light") {
      const lum = Math.min(r, g, b);
      if (lum >= hi) alpha = 0;
      else if (lum <= lo) alpha = 1;
      else alpha = (hi - lum) / range;
    } else {
      const cb = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
      const cr = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
      const dx = cb - keyCb, dy = cr - keyCr;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < sim) alpha = 0;
      else if (dist < sim + smooth) alpha = (dist - sim) / smooth;
      else alpha = 1;
    }
    d[i + 3] = d[i + 3] * alpha;
  }
  ctx.putImageData(img, x, y);
}

// alias قديم للتوافق العكسيّ
function removeBlackBackground(ctx, x, y, w, h) {
  removeBgColorFromRegion(ctx, x, y, w, h, {
    colorHex: $("recvid-bgcolor")?.value || "#000000",
    threshold: parseFloat(gv("recvid-threshold")) || 25,
    softness: parseFloat(gv("recvid-softness")) || 10,
  });
}


// v3.2 — فيديو التلاوة الجاهز

let _recVidCanvas = null;
function getRecVidCanvas(W, H) {
  if (!_recVidCanvas) _recVidCanvas = document.createElement("canvas");
  if (_recVidCanvas.width !== W) _recVidCanvas.width = W;
  if (_recVidCanvas.height !== H) _recVidCanvas.height = H;
  return _recVidCanvas;
}
function drawRecitationVideo(ctx, W, H) {
  const v = S.recVidEl;
  if (!v || v.readyState < 2) return;
  const sw = v.videoWidth, sh = v.videoHeight;
  if (!sw || !sh) return;

  const fit = $("recvid-fit")?.value || "contain";
  const xPct = parseFloat(gv("recvid-x")) || 0;
  const yPct = parseFloat(gv("recvid-y")) || 0;
  const scale = (parseFloat(gv("recvid-scale")) || 100) / 100;

  // احسب أبعاد الوجهة حسب نمط الملاءمة
  let dw, dh;
  const ir = sw / sh, cr = W / H;
  if (fit === "stretch") { dw = W; dh = H; }
  else if (fit === "actual") { dw = sw; dh = sh; }
  else if (fit === "cover") {
    if (ir > cr) { dh = H; dw = dh * ir; } else { dw = W; dh = dw / ir; }
  } else { // contain
    if (ir > cr) { dw = W; dh = dw / ir; } else { dh = H; dw = dh * ir; }
  }
  dw *= scale; dh *= scale;
  const dx = (W - dw) / 2 + (xPct / 100) * W;
  const dy = (H - dh) / 2 + (yPct / 100) * H;

  // ارسم الفيديو على canvas off-screen ثم أزل السواد ثم composite
  const tmp = getRecVidCanvas(W, H);
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  tctx.clearRect(0, 0, W, H);
  tctx.drawImage(v, dx, dy, dw, dh);

  // إزالة السواد على المنطقة المرسومة فقط (لا حاجة لقراءة كامل الـcanvas إن كان dw < W)
  const rx = Math.max(0, Math.floor(dx)), ry = Math.max(0, Math.floor(dy));
  const rw = Math.min(W - rx, Math.ceil(dw)), rh = Math.min(H - ry, Math.ceil(dh));
  if (rw > 0 && rh > 0) {
    removeBlackBackground(tctx, rx, ry, rw, rh);
  }
  ctx.drawImage(tmp, 0, 0);
}
function onRecVidFile(input) {
  const file = input.files[0];
  if (!file) return;
  removeRecVid();
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.src = url;
  v.playsInline = true;
  v.preload = "auto";
  v.crossOrigin = "anonymous";
  v.onloadedmetadata = () => {
    const sec = isFinite(v.duration) ? v.duration : 0;
    const info = $("recvid-info");
    if (info) info.textContent = `✅ ${file.name} · ${v.videoWidth}×${v.videoHeight} · ${sec.toFixed(1)}s · ${(file.size / 1e6).toFixed(1)}MB`;
    // اربط صوت الفيديو بمسار التصدير + analyser للذبذبات
    resumeAudioCtx().then(ctx => {
      try {
        const src = ctx.createMediaElementSource(v);
        src.connect(ctx.destination);
        src.connect(S.analyser);
        src.connect(S.exportDest);
        S.recVidAudioSource = src;
      } catch (_) {}
    }).catch(console.warn);
    // مدّة الفيديو هي مدّة المقطع — verses = شريحة واحدة
    S.verses = [{ text: "", numberInSurah: 1, number: 1, audio: null, audioSecondary: [], manualDuration: sec, free: true, recvid: true }];
    S.ayaDurations = [sec];
    S.currentAya = 0; S.elapsed = 0;
    if (typeof updateAyaUI === "function") updateAyaUI();
    toast(`🎥 تمّ تحميل فيديو التلاوة (${sec.toFixed(1)}s)`, "success", 2200);
  };
  v.onerror = () => toast("❌ فشل تحميل الفيديو", "error", 2500);
  S.recVidEl = v;
  S.recVidFile = file;
  if (typeof markProjectDirty === "function") markProjectDirty();
  input.value = "";
}
function removeRecVid() {
  if (S.recVidAudioSource) { try { S.recVidAudioSource.disconnect(); } catch (_) {} S.recVidAudioSource = null; }
  if (S.recVidEl) {
    try { S.recVidEl.pause(); S.recVidEl.src = ""; } catch (_) {}
    S.recVidEl = null;
  }
  S.recVidFile = null;
  const info = $("recvid-info"); if (info) info.textContent = "";
}

function drawGradient(ctx, W, H) {
  const c1 = $("gc1").value, c2 = $("gc2").value;
  const dir = $("grad-dir").value;
  let gr;
  if (dir === "radial") {
    gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .75);
  } else {
    const map = { tb: [W / 2, 0, W / 2, H], bt: [W / 2, H, W / 2, 0], diag: [0, 0, W, H], rdiag: [W, 0, 0, H] };
    const [x0, y0, x1, y1] = map[dir] || map.tb;
    gr = ctx.createLinearGradient(x0, y0, x1, y1);
  }
  gr.addColorStop(0, c1); gr.addColorStop(1, c2);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function applyBgMotion(ctx, W, H, bgm, ts) {
  const t = S.bgMotionT;
  if (bgm === "drift") { const d = t * 12 % 80; ctx.translate(d * .5, d * .3); ctx.scale(1.15, 1.15); ctx.translate(-W * .075, -H * .06); }
  if (bgm === "zoom") { const sc = 1 + ((t * .04) % 0.15); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2); }
  if (bgm === "pan") { const p = (Math.sin(t * .25) + 1) / 2; ctx.translate(-p * 60, 0); ctx.scale(1.12, 1); }
}

function imgCover(ctx, src, x, y, w, h) {
  // ImageBitmap يكشف عن width/height، بينما HTMLImageElement يستخدم naturalWidth،
  // و HTMLVideoElement يستخدم videoWidth
  const sw = src.naturalWidth || src.videoWidth || src.width || w;
  const sh = src.naturalHeight || src.videoHeight || src.height || h;
  if (!sw || !sh) return;
  const ir = sw / sh, cr = w / h;
  let dw, dh, dx, dy;
  if (ir > cr) { dh = h; dw = dh * ir; dx = x - (dw - w) / 2; dy = y; }
  else { dw = w; dh = dw / ir; dy = y - (dh - h) / 2; dx = x; }
  ctx.drawImage(src, dx, dy, dw, dh);
}

// ══════════════════════════════════════════════════════
//  COLOR FILTER
// ══════════════════════════════════════════════════════
function applyColorFilter(ctx, W, H) {
  const cf = radioVal("cf");
  if (cf === "none") return;
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  const len = d.length;
  switch (cf) {
    case "bw":
      for (let i = 0; i < len; i += 4) {
        const g = d[i] * .3 + d[i+1] * .59 + d[i+2] * .11;
        d[i] = d[i+1] = d[i+2] = g;
      }
      break;
    case "warm":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i] * 1.12);
        d[i+2] = Math.max(0,   d[i+2] * .88);
      }
      break;
    case "cold":
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0,   d[i] * .88);
        d[i+2] = Math.min(255, d[i+2] * 1.12);
      }
      break;
    case "sepia":
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        d[i]   = Math.min(255, r * .393 + g * .769 + b * .189);
        d[i+1] = Math.min(255, r * .349 + g * .686 + b * .168);
        d[i+2] = Math.min(255, r * .272 + g * .534 + b * .131);
      }
      break;
    case "negative":
      for (let i = 0; i < len; i += 4) {
        d[i]   = 255 - d[i];
        d[i+1] = 255 - d[i+1];
        d[i+2] = 255 - d[i+2];
      }
      break;
    case "saturated":
      // زيادة التشبع بنسبة ~50%
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, Math.max(0, gray + (r - gray) * 1.6));
        d[i+1] = Math.min(255, Math.max(0, gray + (g - gray) * 1.6));
        d[i+2] = Math.min(255, Math.max(0, gray + (b - gray) * 1.6));
      }
      break;
    case "faded":
      // إقلال التشبع + زيادة طفيفة في السطوع
      for (let i = 0; i < len; i += 4) {
        const r = d[i], g = d[i+1], b = d[i+2];
        const gray = r * .3 + g * .59 + b * .11;
        d[i]   = Math.min(255, gray + (r - gray) * 0.4 + 20);
        d[i+1] = Math.min(255, gray + (g - gray) * 0.4 + 20);
        d[i+2] = Math.min(255, gray + (b - gray) * 0.4 + 20);
      }
      break;
    case "dreamy":
      // pastel ناعم: dampened saturation + lift في الـ shadows
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.min(255, d[i]   * 0.85 + 38);
        d[i+1] = Math.min(255, d[i+1] * 0.85 + 38);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 50);  // مسحة أزرق دافئ
      }
      break;
    case "night":
      // داكن مزرق (سينمائي ليلي)
      for (let i = 0; i < len; i += 4) {
        d[i]   = Math.max(0, d[i]   * 0.55);
        d[i+1] = Math.max(0, d[i+1] * 0.65);
        d[i+2] = Math.min(255, d[i+2] * 0.85 + 25);
      }
      break;
  }
  ctx.putImageData(id, 0, 0);
}

function applyDim(ctx, W, H) {
  const d = gv("dim") / 100;
  if (d > 0) { ctx.fillStyle = `rgba(0,0,0,${d})`; ctx.fillRect(0, 0, W, H); }
}

function applyOvColor(ctx, W, H) {
  const op = gv("ov-op") / 100;
  if (op <= 0) return;
  const [r, g, b] = hex2rgb($("ov-col").value);
  ctx.fillStyle = `rgba(${r},${g},${b},${op})`; ctx.fillRect(0, 0, W, H);
}

// ══════════════════════════════════════════════════════
//  ORNAMENTS
// ══════════════════════════════════════════════════════
function drawOrnament(ctx, W, H, ts) {
  const type = radioVal("orn"); if (type === "none") return;
  const op = gv("orn-op") / 100, col = $("orn-col").value;
  ctx.save(); ctx.globalAlpha = op;
  if (type === "hex") drawHexGrid(ctx, W, H, col);
  if (type === "geo") drawGeoPattern(ctx, W, H, col);
  if (type === "stars") drawIslamicStars(ctx, W, H, col);
  if (type === "arch") drawArch(ctx, W, H, col);
  if (type === "frame") drawOrnateFrame(ctx, W, H, col, ts);
  ctx.restore();
}

function drawHexGrid(ctx, W, H, col) {
  const s = 45, h = s * Math.sqrt(3) / 2;
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / h + 2; r++) for (let c = -1; c < W / (s * 1.5) + 2; c++) {
    const x = c * s * 1.5, y = r * h * 2 + (c % 2 === 0 ? 0 : h);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; ctx.lineTo(x + s * .9 * Math.cos(a), y + s * .9 * Math.sin(a)); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawGeoPattern(ctx, W, H, col) {
  const s = 55; ctx.strokeStyle = col; ctx.lineWidth = .7;
  for (let r = 0; r < H / s + 2; r++) for (let c = 0; c < W / s + 2; c++) {
    const x = c * s, y = r * s;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - s / 2, y + s); ctx.lineTo(x + s / 2, y + s); ctx.closePath(); ctx.stroke();
  }
}

function drawIslamicStars(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = .8;
  for (let r = -1; r < H / 80 + 2; r++) for (let c = -1; c < W / 80 + 2; c++) {
    const x = c * 80 + (r % 2) * 40, y = r * 80;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 === 0 ? 32 : 14; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.stroke();
  }
}

function drawArch(ctx, W, H, col) {
  ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  const cx = W / 2, aw = W * .6;
  ctx.beginPath(); ctx.moveTo(cx - aw / 2, H * .86); ctx.lineTo(cx - aw / 2, H * .4);
  ctx.arc(cx, H * .4, aw / 2, Math.PI, 0); ctx.lineTo(cx + aw / 2, H * .86); ctx.stroke();
  ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(cx, H * .37, 14, 0, Math.PI * 2); ctx.stroke();
}

function drawOrnateFrame(ctx, W, H, col, ts) {
  const p = 12, pulse = 1 + Math.sin(ts * .8) * .012;
  ctx.strokeStyle = col; ctx.lineWidth = 1.5 * pulse;
  rRect(ctx, p, p, W - p * 2, H - p * 2, 14); ctx.stroke();
  ctx.lineWidth = .6; rRect(ctx, p + 7, p + 7, W - (p + 7) * 2, H - (p + 7) * 2, 8); ctx.stroke();
  const cs = 28;
  [[p, p], [W - p, p], [p, H - p], [W - p, H - p]].forEach(([x, y]) => {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.moveTo(-cs, 0); ctx.lineTo(0, 0); ctx.lineTo(0, -cs);
    ctx.stroke(); ctx.restore();
  });
}

function rRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r); ctx.closePath();
}

// ══════════════════════════════════════════════════════
//  FX (الموجودة سابقاً + تأثيرات جديدة)
// ══════════════════════════════════════════════════════
function generateParticles() {
  S.stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * .9 + .2, alpha: Math.random() * .6 + .3, phase: Math.random() * Math.PI * 2 }));
  S.bokeh = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 35 + 10, alpha: Math.random() * .1 + .03, vy: Math.random() * .0003 + .0001 }));
}

function drawStars(ctx, W, H, ts) {
  S.stars.forEach(s => {
    const a = s.alpha * (.5 + .5 * Math.sin(ts * 1.8 + s.phase));
    ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,220,${a})`; ctx.fill();
  });
}

function drawRays(ctx, W, H, ts) {
  ctx.save(); ctx.globalCompositeOperation = "screen";
  const cx = W / 2, cy = H * .2;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + ts * .04, len = Math.max(W, H) * 1.2;
    const alpha = .025 + .015 * Math.sin(ts * .7 + i);
    const gr = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
    gr.addColorStop(0, `rgba(255,235,170,${alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a - .02) * len, cy + Math.sin(a - .02) * len);
    ctx.lineTo(cx + Math.cos(a + .02) * len, cy + Math.sin(a + .02) * len);
    ctx.closePath(); ctx.fillStyle = gr; ctx.fill();
  }
  ctx.restore();
}

function drawBokeh(ctx, W, H, ts) {
  S.bokeh.forEach(p => {
    const y = ((p.y + ts * p.vy) % 1) * H;
    const gr = ctx.createRadialGradient(p.x * W, y, 0, p.x * W, y, p.r);
    gr.addColorStop(0, `rgba(200,220,200,${p.alpha})`); gr.addColorStop(1, "transparent");
    ctx.beginPath(); ctx.arc(p.x * W, y, p.r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
  });
}

function drawVignette(ctx, W, H) {
  const str = gv("vig-str") / 100;
  const gr = ctx.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75);
  gr.addColorStop(0, "transparent"); gr.addColorStop(1, `rgba(0,0,0,${str * .85})`);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
}

function drawGoldBorder(ctx, W, H, ts) {
  const pulse = .5 + .5 * Math.sin(ts * 1.5);
  // اللون مستقل عن لون الزخرفة — يفضّل gold-col الجديد ويسقط على orn-col للتوافق القديم
  const goldEl = $("gold-col");
  const colorHex = (goldEl && goldEl.value) || $("orn-col").value || "#f0c842";
  const [r, g, b] = hex2rgb(colorHex);
  ctx.save();
  ctx.shadowColor = `rgba(${r},${g},${b},${.5 + pulse * .3})`; ctx.shadowBlur = 20 + pulse * 10;
  ctx.strokeStyle = `rgba(${r},${g},${b},.85)`; ctx.lineWidth = 2;
  rRect(ctx, 8, 8, W - 16, H - 16, 13); ctx.stroke();
  ctx.restore();
}

function drawGrain(ctx, W, H) {
  const id = ctx.getImageData(0, 0, W, H);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - .5) * 28;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(id, 0, 0);
}

// ===== التأثيرات الجديدة =====
function applyPixelate(ctx, W, H) {
  const size = parseInt(gv("pixel-size")) || 8;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      const idx = (y * W + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = r;
            data[nidx + 1] = g;
            data[nidx + 2] = b;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyMosaic(ctx, W, H) {
  const size = parseInt(gv("mosaic-size")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let y = 0; y < H; y += size) {
    for (let x = 0; x < W; x += size) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            rSum += data[nidx];
            gSum += data[nidx + 1];
            bSum += data[nidx + 2];
            count++;
          }
        }
      }
      const rAvg = Math.round(rSum / count);
      const gAvg = Math.round(gSum / count);
      const bAvg = Math.round(bSum / count);
      for (let dy = 0; dy < size; dy++) {
        for (let dx = 0; dx < size; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < W && ny < H) {
            const nidx = (ny * W + nx) * 4;
            data[nidx] = rAvg;
            data[nidx + 1] = gAvg;
            data[nidx + 2] = bAvg;
          }
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyRipple(ctx, W, H, ts) {
  const amp = parseFloat(gv("ripple-amp")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const centerX = W / 2, centerY = H / 2;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) + Math.sin(dist * 0.05 + ts * 5) * amp * 0.1;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4;
        const dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyWave(ctx, W, H, ts) {
  const amp = parseFloat(gv("wave-amp")) || 10;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const offsetX = Math.sin(y * 0.05 + ts * 5) * amp;
      const srcX = Math.min(W - 1, Math.max(0, x + offsetX));
      const srcY = y;
      const srcIdx = (srcY * W + srcX) * 4;
      const dstIdx = (y * W + x) * 4;
      newData[dstIdx] = data[srcIdx];
      newData[dstIdx + 1] = data[srcIdx + 1];
      newData[dstIdx + 2] = data[srcIdx + 2];
      newData[dstIdx + 3] = data[srcIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applySwirl(ctx, W, H) {
  const factor = parseFloat(gv("swirl-factor")) || 3;
  const centerX = W / 2, centerY = H / 2;
  const maxDist = Math.min(centerX, centerY);
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        const amount = (maxDist - dist) / maxDist * factor;
        const angle = Math.atan2(dy, dx) + amount;
        const srcX = Math.round(centerX + Math.cos(angle) * dist);
        const srcY = Math.round(centerY + Math.sin(angle) * dist);
        if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
          const srcIdx = (srcY * W + srcX) * 4;
          const dstIdx = (y * W + x) * 4;
          newData[dstIdx] = data[srcIdx];
          newData[dstIdx + 1] = data[srcIdx + 1];
          newData[dstIdx + 2] = data[srcIdx + 2];
          newData[dstIdx + 3] = data[srcIdx + 3];
          continue;
        }
      }
      const dstIdx = (y * W + x) * 4;
      newData[dstIdx] = data[dstIdx];
      newData[dstIdx + 1] = data[dstIdx + 1];
      newData[dstIdx + 2] = data[dstIdx + 2];
      newData[dstIdx + 3] = data[dstIdx + 3];
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyKaleido(ctx, W, H) {
  const segments = parseInt(gv("kaleido-segments")) || 6;
  const centerX = W / 2, centerY = H / 2;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data.length);
  const angleStep = (Math.PI * 2) / segments;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let angle = Math.atan2(dy, dx);
      // تعيين الزاوية إلى القطاع الأول
      angle = angle % (angleStep * 2);
      if (angle < 0) angle += angleStep * 2;
      if (angle > angleStep) angle = angleStep * 2 - angle;
      const srcX = Math.round(centerX + Math.cos(angle) * dist);
      const srcY = Math.round(centerY + Math.sin(angle) * dist);
      if (srcX >= 0 && srcX < W && srcY >= 0 && srcY < H) {
        const srcIdx = (srcY * W + srcX) * 4;
        const dstIdx = (y * W + x) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }
  ctx.putImageData(new ImageData(newData, W, H), 0, 0);
}

function applyGlitch(ctx, W, H) {
  const intensity = parseInt(gv("glitch-intensity")) || 5;
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  const shift = Math.floor(intensity / 2);
  for (let y = 0; y < H; y += intensity * 2) {
    const offset = (Math.random() - 0.5) * shift;
    for (let x = 0; x < W; x++) {
      const srcX = Math.min(W - 1, Math.max(0, x + offset));
      const srcIdx = (y * W + srcX) * 4;
      const dstIdx = (y * W + x) * 4;
      data[dstIdx] = data[srcIdx];
      data[dstIdx + 1] = data[srcIdx + 1];
      data[dstIdx + 2] = data[srcIdx + 2];
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function applyOldFilm(ctx, W, H, ts) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // تدرج بني
    data[i] = Math.min(255, data[i] * 0.9 + 20);
    data[i + 1] = Math.min(255, data[i + 1] * 0.7 + 10);
    data[i + 2] = Math.min(255, data[i + 2] * 0.5 + 5);
    // حبوب
    data[i] += (Math.random() - 0.5) * 15;
    data[i + 1] += (Math.random() - 0.5) * 15;
    data[i + 2] += (Math.random() - 0.5) * 15;
  }
  // خدوش عشوائية
  if (Math.random() < 0.02) {
    const scratchY = Math.floor(Math.random() * H);
    for (let x = 0; x < W; x++) {
      const idx = (scratchY * W + x) * 4;
      for (let c = 0; c < 3; c++) data[idx + c] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

// ══════════════════════════════════════════════════════
//  LOGO
// ══════════════════════════════════════════════════════
const LOGO_PERSIST_KEY = "gt_sqrm_logo_v1";

function onLogoUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const isVideo = /\.(mov|mp4|webm)$/i.test(file.name) || file.type.startsWith("video/");

  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;

  if (isVideo) {
    const vid = document.createElement("video");
    vid.src = url;
    vid.loop = true;
    vid.muted = true;
    vid.playsInline = true;
    vid.autoplay = true;
    vid.onloadeddata = () => {
      S.logoVid = vid;
      vid.play().catch(() => {});
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = "";
      $("logo-vid-preview").src = url;
      $("logo-vid-preview").style.display = "block";
      $("logo-img-preview").style.display = "none";
      toast("✅ شعار فيديو تم تحميله (الفيديو لا يُحفظ تلقائياً بين المشاريع — حجمه كبير)", "info", 5000);
      // فيديوهات الشعار أكبر من سعة localStorage فلا تُحفظ. ننظّف أي حفظ سابق.
      try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
    };
    vid.onerror = () => toast("❌ فشل تحميل الفيديو", "error");
    vid.load();
  } else {
    const img = new Image();
    img.onload = () => {
      S.logoImg = img;
      $("logo-preview").style.display = "block";
      $("logo-img-preview").src = url;
      $("logo-img-preview").style.display = "block";
      $("logo-vid-preview").style.display = "none";
      toast("✅ تم تحميل الشعار — سيُحفظ تلقائياً للمشاريع القادمة", "success");
    };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;

    // اقرأ الملف كـ dataURL واحفظه في localStorage للاستعادة بين الجلسات
    // (نتسامح مع QuotaExceeded — الشعار في الذاكرة يبقى فعّالاً للجلسة الحالية)
    const fr = new FileReader();
    fr.onload = () => {
      try {
        localStorage.setItem(LOGO_PERSIST_KEY, fr.result);
      } catch (e) {
        console.warn("Logo too large for localStorage — won't persist:", e);
        toast("⚠️ الشعار يعمل في هذه الجلسة لكن حجمه أكبر من سعة الحفظ — لن يُستعاد لاحقاً", "info", 4000);
      }
    };
    fr.readAsDataURL(file);
  }
}

function removeLogo() {
  if (S.logoVid) { try { S.logoVid.pause(); } catch (_) {} S.logoVid = null; }
  S.logoImg = null;
  $("logo-preview").style.display = "none";
  $("logo-upload").value = "";
  try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {}
  toast("🗑️ تمت إزالة الشعار", "info");
}

function restoreLogo() {
  let dataUrl = null;
  try { dataUrl = localStorage.getItem(LOGO_PERSIST_KEY); } catch (_) {}
  if (!dataUrl) return;
  const img = new Image();
  img.onload = () => {
    S.logoImg = img;
    const prevEl = $("logo-preview");
    const imgPrev = $("logo-img-preview");
    const vidPrev = $("logo-vid-preview");
    if (prevEl) prevEl.style.display = "block";
    if (imgPrev) { imgPrev.src = dataUrl; imgPrev.style.display = "block"; }
    if (vidPrev) vidPrev.style.display = "none";
  };
  img.onerror = () => { try { localStorage.removeItem(LOGO_PERSIST_KEY); } catch (_) {} };
  img.src = dataUrl;
}

function drawLogo(ctx, W, H) {
  const src = S.logoVid || S.logoImg;
  if (!src) return;

  const pos = $("logo-pos").value;
  const size = parseInt(gv("logo-size")) || 60;
  const opacity = (parseInt(gv("logo-opacity")) || 80) / 100;

  if (S.logoVid && S.logoVid.readyState < 2) return;

  const natW = src.naturalWidth || src.videoWidth || size;
  const natH = src.naturalHeight || src.videoHeight || size;

  let drawW = size;
  let drawH = natH / natW * size;
  if (drawH > size * 2.5) { drawH = size; drawW = natW / natH * size; }

  let x, y;
  const pad = 15;
  switch (pos) {
    case "br": x = W - drawW - pad; y = H - drawH - pad; break;
    case "bl": x = pad; y = H - drawH - pad; break;
    case "tr": x = W - drawW - pad; y = pad; break;
    case "tl": x = pad; y = pad; break;
    case "center": x = (W - drawW) / 2; y = (H - drawH) / 2; break;
    default: x = W - drawW - pad; y = H - drawH - pad;
  }

  // v3.2 — Chromakey للشعار
  const chromaOn = ge("logo-chroma-on");
  if (chromaOn) {
    const tmp = getLogoChromaCanvas(Math.ceil(drawW), Math.ceil(drawH));
    const tctx = tmp.getContext("2d", { willReadFrequently: true });
    tctx.clearRect(0, 0, tmp.width, tmp.height);
    tctx.drawImage(src, 0, 0, drawW, drawH);
    removeBgColorFromRegion(tctx, 0, 0, Math.ceil(drawW), Math.ceil(drawH), {
      colorHex: $("logo-chroma-color")?.value || "#ffffff",
      threshold: parseFloat(gv("logo-chroma-threshold")) || 25,
      softness: parseFloat(gv("logo-chroma-softness")) || 10,
    });
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(tmp, x, y);
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(src, x, y, drawW, drawH);
    ctx.restore();
  }
}

let _logoChromaCanvas = null;
function getLogoChromaCanvas(w, h) {
  if (!_logoChromaCanvas) _logoChromaCanvas = document.createElement("canvas");
  if (_logoChromaCanvas.width !== w) _logoChromaCanvas.width = w;
  if (_logoChromaCanvas.height !== h) _logoChromaCanvas.height = h;
  return _logoChromaCanvas;
}

// ══════════════════════════════════════════════════════
//  VERSE RENDERING
// ══════════════════════════════════════════════════════
// ── رسم اسم السورة في أعلى المقطع ─────────────────
// v3.1 — عنوان مخصّص للمقطع
function drawVideoTitle(ctx, W, H) {
  if (!ge("vtitle-on")) return;
  const text = ($("vtitle-text")?.value || "").trim();
  if (!text) return;
  const font = fontVal();
  const fsz = W * 0.055 * ((parseFloat(gv("vtitle-size")) || 90) / 100);
  const yPct = parseFloat(gv("vtitle-y")) || 6;
  const y = (yPct / 100) * H + fsz;
  const col = $("vtitle-col")?.value || "#ffe082";
  const fx = $("vtitle-fx")?.value || "shadow";
  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  if (fx === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,.75)";
    ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    ctx.fillText(text, W / 2, y);
  } else if (fx === "glow") {
    ctx.shadowColor = col; ctx.shadowBlur = 24;
    ctx.fillText(text, W / 2, y);
    ctx.shadowBlur = 0; ctx.fillText(text, W / 2, y);
  } else if (fx === "outline") {
    ctx.lineJoin = "round"; ctx.miterLimit = 2;
    ctx.lineWidth = Math.max(2, fsz * 0.06);
    ctx.strokeStyle = "rgba(0,0,0,.85)";
    ctx.strokeText(text, W / 2, y);
    ctx.fillText(text, W / 2, y);
  } else {
    ctx.fillText(text, W / 2, y);
  }
  ctx.restore();
}

function drawSurahName(ctx, W, H) {
  if (!ge("sname-on")) return;
  if (!S.surahs || !S.surahs.length) return;
  const surahNum = parseInt($("surah-sel")?.value) || 1;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (!surah) return;

  const prefix = $("sname-prefix")?.value || "surah";
  const rawName = surah.name || "";
  const cleanName = rawName.replace(/^\s*(?:سُورَةُ|سُورَة|سُورة|سورة)\s+/u, "");
  const label = prefix === "surah" ? `سُورَةُ ${cleanName}`
              : prefix === "hizb"  ? `حِزْبُ ${cleanName}`
              :                       cleanName;

  const font = fontVal();
  const fsz = W * 0.05 * ((parseFloat(gv("sname-size")) || 80) / 100);
  const yPct = parseFloat(gv("sname-y")) || 5;
  const y = (yPct / 100) * H + fsz;
  const col = $("sname-col")?.value || "#f0c842";

  ctx.save();
  ctx.font = `bold ${fsz}px ${font}`;
  ctx.fillStyle = col;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.shadowColor = "rgba(0,0,0,.7)";
  ctx.shadowBlur = 10;
  ctx.fillText(label, W / 2, y);
  ctx.restore();
}

function drawVerse(ctx, W, H, ts) {
  const aya = S.verses[S.currentAya]; if (!aya) return;
  const font = fontVal();
  const txtCol = $("txt-col").value;
  const shdCol = $("shd-col").value;
  const fsz = W * .062 * (gv("fsize") / 100);
  const lh = parseFloat(gv("lh"));
  const tpos = radioVal("tpos");
  const textEff = radioVal("te");
  let animType = radioVal("tanim");
  // في وضع "مختلط": اختر التأثير الفعلي للآية الحالية بترتيب الاختيار
  if (animType === "mix") animType = getMixedAnimForCurrentAya();
  const dur = S.ayaDurations[S.currentAya] || 6;

  // ── حساب alpha + transform حسب نوع الـ animation ──
  let alpha = 1;
  let trX = 0, trY = 0;
  let scX = 1, scY = 1;
  let blurPx = 0;
  let glowBoost = 0;

  if (animType !== "none" && animType !== "word") {
    const w = (S.elapsed % dur) / dur;     // 0..1
    const easeIn  = (p) => 1 - Math.pow(1 - p, 3);   // ease-out cubic
    const easeOut = (p) => Math.pow(p, 3);            // ease-in cubic
    const IN_END = 0.15;
    const OUT_START = 0.85;

    if (animType === "fade") {
      if (w < IN_END)        alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
    }
    else if (animType === "slide") {
      // ينزلق من اليمين دخولاً، لليسار خروجاً (مناسب لـ RTL)
      if (w < IN_END) {
        const p = w / IN_END;
        alpha = p;
        trX = (1 - easeIn(p)) * W * 0.4;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START);
        alpha = p;
        trX = -(1 - p) * W * 0.4;
      }
    }
    else if (animType === "zoom") {
      if (w < IN_END) {
        const p = w / IN_END;
        alpha = p;
        scX = scY = 0.55 + 0.45 * easeIn(p);
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START);
        alpha = p;
        scX = scY = 1 + (1 - p) * 0.35;
      }
    }
    else if (animType === "drop") {
      if (w < IN_END) {
        const p = w / IN_END;
        alpha = p;
        trY = -(1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) {
        alpha = (1 - w) / (1 - OUT_START);
      }
    }
    else if (animType === "rise") {
      if (w < IN_END) {
        const p = w / IN_END;
        alpha = p;
        trY = (1 - easeIn(p)) * H * 0.25;
      } else if (w > OUT_START) {
        alpha = (1 - w) / (1 - OUT_START);
      }
    }
    else if (animType === "blur") {
      if (w < IN_END) {
        const p = w / IN_END;
        alpha = p;
        blurPx = (1 - p) * 18;
      } else if (w > OUT_START) {
        const p = (1 - w) / (1 - OUT_START);
        alpha = p;
        blurPx = (1 - p) * 12;
      }
    }
    else if (animType === "glow") {
      // توهج نابض بدل تلاشي
      if (w < IN_END) alpha = w / IN_END;
      else if (w > OUT_START) alpha = (1 - w) / (1 - OUT_START);
      glowBoost = 12 + 16 * (0.5 + 0.5 * Math.sin(ts * 4));
    }
  }

  ctx.save();
  ctx.textAlign = "center"; ctx.direction = "rtl";
  ctx.globalAlpha = alpha;
  if (blurPx > 0.5) ctx.filter = `blur(${blurPx}px)`;
  // طبّق التحويلات حول مركز Canvas (يجعل zoom/slide حول النص)
  if (trX || trY || scX !== 1 || scY !== 1) {
    ctx.translate(W / 2, H / 2);
    ctx.translate(trX, trY);
    ctx.scale(scX, scY);
    ctx.translate(-W / 2, -H / 2);
  }
  ctx.font = `${fsz}px ${font}`; ctx.fillStyle = txtCol;
  const drawTxt = setTextFx(ctx, textEff, txtCol, shdCol);
  if (glowBoost) ctx.shadowBlur = (ctx.shadowBlur || 0) + glowBoost;

  const lines = wrapText(ctx, aya.text, W * .85, fsz, font);
  const lineH = fsz * lh, totalH = lines.length * lineH;
  const hasT = S.translations[S.currentAya];
  let startY;
  if (tpos === "top") startY = H * .1 + fsz;
  else if (tpos === "bottom") startY = H * .82 - totalH + fsz;
  else startY = H * .5 - totalH * (hasT ? .4 : .5) + fsz;

  if (animType === "word") {
    drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt);
  } else {
    lines.forEach((line, i) => drawTxt(W / 2, startY + i * lineH, line));
  }

  if (hasT) {
    const tfsPct = gv("tfs") / 100;
    const tfs = W * .03 * tfsPct * 1.6;
    ctx.font = `${tfs}px 'Cairo',sans-serif`;
    ctx.fillStyle = $("trans-col").value;
    ctx.globalAlpha = alpha * .75;
    ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 8;
    const tLines = wrapText(ctx, hasT, W * .8, tfs, "Cairo");
    const tStart = startY + totalH + tfs * 1.2;
    tLines.forEach((tl, i) => ctx.fillText(tl, W / 2, tStart + i * tfs * 1.4));
  }

  ctx.globalAlpha = alpha * .6;
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.font = `bold ${W * .022}px 'Cairo'`;
  ctx.fillStyle = $("orn-col").value;
  ctx.fillText(`❴ ${aya.numberInSurah} ❵`, W / 2, startY + totalH + (hasT ? 0 : W * .04));

  ctx.restore();
}

// ── الكشف التدريجي للكلمات ─────────────────────────────
//   نُبقي تخطيط wrapText كما هو (نفس الأسطر بنفس العرض)
//   ونرسم كلمة-بكلمة بمواقع مُحسوبة من قياس المسافات
//   النتيجة: ظهور تتابعي بدون قفز في التموضع
function drawWordByWord(ctx, lines, W, startY, lineH, fsz, font, txtCol, dur, drawTxt) {
  const fadeMs = parseInt(gv("word-fade-ms") || "180");
  const keepPrev = ge("word-keep");
  const paceVal = $("word-pace")?.value || "auto";

  // اجمع كل الكلمات مع موضعها (سطر + ترتيب داخل السطر)
  const wordList = [];
  lines.forEach((line, lineIdx) => {
    const words = line.split(/\s+/).filter(Boolean);
    words.forEach((w, wIdx) => wordList.push({ text: w, lineIdx, wIdx, lineWords: words }));
  });

  const N = wordList.length;
  if (N === 0) return;

  // مدة كل كلمة
  const wordDuration = (paceVal === "auto")
    ? (dur / N)
    : parseFloat(paceVal);

  const spaceW = ctx.measureText(" ").width;

  // تخزين مؤقت لمواقع الكلمات داخل كل سطر
  // (يُحسب لمرة واحدة لأن قياس النصوص ثابت لطول السطر)
  const linePositions = lines.map(line => {
    const words = line.split(/\s+/).filter(Boolean);
    if (!words.length) return null;
    const widths = words.map(w => ctx.measureText(w).width);
    const lineW = widths.reduce((a, b) => a + b, 0) + spaceW * (words.length - 1);
    const xRight = W / 2 + lineW / 2;  // الحافة اليمنى للسطر (RTL تبدأ من اليمين)
    // x لكل كلمة = الحافة اليمنى لها (مع textAlign="right")
    const xs = [];
    let cur = xRight;
    for (let i = 0; i < words.length; i++) {
      xs.push(cur);
      cur -= widths[i] + spaceW;
    }
    return xs;
  });

  // ارسم كل كلمة بفاصل زمني
  const oldAlign = ctx.textAlign;
  ctx.textAlign = "right";

  for (let k = 0; k < N; k++) {
    const wordStart = k * wordDuration;
    if (S.elapsed < wordStart) continue;  // لم يحن وقتها بعد

    // إن لم نُبقِ السابقات: نُظهر فقط الكلمة الحالية + التي تليها أثناء الـ fade
    if (!keepPrev) {
      const wordEnd = wordStart + wordDuration;
      if (S.elapsed >= wordEnd) continue;
    }

    // حساب alpha التلاشي لهذه الكلمة
    const sinceStart = S.elapsed - wordStart;
    let a = 1;
    if (fadeMs > 0 && sinceStart * 1000 < fadeMs) {
      a = (sinceStart * 1000) / fadeMs;
    }
    if (!keepPrev) {
      const fadeOutStart = wordDuration - fadeMs / 1000;
      if (fadeMs > 0 && sinceStart > fadeOutStart) {
        a = Math.min(a, (wordDuration - sinceStart) / (fadeMs / 1000));
      }
    }
    a = Math.max(0, Math.min(1, a));

    const w = wordList[k];
    const xs = linePositions[w.lineIdx];
    if (!xs) continue;
    const x = xs[w.wIdx];
    const y = startY + w.lineIdx * lineH;

    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = txtCol;
    if (typeof drawTxt === "function") drawTxt(x, y, w.text);
    else                                ctx.fillText(w.text, x, y);
    ctx.restore();
  }

  ctx.textAlign = oldAlign;
}

// ── تأثيرات النص — يُهيِّئ ctx ويُرجع دالة رسم تتعامل
//    مع التأثيرات التي تحتاج عدة fillText/strokeText (outline, 3D, gradient)
function setTextFx(ctx, eff, txtCol, shdCol) {
  ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  const [sr, sg, sb] = hex2rgb(shdCol);

  // افتراضي بسيط (لا حاجة لرسم مخصّص)
  const simple = (x, y, text) => ctx.fillText(text, x, y);

  switch (eff) {
    case "glow":
      ctx.shadowColor = "#f0c842"; ctx.shadowBlur = 28;
      return simple;

    case "neon":
      ctx.shadowColor = "#00ff88"; ctx.shadowBlur = 22;
      // رسم مكرّر لتقوية التوهج
      return (x, y, text) => { ctx.fillText(text, x, y); ctx.fillText(text, x, y); };

    case "outline":
      // حدود فعلية عبر strokeText قبل التعبئة
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        ctx.save();
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        // حدود سوداء سميكة
        ctx.strokeStyle = shdCol || "#000";
        ctx.lineWidth = Math.max(3, fontSize * 0.08);
        ctx.strokeText(text, x, y);
        // ثم تعبئة النص
        ctx.restore();
        ctx.fillText(text, x, y);
      };

    case "shadow3d":
      // ظل 3D حقيقي: طبقات متعدّدة بإزاحة متدرّجة
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const layers = 10;
        const maxOff = Math.max(3, fontSize * 0.09);
        const oldFill = ctx.fillStyle;
        for (let i = layers; i >= 1; i--) {
          const p = i / layers;
          const off = maxOff * p;
          ctx.fillStyle = `rgba(${sr},${sg},${sb},${0.55 * p})`;
          ctx.fillText(text, x + off, y + off);
        }
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };

    case "emboss":
      // إضاءة من الأعلى + ظل خفيف من الأسفل (يبدو بارزاً)
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.fillText(text, x, y);
      };

    case "carved":
      // عكس emboss — يبدو محفوراً داخل السطح
      return (x, y, text) => {
        const oldFill = ctx.fillStyle;
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillText(text, x - 1.5, y - 1.5);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.fillText(text, x + 1.5, y + 1.5);
        ctx.fillStyle = oldFill;
        ctx.globalCompositeOperation = "multiply";
        ctx.fillText(text, x, y);
        ctx.globalCompositeOperation = "source-over";
      };

    case "gold":
      // تدرّج ذهبي معدني (chrome-like)
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y - fontSize, x, y + fontSize * 0.2);
        grad.addColorStop(0,    "#fff5b0");
        grad.addColorStop(0.3,  "#f0c842");
        grad.addColorStop(0.55, "#b8860b");
        grad.addColorStop(0.8,  "#f0c842");
        grad.addColorStop(1,    "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };

    case "fire":
      // تدرّج ناري (أحمر/برتقالي/أصفر)
      return (x, y, text) => {
        const fontSize = parseInt(ctx.font) || 40;
        const grad = ctx.createLinearGradient(x, y + fontSize * 0.3, x, y - fontSize);
        grad.addColorStop(0,   "#7a0000");
        grad.addColorStop(0.3, "#e63b00");
        grad.addColorStop(0.7, "#ffb700");
        grad.addColorStop(1,   "#fff5b0");
        const oldFill = ctx.fillStyle;
        ctx.shadowColor = "rgba(230,59,0,.7)"; ctx.shadowBlur = 18;
        ctx.fillStyle = grad;
        ctx.fillText(text, x, y);
        ctx.fillStyle = oldFill;
        ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
      };

    case "soft":
      // ظل ناعم خفيف فقط (الأبسط)
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.5)`; ctx.shadowBlur = 16;
      return simple;

    case "none":
    default:
      ctx.shadowColor = `rgba(${sr},${sg},${sb},.7)`; ctx.shadowBlur = 12;
      return simple;
  }
}

function wrapText(ctx, text, maxW, fsz, font) {
  ctx.font = `${fsz}px ${font}`;
  const words = text.split(" ");
  const lines = []; let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ══════════════════════════════════════════════════════
//  WAVEFORM
// ══════════════════════════════════════════════════════
function getWaveData(ts) {
  // أثناء تصدير V2: استخدم بيانات FFT المُحسوبة مسبقاً من mixed buffer
  if (S._exportWaveData) {
    S.waveData = S._exportWaveData;
    return;
  }
  if (S.analyser) {
    const full = new Uint8Array(S.analyser.frequencyBinCount);
    S.analyser.getByteFrequencyData(full);
    if (full.some(v => v > 15)) {
      const voiceStart = 1;
      const voiceEnd = Math.min(35, full.length - 1);
      const voiceBins = full.slice(voiceStart, voiceEnd + 1);
      const out = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        const srcIdx = Math.floor(i / 64 * voiceBins.length);
        out[i] = voiceBins[srcIdx];
      }
      S.waveData = out;
      return;
    }
  }
  const n = 64;
  const data = new Uint8Array(n);
  const active = S.playing || (S.bgAudioEl && !S.bgAudioEl.paused);
  if (active) {
    for (let i = 0; i < n; i++) {
      const f = i / n;
      const fund = Math.exp(-Math.pow(f - 0.25, 2) / 0.018) * 0.90;
      const harm1 = Math.exp(-Math.pow(f - 0.48, 2) / 0.022) * 0.70;
      const harm2 = Math.exp(-Math.pow(f - 0.70, 2) / 0.025) * 0.45;
      const sublow = f < 0.10 ? (1 - f / 0.10) * 0.55 : 0;
      const envelope = fund + harm1 + harm2 + sublow;
      const pulse = 0.65 + 0.35 * Math.sin(ts * 4.2 + i * 0.4);
      const slow = 0.55 + 0.45 * Math.sin(ts * 1.3 + i * 0.2 + 1.1);
      const noise = Math.random() * 0.05;
      const val = (pulse * 0.50 + slow * 0.40 + noise + 0.10) * envelope;
      data[i] = Math.min(255, Math.floor(val * 300));
    }
  }
  S.waveData = data;
}

function drawWave(ctx, W, H, ts) {
  if (!ge("wave-on")) return;
  getWaveData(ts);
  const shape = radioVal("ws");
  const col = $("wave-col").value;
  const pos = $("wave-pos").value;
  const gain = (parseInt(gv("wave-gain")) || 100) / 100;
  const wh = parseInt(gv("wave-h")) * gain;
  const n = S.waveData.length;
  const [cr, cg, cb] = hex2rgb(col);

  ctx.save();

  const BASE = pos === "top" ? 4 + wh : H - 4;
  const SIGN = pos === "top" ? 1 : -1;

  if (shape === "bars") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.78, bh);
    }
  } else if (shape === "wave") {
    ctx.lineWidth = 2.2; ctx.globalAlpha = 0.85;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.18;
    ctx.beginPath(); ctx.moveTo(0, BASE); ctx.lineTo(W, BASE); ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n);
      const y = BASE + SIGN * bh;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = col;
    ctx.lineTo(W, BASE); ctx.lineTo(0, BASE); ctx.closePath(); ctx.fill();
  } else if (shape === "dots") {
    for (let i = 0; i < n; i += 2) {
      const bh = (S.waveData[i] / 255) * wh;
      const x = i * (W / n) + (W / n);
      const y = BASE + SIGN * bh;
      const r = 1.8 + (S.waveData[i] / 255) * 3.2;
      ctx.globalAlpha = 0.55 + 0.4 * (S.waveData[i] / 255);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x - 1, Math.min(y, BASE), 2, bh);
    }
  } else if (shape === "mirror") {
    const cy = pos === "top" ? 4 + wh / 2 : H - 4 - wh / 2;
    const hw = wh / 2;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.6)`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.moveTo(0, cy);
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy - bh);
    }
    for (let i = n - 1; i >= 0; i--) {
      const bh = (S.waveData[i] / 255) * hw;
      ctx.lineTo(i * (W / n), cy + bh);
    }
    ctx.closePath(); ctx.fill();
  } else if (shape === "circle") {
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.09;
    ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const amp = (S.waveData[idx] / 255) * wh * 0.5;
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = baseR + amp;
      i === 0 ? ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r)
      : ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    }
    ctx.closePath();
    const gr = ctx.createRadialGradient(cx, cy, baseR * 0.4, cx, cy, baseR + wh * 0.55);
    gr.addColorStop(0, `rgba(${cr},${cg},${cb},0.25)`);
    gr.addColorStop(1, `rgba(${cr},${cg},${cb},0.9)`);
    ctx.strokeStyle = gr; ctx.stroke();
    ctx.globalAlpha = 0.06; ctx.fillStyle = col; ctx.fill();
  } else if (shape === "spectrum") {
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const hue = (i / n) * 200 + 140;
      const alpha = 0.35 + 0.6 * (S.waveData[i] / 255);
      ctx.fillStyle = `hsla(${hue},80%,62%,${alpha})`;
      const yTop = BASE + SIGN * bh;
      ctx.fillRect(i * bw, yTop, bw * 0.82, bh);
      if (bh > 4) {
        ctx.fillStyle = `hsla(${hue},100%,90%,${alpha * 0.75})`;
        ctx.fillRect(i * bw, yTop, bw * 0.82, 2);
      }
    }
  } else if (shape === "rays") {
    // أشعة شعاعية من نقطة المنتصف نحو الخارج
    const cx = W / 2;
    const cy = (pos === "top") ? 4 + wh : H - 4;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    const halfArc = Math.PI * 0.85;       // 153 درجة (تجنّب الانتشار 360)
    const startAngle = (pos === "top") ? (Math.PI / 2 - halfArc / 2) : (-Math.PI / 2 - halfArc / 2);
    for (let i = 0; i < n; i++) {
      const amp = (S.waveData[i] / 255) * wh;
      const alpha = 0.4 + 0.55 * (S.waveData[i] / 255);
      const a = startAngle + (i / (n - 1)) * halfArc;
      const x1 = cx, y1 = cy;
      const x2 = cx + Math.cos(a) * amp;
      const y2 = cy + Math.sin(a) * amp;
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
  } else if (shape === "triangles") {
    // مثلثات قمتها للأعلى/أسفل
    const bw = W / n;
    for (let i = 0; i < n; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      if (bh < 1) continue;
      const alpha = 0.45 + 0.5 * (S.waveData[i] / 255);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      const cxBar = i * bw + bw * 0.5;
      const yTip = BASE + SIGN * bh;
      ctx.beginPath();
      ctx.moveTo(cxBar - bw * 0.4, BASE);
      ctx.lineTo(cxBar + bw * 0.4, BASE);
      ctx.lineTo(cxBar, yTip);
      ctx.closePath();
      ctx.fill();
    }
  } else if (shape === "rings") {
    // حلقات متمركزة تتمدّد بحجم الصوت
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.06;
    const numRings = Math.min(n, 12);
    for (let r = 0; r < numRings; r++) {
      const idx = Math.floor((r / numRings) * n);
      const amp = (S.waveData[idx] / 255) * wh * 0.6;
      const radius = baseR + r * (Math.min(W, H) * 0.025) + amp;
      const alpha = (0.4 + 0.5 * (S.waveData[idx] / 255)) * (1 - r / numRings);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.lineWidth = 1.5 + 1.5 * (S.waveData[idx] / 255);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (shape === "mountains") {
    // شكل جبال ناعم — منحنيات بيزيه بين النقاط
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.18)`;
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, BASE);
    const step = W / (n - 1);
    for (let i = 0; i < n - 1; i++) {
      const bh = (S.waveData[i] / 255) * wh;
      const nb = (S.waveData[i + 1] / 255) * wh;
      const x = i * step, y = BASE + SIGN * bh;
      const xN = (i + 1) * step, yN = BASE + SIGN * nb;
      const cpX = (x + xN) / 2;
      ctx.quadraticCurveTo(cpX, y, xN, yN);
    }
    ctx.lineTo(W, BASE);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  WATERMARK
// ══════════════════════════════════════════════════════
function drawWatermark(ctx, W, H) {
  const text = $("wm-text").value.trim(); if (!text) return;
  const sz = parseInt(gv("wm-size")), pos = $("wm-pos").value, col = $("wm-col").value;
  ctx.save(); ctx.font = `bold ${sz}px 'Cairo'`; ctx.fillStyle = col; ctx.globalAlpha = .72;
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 6;
  const pad = sz + 8;
  const pm = { br: ["right", W - pad, H - pad], bl: ["left", pad, H - pad], tr: ["right", W - pad, pad + sz], tl: ["left", pad, pad + sz] };
  const [align, x, y] = pm[pos] || pm.br;
  ctx.textAlign = align; ctx.fillText(text, x, y);
  ctx.restore();
}

// ══════════════════════════════════════════════════════
//  AUDIO
// ══════════════════════════════════════════════════════
function ensureAudioCtx() {
  if (!S.audioCtx || S.audioCtx.state === "closed") {
    S.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    S.exportDest = S.audioCtx.createMediaStreamDestination();
    S.analyser = S.audioCtx.createAnalyser();
    S.analyser.fftSize = 512;
    S.analyser.smoothingTimeConstant = .82;
    S.analyser.connect(S.exportDest);
  }
  return S.audioCtx;
}

async function resumeAudioCtx() {
  const ctx = ensureAudioCtx();
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

let _recGen = 0;

async function playRecitationAudio() {
  if (S.exporting) return;
  stopRecitationAudio();
  if (!S.verses.length || !S.playing) return;
  const aya = S.verses[S.currentAya];
  if (!aya) return;

  const myGen = ++_recGen;
  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
  $("audio-status").textContent = `⏳ جاري التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;

  const onEnded = () => {
    if (!S.playing || myGen !== _recGen) return;
    // الانتظار حسب فاصل الصمت قبل الانتقال للآية التالية
    const gap = getAyaGap();
    const advance = () => {
      if (!S.playing || myGen !== _recGen) return;
      if (S.currentAya < S.verses.length - 1) {
        S.currentAya++; S.elapsed = 0; playRecitationAudio(); updateAyaUI();
      } else {
        pausePlayer(); S.currentAya = 0; S.elapsed = 0; updateAyaUI();
      }
    };
    if (gap > 0) setTimeout(advance, gap * 1000);
    else advance();
  };

  try {
    const ctx = await resumeAudioCtx();
    if (myGen !== _recGen) return;

    const res = await fetch(url, { cache: "force-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const arrayBuf = await res.arrayBuffer();
    if (myGen !== _recGen) return;

    const audioBuf = await ctx.decodeAudioData(arrayBuf);
    if (myGen !== _recGen) return;

    S.ayaDurations[S.currentAya] = audioBuf.duration;

    // gainNode للمعاينة (speakers) — يتأثر بالكتم
    const gainNode = ctx.createGain();
    gainNode.gain.value = gv("rec-vol") / 100;
    // gainNode للتسجيل — لا يتأثر بالكتم أبداً
    const exportGain = ctx.createGain();
    exportGain.gain.value = gv("rec-vol") / 100;
    const source = ctx.createBufferSource();
    source.buffer = audioBuf;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);        // سماعات (يُكتم)
    source.connect(exportGain);
    exportGain.connect(S.analyser);           // تسجيل (لا يُكتم)
    source.start(0);
    source.onended = onEnded;
    S.recAudioSource = source;
    S.recGainNode    = gainNode;    // يُستخدم للكتم فقط
    S.recExportGain  = exportGain; // لا يُلمس بالكتم
    $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  } catch (err) {
    if (myGen !== _recGen) return;
    console.warn("AudioBuffer fetch failed, using HTMLAudioElement:", err.message);
    const a = new Audio();
    a.crossOrigin = null;
    a.volume = gv("rec-vol") / 100;
    a.onloadedmetadata = () => {
      if (myGen === _recGen) S.ayaDurations[S.currentAya] = a.duration || 6;
    };
      a.onended = onEnded;
      a.onerror = () => {
        if (myGen !== _recGen) return;
        S.ayaDurations[S.currentAya] = parseFloat(gv("aya-dur")) || 6;
        $("audio-status").textContent = `❌ فشل التحميل — ${reciter.name} الآية ${aya.numberInSurah}`;
      };
      a.src = url;
      a.play().catch(() => {});
      S.recAudioEl = a;
      $("audio-status").textContent = `▶️ ${reciter.name} — الآية ${aya.numberInSurah}`;
  }
}

function stopRecitationAudio() {
  if (S.recAudioSource) {
    try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (e) { }
    S.recAudioSource = null;
  }
  if (S.recGainNode) {
    try { S.recGainNode.disconnect(); } catch (e) { }
    S.recGainNode = null;
  }
  if (S.recAudioEl) {
    S.recAudioEl.pause();
    S.recAudioEl.src = "";
    S.recAudioEl = null;
  }
}

// ── تقطيع نطاق زمني للوسائط المحلية ───────────────────
//   يطبَّق في المعاينة وفي تصدير V2 (المكتبية) عبر ffmpeg -ss/-to
function getBgVidTrim() {
  if (!ge("bg-vid-trim-on") || !S.bgVid) return null;
  const s = Math.max(0, parseFloat(gv("bg-vid-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-vid-trim-end")) || s + 1);
  const dur = S.bgVid.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}

function getBgAudioTrim() {
  if (!ge("bg-audio-trim-on") || !S.bgAudioEl) return null;
  const s = Math.max(0, parseFloat(gv("bg-audio-trim-start")) || 0);
  const e = Math.max(s + 0.1, parseFloat(gv("bg-audio-trim-end")) || s + 1);
  const dur = S.bgAudioEl.duration;
  return { start: s, end: isFinite(dur) ? Math.min(e, dur) : e };
}

function applyBgVidTrim() {
  const t = getBgVidTrim();
  if (!t || !S.bgVid) return;
  if (S.bgVid.currentTime < t.start || S.bgVid.currentTime > t.end) {
    try { S.bgVid.currentTime = t.start; } catch (_) {}
  }
  // ربط مراقب يعيد للبداية عند تجاوز end
  if (!S.bgVid._trimHandler) {
    S.bgVid._trimHandler = () => {
      const tt = getBgVidTrim();
      if (!tt) return;
      if (S.bgVid.currentTime >= tt.end - 0.05) {
        try { S.bgVid.currentTime = tt.start; } catch (_) {}
      }
    };
    S.bgVid.addEventListener("timeupdate", S.bgVid._trimHandler);
  }
}

function applyBgAudioTrim() {
  const t = getBgAudioTrim();
  if (!t || !S.bgAudioEl) return;
  if (S.bgAudioEl.currentTime < t.start || S.bgAudioEl.currentTime > t.end) {
    try { S.bgAudioEl.currentTime = t.start; } catch (_) {}
  }
  if (!S.bgAudioEl._trimHandler) {
    S.bgAudioEl._trimHandler = () => {
      const tt = getBgAudioTrim();
      if (!tt) return;
      if (S.bgAudioEl.currentTime >= tt.end - 0.05) {
        try { S.bgAudioEl.currentTime = tt.start; } catch (_) {}
      }
    };
    S.bgAudioEl.addEventListener("timeupdate", S.bgAudioEl._trimHandler);
  }
}

function onBgAudio(input) {
  const file = input.files[0];
  if (!file) return;
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.src = ""; }
  const url = URL.createObjectURL(file);
  const a = new Audio(url);
  a.loop = ge("bg-loop");
  a.volume = gv("bg-vol") / 100;
  S.bgAudioEl = a;
  S.bgAudioFile = file; // v3.1
  if (typeof markProjectDirty === "function") markProjectDirty();
  resumeAudioCtx().then(ctx => {
    try {
      const src = ctx.createMediaElementSource(a);
      // previewGain للكتم اليدوي فقط
      const bgPreviewGain = ctx.createGain();
      bgPreviewGain.gain.value = 1;
      src.connect(bgPreviewGain);
      bgPreviewGain.connect(ctx.destination);
      // مسار التسجيل لا يُكتم
      src.connect(S.analyser);
      src.connect(S.exportDest);
      S.bgAudioSource   = src;
      S.bgPreviewGain   = bgPreviewGain;
    } catch (e) {
      console.warn("Could not connect background audio to context", e);
    }
  }).catch(console.warn);
  $("bg-audio-info").textContent = `✅ ${file.name} (${(file.size / 1e6).toFixed(1)}MB)`;
  toast("🎵 تم تحميل صوت الخلفية", "success");
}

function updateVolumes() {
  if (S.recGainNode) S.recGainNode.gain.value = gv("rec-vol") / 100;
  if (S.recAudioEl) S.recAudioEl.volume = gv("rec-vol") / 100;
  if (S.bgAudioEl) S.bgAudioEl.volume = gv("bg-vol") / 100;
}

// ══════════════════════════════════════════════════════
//  MEDIA BACKGROUNDS
// ══════════════════════════════════════════════════════
function onBgMedia(input, type) {
  const file = input.files[0]; if (!file) return;
  const url = URL.createObjectURL(file);
  if (type === "image") {
    const img = new Image();
    img.onload = () => { S.bgImg = img; toast("🖼️ تم تحميل الصورة", "success"); };
    img.onerror = () => toast("❌ فشل تحميل الصورة", "error");
    img.src = url;
    S.bgImgFile = file; // v3.1
    if (typeof markProjectDirty === "function") markProjectDirty();
    const thumb = $("bg-img-thumb");
    $("bg-img-preview").src = url;
    thumb.style.display = "block";
  } else {
    // رفع متعدد للفيديو: نُضيف كل ملف لقائمة الـ playlist
    const files = Array.from(input.files || []);
    if (!files.length) return;
    files.forEach(f => addBgVidItem(f));
    // أعد ضبط input حتى يقبل اختيار نفس الملفات لاحقاً
    input.value = "";
  }
}

// ── إدارة قائمة مقاطع الخلفية (playlist) ──────────────
function addBgVidItem(file) {
  const url = URL.createObjectURL(file);
  const vid = document.createElement("video");
  vid.src = url; vid.muted = true; vid.playsInline = true; vid.preload = "auto";
  // عند نهاية المقطع: انتقل للتالي تلقائياً (تتابع playlist)
  vid.addEventListener("ended", () => switchToNextBgVid());
  vid.onloadeddata = () => {
    const item = {
      file, vid, name: file.name,
      dur: isFinite(vid.duration) ? vid.duration : 0,
      url,
      audioEnabled: false,   // الصوت معطّل افتراضياً
      audioGain: 0.5,
      audioBuffer: null,
    };
    S.bgVidItems.push(item);
    if (typeof markProjectDirty === "function") markProjectDirty();
    // إن لم يكن هناك فيديو نشط، فعّل الأول
    if (!S.bgVid) {
      S.bgVid = vid;
      S.bgVidFile = file;
      S.bgVidActiveIdx = S.bgVidItems.length - 1;
      $("bg-vid-preview").src = url;
      $("bg-vid-thumb").style.display = "block";
      // الفيديو يبقى متوقفاً عند الرفع — يُشغَّل فقط مع ضغط ▶️
      try { vid.pause(); vid.currentTime = 0; } catch (_) {}
    }
    renderBgVidList();
    if (S.bgVidItems.length === 1) {
      toast("🎥 تم رفع المقطع — يمكن إضافة المزيد لتتابع الخلفيات", "success", 3500);
    } else {
      toast(`🎥 أُضيف المقطع (${S.bgVidItems.length} مجموع)`, "success", 2000);
    }
  };
  vid.onerror = () => toast(`❌ فشل تحميل ${file.name}`, "error");
  vid.load();
}

function switchToNextBgVid() {
  if (S.bgVidItems.length < 2) {
    if (S.bgVid) { try { S.bgVid.currentTime = 0; S.bgVid.play().catch(() => {}); } catch (_) {} }
    return;
  }
  const nextIdx = (S.bgVidActiveIdx + 1) % S.bgVidItems.length;
  S.bgVidActiveIdx = nextIdx;
  const active = S.bgVidItems[nextIdx];
  S.bgVid = active.vid;
  S.bgVidFile = active.file;
  // مهم: لا تُعِد currentTime — التالي يلعب فعلاً منذ crossfade
  // (إعادته كانت تسبّب rewind مرئياً بقدر مدة الـ crossfade)
  S.bgVidNext = null;
  S.bgVidFadeProgress = 0;
  if (S.playing || S._exportingV2) {
    try { active.vid.play().catch(() => {}); } catch (_) {}
  }
}

// ── Crossfade سلس قبل انتهاء المقطع الحالي ──────────
//   المدة قابلة للضبط من UI (افتراضي 1 ث) — تطبَّق في المعاينة وتصدير V2
//   easeInOutCubic: ينحني بسلاسة بدلاً من خط مستقيم → انتقال بصري أنعم
function getCrossfadeDur() {
  const ms = parseInt(gv("bg-crossfade-ms") || "1000");
  return Math.max(0, ms) / 1000;
}
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
function updateBgVidCrossfade() {
  if (!S.bgVid || S.bgVidItems.length < 2) {
    S.bgVidNext = null; S.bgVidFadeProgress = 0; return;
  }
  const cur = S.bgVid;
  if (!isFinite(cur.duration) || cur.duration <= 0) return;

  const xf = getCrossfadeDur();
  if (xf <= 0) { S.bgVidNext = null; S.bgVidFadeProgress = 0; return; }

  const trim = (typeof getBgVidTrim === "function") ? getBgVidTrim() : null;
  const endPoint = trim ? trim.end : cur.duration;
  const remaining = endPoint - cur.currentTime;

  if (remaining <= xf && remaining > 0) {
    const nextIdx = (S.bgVidActiveIdx + 1) % S.bgVidItems.length;
    const nextItem = S.bgVidItems[nextIdx];
    if (S.bgVidNext !== nextItem.vid) {
      S.bgVidNext = nextItem.vid;
      try { nextItem.vid.currentTime = 0; nextItem.vid.play().catch(() => {}); } catch (_) {}
    }
    // التقدّم الخطي ثم easing لـ alpha أنعم
    const linear = Math.max(0, Math.min(1, 1 - (remaining / xf)));
    S.bgVidFadeProgress = easeInOutCubic(linear);
  } else {
    S.bgVidNext = null;
    S.bgVidFadeProgress = 0;
  }
}

function removeBgVidItem(idx) {
  if (idx < 0 || idx >= S.bgVidItems.length) return;
  const item = S.bgVidItems[idx];
  try { item.vid.pause(); URL.revokeObjectURL(item.url); } catch (_) {}
  S.bgVidItems.splice(idx, 1);
  // تأثير فوري: فعّل الأول من الترتيب الجديد
  if (S.bgVidItems.length === 0) {
    S.bgVid = null; S.bgVidFile = null;
    const thumb = $("bg-vid-thumb"); if (thumb) thumb.style.display = "none";
    const prev = $("bg-vid-preview"); if (prev) prev.src = "";
  } else {
    activateBgVidByIndex(0, true);
  }
  renderBgVidList();
}

function moveBgVidItem(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= S.bgVidItems.length) return;
  const [moved] = S.bgVidItems.splice(idx, 1);
  S.bgVidItems.splice(newIdx, 0, moved);
  // التأثير فوري: شغّل دائماً المقطع الأول من الترتيب الجديد
  activateBgVidByIndex(0, /*resetTime*/ true);
  renderBgVidList();
}

// ── تفعيل مقطع معين فوراً (يُستخدم بعد إعادة الترتيب أو الحذف) ──
function activateBgVidByIndex(idx, resetTime = true) {
  if (!S.bgVidItems.length) {
    S.bgVid = null; S.bgVidFile = null; S.bgVidActiveIdx = 0;
    const prev = $("bg-vid-preview");
    if (prev) prev.src = "";
    return;
  }
  idx = Math.max(0, Math.min(idx, S.bgVidItems.length - 1));
  // أوقف الحالي
  if (S.bgVid) { try { S.bgVid.pause(); } catch (_) {} }
  const item = S.bgVidItems[idx];
  S.bgVidActiveIdx = idx;
  S.bgVid          = item.vid;
  S.bgVidFile      = item.file;
  // المعاينة المرئية في thumb
  const prev = $("bg-vid-preview");
  if (prev) prev.src = item.url;
  // ابدأ من الصفر أو خذ في الاعتبار التقطيع
  if (resetTime) {
    try {
      const t = getBgVidTrim();
      item.vid.currentTime = t ? t.start : 0;
    } catch (_) {}
  }
  // إن كان المشغّل قيد التشغيل، شغّل المقطع الجديد فوراً
  if (S.playing) { try { item.vid.play().catch(() => {}); } catch (_) {} }
}

function applyBgVidItemAudio(item) {
  if (!item || !item.vid) return;
  item.vid.muted = !item.audioEnabled;
  item.vid.volume = Math.max(0, Math.min(1, item.audioGain));
}

async function toggleBgVidAudio(idx) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioEnabled = !item.audioEnabled;
  applyBgVidItemAudio(item);
  if (item.audioEnabled && !item.audioBuffer) {
    try {
      const ctx = await resumeAudioCtx();
      const ab = await item.file.arrayBuffer();
      item.audioBuffer = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) {
      console.warn("decode bg-vid audio failed:", e);
      toast("⚠️ تعذّر فكّ صوت المقطع — سيعمل في المعاينة فقط", "info", 3500);
    }
  }
  renderBgVidList();
}

function setBgVidVolume(idx, value) {
  const item = S.bgVidItems[idx];
  if (!item) return;
  item.audioGain = Math.max(0, Math.min(1, value / 100));
  applyBgVidItemAudio(item);
}

function renderBgVidList() {
  const el = $("bg-vid-list");
  if (!el) return;
  if (!S.bgVidItems.length) { el.innerHTML = ""; return; }
  el.innerHTML = S.bgVidItems.map((it, i) => {
    const sz = (it.file.size / 1e6).toFixed(1);
    const dur = it.dur ? it.dur.toFixed(1) + "ث" : "—";
    const audioOn = it.audioEnabled;
    const volPct = Math.round((it.audioGain || 0) * 100);
    return `<div class="bgv-item" data-idx="${i}">
      <span class="bgv-idx">${i + 1}</span>
      <span class="bgv-name" title="${escHtml(it.name)}">${escHtml(it.name)}</span>
      <span class="bgv-dur">${dur} · ${sz}MB</span>
      <button data-act="audio" class="${audioOn ? 'on' : ''}" title="${audioOn ? 'كتم صوت المقطع' : 'تفعيل صوت المقطع'}">${audioOn ? '🔊' : '🔇'}</button>
      <input type="range" class="bgv-vol" min="0" max="100" value="${volPct}" data-act="vol" title="مستوى صوت المقطع: ${volPct}%" ${audioOn ? '' : 'style="visibility:hidden"'}>
      <button data-act="up"     ${i === 0 ? "disabled" : ""} title="أعلى">▲</button>
      <button data-act="down"   ${i === S.bgVidItems.length - 1 ? "disabled" : ""} title="أسفل">▼</button>
      <button data-act="remove" title="إزالة">✕</button>
    </div>`;
  }).join("");
  el.querySelectorAll(".bgv-item button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      const act = e.currentTarget.dataset.act;
      if (act === "up")          moveBgVidItem(idx, -1);
      else if (act === "down")   moveBgVidItem(idx, +1);
      else if (act === "remove") removeBgVidItem(idx);
      else if (act === "audio")  toggleBgVidAudio(idx);
    });
  });
  el.querySelectorAll(".bgv-item input.bgv-vol").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.currentTarget.closest(".bgv-item").dataset.idx);
      setBgVidVolume(idx, parseFloat(e.currentTarget.value));
    });
  });
}

function onBgTypeChange() {
  const v = radioVal("bgt");
  $("bg-grad-ctrl").style.display = v === "gradient" ? "block" : "none";
  $("bg-img-ctrl").style.display = v === "image" ? "block" : "none";
  $("bg-vid-ctrl").style.display = v === "video" ? "block" : "none";
}

function onTanimChange() {
  const v = radioVal("tanim");
  const wordCtrl = $("word-mode-ctrl");
  if (wordCtrl) wordCtrl.style.display = (v === "word" || (v === "mix" && S.mixedAnimsOrder.includes("word"))) ? "block" : "none";
  // قد يكون هناك أكثر من لوحة mix-anims-ctrl (في النصوص + FX) — أظهرها كلها
  document.querySelectorAll(".mix-anims-ctrl").forEach(el => {
    el.style.display = v === "mix" ? "block" : "none";
  });
  // مزامنة كل الراديوهات tanim (في القسمَين) مع بعضها
  document.querySelectorAll(`input[name="tanim"]`).forEach(r => { r.checked = (r.value === v); });
}

// ── إدارة وضع "مختلط" ────────────────────────────────
function onMixAnimChange(e) {
  const v = e.target.value;
  const order = S.mixedAnimsOrder;
  if (e.target.checked) {
    if (!order.includes(v)) order.push(v);
  } else {
    const idx = order.indexOf(v);
    if (idx >= 0) order.splice(idx, 1);
  }
  updateMixAnimsUI();
  try { localStorage.setItem("gt_sqrm_mixed_anims", JSON.stringify(order)); } catch (_) {}
  // إن أُلغيت أو فُعِّلت "word" داخل mix، أعد فحص ظهور لوحة word-mode-ctrl
  onTanimChange();
}

function restoreMixedAnimsOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem("gt_sqrm_mixed_anims") || "[]");
    if (Array.isArray(saved)) S.mixedAnimsOrder = saved.filter(v => typeof v === "string");
  } catch (_) {}
  updateMixAnimsUI();
}

function updateMixAnimsUI() {
  const order = S.mixedAnimsOrder;
  document.querySelectorAll(".mix-anim").forEach(cb => {
    const idx = order.indexOf(cb.value);
    cb.checked = idx >= 0;
    const numEl = cb.parentElement.querySelector(".mix-num");
    if (numEl) numEl.textContent = idx >= 0 ? `[${idx + 1}]` : "";
  });
  const labels = { fade:"تلاشي", slide:"انزلاق", zoom:"تكبير", drop:"سقوط", rise:"صعود", blur:"ضبابي", glow:"توهج", word:"كلمة-بكلمة" };
  const text = order.length
    ? "الترتيب: " + order.map((v, i) => `${i+1}. ${labels[v] || v}`).join(" ← ")
    : "— اختر تأثيراً أو أكثر —";
  // قد توجد عدة لوحات mix-anims-summary (في النصوص + FX) — حدّثها كلها
  document.querySelectorAll(".mix-anims-summary").forEach(el => { el.textContent = text; });
}

// إرجاع تأثير الآية الحالية في وضع mix (يدور بترتيب الاختيار)
function getMixedAnimForCurrentAya() {
  const order = S.mixedAnimsOrder;
  if (!order.length) return "fade"; // افتراضي إن لم يُختر شيء
  return order[(S.currentAya || 0) % order.length];
}

// ══════════════════════════════════════════════════════
//  PLAY / PAUSE
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  كتم صوت المعاينة
// ══════════════════════════════════════════════════════
function togglePreviewMute() {
  S.previewMuted = !S.previewMuted;
  _applyPreviewMute();
  const btn = $("mute-preview-btn");
  if (btn) {
    btn.textContent = S.previewMuted ? "🔇" : "🔊";
    btn.title       = S.previewMuted ? "رفع كتم المعاينة" : "كتم صوت المعاينة";
    btn.classList.toggle("btn-muted", S.previewMuted);
  }
  toast(S.previewMuted ? "🔇 الصوت مكتوم" : "🔊 الصوت مفعّل", "info", 1200);
}

function _applyPreviewMute() {
  const muted = S.previewMuted;
  // 1. WebAudio gainNode المعاينة فقط (لا يؤثر على التسجيل)
  if (S.recGainNode && S.audioCtx) {
    S.recGainNode.gain.setTargetAtTime(
      muted ? 0 : gv("rec-vol") / 100, S.audioCtx.currentTime, 0.03);
  }
  // 2. HTMLAudio fallback
  if (S.recAudioEl) S.recAudioEl.muted = muted;
  // 3. صوت الخلفية — عبر bgPreviewGain
  if (S.bgPreviewGain && S.audioCtx) {
    S.bgPreviewGain.gain.setTargetAtTime(
      muted ? 0 : gv("bg-vol") / 100, S.audioCtx.currentTime, 0.03);
  } else if (S.bgAudioEl) {
    S.bgAudioEl.muted = muted;
  }
}

// ══════════════════════════════════════════════════════
//  كتم صوت التصدير (من نافذة التصدير)
// ══════════════════════════════════════════════════════
function toggleExportMute() {
  S.exportMuted = !S.exportMuted;
  _applyExportMute();
  _updateExportMuteBtn();
}

function _applyExportMute() {
  const muted = S.exportMuted;
  const vol   = gv("rec-vol") / 100;
  // نطبق الكتم على previewGain فقط — لا نلمس exportGain
  if (S.exportSources && S.audioCtx) {
    S.exportSources.forEach(({ previewGain }) => {
      if (previewGain) {
        previewGain.gain.setTargetAtTime(muted ? 0 : 1, S.audioCtx.currentTime, 0.03);
      }
    });
  }
  // نطبق الكتم على المعاينة الحالية (إن وجدت) – هذا يؤثر على الصوت المسموع خارج التصدير
  if (S.recGainNode && S.audioCtx) {
    S.recGainNode.gain.setTargetAtTime(muted ? 0 : vol, S.audioCtx.currentTime, 0.03);
  }
  if (S.recAudioEl) S.recAudioEl.muted = muted;
  // صوت الخلفية – نكتّم previewGain الخاص به
  if (S.bgPreviewGain && S.audioCtx) {
    S.bgPreviewGain.gain.setTargetAtTime(muted ? 0 : gv("bg-vol") / 100, S.audioCtx.currentTime, 0.03);
  } else if (S.bgAudioEl) {
    S.bgAudioEl.muted = muted;
  }
}

function _updateExportMuteBtn() {
  const btn  = $("export-mute-btn");
  const hint = $("export-mute-hint");
  if (btn)  {
    btn.textContent = S.exportMuted ? "🔇 رفع الكتم" : "🔊 كتم الصوت";
    btn.classList.toggle("btn-muted", S.exportMuted);
  }
  if (hint) hint.textContent = S.exportMuted
    ? "الصوت مكتوم — اضغط لرفعه"
    : "الصوت مُشغَّل — اضغط لكتمه";
}

// يُستدعى في بداية كل تصدير
function initExportMuteState() {
  // اقرأ الإعداد مباشرة من الـ checkbox وليس من S فقط
  const cbMute = $("mute-on-export");
  S.exportMuted = (cbMute && cbMute.checked) || S.muteOnExport;
  _applyExportMute();
  _updateExportMuteBtn();
}

// يُستدعى عند انتهاء / إلغاء التصدير
function cleanupExportMute() {
  S.exportMuted = false;
  if (S.exportSources && S.audioCtx) {
    S.exportSources.forEach(({ previewGain }) => {
      if (previewGain) {
        try { previewGain.gain.setTargetAtTime(1, S.audioCtx.currentTime, 0.05); } catch(_) {}
      }
    });
  }
  if (S.bgPreviewGain && S.audioCtx) {
    try { S.bgPreviewGain.gain.setTargetAtTime(gv("bg-vol")/100, S.audioCtx.currentTime, 0.05); } catch(_) {}
  }
  if (S.recGainNode && S.audioCtx) {
    try { S.recGainNode.gain.setTargetAtTime(gv("rec-vol")/100, S.audioCtx.currentTime, 0.05); } catch(_) {}
  }
  if (S.bgAudioEl)  S.bgAudioEl.muted  = false;
  if (S.recAudioEl) S.recAudioEl.muted = false;
  _updateExportMuteBtn();
  S.recGainNode = null;
}


function togglePlay() {
  // فيديو الخلفية يتزامن مع بدء/إيقاف التشغيل
  if (!S.playing && S.bgVid) { S.bgVid.play().catch(() => {}); }
  if (S.playing && S.bgVid)  { S.bgVid.pause(); }
  if (S.playing) pausePlayer(); else startPlayer();
}

function startPlayer() {
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!recvidActive && !S.verses.length) { toast("⚠️ لا توجد آيات مُحمَّلة", "error"); return; }
  S.playing = true;
  $("btn-play").textContent = "⏸️";
  resumeAudioCtx().catch(console.warn);
  if (S.bgAudioEl) { S.bgAudioEl.loop = ge("bg-loop"); S.bgAudioEl.play().catch(() => { }); }
  if (S.bgVid) S.bgVid.play().catch(() => {});
  if (recvidActive) { try { S.recVidEl.play().catch(() => {}); } catch (_) {} }
  else playRecitationAudio();
}

function pausePlayer() {
  S.playing = false;
  $("btn-play").textContent = "▶️";
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();
  // v3.2 — أوقف فيديو التلاوة وأعِده إلى البداية
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }
  if (S.bgVid) {
    S.bgVid.pause();
    S.bgVid.currentTime = 0;
  }
}

function prevAya() { if (S.currentAya > 0) { S.currentAya--; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }
function nextAya() { if (S.currentAya < S.verses.length - 1) { S.currentAya++; S.elapsed = 0; updateAyaUI(); if (S.playing) playRecitationAudio(); } }

// v3.3.2 — ↺ زرّ إعادة من البداية — يُعيد كلّ شيء (آيات + صوت + خلفية + recvid)
function restartAll() {
  const recvidActive = ge("recvid-on") && S.recVidEl;
  if (!recvidActive && (!S.verses || !S.verses.length)) {
    toast?.("⚠️ لا توجد آيات للتشغيل", "warn", 1500);
    return;
  }
  const wasPlaying = !!S.playing;
  if (S.playing) { try { togglePlay(); } catch (_) {} }

  S.currentAya = 0;
  S.elapsed = 0;

  // 1) صوت القارئ
  if (S.recAudioEl) { try { S.recAudioEl.pause(); S.recAudioEl.currentTime = 0; } catch (_) {} }
  if (S.recAudioSource) { try { S.recAudioSource.onended = null; S.recAudioSource.stop(); } catch (_) {} S.recAudioSource = null; }
  // 2) صوت الخلفية
  if (S.bgAudioEl) { try { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; } catch (_) {} }
  // 3) فيديو الخلفية
  if (S.bgVid) { try { S.bgVid.pause(); S.bgVid.currentTime = 0; } catch (_) {} }
  // 4) قائمة فيديوهات الخلفية
  if (Array.isArray(S.bgVidItems)) {
    S.bgVidActiveIdx = 0;
    S.bgVidItems.forEach(it => {
      if (it.vid) { try { it.vid.pause(); it.vid.currentTime = 0; } catch (_) {} }
    });
  }
  // 5) فيديو التلاوة الجاهز
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }

  if (typeof updateAyaInfo === "function") updateAyaInfo();
  if (typeof updateAyaUI === "function") updateAyaUI();
  toast?.("↺ إعادة الكلّ من البداية", "info", 1500);

  if (wasPlaying) {
    setTimeout(() => { try { togglePlay(); } catch (_) {} }, 60);
  }
}

function seekClick(e) {
  const bar = $("pbar"), ratio = e.offsetX / bar.offsetWidth;
  const total = S.verses.length * (S.ayaDurations[0] || 6);
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    const d = S.ayaDurations[i] || 6;
    if (acc + d >= ratio * total) { S.currentAya = i; S.elapsed = (ratio * total - acc); break; }
    acc += d;
  }
  updateAyaUI();
  if (S.playing) playRecitationAudio();
}

function updateProgressUI() {
  const totalDur = S.verses.length * (S.ayaDurations[0] || 6) || 1;
  const passed = S.ayaDurations.slice(0, S.currentAya).reduce((a, b) => a + b, 0) + S.elapsed;
  const pct = Math.min(100, (passed / totalDur) * 100);
  $("pfill").style.width = pct + "%";
  $("ptime").textContent = `${fmt(passed)} / ${fmt(totalDur)}`;
}

function updateAyaUI() {
  $("aya-ind").textContent = `الآية ${S.currentAya + 1}/${S.verses.length}`;
}
function fmt(s) { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`; }

// ══════════════════════════════════════════════════════
//  EXPORT
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  إصلاح مدة WebM — MediaRecorder لا يكتب duration
// ══════════════════════════════════════════════════════
async function fixWebmDuration(blob, durationSec) {
  // نستخدم تقنية إعادة التشفير عبر WebAudio + MediaRecorder
  // لكن الأبسط: نضيف duration إلى الـ blob عبر تعديل Matroska header
  // الحل العملي: نُرسل duration للـ video element لإصلاح السيك
  try {
    const url  = URL.createObjectURL(blob);
    const vid  = document.createElement("video");
    vid.preload = "metadata";
    await new Promise((res, rej) => {
      vid.onloadedmetadata = res;
      vid.onerror = rej;
      vid.src = url;
    });
    // إذا كانت المدة Infinity أو 0 — أصلحها
    if (!isFinite(vid.duration) || vid.duration === 0) {
      // اكتب duration في أول سطر من البيانات
      // الأبسط: أعد إنشاء blob بـ Uint8Array محدّث
      // هذا يتطلب muxjs — نُعيد فقط الـ blob كما هو مع تحذير
      URL.revokeObjectURL(url);
      console.warn("WebM duration fix: Infinity detected, duration =", durationSec, "s");
      return blob; // بدون تعديل — الـ desktop يعالجه ffmpeg
    }
    URL.revokeObjectURL(url);
  } catch(_) {}
  return blob;
}


async function startExport(type) {
  if (!S.verses.length) { toast("⚠️ لا توجد آيات", "error"); return; }

  S.exportCancel = false;
  S.exportChunks = [];
  S.exporting = true;
  stopRecitationAudio();
  if (S.bgAudioEl) S.bgAudioEl.pause();
  // إعادة فيديو الخلفية للبداية دائماً عند التصدير
  if (S.bgVid) { S.bgVid.currentTime = 0; S.bgVid.play().catch(() => {}); }

  $("rec-ov").classList.add("on");
  $("rec-fill").style.width = "0%";
  $("rec-pct").textContent = "0%";
  $("rec-sub").textContent = "⏳ جاري تحميل الصوتيات…";

  const ctx = await resumeAudioCtx();
  const manualDur = parseFloat(gv("aya-dur")) || 6;
  const getDur = (i) => (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : manualDur;

  const surahNum = parseInt($("surah-sel").value) || 1;
  const reciter = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const gainVal = gv("rec-vol") / 100;
  // v3.3.1 — تخطّى صوت القارئ للفيديو الجاهز
  const skipReciter = ge("recvid-on") || S.verses.every(v => v?.recvid || v?.free || v?.audio === null);
  let loaded = 0;

  const audioBuffers = await Promise.all(S.verses.map(async (aya, i) => {
    // v3.3.1 — لا تحاول جلب صوت القارئ لشرائح recvid
    if (skipReciter || aya?.recvid || aya?.free || aya?.audio === null) {
      S.ayaDurations[i] = aya?.manualDuration || manualDur;
      loaded++;
      $("rec-sub").textContent = `⏳ تحضير الشرائح… ${loaded}/${S.verses.length}`;
      return null;
    }
    const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ab = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab);
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
      return buf;
    } catch (e1) {
      try {
        const res2 = await fetch(url, { cache: "no-store", mode: "cors" });
        if (!res2.ok) throw new Error("HTTP " + res2.status);
        const ab2 = await res2.arrayBuffer();
        const buf2 = await ctx.decodeAudioData(ab2);
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
        return buf2;
      } catch (e2) {
        try {
          const dur = await new Promise((res, rej) => {
            const a = new Audio();
            a.crossOrigin = "anonymous";
            a.onloadedmetadata = () => res(a.duration);
            a.onerror = () => {
              const a2 = new Audio(url);
              a2.onloadedmetadata = () => res(a2.duration);
              a2.onerror = () => rej(new Error("audio load failed"));
              a2.load();
            };
            a.src = url;
            a.load();
            setTimeout(() => rej(new Error("timeout")), 8000);
          });
          if (dur > 0) S.ayaDurations[i] = dur;
        } catch (_) {}
        loaded++;
        $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length} ⚠️`;
        return null;
      }
    }
  }));

  const loadedCount = audioBuffers.filter(b => b !== null).length;
  if (loadedCount === 0) {
    toast("⚠️ تعذر جلب الصوت عبر fetch — سيتم التصدير بالصوت الأساسي", "info");
  }

  if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }

  audioBuffers.forEach((buf, i) => { if (buf) S.ayaDurations[i] = buf.duration; });

  // فاصل الصمت يُضاف بعد كل آية (يدخل في ayaStarts التراكمية)
  const ayaGap = getAyaGap();
  const ayaStarts = [];
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) {
    ayaStarts.push(acc);
    acc += getDur(i) + ayaGap;
  }
  const totalDuration = acc;
  const FPS = parseInt(gv("export-fps") || "30") || 30;
  const FRAME_MS = 1000 / FPS;
  const totalFrames = Math.ceil(totalDuration * FPS);

  const cv = $("cv");
  const stream = cv.captureStream(FPS);
  const tracks = [...stream.getTracks()];
  if (S.exportDest && S.exportDest.stream.getAudioTracks().length)
    tracks.push(...S.exportDest.stream.getAudioTracks());

  const mime4 = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
  const mime_w = "video/webm;codecs=vp9,opus";
  const mimeT = type === "mp4" ? mime4 : mime_w;
  const mime = MediaRecorder.isTypeSupported(mimeT) ? mimeT : "video/webm";

  const vbrMbps = parseInt(gv("export-vbr") || "8") || 8;
  const mr = new MediaRecorder(new MediaStream(tracks), {
    mimeType: mime, videoBitsPerSecond: vbrMbps * 1_000_000, audioBitsPerSecond: 128_000
  });
  S.mediaRecorder = mr;
  mr.ondataavailable = e => { if (e.data.size > 0) S.exportChunks.push(e.data); };
  mr.onstop = () => {
    stopExportSources();
    if (S.exportCancel) { $("rec-ov").classList.remove("on"); return; }
    const blob = new Blob(S.exportChunks, { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `GT-SQR_${Date.now()}.${type === "mp4" ? "mp4" : "webm"}`;
    a.click();
    $("rec-ov").classList.remove("on");
    cleanupExportMute();
    toast("✅ تم التصدير بنجاح!", "success");
  };

  mr.start(100);

  await new Promise(r => setTimeout(r, 150));
  if (S.exportCancel) { mr.stop(); return; }

  const audioStartTime = ctx.currentTime + 0.05;
  S.exportSources = [];

  const hasBuffers = audioBuffers.some(b => b !== null);

  if (hasBuffers) {
    audioBuffers.forEach((buf, i) => {
      if (!buf) return;
      const gain = ctx.createGain();
      gain.gain.value = gainVal;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);

      // previewGain -> ctx.destination (خاضع للكتم اليدوي)
      const previewGain = ctx.createGain();
      previewGain.gain.value = 1;
      gain.connect(previewGain);
      previewGain.connect(ctx.destination);

      // exportGain -> analyser -> exportDest (لا يُكتم أبداً)
      const exportGain = ctx.createGain();
      exportGain.gain.value = 1;
      gain.connect(exportGain);
      exportGain.connect(S.analyser);

      src.start(audioStartTime + ayaStarts[i]);
      S.exportSources.push({ src, gain, previewGain, exportGain });
    });
    // طبّق حالة الكتم بعد إنشاء المصادر
    initExportMuteState();
  } else {
    console.warn("Export: using HTMLAudioElement fallback (fetch CORS failed)");
    $("rec-sub").textContent = "⚠️ وضع الصوت البديل (CORS) — الجودة ستنخفض قليلاً";

    const playExportAya = (idx) => {
      if (idx >= S.verses.length || S.exportCancel) return;
      const aya2 = S.verses[idx];
      // v3.3.1
      if (aya2?.recvid || aya2?.free || aya2?.audio === null || skipReciter) {
        setTimeout(() => playExportAya(idx + 1), (aya2.manualDuration || manualDur) * 1000);
        return;
      }
      const url2 = buildAudioUrl(reciter.folder, surahNum, aya2.numberInSurah);
      const a2 = new Audio(url2);
      a2.volume = gainVal;
      try {
        const msrc = ctx.createMediaElementSource(a2);
        const gain2 = ctx.createGain();
        gain2.gain.value = gainVal;
        msrc.connect(gain2);
        gain2.connect(ctx.destination);
        gain2.connect(S.analyser);
        S.exportSources.push({ src: { stop: () => { try{a2.pause();}catch(_){} }, onended: null }, gain: gain2 });
      } catch (_) {}
      a2.onended = () => playExportAya(idx + 1);
      a2.play().catch(() => {});
    };
    setTimeout(() => playExportAya(0), 50);
  }

  if (S.bgAudioEl) { S.bgAudioEl.currentTime = 0; S.bgAudioEl.play().catch(() => {}); }

  // v3.3 — V1: شغّل فيديو التلاوة الجاهز من البداية
  if (ge("recvid-on") && S.recVidEl) {
    try { S.recVidEl.currentTime = 0; S.recVidEl.play().catch(() => {}); } catch (_) {}
  }

  const savedAya = S.currentAya;
  const savedElapsed = S.elapsed;
  const savedPlaying = S.playing;
  S.playing = true;

  const getAyaAt = (t) => {
    let idx = S.verses.length - 1;
    for (let i = 0; i < S.verses.length; i++) {
      if (t < ayaStarts[i] + getDur(i) + ayaGap) { idx = i; break; }
    }
    return idx;
  };

  let exportTimer = null;
  let lastDrawnFrame = -1;
  let exportDone = false;

  const doExportFrame = () => {
    if (S.exportCancel || exportDone) return;

    const projectTime = ctx.currentTime - audioStartTime;

    if (projectTime >= totalDuration) {
      exportDone = true;
      if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
      setTimeout(() => { mr.stop(); restoreExportState(); }, 200);
      return;
    }

    const targetFrame = Math.floor(projectTime * FPS);

    if (targetFrame > lastDrawnFrame) {
      const t = targetFrame / FPS;
      const ci = getAyaAt(Math.min(t, totalDuration - 0.001));
      S.currentAya = ci;
      S.elapsed = Math.max(0, t - ayaStarts[ci]);
      drawFrame(t);
      lastDrawnFrame = targetFrame;

      const pct = Math.min(99, Math.round((projectTime / totalDuration) * 100));
      $("rec-fill").style.width = pct + "%";
      $("rec-pct").textContent = pct + "%";
      $("rec-sub").textContent =
      `🎬 ${targetFrame}/${totalFrames} — الآية ${ci + 1}/${S.verses.length} — ${fmt(projectTime)} / ${fmt(totalDuration)}`;
      updateAyaUI();
    }

    const msToNextFrame = Math.max(4, FRAME_MS - ((projectTime * 1000) % FRAME_MS));
    exportTimer = setTimeout(doExportFrame, msToNextFrame);
  };

  const onVisChange = () => {
    if (!document.hidden && !exportDone && !S.exportCancel) {
      if (exportTimer) { clearTimeout(exportTimer); exportTimer = null; }
      doExportFrame();
    }
  };
  document.addEventListener("visibilitychange", onVisChange);

  exportTimer = setTimeout(doExportFrame, 0);

  function restoreExportState() {
    exportDone = true;
    if (exportTimer !== null) { clearTimeout(exportTimer); exportTimer = null; }
    document.removeEventListener("visibilitychange", onVisChange);
    S.exporting = false;
    S.playing = savedPlaying;
    S.currentAya = savedAya;
    S.elapsed = savedElapsed;
    $("rec-ov").classList.remove("on");
    updateAyaUI();
  }
}

function stopExportSources() {
  S.exportSources.forEach(s => {
    try { s.src.onended = null; s.src.stop(0); } catch (_) {}
    try { s.gain.disconnect(); } catch (_) {}
  });
  S.exportSources = [];
  // v3.3 — أوقف فيديو التلاوة
  if (S.recVidEl) { try { S.recVidEl.pause(); S.recVidEl.currentTime = 0; } catch (_) {} }
}

function cancelExport() {
  S.exportCancel = true;
  S.exporting = false;
  // محرك V2: ضع علم الإلغاء واقتل ffmpeg
  if (S.exportCancelRef) S.exportCancelRef.canceled = true;
  try { window.SQRM?.ffmpegPipeCancel?.(); } catch (_) {}
  // المسار القديم (MediaRecorder)
  stopExportSources();
  stopRecitationAudio();
  if (S.bgAudioEl) { S.bgAudioEl.pause(); S.bgAudioEl.currentTime = 0; }
  if (S.mediaRecorder && S.mediaRecorder.state !== "inactive") {
    try { S.mediaRecorder.stop(); } catch (_) {}
  }
  $("rec-ov").classList.remove("on");
  cleanupExportMute();
  toast("تم إلغاء التصدير", "info");
}

// ══════════════════════════════════════════════════════
//  QURAN DATA  (مع تخزين محلي دائم للعمل دون اتصال)
// ══════════════════════════════════════════════════════
//   - قائمة السور:   localStorage["gt_sqrm_surahs_v1"]    (دائمة)
//   - نص القرآن:     localStorage["gt_sqrm_quran_idx_v1"] (يُحمَّل في الخلفية)
//   - الترجمات:      localStorage["gt_sqrm_trans_{ed}_{n}"] (بالطلب)
//   - sessionStorage احتياط رجعي إن فشل localStorage
const SURAHS_KEY = "gt_sqrm_surahs_v1";

async function loadSurahList() {
  const sel = $("surah-sel");
  // 1) جرّب localStorage الدائم
  let surahs = null;
  try {
    const cached = JSON.parse(localStorage.getItem(SURAHS_KEY) || "null");
    if (Array.isArray(cached) && cached.length === 114) surahs = cached;
  } catch (_) {}
  // 2) جرّب sessionStorage (احتياط من نسخة قديمة)
  if (!surahs) {
    try {
      const old = JSON.parse(sessionStorage.getItem("gt_surahs") || "null");
      if (Array.isArray(old) && old.length === 114) {
        surahs = old;
        try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
      }
    } catch (_) {}
  }

  if (surahs) {
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    renderSurahList(surahs);
    await loadVerses();
    return;
  }

  // 3) لا يوجد كاش — حمّل من الـ API
  sel.innerHTML = `<option>⏳ جاري التحميل…</option>`;
  try {
    const r = await fetch(`${QURAN_API}/surah`);
    const d = await r.json();
    surahs = d.data;
    S.surahs = surahs;
    S.filteredSurahs = surahs;
    try { localStorage.setItem(SURAHS_KEY, JSON.stringify(surahs)); } catch (_) {}
    renderSurahList(surahs);
    await loadVerses();
  } catch (e) {
    sel.innerHTML = `<option value="1">1. سورة الفاتحة</option>`;
    loadOfflineFallback();
  }
}

function renderSurahList(surahs) {
  const sel = $("surah-sel");
  if (!sel) return;
  const prevVal = sel.value;
  sel.innerHTML = surahs.map(s => `<option value="${s.number}">${s.number}. ${s.name} — ${s.englishName}</option>`).join("");
  // أعد ضبط القيمة السابقة إن كانت ضمن النتائج
  if (prevVal && surahs.some(s => String(s.number) === prevVal)) {
    sel.value = prevVal;
  }
}

// بحث السورة بالاسم — تطبيع عربي + ENGLISH name + رقم السورة
function filterSurahs(query) {
  if (!S.surahs?.length) return;
  const raw = (query || "").trim();
  let result;
  if (!raw) {
    result = S.surahs;
  } else {
    const nq = normalizeArabic(raw);
    const lq = raw.toLowerCase();
    result = S.surahs.filter(s => {
      const arNorm = normalizeArabic(s.name || "");
      const enLow  = (s.englishName || "").toLowerCase();
      return arNorm.includes(nq)
          || enLow.includes(lq)
          || s.number.toString().includes(raw);
    });
  }
  S.filteredSurahs = result;
  renderSurahList(result);
}

function loadOfflineFallback() {
  S.verses = [
    { numberInSurah: 1, text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 2, text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ" },
    { numberInSurah: 3, text: "الرَّحْمَٰنِ الرَّحِيمِ" },
    { numberInSurah: 4, text: "مَالِكِ يَوْمِ الدِّينِ" },
    { numberInSurah: 5, text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ" },
    { numberInSurah: 6, text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ" },
    { numberInSurah: 7, text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ" },
  ];
  $("aya-info").textContent = "⚠️ وضع غير متصل — سورة الفاتحة";
  updateAyaUI();
}

// ══════════════════════════════════════════════════════
//  بحث الآيات مع تطبيع التشكيل (Desktop / Browser)
// ══════════════════════════════════════════════════════
//  - يتجاهل التشكيل، يوحّد ألف/ياء/تاء مربوطة، يزيل التطويل
//  - يبني فهرساً محلياً مرة واحدة عبر API ثم localStorage

const QURAN_INDEX_KEY = "gt_sqrm_quran_idx_v1";

// تطبيع نص عربي للمقارنة (يحذف التشكيل ويوحّد الأحرف الشائعة)
function normalizeArabic(s) {
  if (!s) return "";
  return s
    // تشكيل + ألف خنجرية + شدّة + سكون إلخ
    .replace(/[ً-ْٰٓ-ٟ]/g, "")
    // توحيد ألف
    .replace(/[إأآٱا]/g, "ا")
    // ألف مقصورة → ياء
    .replace(/ى/g, "ي")
    // تاء مربوطة → هاء
    .replace(/ة/g, "ه")
    // إزالة التطويل
    .replace(/ـ/g, "")
    // إزالة الهمزة المنفردة
    .replace(/ء/g, "")
    // ضغط الفراغات
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// نفس التطبيع مع الاحتفاظ بخريطة موقع كل حرف (norm idx → original idx)
function normalizeWithMap(s) {
  if (!s) return { norm: "", map: [] };
  let out = "";
  const map = [];
  let lastSpace = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    // skipped characters
    if (/[ً-ْٰٓ-ٟـء]/.test(c)) continue;
    let r;
    if (/[إأآٱا]/.test(c)) r = "ا";
    else if (c === "ى") r = "ي";
    else if (c === "ة") r = "ه";
    else if (/\s/.test(c)) {
      if (lastSpace) continue;
      r = " ";
    } else {
      r = c.toLowerCase();
    }
    out += r;
    map.push(i);
    lastSpace = (r === " ");
  }
  return { norm: out, map };
}

let _quranIdx = null;
let _quranIdxLoading = null;

async function loadQuranIndex() {
  if (_quranIdx) return _quranIdx;
  if (_quranIdxLoading) return _quranIdxLoading;

  _quranIdxLoading = (async () => {
    // 1) ذاكرة localStorage
    try {
      const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
      if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
        _quranIdx = cached;
        return cached;
      }
    } catch (_) {}

    // 2) جلب من API
    const r = await fetch(`${QURAN_API}/quran/quran-uthmani`);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const sd = d.data?.surahs || [];
    const verses = [];
    for (const s of sd) {
      for (const a of s.ayahs) {
        verses.push({
          s:  s.number,
          sn: s.name,
          a:  a.numberInSurah,
          t:  a.text,
          n:  normalizeArabic(a.text),
        });
      }
    }
    const out = { v: 1, verses };
    try { localStorage.setItem(QURAN_INDEX_KEY, JSON.stringify(out)); } catch (_) {}
    _quranIdx = out;
    return out;
  })();

  return _quranIdxLoading;
}

// تحميل الفهرس في خلفية بدء التطبيق (best-effort)
function preloadQuranIndex() {
  // إن كان في localStorage مسبقاً: تحميل فوري ومتزامن مع الواجهة
  try {
    const cached = JSON.parse(localStorage.getItem(QURAN_INDEX_KEY) || "null");
    if (cached && cached.v === 1 && Array.isArray(cached.verses) && cached.verses.length > 6000) {
      _quranIdx = cached;
      console.log(`[Quran] Index ready from cache: ${cached.verses.length} verses`);
      // إعادة تحميل الآيات الحالية بعد جاهزية الفهرس (إن لم تكن أُحمِّلت بعد)
      if (!S.verses.length || S.verses.length < 1) loadVerses();
      return;
    }
  } catch (_) {}

  // وإلا حمّل من API في الخلفية
  loadQuranIndex()
    .then(idx => {
      console.log(`[Quran] Index downloaded: ${idx.verses.length} verses, cached for offline`);
      toast("📚 تم تحميل القرآن كاملاً للعمل دون اتصال", "success", 3500);
    })
    .catch(err => console.warn("[Quran] Index preload failed:", err));
}

function searchVerses(query, limit = 80) {
  if (!_quranIdx) return [];
  const nq = normalizeArabic(query);
  if (!nq) return [];
  const out = [];
  for (const v of _quranIdx.verses) {
    const idx = v.n.indexOf(nq);
    if (idx >= 0) {
      out.push({ s: v.s, sn: v.sn, a: v.a, t: v.t, matchIdx: idx, matchLen: nq.length });
      if (out.length >= limit) break;
    }
  }
  return out;
}

// تظليل النص الأصلي حول الكلمة المُطابِقَة (يستخدم خريطة التطبيع)
function highlightVerseMatch(text, matchIdx, matchLen) {
  const { map } = normalizeWithMap(text);
  if (matchIdx < 0 || matchIdx >= map.length) return escHtml(text);
  const start = map[matchIdx];
  const end   = matchIdx + matchLen - 1 < map.length ? (map[matchIdx + matchLen - 1] + 1) : text.length;
  return escHtml(text.slice(0, start))
       + "<mark>" + escHtml(text.slice(start, end)) + "</mark>"
       + escHtml(text.slice(end));
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

// ── واجهة البحث ─────────────────────────────────────────
async function onVerseSearchInput(e) {
  const q = e.target.value || "";
  const resultsEl = $("verse-search-results");
  const clearBtn  = $("verse-search-clear-btn");
  if (clearBtn) clearBtn.style.display = q ? "" : "none";
  if (!q.trim()) {
    if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
    return;
  }

  // أظهر مؤشر تحميل عند أول بحث (تحميل الفهرس)
  if (!_quranIdx) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-loading">⏳ تحميل فهرس القرآن (مرّة واحدة فقط)…</div>`;
    try {
      await loadQuranIndex();
    } catch (err) {
      resultsEl.innerHTML = `<div class="vs-empty">❌ فشل تحميل الفهرس: ${escHtml(err.message)}</div>`;
      return;
    }
  }

  const results = searchVerses(q);
  if (!results.length) {
    resultsEl.style.display = "block";
    resultsEl.innerHTML = `<div class="vs-empty">لا توجد نتائج تطابق "${escHtml(q)}"</div>`;
    return;
  }

  resultsEl.style.display = "block";
  resultsEl.innerHTML = results.map(r =>
    `<div class="vs-item" data-s="${r.s}" data-a="${r.a}">
       <div class="vs-head"><span>${escHtml(r.sn)} • آية ${r.a}</span><span>📖 ${r.s}:${r.a}</span></div>
       <div class="vs-text">${highlightVerseMatch(r.t, r.matchIdx, r.matchLen)}</div>
     </div>`
  ).join("");

  resultsEl.querySelectorAll(".vs-item").forEach(it => {
    it.addEventListener("click", () => {
      const s = parseInt(it.dataset.s);
      const a = parseInt(it.dataset.a);
      jumpToVerse(s, a);
    });
  });
}

async function jumpToVerse(surahNum, ayaNum) {
  const sel = $("surah-sel");
  if (sel) sel.value = surahNum;
  // اضبط مدى الآيات على الآية المختارة (وثلاث بعدها كحدّ معقول)
  const fromEl = $("from-aya"), toEl = $("to-aya");
  if (fromEl) fromEl.value = ayaNum;
  if (toEl) {
    const cur = S.surahs.find(s => s.number === surahNum);
    const max = cur?.numberOfAyahs || ayaNum;
    toEl.value = Math.min(max, ayaNum + 2);
  }
  // اخفِ نتائج البحث وامسح الحقل
  const resultsEl = $("verse-search-results");
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  const inp = $("verse-search-inp");
  if (inp) inp.value = "";
  const clr = $("verse-search-clear-btn");
  if (clr) clr.style.display = "none";
  // حمّل الآيات
  await loadVerses();
  toast(`📖 الانتقال إلى ${ayaNum}:${surahNum}`, "success", 1800);
}

function clearVerseSearch() {
  const inp = $("verse-search-inp");
  const resultsEl = $("verse-search-results");
  const clr = $("verse-search-clear-btn");
  if (inp) inp.value = "";
  if (resultsEl) { resultsEl.style.display = "none"; resultsEl.innerHTML = ""; }
  if (clr) clr.style.display = "none";
}

function onSurahChange() { loadVerses(); }
async function loadVerses() {
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  const surah = S.surahs.find(s => s.number === surahNum);
  if (surah) { const max = surah.numberOfAyahs; if (to > max) $("to-aya").value = max; }
  $("aya-info").textContent = "⏳ جاري تحميل الآيات…";

  let verses = null;
  let source = "";

  // 1) جرّب فهرس القرآن المحلي الكامل (الأسرع — يعمل دون اتصال)
  if (_quranIdx?.verses?.length) {
    const matched = _quranIdx.verses
      .filter(v => v.s === surahNum && v.a >= from && v.a <= to)
      .map(v => ({ numberInSurah: v.a, text: v.t }));
    if (matched.length) { verses = matched; source = "📚 محلي"; }
  }

  // 2) جرّب sessionStorage (كاش جلسة سابقة)
  if (!verses) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(`gt_v_${surahNum}_${from}_${to}`) || "null");
      if (Array.isArray(cached) && cached.length) { verses = cached; source = "🗂 جلسة"; }
    } catch (_) {}
  }

  // 3) آخر حل: API الخارجي
  if (!verses) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/quran-uthmani`);
      const d = await r.json();
      verses = d.data.ayahs.filter(a => a.numberInSurah >= from && a.numberInSurah <= to)
                            .map(a => ({ numberInSurah: a.numberInSurah, text: a.text }));
      try { sessionStorage.setItem(`gt_v_${surahNum}_${from}_${to}`, JSON.stringify(verses)); } catch (_) {}
      source = "🌐 شبكة";
    } catch (e) {
      $("aya-info").textContent = "⚠️ فشل التحميل (لا توجد بيانات محلية أو اتصال)";
      if (!S.verses.length) loadOfflineFallback();
      return;
    }
  }

  S.verses = verses; S.currentAya = 0; S.elapsed = 0; S.ayaDurations = [];
  $("aya-info").textContent = `✅ ${verses.length} آية من سورة ${surah?.name || ""} ${source}`;
  updateAyaUI();
  await loadTranslations();
}

function onTransChange() {
  const v = $("trans-sel").value;
  $("trans-opts").style.display = v === "none" ? "none" : "block";
  loadTranslations();
}
async function loadTranslations() {
  const edition = $("trans-sel").value; if (edition === "none") { S.translations = []; return; }
  const surahNum = parseInt($("surah-sel").value) || 1;
  const from = parseInt($("from-aya").value) || 1;
  const to = parseInt($("to-aya").value) || 7;
  // كاش لكل (سورة، نسخة) في localStorage — يبقى بين الجلسات
  const persistKey = `gt_sqrm_trans_${edition}_${surahNum}`;
  let allAyahs = null;

  // 1) localStorage الدائم
  try {
    const cached = JSON.parse(localStorage.getItem(persistKey) || "null");
    if (Array.isArray(cached) && cached.length) allAyahs = cached;
  } catch (_) {}

  // 2) آخر حل: API
  if (!allAyahs) {
    try {
      const r = await fetch(`${QURAN_API}/surah/${surahNum}/${edition}`);
      const d = await r.json();
      allAyahs = d.data.ayahs.map(a => ({ n: a.numberInSurah, t: a.text }));
      try { localStorage.setItem(persistKey, JSON.stringify(allAyahs)); } catch (_) {}
    } catch (e) { S.translations = []; return; }
  }

  S.translations = allAyahs
    .filter(a => a.n >= from && a.n <= to)
    .map(a => a.t);
}

// ══════════════════════════════════════════════════════
//  FONTS
// ══════════════════════════════════════════════════════
function renderFontGrid() {
  const grid = $("font-grid"); grid.innerHTML = "";
  S.allFonts.forEach((f, i) => {
    const div = document.createElement("div"); div.className = "font-card";
    div.innerHTML = `<input type="radio" name="font" id="fn${i}" value="${f.css}" ${i === 0 ? "checked" : ""}>
    <label for="fn${i}"><span class="fs" style="font-family:${f.css}">${f.sample || "بِسْمِ اللَّهِ"}</span><span class="fn">${f.name}</span></label>`;
    grid.appendChild(div);
  });
}

async function loadLocalFonts(showToast = false) {
  try {
    const r = await fetch("fonts/fonts.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const list = await r.json();
    if (!Array.isArray(list)) return;
    let added = 0;
    let reloaded = 0;
    for (const item of list) {
      if (!item.name || !item.file) continue;
      try {
        let rawFile = item.file;
        try { rawFile = decodeURIComponent(rawFile); } catch(_) {}
        const fontUrl = `fonts/${rawFile.split('/').map(encodeURIComponent).join('/')}`;
        // حمّل ملف الخط دائماً (FontFace) حتى لو الاسم موجود في BUILT_IN_FONTS
        // — كان الـ skip السابق يمنع تسجيل ملف الخط الفعلي وتظهر الخطوط فارغة
        const face = new FontFace(item.name, `url(${fontUrl})`);
        await face.load();
        document.fonts.add(face);
        // أضف لقائمة الواجهة فقط إن لم يكن موجوداً
        if (!S.allFonts.find(x => x.name === item.name)) {
          S.allFonts.push({
            id: "local_" + item.name,
            name: item.name,
            css: `'${item.name}'`,
            sample: item.sample || "بِسْمِ اللَّهِ"
          });
          added++;
        } else {
          reloaded++;
        }
      } catch (e) {
        console.warn("Font load failed:", item.name, e);
      }
    }
    renderFontGrid();
    const total = added + reloaded;
    if (showToast) toast(total > 0 ? `✅ ${added} خط جديد + ${reloaded} مُعاد ربطها` : "لا توجد خطوط في fonts/", "info");
  } catch (e) {
    console.warn("fonts.json error:", e);
    if (showToast) toast("📁 تأكد من وجود ملف fonts/fonts.json", "info");
  }
}

function loadCustomFonts(input) {
  Array.from(input.files).forEach(file => {
    const name = file.name.replace(/\.[^.]+$/, "");
    const reader = new FileReader();
    reader.onload = e => {
      const face = new FontFace(name, e.target.result);
      face.load().then(ff => {
        document.fonts.add(ff);
        if (!S.allFonts.find(x => x.name === name)) {
          S.allFonts.push({ id: "custom_" + name, name, css: `'${name}'`, sample: "بِسْمِ اللَّهِ" });
          renderFontGrid();
        }
        toast(`✅ خط: ${name}`, "success");
      }).catch(() => toast(`❌ فشل: ${file.name}`, "error"));
    };
    reader.readAsArrayBuffer(file);
  });
}

// ══════════════════════════════════════════════════════
//  RECITERS
// ══════════════════════════════════════════════════════
function renderReciters() {
  const grid = $("reciters-grid");
  grid.innerHTML = "";
  S.reciters.forEach((r, i) => {
    const div = document.createElement("div");
    div.className = "rctr-card";
    div.innerHTML = `
    <input type="radio" name="reciter" id="rc${i}" value="${r.id}" ${i === 0 ? "checked" : ""}>
    <label for="rc${i}">
    <span class="rf">${r.flag}</span>${r.name}
    <span class="edit-reciter" data-id="${r.id}" data-name="${r.name}" data-flag="${r.flag}" data-folder="${r.folder}">✏️</span>
    <span class="del-reciter" data-id="${r.id}">🗑️</span>
    </label>
    `;
    grid.appendChild(div);
  });
  document.querySelectorAll(".del-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      deleteReciter(btn.dataset.id);
    });
  });
  document.querySelectorAll(".edit-reciter").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      openEditReciterForm(btn.dataset);
    });
  });
}

function deleteReciter(id) {
  if (S.reciters.length <= 1) {
    toast("⚠️ لا يمكن حذف آخر قارئ", "error");
    return;
  }
  S.reciters = S.reciters.filter(r => r.id !== id);
  renderReciters();
  saveReciters();
  toast("🗑️ تم حذف القارئ", "info");
}

function openEditReciterForm(data) {
  $("ar-name").value = data.name;
  const flagSelect = $("ar-flag");
  for (let opt of flagSelect.options) if (opt.value === data.flag) { opt.selected = true; break; }
  $("ar-folder").value = data.folder;
  $("add-reciter-form").classList.add("on");
  $("add-reciter-form").dataset.editId = data.id;
}

function addCustomReciter() {
  const name = $("ar-name").value.trim();
  const flag = $("ar-flag").value;
  const folder = $("ar-folder").value.trim();
  if (!name || !folder) { toast("⚠️ أدخل الاسم والمجلد", "error"); return; }
  const editId = $("add-reciter-form").dataset.editId;
  if (editId) {
    const index = S.reciters.findIndex(r => r.id === editId);
    if (index !== -1) S.reciters[index] = { ...S.reciters[index], name, flag, folder };
    delete $("add-reciter-form").dataset.editId;
    toast(`✅ تم تحديث: ${name}`, "success");
  } else {
    const id = "custom_" + Date.now();
    S.reciters.push({ id, name, flag, folder });
    toast(`✅ تمت إضافة: ${name}`, "success");
  }
  renderReciters();
  saveReciters();
  $("add-reciter-form").classList.remove("on");
  $("ar-name").value = ""; $("ar-folder").value = "";
}

function toggleAddReciter() {
  const f = $("add-reciter-form");
  f.classList.toggle("on");
  if (f.classList.contains("on")) {
    delete f.dataset.editId;
    $("ar-name").value = ""; $("ar-folder").value = "";
  }
}

// ══════════════════════════════════════════════════════
//  THEMES
// ══════════════════════════════════════════════════════
const THEME_LABELS = { emerald: "💚 زمرد", gold: "👑 ذهبي", night: "🌌 ليلي", rose: "🌸 وردي", ocean: "🌊 محيط", desert: "🏜️ صحراء", purple: "🔮 بنفسجي", dark: "⚫ أسود" };

function initThemeChips() {
  const wrap = $("theme-chips");
  Object.keys(THEMES).forEach((k, i) => {
    const d = document.createElement("div"); d.className = "tc-chip" + (i === 0 ? " on" : ""); d.dataset.t = k;
    d.textContent = THEME_LABELS[k] || k;
    d.onclick = () => applyTheme(d, k);
    wrap.appendChild(d);
  });
}

function applyTheme(el, key) {
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.remove("on")); el.classList.add("on");
  const t = THEMES[key];
  setCol("gc1", t.gc1); setCol("gc2", t.gc2);
  setCol("txt-col", t.tc); setCol("orn-col", t.oc);
  if ($("gc1t")) $("gc1t").value = t.gc1;
  if ($("gc2t")) $("gc2t").value = t.gc2;
}

// ══════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════
function openModal(id) { $(id).classList.add("on"); }
function closeModal(id) { $(id).classList.remove("on"); }

function confirmSaveTemplate() {
  const name = $("tpl-name-inp").value.trim() || "قالب " + new Date().toLocaleDateString("ar");
  S.templates.push({ name, date: new Date().toLocaleDateString("ar-SA"), state: captureState() });
  persistTemplates(); renderTemplates();
  closeModal("tpl-modal"); $("tpl-name-inp").value = "";
  toast(`✅ تم حفظ: ${name}`, "success");
}

function captureState() {
  return {
    surah: $("surah-sel").value, from: $("from-aya").value, to: $("to-aya").value,
    reciter: radioVal("reciter"), fmt: radioVal("fmt"),
    gc1: $("gc1").value, gc2: $("gc2").value,
    font: radioVal("font"), txtCol: $("txt-col").value,
    wm: $("wm-text").value, orn: radioVal("orn"),
    fxVig: ge("fx-vig"), fxGold: ge("fx-gold"), fxStars: ge("fx-stars"),
    theme: document.querySelector(".tc-chip.on")?.dataset?.t || "emerald",
  };
}

function applyState(st) {
  setV("surah-sel", st.surah); setV("from-aya", st.from); setV("to-aya", st.to);
  setR("reciter", st.reciter); setR("fmt", st.fmt); setR("orn", st.orn);
  setCol("gc1", st.gc1); setCol("gc2", st.gc2);
  if ($("gc1t")) $("gc1t").value = st.gc1 || ""; if ($("gc2t")) $("gc2t").value = st.gc2 || "";
  setCol("txt-col", st.txtCol);
  if ($("wm-text")) $("wm-text").value = st.wm || "";
  if (st.fxVig) ge_el("fx-vig").checked = true;
  if (st.fxGold) ge_el("fx-gold").checked = true;
  if (st.fxStars) ge_el("fx-stars").checked = true;
  document.querySelectorAll(".tc-chip").forEach(c => c.classList.toggle("on", c.dataset.t === st.theme));
  loadVerses(); onFmtChange();
}

function renderTemplates() {
  const grid = $("tpl-grid"), emp = $("tpl-empty");
  if (!S.templates.length) { grid.innerHTML = ""; emp.style.display = "block"; return; }
  emp.style.display = "none";
  grid.innerHTML = S.templates.map((t, i) => `
  <div class="tpl-card">
  <div class="tpl-name">📁 ${t.name}</div>
  <div class="tpl-date">${t.date}</div>
  <div class="tpl-actions">
  <button class="btn btn-p bsm" onclick="applyState(S.templates[${i}].state);goTab('rec')">✅ تطبيق</button>
  <button class="btn btn-d bsm" onclick="delTemplate(${i})">🗑️</button>
  </div>
  </div>`).join("");
}

function delTemplate(i) { S.templates.splice(i, 1); persistTemplates(); renderTemplates(); toast("🗑️ تم الحذف", "info"); }
function loadTemplates() { try { S.templates = JSON.parse(localStorage.getItem("gt_sqrm_tpls") || "[]"); } catch (e) { S.templates = []; } renderTemplates(); }
function persistTemplates() { try { localStorage.setItem("gt_sqrm_tpls", JSON.stringify(S.templates)); } catch (e) { } }

// ══════════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      goTab(btn.dataset.tab);
      if (window.innerWidth <= 760) openMobilePanel();
    });
  });
}
function goTab(name) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".tp").forEach(p => p.classList.toggle("on", p.id === "tab-" + name));
}

// ── MOBILE PANEL ────────────────────────────────────
let _mobLayout = localStorage.getItem("mob_layout") || "vert";
let _panelSize = parseInt(localStorage.getItem("panel_size") || "62");

function initMobileLayout() {
  if (window.innerWidth > 760) return;
  setMobLayout(_mobLayout, false);
  applyPanelSize(_panelSize);
  const sl = $("panel-size-slider");
  const lb = $("panel-size-lbl");
  if (sl) sl.value = _panelSize;
  if (lb) lb.textContent = _panelSize + "٪";
}

function setMobLayout(mode, save = true) {
  _mobLayout = mode;
  if (save) localStorage.setItem("mob_layout", mode);
  document.body.classList.remove("mob-horiz");
  ["lay-vert","lay-horiz","lay-full"].forEach(id => {
    const btn = $(id); if (btn) btn.classList.remove("on");
  });
  if (mode === "horiz") {
    document.body.classList.add("mob-horiz");
    const btn = $("lay-horiz"); if (btn) btn.classList.add("on");
  } else if (mode === "full") {
    applyPanelSize(90);
    const btn = $("lay-full"); if (btn) btn.classList.add("on");
    openMobilePanel();
    return;
  } else {
    const btn = $("lay-vert"); if (btn) btn.classList.add("on");
  }
  applyPanelSize(_panelSize);
}

function applyPanelSize(pct) {
  const isHoriz = document.body.classList.contains("mob-horiz");
  if (isHoriz) {
    document.documentElement.style.setProperty("--panel-w", pct + "vw");
  } else {
    document.documentElement.style.setProperty("--panel-h", pct + "vh");
  }
}

function onPanelSizeChange(val) {
  _panelSize = parseInt(val);
  localStorage.setItem("panel_size", _panelSize);
  const lb = $("panel-size-lbl");
  if (lb) lb.textContent = _panelSize + "٪";
  applyPanelSize(_panelSize);
}

function toggleMobilePanel() {
  const panel = $("panel");
  if (panel.classList.contains("mob-open")) closeMobilePanel();
  else openMobilePanel();
}
function openMobilePanel() {
  $("panel").classList.add("mob-open");
  $("mob-backdrop").classList.add("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "✕ إغلاق"; t.classList.add("active"); }
}
function closeMobilePanel() {
  $("panel").classList.remove("mob-open");
  $("mob-backdrop").classList.remove("on");
  const t = $("mob-toggle");
  if (t) { t.textContent = "🛠 الأدوات"; t.classList.remove("active"); }
}

function initPanelSwipe(e) {
  const startY = e.touches[0].clientY;
  const panel = $("panel");
  let diff = 0;
  const onMove = ev => {
    diff = ev.touches[0].clientY - startY;
    if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
  };
  const onEnd = () => {
    panel.style.transform = "";
    if (diff > 70) closeMobilePanel();
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
  };
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", onEnd);
}

// ══════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  محرك حفظ الإعدادات الشامل
//  يحفظ ويستعيد جميع عناصر الإدخال تلقائياً
// ══════════════════════════════════════════════════════

const SETTINGS_KEY   = "gt_sqrm_settings_v2";
const RECITERS_KEY   = "gt_sqrm_reciters_v2";

// العناصر التي لا يجب حفظها (مؤقتة أو وظيفية)
const SETTINGS_SKIP = new Set([
  "tpl-name-inp","surah-sel","from-aya","to-aya",
  "verse-search-inp","surah-search","preset-sel",
  "bg-img-input","bg-vid-input","ytdlp-url","custom-fonts-input",
  "bg-audio-input","ar-name","ar-flag","ar-folder",
  "dl-start-m","dl-start-s","dl-end-m","dl-end-s",
  "dl-save-path",
  "batch-surah","batch-from","batch-to",
  "batch-surah-modal","batch-from-modal","batch-to-modal",
  "f1","f2","f3","panel-size-slider"
]);

function saveAllSettings() {
  const saved = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (!el.id || SETTINGS_SKIP.has(el.id)) return;
    if (el.type === "checkbox") saved[el.id] = el.checked;
    else if (el.type === "radio") { if (el.checked) saved["__radio_" + el.name] = el.value; }
    else saved[el.id] = el.value;
  });
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(saved)); } catch(e) {}
}

function restoreAllSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); } catch(e) {}
  if (!Object.keys(saved).length) return;

  Object.entries(saved).forEach(([key, val]) => {
    if (key.startsWith("__radio_")) {
      const name = key.replace("__radio_", "");
      const radio = document.querySelector(`input[name="${name}"][value="${val}"]`);
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change")); }
    } else {
      const el = $(key);
      if (!el) return;
      // تجاهل input[type=file] — المتصفح يمنع تعيين قيمته برمجياً
      if (el.type === "file") return;
      if (el.type === "checkbox") {
        el.checked = !!val;
        el.dispatchEvent(new Event("change"));
      } else {
        el.value = val;
        el.dispatchEvent(new Event("input"));
        el.dispatchEvent(new Event("change"));
      }
    }
  });
}

function saveReciters() {
  try { localStorage.setItem(RECITERS_KEY, JSON.stringify(S.reciters)); } catch(e) {}
}

function restoreReciters() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECITERS_KEY) || "null");
    if (saved && Array.isArray(saved) && saved.length > 0) {
      S.reciters = saved;
      renderReciters();
    }
  } catch(e) {}
}

// ربط الحفظ التلقائي بكل تغيير
function initAutoSave() {
  const debouncedSave = debounce(saveAllSettings, 500);
  document.addEventListener("input",  debouncedSave, true);
  document.addEventListener("change", debouncedSave, true);
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ════════════════════════════════════════════════════════════════════
//  نظام حفظ الإعدادات (localStorage)
//  يحفظ: كل المفاتيح ذات id + radio groups + القراء المخصصون
// ════════════════════════════════════════════════════════════════════


function resetAllSettings() {
  if (!confirm("⚠️ سيتم إعادة جميع الإعدادات للافتراضي — هل تريد المتابعة؟")) return;
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(RECITERS_KEY);
  // امسح كاش القرآن والترجمات لإجبار التحميل المُحدَّث
  localStorage.removeItem(QURAN_INDEX_KEY);
  localStorage.removeItem(SURAHS_KEY);
  // ترجمات: مفاتيح متعددة، نمسح كل ما يبدأ بـ gt_sqrm_trans_
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("gt_sqrm_trans_")) localStorage.removeItem(k);
    }
  } catch (_) {}
  location.reload();
}

// ══════════════════════════════════════════════════════
//  SYSTEM FONTS
// ══════════════════════════════════════════════════════
async function loadSystemFonts() {
  if (!IS_DESKTOP) return;
  const ARABIC_FONT_CANDIDATES = [
    { name: "Noto Kufi Arabic",   css: "'Noto Kufi Arabic'",   sample: "بِسْمِ اللَّهِ" },
    { name: "Noto Naskh Arabic",  css: "'Noto Naskh Arabic'",  sample: "بِسْمِ اللَّهِ" },
    { name: "Amiri",              css: "'Amiri'",               sample: "بِسْمِ اللَّهِ" },
    { name: "Lateef",             css: "'Lateef'",              sample: "بِسْمِ اللَّهِ" },
    { name: "Scheherazade New",   css: "'Scheherazade New'",    sample: "بِسْمِ اللَّهِ" },
    { name: "Harmattan",          css: "'Harmattan'",           sample: "بِسْمِ اللَّهِ" },
    { name: "Reem Kufi",          css: "'Reem Kufi'",           sample: "بِسْمِ اللَّهِ" },
    { name: "Cairo",              css: "'Cairo'",               sample: "بِسْمِ اللَّهِ" },
    { name: "Tajawal",            css: "'Tajawal'",             sample: "بِسْمِ اللَّهِ" },
    { name: "Almarai",            css: "'Almarai'",             sample: "بِسْمِ اللَّهِ" },
    { name: "IBM Plex Arabic",    css: "'IBM Plex Arabic'",     sample: "بِسْمِ اللَّهِ" },
    { name: "Markazi Text",       css: "'Markazi Text'",        sample: "بِسْمِ اللَّهِ" },
    { name: "Aref Ruqaa",         css: "'Aref Ruqaa'",          sample: "بِسْمِ اللَّهِ" },
    { name: "Mirza",              css: "'Mirza'",               sample: "بِسْمِ اللَّهِ" },
    { name: "Jomhuria",           css: "'Jomhuria'",            sample: "بِسْمِ اللَّهِ" },
  ];
  let found = 0;
  for (const f of ARABIC_FONT_CANDIDATES) {
    const alreadyInList = S.allFonts.some(af => af.name === f.name);
    if (alreadyInList) continue;
    try {
      await document.fonts.load(`16px ${f.css}`);
      const available = document.fonts.check(`16px ${f.css}`);
      if (available) {
        const id = "sys_" + f.name.replace(/\s+/g, "_").toLowerCase();
        S.allFonts.push({ id, name: f.name + " (نظام)", css: f.css, sample: f.sample });
        found++;
      }
    } catch (_) {}
  }
  if (found > 0) {
    renderFontGrid();
    toast(`✅ تم اكتشاف ${found} خطوط من النظام`, "success");
    console.log(`[SQRM] System fonts: ${found} found`);
  }
}

// ══════════════════════════════════════════════════════
//  YT-DLP
// ══════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════
//  دوال التقطيع الزمني
// ══════════════════════════════════════════════════════
function trimStep(field, delta) {
  const maxVal = field.endsWith('-s') ? 59 : 99;
  const inp    = $("dl-" + field);
  if (!inp) return;
  let val = parseInt(inp.value) + delta;
  if (val < 0) val = 0;
  if (val > maxVal) val = maxVal;
  inp.value = val;
  updateTrimPreview();
}

function updateTrimPreview() {
  const sm = parseInt($("dl-start-m")?.value || 0);
  const ss = parseInt($("dl-start-s")?.value || 0);
  const em = parseInt($("dl-end-m")?.value   || 0);
  const es = parseInt($("dl-end-s")?.value   || 0);
  const fmt = (m, s) => `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  const el  = $("dl-trim-preview");
  if (el) el.textContent = `من ${fmt(sm,ss)} إلى ${fmt(em,es)} · مدة: ${fmt(em*60+es-sm*60-ss<0?0:0, Math.max(0,em*60+es-sm*60-ss)%60)} …`;
  // تبسيط:
  const totalSec = Math.max(0, (em * 60 + es) - (sm * 60 + ss));
  const durM = Math.floor(totalSec / 60);
  const durS = totalSec % 60;
  if (el) el.textContent = `من ${fmt(sm,ss)} إلى ${fmt(em,es)}  ·  مدة: ${fmt(durM,durS)}`;
}

function getTrimTimes() {
  const useTrim = ge("dl-use-trim");
  if (!useTrim) return { startTime: "", endTime: "" };
  const sm = parseInt($("dl-start-m")?.value || 0);
  const ss = parseInt($("dl-start-s")?.value || 0);
  const em = parseInt($("dl-end-m")?.value   || 0);
  const es = parseInt($("dl-end-s")?.value   || 0);
  const fmt = (m, s) => `00:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return { startTime: fmt(sm, ss), endTime: fmt(em, es) };
}

// ══════════════════════════════════════════════════════
//  تبديل أداة التحميل
// ══════════════════════════════════════════════════════
function initDlToolSwitch() {
  document.querySelectorAll('input[name="dl-tool"]').forEach(r => {
    r.addEventListener("change", updateDlToolUI);
  });

  // ── ربط أزرار الأسهم (data-field / data-delta) ──────
  document.querySelectorAll(".trim-arrow[data-field]").forEach(btn => {
    btn.addEventListener("click", () => {
      const field = btn.dataset.field;
      const delta = parseInt(btn.dataset.delta);
      trimStep(field, delta);
    });
    // منع نقل التركيز عن الـ input عند النقر على السهم
    btn.addEventListener("mousedown", e => e.preventDefault());
  });

  // ── دعم عجلة الفأرة على مربعات الأرقام ─────────────
  ["dl-start-m","dl-start-s","dl-end-m","dl-end-s"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input",  updateTrimPreview);
    el.addEventListener("change", updateTrimPreview);
    el.addEventListener("wheel", e => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1 : -1;
      const suffix = id.endsWith("-m") ? "-m" : "-s";
      const field  = id.replace("dl-", "").replace(suffix, "") + suffix;
      trimStep(id.replace("dl-", ""), delta);
    }, { passive: false });
    // دعم مفاتيح الأسهم
    el.addEventListener("keydown", e => {
      if (e.key === "ArrowUp")   { e.preventDefault(); trimStep(id.replace("dl-",""), 1); }
      if (e.key === "ArrowDown") { e.preventDefault(); trimStep(id.replace("dl-",""), -1); }
    });
  });

  updateDlToolUI();
  updateTrimPreview();
}

function updateDlToolUI() {
  const tool  = radioVal("dl-tool") || "ytdlp";
  const isYt  = tool === "ytdlp";
  const ytRow = $("dl-yt-type-row");
  const drRow = $("dl-direct-type-row");
  const trim  = $("dl-trim-section");
  const urlIn = $("ytdlp-url");
  const btn   = $("ytdlp-btn");
  if (ytRow)  ytRow.style.display  = isYt ? "" : "none";
  if (drRow)  drRow.style.display  = isYt ? "none" : "";
  if (trim)   trim.style.display   = isYt ? "" : "none";
  if (urlIn)  urlIn.placeholder    = isYt
    ? "https://youtube.com/watch?v=... أو أي موقع يدعمه yt-dlp"
    : "https://example.com/video.mp4 (رابط مباشر للملف)";
  if (btn) {
    if (isYt)           btn.textContent = "⬇️ تحميل";
    else if (tool === "wget") btn.textContent = "⬇️ wget";
    else                btn.textContent = "⚡ aria2c";
  }
}

// ══════════════════════════════════════════════════════
//  نقطة دخول موحدة للتحميل
// ══════════════════════════════════════════════════════
async function runUnifiedDownload() {
  const tool = radioVal("dl-tool") || "ytdlp";
  if (tool === "ytdlp") await runYtdlpDownload();
  else                  await runDirectDownload(tool);
}

// ══════════════════════════════════════════════════════
//  تطبيق الوسيط المحمّل على المشروع
// ══════════════════════════════════════════════════════
async function applyDownloadedMedia(filePath, type, srcUrl) {
  const fileUrl = "file://" + filePath;
  if (type === "video") {
    if (S.bgVid) { try { S.bgVid.pause(); } catch(_){} S.bgVid = null; }
    const vid = document.createElement("video");
    vid.src = fileUrl; vid.loop = true; vid.muted = true; vid.playsInline = true;
    vid.currentTime = 0;
    // لا تشغيل تلقائي — يبدأ عند الضغط على تشغيل
    S.bgVid = vid;
    const vBtn = document.querySelector('input[name="bgt"][value="video"]');
    if (vBtn) { vBtn.checked = true; onBgTypeChange(); }
    toast("✅ الفيديو جاهز كخلفية — اضغط ▶️ للبدء", "success");
  } else if (type === "audio") {
    if (S.bgAudioEl) { try { S.bgAudioEl.pause(); } catch(_){} }
    S.bgAudioEl = new Audio(fileUrl);
    S.bgAudioEl.loop = true;
    const info = $("bg-audio-info");
    if (info) {
      const lbl = srcUrl?.includes("youtube")
      ? "يوتيوب: " + (srcUrl.split("v=")[1]?.slice(0,11) || "")
      : filePath.split("/").pop().slice(0, 40);
      info.textContent = "✅ " + lbl;
    }
    toast("✅ الصوت جاهز كخلفية", "success");
  } else if (type === "image") {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = fileUrl; });
    S.bgImg = img;
    const iBtn = document.querySelector('input[name="bgt"][value="image"]');
    if (iBtn) { iBtn.checked = true; onBgTypeChange(); }
    toast("✅ الصورة جاهزة كخلفية", "success");
  }
}

// ══════════════════════════════════════════════════════
//  تحميل رابط مباشر (wget / aria2c)
// ══════════════════════════════════════════════════════
async function runDirectDownload(tool) {
  if (!IS_DESKTOP) return;
  if (S.ytdlpBusy) { toast("⚠️ تحميل جارٍ بالفعل", "info"); return; }
  const url  = ($("ytdlp-url")?.value || "").trim();
  const type = radioVal("dl-direct-type") || "video";
  if (!url || !url.startsWith("http")) {
    toast("⚠️ أدخل رابطاً مباشراً صالحاً (http/https)", "error"); return;
  }
  S.ytdlpBusy = true;
  const btn = $("ytdlp-btn"), log = $("ytdlp-log");
  if (btn) btn.textContent = "⏳ جاري التحميل…";
  if (log) { log.textContent = ""; log.style.display = "block"; }
  window.SQRM.onYtdlpProgress(({ line }) => {
    if (log) { log.textContent += line + "\n"; log.scrollTop = log.scrollHeight; }
  });
  try {
    const result = await window.SQRM.directDownload({
      url, tool, type,
      dlSaveMode: S.dlSaveMode, dlSavePath: S.dlSavePath
    });
    window.SQRM.offYtdlpProgress();
    await applyDownloadedMedia(result.filePath, type, url);
  } catch (err) {
    window.SQRM.offYtdlpProgress();
    const msg = err.message?.includes("cancelled") ? "🚫 تم الإلغاء"
    : "❌ " + (err.message || "").slice(0, 200);
    toast(msg, "error");
    if (log) log.textContent += "\n" + msg;
  } finally {
    S.ytdlpBusy = false;
    if (btn) updateDlToolUI();
  }
}

// ══════════════════════════════════════════════════════
//  إصلاح اللصق في خانة الرابط
// ══════════════════════════════════════════════════════
function initYtdlpPasteFix() {
  const inp = $("ytdlp-url");
  if (!inp) return;
  inp.addEventListener("contextmenu", e => e.stopPropagation(), true);
  inp.addEventListener("keydown", async e => {
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.stopPropagation();
      try {
        const t = await navigator.clipboard.readText();
        if (t) { const s = inp.selectionStart, en = inp.selectionEnd;
          inp.value = inp.value.slice(0,s) + t.trim() + inp.value.slice(en); }
      } catch (_) {}
    }
  });
  const pb = $("ytdlp-paste-btn");
  if (pb) pb.addEventListener("click", async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) { inp.value = t.trim(); toast("📋 تم اللصق", "info", 1500); }
    } catch (_) { toast("⚠️ فعّل الوصول للحافظة", "warn"); }
  });
}

// ══════════════════════════════════════════════════════
//  إعداد مجلد التحميل
// ══════════════════════════════════════════════════════
function onDlSaveModeChange() {
  const mode   = radioVal("dl-save-mode") || "tmp";
  S.dlSaveMode = mode;
  // إذا تم اختيار مؤقت امسح المسار المحفوظ
  if (mode === "tmp") { S.dlSavePath = ""; }
  const row    = $("dl-perm-row");
  const note   = $("dl-mode-note");
  if (row)  row.style.display = mode === "permanent" ? "block" : "none";
  if (note) note.textContent  = mode === "permanent"
    ? "✅ سيُحفظ الوسائط في المجلد المحدد"
    : "⚠️ الملفات في /tmp قد تُحذف عند إعادة التشغيل";
  localStorage.setItem("dlSaveMode", mode);
}

async function chooseDlSaveFolder() {
  if (!IS_DESKTOP) return;
  try {
    const res = await window.SQRM.dialogOpen({
      title:      "اختر مجلد حفظ الوسائط",
      properties: ["openDirectory", "createDirectory"],
    });
    if (!res || !res[0]) return;
    const folder = res[0];
    S.dlSavePath = folder;
    // حفظ في localStorage
    localStorage.setItem("dlSavePath", folder);
    const inp    = $("dl-save-path");
    const status = $("dl-path-status");
    if (inp)    inp.value          = folder;
    if (status) status.textContent = "✅ " + folder;
    toast("📁 مجلد الحفظ: " + folder, "success", 3000);
  } catch(e) {
    toast("❌ فشل اختيار المجلد: " + e.message, "error");
  }
}

function restoreDlSettings() {
  const mode = localStorage.getItem("dlSaveMode") || "tmp";
  const path = localStorage.getItem("dlSavePath") || "";
  S.dlSaveMode = mode; S.dlSavePath = path;
  const r = $("dls-" + (mode === "permanent" ? "perm" : "tmp"));
  if (r) r.checked = true;
  const row = $("dl-perm-row");
  if (row) row.style.display = mode === "permanent" ? "block" : "none";
  if (path) {
    const inp = $("dl-save-path"), status = $("dl-path-status");
    if (inp)    inp.value         = path;
    if (status) status.textContent = "✅ " + path;
  }
}


async function runYtdlpDownload() {
  if (!IS_DESKTOP) return;
  if (S.ytdlpBusy) { toast("⚠️ تحميل جارٍ بالفعل", "info"); return; }

  const url  = ($("ytdlp-url")?.value || "").trim();
  const type = radioVal("dl-type") || "video";
  const { startTime, endTime } = getTrimTimes();

  if (!url || !url.startsWith("http")) { toast("⚠️ أدخل رابطاً صالحاً", "error"); return; }

  S.ytdlpBusy = true;
  const btn = $("ytdlp-btn"), log = $("ytdlp-log");
  if (btn) btn.textContent = "⏳ جاري التحميل…";
  if (log) { log.textContent = ""; log.style.display = "block"; }

  window.SQRM.onYtdlpProgress(({ line }) => {
    if (log) { log.textContent += line + "\n"; log.scrollTop = log.scrollHeight; }
  });

  try {
    const result = await window.SQRM.ytdlpDownload({
      url, type, startTime, endTime,
      dlSaveMode: S.dlSaveMode, dlSavePath: S.dlSavePath
    });
    window.SQRM.offYtdlpProgress();
    await applyDownloadedMedia(result.filePath, type, url);
  } catch (err) {
    window.SQRM.offYtdlpProgress();
    const msg = err.message === "cancelled" ? "🚫 تم الإلغاء" : "❌ " + err.message.slice(0, 150);
    toast(msg, "error");
    if (log) log.textContent += "\n" + msg;
  }

  S.ytdlpBusy = false;
  if (btn) btn.textContent = "⬇️ تحميل";
}

function cancelYtdlpDownload() {
  if (!IS_DESKTOP) return;
  window.SQRM.ytdlpCancel();
  S.ytdlpBusy = false;
  const btn = $("ytdlp-btn");
  if (btn) btn.textContent = "⬇️ تحميل";
}

// ══════════════════════════════════════════════════════
//  BATCH EXPORT
// ══════════════════════════════════════════════════════
function openBatchPanel() {
  document.getElementById("batch-modal")?.classList.add("on");
}
function closeBatchPanel() {
  document.getElementById("batch-modal")?.classList.remove("on");
}

function addBatchItem() {
  const surah = parseInt($("batch-surah")?.value) || 1;
  const from = parseInt($("batch-from")?.value) || 1;
  const to = parseInt($("batch-to")?.value) || 7;
  const reciter = radioVal("reciter");
  const codec = $("export-codec")?.value || "mp4-h264";
  const label = `سورة ${surah} (${from}-${to})`;

  S.batchQueue.push({ surah, from, to, reciter, codec, label, status: "pending" });
  renderBatchList();
  toast(`✅ أُضيف للدفعة: ${label}`, "success");
}

function removeBatchItem(idx) {
  S.batchQueue.splice(idx, 1);
  renderBatchList();
}

function renderBatchList() {
  const el = $("batch-list");
  if (!el) return;
  if (!S.batchQueue.length) {
    el.innerHTML = '<p style="text-align:center;color:var(--t3);font-size:10px;padding:12px">لا توجد عناصر</p>';
    return;
  }
  el.innerHTML = S.batchQueue.map((item, i) => `
  <div class="batch-item">
  <span class="batch-lbl">${item.label}</span>
  <span class="batch-status ${item.status}">${
    item.status === "done" ? "✅" : item.status === "error" ? "❌" : item.status === "running" ? "⏳" : "⏸"
  }</span>
  <button class="btn btn-d bsm" onclick="removeBatchItem(${i})" ${item.status === "running" ? "disabled" : ""}>✕</button>
  </div>`).join("");
}

async function runBatchExport() {
  if (!IS_DESKTOP) return;
  if (S.batchRunning) { toast("⚠️ دفعة جارية بالفعل", "info"); return; }
  if (!S.batchQueue.length) { toast("⚠️ أضف عناصر للدفعة أولاً", "error"); return; }

  S.batchRunning = true;
  const btn = $("batch-run-btn");
  if (btn) btn.disabled = true;

  for (let i = 0; i < S.batchQueue.length; i++) {
    if (!S.batchRunning) break;
    const item = S.batchQueue[i];
    if (item.status === "done") continue;

    item.status = "running";
    S.batchCurrent = i;
    renderBatchList();
    toast(`⏳ تصدير ${i+1}/${S.batchQueue.length}: ${item.label}`, "info");

    try {
      const selSurah = $("surah-sel");
      if (selSurah) selSurah.value = item.surah;
      $("from-aya").value = item.from;
      $("to-aya").value = item.to;
      await onSurahChange();
      await loadVerses();
      await new Promise(r => setTimeout(r, 500));

      await startExportAsync(item.codec || "mp4-h264");
      item.status = "done";
    } catch (err) {
      item.status = "error";
      console.error("Batch item error:", err);
    }
    renderBatchList();
  }

  S.batchRunning = false;
  if (btn) btn.disabled = false;
  toast("🎉 اكتملت دفعة التصدير!", "success");
}

function stopBatchExport() {
  S.batchRunning = false;
  cancelExport();
  toast("🚫 تم إيقاف الدفعة", "info");
}

function startExportAsync(codec) {
  return new Promise((resolve, reject) => {
    startExportDesktop(codec)
    .then(resolve)
    .catch(reject);
  });
}

// ══════════════════════════════════════════════════════
//  محرك التصدير الحتمي V2 — إطار-بإطار → ffmpeg مباشرة
//  لا يستخدم MediaRecorder/captureStream إطلاقاً
//  مزايا: لا تقطّع، دقّة زمنية كاملة، مدّة MP4 صحيحة
// ══════════════════════════════════════════════════════
async function startExportDesktop(codecKey) {
  if (!IS_DESKTOP) {
    startExport(codecKey === "webm-vp9" ? "webm" : "mp4");
    return;
  }
  if (!S.verses.length) { toast("⚠️ لا توجد آيات", "error"); return; }
  if (S.exporting)      { toast("⚠️ تصدير جارٍ بالفعل", "info"); return; }

  const codecs = window.EXPORT_CODECS || {};
  const fmt    = codecs[codecKey] || codecs["mp4-h264"];
  const userCrf    = parseInt(gv("export-crf") || "") || fmt.defaultCrf;
  const userPreset = $("export-preset")?.value || "veryfast";
  const userAbr    = $("export-abr")?.value    || "192k";
  const FPS        = parseInt(gv("export-fps") || "30") || 30;

  // ── إعداد الواجهة وحالة التصدير ────────────────────
  S.exportCancel = false;
  S.exporting    = true;
  const cancelRef = { canceled: false };
  S.exportCancelRef = cancelRef;

  $("rec-ov").classList.add("on");
  $("rec-fill").style.width = "0%";
  $("rec-pct").textContent  = "0%";
  $("rec-sub").textContent  = "⏳ جاري تحميل الصوتيات…";

  // أوقف كل تشغيل حيّ — المعاينة لا تتدخل في التصدير
  stopRecitationAudio();
  if (S.bgAudioEl)            S.bgAudioEl.pause();
  if (S.bgVid && !S.bgVid.paused) { try { S.bgVid.pause(); } catch (_) {} }

  const ctx = await resumeAudioCtx();

  // ── تحميل صوت كل آية كـ AudioBuffer ────────────────
  const manualDur = parseFloat(gv("aya-dur")) || 6;
  const getDur    = (i) => (S.ayaDurations[i] && S.ayaDurations[i] > 0.5) ? S.ayaDurations[i] : manualDur;
  const surahNum  = parseInt($("surah-sel").value) || 1;
  const reciter   = S.reciters.find(r => r.id === radioVal("reciter")) || S.reciters[0];
  const recGain   = gv("rec-vol") / 100;

  // v3.3.1 — skipReciter للفيديو الجاهز
  const skipReciterV2 = ge("recvid-on") || S.verses.every(v => v?.recvid || v?.free || v?.audio === null);
  let loaded = 0;
  const audioBuffers = await Promise.all(S.verses.map(async (aya, i) => {
    if (cancelRef.canceled) return null;
    if (skipReciterV2 || aya?.recvid || aya?.free || aya?.audio === null) {
      S.ayaDurations[i] = aya?.manualDuration || manualDur;
      loaded++;
      $("rec-sub").textContent = `⏳ تحضير الشرائح… ${loaded}/${S.verses.length}`;
      return null;
    }
    const url = buildAudioUrl(reciter.folder, surahNum, aya.numberInSurah);
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const ab  = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(ab.slice(0));
      S.ayaDurations[i] = buf.duration;
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length}`;
      return buf;
    } catch (_) {
      loaded++;
      $("rec-sub").textContent = `⏳ تحميل الصوت… ${loaded}/${S.verses.length} ⚠️`;
      return null;
    }
  }));

  if (cancelRef.canceled) { _finishExportUi(); return; }

  // ── حساب البداية الزمنية لكل آية والمدة الكلية ─────
  // فاصل صمت يُحشر بعد كل آية ضمن الخانة الزمنية
  const ayaGap = getAyaGap();
  const ayaStarts = [];
  let acc = 0;
  for (let i = 0; i < S.verses.length; i++) { ayaStarts.push(acc); acc += getDur(i) + ayaGap; }
  const totalDuration = acc;
  if (totalDuration < 0.5) {
    _finishExportUi();
    toast("⚠️ المدة قصيرة جداً", "error");
    return;
  }

  // ── فك ترميز صوت الخلفية (إن وُجد) ─────────────────
  let bgBuffer = null;
  const bgGain = (gv("bg-vol") || 0) / 100;
  const bgLoop = ge("bg-loop");
  if (S.bgAudioEl && S.bgAudioEl.src) {
    try {
      $("rec-sub").textContent = "⏳ فك ترميز صوت الخلفية…";
      const res = await fetch(S.bgAudioEl.src);
      const ab  = await res.arrayBuffer();
      bgBuffer  = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) { console.warn("bg decode failed:", e); }
  }

  // ── حوار حفظ الملف ─────────────────────────────────
  $("rec-sub").textContent = "📁 اختر مكان الحفظ…";
  const lastDir = localStorage.getItem("gt_sqrm_lastExportDir") || "";
  const filename = `GT-SQRM_${Date.now()}.${fmt.ext}`;
  const outputPath = await window.SQRM.dialogSave({
    title: `حفظ بصيغة ${fmt.label}`,
    defaultPath: lastDir ? (lastDir.replace(/\/$/, "") + "/" + filename) : filename,
    ext: fmt.ext,
    filters: [{ name: fmt.label, extensions: [fmt.ext] }],
  });
  if (!outputPath) { _finishExportUi(); return; }
  // احفظ المجلد للمرة القادمة (للتصدير فقط — تنزيلات yt-dlp/wget لها مفتاحها الخاص dlSavePath)
  try {
    const dir = outputPath.replace(/[\\/][^\\/]*$/, "");
    if (dir) localStorage.setItem("gt_sqrm_lastExportDir", dir);
  } catch (_) {}

  // ── دالة استنتاج الآية الحالية من الزمن (تشمل فاصل الصمت) ──
  const getAyaAt = (t) => {
    for (let i = 0; i < S.verses.length; i++) {
      if (t < ayaStarts[i] + getDur(i) + ayaGap) return i;
    }
    return S.verses.length - 1;
  };
  const savedAya       = S.currentAya;
  const savedElapsed   = S.elapsed;
  const savedBgMotionT = S.bgMotionT;
  const setStateForTime = (t) => {
    const idx = getAyaAt(Math.min(t, totalDuration - 1e-4));
    S.currentAya = idx;
    S.elapsed    = Math.max(0, t - ayaStarts[idx]);
    S.bgMotionT  = t;  // مزامنة حركة الخلفية مع الزمن الحتمي للإطار
  };

  // ── قراءة بايتات فيديو/فيديوهات الخلفية ─────────────
  let bgVideoBytes = null;
  let bgVideoBytesList = null;
  let bgClipDurations = null;
  if (S.bgVidItems && S.bgVidItems.length > 1) {
    try {
      $("rec-sub").textContent = `📥 قراءة ${S.bgVidItems.length} مقاطع للخلفية…`;
      bgVideoBytesList = await Promise.all(S.bgVidItems.map(it => it.file.arrayBuffer()));
      bgClipDurations  = S.bgVidItems.map(it => it.dur || 0);
    } catch (e) { console.warn("multi-bg bytes read failed:", e); }
  } else if (S.bgVid && S.bgVidFile) {
    try {
      $("rec-sub").textContent = "📥 قراءة فيديو الخلفية…";
      bgVideoBytes = await S.bgVidFile.arrayBuffer();
    } catch (e) {
      console.warn("Could not read bg video file bytes:", e);
    }
  }
  // قراءة إعدادات التقطيع
  const bgVidTrim = getBgVidTrim();
  const bgAudioTrim = getBgAudioTrim();

  // ── متابع لسجل ffmpeg ──────────────────────────────
  const logEl = $("ffmpeg-log");
  if (logEl) logEl.textContent = "";
  window.SQRM.onFfmpegProgress(({ log }) => {
    if (logEl && log) {
      logEl.textContent = (logEl.textContent + "\n" + log).slice(-4000);
    }
  });

  // ── التنفيذ الفعلي ─────────────────────────────────
  try {
    await window.startDesktopExportV2({
      canvas: $("cv"),
      drawFrame,
      setStateForTime,
      setBgFrameImage: (img) => { S._exportBgFrameImg = img; },
      totalDuration,
      fps: FPS,
      audioBuffers,
      ayaStarts,
      bgBuffer, bgGain, bgLoop,
      recGain,
      bgVideo: S.bgVid,
      bgVideoBytes,
      bgVideoBytesList,
      bgClipDurations,      // مدّة كل مقطع — لازم للـ crossfade xfade
      bgCrossfadeSec: getCrossfadeDur(),  // نفس مدة المعاينة بالضبط
      bgVidTrim,
      bgAudioTrim,
      codecKey,
      crf:          userCrf,
      preset:       userPreset,
      audioBitrate: userAbr,
      outputPath,
      cancelRef,
      onProgress: (pct, label) => {
        const cp = Math.max(0, Math.min(100, Math.round(pct)));
        $("rec-fill").style.width = cp + "%";
        $("rec-pct").textContent  = cp + "%";
        if (label) $("rec-sub").textContent = label;
      },
    });
    toast(`✅ تم التصدير: ${fmt.label}`, "success");
    try { window.SQRM.openFolder?.(outputPath); } catch (_) {}
  } catch (e) {
    if (e && e.message === "cancelled") toast("تم إلغاء التصدير", "info");
    else {
      console.error("Export V2 failed:", e);
      toast("❌ فشل التصدير: " + String(e.message || e).slice(0, 140), "error");
    }
  } finally {
    window.SQRM.offFfmpegProgress?.();
    S.currentAya       = savedAya;
    S.elapsed          = savedElapsed;
    S.bgMotionT        = savedBgMotionT;
    S._exportBgFrameImg = null;
    updateAyaUI();
    _finishExportUi();
  }
}

function _finishExportUi() {
  S.exporting = false;
  S.exportCancelRef = null;
  $("rec-ov").classList.remove("on");
  cleanupExportMute();
}

function cleanupTmp(path) {
  try { window.SQRM.deleteTempFile?.(path); } catch (_) {}
}

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function ge(id) { const e = $(id); return e && e.checked; }
function ge_el(id) { return $(id); }
function gv(id) { const e = $(id); return e ? e.value : 0; }
function radioVal(name) { const e = document.querySelector(`input[name="${name}"]:checked`); return e ? e.value : ""; }
function fontVal() { return radioVal("font") || "'Amiri Quran'"; }
function sv(el, outId, unit = "") { $(outId).textContent = el.value + unit; }
function setCol(id, val) { const e = $(id); if (e) e.value = val; }
function setV(id, val) { const e = $(id); if (e) e.value = val; }
function setR(name, val) { const e = document.querySelector(`input[name="${name}"][value="${val}"]`); if (e) e.checked = true; }
function syncCP(pickId, txtId) { const e = $(pickId); if (e && $(txtId)) $(txtId).value = e.value; }
function syncCT(pickId, txtId) { const val = $(txtId).value; if (/^#[0-9a-fA-F]{6}$/.test(val)) { setCol(pickId, val); } }
function hex2rgb(hex) { const h = hex.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function toggleManualDur() { $("manual-dur").style.display = ge("auto-dur") ? "none" : "block"; }
function checkOffline() {
  const u = () => document.body.classList.toggle("offline", !navigator.onLine);
  window.addEventListener("online", u); window.addEventListener("offline", u); u();
}
function toast(msg, type = "info", duration = 3600) {
  const el = document.createElement("div"); el.className = `toast ${type}`; el.textContent = msg;
  $("toast-c").appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ═══════════════════════════════════════════════════════
//  v3.1 — حفظ/فتح المشاريع (.gtsqrm)
// ═══════════════════════════════════════════════════════
const PROJECT_FORMAT = "GT-SQRM-Project";
const PROJECT_FORMAT_VERSION = 1;
const ASSET_EMBED_MAX = 50 * 1024 * 1024;
const PROJECT_APP_VERSION = "3.1.0";
const IS_DESKTOP_BUILD = !!(window.SQRM && window.SQRM.isDesktop);
let _autoSaveTimer = null;

function markProjectDirty() { S.projectDirty = true; updateProjectTitle(); }
function clearProjectDirty() { S.projectDirty = false; updateProjectTitle(); }
function updateProjectTitle() {
  const base = S.projectFileName || "بدون اسم";
  const dirty = S.projectDirty ? " ●" : "";
  document.title = `${base}${dirty} — GT-SQRM`;
  const sub = document.getElementById("app-subtitle");
  if (sub && S.projectFileName) sub.textContent = `📁 ${base}${dirty}`;
}
function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
function dataURLToBlob(dataURL) {
  const [meta, b64] = dataURL.split(",");
  const mime = (meta.match(/data:([^;]+)/) || [, "application/octet-stream"])[1];
  const bin = atob(b64);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

async function serializeProject() {
  const byId = {}, byName = {};
  document.querySelectorAll("input, select, textarea").forEach(el => {
    if (el.type === "file" || el.type === "button" || el.type === "submit") return;
    if (el.type === "checkbox" || el.type === "radio") {
      if (el.id) byId[el.id] = el.checked;
      if (el.name && (el.type !== "radio" || el.checked)) byName[el.name] = el.value;
    } else {
      if (el.id) byId[el.id] = el.value;
    }
  });
  const assets = [];
  if (Array.isArray(S.bgVidItems)) {
    for (let i = 0; i < S.bgVidItems.length; i++) {
      const item = S.bgVidItems[i];
      const a = {
        key: `bgVideo[${i}]`, name: item.name || `video-${i}.mp4`,
        size: item.file?.size || 0, mime: item.file?.type || "video/mp4",
        active: i === S.bgVidActiveIdx,
        audioEnabled: !!item.audioEnabled, audioGain: item.audioGain ?? 0.5,
      };
      if (item.file && item.file.size <= ASSET_EMBED_MAX) {
        a.mode = "embedded"; a.dataURL = await fileToDataURL(item.file);
      } else { a.mode = "missing"; a.reason = item.file ? "حجم أكبر من 50MB" : "غير متوفّر"; }
      assets.push(a);
    }
  }
  if (S.bgImgFile) {
    const a = { key: "bgImage", name: S.bgImgFile.name || "bg.jpg", size: S.bgImgFile.size || 0, mime: S.bgImgFile.type || "image/jpeg" };
    if (S.bgImgFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.bgImgFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  if (S.bgAudioFile) {
    const a = { key: "bgAudio", name: S.bgAudioFile.name || "audio.mp3", size: S.bgAudioFile.size || 0, mime: S.bgAudioFile.type || "audio/mpeg" };
    if (S.bgAudioFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.bgAudioFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  // v3.2 — فيديو التلاوة الجاهز
  if (S.recVidFile) {
    const a = { key: "recVideo", name: S.recVidFile.name || "recitation.mp4", size: S.recVidFile.size || 0, mime: S.recVidFile.type || "video/mp4" };
    if (S.recVidFile.size <= ASSET_EMBED_MAX) { a.mode = "embedded"; a.dataURL = await fileToDataURL(S.recVidFile); }
    else { a.mode = "missing"; a.reason = "حجم أكبر من 50MB"; }
    assets.push(a);
  }
  const logoDataURL = localStorage.getItem("gt_sqrm_logo_v1");
  if (logoDataURL) assets.push({ key: "logo", name: "logo.png", mode: "embedded", dataURL: logoDataURL });
  return {
    format: PROJECT_FORMAT, formatVersion: PROJECT_FORMAT_VERSION,
    appVersion: PROJECT_APP_VERSION, platform: IS_DESKTOP_BUILD ? "desktop" : "web",
    savedAt: new Date().toISOString(),
    settings: { byId, byName }, assets,
  };
}

async function deserializeProject(proj) {
  if (!proj || proj.format !== PROJECT_FORMAT) throw new Error("ملفّ مشروع غير صالح");
  const byId = proj.settings?.byId || {}, byName = proj.settings?.byName || {};
  for (const [id, value] of Object.entries(byId)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (el.type === "checkbox") el.checked = !!value;
    else if (el.type === "radio") { }
    else el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }
  for (const [name, value] of Object.entries(byName)) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      if (el.type === "radio") {
        el.checked = (el.value === value);
        if (el.checked) el.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }
  const missing = [];
  for (const a of (proj.assets || [])) {
    if (a.mode === "embedded" && a.dataURL) await restoreAssetFromDataURL(a);
    else missing.push(a);
  }
  if (missing.length) showMissingAssetsModal(missing);
  clearProjectDirty();
  return { restored: (proj.assets || []).length - missing.length, missing: missing.length };
}

async function restoreAssetFromDataURL(asset) {
  const blob = dataURLToBlob(asset.dataURL);
  const file = new File([blob], asset.name, { type: asset.mime || blob.type });
  const fakeInput = { files: [file], value: "" };
  if (asset.key === "logo") {
    try { localStorage.setItem("gt_sqrm_logo_v1", asset.dataURL); } catch (_) {}
    if (typeof restoreLogo === "function") restoreLogo();
  } else if (asset.key === "bgImage") {
    if (typeof onBgMedia === "function") onBgMedia(fakeInput, "image");
  } else if (asset.key === "bgAudio") {
    if (typeof onBgAudio === "function") onBgAudio(fakeInput);
  } else if (asset.key === "recVideo") {
    if (typeof onRecVidFile === "function") onRecVidFile(fakeInput);
  } else if (asset.key && asset.key.startsWith("bgVideo[")) {
    if (typeof addBgVidItem === "function") {
      addBgVidItem(file);
      setTimeout(() => {
        if (Array.isArray(S.bgVidItems) && S.bgVidItems.length) {
          const last = S.bgVidItems[S.bgVidItems.length - 1];
          if (last) {
            if (asset.audioEnabled !== undefined) last.audioEnabled = !!asset.audioEnabled;
            if (asset.audioGain !== undefined) last.audioGain = asset.audioGain;
            if (typeof renderBgVidList === "function") renderBgVidList();
          }
        }
      }, 250);
    }
  }
}

function showMissingAssetsModal(missing) {
  const modal = document.getElementById("missing-assets-modal");
  const list = document.getElementById("missing-assets-list");
  if (!modal || !list) return;
  const replacements = new Map();
  list.innerHTML = missing.map((a, i) => {
    const acc = a.key === "bgImage" ? "image/*" : a.key === "bgAudio" ? "audio/*"
              : (a.key || "").startsWith("bgVideo") ? "video/*" : a.key === "logo" ? "image/*" : "*/*";
    return `<div style="padding:8px;background:var(--bg1);border-radius:var(--r);border:1px solid var(--b1)">
        <div style="font-size:11px;color:var(--t1);margin-bottom:4px"><b style="color:var(--al)">${a.key}</b> — ${a.name || ""}</div>
        <div style="font-size:10px;color:var(--t3);margin-bottom:6px">السبب: ${a.reason || "غير متوفّر"}</div>
        <input type="file" data-missing-idx="${i}" accept="${acc}" style="font-size:10px;width:100%"></div>`;
  }).join("");
  list.querySelectorAll("input[data-missing-idx]").forEach(inp => {
    inp.addEventListener("change", (e) => {
      const idx = parseInt(inp.dataset.missingIdx);
      const f = e.target.files?.[0]; if (f) replacements.set(idx, f);
    });
  });
  modal.style.display = "flex";
  const close = () => { modal.style.display = "none"; };
  document.getElementById("missing-assets-skip").onclick = () => { toast(`⏭️ تخطّي ${missing.length} مصدر`, "info", 1800); close(); };
  document.getElementById("missing-assets-apply").onclick = async () => {
    let n = 0;
    for (const [idx, file] of replacements.entries()) {
      const orig = missing[idx];
      const fakeAsset = { ...orig, dataURL: await fileToDataURL(file), mode: "embedded", name: file.name, mime: file.type };
      await restoreAssetFromDataURL(fakeAsset); n++;
    }
    toast(`✅ تمّ استبدال ${n} مصدر`, "success", 2000); close();
  };
}

async function saveProjectToPath(filePath) {
  const proj = await serializeProject();
  const json = JSON.stringify(proj, null, 2);
  if (IS_DESKTOP_BUILD && filePath) {
    const r = await window.SQRM.projectWrite(filePath, json);
    if (!r.ok) { toast(`❌ فشل الحفظ: ${r.error}`, "error", 3000); return false; }
    S.projectFilePath = filePath;
    S.projectFileName = filePath.split(/[\\/]/).pop();
    try { localStorage.setItem("gt_sqrm_last_project", filePath); } catch (_) {}
  } else {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fname = (S.projectFileName || `gt-sqrm-project-${Date.now()}.gtsqrm`).replace(/\.json$/, ".gtsqrm");
    a.href = url; a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    S.projectFileName = fname;
  }
  clearProjectDirty();
  return true;
}
async function saveProjectInteractive() {
  if (IS_DESKTOP_BUILD) {
    const fp = await window.SQRM.projectSaveDialog(S.projectFileName || null);
    if (!fp) return;
    const fixed = fp.endsWith(".gtsqrm") ? fp : fp + ".gtsqrm";
    const ok = await saveProjectToPath(fixed);
    if (ok) toast(`💾 تمّ الحفظ: ${fixed.split(/[\\/]/).pop()}`, "success", 2200);
  } else {
    const ok = await saveProjectToPath(null);
    if (ok) toast("💾 تمّ تنزيل ملفّ المشروع", "success", 2200);
  }
}
async function openProjectInteractive() {
  if (S.projectDirty && !confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  if (IS_DESKTOP_BUILD) {
    const fp = await window.SQRM.projectOpenDialog();
    if (fp) await openProjectFromPath(fp);
  } else {
    document.getElementById("proj-open-input")?.click();
  }
}
async function openProjectFromPath(filePath) {
  if (!IS_DESKTOP_BUILD) return;
  const r = await window.SQRM.projectRead(filePath);
  if (!r.ok) { toast(`❌ فشل الفتح: ${r.error}`, "error", 3000); return; }
  try {
    const proj = JSON.parse(r.content);
    const result = await deserializeProject(proj);
    S.projectFilePath = filePath;
    S.projectFileName = filePath.split(/[\\/]/).pop();
    try { localStorage.setItem("gt_sqrm_last_project", filePath); } catch (_) {}
    updateProjectTitle();
    toast(`📂 ${S.projectFileName} (${result.restored} مصدر${result.missing ? ` · ⚠️ ${result.missing} مفقود` : ""})`, result.missing ? "warn" : "success", 2800);
  } catch (e) { toast(`❌ ملفّ غير صالح: ${e.message}`, "error", 3000); }
}
async function openProjectFromBlob(file) {
  if (S.projectDirty && !confirm("لديك تغييرات غير محفوظة. متابعة؟")) return;
  const text = await file.text();
  try {
    const proj = JSON.parse(text);
    const result = await deserializeProject(proj);
    S.projectFileName = file.name;
    updateProjectTitle();
    toast(`📂 ${file.name} (${result.restored} مصدر${result.missing ? ` · ⚠️ ${result.missing} مفقود` : ""})`, result.missing ? "warn" : "success", 2800);
  } catch (e) { toast(`❌ ملفّ غير صالح: ${e.message}`, "error", 3000); }
}

function startAutoSave() {
  stopAutoSave();
  const enabled = ge("autosave-on");
  const intervalMin = parseInt(document.getElementById("autosave-interval")?.value || 5);
  const status = document.getElementById("autosave-status");
  if (!enabled) { if (status) status.textContent = "⏸️ غير مُفعَّل"; try { localStorage.setItem("gt_sqrm_autosave_on", "0"); } catch (_) {} return; }
  if (!S.projectFilePath && IS_DESKTOP_BUILD) { if (status) status.textContent = "⚠️ احفظ المشروع يدوياً أوّل مرة"; return; }
  try { localStorage.setItem("gt_sqrm_autosave_on", "1"); localStorage.setItem("gt_sqrm_autosave_interval", String(intervalMin)); } catch (_) {}
  if (status) status.textContent = `🟢 مُفعَّل — كلّ ${intervalMin} دقيقة`;
  _autoSaveTimer = setInterval(async () => {
    if (!S.projectDirty) return;
    if (IS_DESKTOP_BUILD && S.projectFilePath) {
      const ok = await saveProjectToPath(S.projectFilePath);
      if (ok) toast(`💾 حفظ تلقائيّ — ${new Date().toLocaleTimeString("ar")}`, "info", 1500);
    } else if (!IS_DESKTOP_BUILD) {
      try { const json = JSON.stringify(await serializeProject()); if (json.length < 4_500_000) { localStorage.setItem("gt_sqrm_autosave_blob", json); toast(`💾 حفظ تلقائيّ في المتصفّح`, "info", 1500); } } catch (_) {}
    }
  }, intervalMin * 60 * 1000);
}
function stopAutoSave() { if (_autoSaveTimer) { clearInterval(_autoSaveTimer); _autoSaveTimer = null; } }

function showCloseConfirmModal() {
  const modal = document.getElementById("close-confirm-modal");
  if (!modal) {
    if (confirm("لديك تغييرات غير محفوظة. حفظ قبل الإغلاق؟")) saveProjectInteractive().then(() => { if (!S.projectDirty && IS_DESKTOP_BUILD) window.SQRM?.confirmClose(); });
    else if (IS_DESKTOP_BUILD) window.SQRM?.confirmClose();
    return;
  }
  modal.style.display = "flex";
  const close = () => { modal.style.display = "none"; };
  document.getElementById("close-confirm-cancel").onclick = close;
  document.getElementById("close-confirm-quit").onclick = () => { close(); if (IS_DESKTOP_BUILD) window.SQRM.confirmClose(); };
  document.getElementById("close-confirm-save").onclick = async () => { close(); await saveProjectInteractive(); if (!S.projectDirty && IS_DESKTOP_BUILD) window.SQRM.confirmClose(); };
}

function initProjectSystem() {
  document.getElementById("proj-save-btn")?.addEventListener("click", saveProjectInteractive);
  document.getElementById("proj-open-btn")?.addEventListener("click", openProjectInteractive);
  document.getElementById("proj-open-input")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0]; if (f) openProjectFromBlob(f);
    e.target.value = "";
  });
  const autosaveOn = document.getElementById("autosave-on");
  if (autosaveOn) {
    try { autosaveOn.checked = localStorage.getItem("gt_sqrm_autosave_on") === "1"; } catch (_) {}
    autosaveOn.addEventListener("change", () => {
      const ctrl = document.getElementById("autosave-ctrl");
      if (ctrl) ctrl.style.display = autosaveOn.checked ? "block" : "none";
      startAutoSave();
    });
    autosaveOn.dispatchEvent(new Event("change"));
  }
  document.getElementById("autosave-interval")?.addEventListener("change", () => { if (ge("autosave-on")) startAutoSave(); });
  try {
    const savedIv = localStorage.getItem("gt_sqrm_autosave_interval");
    if (savedIv && document.getElementById("autosave-interval")) document.getElementById("autosave-interval").value = savedIv;
  } catch (_) {}
  if (IS_DESKTOP_BUILD && window.SQRM.onRequestCloseConfirm) {
    window.SQRM.onRequestCloseConfirm(() => {
      if (!S.projectDirty) { window.SQRM.confirmClose(); return; }
      showCloseConfirmModal();
    });
  } else {
    window.addEventListener("beforeunload", (e) => {
      if (S.projectDirty) { e.preventDefault(); e.returnValue = "لديك تغييرات غير محفوظة."; return e.returnValue; }
    });
  }
  if (IS_DESKTOP_BUILD && window.SQRM.onProjectOpenFromDisk) {
    window.SQRM.onProjectOpenFromDisk((fp) => openProjectFromPath(fp));
  }
  const trackInputs = () => {
    document.querySelectorAll("input, select, textarea").forEach(el => {
      if (el._dirtyTracked) return;
      if (el.type === "button" || el.type === "submit" || el.type === "file") return;
      el._dirtyTracked = true;
      const handler = () => markProjectDirty();
      el.addEventListener("change", handler);
      if (el.type !== "checkbox" && el.type !== "radio") el.addEventListener("input", handler);
    });
  };
  trackInputs(); setTimeout(trackInputs, 2000);
  updateProjectTitle();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(initProjectSystem, 100));
else setTimeout(initProjectSystem, 100);
