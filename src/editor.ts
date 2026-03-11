import { LitElement, html, TemplateResult, css } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators.js';

import type { ConfettiCardConfig } from './types';
import { presetRegistry } from './presets';

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

  private get _enabledPresets(): string[] {
    return this._config?.presets ?? [];
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    const enabled = this._enabledPresets;

    return html`
      <div class="editor-container">
        <div class="misc-section">
          <span class="section-header">Misc</span>
          <div class="sound-toggle">
            <span class="toggle-label">Play celebration sound</span>
            <ha-switch .checked=${this._config.sound ?? false} @change=${this._soundToggled}></ha-switch>
          </div>
        </div>

        <div class="presets-section">
          <span class="section-header">Effects</span>
          <span class="section-description"> When triggered, a random enabled effect will play. </span>
          ${presetRegistry.map(
            (preset) => html`
              <div class="preset-row">
                <ha-switch
                  .checked=${enabled.includes(preset.id)}
                  .preset=${preset.id}
                  @change=${this._presetToggled}
                ></ha-switch>
                <ha-icon .icon=${preset.icon}></ha-icon>
                <span class="preset-label">${preset.label}</span>
              </div>
            `,
          )}
        </div>

        <div class="conditions-section">
          <span class="section-header">Conditions</span>
          <p class="description">
            Confetti will fire when <strong>all</strong> conditions below become true. Add conditions to control when
            the celebration appears.
          </p>
          <ha-card-conditions-editor
            .hass=${this.hass}
            .conditions=${this._config.conditions ?? []}
            @value-changed=${this._conditionsChanged}
          ></ha-card-conditions-editor>
        </div>
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

  private _presetToggled(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as HTMLInputElement & { preset: string };
    const presetId = target.preset;
    const checked = target.checked;
    const current = [...this._enabledPresets];

    if (checked && !current.includes(presetId)) {
      current.push(presetId);
    } else if (!checked) {
      const idx = current.indexOf(presetId);
      if (idx !== -1) {
        // Don't allow disabling the last preset
        if (current.length <= 1) {
          // Re-check the toggle since we're preventing the change
          target.checked = true;
          return;
        }
        current.splice(idx, 1);
      }
    }

    this._config = { ...this._config, presets: current };
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
        padding: 8px 0;
      }

      .toggle-label {
        font-size: 14px;
        color: var(--primary-text-color);
      }

      .misc-section {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }

      .conditions-section {
      }

      .presets-section {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }

      .section-header {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        margin-bottom: 4px;
      }

      .section-description {
        display: block;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-bottom: 12px;
      }

      .preset-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 0 8px 24px;
      }

      .preset-row ha-icon {
        --mdc-icon-size: 20px;
        color: var(--secondary-text-color);
        flex-shrink: 0;
      }

      .preset-label {
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
