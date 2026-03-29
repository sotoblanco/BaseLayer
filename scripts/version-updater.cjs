module.exports.readVersion = function (contents) {
  // For .toml
  const tomlMatch = contents.match(/^version = "(.*?)"/m);
  if (tomlMatch) return tomlMatch[1];
  
  // For .env
  const envMatch = contents.match(/^VITE_APP_VERSION=(.*?)$/m);
  if (envMatch) return envMatch[1];
  
  return '0.1.0';
};

module.exports.writeVersion = function (contents, version) {
  // Update pyproject.toml
  if (contents.includes('version = "')) {
    return contents.replace(/^version = ".*?"/m, `version = "${version}"`);
  }
  
  // Update .env
  if (contents.includes('VITE_APP_VERSION=')) {
    return contents.replace(/^VITE_APP_VERSION=.*?$/m, `VITE_APP_VERSION=${version}`);
  }
  
  return contents;
};
