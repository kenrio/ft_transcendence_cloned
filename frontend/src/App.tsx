import {
	createBrowserRouter,
	Outlet,
	Navigate,
	RouterProvider,
	useParams,
} from "react-router-dom";
import "./App.css";
import Home from "./pages/Home";
import Waiting from "./pages/Waiting";
import Prepare from "./pages/Prepare";
import Game from "./pages/Game";
import Result from "./pages/Result";
import TermsOfService from "./pages/TermsOfService";
import AccountRegister from "./pages/AccountRegister";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import SetupProfile from "./pages/SetupProfile";
import RequireAuth from "./features/auth/RequireAuth";
import RequireGuest from "./features/auth/RequireGuest";

const RoomsRedirect = () => {
	const { roomId } = useParams<{ roomId: string }>();
	return <Navigate to={roomId ? `/waiting/${roomId}` : "/"} replace />;
};

const router = createBrowserRouter([
	{
		path: "/login",
		element: (
			<RequireGuest>
				<Login />
			</RequireGuest>
		),
	},
	{
		path: "/register",
		element: (
			<RequireGuest>
				<AccountRegister />
			</RequireGuest>
		),
	},
	{
		path: "/",
		element: (
			<RequireAuth>
				<Outlet />
			</RequireAuth>
		),
		children: [
			{ index: true, element: <Home /> },
			{ path: "rooms/:roomId", element: <RoomsRedirect /> },
			{ path: "waiting/:id", element: <Waiting /> },
			{ path: "prepare/:id", element: <Prepare /> },
			{ path: "game/:id", element: <Game /> },
			{ path: "result/:id", element: <Result /> },
			{ path: "profile", element: <Profile /> },
			{ path: "setup-profile", element: <SetupProfile /> },
		],
	},
	{ path: "/terms", element: <TermsOfService /> },
	{ path: "/privacy-policy", element: <PrivacyPolicy /> },
]);

const App = () => {
	return <RouterProvider router={router} />;
};

export default App;
