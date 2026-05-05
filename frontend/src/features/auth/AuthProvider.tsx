import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import { authApi } from "../../api/authApi";
import { AuthContext, type AuthContextValue } from "./authContext";
import { type AuthUser } from "../../types/user";

// 認証不要なページ
const PUBLIC_PATHS = [
	"/login",
	"/login/redirect",
	"/register",
	"/password-reset",
	"/password-reset/send-mail",
	"/terms",
	"/privacy-policy",
];

const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState<AuthUser | null>(null);

	const refreshAuth = useCallback(async () => {
		try {
			const userData = await authApi.me();
			setUser(userData);
			setIsAuthenticated(true);
			return true;
		} catch {
			// 401 を含む失敗は未ログイン扱い
			setIsAuthenticated(false);
			return false;
		}
	}, []);

	const logout = useCallback(async () => {
		try {
			await authApi.logout();
		} finally {
			setUser(null);
			setIsAuthenticated(false);
		}
	}, []);

	useEffect(() => {
		const currentPath = window.location.pathname;
		if (PUBLIC_PATHS.includes(currentPath)) return;
		// 起動時に一度だけ /api/me でログイン状態を取得する
		const t = setTimeout(() => {
			void refreshAuth();
		}, 0);
		return () => clearTimeout(t);
	}, [refreshAuth]);

	const value = useMemo<AuthContextValue>(
		() => ({
			isAuthenticated,
			refreshAuth,
			user,
			logout,
		}),
		[isAuthenticated, refreshAuth, user, logout],
	);

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};

export default AuthProvider;
