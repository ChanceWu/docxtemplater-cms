/// <reference types="node" />
import { Readable } from 'stream';
export declare const getImageData: (_path: string, name: string) => Promise<Buffer | Buffer[] | "">;
/**
 * @function 请求附件资源
 * @param url {string} 附件请求地址
 * @returns 文件流
 */
export declare const handleAxios: (url: string) => Promise<Readable | "">;
