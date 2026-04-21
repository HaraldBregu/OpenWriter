import type { Skill } from '../types';
import { outlineSkill } from './outline-skill';
import { rewriteSkill } from './rewrite-skill';
import { summarizeSkill } from './summarize-skill';
import { expandSkill } from './expand-skill';
import { illustrateSkill } from './illustrate-skill';

export { outlineSkill } from './outline-skill';
export { rewriteSkill } from './rewrite-skill';
export { summarizeSkill } from './summarize-skill';
export { expandSkill } from './expand-skill';
export { illustrateSkill } from './illustrate-skill';

export const bundledSkills: readonly Skill[] = [
	outlineSkill,
	rewriteSkill,
	summarizeSkill,
	expandSkill,
	illustrateSkill,
];
