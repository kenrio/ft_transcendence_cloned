import TermsOfServiceContent from "../components/footer/TermsOfServiceContent";
import Footer from "../components/footer/Footer";
import BackButton from "../components/BackButton";
import { LogoNavbar } from "../components/LogoNavbar";

function TermsOfService() {
	return (
		<div
			className="min-h-screen flex flex-col font-sans"
			style={{ backgroundColor: "#87ceeb" }}
		>
			{/* Navbar */}
			<LogoNavbar linkToHome />
			{/* Main Content */}
			<div className="flex-1 flex flex-col items-center p-6 overflow-y-auto">
				<div className="w-full max-w-3xl flex flex-col gap-6">
					<h1
						className="text-4xl font-black"
						style={{ color: "#6d4c41" }}
					>
						利用規約
					</h1>

					<div
						className="w-full rounded-lg p-6 md:p-8"
						style={{ backgroundColor: "#fffde7", color: "#6d4c41" }}
					>
						<TermsOfServiceContent />
					</div>
				</div>
			</div>
			<BackButton />
			<Footer />
		</div>
	);
}

export default TermsOfService;
