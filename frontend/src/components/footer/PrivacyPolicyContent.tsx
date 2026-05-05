const PrivacyPolicyContent = () => {
	return (
		<div
			className="text-sm leading-relaxed space-y-6"
			style={{ color: "#6d4c41" }}
		>
			<p className="text-xs" style={{ color: "#9e7b6a" }}>
				制定日：2025年3月7日
			</p>

			<p>
				42Tokyo学生チーム（以下「私たち」といいます）は、本サービス「お絵描きアイランド」（以下「本サービス」といいます）における、ユーザーの情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます）を定めます。
				本サービスは営利目的ではなく、学習・研究を目的として運営されています。
			</p>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第1条（収集する情報）</h2>
				<p>本サービスでは、以下の情報を収集します。</p>
				<ul className="list-disc list-inside space-y-1 pl-2">
					<li>ユーザー名</li>
					<li>アバター画像</li>
					<li>ゲームのスコアおよびプレイ履歴</li>
					<li>認証のために使用するCookie情報</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第2条（情報の利用目的）</h2>
				<p>収集した情報は、以下の目的のみに利用します。</p>
				<ul className="list-disc list-inside space-y-1 pl-2">
					<li>本サービスのアカウント管理およびログイン機能の提供</li>
					<li>ゲームのプレイ結果・スコアの記録と表示</li>
					<li>サービスの改善および不正利用の防止</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第3条（Cookieの利用）</h2>
				<p>
					本サービスでは、ログイン状態の維持を目的として Cookie
					を使用しています。Cookie
					はユーザーの認証情報を安全に管理するためにのみ使用し、広告や追跡目的には一切使用しません。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第4条（第三者への提供）</h2>
				<p>
					私たちは、法令に基づく場合を除き、ユーザーの情報を第三者に提供・販売・共有することは一切ありません。また、本サービスでは外部の広告・分析サービスは使用していません。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第5条（情報の管理）</h2>
				<p>
					収集した情報は、不正アクセス・紛失・改ざん等を防ぐため、適切な管理を行います。ただし、本サービスは学習目的で運営されており、商用サービスと同水準のセキュリティを保証するものではありません。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">
					第6条（本ポリシーの変更）
				</h2>
				<p>
					本ポリシーの内容は、必要に応じて変更することがあります。変更後のポリシーは本ページに掲載した時点から効力を生じるものとします。
				</p>
			</section>

			<p className="text-xs pt-2" style={{ color: "#9e7b6a" }}>
				以上
			</p>
		</div>
	);
};

export default PrivacyPolicyContent;
