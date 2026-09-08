import { listProviders, DEFAULT_MODEL } from "@/lib/models";
import ImageStudio from "@/components/image-studio";

// /studio 的模型清单入口：直接读注册表（src/lib/models/index.js）。
// 以后加模型 = 在注册表里加一行，这里的下拉会自动多一项，无需改本页。
export default function StudioPage() {
  return <ImageStudio models={listProviders()} defaultModel={DEFAULT_MODEL} />;
}
