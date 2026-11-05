export const validationErrorSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'GoRest Validation Error',
    type: 'array',
    items: {
        type: 'object',
        properties: {
            field: { type: 'string' },
            message: { type: 'string' }
        },
        required: ['field', 'message']
    }
};
