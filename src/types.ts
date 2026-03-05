import { LovelaceCard, LovelaceCardConfig, LovelaceCardEditor } from 'custom-card-helpers';

declare global {
  interface HTMLElementTagNameMap {
    'confetti-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

/**
 * Condition types matching HA's frontend condition system.
 * See: home-assistant/frontend src/panels/lovelace/common/validate-condition.ts
 */
interface BaseCondition {
  condition: string;
}

export interface StateCondition extends BaseCondition {
  condition: 'state';
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

export interface NumericStateCondition extends BaseCondition {
  condition: 'numeric_state';
  entity?: string;
  below?: string | number;
  above?: string | number;
}

export interface ScreenCondition extends BaseCondition {
  condition: 'screen';
  media_query?: string;
}

export interface TimeCondition extends BaseCondition {
  condition: 'time';
  after?: string;
  before?: string;
  weekdays?: string[];
}

export interface UserCondition extends BaseCondition {
  condition: 'user';
  users?: string[];
}

export interface LocationCondition extends BaseCondition {
  condition: 'location';
  locations?: string[];
}

export interface OrCondition extends BaseCondition {
  condition: 'or';
  conditions?: Condition[];
}

export interface AndCondition extends BaseCondition {
  condition: 'and';
  conditions?: Condition[];
}

export interface NotCondition extends BaseCondition {
  condition: 'not';
  conditions?: Condition[];
}

export interface LegacyCondition {
  entity?: string;
  state?: string | string[];
  state_not?: string | string[];
}

export type Condition =
  | StateCondition
  | NumericStateCondition
  | ScreenCondition
  | TimeCondition
  | UserCondition
  | LocationCondition
  | OrCondition
  | AndCondition
  | NotCondition;

export interface ConfettiCardConfig extends LovelaceCardConfig {
  type: string;
  conditions?: (Condition | LegacyCondition)[];
  /** Play a celebration sound when confetti fires. Defaults to false. */
  sound?: boolean;
}
