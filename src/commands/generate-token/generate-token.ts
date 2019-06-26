import {Browser, JSHandle, launch, Page} from 'puppeteer';

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

  const loginUrl = `${commandOptions.url}/login`;
  const url = `${commandOptions.url}/user/${commandOptions.username}/configure`;

  const browser: Browser = await buildDriver();

  try {
    const page: Page = await browser.newPage();

    await login(page, loginUrl, commandOptions.username, commandOptions.password);

    await timeout(2000);

    return await genToken(page, url);
  } finally {
    await browser.close();
  }
}

async function buildDriver() {
  return launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

async function login(page: Page, loginUrl: string, username: string, password: string) {
  await page.goto(loginUrl);

  await timeout(1000);

  await page.evaluateHandle((user: string, pwd: string) => {
    document.querySelector<HTMLInputElement>('input[name=j_username]').value = user;
    document.querySelector<HTMLInputElement>('input[name=j_password]').value = pwd;
    document.querySelector<HTMLInputElement>('input.submit-button').click();

    return user + ':' + pwd;
  }, username, password);
}

async function genToken(page: Page, url: string): Promise<string> {

  await page.goto(url);

  await timeout(2000);

  const buttonHandle: JSHandle = await page.evaluateHandle(() => {
    const button = document.getElementById('yui-gen2-button');
    if (button) {
      button.click();
    }

    return !!button;
  });

  const buttonClicked: boolean = await buttonHandle.jsonValue();
  if (!buttonClicked) {
    const content = await page.browserContext();
    console.log('content ', content);

    throw new Error('Unable to login');
  }

  await timeout(500);

  await page.evaluateHandle(() => {
    document.querySelector<HTMLInputElement>('input[name=tokenName]').value = 'pipeline-token';
    document.querySelector<HTMLButtonElement>('.token-save button').click();
  });

  await timeout(1000);

  const tokenHandle: JSHandle = await page.evaluateHandle(() => {
    const tokenElement = document.querySelector('.new-token-value');
    return tokenElement.innerHTML;
  });

  return (await tokenHandle.jsonValue()) as string;
}
