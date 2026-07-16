"use client";

// DevExtreme license registration. NEXT_PUBLIC_DEVEXTREME_KEY holds the
// base64-encoded LCP token (generated from your LCX account key via
// `npx devextreme-license`; base64 so the raw LCP's $ characters survive
// .env parsing). Registered once on the client before any grid renders.
import config from "devextreme/core/config";

const encoded = process.env.NEXT_PUBLIC_DEVEXTREME_KEY;
if (encoded) {
  let licenseKey = encoded;
  try {
    // LCP tokens start with "LCP"; anything else is treated as base64
    if (!encoded.startsWith("LCP")) licenseKey = atob(encoded);
  } catch {
    licenseKey = encoded;
  }
  config({ licenseKey });
}
