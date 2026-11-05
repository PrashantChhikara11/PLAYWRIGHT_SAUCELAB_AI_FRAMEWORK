/**
 * GoRest v2 – Posts API Tests (prompt scenarios 24–33)
 * Traces: A-PST-01 .. A-PST-12
 *
 * A user is created in beforeAll (per worker) and deleted in afterAll.
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

test.describe('Posts API Tests', () => {

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

    /** Deletes a resource, ignoring 404 (already deleted) */
    const cleanup = async (request: APIRequestContext, resourceUrl: string): Promise<void> => {
        const response = await request.delete(resourceUrl, { headers: authHeaders });
        expect([204, 404], `Cleanup ${resourceUrl}`).toContain(response.status());
    };

    /** Creates a post for the shared user and returns the response body */
    const createPost = async (request: APIRequestContext) => {
        const response = await request.post(url(Routes.CREATE_USER_POST, { userId }), {
            headers: authHeaders, data: RandomDataUtil.generatePostPayload()
        });
        expect(response.status(), 'Create post (setup) status').toBe(201);
        return await response.json();
    };

    let userId: number;

    test.beforeAll(async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateUserPayload() });
        expect(response.status(), 'Create user (setup) status').toBe(201);
        userId = (await response.json()).id;
    });

    test.afterAll(async ({ request }) => {
        if (userId) {
            await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    // ---------------------------------------------------------
    // POST / GET
    // ---------------------------------------------------------

    test('POST - Create User Post @master @sanity @api', async ({ request }) => {
        const payload = RandomDataUtil.generatePostPayload();

        const response = await request.post(url(Routes.CREATE_USER_POST, { userId }), { headers: authHeaders, data: payload });
        expect(response.status(), 'Create post status').toBe(201);
        const post = await response.json();

        try {
            expect(post.user_id, 'user_id').toBe(userId);
            expect(post, 'Response echoes the payload').toMatchObject(payload);
        } finally {
            await cleanup(request, url(Routes.DELETE_POST, { id: post.id }));
        }
    });

    test('GET - User Posts @master @regression @api', async ({ request }) => {
        const post = await createPost(request);

        try {
            const response = await request.get(url(Routes.GET_USER_POSTS, { userId }), { headers: authHeaders });
            expect(response.status(), 'Status').toBe(200);
            const posts = await response.json();
            for (const item of posts) {
                expect(item.user_id, `user_id of post ${item.id}`).toBe(userId);
            }
            expect(posts.map((item: { id: number }) => item.id), 'List contains the created post').toContain(post.id);
        } finally {
            await cleanup(request, url(Routes.DELETE_POST, { id: post.id }));
        }
    });

    test('GET - All Posts and Post by ID @master @sanity @api', async ({ request }) => {
        const listResponse = await request.get(url(Routes.GET_ALL_POSTS), { headers: authHeaders });
        expect(listResponse.status(), 'List status').toBe(200);
        const posts = await listResponse.json();
        expect(posts.length, 'Non-empty list').toBeGreaterThan(0);
        for (const item of posts) {
            expect(item, `Fields of post ${item.id}`).toEqual(expect.objectContaining({
                id: expect.any(Number), user_id: expect.any(Number), title: expect.any(String), body: expect.any(String)
            }));
        }

        const post = await createPost(request);
        try {
            const response = await request.get(url(Routes.GET_POST_BY_ID, { id: post.id }), { headers: authHeaders });
            expect(response.status(), 'Get post status').toBe(200);
            expect(await response.json(), 'Post equals the created post').toEqual(post);
        } finally {
            await cleanup(request, url(Routes.DELETE_POST, { id: post.id }));
        }
    });

    // ---------------------------------------------------------
    // PUT / DELETE
    // ---------------------------------------------------------

    test('PUT - Update Post @master @regression @api', async ({ request }) => {
        const post = await createPost(request);
        const updatePayload = RandomDataUtil.generatePostPayload();

        try {
            const response = await request.put(url(Routes.UPDATE_POST, { id: post.id }), { headers: authHeaders, data: updatePayload });
            expect(response.status(), 'Update post status').toBe(200);
            const updated = await response.json();
            expect(updated.id, 'id unchanged').toBe(post.id);
            expect(updated.user_id, 'user_id unchanged').toBe(post.user_id);
            expect(updated, 'title/body updated').toMatchObject(updatePayload);
        } finally {
            await cleanup(request, url(Routes.DELETE_POST, { id: post.id }));
        }
    });

    test('DELETE - Delete Post @master @regression @api', async ({ request }) => {
        const post = await createPost(request);

        const response = await request.delete(url(Routes.DELETE_POST, { id: post.id }), { headers: authHeaders });
        expect(response.status(), 'Delete post status').toBe(204);
        expect(await response.text(), 'Empty body').toBe('');

        const getResponse = await request.get(url(Routes.GET_POST_BY_ID, { id: post.id }), { headers: authHeaders });
        expect(getResponse.status(), 'Get deleted post status').toBe(404);
        expect((await getResponse.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    // ---------------------------------------------------------
    // Negative
    // ---------------------------------------------------------

    test('POST - Create Post with Blank Fields @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER_POST, { userId }), { headers: authHeaders, data: { title: '', body: '' } });

        expect(response.status(), 'Status').toBe(422);
        const errors = await response.json();
        const validate = ajv.compile(validationErrorSchema);
        expect(validate(errors), ajv.errorsText(validate.errors)).toBeTruthy();
        expect(errorFor(errors, 'title'), 'title error').toBe(testData.messages.blank);
        expect(errorFor(errors, 'body'), 'body error').toBe(testData.messages.blank);
    });

    test('POST - Create Post for Non-Existing User @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER_POST, { userId: testData.nonExistingId }), {
            headers: authHeaders, data: RandomDataUtil.generatePostPayload()
        });

        expect(response.status(), 'Status').toBe(422);
        expect(errorFor(await response.json(), 'user'), 'user error').toBe(testData.messages.userMustExist);
    });

    test('GET - Nested Posts of a Non-Existing User @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_USER_POSTS, { userId: testData.nonExistingId }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(200);
        expect(await response.json(), 'Empty list').toEqual([]);
    });

    test('GET - Non-Existing Post @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_POST_BY_ID, { id: testData.nonExistingId }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(404);
        expect((await response.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    test('POST / PUT / DELETE - Post Writes Without or With Invalid Token @master @regression @api', async ({ request }) => {
        const post = await createPost(request);

        try {
            const createResponse = await request.post(url(Routes.CREATE_USER_POST, { userId }), {
                headers: noTokenHeaders, data: RandomDataUtil.generatePostPayload()
            });
            expect(createResponse.status(), 'POST without token status').toBe(401);
            expect((await createResponse.json()).message, 'POST without token message').toBe(testData.messages.authenticationFailed);

            const updateResponse = await request.put(url(Routes.UPDATE_POST, { id: post.id }), {
                headers: invalidTokenHeaders, data: RandomDataUtil.generatePostPayload()
            });
            expect(updateResponse.status(), 'PUT invalid token status').toBe(401);
            expect((await updateResponse.json()).message, 'PUT invalid token message').toBe(testData.messages.invalidToken);

            const deleteResponse = await request.delete(url(Routes.DELETE_POST, { id: post.id }), { headers: invalidTokenHeaders });
            expect(deleteResponse.status(), 'DELETE invalid token status').toBe(401);
            expect((await deleteResponse.json()).message, 'DELETE invalid token message').toBe(testData.messages.invalidToken);
        } finally {
            await cleanup(request, url(Routes.DELETE_POST, { id: post.id }));
        }
    });
});
