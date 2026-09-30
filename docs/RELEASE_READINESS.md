# Release readiness

This is an Android development milestone, not a production release certification.

- SDK levels retained: min 24, compile 37, target 36; Kotlin 2.2.0; NDK 27.1.12297006; Gradle 9.4.1.
- Target 36 aligns with the [current Google Play target requirement](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en), checked September 30, 2026. Recheck before submission.
- The starter release variant still uses the debug signing key. Configure a private upload key using CI/local secret storage before generating the submission AAB. No production signing credentials have been created or committed.
- Native libraries include React Native, Hermes, Reanimated, Worklets, Gesture Handler, and Media3. Verify the **release arm64 AAB/APKs** and run on a 16 KB device. An x86 debug emulator does not prove [16 KB compatibility](https://developer.android.com/guide/practices/page-sizes).
- Complete Play Console Data Safety, content rating, and ads declarations against the final shipped binary. This milestone contains no ad SDK, account, analytics, paid API, or intentional media upload.
- Permissions: no new runtime permissions. The starter INTERNET permission remains for React Native development. The media picker grants access to selected content URIs; FileProvider grants access to an explicitly shared generated export.
- Publish a privacy policy with the developer identity and contact information. Those details are not in this repository, so a final legal policy cannot be completed here.
- Audit merged release permissions and dependency disclosures, run accessibility/RTL/font scaling checks, OEM codec tests, large/long media tests, process death and low storage tests, release AAB validation, and physical-device media verification before release.
- iOS native creation/export is not implemented. The existing iOS project remains intact, with an Android availability message for creation actions.

## Privacy behavior to describe in the policy

Storyvero stores edit metadata and generated exports privately on the device. Selected photos/videos are accessed through user-granted local references. Normal editing does not upload media. Sharing and Save to Files are explicit user actions; a chosen destination app/provider has its own privacy behavior. Deleting a project keeps originals and exports; deleting an app-owned export does not delete user originals or copies saved elsewhere. Clearing application data or uninstalling removes private projects/exports. Persisted URI permissions are managed by Android; removing source media can make a project unavailable.
