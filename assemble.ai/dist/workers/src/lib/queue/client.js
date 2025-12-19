"use strict";
/**
 * T018: BullMQ Queue Client
 * Document processing queue with Upstash Redis
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_NAMES = void 0;
exports.getConnection = getConnection;
exports.getDocumentQueue = getDocumentQueue;
exports.getChunkQueue = getChunkQueue;
exports.getReportQueue = getReportQueue;
exports.addDocumentForProcessing = addDocumentForProcessing;
exports.addChunkForEmbedding = addChunkForEmbedding;
exports.addSectionForGeneration = addSectionForGeneration;
exports.getQueueStats = getQueueStats;
exports.closeQueues = closeQueues;
exports.drainQueue = drainQueue;
exports.pauseQueue = pauseQueue;
exports.resumeQueue = resumeQueue;
var bullmq_1 = require("bullmq");
var ioredis_1 = __importDefault(require("ioredis"));
// Redis connection for Upstash
// Note: Upstash requires TLS (rediss://)
var getRedisConnection = function () {
    var redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required');
    }
    return new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null, // Required for BullMQ
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });
};
// Queue names
exports.QUEUE_NAMES = {
    DOCUMENT_PROCESSING: 'document-processing',
    CHUNK_EMBEDDING: 'chunk-embedding',
    REPORT_GENERATION: 'report-generation',
};
// Queue configuration
var DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 1000,
    },
    removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: {
        count: 500, // Keep last 500 failed jobs for debugging
    },
};
// Singleton queue instances
var documentQueue = null;
var chunkQueue = null;
var reportQueue = null;
var connection = null;
/**
 * Get or create Redis connection
 */
function getConnection() {
    if (!connection) {
        connection = getRedisConnection();
    }
    return connection;
}
/**
 * Get or create document processing queue
 */
function getDocumentQueue() {
    if (!documentQueue) {
        documentQueue = new bullmq_1.Queue(exports.QUEUE_NAMES.DOCUMENT_PROCESSING, {
            connection: getConnection(),
            defaultJobOptions: DEFAULT_JOB_OPTIONS,
        });
    }
    return documentQueue;
}
/**
 * Get or create chunk embedding queue
 */
function getChunkQueue() {
    if (!chunkQueue) {
        chunkQueue = new bullmq_1.Queue(exports.QUEUE_NAMES.CHUNK_EMBEDDING, {
            connection: getConnection(),
            defaultJobOptions: __assign(__assign({}, DEFAULT_JOB_OPTIONS), { attempts: 5 }),
        });
    }
    return chunkQueue;
}
/**
 * Get or create report generation queue
 */
function getReportQueue() {
    if (!reportQueue) {
        reportQueue = new bullmq_1.Queue(exports.QUEUE_NAMES.REPORT_GENERATION, {
            connection: getConnection(),
            defaultJobOptions: __assign(__assign({}, DEFAULT_JOB_OPTIONS), { attempts: 2 }),
        });
    }
    return reportQueue;
}
/**
 * Add document for processing
 */
function addDocumentForProcessing(documentId, documentSetId, filename, storagePath) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queue = getDocumentQueue();
                    return [4 /*yield*/, queue.isPaused()];
                case 1:
                    if (!_a.sent()) return [3 /*break*/, 3];
                    return [4 /*yield*/, queue.resume()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [2 /*return*/, queue.add('process', {
                        type: 'process_document',
                        documentId: documentId,
                        documentSetId: documentSetId,
                        filename: filename,
                        storagePath: storagePath,
                    }, {
                        jobId: "doc-".concat(documentId, "-").concat(Date.now()),
                        // No priority - BullMQ 5.x has issues with prioritized queue
                    })];
            }
        });
    });
}
/**
 * Add chunk for embedding
 */
function addChunkForEmbedding(chunkId, content) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            queue = getChunkQueue();
            return [2 /*return*/, queue.add('embed', {
                    type: 'embed_chunk',
                    chunkId: chunkId,
                    content: content,
                }, {
                    jobId: "chunk-".concat(chunkId),
                    priority: 2, // Lower priority than document processing
                })];
        });
    });
}
/**
 * Add report section for generation
 */
function addSectionForGeneration(reportId, sectionIndex, query, documentSetIds) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            queue = getReportQueue();
            return [2 /*return*/, queue.add('generate', {
                    type: 'generate_section',
                    reportId: reportId,
                    sectionIndex: sectionIndex,
                    query: query,
                    documentSetIds: documentSetIds,
                }, {
                    jobId: "report-".concat(reportId, "-section-").concat(sectionIndex),
                    priority: 3, // Lowest priority
                })];
        });
    });
}
/**
 * Get queue statistics
 */
function getQueueStats() {
    return __awaiter(this, void 0, void 0, function () {
        var docQueue, chunkQueueInstance, repQueue, _a, docCounts, chunkCounts, repCounts;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    docQueue = getDocumentQueue();
                    chunkQueueInstance = getChunkQueue();
                    repQueue = getReportQueue();
                    return [4 /*yield*/, Promise.all([
                            docQueue.getJobCounts(),
                            chunkQueueInstance.getJobCounts(),
                            repQueue.getJobCounts(),
                        ])];
                case 1:
                    _a = _b.sent(), docCounts = _a[0], chunkCounts = _a[1], repCounts = _a[2];
                    return [2 /*return*/, {
                            documentProcessing: docCounts,
                            chunkEmbedding: chunkCounts,
                            reportGeneration: repCounts,
                        }];
            }
        });
    });
}
/**
 * Clean up all queues (for graceful shutdown)
 */
function closeQueues() {
    return __awaiter(this, void 0, void 0, function () {
        var queues;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queues = [documentQueue, chunkQueue, reportQueue].filter(Boolean);
                    return [4 /*yield*/, Promise.all(queues.map(function (q) { return q === null || q === void 0 ? void 0 : q.close(); }))];
                case 1:
                    _a.sent();
                    if (!connection) return [3 /*break*/, 3];
                    return [4 /*yield*/, connection.quit()];
                case 2:
                    _a.sent();
                    connection = null;
                    _a.label = 3;
                case 3:
                    documentQueue = null;
                    chunkQueue = null;
                    reportQueue = null;
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Drain queue (remove all jobs)
 */
function drainQueue(queueName) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queue = queueName === 'DOCUMENT_PROCESSING'
                        ? getDocumentQueue()
                        : queueName === 'CHUNK_EMBEDDING'
                            ? getChunkQueue()
                            : getReportQueue();
                    return [4 /*yield*/, queue.drain()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Pause queue processing
 */
function pauseQueue(queueName) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queue = queueName === 'DOCUMENT_PROCESSING'
                        ? getDocumentQueue()
                        : queueName === 'CHUNK_EMBEDDING'
                            ? getChunkQueue()
                            : getReportQueue();
                    return [4 /*yield*/, queue.pause()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Resume queue processing
 */
function resumeQueue(queueName) {
    return __awaiter(this, void 0, void 0, function () {
        var queue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    queue = queueName === 'DOCUMENT_PROCESSING'
                        ? getDocumentQueue()
                        : queueName === 'CHUNK_EMBEDDING'
                            ? getChunkQueue()
                            : getReportQueue();
                    return [4 /*yield*/, queue.resume()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
