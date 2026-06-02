import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Menu, X, User, Key, Info, LogOut } from "lucide-react";
import { Logo } from "./Logo";
import { authApi, clearSession } from "../../lib/api";

export function Root() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("vpn_token");

    if (!token) {
      clearSession();
      navigate("/login");
      return;
    }

    authApi
      .me()
      .then(() => setIsAuthenticated(true))
      .catch((err) => {
        console.error("Auth verification failed:", err);
        clearSession();
        navigate("/login");
      });
  }, [navigate]);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const navItems = [
    { path: "/", label: "Личный кабинет", icon: User },
    { path: "/my-keys", label: "Мои ключи", icon: Key },
    { path: "/about", label: "О нас", icon: Info },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-coffee-milk via-coffee-cappuccino/40 to-coffee-latte/30 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-coffee-milk/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-coffee-mocha/15 rounded-full blur-3xl" />
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-coffee-espresso/25 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 surface-glass border-r border-coffee-latte/40 shadow-coffee-xl z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-xl font-semibold text-coffee-espresso">Кофемания VPN</h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-coffee-cappuccino/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-coffee-espresso" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? "bg-coffee-espresso text-coffee-milk shadow-coffee-lg"
                      : "text-coffee-espresso/80 hover:bg-coffee-cappuccino/70 hover:shadow-coffee"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-coffee-espresso/80 hover:bg-red-50 hover:text-red-700 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      <div className="lg:ml-72 min-h-screen">
        <header className="surface-glass border-b border-coffee-latte/40 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-coffee-cappuccino/60 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-coffee-espresso" />
            </button>
            <div className="lg:block hidden">
              <h2 className="text-2xl font-semibold text-coffee-espresso">
                {navItems.find((item) => item.path === location.pathname)?.label || ""}
              </h2>
            </div>
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
          </div>
        </header>

        <main className="p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
