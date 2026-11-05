# Utility Files – Prompts

**Target folder:** `utils/`
**Used by:** `prompts/saucedemo_web_test_prompts.md` and `prompts/gorest_api_test_prompts.md`
**Traceability:** values come from `prompts/discovery_notes.md` (sections W1, W3, W5, A0–A4).

## Common Requirements

For every prompt below:

- Use **Playwright Test with TypeScript** (`@playwright/test`). All generated files are `.ts`.
- Import `test` and `expect` only from `@playwright/test`. Do not use any other test runner, assertion library or HTTP client.
- Use `async`/`await` for every Playwright call and web-first assertions (`await expect(locator).toHaveText(...)`, `toBeVisible()`, `toHaveURL()`), never manual waits such as `page.waitForTimeout()`.
- Code must pass `npx tsc --noEmit` with the project's existing `tsconfig.json`.
- Do not modify `playwright.config.ts`, `tsconfig.json` or `package.json`.
- Create the file in the existing `utils/` folder using TypeScript with ES module `import`/`export` syntax (never `require()`).
- Use only the existing dependencies already present in `package.json` (`@faker-js/faker`, `dotenv`, `csv-parse`, `xlsx`) plus the Node built-in `fs`. Never install new ones.
- Give every method explicit parameter and return types. `any` is allowed only for parsed external data (JSON/CSV/XLSX rows).
- Do not add any other methods, classes, interfaces, types, constants, dependencies, validation, logging, or functionality beyond what the prompt specifies.
- Do not change the class names, method names, parameter names, return structures, values, or behavior specified below.
- Use clean, beginner-friendly TypeScript suitable for a Playwright automation framework.
- Do not create any additional files.
- Return only the complete code for the requested file.

---

# 1. Create `helper.ts`

## Prompt

Create or update a file named `helper.ts` in the existing folder `utils`.

Import `dotenv` from `dotenv` and call `dotenv.config()` at the top of the file (the existing `playwright.config.ts` does not load `.env`).

Create and export a class named `Helper` with exactly these static methods:

### 1.1 `convertPriceToNumber(price: string): number`

- Remove all characters from the input except digits and the decimal point.
- Convert the resulting value to a number and return it.
- Example: `"$29.99"` returns `29.99`. `"Item total: $39.98"` returns `39.98`.

### 1.2 `getProductDetails(): { productName: string; productQuantity: string; totalPrice: string }`

Return exactly:

- `productName: "Sauce Labs Backpack"`
- `productQuantity: "1"`
- `totalPrice: "$29.99"`

### 1.3 `getLoginDetails(): { username: string; password: string }`

Return exactly:

- `username: "standard_user"`
- `password: "secret_sauce"`

### 1.4 `buildUrl(route: string, params: Record<string, string | number>): string`

- Start with `route` (a path from `Routes` in `api/endpoints/routes.ts`).
- For each key in `params`, replace `{key}` with `String(value)`.
- Return the resulting path.
- Example: `Helper.buildUrl(Routes.GET_USER_BY_ID, { id: 1 })` returns `'/users/1'`.

### 1.5 `getAuthHeaders(): Record<string, string>`

Return exactly:

- `Authorization: \`Bearer ${process.env.GOREST_TOKEN}\``
- `'Content-Type': 'application/json'`
- `Accept: 'application/json'`

Never hard-code or log the token.

## Expected Result

A `utils/helper.ts` file exporting the `Helper` class with the five static methods above.

---

# 2. Create `dataGenerator.ts`

## Prompt

Create or update a file named `dataGenerator.ts` in the existing folder `utils`.

Import Faker exactly as `import { faker } from '@faker-js/faker';`.

Create and export a class named `RandomDataUtil` with only static methods.

### 2.1 Basics (all return `string`)

- `getFirstName()`: `faker.person.firstName()`
- `getLastName()`: `faker.person.lastName()`
- `getFullName()`: `faker.person.fullName()`
- `getPostalCode()`: `faker.location.zipCode()`
- `getUniqueEmail()`: `` `${Date.now()}.${faker.internet.email({ provider: 'example.com' }).toLowerCase()}` `` (e.g. `1730761234567.jane.doe@example.com`), so it never collides on GoRest.
- `getGender()`: random `male` | `female` via `faker.helpers.arrayElement`.
- `getUserStatus()`: random `active` | `inactive`.
- `getTodoStatus()`: random `pending` | `completed`.
- `getSentence()`: `faker.lorem.sentence()`
- `getParagraph()`: `faker.lorem.paragraph()`
- `getFutureDateTime()`: `faker.date.future().toISOString()`

### 2.2 Web

- `generateCheckoutInfo(): { firstName: string; lastName: string; postalCode: string }` built from `getFirstName()`, `getLastName()`, `getPostalCode()`.

### 2.3 API Payloads

Reuse the methods above. Do not call Faker directly in these methods.

- `generateUserPayload()`: `{ name: getFullName(), email: getUniqueEmail(), gender: getGender(), status: getUserStatus() }`
- `generateUserUpdatePayload()`: same structure, `name` is `` `Updated ${getFullName()}` ``.
- `generateInvalidUserPayload()`: exactly `{ name: '', email: 'not-an-email', gender: '', status: '' }`
- `generatePostPayload()`: `{ title: getSentence(), body: getParagraph() }`
- `generateCommentPayload()`: `{ name: getFullName(), email: getUniqueEmail(), body: getParagraph() }`
- `generateTodoPayload()`: `{ title: getSentence(), due_on: getFutureDateTime(), status: getTodoStatus() }`

Give each payload method an explicit object return type.

## Expected Result

A `utils/dataGenerator.ts` file exporting `RandomDataUtil` with the basic, web, and API payload generators above.

---

# 3. Create `DataReader.ts`

## Prompt

Create a new file named `DataReader.ts` in the existing folder `utils`.

Imports, exactly:

- `import fs from 'fs';`
- `import { parse } from 'csv-parse/sync';`
- `import * as XLSX from 'xlsx';`

Create and export a class named `DataProvider` with exactly these three static methods. Each method's return type is `any[]`.

### 3.1 `readJson(filePath: string): any[]`

- Return `JSON.parse(fs.readFileSync(filePath, 'utf8'))`.

### 3.2 `readCsv(filePath: string): any[]`

- Read the file with `fs.readFileSync(filePath)`.
- Parse with `parse()` from `csv-parse/sync` using `{ columns: true, skip_empty_lines: true }`.
- Return the parsed rows.

### 3.3 `readExcel(filePath: string): any[]`

- `XLSX.readFile(filePath)`, take the first sheet via `workbook.SheetNames[0]` and `workbook.Sheets[sheetName]`.
- Return `XLSX.utils.sheet_to_json(worksheet, { defval: '' })`.
- Do **not** use `{ header: 1 }`, so all three readers return the same array-of-objects shape. `defval: ''` keeps blank cells as empty strings.

Do not add support for other formats, sheet-name parameters, validation, logging or error handling.

## Expected Result

A `utils/DataReader.ts` file exporting `DataProvider`. Reading `testdata/web/saucedemo_logindata.json`, `.csv` and `.xlsx` returns the same rows (the XLSX uses `TestName` instead of `testName`; blanks are `" "` in JSON and `""` in CSV/XLSX).

---

## Final Implementation Quality Criteria

The generated utility files must:

- Exist in `utils/` with the exact names `helper.ts`, `dataGenerator.ts`, `DataReader.ts` (no other new files in `utils/`).
- Export exactly `Helper`, `RandomDataUtil`, `DataProvider`.
- Match the method signatures, return structures and values above exactly.
- Use only `@faker-js/faker`, `dotenv`, `csv-parse`, `xlsx` and `fs`; do not install or invent dependencies.
- Reuse `RandomDataUtil` methods instead of duplicating Faker calls in payload generators.
- Never hard-code or print `GOREST_TOKEN`.
- Be simple enough for beginners and free of extra functionality, logging or error handling.
