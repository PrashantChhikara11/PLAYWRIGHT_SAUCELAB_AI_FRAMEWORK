/**
 * Test Cases: 10) Add to Cart  11) Remove from Cart
 * Traces: W-CART-01, W-CART-02, W-CART-03
 *
 * Tags: @master @sanity @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import productData from '../../testdata/web/saucedemo_products.json';

test.describe('Cart', () => {
    const { productName, productQuantity, totalPrice } = Helper.getProductDetails();

    test.beforeEach(async ({ loginPage, inventoryPage }) => {
        const { username, password } = Helper.getLoginDetails();
        await loginPage.goto();
        await loginPage.login(username, password);
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
    });

    test('Add to Cart @master @sanity @regression @web', async ({ inventoryPage, cartPage }) => {

        await test.step('1) Add the product to the cart', async () => {
            await inventoryPage.addToCart(productName);
            await expect(inventoryPage.cartBadge).toHaveText(productQuantity);
        });

        await test.step('2) Open the cart', async () => {
            await inventoryPage.openCart();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
        });

        await test.step('3) Verify name, quantity and price in the cart', async () => {
            await expect(cartPage.getItemName(productName)).toHaveText(productName);
            await expect(cartPage.getItemQuantity(productName)).toHaveText(productQuantity);
            await expect(cartPage.getItemPrice(productName)).toHaveText(totalPrice);
        });

        console.log('✅ Add to cart verified successfully!');
    });

    test('Remove from Cart @master @regression @web', async ({ inventoryPage, cartPage, page }) => {

        await test.step('1) Add the product and open the cart', async () => {
            await inventoryPage.addToCart(productName);
            await inventoryPage.openCart();
            await expect(cartPage.lblTitle).toHaveText(productData.pageTitles.cart);
        });

        await test.step('2) Remove the product', async () => {
            await cartPage.removeItem(productName);
            await expect(inventoryPage.cartBadge).toHaveCount(0);
            await expect(cartPage.cartItems).toHaveCount(0);
        });

        await test.step('3) Continue shopping', async () => {
            await cartPage.clickContinueShopping();
            await expect(page).toHaveURL(/\/inventory\.html/);
            await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
        });

        console.log('✅ Remove from cart verified successfully!');
    });
});
