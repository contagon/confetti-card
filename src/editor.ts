import { LitElement, html, TemplateResult, css } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators.js';

import type { ConfettiCardConfig } from './types';

@customElement('confetti-card-editor')
export class ConfettiCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: ConfettiCardConfig;

  public setConfig(config: ConfettiCardConfig): void {
    this._config = { ...config };
  }

  protected shouldUpdate(): boolean {
    return true;
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    return html`
      <div class="editor-container">
        <div class="sound-toggle">
          <span class="toggle-label">Play celebration sound</span>
          <ha-switch .checked=${this._config.sound ?? false} @change=${this._soundToggled}></ha-switch>
        </div>

        <p class="description">
          Confetti will fire when <strong>all</strong> conditions below become true. Add conditions to control when the
          celebration appears.
        </p>
        <ha-card-conditions-editor
          .hass=${this.hass}
          .conditions=${this._config.conditions ?? []}
          @value-changed=${this._conditionsChanged}
        ></ha-card-conditions-editor>
      </div>
    `;
  }

  private _conditionsChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const conditions = ev.detail.value;
    this._config = { ...this._config, conditions };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _soundToggled(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const checked = (ev.target as HTMLInputElement).checked;
    this._config = { ...this._config, sound: checked };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles() {
    return css`
      .editor-container {
        padding: 8px 0;
      }

      .description {
        margin: 0 0 16px;
        font-size: 14px;
        color: var(--secondary-text-color);
        line-height: 1.5;
      }

      .sound-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }

      .toggle-label {
        font-size: 14px;
        color: var(--primary-text-color);
      }
    `;
  }
}

// Explicit element registration as fallback
if (!customElements.get('confetti-card-editor')) {
  customElements.define('confetti-card-editor', ConfettiCardEditor);
}
