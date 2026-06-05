#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const DEFAULT_API_URL = "https://api.github.com";
const API_VERSION = "2022-11-28";

function usage() {
  return `Usage:
  npm run foundation:agent-capability-scout:notify -- --repo <owner/name> --pr <number> --body-file <path>
  node scripts/agent-capability-scout-notify.mjs --repo <owner/name> --pr <number> --body "message" [--json]

Environment:
  FOUNDATION_SCOUT_GITHUB_APP_ID              GitHub App ID.
  FOUNDATION_SCOUT_GITHUB_INSTALLATION_ID     GitHub App installation ID.
  FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY         Private key PEM value. Supports escaped \\n.
  FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY_PATH    Path to private key PEM file.
  GITHUB_API_URL                              Optional API URL override. Defaults to ${DEFAULT_API_URL}.

Options:
  --repo <owner/name>    Repository to comment on.
  --pr <number>          Pull request number. PR comments use GitHub's issue comments API.
  --body <text>          Comment body.
  --body-file <path>     File containing comment body.
  --json                 Print JSON output.
  --help                 Show this help.`;
}

function parseArgs(argv) {
  const options = { json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--repo" || token === "--pr" || token === "--body" || token === "--body-file") {
      index += 1;
      if (!argv[index]) throw new Error(`${token} requires a value`);
      const field = token.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      options[field] = argv[index];
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  if (!options.help) validateOptions(options);
  return options;
}

function validateOptions(options) {
  if (!isNonEmptyString(options.repo) || !/^[^/\s]+\/[^/\s]+$/.test(options.repo)) {
    throw new Error("--repo must be in owner/name form");
  }
  const prNumber = Number.parseInt(options.pr, 10);
  if (!Number.isInteger(prNumber) || prNumber <= 0) throw new Error("--pr must be a positive integer");
  options.pr = prNumber;
  if (options.body && options.bodyFile) throw new Error("Use --body or --body-file, not both");
  if (!options.body && !options.bodyFile) throw new Error("A comment body is required via --body or --body-file");
  if (options.bodyFile) {
    options.bodyFile = path.resolve(options.bodyFile);
    options.body = fs.readFileSync(options.bodyFile, "utf8");
  }
  if (!isNonEmptyString(options.body)) throw new Error("Comment body must not be empty");
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function normalizePrivateKey(value) {
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value;
}

function resolvePrivateKey(env = process.env) {
  if (isNonEmptyString(env.FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY)) {
    return normalizePrivateKey(env.FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY);
  }
  if (isNonEmptyString(env.FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY_PATH)) {
    return fs.readFileSync(env.FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY_PATH, "utf8");
  }
  throw new Error("Missing FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY or FOUNDATION_SCOUT_GITHUB_PRIVATE_KEY_PATH");
}

function requireEnv(env, name) {
  if (!isNonEmptyString(env[name])) throw new Error(`Missing ${name}`);
  return env[name];
}

function createGitHubAppJwt({ appId, privateKey, now = new Date() }) {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: nowSeconds - 60,
    exp: nowSeconds + 8 * 60,
    iss: String(appId)
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey).toString("base64url")}`;
}

function githubHeaders(token) {
  return {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "foundation-agent-capability-scout",
    "X-GitHub-Api-Version": API_VERSION
  };
}

async function requestJson(fetchImpl, url, options) {
  const response = await fetchImpl(url, options);
  const text = await response.text();
  let body = {};
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!response.ok) {
    const permissions = response.headers.get("x-accepted-github-permissions");
    const suffix = permissions ? `; accepted permissions: ${permissions}` : "";
    const message = body?.message ? `${response.status} ${body.message}${suffix}` : `${response.status} ${response.statusText}${suffix}`;
    throw new Error(message);
  }
  return body;
}

async function createInstallationToken({ apiUrl, installationId, jwt, fetchImpl = fetch }) {
  const url = `${apiUrl}/app/installations/${installationId}/access_tokens`;
  return requestJson(fetchImpl, url, {
    method: "POST",
    headers: githubHeaders(jwt)
  });
}

async function postPrComment({ apiUrl, repo, prNumber, token, body, fetchImpl = fetch }) {
  const url = `${apiUrl}/repos/${repo}/issues/${prNumber}/comments`;
  return requestJson(fetchImpl, url, {
    method: "POST",
    headers: githubHeaders(token),
    body: JSON.stringify({ body })
  });
}

async function sendGitHubAppPrComment({ repo, prNumber, body, env = process.env, fetchImpl = fetch, now = new Date() }) {
  const appId = requireEnv(env, "FOUNDATION_SCOUT_GITHUB_APP_ID");
  const installationId = requireEnv(env, "FOUNDATION_SCOUT_GITHUB_INSTALLATION_ID");
  const privateKey = resolvePrivateKey(env);
  const apiUrl = (env.GITHUB_API_URL || DEFAULT_API_URL).replace(/\/$/, "");
  const jwt = createGitHubAppJwt({ appId, privateKey, now });
  const installationToken = await createInstallationToken({ apiUrl, installationId, jwt, fetchImpl });
  if (!isNonEmptyString(installationToken.token)) throw new Error("GitHub did not return an installation token");
  const comment = await postPrComment({ apiUrl, repo, prNumber, token: installationToken.token, body, fetchImpl });
  if (!isNonEmptyString(comment.html_url)) throw new Error("GitHub did not return a comment URL");
  return {
    url: comment.html_url,
    id: comment.id,
    target: "github-app-pr-comment",
    actor: comment.user?.login ?? null,
    expiresAt: installationToken.expires_at ?? null
  };
}

function renderText(result) {
  return [
    "Agent Capability Scout notification sent",
    `Target: ${result.target}`,
    `URL: ${result.url}`,
    result.actor ? `Actor: ${result.actor}` : null
  ].filter(Boolean).join("\n");
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }
  if (options.help) {
    console.log(usage());
    return;
  }
  try {
    const result = await sendGitHubAppPrComment({ repo: options.repo, prNumber: options.pr, body: options.body });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(renderText(result));
  } catch (error) {
    console.error(`Failed to send Agent Capability Scout notification: ${error.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}

export {
  createGitHubAppJwt,
  parseArgs,
  resolvePrivateKey,
  sendGitHubAppPrComment
};
