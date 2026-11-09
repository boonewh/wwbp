import type { Metadata } from 'next';
import './globals.css';
import './shell.css';
import './orders.css';
import './map.css';
export const metadata: Metadata = { title: 'WWBP · Campaign room', description: 'Your World Wide Battle Plan campaigns, together in one place. Built by PathSix Solutions.', robots: { index: false, follow: false } };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
