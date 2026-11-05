/**
 * GoRest v2 – End-to-End API Workflows (prompt scenarios 53–56)
 * Traces: A-E2E-01 .. A-E2E-04
 *
 * Each workflow chains its steps on purpose inside one test; every created resource is
 * cleaned up in `finally` (children before parents).
 *
 * Tags: @master @end-to-end @api
 */

import { test, expect, APIRequestContext } from '@playwright/test';
import dotenv from 'dotenv';
import { Routes } from '../../api/endpoints/routes';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import testData from '../../testdata/api/gorest_testdata.json';

dotenv.config();

test.describe('End-to-End API Workflows', () => {

    // ---------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------

    const authHeaders = Helper.getAuthHeaders();

    /** Builds a full URL: Routes.BASE_URL + route with placeholders replaced */
    const url = (route: string, params: Record<string, string | number> = {}): string =>
        Routes.BASE_URL + Helper.buildUrl(route, params);

    /** Deletes a resource, ignoring 404 (already deleted) */
    const cleanup = async (request: APIRequestContext, resourceUrl: string): Promise<void> => {
        const response = await request.delete(resourceUrl, { headers: authHeaders });
        expect([204, 404], `Cleanup ${resourceUrl}`).toContain(response.status());
    };

    /** Verifies a resource returns 404 + "Resource not found" */
    const expectNotFound = async (request: APIRequestContext, resourceUrl: string, label: string): Promise<void> => {
        const response = await request.get(resourceUrl, { headers: authHeaders });
        expect(response.status(), `${label} status after delete`).toBe(404);
        expect((await response.json()).message, `${label} message after delete`).toBe(testData.messages.notFound);
    };

    // ---------------------------------------------------------
    // Workflows
    // ---------------------------------------------------------

    test('E2E - User CRUD Workflow @master @end-to-end @api', async ({ request }) => {
        let userId: number | undefined;

        try {
            const created = await test.step('1) Create user', async () => {
                const payload = RandomDataUtil.generateUserPayload();
                const response = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: payload });
                expect(response.status(), 'Create status').toBe(201);
                const body = await response.json();
                expect(body, 'Create response echoes payload').toMatchObject(payload);
                return body;
            });
            userId = created.id;
            const id = created.id as number;

            await test.step('2) Get user', async () => {
                const response = await request.get(url(Routes.GET_USER_BY_ID, { id }), { headers: authHeaders });
                expect(response.status(), 'Get status').toBe(200);
                expect(await response.json(), 'Fields match').toEqual(created);
            });

            const updated = await test.step('3) Update user (PUT)', async () => {
                const payload = RandomDataUtil.generateUserUpdatePayload();
                const response = await request.put(url(Routes.UPDATE_USER, { id }), { headers: authHeaders, data: payload });
                expect(response.status(), 'PUT status').toBe(200);
                const body = await response.json();
                expect(body, 'PUT response').toMatchObject({ id, ...payload });
                return body;
            });

            await test.step('4) Patch user status', async () => {
                const newStatus = testData.validUserStatuses.find((status) => status !== updated.status) as string;
                const response = await request.patch(url(Routes.PATCH_USER, { id }), { headers: authHeaders, data: { status: newStatus } });
                expect(response.status(), 'PATCH status').toBe(200);
                expect(await response.json(), 'Only status changed').toEqual({ ...updated, status: newStatus });
            });

            await test.step('5) Delete user and verify 404', async () => {
                const response = await request.delete(url(Routes.DELETE_USER, { id }), { headers: authHeaders });
                expect(response.status(), 'Delete status').toBe(204);
                await expectNotFound(request, url(Routes.GET_USER_BY_ID, { id }), 'User');
            });
        } finally {
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('E2E - User → Post → Comment Chain @master @end-to-end @api', async ({ request }) => {
        let userId: number | undefined;
        let postId: number | undefined;
        let commentId: number | undefined;

        try {
            await test.step('1) Create user, post and comment', async () => {
                const userResponse = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateUserPayload() });
                expect(userResponse.status(), 'Create user status').toBe(201);
                const user = await userResponse.json();
                userId = user.id;

                const postResponse = await request.post(url(Routes.CREATE_USER_POST, { userId: user.id }), {
                    headers: authHeaders, data: RandomDataUtil.generatePostPayload()
                });
                expect(postResponse.status(), 'Create post status').toBe(201);
                const post = await postResponse.json();
                postId = post.id;

                const commentResponse = await request.post(url(Routes.CREATE_POST_COMMENT, { postId: post.id }), {
                    headers: authHeaders, data: RandomDataUtil.generateCommentPayload()
                });
                expect(commentResponse.status(), 'Create comment status').toBe(201);
                const comment = await commentResponse.json();
                commentId = comment.id;

                expect(post.user_id, 'post.user_id === user.id').toBe(user.id);
                expect(comment.post_id, 'comment.post_id === post.id').toBe(post.id);
            });

            await test.step('2) Verify nested lists', async () => {
                const userPosts = await request.get(url(Routes.GET_USER_POSTS, { userId: userId as number }), { headers: authHeaders });
                expect(userPosts.status(), 'User posts status').toBe(200);
                expect((await userPosts.json()).map((p: { id: number }) => p.id), 'User posts contain the post').toContain(postId);

                const postComments = await request.get(url(Routes.GET_POST_COMMENTS, { postId: postId as number }), { headers: authHeaders });
                expect(postComments.status(), 'Post comments status').toBe(200);
                expect((await postComments.json()).map((c: { id: number }) => c.id), 'Post comments contain the comment').toContain(commentId);
            });

            await test.step('3) Delete comment → post → user and verify 404', async () => {
                const steps = [
                    { label: 'Comment', deleteRoute: Routes.DELETE_COMMENT, getRoute: Routes.GET_COMMENT_BY_ID, id: commentId as number },
                    { label: 'Post', deleteRoute: Routes.DELETE_POST, getRoute: Routes.GET_POST_BY_ID, id: postId as number },
                    { label: 'User', deleteRoute: Routes.DELETE_USER, getRoute: Routes.GET_USER_BY_ID, id: userId as number }
                ];
                for (const { label, deleteRoute, id } of steps) {
                    const response = await request.delete(url(deleteRoute, { id }), { headers: authHeaders });
                    expect(response.status(), `Delete ${label} status`).toBe(204);
                }
                for (const { label, getRoute, id } of steps) {
                    await expectNotFound(request, url(getRoute, { id }), label);
                }
            });
        } finally {
            if (commentId) await cleanup(request, url(Routes.DELETE_COMMENT, { id: commentId }));
            if (postId) await cleanup(request, url(Routes.DELETE_POST, { id: postId }));
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('E2E - User → Todo Workflow @master @end-to-end @api', async ({ request }) => {
        const [pendingStatus, completedStatus] = testData.validTodoStatuses;
        let userId: number | undefined;
        let todoId: number | undefined;

        try {
            await test.step('1) Create user and pending todo', async () => {
                const userResponse = await request.post(url(Routes.CREATE_USER), { headers: authHeaders, data: RandomDataUtil.generateUserPayload() });
                expect(userResponse.status(), 'Create user status').toBe(201);
                userId = (await userResponse.json()).id;

                const todoResponse = await request.post(url(Routes.CREATE_USER_TODO, { userId: userId as number }), {
                    headers: authHeaders, data: { ...RandomDataUtil.generateTodoPayload(), status: pendingStatus }
                });
                expect(todoResponse.status(), 'Create todo status').toBe(201);
                const todo = await todoResponse.json();
                todoId = todo.id;
                expect(todo.status, 'Initial status').toBe(pendingStatus);
            });

            await test.step('2) Mark todo completed and verify', async () => {
                const putResponse = await request.put(url(Routes.UPDATE_TODO, { id: todoId as number }), { headers: authHeaders, data: { status: completedStatus } });
                expect(putResponse.status(), 'PUT status').toBe(200);

                const getResponse = await request.get(url(Routes.GET_TODO_BY_ID, { id: todoId as number }), { headers: authHeaders });
                expect(getResponse.status(), 'GET status').toBe(200);
                expect((await getResponse.json()).status, 'Status after update').toBe(completedStatus);

                const userTodos = await request.get(url(Routes.GET_USER_TODOS, { userId: userId as number }), { headers: authHeaders });
                expect(userTodos.status(), 'User todos status').toBe(200);
                expect((await userTodos.json()).map((t: { id: number }) => t.id), 'User todos contain the todo').toContain(todoId);
            });

            await test.step('3) Delete todo → user and verify 404', async () => {
                const deleteTodo = await request.delete(url(Routes.DELETE_TODO, { id: todoId as number }), { headers: authHeaders });
                expect(deleteTodo.status(), 'Delete todo status').toBe(204);
                const deleteUser = await request.delete(url(Routes.DELETE_USER, { id: userId as number }), { headers: authHeaders });
                expect(deleteUser.status(), 'Delete user status').toBe(204);
                await expectNotFound(request, url(Routes.GET_TODO_BY_ID, { id: todoId as number }), 'Todo');
            });
        } finally {
            if (todoId) await cleanup(request, url(Routes.DELETE_TODO, { id: todoId }));
            if (userId) await cleanup(request, url(Routes.DELETE_USER, { id: userId }));
        }
    });

    test('E2E - Public Comment → Post Chain (read-only) @master @end-to-end @api', async ({ request }) => {
        const comment = await test.step('1) Get the first public comment', async () => {
            const response = await request.get(url(Routes.GET_ALL_COMMENTS), { headers: authHeaders });
            expect(response.status(), 'Comments status').toBe(200);
            const comments = await response.json();
            expect(comments.length, 'Non-empty list').toBeGreaterThan(0);
            return comments[0];
        });

        await test.step('2) Get its post', async () => {
            const response = await request.get(url(Routes.GET_POST_BY_ID, { id: comment.post_id }), { headers: authHeaders });
            expect(response.status(), 'Post status').toBe(200);
            expect((await response.json()).id, 'Post id matches comment.post_id').toBe(comment.post_id);
        });

        await test.step('3) Verify the post comments contain the comment', async () => {
            const response = await request.get(url(Routes.GET_POST_COMMENTS, { postId: comment.post_id }), { headers: authHeaders });
            expect(response.status(), 'Post comments status').toBe(200);
            expect((await response.json()).map((c: { id: number }) => c.id), 'Contains the comment').toContain(comment.id);
        });
    });
});
