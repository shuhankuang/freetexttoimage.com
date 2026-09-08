import Link from "next/link";
import {
  ArrowRight,
  Dices,
  Image as ImageGlyph,
  ImagePlus,
  LayoutGrid,
  LogOut,
  Plus,
  Sparkle,
  Trash2,
  User,
} from "lucide-react";

// lucide 图标统一套一层薄包装：
// 保持原手写 SVG 的细线性风格（stroke 1.7）与各图标原本的默认尺寸，
// 使所有调用处（<SparkIcon size={15}/> 等）用法与观感都不变。
function formaIcon(Glyph, defaultSize) {
  return function FormaGlyph({ size = defaultSize, strokeWidth = 1.7, ...props }) {
    return <Glyph size={size} strokeWidth={strokeWidth} {...props} />;
  };
}

export const SparkIcon = formaIcon(Sparkle, 18);
export const ArrowIcon = formaIcon(ArrowRight, 17);
export const GridIcon = formaIcon(LayoutGrid, 20);
export const ImageIcon = formaIcon(ImageGlyph, 20);
export const UserIcon = formaIcon(User, 20);
export const LogoutIcon = formaIcon(LogOut, 20);
export const TrashIcon = formaIcon(Trash2, 17);
export const PlusIcon = formaIcon(Plus, 18);
export const DiceIcon = formaIcon(Dices, 15);
export const ImagePlusIcon = formaIcon(ImagePlus, 16);

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

// 品牌字标（forma.），非 lucide 图标，保留原样
export function Logo() { return <Link href="/" className="logo" aria-label="Forma home"><span>f</span><strong>forma<i>.</i></strong></Link>; }
