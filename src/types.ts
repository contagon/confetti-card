import { LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'confetti-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

export interface ConfettiCardConfig extends LovelaceCardConfig {
  type: string;
  entity?: string;
}
