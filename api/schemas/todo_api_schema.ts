export const todoSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GoRest Todo',
    type: 'object',
    properties: {
        id: { type: 'integer' },
        user_id: { type: 'integer' },
        title: { type: 'string' },
        due_on: { type: ['string', 'null'], format: 'date-time' },
        status: { type: 'string', enum: ['pending', 'completed'] }
    },
    required: ['id', 'user_id', 'title', 'due_on', 'status'],
    additionalProperties: false
};
