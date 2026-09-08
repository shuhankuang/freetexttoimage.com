import Link from "next/link";

export function Icon({ children, size = 20, ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>; }
export function SparkIcon({ size = 18 }) { return <Icon size={size}><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4Z" /></Icon>; }
export function ArrowIcon() { return <Icon size={17}><path d="M5 12h14m-5-5 5 5-5 5" /></Icon>; }
export function GridIcon() { return <Icon><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></Icon>; }
export function ImageIcon() { return <Icon><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/></Icon>; }
export function UserIcon() { return <Icon><circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4 3.5-6 8-6s7.2 2 8 6"/></Icon>; }
export function LogoutIcon() { return <Icon><path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9"/></Icon>; }
export function TrashIcon() { return <Icon size={17}><path d="M4 7h16m-10 4v5m4-5v5M9 7l1-3h4l1 3m3 0-1 13H7L6 7"/></Icon>; }
export function PlusIcon() { return <Icon size={18}><path d="M12 5v14M5 12h14"/></Icon>; }
export function Logo() { return <Link href="/" className="logo" aria-label="Forma home"><span>f</span><strong>forma<i>.</i></strong></Link>; }
