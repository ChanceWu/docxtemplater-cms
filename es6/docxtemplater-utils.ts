import axios from 'axios';
import path from 'path';
import fs from 'fs';
import gm from 'gm';
import { Readable } from 'stream';
import { WriteImageResponse } from 'pdf2pic/dist/types/writeImageResponse';
import { fromPath } from 'pdf2pic';

const UNSUPPORTED_FORMAT = '../public/images/UNSUPPORTED_FORMAT.png';
const DOWNLOAD_FAILURE = '../public/images/DOWNLOAD_FAILURE.png';
const OVERSIZE_PDF = '../public/images/OVERSIZE_PDF.png';

export const getImageData = async (_path: string, name: string) => {
  // 利用 split 去除链接参数部分，避免干扰对文件类型的判断
  const url = _path.split('?')[0];
  // 过滤非图片和pdf的附件请求
  if (/\.(jpg|jpeg|png|gif|bmp|pic|svg|pdf)$/i.test(url)) {
    const stream = await handleAxios(_path);
    // 如果附件请求出错则跳过后续操作
    if (stream) {
      // 保存源文件
      const filePath = await saveStream2Temp(stream, name);
      // 判断资源是否是pdf，如果是pdf需要特殊处理转换为图片
      if (url.includes('.pdf')) {
        const bool = await isFileOverSize(filePath);
        if (bool) {
          const dir = path.resolve(__dirname, OVERSIZE_PDF);
          return fs.readFileSync(dir);
        } else {
          const imgPaths = await handlePdf2pic(name, filePath);
          const imgBufList: Buffer[] = [];
          imgPaths.forEach(imgpath => {
            if (imgpath) imgBufList.push(fs.readFileSync(imgpath));
          });
          return imgBufList.length ? imgBufList : '';
        }
      } else {
        return fs.readFileSync(filePath);
      }
    }
    const dir = path.resolve(__dirname, DOWNLOAD_FAILURE);
    return fs.readFileSync(dir);
  } else {
    const dir = path.resolve(__dirname, UNSUPPORTED_FORMAT);
    return fs.readFileSync(dir);
  }
};
/**
 * @function 请求附件资源
 * @param url {string} 附件请求地址
 * @returns 文件流
 */
export const handleAxios = async (url: string) => {
  try {
    const { data } = await axios.get<Readable>(encodeURI(url), {
      responseType: 'stream',
    });
    return data;
  } catch (error) {
    console.error('get attachment-stream error ', error);
    return '';
  }
};
/**
 * @function 保存数据流到临时目录下，返回存储数据的路径
 * @param stream {Readable} 附件文件流
 * @param name {string} 附件名
 * @returns 附件本地存储路径
 */
const saveStream2Temp = async (stream: Readable, name: string) => {
  // 创建源数据存放目录
  const sourceDir = path.resolve(__dirname, 'template-images/source');
  await createTemp(sourceDir);
  const filePath = `${sourceDir}/${name}`;
  // 写入流
  return new Promise<string>(resolve => {
    const ws = fs.createWriteStream(filePath);
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
};
/**
 * @function 文件是否超过1MB
 * @param filePath {string} 本地pdf暂存地址
 * @returns {boolean}
 */
const isFileOverSize = async (filePath: string) => {
  return new Promise<boolean>(resolve => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        console.error('getFileSize get error ', err);
        return resolve(true); // 发生错误视为体积过大
      }
      // const bool = stats.size > 1048576; // 不超过 1MB
      const bool = stats.size > 5242880; // 不超过 5MB
      return resolve(bool);
    });
  });
};
/**
 * @function 将buffer格式的pdf文件转换为png格式的图片，缓存至template-images文件夹下
 * @param name {string} 文件名
 * @param filePath {string} PDF文档本地存储路径
 * @returns 转化为图片后的本地存储路径数组
 */
const handlePdf2pic = async (name: string, filePath: string) => {
  const pdfBuf = await readFile(filePath);
  // 获取PDF资源的宽高
  const size = await new Promise<gm.Dimensions>(resolve => {
    gm(pdfBuf).size(function(err, size) {
      if (err) {
        console.error('can not get pdf size ', err);
        resolve({ width: 595, height: 842 });
      } else {
        resolve(size);
      }
    });
  });
  const outputDir = path.resolve(__dirname, `template-images/${name}`);
  await createTemp(outputDir);
  const options = {
    density: 100,
    saveFilename: 'tmpImg',
    savePath: outputDir,
    format: 'png',
    width: size.width || 595,
    height: size.height || 842,
  };
  try {
    const pdfPage = await getPdfPage(pdfBuf);
    let curPage = 0;
    const imgPaths = [];
    while (curPage < pdfPage) {
      curPage++;
      const convert = await fromPath(filePath, options);

      const data = await convert(curPage);
      imgPaths.push((data as WriteImageResponse).path);
    }
    return imgPaths || [];
  } catch (error) {
    console.error('handle pdf2pic get error ', error);
    return [];
  }
};
/**
 * @function 创建临时目录
 * @param outputDirectory {string} 创建路径
 */
const createTemp = async (outputDirectory: string) => {
  return new Promise<void>(resolve => {
    fs.mkdir(outputDirectory, () => {
      resolve();
    });
  });
};
async function readFile(filePath: string) {
  return new Promise<Buffer>(resolve => {
    fs.readFile(filePath, {}, (err, data) => {
      if (err) {
        console.error('read file get err ', err);
        return resolve(Buffer.from([]));
      }
      return resolve(data);
    });
  });
}
/**
 * @function 获取PDF文件的总页数
 * @param pdfBuf {Buffer}
 */
async function getPdfPage(pdfBuf: Buffer) {
  return new Promise<number>(resolve => {
    gm(pdfBuf).identify('%p ', (error, data) => {
      if (error) {
        console.error('gm().identify get error ', error);
        return resolve(0);
      }
      try {
        const pdfPage = data.replace(/^[\w\W]*?1/, '1').split(' ').length || 0;
        return resolve(pdfPage);
      } catch (err) {
        console.error('parsing pdfPage get err ', err);
        return resolve(0);
      }
    });
  });
}
