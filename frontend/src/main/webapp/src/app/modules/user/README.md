# User Module

Administration of application users: search, create, edit (including permission assignment and password
reset-by-admin), enable/disable, delete. Mounted at `/benutzer` (`user.routes.ts`) and gated in `app.routes.ts`
with `data: { anyPermissionOf: ['USER_MANAGEMENT'] }` — the module manages the very permission that unlocks it.

## Components

```
modules/user/
  ├── resolver/userdata-resolver.component.ts          # UserDataResolver: GET /users/{id}
  ├── resolver/permissionsdata-resolver.component.ts    # PermissionsDataResolver: GET /users/permissions
  ├── views/user-search/user-search.component.ts        # search + paginated result list/table
  ├── views/user-edit/user-edit.component.ts             # thin shell used for BOTH create and edit
  ├── views/user-detail/user-detail.component.ts         # read-only detail + enable/disable/delete menu
  ├── views/login-attempts/user-login-attempts.component.ts # route: benutzer/anmelde-versuche
  │     └── dialogs/delete-login-attempt-dialog.component.ts
  ├── components/user-form/user-form.component.ts        # the actual reactive form (fields + permissions grid)
  ├── account.routes.ts                                  # "Mein Konto": /konto and its tab routes (not behind USER_MANAGEMENT)
  ├── views/user-account/user-account.component.ts       # the frame: mat-tab-nav-bar + router-outlet
  ├── components/user-account-data/user-account-data.component.ts # "Meine Daten" tab: own name and e-mail, editable
  ├── components/user-passwordchange/user-passwordchange.component.ts # "Passwort" tab, wraps the shared password-change form
  ├── components/user-mfa/user-mfa.component.ts          # "Zwei-Faktor-Authentifizierung" tab
  ├── components/push-notification-settings/push-notification-settings.component.ts # "Benachrichtigungen" tab
  ├── components/user-theme-settings/user-theme-settings.component.ts # "Design" tab
  └── components/user-privacy-settings/user-privacy-settings.component.ts # "Datenschutz" tab: own data export, staff privacy notice
```

Despite the `-resolver.component.ts` filename suffix (a convention shared across the whole
frontend), `UserDataResolver` and `PermissionsDataResolver` are plain injectable classes with a `resolve()` method —
not components.

### Routes and how create vs. edit is decided

`user.routes.ts` reuses the *same* `UserEditComponent` for both `erstellen` (create) and `bearbeiten/:id` (edit); the
only difference is which resolvers run:

```ts
{ path: 'bearbeiten/:id', component: UserEditComponent, resolve: { userData: UserDataResolver, permissionsData: PermissionsDataResolver } },
{ path: 'erstellen', component: UserEditComponent, resolve: { permissionsData: PermissionsDataResolver } },
```

`UserEditComponent.userData` is an `input<UserData>()` that simply stays `undefined` on the create route (no
resolver populates it). Everything downstream — "am I creating or editing?", which API call `save()` makes,
whether fields start pre-filled and touched — hinges on that single `undefined` check:

```ts
if (!this.userData()) {
  this.userApiService.createUser(this.userUpdated()!).subscribe(observer);
} else {
  this.userApiService.updateUser(this.userUpdated()!).subscribe(observer);
}
```

### UserFormComponent — the actual form

This is where the interesting form handling lives, and it's worth knowing it uses the newer
`@angular/forms/signals` API (`form()`, `FormField`, `required`, `maxLength`, `validate`) rather than a classic
`FormGroup`/`FormBuilder` — the same pattern used in `checkin`'s `ticket-screen-control` and in the shared
`passwordchange-form`. The general guidance is just "reactive forms for all form handling," which is true but
doesn't tell you which flavor to expect.

Several things worth calling out:

- **Permissions are not part of the signal form at all.** `permissions = signal<UserPermissionFormItem[]>([])` is a
  plain array signal, populated/reset by an `effect()` whenever `userData`/`permissionsData` inputs change, and
  each checkbox is toggled manually via `togglePermission(index)` — there's no `FormField` binding for it. That
  means `isValid()` (which only reads `this.userForm().valid()`) never reflects the permissions grid: a user can
  be saved with every permission unchecked and the form still reports valid.
- **Blank password fields mean "don't change it," not "clear it."** `derivedUserData` explicitly coerces empty
  strings to `undefined` before emitting:
  ```ts
  password: formValue.password || undefined,
  passwordRepeat: formValue.passwordRepeat || undefined,
  ```
  `generatePassword()` (`GET /users/generate-password`) writes the generated value directly into both password
  field values, flips the show/hide signals so the generated password is visible in the clear, and checks
  `passwordChangeRequired` — the point of generating one here is handing it to a colleague, so requiring them to
  set their own on first login is the sensible default. `copyPassword()` copies the field's current value (whether
  generated or typed) to the clipboard, shown next to "Passwort generieren" whenever the field is non-empty.
- **Personnel number, first name and last name are plain fields of the account.** A user carries its own
  (`personnelNumber`, `firstname`, `lastname`: `required`, at most 50 characters, sent trimmed) and is not linked to an
  employee — there is no employee search, no selection dialog and nothing to resolve. The personnel number must be
  unique among users only; a taken one comes back from the backend as a 409 ("Benutzer (Personalnummer: ...)
  existiert bereits!") and is toasted. Employees (the drivers of the food collection) are a separate record kept
  under Einstellungen > Mitarbeiter.
- **Edit mode hides the password fields behind a collapsed "Passwort zurücksetzen" section**
  (`passwordResetExpanded`/`passwordFieldsVisible`), so saving the form can't reset a password nobody meant to
  touch. Create mode has no such gate — `passwordFieldsVisible` is `createMode() || passwordResetExpanded()`, and
  `createMode()` is always true there.
- **`isDirty()`/`markSaved()` back the unsaved-changes navigation guard**, and deliberately don't reuse signal-forms'
  own `dirty()` tracking: that only reacts to control-originated edits and would miss e.g. a permission checkbox
  toggle. Instead a JSON-serialized snapshot of
  `derivedUserData()` is taken right after the form loads (or right after a save, via `markSaved()`), and
  `isDirty()` just compares the live value against it.

### Deleting a user

Two places delete an account, and both go through the same `UserDeleteConfirmDialogComponent`
(`components/user-delete-confirm-dialog/`): the trash button on every row of the user search
(`searchresult-deleteuser-button-<id>`, in the table and in the card list) and "Benutzer löschen" in the detail
screen's state menu (`deleteUserButton`). The dialog (`deleteuser-dialog`) names the account by username and full
name (`deleteuser-name`, `deleteuser-fullname`) and says it is deleted permanently; the buttons are the usual
`okButton`/`cancelButton`. On confirm the screen calls `UserApiService.deleteUser` with
`SUPPRESS_ERROR_TOAST_CONTEXT`, toasts "Benutzer wurde gelöscht!" and then either reloads the current result page
(the search — one page back when the deleted user was the only row of the last page) or navigates to the search
(the detail). A refusal — e.g. the last active administrator, a 409 — is toasted with the backend's own message
under the title "Löschen fehlgeschlagen!". Customers and notes the deleted user created stay and show
"Mitarbeiter gelöscht" as their issuer/author.

### UserEditComponent glue

`userUpdated = linkedSignal<UserData | undefined>(() => this.userData())` holds the live edited value, updated via
the form's `(userDataChange)` output. An `afterRenderEffect()` marks the whole form touched once real `userData`
arrives (so an existing user's validation state — e.g. a field that's actually invalid — shows immediately), but
this deliberately does *not* fire on the blank create form, so a brand-new form doesn't show a wall of "required"
errors before the user has typed anything.

The save button is deliberately always `button-success`, never swapped to `button-danger` while disabled — an
incomplete form isn't an error state, and Material's own disabled styling already communicates "not yet". It also
sits in a `sticky bottom-0` footer so it stays reachable while scrolling the (potentially long) permission grid
above it.

`UserEditComponent implements HasUnsavedChanges` (`common/guards/unsaved-changes.guard.ts`) and both
`benutzer/erstellen`/`benutzer/bearbeiten/:id` wire `canDeactivate: [unsavedChangesGuard]` in `user.routes.ts`, so
navigating away with unsaved changes opens a confirm dialog rather than silently discarding them.
`save()` calls the form's `markSaved()` before navigating to the detail page on success — otherwise that very
navigation would trip the guard over changes that were, in fact, just saved.

### UserSearchComponent

One omnibox (`query` signal) instead of a personnel-number field plus a separate text field, mirroring the
customer search screen's rework (`modules/customer/views/customer-search/`) — read that component before
diverging from the patterns below:

- **The omnibox resolves in `resolveSearch$`**: a query that is a pure number is tried first as an exact
  personnel-number jump (`UserApiService.getUserForPersonnelNumber(...)`) straight to `/benutzer/detail/:id`;
  a 404 falls back to the fuzzy search with the same digits as search text (the personnel number is part of
  `search_text` too), any other query goes straight to the fuzzy search. A non-404 error is toasted instead of
  falling back.
- **Search-as-you-type**: `onQueryInput()` feeds a 300ms-debounced subject (`queryInput`), gated to 2+ characters
  or an empty query; the explicit "Suchen" button and Enter bypass both the debounce and the threshold.
- **Status is a tri-state chip toggle** (`statusFilter` signal: `'alle' | 'aktiv' | 'deaktiviert'`), a single-select
  `mat-chip-listbox` rather than the former "Aktiv" checkbox — a checkbox's unchecked state read as "all", which a
  checkbox does not communicate. `'aktiv'` is the default landing state (same default the checkbox used to start
  at); selecting a chip re-searches without attempting the exact-match jump (`tryExactMatch: false`), same as a
  paginator click.
- **The whole state lives in the URL** (`suche`, `status`, `seite`, `anzahl` query params — `QUERY_PARAMS`), so
  navigating to a user's detail and back restores the same result list instead of forcing a re-search. The default
  `'aktiv'` status and the first page/default page size are omitted from the URL to keep it clean.
- **Row semantics**: the result table/cards have no separate "view" button — a `RouterLink` on the name (desktop)
  or the whole card (mobile), stretched via `after:absolute after:inset-0`, is the row's link to
  `/benutzer/detail/:id`; only the edit action remains as a button (`searchresult-edituser-button-<id>`, filled and
  neutral — not `button-danger`, see #3280).
- **Status chips per row**: "Aktiv"/"Deaktiviert" (green/grey), plus "Passwortänderung erforderlich" when
  `passwordChangeRequired` and "Gesperrt bis <Datum>" when `UserData.lockedUntil` (server-computed by
  `LoginAttemptService.getLockedUntil`, see `UserController.mapToResponse`) is still in the future — `isLocked()`
  compares it against `Date.now()` client-side, same pattern as the login-attempts screen's own status column.
- **Empty state**: "Keine Benutzer gefunden" plus a "Benutzer anlegen" CTA linking to `/benutzer/erstellen`.

The status filter has no validators — it is a query, not data entry — so it is plain component signals rather
than `@angular/forms/signals`' `form()`.

### UserDetailComponent

Read-only view plus a `mat-menu` with enable/disable/delete actions.
`currentUserData = linkedSignal(() => this.userData())` lets `disableUser()`/`enableUser()` update the screen
immediately from the `updateUser()` response, without re-resolving the route.

**Permissions overview**: `permissionGroups` unifies two shapes behind one
`{category, permissions: {permission, granted}[]}[]` so the template renders identically either
way. Collapsed (default) wraps `groupPermissionsByCategory(currentUserData().permissions)` with
`granted: true` on every entry - categories with nothing granted are absent already, since the
input is only what's granted. Expanded ("Alle anzeigen", `showAllPermissions` signal) calls
`buildPermissionOverviewGroups(permissionsData(), currentUserData().permissions)` instead - every
catalog permission (loaded via the same `PermissionsDataResolver` the edit screen uses, wired to
the `detail/:id` route as well) within a category the user holds *something* in, the ones they
don't hold rendered muted (`!opacity-50` + a "Nicht zugewiesen" tooltip); a category the user holds
nothing in at all stays omitted rather than shown fully muted - see
`common/util/permission-grouping.util.ts`.

### "Mein Konto" — what a user settles about their own account, login and device

One page at `/konto` (`account.routes.ts`, lazy-loaded from `shell.routes.ts`), one tab per topic: Meine Daten,
Passwort, Zwei-Faktor-Authentifizierung, Benachrichtigungen, Design and Datenschutz. It is mounted **outside** the
`USER_MANAGEMENT`-gated route tree, behind the login only, so *any* logged-in user reaches it whatever they hold. The
tabs are child routes (`/konto/daten`, `/konto/passwort`, `/konto/zwei-faktor`, `/konto/benachrichtigungen`,
`/konto/design`, `/konto/datenschutz`; `/konto` itself redirects to the first) rendered by `UserAccountComponent` as a
`mat-tab-nav-bar`, so each tab has an address of its own. That is
what lets the guard send a session that has to set up a second factor straight to `/konto/zwei-faktor`:
`AuthGuardService` lets exactly `konto` (the parent the tab renders in) and `zwei-faktor` through for such a session,
the other tabs lead to that one. The user menu has a single entry for all of it; the light/dark choice
(`ThemeService`) lives on the Design tab and applies at once, without a save button.

### UserAccountDataComponent — "Meine Daten"

The first tab: the user's own account, and the part of it that is theirs to change. Username and personnel number
are shown read-only (an administrator assigns them through `UserFormComponent`); first name, last name and e-mail
are a small `@angular/forms/signals` form (`required`/`maxLength`, the shared `email` validator) with a save button
that is disabled while nothing differs from what is saved (`changed`, a `computed` over the trimmed form value
against the loaded account) and a "Verwerfen" button back to it. Saving goes through
`UserApiService.updateAccount` → `PUT /users/account` (`UserAccountRequest`: name and e-mail only - the backend's
`TafelUserDetailsManager.updateOwnAccount` touches nothing else, so unlike an admin's `updateUser` it can neither
hand an account over nor invalidate the session); an error is shown inline from the problem detail rather than
toasted. The e-mail is what the two-factor tab's code by e-mail goes to: `UserMfaComponent` reads the address from
`MfaStatus.emailAddress` and, while it is null, points here instead of offering the method.

### UserPasswordChangeComponent — a different password-change path entirely

This is the "Passwort" tab. It wraps the **shared** `common/views/passwordchange-form/passwordchange-form.component.ts`
(`PasswordChangeFormComponent`); a successful change toasts that the session stays valid and empties the fields. The same
`PasswordChangeFormComponent` is also reused by the login module's forced-password-change flow
(`login/passwortaendern`). It talks to a completely separate endpoint/shape
(`UserApiService.changePassword` → `POST /users/change-password` with `ChangePasswordRequest`) than the
admin-edits-someone-else's-password flow in `UserFormComponent` (which just sets `password`/`passwordRepeat` on
the `UserData` object and goes through `createUser`/`updateUser`). Two distinct password-change code paths live
under this module's directory tree — don't assume there's only one.

### UserLoginAttemptsComponent — Anmelde-Versuche

Read + delete view over the `login_attempts` table (`LoginAttemptEntity`,
`common/auth/components/LoginAttemptService.kt`) that backs failed-login lockout
tracking (`TafelLoginProvider`) — lets an admin see who's currently
tracked/locked and clear an entry to lift a lockout immediately instead of
waiting out `lockoutDurationInSeconds` (#2870). Mounted at
`benutzer/anmelde-versuche`; the backend endpoints live on `UserController`
(`GET`/`DELETE /api/users/login-attempts`), gated by `USER_MANAGEMENT` like the
rest of this module.

- Loads via `UserApiService.getLoginAttempts()`, paginated (`mat-paginator` bound
  to a `PagedResponse<LoginAttemptItem>` signal, `PAGE_SIZE_OPTIONS`, 1-based
  backend page vs 0-based `mat-paginator` index, rendered both above and below
  the table); the backend sorts by most recent failure first, with `id` as a
  stable tiebreaker (`LoginAttemptRepository.findAllByOrderByLastFailureAtDescIdDesc`).
  Table columns: `['username', 'failureCount', 'lastFailureAt', 'lockedUntil',
  'actions']`. The `testid` (`login-attempts-paginator`) lives only on the
  bottom instance so e2e specs that click into it don't have to disambiguate
  two matches.
- **No create, no edit** — this view only ever displays what
  `LoginAttemptService` already tracks from real login attempts.
- **Status column**: `isLocked()` compares `lockedUntil` against `Date.now()`
  client-side (the backend doesn't send a precomputed boolean) so a lock that
  has since expired shows as inactive without needing a reload.
- **Delete** goes through a confirm dialog
  (`delete-login-attempt-dialog.component.ts`, twin of
  `customer/views/customer-detail/dialogs/delete-customer-dialog.component.ts`)
  since deleting is the only destructive action in this view — unlike a form
  there's no "undo via cancel". Deleting clears the row entirely (same effect
  as a successful login via `LoginAttemptService.recordSuccess()`), which is
  what actually lifts a lock, not just a `lockedUntil = null` update.

## Permission model (USER_MANAGEMENT)

Access control for this whole module is enforced **once, at the router boundary**, not per-component:

```ts
{
  path: 'benutzer',
  loadChildren: () => import('./modules/user/user.routes').then(m => m.routes),
  data: { anyPermissionOf: ['USER_MANAGEMENT'] }
}
```

`authGuardChild` → `AuthGuardService.canActivate()` (`common/security/authguard.service.ts`) reads that
`anyPermissionOf` route data and checks it against `AuthenticationService.hasAnyPermissionOf(...)`, redirecting to
login on failure. Note the guard class lives in `common/security/`, not `common/directive/` — worth knowing if
you go looking for it under "custom directives" by habit.

There is **no** use of the `tafelIfPermission` directive (`common/security/tafel-if-permission.directive.ts`)
anywhere inside this module — that directive is for toggling individual pieces of UI within an already-permitted
page (e.g. dashboard widgets), whereas here the entire route subtree is already gated, so nothing inside needs a
second check.

The list of assignable permissions (including `USER_MANAGEMENT` itself) is **not** hardcoded in the frontend — it
comes from the backend at runtime via `PermissionsDataResolver` → `GET /users/permissions`. Once a new
permission is added to the backend enum and given a description in `application.yml`, a corresponding checkbox
appears in `UserFormComponent`'s permission grid automatically — no frontend change needed for that part.

## API surface (`api/user-api.service.ts`, all under `/api/users`)

`changePassword`, `getAccount`/`updateAccount` (the caller's own account, self-service), `getUserForId`,
`getUserForPersonnelNumber`, `searchUser` (paginated), `updateUser`, `deleteUser`, `createUser`, `generatePassword`,
`getPermissions`, `getLoginAttempts` (paginated), `deleteLoginAttempt`.

`deleteUser(id, context?)` takes an optional `HttpContext` so both callers can turn the generic error toast off and
show the backend's own message (see "Deleting a user" below). This module makes no employee calls: employees are a
separate record with no link to a user.

## Gotchas

- `*-resolver.component.ts` files here are not components — just injectable resolver classes.
- `UserFormComponent`'s validity check ignores the permissions grid entirely; don't assume "form valid" implies
  "at least one permission selected."
- Empty password fields are intentionally converted to `undefined`, not `''`, before being sent to the backend.
- There are two unrelated password-change flows under this module: admin-sets-password-for-another-user (via
  `UserFormComponent`/`createUser`/`updateUser`) and self-service change-my-own-password (via
  `UserPasswordChangeComponent` → shared `PasswordChangeFormComponent` → `/users/change-password`), and only the
  first one lives inside the `USER_MANAGEMENT`-gated route tree.
- `UserEditComponent.save()` decides create vs. update purely from whether `userData()` is `undefined` — there is
  no explicit "mode" flag.
- In edit mode, leaving the collapsed "Passwort zurücksetzen" section untouched keeps the existing password;
  create mode has no such gate since a password is mandatory there.
