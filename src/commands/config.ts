import chalk from 'chalk';
import { command } from 'cleye';
import * as dotenv from 'dotenv';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { parse as iniParse, stringify as iniStringify } from 'ini';
import { homedir } from 'os';
import { join as pathJoin } from 'path';

import { intro, outro } from '@clack/prompts';

import { COMMANDS } from '../CommandsEnum';
import { getI18nLocal } from '../i18n';

dotenv.config();

export enum CONFIG_KEYS {
  OCO_OPENAI_API_KEY = 'OCO_OPENAI_API_KEY',
  OCO_TOKENS_MAX_INPUT = 'OCO_TOKENS_MAX_INPUT',
  OCO_TOKENS_MAX_OUTPUT = 'OCO_TOKENS_MAX_OUTPUT',
  OCO_OPENAI_BASE_PATH = 'OCO_OPENAI_BASE_PATH',
  OCO_DESCRIPTION = 'OCO_DESCRIPTION',
  OCO_EMOJI = 'OCO_EMOJI',
  OCO_MODEL = 'OCO_MODEL',
  OCO_LANGUAGE = 'OCO_LANGUAGE',
  OCO_MESSAGE_TEMPLATE_PLACEHOLDER = 'OCO_MESSAGE_TEMPLATE_PLACEHOLDER',
  OCO_PROMPT_MODULE = 'OCO_PROMPT_MODULE',
  OCO_AI_PROVIDER = 'OCO_AI_PROVIDER',
}

export enum CONFIG_MODES {
  get = 'get',
  set = 'set'
}

export enum DEFAULT_TOKEN_LIMITS {
  DEFAULT_MAX_TOKENS_INPUT = 4096,
  DEFAULT_MAX_TOKENS_OUTPUT = 500
}

const validateConfig = (
  key: string,
  condition: any,
  validationMessage: string
) => {
  if (!condition) {
    outro(
      `${chalk.red('✖')} Unsupported config key ${key}: ${validationMessage}`
    );

    process.exit(1);
  }
};

export const configValidators = {
  [CONFIG_KEYS.OCO_OPENAI_API_KEY](value: any, config: any = {}) {
    //need api key unless running locally with ollama
    validateConfig('API_KEY', value || config.OCO_AI_PROVIDER == 'ollama', 'You need to provide an API key');
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_KEY,
      value.startsWith('sk-'),
      'Must start with "sk-"'
    );
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_API_KEY,
      config[CONFIG_KEYS.OCO_OPENAI_BASE_PATH] || value.length === 51,
      'Must be 51 characters long'
    );

    return value;
  },

  [CONFIG_KEYS.OCO_DESCRIPTION](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_DESCRIPTION,
      typeof value === 'boolean',
      'Must be true or false'
    );

    return value;
  },

  [CONFIG_KEYS.OCO_TOKENS_MAX_INPUT](value: any) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value);
      validateConfig(
        CONFIG_KEYS.OCO_TOKENS_MAX_INPUT,
        !isNaN(value),
        'Must be a number'
      );
    }
    validateConfig(
      CONFIG_KEYS.OCO_TOKENS_MAX_INPUT,
      value ? typeof value === 'number' : undefined,
      'Must be a number'
    );

    return value;
  },

  [CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT](value: any) {
    // If the value is a string, convert it to a number.
    if (typeof value === 'string') {
      value = parseInt(value);
      validateConfig(
        CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT,
        !isNaN(value),
        'Must be a number'
      );
    }
    validateConfig(
      CONFIG_KEYS.OCO_TOKENS_MAX_OUTPUT,
      value ? typeof value === 'number' : undefined,
      'Must be a number'
    );

    return value;
  },

  [CONFIG_KEYS.OCO_EMOJI](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_EMOJI,
      typeof value === 'boolean',
      'Must be true or false'
    );

    return value;
  },

  [CONFIG_KEYS.OCO_LANGUAGE](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_LANGUAGE,
      getI18nLocal(value),
      `${value} is not supported yet`
    );
    return getI18nLocal(value);
  },

  [CONFIG_KEYS.OCO_OPENAI_BASE_PATH](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_OPENAI_BASE_PATH,
      typeof value === 'string',
      'Must be string'
    );
    return value;
  },

  [CONFIG_KEYS.OCO_MODEL](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_MODEL,
      [
        'gpt-3.5-turbo',
        'gpt-4',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-0613',
        'gpt-4-1106-preview'
      ].includes(value),
      `${value} is not supported yet, use 'gpt-4', 'gpt-3.5-turbo-16k' (default), 'gpt-3.5-turbo-0613', 'gpt-3.5-turbo' or 'gpt-4-1106-preview'`
    );
    return value;
  },
  [CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_MESSAGE_TEMPLATE_PLACEHOLDER,
      value.startsWith('$'),
      `${value} must start with $, for example: '$msg'`
    );
    return value;
  },

  [CONFIG_KEYS.OCO_PROMPT_MODULE](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_PROMPT_MODULE,
      ['conventional-commit', '@commitlint'].includes(value),
      `${value} is not supported yet, use '@commitlint' or 'conventional-commit' (default)`
    );

    return value;
  },

  [CONFIG_KEYS.OCO_AI_PROVIDER](value: any) {
    validateConfig(
      CONFIG_KEYS.OCO_AI_PROVIDER,
      [
        '',
        'openai',
        'ollama'
      ].includes(value),
      `${value} is not supported yet, use 'ollama' or 'openai' (default)`
    );
    return value;
  },
};

export type ConfigType = {
  [key in CONFIG_KEYS]?: any;
};

const configPath = pathJoin(homedir(), '.opencommit');

export const getConfig = (): ConfigType | null => {
  const configFromEnv = {
    OCO_OPENAI_API_KEY: process.env.OCO_OPENAI_API_KEY,
    OCO_TOKENS_MAX_INPUT: process.env.OCO_TOKENS_MAX_INPUT
      ? Number(process.env.OCO_TOKENS_MAX_INPUT)
      : undefined,
    OCO_TOKENS_MAX_OUTPUT: process.env.OCO_TOKENS_MAX_OUTPUT
      ? Number(process.env.OCO_TOKENS_MAX_OUTPUT)
      : undefined,
    OCO_OPENAI_BASE_PATH: process.env.OCO_OPENAI_BASE_PATH,
    OCO_DESCRIPTION: process.env.OCO_DESCRIPTION === 'true' ? true : false,
    OCO_EMOJI: process.env.OCO_EMOJI === 'true' ? true : false,
    OCO_MODEL: process.env.OCO_MODEL || 'gpt-3.5-turbo-16k',
    OCO_LANGUAGE: process.env.OCO_LANGUAGE || 'en',
    OCO_MESSAGE_TEMPLATE_PLACEHOLDER:
      process.env.OCO_MESSAGE_TEMPLATE_PLACEHOLDER || '$msg',
    OCO_PROMPT_MODULE: process.env.OCO_PROMPT_MODULE || 'conventional-commit',
    OCO_AI_PROVIDER: process.env.OCO_AI_PROVIDER || 'openai'
  };

  const configExists = existsSync(configPath);
  if (!configExists) return configFromEnv;

  const configFile = readFileSync(configPath, 'utf8');
  const config = iniParse(configFile);

  for (const configKey of Object.keys(config)) {
    if (
      !config[configKey] ||
      ['null', 'undefined'].includes(config[configKey])
    ) {
      config[configKey] = undefined;
      continue;
    }
    try {
      const validator = configValidators[configKey as CONFIG_KEYS];
      const validValue = validator(
        config[configKey] ?? configFromEnv[configKey as CONFIG_KEYS],
        config
      );

      config[configKey] = validValue;
    } catch (error) {
      outro(`Unknown '${configKey}' config option.`);
      outro(
        `Manually fix the '.env' file or global '~/.opencommit' config file.`
      );
      process.exit(1);
    }
  }

  return config;
};

export const setConfig = (keyValues: [key: string, value: string][]) => {
  const config = getConfig() || {};

  for (const [configKey, configValue] of keyValues) {
    if (!configValidators.hasOwnProperty(configKey)) {
      throw new Error(`Unsupported config key: ${configKey}`);
    }

    let parsedConfigValue;

    try {
      parsedConfigValue = JSON.parse(configValue);
    } catch (error) {
      parsedConfigValue = configValue;
    }

    const validValue =
      configValidators[configKey as CONFIG_KEYS](parsedConfigValue);
    config[configKey as CONFIG_KEYS] = validValue;
  }

  writeFileSync(configPath, iniStringify(config), 'utf8');

  outro(`${chalk.green('✔')} Config successfully set`);
};

export const configCommand = command(
  {
    name: COMMANDS.config,
    parameters: ['<mode>', '<key=values...>']
  },
  async (argv) => {
    intro('opencommit — config');
    try {
      const { mode, keyValues } = argv._;

      if (mode === CONFIG_MODES.get) {
        const config = getConfig() || {};
        for (const key of keyValues) {
          outro(`${key}=${config[key as keyof typeof config]}`);
        }
      } else if (mode === CONFIG_MODES.set) {
        await setConfig(
          keyValues.map((keyValue) => keyValue.split('=') as [string, string])
        );
      } else {
        throw new Error(
          `Unsupported mode: ${mode}. Valid modes are: "set" and "get"`
        );
      }
    } catch (error) {
      outro(`${chalk.red('✖')} ${error}`);
      process.exit(1);
    }
  }
);
