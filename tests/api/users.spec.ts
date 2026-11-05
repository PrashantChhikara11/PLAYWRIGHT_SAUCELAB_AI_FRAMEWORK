/**
 * GoRest v2 – Users API Tests (prompt scenarios 1–23)
 * Traces: A-USR-01 .. A-USR-25, A-SCH-06
 *
 * Tags: @master @api (+ @sanity / @regression)
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import dotenv from 'dotenv';
import { Routes } from '../../api/endpoints/routes';
import { validationErrorSchema } from '../../api/schemas/error_api_schema';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import testData from '../../testdata/api/gorest_testdata.json';

dotenv.config();

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

type FieldError = { field: string; message: string };

test.describe('Users API Tests', () => {

    // ---------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------

    const authHeaders = Helper.getAuthHeaders();
    const invalidTokenHeaders = { ...authHeaders, Authorization: `Bearer ${testData.invalidToken}` };
    const { Authorization, ...noTokenHeaders } = authHeaders;

    /** Builds a full URL: Routes.BASE_URL + route with placeholders replaced */
    const url = (route: string, params: Record<string, string | number> = {}): string =>
        Routes.BASE_URL + Helper.buildUrl(route, params);

    /** Returns the message of the 422 error for a field */
    const errorFor = (errors: FieldError[], field: string): string | undefined =>
        errors.find((e) => e.field === field)?.message;

    /** Creates a user with a random payload and returns the response body */
    const createUser = async (request: APIRequestContext) => {
        const response = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateUserPayload() });
        expect(response.status(), 'Create user (setup) status').toBe(201);
        return await response.json();
    };

    /** Deletes a user, ignoring 404 (already deleted) */
    const deleteUser = async (request: APIRequestContext, id: number): Promise<void> => {
        const response = await request.delete(url(Routes.DELETE_USER, { id }), { headers: authHeaders });
        expect([204, 404], 'Cleanup delete user status').toContain(response.status());
    };

    // ---------------------------------------------------------
    // GET - List, Pagination, Filters
    // ---------------------------------------------------------

    test('GET - All Users @master @sanity @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_ALL_USERS), { headers: authHeaders });

        expect(response.status(), 'Get all users status').toBe(200);
        const users = await response.json();
        expect(Array.isArray(users), 'Body is an array').toBeTruthy();
        expect(users.length, 'Default page size').toBe(testData.pagination.defaultPerPage);

        for (const user of users) {
            expect(user, 'User has all fields').toEqual(expect.objectContaining({
                id: expect.any(Number), name: expect.any(String), email: expect.any(String)
            }));
            expect(testData.validGenders, `Gender of user ${user.id}`).toContain(user.gender);
            expect(testData.validUserStatuses, `Status of user ${user.id}`).toContain(user.status);
        }
    });

    test('GET - Users Pagination @master @regression @api', async ({ request }) => {
        const { page, perPage } = testData.pagination;

        const response = await request.get(url(Routes.GET_USERS_PAGINATED, { page, perPage }), { headers: authHeaders });
        expect(response.status(), 'Page 1 status').toBe(200);
        const pageOne = await response.json();
        expect(pageOne.length, 'Page 1 size').toBe(perPage);

        const headers = response.headers();
        expect(headers['x-pagination-page'], 'x-pagination-page header').toBe(String(page));
        expect(headers['x-pagination-limit'], 'x-pagination-limit header').toBe(String(perPage));
        expect(headers['x-pagination-total'], 'x-pagination-total header').toBeTruthy();
        expect(headers['x-pagination-pages'], 'x-pagination-pages header').toBeTruthy();

        // The list is live (other tests and GoRest users create users concurrently), so an insert between
        // the two requests shifts the pages. Re-read both pages together until a consistent snapshot is seen.
        await expect(async () => {
            const firstResponse = await request.get(url(Routes.GET_USERS_PAGINATED, { page, perPage }), { headers: authHeaders });
            const nextResponse = await request.get(url(Routes.GET_USERS_PAGINATED, { page: page + 1, perPage }), { headers: authHeaders });
            expect(nextResponse.status(), 'Page 2 status').toBe(200);
            const pageOneIds = (await firstResponse.json()).map((user: { id: number }) => user.id);
            for (const user of await nextResponse.json()) {
                expect(pageOneIds, `User ${user.id} of page 2 must not be on page 1`).not.toContain(user.id);
            }
        }).toPass({ timeout: 20000 });
    });

    test('GET - Users Pagination Above the Maximum @master @regression @api', async ({ request }) => {
        const { page, maxPerPage, defaultPerPage } = testData.pagination;

        const response = await request.get(url(Routes.GET_USERS_PAGINATED, { page, perPage: maxPerPage + 1 }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(200);
        expect((await response.json()).length, 'Falls back to the default page size').toBe(defaultPerPage);
        expect(response.headers()['x-pagination-limit'], 'x-pagination-limit header').toBe(String(defaultPerPage));
    });

    for (const gender of testData.validGenders) {
        test(`GET - Filter Users by Gender "${gender}" @master @regression @api`, async ({ request }) => {
            const response = await request.get(url(Routes.GET_USERS_BY_GENDER, { gender }), { headers: authHeaders });

            expect(response.status(), 'Status').toBe(200);
            const users = await response.json();
            expect(users.length, 'At least one user').toBeGreaterThan(0);
            for (const user of users) {
                expect(user.gender, `Gender of user ${user.id}`).toBe(gender);
            }
        });
    }

    for (const status of testData.validUserStatuses) {
        test(`GET - Filter Users by Status "${status}" @master @regression @api`, async ({ request }) => {
            const response = await request.get(url(Routes.GET_USERS_BY_STATUS, { status }), { headers: authHeaders });

            expect(response.status(), 'Status').toBe(200);
            const users = await response.json();
            expect(users.length, 'At least one user').toBeGreaterThan(0);
            for (const user of users) {
                expect(user.status, `Status of user ${user.id}`).toBe(status);
            }
        });
    }

    test('GET - Filter Users by Invalid Gender @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_USERS_BY_GENDER, { gender: testData.invalidGender }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(200);
        expect(await response.json(), 'Empty list').toEqual([]);
    });

    // ---------------------------------------------------------
    // POST / GET by ID / PUT / PATCH / DELETE
    // ---------------------------------------------------------

    test('POST - Create User @master @sanity @api', async ({ request }) => {
        const payload = RandomDataUtil.generateUserPayload();

        const response = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: payload });
        expect(response.status(), 'Create user status').toBe(201);
        const user = await response.json();

        try {
            expect(typeof user.id, 'id is a number').toBe('number');
            expect(user, 'Response echoes the payload').toMatchObject(payload);
        } finally {
            await deleteUser(request, user.id);
        }
    });

    test('GET - User by ID @master @sanity @api', async ({ request }) => {
        const created = await createUser(request);

        try {
            const response = await request.get(url(Routes.GET_USER_BY_ID, { id: created.id }), { headers: authHeaders });
            expect(response.status(), 'Get user status').toBe(200);
            const user = await response.json();
            expect(Array.isArray(user), 'Body is an object').toBeFalsy();
            expect(user, 'User equals the created user').toEqual(created);
        } finally {
            await deleteUser(request, created.id);
        }
    });

    test('PUT - Update User @master @regression @api', async ({ request }) => {
        const created = await createUser(request);
        const updatePayload = RandomDataUtil.generateUserUpdatePayload();

        try {
            const response = await request.put(url(Routes.UPDATE_USER, { id: created.id }), { headers: authHeaders, data: updatePayload });
            expect(response.status(), 'Update user status').toBe(200);
            const user = await response.json();
            expect(user.id, 'id unchanged').toBe(created.id);
            expect(user, 'All fields replaced').toMatchObject(updatePayload);
            expect(user.name.startsWith('Updated '), 'Name starts with "Updated "').toBeTruthy();
        } finally {
            await deleteUser(request, created.id);
        }
    });

    test('PATCH - Partial Update User Status @master @regression @api', async ({ request }) => {
        const created = await createUser(request);
        const newStatus = testData.validUserStatuses.find((status) => status !== created.status) as string;

        try {
            const response = await request.patch(url(Routes.PATCH_USER, { id: created.id }), { headers: authHeaders, data: { status: newStatus } });
            expect(response.status(), 'Patch user status').toBe(200);
            const user = await response.json();
            expect(user.status, 'Status changed').toBe(newStatus);
            expect(user.name, 'Name unchanged').toBe(created.name);
            expect(user.email, 'Email unchanged').toBe(created.email);
            expect(user.gender, 'Gender unchanged').toBe(created.gender);
        } finally {
            await deleteUser(request, created.id);
        }
    });

    test('DELETE - Delete User @master @sanity @api', async ({ request }) => {
        const created = await createUser(request);

        const response = await request.delete(url(Routes.DELETE_USER, { id: created.id }), { headers: authHeaders });
        expect(response.status(), 'Delete user status').toBe(204);
        expect(await response.text(), 'Empty body').toBe('');

        const getResponse = await request.get(url(Routes.GET_USER_BY_ID, { id: created.id }), { headers: authHeaders });
        expect(getResponse.status(), 'Get deleted user status').toBe(404);
        expect((await getResponse.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    // ---------------------------------------------------------
    // Negative - Not Found / Validation
    // ---------------------------------------------------------

    test('GET - Non-Existing User @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_USER_BY_ID, { id: testData.nonExistingId }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(404);
        expect((await response.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    test('PUT - Update Non-Existing User @master @regression @api', async ({ request }) => {
        const response = await request.put(url(Routes.UPDATE_USER, { id: testData.nonExistingId }), {
            headers: authHeaders, data: RandomDataUtil.generateUserUpdatePayload()
        });

        expect(response.status(), 'Status').toBe(404);
        expect((await response.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    test('POST - Create User with Duplicate Email @master @regression @api', async ({ request }) => {
        const created = await createUser(request);

        try {
            const response = await request.post(url(Routes.CREATE_USER), {
                headers: authHeaders, data: { ...RandomDataUtil.generateUserPayload(), email: created.email }
            });
            expect(response.status(), 'Status').toBe(422);
            expect(errorFor(await response.json(), 'email'), 'email error').toBe(testData.messages.emailTaken);
        } finally {
            await deleteUser(request, created.id);
        }
    });

    test('POST - Create User with Invalid Payload @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateInvalidUserPayload() });

        expect(response.status(), 'Status').toBe(422);
        const errors = await response.json();

        const validate = ajv.compile(validationErrorSchema);
        expect(validate(errors), ajv.errorsText(validate.errors)).toBeTruthy();

        expect(errorFor(errors, 'name'), 'name error').toBe(testData.messages.blank);
        expect(errorFor(errors, 'status'), 'status error').toBe(testData.messages.blank);
        expect(errorFor(errors, 'gender'), 'gender error').toBe(testData.messages.invalidGender);
        expect(errorFor(errors, 'email'), 'email error').toBe(testData.messages.invalidEmail);
    });

    test('POST - Create User with Invalid Email @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER), {
            headers: authHeaders, data: { ...RandomDataUtil.generateUserPayload(), email: RandomDataUtil.generateInvalidUserPayload().email }
        });

        expect(response.status(), 'Status').toBe(422);
        const errors: FieldError[] = await response.json();
        expect(errors.length, 'Exactly one error').toBe(1);
        expect(errors[0].field, 'Error field').toBe('email');
        expect(errors[0].message, 'Error message').toBe(testData.messages.invalidEmail);
    });

    test('POST - Create User with Invalid Enum Values @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER), {
            headers: authHeaders,
            data: { ...RandomDataUtil.generateUserPayload(), gender: testData.invalidGender, status: testData.invalidStatus }
        });

        expect(response.status(), 'Status').toBe(422);
        const errors = await response.json();
        expect(errorFor(errors, 'gender'), 'gender error').toBe(testData.messages.invalidGender);
        expect(errorFor(errors, 'status'), 'status error').toBe(testData.messages.blank);
    });

    test('PATCH - User with Invalid Status @master @regression @api', async ({ request }) => {
        const created = await createUser(request);

        try {
            const response = await request.patch(url(Routes.PATCH_USER, { id: created.id }), {
                headers: authHeaders, data: { status: testData.invalidStatus }
            });
            expect(response.status(), 'Status').toBe(422);
            expect(errorFor(await response.json(), 'status'), 'status error').toBe(testData.messages.blank);
        } finally {
            await deleteUser(request, created.id);
        }
    });

    // ---------------------------------------------------------
    // Negative - Authentication
    // ---------------------------------------------------------

    test('POST - Create User Without Token @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER), { headers: noTokenHeaders, data: RandomDataUtil.generateUserPayload() });

        expect(response.status(), 'Status').toBe(401);
        expect((await response.json()).message, 'Message').toBe(testData.messages.authenticationFailed);
    });

    test('POST - Create User with Invalid Token @master @regression @api', async ({ request }) => {
        const validPayloadResponse = await request.post(url(Routes.CREATE_USER), {
            headers: invalidTokenHeaders, data: RandomDataUtil.generateUserPayload()
        });
        expect(validPayloadResponse.status(), 'Valid payload status').toBe(401);
        expect((await validPayloadResponse.json()).message, 'Valid payload message').toBe(testData.messages.invalidToken);

        const invalidPayloadResponse = await request.post(url(Routes.CREATE_USER), {
            headers: invalidTokenHeaders, data: RandomDataUtil.generateInvalidUserPayload()
        });
        expect(invalidPayloadResponse.status(), 'Invalid payload status (auth before validation)').toBe(401);
        expect((await invalidPayloadResponse.json()).message, 'Invalid payload message').toBe(testData.messages.invalidToken);
    });

    test('PUT / PATCH / DELETE - User with Invalid Token @master @regression @api', async ({ request }) => {
        const created = await createUser(request);
        const userUrl = url(Routes.UPDATE_USER, { id: created.id });

        try {
            const putResponse = await request.put(userUrl, { headers: invalidTokenHeaders, data: RandomDataUtil.generateUserUpdatePayload() });
            expect(putResponse.status(), 'PUT status').toBe(401);
            expect((await putResponse.json()).message, 'PUT message').toBe(testData.messages.invalidToken);

            const patchResponse = await request.patch(url(Routes.PATCH_USER, { id: created.id }), {
                headers: invalidTokenHeaders, data: { status: RandomDataUtil.getUserStatus() }
            });
            expect(patchResponse.status(), 'PATCH status').toBe(401);
            expect((await patchResponse.json()).message, 'PATCH message').toBe(testData.messages.invalidToken);

            const deleteResponse = await request.delete(url(Routes.DELETE_USER, { id: created.id }), { headers: invalidTokenHeaders });
            expect(deleteResponse.status(), 'DELETE status').toBe(401);
            expect((await deleteResponse.json()).message, 'DELETE message').toBe(testData.messages.invalidToken);

            const getResponse = await request.get(url(Routes.GET_USER_BY_ID, { id: created.id }), { headers: authHeaders });
            expect(getResponse.status(), 'GET status').toBe(200);
            expect(await getResponse.json(), 'User unchanged').toEqual(created);
        } finally {
            await deleteUser(request, created.id);
        }
    });

    test('GET - Users with Invalid Token @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_ALL_USERS), { headers: invalidTokenHeaders });

        expect(response.status(), 'Status').toBe(401);
        expect((await response.json()).message, 'Message').toBe(testData.messages.invalidToken);
    });

    test('GET - Created User Is Private to the Token @master @regression @api', async ({ request }) => {
        const created = await createUser(request);

        try {
            const noTokenResponse = await request.get(url(Routes.GET_USER_BY_ID, { id: created.id }), { headers: noTokenHeaders });
            expect(noTokenResponse.status(), 'Status without token').toBe(404);
            expect((await noTokenResponse.json()).message, 'Message without token').toBe(testData.messages.notFound);

            const tokenResponse = await request.get(url(Routes.GET_USER_BY_ID, { id: created.id }), { headers: authHeaders });
            expect(tokenResponse.status(), 'Status with token').toBe(200);
        } finally {
            await deleteUser(request, created.id);
        }
    });
});
