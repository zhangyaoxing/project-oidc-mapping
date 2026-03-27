import { cosmiconfig } from 'cosmiconfig';
import chalk from 'chalk';

// The following files will be searched in order for configuration, stopping at the first match:
// - "po-mapping" in package.json
// - .po-mappingrc (JSON or YAML)
// - .po-mappingrc.json / .po-mappingrc.yaml / .po-mappingrc.js
// - po-mapping.config.js (ESM or CommonJS)
const explorer = cosmiconfig('po-mapping');

/**
 * Load the configuration for the project.
 * @returns {Promise<object>} The configuration object
 */
async function loadConfig() {
    try {
        const result = await explorer.search();

        if (result) {
            console.log(chalk.green(`Loaded configuration file: ${result.filepath}`));
            return result.config;
        } else {
            console.log(chalk.yellow('No configuration file found, using default configuration.'));
            return {
                authPrefix: 'okta',
                roles: [{
                    prefix: "read_",
                    role: "read",
                }, {
                    prefix: "write_",
                    role: "readWrite",
                }]
            };
        }
    } catch (error) {
        console.error(chalk.red('Error parsing configuration file:'), error);
        process.exit(1);
    }
}

export {
    loadConfig,
};