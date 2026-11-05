export const commentSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GoRest Comment',
    type: 'object',
    properties: {
        id: { type: 'integer' },
        post_id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        body: { type: 'string' }
    },
    required: ['id', 'post_id', 'name', 'email', 'body'],
    additionalProperties: false
};
