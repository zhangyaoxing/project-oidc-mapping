import { cosmiconfig } from 'cosmiconfig';
import chalk from 'chalk';

// The following files will be searched in order for configuration, stopping at the first match:
// - "po-mapping" in package.json
// - .po-mappingrc (JSON or YAML)
// - .po-mappingrc.json / .po-mappingrc.yaml / .po-mappingrc.js
// - po-mapping.config.js (ESM or CommonJS)
const explorer = cosmiconfig('po-mapping');

async function loadConfig() {
    try {
        const result = await explorer.search();

        if (result) {
            console.log(chalk.green(`Loaded configuration file: ${result.filepath}`));
            return result.config;
        } else {
            console.log(chalk.yellow('No configuration file found, using default configuration.'));
            return {
                roles: [{
                    prefix: "read_",
                    role: "readAnyDatabase",
                    db: "admin",
                }, {
                    prefix: "write_",
                    role: "readWriteAnyDatabase",
                    db: "admin",
                }]
            };
        }
    } catch (error) {
        console.error(chalk.red('Error parsing configuration file:'), error);
        process.exit(1);
    }
}

function projectNameToOIDCGroup(projectName) {
    const config = loadConfig();
    const roles = config.roles || [];
    const groups = [];

    for (const { prefix, role, db } of roles) {
        const pNameConverted = projectName.toLowerCase().replace(/\s+/g, '_');
        groups.push(`${prefix}${pNameConverted}`);
    }
    // TODO: create roles in Ops Manager if they don't exist, using the specified role and db from config
    console.log(`Mapped project name "${projectName}" to OIDC groups: ${chalk.green(groups.join(', '))}`);
    return groups;
}

module.exports = {
  projectNameToOIDCGroup,
  loadConfig,
};