/**
 * Test Cases: 5) Logout  6) Direct URL Access Without Login
 * Traces: W-MENU-01, W-AUTH-01
 *
 * Tags: @master @sanity @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import productData from '../../testdata/web/saucedemo_products.json';

test.describe('Access Control', () => {

    test('Logout @master @sanity @regression @web', async ({ loginPage, inventoryPage, menuPage, page }) => {
        const { username, password } = Helper.getLoginDetails();
        const restrictedPage = productData.restrictedPages[0];

        await test.step('1) Log in', async () => {
            await loginPage.goto();
            await loginPage.login(username, password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        await test.step('2) Log out from the burger menu', async () => {
            await menuPage.openMenu();
            await menuPage.clickLogout();
        });

        await test.step('3) Verify the login page is displayed', async () => {
            await expect(loginPage.btnLogin).toBeVisible();
            await expect(page).toHaveURL(process.env.WEB_BASE_URL as string);
        });

        await test.step('4) Verify the inventory page is no longer accessible', async () => {
            await loginPage.goto(restrictedPage.path);
            await expect(loginPage.msgError).toHaveText(restrictedPage.error);
            await expect(loginPage.btnLogin).toBeVisible();
        });

        console.log('✅ Logout completed successfully!');
    });

    for (const entry of productData.restrictedPages) {
        test(`Direct URL Access Without Login - ${entry.path} @master @regression @web`, async ({ loginPage }) => {

            await test.step(`1) Open ${entry.path} without logging in`, async () => {
                await loginPage.goto(entry.path);
            });

            await test.step('2) Verify the login form and access error are shown', async () => {
                await expect(loginPage.msgError).toHaveText(entry.error);
                await expect(loginPage.btnLogin).toBeVisible();
            });

            console.log(`✅ ${entry.path} is protected as expected!`);
        });
    }
});
