import { LitElement, html, TemplateResult, css, CSSResultGroup, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

import type { ConfettiCardConfig, Condition, LegacyCondition } from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { checkConditionsMet } from './conditions';
import { presetRegistry, pickRandomPreset, createFullScreenCanvas } from './presets';

console.info(
  `%c  CONFETTI-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray',
);

interface WindowWithCustomCards extends Window {
  customCards: Array<{ type: string; name: string; description: string }>;
}

(window as unknown as WindowWithCustomCards).customCards =
  (window as unknown as WindowWithCustomCards).customCards || [];
(window as unknown as WindowWithCustomCards).customCards.push({
  type: 'confetti-card',
  name: 'Confetti Card',
  description: 'Celebrate with confetti when conditions are met',
});

@customElement('confetti-card')
export class ConfettiCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('confetti-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      conditions: [],
      sound: false,
      presets: presetRegistry.map((p) => p.id),
    };
  }

  /**
   * Tell hui-card to keep delivering hass updates even while
   * the card is hidden, so condition evaluation continues.
   */
  public connectedWhileHidden = true;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: ConfettiCardConfig;

  /** Whether the card is being shown inside the Lovelace editor. */
  @state() private _editMode = false;

  /**
   * Track whether conditions were previously met, so we can detect the
   * edge transition from false → true and fire confetti only once.
   * Starts as null to indicate "not yet evaluated" (avoids firing on load).
   */
  private _previouslyMet: boolean | null = null;

  public setConfig(config: ConfettiCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }
    this.config = {
      ...config,
    };
    // Reset edge detection when config changes so we don't false-trigger.
    this._previouslyMet = null;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    // Always evaluate conditions when hass changes, even if we skip the render.
    if (changedProps.has('hass')) {
      this._evaluateConditions();
    }

    return true;
  }

  /**
   * HA rebuilds card elements when entering/exiting the dashboard editor,
   * so connectedCallback fires fresh each time and edit-mode detection
   * runs again automatically.
   */
  public connectedCallback(): void {
    super.connectedCallback();
    this._detectEditMode();
    this._updateCardVisibility();
  }

  /**
   * Detect if the card is being shown inside the Lovelace editor.
   * HA wraps editing cards in elements with specific tags/classes.
   */
  private _detectEditMode(): void {
    let node: Node | null = this as Node;
    while (node) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (
          tag === 'hui-card-preview' ||
          tag === 'hui-card-edit-mode' ||
          tag === 'hui-dialog-edit-card' ||
          tag.includes('edit')
        ) {
          this._editMode = true;
          return;
        }
      }
      if (node instanceof ShadowRoot) {
        node = node.host;
      } else {
        node = node.parentNode;
      }
    }
    this._editMode = false;
  }

  /**
   * Use HA's card-visibility-changed protocol to tell hui-card and
   * the layout wrappers to collapse this card's grid space when not
   * in edit mode.
   */
  private _updateCardVisibility(): void {
    if (this._editMode) {
      this.style.display = '';
      this.toggleAttribute('hidden', false);
    } else {
      this.style.display = 'none';
      this.toggleAttribute('hidden', true);
    }
    this.dispatchEvent(new Event('card-visibility-changed', { bubbles: true, cancelable: true }));
  }

  /**
   * Modern grid options matching tile card conventions.
   * Used by HA's section-based layout (2024.8+).
   */
  public getGridOptions() {
    return { columns: 12, rows: 1, min_columns: 12, min_rows: 1 };
  }

  public getCardSize(): number {
    return 1;
  }

  /** Fire a celebration effect using a random enabled preset, optionally with sound. */
  private _fireConfetti(): void {
    const enabledIds = this.config.presets!;
    const preset = pickRandomPreset(enabledIds);

    // Play preset-specific sound if enabled.
    if (this.config?.sound) {
      preset.playSound();
    }

    const canvas = createFullScreenCanvas();
    preset.run(canvas);
  }

  /** Evaluate conditions and fire confetti on false → true edge. */
  private _evaluateConditions(): void {
    if (!this.hass) {
      return;
    }

    const conditions = this.config?.conditions;
    if (!conditions || conditions.length === 0) {
      return;
    }

    const met = checkConditionsMet(conditions as (Condition | LegacyCondition)[], this.hass);

    // On first evaluation, just record the state without firing.
    if (this._previouslyMet === null) {
      this._previouslyMet = met;
      return;
    }

    // Fire confetti on the edge: conditions were NOT met, now they ARE.
    if (!this._previouslyMet && met) {
      this._fireConfetti();
    }

    this._previouslyMet = met;
  }

  protected render(): TemplateResult | void {
    // In edit mode, show a placeholder so the user can find and configure the card.
    if (this._editMode) {
      return this._renderEditPlaceholder();
    }

    // Outside edit mode the card is completely invisible — no DOM output.
    return html``;
  }

  private _renderEditPlaceholder(): TemplateResult {
    const conditionCount = this.config?.conditions?.length ?? 0;
    const presetCount = this.config.presets?.length ?? 0;
    const parts: string[] = [];
    parts.push(conditionCount > 0 ? `${conditionCount} condition${conditionCount !== 1 ? 's' : ''}` : 'No conditions');
    parts.push(`${presetCount} preset${presetCount !== 1 ? 's' : ''}`);
    if (this.config?.sound) {
      parts.push('sound on');
    }
    const subtitle = parts.join(' · ');

    return html`
      <ha-card>
        <div class="edit-placeholder">
          <ha-icon icon="mdi:party-popper"></ha-icon>
          <span class="edit-title">Confetti Card</span>
          <span class="edit-subtitle">${subtitle}</span>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
        /* Fill the grid cell so ha-card's height:100% works correctly. */
        height: 100%;
        overflow: hidden;
      }

      ha-card {
        height: 100%;
      }

      /* Edit-mode placeholder — matches tile card interior spacing. */
      .edit-placeholder {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        box-sizing: border-box;
        height: 100%;
        min-width: 0;
        /* Reclaim the ha-card border space, same as tile card's .container */
        margin: calc(-1 * var(--ha-card-border-width, 1px));
      }

      .edit-placeholder ha-icon {
        --mdc-icon-size: 24px;
        color: var(--primary-color);
        flex-shrink: 0;
      }

      .edit-title {
        font-weight: 500;
        font-size: 14px;
        color: var(--primary-text-color);
        white-space: nowrap;
      }

      .edit-subtitle {
        font-size: 12px;
        color: var(--secondary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-left: auto;
      }
    `;
  }
}
