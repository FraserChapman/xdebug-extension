const DEFAULT_IDE_KEY = 'XDEBUG_ECLIPSE';

const getSettings = async () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get({
            xdebugIdeKey: DEFAULT_IDE_KEY,
            xdebugTraceTrigger: DEFAULT_IDE_KEY,
            xdebugProfileTrigger: DEFAULT_IDE_KEY
        }, (settings) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError));
            }
            resolve(settings);
        });
    });
};

const getTab = async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        return tab;
    } catch (error) {
        console.log('Error getting active tab:', error);
        return null;
    }
};

const updateIcon = (status, tabId) => {
    const iconInfo = {
        0: { title: 'Disabled', image: 'img/disable16.png' },
        1: { title: 'Debugging', image: 'img/debug16.png' },
        2: { title: 'Profiling', image: 'img/profile16.png' },
        3: { title: 'Tracing', image: 'img/trace16.png' }
    }[status] || iconInfo[0];
    chrome.action.setTitle({ tabId, title: iconInfo.title });
    chrome.action.setIcon({ tabId, path: iconInfo.image });
};

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if ((changeInfo?.status || tab?.status) !== 'complete') {
        return;
    }

    try {
        const { xdebugIdeKey, xdebugTraceTrigger, xdebugProfileTrigger } = await getSettings();
        const response = await chrome.tabs.sendMessage(tabId, {
            cmd: 'getStatus',
            idekey: xdebugIdeKey,
            traceTrigger: xdebugTraceTrigger,
            profileTrigger: xdebugProfileTrigger
        });

        updateIcon(response?.status, tabId);
    } catch (error) {
        console.log('Error during tab update:', error);
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    try {
        const tab = await getTab();
        if (!tab) {
            return;
        }

        const settings = await getSettings();
        const response = await chrome.tabs.sendMessage(tab.id, {
            cmd: 'getStatus',
            idekey: settings.xdebugIdeKey,
            traceTrigger: settings.xdebugTraceTrigger,
            profileTrigger: settings.xdebugProfileTrigger
        });

        let newState;

        switch (command) {
            case 'run-toggle-debug':
                newState = response?.status === 1 ? 0 : 1; // Toggle debug (1 <-> 0)
                break;
            case 'run-toggle-profile':
                newState = response?.status === 2 ? 0 : 2; // Toggle profile (2 <-> 0)
                break;
            case 'run-toggle-trace':
                newState = response?.status === 3 ? 0 : 3; // Toggle trace (3 <-> 0)
                break;
            default:
                return; // Ignore unknown commands
        }

        const setResponse = await chrome.tabs.sendMessage(tab.id, {
            cmd: 'setStatus',
            status: newState,
            idekey: settings.xdebugIdeKey,
            traceTrigger: settings.xdebugTraceTrigger,
            profileTrigger: settings.xdebugProfileTrigger
        });
        updateIcon(setResponse?.status, tab.id);
    } catch (error) {
        console.log('Error during command execution:', error);
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.cmd !== 'setStatus') {
        return;
    }

    try {
        const settings = await getSettings();
        const tab = await getTab();
        if (!tab) {
            return;
        }

        const response = await chrome.tabs.sendMessage(tab.id, {
            cmd: 'setStatus',
            status: request.status,
            idekey: settings.xdebugIdeKey,
            traceTrigger: settings.xdebugTraceTrigger,
            profileTrigger: settings.xdebugProfileTrigger
        });

        updateIcon(response?.status, tab.id);
    } catch (error) {
        console.log('Error during setStatus:', error);
    }
});

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.setUninstallURL('https://forms.gle/XmCBqknF5BZJQhHX6');
        chrome.commands.getAll((commands) => {
            let missingShortcuts = [];
            for (let { name, shortcut } of commands) {
                if (shortcut === '') {
                    missingShortcuts.push(name);
                }
            }

            if (missingShortcuts.length > 0) {
                console.log('Missing shortcuts:', missingShortcuts);
            }
        });
    }
});

