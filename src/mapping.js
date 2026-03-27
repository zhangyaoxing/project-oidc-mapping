import { OpsManagerClient } from './client.js';
import { loadConfig } from './utils.js';
import chalk from 'chalk';

const config = await loadConfig();

/**
 * Get all projects from Ops Manager.
 * @param {OpsManagerClient} client Ops Manager client instance
 * @returns {Promise<Array<{orgId: string, projectName: string, projectId: string}>>} List of projects with org and project IDs
 */
async function getAllProjects(client) {
    const projects = await client.getProjects();
    const allProjects = [];
    for (const p of projects) {
        allProjects.push({
            orgId: p.orgId,
            projectName: p.name,
            projectId: p.id,
        });
    }
    return allProjects;
}

/**
 * Map an Ops Manager project name to OIDC groups based on the configuration.
 * @param {string} projectName Ops Manager project name
 * @returns {Promise<Array<{role: string, db: string, authPrefix: string, authClaim: string}>>} OIDC groups
 */
function projectNameToOIDCGroup(projectName) {
    const roles = config.roles || [];
    const groups = [];

    console.log(`Mapping project name "${chalk.green(projectName)}" to OIDC groups...`);
    for (const { prefix, role } of roles) {
        const pNameConverted = projectName.toLowerCase().replace(/\s+/g, '_');
        const dbName = projectName.toLowerCase().split(/\s+/g)[0];
        const fullDBName = `bv${dbName}adm`;
        const authClaim = `${prefix}${pNameConverted}`;
        groups.push({
            role: role,
            db: fullDBName,
            authPrefix: config.authPrefix || 'oidc/',
            authClaim: authClaim,
        });
        console.log(`Mapped OIDC group ${chalk.green(config.authPrefix)}/${chalk.green(authClaim)} with role ${chalk.green(role)} on db ${chalk.green(fullDBName)}`);
    }
    return groups;
}

/**
 * Add the OIDC groups to the automation config.
 * @param {object} config Automation config object to be modified with new roles.
 * @param {Array<{role: string, db: string, authPrefix: string, authClaim: string}>} oidcGroups OIDC groups to be added to the config.
 */
function addRoleToConfig(config, oidcGroups) {
    let roles = config.roles || [];
    for (const group of oidcGroups) {
        const fullOIDCGroup = `${group.authPrefix}/${group.authClaim}`;
        const roleExists = roles.some(r => r.role === fullOIDCGroup);
        if (roleExists) {
            console.log(chalk.yellow(`Role ${chalk.green(fullOIDCGroup)} already exists in automation config, skipping...`));
            continue;
        }
        roles.push({
            role: fullOIDCGroup,
            db: group.db,
            roles: [group.role],
        });
    }
    config.roles = roles;
}

/**
 * Map OIDC groups for all projects.
 * @param {OpsManagerClient} client Ops Manager client instance.
 */
async function mapOIDC4Projects(client) {
    const projects = await getAllProjects(client);
    for (const p of projects) {
        console.log(`Mapping OIDC groups for project ${chalk.green(p.projectName)} (ID: ${chalk.green(p.projectId)}) in org (ID: ${chalk.green(p.orgId)})...`);
        const oidcGroups = projectNameToOIDCGroup(p.projectName);
        let automationConfig = await client.getAutomationConfig(p.projectId);
        addRoleToConfig(automationConfig, oidcGroups);
        await client.putAutomationConfig(p.projectId, automationConfig);
        console.log(chalk.blue(`Successfully mapped OIDC groups for project ${chalk.green(p.projectName)}\n`));
    }
}

export {
    mapOIDC4Projects,
}
