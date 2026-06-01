#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const specsDir = path.join(repoRoot, "docs", "specs");
const graphDir = path.join(repoRoot, "docs", "visible-business-graph");
const today = "2026-06-01";
const cssHref = "../../../../docs/specs/spec-system.css";

const actors = [
  { id: "actor:customer", label: "Customer", role: "Requests service, confirms expectations, pays, and gives feedback." },
  { id: "actor:customer-coordinator", label: "Customer coordinator", role: "Owns intake, scheduling, customer updates, and review requests." },
  { id: "actor:dispatcher", label: "Dispatcher", role: "Turns scheduled work into technician-ready route assignments." },
  { id: "actor:technician", label: "Technician", role: "Completes work, records job evidence, and communicates field status." },
  { id: "actor:service-manager", label: "Service manager", role: "Owns quality recovery, priority rules, and daily capacity tradeoffs." },
  { id: "actor:billing-coordinator", label: "Billing coordinator", role: "Owns invoices, payment follow-up, receipts, and open balance exceptions." },
  { id: "actor:inventory-coordinator", label: "Inventory coordinator", role: "Keeps technician trucks stocked and records material exceptions." },
  { id: "actor:owner-operator", label: "Owner operator", role: "Reviews operating evidence and resolves cross-capability gaps." }
];

const tools = [
  { id: "tool:field-service:crm", label: "CRM schedule board", purpose: "Customer record, service category, appointment window, and job status." },
  { id: "tool:field-service:route-board", label: "Route board", purpose: "Technician assignments, geography, arrival estimates, and route load." },
  { id: "tool:field-service:mobile-work-order", label: "Mobile work order app", purpose: "Technician checklist, photos, parts, signatures, and completion notes." },
  { id: "tool:field-service:payment-system", label: "Payment system", purpose: "Invoices, payment links, receipts, refunds, and aging status." },
  { id: "tool:field-service:inventory-log", label: "Truck inventory log", purpose: "Truck stock, parts usage, replenishment, and low-stock exceptions." },
  { id: "tool:field-service:customer-messaging", label: "Customer messaging", purpose: "Confirmations, arrival updates, issue recovery, and review requests." },
  { id: "tool:field-service:skill-roster", label: "Technician skill roster", purpose: "Skill, license, territory, capacity, and PTO constraints." },
  { id: "tool:field-service:review-dashboard", label: "Review dashboard", purpose: "Review requests, customer satisfaction signals, and follow-up status." }
];

const capabilities = [
  {
    slug: "schedule-work",
    id: "client.field-service.schedule-work.capability",
    nodeId: "cap:field-service:schedule-work",
    file: "schedule-work-capability.html",
    title: "Schedule Service Work Capability",
    label: "Schedule service work",
    outcome: "Customers receive a confirmed visit window with enough context for the business to dispatch the right technician.",
    metric: { id: "metric:field-service:first-available-window", label: "First available appointment window", target: "Same-day or next-business-day window is visible before confirmation." },
    rules: [
      "Every confirmed appointment must have a customer, address, service category, preferred window, and priority.",
      "Emergency priority is visible as a named gap until the owner defines its override rules.",
      "Scheduling is not complete until the customer receives confirmation."
    ],
    jobs: ["triage-service-request", "book-appointment", "dispatch-technician"]
  },
  {
    slug: "deliver-service",
    id: "client.field-service.deliver-service.capability",
    nodeId: "cap:field-service:deliver-service",
    file: "deliver-service-capability.html",
    title: "Deliver Service Visit Capability",
    label: "Deliver service visit",
    outcome: "Technicians arrive prepared, complete the promised work, and produce enough evidence to close the work order.",
    metric: { id: "metric:field-service:same-day-completion-rate", label: "Same-day completion rate", target: "Completed visits close or escalate before end of service day." },
    rules: [
      "A technician cannot start a visit without appointment context, customer notes, and expected materials.",
      "Completion requires outcome notes, materials used, and customer-facing completion state.",
      "Photo evidence standards are visible as a gap until the service manager defines them."
    ],
    jobs: ["prepare-visit", "complete-service-visit", "close-work-order"]
  },
  {
    slug: "collect-payment",
    id: "client.field-service.collect-payment.capability",
    nodeId: "cap:field-service:collect-payment",
    file: "collect-payment-capability.html",
    title: "Collect Service Payment Capability",
    label: "Collect service payment",
    outcome: "Completed work turns into collected cash or a named open balance with an accountable owner.",
    metric: { id: "metric:field-service:days-to-collect", label: "Days to collect", target: "Most completed jobs are collected before the next business day." },
    rules: [
      "Invoices must trace back to a closed work order and approved amount.",
      "Receipts must trace back to the customer, service job, invoice, and payment method.",
      "Refund and open-balance exception ownership stays visible until assigned."
    ],
    jobs: ["create-invoice", "collect-payment", "resolve-payment-exception"]
  },
  {
    slug: "protect-relationship",
    id: "client.field-service.protect-relationship.capability",
    nodeId: "cap:field-service:protect-relationship",
    file: "protect-relationship-capability.html",
    title: "Protect Customer Relationship Capability",
    label: "Protect customer relationship",
    outcome: "Customers know what is happening, can recover from service issues, and are asked for feedback at the right time.",
    metric: { id: "metric:field-service:issue-recovery-time", label: "Issue recovery time", target: "Service issues receive owner response before the next service day." },
    rules: [
      "Arrival updates must be based on current route state, not stale appointment assumptions.",
      "Service issues need a named owner, recovery promise, and follow-up evidence.",
      "Review requests are sent only after the job is closed and no unresolved issue is open."
    ],
    jobs: ["send-arrival-update", "handle-service-issue", "request-review"]
  },
  {
    slug: "maintain-readiness",
    id: "client.field-service.maintain-readiness.capability",
    nodeId: "cap:field-service:maintain-readiness",
    file: "maintain-readiness-capability.html",
    title: "Maintain Technician Readiness Capability",
    label: "Maintain technician readiness",
    outcome: "Technician capacity, skills, and truck materials are ready before customer commitments are made.",
    metric: { id: "metric:field-service:readiness-score", label: "Technician readiness score", target: "Daily capacity and critical truck stock are reviewed before dispatch." },
    rules: [
      "Capacity promises depend on technician availability, skill match, territory, and material readiness.",
      "Truck restock gaps must be visible before they affect a customer appointment.",
      "Owner review resolves capacity and inventory exceptions that cross teams."
    ],
    jobs: ["plan-daily-capacity", "restock-truck"]
  }
];

const jobs = [
  {
    slug: "triage-service-request",
    title: "Triage Service Request Job",
    label: "Triage service request",
    capability: "schedule-work",
    actor: "actor:customer-coordinator",
    tools: ["tool:field-service:crm", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:request-triage", label: "Request triage record" },
    gap: { id: "gap:field-service:emergency-priority-rules", label: "Emergency priority rules need owner definition" },
    intent: "Classify the inbound service request so the business knows whether to schedule, escalate, or reject it.",
    current: "The customer coordinator owns inbound requests and asks enough questions to determine category, urgency, and location.",
    process: ["Capture customer identity and service address.", "Classify service category, urgency, and access constraints.", "Flag emergency or out-of-scope requests for owner decision.", "Pass schedulable requests to appointment booking."],
    evidenceText: "A triage record with category, priority, address, and next state proves the request is ready for scheduling."
  },
  {
    slug: "book-appointment",
    title: "Book Service Appointment Job",
    label: "Book service appointment",
    capability: "schedule-work",
    actor: "actor:customer-coordinator",
    tools: ["tool:field-service:crm", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:appointment-confirmation", label: "Appointment confirmation" },
    intent: "Offer and confirm a customer appointment window that can be dispatched.",
    current: "The customer coordinator receives request details and owns the customer confirmation.",
    process: ["Review triage record and customer constraints.", "Offer available windows with service category context.", "Confirm appointment and customer expectations.", "Send appointment confirmation and preserve the message record."],
    evidenceText: "A confirmed CRM appointment and sent customer confirmation prove the visit is scheduled."
  },
  {
    slug: "dispatch-technician",
    title: "Dispatch Technician Job",
    label: "Dispatch technician",
    capability: "schedule-work",
    actor: "actor:dispatcher",
    supportingActors: ["actor:technician"],
    tools: ["tool:field-service:route-board", "tool:field-service:skill-roster"],
    evidence: { id: "evidence:field-service:dispatch-assignment", label: "Dispatch assignment" },
    intent: "Assign technician capacity and route context to confirmed service work.",
    current: "The dispatcher owns the assignment and the technician acknowledges the route.",
    process: ["Review confirmed appointments.", "Match skill, location, and availability.", "Assign route and arrival expectation.", "Notify technician and record acknowledgment."],
    evidenceText: "A route assignment and technician acknowledgment prove the job is operationally ready."
  },
  {
    slug: "prepare-visit",
    title: "Prepare Service Visit Job",
    label: "Prepare service visit",
    capability: "deliver-service",
    actor: "actor:technician",
    tools: ["tool:field-service:mobile-work-order", "tool:field-service:inventory-log"],
    evidence: { id: "evidence:field-service:visit-readiness-checklist", label: "Visit readiness checklist" },
    intent: "Review job context and required materials before arriving at the customer site.",
    current: "The technician checks route notes, customer constraints, and truck stock before the visit.",
    process: ["Open assigned work order.", "Review service category, notes, and access instructions.", "Confirm critical materials are on the truck.", "Mark visit ready or raise a readiness exception."],
    evidenceText: "A readiness checklist tied to the work order proves the visit was prepared."
  },
  {
    slug: "complete-service-visit",
    title: "Complete Service Visit Job",
    label: "Complete service visit",
    capability: "deliver-service",
    actor: "actor:technician",
    tools: ["tool:field-service:mobile-work-order", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:completed-work-order", label: "Completed work order" },
    gap: { id: "gap:field-service:photo-standard", label: "Completion photo standard is not defined" },
    intent: "Perform the promised service and record the customer-visible outcome.",
    current: "The technician performs the visit, records work performed, and notes any incomplete follow-up.",
    process: ["Arrive and confirm service scope.", "Complete work or record blocked reason.", "Capture materials, notes, and customer-facing outcome.", "Send completion status or escalation note."],
    evidenceText: "A completed work order with notes, materials, and outcome state proves service was performed or escalated."
  },
  {
    slug: "close-work-order",
    title: "Close Work Order Job",
    label: "Close work order",
    capability: "deliver-service",
    actor: "actor:service-manager",
    tools: ["tool:field-service:mobile-work-order", "tool:field-service:crm"],
    evidence: { id: "evidence:field-service:closed-service-job", label: "Closed service job" },
    intent: "Review completion evidence and close or reopen the service job.",
    current: "The service manager checks completion state before the job is released to billing.",
    process: ["Review technician notes and blocked states.", "Confirm customer-facing outcome and billable amount.", "Close the work order or reopen with an owner.", "Release closed jobs to invoicing."],
    evidenceText: "A closed service job with billable approval proves the work can move to payment."
  },
  {
    slug: "create-invoice",
    title: "Create Service Invoice Job",
    label: "Create service invoice",
    capability: "collect-payment",
    actor: "actor:billing-coordinator",
    tools: ["tool:field-service:payment-system", "tool:field-service:mobile-work-order"],
    evidence: { id: "evidence:field-service:issued-invoice", label: "Issued invoice" },
    intent: "Turn a closed work order into a customer invoice with traceable line items.",
    current: "The billing coordinator confirms billable scope, tax, discounts, and customer payment method.",
    process: ["Review closed work order and approved amount.", "Create invoice lines and taxes.", "Attach service job reference.", "Send invoice or payment link to customer."],
    evidenceText: "An issued invoice linked to the closed service job proves billing is ready."
  },
  {
    slug: "collect-payment",
    title: "Collect Service Payment Job",
    label: "Collect service payment",
    capability: "collect-payment",
    actor: "actor:billing-coordinator",
    tools: ["tool:field-service:payment-system", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:paid-invoice", label: "Paid invoice receipt" },
    gap: { id: "gap:field-service:refund-owner", label: "Refund exception owner unclear" },
    intent: "Collect payment and record receipt or open balance.",
    current: "The billing coordinator owns payment follow-up and receipt recording.",
    process: ["Confirm invoice is ready to collect.", "Charge saved card or send payment link.", "Record receipt when payment succeeds.", "Create aging exception when payment fails or remains open."],
    evidenceText: "A paid invoice receipt or aging exception proves collection state."
  },
  {
    slug: "resolve-payment-exception",
    title: "Resolve Payment Exception Job",
    label: "Resolve payment exception",
    capability: "collect-payment",
    actor: "actor:billing-coordinator",
    supportingActors: ["actor:service-manager"],
    tools: ["tool:field-service:payment-system", "tool:field-service:crm"],
    evidence: { id: "evidence:field-service:payment-exception-resolution", label: "Payment exception resolution" },
    intent: "Resolve failed, disputed, refunded, or aged payment states without losing accountability.",
    current: "Billing owns the exception queue and routes disputed work to the service manager.",
    process: ["Review failed charge, dispute, refund, or aged invoice.", "Name the next owner and customer promise.", "Apply adjustment, retry, refund, or escalation.", "Close exception with reason and evidence."],
    evidenceText: "A closed payment exception with owner, reason, and resulting balance proves the issue is resolved."
  },
  {
    slug: "send-arrival-update",
    title: "Send Arrival Update Job",
    label: "Send arrival update",
    capability: "protect-relationship",
    actor: "actor:customer-coordinator",
    supportingActors: ["actor:technician"],
    tools: ["tool:field-service:customer-messaging", "tool:field-service:route-board"],
    evidence: { id: "evidence:field-service:arrival-message", label: "Arrival message log" },
    intent: "Keep the customer informed when technician arrival changes.",
    current: "Customer coordination watches route updates and sends customer messages when timing changes.",
    process: ["Read current route and technician status.", "Compare current ETA to promised window.", "Send arrival update when timing changes materially.", "Record the sent message on the service job."],
    evidenceText: "A sent arrival message tied to route state proves the customer was updated."
  },
  {
    slug: "handle-service-issue",
    title: "Handle Service Issue Job",
    label: "Handle service issue",
    capability: "protect-relationship",
    actor: "actor:service-manager",
    tools: ["tool:field-service:crm", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:service-recovery-case", label: "Service recovery case" },
    intent: "Own customer complaints, callbacks, damage reports, and incomplete work until recovery is clear.",
    current: "The service manager owns service recovery and names the customer promise.",
    process: ["Open issue from customer, technician, or billing signal.", "Classify severity and desired recovery.", "Assign owner, action, and due time.", "Close only after customer-facing resolution is recorded."],
    evidenceText: "A recovery case with owner, promise, action, and close reason proves the issue is managed."
  },
  {
    slug: "request-review",
    title: "Request Customer Review Job",
    label: "Request customer review",
    capability: "protect-relationship",
    actor: "actor:customer-coordinator",
    tools: ["tool:field-service:review-dashboard", "tool:field-service:customer-messaging"],
    evidence: { id: "evidence:field-service:review-request", label: "Review request log" },
    gap: { id: "gap:field-service:review-suppression-rule", label: "Review suppression rule needs confirmation" },
    intent: "Ask satisfied customers for a review without contacting unresolved issue cases.",
    current: "The customer coordinator sends review requests after work is closed and no recovery case remains open.",
    process: ["Review closed jobs eligible for feedback.", "Suppress requests when unresolved issue or refund state exists.", "Send review request with correct channel.", "Record request state and customer response signal."],
    evidenceText: "A review request log tied to a closed job proves feedback was requested appropriately."
  },
  {
    slug: "plan-daily-capacity",
    title: "Plan Daily Capacity Job",
    label: "Plan daily capacity",
    capability: "maintain-readiness",
    actor: "actor:service-manager",
    tools: ["tool:field-service:route-board", "tool:field-service:skill-roster"],
    evidence: { id: "evidence:field-service:daily-capacity-plan", label: "Daily capacity plan" },
    intent: "Know available technician capacity before promising customer windows.",
    current: "The service manager reviews technician availability, skills, and territory pressure before dispatch.",
    process: ["Review booked demand and open requests.", "Confirm technician availability, skill, and route constraints.", "Name capacity risks before scheduling commitments.", "Publish daily capacity state for coordinators and dispatch."],
    evidenceText: "A daily capacity plan with exceptions proves the team knows what can be promised."
  },
  {
    slug: "restock-truck",
    title: "Restock Technician Truck Job",
    label: "Restock technician truck",
    capability: "maintain-readiness",
    actor: "actor:inventory-coordinator",
    supportingActors: ["actor:technician"],
    tools: ["tool:field-service:inventory-log", "tool:field-service:mobile-work-order"],
    evidence: { id: "evidence:field-service:truck-restock", label: "Truck restock confirmation" },
    gap: { id: "gap:field-service:truck-min-max", label: "Truck stock min/max rules need owner review" },
    intent: "Replenish critical truck materials before they block customer work.",
    current: "The inventory coordinator reviews usage and low-stock signals from technician work orders.",
    process: ["Review parts used and low-stock truck signals.", "Pick materials for truck replenishment.", "Record restock quantity and exceptions.", "Escalate missing critical parts before dispatch."],
    evidenceText: "A restock confirmation or shortage exception proves truck readiness state."
  }
];

const technicalSpec = {
  id: "client.field-service.workflow.technical",
  nodeId: "technical:field-service:workflow",
  file: "client-workflow-technical.html",
  title: "Field Service Workflow Technical Contract",
  label: "Field service workflow technical contract"
};

const evalSpec = {
  id: "client.field-service.workflow.eval",
  nodeId: "evaluation:field-service:workflow",
  file: "client-workflow-eval.html",
  title: "Field Service Workflow Evaluation",
  label: "Field service workflow evaluation"
};

const systemSpec = {
  id: "client.field-service.system",
  nodeId: "system:field-service-business",
  file: "client-system.html",
  title: "Field Service Business System",
  label: "Field service business"
};

const indexSpec = {
  id: "client.field-service.spec-system",
  nodeId: "index:visible-business-client-specs",
  file: "index.html",
  title: "Visible Business Client Spec System",
  label: "Visible Business Client Specs"
};

const jobBySlug = new Map(jobs.map(job => [job.slug, {
  ...job,
  id: `client.field-service.${job.slug}.job`,
  nodeId: `job:field-service:${job.slug}`,
  processId: `process:field-service:${job.slug}`,
  file: `${job.slug}-job.html`
}]));
const capabilityBySlug = new Map(capabilities.map(capability => [capability.slug, capability]));
const actorById = new Map(actors.map(actor => [actor.id, actor]));
const toolById = new Map(tools.map(tool => [tool.id, tool]));
const expectedNodes = new Set();
const expectedEdges = new Set();

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function edge(id, type, from, to, specId, sectionId, label = undefined) {
  expectedEdges.add(id);
  return label === undefined
    ? { id, type, from, to, source: { specId, sectionId } }
    : { id, type, from, to, source: { specId, sectionId }, label };
}

function node(nodeSpec) {
  expectedNodes.add(nodeSpec.id);
  return nodeSpec;
}

function document({ title, meta, graph, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="spec:id" content="${html(meta.id)}">
<meta name="spec:type" content="${html(meta.type)}">
<meta name="spec:status" content="${html(meta.status)}">
<meta name="spec:last-updated" content="${html(meta.lastUpdated)}">
<title>${html(title)}</title>
<link rel="stylesheet" href="${cssHref}">
<script type="application/json" id="spec-metadata">
${prettyJson(meta)}
</script>
<script type="application/json" id="graph-metadata">
${prettyJson(graph)}
</script>
</head>
<body>
<main class="main">
${body}
</main>
</body>
</html>
`;
}

function section(id, type, heading, content, canonical = false, level = "h2") {
  const canonicalAttr = canonical ? ' data-spec-canonical="true"' : "";
  return `  <section id="${id}" data-spec-section="${id}" data-section-type="${type}"${canonicalAttr}>
    <${level}>${html(heading)}</${level}>
${content}
  </section>`;
}

function paragraph(text) {
  return `    <p>${html(text)}</p>`;
}

function list(items, ordered = false) {
  const tag = ordered ? "ol" : "ul";
  return `    <${tag}>
${items.map(item => `      <li>${html(item)}</li>`).join("\n")}
    </${tag}>`;
}

function table(headers, rows) {
  return `    <table class="status-table">
      <thead><tr>${headers.map(header => `<th>${html(header)}</th>`).join("")}</tr></thead>
      <tbody>
${rows.map(row => `        <tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("\n")}
      </tbody>
    </table>`;
}

function specPath(file) {
  return `visible-business-client/docs/specs/${file}`;
}

function relativeSpecPath(file) {
  return `docs/specs/${file}`;
}

function baseMeta({ id, title, type, parent = null, children = [], relatedSpecs = [], ownedFile, coverage = [], tags = [] }) {
  return {
    id,
    title,
    type,
    status: "active",
    lastUpdated: today,
    reviewCadence: type === "job" ? "per-change" : "monthly",
    confidence: "high",
    parent,
    children,
    relatedSpecs,
    ownedPaths: [
      { path: specPath(ownedFile), kind: "doc", ownership: "direct" }
    ],
    implementationPaths: [],
    coverage,
    tags: ["example", "visible-business-graph", "field-service", ...tags]
  };
}

function renderIndex() {
  const allSpecs = [
    indexSpec,
    systemSpec,
    ...capabilities,
    ...jobs.map(job => jobBySlug.get(job.slug)),
    technicalSpec,
    evalSpec
  ];
  const meta = baseMeta({
    id: indexSpec.id,
    title: indexSpec.title,
    type: "index",
    children: [systemSpec.id],
    ownedFile: indexSpec.file,
    tags: ["template-repo", "index"]
  });
  const registry = {
    registryVersion: "1.0",
    lastUpdated: today,
    specs: allSpecs.map(spec => ({
      id: spec.id,
      title: spec.title,
      file: `visible-business-client/${relativeSpecPath(spec.file)}`,
      type: spec === indexSpec ? "index" : spec === systemSpec ? "system" : spec.nodeId?.startsWith("cap:") ? "capability" : spec.nodeId?.startsWith("job:") ? "job" : spec === technicalSpec ? "technical" : "eval"
    }))
  };
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: indexSpec.id,
    nodes: [
      node({
        id: indexSpec.nodeId,
        type: "index",
        label: indexSpec.label,
        source: { specId: indexSpec.id, sectionId: "overview" },
        status: "active",
        confidence: "high",
        attributes: { exampleRole: "template-repo-index" }
      })
    ],
    edges: [
      edge(`edge:${indexSpec.nodeId}:contains:${systemSpec.nodeId}`, "contains", indexSpec.nodeId, systemSpec.nodeId, indexSpec.id, "registry")
    ]
  };
  const body = `${section("overview", "system-index", indexSpec.title, `${paragraph("A canonical fictional client repository used to verify that Foundation can generate a visible business graph from HTML-native system, capability, job, technical, and eval specs.")}`, true, "h1")}
  <article class="doc-body">
${section("registry", "spec-registry", "Spec registry", `${table(["Spec", "Type", "File"], allSpecs.map(spec => {
    const type = spec === indexSpec ? "index" : spec === systemSpec ? "system" : spec.nodeId?.startsWith("cap:") ? "capability" : spec.nodeId?.startsWith("job:") ? "job" : spec === technicalSpec ? "technical" : "eval";
    return [`<code>${html(spec.id)}</code>`, html(type), `<a href="./${html(spec.file)}">${html(spec.file)}</a>`];
  }))}<script type="application/json" id="spec-registry">
${prettyJson(registry)}
</script>`)}
${section("graph-contract", "graph-contract", "Graph contract", `${paragraph("Each spec owns its HTML prose and graph metadata. The generated canvas and JSON files under docs/visible-business-graph are derived artifacts.")}`)}
  </article>`;
  return document({ title: indexSpec.title, meta, graph, body });
}

function renderSystem() {
  const meta = baseMeta({
    id: systemSpec.id,
    title: systemSpec.title,
    type: "system",
    parent: indexSpec.id,
    children: capabilities.map(capability => capability.id),
    relatedSpecs: [
      { id: technicalSpec.id, relationship: "child", sections: ["identity-linkage-contract"] },
      { id: evalSpec.id, relationship: "validates", sections: ["verification-contract"] }
    ],
    ownedFile: systemSpec.file,
    coverage: [
      {
        id: "CLIENT-SYS-1",
        level: "manual",
        status: "existing",
        path: specPath(evalSpec.file),
        mapsTo: [`${systemSpec.id}#system-intent`],
        evidence: "Example evaluation confirms all core operating capabilities, jobs, actors, tools, evidence, metrics, and gaps render into the graph."
      }
    ],
    tags: ["system"]
  });
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: systemSpec.id,
    nodes: [
      node({
        id: systemSpec.nodeId,
        type: "system",
        label: systemSpec.label,
        source: { specId: systemSpec.id, sectionId: "system-intent" },
        status: "active",
        confidence: "high",
        attributes: { industry: "residential field service", exampleRole: "business-root" }
      }),
      ...actors.map(actor => node({
        id: actor.id,
        type: "actor",
        label: actor.label,
        source: { specId: systemSpec.id, sectionId: "actors-and-tools" },
        status: "active",
        confidence: "high",
        attributes: { role: actor.role }
      })),
      ...tools.map(tool => node({
        id: tool.id,
        type: "tool",
        label: tool.label,
        source: { specId: systemSpec.id, sectionId: "actors-and-tools" },
        status: "active",
        confidence: "high",
        attributes: { purpose: tool.purpose }
      }))
    ],
    edges: [
      ...capabilities.map(capability => edge(`edge:${systemSpec.nodeId}:contains:${capability.nodeId}`, "contains", systemSpec.nodeId, capability.nodeId, systemSpec.id, "capability-map")),
      ...actors.map(actor => edge(`edge:${systemSpec.nodeId}:contains:${actor.id}`, "contains", systemSpec.nodeId, actor.id, systemSpec.id, "actors-and-tools")),
      ...tools.map(tool => edge(`edge:${systemSpec.nodeId}:contains:${tool.id}`, "contains", systemSpec.nodeId, tool.id, systemSpec.id, "actors-and-tools"))
    ]
  };
  const body = `${section("system-intent", "system-intent", systemSpec.title, `${paragraph("Brightline Home Services is a fictional residential field service business. The system must reliably receive customer requests, schedule work, dispatch and prepare technicians, complete service visits, collect payment, protect customer relationships, and keep technician capacity ready.")}`, true, "h1")}
  <article class="doc-body">
${section("capability-map", "capability-map", "Capability map", `${table(["Capability", "Outcome", "Owner spec"], capabilities.map(capability => [
    html(capability.label),
    html(capability.outcome),
    `<code>${html(capability.id)}</code>`
  ]))}`)}
${section("actors-and-tools", "actor-tool-map", "Actors and tools", `${table(["Actor", "Role"], actors.map(actor => [html(actor.label), html(actor.role)]))}
${table(["Tool", "Purpose"], tools.map(tool => [html(tool.label), html(tool.purpose)]))}`)}
${section("operating-loop", "operating-loop", "Operating loop", `${list(["Request enters triage.", "Appointment is booked and dispatched against capacity.", "Technician prepares, completes, and closes the visit.", "Billing invoices and collects payment or names an exception owner.", "Customer communication and technician readiness evidence feed the owner review loop."], true)}`)}
${section("evidence-and-revision", "verification-contract", "Evidence and revision", `${paragraph("The graph must expose the business as a connected operating system: capabilities connect to jobs, jobs connect to process, actors, tools, evidence, metrics, and gaps, and technical/eval specs link back to what they support or evaluate.")}`)}
  </article>`;
  return document({ title: systemSpec.title, meta, graph, body });
}

function renderCapability(capability) {
  const jobSpecs = capability.jobs.map(slug => jobBySlug.get(slug));
  const gaps = jobSpecs.flatMap(job => job.gap ? [job.gap] : []);
  const meta = baseMeta({
    id: capability.id,
    title: capability.title,
    type: "capability",
    parent: systemSpec.id,
    children: jobSpecs.map(job => job.id),
    relatedSpecs: [
      { id: technicalSpec.id, relationship: "supported-by", sections: ["identity-linkage-contract"] },
      { id: evalSpec.id, relationship: "validated-by", sections: ["acceptance-mapping"] }
    ],
    ownedFile: capability.file,
    coverage: [
      {
        id: `CAP-${capability.slug.toUpperCase()}-1`,
        level: "manual",
        status: "existing",
        path: specPath(evalSpec.file),
        mapsTo: [`${capability.id}#capability-intent`],
        evidence: `${capability.label} is present in the expected graph fixture and canvas.`
      }
    ],
    tags: ["capability", capability.slug]
  });
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: capability.id,
    nodes: [
      node({
        id: capability.nodeId,
        type: "capability",
        label: capability.label,
        source: { specId: capability.id, sectionId: "capability-intent" },
        status: "active",
        confidence: "high",
        attributes: { outcome: capability.outcome }
      }),
      node({
        id: capability.metric.id,
        type: "metric",
        label: capability.metric.label,
        source: { specId: capability.id, sectionId: "evidence-and-evaluation" },
        status: "active",
        confidence: "high",
        attributes: { target: capability.metric.target }
      })
    ],
    edges: [
      ...jobSpecs.map(job => edge(`edge:${capability.nodeId}:realized-by:${job.nodeId}`, "realized-by", capability.nodeId, job.nodeId, capability.id, "jobs")),
      edge(`edge:${capability.nodeId}:measured-by:${capability.metric.id}`, "measured-by", capability.nodeId, capability.metric.id, capability.id, "evidence-and-evaluation"),
      ...gaps.map(gap => edge(`edge:${capability.nodeId}:has-gap:${gap.id}`, "has-gap", capability.nodeId, gap.id, capability.id, "revision"))
    ]
  };
  const body = `${section("capability-intent", "capability-intent", capability.title, `${paragraph(capability.outcome)}`, true, "h1")}
  <article class="doc-body">
${section("outcome-contract", "outcome-contract", "Outcome contract", `${paragraph(capability.outcome)}${list(capability.rules)}`)}
${section("jobs", "job-map", "Jobs", `${table(["Job", "Actor", "Outcome"], jobSpecs.map(job => [
    `<a href="./${html(job.file)}">${html(job.label)}</a>`,
    html(actorById.get(job.actor)?.label || job.actor),
    html(job.intent)
  ]))}`)}
${section("evidence-and-evaluation", "verification-contract", "Evidence and evaluation", `${paragraph(`${capability.metric.label}: ${capability.metric.target}`)}${list(jobSpecs.map(job => `${job.evidence.label} proves ${job.label}.`))}`)}
${section("revision", "maintenance", "Revision", gaps.length
    ? `${paragraph("The following gaps stay visible on the graph until resolved.")}${list(gaps.map(gap => gap.label))}`
    : `${paragraph("No current graph gaps are assigned to this capability.")}`)}
  </article>`;
  return document({ title: capability.title, meta, graph, body });
}

function renderJob(job) {
  const capability = capabilityBySlug.get(job.capability);
  const actorIds = [job.actor, ...(job.supportingActors || [])];
  const meta = baseMeta({
    id: job.id,
    title: job.title,
    type: "job",
    parent: capability.id,
    relatedSpecs: [
      { id: capability.id, relationship: "supports", sections: ["jobs"] },
      { id: technicalSpec.id, relationship: "informed-by", sections: ["data-contracts"] },
      { id: evalSpec.id, relationship: "validated-by", sections: ["acceptance-mapping"] }
    ],
    ownedFile: job.file,
    coverage: [
      {
        id: `JOB-${job.slug.toUpperCase()}-1`,
        level: "manual",
        status: "existing",
        path: specPath(evalSpec.file),
        mapsTo: [`${job.id}#job-intent`, `${job.id}#process`],
        evidence: `${job.label} appears with process, actor, tool, and evidence nodes in the expected graph.`
      }
    ],
    tags: ["job", job.capability, job.slug]
  });
  const graphNodes = [
    node({
      id: job.nodeId,
      type: "job",
      label: job.label,
      source: { specId: job.id, sectionId: "job-intent" },
      status: "active",
      confidence: "high",
      attributes: { capability: capability.label }
    }),
    node({
      id: job.processId,
      type: "process",
      label: `${job.label} process`,
      source: { specId: job.id, sectionId: "process" },
      status: "active",
      confidence: "high",
      attributes: { stepCount: job.process.length }
    }),
    node({
      id: job.evidence.id,
      type: "evidence",
      label: job.evidence.label,
      source: { specId: job.id, sectionId: "evidence-and-evaluation" },
      status: "active",
      confidence: "high",
      attributes: { proves: job.label }
    })
  ];
  if (job.gap) {
    graphNodes.push(node({
      id: job.gap.id,
      type: "gap",
      label: job.gap.label,
      source: { specId: job.id, sectionId: "revision" },
      status: "active",
      confidence: "medium",
      attributes: { ownerNeeded: true }
    }));
  }
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: job.id,
    nodes: graphNodes,
    edges: [
      edge(`edge:${job.nodeId}:supports:${capability.nodeId}`, "supports", job.nodeId, capability.nodeId, job.id, "capability-supported"),
      edge(`edge:${job.nodeId}:has-process:${job.processId}`, "has-process", job.nodeId, job.processId, job.id, "process"),
      ...actorIds.map(actorId => edge(`edge:${job.nodeId}:performed-by:${actorId}`, "performed-by", job.nodeId, actorId, job.id, "current-handling")),
      ...job.tools.map(toolId => edge(`edge:${job.nodeId}:uses-tool:${toolId}`, "uses-tool", job.nodeId, toolId, job.id, "context-tools-and-interfaces")),
      edge(`edge:${job.nodeId}:evidenced-by:${job.evidence.id}`, "evidenced-by", job.nodeId, job.evidence.id, job.id, "evidence-and-evaluation"),
      ...(job.gap ? [edge(`edge:${job.nodeId}:has-gap:${job.gap.id}`, "has-gap", job.nodeId, job.gap.id, job.id, "revision")] : [])
    ]
  };
  const body = `${section("job-intent", "job-intent", job.title, `${paragraph(job.intent)}`, true, "h1")}
  <article class="doc-body">
${section("capability-supported", "capability-link", "Capability supported", `${paragraph(`Supports ${capability.label}.`)}`)}
${section("current-handling", "current-state", "Current handling", `${paragraph(job.current)}${table(["Actor", "Role"], actorIds.map(actorId => {
    const actor = actorById.get(actorId);
    return [html(actor?.label || actorId), html(actor?.role || "Referenced actor")];
  }))}`)}
${section("process", "process-contract", "Process", `${list(job.process, true)}`)}
${section("context-tools-and-interfaces", "context", "Context, tools, and interfaces", `${table(["Tool", "Use in job"], job.tools.map(toolId => {
    const tool = toolById.get(toolId);
    return [html(tool?.label || toolId), html(tool?.purpose || "Referenced tool")];
  }))}`)}
${section("evidence-and-evaluation", "verification-contract", "Evidence and evaluation", `${paragraph(job.evidenceText)}`)}
${section("revision", "maintenance", "Revision", `${paragraph(job.gap ? job.gap.label : "No active graph gap is assigned to this job.")}`)}
  </article>`;
  return document({ title: job.title, meta, graph, body });
}

function renderTechnical() {
  const meta = baseMeta({
    id: technicalSpec.id,
    title: technicalSpec.title,
    type: "technical",
    parent: systemSpec.id,
    relatedSpecs: capabilities.map(capability => ({ id: capability.id, relationship: "supports", sections: ["outcome-contract"] })),
    ownedFile: technicalSpec.file,
    tags: ["technical"]
  });
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: technicalSpec.id,
    nodes: [
      node({
        id: technicalSpec.nodeId,
        type: "technical-contract",
        label: technicalSpec.label,
        source: { specId: technicalSpec.id, sectionId: "required-depth" },
        status: "active",
        confidence: "high",
        attributes: { contract: "service job identity links workflow evidence" }
      })
    ],
    edges: [
      edge(`edge:${technicalSpec.nodeId}:supports:${systemSpec.nodeId}`, "supports", technicalSpec.nodeId, systemSpec.nodeId, technicalSpec.id, "identity-linkage-contract"),
      ...capabilities.map(capability => edge(`edge:${technicalSpec.nodeId}:supports:${capability.nodeId}`, "supports", technicalSpec.nodeId, capability.nodeId, technicalSpec.id, "data-contracts"))
    ]
  };
  const body = `${section("required-depth", "decision-rule", technicalSpec.title, `${paragraph("The example client requires every operating artifact to retain a service job identity so scheduling, dispatch, field work, payment, customer communication, and readiness evidence can join into one business graph.")}`, true, "h1")}
  <article class="doc-body">
${section("identity-linkage-contract", "contract", "Identity linkage contract", `${list(["Every appointment, route assignment, work order, invoice, receipt, issue case, review request, capacity plan, and truck restock exception carries a stable service job, customer, or technician reference.", "Derived canvas artifacts may cache graph JSON but never become the source of truth.", "Missing identity links are failure states because the business cannot see how work was handled."], false)}`)}
${section("data-contracts", "contracts", "Data contracts", `${table(["Artifact", "Required relationship"], [["Appointment", "customer + service request + scheduled window"], ["Dispatch assignment", "appointment + technician + route"], ["Work order", "dispatch assignment + technician outcome"], ["Invoice and receipt", "closed work order + customer"], ["Issue/review/readiness artifacts", "service job, technician, or owner review context"]].map(row => row.map(html)))}`)}
${section("failure-modes", "failure-modes", "Failure modes", `${list(["Payment evidence without a closed work order is not acceptable.", "Customer communication without a service job reference cannot prove relationship handling.", "Capacity and stock exceptions must have owners before they can be considered resolved."])}`)}
${section("graph-support", "graph-contract", "Graph support", `${paragraph("This technical spec supports every capability node and the root system node so canvas users can see the implementation contract behind the operating graph.")}`)}
  </article>`;
  return document({ title: technicalSpec.title, meta, graph, body });
}

function renderEval() {
  const meta = baseMeta({
    id: evalSpec.id,
    title: evalSpec.title,
    type: "eval",
    parent: systemSpec.id,
    relatedSpecs: [
      { id: systemSpec.id, relationship: "validates", sections: ["evidence-and-revision"] },
      ...capabilities.map(capability => ({ id: capability.id, relationship: "validates", sections: ["evidence-and-evaluation"] }))
    ],
    ownedFile: evalSpec.file,
    tags: ["eval"]
  });
  const graph = {
    schema: "foundation.visible-business-graph.v1",
    ownerSpecId: evalSpec.id,
    nodes: [
      node({
        id: evalSpec.nodeId,
        type: "evaluation",
        label: evalSpec.label,
        source: { specId: evalSpec.id, sectionId: "verification-contract" },
        status: "active",
        confidence: "high",
        attributes: { evaluates: "visible business graph completeness" }
      })
    ],
    edges: [
      edge(`edge:${evalSpec.nodeId}:evaluates:${systemSpec.nodeId}`, "evaluates", evalSpec.nodeId, systemSpec.nodeId, evalSpec.id, "verification-contract"),
      ...capabilities.map(capability => edge(`edge:${evalSpec.nodeId}:evaluates:${capability.nodeId}`, "evaluates", evalSpec.nodeId, capability.nodeId, evalSpec.id, "acceptance-mapping"))
    ]
  };
  const body = `${section("verification-contract", "verification-contract", evalSpec.title, `${paragraph("The example is acceptable only when a local graph build can show the business system, all capabilities, all jobs, actors, tools, evidence, metrics, and gaps with clickable source HTML links.")}`, true, "h1")}
  <article class="doc-body">
${section("acceptance-mapping", "acceptance", "Acceptance mapping", `${table(["Acceptance", "Mapped graph requirement"], [["Capability completeness", "Five capability nodes connect to the system and their jobs."], ["Job completeness", "Every job node has a process, actor, tool, and evidence edge."], ["Traceability", "Every node and edge resolves to an HTML source section."], ["Support contracts", "Technical and eval specs are linked to the system and capabilities."], ["Visual usefulness", "Canvas views show capability map, capability detail, job/process detail, actor dependencies, tools, evidence, and gaps."]].map(row => row.map(html)))}`)}
${section("coverage-plan", "coverage", "Coverage plan", `${list(["Run graph check against the example repository.", "Build business-graph.json.", "Render canvas.html.", "Run the expected graph fixture eval.", "Open the local canvas and confirm source links, tabs, and graph nodes render."])}`)}
${section("graph-evaluation", "graph-evaluation", "Graph evaluation", `${paragraph("The expected graph fixture under docs/visible-business-graph/expected-graph.json is the deterministic acceptance source for this example.")}`)}
  </article>`;
  return document({ title: evalSpec.title, meta, graph, body });
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents, "utf8");
}

function buildExpectedFixture() {
  return {
    requiredNodeIds: [...expectedNodes].sort(),
    requiredEdgeIds: [...expectedEdges].sort(),
    minimumNodeTypes: {
      index: 1,
      system: 1,
      capability: capabilities.length,
      job: jobs.length,
      process: jobs.length,
      actor: actors.length,
      tool: tools.length,
      evidence: jobs.length,
      metric: capabilities.length,
      gap: jobs.filter(job => job.gap).length,
      "technical-contract": 1,
      evaluation: 1
    },
    requiredCanvasText: [
      "Capability map",
      "Capability detail",
      "Actor dependency",
      "Tool / evidence / gap",
      "Field service business",
      "Schedule service work",
      "Deliver service visit",
      "Collect service payment",
      "Protect customer relationship",
      "Maintain technician readiness",
      "client-system.html"
    ]
  };
}

function buildReadme() {
  return `# Visible Business Client

This is a canonical fictional client repository for Foundation's Visible Business Graph.

The example models Brightline Home Services, a residential field service business. It is intentionally richer than a smoke test: the specs include a system, five capabilities, fourteen jobs, a technical contract, an eval contract, actors, tools, evidence, metrics, and gaps.

Source of truth:

- HTML specs under \`docs/specs/\`
- Graph metadata embedded in each spec's \`graph-metadata\` script
- Generated graph/canvas artifacts under \`docs/visible-business-graph/\`

Useful Foundation commands from the Foundation repo root:

- \`npm run foundation:visible-business-graph:check -- --repo examples/visible-business-client\`
- \`npm run foundation:visible-business-graph:build -- --repo examples/visible-business-client --out examples/visible-business-client/docs/visible-business-graph/business-graph.json\`
- \`npm run foundation:visible-business-graph:render -- --graph examples/visible-business-client/docs/visible-business-graph/business-graph.json --out examples/visible-business-client/docs/visible-business-graph/canvas.html\`
- \`npm run foundation:visible-business-graph:eval -- --repo examples/visible-business-client --graph examples/visible-business-client/docs/visible-business-graph/business-graph.json --canvas examples/visible-business-client/docs/visible-business-graph/canvas.html --expected examples/visible-business-client/docs/visible-business-graph/expected-graph.json\`
`;
}

function buildAgents() {
  return `# AGENTS.md

- Start at \`docs/specs/index.html\` before changing example client specs.
- Specs are HTML-native durable contracts; update \`spec-metadata\`, \`graph-metadata\`, and visible prose together.
- Canvas and graph JSON files under \`docs/visible-business-graph/\` are derived artifacts, not source of truth.
- After spec graph changes, run \`npm run foundation:visible-business-graph:check -- --repo examples/visible-business-client\` from the Foundation repo root.
- Shared process changes belong in Foundation, not this example client.
`;
}

fs.rmSync(specsDir, { recursive: true, force: true });
fs.mkdirSync(specsDir, { recursive: true });
fs.mkdirSync(graphDir, { recursive: true });

write(path.join(repoRoot, "README.md"), buildReadme());
write(path.join(repoRoot, "AGENTS.md"), buildAgents());
write(path.join(specsDir, indexSpec.file), renderIndex());
write(path.join(specsDir, systemSpec.file), renderSystem());
for (const capability of capabilities) write(path.join(specsDir, capability.file), renderCapability(capability));
for (const job of jobs) {
  const jobSpec = jobBySlug.get(job.slug);
  write(path.join(specsDir, jobSpec.file), renderJob(jobSpec));
}
write(path.join(specsDir, technicalSpec.file), renderTechnical());
write(path.join(specsDir, evalSpec.file), renderEval());
write(path.join(graphDir, "expected-graph.json"), `${prettyJson(buildExpectedFixture())}\n`);

console.log(`Wrote ${capabilities.length} capabilities and ${jobs.length} jobs to ${path.relative(process.cwd(), repoRoot)}`);
