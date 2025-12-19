"use strict";
/**
 * T014: Document Parsing Module
 * LlamaParse (primary) + Unstructured (fallback) + pdf-parse (local fallback)
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
exports.parseDocument = parseDocument;
/**
 * Parse document using LlamaParse (primary)
 */
function parseWithLlamaParse(fileBuffer, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, formData, uploadResponse, error, uploadData, jobId, result, maxAttempts, attempt, statusResponse, statusData, resultResponse, error, markdownContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.LLAMA_CLOUD_API_KEY;
                    if (!apiKey) {
                        throw new Error('LLAMA_CLOUD_API_KEY environment variable is required');
                    }
                    formData = new FormData();
                    formData.append('file', new Blob([fileBuffer]), filename);
                    return [4 /*yield*/, fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
                            method: 'POST',
                            headers: {
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                            body: formData,
                        })];
                case 1:
                    uploadResponse = _a.sent();
                    if (!!uploadResponse.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, uploadResponse.text()];
                case 2:
                    error = _a.sent();
                    throw new Error("LlamaParse upload error: ".concat(uploadResponse.status, " - ").concat(error));
                case 3: return [4 /*yield*/, uploadResponse.json()];
                case 4:
                    uploadData = _a.sent();
                    jobId = uploadData.id;
                    result = null;
                    maxAttempts = 60;
                    attempt = 0;
                    _a.label = 5;
                case 5:
                    if (!(attempt < maxAttempts)) return [3 /*break*/, 10];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5000); })];
                case 6:
                    _a.sent(); // Wait 5 seconds
                    return [4 /*yield*/, fetch("https://api.cloud.llamaindex.ai/api/parsing/job/".concat(jobId), {
                            headers: {
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                        })];
                case 7:
                    statusResponse = _a.sent();
                    if (!statusResponse.ok) {
                        return [3 /*break*/, 9];
                    }
                    return [4 /*yield*/, statusResponse.json()];
                case 8:
                    statusData = _a.sent();
                    if (statusData.status === 'SUCCESS') {
                        result = statusData;
                        return [3 /*break*/, 10];
                    }
                    else if (statusData.status === 'ERROR') {
                        throw new Error("LlamaParse job failed: ".concat(statusData.error || 'Unknown error'));
                    }
                    _a.label = 9;
                case 9:
                    attempt++;
                    return [3 /*break*/, 5];
                case 10:
                    if (!result) {
                        throw new Error('LlamaParse job timed out');
                    }
                    return [4 /*yield*/, fetch("https://api.cloud.llamaindex.ai/api/parsing/job/".concat(jobId, "/result/markdown"), {
                            headers: {
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                        })];
                case 11:
                    resultResponse = _a.sent();
                    if (!!resultResponse.ok) return [3 /*break*/, 13];
                    return [4 /*yield*/, resultResponse.text()];
                case 12:
                    error = _a.sent();
                    throw new Error("LlamaParse result error: ".concat(resultResponse.status, " - ").concat(error));
                case 13: return [4 /*yield*/, resultResponse.text()];
                case 14:
                    markdownContent = _a.sent();
                    return [2 /*return*/, {
                            content: markdownContent,
                            metadata: {
                                pageCount: result.num_pages,
                                title: filename,
                                parser: 'llamaparse',
                            },
                        }];
            }
        });
    });
}
/**
 * Parse document using Unstructured (fallback)
 */
function parseWithUnstructured(fileBuffer, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, formData, response, error, elements, markdownParts, _i, elements_1, element, text, type;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiKey = process.env.UNSTRUCTURED_API_KEY;
                    if (!apiKey) {
                        throw new Error('UNSTRUCTURED_API_KEY environment variable is required');
                    }
                    formData = new FormData();
                    formData.append('files', new Blob([fileBuffer]), filename);
                    return [4 /*yield*/, fetch('https://api.unstructured.io/general/v0/general', {
                            method: 'POST',
                            headers: {
                                'unstructured-api-key': apiKey,
                            },
                            body: formData,
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, response.text()];
                case 2:
                    error = _a.sent();
                    throw new Error("Unstructured API error: ".concat(response.status, " - ").concat(error));
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    elements = _a.sent();
                    markdownParts = [];
                    for (_i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
                        element = elements_1[_i];
                        text = element.text || '';
                        type = element.type || 'NarrativeText';
                        switch (type) {
                            case 'Title':
                                markdownParts.push("# ".concat(text, "\n"));
                                break;
                            case 'Header':
                                markdownParts.push("## ".concat(text, "\n"));
                                break;
                            case 'ListItem':
                                markdownParts.push("- ".concat(text, "\n"));
                                break;
                            case 'Table':
                                markdownParts.push("\n".concat(text, "\n"));
                                break;
                            default:
                                markdownParts.push("".concat(text, "\n\n"));
                        }
                    }
                    return [2 /*return*/, {
                            content: markdownParts.join(''),
                            metadata: {
                                title: filename,
                                parser: 'unstructured',
                            },
                        }];
            }
        });
    });
}
/**
 * Parse PDF locally using pdf-parse (no API required)
 */
function parseWithPdfParse(fileBuffer, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var pdf, result;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    pdf = require('pdf-parse');
                    console.log("[parsing] pdf-parse: parsing ".concat(filename, ", buffer size: ").concat(fileBuffer.length, " bytes"));
                    return [4 /*yield*/, pdf(fileBuffer)];
                case 1:
                    result = _c.sent();
                    console.log("[parsing] pdf-parse result: ".concat(result.numpages, " pages, ").concat(((_a = result.text) === null || _a === void 0 ? void 0 : _a.length) || 0, " chars extracted"));
                    if (result.text) {
                        console.log("[parsing] pdf-parse text preview (first 200 chars): ".concat(result.text.substring(0, 200)));
                    }
                    // Warn if no text was extracted
                    if (!result.text || result.text.trim().length === 0) {
                        console.warn("[parsing] pdf-parse: No text extracted from ".concat(filename, ". The PDF may be scanned/image-based."));
                    }
                    return [2 /*return*/, {
                            content: result.text || '',
                            metadata: {
                                pageCount: result.numpages,
                                title: ((_b = result.info) === null || _b === void 0 ? void 0 : _b.Title) || filename,
                                parser: 'pdf-parse',
                            },
                        }];
            }
        });
    });
}
/**
 * Parse text files directly
 */
function parseTextFile(fileBuffer, filename) {
    return {
        content: fileBuffer.toString('utf-8'),
        metadata: {
            title: filename,
            parser: 'text',
        },
    };
}
/**
 * Parse document with fallback strategy
 * Tries: LlamaParse -> Unstructured -> pdf-parse (local) -> text
 */
function parseDocument(fileBuffer, filename) {
    return __awaiter(this, void 0, void 0, function () {
        var ext, isPdf, isText, result, llamaError_1, result, unstructuredError_1, result, pdfError_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    ext = filename.toLowerCase().split('.').pop() || '';
                    isPdf = ext === 'pdf';
                    isText = ['txt', 'md', 'csv', 'json'].includes(ext);
                    // For text files, just read directly
                    if (isText) {
                        console.log("[parsing] Parsing text file: ".concat(filename));
                        return [2 /*return*/, parseTextFile(fileBuffer, filename)];
                    }
                    if (!process.env.LLAMA_CLOUD_API_KEY) return [3 /*break*/, 4];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log("[parsing] Attempting LlamaParse for ".concat(filename));
                    return [4 /*yield*/, parseWithLlamaParse(fileBuffer, filename)];
                case 2:
                    result = _a.sent();
                    console.log("[parsing] LlamaParse succeeded for ".concat(filename));
                    return [2 /*return*/, result];
                case 3:
                    llamaError_1 = _a.sent();
                    console.warn("[parsing] LlamaParse failed for ".concat(filename, ":"), llamaError_1);
                    return [3 /*break*/, 4];
                case 4:
                    if (!process.env.UNSTRUCTURED_API_KEY) return [3 /*break*/, 8];
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 7, , 8]);
                    console.log("[parsing] Attempting Unstructured for ".concat(filename));
                    return [4 /*yield*/, parseWithUnstructured(fileBuffer, filename)];
                case 6:
                    result = _a.sent();
                    console.log("[parsing] Unstructured succeeded for ".concat(filename));
                    return [2 /*return*/, result];
                case 7:
                    unstructuredError_1 = _a.sent();
                    console.warn("[parsing] Unstructured failed for ".concat(filename, ":"), unstructuredError_1);
                    return [3 /*break*/, 8];
                case 8:
                    if (!isPdf) return [3 /*break*/, 12];
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    console.log("[parsing] Attempting local pdf-parse for ".concat(filename));
                    return [4 /*yield*/, parseWithPdfParse(fileBuffer, filename)];
                case 10:
                    result = _a.sent();
                    console.log("[parsing] pdf-parse succeeded for ".concat(filename, " (").concat(result.metadata.pageCount, " pages)"));
                    return [2 /*return*/, result];
                case 11:
                    pdfError_1 = _a.sent();
                    console.error("[parsing] pdf-parse failed for ".concat(filename, ":"), pdfError_1);
                    throw new Error("Failed to parse PDF ".concat(filename, ": ").concat(pdfError_1));
                case 12: 
                // For other file types without API keys
                throw new Error("Cannot parse ".concat(filename, ": No parser available for .").concat(ext, " files (API keys not configured)"));
            }
        });
    });
}
