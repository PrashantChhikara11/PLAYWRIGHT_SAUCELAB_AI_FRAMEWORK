/**
 * Test Case: 17) Special User Behaviours
 * Traces: W-USER-02, W-USER-03, W-USER-04, W-USER-05, W-USER-06
 *
 * These tests confirm known application defects, so they pass by asserting the defect.
 *
 * Tags: @master @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import { DataProvider } from '../../utils/DataReader';
import productData from '../../testdata/web/saucedemo_products.json';

const loginRows = DataProvider.readJson('testdata/web/saucedemo_logindata.json');
const getLoginRow = (testName: string) => loginRows.find((row) => row.testName === testName);

const problemUser = getLoginRow('Valid problem user');
const errorUser = getLoginRow('Valid error user');
const visualUser = getLoginRow('Valid visual user');
const behaviours = productData.userBehaviours;

test.describe('Special User Behaviours', () => {

    test.beforeEach(async ({ loginPage }) => {
        await loginPage.goto();
    });

    test('problem_user - broken product images @master @regression @web', async ({ loginPage, inventoryPage }) => {

        await test.step('1) Log in as problem_user', async () => {
            await loginPage.login(problemUser.username, problemUser.password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        await test.step('2) Verify every product image uses the broken image', async () => {
            await expect(inventoryPage.itemImages).toHaveCount(productData.products.length);
            for (const image of await inventoryPage.itemImages.all()) {
                expect(await image.getAttribute('src')).toContain(behaviours.brokenImageSrcContains);
            }
        });

        console.log('✅ problem_user broken images confirmed!');
    });

    test('problem_user - wrong product opens @master @regression @web', async ({ loginPage, inventoryPage, productDetailsPage }) => {

        await test.step('1) Log in as problem_user', async () => {
            await loginPage.login(problemUser.username, problemUser.password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        await test.step('2) Open a product and verify a different product is shown', async () => {
            await inventoryPage.clickProductName(behaviours.problemUserClickedProduct);
            await expect(productDetailsPage.btnBackToProducts).toBeVisible();
            await expect(productDetailsPage.lblItemName).toHaveText(behaviours.problemUserOpenedProduct);
        });

        console.log('✅ problem_user wrong product confirmed!');
    });

    test('error_user - sorting alert @master @regression @web', async ({ loginPage, inventoryPage, page }) => {
        let dialogMessage = '';

        await test.step('1) Log in as error_user', async () => {
            await loginPage.login(errorUser.username, errorUser.password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        await test.step('2) Select a sort option and capture the alert', async () => {
            page.once('dialog', async (dialog) => {
                dialogMessage = dialog.message();
                await dialog.dismiss();
            });
            await inventoryPage.selectSortOption(productData.sortOptions[1].value);
            await expect.poll(() => dialogMessage).toBe(behaviours.errorUserSortAlert);
        });

        console.log('✅ error_user sorting alert confirmed!');
    });

    test('error_user - Finish does not complete the order @master @regression @web', async ({ loginPage, inventoryPage, cartPage, checkoutPage, page }) => {
        const { firstName, lastName, postalCode } = RandomDataUtil.generateCheckoutInfo();

        await test.step('1) Log in as error_user and add the product', async () => {
            await loginPage.login(errorUser.username, errorUser.password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
            await inventoryPage.addToCart(Helper.getProductDetails().productName);
        });

        await test.step('2) Check out to the overview', async () => {
            await inventoryPage.openCart();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
            await cartPage.clickCheckout();
            await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutInformation);
            await checkoutPage.fillInformation(firstName, lastName, postalCode);
            await checkoutPage.clickContinue();
            await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutOverview);
        });

        await test.step('3) Click Finish and verify the order is not completed', async () => {
            await checkoutPage.clickFinish();
            await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutOverview);
            await expect(page).toHaveURL(/\/checkout-step-two\.html/);
        });

        console.log('✅ error_user Finish defect confirmed!');
    });

    test('visual_user - inventory price differs from cart price @master @regression @web', async ({ loginPage, inventoryPage, cartPage }) => {
        const { productName, totalPrice } = Helper.getProductDetails();

        await test.step('1) Log in as visual_user', async () => {
            await loginPage.login(visualUser.username, visualUser.password);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        await test.step('2) Verify the inventory price is not the real price', async () => {
            await expect(inventoryPage.getItemPrice(productName)).not.toHaveText(totalPrice);
        });

        await test.step('3) Add the product and verify the cart shows the real price', async () => {
            await inventoryPage.addToCart(productName);
            await inventoryPage.openCart();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
            await expect(cartPage.getItemPrice(productName)).toHaveText(totalPrice);
        });

        console.log('✅ visual_user price defect confirmed!');
    });
});
