'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LayoutDashboard, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { centers } from '@/lib/centers';

export function SidebarNavigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('swanyo-sidebar-collapsed') === 'true');
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem('swanyo-sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-brand-row">
        <Link href="/" className="brand" aria-label="SWANYO OS 首页" title="SWANYO OS">
          <span className="brand-mark">S</span>
          <span className="brand-copy"><strong>SWANYO<span>.</span></strong><small>BUSINESS OPERATING SYSTEM</small></span>
        </Link>
        <button
          className="sidebar-toggle"
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
          title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          {collapsed ? <PanelLeftOpen size={17}/> : <PanelLeftClose size={17}/>}
        </button>
      </div>

      <div className="nav-label">WORKSPACE</div>
      <Link href="/" title="总览工作台" className="nav-link overview-link" aria-current={isHome ? 'page' : undefined}>
        <LayoutDashboard size={17}/><span>总览工作台</span>
      </Link>
      <div className="nav-label app-label">APPLICATIONS <span>09</span></div>
      <nav aria-label="业务应用">
        {centers.map((center, index) => {
          const href = `/centers/${index + 1}/`;
          const active = pathname === href || pathname === href.slice(0, -1);
          return (
            <Link className="nav-link" key={center.en} href={href} title={center.name} aria-current={active ? 'page' : undefined}>
              <center.icon size={17} strokeWidth={1.7}/>
              <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="nav-name">{center.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="system-state"><i/><span>平台工作空间</span></div>
        <small>SWANYO OS · V1.0</small>
      </div>
    </aside>
  );
}
