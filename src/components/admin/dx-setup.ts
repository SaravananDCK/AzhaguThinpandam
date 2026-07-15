"use client";

// DevExtreme license registration — runs once on the client when any admin
// DevExtreme component loads. Put your key in NEXT_PUBLIC_DEVEXTREME_KEY.
import config from "devextreme/core/config";

const licenseKey = process.env.NEXT_PUBLIC_DEVEXTREME_KEY;
if (licenseKey) config({ licenseKey });
