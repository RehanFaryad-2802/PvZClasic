/* js/comp/BackButtonHandler.js  — PvZClassic
   Handles the mobile hardware/gesture back button (Capacitor App plugin).
   - Closes any open overlay/modal first (plant picker, popups, pause).
   - Otherwise navigates back one screen, using the SAME target screens
     your existing back buttons already use (no new navigation logic).
   - In battle, back = pause (reuses the existing pause-overlay Quit/Resume).
   - At the root menu, shows a themed "Exit Game?" confirm before quitting.
   UI/navigation only — never touches Core battle logic or game rules.
*/

const BackButtonHandler = (() => {
  // Mirrors ui.js's existing back-button wiring 1:1 — do not diverge from it.
  const BACK_MAP = {
    "screen-worldmap": "screen-menu",
    "screen-collection": "screen-menu",
    "screen-shop": "screen-worldmap",
    "screen-levelselect": "screen-worldmap",
    "screen-settings": "screen-menu",
    "screen-result": "screen-menu",
  };

  const ROOT_SCREEN = "screen-menu";
  const NO_BACK_SCREENS = ["screen-name"]; // nothing to go back to

  function getCurrentScreen() {
    const active = document.querySelector(".screen.active");
    return active ? active.id : null;
  }

  // Returns true if it consumed the back press (an overlay was open/closed)
  function closeTopOverlay() {
    // Plant picker bottom-sheet
    const pp = document.querySelector(".pp-overlay.pp-visible");
    if (pp) {
      const back = document.getElementById("btn-back-picker");
      const close = pp.querySelector(".pp-close-btn");
      (back || close)?.click();
      return true;
    }
    // Generic global popup (openPopup helper)
    const popup = document.getElementById("global-popup");
    if (popup && !popup.classList.contains("hidden")) {
      popup.classList.add("hidden");
      return true;
    }
    // Pause overlay — back resumes rather than exposing quit immediately
    const pauseOverlay = document.getElementById("pause-overlay");
    if (pauseOverlay && !pauseOverlay.classList.contains("hidden")) {
      document.getElementById("btn-resume")?.click();
      return true;
    }
    return false;
  }

  function handleBack() {
    if (closeTopOverlay()) return;

    const screen = getCurrentScreen();
    if (!screen || NO_BACK_SCREENS.includes(screen)) return;

    if (screen === "screen-battle") {
      // Reuse the existing pause flow — it already has Resume + Quit Battle
      if (typeof Core !== "undefined") Core.pause();
      return;
    }

    if (screen === ROOT_SCREEN) {
      showExitConfirm();
      return;
    }

    const target = BACK_MAP[screen];
    if (typeof UI !== "undefined") {
      UI.showScreen(target || ROOT_SCREEN);
    }
  }

  // ── Themed exit confirm ─────────────────────────
  let exitEl = null;

  function showExitConfirm() {
    if (exitEl) return;
    exitEl = document.createElement("div");
    exitEl.className = "bx-overlay";
    exitEl.innerHTML = `
      <div class="bx-card">
        <div class="bx-pin"></div>
        <div class="bx-title">Leaving the garden?</div>
        <div class="bx-msg">Your progress is saved. Exit PvZClassic?</div>
        <div class="bx-actions">
          <button class="bx-btn bx-btn-stay" id="bx-stay-btn">Stay</button>
          <button class="bx-btn bx-btn-exit" id="bx-exit-btn">Exit</button>
        </div>
      </div>`;
    document.body.appendChild(exitEl);
    requestAnimationFrame(() => exitEl.classList.add("bx-visible"));

    document.getElementById("bx-stay-btn").addEventListener("click", hideExitConfirm);
    document.getElementById("bx-exit-btn").addEventListener("click", () => {
      hideExitConfirm();
      doExit();
    });
  }

  function hideExitConfirm() {
    if (!exitEl) return;
    exitEl.classList.remove("bx-visible");
    const el = exitEl;
    exitEl = null;
    setTimeout(() => el.remove(), 200);
  }

  function doExit() {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (CapApp && CapApp.exitApp) CapApp.exitApp();
  }

  // ── Attach to Capacitor's backButton event ──────
  function attach() {
    const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (!CapApp || CapApp.__pvzBackHooked) return;
    CapApp.__pvzBackHooked = true;
    CapApp.addListener("backButton", handleBack);
  }

  function init() {
    attach();
    document.addEventListener("deviceready", attach, false);
  }

  return { init };
})();
