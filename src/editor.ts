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

  private get _buttonEntities(): Array<{ id: string; name: string }> {
    if (!this.hass) return [];
    return Object.keys(this.hass.states)
      .filter((eid) => eid.startsWith('button.'))
      .map((eid) => ({
        id: eid,
        name: this.hass.states[eid]?.attributes?.friendly_name || eid,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    const entities = this._buttonEntities;
    const currentEntity = this._config.entity || '';

    return html`
      <div class="editor-container">
        <label for="entity-select">Button Entity (Required)</label>
        <select id="entity-select" .value=${currentEntity} @change=${this._entityChanged}>
          <option value="">-- Select a button entity --</option>
          ${entities.map(
            (e) => html` <option value=${e.id} ?selected=${e.id === currentEntity}>${e.name} (${e.id})</option> `,
          )}
        </select>
        <p class="hint">Select a button entity. When the button is pressed, confetti will appear on screen.</p>
      </div>
    `;
  }

  private _entityChanged(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }

    const select = ev.target as HTMLSelectElement;
    const newValue = select.value;

    if (this._config.entity === newValue) {
      return;
    }

    if (!newValue || newValue === '') {
      const tmpConfig = { ...this._config };
      delete tmpConfig.entity;
      this._config = tmpConfig;
    } else {
      this._config = {
        ...this._config,
        entity: newValue,
      };
    }

    fireEvent(this, 'config-changed', { config: this._config });
  }

  static get styles() {
    return css`
      .editor-container {
        padding: 8px 0;
      }

      label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        margin-bottom: 8px;
      }

      select {
        display: block;
        width: 100%;
        padding: 10px 12px;
        font-size: 14px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        appearance: auto;
        cursor: pointer;
      }

      select:focus {
        outline: none;
        border-color: var(--primary-color);
      }

      .hint {
        margin-top: 12px;
        font-size: 12px;
        color: var(--secondary-text-color);
        line-height: 1.4;
      }
    `;
  }
}

// Explicit element registration as fallback
if (!customElements.get('confetti-card-editor')) {
  customElements.define('confetti-card-editor', ConfettiCardEditor);
}
