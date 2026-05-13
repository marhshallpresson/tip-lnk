# Design Spec: Dynamic WaaS & Router v7 Opt-in

## Purpose
Fix initialization issues with Dynamic SDK by explicitly enabling WaaS and embedded wallets. Additionally, opt-in to React Router v7 future flags to silence React 19 warnings and prepare for the upcoming major version.

## Proposed Changes

### 1. `artifacts/tipstack/src/main.jsx`

Update `dynamicSettings` to include the following:
```javascript
  embeddedWallets: {
    automaticEmbeddedWalletCreation: true,
  },
  waas: {
    enabled: true,
  },
```

Update `BrowserRouter` to include the `future` prop:
```javascript
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
  <App />
</BrowserRouter>
```

## Verification Plan
1.  **Static Analysis**: Verify `main.jsx` content manually.
2.  **Runtime Check**: (If environment permits) Verify that React 19 warnings for Router v7 are gone and Dynamic SDK initializes correctly with WaaS.

## Approaches Considered
### Approach 1: Direct Modification (Recommended)
- **Pros**: Simple, minimal diff, directly addresses the task.
- **Cons**: `main.jsx` becomes slightly more verbose.

### Approach 2: Extract to Config
- **Pros**: Keeps `main.jsx` clean.
- **Cons**: Over-engineering for a simple config change; adds a new file.

**Recommendation**: Approach 1.
