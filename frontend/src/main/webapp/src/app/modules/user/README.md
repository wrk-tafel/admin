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
  └── components/user-passwordchange/user-passwordchange.component.ts # wraps the shared password-change form
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

Two things worth calling out:

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
  field values and flips the show/hide signals so the generated password is visible in the clear — useful to know
  when writing a Cypress test against this button.

### UserEditComponent glue

`userUpdated = linkedSignal<UserData | undefined>(() => this.userData())` holds the live edited value, updated via
the form's `(userDataChange)` output. An `afterRenderEffect()` marks the whole form touched once real `userData`
arrives (so an existing user's validation state — e.g. a field that's actually invalid — shows immediately), but
this deliberately does *not* fire on the blank create form, so a brand-new form doesn't show a wall of "required"
errors before the user has typed anything.

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

### UserPasswordChangeComponent — a different password-change path entirely

This wraps the **shared** `common/views/passwordchange-form/passwordchange-form.component.ts`
(`PasswordChangeFormComponent`), and it's mounted **outside** the `USER_MANAGEMENT`-gated route tree: as
`path: 'passwortaendern'` directly under the top-level authenticated layout in `app.routes.ts`, so *any* logged-in
user can change their own password regardless of whether they hold `USER_MANAGEMENT`. The same
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

`changePassword`, `getUserForId`, `getUserForPersonnelNumber`, `searchUser` (paginated), `updateUser`,
`deleteUser`, `createUser`, `generatePassword`, `getPermissions`, `getLoginAttempts` (paginated),
`deleteLoginAttempt`.

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
