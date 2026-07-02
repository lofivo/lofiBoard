import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config.js";

function getSemiAlias() {
  return viteConfig.resolve.alias.find((entry) => entry.find.test?.("@douyinfe/semi-ui"));
}

function getManualChunks() {
  return viteConfig.build.rollupOptions.output.manualChunks;
}

describe("vite config", () => {
  it("routes bare Semi UI imports through the lightweight local entry", () => {
    const alias = getSemiAlias();

    expect(alias).toBeDefined();
    expect(alias.find.test("@douyinfe/semi-ui")).toBe(true);
    expect(alias.find.test("@douyinfe/semi-ui/lib/es/button")).toBe(false);
    expect(alias.replacement).toBe(resolve("src/vendor/semi-ui.js"));
  });

  it("keeps the local Semi UI entry on deep imports and away from lottie", () => {
    const entry = readFileSync(resolve("src/vendor/semi-ui.js"), "utf8");

    expect(entry).not.toMatch(/from\s+["']@douyinfe\/semi-ui["']/);
    expect(entry).not.toMatch(/import\s+["']@douyinfe\/semi-ui["']/);
    expect(entry).not.toMatch(/lottie/i);
  });

  it("splits large third-party libraries into stable vendor chunks", () => {
    const manualChunks = getManualChunks();

    expect(manualChunks("/repo/src/app/App.jsx")).toBeUndefined();
    expect(manualChunks("/repo/node_modules/react/index.js")).toBe("vendor-react");
    expect(manualChunks("/repo/node_modules/react-dom/client.js")).toBe("vendor-react");
    expect(manualChunks("/repo/node_modules/konva/lib/Core.js")).toBe("vendor-konva");
    expect(manualChunks("/repo/node_modules/@douyinfe/semi-ui/lib/es/button/index.js")).toBe("vendor-semi");
    expect(manualChunks("/repo/node_modules/katex/dist/katex.mjs")).toBe("vendor-katex");
    expect(manualChunks("/repo/node_modules/lucide-static/icons/zoom-in.svg")).toBe("vendor-icons");
    expect(manualChunks("/repo/node_modules/html2canvas/dist/html2canvas.js")).toBe("vendor-html2canvas");
    expect(manualChunks("/repo/node_modules/scheduler/index.js")).toBe("vendor");
  });
});
