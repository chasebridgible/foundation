import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createGitHubAppJwt,
  parseArgs,
  resolvePrivateKey,
  sendGitHubAppPrComment
} from "./agent-capability-scout-notify.mjs";

function generatePrivateKey() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey
  };
}

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

test("parseArgs accepts repo, PR, and inline body", () => {
  const parsed = parseArgs(["--repo", "chasebridgible/foundation", "--pr", "49", "--body", "hello", "--json"]);
  assert.equal(parsed.repo, "chasebridgible/foundation");
  assert.equal(parsed.pr, 49);
  assert.equal(parsed.body, "hello");
  assert.equal(parsed.json, true);
});

test("parseArgs reads body from file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-scout-notify-"));
  const bodyPath = path.join(dir, "body.md");
  fs.writeFileSync(bodyPath, "body from file", "utf8");
  const parsed = parseArgs(["--repo", "chasebridgible/foundation", "--pr", "49", "--body-file", bodyPath]);
  assert.equal(parsed.body, "body from file");
});

test("createGitHubAppJwt signs an app JWT with the app ID", () => {
  const { privatePem, publicKey } = generatePrivateKey();
  const jwt = createGitHubAppJwt({
    appId: "12345",
    privateKey: privatePem,
    now: new Date("2026-06-05T22:00:00.000Z")
  });
  const [headerPart, payloadPart, signaturePart] = jwt.split(".");
  assert.deepEqual(decodeJwtPart(headerPart), { alg: "RS256", typ: "JWT" });
  assert.equal(decodeJwtPart(payloadPart).iss, "12345");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  assert.equal(verifier.verify(publicKey, Buffer.from(signaturePart, "base64url")), true);
});

test("resolvePrivateKey supports escaped newline env values and key paths", () => {
  const { privatePem } = generatePrivateKey();
  assert.equal(resolvePrivateKey({ FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY: privatePem.replace(/\n/g, "\\n") }), privatePem);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-scout-key-"));
  const keyPath = path.join(dir, "key.pem");
  fs.writeFileSync(keyPath, privatePem, "utf8");
  assert.equal(resolvePrivateKey({ FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY_PATH: keyPath }), privatePem);
});

test("sendGitHubAppPrComment mints an installation token and posts a PR comment", async () => {
  const { privatePem } = generatePrivateKey();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/app/installations/67890/access_tokens")) {
      assert.equal(options.method, "POST");
      assert.match(options.headers.Authorization, /^Bearer /);
      return new Response(JSON.stringify({ token: "installation-token", expires_at: "2026-06-05T22:10:00Z" }), { status: 201 });
    }
    if (url.endsWith("/repos/chasebridgible/foundation/issues/49/comments")) {
      assert.equal(options.method, "POST");
      assert.equal(options.headers.Authorization, "Bearer installation-token");
      assert.deepEqual(JSON.parse(options.body), { body: "hello @chasebridgible" });
      return new Response(JSON.stringify({
        id: 123,
        html_url: "https://github.com/chasebridgible/foundation/pull/49#issuecomment-123",
        user: { login: "foundation-scout-notifier[bot]" }
      }), { status: 201 });
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  const result = await sendGitHubAppPrComment({
    repo: "chasebridgible/foundation",
    prNumber: 49,
    body: "hello @chasebridgible",
    env: {
      FOUNDATION_SCOUT_GITHUB_APP_ID: "12345",
      FOUNDATION_SCOUT_GITHUB_INSTALLATION_ID: "67890",
      FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY: privatePem
    },
    fetchImpl,
    now: new Date("2026-06-05T22:00:00.000Z")
  });

  assert.equal(calls.length, 2);
  assert.equal(result.target, "github-app-pr-comment");
  assert.equal(result.actor, "foundation-scout-notifier[bot]");
  assert.equal(result.url, "https://github.com/chasebridgible/foundation/pull/49#issuecomment-123");
});
