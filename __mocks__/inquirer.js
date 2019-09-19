'use strict';

console.log('Loaded inquirer module');
const inquirer = jest.genMockFromModule('inquirer');

module.exports = inquirer;
