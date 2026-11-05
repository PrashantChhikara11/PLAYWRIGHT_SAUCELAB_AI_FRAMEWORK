/**
 * Test Cases: 12) Reset App State  13) About Link
 * Traces: W-MENU-02, W-MENU-03, W-MENU-04
 *
 * Tags: @master @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import productData from '../../testdata/web/saucedemo_products.json';

test.describe('Burger Menu', () => {

    test.beforeEach(async ({ loginPage, inventoryPage }) => {
        const { username, password } = Helper.getLoginDetails();
        await loginPage.goto();
        await loginPage.login(username, password);
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
    });

    test('Reset App State @master @regression @web', async ({ inventoryPage, cartPage, menuPage }) => {

        await test.step('1) Add the selected products to the cart', async () => {
            for (const productName of productData.cartSelection) {
                await inventoryPage.addToCart(productName);
            }
            await expect(inventoryPage.cartBadge).toHaveText(String(productData.cartSelection.length));
        });

        await test.step('2) Reset the app state', async () => {
            await menuPage.openMenu();
            await menuPage.clickResetAppState();
            await expect(inventoryPage.cartBadge).toHaveCount(0);
            await menuPage.closeMenu();
        });

        // Note: inventory buttons keep saying "Remove" until reload (app behaviour), so labels are not asserted.
        await test.step('3) Verify the cart is empty', async () => {
            await inventoryPage.openCart();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
            await expect(cartPage.cartItems).toHaveCount(0);
        });

        await test.step('4) Return to the inventory via All Items', async () => {
            await menuPage.openMenu();
            await menuPage.clickAllItems();
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        console.log('✅ Reset App State verified successfully!');
    });

    test('About Link @master @regression @web', async ({ menuPage }) => {

        await test.step('1) Open the burger menu', async () => {
            await menuPage.openMenu();
            await expect(menuPage.lnkAbout).toBeVisible();
        });

        await test.step('2) Verify the About link target', async () => {
            await expect(menuPage.lnkAbout).toHaveAttribute('href', productData.aboutUrl);
        });

        console.log('✅ About link verified successfully!');
    });
});
