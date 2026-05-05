const Footer = () => {
	return (
		<div className="py-4 text-center">
			<p className="flex flex-wrap justify-center gap-4 text-base">
				<a
					href="/terms"
					className="text-amber-800 hover:text-amber-700 transition-colors"
				>
					利用規約
				</a>
				<a
					href="/privacy-policy"
					className="text-amber-800 hover:text-amber-700 transition-colors"
				>
					プライバシーポリシー
				</a>
			</p>
		</div>
	);
};

export default Footer;
