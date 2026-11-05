/**
 * GoRest v2 – Comments API Tests (prompt scenarios 34–40)
 * Traces: A-CMT-01 .. A-CMT-10
 *
 * A user and a post are created in beforeAll (per worker) and deleted in afterAll (post, then user).
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

test.describe('Comments API Tests', () => {

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

    /** Creates a comment on the shared post and returns the response body */
    const createComment = async (request: APIRequestContext) => {
        const response = await request.post(url(Routes.CREATE_POST_COMMENT, { postId }), {
            headers: authHeaders, data: RandomDataUtil.generateCommentPayload()
        });
        expect(response.status(), 'Create comment (setup) status').toBe(201);
        return await response.json();
    };

    let userId: number;
    let postId: number;

    test.beforeAll(async ({ request }) => {
        const userResponse = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateUserPayload() });
        expect(userResponse.status(), 'Create user (setup) status').toBe(201);
        userId = (await userResponse.json()).id;

        const postResponse = await request.post(url(Routes.CREATE_USER_POST, { userId }), {
            headers: authHeaders, data: RandomDataUtil.generatePostPayload()
        });
        expect(postResponse.status(), 'Create post (setup) status').toBe(201);
        postId = (await postResponse.json()).id;
    });

    test.afterAll(async ({ request }) => {
        if (postId) {
            await cleanup(request, url(Routes.DELETE_POST, { id: postId }));
        }
        if (userId) {
            await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    // ---------------------------------------------------------
    // POST / GET
    // ---------------------------------------------------------

    test('POST - Create Post Comment @master @sanity @api', async ({ request }) => {
        const payload = RandomDataUtil.generateCommentPayload();

        const response = await request.post(url(Routes.CREATE_POST_COMMENT, { postId }), { headers: authHeaders, data: payload });
        expect(response.status(), 'Create comment status').toBe(201);
        const comment = await response.json();

        try {
            expect(comment.post_id, 'post_id').toBe(postId);
            expect(comment, 'Response echoes the payload').toMatchObject(payload);
        } finally {
            await cleanup(request, url(Routes.DELETE_COMMENT, { id: comment.id }));
        }
    });

    test('GET - Post Comments and Comment by ID @master @sanity @api', async ({ request }) => {
        const listResponse = await request.get(url(Routes.GET_ALL_COMMENTS), { headers: authHeaders });
        expect(listResponse.status(), 'List status').toBe(200);
        const comments = await listResponse.json();
        expect(comments.length, 'Non-empty list').toBeGreaterThan(0);
        for (const item of comments) {
            expect(item, `Fields of comment ${item.id}`).toEqual(expect.objectContaining({
                id: expect.any(Number), post_id: expect.any(Number), name: expect.any(String),
                email: expect.any(String), body: expect.any(String)
            }));
        }

        const comment = await createComment(request);
        try {
            const postCommentsResponse = await request.get(url(Routes.GET_POST_COMMENTS, { postId }), { headers: authHeaders });
            expect(postCommentsResponse.status(), 'Post comments status').toBe(200);
            const postComments = await postCommentsResponse.json();
            for (const item of postComments) {
                expect(item.post_id, `post_id of comment ${item.id}`).toBe(postId);
            }
            expect(postComments.map((item: { id: number }) => item.id), 'List contains the comment').toContain(comment.id);

            const response = await request.get(url(Routes.GET_COMMENT_BY_ID, { id: comment.id }), { headers: authHeaders });
            expect(response.status(), 'Get comment status').toBe(200);
            expect(await response.json(), 'Comment equals the created comment').toEqual(comment);
        } finally {
            await cleanup(request, url(Routes.DELETE_COMMENT, { id: comment.id }));
        }
    });

    // ---------------------------------------------------------
    // PUT / DELETE
    // ---------------------------------------------------------

    test('PUT - Update Comment @master @regression @api', async ({ request }) => {
        const comment = await createComment(request);
        const updatePayload = RandomDataUtil.generateCommentPayload();

        try {
            const response = await request.put(url(Routes.UPDATE_COMMENT, { id: comment.id }), { headers: authHeaders, data: updatePayload });
            expect(response.status(), 'Update comment status').toBe(200);
            const updated = await response.json();
            expect(updated.id, 'id unchanged').toBe(comment.id);
            expect(updated.post_id, 'post_id unchanged').toBe(comment.post_id);
            expect(updated, 'Fields updated').toMatchObject(updatePayload);
        } finally {
            await cleanup(request, url(Routes.DELETE_COMMENT, { id: comment.id }));
        }
    });

    test('DELETE - Delete Comment @master @regression @api', async ({ request }) => {
        const comment = await createComment(request);

        const response = await request.delete(url(Routes.DELETE_COMMENT, { id: comment.id }), { headers: authHeaders });
        expect(response.status(), 'Delete comment status').toBe(204);
        expect(await response.text(), 'Empty body').toBe('');

        const getResponse = await request.get(url(Routes.GET_COMMENT_BY_ID, { id: comment.id }), { headers: authHeaders });
        expect(getResponse.status(), 'Get deleted comment status').toBe(404);
        expect((await getResponse.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    // ---------------------------------------------------------
    // Negative
    // ---------------------------------------------------------

    test('POST - Create Comment with Invalid Data @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_POST_COMMENT, { postId }), {
            headers: authHeaders, data: { name: '', email: RandomDataUtil.generateInvalidUserPayload().email, body: '' }
        });

        expect(response.status(), 'Status').toBe(422);
        const errors = await response.json();
        const validate = ajv.compile(validationErrorSchema);
        expect(validate(errors), ajv.errorsText(validate.errors)).toBeTruthy();
        expect(errorFor(errors, 'name'), 'name error').toBe(testData.messages.blank);
        expect(errorFor(errors, 'body'), 'body error').toBe(testData.messages.blank);
        expect(errorFor(errors, 'email'), 'email error').toBe(testData.messages.invalidEmail);
    });

    test('GET - Non-Existing Comment @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_COMMENT_BY_ID, { id: testData.nonExistingId }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(404);
        expect((await response.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    test('POST / PUT / DELETE - Comment Writes Without or With Invalid Token @master @regression @api', async ({ request }) => {
        const comment = await createComment(request);

        try {
            const createResponse = await request.post(url(Routes.CREATE_POST_COMMENT, { postId }), {
                headers: noTokenHeaders, data: RandomDataUtil.generateCommentPayload()
            });
            expect(createResponse.status(), 'POST without token status').toBe(401);
            expect((await createResponse.json()).message, 'POST without token message').toBe(testData.messages.authenticationFailed);

            const updateResponse = await request.put(url(Routes.UPDATE_COMMENT, { id: comment.id }), {
                headers: invalidTokenHeaders, data: RandomDataUtil.generateCommentPayload()
            });
            expect(updateResponse.status(), 'PUT invalid token status').toBe(401);
            expect((await updateResponse.json()).message, 'PUT invalid token message').toBe(testData.messages.invalidToken);

            const deleteResponse = await request.delete(url(Routes.DELETE_COMMENT, { id: comment.id }), { headers: invalidTokenHeaders });
            expect(deleteResponse.status(), 'DELETE invalid token status').toBe(401);
            expect((await deleteResponse.json()).message, 'DELETE invalid token message').toBe(testData.messages.invalidToken);
        } finally {
            await cleanup(request, url(Routes.DELETE_COMMENT, { id: comment.id }));
        }
    });
});
