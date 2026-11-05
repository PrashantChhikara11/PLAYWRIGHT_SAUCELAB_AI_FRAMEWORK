/**
 * GoRest v2 – Schema Validation Tests (prompt scenarios 49–52)
 * Traces: A-SCH-01 .. A-SCH-05, A-TDO-07
 *
 * List items (public data) and responses of freshly created resources are validated with Ajv + ajv-formats.
 * validationErrorSchema is covered in users/posts/comments specs (scenarios 15, 29, 38).
 *
 * Tags: @master @regression @api
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import dotenv from 'dotenv';
import { Routes } from '../../api/endpoints/routes';
import { userSchema } from '../../api/schemas/user_api_schema';
import { postSchema } from '../../api/schemas/post_api_schema';
import { commentSchema } from '../../api/schemas/comment_api_schema';
import { todoSchema } from '../../api/schemas/todo_api_schema';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import testData from '../../testdata/api/gorest_testdata.json';

dotenv.config();

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

test.describe('Schema Validation API Tests', () => {

    // ---------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------

    const authHeaders = Helper.getAuthHeaders();

    /** Builds a full URL: Routes.BASE_URL + route with placeholders replaced */
    const url = (route: string, params: Record<string, string | number> = {}): string =>
        Routes.BASE_URL + Helper.buildUrl(route, params);

    /** Validates data against a schema; the Ajv error text is the assertion message */
    const expectValid = (schema: object, data: unknown, label: string): void => {
        const validate = ajv.compile(schema);
        const isValid = validate(data);
        expect(isValid, `${label}: ${ajv.errorsText(validate.errors)}`).toBeTruthy();
    };

    /** Validates every item of a list endpoint */
    const expectListValid = async (request: APIRequestContext, route: string, schema: object, label: string): Promise<void> => {
        const response = await request.get(url(route), { headers: authHeaders });
        expect(response.status(), `${label} list status`).toBe(200);
        const items = await response.json();
        expect(items.length, `${label} list is not empty`).toBeGreaterThan(0);
        for (const item of items) {
            expectValid(schema, item, `${label} list item ${item.id}`);
        }
    };

    /** POSTs a payload, validates the 201 response and the GET-by-id response; returns the created body */
    const createAndValidate = async (request: APIRequestContext, createUrl: string, payload: object, getRoute: string, schema: object, label: string) => {
        const createResponse = await request.post(createUrl, { headers: authHeaders, data: payload });
        expect(createResponse.status(), `${label} create status`).toBe(201);
        const created = await createResponse.json();
        expectValid(schema, created, `${label} create response`);

        const getResponse = await request.get(url(getRoute, { id: created.id }), { headers: authHeaders });
        expect(getResponse.status(), `${label} get status`).toBe(200);
        expectValid(schema, await getResponse.json(), `${label} get response`);
        return created;
    };

    /** Deletes a resource, ignoring 404 (already deleted) */
    const cleanup = async (request: APIRequestContext, resourceUrl: string): Promise<void> => {
        const response = await request.delete(resourceUrl, { headers: authHeaders });
        expect([204, 404], `Cleanup ${resourceUrl}`).toContain(response.status());
    };

    // ---------------------------------------------------------
    // Schemas
    // ---------------------------------------------------------

    test('Schema - User @master @regression @api', async ({ request }) => {
        await expectListValid(request, Routes.GET_ALL_USERS, userSchema, 'User');

        let userId: number | undefined;
        try {
            const user = await createAndValidate(request, url(Routes.CREATE_USER), RandomDataUtil.generateUserPayload(), Routes.GET_USER_BY_ID, userSchema, 'User');
            userId = user.id;
        } finally {
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('Schema - Post @master @regression @api', async ({ request }) => {
        await expectListValid(request, Routes.GET_ALL_POSTS, postSchema, 'Post');

        let userId: number | undefined;
        let postId: number | undefined;
        try {
            userId = (await createAndValidate(request, url(Routes.CREATE_USER), RandomDataUtil.generateUserPayload(), Routes.GET_USER_BY_ID, userSchema, 'User')).id;
            postId = (await createAndValidate(request, url(Routes.CREATE_USER_POST, { userId: userId as number }), RandomDataUtil.generatePostPayload(), Routes.GET_POST_BY_ID, postSchema, 'Post')).id;
        } finally {
            if (postId) await cleanup(request, url(Routes.DELETE_POST, { id: postId }));
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('Schema - Comment @master @regression @api', async ({ request }) => {
        await expectListValid(request, Routes.GET_ALL_COMMENTS, commentSchema, 'Comment');

        let userId: number | undefined;
        let postId: number | undefined;
        let commentId: number | undefined;
        try {
            userId = (await createAndValidate(request, url(Routes.CREATE_USER), RandomDataUtil.generateUserPayload(), Routes.GET_USER_BY_ID, userSchema, 'User')).id;
            postId = (await createAndValidate(request, url(Routes.CREATE_USER_POST, { userId: userId as number }), RandomDataUtil.generatePostPayload(), Routes.GET_POST_BY_ID, postSchema, 'Post')).id;
            commentId = (await createAndValidate(request, url(Routes.CREATE_POST_COMMENT, { postId: postId as number }), RandomDataUtil.generateCommentPayload(), Routes.GET_COMMENT_BY_ID, commentSchema, 'Comment')).id;
        } finally {
            if (commentId) await cleanup(request, url(Routes.DELETE_COMMENT, { id: commentId }));
            if (postId) await cleanup(request, url(Routes.DELETE_POST, { id: postId }));
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('Schema - Todo @master @regression @api', async ({ request }) => {
        await expectListValid(request, Routes.GET_ALL_TODOS, todoSchema, 'Todo');

        let userId: number | undefined;
        const todoIds: number[] = [];
        try {
            userId = (await createAndValidate(request, url(Routes.CREATE_USER), RandomDataUtil.generateUserPayload(), Routes.GET_USER_BY_ID, userSchema, 'User')).id;
            const todoUrl = url(Routes.CREATE_USER_TODO, { userId: userId as number });

            const withDueDate = await createAndValidate(request, todoUrl, RandomDataUtil.generateTodoPayload(), Routes.GET_TODO_BY_ID, todoSchema, 'Todo with due_on');
            todoIds.push(withDueDate.id);

            const withoutDueDate = await createAndValidate(request, todoUrl,
                { title: RandomDataUtil.getSentence(), status: testData.validTodoStatuses[0] }, Routes.GET_TODO_BY_ID, todoSchema, 'Todo without due_on');
            todoIds.push(withoutDueDate.id);
            expect(withoutDueDate.due_on, 'due_on is null').toBeNull();
        } finally {
            for (const id of todoIds) await cleanup(request, url(Routes.DELETE_TODO, { id }));
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });
});
