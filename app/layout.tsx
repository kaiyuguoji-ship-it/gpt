import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, LayoutDashboard } from 'lucide-react';
import { centers } from '@/lib/centers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SWANYO OS · Amazon Business Platform',
  description: '面向亚马逊卖家的九大专业业务应用平台。',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <aside className="sidebar">
          <Link href="/" className="brand" aria-label="SWANYO OS 首页">
            <span className="brand-mark">S</span>
            <span className="brand-copy"><strong>SWANYO<span>.</span></strong><small>BUSINESS OPERATING SYSTEM</small></span>
          </Link>
          <div className="nav-label">WORKSPACE</div>
          <Link href="/" className="nav-link overview-link"><LayoutDashboard size={17}/><span>总览工作台</span></Link>
          <div className="nav-label app-label">APPLICATIONS <span>09</span></div>
          <nav aria-label="业务应用">
            {centers.map((center, index) => (
              <Link className="nav-link" key={center.en} href={`/centers/${index + 1}/`}>
                <center.icon size={17} strokeWidth={1.7}/>
                <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="nav-name">{center.name}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="system-state"><i/>平台工作空间</div>
            <small>SWANYO OS · V1.0</small>
          </div>
        </aside>
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Amazon Business Platform</strong></div>
            <div className="topbar-right"><span className="marketplace">日本站 <b>JP</b></span><span className="top-avatar">S</span></div>
          </header>
          {children}
          <footer className="site-footer"><span>SWANYO OS © 2026</span><span>NINE APPLICATIONS · ONE WORKSPACE</span></footer>
        </div>
      </body>
    </html>
  );
}
