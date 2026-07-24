const fs = require('node:fs');
const path = require('node:path');

const RECEIPT_PATH = '.rig/basic-receipt.json';

function writeReceipt(target, receipt) {
  const file = path.join(target, RECEIPT_PATH);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
}

function readReceipt(target) {
  const file = path.join(target, RECEIPT_PATH);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

module.exports = { RECEIPT_PATH, writeReceipt, readReceipt };
