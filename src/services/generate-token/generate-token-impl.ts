import {Container} from 'typescript-ioc';
import {Browser, JSHandle, launch, Page} from 'puppeteer';

import {GenerateToken} from './generate-token';
import {GenerateTokenOptions} from './generate-token-options.model';
import {timer} from '../../util/timer';

export class GenerateTokenImpl implements GenerateToken {

  isAvailable(): boolean {
    return true;
  }

  async generateToken(commandOptions: GenerateTokenOptions, notifyStatus: (status: string) => void = () => {
  }): Promise<string> {

    const loginUrl = `${commandOptions.url}/login`;
    const url = `${commandOptions.url}/user/${commandOptions.username}/configure`;

    const browser: Browser = await this.buildDriver();

    try {
      const page: Page = await browser.newPage();

      notifyStatus(`Logging into Jenkins: ${loginUrl}`);

      await this.login(page, loginUrl, commandOptions.username, commandOptions.password);

      await timer(2000);

      notifyStatus(`Generating token`);

      return await this.genToken(page, url);
    } finally {
      await browser.close();
    }
  }

  async buildDriver() {
    return launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async login(page: Page, loginUrl: string, username: string, password: string) {
    try {
      await page.goto(loginUrl);
    } catch (err) {
      await timer(3000);

      await page.goto(loginUrl);
    }

    await timer(2000);

    await page.evaluateHandle((user: string, pwd: string) => {
      document.querySelector<HTMLInputElement>('input[name=j_username]').value = user;
      document.querySelector<HTMLInputElement>('input[name=j_password]').value = pwd;
      document.querySelector<HTMLInputElement>('input.submit-button').click();

      return user + ':' + pwd;
    }, username, password);
  }

  async genToken(page: Page, url: string): Promise<string> {

    await page.goto(url);

    await timer(2000);

    const buttonHandle: JSHandle = await page.evaluateHandle(() => {
      const button = document.getElementById('yui-gen2-button');
      if (button) {
        button.click();
      }

      return !!button;
    });

    const buttonClicked: boolean = (await buttonHandle.jsonValue()) as any;
    if (!buttonClicked) {
      const content = await page.browserContext();
      console.log('content ', content);

      throw new Error('Unable to login');
    }

    await timer(500);

    await page.evaluateHandle(() => {
      document.querySelector<HTMLInputElement>('input[name=tokenName]').value = 'pipeline-token';
      document.querySelector<HTMLButtonElement>('.token-save button').click();
    });

    await timer(1000);

    const tokenHandle: JSHandle = await page.evaluateHandle(() => {
      const tokenElement = document.querySelector('.new-token-value');
      return tokenElement.innerHTML;
    });

    return (await tokenHandle.jsonValue()) as string;
  }
}

export async function generateToken(commandOptions: GenerateTokenOptions, notifyStatus: (status: string) => void = () => {
}): Promise<string> {
  return (Container.get(GenerateToken) as GenerateToken).generateToken(commandOptions, notifyStatus);
}
