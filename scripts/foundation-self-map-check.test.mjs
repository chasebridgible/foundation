import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

test("Foundation self-map check passes for the Foundation repo", () => {
  const output = execFileSync("node", ["scripts/foundation-self-map-check.mjs"], {
    encoding: "utf8"
  });

  assert.match(output, /Foundation self-map check passed/);
  assert.match(output, /capability specs/);
  assert.match(output, /mapped skills/);
});
