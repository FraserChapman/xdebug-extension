document.addEventListener('DOMContentLoaded', () => {
    const optionsForm = document.querySelector('form');
    const ideKeyInput = document.getElementById('idekey');
    const traceTriggerInput = document.getElementById('tracetrigger');
    const profileTriggerInput = document.getElementById('profiletrigger');
    const helpDiv = document.getElementById('help');

    document.querySelector('button[type="reset"]').addEventListener('click', e => {
        e.preventDefault();
        ideKeyInput.value = '';
        traceTriggerInput.value = '';
        profileTriggerInput.value = '';
    });

    document.querySelector('button[type="submit"]').addEventListener('click', e => {
        e.preventDefault();
        chrome.storage.local.set({
            xdebugIdeKey: ideKeyInput.value,
            xdebugTraceTrigger: traceTriggerInput.value,
            xdebugProfileTrigger: profileTriggerInput.value
        });
        optionsForm.classList.add('success');
        setTimeout(() => optionsForm.classList.remove('success'), 1500);
    });

    chrome.storage.local.get({
        xdebugIdeKey: 'XDEBUG_ECLIPSE',
        xdebugTraceTrigger: null,
        xdebugProfileTrigger: null,
    }, (settings) => {
        ideKeyInput.value = settings.xdebugIdeKey;
        traceTriggerInput.value = settings.xdebugTraceTrigger;
        profileTriggerInput.value = settings.xdebugProfileTrigger;
    });

    chrome.commands.getAll((commands) => {
        helpDiv.querySelectorAll('p').forEach(p => p.remove());

        if (commands.length === 0) {
            const newP = document.createElement('p');
            newP.appendChild(document.createTextNode('No shortcuts defined'));
            helpDiv.appendChild(newP);
            return;
        }

        for (const { name, shortcut } of commands) {
            if (!shortcut) {
                break;
            }
            const parts = shortcut.split('+');
            const newP = document.createElement('p');
            parts.forEach((part, index) => {
                const newKbd = document.createElement('kbd');
                newKbd.textContent = part;
                newP.appendChild(newKbd);
                if (index < parts.length - 1) {
                    newP.appendChild(document.createTextNode(' + '));
                }
            });

            newP.appendChild(document.createTextNode(name.replace(/_|-|run/g, ' ')));
            helpDiv.appendChild(newP);
        }
    });
});