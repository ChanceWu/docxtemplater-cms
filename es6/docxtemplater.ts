import expressions from 'angular-expressions';
import dayjs from 'dayjs';
import Docxtemplater, { DXT } from 'docxtemplater';
import ImageModule from 'docxtemplater-image-module';
import DocxModule from 'docxtemplater-docx-module';
import _ from 'lodash';
import PizZip from 'stream-pizzip';
import sizeOf from 'image-size';
import { getImageData, handleAxios } from './docxtemplater-utils';
import fs from 'fs';
import path from 'path';
import { renderHtmlContent } from './htmlRender';

interface Option {
  label: string;
  value: string | number;
}

// 判断选项中是否存在 "其他" 选项
function hasOtherOption(options: Option[]): boolean {
  return options.filter(op => op.value === '|OTHER|').length > 0;
}
// 获取“其他”选项对应input框的输入值
function getOtherValue(options: Option[], input: any) {
  let value = '';
  const optionsObj = _.keyBy(options, 'value');
  input.forEach((val: string) => {
    if (!optionsObj[val]) value = val;
  });
  return value;
}
// 处理 单选/复选/下拉/级联 组件，根据 value 获取对应的 label
function handleLabel(input: any, ...field: any) {
  const vMode = field[0];
  const fieldsArr = field[1].fields;
  const separator = field[2] || '、'; // 可选参数  多选时的分隔符号
  const curField = fieldsArr.find((item: any) => item.__vModel__ === vMode);
  let label;
  let otherValue;
  if (curField) {
    const curTag = curField.__config__.tag;
    if (curTag === 'sobey-radio') {
      // 单选
      const options = curField.options || [];
      const curOption = options.find((item: any) => item.value === input);
      label = curOption?.label;
      if (!label && hasOtherOption(options)) {
        label = input;
        otherValue = input;
      }
    } else if (curTag === 'sobey-checkbox') {
      // 复选
      const options = curField.options || [];
      const curOptions = _.filter(
        options,
        item => input.indexOf(item.value) > -1,
      );
      const curLabels = _.map(curOptions, 'label');
      if (curOptions.length < input.length && hasOtherOption(options)) {
        otherValue = getOtherValue(options, input);
        if (otherValue) curLabels.push(otherValue);
      }
      label = curLabels.join(separator);
    } else if (curTag === 'sobey-selector') {
      // 下拉
      const options = curField.__slot__?.options || [];
      const curOptions = _.filter(
        options,
        item => input.indexOf(item.value) > -1,
      );
      const curLabels = _.map(curOptions, 'label');
      if (curOptions.length < input.length && hasOtherOption(options)) {
        otherValue = getOtherValue(options, input);
        if (otherValue) curLabels.push(otherValue);
      }
      label = curLabels.join(separator);
    } else if (curTag === 'sobey-cascade') {
      // 级联
      const options = curField.__slot__?.options || [];
      const inputArr = input[0] ? input[0].split('|') : [];
      if (inputArr.length) {
        label = getLabelLoop(inputArr, options) || '';
      }
    }
  }
  return { label, otherValue };
}
function getLabelLoop(inputArr: string[], options: any[]): string {
  const value = inputArr.shift();
  const curOption = options.find((item: any) => item.value === value);
  const label = curOption?.label || '';
  if (!inputArr.length) {
    return label;
  }
  return label + '/' + getLabelLoop(inputArr, curOption.children);
}
expressions.filters.getLabel = function(input: any, ...field: any) {
  // This condition should be used to make sure that if your input is
  // undefined, your output will be undefined as well and will not
  // throw an error
  if (input === undefined || input === null) return '';
  const res = handleLabel(input, ...field);
  return res.label;
};
expressions.filters.formatDate = function(input: any, format: any) {
  if (!input) return input;
  return dayjs(input).format(format);
};
expressions.filters.formatTime = function(input: any, format: any) {
  if (!input) return input;
  const _date = '2021-11-11';
  return dayjs(_date + input).format(format);
};
expressions.filters.isSelectedLabel = function(
  input: any,
  vMode: string,
  define: any,
  label: string,
  selected: any = '',
  unselected: any = '',
  separator = '、',
) {
  if (!input) return unselected;
  const res = handleLabel(input, vMode, define, separator);
  const otherValue = res.otherValue;
  const lableString = res.label;
  if (otherValue && label === '|OTHER|') return selected;
  if (otherValue && label === '|OTHERVALUE|') return otherValue;
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
expressions.filters.isSelected = function(input: any, key: number | string) {
  if (!input) return input;
  if (!Array.isArray(input)) return false;
  return input.includes(key);
};
expressions.filters.getAddress = function(input: any) {
  if (!input) return input;
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  const val = data?.region.filter((r: any) => r).map((r: any) => r.name) || [];
  if (data?.detail) {
    val.push(data.detail);
  }

  return val.join('/');
};
const echartStr = fs.readFileSync(path.resolve(__dirname, '../public/js/echarts.min.js'), 'utf-8');
const templates = [
  "<!DOCTYPE html><html lang='en' style='height: 100%'><head><meta charset='UTF-8'><meta http-equiv='X-UA-Compatible' content='IE=edge'><meta name='viewport' content='width=device-width, initial-scale=1.0'><title>Document</title></head><body style='height: 100%; margin: 0'><div id='container' style='height: 100%'></div></body><script type='text/javascript'>"+echartStr+"</script><script type='text/javascript'>var dom = document.getElementById('container');var myChart = echarts.init(dom);var app = {};var option = null;option = ",
  ";if (option && typeof option === 'object') {myChart.setOption(option, true);}</script></html>",
];
expressions.filters.renderEchart = function(input: any) {
  if (!input) return '';
  // console.log('getEchart', input, vMode, JSON.parse(options))
  // const optionCfg = { ...JSON.parse(options), series: input };
  return {
    type: 'echart',
    data: templates[0] + JSON.stringify(input) + templates[1],
  };
};
expressions.filters.renderHtml = function(input: any) {
  if (!input) return '';
  return { type: 'html', data: input };
};
expressions.filters.getImage = function(input: any, maxSize: number) {
  if (!input) return input;
  console.log('getImage', input, maxSize);
  return input;
};
function angularParser(tag: string) {
  tag = tag
    .replace(/^\.$/, 'this')
    .replace(/(’|‘|`)/g, "'")
    .replace(/(“|”)/g, '"');
  const expr = expressions.compile(tag);
  return {
    get: function(scope: any, context: any) {
      let obj = {};
      const index = _.last(context.scopePathItem);
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
function replaceErrors(key: any, value: any) {
  if (value instanceof Error) {
    return Object.getOwnPropertyNames(value).reduce(function(
      error: any,
      key: any,
    ) {
      error[key] = (value as any)[key];
      return error;
    },
    {});
  }
  return value;
}

function errorHandler(error: any) {
  console.log(JSON.stringify({ error: error }, replaceErrors));

  if (error.properties && error.properties.errors instanceof Array) {
    const errorMessages = error.properties.errors
      .map(function(error: any) {
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
function nullGetter(part: DXT.Part) {
  console.log('nullgetter', part);
  if (!part.module) {
    return '';
  }
  if (part.module === 'rawxml') {
    return '';
  }
  return '';
}

function getImgSize(img: Buffer) {
  try {
    let { width = 595, height = 842 } = sizeOf(img);
    if (width > 595) width = 595;
    if (height > 842) height = 842;
    return [width, height];
  } catch (error) {
    console.error('getImgSize error ', error);
    return [595, 842];
  }
}

export async function handleDocxTemplater(templateData: any, data: any) {
  // Load the docx file as binary content
  // const content = fs.readFileSync(path.resolve(__dirname, filePath), "binary");
  const content = templateData;
  const imageModule = new ImageModule({
    centered: false,
    getImage: function(tagValue: any, tagName: string) {
      // console.log('getImage ', tagValue, tagName)
      if (!tagValue) return '';
      if (typeof tagValue === 'object' && tagValue.type === 'echart') {
        // console.log('a-----', fs.readFileSync(path.resolve(__dirname, '002.html')))
        return new Promise(resolve => {
          console.log('3 ', Date());
          renderHtmlContent(tagValue.data)
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
      } else if (typeof tagValue === 'object' && tagValue.type === 'html') {
        return new Promise(resolve => {
          renderHtmlContent(tagValue.data)
            .then(data => {
              // console.log('getHTMLData', data);
              return resolve(data);
            })
            .catch(err => {
              console.log('getHTMLAsync get error ', err);
              return resolve('');
            });
        });
      } else if (typeof tagValue === 'string') {
        return new Promise(resolve => {
          getImageData(tagValue, path.basename(tagValue))
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
    getSize: function(img: any, tagValue: any, tagName: string) {
      // console.log('getSize----', img, getImgSize(img));
      return getImgSize(img);
    },
  });
  const docxModule = new DocxModule({
    getDocx: function(tagValue: string) {
      // console.log('tagValue', tagValue)
      return new Promise((resolve, reject) => {
        // if (fs.existsSync(tagValue)) {
        //   console.log(path.resolve(__dirname, "extra.docx"))
        //   resolve(fs.createReadStream(path.resolve(__dirname, tagValue)));
        // } else {
        //   reject(new Error("not such file or folder " + tagValue));
        // }
        handleAxios(tagValue)
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
  const zip = new PizZip(content, { checkCRC32: true });
  let doc: any;
  try {
    doc = new Docxtemplater()
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
  } catch (error) {
    // Catch compilation errors
    // (errors caused by the compilation of the template: misplaced tags)
    errorHandler(error);
  }

  try {
    // console.log(data);
    // render the document
    // (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
    // doc.render(data);
    await doc.renderAsync(data);
  } catch (error) {
    // Catch rendering errors
    // (errors relating to the rendering of the template:
    // for example when the angularParser throws an error)
    errorHandler(error);
  }

  const buf = doc.getZip().generateNodeStream({ streamFiles: true });

  // fs.writeFileSync(path.resolve(__dirname, "output-docx.docx"), buf);
  return buf;
}
