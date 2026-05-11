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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./configs/instrument");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const express_2 = require("@clerk/express");
const clerk_1 = __importDefault(require("./controllers/clerk"));
const Sentry = __importStar(require("@sentry/node"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const ProjectControllerRoutes_1 = __importDefault(require("./routes/ProjectControllerRoutes"));
const app = (0, express_1.default)();
//Middleware
app.use((0, cors_1.default)());
app.post('/api/clerk', express_1.default.raw({ type: 'application/json' }), clerk_1.default);
app.use(express_1.default.json());
app.use((0, express_2.clerkMiddleware)());
app.get('/', (req, res) => {
    res.send('server is live');
});
app.get('/debug-sentry', function mainHandler(req, res) {
    throw new Error("My first sentry error!");
});
app.use('/api/user', userRoutes_1.default);
app.use('/api/project', ProjectControllerRoutes_1.default);
Sentry.setupExpressErrorHandler(app);
exports.default = app;
//# sourceMappingURL=app.js.map