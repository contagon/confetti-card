import { LitElement, html, TemplateResult, css, CSSResultGroup } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import confetti from 'canvas-confetti';

import type { ConfettiCardConfig, Condition, LegacyCondition } from './types';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { checkConditionsMet } from './conditions';

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
   * Track whether conditions were previously met, so we can detect the
   * edge transition from false → true and fire confetti only once.
   * Starts as null to indicate "not yet evaluated" (avoids firing on load).
   */
  private _previouslyMet: boolean | null = null;

  /**
   * HA sets .hass on every state change but often reuses the same object
   * reference. Lit's default @property would skip the update because
   * oldVal === newVal. We use a manual setter so we can check conditions
   * on every call.
   */
  private _hass!: HomeAssistant;

  public set hass(value: HomeAssistant) {
    this._hass = value;
    this._evaluateConditions();
  }

  public get hass(): HomeAssistant {
    return this._hass;
  }

  public setConfig(config: ConfettiCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }
    this.config = { ...config };
    // Reset edge detection when config changes so we don't false-trigger.
    this._previouslyMet = null;
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

  /** Fire a full-screen confetti celebration. */
  private _fireConfetti(): void {
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

  /** Evaluate conditions and fire confetti on false → true edge. */
  private _evaluateConditions(): void {
    if (!this._hass) {
      return;
    }

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
    const conditionCount = this.config?.conditions?.length ?? 0;
    const subtitle =
      conditionCount > 0
        ? `${conditionCount} condition${conditionCount !== 1 ? 's' : ''} configured`
        : 'No conditions configured';

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
