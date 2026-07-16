// Admin dashboard translation overrides.
//
// The dashboard deep-merges these resources over its own core translations
// (DashboardApp.populateI18n), so a key listed here replaces Medusa's default
// copy while leaving every sibling key intact. This is how the auth screens get
// Buno branding — Medusa exposes no config option for that text.
export default {
  en: {
    translation: {
      login: {
        title: "Welcome to BUNO HOME DECOR",
        hint: "Sign in to access the admin area",
      },
      invite: {
        title: "Welcome to BUNO HOME DECOR",
        successHint: "Get started with the Buno admin right away.",
        successAction: "Start Buno Admin",
      },
    },
  },
}
