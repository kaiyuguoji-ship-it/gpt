import '@fontsource-variable/inter';
import './globals.css';
import './theme.css';
import './market.css';
import './admin.css';
export const metadata = { title: 'SWANYO · 管理后台' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="zh-CN"><body>{children}</body></html>; }
