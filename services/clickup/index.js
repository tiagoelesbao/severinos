/**
 * Virals ClickUp Service Entrypoint
 */

const client = require('./client');
const mapping = require('./mapping');
const tasks = require('./tasks');
const sprints = require('./sprints');
const folders = require('./folders');

module.exports = {
    client,
    mapping,
    tasks,
    sprints,
    folders,
    setCustomField: tasks.setCustomField
};
