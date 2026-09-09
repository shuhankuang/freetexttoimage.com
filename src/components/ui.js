import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  Copy,
  Download,
  Dices,
  Image as ImageGlyph,
  ImagePlus,
  LayoutGrid,
  Languages,
  LogOut,
  Plus,
  Sparkle,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

// lucide 图标统一套一层薄包装：
// 保持原手写 SVG 的细线性风格（stroke 1.7）与各图标原本的默认尺寸，
// 使所有调用处（<SparkIcon size={15}/> 等）用法与观感都不变。
function appIcon(Glyph, defaultSize) {
  return function AppGlyph({ size = defaultSize, strokeWidth = 1.7, ...props }) {
    return <Glyph size={size} strokeWidth={strokeWidth} {...props} />;
  };
}

export const SparkIcon = appIcon(Sparkle, 18);
export const CheckIcon = appIcon(Check, 14);
export const SparklesIcon = appIcon(Sparkles, 16);
export const ArrowIcon = appIcon(ArrowRight, 17);
export const CompassIcon = appIcon(Compass, 20);
export const GridIcon = appIcon(LayoutGrid, 20);
export const ImageIcon = appIcon(ImageGlyph, 20);
export const UserIcon = appIcon(User, 20);
export const LogoutIcon = appIcon(LogOut, 20);
export const TrashIcon = appIcon(Trash2, 17);
export const PlusIcon = appIcon(Plus, 18);
export const DiceIcon = appIcon(Dices, 15);
export const ImagePlusIcon = appIcon(ImagePlus, 16);
export const CopyIcon = appIcon(Copy, 14);
export const DownloadIcon = appIcon(Download, 17);
export const LanguageIcon = appIcon(Languages, 17);

// “无需信用卡”：lucide CreditCard 本体画一条对角斜杠，比单独放一张卡更表意
export function NoCardIcon({ size = 15, strokeWidth = 1.7 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
    </svg>
  );
}

// Google 品牌 G（官方四色）。lucide 不含品牌图标，此 SVG 按 Google 官方规范内联。
export function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.07H2.18a11 11 0 0 0 0 9.86l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

// 图形标记复用 app/icon.svg；链接已有完整 aria-label，避免重复朗读装饰图形。
export function Logo({ href = "/", label = `${BRAND_NAME} home` }) { return <Link href={href} className="logo" aria-label={label}><span className="logo-mark" aria-hidden="true" /><strong><span className="logo-free">Free</span>Text<span className="logo-connector">to</span>Image<i>.</i></strong></Link>; }
