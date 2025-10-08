import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import { freshSSG } from "@m4rocks/fresh-ssg";

export default defineConfig({
  plugins: [fresh(), freshSSG()],
});
