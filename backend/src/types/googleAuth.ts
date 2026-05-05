export type OAuthState = {
	nonce: string;
	mode: "login" | "register";
};

export type GoogleAuthQuerystring = {
	mode?: string;
};

export type GoogleCallbackQuerystring = {
	code?: string;
	error?: string;
	state?: string;
};

export type GoogleUserInfo = {
	sub: string;
	email: string;
	email_verified: boolean;
	name: string;
	picture: string;
	given_name: string;
	family_name: string;
};
