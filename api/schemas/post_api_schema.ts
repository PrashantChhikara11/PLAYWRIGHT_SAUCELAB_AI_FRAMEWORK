export const postSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GoRest Post',
    type: 'object',
    properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        title: { type: 'string' },
        body: { type: 'string' }
    },
    required: ['id', 'user_id', 'title', 'body'],
    additionalProperties: false
};
