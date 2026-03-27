import { OpsManagerClient } from './client.js';
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
    return projects.map(p => {
        console.log(chalk.blue(`Mapping OIDC groups for project ${p.projectName} (ID: ${p.projectId}) in org (ID: ${p.orgId})...`));
    });
}

export {
    getAllProjects,
    mapOIDC4Projects,
}