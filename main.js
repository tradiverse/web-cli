import { TradiverseCli } from './node_modules/@tradiverse/cli-lib/cli-lib.js';

document.addEventListener('DOMContentLoaded', init);

const SPACE_TRADERS_AUTH_TOKEN = 'SPACE_TRADERS_AUTH_TOKEN';

async function init() {
    let cli;

    function initApi() {
        let authToken = localStorage.getItem(SPACE_TRADERS_AUTH_TOKEN);
        const httpRequest = async ({ method, url, params, headers, data }) => {
            let query = new URLSearchParams(params).toString();
            if (query) {
                query = '?' + query;
            }
            const response = await fetch(url + query, {
                method,
                headers,
                body: JSON.stringify(data),
            });
            return response.json();
        };

        const extraCommands = authToken ? {
            'LOGOUT': {
                description: 'Delete your api token.',
                usage: 'logout',
                execute: async () => {
                    localStorage.removeItem(SPACE_TRADERS_AUTH_TOKEN);
                    initApi();
                    return 'You have been logged out.'
                },
            },
        } : {
            'LOGIN': {
                description: 'Login with an existing auth token.',
                usage: 'login',
                execute: async () => {
                    const token = prompt('Enter your Space Traders auth token.');
                    if (token) {
                        localStorage.setItem(SPACE_TRADERS_AUTH_TOKEN, token);
                        initApi();
                        return 'Auth token set. You are now logged in.';
                    } else {
                        return 'Invalid auth token.';
                    }
                },
            },
        };

        cli = new TradiverseCli({ authToken, httpRequest, extraCommands });
    }
    initApi();

    const cliInput = document.getElementById('cli-input');
    const cliTerminal = document.getElementById('cli-terminal');
    function addRowToTerminal(text) {
        const inputElement = document.createElement('div');
        inputElement.textContent = text;
        cliTerminal.appendChild(inputElement);
        cliTerminal.scrollTo(0, cliTerminal.scrollHeight);
    }
    cliInput.focus();
    addRowToTerminal('Enter a command...');

    let historyIdx = -1;
    let allowHistory = true;
    const commandHistory = [];

    cliInput.addEventListener('input', e => {
        allowHistory = cliInput.value === '';
    });
    cliInput.addEventListener('keyup', async e => {
        if (e.code === 'Enter' && cliInput.value.trim() !== '') {
            cliInput.disabled = true;
            const { operationId, result } = await cli.handleCli(cliInput.value.split(' '));

            addRowToTerminal(cliInput.value);
            commandHistory.unshift(cliInput.value);
            cliInput.value = '';
            historyIdx = -1;
            allowHistory = true;

            addRowToTerminal(parseOutput(result));

            if (operationId === 'register' && result?.data?.token) {
                localStorage.setItem(SPACE_TRADERS_AUTH_TOKEN, result.data.token);
                initApi();
                addRowToTerminal("Account registered successfully. You are logged in. Token stored in browser.");
            }
            cliInput.disabled = false;
            cliInput.focus();

        } else if (e.code === 'ArrowUp' && allowHistory) {
            historyIdx = Math.min(commandHistory.length - 1, historyIdx + 1);
            cliInput.value = commandHistory[historyIdx];
        } else if (e.code === 'ArrowDown' && allowHistory) {
            historyIdx = Math.max(-1, historyIdx - 1);
            cliInput.value = historyIdx >= 0 ? commandHistory[historyIdx] : '';
        }
    });
}

function parseOutput(data) {
    if (typeof data === 'string') {
        return data;
    }
    return JSON.stringify(data, null, 2);
}
