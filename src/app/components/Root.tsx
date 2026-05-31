import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { Menu, X, User, Key, Info, LogOut } from "lucide-react";
import { Logo } from "./Logo";

export function Root() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const auth = localStorage.getItem("vpn_authenticated");
    if (!auth) {
      navigate("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("vpn_authenticated");
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
      {/* Glass effect background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-white/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-gray-300/20 rounded-full blur-3xl" />
      </div>

      {/* Sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white/60 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col h-full p-6">
          {/* Logo */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <h1 className="text-xl font-semibold text-gray-900">Кофемания VPN</h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
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
                      ? "bg-gray-900 text-white shadow-lg"
                      : "text-gray-700 hover:bg-white/60 hover:shadow-md"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="bg-white/60 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="lg:block hidden">
              <h2 className="text-2xl font-semibold text-gray-900">
                {navItems.find((item) => item.path === location.pathname)?.label || ""}
              </h2>
            </div>
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 relative z-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
