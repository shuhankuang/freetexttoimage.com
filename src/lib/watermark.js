import "server-only";

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// 水印是预渲染好的透明 PNG（见 src/assets/watermark.png），不是运行时现画文字——
// 生产环境跑在 Linux 容器里大概率没有 Helvetica/Arial，现画文字风险是直接画不出来或走样。
// 缩放比例按这张素材生成时用的参考字号换算，改了 src/assets/watermark.png 记得同步改这个值。
const WATERMARK_PATH = join(process.cwd(), "src/assets/watermark.png");
// 参考素材本身是 1223×120（约 34KB），留了约 4 倍于最大常见输出宽度（~2048px 时字号约 30px）
// 的余量做等比缩小——改了 src/assets/watermark.png 记得同步改这个值。
const REFERENCE_FONT_SIZE = 120;

let watermarkBufferPromise;
function loadWatermarkBuffer() {
  watermarkBufferPromise ??= readFile(WATERMARK_PATH);
  return watermarkBufferPromise;
}

// 免费用户生成结果加水印，右上角，尺寸/间距跟图片本身等比缩放（按短边计算内边距，
// 方形图和长图上观感一致）。失败就返回原图——不能让水印合成的意外把免费用户的生成结果卡死。
//
// 性能：sharp 的 Buffer 输入允许 metadata() 之后继续在同一个实例上链式操作，不会重新解码，
// 所以源图和水印图都只各自解码一次——避免了之前每张图片多建 sharp 实例导致的重复解码。
export async function applyWatermark(buffer) {
  try {
    const watermarkPromise = loadWatermarkBuffer();
    const image = sharp(buffer);
    const { width, height } = await image.metadata();
    if (!width || !height) return buffer;

    const shortEdge = Math.min(width, height);
    const fontSize = width * 0.015;
    const inset = Math.round(shortEdge * 0.025);
    const scale = fontSize / REFERENCE_FONT_SIZE;

    const watermark = sharp(await watermarkPromise);
    const wmMeta = await watermark.metadata();
    const wmWidth = Math.max(1, Math.round(wmMeta.width * scale));
    const { data: resizedWatermark, info: resizedInfo } = await watermark
      .resize({ width: wmWidth })
      .toBuffer({ resolveWithObject: true });

    const left = Math.max(0, width - inset - resizedInfo.width);
    const top = inset;

    return await image.composite([{ input: resizedWatermark, left, top }]).toBuffer();
  } catch (err) {
    console.error("[watermark] apply failed, delivering unwatermarked image:", err?.message || err);
    return buffer;
  }
}
