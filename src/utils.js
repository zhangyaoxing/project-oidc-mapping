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

/**
 * 
 * @param {string} projectName Ops Manager project name
 * @returns {Promise<Array<{role: string, db: string, groupName: string}>>} OIDC groups
 */
async function projectNameToOIDCGroup(projectName) {
    const config = await loadConfig();
    const roles = config.roles || [];
    const groups = [];

    console.log(`Mapping project name "${chalk.green(projectName)}" to OIDC groups...`);
    for (const { prefix, role, db } of roles) {
        const pNameConverted = projectName.toLowerCase().replace(/\s+/g, '_');
        const groupName = `${prefix}${pNameConverted}`;
        groups.push({
            role: role,
            db: db,
            groupName: groupName,
        });
        console.log(`Mapped OIDC group ${chalk.green(groupName)} with role ${chalk.green(role)} on db ${chalk.green(db)}`);
    }
    return groups;
}

export {
    projectNameToOIDCGroup,
    loadConfig,
};