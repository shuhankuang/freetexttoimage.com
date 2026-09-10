"use client";

import { useState } from "react";
import Image from "next/image";
import { Popover } from "@heroui/react";
import { Check, ChevronDown } from "lucide-react";

export default function ModelPickerPopover({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  function choose(nextValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className="image-settings-trigger model-picker-trigger" aria-label={label}>
        {selected?.icon && <Image src={selected.icon} alt="" width={18} height={18} sizes="18px" />}
        <span>{selected?.label || label}</span>
        <ChevronDown size={15} strokeWidth={1.7} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Content placement="bottom start" offset={9} className="image-settings-popover model-picker-popover">
        <Popover.Dialog className="image-settings-dialog model-picker-dialog">
          <Popover.Heading className="model-picker-heading">{label}</Popover.Heading>
          <div className="model-picker-list">
            {options.map((option) => (
              <button key={option.value} type="button" className="model-picker-option" aria-pressed={option.value === value} onClick={() => choose(option.value)}>
                {option.icon && <Image src={option.icon} alt="" width={20} height={20} sizes="20px" />}
                <span>{option.label}</span>
                {option.value === value && <Check size={15} strokeWidth={1.8} aria-hidden="true" />}
              </button>
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
