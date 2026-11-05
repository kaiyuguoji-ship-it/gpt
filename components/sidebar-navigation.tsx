'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings2 } from 'lucide-react';
import { centers } from '@/lib/centers';

export function SidebarNavigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 760px)');
    try { setCollapsed(narrow.matches || window.localStorage.getItem('swanyo-sidebar-collapsed') === 'true'); }
    catch { setCollapsed(narrow.matches); }
    const onResize = (event: MediaQueryListEvent) => { if (event.matches) setCollapsed(true); };
    narrow.addEventListener('change', onResize);
    return () => narrow.removeEventListener('change', onResize);
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      try { window.localStorage.setItem('swanyo-sidebar-collapsed', String(next)); } catch { /* Keep the toggle usable without storage. */ }
      return next;
    });
  }

  return (
    <aside className={`navigation-rail ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="rail-header">
        <Link href="/" className="rail-brand" aria-label="SWANYO OS 首页" title="SWANYO OS">
          <span className="rail-mark">S</span>
          <span className="rail-brand-copy"><strong>SWANYO<span>.</span></strong><small>BUSINESS OPERATING SYSTEM</small></span>
        </Link>
        <button
          className="rail-toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-controls="business-navigation"
          onClick={toggleSidebar}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}
        </button>
      </div>
      <div className="rail-main">
        <div className="rail-label">WORKSPACE</div>
        <Link href="/" title="总览工作台" className="rail-link rail-overview" aria-current={isHome ? 'page' : undefined}>
          <LayoutDashboard size={17}/><span className="rail-name">总览工作台</span>
        </Link>
        <div className="rail-label rail-app-label">APPLICATIONS <span>09</span></div>
        <nav id="business-navigation" aria-label="业务应用">
          {centers.map((center, index) => {
            const href = `/centers/${index + 1}/`;
            const active = pathname === href || pathname === href.slice(0, -1);
            return (
              <Link className="rail-link" key={center.en} href={href} title={center.name} aria-current={active ? 'page' : undefined}>
                <center.icon size={17} strokeWidth={1.7}/>
                <span className="rail-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="rail-name">{center.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <Link href="/admin/" title="后端管理" className="rail-link" aria-current={pathname.startsWith('/admin') ? 'page' : undefined}><Settings2 size={17}/><span className="rail-name">后端管理</span></Link>
      <div className="rail-footer">
        <div className="rail-state"><i/><span>平台工作空间</span></div>
        <small>SWANYO OS · V1.0</small>
      </div>
    </aside>
  );
}
