export const Routes = {

    BASE_URL: 'https://gorest.co.in/public/v2',

    // =========================
    // User Routes
    // =========================
    GET_ALL_USERS: '/users',
    GET_USER_BY_ID: '/users/{id}',
    GET_USERS_PAGINATED: '/users?page={page}&per_page={perPage}',
    GET_USERS_BY_GENDER: '/users?gender={gender}',
    GET_USERS_BY_STATUS: '/users?status={status}',
    CREATE_USER: '/users',
    UPDATE_USER: '/users/{id}',
    PATCH_USER: '/users/{id}',
    DELETE_USER: '/users/{id}',

    // =========================
    // Post Routes
    // =========================
    GET_ALL_POSTS: '/posts',
    GET_POST_BY_ID: '/posts/{id}',
    GET_USER_POSTS: '/users/{userId}/posts',
    CREATE_USER_POST: '/users/{userId}/posts',
    UPDATE_POST: '/posts/{id}',
    DELETE_POST: '/posts/{id}',

    // =========================
    // Comment Routes
    // =========================
    GET_ALL_COMMENTS: '/comments',
    GET_COMMENT_BY_ID: '/comments/{id}',
    GET_POST_COMMENTS: '/posts/{postId}/comments',
    CREATE_POST_COMMENT: '/posts/{postId}/comments',
    UPDATE_COMMENT: '/comments/{id}',
    DELETE_COMMENT: '/comments/{id}',

    // =========================
    // Todo Routes
    // =========================
    GET_ALL_TODOS: '/todos',
    GET_TODO_BY_ID: '/todos/{id}',
    GET_USER_TODOS: '/users/{userId}/todos',
    CREATE_USER_TODO: '/users/{userId}/todos',
    UPDATE_TODO: '/todos/{id}',
    DELETE_TODO: '/todos/{id}'
} as const;
