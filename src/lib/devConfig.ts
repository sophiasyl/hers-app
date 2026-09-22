// Dev convenience — auto-login for testing.
//
// While DEV_AUTOLOGIN is true the app silently signs into a shared, already
// onboarded test account on launch, so you never have to type credentials or
// redo onboarding every time you open it. This is a TESTING shortcut only.
//
// ⚠️ Set DEV_AUTOLOGIN = false before any public launch — otherwise anyone who
// opens the site lands in this shared demo account.
export const DEV_AUTOLOGIN = true;
export const DEV_EMAIL = 'demo@hers.app';
export const DEV_PASSWORD = 'Hers-dev-8dcc88320923698b39e017b9';
