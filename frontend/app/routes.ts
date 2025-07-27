import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("login", "routes/login.tsx"),
  route("send", "routes/send.tsx"),
  route("download", "routes/download.tsx"),
  route("storage", "routes/storage.tsx")
] satisfies RouteConfig;
