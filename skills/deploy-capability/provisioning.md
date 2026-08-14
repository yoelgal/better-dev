# Provisioning product infrastructure

The deploy surface gives code somewhere to run; a product usually needs services beside it. Each
service below follows the main skill's three rungs - a wired host capability first, the operator
walkthrough second, `/tool-sourcing` third - and shares two disciplines: env var *names* travel through
the agent while values go operator-to-platform directly, and every "it's set up" is premise-verified
with a probe before anything records it. When a service lands, its env var names join the deploy
surface's per-environment config - the `deploy-env` rule `/guardrails-install` records says where that
lives and how required vars are enumerated.

## Database

Rung 1 is a host capability with a provisioning surface (an authenticated platform CLI or marketplace
that can create an instance); rung 2 the operator creates the instance in the provider console from a
short checklist - instance, region, plan - and hands back the *name* of the connection-string env var,
never the string itself.

Premise-verify by connecting: the app's own healthcheck answering from the deploy environment, or a
one-line client connect. A connection string that never connected is a claim. Then confirm the schema
path: migrations run wherever the recorded `deploy-migrate` rule says they run - a fresh database with
un-run migrations fails the first deploy in a way that looks like app breakage, and costs a diagnosis
session to un-confuse.

## Auth provider

The operator creates the application or tenant and hands back the env var names. The step that bites
later is the callback-URL list: it needs every environment's origin - local, preview, prod - because a
list missing the preview origin breaks only inside PRs, the least-debugged place to discover it.

Premise-verify by walking one sign-in round-trip on the *deployed* surface, not only the local one - a
provider config that works on localhost and 403s in prod is the common failure, and only the deployed
walk shows it.

## Transactional email

The operator creates the sending account and verifies domain ownership; the agent's job is
deliverability, which is checkable:

- the domain's SPF record includes the sender (`dig TXT <domain>` shows it),
- the DKIM records the provider issued resolve (`dig TXT <selector>._domainkey.<domain>`),
- one test message actually arrives, and its headers read `spf=pass` and `dkim=pass`.

Mail that "sends" without those records lands in spam silently, and the failure arrives weeks later as
users who never got the reset email. The deliverability check is the done-criterion - a 200 from the
send call proves the API key works, nothing more.

## Domain and DNS

The purchase is the operator's; the records are checkable: the A/CNAME the platform asked for resolves
(`dig +short <domain>`), the certificate issues, and the apex and `www` both answer whichever redirect
was chosen. DNS propagates slowly and unevenly - probe the authoritative nameserver
(`dig @<nameserver> <domain>`) to separate "not configured" from "not propagated yet"; the second is a
wait, not a defect.

## Record what landed

Each provisioned service ends the way the main skill does: hand the observed values to
`/guardrails-install` to record (the `deploy-env` location among them), and note the adoption in
memory - `.better-dev/bin/bd-mem remember "provisioned <service> on <provider> - <where its config
lives>"` - so a later session reuses the decision instead of re-provisioning. A service the operator
declined or deferred is recorded as the explicit negative with its reason: a deferral someone chose
beats a gap nobody noticed.
