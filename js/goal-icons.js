import {CATEGORY_ICON_OPTIONS,categoryIconSVG} from './categories.js?v=2.9.34';
import {GOAL_DEFAULT_ICON,normalizeGoalIcon} from './goal-appearance.js?v=2.9.34';

export const GOAL_ICON_OPTIONS=[[GOAL_DEFAULT_ICON,'Meta'],...CATEGORY_ICON_OPTIONS];
export function goalIconSVG(value){
 const key=normalizeGoalIcon(value);
 return key===GOAL_DEFAULT_ICON?'<svg class="ui-icon goal-icon-svg" aria-hidden="true"><use href="#i-target"></use></svg>':categoryIconSVG(key);
}
