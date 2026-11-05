# SauceDemo (Swag Labs) – Web Test Scenarios

**Application URL:** `https://www.saucedemo.com/` (read from `process.env.WEB_BASE_URL`)
**Traceability:** every scenario lists the finding IDs from `prompts/discovery_notes.md` it is based on.

## Common Requirements

For every scenario:

- Use **Playwright Test with TypeScript** (`@playwright/test`). All generated files are `.ts`.
- Import `test` and `expect` only from `@playwright/test`. Do not use any other test runner, assertion library or HTTP client.
- Use `async`/`await` for every Playwright call and web-first assertions (`await expect(locator).toHaveText(...)`, `toBeVisible()`, `toHaveURL()`), never manual waits such as `page.waitForTimeout()`.
- Code must pass `npx tsc --noEmit` with the project's existing `tsconfig.json`.
- Do not modify `playwright.config.ts`, `tsconfig.json` or `package.json`.

Framework rules (based on the existing project setup in `discovery_notes.md` → "Project Setup"):

- **Test titles must contain `@master`** (e.g. `test('Valid Login @master', ...)`). `playwright.config.ts` has `grep: /@master/`, so tests without the tag are silently skipped.
- Specs go in `tests/web/*.spec.ts` (`testDir` is `./tests`). Run with: `npx playwright test tests/web --project=chromium`.
- Page Object classes go in `pages/` as TypeScript classes, one per page: `pages/LoginPage.ts`, `pages/InventoryPage.ts`, `pages/ProductDetailsPage.ts`, `pages/CartPage.ts`, `pages/CheckoutPage.ts` (step one, overview and complete), `pages/MenuPage.ts` (burger menu). The constructor takes `page: Page`; locators are `readonly` `Locator` fields; methods have explicit parameter and return types.
- **Locators:** `testIdAttribute` is not configured, so use `page.locator('[data-test="..."]')`, never `page.getByTestId()`. Use `getByRole` only where no `data-test` exists (the burger button: `page.getByRole('button', { name: 'Open Menu' })`).
- **Navigation:** `baseURL` is not configured. `LoginPage.goto()` calls `await page.goto(process.env.WEB_BASE_URL as string)`. Any file that reads `process.env` must `import dotenv from 'dotenv'` and call `dotenv.config()` (the config does not load `.env`). Importing `Helper` from `utils/helper.ts` also loads it.
- SauceDemo is a single-page app: the URL changes **before** the next view renders. After every navigation click, assert the new page's title (`[data-test="title"]`) before reading other elements.
- No hard-coded test data in specs. Use `Helper` (`utils/helper.ts`), `RandomDataUtil` (`utils/dataGenerator.ts`), `DataProvider` (`utils/DataReader.ts`) and the files in `testdata/web/`.
- Object JSON files are imported directly (`resolveJsonModule` is on): `import productData from '../../testdata/web/saucedemo_products.json';`. Array data files are read with `DataProvider` using project-root paths (e.g. `DataProvider.readJson('testdata/web/saucedemo_checkoutdata.json')`).
- Values in `saucedemo_logindata.*` / `saucedemo_checkoutdata.json` must be `.trim()`-ed; when the trimmed value is `""`, leave the field empty (do not `fill` dummy data).
- Keep tests independent: each test logs in itself (use a `beforeEach` where a group shares setup).
- `playwright-mcp-context.md` does not exist in this project. Follow the conventions above.

Locator reference (all observed live, see `discovery_notes.md` W1–W10):

| Page | `data-test` values |
|---|---|
| Login | `username`, `password`, `login-button`, `error`, `error-button` |
| Inventory | `title`, `product-sort-container`, `active-option`, `inventory-item`, `inventory-item-name`, `inventory-item-price`, `add-to-cart-{slug}`, `remove-{slug}`, `item-{id}-title-link`, `shopping-cart-link`, `shopping-cart-badge` |
| Product details | `inventory-item-name`, `inventory-item-price`, `add-to-cart`, `remove`, `back-to-products` |
| Cart | `title` (`Your Cart`), `inventory-item`, `item-quantity`, `inventory-item-name`, `inventory-item-price`, `remove-{slug}`, `continue-shopping`, `checkout` |
| Checkout step one | `firstName`, `lastName`, `postalCode`, `continue`, `cancel`, `error` |
| Overview | `subtotal-label`, `tax-label`, `total-label`, `finish`, `cancel` |
| Complete | `complete-header`, `complete-text`, `back-to-products` (`Back Home`) |
| Menu | `inventory-sidebar-link`, `about-sidebar-link`, `logout-sidebar-link`, `reset-sidebar-link` |

The `{slug}` is the product name in lower case with spaces replaced by `-` (e.g. `sauce-labs-backpack`, `test.allthethings()-t-shirt-(red)`).

---

# 1. Valid Login

**Traces:** W-LOGIN-01

1. Open the application with `LoginPage.goto()`.
2. Log in with `Helper.getLoginDetails()` (`username`, `password`).
3. Verify the URL matches `/inventory.html`.
4. Verify `[data-test="title"]` has text `productData.pageTitles.inventory` from `testdata/web/saucedemo_products.json`.

## Expected Result

`standard_user` is logged in and the `Products` inventory page is displayed.

---

# 2. Invalid Login

**Traces:** W-LOGIN-02

1. Open the application.
2. Load the row with `testName` `Invalid password` from `testdata/web/saucedemo_logindata.json` via `DataProvider.readJson`.
3. Log in with its `username` / `password`.
4. Verify `[data-test="error"]` has text equal to the row's `expectedError` (`Epic sadface: Username and password do not match any user in this service`).
5. Verify the URL is still the login page (no `/inventory.html`).

## Expected Result

Login is rejected and the "do not match" error is shown.

---

# 3. Locked Out User

**Traces:** W-LOGIN-03

1. Load the row with `testName` `Locked out user` from `testdata/web/saucedemo_logindata.json`.
2. Log in with it.
3. Verify `[data-test="error"]` equals the row's `expectedError` (`Epic sadface: Sorry, this user has been locked out.`).

## Expected Result

The locked-out user cannot log in and sees the locked-out error.

---

# 4. Dismiss Login Error

**Traces:** W-LOGIN-05

1. Click Login with both fields empty.
2. Verify `[data-test="error"]` is visible.
3. Click `[data-test="error-button"]`.
4. Verify `[data-test="error"]` is no longer present (`toHaveCount(0)`).

## Expected Result

The error message can be closed.

---

# 5. Logout

**Traces:** W-MENU-01, W-AUTH-01

1. Log in with `Helper.getLoginDetails()`.
2. Open the burger menu (`MenuPage`) and click `[data-test="logout-sidebar-link"]`.
3. Verify `[data-test="login-button"]` is visible and the URL equals `process.env.WEB_BASE_URL`.
4. Navigate to `process.env.WEB_BASE_URL + productData.restrictedPages[0].path` (`inventory.html`).
5. Verify `[data-test="error"]` equals `productData.restrictedPages[0].error` and the login button is visible. (The app keeps the URL and shows the login form; it does not redirect.)

## Expected Result

The user is logged out and the inventory page is no longer accessible.

---

# 6. Direct URL Access Without Login

**Traces:** W-AUTH-01

One test per entry in `productData.restrictedPages` (`inventory.html`, `cart.html`, `checkout-step-one.html`):

1. Without logging in, open `process.env.WEB_BASE_URL + entry.path`.
2. Verify `[data-test="error"]` equals `entry.error`.
3. Verify `[data-test="login-button"]` is visible.

## Expected Result

Every protected page shows the login form with its "You can only access … when you are logged in." error.

---

# 7. Product Listing

**Traces:** W-INV-01

1. Log in with `Helper.getLoginDetails()`.
2. Verify there are exactly `productData.products.length` (6) `[data-test="inventory-item"]` elements.
3. For each entry in `productData.products`, verify the item with that `inventory-item-name` shows the matching `inventory-item-price`.

## Expected Result

All 6 products and prices match `saucedemo_products.json`.

---

# 8. Product Sorting

**Traces:** W-INV-02

One test per entry in `productData.sortOptions`:

1. Log in and select `option.value` in `[data-test="product-sort-container"]`.
2. Verify `[data-test="active-option"]` has text `option.label`.
3. Read all `inventory-item-name` and `inventory-item-price` texts (`allInnerTexts()`).
4. `az`: names equal a copy of the names sorted A→Z (`localeCompare`). `za`: sorted Z→A.
5. `lohi` / `hilo`: convert prices with `Helper.convertPriceToNumber` and verify each price is `<=` (or `>=`) the next one. Two products share `$15.99`, so compare numerically rather than against a fixed name list.

## Expected Result

Every sort option orders the products correctly and updates the active option label.

---

# 9. Product Details

**Traces:** W-DETAIL-01, W-DETAIL-02

1. Log in with `Helper.getLoginDetails()`.
2. For each entry in `productData.products`: click its `inventory-item-name`, wait for `[data-test="back-to-products"]` to be visible, verify the detail `inventory-item-name` and `inventory-item-price` match, then click `back-to-products` and verify the title is `productData.pageTitles.inventory`.
3. On the `Helper.getProductDetails().productName` detail page, click `[data-test="add-to-cart"]` and verify the badge is `Helper.getProductDetails().productQuantity`. Click `[data-test="remove"]` and verify the badge is gone.

## Expected Result

Each detail page shows the correct name and price; Add/Remove and Back work.

---

# 10. Add to Cart

**Traces:** W-CART-01

1. Log in and click the add-to-cart button for `Helper.getProductDetails().productName`.
2. Verify `[data-test="shopping-cart-badge"]` has text `Helper.getProductDetails().productQuantity`.
3. Open the cart and verify the title is `productData.pageTitles.cart`.
4. Verify the cart item name, `[data-test="item-quantity"]` (`productQuantity`) and price (`Helper.getProductDetails().totalPrice`).

## Expected Result

The product is in the cart with quantity `1` and price `$29.99`.

---

# 11. Remove from Cart

**Traces:** W-CART-02, W-CART-03

1. Add `Helper.getProductDetails().productName` and open the cart.
2. Click its `remove-{slug}` button.
3. Verify `[data-test="shopping-cart-badge"]` has count `0` and `[data-test="inventory-item"]` has count `0`.
4. Click `[data-test="continue-shopping"]` and verify the URL matches `/inventory.html`.

## Expected Result

The badge disappears, the cart is empty, and Continue Shopping returns to the inventory.

---

# 12. Reset App State

**Traces:** W-MENU-02, W-MENU-03

1. Log in and add every product in `productData.cartSelection`.
2. Verify the badge shows `productData.cartSelection.length`.
3. Open the menu and click `[data-test="reset-sidebar-link"]`.
4. Verify the badge has count `0`.
5. Open the cart and verify there are `0` `[data-test="inventory-item"]` elements.
6. Open the menu, click `[data-test="inventory-sidebar-link"]` (All Items) and verify the title is `productData.pageTitles.inventory`.

Note: after Reset the inventory buttons keep saying `Remove` until reload (observed app behaviour). Do not assert on button labels here.

## Expected Result

Reset App State empties the cart; All Items returns to the inventory.

---

# 13. About Link

**Traces:** W-MENU-04

1. Log in and open the burger menu.
2. Verify `[data-test="about-sidebar-link"]` has attribute `href` equal to `productData.aboutUrl`.

## Expected Result

The About menu item points to `https://saucelabs.com/`.

---

# 14. Checkout Information Validation (Data Driven)

**Traces:** W-CHK-01, W-CHK-02

Load rows from `testdata/web/saucedemo_checkoutdata.json` with `DataProvider.readJson`. One test per row; title `` `[${index + 1}] ${row.testName} @master` ``.

1. Log in, add `Helper.getProductDetails().productName`, open the cart, click Checkout.
2. Verify the title is `productData.pageTitles.checkoutInformation`.
3. Fill `firstName`, `lastName`, `postalCode` with the trimmed row values (leave a field empty when the trimmed value is `""`).
4. Click Continue.
5. `expected === 'success'`: verify the title is `productData.pageTitles.checkoutOverview` and the URL matches `/checkout-step-two.html`.
6. `expected === 'failure'`: verify `[data-test="error"]` equals `row.expectedError` and the URL still matches `/checkout-step-one.html`.

Add one more test: on step one, click `[data-test="cancel"]` and verify the title is `productData.pageTitles.cart`.

## Expected Result

Valid information proceeds to the overview; each missing field shows its exact error; Cancel returns to the cart.

---

# 15. End-to-End Purchase

**Traces:** W-E2E-01, W-OVR-01, W-CART-01

1. Log in with `Helper.getLoginDetails()`.
2. Add every product named in `productData.cartSelection`.
3. Open the cart and verify each selected product is listed.
4. Click Checkout and fill the form with `RandomDataUtil.generateCheckoutInfo()`.
5. On the overview (title `productData.pageTitles.checkoutOverview`):
   - expected item total = sum of the selected products' prices from `productData.products` (via `Helper.convertPriceToNumber`).
   - expected tax = `Number((itemTotal * productData.taxRate).toFixed(2))`.
   - expected total = `Number((itemTotal + tax).toFixed(2))`.
   - Verify `Helper.convertPriceToNumber()` of `subtotal-label`, `tax-label`, `total-label` equals these values (observed: `$39.98`, `$3.20`, `$43.18`).
6. Click Finish. Verify the title is `productData.pageTitles.checkoutComplete`, `complete-header` equals `productData.orderComplete.header` and `complete-text` equals `productData.orderComplete.text`.
7. Click `back-to-products` (Back Home). Verify the title is `productData.pageTitles.inventory` and the cart badge has count `0`.

## Expected Result

The full purchase completes with correct totals and the confirmation message; the cart is empty afterwards.

---

# 16. Login – Data Driven (External File)

**Traces:** W-LOGIN-06, W-LOGIN-01..04, W-USER-01

Load rows with one of:

- `DataProvider.readJson('testdata/web/saucedemo_logindata.json')`
- `DataProvider.readCsv('testdata/web/saucedemo_logindata.csv')`
- `DataProvider.readExcel('testdata/web/saucedemo_logindata.xlsx')`

Each row has `testName` (JSON/CSV) or `TestName` (XLSX), `username`, `password`, `expected` (`success` | `failure`), `expectedError`.

Generate one independent test per row. Title: `` `[${index + 1}] ${row.testName ?? row.TestName} @master` ``.

1. Open the login page.
2. Trim `username` and `password`; fill a field only when its trimmed value is not `""` (never replace blanks with dummy data).
3. Click Login.
4. `success`: verify the URL matches `/inventory.html` and the title is `productData.pageTitles.inventory`. Use `{ timeout: 15000 }` on these assertions, because `performance_glitch_user` takes about 5.6 s to log in (longer than the default 5 s `expect` timeout).
5. `failure`: verify `[data-test="error"]` equals `row.expectedError`.

## Expected Result

One test per row; each actual result matches the row's `expected` value and error text.

---

# 17. Special User Behaviours

**Traces:** W-USER-02, W-USER-03, W-USER-04, W-USER-05, W-USER-06

Use the `username` / `password` of the rows `Valid problem user`, `Valid error user` and `Valid visual user` from `testdata/web/saucedemo_logindata.json` (via `DataProvider.readJson`) and the expected values from `productData.userBehaviours`. These tests confirm known application defects, so they are expected to **pass** by asserting the defect.

1. **problem_user: broken images.** Every `[data-test="inventory-item"] img` has a `src` containing `productData.userBehaviours.brokenImageSrcContains`.
2. **problem_user: wrong product opens.** Click the `inventory-item-name` of `productData.userBehaviours.problemUserClickedProduct`; verify the detail `inventory-item-name` equals `productData.userBehaviours.problemUserOpenedProduct`.
3. **error_user: sorting alert.** Register `page.once('dialog', ...)` to capture the message and dismiss it, select `productData.sortOptions[1].value` (`za`), verify the captured message equals `productData.userBehaviours.errorUserSortAlert`.
4. **error_user: Finish does not complete.** Add `Helper.getProductDetails().productName`, check out with `RandomDataUtil.generateCheckoutInfo()`, click Finish; verify the title is still `productData.pageTitles.checkoutOverview` and the URL matches `/checkout-step-two.html`.
5. **visual_user: inventory price differs from cart price.** On the inventory, read the price of `Helper.getProductDetails().productName` and verify it is **not** `Helper.getProductDetails().totalPrice`. Add it, open the cart, verify the cart price **is** `Helper.getProductDetails().totalPrice`. (Inventory prices are random on every render. The tiny chance of a random match is acceptable.)

## Expected Result

Each documented defect is reproduced exactly as observed during discovery.

---

# Final Implementation Quality Criteria

The generated web tests must:

- Be TypeScript Playwright tests in `tests/web/` with page objects in `pages/`, importing only from `@playwright/test`.
- Include `@master` in every test title.
- Use `[data-test="..."]` locators (no `getByTestId`), web-first assertions, and no `waitForTimeout`.
- Read all test data from `testdata/web/*` via `DataProvider` or JSON imports, and from `Helper` / `RandomDataUtil`; no hard-coded credentials, products, prices or messages in specs.
- Trim data values and leave blank fields empty.
- Keep every test independent (each logs in itself).
- Pass `npx tsc --noEmit` and run with `npx playwright test tests/web --project=chromium`.
- Not modify `playwright.config.ts`, `tsconfig.json` or `package.json`.
