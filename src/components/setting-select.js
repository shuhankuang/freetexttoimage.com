import { ListBox, Select } from "@heroui/react";

export default function SettingSelect({ label, value, onChange, options }) {
  return <Select aria-label={label} value={value} onChange={onChange} className={`setting-select ${label === "Aspect ratio" ? "ratio-select" : "style-select"}`}>
    <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
    <Select.Popover className="rounded-md"><ListBox>{options.map((option) => <ListBox.Item key={option.value} id={option.value} textValue={option.label}>{option.label}<ListBox.ItemIndicator /></ListBox.Item>)}</ListBox></Select.Popover>
  </Select>;
}
