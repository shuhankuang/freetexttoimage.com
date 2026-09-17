import { Spinner } from "@heroui/react";
import { InfoIcon } from "@/components/ui";

// 生成中 / 生成失败时的统一占位展示——用户自己的 /creations、首页"我的作品"预览、
// admin 的用户详情页，三处瀑布流在没有图片时都用这同一个组件渲染，图标和布局保持一致，
// 只有文案按各自场景（是否要走 i18n、第一人称"Generating…"还是第三人称"Processing…"）传入。
export default function CreationStatus({ failed, failedLabel, generatingLabel }) {
  return <span className="creation-status">
    {failed ? <><InfoIcon />{failedLabel}</> : <><Spinner size="sm" color="current" />{generatingLabel}</>}
  </span>;
}
