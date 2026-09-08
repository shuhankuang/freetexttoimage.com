import { ListBox, Select } from "@heroui/react";

// 生成器里的设置下拉（Model / Aspect ratio …）。
// 宽度类由调用方通过 className 指定（如 "style-select" / "ratio-select"，见 globals.css）。
// 保留 label 兜底，避免其它调用方漏传 className 时样式突变。
export default function SettingSelect({ label, value, onChange, options, className }) {
  const widthClass = className || (label === "Aspect ratio" ? "ratio-select" : "style-select");
  return <Select aria-label={label} value={value} onChange={onChange} className={`setting-select ${widthClass}`}>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover className="rounded-md"><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>;
}
