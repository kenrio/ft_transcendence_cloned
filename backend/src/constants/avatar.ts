export const DEFAULT_AVATAR = "👤";

export const avatarOrDefault = (avatar: string | null | undefined): string =>
	avatar ?? DEFAULT_AVATAR;
