const TermsOfServiceContent = () => {
	return (
		<div
			className="text-sm leading-relaxed whitespace-pre-line"
			style={{ color: "#6d4c41" }}
		>
			<p className="text-xs" style={{ color: "#9e7b6a" }}>
				制定日：2025年3月7日
			</p>

			<p>
				この利用規約（以下「本規約」といいます）は、42Tokyo学生チーム（以下「私たち」といいます）が提供するサービス「お絵描きアイランド」（以下「本サービス」といいます）の利用条件を定めるものです。ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。
			</p>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第1条（適用）</h2>
				<p>
					本規約は、ユーザーと私たちの間の本サービスの利用に関わる一切の関係に適用されるものとします。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第2条（禁止事項）</h2>
				<p>
					ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。
				</p>
				<ul className="list-disc list-inside space-y-1 pl-2">
					<li>
						公序良俗に反する行為、または不適切な画像・名前の使用
					</li>
					<li>
						他のユーザーに対する嫌がらせ、誹謗中傷、または迷惑行為
					</li>
					<li>
						本サービスのサーバーやネットワークの機能を破壊・妨害する行為
					</li>
					<li>本サービスの運営を妨げ、またはそのおそれのある行為</li>
					<li>その他、私たちが不適切と判断する行為</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">
					第3条（本サービスの提供の停止等）
				</h2>
				<p>
					私たちは、学習・研究目的のプロジェクトである特性上、予告なく本サービスの内容を変更、中断、または終了することがあります。これによりユーザーに生じた不利益について、一切の責任を負わないものとします。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第4条（免責事項）</h2>
				<ul className="list-disc list-inside space-y-1 pl-2">
					<li>
						本サービスは現状有姿で提供されるものであり、事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティ等の欠陥、エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しておりません。
					</li>
					<li>
						私たちは、本サービスに起因してユーザーに生じたあらゆる損害について、一切の責任を負いません。
					</li>
				</ul>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">第5条（利用規約の変更）</h2>
				<p>
					私たちは、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
				</p>
			</section>

			<section className="space-y-2">
				<h2 className="font-bold text-base">
					第6条（準拠法・裁判管轄）
				</h2>
				<p>
					本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、東京地方裁判所を専属的合意管轄とします。
				</p>
			</section>

			<p className="text-xs pt-2" style={{ color: "#9e7b6a" }}>
				以上
			</p>
		</div>
	);
};

export default TermsOfServiceContent;
