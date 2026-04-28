# Plan: Onboarding Redesign for Mobile Responsiveness & Modern UI

Upgrade the onboarding flow to a modal-based, mobile-first design inspired by modern multi-step interfaces.

## Objective
- Replace the horizontal circle-based `StepIndicator` with a compact, mobile-friendly version.
- Wrap onboarding steps in a sleek, centered modal-like container.
- Improve responsiveness of all individual onboarding steps.
- Add smooth transitions between steps.

## Proposed Changes

### 1. `src/components/StepIndicator.jsx`
- Replace current horizontal list with a compact "Dots & Label" or "Progress Bar" indicator.
- Add "Step X of Y" text for clarity.
- Ensure it takes minimal vertical space on mobile.

### 2. `src/App.jsx`
- Modify the `/onboarding` route layout:
    - Add a semi-transparent backdrop (`bg-surface-950/80 backdrop-blur-sm`).
    - Use a focused, centered container for the onboarding steps.
    - Implement a "Modal" feel where the content is elevated.

### 3. Individual Step Components
- **`RoleSelection.jsx`**: Optimize grid for mobile (ensure buttons don't get too small or cramped).
- **`CategorySelection.jsx`**: Improve chip-selection layout for mobile.
- **`DomainRegistration.jsx`**: Ensure the search input and results are mobile-optimized.
- **`SocialLinking.jsx`**: Adjust button sizes and layout for vertical stacking on mobile if needed.
- **`ProfileEditor.jsx`**: Streamline form fields and image upload for mobile.
- **`OnboardingComplete.jsx`**: Clean up the success state.

### 4. Global Styles (`src/index.css`)
- Add specific transition classes for "slide" animations between steps (using `AnimatePresence` from `framer-motion` if available, otherwise CSS transitions).
- *Self-correction*: I don't see `framer-motion` in the file list, so I will stick to CSS transitions/animations as I cannot add new libraries.

## Verification & Testing
- Test onboarding flow on multiple screen sizes (Mobile, Tablet, Desktop).
- Verify state persistence between steps (Next/Back).
- Ensure "Back" buttons work correctly in the new layout.
- Confirm final completion redirects to `/dashboard` correctly.
