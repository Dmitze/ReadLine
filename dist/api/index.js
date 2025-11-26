"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerOptions = exports.createRestAPI = exports.RestAPI = void 0;
var RestAPI_1 = require("./RestAPI");
Object.defineProperty(exports, "RestAPI", { enumerable: true, get: function () { return RestAPI_1.RestAPI; } });
Object.defineProperty(exports, "createRestAPI", { enumerable: true, get: function () { return RestAPI_1.createRestAPI; } });
var swagger_1 = require("./swagger");
Object.defineProperty(exports, "swaggerOptions", { enumerable: true, get: function () { return __importDefault(swagger_1).default; } });
//# sourceMappingURL=index.js.map