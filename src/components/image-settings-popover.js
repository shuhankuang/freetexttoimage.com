"use client";

import { Popover } from "@heroui/react";
import { ChevronDown, Settings2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";

const BATCH_COUNTS = [1, 2, 3, 4];

function RatioShape({ ratio }) {
  const [width, height] = ratio.split(":").map(Number);
  const scale = Math.min(26 / width, 18 / height);
  return <span className="image-settings-ratio-shape" style={{ width: Math.max(8, width * scale), height: Math.max(8, height * scale) }} />;
}

export default function ImageSettingsPopover({ ratios, ratio, onRatioChange, quality, count, onCountChange }) {
  const { t } = useI18n();

  return (
    <Popover>
      <Popover.Trigger className="image-settings-trigger" aria-label={t("studio.imageSettings")}>
        <Settings2 className="image-settings-leading-icon" size={16} strokeWidth={1.7} aria-hidden="true" />
        <span>{ratio} · {quality} · ×{count}</span>
        <ChevronDown size={15} strokeWidth={1.7} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Content placement="bottom start" offset={9} className="image-settings-popover">
        <Popover.Dialog className="image-settings-dialog">
          <section className="image-settings-section">
            <Popover.Heading>{t("studio.aspectRatio")}</Popover.Heading>
            <div className="image-settings-ratios">
              {ratios.map((item) => (
                <button key={item} type="button" className="image-settings-ratio" aria-pressed={ratio === item} onClick={() => onRatioChange(item)}>
                  <span>{item}</span>
                  <RatioShape ratio={item} />
                </button>
              ))}
            </div>
          </section>
          <section className="image-settings-section">
            <h3>{t("studio.settingsQuality")}</h3>
            <div className="image-settings-options"><button type="button" className="is-selected" aria-pressed="true">{quality}</button></div>
          </section>
          <section className="image-settings-section">
            <div className="image-settings-section-title"><h3>{t("studio.numberOfImages")}</h3><span>{t("studio.comingSoon")}</span></div>
            <div className="image-settings-options">
              {BATCH_COUNTS.map((value) => <button key={value} type="button" disabled={value !== 1} className={count === value ? "is-selected" : ""} aria-pressed={count === value} onClick={() => onCountChange(value)}>{value}</button>)}
            </div>
          </section>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
