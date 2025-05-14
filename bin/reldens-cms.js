#!/usr/bin/env node

/**
 *
 * Reldens - CMS - CLI Installer
 *
 */

const { Manager } = require('../index');

let args = process.argv.slice(2);
let projectRoot = args[0] || './';

let manager = new Manager({
    projectRoot
});

manager.start().catch((error) => {
    console.error('Failed to start CMS:', error);
    process.exit(1);
});
