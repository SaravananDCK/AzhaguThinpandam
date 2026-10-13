# Testing the mobile app

How to run the Azhagu Thinpandam app on your own phone and what to check.
No Android Studio or Xcode is needed — the app runs inside **Expo Go**.

## What you need

- **Your phone** with the Expo Go app installed
  (Play Store: "Expo Go" · App Store: "Expo Go").
- **This computer** on the **same Wi-Fi** as the phone.
- The website project set up (`npm install` done in the project root).

## Start it (every time)

Open two terminals.

**Terminal 1 — the website**, in `G:\Projects\AzhaguThinpandam`:

    npm run dev

Wait until it says it is ready on `http://localhost:3000`.

**Terminal 2 — the app**, in `G:\Projects\AzhaguThinpandam\mobile`:

    npx expo start

A QR code appears.

- **Android:** open Expo Go and tap *Scan QR code*.
- **iPhone:** open the Camera app, point it at the code, tap the banner.

The first load takes 30–60 seconds while the app is bundled. After that,
edits to the code appear on the phone within a few seconds.

Press `r` in Terminal 2 to reload the app, `m` to open its menu on the
phone (or shake the phone), and `Ctrl+C` to stop.

## Which store the app talks to

`mobile/.env.local` holds the address the app uses:

    EXPO_PUBLIC_API_URL=http://192.168.29.48:3000

That is this computer's address on your Wi-Fi, with the website from
Terminal 1 and the **local database**. So:

- Orders you place land in your local database, not the live one.
- Products, prices and stock are the local copies. To test with live data,
  run the website against a copy of the live backup
  (`$env:DATABASE_URL="file:./live-test.db"; npm run dev` in Terminal 1).
- **Signing in sends a real WhatsApp message**, because the local `.env`
  holds the live messaging keys. Use your own number.

To test against the **live site** instead, delete `mobile/.env.local` and
restart Terminal 2 with `npx expo start -c`. This only works once the API
has been deployed to live.

If this computer's Wi-Fi address changes, run `ipconfig` in a terminal,
copy the *IPv4 Address* of your Wi-Fi adapter into `.env.local`, and
restart Terminal 2 with `npx expo start -c`.

## What to check

Work through these and note anything that looks wrong or feels slow.

**Home**
- Logo banner, category circles and "Customer favourites" load.
- Tapping a category opens Shop filtered to it.
- Pull down to refresh.

**Shop**
- Typing in search filters the list as you pause.
- Category chips filter; "All" clears.
- Scrolling to the bottom loads more products.
- Out-of-stock, Pre-order and Signature badges match the website.

**Product**
- Swipe through photos; dots follow.
- Tap a size: price, strike-through MRP and "% off" update.
- Labels (pills), description, reviews and "You may also like" show.
- Pre-order combos show the pre-order panel with dates; the button reads
  "Pre-order". (Make the Diwali combos visible in admin first — they ship
  hidden.)
- Add to cart with a quantity; the Cart tab badge updates.
- Adding a regular item when the cart holds a pre-order (or the other way
  round) is refused with an explanation.

**Cart**
- Change quantities and remove items; the totals refresh.
- Totals match what the website's cart shows for the same items and state.
- Free goodies appear when the weight crosses a tier (if goodies are on).
- Delivery charge changes with the state of your default address.
- Checkout shows the "coming next" screen — checkout is not built yet.

**Sign in**
- Account → Sign in → enter your number → code arrives on WhatsApp →
  signed in, your name/number shows.
- Wrong code is refused with a clear message.
- "Outside India? Use your email instead" sends the code by email.
- Sign out, then force-close and reopen the app: still signed out.
  Sign in, force-close, reopen: still signed in.

**Account**
- Your orders list shows with status, items and total.
- Tapping an order opens its page on the website (in-app browser).

**General**
- Turn Wi-Fi off on the phone and pull to refresh: a "No connection"
  message with "Try again", not a blank screen or crash.
- Text is readable and nothing overlaps on your phone's screen size.
- Back gestures/buttons behave as expected.

## When something goes wrong

| Problem | What to do |
|---|---|
| Expo Go says it can't connect / "No connection" in the app | Phone and computer on the same Wi-Fi? Is Terminal 1 running? Windows Firewall may be blocking Node — allow it when prompted, or add an inbound rule for port 3000. Check the address in `.env.local`. |
| QR code scans but the app never loads | Press `r` in Terminal 2; if it still hangs, stop it and run `npx expo start -c` to clear the cache. |
| Red error screen on the phone | The message and file name are the useful part — copy them. The same error is printed in Terminal 2. |
| Old data or strange state | Shake the phone → *Reload*. For a clean slate, uninstall Expo Go's copy via its menu or clear the app's storage. |
| Changes don't appear | Save the file; if hot reload has given up, press `r` in Terminal 2. |

## Checks before handing over code

In the `mobile` folder:

    npx tsc --noEmit
    npx expo lint
    npx expo-doctor

All three must pass.

## Not built yet

Checkout (address, payment), the order detail screen, reviews from the
app, Build Your Box, and push notifications. Signing in and ordering use the
website's existing `/api` routes, so any rule change there applies to the
app automatically.
