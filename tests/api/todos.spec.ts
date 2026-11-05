/**
 * GoRest v2 – Todos API Tests (prompt scenarios 41–48)
 * Traces: A-TDO-01 .. A-TDO-11
 *
 * A user is created in beforeAll (per worker) and deleted in afterAll.
 *
 * Tags: @master @api (+ @sanity / @regression)
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import dotenv from 'dotenv';
import { Routes } from '../../api/endpoints/routes';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import testData from '../../testdata/api/gorest_testdata.json';

dotenv.config();

type FieldError = { field: string; message: string };

test.describe('Todos API Tests', () => {

    // ---------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------

    const authHeaders = Helper.getAuthHeaders();
    const invalidTokenHeaders = { ...authHeaders, Authorization: `Bearer ${testData.invalidToken}` };
    const { Authorization, ...noTokenHeaders } = authHeaders;
    const [pendingStatus, completedStatus] = testData.validTodoStatuses;

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

    /** Creates a todo for the shared user and returns the response body */
    const createTodo = async (request: APIRequestContext, status: string = RandomDataUtil.getTodoStatus()) => {
        const response = await request.post(url(Routes.CREATE_USER_TODO, { userId }), {
            headers: authHeaders, data: { ...RandomDataUtil.generateTodoPayload(), status }
        });
        expect(response.status(), 'Create todo (setup) status').toBe(201);
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

    test('POST - Create User Todo @master @sanity @api', async ({ request }) => {
        const payload = RandomDataUtil.generateTodoPayload();

        const response = await request.post(url(Routes.CREATE_USER_TODO, { userId }), { headers: authHeaders, data: payload });
        expect(response.status(), 'Create todo status').toBe(201);
        const todo = await response.json();

        try {
            expect(todo.user_id, 'user_id').toBe(userId);
            expect(todo.title, 'title').toBe(payload.title);
            expect(todo.status, 'status').toBe(payload.status);
            // GoRest returns the same instant with a +05:30 offset, so compare times, not strings
            expect(new Date(todo.due_on).getTime(), 'due_on (same instant)').toBe(new Date(payload.due_on).getTime());
        } finally {
            await cleanup(request, url(Routes.DELETE_TODO, { id: todo.id }));
        }
    });

    test('POST - Create Todo Without Due Date @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER_TODO, { userId }), {
            headers: authHeaders, data: { title: RandomDataUtil.getSentence(), status: pendingStatus }
        });
        expect(response.status(), 'Create todo status').toBe(201);
        const todo = await response.json();

        try {
            expect(todo.due_on, 'due_on is null').toBeNull();
        } finally {
            await cleanup(request, url(Routes.DELETE_TODO, { id: todo.id }));
        }
    });

    test('GET - User Todos and Todo by ID @master @sanity @api', async ({ request }) => {
        const listResponse = await request.get(url(Routes.GET_ALL_TODOS), { headers: authHeaders });
        expect(listResponse.status(), 'List status').toBe(200);
        const todos = await listResponse.json();
        expect(todos.length, 'Non-empty list').toBeGreaterThan(0);
        for (const item of todos) {
            expect(testData.validTodoStatuses, `Status of todo ${item.id}`).toContain(item.status);
        }

        const todo = await createTodo(request);
        try {
            const userTodosResponse = await request.get(url(Routes.GET_USER_TODOS, { userId }), { headers: authHeaders });
            expect(userTodosResponse.status(), 'User todos status').toBe(200);
            const userTodos = await userTodosResponse.json();
            for (const item of userTodos) {
                expect(item.user_id, `user_id of todo ${item.id}`).toBe(userId);
            }
            expect(userTodos.map((item: { id: number }) => item.id), 'List contains the todo').toContain(todo.id);

            const response = await request.get(url(Routes.GET_TODO_BY_ID, { id: todo.id }), { headers: authHeaders });
            expect(response.status(), 'Get todo status').toBe(200);
            expect(await response.json(), 'Todo equals the created todo').toEqual(todo);
        } finally {
            await cleanup(request, url(Routes.DELETE_TODO, { id: todo.id }));
        }
    });

    // ---------------------------------------------------------
    // PUT / DELETE
    // ---------------------------------------------------------

    test('PUT - Update Todo Status to Completed @master @regression @api', async ({ request }) => {
        const todo = await createTodo(request, pendingStatus);

        try {
            const response = await request.put(url(Routes.UPDATE_TODO, { id: todo.id }), { headers: authHeaders, data: { status: completedStatus } });
            expect(response.status(), 'Update todo status').toBe(200);
            expect((await response.json()).status, 'Status in PUT response').toBe(completedStatus);

            const getResponse = await request.get(url(Routes.GET_TODO_BY_ID, { id: todo.id }), { headers: authHeaders });
            expect(getResponse.status(), 'Get todo status').toBe(200);
            expect((await getResponse.json()).status, 'Status after GET').toBe(completedStatus);
        } finally {
            await cleanup(request, url(Routes.DELETE_TODO, { id: todo.id }));
        }
    });

    test('DELETE - Delete Todo @master @regression @api', async ({ request }) => {
        const todo = await createTodo(request);

        const response = await request.delete(url(Routes.DELETE_TODO, { id: todo.id }), { headers: authHeaders });
        expect(response.status(), 'Delete todo status').toBe(204);
        expect(await response.text(), 'Empty body').toBe('');

        const getResponse = await request.get(url(Routes.GET_TODO_BY_ID, { id: todo.id }), { headers: authHeaders });
        expect(getResponse.status(), 'Get deleted todo status').toBe(404);
        expect((await getResponse.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    // ---------------------------------------------------------
    // Negative
    // ---------------------------------------------------------

    test('POST - Create Todo with Invalid Status @master @regression @api', async ({ request }) => {
        const response = await request.post(url(Routes.CREATE_USER_TODO, { userId }), {
            headers: authHeaders, data: { title: RandomDataUtil.getSentence(), status: testData.invalidStatus }
        });

        expect(response.status(), 'Status').toBe(422);
        expect(errorFor(await response.json(), 'status'), 'status error').toBe(testData.messages.invalidTodoStatus);
    });

    test('GET - Non-Existing Todo @master @regression @api', async ({ request }) => {
        const response = await request.get(url(Routes.GET_TODO_BY_ID, { id: testData.nonExistingId }), { headers: authHeaders });

        expect(response.status(), 'Status').toBe(404);
        expect((await response.json()).message, 'Not found message').toBe(testData.messages.notFound);
    });

    test('POST / PUT / DELETE - Todo Writes Without or With Invalid Token @master @regression @api', async ({ request }) => {
        const todo = await createTodo(request);

        try {
            const createResponse = await request.post(url(Routes.CREATE_USER_TODO, { userId }), {
                headers: noTokenHeaders, data: RandomDataUtil.generateTodoPayload()
            });
            expect(createResponse.status(), 'POST without token status').toBe(401);
            expect((await createResponse.json()).message, 'POST without token message').toBe(testData.messages.authenticationFailed);

            const updateResponse = await request.put(url(Routes.UPDATE_TODO, { id: todo.id }), {
                headers: invalidTokenHeaders, data: { status: completedStatus }
            });
            expect(updateResponse.status(), 'PUT invalid token status').toBe(401);
            expect((await updateResponse.json()).message, 'PUT invalid token message').toBe(testData.messages.invalidToken);

            const deleteResponse = await request.delete(url(Routes.DELETE_TODO, { id: todo.id }), { headers: invalidTokenHeaders });
            expect(deleteResponse.status(), 'DELETE invalid token status').toBe(401);
            expect((await deleteResponse.json()).message, 'DELETE invalid token message').toBe(testData.messages.invalidToken);
        } finally {
            await cleanup(request, url(Routes.DELETE_TODO, { id: todo.id }));
        }
    });
});
