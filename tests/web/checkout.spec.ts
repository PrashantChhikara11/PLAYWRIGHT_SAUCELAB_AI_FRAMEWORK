/**
 * Test Case: 14) Checkout Information Validation (Data Driven)
 * Traces: W-CHK-01, W-CHK-02
 *
 * Tags: @master @datadriven @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import { DataProvider } from '../../utils/DataReader';
import productData from '../../testdata/web/saucedemo_products.json';

const checkoutRows = DataProvider.readJson('testdata/web/saucedemo_checkoutdata.json');

test.describe('Checkout Information', () => {

    test.beforeEach(async ({ loginPage, inventoryPage, cartPage, checkoutPage }) => {
        const { username, password } = Helper.getLoginDetails();
        await loginPage.goto();
        await loginPage.login(username, password);
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);

        await inventoryPage.addToCart(Helper.getProductDetails().productName);
        await inventoryPage.openCart();
        await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);

        await cartPage.clickCheckout();
        await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutInformation);
    });

    checkoutRows.forEach((row, index) => {
        test(`[${index + 1}] ${row.testName} @master @datadriven @regression @web`, async ({ checkoutPage, page }) => {

            await test.step('1) Fill the checkout information (blank values stay empty)', async () => {
                await checkoutPage.fillInformation(row.firstName, row.lastName, row.postalCode);
                await checkoutPage.clickContinue();
            });

            await test.step(`2) Verify the expected result: ${row.expected}`, async () => {
                if (row.expected === 'success') {
                    await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutOverview);
                    await expect(page).toHaveURL(/\/checkout-step-two\.html/);
                } else {
                    await expect(checkoutPage.msgError).toHaveText(row.expectedError);
                    await expect(page).toHaveURL(/\/checkout-step-one\.html/);
                }
            });

            console.log(`✅ ${row.testName} completed successfully!`);
        });
    });

    test('Cancel Checkout Information @master @regression @web', async ({ checkoutPage, cartPage }) => {

        await test.step('1) Click Cancel and verify the cart is displayed', async () => {
            await checkoutPage.clickCancel();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
        });

        console.log('✅ Cancel returned to the cart successfully!');
    });
});
