import { createContext } from "react";
import { type AuthUser } from "../../types/user";

export type AuthContextValue = {
	isAuthenticated: boolean;
	user: AuthUser | null;
	refreshAuth: () => Promise<boolean>;
	logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
