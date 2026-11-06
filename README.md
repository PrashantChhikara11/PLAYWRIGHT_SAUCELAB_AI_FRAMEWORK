# 🎭 Playwright Web + API Automation Framework — SauceDemo & GoRest

![Playwright](https://img.shields.io/badge/Playwright-1.64-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-121-brightgreen)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

An end-to-end test automation framework covering a web shop UI (**[SauceDemo](https://www.saucedemo.com/)**) and a REST API (**[GoRest v2](https://gorest.co.in/)**) in one Playwright + TypeScript project.

| Layer | Tests | Coverage |
|---|---|---|
| **Web** | 63 | Login (valid, locked-out, invalid, data-driven from JSON/CSV/Excel), access control, inventory sorting, product details, cart, burger menu, checkout validation, full purchase flow, special users (problem / glitch / error / visual) |
| **API** | 58 | Users, Posts, Comments, Todos: CRUD, pagination, filters, `401`/`404`/`422` negative cases, token privacy, JSON-schema validation, multi-step E2E chains |

---

## ✨ Highlights

- **Page Object Model + custom fixtures** — tests receive ready page objects (`loginPage`, `cartPage`, …) instead of building them
- **Data-driven testing** — the same login scenarios run from **JSON, CSV and Excel** via a shared `DataReader`
- **Schema validation** — every API response is validated with **Ajv + ajv-formats** against typed schemas
- **Independent, self-cleaning API tests** — each test creates its own data with Faker and deletes it (children before parents), so tests run in parallel and repeatedly
- **Tag-based suites** — `@sanity`, `@regression`, `@end-to-end`, `@datadriven`, `@web`, `@api`
- **Three reports** — Playwright HTML, a custom HTML dashboard (screenshots, videos, traces) and Allure
- **CI with GitHub Actions** — run any suite in headless or headed mode from the Actions tab
- **AI-assisted development** — tests generated with **Playwright MCP + Claude Code** from the prompt specs in [`prompts/`](prompts/), then reviewed, debugged and stabilised (e.g. retry logic for the animated burger menu, consistent pagination under concurrent writes)

---

## 📁 Project Structure

```
├── api/
│   ├── endpoints/routes.ts        # All GoRest routes in one place
│   └── schemas/                   # JSON schemas: user, post, comment, todo, validation error
├── pages/                         # Page objects: Login, Inventory, ProductDetails, Cart, Checkout, Menu
├── fixtures/pageFixtures.ts       # Injects page objects into tests
├── tests/
│   ├── web/                       # 9 UI spec files
│   └── api/                       # 6 API spec files
├── testdata/
│   ├── web/                       # Login data (JSON / CSV / XLSX), products, checkout data
│   └── api/                       # GoRest messages, enums, invalid values
├── utils/
│   ├── helper.ts                  # URL builder, auth headers
│   ├── dataGenerator.ts           # Faker-based random payloads
│   ├── DataReader.ts              # JSON / CSV / Excel reader
│   └── CustomReporter.ts          # Custom HTML report
├── prompts/                       # Test specifications used for AI-assisted generation
├── .github/workflows/playwright.yml
└── playwright.config.ts
```

---

## ⚙️ Setup

```bash
git clone https://github.com/PrashantChhikara11/PLAYWRIGHT_SAUCELAB_AI_FRAMEWORK.git
cd PLAYWRIGHT_SAUCELAB_AI_FRAMEWORK
npm ci
npx playwright install chromium
cp .env.example .env
```

Open `.env` and set `GOREST_TOKEN` to your own token from [gorest.co.in](https://gorest.co.in/) (needed for the API tests only).

---

## ▶️ Running Tests

| Command | Runs |
|---|---|
| `npm run test:master` | Everything (121 tests) |
| `npm run test:web` | UI tests |
| `npm run test:api` | API tests |
| `npm run test:sanity` | Quick smoke suite |
| `npm run test:regression` | Full regression |
| `npm run test:e2e` | End-to-end workflows |
| `npm run test:datadriven` | Data-driven login tests |
| `npm run test:master:headed` | Everything, with a visible browser |
| `npm run test:sanity:debug` | Sanity suite in the Playwright inspector |

Extra Playwright options go after `--`, e.g. `npm run test:web -- --workers=2`.

> **Note:** GoRest allows ~300 requests per minute per token and one full API run uses ~250, so wait a minute between back-to-back API runs.

---

## 📊 Reports

| Report | Location | Open with |
|---|---|---|
| Playwright HTML | `reports/` | `npx playwright show-report reports` |
| Custom dashboard | `custom-report/` | Open the latest `report_*.html` |
| Allure | `allure-results/` | `npx allure serve allure-results` |

Screenshots, videos and traces are kept for failed tests.

---

## 🔄 CI/CD

[`.github/workflows/playwright.yml`](.github/workflows/playwright.yml) runs on every push and pull request to `main`. From **Actions → 🎭 Playwright Tests → Run workflow** you can choose the suite and headless/headed mode. All three reports are uploaded as build artifacts. The GoRest token is supplied from the `GOREST_TOKEN` repository secret.

---

**Author:** [Prashant Chhikara](https://github.com/PrashantChhikara11)
