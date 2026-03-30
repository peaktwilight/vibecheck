import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileAsync = promisify(execFile);
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("CLI starts on the current Node runtime and prints usage without syntax errors", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [join(repoRoot, "dist/cli.js")], {
      cwd: repoRoot,
      env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
    }),
    error => {
      assert.equal(error.code, 1);

      const output = `${error.stdout}\n${error.stderr}`;
      assert.match(output, /Usage:/);
      assert.doesNotMatch(output, /SyntaxError/);

      return true;
    },
  );
});
