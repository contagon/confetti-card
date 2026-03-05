import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import confetti from 'canvas-confetti';

import type { ConfettiCardConfig, Condition, LegacyCondition } from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { checkConditionsMet } from './conditions';
import { playCelebrationSound } from './sound';

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
    return { conditions: [] };
  }

  @state() private config!: ConfettiCardConfig;

  /** Whether the card is being shown inside the Lovelace editor. */
  @state() private _editMode = false;

  /**
   * For condition-only mode: track whether conditions were previously met,
   * so we can detect the edge transition from false → true.
   * Starts as null to indicate "not yet evaluated" (avoids firing on load).
   */
  private _previouslyMet: boolean | null = null;

  /**
   * For trigger_entity mode: track the last_changed timestamp so we
   * detect any state change on the entity.
   */
  private _lastChanged: string | null = null;

  /**
   * HA sets .hass on every state change but often reuses the same object
   * reference. Lit's default @property would skip the update because
   * oldVal === newVal. We use a manual setter so we can check on every call.
   */
  private _hass!: HomeAssistant;

  public set hass(value: HomeAssistant) {
    this._hass = value;
    this._evaluate();
  }

  public get hass(): HomeAssistant {
    return this._hass;
  }

  public setConfig(config: ConfettiCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }
    this.config = { ...config };
    // Reset tracking state when config changes so we don't false-trigger.
    this._previouslyMet = null;
    this._lastChanged = null;
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._detectEditMode();
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

  public getCardSize(): number {
    return 0;
  }

  public getLayoutOptions() {
    return { grid_min_rows: 0, grid_rows: 0, grid_min_columns: 0, grid_columns: 'full' };
  }

  /** Fire a full-screen confetti celebration, optionally with sound. */
  private _fireConfetti(): void {
    // Play celebration sound if enabled.
    if (this.config?.sound) {
      playCelebrationSound();
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '99999';
    document.body.appendChild(canvas);

    const myConfetti = confetti.create(canvas, { resize: true });

    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      myConfetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      });
      myConfetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        // Clean up after animation finishes and particles settle.
        setTimeout(() => {
          myConfetti.reset();
          canvas.remove();
        }, 2000);
      }
    };

    frame();
  }

  /**
   * Main evaluation entry point, called on every hass update.
   *
   * Two modes:
   * 1. trigger_entity set → fire on any state change of that entity,
   *    optionally guarded by conditions (all must be met).
   * 2. trigger_entity not set → pure condition edge detection
   *    (fire when conditions transition from not-met to met).
   */
  private _evaluate(): void {
    if (!this._hass || !this.config) {
      return;
    }

    if (this.config.trigger_entity) {
      this._evaluateTriggerEntity();
    } else {
      this._evaluateConditions();
    }
  }

  /**
   * Trigger entity mode: fire confetti whenever the entity's state changes.
   * If conditions are configured, they act as a guard — confetti only
   * fires if the entity changed AND all conditions are currently met.
   */
  private _evaluateTriggerEntity(): void {
    const entityId = this.config.trigger_entity!;
    const stateObj = this._hass.states[entityId];
    if (!stateObj) {
      return;
    }

    const currentChanged = stateObj.last_changed;

    // On first load, just record the timestamp without firing.
    if (this._lastChanged === null) {
      this._lastChanged = currentChanged;
      return;
    }

    // No state change — nothing to do.
    if (currentChanged === this._lastChanged) {
      return;
    }

    this._lastChanged = currentChanged;

    // If conditions are configured, check them as a guard.
    const conditions = this.config.conditions;
    if (conditions && conditions.length > 0) {
      const met = checkConditionsMet(conditions as (Condition | LegacyCondition)[], this._hass);
      if (!met) {
        return;
      }
    }

    this._fireConfetti();
  }

  /** Condition-only mode: fire confetti on false → true edge. */
  private _evaluateConditions(): void {
    const conditions = this.config?.conditions;
    if (!conditions || conditions.length === 0) {
      return;
    }

    const met = checkConditionsMet(conditions as (Condition | LegacyCondition)[], this._hass);

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
    const parts: string[] = [];
    if (this.config?.trigger_entity) {
      parts.push(this.config.trigger_entity);
    }
    const conditionCount = this.config?.conditions?.length ?? 0;
    if (conditionCount > 0) {
      parts.push(`${conditionCount} condition${conditionCount !== 1 ? 's' : ''}`);
    }
    if (!this.config?.trigger_entity && conditionCount === 0) {
      parts.push('Not configured');
    }
    if (this.config?.sound) {
      parts.push('sound on');
    }
    const subtitle = parts.join(' · ');

    return html`
      <ha-card>
        <div class="edit-placeholder">
          <ha-icon icon="mdi:party-popper"></ha-icon>
          <div class="edit-info">
            <div class="edit-title">Confetti Card</div>
            <div class="edit-subtitle">${subtitle}</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        display: block;
      }

      /* Edit-mode placeholder */
      .edit-placeholder {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
      }

      .edit-placeholder ha-icon {
        --mdc-icon-size: 24px;
        color: var(--primary-color);
        flex-shrink: 0;
      }

      .edit-info {
        flex: 1;
        min-width: 0;
      }

      .edit-title {
        font-weight: 500;
        font-size: 16px;
        color: var(--primary-text-color);
      }

      .edit-subtitle {
        font-size: 13px;
        color: var(--secondary-text-color);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
  }
}
