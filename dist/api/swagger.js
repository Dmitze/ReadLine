"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Warrior\'s Library Bot API',
            description: 'Telegram bot API for military library management',
            version: '1.0.0',
            contact: {
                name: 'Warrior\'s Library Support',
                email: 'support@warriorslibrary.local',
            },
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development Server',
            },
            {
                url: 'http://api.warriorslibrary.local',
                description: 'Production Server',
            },
        ],
        components: {
            schemas: {
                User: {
                    type: 'object',
                    required: ['id', 'telegram_id'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'User ID',
                        },
                        telegram_id: {
                            type: 'integer',
                            description: 'Telegram user ID',
                        },
                        username: {
                            type: 'string',
                            description: 'Telegram username',
                        },
                        first_name: {
                            type: 'string',
                            description: 'User first name',
                        },
                        last_name: {
                            type: 'string',
                            description: 'User last name',
                        },
                        email: {
                            type: 'string',
                            format: 'email',
                            description: 'Email address',
                        },
                        language_code: {
                            type: 'string',
                            default: 'uk',
                            description: 'Language code',
                        },
                        is_admin: {
                            type: 'boolean',
                            description: 'Admin status',
                        },
                        is_blocked: {
                            type: 'boolean',
                            description: 'Block status',
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Book: {
                    type: 'object',
                    required: ['title', 'author'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'Book ID',
                        },
                        title: {
                            type: 'string',
                            description: 'Book title',
                        },
                        author: {
                            type: 'string',
                            description: 'Book author',
                        },
                        description: {
                            type: 'string',
                            description: 'Book description',
                        },
                        genre: {
                            type: 'string',
                            description: 'Genre',
                        },
                        year: {
                            type: 'integer',
                            description: 'Publication year',
                        },
                        isbn: {
                            type: 'string',
                            description: 'ISBN',
                        },
                        pages: {
                            type: 'integer',
                            description: 'Number of pages',
                        },
                        rating: {
                            type: 'number',
                            format: 'float',
                            description: 'Average rating',
                        },
                        cover_url: {
                            type: 'string',
                            format: 'uri',
                            description: 'Cover image URL',
                        },
                        file_url: {
                            type: 'string',
                            format: 'uri',
                            description: 'Book file URL',
                        },
                        is_published: {
                            type: 'boolean',
                            description: 'Publication status',
                        },
                        views_count: {
                            type: 'integer',
                            description: 'View count',
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Review: {
                    type: 'object',
                    required: ['book_id', 'user_id', 'rating'],
                    properties: {
                        id: {
                            type: 'integer',
                        },
                        book_id: {
                            type: 'integer',
                        },
                        user_id: {
                            type: 'integer',
                        },
                        rating: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 5,
                        },
                        comment: {
                            type: 'string',
                        },
                        is_published: {
                            type: 'boolean',
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                        },
                    },
                },
                Error: {
                    type: 'object',
                    required: ['code', 'message'],
                    properties: {
                        code: {
                            type: 'string',
                            description: 'Error code',
                        },
                        message: {
                            type: 'string',
                            description: 'Error message',
                        },
                        details: {
                            type: 'object',
                            description: 'Additional error details',
                        },
                    },
                },
                JobStatus: {
                    type: 'object',
                    properties: {
                        jobId: {
                            type: 'string',
                            description: 'Job ID',
                        },
                        status: {
                            type: 'string',
                            enum: ['pending', 'active', 'completed', 'failed'],
                            description: 'Job status',
                        },
                        progress: {
                            type: 'number',
                            description: 'Job progress (0-100)',
                        },
                        data: {
                            type: 'object',
                            description: 'Job result data',
                        },
                        error: {
                            type: 'string',
                            description: 'Error message if failed',
                        },
                    },
                },
            },
            securitySchemes: {
                BotToken: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-Bot-Token',
                    description: 'Bot authentication token',
                },
                AdminAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Admin JWT token',
                },
            },
        },
        paths: {
            '/api/books': {
                get: {
                    tags: ['Books'],
                    summary: 'Get all books',
                    parameters: [
                        {
                            name: 'genre',
                            in: 'query',
                            schema: { type: 'string' },
                        },
                        {
                            name: 'page',
                            in: 'query',
                            schema: { type: 'integer', default: 1 },
                        },
                        {
                            name: 'limit',
                            in: 'query',
                            schema: { type: 'integer', default: 20 },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'List of books',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Book' },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Books'],
                    summary: 'Create a new book',
                    security: [{ AdminAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Book' },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Book created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Book' },
                                },
                            },
                        },
                        '400': {
                            description: 'Invalid input',
                        },
                    },
                },
            },
            '/api/books/{id}': {
                get: {
                    tags: ['Books'],
                    summary: 'Get book by ID',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'integer' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Book details',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Book' },
                                },
                            },
                        },
                        '404': {
                            description: 'Book not found',
                        },
                    },
                },
                put: {
                    tags: ['Books'],
                    summary: 'Update book',
                    security: [{ AdminAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'integer' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Book' },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Book updated',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Book' },
                                },
                            },
                        },
                    },
                },
                delete: {
                    tags: ['Books'],
                    summary: 'Delete book',
                    security: [{ AdminAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'integer' },
                        },
                    ],
                    responses: {
                        '204': {
                            description: 'Book deleted',
                        },
                    },
                },
            },
            '/api/books/{id}/reviews': {
                get: {
                    tags: ['Reviews'],
                    summary: 'Get book reviews',
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'integer' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'List of reviews',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'array',
                                        items: { $ref: '#/components/schemas/Review' },
                                    },
                                },
                            },
                        },
                    },
                },
                post: {
                    tags: ['Reviews'],
                    summary: 'Create review',
                    security: [{ BotToken: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: { type: 'integer' },
                        },
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Review' },
                            },
                        },
                    },
                    responses: {
                        '201': {
                            description: 'Review created',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/Review' },
                                },
                            },
                        },
                    },
                },
            },
            '/api/jobs/{jobId}': {
                get: {
                    tags: ['Jobs'],
                    summary: 'Get job status',
                    parameters: [
                        {
                            name: 'jobId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Job status',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/JobStatus' },
                                },
                            },
                        },
                        '404': {
                            description: 'Job not found',
                        },
                    },
                },
            },
            '/api/jobs/{jobId}/retry': {
                post: {
                    tags: ['Jobs'],
                    summary: 'Retry failed job',
                    security: [{ AdminAuth: [] }],
                    parameters: [
                        {
                            name: 'jobId',
                            in: 'path',
                            required: true,
                            schema: { type: 'string' },
                        },
                    ],
                    responses: {
                        '200': {
                            description: 'Job retried',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/JobStatus' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/**/*.ts'],
};
exports.default = swaggerOptions;
//# sourceMappingURL=swagger.js.map