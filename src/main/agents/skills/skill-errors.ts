export class SkillError extends Error {
	constructor(
		public readonly skillName: string,
		message: string,
		public readonly cause?: unknown
	) {
		super(message);
		this.name = 'SkillError';
	}
}

export class SkillLoadError extends SkillError {
	constructor(skillName: string, message: string, cause?: unknown) {
		super(skillName, message, cause);
		this.name = 'SkillLoadError';
	}
}

export class SkillNotFoundError extends SkillError {
	constructor(skillName: string) {
		super(skillName, `Unknown skill: ${skillName}`);
		this.name = 'SkillNotFoundError';
	}
}

export class SkillValidationError extends SkillError {
	constructor(skillName: string, message: string) {
		super(skillName, message);
		this.name = 'SkillValidationError';
	}
}
