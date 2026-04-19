const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const enginePath = path.resolve(__dirname, "..", "blackpine-engine");

config.watchFolders = [enginePath];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(enginePath, "node_modules"),
];

module.exports = config;const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

const enginePath = path.resolve(__dirname, "packages", "engine");

config.watchFolders = [enginePath];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(enginePath, "node_modules"),
];

module.exports = config;