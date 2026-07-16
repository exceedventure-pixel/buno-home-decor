import { defineWidgetConfig } from "@medusajs/admin-sdk"

/**
 * Branded login screen.
 *
 * Medusa exposes `login.before` as an official widget zone, so we render our own logo + welcome
 * text here rather than patching the built HTML. The injected <style> also hides Medusa's default
 * avatar mark and its heading block on the login page (both are siblings above this widget) so the
 * branding isn't duplicated — and the style only exists while this widget is mounted, i.e. only on
 * the login screen, so the invite / MFA screens are untouched.
 */

const LOGO = `<svg viewBox="0 0 589.14 368.8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#fdc904" d="M142.36,67.49L19.37,162.94c-4.38,3.4-5.18,9.69-1.79,14.08l122.99,159.1c5.86,7.58,17.99,3.43,17.99-6.14V75.42c0-8.35-9.6-13.06-16.2-7.93Z"/><path fill="currentColor" d="M176.57,271.12L19.09,130.19c-6.95-6.22-2.96-13.11,4.34-17.31L176.77,24.59c3.87-2.23,10.67-3.17,14.02-2.26,4.55,1.23,10.01,5.92,10.01,10.21v229.91c0,4.08-4.07,8.88-7.35,10.36-3.28,1.48-13.12,1.67-16.89-1.69ZM171.53,232.09l.42-177.13L50.64,124.79l120.89,107.3Z"/><circle fill="#fdc904" cx="377.54" cy="165.57" r="80.52"/><path fill="currentColor" d="M500.21,339.58l-28.69-.24h-.02l-.15-91.48-.1-61.13c-.05-27.79-18.26-49.82-41.58-57.99-6.35-2.24-13.11-3.45-19.96-3.45-33.39-.05-60.3,26.58-61.54,59.4-1.26,33.7,24.95,62.81,60.86,63.73l.12,28.42c-42.33-.02-75.62-28.33-86.64-65.51-11.65-39.39,5.98-79.95,39.08-101.2,20.98-13.5,45.23-16.85,68.08-11.31,14.91,3.6,29.2,10.97,41.68,21.76V31.36l.02-18.94,28.81-.07.02,327.24Z"/><path fill="currentColor" d="M327.68,11.84h-42.27c-39.15,46.71-60.65,107.59-60.65,172.09,0,57.09,16.82,111.31,47.83,155.4h38.86c-34.66-39.85-56.12-94.82-56.12-155.4,0-69.57,28.28-131.7,72.36-172.09Z"/><polygon fill="currentColor" points="564.49 12.83 564.49 339.14 535.99 339.41 535.99 322.02 536.09 159.66 535.99 159.54 535.99 47.13 536.16 12.34 564.49 12.83"/><path fill="currentColor" d="M104.22,317.45c1.03,2.82,5.79,11.16,8.12,9.59l12.17-8.18,9.69,15.71-32.17,22.38-28.78-49.43c20.99-20.64,53.24-30.73,81.79-24.96,29.62,5.99,52.58,26.95,65.79,56.14l-20.44,16.53c-9.52-13.8-16.2-23.58-25.36-34.78-18.48-22.59-51.27-22.56-70.81-2.99Z"/></svg>`

const CSS = `
@keyframes bunoPop { from { opacity:0; transform:scale(.86); } to { opacity:1; transform:scale(1); } }
@keyframes bunoUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }

/* Hide Medusa's default mark + heading on the login screen — we render our own below. Scoped to
   the full-screen auth container so nothing else in the app is affected. */
.min-h-dvh.w-dvw .bg-ui-button-neutral { display: none !important; }
.min-h-dvh.w-dvw .mb-4.flex.flex-col.items-center:not(.buno-login) { display: none !important; }

/* Colours come from Medusa's own text utilities (text-ui-fg-*) on the elements, so light/dark both
   work and the logo's black strokes (fill:currentColor) follow the theme. */
.buno-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  margin-bottom: 24px;
  animation: bunoUp .5s ease both;
}
.buno-login .buno-logo {
  height: 58px;
  animation: bunoPop .55s cubic-bezier(.2,.9,.25,1.2) both;
}
.buno-login .buno-logo svg { height: 100%; width: auto; display: block; }
.buno-login .buno-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: .2px;
  animation: bunoUp .5s ease both .12s;
}
.buno-login .buno-sub {
  font-size: 13px;
  animation: bunoUp .5s ease both .24s;
}
`

const LoginBranding = () => {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="buno-login">
        <div
          className="buno-logo text-ui-fg-base"
          dangerouslySetInnerHTML={{ __html: LOGO }}
        />
        <div className="buno-title text-ui-fg-base">Welcome to BUNO HOME DECOR</div>
        <div className="buno-sub text-ui-fg-subtle">Sign in to manage your store</div>
      </div>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "login.before",
})

export default LoginBranding
