const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const chromium = require('chromium');
require('chromedriver');

import {GenerateTokenOptions} from './generate-token-options.model';

function timeout(timer) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, timer);
    });
}

export function isAvailable(): boolean {
    return true;
}

export async function generateToken(commandOptions: GenerateTokenOptions): Promise<string> {

    const url = `${commandOptions.url}/user/${commandOptions.username}/configure`;

    const driver = await buildDriver();

    await driver.get(url);

    await timeout(1000);

    await driver.executeScript((user: string, pwd: string) => {
        document.querySelector<HTMLInputElement>('input[name=j_username]').value = user;
        document.querySelector<HTMLInputElement>('input[name=j_password]').value = pwd;
        document.querySelector<HTMLInputElement>('input.submit-button').click();

        return user + ':' + pwd;
    }, commandOptions.username, commandOptions.password);

    await timeout(2000);

    const buttonClicked = await driver.executeScript(() => {
        const button = document.getElementById('yui-gen2-button');
        if (button) {
            button.click();
        }

        return !!button;
    });

    if (!buttonClicked) {
        const content = await driver.getPageSource();
        console.log('content ', content);
        await driver.quit();

        throw new Error('Unable to login');
    }

    await timeout(500);

    await driver.executeScript(() => {
        document.querySelector<HTMLInputElement>('input[name=tokenName]').value = 'pipeline-token';
        document.querySelector<HTMLButtonElement>('.token-save button').click();
    });

    await timeout(1000);

    const tokenValue: string = await driver.executeScript(() => {
        const tokenElement = document.querySelector('.new-token-value');
        return tokenElement.innerHTML;
    });

    await driver.quit();

    return tokenValue;
}

async function buildDriver() {

    const service = new chrome.ServiceBuilder(chromium.path).build();
    chrome.setDefaultService(service);

    const options = new chrome.Options()
      .setChromeBinaryPath(chromium.path)
      .addArguments('--headless')
      .addArguments('--disable-gpu')
      .addArguments('--window-size=1280,960')
      .headless();

    return await new webdriver.Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
}
