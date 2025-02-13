const puppeteer = require('puppeteer-core');

/**
 * Launches the browser with the extension loaded.
 * @param {object} config The configuration object.
 * @returns {Promise<puppeteer.Browser>} A Promise that resolves with the launched Puppeteer Browser instance.
 * @throws {Error} If the browser fails to launch.
 */
async function launchBrowser(config) {
    try {
        return await puppeteer.launch({
            executablePath: config.browserPath,
            headless: false,
            slowMo: config.slowMo,
            devtools: config.devtools,
            args: [
                '--window-name=Xdebug Extension Tests',
                '--window-size=800,600',
                `--disable-extensions-except=${config.extensionDir}`,
                `--load-extension=${config.extensionDir}`
            ],
            timeout: config.timeout
        });
    } catch (error) {
        console.error("Failed to launch browser:", error);
        throw error;
    }
}

/**
 * Gets the extension path by inspecting the service worker.
 * @param {puppeteer.Browser} browser The browser instance.
 * @param {object} config The configuration object.
 * @returns {Promise<string>} A Promise that resolves with the extension path (chrome-extension://...).
 * @throws {Error} If the extension path cannot be determined.
 */
async function getExtensionPath(browser, config) {
    try {
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const workerTarget = await browser.waitForTarget(target =>
            target.type() === 'service_worker'
            && target.url().endsWith('service_worker.js'));
        const worker = await workerTarget.worker();
        const extensionId = await worker.evaluate(() => chrome.runtime.id);
        return `chrome-extension://${extensionId}`;
    } catch (error) {
        console.error("Failed to get extension path:", error);
        throw error;
    }
}

/**
 * Opens the extension's popup.
 * *
 * @param {puppeteer.Browser} browser The Puppeteer Browser instance.
 * @returns {Promise<puppeteer.Page>} A Promise that resolves with the Puppeteer Page object representing the opened popup.
 * @throws {Error} If the service worker or popup page are not found within a reasonable timeout.
 */
async function openPopup(browser) {
    const workerTarget = await browser.waitForTarget(
        target =>
            target.type() === 'service_worker' &&
            target.url().endsWith('service_worker.js'),
    );

    const worker = await workerTarget.worker();
    await worker.evaluate('chrome.action.openPopup();');
    const popupTarget = await browser.waitForTarget(target => target.type() === 'page' && target.url().endsWith('popup.html'));
    return popupTarget.asPage();
}

/**
 * Finds a specific cookie by name.
 * @param {Array<object>} cookies An array of cookie objects.
 * @param {string} cookieName The name of the cookie (e.g., 'XDEBUG_SESSION').
 * @returns {object | undefined} The cookie object if found, or `undefined` if not found.
 */
function findCookie(cookies, cookieName) {
    return cookies.find(cookie => cookie.name === cookieName);
}

/**
 * Waits for a cookie to be set (i.e., document.cookie to be non-empty).
 * @param {puppeteer.Page} page The Puppeteer page object
 * @returns {Promise<void>} A Promise that resolves when a cookie is detected.
 */
async function waitForCookieToExist(page) {
    return await page.waitForFunction(async () => document.cookie);
}

/**
 * Waits for all cookies to be cleared (i.e., document.cookie to be empty).
 * @param {puppeteer.Page} page The Puppeteer page object
 * @returns {Promise<void>} A Promise that resolves when all cookies are cleared.
 */
async function waitForCookieToClear(page) {
    return await page.waitForFunction(async () => !document.cookie);
}

/**
 * Retrieves a value from `chrome.storage.local`.
 * @param {puppeteer.Page} page The Puppeteer Page object representing the extension's page.
 * @param {string} key The key under which the value is stored in `chrome.storage.local`.
 * @returns {Promise<any>} A Promise that resolves with the stored value. Resolves with `undefined` if the key is not found.
 * @throws {Error} If there's an issue accessing `chrome.storage.local` or if the promise within `page.evaluate` rejects.
 */
async function waitForStoredValue(page, key) {
    const storedValue = await page.evaluate((k) => {
        return new Promise((resolve) => {
            chrome.storage.local.get(k, (result) => {
                resolve(result[k]);
            });
        });
    }, key);

    return storedValue;
}

module.exports = {
    launchBrowser,
    getExtensionPath,
    openPopup,
    findCookie,
    waitForCookieToExist,
    waitForCookieToClear,
    waitForStoredValue,
};