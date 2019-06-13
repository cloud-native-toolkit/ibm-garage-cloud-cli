import * as phantom from 'phantom';
import {GenerateTokenOptions} from './generate-token-options.model';

function timeout(timer) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () {
            resolve();
        }, timer);
    });
}

export async function generateToken(options: GenerateTokenOptions) {
    const url = `${options.url}/user/${options.username}/configure`;

    const instance = await phantom.create(['--ignore-ssl-errors=yes']);
    const page = await instance.createPage();

    const status = await page.open(url);

    await timeout(1000);

    const auth = await page.evaluate(function(user, pwd) {
        document.querySelector<HTMLInputElement>('input[name=j_username]').value = user;
        document.querySelector<HTMLInputElement>('input[name=j_password]').value = pwd;
        document.querySelector<HTMLInputElement>('input.submit-button').click();

        return user + ':' + pwd;
    }, options.username, options.password);

    await timeout(2000);

    const buttonClicked = await page.evaluate(function() {
        const button = document.getElementById('yui-gen2-button');
        if (button) {
            button.click();
        }

        return !!button;
    });

    if (!buttonClicked) {
        const content = await page.property('content');
        console.log('content ', content);
        await instance.exit();

        throw new Error('Unable to login');
    }

    await timeout(500);

    await page.evaluate(function () {
        document.querySelector<HTMLInputElement>('input[name=tokenName]').value = 'pipeline-token';
        document.querySelector<HTMLButtonElement>('.token-save button').click();
    });

    await timeout(1000);

    const tokenValue = await page.evaluate(function() {
        const tokenElement = document.querySelector('.new-token-value');
        return tokenElement.innerHTML;
    });

    await instance.exit();

    return tokenValue;
}
