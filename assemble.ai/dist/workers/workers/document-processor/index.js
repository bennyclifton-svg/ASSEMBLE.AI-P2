"use strict";
/**
 * T019: Document Processor Worker
 * BullMQ worker for processing documents through RAG pipeline
 *
 * NOTE: Uses dynamic imports to ensure dotenv loads BEFORE modules
 * that depend on environment variables (like rag-client.ts)
 */
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
// Load environment variables FIRST - before any other imports
// In production (Docker), env vars are injected so this is a no-op
// In development, load env files in same order as Next.js
if (process.env.NODE_ENV !== 'production') {
    (0, dotenv_1.config)({ path: '.env.local' });
    (0, dotenv_1.config)({ path: '.env.development' });
    (0, dotenv_1.config)({ path: '.env' });
}
// Verify required env vars
console.log('[worker] Checking environment variables...');
console.log('[worker] DATABASE_URL:', process.env.DATABASE_URL ? 'set (PostgreSQL)' : 'NOT SET');
console.log('[worker] SUPABASE_POSTGRES_URL:', process.env.SUPABASE_POSTGRES_URL ? 'set' : 'NOT SET');
console.log('[worker] REDIS_URL:', process.env.REDIS_URL ? 'set' : 'NOT SET');
console.log('[worker] VOYAGE_API_KEY:', process.env.VOYAGE_API_KEY ? 'set' : 'NOT SET');
if (!process.env.DATABASE_URL && !process.env.SUPABASE_POSTGRES_URL) {
    console.error('[worker] FATAL: DATABASE_URL or SUPABASE_POSTGRES_URL is not set!');
    process.exit(1);
}
// Now we can safely import modules that depend on env vars
function bootstrap() {
    return __awaiter(this, void 0, void 0, function () {
        /**
         * Process a document through the RAG pipeline
         */
        function processDocument(job) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, documentId, documentSetId, filename, storagePath, processingResult, buffer, parsed, chunks, chunkContents, embeddingsResult_1, chunkRecords, i, batch, error_1, updateResult, updateError_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = job.data, documentId = _a.documentId, documentSetId = _a.documentSetId, filename = _a.filename, storagePath = _a.storagePath;
                            console.log("[worker] Processing document: ".concat(filename, " (").concat(documentId, ") from ").concat(storagePath));
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 11, , 16]);
                            // Update sync status to processing
                            console.log("[worker] Updating status to 'processing' for document ".concat(documentId, " in set ").concat(documentSetId));
                            return [4 /*yield*/, ragDb
                                    .update(documentSetMembers)
                                    .set({ syncStatus: 'processing' })
                                    .where(and(eq(documentSetMembers.documentSetId, documentSetId), eq(documentSetMembers.documentId, documentId)))];
                        case 2:
                            processingResult = _b.sent();
                            console.log("[worker] Status update result:", processingResult);
                            // Step 1: Read file from disk and parse document
                            job.updateProgress(10);
                            console.log("[worker] Reading and parsing document: ".concat(filename));
                            return [4 /*yield*/, storage.get(storagePath)];
                        case 3:
                            buffer = _b.sent();
                            return [4 /*yield*/, parseDocument(buffer, filename)];
                        case 4:
                            parsed = _b.sent();
                            // Step 2: Chunk document
                            job.updateProgress(30);
                            console.log("[worker] Chunking document: ".concat(filename));
                            chunks = chunkDocument(parsed.content, documentId);
                            console.log("[worker] Created ".concat(chunks.length, " chunks"));
                            // Step 3: Generate embeddings in batches
                            job.updateProgress(50);
                            console.log("[worker] Generating embeddings for ".concat(chunks.length, " chunks"));
                            chunkContents = chunks.map(function (c) { return c.content; });
                            return [4 /*yield*/, generateEmbeddings(chunkContents)];
                        case 5:
                            embeddingsResult_1 = _b.sent();
                            // Step 4: Insert chunks with embeddings
                            job.updateProgress(80);
                            console.log("[worker] Inserting chunks into database");
                            chunkRecords = chunks.map(function (chunk, idx) { return ({
                                id: chunk.id,
                                documentId: documentId,
                                parentChunkId: chunk.parentId,
                                hierarchyLevel: chunk.hierarchyLevel,
                                hierarchyPath: chunk.hierarchyPath,
                                sectionTitle: chunk.sectionTitle,
                                clauseNumber: chunk.clauseNumber,
                                content: chunk.content,
                                embedding: embeddingsResult_1.embeddings[idx],
                                tokenCount: chunk.tokenCount,
                            }); });
                            i = 0;
                            _b.label = 6;
                        case 6:
                            if (!(i < chunkRecords.length)) return [3 /*break*/, 9];
                            batch = chunkRecords.slice(i, i + 50);
                            return [4 /*yield*/, ragDb.insert(documentChunks).values(batch)];
                        case 7:
                            _b.sent();
                            _b.label = 8;
                        case 8:
                            i += 50;
                            return [3 /*break*/, 6];
                        case 9:
                            // Step 5: Update sync status to synced
                            job.updateProgress(100);
                            return [4 /*yield*/, ragDb
                                    .update(documentSetMembers)
                                    .set({
                                    syncStatus: 'synced',
                                    syncedAt: new Date(),
                                    chunksCreated: chunks.length,
                                })
                                    .where(and(eq(documentSetMembers.documentSetId, documentSetId), eq(documentSetMembers.documentId, documentId)))];
                        case 10:
                            _b.sent();
                            console.log("[worker] Successfully processed document: ".concat(filename));
                            return [3 /*break*/, 16];
                        case 11:
                            error_1 = _b.sent();
                            console.error("[worker] Failed to process document: ".concat(filename), error_1);
                            _b.label = 12;
                        case 12:
                            _b.trys.push([12, 14, , 15]);
                            console.log("[worker] Updating status to 'failed' for document ".concat(documentId, " in set ").concat(documentSetId));
                            return [4 /*yield*/, ragDb
                                    .update(documentSetMembers)
                                    .set({
                                    syncStatus: 'failed',
                                    errorMessage: error_1 instanceof Error ? error_1.message : 'Unknown error',
                                })
                                    .where(and(eq(documentSetMembers.documentSetId, documentSetId), eq(documentSetMembers.documentId, documentId)))];
                        case 13:
                            updateResult = _b.sent();
                            console.log("[worker] Updated status to 'failed' for document ".concat(documentId), updateResult);
                            return [3 /*break*/, 15];
                        case 14:
                            updateError_1 = _b.sent();
                            console.error('[worker] Failed to update status to failed:', updateError_1);
                            return [3 /*break*/, 15];
                        case 15: throw error_1;
                        case 16: return [2 /*return*/];
                    }
                });
            });
        }
        /**
         * Process a single chunk embedding job
         */
        function processChunkEmbedding(job) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, chunkId, content, result;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = job.data, chunkId = _a.chunkId, content = _a.content;
                            console.log("[worker] Embedding chunk: ".concat(chunkId));
                            return [4 /*yield*/, generateEmbedding(content)];
                        case 1:
                            result = _b.sent();
                            return [4 /*yield*/, ragDb
                                    .update(documentChunks)
                                    .set({
                                    embedding: result.embedding,
                                    tokenCount: result.tokenCount,
                                    updatedAt: new Date(),
                                })
                                    .where(eq(documentChunks.id, chunkId))];
                        case 2:
                            _b.sent();
                            console.log("[worker] Embedded chunk: ".concat(chunkId));
                            return [2 /*return*/];
                    }
                });
            });
        }
        /**
         * Start the document processing worker
         */
        function startDocumentWorker() {
            var connection = getConnection();
            var worker = new Worker(QUEUE_NAMES.DOCUMENT_PROCESSING, processDocument, {
                connection: connection,
                concurrency: DOCUMENT_CONCURRENCY,
            });
            worker.on('completed', function (job) {
                console.log("[worker] Document job ".concat(job.id, " completed"));
            });
            worker.on('failed', function (job, err) {
                console.error("[worker] Document job ".concat(job === null || job === void 0 ? void 0 : job.id, " failed:"), err.message);
            });
            worker.on('error', function (err) {
                console.error('[worker] Document worker error:', err);
            });
            return worker;
        }
        /**
         * Start the chunk embedding worker
         */
        function startEmbeddingWorker() {
            var connection = getConnection();
            var worker = new Worker(QUEUE_NAMES.CHUNK_EMBEDDING, processChunkEmbedding, {
                connection: connection,
                concurrency: EMBEDDING_CONCURRENCY,
            });
            worker.on('completed', function (job) {
                console.log("[worker] Embedding job ".concat(job.id, " completed"));
            });
            worker.on('failed', function (job, err) {
                console.error("[worker] Embedding job ".concat(job === null || job === void 0 ? void 0 : job.id, " failed:"), err.message);
            });
            worker.on('error', function (err) {
                console.error('[worker] Embedding worker error:', err);
            });
            return worker;
        }
        var _a, Worker, Job, ragDb, _b, documentChunks, documentSetMembers, parseDocument, chunkDocument, _c, generateEmbedding, generateEmbeddings, _d, QUEUE_NAMES, getConnection, _e, eq, and, storage, DOCUMENT_CONCURRENCY, EMBEDDING_CONCURRENCY, documentWorker, embeddingWorker, shutdown;
        var _this = this;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('bullmq')); })];
                case 1:
                    _a = _f.sent(), Worker = _a.Worker, Job = _a.Job;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/db/rag-client')); })];
                case 2:
                    ragDb = (_f.sent()).ragDb;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/db/rag-schema')); })];
                case 3:
                    _b = _f.sent(), documentChunks = _b.documentChunks, documentSetMembers = _b.documentSetMembers;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/rag/parsing')); })];
                case 4:
                    parseDocument = (_f.sent()).parseDocument;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/rag/chunking')); })];
                case 5:
                    chunkDocument = (_f.sent()).chunkDocument;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/rag/embeddings')); })];
                case 6:
                    _c = _f.sent(), generateEmbedding = _c.generateEmbedding, generateEmbeddings = _c.generateEmbeddings;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/queue/client')); })];
                case 7:
                    _d = _f.sent(), QUEUE_NAMES = _d.QUEUE_NAMES, getConnection = _d.getConnection;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('drizzle-orm')); })];
                case 8:
                    _e = _f.sent(), eq = _e.eq, and = _e.and;
                    return [4 /*yield*/, Promise.resolve().then(function () { return __importStar(require('../../src/lib/storage/local')); })];
                case 9:
                    storage = (_f.sent()).storage;
                    DOCUMENT_CONCURRENCY = 2;
                    EMBEDDING_CONCURRENCY = 5;
                    // Main entry point
                    console.log('[worker] Starting document processor workers...');
                    documentWorker = startDocumentWorker();
                    embeddingWorker = startEmbeddingWorker();
                    console.log('[worker] Workers started. Waiting for jobs...');
                    shutdown = function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    console.log('[worker] Shutting down workers...');
                                    return [4 /*yield*/, documentWorker.close()];
                                case 1:
                                    _a.sent();
                                    return [4 /*yield*/, embeddingWorker.close()];
                                case 2:
                                    _a.sent();
                                    process.exit(0);
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    process.on('SIGINT', shutdown);
                    process.on('SIGTERM', shutdown);
                    return [2 /*return*/];
            }
        });
    });
}
// Run bootstrap
bootstrap().catch(function (err) {
    console.error('[worker] Fatal error:', err);
    process.exit(1);
});
