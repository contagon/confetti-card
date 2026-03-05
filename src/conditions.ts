/**
 * Client-side condition evaluation, matching HA's frontend condition system.
 * See: home-assistant/frontend src/panels/lovelace/common/validate-condition.ts
 */
import { HomeAssistant } from 'custom-card-helpers';
import type {
  Condition,
  LegacyCondition,
  StateCondition,
  NumericStateCondition,
  ScreenCondition,
  TimeCondition,
  UserCondition,
  OrCondition,
  AndCondition,
  NotCondition,
} from './types';

/**
 * Resolve a value that might be an entity ID to its current state.
 * If the value looks like a valid entity ID (domain.object_id) and exists
 * in hass.states, return that entity's state. Otherwise return the value as-is.
 */
function resolveValue(value: string | number | undefined, hass: HomeAssistant): string | number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  // Check if it looks like an entity ID (contains a dot, no spaces)
  if (value.includes('.') && !value.includes(' ') && hass.states[value]) {
    return hass.states[value].state;
  }
  return value;
}

function checkStateCondition(condition: StateCondition | LegacyCondition, hass: HomeAssistant): boolean {
  const entity = 'entity' in condition ? condition.entity : undefined;
  if (!entity) return true;

  const stateObj = hass.states[entity];
  if (!stateObj) return false;

  const currentState = stateObj.state;

  if (condition.state !== undefined) {
    const expected = Array.isArray(condition.state) ? condition.state : [condition.state];
    const resolved = expected.map((v) => String(resolveValue(v, hass)));
    return resolved.includes(currentState);
  }

  if (condition.state_not !== undefined) {
    const notExpected = Array.isArray(condition.state_not) ? condition.state_not : [condition.state_not];
    const resolved = notExpected.map((v) => String(resolveValue(v, hass)));
    return !resolved.includes(currentState);
  }

  return true;
}

function checkNumericStateCondition(condition: NumericStateCondition, hass: HomeAssistant): boolean {
  if (!condition.entity) return true;

  const stateObj = hass.states[condition.entity];
  if (!stateObj) return false;

  const value = Number(stateObj.state);
  if (isNaN(value)) return false;

  if (condition.above !== undefined) {
    const above = Number(resolveValue(condition.above, hass));
    if (isNaN(above) || value <= above) return false;
  }

  if (condition.below !== undefined) {
    const below = Number(resolveValue(condition.below, hass));
    if (isNaN(below) || value >= below) return false;
  }

  return true;
}

function checkScreenCondition(condition: ScreenCondition): boolean {
  if (!condition.media_query) return true;
  return window.matchMedia(condition.media_query).matches;
}

function checkTimeCondition(condition: TimeCondition): boolean {
  const now = new Date();

  if (condition.weekdays && condition.weekdays.length > 0) {
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayNames[now.getDay()];
    if (!condition.weekdays.includes(today)) return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (condition.after) {
    const [h, m] = condition.after.split(':').map(Number);
    if (currentMinutes < h * 60 + m) return false;
  }

  if (condition.before) {
    const [h, m] = condition.before.split(':').map(Number);
    if (currentMinutes >= h * 60 + m) return false;
  }

  return true;
}

function checkUserCondition(condition: UserCondition, hass: HomeAssistant): boolean {
  if (!condition.users || condition.users.length === 0) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userId = (hass as any).user?.id;
  if (!userId) return false;
  return condition.users.includes(userId);
}

function checkOrCondition(condition: OrCondition, hass: HomeAssistant): boolean {
  if (!condition.conditions || condition.conditions.length === 0) return true;
  return condition.conditions.some((c) => checkSingleCondition(c, hass));
}

function checkAndCondition(condition: AndCondition, hass: HomeAssistant): boolean {
  if (!condition.conditions || condition.conditions.length === 0) return true;
  return condition.conditions.every((c) => checkSingleCondition(c, hass));
}

function checkNotCondition(condition: NotCondition, hass: HomeAssistant): boolean {
  if (!condition.conditions || condition.conditions.length === 0) return true;
  return !condition.conditions.every((c) => checkSingleCondition(c, hass));
}

function checkSingleCondition(condition: Condition | LegacyCondition, hass: HomeAssistant): boolean {
  if (!('condition' in condition)) {
    // Legacy format — treat as state condition.
    return checkStateCondition(condition, hass);
  }

  switch (condition.condition) {
    case 'state':
      return checkStateCondition(condition as StateCondition, hass);
    case 'numeric_state':
      return checkNumericStateCondition(condition as NumericStateCondition, hass);
    case 'screen':
      return checkScreenCondition(condition as ScreenCondition);
    case 'time':
      return checkTimeCondition(condition as TimeCondition);
    case 'user':
      return checkUserCondition(condition as UserCondition, hass);
    case 'or':
      return checkOrCondition(condition as OrCondition, hass);
    case 'and':
      return checkAndCondition(condition as AndCondition, hass);
    case 'not':
      return checkNotCondition(condition as NotCondition, hass);
    default:
      // Unknown condition type — treat as met to avoid blocking.
      return true;
  }
}

/**
 * Evaluate an array of conditions. All must be true (AND logic at top level).
 */
export function checkConditionsMet(conditions: (Condition | LegacyCondition)[], hass: HomeAssistant): boolean {
  return conditions.every((c) => checkSingleCondition(c, hass));
}
