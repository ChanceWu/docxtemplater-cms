"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderHtmlContent = exports.renderUrl = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
function renderUrl(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch();
        const page = yield browser.newPage();
        yield page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 0,
        });
    });
}
exports.renderUrl = renderUrl;
function renderHtmlContent(htmlContent) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('1 ', Date());
        const browser = yield puppeteer_1.default.launch();
        console.log('1.3 ', Date());
        const page = yield browser.newPage();
        console.log('1.7 ', Date());
        yield page.setContent(htmlContent);
        console.log('2 ', Date());
        return yield saveScreenshot(page, browser);
    });
}
exports.renderHtmlContent = renderHtmlContent;
function saveScreenshot(page, browser) {
    return __awaiter(this, void 0, void 0, function* () {
        // await page.setViewport({
        //   width: 1920,
        //   height: 1080,
        // });
        const buffer = yield page.screenshot({
            fullPage: true,
            encoding: 'binary',
        });
        yield browser.close();
        return buffer;
    });
}
