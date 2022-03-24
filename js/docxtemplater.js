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
exports.handleDocxTemplater = void 0;
const angular_expressions_1 = __importDefault(require("angular-expressions"));
const dayjs_1 = __importDefault(require("dayjs"));
const docxtemplater_1 = __importDefault(require("docxtemplater"));
const docxtemplater_image_module_1 = __importDefault(require("docxtemplater-image-module"));
const docxtemplater_docx_module_1 = __importDefault(require("docxtemplater-docx-module"));
const lodash_1 = __importDefault(require("lodash"));
const stream_pizzip_1 = __importDefault(require("stream-pizzip"));
const image_size_1 = __importDefault(require("image-size"));
const docxtemplater_utils_1 = require("./docxtemplater-utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const htmlRender_1 = require("./htmlRender");
// 判断选项中是否存在 "其他" 选项
function hasOtherOption(options) {
    return options.filter(op => op.value === '|OTHER|').length > 0;
}
// 获取“其他”选项对应input框的输入值
function getOtherValue(options, input) {
    let value = '';
    const optionsObj = lodash_1.default.keyBy(options, 'value');
    input.forEach((val) => {
        if (!optionsObj[val])
            value = val;
    });
    return value;
}
// 处理 单选/复选/下拉/级联 组件，根据 value 获取对应的 label
function handleLabel(input, ...field) {
    var _a, _b;
    const vMode = field[0];
    const fieldsArr = field[1].fields;
    const separator = field[2] || '、'; // 可选参数  多选时的分隔符号
    const curField = fieldsArr.find((item) => item.__vModel__ === vMode);
    let label;
    let otherValue;
    if (curField) {
        const curTag = curField.__config__.tag;
        if (curTag === 'sobey-radio') {
            // 单选
            const options = curField.options || [];
            const curOption = options.find((item) => item.value === input);
            label = curOption === null || curOption === void 0 ? void 0 : curOption.label;
            if (!label && hasOtherOption(options)) {
                label = input;
                otherValue = input;
            }
        }
        else if (curTag === 'sobey-checkbox') {
            // 复选
            const options = curField.options || [];
            const curOptions = lodash_1.default.filter(options, item => input.indexOf(item.value) > -1);
            const curLabels = lodash_1.default.map(curOptions, 'label');
            if (curOptions.length < input.length && hasOtherOption(options)) {
                otherValue = getOtherValue(options, input);
                if (otherValue)
                    curLabels.push(otherValue);
            }
            label = curLabels.join(separator);
        }
        else if (curTag === 'sobey-selector') {
            // 下拉
            const options = ((_a = curField.__slot__) === null || _a === void 0 ? void 0 : _a.options) || [];
            const curOptions = lodash_1.default.filter(options, item => input.indexOf(item.value) > -1);
            const curLabels = lodash_1.default.map(curOptions, 'label');
            if (curOptions.length < input.length && hasOtherOption(options)) {
                otherValue = getOtherValue(options, input);
                if (otherValue)
                    curLabels.push(otherValue);
            }
            label = curLabels.join(separator);
        }
        else if (curTag === 'sobey-cascade') {
            // 级联
            const options = ((_b = curField.__slot__) === null || _b === void 0 ? void 0 : _b.options) || [];
            const inputArr = input[0] ? input[0].split('|') : [];
            if (inputArr.length) {
                label = getLabelLoop(inputArr, options) || '';
            }
        }
    }
    return { label, otherValue };
}
function getLabelLoop(inputArr, options) {
    const value = inputArr.shift();
    const curOption = options.find((item) => item.value === value);
    const label = (curOption === null || curOption === void 0 ? void 0 : curOption.label) || '';
    if (!inputArr.length) {
        return label;
    }
    return label + '/' + getLabelLoop(inputArr, curOption.children);
}
angular_expressions_1.default.filters.getLabel = function (input, ...field) {
    // This condition should be used to make sure that if your input is
    // undefined, your output will be undefined as well and will not
    // throw an error
    if (input === undefined || input === null)
        return '';
    const res = handleLabel(input, ...field);
    return res.label;
};
angular_expressions_1.default.filters.formatDate = function (input, format) {
    if (!input)
        return input;
    return (0, dayjs_1.default)(input).format(format);
};
angular_expressions_1.default.filters.formatTime = function (input, format) {
    if (!input)
        return input;
    const _date = '2021-11-11';
    return (0, dayjs_1.default)(_date + input).format(format);
};
angular_expressions_1.default.filters.isSelectedLabel = function (input, vMode, define, label, selected = '', unselected = '', separator = '、') {
    if (!input)
        return unselected;
    const res = handleLabel(input, vMode, define, separator);
    const otherValue = res.otherValue;
    const lableString = res.label;
    if (otherValue && label === '|OTHER|')
        return selected;
    if (otherValue && label === '|OTHERVALUE|')
        return otherValue;
    if (typeof input === 'string') {
        // 处理value为字符串的情况（针对radio组件）
        return label === lableString ? selected : unselected;
    }
    if (Array.isArray(input)) {
        // 处理value为数组的情况
        const labelArr = lableString.split(separator);
        return labelArr.includes(label) ? selected : unselected;
    }
    return unselected;
};
// 不推荐使用，使用场景可被 isSelectedLabel 替换
angular_expressions_1.default.filters.isSelected = function (input, key) {
    if (!input)
        return input;
    if (!Array.isArray(input))
        return false;
    return input.includes(key);
};
angular_expressions_1.default.filters.getAddress = function (input) {
    if (!input)
        return input;
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    const val = (data === null || data === void 0 ? void 0 : data.region.filter((r) => r).map((r) => r.name)) || [];
    if (data === null || data === void 0 ? void 0 : data.detail) {
        val.push(data.detail);
    }
    return val.join('/');
};
const echartStr = fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../public/js/echarts.min.js'), 'utf-8');
const eTemplates = [
    "<!DOCTYPE html><html lang='en' style='height: 100%'><head><meta charset='UTF-8'><meta http-equiv='X-UA-Compatible' content='IE=edge'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Document</title></head><body style='height: 100%; margin: 0'><div id='container' style='height: 100%'></div></body><script type='text/javascript'>" + echartStr + "</script><script type='text/javascript'>var dom = document.getElementById('container');var myChart = echarts.init(dom);var app = {};var option = null;option = ",
    ";if (option && typeof option === 'object') {myChart.setOption(option, true);}</script></html>",
];
const hTemplates = [
    "<!DOCTYPE html><html lang='en' style='height: 100%'><head><meta charset='UTF-8'><meta http-equiv='X-UA-Compatible' content='IE=edge'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Document</title><script type='text/javascript'>" + echartStr + "</script></head><body style='height: 100%; margin: 0'>",
    "</body></html>",
];
angular_expressions_1.default.filters.renderEchart = function (input) {
    if (!input)
        return '';
    // console.log('getEchart', input, vMode, JSON.parse(options))
    // const optionCfg = { ...JSON.parse(options), series: input };
    return {
        type: 'echart',
        data: eTemplates[0] + JSON.stringify(input) + eTemplates[1],
    };
};
angular_expressions_1.default.filters.renderHtml = function (input) {
    if (!input)
        return '';
    return {
        type: 'html',
        data: hTemplates[0] + JSON.stringify(input) + hTemplates[1],
    };
};
angular_expressions_1.default.filters.getImage = function (input, maxSize) {
    if (!input)
        return input;
    console.log('getImage', input, maxSize);
    return input;
};
function angularParser(tag) {
    tag = tag
        .replace(/^\.$/, 'this')
        .replace(/(’|‘|`)/g, "'")
        .replace(/(“|”)/g, '"');
    const expr = angular_expressions_1.default.compile(tag);
    return {
        get: function (scope, context) {
            let obj = {};
            const index = lodash_1.default.last(context.scopePathItem);
            const scopeList = context.scopeList;
            const num = context.num;
            for (let i = 0, len = num + 1; i < len; i++) {
                obj = Object.assign(obj, scopeList[i]);
            }
            obj = Object.assign(obj, { $index: index });
            return expr(scope, obj);
        },
    };
}
// The error object contains additional information when logged
// with JSON.stringify (it contains a properties object containing all suberrors).
function replaceErrors(key, value) {
    if (value instanceof Error) {
        return Object.getOwnPropertyNames(value).reduce(function (error, key) {
            error[key] = value[key];
            return error;
        }, {});
    }
    return value;
}
function errorHandler(error) {
    console.log(JSON.stringify({ error: error }, replaceErrors));
    if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
            .map(function (error) {
            return error.properties.explanation;
        })
            .join('\n');
        console.log('errorMessages', errorMessages);
        throw errorMessages;
        // errorMessages is a humanly readable message looking like this:
        // 'The tag beginning with "foobar" is unopened'
    }
    throw error;
}
function nullGetter(part) {
    console.log('nullgetter', part);
    if (!part.module) {
        return '';
    }
    if (part.module === 'rawxml') {
        return '';
    }
    return '';
}
function getImgSize(img) {
    try {
        let { width = 595, height = 842 } = (0, image_size_1.default)(img);
        if (width > 595)
            width = 595;
        if (height > 842)
            height = 842;
        return [width, height];
    }
    catch (error) {
        console.error('getImgSize error ', error);
        return [595, 842];
    }
}
function handleDocxTemplater(templateData, data) {
    return __awaiter(this, void 0, void 0, function* () {
        // Load the docx file as binary content
        // const content = fs.readFileSync(path.resolve(__dirname, filePath), "binary");
        const content = templateData;
        const imageModule = new docxtemplater_image_module_1.default({
            centered: false,
            getImage: function (tagValue, tagName) {
                // console.log('getImage ', tagValue, tagName)
                if (!tagValue)
                    return '';
                if (typeof tagValue === 'object' && tagValue.type === 'echart') {
                    // console.log('a-----', fs.readFileSync(path.resolve(__dirname, '002.html')))
                    return new Promise(resolve => {
                        console.log('3 ', Date());
                        (0, htmlRender_1.renderHtmlContent)(tagValue.data)
                            .then(data => {
                            // console.log('getImageData', data);
                            console.log('4 ', Date());
                            return resolve(data);
                        })
                            .catch(err => {
                            console.log('getImageAsync get error ', err);
                            return resolve('');
                        });
                        // return resolve(fs.readFileSync(path.resolve(__dirname, '002.html')));
                        // axios.get('http://172.16.166.66:3004/html2pic', {responseType: 'arraybuffer'}).then(data => {
                        //   console.log('getImageData', data.data);
                        //   return resolve(data.data);
                        // })
                        // .catch(err => {
                        //   console.log('getImageAsync get error ', err);
                        //   return resolve('');
                        // });
                    });
                }
                else if (typeof tagValue === 'object' && tagValue.type === 'html') {
                    return new Promise(resolve => {
                        (0, htmlRender_1.renderHtmlContent)(tagValue.data)
                            .then(data => {
                            // console.log('getHTMLData', data);
                            return resolve(data);
                        })
                            .catch(err => {
                            console.log('getHTMLAsync get error ', err);
                            return resolve('');
                        });
                    });
                }
                else if (typeof tagValue === 'string') {
                    return new Promise(resolve => {
                        (0, docxtemplater_utils_1.getImageData)(tagValue, path_1.default.basename(tagValue))
                            .then(data => {
                            // console.log('getImageData', data);
                            return resolve(data);
                        })
                            .catch(err => {
                            console.log('getImageAsync get error ', err);
                            return resolve('');
                        });
                    });
                }
                return tagValue;
            },
            getSize: function (img, tagValue, tagName) {
                // console.log('getSize----', img, getImgSize(img));
                return getImgSize(img);
            },
        });
        const docxModule = new docxtemplater_docx_module_1.default({
            getDocx: function (tagValue) {
                // console.log('tagValue', tagValue)
                return new Promise((resolve, reject) => {
                    // if (fs.existsSync(tagValue)) {
                    //   console.log(path.resolve(__dirname, "extra.docx"))
                    //   resolve(fs.createReadStream(path.resolve(__dirname, tagValue)));
                    // } else {
                    //   reject(new Error("not such file or folder " + tagValue));
                    // }
                    (0, docxtemplater_utils_1.handleAxios)(tagValue)
                        .then(data => {
                        return resolve(data);
                    })
                        .catch(err => {
                        console.log('getAttachAsync get error ', err);
                        return resolve('');
                    });
                });
            },
        });
        const zip = new stream_pizzip_1.default(content, { checkCRC32: true });
        let doc;
        try {
            doc = new docxtemplater_1.default()
                .attachModule(imageModule)
                .attachModule(docxModule)
                .loadZip(zip)
                .setOptions({
                paragraphLoop: true,
                linebreaks: true,
                parser: angularParser,
                nullGetter,
            })
                .setData(data)
                .compile();
        }
        catch (error) {
            // Catch compilation errors
            // (errors caused by the compilation of the template: misplaced tags)
            errorHandler(error);
        }
        try {
            // console.log(data);
            // render the document
            // (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
            // doc.render(data);
            yield doc.renderAsync(data);
        }
        catch (error) {
            // Catch rendering errors
            // (errors relating to the rendering of the template:
            // for example when the angularParser throws an error)
            errorHandler(error);
        }
        const buf = doc.getZip().generateNodeStream({ streamFiles: true });
        // fs.writeFileSync(path.resolve(__dirname, "output-docx.docx"), buf);
        return buf;
    });
}
exports.handleDocxTemplater = handleDocxTemplater;
