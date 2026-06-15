import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Users, LayoutGrid, CalendarClock, PackageCheck, Calculator,
  Download, Upload, Printer, Menu, X, Heart
} from 'lucide-react';
import { useWeddingStore } from '@/store/useWeddingStore';
import { downloadJSON, triggerPrint } from '@/utils/export';

const navItems = [
  { to: '/guests', label: '宾客清单', icon: Users },
  { to: '/tables', label: '桌位编排', icon: LayoutGrid },
  { to: '/schedule', label: '流程单', icon: CalendarClock },
  { to: '/items', label: '物品清单', icon: PackageCheck },
  { to: '/budget', label: '预算管理', icon: Calculator },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const store = useWeddingStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ioMenuOpen, setIoMenuOpen] = useState(false);
  const fileInputRef = (typeof document !== 'undefined') ? { current: null as HTMLInputElement | null } : { current: null };

  const handleExport = () => {
    const data = store.exportData();
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    downloadJSON(`婚礼筹备数据_${dateStr}.json`, data);
    setIoMenuOpen(false);
  };

  const handleImportClick = () => {
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const json = ev.target?.result as string;
            if (confirm('导入数据将覆盖当前所有数据，确定继续吗？')) {
              store.importData(json);
              alert('导入成功！');
              navigate('/guests');
            }
          } catch {
            alert('文件格式错误，请选择正确的JSON文件');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
    setIoMenuOpen(false);
  };

  const handleReset = () => {
    if (confirm('确定重置为初始示例数据？所有当前修改将丢失！')) {
      store.resetAll();
    }
    setIoMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 no-print">
        <div className="bg-gradient-to-r from-rose-200/90 via-rose-300/90 to-champagne-200/90 backdrop-blur-md border-b border-rose-200/50 shadow-soft">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button
              onClick={() => navigate('/guests')}
              className="flex items-center gap-2 shrink-0 group"
            >
              <Heart className="w-7 h-7 text-rose-500 fill-rose-300 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline font-serif text-xl font-bold text-ink-900 tracking-wide">
                婚礼筹备助手
              </span>
              <span className="sm:hidden font-serif text-lg font-bold text-ink-900">
                婚礼助手
              </span>
            </button>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white text-rose-600 shadow-soft'
                        : 'text-ink-700 hover:bg-white/60 hover:text-rose-600'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1.5 relative">
              <button
                onClick={triggerPrint}
                className="hidden sm:inline-flex btn-outline !py-1.5 !px-3"
                title="打印当前页"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">打印</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setIoMenuOpen(v => !v)}
                  className="hidden sm:inline-flex btn-outline !py-1.5 !px-3"
                  title="数据导入导出"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline">数据</span>
                </button>
                {ioMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-hover border border-rose-100 py-1 animate-fade-in z-50">
                    <button
                      onClick={handleExport}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />导出备份
                    </button>
                    <button
                      onClick={handleImportClick}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />导入恢复
                    </button>
                    <div className="h-px bg-rose-100 my-1" />
                    <button
                      onClick={handleReset}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      重置示例数据
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="lg:hidden btn-ghost !p-2"
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="lg:hidden border-t border-rose-200/50 animate-fade-in">
              <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white text-rose-600 shadow-soft'
                          : 'text-ink-700 hover:bg-white/60 hover:text-rose-600'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span>{label}</span>
                  </NavLink>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={triggerPrint} className="btn-outline flex-1">
                    <Printer className="w-4 h-4" />打印
                  </button>
                  <button onClick={handleExport} className="btn-secondary flex-1">
                    <Download className="w-4 h-4" />导出
                  </button>
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8 animate-fade-in">
        {children}
      </main>

      <footer className="no-print py-6 text-center text-xs text-ink-500 border-t border-rose-100/50">
        <p>💍 用心筹备，爱在此刻 · 数据已自动保存至本地浏览器</p>
      </footer>
    </div>
  );
}
