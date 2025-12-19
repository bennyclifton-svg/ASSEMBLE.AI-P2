"use strict";
/**
 * T013: Embeddings Module
 * Voyage voyage-large-2-instruct integration for document embeddings
 */
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
exports.VOYAGE_MODEL = exports.EMBEDDING_DIMENSIONS = void 0;
exports.generateEmbedding = generateEmbedding;
exports.generateEmbeddings = generateEmbeddings;
exports.cosineSimilarity = cosineSimilarity;
// Voyage AI client (uses similar API pattern)
var VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings';
var VOYAGE_MODEL = 'voyage-large-2-instruct';
exports.VOYAGE_MODEL = VOYAGE_MODEL;
var EMBEDDING_DIMENSIONS = 1024;
exports.EMBEDDING_DIMENSIONS = EMBEDDING_DIMENSIONS;
var BATCH_SIZE = 128; // Max items per batch for efficiency
/**
 * Generate embedding for a single text
 */
function generateEmbedding(text) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, response, error, data;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    apiKey = process.env.VOYAGE_API_KEY;
                    if (!apiKey) {
                        throw new Error('VOYAGE_API_KEY environment variable is required');
                    }
                    return [4 /*yield*/, fetch(VOYAGE_API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                            body: JSON.stringify({
                                input: text,
                                model: VOYAGE_MODEL,
                            }),
                        })];
                case 1:
                    response = _b.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _b.sent();
                    throw new Error("Voyage API error: ".concat(response.status, " - ").concat(error));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    data = _b.sent();
                    return [2 /*return*/, {
                            embedding: data.data[0].embedding,
                            tokenCount: ((_a = data.usage) === null || _a === void 0 ? void 0 : _a.total_tokens) || 0,
                        }];
            }
        });
    });
}
/**
 * Generate embeddings for multiple texts in batches
 * Batches in groups of 128 for efficiency per research.md
 */
function generateEmbeddings(texts) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, allEmbeddings, totalTokens, i, batch, response, error, data, _i, _a, item;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    apiKey = process.env.VOYAGE_API_KEY;
                    if (!apiKey) {
                        throw new Error('VOYAGE_API_KEY environment variable is required');
                    }
                    allEmbeddings = [];
                    totalTokens = 0;
                    i = 0;
                    _c.label = 1;
                case 1:
                    if (!(i < texts.length)) return [3 /*break*/, 7];
                    batch = texts.slice(i, i + BATCH_SIZE);
                    return [4 /*yield*/, fetch(VOYAGE_API_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                            body: JSON.stringify({
                                input: batch,
                                model: VOYAGE_MODEL,
                            }),
                        })];
                case 2:
                    response = _c.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text()];
                case 3:
                    error = _c.sent();
                    throw new Error("Voyage API error: ".concat(response.status, " - ").concat(error));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    data = _c.sent();
                    // Extract embeddings in order
                    for (_i = 0, _a = data.data; _i < _a.length; _i++) {
                        item = _a[_i];
                        allEmbeddings.push(item.embedding);
                    }
                    totalTokens += ((_b = data.usage) === null || _b === void 0 ? void 0 : _b.total_tokens) || 0;
                    _c.label = 6;
                case 6:
                    i += BATCH_SIZE;
                    return [3 /*break*/, 1];
                case 7: return [2 /*return*/, {
                        embeddings: allEmbeddings,
                        totalTokens: totalTokens,
                    }];
            }
        });
    });
}
/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Embeddings must have same dimensions');
    }
    var dotProduct = 0;
    var normA = 0;
    var normB = 0;
    for (var i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
