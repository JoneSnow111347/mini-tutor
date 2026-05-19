'use strict';

const fs = require('fs');
const path = require('path');

let loaded = false;

function stripWrappingQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function loadEnv() {
  if (loaded) return;

  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    loaded = true;
    return;
  }

  try {
    const dotenv = require('dotenv');
    dotenv.config({ path: envPath, override: false, quiet: true });
    loaded = true;
    return;
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
      throw error;
    }
  }

  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    const value = line.slice(separatorIndex + 1).trim();
    process.env[key] = stripWrappingQuotes(value);
  }

  loaded = true;
}

module.exports = loadEnv;
