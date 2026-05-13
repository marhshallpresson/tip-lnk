# Dynamic WaaS & Router v7 Opt-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Dynamic SDK initialization issues and opt-in to React Router v7 future flags in `main.jsx`.

**Architecture:** Surgical update of `main.jsx` to add missing configuration properties to `dynamicSettings` and `BrowserRouter`.

**Tech Stack:** React, Dynamic SDK, React Router v6 (opting into v7).

---

### Task 1: Root Configuration & Router v7 Opt-in

**Files:**
- Modify: `artifacts/tipstack/src/main.jsx`

- [ ] **Step 1: Update dynamicSettings**

Update the `dynamicSettings` object in `artifacts/tipstack/src/main.jsx` to include `embeddedWallets` and `waas`.

```javascript
const dynamicSettings = {
  environmentId: import.meta.env.VITE_DYNAMIC_ENVIRONMENT_ID,
  appName: 'Tip Stack',
  walletConnectors: [SolanaWalletConnectors],
  suppressEndUserConsoleWarning: true,
  logLevel: dynamicLogLevel,
  // Add explicit WaaS configuration
  embeddedWallets: {
    automaticEmbeddedWalletCreation: true,
  },
  // Explicitly enable WaaS infrastructure
  waas: {
    enabled: true,
  },
  overrides: {
    evmNetworks: [],
  },
  // ... rest of settings ...
};
```

- [ ] **Step 2: Update BrowserRouter**

Update the `BrowserRouter` component in `artifacts/tipstack/src/main.jsx` to include the `future` prop.

```javascript
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <App />
</BrowserRouter>
```

- [ ] **Step 3: Verify changes**

Ensure `waas: { enabled: true }` is present and `BrowserRouter` has the `future` prop.

- [ ] **Step 4: Commit**

```bash
git add artifacts/tipstack/src/main.jsx
git commit -m "fix: enable Dynamic WaaS and opt-in to Router v7 future flags"
```
