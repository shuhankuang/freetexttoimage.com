import { listProviders, DEFAULT_MODEL } from "@/lib/models";
import ImageStudio from "@/components/image-studio";
import { listCreationsPage } from "@/lib/creations";
import { getServerSession } from "@/lib/server-session";
import { localePath } from "@/i18n/config";

// /studio 的模型清单入口：直接读注册表（src/lib/models/index.js）。
// 以后加模型 = 在注册表里加一行，这里的下拉会自动多一项，无需改本页。
//
// 登录用户在这里的唯一入口，精简版：只有生成框 + 该用户自己的最近作品预览
// （没作品时 ImageStudio 内部会回退显示灵感示例画廊）。SSR 直接拉数据，
// 首屏就有内容，不用客户端再发一次请求。
export default async function StudioPage({ params }) {
  const { locale } = await params;
  const session = await getServerSession();
  const myCreations = session?.user ? await listCreationsPage(session.user.id, { limit: 12 }) : null;

  return <ImageStudio
    models={listProviders()}
    defaultModel={DEFAULT_MODEL}
    simplified
    myCreations={myCreations}
    creationsHref={localePath(locale, "/creations")}
  />;
}
