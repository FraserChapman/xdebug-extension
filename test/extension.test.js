const config = require('./test-config');

const {
    launchBrowser,
    getExtensionPath,
    openPopup,
    findCookie,
    waitForCookieToExist,
    waitForCookieToClear,
    waitForStoredValue,
} = require('./test-utils.js');

// Test Setup

let browser = null;
let extensionPath = null;

beforeEach(async () => {
    browser = await launchBrowser(config);
    extensionPath = await getExtensionPath(browser, config);
});

afterEach(async () => {
    try {
        if (browser) {
            await browser.close();
        }
    } finally {
        browser = null;
        extensionPath = null;
    }
});

// Test Suites

describe('Options Tests', () => {
    test('Should render options correctly', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(`${extensionPath}/options.html`);

        // Assert
        await expect(page.$('#idekey')).resolves.not.toBeNull(); // IDE Key
        await expect(page.$('#tracetrigger')).resolves.not.toBeNull(); // Trace Trigger
        await expect(page.$('#profiletrigger')).resolves.not.toBeNull(); // Profile Trigger
        await expect(page.$('button[type="reset"]')).resolves.not.toBeNull(); // Clear
        await expect(page.$('button[type="submit"]')).resolves.not.toBeNull(); // Save
    });

    test('Should set IDE Key correctly and save', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(`${extensionPath}/options.html`);

        // Act
        const ideKey = 'IDE_KEY_TEST';
        await page.locator('#idekey').fill(ideKey);
        await page.locator('button[type="submit"]').click();

        // Assert
        await page.waitForSelector('form.success');
        const storedValue = await waitForStoredValue(page, 'xdebugIdeKey');
        expect(storedValue).toBe(ideKey);
    });

    test('Should set Trace Trigger correctly and save', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(`${extensionPath}/options.html`);

        // Act
        const traceTrigger = 'TRACE_TRIGGER_TEST';
        await page.locator('#tracetrigger').fill(traceTrigger);
        await page.locator('button[type="submit"]').click();

        // Assert
        await page.waitForSelector('form.success');
        const storedValue = await waitForStoredValue(page, 'xdebugTraceTrigger');
        expect(storedValue).toBe(traceTrigger);
    });

    test('Should set Profile Trigger correctly and save', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(`${extensionPath}/options.html`);

        // Act
        const profileTrigger = 'PROFILE_TRIGGER_TEST';
        await page.locator('#profiletrigger').fill(profileTrigger);
        await page.locator('button[type="submit"]').click();

        // Assert
        await page.waitForSelector('form.success');
        const storedValue = await waitForStoredValue(page, 'xdebugProfileTrigger');
        expect(storedValue).toBe(profileTrigger);
    });


    test('Should clear all text inputs when the clear button is clicked', async () => {
        // Arrange
        const page = await browser.newPage();
        await page.goto(`${extensionPath}/options.html`);
        await page.type('#idekey', 'foo');
        await page.type('#tracetrigger', 'bar');
        await page.type('#profiletrigger', 'bat');

        // Act
        await page.click('button[type="reset"]');

        // Assert
        await expect(page.$eval('#idekey', el => el.value)).resolves.toBe('');
        await expect(page.$eval('#tracetrigger', el => el.value)).resolves.toBe('');
        await expect(page.$eval('#profiletrigger', el => el.value)).resolves.toBe('');
    });
});

describe('Popup Tests', () => {
    test('Should render popup correctly', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(`${extensionPath}/popup.html`);

        // Assert
        await expect(page.$('input[type="radio"][value="1"]')).resolves.not.toBeNull(); // Debug
        await expect(page.$('input[type="radio"][value="2"]')).resolves.not.toBeNull(); // Profile
        await expect(page.$('input[type="radio"][value="3"]')).resolves.not.toBeNull(); // Trace
        await expect(page.$('input[type="radio"][value="0"]')).resolves.not.toBeNull(); // Disable
        await expect(page.$('#options')).resolves.not.toBeNull(); // Options link
    });

    test('Should toggle debug mode and sets XDEBUG_SESSION cookie', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const popupPage = await openPopup(browser);
        await popupPage.waitForSelector('label[for="debug"]');

        // Act
        await popupPage.click('label[for="debug"]');

        // Assert
        await waitForCookieToExist(page);
        const cookies = await browser.cookies(config.examplePage);
        const xdebugSessionCookie = findCookie(cookies, 'XDEBUG_SESSION');
        expect(cookies.length).toBe(1);
        expect(xdebugSessionCookie.value).toBe(config.defaultKey);
    });

    test('Should toggle trace mode and sets XDEBUG_TRACE cookie', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const popupPage = await openPopup(browser);
        await popupPage.waitForSelector('label[for="trace"]');

        // Act
        await popupPage.click('label[for="trace"]');

        // Assert
        await waitForCookieToExist(page);
        const cookies = await browser.cookies(config.examplePage);
        const xdebugTraceCookie = findCookie(cookies, 'XDEBUG_TRACE');
        expect(cookies.length).toBe(1);
        expect(xdebugTraceCookie.value).toBe(config.defaultKey);
    });

    test('Should toggle profile mode and sets XDEBUG_PROFILE cookie', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const popupPage = await openPopup(browser);
        await popupPage.waitForSelector('label[for="profile"]');

        // Act
        await popupPage.click('label[for="profile"]');

        // Assert
        await waitForCookieToExist(page);
        const cookies = await browser.cookies(config.examplePage);
        const xdebugProfileCookie = findCookie(cookies, 'XDEBUG_PROFILE');
        expect(cookies.length).toBe(1);
        expect(xdebugProfileCookie.value).toBe(config.defaultKey);
    });

    test('Should toggle disabled mode and removes all cookies', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const popupPage = await openPopup(browser);

        // Act
        await popupPage.click('label[for="disable"]');

        // Assert
        await waitForCookieToClear(page);
        const cookies = await browser.cookies(config.examplePage);
        expect(cookies.length).toBe(0);
    });

    test('Should open options page in new tab', async () => {
        // Arrange
        const [page] = await browser.pages();
        await page.goto(config.examplePage);
        const popupPage = await openPopup(browser);

        // Act
        await popupPage.click('#options');

        // Assert
        const optionsPage = await browser.waitForTarget(target => target.url() === `${extensionPath}/options.html`);
        expect(optionsPage).toBeTruthy();
    });
});

