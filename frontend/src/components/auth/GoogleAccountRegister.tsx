import { getBackendBaseUrl } from "../../api/backendUrl";

export function GoogleAccountRegister() {
	const handleGoogleAuth = () => {
		window.location.href = `${getBackendBaseUrl()}/v1/auth/google/auth?mode=register`;
	};

	return (
		<button
			type="button"
			className="px-3 py-2 rounded w-full font-bold cursor-pointer text-white bg-[#4d8fff] hover:bg-[#3277EC] transition-colors"
			onClick={handleGoogleAuth}
		>
			<span className="inline-flex items-center gap-2">
				<span className="i" aria-hidden="true">
					G
				</span>
				Googleアカウントで登録
			</span>
		</button>
	);
}
