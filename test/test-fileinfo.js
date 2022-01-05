const path = require("path");
const fsp = require('fs/promises');
const test = require("ava");
const FileInfo = require("../src/fileinfo");

async function getFileInfo(resource, options = {}) {
  const resourcePath = path.resolve(__dirname, resource); // make absolute path
  const filePath = resourcePath.split(/[?#]/)[0]; // remove query string

  const buffer = await fsp.readFile(filePath, { encoding: 'utf8' });

  return new FileInfo(resourcePath, buffer, options);
}

test("Simple local file optimization without query params", async t => {
  // simulate a simple image optimization (keep filename)
  // eleventy-img normalizes jpg to jpeg
  const testResource = './images/test.jpg';
  const expectedFilename = 'test.jpeg';

  let fileInfo = await getFileInfo(testResource, {
    fetchFileExt: 'fetch',
    rename: '[oldname]'
  });

  // expected result stats from eleventy-img after image processing
  let finalPath = fileInfo.finalPath({
    width: 2400,
    height: 1600,
    format: 'jpeg'
  });

  t.is(fileInfo.getParam('width'), null);
  t.is(fileInfo.resourceId.length, 32);
  t.is(fileInfo.isFetchFile, false);
  t.is(fileInfo.fetchData, null);
  t.is(fileInfo.fromExt, 'jpg');
  t.is(fileInfo.toWidth, null);
  t.is(fileInfo.toHeight, null);
  t.is(fileInfo.toFormat, null);
  t.is(path.basename(finalPath), expectedFilename);
});

test("Local file conversion with query params and renaming", async t => {
  // simulate convert, resize and rename using query params
  const testResource = './images/test.jpg?format=webp&width=800';
  const expectedFilename = 'test-800w-533h.webp';

  let fileInfo = await getFileInfo(testResource, {
    fetchFileExt: 'fetch',
    rename: '[oldname]-[width]w-[height]h'
  });

  // expected result stats from eleventy-img after image processing
  let finalPath = fileInfo.finalPath({
    width: 800,
    height: 533,
    format: 'webp'
  });

  t.is(fileInfo.getParam('width'), '800');
  t.is(fileInfo.resourceId.length, 32);
  t.is(fileInfo.isFetchFile, false);
  t.is(fileInfo.fetchData, null);
  t.is(fileInfo.fromExt, 'jpg');
  t.is(fileInfo.toWidth, '800');
  t.is(fileInfo.toHeight, null);
  t.is(fileInfo.toFormat, 'webp');
  t.is(path.basename(finalPath), expectedFilename);
});