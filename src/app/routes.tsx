import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Dashboard } from "./components/Dashboard";
import { MyKeys } from "./components/MyKeys";
import { About } from "./components/About";
import { NotFound } from "./components/NotFound";
import { TelegramCallback } from "./components/TelegramCallback";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/register",
    Component: Register,
  },
  {
    path: "/auth/telegram/callback",
    Component: TelegramCallback,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Dashboard },
      { path: "my-keys", Component: MyKeys },
      { path: "about", Component: About },
      { path: "*", Component: NotFound },
    ],
  },
]);
