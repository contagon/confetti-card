import { LitElement, html, TemplateResult, css } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators.js';

import type { ConfettiCardConfig } from './types';
import { presetRegistry, getPreset, createFullScreenCanvas } from './presets';
import { normalizeSoundVolume } from './audio';
import { localize } from './localize/localize';

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
          <span class="section-description">Additional options for the confetti effect.</span>
          <label class="volume-control">
            <span>${localize('editor.sound')}: ${normalizeSoundVolume(this._config.sound)}×</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              .value=${String(normalizeSoundVolume(this._config.sound))}
              @input=${this._volumeChanged}
            />
          </label>
          <p class="description">${localize('editor.sound_help')}</p>
          <div class="sound-toggle">
            <span class="toggle-label" @click=${this._behindPopupToggled}>Render behind popups</span>
            <ha-switch .checked=${this._config.behind_popup ?? false} @change=${this._behindPopupToggled}></ha-switch>
          </div>
        </div>

        <div class="presets-section">
          <span class="section-header">Effects</span>
          <span class="section-description"> When triggered, a random enabled effect will play. </span>
          <div class="presets-grid">
            ${presetRegistry.map(
              (preset) => html`
                <div class="preset-row">
                  <div class="preset-info" .preset=${preset.id} @click=${this._presetInfoClicked}>
                    <ha-icon .icon=${preset.icon}></ha-icon>
                    <span class="preset-label">${preset.label}</span>
                  </div>
                  <div class="preset-actions">
                    <ha-switch
                      .checked=${enabled.includes(preset.id)}
                      .preset=${preset.id}
                      @change=${this._presetToggled}
                    ></ha-switch>
                    <ha-button
                      size="small"
                      appearance="filled"
                      class="test-button"
                      .preset=${preset.id}
                      @click=${this._testPreset}
                      >Try</ha-button
                    >
                  </div>
                </div>
              `,
            )}
          </div>
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

  private _volumeChanged(ev: Event): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) return;

    const volume = (ev.currentTarget as HTMLInputElement).valueAsNumber;
    this._config = { ...this._config, sound: normalizeSoundVolume(volume) };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _behindPopupToggled(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target as HTMLInputElement;
    // If clicked on the label, toggle the current value; otherwise use the switch's checked state
    const checked = target.tagName === 'HA-SWITCH' ? target.checked : !(this._config.behind_popup ?? false);
    this._config = { ...this._config, behind_popup: checked };
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

  private _presetInfoClicked(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.currentTarget as HTMLElement & { preset: string };
    const presetId = target.preset;
    const current = [...this._enabledPresets];
    const isEnabled = current.includes(presetId);

    if (isEnabled) {
      // Don't allow disabling the last preset
      if (current.length <= 1) {
        return;
      }
      const idx = current.indexOf(presetId);
      current.splice(idx, 1);
    } else {
      current.push(presetId);
    }

    this._config = { ...this._config, presets: current };
    fireEvent(this, 'config-changed', { config: this._config });
  }

  private _testPreset(ev: Event): void {
    const target = ev.currentTarget as HTMLElement & { preset: string };
    const presetId = target.preset;
    const preset = getPreset(presetId);
    if (!preset) return;

    // Create a canvas with high z-index to overlay editor
    const canvas = createFullScreenCanvas(999999);
    preset.run(canvas);
    preset.playSound(this._config?.sound);
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

      .volume-control {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin: 8px 0;
      }

      .volume-control input {
        width: 100%;
        margin: 0;
        accent-color: var(--primary-color);
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
        cursor: pointer;
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

      .presets-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        column-gap: 32px;
        row-gap: 4px;
        position: relative;
      }

      /* Draw a single continuous vertical divider down the center */
      .presets-grid::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        background-color: var(--divider-color, #e0e0e0);
      }

      .preset-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 0;
      }

      .preset-info {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
      }

      .preset-actions {
        display: flex;
        align-items: center;
        gap: 8px;
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

      .test-button {
        --ha-button-height: 28px;
      }
    `;
  }
}

// Explicit element registration as fallback
if (!customElements.get('confetti-card-editor')) {
  customElements.define('confetti-card-editor', ConfettiCardEditor);
}
