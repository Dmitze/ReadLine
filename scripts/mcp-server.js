"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const server = new index_js_1.Server({
    name: 'warriors-library-project-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'analyze_project_structure',
            description: 'Анализирует структуру проекта Warrior\'s Library и взаимосвязи компонентов',
            inputSchema: {
                type: 'object',
                properties: {
                    component: {
                        type: 'string',
                        description: 'Компонент для анализа (handlers, services, repositories, database)',
                    },
                },
            },
        },
        {
            name: 'check_database_schema',
            description: 'Проверяет схему базы данных SQLite',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'list_migrations',
            description: 'Список всех миграций базы данных',
            inputSchema: {
                type: 'object',
                properties: {},
            },
        },
        {
            name: 'analyze_dependencies',
            description: 'Анализирует зависимости между модулями',
            inputSchema: {
                type: 'object',
                properties: {
                    module: {
                        type: 'string',
                        description: 'Имя модуля для анализа',
                    },
                },
            },
        },
        {
            name: 'get_handler_info',
            description: 'Информация о handlers и их командах',
            inputSchema: {
                type: 'object',
                properties: {
                    handlerType: {
                        type: 'string',
                        enum: ['user', 'admin'],
                        description: 'Тип handler',
                    },
                },
            },
        },
    ],
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    switch (name) {
        case 'analyze_project_structure': {
            const component = args.component || 'all';
            const srcPath = path.join(process.cwd(), 'src', component);
            const files = fs.existsSync(srcPath)
                ? fs.readdirSync(srcPath)
                : ['Component not found'];
            return {
                content: [
                    {
                        type: 'text',
                        text: `Структура компонента ${component}:\n${files.join('\n')}`,
                    },
                ],
            };
        }
        case 'check_database_schema': {
            const scriptsPath = path.join(process.cwd(), 'scripts');
            const scripts = fs.readdirSync(scriptsPath).filter(f => f.endsWith('.js'));
            return {
                content: [
                    {
                        type: 'text',
                        text: `Скрипты миграций БД:\n${scripts.join('\n')}`,
                    },
                ],
            };
        }
        case 'list_migrations': {
            const migrationsFile = path.join(process.cwd(), 'src', 'database', 'migrations.ts');
            const content = fs.existsSync(migrationsFile)
                ? fs.readFileSync(migrationsFile, 'utf-8')
                : 'Файл migrations.ts не найден';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Миграции:\n${content.substring(0, 500)}...`,
                    },
                ],
            };
        }
        case 'get_handler_info': {
            const handlerType = args.handlerType || 'user';
            const handlerPath = path.join(process.cwd(), 'src', 'handlers', `${handlerType}Handlers.ts`);
            if (fs.existsSync(handlerPath)) {
                const content = fs.readFileSync(handlerPath, 'utf-8');
                const commands = content.match(/bot\.(command|action|hears)\(['"]([^'"]+)['"]/g) || [];
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Команды в ${handlerType}Handlers:\n${commands.join('\n')}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: `Handler ${handlerType} не найден`,
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('Warrior\'s Library MCP Server running on stdio');
}
main().catch(console.error);
//# sourceMappingURL=mcp-server.js.map