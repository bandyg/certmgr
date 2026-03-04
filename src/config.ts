import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface ServerConfig {
  host: string;
  port: number;
  apiKey: string;
}

export interface StorageConfig {
  basePath: string;
  certsDir: string;
  metadataDir: string;
}

export interface LoggingConfig {
  level: string;
  pattern: string;
  fileName: string;
}

export interface Config {
  server: ServerConfig;
  storage: StorageConfig;
  logging: LoggingConfig;
}

let config: Config | null = null;

export function loadConfig(configPath?: string): Config {
  if (config) return config;

  const path = configPath || join(process.cwd(), 'config.yaml');
  
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }

  const fileContent = readFileSync(path, 'utf-8');
  config = parse(fileContent) as Config;
  
  ensureDirectories(config.storage);
  
  return config;
}

function ensureDirectories(storage: StorageConfig): void {
  const dirs = [
    join(storage.basePath, storage.certsDir),
    join(storage.basePath, storage.metadataDir),
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }
}

export function getConfig(): Config {
  if (!config) {
    return loadConfig();
  }
  return config;
}
