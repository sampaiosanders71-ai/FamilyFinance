import { ADDITIONAL_CATEGORY_ICONS } from './category-extra-icons.js?v=2.9.42';

export const GOAL_COLORS=['blue','purple','cyan','amber','teal','pink','orange','indigo'];
export const GOAL_DEFAULT_ICON='goal-target';
const baseIcons=['tag','food','car','home','health','education','leisure','subscription','debt','investment','salary','income','benefit','refund','fuel','gift','pet','travel','more'];
const validIcons=new Set([GOAL_DEFAULT_ICON,...baseIcons,...Object.keys(ADDITIONAL_CATEGORY_ICONS)]);
export const normalizeGoalIcon=value=>validIcons.has(String(value))?String(value):GOAL_DEFAULT_ICON;
export const isGoalColor=value=>GOAL_COLORS.includes(value);
function hash(value){let result=2166136261;for(const char of String(value||'')){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;}
export function goalAppearance(goal={}){
 return {iconKey:normalizeGoalIcon(goal.icon_key),colorKey:isGoalColor(goal.color_key)?goal.color_key:GOAL_COLORS[hash(goal.id)%GOAL_COLORS.length]};
}
export function nextGoalColor(goals=[],seed=''){
 const counts=Object.fromEntries(GOAL_COLORS.map(color=>[color,0]));
 for(const goal of goals)if(goal.status!=='archived')counts[goalAppearance(goal).colorKey]++;
 const lowest=Math.min(...Object.values(counts)),available=GOAL_COLORS.filter(color=>counts[color]===lowest);
 return available[hash(seed)%available.length];
}
