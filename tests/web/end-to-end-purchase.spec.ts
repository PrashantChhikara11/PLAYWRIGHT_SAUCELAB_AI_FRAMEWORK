/**
 * Test Case: 15) End-to-End Purchase
 * Traces: W-E2E-01, W-OVR-01, W-CART-01
 *
 * Tags: @master @sanity @end-to-end @web
 *
 * Steps:
 * 1) Log in
 * 2) Add the selected products
 * 3) Verify the cart
 * 4) Fill checkout information with random data
 * 5) Verify item total, tax and total on the overview
 * 6) Finish and verify the confirmation
 * 7) Back Home and verify the cart is empty
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import { RandomDataUtil } from '../../utils/dataGenerator';
import productData from '../../testdata/web/saucedemo_products.json';

test('End-to-End Purchase @master @sanity @end-to-end @web', async ({ loginPage, inventoryPage, cartPage, checkoutPage }) => {
    const { username, password } = Helper.getLoginDetails();
    const { firstName, lastName, postalCode } = RandomDataUtil.generateCheckoutInfo();

    const itemTotal = productData.products
        .filter((product) => productData.cartSelection.includes(product.name))
        .reduce((sum, product) => sum + Helper.convertPriceToNumber(product.price), 0);
    const expectedItemTotal = Number(itemTotal.toFixed(2));
    const expectedTax = Number((expectedItemTotal * productData.taxRate).toFixed(2));
    const expectedTotal = Number((expectedItemTotal + expectedTax).toFixed(2));

    await test.step('1) Log in', async () => {
        await loginPage.goto();
        await loginPage.login(username, password);
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
    });

    await test.step('2) Add the selected products to the cart', async () => {
        for (const productName of productData.cartSelection) {
            await inventoryPage.addToCart(productName);
        }
        await expect(inventoryPage.cartBadge).toHaveText(String(productData.cartSelection.length));
    });

    await test.step('3) Verify each selected product is in the cart', async () => {
        await inventoryPage.openCart();
        await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
        await expect(cartPage.cartItems).toHaveCount(productData.cartSelection.length);
        for (const productName of productData.cartSelection) {
            await expect(cartPage.getItemName(productName)).toHaveText(productName);
        }
    });

    await test.step('4) Fill the checkout information', async () => {
        await cartPage.clickCheckout();
        await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutInformation);
        await checkoutPage.fillInformation(firstName, lastName, postalCode);
        await checkoutPage.clickContinue();
    });

    await test.step('5) Verify item total, tax and total on the overview', async () => {
        await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutOverview);
        expect(Helper.convertPriceToNumber(await checkoutPage.lblSubtotal.innerText())).toBe(expectedItemTotal);
        expect(Helper.convertPriceToNumber(await checkoutPage.lblTax.innerText())).toBe(expectedTax);
        expect(Helper.convertPriceToNumber(await checkoutPage.lblTotal.innerText())).toBe(expectedTotal);
    });

    await test.step('6) Finish and verify the order confirmation', async () => {
        await checkoutPage.clickFinish();
        await expect(checkoutPage.lblTitle).toHaveText(productData.pageTitles.checkoutComplete);
        await expect(checkoutPage.lblCompleteHeader).toHaveText(productData.orderComplete.header);
        await expect(checkoutPage.lblCompleteText).toHaveText(productData.orderComplete.text);
    });

    await test.step('7) Back Home and verify the cart is empty', async () => {
        await checkoutPage.clickBackHome();
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        await expect(inventoryPage.cartBadge).toHaveCount(0);
    });

    console.log('✅ ✔️ End-to-end purchase completed successfully!');
});
