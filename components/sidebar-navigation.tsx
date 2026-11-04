'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { centers } from '@/lib/centers';

export function SidebarNavigation() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  return (
    <>
      <div className="nav-label">WORKSPACE</div>
      <Link href="/" className="nav-link overview-link" aria-current={isHome ? 'page' : undefined}>
        <LayoutDashboard size={17}/><span>总览工作台</span>
      </Link>
      <div className="nav-label app-label">APPLICATIONS <span>09</span></div>
      <nav aria-label="业务应用">
        {centers.map((center, index) => {
          const href = `/centers/${index + 1}/`;
          const active = pathname === href || pathname === href.slice(0, -1);
          return (
            <Link className="nav-link" key={center.en} href={href} aria-current={active ? 'page' : undefined}>
              <center.icon size={17} strokeWidth={1.7}/>
              <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="nav-name">{center.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
