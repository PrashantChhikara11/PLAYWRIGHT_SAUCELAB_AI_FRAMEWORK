/**
 * Test Cases: 1) Valid Login  2) Invalid Login  3) Locked Out User  4) Dismiss Login Error
 * Traces: W-LOGIN-01, W-LOGIN-02, W-LOGIN-03, W-LOGIN-05
 *
 * Tags: @master @sanity @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import { DataProvider } from '../../utils/DataReader';
import productData from '../../testdata/web/saucedemo_products.json';

const loginRows = DataProvider.readJson('testdata/web/saucedemo_logindata.json');
const getLoginRow = (testName: string) => loginRows.find((row) => row.testName === testName);

test.describe('Login', () => {

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.goto();
    });

    test('Valid Login @master @sanity @regression @web', async ({ loginPage, inventoryPage, page }) => {
        const { username, password } = Helper.getLoginDetails();

        await test.step('1) Log in with valid credentials', async () => {
            await loginPage.login(username, password);
        });

        await test.step('2) Verify the inventory page is displayed', async () => {
            await expect(page).toHaveURL(/\/inventory\.html/);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        console.log('✅ Valid login completed successfully!');
    });

    test('Invalid Login @master @regression @web', async ({ loginPage, page }) => {
        const row = getLoginRow('Invalid password');

        await test.step('1) Log in with an invalid password', async () => {
            await loginPage.login(row.username, row.password);
        });

        await test.step('2) Verify the error and that the user stays on the login page', async () => {
            await expect(loginPage.msgError).toHaveText(row.expectedError);
            await expect(page).not.toHaveURL(/\/inventory\.html/);
            await expect(page).toHaveURL(process.env.WEB_BASE_URL as string);
        });

        console.log('✅ Invalid login rejected as expected!');
    });

    test('Locked Out User @master @regression @web', async ({ loginPage }) => {
        const row = getLoginRow('Locked out user');

        await test.step('1) Log in with the locked-out user', async () => {
            await loginPage.login(row.username, row.password);
        });

        await test.step('2) Verify the locked-out error', async () => {
            await expect(loginPage.msgError).toHaveText(row.expectedError);
        });

        console.log('✅ Locked-out user blocked as expected!');
    });

    test('Dismiss Login Error @master @regression @web', async ({ loginPage }) => {
        await test.step('1) Click Login with empty fields', async () => {
            await loginPage.clickLogin();
            await expect(loginPage.msgError).toBeVisible();
        });

        await test.step('2) Close the error message', async () => {
            await loginPage.closeError();
            await expect(loginPage.msgError).toHaveCount(0);
        });

        console.log('✅ Login error dismissed successfully!');
    });
});
