# Automatic Android deployment

The app ships changes two ways. **OTA updates** (EAS Update) push JavaScript and
asset changes to already-installed apps instantly — these run automatically on
every push to `main`. **Native builds** (EAS Build) are only needed when the
change touches native config (app.json, permissions, icon/splash, a new native
dependency).

| Change you made                         | How it ships            | Automatic? |
| --------------------------------------- | ----------------------- | ---------- |
| Screens, logic, styles, assets, strings | OTA (`eas update`)      | ✅ on push |
| app.json / permissions / icon / splash  | Native build → **Play** | ✅ on push (build + auto-submit) |
| New native dependency                   | Native build → **Play** | ✅ on push (build + auto-submit) |

The production build workflow uses `--auto-submit`, so a native change is built
**and uploaded to Google Play automatically**. No manual `eas submit` needed.

## One-time activation (required before any of this runs)

1. **Install the updates runtime** (adds `expo-updates`, reconciles versions):

   ```bash
   cd blackpine-app
   npx expo install expo-updates
   ```

   `app.json` is already configured with the `updates.url` and
   `runtimeVersion` policy — this just adds the package.

2. **Create an Expo access token**: https://expo.dev/accounts/[account]/settings/access-tokens
   → "Create token".

3. **Add it to GitHub**: repo → Settings → Secrets and variables → Actions →
   New repository secret → name `EXPO_TOKEN`, value = the token.

4. **Make the first production build** so there is a binary the OTA updates can
   attach to (the channel is `production`):

   ```bash
   eas build --platform android --profile production
   ```

   Install/submit that build once. From then on every push to `main` delivers an
   OTA update to it automatically.

## One-time setup for automatic Play submission

The native-build workflow auto-uploads to Google Play. To enable it:

1. **Google Play Developer account** ($25, once) and **create the app** in
   https://play.google.com/console.
2. **First upload by hand** — Google requires the very first `.aab` of a new app
   to be uploaded manually (Play Console → Production → Create new release).
   Download that `.aab` from the EAS build page (step 4 above) and upload it once.
3. **Service-account key** for hands-off uploads after that:
   - Play Console → **Setup → API access** → link a Google Cloud project →
     create a **service account** → grant **Release manager** → download the
     **JSON key**.
   - Copy the **entire JSON contents** into a GitHub secret named
     **`GOOGLE_SERVICE_ACCOUNT_JSON`** (repo → Settings → Secrets → Actions).
   - The workflow writes it to `google-service-account.json` at run time (this
     file is git-ignored — never commit it).

After that, any push that changes native config builds **and** submits to Play
to the `production` track automatically. The `preview` profile (manual dispatch)
builds an installable APK and does **not** submit.

## Notes

- The workflows live in `.github/workflows/`. If this app is a **subfolder of a
  larger repo**, move that folder to the repo root and add a
  `working-directory: blackpine-app` (or `defaults.run.working-directory`) to
  each job, plus scope the `paths:` filters to `blackpine-app/**`.
- OTA updates only reach apps with the **same `runtimeVersion`**. Because the
  policy is `appVersion`, bumping `version` in app.json starts a new runtime —
  ship a native build for that version before OTA updates will land.
- To roll back a bad OTA: `eas update:roll-back-to-embedded --branch production`
  or republish the previous commit.
