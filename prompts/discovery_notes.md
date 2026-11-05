# Discovery Notes – SauceDemo (Web) + GoRest v2 (API)

**Discovery date:** 2026-11-05
**Method:** Temporary Playwright TypeScript specs under `tests/` (run with `npx playwright test <file> --project=chromium`, then deleted). No Playwright MCP browser was available in this session.

Scenario tags: `POSITIVE`, `NEGATIVE`, `EDGE`, `E2E`. Scenario IDs (e.g. `W-LOGIN-01`) are referenced by the prompt files for traceability.

---

## Project Setup

### `playwright.config.ts` (read only)

| Item | Value observed |
|---|---|
| `testDir` | `./tests` |
| Projects | `chromium` only (firefox/webkit commented out) |
| `baseURL` | **not set** (neither web nor API) |
| `testIdAttribute` | **not set**, so `page.getByTestId()` would look for `data-testid`. Use `page.locator('[data-test="..."]')` instead |
| `dotenv` loaded in config | **No**. Code that reads `process.env` must call `dotenv.config()` itself |
| `grep` | `/@master/`: **only tests whose title contains `@master` are run** |
| `timeout` | 30 000 ms per test; `expect` timeout is the default 5 000 ms |
| Other | `headless: false`, `fullyParallel: true`, reporters: list, html (`reports/`), `./utils/CustomReporter.ts`, `allure-playwright` |

### `package.json` (read only)

| Package | Installed? |
|---|---|
| `@playwright/test` | yes (`^1.64.1`, devDependency) |
| `typescript` | **NO**. `npx tsc --noEmit` is not available (install: `npm i -D typescript`) |
| `@faker-js/faker` | yes (`^10.6.0`, ESM-only package; loads fine under Node v24.18.0) |
| `dotenv` | yes (`^18.0.9`) |
| `csv-parse` | yes (`^7.0.3`) |
| `xlsx` | yes (`^0.18.5`) |
| `ajv` | yes (`^8.20.0`) |
| `ajv-formats` | **NO** (install: `npm i -D ajv-formats`) |
| npm scripts | none (`"scripts": {}`) |
| Other present | `allure-playwright`, `@axe-core/playwright`, `luxon` |

### `tsconfig.json` (read only)

- `resolveJsonModule: true`, `esModuleInterop: true`, so `import fs from 'fs'` default imports work.
- `module`/`moduleResolution`: `Node16`; `package.json` `"type": "commonjs"`.
- `include` contains **only** `playwright.config.ts`, so a plain `npx tsc --noEmit` type-checks only the config file.

### `.env` / `.env.example`

- `.env.example` **does not exist** in the project.
- `.env` already existed (opencart/fakestore values). Existing values were not changed. Appended keys: `WEB_BASE_URL=https://www.saucedemo.com/` and `GOREST_TOKEN` (empty at first; the user supplied a token later and it was saved to `.env`, see A7).
- Existing `API_BASE_URL` holds a value from a previous project and was **not** overwritten. The framework does not read it: API code uses `Routes.BASE_URL`.
- `.env` **is** listed in `.gitignore`.
- `playwright-mcp-context.md`: **not present**.

---

# WEB – https://www.saucedemo.com/

All locators below are `data-test` attribute values. The app is a single-page React app: the URL changes **before** the new view renders, so tests must wait with web-first assertions (e.g. `await expect(title).toHaveText('Your Cart')`), never by reading text immediately after `click()`.

## W1. Login page

**Did:** opened `/`, read the credential panels, submitted every invalid combination, closed the error.

**Observed:**
- Browser `<title>`: `Swag Labs`.
- Elements: `username` (input, placeholder `Username`), `password` (input, placeholder `Password`), `login-button` (input, value `Login`), `login-credentials`, `login-password`.
- Accepted usernames listed on the page: `standard_user`, `locked_out_user`, `problem_user`, `performance_glitch_user`, `error_user`, `visual_user`.
- Password shown: `secret_sauce`.
- On error: `h3[data-test="error"]` + `button[data-test="error-button"]` (clicking it removes the error). URL stays `https://www.saucedemo.com/`.

| Case | Exact error text |
|---|---|
| Invalid username (`invalid_user` / `secret_sauce`) | `Epic sadface: Username and password do not match any user in this service` |
| Invalid password (`standard_user` / `wrong_password`) | `Epic sadface: Username and password do not match any user in this service` |
| Locked out (`locked_out_user` / `secret_sauce`) | `Epic sadface: Sorry, this user has been locked out.` |
| Blank username | `Epic sadface: Username is required` |
| Blank password | `Epic sadface: Password is required` |
| Both blank | `Epic sadface: Username is required` |
| Username = single space `" "` (not trimmed by the app) | `Epic sadface: Username and password do not match any user in this service` |

**Scenarios derived:**
- `W-LOGIN-01` POSITIVE: valid login with `standard_user` lands on `/inventory.html` with title `Products`.
- `W-LOGIN-02` NEGATIVE: invalid username / invalid password show the "do not match" error.
- `W-LOGIN-03` NEGATIVE: locked-out user shows the locked-out error.
- `W-LOGIN-04` NEGATIVE: blank username, blank password, both blank show the "required" errors.
- `W-LOGIN-05` EDGE: clicking `error-button` dismisses the error message.
- `W-LOGIN-06` POSITIVE/NEGATIVE: data-driven login from JSON/CSV/XLSX (all rows above, plus every valid user).

## W2. Behaviour per user (all with `secret_sauce`)

| User | Login | Observed behaviour |
|---|---|---|
| `standard_user` | ~0.7 s | Everything works as expected. |
| `locked_out_user` | fails | Locked-out error (W1). |
| `problem_user` | ~0.7 s | All 6 inventory images have the same broken src containing `sl-404`. Sorting has no effect (list stays A→Z, `active-option` stays `Name (A to Z)`). Add to cart works only for Backpack and Bike Light (Bolt T-Shirt and others do nothing). Remove on inventory does nothing. Clicking **Sauce Labs Backpack** (`item-4-title-link`) opens `inventory-item.html?id=5` showing **Sauce Labs Fleece Jacket**. Checkout: typing into Last Name writes into First Name; Continue then shows `Error: Last Name is required`. |
| `performance_glitch_user` | **~5.6 s** (longer than the default 5 s `expect` timeout) | After login, everything works like `standard_user`. |
| `error_user` | ~0.7 s | Every sort selection shows a browser alert `Sorting is broken! This error has been reported to Backtrace.` and the list does not change. Add to cart fails for Bolt T-Shirt and others (only Backpack/Bike Light are added). Remove on inventory does nothing; Remove inside the cart works. Checkout: Last Name field cannot be filled (stays empty), yet Continue still goes to the overview. **Finish does nothing**: stays on `/checkout-step-two.html` with title `Checkout: Overview`. |
| `visual_user` | ~0.7 s | Inventory prices are **random and change on every render/reload** (e.g. Backpack `$45.14`, then `$83.21`). Backpack image is the broken `sl-404` image. Cart and overview show the **real** price (`$29.99`, tax `$2.40`, total `$32.39`). |

**Scenarios derived:**
- `W-USER-01` POSITIVE: `performance_glitch_user` logs in successfully (needs an assertion timeout above 5 s, e.g. `{ timeout: 15000 }`).
- `W-USER-02` EDGE: `problem_user` inventory images all use the broken `sl-404` image.
- `W-USER-03` EDGE: `problem_user` clicking Sauce Labs Backpack opens Sauce Labs Fleece Jacket.
- `W-USER-04` EDGE: `error_user` choosing a sort option shows the alert `Sorting is broken! This error has been reported to Backtrace.`
- `W-USER-05` EDGE: `error_user` Finish on the overview does not complete the order (URL stays `/checkout-step-two.html`).
- `W-USER-06` EDGE: `visual_user` inventory price of Sauce Labs Backpack differs from the catalog price, but the cart shows `$29.99`.

## W3. Inventory page (`/inventory.html`)

**Observed:**
- `title` = `Products`; elements: `shopping-cart-link`, `shopping-cart-badge` (only present when the cart is not empty), `product-sort-container` (select), `active-option`, `inventory-list`, `inventory-item`, `inventory-item-name`, `inventory-item-desc`, `inventory-item-price`, `item-{id}-title-link`, `item-{id}-img-link`, buttons `add-to-cart-{slug}` / `remove-{slug}`.
- Products (standard_user):

| Name | Price | Detail id | Button slug |
|---|---|---|---|
| Sauce Labs Backpack | $29.99 | 4 | `sauce-labs-backpack` |
| Sauce Labs Bike Light | $9.99 | 0 | `sauce-labs-bike-light` |
| Sauce Labs Bolt T-Shirt | $15.99 | 1 | `sauce-labs-bolt-t-shirt` |
| Sauce Labs Fleece Jacket | $49.99 | 5 | `sauce-labs-fleece-jacket` |
| Sauce Labs Onesie | $7.99 | 2 | `sauce-labs-onesie` |
| Test.allTheThings() T-Shirt (Red) | $15.99 | 3 | `test.allthethings()-t-shirt-(red)` |

- Sort options (value / label) and the order each produced:

| value | label | Resulting order |
|---|---|---|
| `az` | Name (A to Z) | Backpack, Bike Light, Bolt T-Shirt, Fleece Jacket, Onesie, Test.allTheThings() (default) |
| `za` | Name (Z to A) | exact reverse of `az` |
| `lohi` | Price (low to high) | Onesie 7.99, Bike Light 9.99, Bolt T-Shirt 15.99, Test.allTheThings() 15.99, Backpack 29.99, Fleece Jacket 49.99 |
| `hilo` | Price (high to low) | Fleece Jacket 49.99, Backpack 29.99, Bolt T-Shirt 15.99, Test.allTheThings() 15.99, Bike Light 9.99, Onesie 7.99 |

- `active-option` text changes to the selected label.
- Two products share `$15.99`, so the price sort must be checked as numeric non-decreasing / non-increasing order rather than as an exact name list.

**Scenarios derived:**
- `W-INV-01` POSITIVE: all 6 products and prices are shown and match the catalog.
- `W-INV-02` POSITIVE: each sort option orders names/prices correctly and updates `active-option`.

## W4. Product detail (`/inventory-item.html?id={id}`)

**Observed:** `back-to-products` (`Back to products`), `inventory-item-name`, `inventory-item-desc`, `inventory-item-price`, image `item-{slug}-img`, button `add-to-cart` → becomes `remove` after click; badge shows `1`, and goes away after Remove. Back returns to `/inventory.html`. Names/prices on every detail page match the inventory.

**Scenarios derived:**
- `W-DETAIL-01` POSITIVE: open every product from the inventory; name and price match.
- `W-DETAIL-02` POSITIVE: Add/Remove on the detail page updates the badge; Back to products returns to inventory.

## W5. Cart (`/cart.html`)

**Observed:** title `Your Cart`; `cart-list`, `cart-quantity-label` (`QTY`), `cart-desc-label` (`Description`), per item `inventory-item`, `item-quantity` (`1`), `inventory-item-name`, `inventory-item-price`, `remove-{slug}`; buttons `continue-shopping` (`Continue Shopping`, goes to `/inventory.html`) and `checkout` (`Checkout`). Badge counts items (2 items → `2`; remove one → `1`; remove all → badge element gone).

**Scenarios derived:**
- `W-CART-01` POSITIVE: add the Backpack; badge `1`; cart shows name, quantity `1` and price `$29.99`.
- `W-CART-02` POSITIVE: remove the item; badge disappears and the cart has no `inventory-item`.
- `W-CART-03` POSITIVE: Continue Shopping returns to `/inventory.html`.

## W6. Checkout step one (`/checkout-step-one.html`)

**Observed:** title `Checkout: Your Information`; inputs `firstName` (placeholder `First Name`), `lastName` (`Last Name`), `postalCode` (`Zip/Postal Code`); `continue` (input), `cancel` (back to `/cart.html`). Errors appear in `h3[data-test="error"]`:

| Case | Exact error |
|---|---|
| All fields blank | `Error: First Name is required` |
| First name blank | `Error: First Name is required` |
| Last name blank | `Error: Last Name is required` |
| Postal code blank | `Error: Postal Code is required` |
| `John` / `Smith` / `1010` | goes to `/checkout-step-two.html` |

**Scenarios derived:**
- `W-CHK-01` POSITIVE/NEGATIVE: data-driven validation (rows above).
- `W-CHK-02` EDGE: Cancel returns to `/cart.html`.

## W7. Checkout overview (`/checkout-step-two.html`)

**Observed:** title `Checkout: Overview`; `payment-info-value` `SauceCard #31337`, `shipping-info-value` `Free Pony Express Delivery!`, `subtotal-label`, `tax-label`, `total-label`, buttons `cancel` (goes to `/inventory.html`) and `finish`.

| Cart | Item total | Tax | Total | Tax ÷ item total |
|---|---|---|---|---|
| Backpack + Bike Light | `Item total: $39.98` | `Tax: $3.20` | `Total: $43.18` | 0.08004 |
| Backpack only (visual_user) | `Item total: $29.99` | `Tax: $2.40` | `Total: $32.39` | 0.08003 |
| All 6 products | `Item total: $129.94` | `Tax: $10.40` | `Total: $140.34` | 0.08003 |

**Derived tax rate: 0.08 (8 %)**, tax rounded to 2 decimals (39.98 × 0.08 = 3.1984 → 3.20; 129.94 × 0.08 = 10.3952 → 10.40).

**Scenarios derived:**
- `W-OVR-01` POSITIVE: item total = sum of prices; tax = round(item total × 0.08, 2); total = item total + tax.
- `W-OVR-02` EDGE: Cancel on the overview returns to `/inventory.html`.

## W8. Checkout complete (`/checkout-complete.html`)

**Observed:** title `Checkout: Complete!`; `complete-header` = `Thank you for your order!`; `complete-text` = `Your order has been dispatched, and will arrive just as fast as the pony can get there!`; image `pony-express`; `back-to-products` = `Back Home` (goes to `/inventory.html`); cart badge gone. Also a **`generate-pdf-order` (`Generate PDF order`)** button, which was not in the original checklist.

**Scenarios derived:**
- `W-E2E-01` E2E: login → add `cartSelection` → cart → checkout → overview math → Finish → confirmation → Back Home → badge gone.
- UNVERIFIED: what `Generate PDF order` does (it was not clicked). No scenario.

## W9. Burger menu

**Observed:** open with button `#react-burger-menu-btn` (accessible name `Open Menu`; the button itself has no `data-test`; the icon image is `data-test="open-menu"`), close with `#react-burger-cross-btn` (`Close Menu`). Items:

| Text | data-test | Behaviour |
|---|---|---|
| All Items | `inventory-sidebar-link` | goes to `/inventory.html` (tested from the cart) |
| Dynamic Catalog | `dynamic-catalog-sidebar-link` | **New item, not in the checklist.** Expands a sub-menu `Lazy Load`, `Spinner`, `Slider`; URL stays the same |
| About | `about-sidebar-link` | `href="https://saucelabs.com/"`, navigates there |
| Logout | `logout-sidebar-link` | goes to `https://www.saucedemo.com/` (login page) |
| Reset App State | `reset-sidebar-link` | Cart badge disappears and the cart is empty, **but** inventory buttons still say `Remove` until the page is reloaded |

**Scenarios derived:**
- `W-MENU-01` POSITIVE: Logout returns to the login page; afterwards `/inventory.html` is blocked (W10).
- `W-MENU-02` EDGE: Reset App State empties the cart (badge gone, cart has 0 items).
- `W-MENU-03` POSITIVE: All Items from the cart goes to `/inventory.html`.
- `W-MENU-04` POSITIVE: About link has `href` `https://saucelabs.com/`.
- UNVERIFIED: Dynamic Catalog sub-pages (`Lazy Load`, `Spinner`, `Slider`) were not explored. No scenario.

## W10. Direct URL access without login

**Observed:** the URL is **kept** (no redirect), the login form is shown with the error below.

| URL | Exact error |
|---|---|
| `/inventory.html` | `Epic sadface: You can only access '/inventory.html' when you are logged in.` |
| `/cart.html` | `Epic sadface: You can only access '/cart.html' when you are logged in.` |
| `/checkout-step-one.html` | `Epic sadface: You can only access '/checkout-step-one.html' when you are logged in.` |
| `/checkout-step-two.html`, `/checkout-complete.html`, `/inventory-item.html?id=4` | same pattern with their own path |

The same `/inventory.html` message appears after Logout.

**Scenarios derived:**
- `W-AUTH-01` NEGATIVE: opening `inventory.html`, `cart.html`, `checkout-step-one.html` without logging in shows the matching error and the login button.

---

# API – GoRest v2 (`https://gorest.co.in/public/v2`)

## A0. Docs + general

**Did:** read `https://gorest.co.in/` and `https://www.gorest.co.in/docs/v2`.

**Observed:**
- The home page now documents **v3** (`/public/v3`, UUID ids, `{data, meta}` lists, `/tasks` instead of `/todos`). v2 docs page: "v2 keeps working as it is … Since v3.0 (1 Nov 2026) each v2 answer carries a Deprecation field and a Link to this page."
- Live v2 responses carry headers `deprecation: @1793491200` and `link: <https://www.gorest.co.in/docs/v2>; rel="deprecation"`. v2 is still fully served.
- v2 per docs: integer ids; lists are bare arrays with `X-Pagination-*` headers; token via `Authorization: Bearer` (or `?access-token=`); errors are "a list of `{field, message}`"; resources Users, Posts, Comments, Todos; writes via PUT and PATCH. "Data resets every 3 hours."
- Public reads need no token: `GET /users` without `Authorization` returns `200`.
- **A GET with an invalid token (including `Bearer undefined` / an empty token) returns `401 {"message":"Invalid token"}`**.
- With a **valid** token, public GETs (list, by id, pagination, filters) still return `200` with the same shape, **and** resources created with that token are visible. Without the token, those same resources return `404` (see A7). So every request, GETs included, sends `Helper.getAuthHeaders()`.
- Unknown resource `/bogus` returns `404 {"message":"Resource not found"}`.

## A1. Users

**Observed (GET):** list `200`, bare array of 10 by default. Single item `200`, object. Fields / JSON types: `id` integer, `name` string, `email` string, `gender` string (`male`|`female` seen), `status` string (`active`|`inactive` seen). No nullable fields, no extra fields.
- Filters: `?gender=male`, `?gender=female`, `?status=active`, `?status=inactive` return `200` and every row matches. `?gender=unknown` returns `200` with `[]`.
- Non-existing `GET /users/999999999` returns `404 {"message":"Resource not found"}`.

**Pagination headers (`?page=1&per_page=5`):** `x-pagination-limit: 5`, `x-pagination-page: 1`, `x-pagination-pages`, `x-pagination-total`, `x-links-current`, `x-links-next`, `x-links-previous` (empty on page 1). Page 2 has no overlap with page 1. `per_page` 20/50/100 honoured; **`per_page=101` (or 150) falls back to 10**.

**Auth (no valid token available):**

| Request | Status | Body |
|---|---|---|
| POST `/users` without `Authorization` | 401 | `{"message":"Authentication failed"}` |
| POST `/users` with `Bearer invalid-token-12345` | 401 | `{"message":"Invalid token"}` |
| POST `/users` invalid token **and** invalid body (`name:''`, `email:'not-an-email'`…) | 401 | `{"message":"Invalid token"}` (auth is checked before validation) |
| PUT / PATCH / DELETE `/users/{id}` without token | 401 | `Authentication failed` |
| PUT / PATCH / DELETE `/users/{id}` invalid token | 401 | `Invalid token` |
| DELETE `/users/999999999` without token | 404 | `Resource not found` (existence checked before auth) |

**Scenarios derived:**
- `A-USR-01` POSITIVE: Get All Users (200, array of 10, fields present).
- `A-USR-02` POSITIVE: Get User by ID: id taken from a fresh list response in the same test, response `id` matches.
- `A-USR-03` POSITIVE: Pagination: `per_page=5` returns 5 rows, `x-pagination-page: 1`, `x-pagination-limit: 5`.
- `A-USR-04` EDGE: `per_page=101` falls back to 10 rows / `x-pagination-limit: 10`.
- `A-USR-05` POSITIVE: Filter by Gender (every row matches). `A-USR-06` POSITIVE: Filter by Status.
- `A-USR-07` EDGE: Filter by an invalid gender value returns `200` and `[]`.
- `A-USR-08` NEGATIVE: Get Non-Existing User returns `404` `Resource not found`.
- `A-USR-09` NEGATIVE: Create User without token returns `401` `Authentication failed`.
- `A-USR-10` NEGATIVE: Create User with invalid token returns `401` `Invalid token`.
- `A-USR-11` NEGATIVE: Create User with invalid token + invalid payload returns `401` `Invalid token`.
- `A-USR-12` NEGATIVE: PUT / PATCH / DELETE user with invalid token returns `401` `Invalid token`.
- `A-USR-13` NEGATIVE: GET with invalid token returns `401` `Invalid token`.

## A2. Posts

**Observed:** fields `id` integer, `user_id` integer, `title` string, `body` string; no nulls. `GET /posts/{id}` `200`. `GET /users/{userId}/posts` `200`, every `user_id` matches. Non-existing post `404 Resource not found`. **`GET /users/999999999/posts` returns `200 []`** (not 404). Data churns: a post's `user_id` pointed to a user that already returned `404`. Write routes (`POST /users/{id}/posts`, `PUT/DELETE /posts/{id}`): 401 `Authentication failed` (no token) / `Invalid token`.

**Scenarios derived:** `A-PST-01` Get All Posts · `A-PST-02` Get Post by ID (id from fresh list) · `A-PST-03` Get User Posts (user id taken from a post in a fresh `/posts` list; every `user_id` matches) · `A-PST-04` EDGE nested posts of non-existing user returns `200 []` · `A-PST-05` NEGATIVE non-existing post `404` · `A-PST-06` NEGATIVE create/update/delete post without/with invalid token returns `401`.

## A3. Comments

**Observed:** fields `id` integer, `post_id` integer, `name` string, `email` string, `body` string; no nulls. `GET /comments/{id}` `200`. `GET /posts/{postId}/comments` `200`, every `post_id` matches. Non-existing `404`. Writes: 401 as above.

**Scenarios derived:** `A-CMT-01` Get All Comments · `A-CMT-02` Get Comment by ID · `A-CMT-03` Get Post Comments (post id from a fresh `/comments` list; every `post_id` matches) · `A-CMT-04` NEGATIVE non-existing comment `404` · `A-CMT-05` NEGATIVE create/update/delete comment without/with invalid token returns `401`.

## A4. Todos

**Observed:** fields `id` integer, `user_id` integer, `title` string, `due_on` string (e.g. `2026-11-21T00:00:00.000+05:30`), `status` string (`pending`|`completed` seen). In the sampled public lists `due_on` was always a string; a todo created **without** `due_on` returns `due_on: null` (A7), so the schema allows `string | null`. `GET /users/{userId}/todos` `200`, every `user_id` matches. `?status=completed` filter: every row matches. Non-existing `404`. Writes: 401 as above.

**Scenarios derived:** `A-TDO-01` Get All Todos · `A-TDO-02` Get Todo by ID · `A-TDO-03` Get User Todos (user id from a fresh `/todos` list; every `user_id` matches) · `A-TDO-04` NEGATIVE non-existing todo `404` · `A-TDO-05` NEGATIVE create/update/delete todo without/with invalid token returns `401`.

## A5. Schema validation (read-only)

**Observed:** the field names and JSON types above match `userSchema`, `postSchema`, `commentSchema`, `todoSchema` exactly (no extra properties).

**Scenarios derived:** `A-SCH-01..04` POSITIVE: validate the first item of each list and the single-item response against its schema with Ajv (`ajv-formats` required for `email` / `date-time`: **not installed**).

## A6. End-to-end (read-only chain)

**Scenarios derived:** `A-E2E-01` E2E: GET `/comments` → take `post_id` → GET `/posts/{post_id}` (200, `id` matches) → GET `/posts/{post_id}/comments` (contains the comment id) → relationships verified. Observed: comment `201208` → post `298737` exists, nested list contains it. The post → user link is **not** guaranteed (deleted users seen), so the chain does not assert the user exists.

---

## A7. Write operations with a valid `GOREST_TOKEN` (2026-11-05)

**Did:** with the token from `.env` (via `Helper.getAuthHeaders()`) created a user, then a post under it, a comment under the post and two todos under the user. Ran every update and validation case, then deleted everything in reverse order and confirmed `404` **with the token**. Payloads came from `RandomDataUtil`.

**Observed: success responses**

| Request | Status | Body |
|---|---|---|
| POST `/users` (`generateUserPayload`) | 201 | `{id, name, email, gender, status}`, echoing all sent values |
| GET `/users/{id}` (own user) **with** token | 200 | the user |
| GET `/users/{id}` (own user) **without** token | **404** | `Resource not found` (resources created with a token are private to it) |
| GET `/users` with token | 200 | 10 items; the list includes the newly created user |
| PUT `/users/{id}` (`generateUserUpdatePayload`) | 200 | all four fields updated (`name` starts with `Updated `) |
| PATCH `/users/{id}` `{status}` | 200 | only `status` changed; `name` kept |
| PUT `/users/999999999` | 404 | `Resource not found` |
| POST `/users/{id}/posts` (`generatePostPayload`) | 201 | `{id, user_id, title, body}`, `user_id` = the user |
| GET `/users/{id}/posts` | 200 | contains exactly the created post |
| PUT `/posts/{id}` | 200 | updated `title`/`body` |
| POST `/posts/{id}/comments` (`generateCommentPayload`) | 201 | `{id, post_id, name, email, body}`, `post_id` = the post |
| GET `/posts/{id}/comments` | 200 | contains the created comment |
| PUT `/comments/{id}` | 200 | updated fields |
| POST `/users/{id}/todos` (`generateTodoPayload`) | 201 | `{id, user_id, title, due_on, status}`. `due_on` sent `2027-05-23T08:44:25.356Z` came back as `2027-05-23T14:14:25.356+05:30` (same instant, different offset, so compare as `Date` times, not strings) |
| POST `/users/{id}/todos` without `due_on` | 201 | `due_on: null` |
| GET `/users/{id}/todos` | 200 | both todos, every `user_id` matches |
| PUT `/todos/{id}` `{status: 'completed'}` | 200 | `status: 'completed'` |
| DELETE comment / todo / post / user | **204** | empty body, no `content-type` |
| DELETE the same user again | 404 | `Resource not found` |
| GET user / post / comment / todo after delete (with token) | 404 | `Resource not found` |

**Observed: validation (`422`, body = array of `{field, message}`, matches `validationErrorSchema`)**

| Request | Body |
|---|---|
| POST `/users` with an already-used email | `[{"field":"email","message":"has already been taken"}]` |
| POST `/users` `generateInvalidUserPayload()` (`name:''`, `email:'not-an-email'`, `gender:''`, `status:''`) | `name` → `can't be blank`; `gender` → `can't be blank, can be male of female`; `status` → `can't be blank`; `email` → `is invalid` |
| POST `/users` `{}` | `email`, `name`, `status` → `can't be blank`; `gender` → `can't be blank, can be male of female` |
| POST `/users` valid except `email:'not-an-email'` | `[{"field":"email","message":"is invalid"}]` |
| POST `/users` with `gender:'unknown'`, `status:'unknown'` | `gender` → `can't be blank, can be male of female`; `status` → `can't be blank` |
| PATCH `/users/{id}` `{status:'unknown'}` | `[{"field":"status","message":"can't be blank"}]` |
| POST `/users/{id}/posts` `{title:'', body:''}` | `title`, `body` → `can't be blank` |
| POST `/users/999999999/posts` (valid payload) | `[{"field":"user","message":"must exist"}]` |
| POST `/posts/{id}/comments` `{name:'', email:'not-an-email', body:''}` | `name` → `can't be blank`; `email` → `is invalid`; `body` → `can't be blank` |
| POST `/users/{id}/todos` `{title:'x', status:'unknown'}` | `[{"field":"status","message":"can't be blank, can be pending or completed"}]` |

Note: the gender message really says "male **of** female" (GoRest's typo); tests must use the exact text.

**Scenarios derived:**
- Users: `A-USR-14` POSITIVE Create User · `A-USR-15` POSITIVE Get created User by ID · `A-USR-16` POSITIVE Update (PUT) · `A-USR-17` POSITIVE Partial Update (PATCH `status`) · `A-USR-18` POSITIVE Delete then GET `404` · `A-USR-19` NEGATIVE Update non-existing user `404` · `A-USR-20` NEGATIVE Duplicate Email `422` · `A-USR-21` NEGATIVE Invalid Payload `422` + `validationErrorSchema` · `A-USR-22` NEGATIVE Invalid email `422` · `A-USR-23` NEGATIVE Invalid enum values `422` · `A-USR-24` NEGATIVE PATCH invalid status `422` · `A-USR-25` EDGE created user is not visible without the token (`404`).
- Posts: `A-PST-07` Create User Post · `A-PST-08` Get User Posts for the created user · `A-PST-09` Update Post · `A-PST-10` Delete Post · `A-PST-11` NEGATIVE blank title/body `422` · `A-PST-12` NEGATIVE post for non-existing user `422 must exist`.
- Comments: `A-CMT-06` Create Post Comment · `A-CMT-07` Get Post Comments · `A-CMT-08` Update Comment · `A-CMT-09` Delete Comment · `A-CMT-10` NEGATIVE invalid comment `422`.
- Todos: `A-TDO-06` Create User Todo · `A-TDO-07` EDGE todo without `due_on` → `null` · `A-TDO-08` Get User Todos · `A-TDO-09` Update status to `completed` · `A-TDO-10` Delete Todo · `A-TDO-11` NEGATIVE invalid todo status `422`.
- Schema: `A-SCH-05` created user/post/comment/todo responses match their schemas; `A-SCH-06` `422` bodies match `validationErrorSchema`.
- E2E: `A-E2E-02` User CRUD (create → get → put → patch → delete → 404) · `A-E2E-03` User → Post → Comment chain (relationships, delete in reverse order) · `A-E2E-04` User → Todo (create → completed → verify → delete).

All test data created during discovery was deleted (every delete returned `204`).

---

# UNVERIFIED

- Web: `Generate PDF order` button behaviour; Dynamic Catalog sub-pages (`Lazy Load`, `Spinner`, `Slider`). No scenarios.
