# aidso-interface-replica

前端（Vite + React + TS）目录。后端在 `server/`。

更完整的启动/账号/后台入口说明请看仓库根目录 `README.md`。

## 前端本地启动

```bash
npm install
npm run dev
```

默认通过 `vite.config.ts` 将 `/api` 代理到后端（可用 `AIDSO_API_PROXY_TARGET` 覆盖）。
