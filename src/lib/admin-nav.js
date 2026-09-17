// 管理后台板块的单一数据源。以后新增管理板块只加一条数组项 + 一个路由文件夹，
// Dashboard 和导航 tabs 都读这份数据，不用回来改 app-shell.js。
export const ADMIN_SECTIONS = [
  {
    href: "/admin/users",
    label: "Users",
    description: "Browse accounts, subscriptions, credit balances, and generated images.",
  },
  {
    href: "/admin/prompts",
    label: "Prompt imports",
    description: "Monitor scheduled prompt gallery synchronization.",
  },
];
