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
exports.handleAxios = exports.getImageData = void 0;
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const gm_1 = __importDefault(require("gm"));
const pdf2pic_1 = require("pdf2pic");
const UNSUPPORTED_FORMAT = '../public/images/UNSUPPORTED_FORMAT.png';
const DOWNLOAD_FAILURE = '../public/images/DOWNLOAD_FAILURE.png';
const OVERSIZE_PDF = '../public/images/OVERSIZE_PDF.png';
const getImageData = (_path, name) => __awaiter(void 0, void 0, void 0, function* () {
    // 利用 split 去除链接参数部分，避免干扰对文件类型的判断
    const url = _path.split('?')[0];
    // 过滤非图片和pdf的附件请求
    if (/\.(jpg|jpeg|png|gif|bmp|pic|svg|pdf)$/i.test(url)) {
        const stream = yield (0, exports.handleAxios)(_path);
        // 如果附件请求出错则跳过后续操作
        if (stream) {
            // 保存源文件
            const filePath = yield saveStream2Temp(stream, name);
            // 判断资源是否是pdf，如果是pdf需要特殊处理转换为图片
            if (url.includes('.pdf')) {
                const bool = yield isFileOverSize(filePath);
                if (bool) {
                    const dir = path_1.default.resolve(__dirname, OVERSIZE_PDF);
                    return fs_1.default.readFileSync(dir);
                }
                else {
                    const imgPaths = yield handlePdf2pic(name, filePath);
                    const imgBufList = [];
                    imgPaths.forEach(imgpath => {
                        if (imgpath)
                            imgBufList.push(fs_1.default.readFileSync(imgpath));
                    });
                    return imgBufList.length ? imgBufList : '';
                }
            }
            else {
                return fs_1.default.readFileSync(filePath);
            }
        }
        const dir = path_1.default.resolve(__dirname, DOWNLOAD_FAILURE);
        return fs_1.default.readFileSync(dir);
    }
    else {
        const dir = path_1.default.resolve(__dirname, UNSUPPORTED_FORMAT);
        return fs_1.default.readFileSync(dir);
    }
});
exports.getImageData = getImageData;
/**
 * @function 请求附件资源
 * @param url {string} 附件请求地址
 * @returns 文件流
 */
const handleAxios = (url) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data } = yield axios_1.default.get(encodeURI(url), {
            responseType: 'stream',
        });
        return data;
    }
    catch (error) {
        console.error('get attachment-stream error ', error);
        return '';
    }
});
exports.handleAxios = handleAxios;
/**
 * @function 保存数据流到临时目录下，返回存储数据的路径
 * @param stream {Readable} 附件文件流
 * @param name {string} 附件名
 * @returns 附件本地存储路径
 */
const saveStream2Temp = (stream, name) => __awaiter(void 0, void 0, void 0, function* () {
    // 创建源数据存放目录
    const sourceDir = path_1.default.resolve(__dirname, 'template-images/source');
    yield createTemp(sourceDir);
    const filePath = `${sourceDir}/${name}`;
    // 写入流
    return new Promise(resolve => {
        const ws = fs_1.default.createWriteStream(filePath);
        stream.pipe(ws);
        ws.on('close', () => {
            console.log('write stream close', name);
            resolve(filePath);
        });
        ws.on('error', err => {
            console.error('write stream get error ', err);
            resolve('');
        });
    });
});
/**
 * @function 文件是否超过1MB
 * @param filePath {string} 本地pdf暂存地址
 * @returns {boolean}
 */
const isFileOverSize = (filePath) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise(resolve => {
        fs_1.default.stat(filePath, (err, stats) => {
            if (err) {
                console.error('getFileSize get error ', err);
                return resolve(true); // 发生错误视为体积过大
            }
            // const bool = stats.size > 1048576; // 不超过 1MB
            const bool = stats.size > 5242880; // 不超过 5MB
            return resolve(bool);
        });
    });
});
/**
 * @function 将buffer格式的pdf文件转换为png格式的图片，缓存至template-images文件夹下
 * @param name {string} 文件名
 * @param filePath {string} PDF文档本地存储路径
 * @returns 转化为图片后的本地存储路径数组
 */
const handlePdf2pic = (name, filePath) => __awaiter(void 0, void 0, void 0, function* () {
    const pdfBuf = yield readFile(filePath);
    // 获取PDF资源的宽高
    const size = yield new Promise(resolve => {
        (0, gm_1.default)(pdfBuf).size(function (err, size) {
            if (err) {
                console.error('can not get pdf size ', err);
                resolve({ width: 595, height: 842 });
            }
            else {
                resolve(size);
            }
        });
    });
    const outputDir = path_1.default.resolve(__dirname, `template-images/${name}`);
    yield createTemp(outputDir);
    const options = {
        density: 100,
        saveFilename: 'tmpImg',
        savePath: outputDir,
        format: 'png',
        width: size.width || 595,
        height: size.height || 842,
    };
    try {
        const pdfPage = yield getPdfPage(pdfBuf);
        let curPage = 0;
        const imgPaths = [];
        while (curPage < pdfPage) {
            curPage++;
            const convert = yield (0, pdf2pic_1.fromPath)(filePath, options);
            const data = yield convert(curPage);
            imgPaths.push(data.path);
        }
        return imgPaths || [];
    }
    catch (error) {
        console.error('handle pdf2pic get error ', error);
        return [];
    }
});
/**
 * @function 创建临时目录
 * @param outputDirectory {string} 创建路径
 */
const createTemp = (outputDirectory) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise(resolve => {
        fs_1.default.mkdir(outputDirectory, () => {
            resolve();
        });
    });
});
function readFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            fs_1.default.readFile(filePath, {}, (err, data) => {
                if (err) {
                    console.error('read file get err ', err);
                    return resolve(Buffer.from([]));
                }
                return resolve(data);
            });
        });
    });
}
/**
 * @function 获取PDF文件的总页数
 * @param pdfBuf {Buffer}
 */
function getPdfPage(pdfBuf) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise(resolve => {
            (0, gm_1.default)(pdfBuf).identify('%p ', (error, data) => {
                if (error) {
                    console.error('gm().identify get error ', error);
                    return resolve(0);
                }
                try {
                    const pdfPage = data.replace(/^[\w\W]*?1/, '1').split(' ').length || 0;
                    return resolve(pdfPage);
                }
                catch (err) {
                    console.error('parsing pdfPage get err ', err);
                    return resolve(0);
                }
            });
        });
    });
}
