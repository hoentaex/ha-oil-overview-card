// Dialog with the main card, opened from the mini card. It lives on document.body, so no transformed
// dashboard ancestor can clip it; the theme colours of the card that opened it are copied over, since
// view themes are set below body.

const THEME_VARS = [
  "--primary-text-color",
  "--secondary-text-color",
  "--text-primary-color",
  "--primary-color",
  "--card-background-color",
  "--ha-card-background",
  "--secondary-background-color",
  "--divider-color",
  "--ooc-oil-color",
  "--ooc-good-color",
  "--ooc-warn-color",
  "--ooc-bad-color",
  "--ooc-temp-color",
];

const DIALOG_STYLE = `
  :host { position: fixed; inset: 0; z-index: 9999; display: block; }
  .backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, .5); display: flex; align-items: center; justify-content: center;
              padding: 24px; box-sizing: border-box; animation: ooc-fade .15s ease; }
  .panel { width: min(520px, 100%); max-height: 100%; overflow: auto; overscroll-behavior: contain; border-radius: 16px;
           background: var(--ha-card-background, var(--card-background-color, #fff)); box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
           --ha-card-box-shadow: none; --ha-card-border-width: 0; --ha-card-border-radius: 16px; }
  @media (max-width: 600px) {
    .backdrop { padding: 0; }
    .panel { width: 100%; height: 100%; max-height: none; border-radius: 0; --ha-card-border-radius: 0; }
  }
  @keyframes ooc-fade { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .backdrop { animation: none; } }
`;

export class OilOverviewDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._onKey = (e) => {
      if (e.key === "Escape") this.close();
    };
  }

  set hass(hass) {
    if (this._card) this._card.hass = hass;
  }

  get isOpen() {
    return !!this._card;
  }

  open({ config, hass, opener, label }) {
    this._opener = opener;
    const host = opener?.getRootNode?.()?.host;
    if (host) {
      const cs = getComputedStyle(host);
      for (const name of THEME_VARS) {
        const val = cs.getPropertyValue(name).trim();
        if (val) this.style.setProperty(name, val);
      }
      this.style.fontFamily = cs.fontFamily;
      this.style.color = cs.getPropertyValue("--primary-text-color");
    }
    this.shadowRoot.innerHTML = `<style>${DIALOG_STYLE}</style>
      <div class="backdrop"><div class="panel" role="dialog" aria-modal="true"></div></div>`;
    const panel = this.shadowRoot.querySelector(".panel");
    panel.setAttribute("aria-label", label);
    this._card = document.createElement("oil-overview-card");
    this._card.setConfig({ ...config, type: "custom:oil-overview-card", _dialog: true });
    this._card.hass = hass;
    panel.append(this._card);
    this.shadowRoot.querySelector(".backdrop").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.close();
    });
    this._card.addEventListener("ooc-close", () => this.close());
    document.addEventListener("keydown", this._onKey);
    this._overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.append(this);
    this._card.shadowRoot?.querySelector("[data-close]")?.focus();
  }

  close() {
    document.removeEventListener("keydown", this._onKey);
    document.body.style.overflow = this._overflow ?? "";
    this.remove();
    this._card = undefined;
    this.dispatchEvent(new CustomEvent("closed"));
    this._opener?.focus?.();
  }
}

if (!customElements.get("oil-overview-dialog")) customElements.define("oil-overview-dialog", OilOverviewDialog);
