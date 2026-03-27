import { OpsManagerClient } from './client.js';
import { projectNameToOIDCGroup } from './utils.js';
import chalk from 'chalk';

async function getAllProjects(baseUrl) {
    const client = new OpsManagerClient(baseUrl);
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

async function mapOIDC4Projects(baseUrl) {
    const projects = await getAllProjects(baseUrl);
    for (const p of projects) {
        console.log(`Mapping OIDC groups for project ${chalk.green(p.projectName)} (ID: ${chalk.green(p.projectId)}) in org (ID: ${chalk.green(p.orgId)})...`);
        const oidcGroups = await projectNameToOIDCGroup(p.projectName);
        let automationConfig = await client.getAutomationConfig(p.projectId);
    }
}

export {
    getAllProjects,
    mapOIDC4Projects,
}