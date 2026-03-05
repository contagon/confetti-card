import { LitElement, html, TemplateResult, css, nothing } from 'lit';
import { HomeAssistant, fireEvent, LovelaceCardEditor } from 'custom-card-helpers';
import { customElement, property, state } from 'lit/decorators.js';

import type { ConfettiCardConfig } from './types';

@customElement('confetti-card-editor')
export class ConfettiCardEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: ConfettiCardConfig;

  /** Filters the entity dropdown. */
  @state() private _entityFilter = '';

  public setConfig(config: ConfettiCardConfig): void {
    this._config = { ...config };
  }

  protected shouldUpdate(): boolean {
    return true;
  }

  /**
   * Return a sorted list of entity IDs, optionally filtered by the
   * user's search string.
   */
  private _getFilteredEntities(): string[] {
    if (!this.hass) {
      return [];
    }
    const all = Object.keys(this.hass.states).sort();
    if (!this._entityFilter) {
      return all;
    }
    const lower = this._entityFilter.toLowerCase();
    return all.filter((id) => id.toLowerCase().includes(lower));
  }

  protected render(): TemplateResult | void {
    if (!this.hass || !this._config) {
      return html`<div>Loading...</div>`;
    }

    const hasTriggerEntity = !!this._config.trigger_entity;

    return html`
      <div class="editor-container">
        <!-- Trigger entity picker -->
        <div class="section">
          <div class="section-header">Trigger entity (optional)</div>
          <p class="description">
            If set, confetti fires whenever this entity's state changes. Conditions below act as a guard — confetti only
            fires if conditions are also met.
          </p>
          <div class="entity-picker">
            <input
              type="text"
              class="entity-search"
              placeholder="Search entities..."
              .value=${this._entityFilter}
              @input=${this._entityFilterChanged}
            />
            <select class="entity-select" @change=${this._triggerEntityChanged}>
              <option value="" ?selected=${!hasTriggerEntity}>— None —</option>
              ${this._getFilteredEntities().map(
                (entityId) =>
                  html`<option value=${entityId} ?selected=${entityId === this._config!.trigger_entity}>
                    ${entityId}
                  </option>`,
              )}
            </select>
          </div>
        </div>

        <!-- Conditions -->
        <div class="section">
          <div class="section-header">Conditions</div>
          <p class="description">
            ${hasTriggerEntity
              ? html`Conditions act as a <strong>guard</strong> — confetti only fires when the trigger entity changes
                  <em>and</em> all conditions are met.`
              : html`Confetti fires when all conditions transition from <strong>not met</strong> to
                  <strong>met</strong> (edge detection).`}
            ${!hasTriggerEntity && (!this._config.conditions || this._config.conditions.length === 0)
              ? html`<br /><em>Add at least one condition, or set a trigger entity above.</em>`
              : nothing}
          </p>
          <ha-card-conditions-editor
            .hass=${this.hass}
            .conditions=${this._config.conditions ?? []}
            @value-changed=${this._conditionsChanged}
          ></ha-card-conditions-editor>
        </div>

        <!-- Sound toggle -->
        <div class="section">
          <label class="toggle-row">
            <span class="toggle-label">Play celebration sound</span>
            <input type="checkbox" .checked=${this._config.sound ?? false} @change=${this._soundToggled} />
          </label>
        </div>
      </div>
    `;
  }

  private _entityFilterChanged(ev: Event): void {
    this._entityFilter = (ev.target as HTMLInputElement).value;
  }

  private _triggerEntityChanged(ev: Event): void {
    if (!this._config || !this.hass) {
      return;
    }
    const value = (ev.target as HTMLSelectElement).value;
    if (value) {
      this._config = { ...this._config, trigger_entity: value };
    } else {
      // Remove trigger_entity from config when set to "None".
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { trigger_entity: _removed, ...rest } = this._config;
      this._config = rest as ConfettiCardConfig;
    }
    fireEvent(this, 'config-changed', { config: this._config });
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

      .section {
        margin-bottom: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }

      .section:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }

      .section-header {
        font-size: 14px;
        font-weight: 500;
        color: var(--primary-text-color);
        margin-bottom: 4px;
      }

      .description {
        margin: 0 0 12px;
        font-size: 13px;
        color: var(--secondary-text-color);
        line-height: 1.5;
      }

      .entity-picker {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .entity-search {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        font-size: 14px;
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
        box-sizing: border-box;
        outline: none;
      }

      .entity-search:focus {
        border-color: var(--primary-color);
      }

      .entity-search::placeholder {
        color: var(--secondary-text-color);
      }

      .entity-select {
        width: 100%;
        padding: 8px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 4px;
        font-size: 14px;
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
        box-sizing: border-box;
        cursor: pointer;
      }

      .entity-select:focus {
        border-color: var(--primary-color);
        outline: none;
      }

      .toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
      }

      .toggle-label {
        font-size: 14px;
        color: var(--primary-text-color);
      }

      input[type='checkbox'] {
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--primary-color);
      }
    `;
  }
}

// Explicit element registration as fallback
if (!customElements.get('confetti-card-editor')) {
  customElements.define('confetti-card-editor', ConfettiCardEditor);
}
