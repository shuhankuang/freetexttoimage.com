import "server-only";

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 水印是预渲染好的透明 PNG（见 src/assets/watermark.png），不是运行时现画文字——
// 生产环境跑在 Linux 容器里大概率没有 Helvetica/Arial，现画文字风险是直接画不出来或走样。
// 缩放比例按这张素材生成时用的参考字号换算，改了 src/assets/watermark.png 记得同步改这个值。
const WATERMARK_PATH = join(process.cwd(), "src/assets/watermark.png");
const REFERENCE_FONT_SIZE = 240;

let watermarkBufferPromise;
function loadWatermarkBuffer() {
  watermarkBufferPromise ??= readFile(WATERMARK_PATH);
  return watermarkBufferPromise;
}

// 免费用户生成结果加水印，右上角，尺寸/间距跟图片本身等比缩放（按短边计算内边距，
// 方形图和长图上观感一致）。失败就返回原图——不能让水印合成的意外把免费用户的生成结果卡死。
export async function applyWatermark(buffer) {
  try {
    const [watermark, target] = await Promise.all([loadWatermarkBuffer(), sharp(buffer).metadata()]);
    const { width, height } = target;
    if (!width || !height) return buffer;

    const shortEdge = Math.min(width, height);
    const fontSize = width * 0.015;
    const inset = Math.round(shortEdge * 0.025);
    const scale = fontSize / REFERENCE_FONT_SIZE;

    const wmMeta = await sharp(watermark).metadata();
    const wmWidth = Math.max(1, Math.round(wmMeta.width * scale));
    const resizedWatermark = await sharp(watermark).resize({ width: wmWidth }).toBuffer();
    const resizedMeta = await sharp(resizedWatermark).metadata();

    const left = Math.max(0, width - inset - resizedMeta.width);
    const top = inset;

    return await sharp(buffer).composite([{ input: resizedWatermark, left, top }]).toBuffer();
  } catch (err) {
    console.error("[watermark] apply failed, delivering unwatermarked image:", err?.message || err);
    return buffer;
  }
}
