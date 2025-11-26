declare const swaggerOptions: {
    definition: {
        openapi: string;
        info: {
            title: string;
            description: string;
            version: string;
            contact: {
                name: string;
                email: string;
            };
        };
        servers: {
            url: string;
            description: string;
        }[];
        components: {
            schemas: {
                User: {
                    type: string;
                    required: string[];
                    properties: {
                        id: {
                            type: string;
                            description: string;
                        };
                        telegram_id: {
                            type: string;
                            description: string;
                        };
                        username: {
                            type: string;
                            description: string;
                        };
                        first_name: {
                            type: string;
                            description: string;
                        };
                        last_name: {
                            type: string;
                            description: string;
                        };
                        email: {
                            type: string;
                            format: string;
                            description: string;
                        };
                        language_code: {
                            type: string;
                            default: string;
                            description: string;
                        };
                        is_admin: {
                            type: string;
                            description: string;
                        };
                        is_blocked: {
                            type: string;
                            description: string;
                        };
                        created_at: {
                            type: string;
                            format: string;
                        };
                        updated_at: {
                            type: string;
                            format: string;
                        };
                    };
                };
                Book: {
                    type: string;
                    required: string[];
                    properties: {
                        id: {
                            type: string;
                            description: string;
                        };
                        title: {
                            type: string;
                            description: string;
                        };
                        author: {
                            type: string;
                            description: string;
                        };
                        description: {
                            type: string;
                            description: string;
                        };
                        genre: {
                            type: string;
                            description: string;
                        };
                        year: {
                            type: string;
                            description: string;
                        };
                        isbn: {
                            type: string;
                            description: string;
                        };
                        pages: {
                            type: string;
                            description: string;
                        };
                        rating: {
                            type: string;
                            format: string;
                            description: string;
                        };
                        cover_url: {
                            type: string;
                            format: string;
                            description: string;
                        };
                        file_url: {
                            type: string;
                            format: string;
                            description: string;
                        };
                        is_published: {
                            type: string;
                            description: string;
                        };
                        views_count: {
                            type: string;
                            description: string;
                        };
                        created_at: {
                            type: string;
                            format: string;
                        };
                        updated_at: {
                            type: string;
                            format: string;
                        };
                    };
                };
                Review: {
                    type: string;
                    required: string[];
                    properties: {
                        id: {
                            type: string;
                        };
                        book_id: {
                            type: string;
                        };
                        user_id: {
                            type: string;
                        };
                        rating: {
                            type: string;
                            minimum: number;
                            maximum: number;
                        };
                        comment: {
                            type: string;
                        };
                        is_published: {
                            type: string;
                        };
                        created_at: {
                            type: string;
                            format: string;
                        };
                        updated_at: {
                            type: string;
                            format: string;
                        };
                    };
                };
                Error: {
                    type: string;
                    required: string[];
                    properties: {
                        code: {
                            type: string;
                            description: string;
                        };
                        message: {
                            type: string;
                            description: string;
                        };
                        details: {
                            type: string;
                            description: string;
                        };
                    };
                };
                JobStatus: {
                    type: string;
                    properties: {
                        jobId: {
                            type: string;
                            description: string;
                        };
                        status: {
                            type: string;
                            enum: string[];
                            description: string;
                        };
                        progress: {
                            type: string;
                            description: string;
                        };
                        data: {
                            type: string;
                            description: string;
                        };
                        error: {
                            type: string;
                            description: string;
                        };
                    };
                };
            };
            securitySchemes: {
                BotToken: {
                    type: string;
                    in: string;
                    name: string;
                    description: string;
                };
                AdminAuth: {
                    type: string;
                    scheme: string;
                    bearerFormat: string;
                    description: string;
                };
            };
        };
        paths: {
            '/api/books': {
                get: {
                    tags: string[];
                    summary: string;
                    parameters: ({
                        name: string;
                        in: string;
                        schema: {
                            type: string;
                            default?: undefined;
                        };
                    } | {
                        name: string;
                        in: string;
                        schema: {
                            type: string;
                            default: number;
                        };
                    })[];
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        type: string;
                                        items: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                post: {
                    tags: string[];
                    summary: string;
                    security: {
                        AdminAuth: any[];
                    }[];
                    requestBody: {
                        required: boolean;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    responses: {
                        '201': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        '400': {
                            description: string;
                        };
                    };
                };
            };
            '/api/books/{id}': {
                get: {
                    tags: string[];
                    summary: string;
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        '404': {
                            description: string;
                        };
                    };
                };
                put: {
                    tags: string[];
                    summary: string;
                    security: {
                        AdminAuth: any[];
                    }[];
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    requestBody: {
                        required: boolean;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
                delete: {
                    tags: string[];
                    summary: string;
                    security: {
                        AdminAuth: any[];
                    }[];
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    responses: {
                        '204': {
                            description: string;
                        };
                    };
                };
            };
            '/api/books/{id}/reviews': {
                get: {
                    tags: string[];
                    summary: string;
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        type: string;
                                        items: {
                                            $ref: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
                post: {
                    tags: string[];
                    summary: string;
                    security: {
                        BotToken: any[];
                    }[];
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    requestBody: {
                        required: boolean;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    responses: {
                        '201': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            '/api/jobs/{jobId}': {
                get: {
                    tags: string[];
                    summary: string;
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                        '404': {
                            description: string;
                        };
                    };
                };
            };
            '/api/jobs/{jobId}/retry': {
                post: {
                    tags: string[];
                    summary: string;
                    security: {
                        AdminAuth: any[];
                    }[];
                    parameters: {
                        name: string;
                        in: string;
                        required: boolean;
                        schema: {
                            type: string;
                        };
                    }[];
                    responses: {
                        '200': {
                            description: string;
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
    apis: string[];
};
export default swaggerOptions;
//# sourceMappingURL=swagger.d.ts.map