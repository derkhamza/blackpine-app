const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const enginePath = path.resolve(__dirname, "packages", "engine");

config.watchFolders = [enginePath];

module.exports = config;