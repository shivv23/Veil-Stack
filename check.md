# Grant Application — $35k / 6 months

---

## 1. Project & Team

**1.1 Project Name**
```
Veil Stack
```

**Karma Profile** — search and select your team's existing Karma/Gitcoin profile in the dropdown. If you don't have one, create it at karmahq.xyz first.

**1.2 Project GitHub**
```
https://github.com/seetadev/Veil-Stack
```

**1.3 Project Website**
```
https://veil-stack-canteen.vercel.app
```

**1.4 Team Lead / Point of Contact**
```
Sumanjeet — Team Lead (P2P Architecture, Smart Contracts)
GitHub: https://github.com/sumanjeet0012
Preferred channel: [your Telegram/Slack handle]
```

**Email Address**
```
[your email address]
```

**Slack handle**
```
[your Slack handle]
```

**1.5 Category** → select:
```
RFP 1 - Customer-facing products built on Filecoin
```

**Contributing to Core Infrastructure?**
```
N/A. Veil Stack is an application-layer project that drives Filecoin deal demand through container scheduling.
```

**1.6 Open Source Status** → select **Fully Open Source**.

**Deployment status**
```
Canteen.sol deployed and verified on FEVM Calibration testnet:
0x04dEf60e2853E4d654b366cd8103F929c456d4b7
https://calibration.filfox.info/en/address/0x04dEf60e2853E4d654b366cd8103F929c456d4b7
Source: 169 lines, MIT-licensed, Solidity 0.8.20 with OpenZeppelin counters.
Deployer: 0xa36fbb35c7705b47Af369E17A2E1DBC3DE125567 (team wallet, funded via Calibration faucet).
```

---

## 2. Project Scope

**2.1 Project Summary**
```
Veil Stack is a decentralized Docker container scheduler that uses a smart contract on FEVM and a libp2p peer-to-peer mesh. Every container scheduled through Veil Stack will originate a Filecoin storage deal whose CID and deal ID are anchored on-chain. The Canteen contract is deployed and verified on FEVM Calibration (0x04dEf60e2853E4d654b366cd8103F929c456d4b7). This grant funds the deal-on-schedule pipeline — integrating an off-chain deal-maker, automating storage deal proposals on Calibration testnet, and proving that container scheduling can generate verifiable recurring Filecoin storage demand. The codebase is MIT-licensed at github.com/seetadev/Veil-Stack.

All deals during the grant period execute on FEVM Calibration testnet using tFIL. Mainnet migration is post-grant.
```

**2.2 Who does this work support?** → select:
```
☑ Application Builders
☑ Application Users
☑ Network Infrastructure
```

**2.3 Total Funding Requested (USD)**
```
35000
```

**2.4 Milestones & Budget** — add 3 milestones:

| Milestone | Title | Amount |
|-----------|-------|--------|
| M1 | First Paid Deal | 15000 |
| M2 | Deal Pipeline Automation | 12000 |
| M3 | Dashboard, Tests & Documentation | 8000 |

**M1 description (Months 1–2):**
```
Evaluate and select a deal-making approach (FilecoinPay, Boost, or direct Lotus API). Deploy an updated Canteen.sol (V2) on FEVM Calibration with StorageDeal struct and DealAnchored event — the existing V1 (0x04dEf60e2853E4d654b366cd8103F929c456d4b7) is not upgradeable, so a new deployment is required. Connect the scheduler's image-push trigger to the selected deal-maker to propose one tFIL Filecoin storage deal. Verification: DealAnchored(cid, dealId, payer) event on Calibration from the V2 contract; deal ID confirmed active on testnet explorer.
```

**M2 description (Months 3–4):**
```
Extend M1's single-deal path into an automated pipeline: every scheduled container triggers a deal proposal without manual intervention. Add IPFS/Helia for content-addressed image resolution. Implement retry logic, timeout handling, and deal-failure recovery. Build a retrieval-verification client that checks published CIDs against on-chain commitments. Verification: multiple DealAnchored events on FEVM from distinct scheduler runs; reproducible retrieval of image layers against published CIDs.
```

**M3 description (Months 5–6):**
```
Update the existing React dashboard to show live deal and CID status by reading DealAnchored events from the Calibration contract. Write a documented test procedure with CLI verification commands for each pipeline step. Write setup guide, API reference, and operator quick-start. All deal metrics publicly queryable from contract logs. Verification: public dashboard URL, documented test procedure reproducible by any developer with Calibration RPC access, events readable from FEVM Calibration contract logs.
```

---

## 3. Target Network Objectives & KPIs

**Objective 1 — Drive Paid Onchain Deals** → select **Direct**

**Objective 2 — Strengthen Network Profitability & Cryptoeconomics** → select **Indirect**

**Objective 3 — Scale Paid Onchain Flagship Client Adoption** → select **Indirect** (flagship client onboarding is post-grant)

**3.1 Impact pathway**
```
Output: Veil Stack's deal-on-schedule pipeline emits DealAnchored(cid, dealId, payer) events on FEVM Calibration for every container scheduled, each backed by a tFIL Filecoin storage deal via the integrated off-chain deal-maker.

Outcome: A high-value vertical (container scheduling) that produces zero Filecoin demand today generates its first verifiable storage deals on Calibration, proving the model works end-to-end.

Impact: Net-new on-chain deal volume from a previously untapped vertical (Objective 1, direct). Deal payments settle through Filecoin's network, adding fee-bearing activity (Objective 2, indirect). Flagship customer onboarding is post-grant (Objective 3, indirect).
```

**3.2 Verification metrics:**

| Metric | Data source | How it's measured | Target (end of grant) |
|---|---|---|---|
| Storage deals originated (count) | DealAnchored events on FEVM Calibration + deal explorer cross-reference | Each dealId confirmed active on testnet explorer | 10–30 deals over grant period |
| Payment value settled (tFIL) | FilecoinPay transaction logs on Calibration | Summed payments to SP payee addresses | At least 1 settlement per originated deal |
| Unique operator addresses | Canteen FEVM Calibration contract logs | Distinct addresses in DealAnchored events | At least 2 distinct addresses (dev + external tester) |
| Retrieval verification | CID commitments + client logs | Reproducible retrieval matching on-chain CID | Reproducible for every published CID |

**Note:** All deals execute on FEVM Calibration testnet using tFIL. Mainnet deployment is post-grant.

**3.3 References**
```
1. [Name, role, affiliation], contact: [handle/email]
2. [Name, role, affiliation], contact: [handle/email]
3. [Name, role, affiliation], contact: [handle/email]
```
*(Fill with real contacts before submitting.)*

---

## 4. Operations & Team

**4.1 Monthly Operating Burn** → select:
```
$10-$100K (small team)
```

**4.2 What % of total team monthly burn depends on this grant?**
```
50%. The $35k grant covers approximately 6 months at roughly $5,800/month, supplementing existing resources rather than replacing full salaries.
```

**4.3 If this grant is not awarded, what happens?**
```
Without this grant, the deal-maker integration and on-chain deal pipeline is deferred until alternative funding is secured. The Canteen contract remains on Calibration but no deal pipeline is built.
```

**4.4 Core Team**
```
Sumanjeet — Team Lead (P2P Architecture, Smart Contracts). GitHub: github.com/sumanjeet0012. 35 public repositories. Contributions to libp2p ecosystem (Python/JS multi-language forks), IPFS/multiformats tooling (py-ipfs-lite, py-multihash, py-multicodec, py-multiaddr, py-cid).

Shivam Kumar — Core Developer (Smart Contracts, Backend, Dashboard, Docker Orchestration). GitHub: github.com/shivv23. 12 public repositories. Author of Canteen.sol (169 lines, MIT), deployed on FEVM Calibration (0x04dEf60e2853E4d654b366cd8103F929c456d4b7, verified on Filfox). Built the React dashboard (459-line App.js with D3, MetaMask integration). Authored the libp2p cluster (240 lines, gossipsub-based peer discovery and heartbeat), Docker scheduler, and IPFS pinning service.

Combined coverage: P2P networking, Solidity/EVM, React/TypeScript, Docker orchestration, IPFS/Filecoin. No external hires needed. No prior PLFIF or ProPGF funding.
```

**4.5 Has your team received a ProPGF grant or funding from PLFIF before?** → select:
```
No
```

---

## 5. Risks

**5.1 Key risks & dependencies**
```
1. No live storage deals exist in the MVP — every deal KPI depends on building the deal-on-schedule pipeline. Mitigation: the pipeline is the entire grant scope; the MVP already schedules containers locally, so adding a deal-maker API call is an integration task, not research. M1 proves a single end-to-end deal before later work starts.

2. Filecoin Onchain Cloud / FilecoinPay maturity — these services are still hardening. Mitigation: build against documented interfaces, abstract the deal-maker behind a swappable adapter, target Calibration first.

3. FHE overhead — FHE is deferred entirely for this grant. No FHE risk at this scope.

4. Single-owner contract risk — the contract is live on Calibration under single-owner control. Mitigation: only tFIL moves through this contract during the grant; multi-sig governance is a post-grant upgrade if mainnet deployment follows.

5. Team availability at $35k funding level — this is a supplemental grant. Mitigation: milestones are scoped to 2 months each with separable deliverables and clear verification criteria.
```

---

## 6. Other

```
License: MIT.
No prior PLFIF or ProPGF funding.
```

---

## Before submitting

1. **Sign in FIRST** at app.filpgf.io, then fill the form, then submit.
2. Fill in: **email address**, **Slack/Telegram handle**, **3 references**.
3. **Karma profile** — register at karmahq.xyz if not done.
4. Ensure `seetadev/Veil-Stack` README accurately reflects the FEVM focus.

---

*$35k / 6 months / 3 milestones. All deals on Calibration testnet (tFIL). Mainnet migration post-grant. FHE out of scope.*