# GoRest v2 REST API – API Test Prompts

**Base URL:** `https://gorest.co.in/public/v2` (`Routes.BASE_URL` in `api/endpoints/routes.ts`)
**Traceability:** every scenario lists the finding IDs from `prompts/discovery_notes.md` (sections A0–A7) it is based on.

## Common Requirements

For every prompt:

- Use **Playwright Test with TypeScript** (`@playwright/test`). All generated files are `.ts`.
- Import `test` and `expect` only from `@playwright/test`. Do not use any other test runner, assertion library or HTTP client.
- Use `async`/`await` for every Playwright call and web-first assertions (`await expect(locator).toHaveText(...)`, `toBeVisible()`, `toHaveURL()`), never manual waits such as `page.waitForTimeout()`.
- Code must pass `npx tsc --noEmit` with the project's existing `tsconfig.json`.
- Do not modify `playwright.config.ts`, `tsconfig.json` or `package.json`.

Framework rules:

- **Test titles must contain `@master`.** `playwright.config.ts` has `grep: /@master/`, so tests without it are skipped.
- Specs go in `tests/api/*.spec.ts` (`testDir` is `./tests`): `users.spec.ts`, `posts.spec.ts`, `comments.spec.ts`, `todos.spec.ts`, `schema.spec.ts`, `e2e.spec.ts`. Run with: `npx playwright test tests/api --project=chromium`.
- Use Playwright's built-in `request` fixture (`APIRequestContext`) with `request.get/post/put/patch/delete`.
- **Always build full URLs as `Routes.BASE_URL + Helper.buildUrl(Routes.X, {...})`** (or `Routes.BASE_URL + Routes.X` when the route has no placeholders). Never rely on `baseURL`: it is not configured, and Playwright would drop the `/public/v2` path for URLs starting with `/`.
- **Headers:**
  - **Every request, GETs included, sends `Helper.getAuthHeaders()`** (reads `GOREST_TOKEN` from `.env`). Resources created with the token are private to it: a GET without the token returns `404` for them (A7). Public data still returns `200` with the token.
  - **Invalid token:** `{ ...Helper.getAuthHeaders(), Authorization: \`Bearer ${testData.invalidToken}\` }`
  - **Missing token:** `const { Authorization, ...noTokenHeaders } = Helper.getAuthHeaders();` then send `noTokenHeaders`.
  - If `GOREST_TOKEN` is empty or invalid, every request returns `401 Invalid token`. That is a setup problem, not a test bug.
- Payloads come only from `RandomDataUtil` (`utils/dataGenerator.ts`). Static values and messages come from `testdata/api/gorest_testdata.json`, imported as `import testData from '../../testdata/api/gorest_testdata.json';`.
- **Never rely on hard-coded resource IDs.** GoRest data is public, changes constantly and resets every 3 hours. Any test that needs an existing user/post/comment/todo **creates it first** (in the test or a `beforeAll`) and **deletes it afterwards** (in `afterAll` or a `finally` block, deleting children before parents: comment → todo → post → user; ignore a `404` during cleanup). Read-only list tests (Get All, pagination, filters) may use public data. Only `testData.nonExistingId` may be hard-coded.
- Schemas are validated with `ajv` + `ajv-formats`: `import Ajv from 'ajv'; import addFormats from 'ajv-formats'; const ajv = new Ajv({ allErrors: true, allowUnionTypes: true }); addFormats(ajv);`. **Prerequisite: `ajv-formats` is not installed yet (`npm i -D ajv-formats`); do not generate schema tests until it is.**
- Validate status codes, response structure and important fields, with meaningful assertion messages (`expect(value, 'message')`).
- For `422` responses, find the error with `body.find((e: any) => e.field === '<field>')` and compare its `message` to the exact text from `testData.messages`.
- Keep tests independent, except the E2E workflows, which chain on purpose.

Status codes observed live: create `201`; read/update `200`; delete `204` with an empty body; not found `404` `{"message":"Resource not found"}`; missing token `401` `{"message":"Authentication failed"}`; invalid token `401` `{"message":"Invalid token"}`; validation `422` with an array of `{field, message}`.

---

# Users

## 1. Get All Users

**Traces:** A-USR-01

1. GET `Routes.BASE_URL + Routes.GET_ALL_USERS`.
2. Verify status `200` and the body is an array of `testData.pagination.defaultPerPage` (10) items.
3. Verify each item has `id`, `name`, `email`, `gender`, `status`; `gender` is in `testData.validGenders`; `status` is in `testData.validUserStatuses`.

### Expected Result

A list of 10 users with valid fields is returned.

---

## 2. Pagination

**Traces:** A-USR-03

1. GET `Helper.buildUrl(Routes.GET_USERS_PAGINATED, { page: testData.pagination.page, perPage: testData.pagination.perPage })`.
2. Verify status `200` and array length `testData.pagination.perPage` (5).
3. Verify header `x-pagination-page` equals `String(testData.pagination.page)` and `x-pagination-limit` equals `String(testData.pagination.perPage)`. Verify `x-pagination-total` and `x-pagination-pages` exist.
4. Request page `testData.pagination.page + 1` with the same `perPage`; verify none of its ids appear on page 1.

### Expected Result

Paging returns the requested size, correct headers, and distinct pages.

---

## 3. Pagination Above the Maximum

**Traces:** A-USR-04

1. GET `Routes.GET_USERS_PAGINATED` with `page: testData.pagination.page`, `perPage: testData.pagination.maxPerPage + 1` (101).
2. Verify `200`, array length `testData.pagination.defaultPerPage` and `x-pagination-limit` equals `String(testData.pagination.defaultPerPage)`.

### Expected Result

A `per_page` above 100 falls back to the default of 10.

---

## 4. Filter Users by Gender

**Traces:** A-USR-05

One test per value in `testData.validGenders`: GET `Helper.buildUrl(Routes.GET_USERS_BY_GENDER, { gender })`; verify `200`, at least one item, every `gender` equals the value.

### Expected Result

Only users of the requested gender are returned.

---

## 5. Filter Users by Status

**Traces:** A-USR-06

One test per value in `testData.validUserStatuses`: GET `Helper.buildUrl(Routes.GET_USERS_BY_STATUS, { status })`; verify `200`, at least one item, every `status` equals the value.

### Expected Result

Only users with the requested status are returned.

---

## 6. Filter by Invalid Gender

**Traces:** A-USR-07

GET `Helper.buildUrl(Routes.GET_USERS_BY_GENDER, { gender: testData.invalidGender })`; verify `200` and an empty array.

### Expected Result

An unknown filter value returns an empty list, not an error.

---

## 7. Create User

**Traces:** A-USR-14

1. POST `Routes.CREATE_USER` with `RandomDataUtil.generateUserPayload()`.
2. Verify `201`, `body.id` is a number, and `name`, `email`, `gender`, `status` equal the payload.
3. Cleanup: DELETE `Helper.buildUrl(Routes.DELETE_USER, { id })`.

### Expected Result

The user is created and returned with a new id.

---

## 8. Get User by ID

**Traces:** A-USR-15

1. Create a user (as in 7).
2. GET `Helper.buildUrl(Routes.GET_USER_BY_ID, { id })`.
3. Verify `200`, the body is an object, and all fields equal the created user.
4. Cleanup: delete the user.

### Expected Result

The created user can be read back.

---

## 9. Update User (PUT)

**Traces:** A-USR-16

1. Create a user.
2. PUT `Helper.buildUrl(Routes.UPDATE_USER, { id })` with `RandomDataUtil.generateUserUpdatePayload()`.
3. Verify `200`, `body.id` is unchanged, all four fields equal the update payload, and `body.name` starts with `Updated `.
4. Cleanup: delete the user.

### Expected Result

All user fields are replaced.

---

## 10. Partial Update (PATCH status only)

**Traces:** A-USR-17

1. Create a user. Pick the other value from `testData.validUserStatuses` than the created `status`.
2. PATCH `Helper.buildUrl(Routes.PATCH_USER, { id })` with `{ status: newStatus }`.
3. Verify `200`, `body.status` equals `newStatus`, and `name`, `email`, `gender` are unchanged.
4. Cleanup: delete the user.

### Expected Result

Only the status changes.

---

## 11. Delete User

**Traces:** A-USR-18

1. Create a user.
2. DELETE `Helper.buildUrl(Routes.DELETE_USER, { id })`; verify `204` and an empty body (`await response.text()` is `''`).
3. GET `Helper.buildUrl(Routes.GET_USER_BY_ID, { id })`; verify `404` and `body.message` equals `testData.messages.notFound`.

### Expected Result

The user is deleted and no longer found.

---

## 12. Get Non-Existing User

**Traces:** A-USR-08

GET `Helper.buildUrl(Routes.GET_USER_BY_ID, { id: testData.nonExistingId })`; verify `404` and `body.message` equals `testData.messages.notFound`.

### Expected Result

`404 Resource not found`.

---

## 13. Update Non-Existing User

**Traces:** A-USR-19

PUT `Helper.buildUrl(Routes.UPDATE_USER, { id: testData.nonExistingId })` with `RandomDataUtil.generateUserUpdatePayload()`; verify `404` and `testData.messages.notFound`.

### Expected Result

`404 Resource not found`.

---

## 14. Create User with Duplicate Email

**Traces:** A-USR-20

1. Create a user.
2. POST `Routes.CREATE_USER` with `{ ...RandomDataUtil.generateUserPayload(), email: createdUser.email }`.
3. Verify `422` and the `email` error message equals `testData.messages.emailTaken`.
4. Cleanup: delete the first user.

### Expected Result

`422` with `email: has already been taken`.

---

## 15. Create User with Invalid Payload

**Traces:** A-USR-21, A-SCH-06

1. POST `Routes.CREATE_USER` with `RandomDataUtil.generateInvalidUserPayload()`.
2. Verify `422` and the body is valid against `validationErrorSchema` from `api/schemas/error_api_schema.ts`.
3. Verify messages: `name` → `testData.messages.blank`, `status` → `testData.messages.blank`, `gender` → `testData.messages.invalidGender`, `email` → `testData.messages.invalidEmail`.

### Expected Result

`422` listing every invalid field with its exact message.

---

## 16. Create User with Invalid Email

**Traces:** A-USR-22

POST `Routes.CREATE_USER` with `{ ...RandomDataUtil.generateUserPayload(), email: RandomDataUtil.generateInvalidUserPayload().email }`; verify `422`, exactly one error, field `email`, message `testData.messages.invalidEmail`.

### Expected Result

Only the email is rejected.

---

## 17. Create User with Invalid Enum Values

**Traces:** A-USR-23

POST `Routes.CREATE_USER` with `{ ...RandomDataUtil.generateUserPayload(), gender: testData.invalidGender, status: testData.invalidStatus }`; verify `422`, `gender` → `testData.messages.invalidGender`, `status` → `testData.messages.blank`.

### Expected Result

Invalid enum values are rejected with GoRest's exact messages.

---

## 18. Patch User with Invalid Status

**Traces:** A-USR-24

1. Create a user.
2. PATCH `Helper.buildUrl(Routes.PATCH_USER, { id })` with `{ status: testData.invalidStatus }`.
3. Verify `422` and `status` → `testData.messages.blank`.
4. Cleanup: delete the user.

### Expected Result

The invalid status is rejected.

---

## 19. Create User Without Token

**Traces:** A-USR-09

POST `Routes.CREATE_USER` with `RandomDataUtil.generateUserPayload()` and `noTokenHeaders`; verify `401` and `testData.messages.authenticationFailed`.

### Expected Result

`401 Authentication failed`.

---

## 20. Create User with Invalid Token

**Traces:** A-USR-10, A-USR-11

1. POST `Routes.CREATE_USER` with `RandomDataUtil.generateUserPayload()` and the invalid-token headers; verify `401` and `testData.messages.invalidToken`.
2. POST again with `RandomDataUtil.generateInvalidUserPayload()` and the invalid-token headers; verify `401` (not `422`) and `testData.messages.invalidToken`, which shows auth is checked before validation.

### Expected Result

`401 Invalid token` in both cases.

---

## 21. Update / Patch / Delete User with Invalid Token

**Traces:** A-USR-12

1. Create a user (valid token).
2. With the invalid-token headers: PUT `Routes.UPDATE_USER` (`generateUserUpdatePayload()`), PATCH `Routes.PATCH_USER` (`{ status: RandomDataUtil.getUserStatus() }`), DELETE `Routes.DELETE_USER`. Each returns `401` + `testData.messages.invalidToken`.
3. GET the user with `Helper.getAuthHeaders()`; verify `200` and the fields are unchanged.
4. Cleanup: delete the user.

### Expected Result

No write is accepted with an invalid token.

---

## 22. GET with Invalid Token

**Traces:** A-USR-13

GET `Routes.GET_ALL_USERS` with the invalid-token headers; verify `401` and `testData.messages.invalidToken`.

### Expected Result

Even public reads are rejected when a bad token is sent.

---

## 23. Created User Is Private to the Token

**Traces:** A-USR-25

1. Create a user.
2. GET `Routes.GET_USER_BY_ID` for it with `noTokenHeaders`; verify `404` and `testData.messages.notFound`.
3. GET it with `Helper.getAuthHeaders()`; verify `200`.
4. Cleanup: delete the user.

### Expected Result

The new user is only visible with the token that created it.

---

# Posts

All post tests create a user first (`beforeAll` or in-test) and delete it at the end.

## 24. Create User Post (Nested Route)

**Traces:** A-PST-07

POST `Helper.buildUrl(Routes.CREATE_USER_POST, { userId })` with `RandomDataUtil.generatePostPayload()`; verify `201`, `body.user_id` equals `userId`, and `title`/`body` equal the payload. Cleanup: delete the post, then the user.

### Expected Result

The post is created for that user.

---

## 25. Get User Posts

**Traces:** A-PST-03, A-PST-08

Create a user and a post. GET `Helper.buildUrl(Routes.GET_USER_POSTS, { userId })`; verify `200`, every item's `user_id` equals `userId`, and the list contains the created post id.

### Expected Result

Only that user's posts are returned, including the new one.

---

## 26. Get All Posts and Post by ID

**Traces:** A-PST-01, A-PST-02

1. GET `Routes.GET_ALL_POSTS`; verify `200`, a non-empty array, each item has `id`, `user_id`, `title`, `body`.
2. Create a user and a post; GET `Helper.buildUrl(Routes.GET_POST_BY_ID, { id })`; verify `200` and the fields equal the created post.

### Expected Result

Posts are listed and the created post can be read.

---

## 27. Update Post

**Traces:** A-PST-09

Create a user and a post. PUT `Helper.buildUrl(Routes.UPDATE_POST, { id })` with `RandomDataUtil.generatePostPayload()`; verify `200`, same `id` and `user_id`, new `title`/`body`.

### Expected Result

The post is updated.

---

## 28. Delete Post

**Traces:** A-PST-10

Create a user and a post. DELETE `Helper.buildUrl(Routes.DELETE_POST, { id })`; verify `204` with an empty body; GET `Routes.GET_POST_BY_ID` returns `404` + `testData.messages.notFound`.

### Expected Result

The post is deleted.

---

## 29. Create Post with Blank Fields

**Traces:** A-PST-11

Create a user. POST `Routes.CREATE_USER_POST` with `{ title: '', body: '' }`; verify `422`, valid against `validationErrorSchema`, `title` and `body` → `testData.messages.blank`.

### Expected Result

Blank title and body are rejected.

---

## 30. Create Post for Non-Existing User

**Traces:** A-PST-12

POST `Helper.buildUrl(Routes.CREATE_USER_POST, { userId: testData.nonExistingId })` with `RandomDataUtil.generatePostPayload()`; verify `422` and field `user` → `testData.messages.userMustExist`.

### Expected Result

A post cannot be created for a missing user.

---

## 31. Nested Posts of a Non-Existing User

**Traces:** A-PST-04

GET `Helper.buildUrl(Routes.GET_USER_POSTS, { userId: testData.nonExistingId })`; verify `200` and an empty array (the nested GET does not return `404`).

### Expected Result

An empty list is returned.

---

## 32. Get Non-Existing Post

**Traces:** A-PST-05

GET `Helper.buildUrl(Routes.GET_POST_BY_ID, { id: testData.nonExistingId })`; verify `404` + `testData.messages.notFound`.

### Expected Result

`404 Resource not found`.

---

## 33. Post Writes Without / With Invalid Token

**Traces:** A-PST-06

Create a user and a post (valid token). Then:
- POST `Routes.CREATE_USER_POST` with `generatePostPayload()` and `noTokenHeaders`: `401` + `testData.messages.authenticationFailed`.
- PUT `Routes.UPDATE_POST` with `generatePostPayload()` and invalid-token headers: `401` + `testData.messages.invalidToken`.
- DELETE `Routes.DELETE_POST` with invalid-token headers: `401` + `testData.messages.invalidToken`.

Cleanup: delete the post and the user.

### Expected Result

Post writes are rejected without a valid token.

---

# Comments

All comment tests create a user and a post first and delete them at the end.

## 34. Create Post Comment

**Traces:** A-CMT-06

POST `Helper.buildUrl(Routes.CREATE_POST_COMMENT, { postId })` with `RandomDataUtil.generateCommentPayload()`; verify `201`, `body.post_id` equals `postId`, and `name`/`email`/`body` equal the payload.

### Expected Result

The comment is created on that post.

---

## 35. Get Post Comments and Comment by ID

**Traces:** A-CMT-01, A-CMT-02, A-CMT-03, A-CMT-07

1. GET `Routes.GET_ALL_COMMENTS`; verify `200`, a non-empty array, each item has `id`, `post_id`, `name`, `email`, `body`.
2. Create a comment. GET `Helper.buildUrl(Routes.GET_POST_COMMENTS, { postId })`; verify `200`, every `post_id` equals `postId`, and the list contains the comment.
3. GET `Helper.buildUrl(Routes.GET_COMMENT_BY_ID, { id })`; verify `200` and the fields match.

### Expected Result

Comments are listed by post and individually.

---

## 36. Update Comment

**Traces:** A-CMT-08

PUT `Helper.buildUrl(Routes.UPDATE_COMMENT, { id })` with `RandomDataUtil.generateCommentPayload()`; verify `200`, same `id`/`post_id`, updated fields.

### Expected Result

The comment is updated.

---

## 37. Delete Comment

**Traces:** A-CMT-09

DELETE `Helper.buildUrl(Routes.DELETE_COMMENT, { id })`; verify `204`, empty body; GET `Routes.GET_COMMENT_BY_ID` returns `404` + `testData.messages.notFound`.

### Expected Result

The comment is deleted.

---

## 38. Create Comment with Invalid Data

**Traces:** A-CMT-10

POST `Routes.CREATE_POST_COMMENT` with `{ name: '', email: RandomDataUtil.generateInvalidUserPayload().email, body: '' }`; verify `422`, valid against `validationErrorSchema`, `name` and `body` → `testData.messages.blank`, `email` → `testData.messages.invalidEmail`.

### Expected Result

Invalid comment fields are rejected.

---

## 39. Get Non-Existing Comment

**Traces:** A-CMT-04

GET `Helper.buildUrl(Routes.GET_COMMENT_BY_ID, { id: testData.nonExistingId })`; verify `404` + `testData.messages.notFound`.

### Expected Result

`404 Resource not found`.

---

## 40. Comment Writes Without / With Invalid Token

**Traces:** A-CMT-05

With a created comment:
- POST `Routes.CREATE_POST_COMMENT` with `generateCommentPayload()` and `noTokenHeaders`: `401` + `testData.messages.authenticationFailed`.
- PUT `Routes.UPDATE_COMMENT` with invalid-token headers: `401` + `testData.messages.invalidToken`.
- DELETE `Routes.DELETE_COMMENT` with invalid-token headers: `401` + `testData.messages.invalidToken`.

### Expected Result

Comment writes are rejected without a valid token.

---

# Todos

All todo tests create a user first and delete it at the end.

## 41. Create User Todo

**Traces:** A-TDO-06

POST `Helper.buildUrl(Routes.CREATE_USER_TODO, { userId })` with `RandomDataUtil.generateTodoPayload()`; verify `201`, `user_id` equals `userId`, `title`/`status` equal the payload, and `new Date(body.due_on).getTime()` equals `new Date(payload.due_on).getTime()`. GoRest returns the same instant with a `+05:30` offset, so do not compare the strings.

### Expected Result

The todo is created for the user.

---

## 42. Create Todo Without Due Date

**Traces:** A-TDO-07

POST `Routes.CREATE_USER_TODO` with `{ title: RandomDataUtil.getSentence(), status: testData.validTodoStatuses[0] }`; verify `201` and `body.due_on` is `null`.

### Expected Result

`due_on` is `null` when not sent.

---

## 43. Get User Todos and Todo by ID

**Traces:** A-TDO-01, A-TDO-02, A-TDO-03, A-TDO-08

1. GET `Routes.GET_ALL_TODOS`; verify `200`, a non-empty array, each `status` in `testData.validTodoStatuses`.
2. Create a todo. GET `Helper.buildUrl(Routes.GET_USER_TODOS, { userId })`; verify `200`, every `user_id` equals `userId`, list contains the todo.
3. GET `Helper.buildUrl(Routes.GET_TODO_BY_ID, { id })`; verify `200` and the fields match.

### Expected Result

Todos are listed by user and individually.

---

## 44. Update Todo Status to Completed

**Traces:** A-TDO-09

Create a todo with status `testData.validTodoStatuses[0]` (`pending`). PUT `Helper.buildUrl(Routes.UPDATE_TODO, { id })` with `{ status: testData.validTodoStatuses[1] }`; verify `200` and `status` is `completed`; GET it and verify again.

### Expected Result

The todo is marked completed.

---

## 45. Delete Todo

**Traces:** A-TDO-10

DELETE `Helper.buildUrl(Routes.DELETE_TODO, { id })`; verify `204`, empty body; GET `Routes.GET_TODO_BY_ID` returns `404` + `testData.messages.notFound`.

### Expected Result

The todo is deleted.

---

## 46. Create Todo with Invalid Status

**Traces:** A-TDO-11

POST `Routes.CREATE_USER_TODO` with `{ title: RandomDataUtil.getSentence(), status: testData.invalidStatus }`; verify `422` and `status` → `testData.messages.invalidTodoStatus`.

### Expected Result

The invalid status is rejected.

---

## 47. Get Non-Existing Todo

**Traces:** A-TDO-04

GET `Helper.buildUrl(Routes.GET_TODO_BY_ID, { id: testData.nonExistingId })`; verify `404` + `testData.messages.notFound`.

### Expected Result

`404 Resource not found`.

---

## 48. Todo Writes Without / With Invalid Token

**Traces:** A-TDO-05

With a created todo:
- POST `Routes.CREATE_USER_TODO` with `generateTodoPayload()` and `noTokenHeaders`: `401` + `testData.messages.authenticationFailed`.
- PUT `Routes.UPDATE_TODO` with `{ status: testData.validTodoStatuses[1] }` and invalid-token headers: `401` + `testData.messages.invalidToken`.
- DELETE `Routes.DELETE_TODO` with invalid-token headers: `401` + `testData.messages.invalidToken`.

### Expected Result

Todo writes are rejected without a valid token.

---

# Schema Validation

**Requires `ajv-formats` (not installed yet).** On failure use `ajv.errorsText(validate.errors)` as the assertion message.

## 49. User Schema

**Traces:** A-SCH-01, A-SCH-05

Validate every item of `Routes.GET_ALL_USERS`, plus the create (`201`) and GET-by-id responses of a created user, against `userSchema` from `api/schemas/user_api_schema.ts`.

## 50. Post Schema

**Traces:** A-SCH-02, A-SCH-05

Same with `Routes.GET_ALL_POSTS`, a created post, and `postSchema` from `api/schemas/post_api_schema.ts`.

## 51. Comment Schema

**Traces:** A-SCH-03, A-SCH-05

Same with `Routes.GET_ALL_COMMENTS`, a created comment, and `commentSchema` from `api/schemas/comment_api_schema.ts`.

## 52. Todo Schema

**Traces:** A-SCH-04, A-SCH-05, A-TDO-07

Same with `Routes.GET_ALL_TODOS`, a created todo **with** `due_on` and one **without** (`due_on: null`), against `todoSchema` from `api/schemas/todo_api_schema.ts`.

### Expected Result (49–52)

Every response matches its schema exactly (`additionalProperties: false`). `validationErrorSchema` is covered in scenarios 15, 29 and 38.

---

# End-to-End Workflows

## 53. User CRUD Workflow

**Traces:** A-E2E-02

Create (`201`) → GET (`200`, fields match) → PUT with `generateUserUpdatePayload()` (`200`) → PATCH `status` (`200`, other fields kept) → DELETE (`204`) → GET (`404` + `testData.messages.notFound`). Use the id from the create response throughout.

### Expected Result

The full user lifecycle works with one generated id.

---

## 54. User → Post → Comment Chain

**Traces:** A-E2E-03

1. Create a user, then a post for it (`Routes.CREATE_USER_POST`), then a comment on the post (`Routes.CREATE_POST_COMMENT`).
2. Verify `post.user_id === user.id` and `comment.post_id === post.id`.
3. Verify `Routes.GET_USER_POSTS` contains the post and `Routes.GET_POST_COMMENTS` contains the comment.
4. Delete in reverse order (comment → post → user), each `204`; then GET each returns `404`.

### Expected Result

Relationships are consistent and everything is cleaned up.

---

## 55. User → Todo Workflow

**Traces:** A-E2E-04

Create a user → create a todo with status `testData.validTodoStatuses[0]` → PUT status `testData.validTodoStatuses[1]` → GET the todo and verify `completed` → verify `Routes.GET_USER_TODOS` contains it → delete todo then user (`204`) → GET todo returns `404`.

### Expected Result

The todo lifecycle completes for a freshly created user.

---

## 56. Public Comment → Post Chain (read-only)

**Traces:** A-E2E-01

GET `Routes.GET_ALL_COMMENTS` → take the first `post_id` → GET `Routes.GET_POST_BY_ID` (`200`, `id` matches) → GET `Routes.GET_POST_COMMENTS` (contains the comment id). Do not assert the post's user exists (deleted users were observed in public data).

### Expected Result

Public comment ↔ post relationships are consistent.

---

# Final Implementation Quality Criteria

The generated API tests must:

- Be TypeScript Playwright API tests in `tests/api/` using only the `request` fixture from `@playwright/test`.
- Include `@master` in every test title.
- Build every URL as `Routes.BASE_URL + Helper.buildUrl(Routes.X, {...})`, using only route keys that exist in `api/endpoints/routes.ts`.
- Send `Helper.getAuthHeaders()` on every request; derive the invalid/missing-token variants from it.
- Take payloads from `RandomDataUtil` and static values/messages from `testdata/api/gorest_testdata.json`; no hard-coded ids except `testData.nonExistingId`.
- Create every resource a test needs and delete it afterwards (children before parents).
- Validate status codes, bodies, headers and schemas with clear assertion messages.
- Never print or hard-code `GOREST_TOKEN`.
- Pass `npx tsc --noEmit` and run with `npx playwright test tests/api --project=chromium`.
